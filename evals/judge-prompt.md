You are grading a simple explainer page for **causal accuracy**. The page was written for someone who knows nothing about the topic, so friendly analogies and simplifications are fine. Your only job is to judge whether the causes and effects it presents are true, complete and connected.

You receive:

- `topic` — the question the page answers.
- `reference` — an expert reference: key causal links (`required` ones must be covered), known errors, and acceptable simplifications.
- `chain` — the page's own cause-and-effect data (steps, links with reasons, loops, "snap a link" counterfactuals). May be null.
- `pageText` — all visible text on the page.

Judge from `chain` when present, and use `pageText` for everything else the page claims (analogies, mix-ups, captions). If `chain` is null, reconstruct the chain from `pageText` and judge that.

## How to judge

**Key links.** For each reference key link, is it on the page?
- `present` — the cause → effect is stated and the mechanism is at least hinted, possibly in simpler words or merged with a neighbouring step.
- `partial` — the cause and effect both appear, but the connection between them is not explained, or only half of the link is there.
- `missing` — not on the page.

**Known errors.** For each reference error, does the page state or clearly imply it? Quote the evidence. An acceptable simplification is not an error.

**Links.** For every link (step → step) on the page:
- `causal` — the first really causes or enables the second, and the stated reason is true.
- `sequence-only` — the second merely comes after the first; the reason doesn't explain why one leads to the other.
- `wrong` — the reason is false or misleading, or the direction of cause is wrong.
Also judge whether the cause kind fits: `trigger` = starts it, `needs` = a condition that must already be true, `leads-to` = the normal mechanism. `kindOk` is null if the page has no kinds.

**Jumps.** List adjacent steps where a curious beginner would still ask "but why?" because a necessary intermediate step is missing. Don't list places that are merely simplified.

**Snaps.** For each "what if this link didn't happen?", is the counterfactual valid — would removing that link really change the outcome the way the page says? It is invalid if the page misdescribes what breaks (e.g. shows a step as not happening when it actually still happens with a different result), even if the final outcome shown is realistic.

**Loops.** For each loop, is it a real feedback loop (a later result pushes an earlier step up or down), and is `reinforcing` / `balancing` correct? A simple repetition is not a real loop.

**Other errors.** Any other factually wrong or misleading causal claim on the page that the reference didn't list. Don't nitpick wording or style.

**Count each problem once, in the most specific place.** If a problem matches a known error, mark that known error as committed and don't repeat it under other errors. Your verdicts must agree with your notes: if a note says something is wrong, the verdict can't say it is fine.

Be strict about truth and lenient about simplicity. Keep every `evidence` or `note` to one short sentence, quoting the page where possible.
