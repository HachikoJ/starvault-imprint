const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createStorage } = require("../src/lib/storage");

function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-dismiss-"));
  return createStorage(path.join(dir, "store.json"));
}

function tempStoreWithPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-dismiss-"));
  const storePath = path.join(dir, "store.json");
  return {
    storage: createStorage(storePath),
    storePath
  };
}

function seedProject(storage) {
  storage.upsertProjects(
    [
      {
        fullName: "acme/design-board",
        owner: "acme",
        name: "design-board",
        description: "Collaborative design board for product teams",
        language: "TypeScript",
        topics: ["design", "whiteboard"],
        stars: 120,
        forks: 18,
        openIssues: 3,
        pushedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scores: {
          opportunity: 82,
          quality: 78,
          actionability: 74,
          risk: 8
        }
      }
    ],
    { observationPlanId: "default" }
  );
}

function seedDismissReasonProjects(storage) {
  storage.upsertProjects(
    [
      {
        fullName: "acme/vague-agent",
        owner: "acme",
        name: "vague-agent",
        description: "",
        language: "Python",
        topics: ["agent"],
        stars: 42,
        forks: 3,
        openIssues: 0,
        pushedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scores: {
          opportunity: 54,
          quality: 62,
          actionability: 58,
          risk: 12
        }
      },
      {
        fullName: "acme/risky-platform",
        owner: "acme",
        name: "risky-platform",
        description: "Hosted workflow platform with unclear deployment and compliance boundaries",
        language: "TypeScript",
        topics: ["platform", "workflow"],
        stars: 900,
        forks: 81,
        openIssues: 42,
        pushedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scores: {
          opportunity: 68,
          quality: 51,
          actionability: 49,
          risk: 48
        }
      }
    ],
    { observationPlanId: "default" }
  );
}

function seedLeaderboardProjects(storage, count = 24) {
  const now = new Date().toISOString();
  storage.upsertProjects(
    Array.from({ length: count }, (_, index) => {
      const rank = index + 1;
      return {
        fullName: `acme/product-tool-${String(rank).padStart(2, "0")}`,
        owner: "acme",
        name: `product-tool-${String(rank).padStart(2, "0")}`,
        description: "Production ready dashboard app for product teams",
        language: "TypeScript",
        topics: ["dashboard", "productivity", "app"],
        stars: 1000 - rank,
        forks: 120 - rank,
        openIssues: 2,
        pushedAt: now,
        updatedAt: now,
        scores: {
          opportunity: 100 - rank,
          quality: 90 - rank,
          actionability: 88 - rank,
          risk: 5
        }
      };
    }),
    { observationPlanId: "default" }
  );
}

test("dismiss_project hides a project for the active plan and can be undone without strong negative drift", () => {
  const storage = tempStore();
  seedProject(storage);

  assert.equal(storage.listProjects({ limit: "all" }).total, 1);

  const dismissed = storage.setProjectDismissed("acme/design-board", true);
  assert.equal(dismissed.dismissed, true);
  assert.equal(storage.listProjects({ limit: "all" }).total, 0);

  const memory = storage.getMemory();
  assert.equal(memory.events[0].type, "dismiss_project");
  assert.equal(memory.events[0].weight, -0.35);
  assert.equal(memory.negativePreferences.repositories["acme/design-board"], 0.35);
  assert.ok((memory.negativePreferences.categories[memory.events[0].category] || 0) < 0.35);
  assert.equal(memory.preferences.categories[memory.events[0].category] || 0, 0);
  assert.equal(memory.preferences.useCases[memory.events[0].useCase] || 0, 0);

  const restored = storage.setProjectDismissed("acme/design-board", false);
  assert.equal(restored.dismissed, false);
  assert.equal(storage.listProjects({ limit: "all" }).total, 1);

  const restoredMemory = storage.getMemory();
  assert.equal(restoredMemory.events.some((event) => event.type === "dismiss_project"), false);
  assert.equal(restoredMemory.negativePreferences.repositories["acme/design-board"] || 0, 0);
  assert.equal(restoredMemory.preferences.categories[memory.events[0].category] || 0, 0);
  assert.equal(restoredMemory.preferences.useCases[memory.events[0].useCase] || 0, 0);
});

