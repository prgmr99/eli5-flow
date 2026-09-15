---
name: eli5-flow
description: Explain how something works like I'm 5, focused on cause and effect — a picture-first HTML explainer that walks through the chain of "this happens, so that happens" step by step. Use when the user types /eli5-flow <topic>, or asks why something happens, what leads to what, or wants the step-by-step flow of a process explained simply.
---

# eli5-flow

Explain the topic to someone who knows nothing about it, as a HTML artifact with big pictures and few words. Unlike a plain ELI5, the whole explainer is built around **one clear chain of causes and effects**.

Topic: $ARGUMENTS

Write in the language the user is using.

## Page structure

1. **The big picture** — one sentence: "When ___ happens, in the end ___." Plus one big image.
2. **Who's involved** — 2–5 characters or parts, each a picture + a name + one short line on what it does. Introduce everything before it appears in the chain.
3. **The chain** — the core of the page. Numbered steps flowing left→right across the full width (see Layout). Each step is a card:
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
- **Name the kind of cause** when it matters, with a small tag on the arrow:
  - `trigger` — the thing that starts it
  - `needs` — a condition that must already be true
  - `leads to` — the normal mechanism
- **Show loops as loops.** If the result feeds back into an earlier step (it keeps growing, or keeps itself in balance), draw the arrow going back and say so.
- **Correlation is not a link.** Only draw an arrow if the first thing actually causes the second.
- 5–9 steps. If it needs more, group steps into 2–3 stages with a big label each.

## Layout: use the full width

The flow is the point, so the page is wide, not a narrow reading column.

- **No page-level `max-width`.** The main wrapper spans the whole viewport, with only a side gutter (`padding-inline: clamp(16px, 3vw, 48px)`).
- **The chain is one horizontal lane.** All steps sit in a single row that stretches edge to edge. Never zig-zag or wrap cards into a new row on wide screens — the eye should travel one direction.
- **The whole lane fits on screen.** The last step is the answer, so it must never hide behind a scrollbar. Size the lane to fit: a grid where cards share the space (`minmax(0, 1fr)`) and arrow columns stay narrow (~90–120px) with the reason text wrapping onto 2–3 short lines under the arrow.
- **Stages are stacked lanes.** More than ~6 steps → split into stages, each its own full-width row with its label on the left; a drop connector runs from the end of one lane to the start of the next (see Spacing and connectors).
- **Scrolling is the last resort.** Only if a lane still can't fit at ~1000px wide, let that lane container alone scroll sideways (`overflow-x: auto`). No `min-width` on the lane that forces scrolling when it would fit. The page itself never scrolls horizontally.
- **Nothing pokes out of a card.** Step numbers, tags and badges sit *inside* the card's border (e.g. `top: 8px; left: 8px`), never at negative offsets. Any `overflow` other than `visible` on an ancestor clips both axes, so an overhanging badge gets cut off.
- **Reason text always wraps.** Arrow, drop and loop labels have a `max-width` inside their column or run and never use `white-space: nowrap` — a long label must not push the page wider than the screen.
- **Other sections use the width too.** "Who's involved" and "Easy to mix up" are rows of cards across the page; each "Snap a link" is its own full-width lane on the **same column grid** as the main chain, so step N sits directly under step N and the broken link and changed ending line up with the original.
- **Narrow screens (< 720px):** stack the chain top→bottom with downward arrows, reason text still on each arrow.

## Spacing and connectors

- **One spacing scale** (8 · 16 · 24 · 40 · 64 · 96px) for every gap. Bigger boundary, bigger gap: inside a card < heading → content (24) < between lanes (~96) < between sections (96–128).
- **Arrows sit on the card's center line.** Inside a lane the arrow line is vertically centered on the cards; the tag goes above the line, the reason below.
- **A connector touches only its two cards.** It starts at the *source* card's edge and its arrowhead ends at the *target* card's edge, with a small, equal gap (~6px) at both ends. Never draw a line segment that touches any other card.
- **No JavaScript for layout.** Connectors must render correctly with no script and at every width, so build them in CSS on the lanes' own grid, not by measuring elements.
- **Stage-to-stage drop** (last card of one lane → first card of the next): a band between the lanes using the **same `grid-template-columns`** as the lanes, with three rows:
  1. a vertical line centered in the *source* column, from its card down to the middle row;
  2. a horizontal line from the target column's center to the source column's center (span those columns; start and end at half-column with pseudo-elements or `linear-gradient`), with the label centered on it;
  3. a vertical line with an arrowhead centered in the *target* column, ending just above its card.
  Nothing is drawn in row 1 above the target, so it can't look like the line also leaves the card above the target.
- **The label rides the middle of the run.** The horizontal run sits exactly halfway between the two lanes; its label is centered on the run with a background knock-out, leaving at least 24px clear above and below. Size the gap for that (label height + 2 × 24px + the vertical segments), don't squeeze the label into the next lane.
- **Loops** follow the same rules: an SVG path in its own band under the lane, from the later card's bottom back to the earlier card's bottom, label on the middle of the run.

## Visual style

- Big pictures (inline SVG or emoji), very few words — at most ~12 words per card.
- The arrows are as prominent as the cards; the reason text sits on the arrow itself.
- Use one accent color for the main chain and a muted color for "snap a link" what-ifs.
- No walls of text, no jargon. If a technical word is unavoidable, show it as a picture first, then name it.

## Before you output, check

- [ ] Reading only the arrow labels tells the story on its own.
- [ ] Step 1 is something a beginner already understands; the last step is the thing they asked about.
- [ ] "Snap a link" really changes the ending — if nothing changes, that link wasn't important; pick another.
- [ ] The one-breath sentence matches the chain exactly.

## Example chain (topic: why bread rises)

```
[yeast + sugar in dough] --needs: warmth--> [yeast eats sugar]
  --leads to: it breathes out gas--> [tiny gas bubbles]
  --because: stretchy dough traps them--> [bubbles grow]
  --so--> [dough puffs up] --trigger: oven heat--> [bubbles set in place = fluffy bread]
Snap a link: no warmth → yeast stays asleep → no gas → flat, heavy bread.
```
