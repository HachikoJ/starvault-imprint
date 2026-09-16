const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const htmlSource = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");

function functionBody(name) {
  const match = new RegExp(`(?:async\\s+)?function ${name}\\(`).exec(appSource);
  const start = match?.index ?? -1;
  assert.notEqual(start, -1, `${name} should exist`);
  const rest = appSource.slice(start + 1);
  const nextMatch = /\n(?:async\s+)?function\s+/.exec(rest);
  return appSource.slice(start, nextMatch ? start + 1 + nextMatch.index : appSource.length);
}

test("durable task notices are a persistent live region that stays hidden when empty", () => {
  assert.match(htmlSource, /id="task-notifications"[\s\S]*aria-live="polite"[\s\S]*hidden/);
  assert.match(cssSource, /\.task-notifications\[hidden\]\s*\{\s*display:\s*none\s*!important;/);
});

test("plan-generation notices persist a bounded local history without browser notification APIs", () => {
  assert.match(appSource, /TASK_NOTIFICATIONS_KEY = "starvault\.taskNotifications"/);
  assert.match(appSource, /TASK_NOTIFICATION_LIMIT = 5/);
  assert.match(functionBody("setTaskNotificationRecords"), /records\.slice\(-TASK_NOTIFICATION_LIMIT\)/);
  assert.doesNotMatch(appSource, /Notification\.requestPermission|new Notification\(/);
});

test("temporary status lookup failures become unknown instead of a false failure", () => {
  const lookupKind = functionBody("taskStatusLookupFailureKind");
  const waiter = functionBody("waitForDurableTaskResponse");

  assert.match(lookupKind, /Number\(error\?\.status \|\| 0\) === 404 \? "unresolved" : "transient"/);
  assert.match(waiter, /if \(kind === "unresolved" \|\| lookupFailures > TASK_STATUS_LOOKUP_MAX_RETRIES\)/);
  assert.match(waiter, /upsertTaskNotification\(\{ \.\.\.context, taskId, status: "unknown" \}\)/);
  assert.match(waiter, /if \(task\?\.status === "completed"\)/);
  assert.match(waiter, /if \(task\?\.status === "failed"\)/);
  assert.doesNotMatch(waiter, /kind === "terminal"/);
});

test("a completed plan notice remains until the user views or dismisses it", () => {
  const generator = functionBody("generateObservationPlan");
  const opener = functionBody("openTaskNotificationResult");
  const waiter = functionBody("waitForDurableTaskResponse");

  assert.match(waiter, /upsertTaskNotification\(\{ \.\.\.context, taskId, status: "completed"/);
  assert.doesNotMatch(generator, /removeTaskNotification/);
  assert.match(opener, /removeTaskNotification\(record\.taskId\)/);
});