test("dismiss_project backfills the leaderboard to keep 20 visible projects", () => {
  const storage = tempStore();
  seedLeaderboardProjects(storage, 24);

  const before = storage.buildLeaderboard("daily", { limit: 21, persist: false });
  assert.equal(before.items.length, 21);

  const hidden = before.items[1].fullName;
  const promoted = before.items[2].fullName;
  const backfill = before.items[20].fullName;
  storage.setProjectDismissed(hidden, true);

  const after = storage.buildLeaderboard("daily", { limit: 20, persist: false });
  assert.equal(after.items.length, 20);
  assert.equal(after.items.some((item) => item.fullName === hidden), false);
  assert.equal(after.items[1].fullName, promoted);
  assert.equal(after.items[19].fullName, backfill);
  assert.equal(after.items.some((item) => item.fullName === backfill), true);
});

test("dismiss_project is idempotent so rapid clicks do not over-train negative memory", () => {
  const storage = tempStore();
  seedProject(storage);

  storage.setProjectDismissed("acme/design-board", true);
  storage.setProjectDismissed("acme/design-board", true);

  const memory = storage.getMemory();
  assert.equal(memory.events.filter((event) => event.type === "dismiss_project").length, 1);
  assert.equal(memory.negativePreferences.repositories["acme/design-board"], 0.35);

  storage.setProjectDismissed("acme/design-board", false);

  const restoredMemory = storage.getMemory();
  assert.equal(restoredMemory.events.filter((event) => event.type === "dismiss_project").length, 0);
  assert.equal(restoredMemory.negativePreferences.repositories["acme/design-board"] || 0, 0);
});

test("restoring a dismissed skip triage clears the saved status but keeps a draft note", () => {
  const storage = tempStore();
  seedProject(storage);

  storage.setNote("acme/design-board", "暂时觉得不合适，但后续可以再看。", "skip");
  storage.setProjectDismissed("acme/design-board", true);

  const restored = storage.setProjectDismissed("acme/design-board", false);
  assert.equal(restored.dismissed, false);
  assert.equal(restored.triageStatus, "");
  assert.equal(restored.note, "");
  assert.equal(restored.restoredNoteDraft?.text, "暂时觉得不合适，但后续可以再看。");
  assert.equal(restored.restoredNoteDraft?.status, "");

  const listed = storage.listProjects({ limit: "all" }).items[0];
  assert.equal(listed.triageStatus, "");
  assert.equal(listed.note, "");

  const memory = storage.getMemory();
  assert.equal(memory.events.some((event) => event.fullName === "acme/design-board" && event.type === "triage_note"), false);
  assert.equal(memory.events.some((event) => event.fullName === "acme/design-board" && event.type === "dismiss_project"), false);
});

test("restoring a dismissed project also clears legacy project-level skip triage", () => {
  const { storage, storePath } = tempStoreWithPath();
  seedProject(storage);
  storage.setNote("acme/design-board", "旧数据里只剩项目对象上的研判文本。", "skip");

  const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
  delete store.observationPlans.default.userData.notes["acme/design-board"];
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));

  storage.setProjectDismissed("acme/design-board", true);
  const restored = storage.setProjectDismissed("acme/design-board", false);

  assert.equal(restored.triageStatus, "");
  assert.equal(restored.note, "");
  assert.equal(restored.restoredNoteDraft?.text, "旧数据里只剩项目对象上的研判文本。");
  assert.equal(restored.restoredNoteDraft?.status, "");

  const listed = storage.listProjects({ limit: "all" }).items[0];
  assert.equal(listed.triageStatus, "");
  assert.equal(listed.note, "");

  const memory = storage.getMemory();
  assert.equal(memory.events.some((event) => event.fullName === "acme/design-board" && event.type === "triage_note"), false);
});

