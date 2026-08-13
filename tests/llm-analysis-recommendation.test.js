const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const llmSource = fs.readFileSync(path.join(__dirname, "..", "src", "lib", "llm.js"), "utf8");

function functionBody(name) {
  const match = new RegExp(`function ${name}\\(`).exec(llmSource);
  const start = match?.index ?? -1;
  assert.notEqual(start, -1, `${name} should exist`);
  const rest = llmSource.slice(start + 1);
  const nextMatch = /\nfunction\s+/.exec(rest);
  return llmSource.slice(start, nextMatch ? start + 1 + nextMatch.index : llmSource.length);
}

test("project AI analysis requests and normalizes stable recommendation conclusions", () => {
  const prompt = functionBody("projectPrompt");
  const normalizer = functionBody("normalizeAnalysisResult");
  const recommendation = functionBody("normalizeAnalysisRecommendation");

  assert.match(prompt, /recommendation:\s*"validate \| watch \| pause"/);
  assert.match(prompt, /validate =/);
  assert.match(prompt, /watch =/);
  assert.match(prompt, /pause =/);
  assert.match(recommendation, /validate/);
  assert.match(recommendation, /watch/);
  assert.match(recommendation, /pause/);
  assert.match(recommendation, /riskLevel === "high"/);
  assert.match(normalizer, /const recommendation = normalizeAnalysisRecommendation/);
  assert.match(normalizer, /recommendation,/);
});

test("project AI analysis prompt makes opportunity discovery explicit", () => {
  const prompt = functionBody("projectPrompt");

  assert.match(prompt, /opportunity signals/i);
  assert.match(prompt, /实践启发/);
  assert.match(prompt, /解决什么问题/);
  assert.match(prompt, /目标用户/);
  assert.match(prompt, /工具、服务或工作流/);
});
