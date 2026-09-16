import { extractChainJson, visibleText, wordCount } from "../scripts/check-chain.ts";

export type Complexity = {
  steps: number;
  stepWords: number;
  reasonWords: number;
  pageWords: number;
  snaps: number;
  loops: number;
};

type ChainLike = {
  steps?: { text?: string }[];
  links?: { because?: string }[];
  snaps?: unknown[];
  loops?: unknown[];
};

const avg = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

export function complexity(html: string): Complexity {
  const chain = (extractChainJson(html) ?? {}) as ChainLike;
  const steps = chain.steps ?? [];
  const links = chain.links ?? [];
  return {
    steps: steps.length,
    stepWords: avg(steps.map((s) => wordCount(s.text ?? ""))),
    reasonWords: avg(links.map((l) => wordCount(l.because ?? ""))),
    pageWords: wordCount(visibleText(html)),
    snaps: chain.snaps?.length ?? 0,
    loops: chain.loops?.length ?? 0,
  };
}
