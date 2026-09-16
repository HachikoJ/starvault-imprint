#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

// STARVAULT_AUDIT_ROOT exists so tests can point the audit at a scratch
// repository; normal runs always scan this project.
const ROOT = path.resolve(process.env.STARVAULT_AUDIT_ROOT || path.join(__dirname, ".."));
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_GIT_OUTPUT_BYTES = 256 * 1024 * 1024;

const SECRET_PATTERNS = [
  { name: "private key", pattern: /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----/ },
  { name: "GitHub token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { name: "OpenAI-compatible key", pattern: /\bsk-[A-Za-z0-9]{24,}\b/ },
  { name: "Tavily key", pattern: /\btvly[-_][A-Za-z0-9_-]{20,}\b/i },
  { name: "Exa key", pattern: /\bexa[-_][A-Za-z0-9_-]{20,}\b/i },
  { name: "cloud access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ }
];

const SENSITIVE_TRACKED_PATH = /(?:^|\/)(?:\.env(?:\..*)?|data|\.git|node_modules|output|canvas|\.playwright-cli)(?:\/|$)/i;
// Local runtime artifacts that must never be committed: the legacy single-file
// store, the SQLite database and its WAL sidecars, and portable exports.
const LOCAL_ARTIFACT_PATH = /(?:^|\/)(?:store\.json|starvault\.db(?:-(?:wal|shm))?|(?:portable|starvault)[-_]?export[-_.][^/]*\.json)$/i;

function isAllowedSensitivePath(relative) {
  const base = path.basename(relative);
  return base === ".env.example" || base === ".gitkeep";
}

function sensitivePathFinding(relative) {
  if (isAllowedSensitivePath(relative)) return null;
  if (LOCAL_ARTIFACT_PATH.test(relative)) return "local runtime artifact";
  if (SENSITIVE_TRACKED_PATH.test(relative)) return "sensitive tracked path";
  return null;
}

function git(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
    ...options
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr?.toString("utf8")?.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout || "";
}

function hasGitHistory() {
  return spawnSync("git", ["rev-parse", "--git-dir"], { cwd: ROOT }).status === 0;
}

function historyPathFindings() {
  const findings = [];
  const reported = new Set();
  for (const commit of git(["rev-list", "--all"]).split("\n").filter(Boolean)) {
    const files = git(["ls-tree", "-r", "--name-only", commit]).split("\n").filter(Boolean);
    for (const file of files) {
      const kind = sensitivePathFinding(file);
      if (!kind) continue;
      const key = `${file}:${kind}`;
      if (reported.has(key)) continue;
      reported.add(key);
      findings.push({ file: `${commit.slice(0, 12)}:${file}`, line: 1, kind: `${kind} in history` });
    }
  }
  return findings;
}

function historyPatchFindings() {
  const findings = [];
  const reported = new Set();
  const log = git(["log", "-p", "--all", "--no-color", "--unified=0", "--format=commit %H"]);
  let commit = "";
  let file = "";
  log.split("\n").forEach((line, index) => {
    if (line.startsWith("commit ")) {
      commit = line.slice("commit ".length).trim();
      return;
    }
    if (line.startsWith("+++ b/")) {
      file = line.slice("+++ b/".length);
      return;
    }
    if (!line.startsWith("+") || line.startsWith("+++")) return;
    const content = line.slice(1);
    for (const item of SECRET_PATTERNS) {
      item.pattern.lastIndex = 0;
      if (!item.pattern.test(content)) continue;
      item.pattern.lastIndex = 0;
      const where = `${commit.slice(0, 12)}:${file || "(unknown file)"}`;
      const key = `${where}:${item.name}`;
      if (reported.has(key)) continue;
      reported.add(key);
      findings.push({ file: where, line: index + 1, kind: `${item.name} in history patch` });
    }
  });
  return findings;
}

function historyFindings() {
  if (!hasGitHistory()) return [];
  return [...historyPathFindings(), ...historyPatchFindings()];
}

function trackedFiles() {
  const result = spawnSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], {
    cwd: ROOT,
    encoding: "buffer"
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.toString("utf8") || "git ls-files failed");
  }
  return result.stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((file) => path.resolve(ROOT, file));
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function isTextBuffer(buffer) {
  return !buffer.includes(0);
}

function scanFile(filePath) {
  const relative = path.relative(ROOT, filePath);
  const findings = [];
  if (!fs.existsSync(filePath)) return findings;
  const sensitiveKind = sensitivePathFinding(relative);
  if (sensitiveKind) {
    findings.push({ file: relative, line: 1, kind: sensitiveKind });
    return findings;
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return findings;
  const buffer = fs.readFileSync(filePath);
  if (!isTextBuffer(buffer)) return findings;
  const source = buffer.toString("utf8");
  for (const item of SECRET_PATTERNS) {
    const match = item.pattern.exec(source);
    item.pattern.lastIndex = 0;
    if (match) findings.push({ file: relative, line: lineNumber(source, match.index), kind: item.name });
  }
  return findings;
}

function main() {
  const worktreeFindings = trackedFiles().flatMap(scanFile);
  const gitFindings = historyFindings();
  const findings = [...worktreeFindings, ...gitFindings];
  if (findings.length) {
    console.error("Security audit failed:");
    for (const finding of findings) console.error(`- ${finding.file}:${finding.line} (${finding.kind})`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `Security audit passed: scanned the working tree and ${
      hasGitHistory() ? "all Git commits/patches" : "an unavailable Git history"
    }, found no obvious credentials, private keys, or sensitive tracked paths.`
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

module.exports = { main };
