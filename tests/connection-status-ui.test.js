const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const appSource = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
const cssSource = fs.readFileSync(path.join(__dirname, "..", "public", "styles.css"), "utf8");

function functionBody(name) {
  const match = new RegExp(`(?:async\\s+)?function ${name}\\(`).exec(appSource);
  const start = match?.index ?? -1;
  assert.notEqual(start, -1, `${name} should exist`);
  const rest = appSource.slice(start + 1);
  const nextMatch = /\n(?:async\s+)?function\s+/.exec(rest);
  return appSource.slice(start, nextMatch ? start + 1 + nextMatch.index : appSource.length);
}

test("top connection dots mirror settings key issue state", () => {
  const renderer = functionBody("renderConfigDot");
  const configRenderer = functionBody("renderConfig");
  const issueSetter = functionBody("setServiceKeyIssues");

  assert.match(renderer, /issue/);
  assert.match(renderer, /classList\.toggle\("error"/);
  assert.match(renderer, /iconOnly\(hasIssue \? "x"/);
  assert.match(renderer, /dataset\.tooltip = nextDetail/);
  assert.match(configRenderer, /state\.keyIssues\?\.github/);
  assert.match(configRenderer, /SERVICE_KEY_ISSUE_LABELS\.github/);
  assert.match(configRenderer, /state\.keyIssues\?\.tavily/);
  assert.match(configRenderer, /state\.keyIssues\?\.exa/);
  assert.match(issueSetter, /renderConfig\(state\.config\)/);
  assert.match(appSource, /const \{ keyValidation,\s*\.\.\.settingsResult \} = languageResult/);
  assert.match(appSource, /applyServiceKeyValidation\(keyValidation\)/);
  assert.match(cssSource, /\.connection-dot\.error\s*{/);
  assert.match(cssSource, /\.connection-dot\.error\s+strong/);
});

test("top AI connection dot mirrors provider failure state", () => {
  const helper = functionBody("providerConnectionIssue");
  const configRenderer = functionBody("renderConfig");

  assert.match(helper, /provider\.testStatus/);
  assert.match(helper, /\^failed/);
  assert.match(helper, /providerFailed/);
  assert.match(configRenderer, /providerConnectionIssue\(activeProvider\)/);
  assert.match(configRenderer, /activeProvider\?\.enabled !== false/);
});
