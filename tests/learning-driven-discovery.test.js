const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { applyMemoryToQueryProfiles, buildQueryProfiles } = require("../src/lib/github");
const { createStorage } = require("../src/lib/storage");

function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-learning-discovery-"));
  return createStorage(path.join(dir, "store.json"));
}

test("learning memory creates prioritized GitHub query profiles", () => {
  const profiles = applyMemoryToQueryProfiles(buildQueryProfiles().slice(0, 4), {
    preferences: {
      useCases: {
        "knowledge-search": 18
      }
    },
    negativePreferences: {
      useCases: {
        "finance-trading": 12
      }
    },
    antiBubble: {
      explorationRatio: 0.25
    }
  });

  assert.equal(profiles[0].key.startsWith("memory-"), true);
  assert.match(profiles[0].q, /knowledge search|knowledge base/i);
  assert.match(profiles[0].q, /-"trading dashboard"/i);
  assert.equal(Number(profiles[0].profileCapMultiplier) > 1, true);
});

test("custom observation plans do not inject cross-domain memory search profiles", () => {
  const planProfiles = buildQueryProfiles({
    id: "ugnx",
    name: "UGNX",
    requirements: [{ text: "UGNX 相关插件" }],
    searchLogic: {
      baseMode: "only",
      customQueries: [
        {
          label: "UGNX 核心项目",
          query: "ugnx in:name,description,readme archived:false mirror:false"
        }
      ]
    }
  });
  const profiles = applyMemoryToQueryProfiles(planProfiles, {
    preferences: {
      categories: {
        other: 50
      },
      languages: {
        "C++": 20
      }
    },
    antiBubble: {
      explorationRatio: 0.25
    }
  });

  assert.equal(profiles.some((profile) => profile.memoryGenerated), false);
  assert.equal(profiles.every((profile) => profile.planGenerated), true);
  assert.equal(profiles.some((profile) => /Learned preference|language:C\+\+|other in:name/i.test(`${profile.label} ${profile.q}`)), false);
});

test("project pool default ranking uses learned preferences", () => {
  const storage = tempStore();
  const now = new Date().toISOString();
  storage.upsertProjects(
    [
      {
        fullName: "acme/design-board",
        owner: "acme",
        name: "design-system-canvas",
        description: "Frontend creative design system canvas prototype and whiteboard editor for product teams",
        language: "TypeScript",
        topics: ["frontend", "design-system", "canvas", "prototype", "whiteboard"],
        stars: 420,
        forks: 60,
        openIssues: 4,
        pushedAt: now,
        updatedAt: now,
        scores: {
          opportunity: 72,
          productization: 82,
          actionability: 80,
          momentum: 50,
          risk: 6,
          overallRisk: 6
        }
      },
      {
        fullName: "acme/finance-terminal",
        owner: "acme",
        name: "finance-terminal",
        description: "Trading terminal and market analysis dashboard for financial operators",
        language: "Python",
        topics: ["finance", "trading", "dashboard"],
        stars: 680,
        forks: 90,
        openIssues: 6,
        pushedAt: now,
        updatedAt: now,
        scores: {
          opportunity: 88,
          productization: 78,
          actionability: 76,
          momentum: 56,
          risk: 8,
          overallRisk: 8
        }
      }
    ],
    { observationPlanId: "default" }
  );

  const firstPass = storage.listProjects({ limit: "all" }).items;
  const design = firstPass.find((project) => project.fullName === "acme/design-board");
  const finance = firstPass.find((project) => project.fullName === "acme/finance-terminal");
  assert.ok(design?.category?.key, "seed project should expose a computed category key");
  assert.notEqual(design.category.key, finance?.category?.key);

  storage.updateMemoryPreference("category", design.category.key, { value: 40 });

  const personalized = storage.listProjects({ limit: "all" }).items;
  assert.equal(personalized[0].fullName, "acme/design-board");
});

