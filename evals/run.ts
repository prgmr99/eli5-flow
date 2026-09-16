import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkHtml } from "../scripts/check-chain.ts";
import { judge, loadReference, runClaude, score, type Scores, type Verdict } from "./judge.ts";

const EVALS_DIR = dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = resolve(EVALS_DIR, "..");
const GENERATION_TIMEOUT_MS = 12 * 60 * 1000;

type Job = { topic: string; run: number; html: string; log: string };

type Generation = { ok: boolean; costUsd: number; durationMs: number; readLayout: boolean; error?: string };

type JobResult = Job & {
  generation: Generation;
  structure?: { errors: number; warnings: number; messages: string[] };
  scores?: Scores;
  verdict?: Verdict;
  judgeCostUsd?: number;
  error?: string;
};

async function generate(job: Job, model: string): Promise<Generation> {
  // Claude Code refuses writes inside a directory loaded with --plugin-dir, so generate outside the repo.
  const workDir = mkdtempSync(join(tmpdir(), "eli5-flow-eval-"));
  const workFile = join(workDir, basename(job.html));
  const prompt =
    `/eli5-flow ${loadReference(job.topic).prompt}\n\n` +
    `(Test run: do not publish an artifact. Only save the complete HTML page to ./${basename(job.html)}. Reply with one line when done.)`;

  const { code, stdout, stderr } = await runClaude(
    [
      "-p",
      "--model", model,
      "--plugin-dir", PLUGIN_DIR,
      "--setting-sources", "",
      "--strict-mcp-config",
      "--no-session-persistence",
      "--permission-mode", "acceptEdits",
      "--allowedTools", "Write,Read",
      "--output-format", "stream-json",
      "--verbose",
    ],
    prompt,
    workDir,
    GENERATION_TIMEOUT_MS,
  );
  writeFileSync(job.log, stdout + stderr);
  if (existsSync(workFile)) copyFileSync(workFile, job.html);
  rmSync(workDir, { recursive: true, force: true });

  const events = stdout.split("\n").flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
  const result = events.find((e) => e.type === "result");
  const readLayout = events.some(
    (e) =>
      e.type === "assistant" &&
      e.message?.content?.some((c: any) => c.type === "tool_use" && c.name === "Read" && String(c.input?.file_path).endsWith("LAYOUT.md")),
  );
  const written = existsSync(job.html);
  const ok = code === 0 && written && !result?.is_error;
  return {
    ok,
    costUsd: result?.total_cost_usd ?? 0,
    durationMs: result?.duration_ms ?? 0,
    readLayout,
    error: ok ? undefined : `exit ${code}${written ? "" : ", no HTML written"}`,
  };
}

async function runJob(job: Job, model: string, judgeModel: string): Promise<JobResult> {
  let generation = await generate(job, model);
  if (!generation.ok) {
    console.log(`↻ ${job.topic}#${job.run}  retrying after ${generation.error}`);
    const retry = await generate(job, model);
    generation = { ...retry, costUsd: retry.costUsd + generation.costUsd };
  }
  if (!generation.ok) return { ...job, generation, error: generation.error };

  const html = readFileSync(job.html, "utf8");
  const { issues } = checkHtml(html);
  const structure = {
    errors: issues.filter((i) => i.level === "error").length,
    warnings: issues.filter((i) => i.level === "warning").length,
    messages: issues.map((i) => `${i.level} ${i.where}: ${i.message}`),
  };

  try {
    const reference = loadReference(job.topic);
    const { verdict, costUsd } = await judge(html, reference, judgeModel);
    return { ...job, generation, structure, scores: score(reference, verdict), verdict, judgeCostUsd: costUsd };
  } catch (e) {
    return { ...job, generation, structure, error: `judge: ${(e as Error).message}` };
  }
}

async function pool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  });
  await Promise.all(lanes);
  return results;
}

const mean = (values: (number | null | undefined)[]) => {
  const xs = values.filter((v): v is number => typeof v === "number");
  return xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;
};
const pct = (v: number | null) => (v === null ? "n/a" : `${Math.round(v * 100)}%`);

