import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { assertComplete, loadReference, score, type Reference, type Verdict } from "./judge.ts";

const reference: Reference = {
  id: "t",
  prompt: "topic",
  keyLinks: [
    { id: "K1", required: true, cause: "a", effect: "b", mechanism: "m" },
    { id: "K2", required: true, cause: "b", effect: "c", mechanism: "m" },
    { id: "K3", required: false, cause: "c", effect: "d", mechanism: "m" },
  ],
  knownErrors: [{ id: "E1", claim: "x", why: "y" }],
  acceptableSimplifications: [],
};

const goodVerdict = (): Verdict => ({
  keyLinks: [
    { id: "K1", verdict: "present", evidence: "" },
    { id: "K2", verdict: "present", evidence: "" },
    { id: "K3", verdict: "missing", evidence: "" },
  ],
  knownErrors: [{ id: "E1", committed: false, evidence: "" }],
  links: [
    { from: "s1", to: "s2", verdict: "causal", kindOk: true, note: "" },
    { from: "s2", to: "s3", verdict: "causal", kindOk: true, note: "" },
  ],
  jumps: [],
  snaps: [{ from: "s1", to: "s2", valid: true, note: "" }],
  loops: [],
  otherErrors: [],
});

test("a clean verdict passes, and optional key links don't count", () => {
  const s = score(reference, goodVerdict());
  assert.equal(s.keyLinkRecall, 1);
  assert.equal(s.linkAccuracy, 1);
  assert.equal(s.loopValidity, null);
  assert.equal(s.pass, true);
});

test("partial key links count half", () => {
  const v = goodVerdict();
  v.keyLinks[1].verdict = "partial";
  const s = score(reference, v);
  assert.equal(s.keyLinkRecall, 0.75);
  assert.equal(s.pass, false);
});

test("a committed known error fails even with perfect links", () => {
  const v = goodVerdict();
  v.knownErrors[0].committed = true;
  const s = score(reference, v);
  assert.deepEqual(s.knownErrors, ["E1"]);
  assert.equal(s.pass, false);
});

test("sequence-only links lower link accuracy", () => {
  const v = goodVerdict();
  v.links[1].verdict = "sequence-only";
  const s = score(reference, v);
  assert.equal(s.linkAccuracy, 0.5);
  assert.equal(s.sequenceOnlyLinks, 1);
  assert.equal(s.pass, false);
});

test("a fake loop fails", () => {
  const v = goodVerdict();
  v.loops = [{ from: "s3", to: "s1", real: false, kindOk: false, note: "" }];
  assert.equal(score(reference, v).pass, false);
});

test("an invalid snap fails", () => {
  const v = goodVerdict();
  v.snaps[0].valid = false;
  assert.equal(score(reference, v).pass, false);
});

test("a verdict that skips reference items is rejected", () => {
  const v = goodVerdict();
  v.keyLinks = v.keyLinks.slice(1);
  assert.throws(() => assertComplete(reference, v), /K1/);
});

test("every reference file is well-formed", () => {
  const dir = new URL("./references/", import.meta.url);
  for (const file of readdirSync(dir)) {
    const ref = loadReference(file.replace(/\.json$/, ""));
    assert.equal(`${ref.id}.json`, file);
    assert.ok(ref.prompt.length > 0);
    assert.ok(ref.keyLinks.filter((k) => k.required).length >= 4, `${file}: needs at least 4 required key links`);
    assert.ok(ref.knownErrors.length >= 3, `${file}: needs at least 3 known errors`);
    assert.equal(new Set(ref.keyLinks.map((k) => k.id)).size, ref.keyLinks.length);
  }
});
