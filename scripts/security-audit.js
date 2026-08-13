#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const MAX_FILE_BYTES = 4 * 1024 * 1024;

const SECRET_PATTERNS = [
  { name: "private key", pattern: /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----/ },
  { name: "GitHub token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { name: "OpenAI-compatible key", pattern: /\bsk-[A-Za-z0-9]{24,}\b/ },
  { name: "Tavily key", pattern: /\btvly[-_][A-Za-z0-9_-]{20,}\b/i },
  { name: "Exa key", pattern: /\bexa[-_][A-Za-z0-9_-]{20,}\b/i },
  { name: "cloud access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ }
];

const SENSITIVE_TRACKED_PATH = /(?:^|\/)(?:\.env(?:\..*)?|data|\.git|node_modules|output|canvas|\.playwright-cli)(?:\/|$)/i;

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
  const isExampleEnv = path.basename(relative) === ".env.example";
  const isKeepFile = path.basename(relative) === ".gitkeep";
  if (!isExampleEnv && !isKeepFile && SENSITIVE_TRACKED_PATH.test(relative)) {
    findings.push({ file: relative, line: 1, kind: "sensitive tracked path" });
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
  const findings = trackedFiles().flatMap(scanFile);
  if (findings.length) {
    console.error("Security audit failed:");
    for (const finding of findings) console.error(`- ${finding.file}:${finding.line} (${finding.kind})`);
    process.exitCode = 1;
    return;
  }
  console.log("Security audit passed: no obvious credentials, private keys, or sensitive tracked paths found.");
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