export function summarize(results: JobResult[]): string {
  const topics = [...new Set(results.map((r) => r.topic))];
  const row = (label: string, rs: JobResult[]) => {
    const judged = rs.filter((r) => r.scores);
    const s = judged.map((r) => r.scores!);
    return [
      label,
      `${judged.filter((r) => r.scores!.pass).length}/${rs.length}`,
      `${rs.filter((r) => r.structure?.errors === 0).length}/${rs.length}`,
      pct(mean(s.map((x) => x.keyLinkRecall))),
      pct(mean(s.map((x) => x.linkAccuracy))),
      pct(mean(s.map((x) => x.kindAccuracy))),
      pct(mean(s.map((x) => x.snapValidity))),
      pct(mean(s.map((x) => x.loopValidity))),
      String(s.reduce((n, x) => n + x.jumps, 0)),
      String(s.reduce((n, x) => n + x.knownErrors.length, 0)),
      String(s.reduce((n, x) => n + x.otherErrors, 0)),
      String(rs.filter((r) => r.error).length),
    ];
  };

  const header = ["topic", "pass", "structure", "key links", "causal links", "kinds", "snaps", "loops", "jumps", "known err", "other err", "failed runs"];
  const rows = [...topics.map((t) => row(t, results.filter((r) => r.topic === t))), row("**all**", results)];
  const table = [header, header.map(() => "---"), ...rows].map((cells) => `| ${cells.join(" | ")} |`).join("\n");

  const cost = results.reduce((n, r) => n + r.generation.costUsd + (r.judgeCostUsd ?? 0), 0);
  const skillCheck = results.filter((r) => r.generation.ok && !r.generation.readLayout).length;
  return `${table}\n\nTotal cost: $${cost.toFixed(2)} · runs that never read LAYOUT.md: ${skillCheck}\n`;
}

async function main(argv: string[]) {
  const flag = (name: string, fallback: string) => {
    const i = argv.indexOf(name);
    return i === -1 ? fallback : argv[i + 1];
  };
  const model = flag("--model", "claude-fable-5-1");
  const judgeModel = flag("--judge-model", "opus");
  const runs = Number(flag("--runs", "3"));
  const concurrency = Number(flag("--concurrency", "3"));
  const only = flag("--topics", "");

  const topics = readdirSync(join(EVALS_DIR, "references"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((t) => !only || only.split(",").includes(t));

  const resume = flag("--resume", "");
  const outDir = resume ? resolve(resume) : join(EVALS_DIR, "results", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(outDir, { recursive: true });

  const previous: JobResult[] = resume ? JSON.parse(readFileSync(join(outDir, "results.json"), "utf8")).results : [];
  const jobs: Job[] = resume
    ? previous.filter((r) => r.error).map(({ topic, run, html, log }) => ({ topic, run, html, log }))
    : topics.flatMap((topic) =>
        Array.from({ length: runs }, (_, i) => ({
          topic,
          run: i + 1,
          html: join(outDir, `${topic}-${i + 1}.html`),
          log: join(outDir, `${topic}-${i + 1}.jsonl`),
        })),
      );

  console.log(`${jobs.length} runs · model ${model} · judge ${judgeModel} · concurrency ${concurrency}\n→ ${outDir}`);
  const fresh = await pool(jobs, concurrency, async (job) => {
    const result = await runJob(job, model, judgeModel);
    const s = result.scores;
    console.log(
      `${result.scores?.pass ? "✔" : "✖"} ${job.topic}#${job.run}` +
        (result.error
          ? `  ERROR ${result.error}`
          : `  structure ${result.structure!.errors}e · key ${pct(s!.keyLinkRecall)} · causal ${pct(s!.linkAccuracy)} · snaps ${pct(s!.snapValidity)} · errors ${s!.knownErrors.length + s!.otherErrors}`),
    );
    return result;
  });

  const key = (r: Job) => `${r.topic}#${r.run}`;
  const results = resume
    ? previous.map((r) => fresh.find((f) => key(f) === key(r)) ?? r)
    : fresh;
  const summary = summarize(results);
  writeFileSync(join(outDir, "results.json"), JSON.stringify({ model, judgeModel, runs, results }, null, 2));
  writeFileSync(join(outDir, "summary.md"), `# eli5-flow eval\n\nmodel \`${model}\` · judge \`${judgeModel}\` · ${runs} runs per topic\n\n${summary}`);
  console.log(`\n${summary}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
