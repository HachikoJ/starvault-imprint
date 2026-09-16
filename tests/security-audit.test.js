const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

const AUDIT_SCRIPT = path.join(__dirname, "../scripts/security-audit.js");
// Assembled at runtime so this fixture never looks like a real token in the
// repository itself.
const FAKE_GITHUB_TOKEN = ["ghp", "abcdefghijklmnopqrstuvwxyz012345"].join("_");
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "StarVault Audit",
  GIT_AUTHOR_EMAIL: "audit@example.com",
  GIT_COMMITTER_NAME: "StarVault Audit",
  GIT_COMMITTER_EMAIL: "audit@example.com",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null"
};

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout;
}

function scratchRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-audit-"));
  git(dir, ["init", "-q", "-b", "main"]);
  return dir;
}

function writeFile(dir, relative, content) {
  const target = path.join(dir, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function runAudit(root) {
  return spawnSync(process.execPath, [AUDIT_SCRIPT], {
    env: { ...GIT_ENV, STARVAULT_AUDIT_ROOT: root },
    encoding: "utf8"
  });
}

test("secret audit passes a clean repository", () => {
  const dir = scratchRepo();
  writeFile(dir, "README.md", "# Clean project\n");
  writeFile(dir, ".env.example", "GITHUB_TOKEN=\nTAVILY_API_KEY=\n");
  writeFile(dir, "public/demo-snapshot.json", JSON.stringify({ items: [{ license: { key: "mit" } }] }));
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-qm", "baseline"]);

  const result = runAudit(dir);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Security audit passed/);
});

test("secret audit catches a token that only exists in Git history", () => {
  const dir = scratchRepo();
  writeFile(dir, "app.js", `const token = "${FAKE_GITHUB_TOKEN}";\n`);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-qm", "leak a token"]);
  writeFile(dir, "app.js", 'const token = "";\n');
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-qm", "remove the token"]);

  // The working tree is clean now, so only the history scan can catch this.
  const result = runAudit(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GitHub token in history patch/);
});

test("secret audit catches sensitive runtime paths and local artifacts", () => {
  const dir = scratchRepo();
  writeFile(dir, "data/store.json", '{"githubToken":"plaintext"}\n');
  writeFile(dir, "output/scan-results.json", '{"projects":[]}\n');
  writeFile(dir, "portable-export-2026-09-16.json", '{"projects":[]}\n');
  writeFile(dir, "public/demo-snapshot.json", JSON.stringify({ items: [] }));
  git(dir, [
    "add",
    "-Af",
    "data/store.json",
    "output/scan-results.json",
    "portable-export-2026-09-16.json",
    "public/demo-snapshot.json"
  ]);
  git(dir, ["commit", "-qm", "commit local data"]);

  const result = runAudit(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /sensitive tracked path/);
  assert.match(result.stderr, /local runtime artifact/);
  assert.doesNotMatch(result.stderr, /public\/demo-snapshot\.json/);
});
