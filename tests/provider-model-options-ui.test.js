const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const appSource = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");

function functionBody(name) {
  const match = new RegExp(`(?:async\\s+)?function ${name}\\(`).exec(appSource);
  const start = match?.index ?? -1;
  assert.notEqual(start, -1, `${name} should exist`);
  const rest = appSource.slice(start + 1);
  const nextMatch = /\n(?:async\s+)?function\s+/.exec(rest);
  return appSource.slice(start, nextMatch ? start + 1 + nextMatch.index : appSource.length);
}

test("DeepSeek model options show V4.1 Flash while preserving official API model IDs", () => {
  const settingsRenderer = functionBody("renderSettings");
  const modelLabel = functionBody("providerModelLabel");

  assert.match(appSource, /"deepseek-flash":\s*"DeepSeek V4\.1 Flash"/);
  assert.match(appSource, /"deepseek-v4-pro":\s*"DeepSeek V4 Pro"/);
  assert.match(modelLabel, /providerId === "deepseek"/);
  assert.match(modelLabel, /DEEPSEEK_MODEL_LABELS\[model\] \|\| model/);
  assert.match(settingsRenderer, /value="\$\{escapeHtml\(model\)\}"/);
  assert.match(settingsRenderer, /escapeHtml\(providerModelLabel\(provider\.id, model\)\)/);
});
