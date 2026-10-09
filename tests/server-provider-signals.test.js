const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

// Every child has an empty cwd, a retained temporary SQLite database, fake
// credentials, and a fetch implementation that denies every unlisted route.
// Loading the actual CLI entrypoint must never load the checkout's .env.
const COMMON = String.raw`
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = process.env.STARVAULT_FIXTURE_ROOT;
const dir = process.cwd();
const mode = process.env.STARVAULT_FIXTURE_MODE;
const { createStorage } = require(path.join(root, "src/lib/storage"));
const { enrichRepository } = require(path.join(root, "src/lib/scoring"));
const { externalSignalOutcome } = require(path.join(root, "public/domain-core"));
const repo = {
  id: 1, fullName: "fixture/alpha-signal-tool", name: "alpha-signal-tool", owner: "fixture",
  url: "https://github.com/fixture/alpha-signal-tool", description: "alpha product documentation and deployment toolkit",
  homepage: "", topics: ["alpha"], language: "TypeScript", stars: 50, forks: 5,
  watchers: 50, openIssues: 1, defaultBranch: "main", archived: false, disabled: false, fork: false,
  createdAt: "2024-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  pushedAt: "2026-01-01T00:00:00Z", license: { key: "mit", spdxId: "MIT", name: "MIT License" }
};
const valid = { source: "tavily", title: "Successful deployment documentation", url: "https://fixture.invalid/docs", score: 0, weight: 0, content: "fixture docs" };
const failed = source => ({ source, title: source + " enrichment failed", url: "", score: 0, content: "fixture rejected key" });
const requests = [];
function json(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } }); }
global.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  requests.push({ host: url.hostname, path: url.pathname, method: init.method || "GET" });
  if (url.origin === "https://api.github.com" && (init.method || "GET") === "GET") {
    if (url.pathname === "/user") return json({ login: "fixture-user" });
    if (url.pathname === "/rate_limit") {
      const reset = Math.floor(Date.now() / 1000) + 3600;
      return json({ resources: { core: { limit: 5000, remaining: 4999, reset }, search: { limit: 30, remaining: 29, reset }, graphql: { limit: 5000, remaining: 4999, reset } } });
    }
  }
  if (["api.tavily.com", "api.exa.ai"].includes(url.hostname) && url.pathname === "/search" && init.method === "POST") {
    if (!mode.startsWith("live") && !mode.startsWith("cli")) throw new Error("Checkpoint restoration must not resend enrichment: " + url);
    assert.ok(init.signal, "actual provider transport retains bounded cancellation");
    if (mode.endsWith("empty")) return json({ results: [] });
    if (mode.endsWith("success")) return json({ results: [{ title: valid.title, url: valid.url, score: 0, content: valid.content }] });
    return json({ message: "fixture invalid key", error: "fixture invalid key" }, 401);
  }
  throw new Error("Denied non-fixture network request: " + url);
};
const seed = createStorage(process.env.STORE_PATH);
seed.updateSettings({ githubToken: "fixture-github-token", tavilyKey: "fixture-tavily-key", exaKey: "fixture-exa-key",
  providerCatalog: { updatedAt: new Date().toISOString(), endpoints: [{ id: "deepseek", baseUrl: "https://api.deepseek.com" }] } });
`;

