const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createStorage } = require("../src/lib/storage");

function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-leaderboard-analysis-"));
  return createStorage(path.join(dir, "store.json"));
}

function seedProject(storage) {
  const now = new Date().toISOString();
  storage.upsertProjects(
    [
      {
        fullName: "acme/ai-workbench",
        owner: "acme",
        name: "ai-workbench",
        description: "AI workflow dashboard for product teams",
        language: "TypeScript",
        topics: ["ai", "workflow", "dashboard"],
        stars: 1200,
        forks: 160,
        openIssues: 2,
        pushedAt: now,
        updatedAt: now,
        scores: {
          opportunity: 92,
          productization: 88,
          actionability: 86,
          momentum: 72,
          risk: 6,
          overallRisk: 6
        }
      }
    ],
    { observationPlanId: "default" }
  );
}

test("leaderboard items carry AI analysis alongside triage status", () => {
  const storage = tempStore();
  seedProject(storage);

  storage.setNote("acme/ai-workbench", "优先看工作流沉淀。", "deep-dive");
  storage.setAnalysis(
    "acme/ai-workbench",
    {
      riskLevel: "low",
      risks: ["维护节奏需要复核"],
      nextActions: ["验证部署边界"]
    },
    {
      raw: "analysis saved",
      provider: "AI",
      model: "test-model"
    }
  );

  const leaderboard = storage.buildLeaderboard("daily", { limit: 20, persist: false });
  const item = leaderboard.items.find((project) => project.fullName === "acme/ai-workbench");

  assert.ok(item, "seeded project should appear in leaderboard");
  assert.equal(item.triageStatus, "deep-dive");
  assert.ok(item.analysis?.updatedAt, "leaderboard item should expose saved AI analysis");
  assert.equal(item.analysis?.result?.riskLevel, "low");
});

test("leaderboard merges analysis from the active plan user data", () => {
  const storage = tempStore();
  seedProject(storage);

  const store = storage.load();
  const key = "acme/ai-workbench";
  store.projects[key].analysis = null;
  store.observationPlans.default.userData.notes[key] = {
    fullName: key,
    text: "优先看工作流沉淀。",
    status: "deep-dive",
    updatedAt: new Date().toISOString()
  };
  store.observationPlans.default.userData.analysis[key] = {
    fullName: key,
    result: { riskLevel: "medium" },
    raw: "analysis from plan",
    updatedAt: new Date().toISOString()
  };
  storage.save(store);

  const leaderboard = storage.buildLeaderboard("daily", { limit: 20, persist: false });
  const item = leaderboard.items.find((project) => project.fullName === key);

  assert.equal(item?.triageStatus, "deep-dive");
  assert.equal(item?.analysis?.raw, "analysis from plan");
});

test("archived leaderboard items are hydrated with current plan record badges", () => {
  const storage = tempStore();
  seedProject(storage);

  const store = storage.load();
  const key = "acme/ai-workbench";
  const date = "2026-06-01";
  store.observationPlans.default.userData.notes[key] = {
    fullName: key,
    text: "归档榜单仍要展示研判。",
    status: "watch",
    updatedAt: new Date().toISOString()
  };
  store.observationPlans.default.userData.analysis[key] = {
    fullName: key,
    result: { riskLevel: "low" },
    raw: "archived analysis",
    updatedAt: new Date().toISOString()
  };
  store.leaderboards.daily[date] = {
    period: "daily",
    date,
    generatedAt: new Date().toISOString(),
    limit: 20,
    items: [
      {
        rank: 1,
        fullName: key,
        name: "ai-workbench",
        triageStatus: ""
      }
    ]
  };
  storage.save(store);

  const leaderboard = storage.buildLeaderboard("daily", { date, limit: 20, persist: false });
  const item = leaderboard.items[0];

  assert.equal(item.triageStatus, "watch");
  assert.equal(item.analysis?.raw, "archived analysis");
});
