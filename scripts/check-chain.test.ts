import { test } from "node:test";
import assert from "node:assert/strict";
import { checkHtml, type Issue } from "./check-chain.ts";

type Data = Record<string, any>;

const validChain = (): Data => ({
  audience: "beginner",
  bigPicture: "When yeast is warm, in the end bread gets fluffy.",
  steps: [
    { id: "s1", text: "Yeast sits in sugary dough" },
    { id: "s2", text: "Yeast eats sugar" },
    { id: "s3", text: "Tiny gas bubbles appear" },
    { id: "s4", text: "Bubbles grow" },
    { id: "s5", text: "Bread comes out fluffy" },
  ],
  links: [
    { from: "s1", to: "s2", kind: "needs", because: "it is warm" },
    { from: "s2", to: "s3", kind: "leads-to", because: "it breathes out gas" },
    { from: "s3", to: "s4", kind: "leads-to", because: "stretchy dough traps them" },
    { from: "s4", to: "s5", kind: "trigger", because: "oven heat sets them" },
  ],
  loops: [],
  snaps: [{ from: "s1", to: "s2", whatIf: "What if it is cold?", ending: "Bread stays flat" }],
  mixups: [{ looksLike: "Looks like the oven puffs it up", really: "Really the yeast gas does" }],
  oneBreath: "Warm yeast eats sugar, so gas, so bubbles, so fluffy bread.",
});

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !["id", "from", "to", "kind", "audience"].includes(key))
      .flatMap(([, v]) => strings(v));
  }
  return [];
}

function page(data: Data, options: { hide?: string; script?: string } = {}) {
  const body = strings(data)
    .filter((s) => s !== options.hide)
    .map((s) => `<p>${s}</p>`)
    .join("\n");
  return `<main>${body}</main>
<script type="application/json" id="eli5-flow-chain">${JSON.stringify(data)}</script>${options.script ?? ""}`;
}

const errors = (issues: Issue[]) => issues.filter((i) => i.level === "error");
const warnings = (issues: Issue[]) => issues.filter((i) => i.level === "warning");

function expectError(html: string, pattern: RegExp) {
  const found = errors(checkHtml(html).issues);
  assert.ok(
    found.some((i) => pattern.test(`${i.where}: ${i.message}`)),
    `expected an error matching ${pattern}, got:\n${found.map((i) => `${i.where}: ${i.message}`).join("\n") || "(none)"}`,
  );
}

test("a well-formed chain passes with no errors or warnings", () => {
  const { issues, counts } = checkHtml(page(validChain()));
  assert.deepEqual(issues, []);
  assert.equal(counts?.steps, 5);
});

test("an unknown audience", () => {
  const data = validChain();
  data.audience = "manager";
  expectError(page(data), /audience: must be one of/);
});

test("a dev-audience chain passes", () => {
  const data = validChain();
  data.audience = "dev";
  assert.deepEqual(errors(checkHtml(page(data)).issues), []);
});

test("missing chain data", () => {
  expectError("<main>hello</main>", /no <script .*eli5-flow-chain/);
});

test("invalid JSON", () => {
  expectError('<script type="application/json" id="eli5-flow-chain">{ nope </script>', /not valid JSON/);
});

test("too few steps", () => {
  const data = validChain();
  data.steps = data.steps.slice(0, 4);
  data.links = data.links.slice(0, 3);
  expectError(page(data), /steps: has 4 steps/);
});

test("an arrow without a reason", () => {
  const data = validChain();
  data.links[1].because = " ";
  expectError(page(data), /link s2→s3: missing "because"/);
});

test("an unknown cause kind", () => {
  const data = validChain();
  data.links[0].kind = "so";
  expectError(page(data), /link s1→s2: kind must be one of/);
});

test("a jump: a step with no incoming link", () => {
  const data = validChain();
  data.links = data.links.filter((l: Data) => l.to !== "s3");
  data.links.push({ from: "s2", to: "s4", kind: "leads-to", because: "skips a step" });
  expectError(page(data), /s3: no incoming link/);
});

test("a dead end: a step with no outgoing link", () => {
  const data = validChain();
  data.links = data.links.filter((l: Data) => l.from !== "s3");
  data.links.push({ from: "s2", to: "s4", kind: "leads-to", because: "goes around" });
  expectError(page(data), /s3: no outgoing link/);
});

test("a backward arrow hidden in links", () => {
  const data = validChain();
  data.links.push({ from: "s4", to: "s2", kind: "leads-to", because: "comes back" });
  expectError(page(data), /link s4→s2: points backward/);
});

test("a loop that is not reinforcing or balancing", () => {
  const data = validChain();
  data.loops = [{ from: "s4", to: "s2", kind: "repeat", because: "happens again" }];
  expectError(page(data), /loop s4→s2: kind must be one of/);
});

test("a loop that points forward", () => {
  const data = validChain();
  data.loops = [{ from: "s2", to: "s4", kind: "reinforcing", because: "more and more" }];
  expectError(page(data), /loop s2→s4: a loop must point back/);
});

test("a snap on a link that does not exist", () => {
  const data = validChain();
  data.snaps[0] = { ...data.snaps[0], from: "s1", to: "s3" };
  expectError(page(data), /snap s1→s3: does not name an existing link/);
});

test("a snap whose ending does not change", () => {
  const data = validChain();
  data.snaps[0].ending = "Bread comes out fluffy";
  expectError(page(data), /snap s1→s2: ending is the same/);
});

test("chain data that does not match the page", () => {
  const data = validChain();
  expectError(page(data, { hide: "it breathes out gas" }), /link s2→s3: text not found on the page/);
});

test("page text may be split across tags and lines", () => {
  const data = validChain();
  const html = page(data, { hide: "Tiny gas bubbles appear" }).replace("<main>", "<main><p>Tiny <b>gas</b><br>\n bubbles appear</p>");
  assert.deepEqual(errors(checkHtml(html).issues), []);
});

test("warns on long steps, long reasons, double steps and executable scripts", () => {
  const data = validChain();
  data.steps[3].text = "Bubbles grow and the dough gets bigger and bigger and softer every single minute";
  data.links[2].because = "because the stretchy gluten net in the dough holds on to every little bubble of gas for a long time";
  const { issues } = checkHtml(page(data, { script: "<script>draw()</script>" }));
  assert.deepEqual(errors(issues), []);
  const messages = warnings(issues).map((i) => i.message).join("\n");
  assert.match(messages, /^\d+ words \(aim for/m);
  assert.match(messages, /reason has \d+ words/);
  assert.match(messages, /may be two changes/);
  assert.match(messages, /executable <script>/);
});
