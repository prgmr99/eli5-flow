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
3. **The chain** — the core of the page. Numbered steps, drawn left→right (top→bottom on narrow screens). Each step is a card:
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
