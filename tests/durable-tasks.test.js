const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { zonedParts } = require("../src/lib/scheduler");
const { createStorage } = require("../src/lib/storage");

function tempPath(extension = ".db") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-task-"));
  return path.join(dir, `store${extension}`);
}

test("durable tasks survive storage reopen and running tasks recover as queued", () => {
  const filePath = tempPath();
  const first = createStorage(filePath);
  const task = first.createTask({
    type: "analysis",
    key: "analysis:acme/project",
    input: { fullName: "acme/project", userNeed: "review this project" }
  });
  first.updateTask(task.id, { status: "running", attempts: 1, startedAt: new Date().toISOString() });

  const reopened = createStorage(filePath);
  assert.equal(reopened.getTask(task.id).status, "running");
  const recovered = reopened.recoverInterruptedTasks();
  assert.equal(recovered.length, 1);
  assert.equal(reopened.getTask(task.id).status, "queued");
  assert.equal(reopened.getTask(task.id).attempts, 1);

  reopened.updateTask(task.id, { status: "completed", result: { ok: true }, finishedAt: new Date().toISOString() });
  assert.deepEqual(reopened.getTask(task.id).result, { ok: true });
});

test("task records do not contain provider credentials unless a caller explicitly violates the contract", () => {
  const storage = createStorage(tempPath(".json"));
  const task = storage.createTask({
    type: "plan-generation",
    key: "plan:fonts",
    input: { name: "OpenType fonts", idea: "variable font tooling" }
  });
  const serialized = JSON.stringify(task);

  assert.doesNotMatch(serialized, /apiKey|githubToken|tavilyKey|exaKey/i);
});

test("scheduler date keys and hours use one explicit timezone", () => {
  const instant = new Date("2026-07-10T16:30:00.000Z");
  assert.deepEqual(zonedParts(instant, "Asia/Shanghai"), { dateKey: "2026-07-11", hour: 0 });
  assert.deepEqual(zonedParts(instant, "America/Los_Angeles"), { dateKey: "2026-07-10", hour: 9 });
});

test("scheduler last-run state persists independently of the process", () => {
  const filePath = tempPath();
  const first = createStorage(filePath);
  first.setRuntimeState("scheduler", { lastRunDate: "2026-07-10" });
  const reopened = createStorage(filePath);

  assert.equal(reopened.getRuntimeState("scheduler").lastRunDate, "2026-07-10");
});

test("browser and Node routes expose the same durable task protocol", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const browserSource = fs.readFileSync(path.join(__dirname, "../public/local-api.js"), "utf8");
  const appSource = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");

  for (const source of [serverSource, browserSource]) {
    assert.match(source, /\/api\/tasks/);
    assert.match(source, /plan-generation/);
    assert.match(source, /analysis/);
    assert.match(source, /scan/);
  }
  assert.match(appSource, /waitForDurableTaskResponse/);
  assert.match(appSource, /restoreDurableTasks/);
});

test("analysis results and learning stay with the plan captured by a durable task", () => {
  const storage = createStorage(tempPath());
  storage.saveObservationPlan({
    id: "specialized",
    name: "Specialized",
    searchLogic: {
      baseMode: "only",
      keywords: ["specialized"],
      customQueries: [{ key: "specialized-core", label: "Specialized", query: "specialized in:name,description,readme" }]
    }
  });
  storage.upsertProjects(
    [
      {
        fullName: "acme/specialized",
        name: "specialized",
        owner: "acme",
        description: "Specialized workflow",
        language: "TypeScript",
        topics: ["specialized"],
        stars: 40,
        forks: 4,
        profileKey: "specialized-core",
        profileLabel: "Specialized",
        scores: { opportunity: 70, risk: 5 }
      }
    ],
    { observationPlanId: "specialized" }
  );

  storage.setAnalysis(
    "acme/specialized",
    { recommendation: "validate", riskLevel: "low" },
    { observationPlanId: "specialized", provider: "test" }
  );

  assert.equal(storage.getProject("acme/specialized")?.analysis, null);
  assert.equal(storage.getProject("acme/specialized", { observationPlanId: "specialized" })?.analysis?.result?.recommendation, "validate");
  const specialized = storage.getObservationPlan("specialized", { includeMemory: true });
  assert.equal(specialized.memory.events[0].type, "ai_analyze");
  assert.equal(specialized.userData.analysis["acme/specialized"].result.recommendation, "validate");
});
