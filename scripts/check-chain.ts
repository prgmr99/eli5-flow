import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type Level = "error" | "warning";
export type Issue = { level: Level; where: string; message: string };
export type CheckResult = {
  issues: Issue[];
  counts?: { steps: number; links: number; loops: number; snaps: number; mixups: number };
};

type Step = { id: string; text: string };
type Link = { from: string; to: string; kind: string; because: string };
type Snap = { from: string; to: string; whatIf: string; ending: string };
type Mixup = { looksLike: string; really: string };
type Chain = {
  audience: string;
  bigPicture: string;
  steps: Step[];
  links: Link[];
  loops: Link[];
  snaps: Snap[];
  mixups: Mixup[];
  oneBreath: string;
};

const AUDIENCES = ["beginner", "dev"];
const LINK_KINDS = ["trigger", "needs", "leads-to"];
const LOOP_KINDS = ["reinforcing", "balancing"];
const MAX_WORDS_PER_STEP = 12;
const MAX_WORDS_PER_REASON = 14;

const CHAIN_SCRIPT = /<script\b([^>]*\bid=["']eli5-flow-chain["'][^>]*)>([\s\S]*?)<\/script>/i;

const isText = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const squash = (s: string) => s.replace(/\s+/g, "");
export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export function visibleText(html: string): string {
  return html
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function extractChainJson(html: string): unknown {
  const match = CHAIN_SCRIPT.exec(html);
  if (!match) return null;
  try {
    return JSON.parse(match[2]);
  } catch {
    return null;
  }
}

export function checkHtml(html: string): CheckResult {
  const issues: Issue[] = [];
  const error = (where: string, message: string) => issues.push({ level: "error", where, message });
  const warn = (where: string, message: string) => issues.push({ level: "warning", where, message });

  const match = CHAIN_SCRIPT.exec(html);
  if (!match) {
    error("page", 'no <script type="application/json" id="eli5-flow-chain"> found');
    return { issues };
  }
  if (!/\btype=["']application\/json["']/i.test(match[1])) {
    error("page", 'chain script must have type="application/json"');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(match[2]);
  } catch (e) {
    error("page", `chain data is not valid JSON: ${(e as Error).message}`);
    return { issues };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    error("page", "chain data must be a JSON object");
    return { issues };
  }

  const data = raw as Partial<Record<keyof Chain, unknown>>;
  const list = <T>(key: keyof Chain): T[] => {
    if (Array.isArray(data[key])) return data[key] as T[];
    error(key, "must be an array");
    return [];
  };

  if (!AUDIENCES.includes(data.audience as string)) error("audience", `must be one of ${AUDIENCES.join(", ")}`);
  if (!isText(data.bigPicture)) error("bigPicture", "missing");
  if (!isText(data.oneBreath)) error("oneBreath", "missing");

  const steps = list<Step>("steps");
  const links = list<Link>("links");
  const loops = list<Link>("loops");
  const snaps = list<Snap>("snaps");
  const mixups = list<Mixup>("mixups");

  if (steps.length < 5 || steps.length > 9) error("steps", `has ${steps.length} steps (expected 5–9)`);

  const index = new Map<string, number>();
  steps.forEach((step, i) => {
    const where = `step ${i + 1}`;
    if (!isText(step?.id)) return error(where, "missing id");
    if (index.has(step.id)) error(where, `duplicate id "${step.id}"`);
    index.set(step.id, i);
    if (!isText(step.text)) return error(step.id, "missing text");
    const words = wordCount(step.text);
    if (words > MAX_WORDS_PER_STEP) warn(step.id, `${words} words (aim for ≤ ${MAX_WORDS_PER_STEP})`);
    if (/\band\b|그리고/i.test(step.text)) warn(step.id, `"${step.text}" may be two changes in one step`);
  });

  const edgeName = (e: { from?: unknown; to?: unknown }) => `${String(e?.from)}→${String(e?.to)}`;
  const resolve = (e: { from?: unknown; to?: unknown }, where: string) => {
    const from = index.get(e?.from as string);
    const to = index.get(e?.to as string);
    if (from === undefined) error(where, `unknown step "${String(e?.from)}"`);
    if (to === undefined) error(where, `unknown step "${String(e?.to)}"`);
    return from === undefined || to === undefined ? null : { from, to };
  };

  const incoming = new Set<number>();
  const outgoing = new Set<number>();
  const seen = new Set<string>();
  for (const link of links) {
    const where = `link ${edgeName(link)}`;
    if (seen.has(edgeName(link))) error(where, "duplicate link");
    seen.add(edgeName(link));
    if (!LINK_KINDS.includes(link?.kind)) error(where, `kind must be one of ${LINK_KINDS.join(", ")}`);
    if (!isText(link?.because)) error(where, 'missing "because" — every arrow needs a reason');
    else if (wordCount(link.because) > MAX_WORDS_PER_REASON) {
      warn(where, `reason has ${wordCount(link.because)} words (aim for ≤ ${MAX_WORDS_PER_REASON})`);
    }
    const ends = resolve(link, where);
    if (!ends) continue;
    if (ends.to <= ends.from) {
      error(where, "points backward or to itself — a feedback arrow belongs in loops");
      continue;
    }
    outgoing.add(ends.from);
    incoming.add(ends.to);
  }

  steps.forEach((step, i) => {
    if (!isText(step?.id)) return;
    if (i > 0 && !incoming.has(i)) error(step.id, "no incoming link — the chain jumps here");
    if (i < steps.length - 1 && !outgoing.has(i)) error(step.id, "no outgoing link — the chain dead-ends here");
  });

  for (const loop of loops) {
    const where = `loop ${edgeName(loop)}`;
    if (!LOOP_KINDS.includes(loop?.kind)) error(where, `kind must be one of ${LOOP_KINDS.join(", ")}`);
    if (!isText(loop?.because)) error(where, 'missing "because"');
    const ends = resolve(loop, where);
    if (ends && ends.to >= ends.from) error(where, "a loop must point back to an earlier step");
  }

  if (snaps.length < 1 || snaps.length > 2) error("snaps", `has ${snaps.length} (expected 1–2)`);
  const edges = new Set([...links, ...loops].map(edgeName));
  const lastStep = steps.at(-1);
  for (const snap of snaps) {
    const where = `snap ${edgeName(snap)}`;
    if (!edges.has(edgeName(snap))) error(where, "does not name an existing link or loop");
    if (!isText(snap?.whatIf)) error(where, 'missing "whatIf"');
    if (!isText(snap?.ending)) error(where, 'missing "ending"');
    else if (isText(lastStep?.text) && squash(snap.ending) === squash(lastStep.text)) {
      error(where, "ending is the same as the original — this link doesn't matter");
    }
  }

  if (mixups.length < 1 || mixups.length > 3) error("mixups", `has ${mixups.length} (expected 1–3)`);
  mixups.forEach((m, i) => {
    if (!isText(m?.looksLike) || !isText(m?.really)) error(`mixup ${i + 1}`, 'needs "looksLike" and "really"');
  });

  const page = squash(visibleText(html));
  const onPage = (where: string, value: unknown) => {
    if (isText(value) && !page.includes(squash(value))) error(where, `text not found on the page: "${value}"`);
  };
  onPage("bigPicture", data.bigPicture);
  onPage("oneBreath", data.oneBreath);
  steps.forEach((s) => onPage(s?.id ?? "step", s?.text));
  links.forEach((l) => onPage(`link ${edgeName(l)}`, l?.because));
  loops.forEach((l) => onPage(`loop ${edgeName(l)}`, l?.because));
  snaps.forEach((s) => {
    onPage(`snap ${edgeName(s)}`, s?.whatIf);
    onPage(`snap ${edgeName(s)}`, s?.ending);
  });
  mixups.forEach((m, i) => {
    onPage(`mixup ${i + 1}`, m?.looksLike);
    onPage(`mixup ${i + 1}`, m?.really);
  });

  const scripts = html.match(/<script\b[^>]*>/gi) ?? [];
  if (scripts.some((tag) => !/type=["']application\/(ld\+)?json["']/i.test(tag))) {
    warn("page", "contains executable <script> — layout must not depend on JavaScript");
  }

  return {
    issues,
    counts: { steps: steps.length, links: links.length, loops: loops.length, snaps: snaps.length, mixups: mixups.length },
  };
}

function main(argv: string[]) {
  const json = argv.includes("--json");
  const files = argv.filter((a) => a !== "--json");
  if (files.length === 0) {
    console.error("usage: node scripts/check-chain.ts [--json] <explainer.html>...");
    return 2;
  }

  const results = files.map((file): CheckResult & { file: string } => {
    try {
      return { file, ...checkHtml(readFileSync(file, "utf8")) };
    } catch (e) {
      return { file, issues: [{ level: "error", where: "file", message: (e as Error).message }] };
    }
  });
  const failed = results.some((r) => r.issues.some((i) => i.level === "error"));

  if (json) {
    console.log(JSON.stringify(results, null, 2));
    return failed ? 1 : 0;
  }

  for (const { file, issues, counts } of results) {
    const errors = issues.filter((i) => i.level === "error").length;
    const warnings = issues.length - errors;
    console.log(`\n${file}`);
    if (counts) {
      console.log(`  ${counts.steps} steps · ${counts.links} links · ${counts.loops} loops · ${counts.snaps} snaps · ${counts.mixups} mix-ups`);
    }
    for (const i of issues) console.log(`  ${i.level === "error" ? "✖" : "⚠"} ${i.where}: ${i.message}`);
    console.log(`  ${errors === 0 ? "✔ pass" : "✖ fail"} (${errors} errors, ${warnings} warnings)`);
  }
  return failed ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
