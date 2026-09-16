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

function scanProgressNormalizer() {
  return Function(`
    const Date_ = Date;
    ${functionBody("cooldownSecondsRemaining")}
    ${functionBody("activeCooldown")}
    ${functionBody("normalizeScanProgress")}
    return { normalizeScanProgress };
  `)();
}

test("a scan that belongs to the current plan keeps its own failure report", () => {
  const { normalizeScanProgress } = scanProgressNormalizer();

  // A failed run owns no stored scan, but it is still this plan's failure and
  // must not be flattened into a calm "idle" that hides the error.
  const failed = normalizeScanProgress({ status: "failed", hasScan: false, percent: 0, error: "搜索接口失败" });
  assert.equal(failed.status, "failed");
  assert.equal(failed.hasScan, false);
  assert.equal(failed.error, "搜索接口失败");

  // Another plan's finished scan is not this plan's result.
  const foreign = normalizeScanProgress({ status: "completed", hasScan: false, percent: 100 });
  assert.equal(foreign.status, "idle");
  assert.equal(foreign.percent, 0);
  assert.equal(foreign.hasScan, false);

  const own = normalizeScanProgress({ status: "completed", hasScan: true, percent: 100 });
  assert.equal(own.status, "completed");
  assert.equal(own.percent, 100);
});

test("an active GitHub cooldown outranks a live scan status", () => {
  const { normalizeScanProgress } = scanProgressNormalizer();
  const cooling = normalizeScanProgress({
    status: "running",
    running: true,
    percent: 40,
    cooldown: { active: true, until: new Date(Date.now() + 600_000).toISOString() }
  });

  assert.equal(cooling.status, "cooling");
  assert.equal(cooling.running, false);
  assert.ok(cooling.cooldown);
});

test("scan status reads stay scoped to the plan on screen", () => {
  const loader = functionBody("loadScanProgress");

  assert.match(loader, /const requestedPlanId = String\(options\.observationPlanId \|\| activeObservationPlanId\(\)\)/);
  assert.match(loader, /api\(`\/api\/scan\/status\?observationPlanId=\$\{encodeURIComponent\(requestedPlanId\)\}`\)/);
  // A slow answer for a plan the user already left must not repaint this plan.
  assert.match(loader, /if \(requestedPlanId !== activeObservationPlanId\(\)\) \{\s*return normalizeScanProgress\(state\.scanProgress \|\| \{\}\);/);
});

test("scan tasks from other plans are neither restored nor adopted", () => {
  const restore = functionBody("restoreDurableTask");
  const restoreAll = functionBody("restoreDurableTasks");

  assert.match(restore, /if \(task\.type === "scan" && taskPlanId && taskPlanId !== activeObservationPlanId\(\)\) return;/);
  assert.match(restoreAll, /const activePlanId = activeObservationPlanId\(\);/);
  assert.match(restoreAll, /if \(task\.type !== "scan"\) return true;\s*const taskPlanId = String\(task\.observationPlanId \|\| ""\)\.trim\(\);\s*return !taskPlanId \|\| taskPlanId === activePlanId;/);
});

test("an unscanned plan shows its own empty state instead of a broken search", () => {
  const renderer = functionBody("renderProjects");

  assert.match(appSource, /noPlanScanYet: "该方案尚未扫描"/);
  assert.match(appSource, /noPlanScanYetHint: "点击扫描，生成该方案自己的项目池。"/);
  assert.match(appSource, /noPlanScanYet: "This plan has not been scanned"/);
  assert.match(appSource, /noPlanScanYetHint: "Run a scan to build this plan's project pool."/);
  assert.match(renderer, /const planNeverScanned = poolEmptyWithoutFilters && Boolean\(state\.summary\) && state\.summary\.hasScan === false;/);
  assert.match(renderer, /\? \{ title: "noPlanScanYet", hint: "noPlanScanYetHint" \}/);
});
