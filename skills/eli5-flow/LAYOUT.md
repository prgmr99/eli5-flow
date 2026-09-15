# eli5-flow layout

How to lay out the explainer page. The flow is the point, so the page is wide, not a narrow reading column.

## Width

- **No page-level `max-width`.** The main wrapper spans the whole viewport, with only a side gutter (`padding-inline: clamp(16px, 3vw, 48px)`).
- **The chain is one horizontal lane.** All steps sit in a single row that stretches edge to edge. Never zig-zag or wrap cards into a new row on wide screens — the eye should travel one direction.
- **The whole lane fits on screen.** The last step is the answer, so it must never hide behind a scrollbar on a laptop or wider. Cards share the space but never get narrower than a readable card: `minmax(120px, 1fr)`. Arrow columns stay narrow (~80–110px) with the reason text wrapping onto 2–3 short lines under the arrow.
- **At most 5 cards per lane.** More steps → split into stages, each its own full-width row with its label on the left; a drop connector runs from the end of one lane to the start of the next. Five cards at their minimum fit in ~1000px.
- **Scrolling is the safety net, not the plan.** Wrap each lane in a container with `overflow-x: auto`, so if the screen is too narrow for the cards' minimum width, only that lane scrolls sideways — cards are never squeezed. The page itself never scrolls horizontally.
- **Nothing pokes out of a card.** Step numbers, tags and badges sit *inside* the card's border (e.g. `top: 8px; left: 8px`), never at negative offsets. Any `overflow` other than `visible` on an ancestor clips both axes, so an overhanging badge gets cut off.
- **Reason text always wraps.** Arrow, drop and loop labels have a `max-width` inside their column or run and never use `white-space: nowrap` — a long label must not push the page wider than the screen.
- **Other sections use the width too.** "Who's involved" and "Easy to mix up" are rows of cards across the page; each "Snap a link" is its own full-width lane on the **same column grid** as the main chain, so step N sits directly under step N and the broken link and changed ending line up with the original.
- **Narrow screens (< 900px, phones and portrait tablets):** stack the chain top→bottom with downward arrows, reason text still on each arrow.
- **Standalone files need a real `<head>`.** If you write a complete `.html` file yourself (rather than publishing through a tool that adds the `<head>`), include `<meta charset="utf-8">` and `<meta name="viewport" content="width=device-width, initial-scale=1">` — without them emoji turn into garbage and phones render the page 980px wide.

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
- **Loops** follow the same rules: a band under the lane, from the later card's bottom back to the earlier card's bottom, label on the middle of the run.

## Visual style

- Big pictures (inline SVG or emoji), very few words — at most ~12 words per card.
- The arrows are as prominent as the cards; the reason text sits on the arrow itself.
- Use one accent color for the main chain and a muted color for "snap a link" what-ifs.
- No walls of text, no jargon. If a technical word is unavoidable, show it as a picture first, then name it.