const SERVER = COMMON + String.raw`
(async () => {
  const plan = seed.saveObservationPlan({ id: "signal-plan", name: "Signal diagnostics fixture", searchLogic: {
    baseMode: "only", keywords: ["alpha"], minStars: 0, customQueries: [{ label: "alpha", query: "alpha in:name,description,readme" }]
  } });
  seed.setActiveObservationPlan(plan.id);
  seed.upsertProjects([enrichRepository({ ...repo, id: 2, fullName: "fixture/alpha-former-member", name: "alpha-former-member" })], { observationPlanId: plan.id });
  const checkpoint = { planId: plan.id, stage: mode.startsWith("live") ? "trending" : "exa",
    github: { repositories: [repo], errors: [], profiles: [{ key: "alpha", query: "alpha" }], relaxations: [] },
    trending: { repositories: [], signals: {}, errors: [], profiles: [], found: 0 }
  };
  let expectedSignals = [];
  if (mode === "legacy") {
    checkpoint.tavily = { [repo.fullName]: [valid, failed("tavily")] };
    checkpoint.exa = { [repo.fullName]: [failed("exa")] };
    expectedSignals = [valid];
  } else if (mode === "current") {
    checkpoint.tavily = { [repo.fullName]: externalSignalOutcome({ status: "partial", signals: [valid], errors: [{ source: "tavily", fullName: repo.fullName, status: 401, message: "fixture rejected key" }] }, "tavily", repo.fullName) };
    checkpoint.exa = { [repo.fullName]: externalSignalOutcome({ status: "error", errors: [{ source: "exa", fullName: repo.fullName, status: 401, message: "fixture rejected key" }] }, "exa", repo.fullName) };
    expectedSignals = [valid];
  }
  const task = seed.createTask({ id: "signal-checkpoint-task", type: "scan", key: "scan:" + plan.id,
    status: "running", input: { observationPlanId: plan.id }, checkpoint });
  const { runScan } = require(path.join(root, "src/server"));
  const result = await runScan({ observationPlanId: plan.id, taskId: task.id, checkpoint: seed.getTask(task.id).checkpoint, trendCount: 0, trendingCount: 0,
    tavilyCount: 1, exaCount: 1, mode: "provider-signals-fixture" });
  const reader = createStorage(process.env.STORE_PATH);
  const scan = reader.latestScanForPlan(plan.id);
  const project = reader.getProject(repo.fullName, { observationPlanId: plan.id });
  const expected = enrichRepository(repo, undefined, expectedSignals);
  assert.deepEqual(project.scores, expected.scores, "only successful evidence may change persisted scores");
  assert.equal(project.signals.externalMentions, expectedSignals.length);
  assert.deepEqual(project.reasons, expected.reasons);
  assert.equal(scan.discoveryCoverage.complete, true, "optional enrichment failure is not a GitHub discovery failure");
  assert.equal(scan.discoveryCoverage.memberPolicy, "replace");
  assert.deepEqual(scan.errors, []);
  assert.deepEqual(reader.listProjects({ observationPlanId: plan.id, limit: "all" }).items.map(item => item.fullName), [repo.fullName], "complete discovery still replaces membership when optional enrichment fails");
  const failures = mode === "live-empty" ? 0 : 2;
  assert.equal(scan.providerDiagnostics.length, failures);
  assert.deepEqual(result.providerDiagnostics, scan.providerDiagnostics);
  assert.equal(scan.status, failures ? "completed-with-errors" : "completed");
  if (failures) {
    assert.deepEqual(scan.providerDiagnostics.map(item => item.source).sort(), ["exa", "tavily"]);
    for (const diagnostic of scan.providerDiagnostics) {
      assert.equal(diagnostic.fullName, repo.fullName);
      assert.ok(diagnostic.message);
      if (mode !== "legacy") assert.equal(diagnostic.httpStatus, 401);
    }
  }
  const enrichmentRequests = requests.filter(item => item.host !== "api.github.com");
  assert.equal(enrichmentRequests.length, mode.startsWith("live") ? 2 : 0);
  const savedCheckpoint = reader.getTask(task.id).checkpoint;
  assert.equal(savedCheckpoint.stage, "completed");
  assert.equal(savedCheckpoint.planId, plan.id);
  assert.equal(savedCheckpoint.tavily[repo.fullName].signals.length, expectedSignals.length);
  assert.equal(savedCheckpoint.exa[repo.fullName].signals.length, 0);
  assert.equal(savedCheckpoint.tavily[repo.fullName].status, mode === "live-empty" ? "success" : expectedSignals.length ? "partial" : "error");
  assert.deepEqual([...savedCheckpoint.tavily[repo.fullName].errors, ...savedCheckpoint.exa[repo.fullName].errors], scan.providerDiagnostics);
  fs.writeFileSync(path.join(dir, "result.json"), JSON.stringify({ mode, requests, result, scan, project, expected, savedCheckpoint }, null, 2));
  console.log("PROVIDER_SCAN_FIXTURE " + JSON.stringify({ mode, requests, scan, scores: project.scores, externalMentions: project.signals.externalMentions }));
})().catch(error => { console.error(error); process.exitCode = 1; });
`;