test("passive project views stay below explicit preference actions", () => {
  const storage = tempStore();
  const now = new Date().toISOString();
  storage.upsertProjects(
    [
      {
        fullName: "acme/design-board",
        owner: "acme",
        name: "design-system-canvas",
        description: "Frontend creative design system canvas prototype and whiteboard editor for product teams",
        language: "TypeScript",
        topics: ["frontend", "design-system", "canvas", "prototype", "whiteboard"],
        stars: 420,
        forks: 60,
        pushedAt: now,
        updatedAt: now,
        scores: {
          opportunity: 72,
          productization: 82,
          actionability: 80,
          momentum: 50,
          risk: 6,
          overallRisk: 6
        }
      },
      {
        fullName: "acme/finance-terminal",
        owner: "acme",
        name: "finance-terminal",
        description: "Trading terminal and market analysis dashboard for financial operators",
        language: "Python",
        topics: ["finance", "trading", "dashboard"],
        stars: 680,
        forks: 90,
        pushedAt: now,
        updatedAt: now,
        scores: {
          opportunity: 88,
          productization: 78,
          actionability: 76,
          momentum: 56,
          risk: 8,
          overallRisk: 8
        }
      }
    ],
    { observationPlanId: "default" }
  );

  for (let index = 0; index < 10; index += 1) {
    storage.recordMemoryEvent("acme/design-board", "select_project");
  }
  storage.setWatch("acme/finance-terminal", true);

  const memory = storage.getMemory();
  const viewEvent = memory.events.find((event) => event.fullName === "acme/design-board");
  const favoriteEvent = memory.events.find((event) => event.fullName === "acme/finance-terminal");

  assert.equal(viewEvent.weight, 0.03);
  assert.equal(favoriteEvent.weight, 2.6);
  assert.notEqual(viewEvent.category, favoriteEvent.category);
  assert.ok(
    memory.preferences.categories[favoriteEvent.category] > memory.preferences.categories[viewEvent.category],
    "one explicit favorite should outweigh repeated passive detail views"
  );
});

test("plugin-shaped projects do not inherit the NX shape prefix", () => {
  const storage = tempStore();
  const now = new Date().toISOString();
  storage.upsertProjects(
    [
      {
        fullName: "acme/vscode-helper",
        owner: "acme",
        name: "vscode-helper",
        description: "VS Code plugin for code review workflow",
        language: "TypeScript",
        topics: ["vscode-extension", "plugin"],
        stars: 120,
        forks: 12,
        pushedAt: now,
        updatedAt: now
      },
      {
        fullName: "acme/chrome-helper",
        owner: "acme",
        name: "chrome-helper",
        description: "Chrome extension for browser productivity",
        language: "TypeScript",
        topics: ["chrome-extension"],
        stars: 90,
        forks: 8,
        pushedAt: now,
        updatedAt: now
      },
      {
        fullName: "acme/nx-helper",
        owner: "acme",
        name: "nx-helper",
        description: "Siemens NX plugin for CAD automation with NXOpen",
        language: "C#",
        topics: ["nxopen", "plugin"],
        stars: 80,
        forks: 6,
        pushedAt: now,
        updatedAt: now
      }
    ],
    { observationPlanId: "default" }
  );

  const items = storage.listProjects({ limit: "all" }).items;
  const vscode = items.find((project) => project.fullName === "acme/vscode-helper");
  const chrome = items.find((project) => project.fullName === "acme/chrome-helper");
  const nx = items.find((project) => project.fullName === "acme/nx-helper");

  assert.equal(vscode.semantic.shape.key, "shape-plugin-extension-tool");
  assert.equal(vscode.semantic.shape.labelZh, "插件/扩展工具");
  assert.equal(chrome.semantic.shape.key, "shape-browser-plugin");
  assert.equal(nx.semantic.shape.key, "shape-cad-nx-plugin");
  assert.equal(nx.semantic.shape.labelZh, "工程插件/自动化工具");
});
