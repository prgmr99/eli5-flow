---
name: eli5-flow
description: Explain how something works like I'm 5, focused on cause and effect — a picture-first HTML explainer that walks through the chain of "this happens, so that happens" step by step. Use when the user types /eli5-flow <topic>, or asks why something happens, what leads to what, or wants the step-by-step flow of a process explained simply.
---

# eli5-flow

Explain the topic to someone who knows nothing about it, as a HTML artifact with big pictures and few words. Unlike a plain ELI5, the whole explainer is built around **one clear chain of causes and effects**.

Topic: $ARGUMENTS

Write in the language the user is using.

## Workflow

1. Work out the chain first, following **Rules for the chain**.
2. Read [LAYOUT.md](LAYOUT.md) before writing any HTML, and follow it exactly — the page is full width, the whole chain fits on screen, and nothing relies on JavaScript.
3. Build the page in the order of **Page structure**, embedding the **Chain data**.
4. Go through **Before you output, check**.

## Page structure

1. **The big picture** — one sentence: "When ___ happens, in the end ___." Plus one big image.
2. **Who's involved** — 2–5 characters or parts, each a picture + a name + one short line on what it does. Introduce everything before it appears in the chain.
3. **The chain** — the core of the page. Numbered steps flowing left→right across the full width. Each step is a card:
   - a big picture of what's happening
   - one short line: *what happens*
   - an arrow to the next card, labeled with *why it leads there* ("because…", "so…")
4. **Snap a link** — pick the 1–2 most important arrows. For each: "What if step N didn't happen?" and show, in pictures, where the chain stops and what changes at the end.
5. **Easy to mix up** — 1–3 common misunderstandings, each as "Looks like ___, but really ___."
6. **Say it in one breath** — the whole chain as one line: "A, so B, so C, so D."

## Rules for the chain

- **Every arrow carries a reason.** An unlabeled arrow is not allowed.
- **One step, one change.** If a card has "and" in it, split it into two cards.
- **No jumps.** If a 5-year-old could ask "but why?" between two cards, a step is missing — add it.
- **Keep time order.** Things that happen at the same time go side by side, not in sequence.
- **Name the kind of cause** on every arrow, with a small tag (translated into the page's language):
  - `trigger` — the thing that starts it
  - `needs` — a condition that must already be true
  - `leads to` — the normal mechanism
- **Show loops as loops — only real ones.** A loop is when a later result pushes an earlier step up (`reinforcing`) or back down (`balancing`). Something that simply happens again is a repeat, not a loop — don't draw it.
- **Correlation is not a link.** Only draw an arrow if the first thing actually causes the second.
- 5–9 steps. More than 5 → group them into 2–3 stages (at most 5 steps each) with a big label each.

## Chain data (required)

Embed the chain as JSON so it can be checked automatically. Every string must be copied **verbatim** from the text shown on the page.

```html
<script type="application/json" id="eli5-flow-chain">
{
  "bigPicture": "…",
  "steps":  [{ "id": "s1", "text": "…" }],
  "links":  [{ "from": "s1", "to": "s2", "kind": "trigger | needs | leads-to", "because": "…" }],
  "loops":  [{ "from": "s6", "to": "s2", "kind": "reinforcing | balancing", "because": "…" }],
  "snaps":  [{ "from": "s3", "to": "s4", "whatIf": "…", "ending": "…" }],
  "mixups": [{ "looksLike": "…", "really": "…" }],
  "oneBreath": "…"
}
</script>
```

- `steps` in time order; `links` only point forward; anything pointing back belongs in `loops` (use `[]` if none).
- Every step except the first has an incoming link, and every step except the last has an outgoing one.
- Each snap names an existing link; `ending` is the changed outcome.

## Before you output, check

- [ ] Reading only the arrow labels tells the story on its own.
- [ ] Step 1 is something a beginner already understands; the last step is the thing they asked about.
- [ ] "Snap a link" really changes the ending — if nothing changes, that link wasn't important; pick another.
- [ ] The one-breath sentence matches the chain exactly.
- [ ] The chain data matches the page, word for word.
- [ ] At ~1000px and wider the whole chain is visible without scrolling; no card is narrower than 120px; nothing is clipped.

## Example chain (topic: why bread rises)

```
[yeast + sugar in dough] --needs: warmth--> [yeast eats sugar]
  --leads to: it breathes out gas--> [tiny gas bubbles]
  --leads to: stretchy dough traps them--> [bubbles grow]
  --leads to: more gas, more push--> [dough puffs up]
  --trigger: oven heat--> [bubbles set in place = fluffy bread]
Snap a link: no warmth → yeast stays asleep → no gas → flat, heavy bread.
```
