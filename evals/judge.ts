import { readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractChainJson, visibleText } from "../scripts/check-chain.ts";

const EVALS_DIR = dirname(fileURLToPath(import.meta.url));
const MAX_PAGE_TEXT = 20_000;

export type Reference = {
  id: string;
  prompt: string;
  keyLinks: { id: string; required: boolean; cause: string; effect: string; mechanism: string }[];
  knownErrors: { id: string; claim: string; why: string }[];
  acceptableSimplifications: string[];
};

export type Verdict = {
  keyLinks: { id: string; verdict: "present" | "partial" | "missing"; evidence: string }[];
  knownErrors: { id: string; committed: boolean; evidence: string }[];
  links: { from: string; to: string; verdict: "causal" | "sequence-only" | "wrong"; kindOk: boolean | null; note: string }[];
  jumps: { between: string; missing: string }[];
  snaps: { from: string; to: string; valid: boolean; note: string }[];
  loops: { from: string; to: string; real: boolean; kindOk: boolean; note: string }[];
  otherErrors: { claim: string; why: string }[];
};

export type Scores = {
  keyLinkRecall: number;
  linkAccuracy: number | null;
  sequenceOnlyLinks: number;
  wrongLinks: number;
  kindAccuracy: number | null;
  jumps: number;
  snapValidity: number | null;
  loopValidity: number | null;
  knownErrors: string[];
  otherErrors: number;
  pass: boolean;
};

export const THRESHOLDS = {
  keyLinkRecall: 0.8,
  linkAccuracy: 0.85,
  maxJumps: 1,
  snapValidity: 1,
};

const str = { type: "string" };
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const arr = (items: unknown) => ({ type: "array", items });

export const VERDICT_SCHEMA = obj({
  keyLinks: arr(obj({ id: str, verdict: { type: "string", enum: ["present", "partial", "missing"] }, evidence: str })),
  knownErrors: arr(obj({ id: str, committed: { type: "boolean" }, evidence: str })),
  links: arr(
    obj({
      from: str,
      to: str,
      verdict: { type: "string", enum: ["causal", "sequence-only", "wrong"] },
      kindOk: { type: ["boolean", "null"] },
      note: str,
    }),
  ),
  jumps: arr(obj({ between: str, missing: str })),
  snaps: arr(obj({ from: str, to: str, valid: { type: "boolean" }, note: str })),
  loops: arr(obj({ from: str, to: str, real: { type: "boolean" }, kindOk: { type: "boolean" }, note: str })),
  otherErrors: arr(obj({ claim: str, why: str })),
});

const ratio = (hits: number, total: number) => (total === 0 ? null : hits / total);

export function loadReference(id: string): Reference {
  return JSON.parse(readFileSync(join(EVALS_DIR, "references", `${id}.json`), "utf8"));
}

export function assertComplete(reference: Reference, verdict: Verdict) {
  const missing = [
    ...reference.keyLinks.filter((k) => !verdict.keyLinks.some((v) => v.id === k.id)).map((k) => k.id),
    ...reference.knownErrors.filter((e) => !verdict.knownErrors.some((v) => v.id === e.id)).map((e) => e.id),
  ];
  if (missing.length > 0) throw new Error(`judge skipped reference items: ${missing.join(", ")}`);
}

export function score(reference: Reference, verdict: Verdict): Scores {
  const required = reference.keyLinks.filter((k) => k.required).map((k) => k.id);
  const recallPoints = verdict.keyLinks
    .filter((v) => required.includes(v.id))
    .reduce((sum, v) => sum + (v.verdict === "present" ? 1 : v.verdict === "partial" ? 0.5 : 0), 0);

  const kinds = verdict.links.filter((l) => l.kindOk !== null);
  const scores: Omit<Scores, "pass"> = {
    keyLinkRecall: required.length === 0 ? 1 : recallPoints / required.length,
    linkAccuracy: ratio(verdict.links.filter((l) => l.verdict === "causal").length, verdict.links.length),
    sequenceOnlyLinks: verdict.links.filter((l) => l.verdict === "sequence-only").length,
    wrongLinks: verdict.links.filter((l) => l.verdict === "wrong").length,
    kindAccuracy: ratio(kinds.filter((l) => l.kindOk).length, kinds.length),
    jumps: verdict.jumps.length,
    snapValidity: ratio(verdict.snaps.filter((s) => s.valid).length, verdict.snaps.length),
    loopValidity: ratio(verdict.loops.filter((l) => l.real && l.kindOk).length, verdict.loops.length),
    knownErrors: verdict.knownErrors.filter((e) => e.committed).map((e) => e.id),
    otherErrors: verdict.otherErrors.length,
  };

  const pass =
    scores.keyLinkRecall >= THRESHOLDS.keyLinkRecall &&
    (scores.linkAccuracy ?? 0) >= THRESHOLDS.linkAccuracy &&
    scores.jumps <= THRESHOLDS.maxJumps &&
    (scores.snapValidity ?? 0) >= THRESHOLDS.snapValidity &&
    (scores.loopValidity ?? 1) === 1 &&
    scores.knownErrors.length === 0 &&
    scores.otherErrors === 0;

  return { ...scores, pass };
}

