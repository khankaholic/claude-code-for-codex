import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("plugin manifest names the skills directory", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".codex-plugin", "plugin.json"), "utf8"));
  assert.equal(manifest.name, "claude-code-for-codex");
  assert.equal(manifest.skills, "./skills/");
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
});

test("every skill has matching frontmatter and no placeholders", () => {
  const skillsRoot = path.join(root, "skills");
  for (const folder of fs.readdirSync(skillsRoot)) {
    const file = path.join(skillsRoot, folder, "SKILL.md");
    assert.ok(fs.existsSync(file), `${folder} must contain SKILL.md`);
    const content = fs.readFileSync(file, "utf8");
    assert.match(content, new RegExp(`^---\\nname: ${folder}\\n`, "m"));
    assert.doesNotMatch(content, /\[TODO:/);
  }
});
