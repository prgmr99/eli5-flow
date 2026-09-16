import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { complexity } from "./complexity.ts";
import type { Scores } from "./judge.ts";

type Run = { topic: string; html: string; scores?: Scores; generation: { costUsd: number }; structure?: { errors: number } };

const avg = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const pct = (v: number) => `${Math.round(v * 100)}%`;
const num = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

function load(dir: string): { arm: string; runs: Run[] } {
  const { arm, results } = JSON.parse(readFileSync(join(dir, "results.json"), "utf8")) as { arm?: string; results: Run[] };
  return { arm: arm ?? "flow", runs: results };
}

function row(label: string, runs: Run[]) {
  const scored = runs.filter((r) => r.scores).map((r) => r.scores!);
  const cs = runs.filter((r) => existsSync(r.html)).map((r) => complexity(readFileSync(r.html, "utf8")));
  const withSnaps = scored.filter((s) => s.snapValidity !== null);
  return [
    label,
    String(runs.length),
    pct(avg(scored.map((s) => s.keyLinkRecall))),
    pct(avg(scored.map((s) => s.linkAccuracy ?? 0))),
    String(scored.reduce((n, s) => n + s.sequenceOnlyLinks, 0)),
    String(scored.reduce((n, s) => n + s.jumps, 0)),
    String(scored.reduce((n, s) => n + s.knownErrors.length + s.otherErrors, 0)),
    `${withSnaps.length}/${runs.length}`,
    num(avg(cs.map((c) => c.pageWords))),
    `$${avg(runs.map((r) => r.generation.costUsd)).toFixed(2)}`,
  ];
}

function main(dirs: string[]) {
  if (dirs.length === 0) {
    console.error("usage: node evals/compare-arms.ts <results dir>...");
    return 2;
  }
  const loaded = dirs.map(load);
  const header = ["arm", "runs", "key links", "causal links", "sequence-only", "jumps", "errors", "has what-ifs", "page words", "cost/page"];
  const rows = loaded.map(({ arm, runs }) => row(arm, runs));
  console.log([header, header.map(() => "---"), ...rows].map((cells) => `| ${cells.join(" | ")} |`).join("\n"));
  return 0;
}

process.exitCode = main(process.argv.slice(2));