export function runClaude(
  args: string[],
  input: string,
  cwd: string,
  timeoutMs = 20 * 60 * 1000,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((done, fail) => {
    const child = spawn("claude", args, { cwd, env: { ...process.env, DISABLE_OMC: "1", OMC_SKIP_HOOKS: "1" } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.on("error", (e) => {
      clearTimeout(timer);
      fail(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      done({ code, stdout, stderr });
    });
    child.stdin.end(input);
  });
}

export async function judge(html: string, reference: Reference, model: string): Promise<{ verdict: Verdict; costUsd: number }> {
  const { id: _id, prompt: topic, ...expert } = reference;
  const message = JSON.stringify(
    {
      topic,
      reference: expert,
      chain: extractChainJson(html),
      pageText: visibleText(html).replace(/\s+/g, " ").trim().slice(0, MAX_PAGE_TEXT),
    },
    null,
    2,
  );

  const run = await runClaude(
    [
      "-p",
      "--model", model,
      "--tools", "",
      "--setting-sources", "",
      "--strict-mcp-config",
      "--no-session-persistence",
      "--system-prompt", readFileSync(join(EVALS_DIR, "judge-prompt.md"), "utf8"),
      "--output-format", "json",
      "--json-schema", JSON.stringify(VERDICT_SCHEMA),
    ],
    message,
    tmpdir(),
  );

  let result: { is_error?: boolean; result?: string; structured_output?: Verdict; total_cost_usd?: number };
  try {
    result = JSON.parse(run.stdout);
  } catch {
    throw new Error(`judge returned non-JSON output (exit ${run.code}): ${(run.stdout || run.stderr).slice(0, 500)}`);
  }
  if (result.is_error || !result.structured_output) {
    throw new Error(`judge failed: ${String(result.result).slice(0, 500)}`);
  }
  assertComplete(reference, result.structured_output);
  return { verdict: result.structured_output, costUsd: result.total_cost_usd ?? 0 };
}

const pct = (v: number | null) => (v === null ? "  n/a" : `${Math.round(v * 100)}%`.padStart(5));

async function main(argv: string[]) {
  const flag = (name: string) => {
    const i = argv.indexOf(name);
    if (i === -1) return undefined;
    const value = argv[i + 1];
    argv.splice(i, 2);
    return value;
  };
  const topic = flag("--topic");
  const model = flag("--model") ?? "opus";
  const out = flag("--out");
  if (!topic || argv.length === 0) {
    console.error("usage: node evals/judge.ts --topic <reference id> [--model opus] [--out results.json] <explainer.html>...");
    return 2;
  }

  const reference = loadReference(topic);
  const results = [];
  for (const file of argv) {
    const { verdict, costUsd } = await judge(readFileSync(file, "utf8"), reference, model);
    const scores = score(reference, verdict);
    console.log(`\n${file}`);
    console.log(
      `  key links ${pct(scores.keyLinkRecall)} · causal links ${pct(scores.linkAccuracy)} · kinds ${pct(scores.kindAccuracy)}` +
        ` · snaps ${pct(scores.snapValidity)} · loops ${pct(scores.loopValidity)}`,
    );
    console.log(
      `  sequence-only ${scores.sequenceOnlyLinks} · wrong ${scores.wrongLinks} · jumps ${scores.jumps}` +
        ` · known errors [${scores.knownErrors.join(", ")}] · other errors ${scores.otherErrors} · $${costUsd.toFixed(2)}`,
    );
    console.log(`  ${scores.pass ? "✔ pass" : "✖ fail"}`);
    results.push({ file, topic, model, scores, verdict, costUsd });
  }

  if (out) writeFileSync(out, JSON.stringify(results, null, 2));
  return results.every((r) => r.scores.pass) ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