test("dismissed projects can be reviewed and manually retagged for learning", () => {
  const storage = tempStore();
  seedProject(storage);

  storage.setProjectDismissed("acme/design-board", true);

  const dismissed = storage.listDismissedProjects();
  assert.equal(dismissed.length, 1);
  assert.equal(dismissed[0].fullName, "acme/design-board");
  assert.ok(dismissed[0].category?.key);
  assert.ok(dismissed[0].semantic?.problem?.labelZh);
  assert.ok(dismissed[0].negativeLearning?.tags?.length);
  assert.ok(dismissed[0].negativeLearning?.reasonZh);

  const updated = storage.updateDismissedProjectFeedback("acme/design-board", {
    problem: "协作白板不相关",
    audience: "不是当前目标用户",
    shape: "不想做成白板工具",
    note: "方向可以观察，但当前方案先排除。"
  });

  assert.equal(updated.feedback.problem, "协作白板不相关");
  assert.equal(updated.feedback.audience, "不是当前目标用户");
  assert.equal(updated.feedback.shape, "不想做成白板工具");
  assert.equal(updated.feedback.note, "方向可以观察，但当前方案先排除。");

  const listed = storage.listDismissedProjects();
  assert.equal(listed[0].feedback.problem, "协作白板不相关");

  storage.setProjectDismissed("acme/design-board", false);
  assert.equal(storage.listDismissedProjects().length, 0);
});

test("dismissed project reasons are inferred from project signals instead of one generic sentence", () => {
  const storage = tempStore();
  seedDismissReasonProjects(storage);

  storage.setProjectDismissed("acme/vague-agent", true);
  storage.setProjectDismissed("acme/risky-platform", true);

  const dismissed = storage.listDismissedProjects();
  const vague = dismissed.find((item) => item.fullName === "acme/vague-agent");
  const risky = dismissed.find((item) => item.fullName === "acme/risky-platform");

  assert.equal(vague.negativeLearning.systemReason.code, "missing-context");
  assert.equal(risky.negativeLearning.systemReason.code, "risk-boundary");
  assert.notEqual(vague.negativeLearning.reasonZh, risky.negativeLearning.reasonZh);
});

test("dismissed system reasons include project-specific cues", () => {
  const storage = tempStore();
  seedDismissReasonProjects(storage);

  storage.setProjectDismissed("acme/vague-agent", true);

  const dismissed = storage.listDismissedProjects()[0];
  assert.match(dismissed.negativeLearning.systemReason.reasonZh, /vague-agent/);
  assert.match(dismissed.negativeLearning.systemReason.reasonZh, /42/);
});

test("old dismissed system reasons are refreshed for display", () => {
  const storage = tempStore();
  seedDismissReasonProjects(storage);

  storage.setProjectDismissed("acme/vague-agent", true);
  const store = storage.load();
  store.observationPlans.default.userData.dismissedProjects["acme/vague-agent"].systemReason = {
    code: "missing-context",
    reasonZh: "你主动隐藏了它，系统更倾向判断为项目说明不足。",
    reasonEn: "You hid it, and the system reads the strongest signal as missing context.",
    signals: {}
  };
  storage.save(store);

  const dismissed = storage.listDismissedProjects()[0];
  assert.match(dismissed.negativeLearning.systemReason.reasonZh, /vague-agent/);
  assert.match(dismissed.negativeLearning.reasonZh, /vague-agent/);
});

test("manual dismissed reason corrections are stored separately for black-box learning", () => {
  const storage = tempStore();
  seedDismissReasonProjects(storage);

  storage.setProjectDismissed("acme/vague-agent", true);
  const before = storage.listDismissedProjects()[0].negativeLearning.systemReason.reasonZh;

  const updated = storage.updateDismissedProjectFeedback("acme/vague-agent", {
    reason: "我隐藏它是因为描述太空泛，看不出能服务哪类真实用户。"
  });

  assert.equal(updated.feedback.reason, "我隐藏它是因为描述太空泛，看不出能服务哪类真实用户。");
  assert.equal(updated.negativeLearning.systemReason.reasonZh, before);
  assert.equal(updated.negativeLearning.userReason.reason, "我隐藏它是因为描述太空泛，看不出能服务哪类真实用户。");
  assert.equal(updated.negativeLearning.reasonZh, "我隐藏它是因为描述太空泛，看不出能服务哪类真实用户。");

  const memory = storage.getMemory();
  const correction = memory.context.dismissedReasonCorrections[0];
  assert.equal(correction.fullName, "acme/vague-agent");
  assert.equal(correction.systemReason.code, "missing-context");
  assert.equal(correction.userReason, "我隐藏它是因为描述太空泛，看不出能服务哪类真实用户。");

  storage.clearMemoryEvents("1d");
  assert.equal(storage.getMemory().context.dismissedReasonCorrections.length, 0);
});
