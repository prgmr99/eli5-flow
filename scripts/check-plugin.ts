import { readFileSync, readdirSync, existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type Problem = { where: string; message: string };

const read = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(read(path)) as Record<string, any>;

/** Frontmatter of a SKILL.md: the keys skill loaders and skill indexes read. */
export function frontmatter(markdown: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);
  if (!match) return {};
  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([A-Za-z_-]+):\s*(.*)$/.exec(line);
    if (field) fields[field[1]] = field[2].trim();
  }
  return fields;
}

export function checkPlugin(root: string): Problem[] {
  const problems: Problem[] = [];
  const fail = (where: string, message: string) => problems.push({ where, message });

  const pluginPath = join(root, ".claude-plugin/plugin.json");
  const marketplacePath = join(root, ".claude-plugin/marketplace.json");
  if (!existsSync(pluginPath)) return [{ where: "plugin.json", message: "missing" }];
  if (!existsSync(marketplacePath)) return [{ where: "marketplace.json", message: "missing" }];

  const plugin = readJson(pluginPath);
  const marketplace = readJson(marketplacePath);
  for (const key of ["name", "version", "description"]) {
    if (!plugin[key]) fail("plugin.json", `missing "${key}"`);
  }

  const entry = (marketplace.plugins ?? []).find((p: any) => p.name === plugin.name);
  if (!entry) {
    fail("marketplace.json", `has no entry named "${plugin.name}"`);
  } else if (entry.version !== plugin.version) {
    fail("marketplace.json", `version ${entry.version} does not match plugin.json ${plugin.version}`);
  }

  const skillsDir = join(root, "skills");
  const skills = existsSync(skillsDir) ? readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()) : [];
  if (skills.length === 0) fail("skills/", "no skill directories found");

  for (const dir of skills) {
    const where = `skills/${dir.name}/SKILL.md`;
    const path = join(skillsDir, dir.name, "SKILL.md");
    if (!existsSync(path)) {
      fail(where, "missing");
      continue;
    }
    const fields = frontmatter(read(path));
    // skillsmp and Claude Code both index skills by these two fields.
    if (!fields.name) fail(where, 'frontmatter has no "name"');
    else if (fields.name !== dir.name) fail(where, `frontmatter name "${fields.name}" does not match directory "${dir.name}"`);
    if (!fields.description) fail(where, 'frontmatter has no "description"');
  }

  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
  const problems = checkPlugin(root);
  for (const p of problems) console.log(`  ✖ ${p.where}: ${p.message}`);
  console.log(problems.length === 0 ? `✔ ${basename(root)}: plugin manifests and skills are consistent` : `✖ ${problems.length} problem(s)`);
  process.exitCode = problems.length === 0 ? 0 : 1;
}
