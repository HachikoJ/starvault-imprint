const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createStorage } = require("../src/lib/storage");

function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-analysis-recommendation-"));
  return createStorage(path.join(dir, "store.json"));
}

function seedProjects(storage) {
  const now = new Date().toISOString();
  storage.upsertProjects(
    ["validate", "watch", "pause", "blank"].map((name, index) => ({
      fullName: `acme/${name}`,
      owner: "acme",
      name,
      description: `${name} project`,
      language: "TypeScript",
      topics: ["ai"],
      stars: 1000 - index,
      forks: 100,
      openIssues: index,
      pushedAt: now,
      updatedAt: now,
      scores: {
        opportunity: 90 - index,
        productization: 80,
        actionability: 80,
        momentum: 70,
        risk: index * 20,
        overallRisk: index * 20
      }
    })),
    { observationPlanId: "default" }
  );
}

test("project pool can filter AI recommendation conclusions and pending analysis", () => {
  const storage = tempStore();
  seedProjects(storage);

  storage.setAnalysis("acme/validate", { recommendation: "validate", riskLevel: "low" }, { raw: "validate" });
  storage.setAnalysis("acme/watch", { recommendation: "watch", riskLevel: "medium" }, { raw: "watch" });
  storage.setAnalysis("acme/pause", { recommendation: "pause", riskLevel: "high" }, { raw: "pause" });

  assert.deepEqual(
    storage.listProjects({ limit: "all", aiAnalysis: "validate" }).items.map((project) => project.fullName),
    ["acme/validate"]
  );
  assert.deepEqual(
    storage.listProjects({ limit: "all", aiAnalysis: "watch" }).items.map((project) => project.fullName),
    ["acme/watch"]
  );
  assert.deepEqual(
    storage.listProjects({ limit: "all", aiAnalysis: "pause" }).items.map((project) => project.fullName),
    ["acme/pause"]
  );
  assert.deepEqual(
    storage.listProjects({ limit: "all", aiAnalysis: "unanalyzed" }).items.map((project) => project.fullName),
    ["acme/blank"]
  );
});
