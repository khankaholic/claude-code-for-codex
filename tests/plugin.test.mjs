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

test("repository marketplace exposes the root plugin", () => {
  const marketplace = JSON.parse(fs.readFileSync(path.join(root, ".agents", "plugins", "marketplace.json"), "utf8"));
  assert.equal(marketplace.name, "claude-code-for-codex");
  assert.equal(marketplace.plugins.length, 1);
  assert.equal(marketplace.plugins[0].name, "claude-code-for-codex");
  assert.deepEqual(marketplace.plugins[0].source, {
    source: "local",
    path: "./"
  });
  assert.equal(marketplace.plugins[0].policy.installation, "AVAILABLE");
  assert.equal(marketplace.plugins[0].policy.authentication, "ON_INSTALL");
  assert.equal(marketplace.plugins[0].category, "Developer Tools");
});

test("installation guides target Codex instead of Claude Code plugins", () => {
  for (const file of ["README.md", "docs/INSTALL.md", "docs/INSTALL_AGENT.md"]) {
    const content = fs.readFileSync(path.join(root, file), "utf8");
    assert.match(content, /codex plugin marketplace add/);
    assert.match(content, /codex plugin add/);
    assert.doesNotMatch(content, /\/plugin (marketplace add|install)/);
  }
});

test("README provides a fetchable Codex agent bootstrap", () => {
  const content = fs.readFileSync(path.join(root, "README.md"), "utf8");
  assert.match(content, /Paste this into Codex:/);
  assert.match(content, /https:\/\/raw\.githubusercontent\.com\/khankaholic\/claude-code-for-codex\/refs\/heads\/main\/docs\/INSTALL_AGENT\.md/);
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
