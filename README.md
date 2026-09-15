# eli5-flow

> Explain how anything works like I'm 5 — built around **cause and effect**.

A [Claude Code](https://claude.com/claude-code) plugin that turns any "how does this work?" or "why does this happen?" question into a picture-first HTML explainer. Instead of a loose collection of analogies, it walks through the topic as **one clear chain**: *this happens, so that happens, so that happens.*

```
/eli5-flow explain what happens when a user enters a URL and a web page loads
/eli5-flow explain how rising interest rates relate to prices
```

## Why another ELI5?

Simple explanations often fail in the same place: the steps are there, but the **connections between them** are missing. You understand each picture, yet you can't say *why* one leads to the next.

eli5-flow keeps the "big pictures, few words" spirit and adds strict rules for the links:

| Plain ELI5 | eli5-flow |
|---|---|
| Pictures and analogies | Pictures arranged as a numbered cause → effect chain |
| Arrows are optional | Every arrow must say *why* it leads to the next step |
| Steps can be skipped | If a 5-year-old could ask "but why?" between two steps, a step is missing |
| Shows what happens | Also shows what happens when a link breaks |

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
[central bank raises rates] --trigger: banks follow its lead--> [loans get pricier]
  --leads to: borrowing costs more, saving pays more--> [less money to spend]
  --leads to: lighter wallets--> [people buy less]
  --leads to: unsold goods cost shops money--> [shops raise prices more slowly]
  --so--> [inflation cools down]

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
└── skills/
    └── eli5-flow/
        └── SKILL.md        # the skill itself
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

When releasing, bump `version` in **both** `plugin.json` and `marketplace.json`.

## Acknowledgements

This project stands on the shoulders of two ELI5 skills. Thank you both for showing how much a small, well-aimed prompt can do.

- **[eli5](https://github.com/anthropics/claude-plugins-community/tree/main/eli5)** by **Thariq Shihipar** — the "big pictures, few words" HTML explainer in the Claude Code community marketplace. eli5-flow's picture-first format and its opening instruction are adapted from this plugin (MIT).
- **[ELI5](https://github.com/DreambigOu/ELI5)** by **Andrew Ou** ([@DreambigOu](https://github.com/DreambigOu)) — a skill that adapts explanations to any audience, from kids to managers. It is what got this project started, and its write-up, [Building an ELI5 Skill for Claude](https://andrewou.pages.dev/posts/building-an-eli5-skill-for-claude/), is well worth reading.

eli5-flow is an independent, unofficial project and is not affiliated with or endorsed by either author or by Anthropic.

## License

[MIT](LICENSE) © prgmr99
