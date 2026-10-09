const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { analyzeWithProvider } = require("../src/lib/llm");

const llmSource = fs.readFileSync(path.join(__dirname, "..", "src", "lib", "llm.js"), "utf8");

function functionBody(name) {
  const match = new RegExp(`function ${name}\\(`).exec(llmSource);
  const start = match?.index ?? -1;
  assert.notEqual(start, -1, `${name} should exist`);
  const rest = llmSource.slice(start + 1);
  const nextMatch = /\nfunction\s+/.exec(rest);
  return llmSource.slice(start, nextMatch ? start + 1 + nextMatch.index : llmSource.length);
}

test("project AI analysis requests stable conclusions without inferring approval from local risk", async t => {
  const prompt = functionBody("projectPrompt");

  assert.match(prompt, /recommendation:\s*"validate \| watch \| pause"/);
  assert.match(prompt, /validate =/);
  assert.match(prompt, /watch =/);
  assert.match(prompt, /pause =/);
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async url => {
    assert.ok(String(url).startsWith("https://provider.invalid/"));
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: "A narrow local workflow." }) } }] }));
  };
  const analysis = await analyzeWithProvider({ provider: { protocol: "openai-compatible", baseUrl: "https://provider.invalid", apiKey: "fixture-only", model: "fixture" }, project: { fullName: "acme/fixture", scores: { risk: 0 } }, language: "en" });
  assert.equal(analysis.result.recommendation, "watch");
  assert.equal(analysis.result.riskLevel, "medium");
  assert.deepEqual(analysis.result.risks, []);
});

test("project AI analysis prompt makes opportunity discovery explicit", () => {
  const prompt = functionBody("projectPrompt");

  assert.match(prompt, /opportunity signals/i);
  assert.match(prompt, /实践启发/);
  assert.match(prompt, /解决什么问题/);
  assert.match(prompt, /目标用户/);
  assert.match(prompt, /工具、服务或工作流/);
});