const CLI_PRELOAD = COMMON + String.raw`
// Only replace discovery, whose real HTTP search/pagination is covered by the
// server discovery tests; execute the actual CLI/enrichment/scoring/storage.
const github = require(path.join(root, "src/lib/github"));
github.getAuthenticatedUser = async token => { assert.equal(token, "fixture-github-token"); return { login: "fixture-user" }; };
github.searchCandidateRepositories = async () => ({ repositories: [repo], profiles: [{ key: "alpha" }], errors: [] });
process.on("beforeExit", () => {
  const reader = createStorage(process.env.STORE_PATH);
  const scan = reader.latestScanForPlan("default");
  const project = reader.getProject(repo.fullName, { observationPlanId: "default" });
  const expectedSignals = mode === "cli-success" ? [{ source: "tavily", title: valid.title, url: valid.url, score: 0, content: valid.content }] : [];
  const expected = enrichRepository(repo, undefined, expectedSignals);
  assert.deepEqual(project.scores, expected.scores);
  assert.equal(project.signals.externalMentions, expectedSignals.length);
  assert.deepEqual(project.reasons, expected.reasons);
  assert.deepEqual(scan.errors, []);
  assert.equal(scan.providerDiagnostics.length, mode === "cli-failure" ? 1 : 0);
  assert.equal(scan.status, mode === "cli-failure" ? "completed-with-errors" : "completed");
  if (mode === "cli-failure") {
    assert.equal(scan.providerDiagnostics[0].source, "tavily");
    assert.equal(scan.providerDiagnostics[0].httpStatus, 401);
    assert.equal(scan.providerDiagnostics[0].fullName, repo.fullName);
  }
  assert.equal(requests.length, 1);
  fs.writeFileSync(path.join(dir, "result.json"), JSON.stringify({ mode, requests, scan, project, expected }, null, 2));
  console.log("PROVIDER_CLI_FIXTURE " + JSON.stringify({ mode, requests, scan, scores: project.scores, externalMentions: project.signals.externalMentions }));
});
`;

function runFixture(t, mode, cli = false) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-provider-signals-"));
  t.diagnostic(`retained fixture=${dir}; mode=${mode}`);
  const env = { ...process.env, STARVAULT_FIXTURE_ROOT: ROOT, STARVAULT_FIXTURE_MODE: mode,
    STORE_PATH: path.join(dir, "fixture.db"), HOST: "127.0.0.1", AUTH_TOKEN: "", ACCESS_TOKEN: "", PUBLIC_ORIGIN: "",
    TRUST_PROXY: "0", RUN_SCAN_ON_BOOT: "false", GITHUB_TOKEN: "fixture-github-token", TAVILY_API_KEY: "fixture-tavily-key",
    EXA_API_KEY: "fixture-exa-key", DEEPSEEK_API_KEY: "", GITHUB_TREND_LIMIT: "0", GITHUB_TRENDING_MAX_REPOS: "0" };
  delete env.NODE_OPTIONS;
  let args;
  if (cli) {
    const preload = path.join(dir, "preload.cjs");
    fs.writeFileSync(preload, CLI_PRELOAD);
    args = ["--require", preload, path.join(ROOT, "scripts/run-scan.js")];
  } else args = ["-e", SERVER];
  const child = spawnSync(process.execPath, args, { cwd: dir, env, encoding: "utf8", timeout: 20000, maxBuffer: 4 * 1024 * 1024 });
  fs.writeFileSync(path.join(dir, "stdout.log"), child.stdout || "");
  fs.writeFileSync(path.join(dir, "stderr.log"), child.stderr || "");
  assert.equal(child.status, 0, child.stderr || child.stdout || String(child.error));
  assert.ok(fs.existsSync(path.join(dir, "result.json")), child.stdout);
  const result = JSON.parse(fs.readFileSync(path.join(dir, "result.json"), "utf8"));
  t.diagnostic(JSON.stringify({ mode, requests: result.requests, diagnostics: result.scan.providerDiagnostics, mentions: result.project.signals.externalMentions }));
  return result;
}

for (const mode of ["live-failure", "live-empty", "legacy", "current"]) {
  test(`T-10 Node runScan persists separate diagnostics and valid evidence (${mode})`, { timeout: 25000 }, t => runFixture(t, mode));
}

for (const mode of ["cli-failure", "cli-empty", "cli-success"]) {
  test(`T-10 actual CLI entrypoint saves diagnostics without fake evidence (${mode})`, { timeout: 25000 }, t => runFixture(t, mode, true));
}
