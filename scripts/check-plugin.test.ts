import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkPlugin, frontmatter } from "./check-plugin.ts";

type Tweak = { plugin?: Record<string, unknown>; entry?: Record<string, unknown>; skill?: string | null };

function fixture({ plugin = {}, entry = {}, skill }: Tweak = {}) {
  const root = mkdtempSync(join(tmpdir(), "plugin-check-"));
  mkdirSync(join(root, ".claude-plugin"), { recursive: true });
  mkdirSync(join(root, "skills/demo"), { recursive: true });
  writeFileSync(
    join(root, ".claude-plugin/plugin.json"),
    JSON.stringify({ name: "demo", version: "1.0.0", description: "d", ...plugin }),
  );
  writeFileSync(
    join(root, ".claude-plugin/marketplace.json"),
    JSON.stringify({ name: "demo", plugins: [{ name: "demo", version: "1.0.0", source: "./", ...entry }] }),
  );
  if (skill !== null) writeFileSync(join(root, "skills/demo/SKILL.md"), skill ?? "---\nname: demo\ndescription: does a thing\n---\n\nbody\n");
  return root;
}

const run = (tweak?: Tweak) => {
  const root = fixture(tweak);
  try {
    return checkPlugin(root).map((p) => `${p.where}: ${p.message}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test("a consistent plugin passes", () => {
  assert.deepEqual(run(), []);
});

test("catches the version drift between plugin.json and marketplace.json", () => {
  assert.match(run({ plugin: { version: "1.1.0" } }).join("\n"), /version 1\.0\.0 does not match plugin\.json 1\.1\.0/);
});

test("catches a marketplace entry for a different plugin name", () => {
  assert.match(run({ entry: { name: "other" } }).join("\n"), /no entry named "demo"/);
});

test("catches a missing description in plugin.json", () => {
  assert.match(run({ plugin: { description: "" } }).join("\n"), /missing "description"/);
});

test("catches a SKILL.md with no frontmatter description", () => {
  assert.match(run({ skill: "---\nname: demo\n---\n\nbody\n" }).join("\n"), /no "description"/);
});

test("catches a frontmatter name that doesn't match the directory", () => {
  assert.match(run({ skill: "---\nname: nope\ndescription: d\n---\n" }).join("\n"), /does not match directory "demo"/);
});

test("catches a missing SKILL.md", () => {
  assert.match(run({ skill: null }).join("\n"), /SKILL\.md: missing/);
});

test("frontmatter reads only the leading block", () => {
  assert.deepEqual(frontmatter("---\nname: a\ndescription: b\n---\nname: not-this\n"), { name: "a", description: "b" });
});
