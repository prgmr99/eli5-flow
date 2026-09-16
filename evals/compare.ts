import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { complexity, type Complexity } from "./complexity.ts";
import type { Scores } from "./judge.ts";

type Run = { topic: string; html: string; scores?: Scores };
type Row = { topic: string; runs: number; pass: number; recall: number; causal: number; snaps: number; errors: number; c: Complexity };

const avg = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

function load(dir: string): Row[] {
  const { results } = JSON.parse(readFileSync(join(dir, "results.json"), "utf8")) as { results: Run[] };
  const topics = [...new Set(results.map((r) => r.topic))].sort();
  const rows = topics.map((topic) => row(topic, results.filter((r) => r.topic === topic)));
  return [...rows, row("all", results)];
}

function row(topic: string, runs: Run[]): Row {
  const scored = runs.filter((r) => r.scores).map((r) => r.scores!);
  const cs = runs.filter((r) => existsSync(r.html)).map((r) => complexity(readFileSync(r.html, "utf8")));
  const pick = (key: keyof Complexity) => avg(cs.map((c) => c[key]));
  return {
    topic,
    runs: runs.length,
    pass: scored.filter((s) => s.pass).length,
    recall: avg(scored.map((s) => s.keyLinkRecall)),
    causal: avg(scored.map((s) => s.linkAccuracy ?? 0)),
    snaps: avg(scored.map((s) => s.snapValidity ?? 0)),
    errors: scored.reduce((n, s) => n + s.knownErrors.length + s.otherErrors, 0),
    c: { steps: pick("steps"), stepWords: pick("stepWords"), reasonWords: pick("reasonWords"), pageWords: pick("pageWords"), snaps: pick("snaps"), loops: pick("loops") },
  };
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const num = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const pair = (a: string, b: string) => (a === b ? a : `${a} → ${b}`);

function main([before, after]: string[]) {
  if (!before || !after) {
    console.error("usage: node evals/compare.ts <before results dir> <after results dir>");
    return 2;
  }
  const a = load(before);
  const b = load(after);
  const header = ["topic", "pass", "key links", "causal links", "snaps", "errors", "steps", "words/card", "words/reason", "page words"];
  const lines = a.map((x) => {
    const y = b.find((r) => r.topic === x.topic);
    if (!y) return [x.topic, "(missing)"];
    return [
      x.topic === "all" ? "**all**" : x.topic,
      pair(`${x.pass}/${x.runs}`, `${y.pass}/${y.runs}`),
      pair(pct(x.recall), pct(y.recall)),
      pair(pct(x.causal), pct(y.causal)),
      pair(pct(x.snaps), pct(y.snaps)),
      pair(String(x.errors), String(y.errors)),
      pair(num(x.c.steps), num(y.c.steps)),
      pair(num(x.c.stepWords), num(y.c.stepWords)),
      pair(num(x.c.reasonWords), num(y.c.reasonWords)),
      pair(String(Math.round(x.c.pageWords)), String(Math.round(y.c.pageWords))),
    ];
  });
  console.log([header, header.map(() => "---"), ...lines].map((cells) => `| ${cells.join(" | ")} |`).join("\n"));
  return 0;
}

process.exitCode = main(process.argv.slice(2));
