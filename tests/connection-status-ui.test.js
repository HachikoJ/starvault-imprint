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
  const validationApplier = functionBody("applyServiceKeyValidation");
  const issueMessageHelper = functionBody("firstServiceKeyValidationIssue");
  const settingsRenderer = functionBody("renderSettings");

  assert.match(renderer, /issue/);
  assert.match(renderer, /classList\.toggle\("error"/);
  assert.match(renderer, /iconOnly\(hasIssue \? "x"/);
  assert.match(renderer, /dataset\.tooltip = nextDetail/);
  assert.match(configRenderer, /state\.keyIssues\?\.github/);
  assert.match(configRenderer, /SERVICE_KEY_ISSUE_LABELS\.github/);
  assert.match(configRenderer, /state\.keyIssues\?\.tavily/);
  assert.match(configRenderer, /state\.keyIssues\?\.exa/);
  assert.match(issueSetter, /renderConfig\(state\.config\)/);
  assert.match(validationApplier, /state\.keyIssueMessages/);
  assert.match(validationApplier, /validation\.exa\?\.message/);
  assert.match(issueMessageHelper, /result\.message/);
  assert.match(settingsRenderer, /state\.keyIssueMessages\?\.\[kind\]/);
  assert.match(appSource, /const \{ keyValidation,\s*\.\.\.settingsResult \} = languageResult/);
  assert.match(appSource, /applyServiceKeyValidation\(keyValidation\)/);
  assert.match(appSource, /firstServiceKeyValidationIssue\(keyValidation\)/);
  assert.match(appSource, /showSettingsInlineStatus\("failed", serviceIssue\)/);
  assert.match(cssSource, /\.connection-dot\.error\s*{/);
  assert.match(cssSource, /\.connection-dot\.error\s+strong/);
});

test("top AI connection dot mirrors provider failure state", () => {
  const helper = functionBody("providerConnectionIssue");
  const authHelper = functionBody("providerAuthIssue");
  const failureMessageHelper = functionBody("isProviderAuthFailureMessage");
  const configRenderer = functionBody("renderConfig");
  const settingsRenderer = functionBody("renderSettings");

  assert.match(helper, /provider\.testStatus/);
  assert.match(helper, /\^auth-failed:/);
  assert.match(helper, /providerFailed/);
  assert.match(authHelper, /\^auth-failed/);
  assert.match(failureMessageHelper, /api key/i);
  assert.match(appSource, /refreshProviderStatusUi\(\)/);
  assert.match(configRenderer, /providerConnectionIssue\(activeProvider\)/);
  assert.match(configRenderer, /activeProvider\?\.enabled !== false/);
  assert.match(settingsRenderer, /data-provider-key-issue/);
  assert.match(settingsRenderer, /providerAuthIssue\(provider\)/);
  assert.match(functionBody("testProvider"), /renderConfig\(state\.config\)/);
  assert.match(fs.readFileSync(path.join(__dirname, "..", "src", "server.js"), "utf8"), /function markActiveProviderFailure\(error\) \{\s*if \(!isProviderAuthError\(error\)\) return;/);
});

test("temporary IndexedDB fallback returns to a restored server before rendering connection dots", () => {
  const localApi = fs.readFileSync(path.join(__dirname, "..", "public", "local-api.js"), "utf8");
  const restoreMode = functionBody("restoreServerApiMode");
  const loader = functionBody("loadAll");

  assert.match(localApi, /function deactivateLocalMode\(\)/);
  assert.match(localApi, /removeItem\(STORAGE_MODE_KEY\)/);
  assert.match(localApi, /deactivateLocalMode/);
  assert.match(restoreMode, /api\("\/api\/config", \{ skipIndexedDbSync: true \}\)/);
  assert.match(restoreMode, /localApi\.deactivateLocalMode/);
  assert.match(loader, /await restoreServerApiMode\(\)/);
});

test("generated observation-plan drafts render even when a follow-up plan-list refresh is unavailable", () => {
  const generator = functionBody("generateObservationPlan");

  assert.match(generator, /if \(!result\?\.plan\) throw new Error/);
  assert.match(generator, /state\.observationPlanDraft = \{/);
  assert.match(generator, /await refreshObservationPlans\(\)\.catch\(\(\) => \{\}\)/);
  assert.ok(generator.indexOf("state.observationPlanDraft = {") < generator.indexOf("await refreshObservationPlans().catch"));
});

test("API failures never trigger a browser-native credential prompt", () => {
  const api = functionBody("api");
  const authHelper = functionBody("isProviderAuthFailureMessage");

  assert.doesNotMatch(api, /window\.prompt\(/);
  assert.match(api, /json\.authRequired/);
  assert.doesNotMatch(authHelper, /\\b403\\b/);
});
