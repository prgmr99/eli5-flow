# eli5-flow

> Explain how anything works like I'm 5 — built around **cause and effect**.

A [Claude Code](https://claude.com/claude-code) plugin that turns any "how does this work?" or "why does this happen?" question into a picture-first HTML explainer. Instead of a loose collection of analogies, it walks through the topic as **one clear chain**: *this happens, so that happens, so that happens.*

```
/eli5-flow explain what happens when a user enters a URL and a web page loads
/eli5-flow explain how rising interest rates relate to prices
```

### Explaining it to developers

By default the explainer assumes you know nothing about the topic. Add `--for dev` — or just ask for it in words, in any language — and it keeps the same chain, the same layout and the same number of cards, but uses the real terms instead of analogies:

```
/eli5-flow --for dev what happens in React when state changes and the screen updates
/eli5-flow explain the browser event loop for engineers
```

| | default | `--for dev` |
|---|---|---|
| Words | everyday words, no jargon | DNS lookup, TCP handshake, reconciliation, commit |
| Pictures | a phone book, a letter | browser, server, DOM |
| Depth | why it happens | why it happens, and what actually does it |
| Easy to mix up | what a beginner gets wrong | what developers actually get wrong |

## Why another ELI5?

Simple explanations often fail in the same place: the steps are there, but the **connections between them** are missing. You understand each picture, yet you can't say *why* one leads to the next.

eli5-flow keeps the "big pictures, few words" spirit and adds strict rules for the links: every arrow states its reason, no step may be skipped, and each page shows what breaks if one link is removed.

### How it compares — measured, not asserted

Five topics with expert reference answers, explained by each tool, then graded by a separate Claude instance that was not told which tool wrote which page ([the harness is in `evals/`](#evaluating)):

| | eli5-flow | eli5 | plain Claude, no plugin |
|---|---|---|---|
| pages graded | 15 | 10 | 10 |
| key causal links covered | 98% | 94% | **100%** |
| links judged truly causal | 98% | 90% | 99% |
| "but why?" gaps left | 5 | 11 | **1** |
| factual errors | **0** | 3 | 4 |
| pages showing what breaks | **15/15** | 1/10 | 2/10 |
| words per page | 573 | **285** | 1395 |
| cost per page | $1.99 | **$1.29** | $1.20 |

Each tool wins something:

- **Plain Claude is the most complete — and 2.4× longer.** It covered every key link, but it also made the most factual errors, and a 1400-word page is an article, not a picture of a flow.
- **eli5 is the shortest and cheapest.** If you want one quick picture of a topic, that is exactly what it is for. It also leaves the most "but why?" gaps — twice as many as eli5-flow in half the pages.
- **eli5-flow lands in between on length and first on accuracy.** It was the only one with no factual errors, and the only one that reliably shows what happens when a link is removed.

Caveats worth reading: two runs per topic for the comparison columns, so the error counts are indicative, not settled. The rubric scores causal accuracy and counterfactuals — which is what eli5-flow optimizes for and not what plain eli5 aims at. Run it yourself with `node evals/run.ts --arm eli5 --runs 2`.

## What you get

Each explainer is a single HTML page with six sections:

1. **The big picture** — one sentence: "When ___ happens, in the end ___."
2. **Who's involved** — the 2–5 characters or parts, introduced before they appear.
3. **The chain** — 5–9 numbered steps. Every arrow carries a reason and a small tag:
   - `trigger` — what starts it
   - `needs` — a condition that must already be true
   - `leads to` — the normal mechanism
4. **Snap a link** — "What if step N didn't happen?" Shows where the chain stops and how the ending changes. If nothing changes, that link wasn't important.
5. **Easy to mix up** — common misunderstandings: "Looks like ___, but really ___."
6. **Say it in one breath** — the whole chain in one line: "A, so B, so C, so D."

Example chain for *how rising interest rates relate to prices*:

```
[central bank raises rates] --trigger: banks follow the central bank's rate--> [loans get pricier]
  --leads to: borrowing costs more, saving pays more--> [less money to spend]
  --leads to: lighter wallets--> [people buy less]
  --leads to: unsold goods cost shops money--> [shops raise prices more slowly]
  --leads to: many shops at once--> [inflation cools down]

Snap a link: if costs keep rising and shops must raise prices anyway
  → price tags keep climbing even with fewer customers → inflation doesn't cool.
```

The explainer is written in whatever language you ask in.

## Install

In Claude Code:

```
/plugin marketplace add prgmr99/eli5-flow
/plugin install eli5-flow@eli5-flow
```

Or from your shell:

```bash
claude plugin marketplace add prgmr99/eli5-flow
claude plugin install eli5-flow@eli5-flow
```

Start a new session after installing, then run `/eli5-flow <topic>`. Claude may also pick the skill up on its own when you ask *why* something happens or *what leads to what*.

### Update

```bash
claude plugin marketplace update eli5-flow
claude plugin update eli5-flow@eli5-flow
```

### Uninstall

```bash
claude plugin uninstall eli5-flow@eli5-flow
claude plugin marketplace remove eli5-flow
```

## Repository layout

```
eli5-flow/
├── .claude-plugin/
│   ├── plugin.json         # plugin metadata
│   └── marketplace.json    # makes this repo installable as a marketplace
├── scripts/
│   ├── check-chain.ts      # structural checker for generated explainers
│   └── check-chain.test.ts
└── skills/
    └── eli5-flow/
        ├── SKILL.md        # the skill: chain rules, page structure, chain data
        └── LAYOUT.md       # full-width layout, spacing and connector rules
```

## Development

Try local changes without installing:

```bash
claude --plugin-dir ./
```

Validate before pushing:

```bash
claude plugin validate --strict .claude-plugin/plugin.json
claude plugin validate --strict .claude-plugin/marketplace.json
claude plugin validate --strict skills
```

### Checking an explainer

Every explainer embeds its chain as JSON (`<script type="application/json" id="eli5-flow-chain">`). The checker (Node 22.18+, no dependencies) reads it and fails on structural problems:

- a step with no incoming or outgoing link (a jump or a dead end)
- an arrow without a reason or a cause kind (`trigger` / `needs` / `leads-to`)
- a backward arrow that isn't declared as a `reinforcing` / `balancing` loop
- a "snap a link" that names no real link, or whose ending doesn't change
- chain data that doesn't match the text on the page

```bash
node scripts/check-chain.ts path/to/explainer.html
node --test scripts/check-chain.test.ts
```

It checks **form, not truth**: a chain can pass and still be wrong about what causes what. That is what the evaluation below is for.

### Evaluating

`evals/references/*.json` holds an expert reference per topic: the key causal links, the errors people actually make, and the simplifications that are fine. A run explains every topic, checks the structure, and then has a separate, isolated Claude grade each page against its reference — no tools, no user settings, and no clue which tool produced the page.

```bash
node evals/run.ts --runs 3                      # this skill, every topic
node evals/run.ts --arm eli5 --runs 2           # compare against another skill
node evals/run.ts --arm plain --runs 2          # compare against no plugin at all
node evals/run.ts --resume evals/results/<dir>  # retry only the runs that failed
node evals/compare.ts <before dir> <after dir>  # accuracy and page complexity, side by side
node evals/compare-arms.ts <dir> <dir> <dir>    # one table per tool
```

Scores are computed in code from the grader's per-item verdicts, so the thresholds are visible and adjustable in `evals/judge.ts`. Results land in `evals/results/<timestamp>/` (git-ignored) with every page, transcript and verdict kept.

A run costs real money — roughly $2 per page generated plus $0.12 to grade it.

### Release

When releasing, bump `version` in **both** `plugin.json` and `marketplace.json`.

## Acknowledgements

This project stands on the shoulders of two ELI5 skills. Thank you both for showing how much a small, well-aimed prompt can do.

- **[eli5](https://github.com/anthropics/claude-plugins-community/tree/main/eli5)** by **Thariq Shihipar** — the "big pictures, few words" HTML explainer in the Claude Code community marketplace. eli5-flow's picture-first format and its opening instruction are adapted from this plugin (MIT).
- **[ELI5](https://github.com/DreambigOu/ELI5)** by **Andrew Ou** ([@DreambigOu](https://github.com/DreambigOu)) — a skill that adapts explanations to any audience, from kids to managers. It is what got this project started, and its write-up, [Building an ELI5 Skill for Claude](https://andrewou.pages.dev/posts/building-an-eli5-skill-for-claude/), is well worth reading.

eli5-flow is an independent, unofficial project and is not affiliated with or endorsed by either author or by Anthropic.

## License

[MIT](LICENSE) © prgmr99
