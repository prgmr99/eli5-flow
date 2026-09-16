---
name: eli5-flow
description: Explain how something works, focused on cause and effect — a picture-first HTML explainer that walks through the chain of "this happens, so that happens" step by step, for a complete beginner or, on request, for developers. Use when the user types /eli5-flow <topic>, or asks why something happens, what leads to what, or wants the step-by-step flow of a process explained — including when they ask for it "for developers", "for engineers", or with --for dev.
---

# eli5-flow

Explain the topic to someone who knows nothing about it, as a HTML artifact with big pictures and few words. Unlike a plain ELI5, the whole explainer is built around **one clear chain of causes and effects**.

Topic: $ARGUMENTS

Write in the language the user is using.

## Who it's for

Default: someone who knows nothing about the topic.

Switch to **dev** when the request asks for it — `--for dev`, `--for developers`, or plain words in any language ("for engineers", "개발자에게 설명해줘"). Take that part out of the topic before you explain it.

| | default | dev |
|---|---|---|
| Words | everyday words, no jargon | the real terms (DNS lookup, TCP handshake, reconciliation, commit) |
| Pictures | everyday analogies (a phone book, a letter) | the real parts (browser, server, DOM, the event loop) |
| Depth | why it happens | why it happens, and what actually does it |
| Easy to mix up | what a beginner gets wrong | what developers actually get wrong |

Everything else is identical: the same chain rules, the same snap-a-link, the same layout, the same number of cards. Only the words and the depth change — dev pages are not longer or busier.

## What matters most, in order

1. **The main flow is clear at a glance.** Reading only the cards, left to right, once, a beginner gets the whole story.
2. **Every link is true.**
3. **Extra detail** — only where it doesn't slow down #1 or make the page busier. When in doubt, leave it out.

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
4. **Snap a link** — pick the 1–2 most important arrows. For each: "What if step N didn't happen?" and show, in pictures, where the chain stops and what changes at the end. The changed ending must be what really happens (the real error message, the real outcome), not a guess.
5. **Easy to mix up** — 1–3 common misunderstandings, each as "Looks like ___, but really ___."
6. **Say it in one breath** — the whole chain as one line: "A, so B, so C, so D."

## Rules for the chain

- **Every arrow carries a short reason** — about 10 words or fewer. An unlabeled arrow is not allowed.
- **One step, one change.** If a card has "and" in it, split it into two cards.
- **No jumps.** If a 5-year-old could ask "but why?" between two cards, a step is missing — add it.
- **Close gaps without adding clutter.** At each arrow, think of the obvious shortcut a beginner would suggest ("just sell the loans", "just send the name"). If the page doesn't say why it fails, put the answer into that arrow's reason in a few words. Add a new card only when the answer is an event the ending depends on — never for background detail.
- **Simple words, true amounts.** Make the words easy, never the quantities. Don't write *stops*, *never*, *always*, *every time* or *all* unless it is literally true — say *less*, *slower*, *most*, *usually*.
- **Conditions aren't causes.** A background fact that lets something happen but doesn't make it happen (only a little cash in the vault, dry wood) never gets an arrow into the event that starts things. Mention it in the reason on the arrow where it matters, or in "Who's involved" — not as an extra card.
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
  "audience": "beginner | dev",
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
- [ ] "Snap a link" really changes the ending — if nothing changes, that link wasn't important; pick another. The new ending is what really happens.
- [ ] No *stops / never / always / every time / all* that isn't literally true.
- [ ] Reading only the cards, a beginner gets the whole story in one pass; no detail you added makes that harder or the page busier.
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
