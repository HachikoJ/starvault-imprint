const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { chromium } = require("playwright");

test("T-10 real static scans persist provider diagnostics separately from coverage and display or clear them in both languages", { timeout: 40000 }, async t => {
  const publicRoot = path.resolve(__dirname, "../public");
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const file = path.resolve(publicRoot, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!file.startsWith(`${publicRoot}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404); response.end(); return;
    }
    const type = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json", ".svg": "image/svg+xml" }[path.extname(file)] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": type }); response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let context;
  t.after(async () => {
    await context?.close(); server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-provider-signals-ui-"));
  t.diagnostic(`Retained isolated Chrome profile and screenshots: ${profile}`);
  const executablePath = [process.env.PLAYWRIGHT_EXECUTABLE_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean).find(file => fs.existsSync(file));
  context = await chromium.launchPersistentContext(profile, { headless: true, serviceWorkers: "block", ...(executablePath ? { executablePath } : {}) });
  const origin = `http://127.0.0.1:${server.address().port}`;
  let phase = "failed";
  const calls = { github: 0, tavily: 0, exa: 0 };
  const repo = { id: 1001, full_name: "fixture/signalprobe", name: "signalprobe", owner: { login: "fixture" }, html_url: "https://github.com/fixture/signalprobe", description: "signalprobe desktop workflow toolkit", language: "TypeScript", topics: [], stargazers_count: 50, forks_count: 5, open_issues_count: 1, default_branch: "main", created_at: "2026-07-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z", pushed_at: "2026-10-01T00:00:00Z", archived: false, disabled: false, fork: false, license: { spdx_id: "MIT" } };
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    const headers = { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization,content-type,x-api-key,x-github-api-version,accept", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
    if (["api.github.com", "api.tavily.com", "api.exa.ai"].includes(url.hostname)) {
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      if (url.hostname === "api.github.com") {
        calls.github++;
        const json = url.pathname === "/rate_limit" ? { resources: { search: { remaining: 30, reset: Math.floor(Date.now() / 1000) + 60 } } }
          : url.pathname === "/search/repositories" ? { total_count: 1, incomplete_results: false, items: [repo] } : url.pathname === "/user" ? { login: "fixture" } : repo;
        return route.fulfill({ headers, json });
      }
      const source = url.hostname === "api.tavily.com" ? "tavily" : "exa";
      calls[source]++;
      if (phase === "failed" || (phase === "mixed" && source === "exa")) return route.fulfill({ status: source === "tavily" ? 401 : 429, headers, json: { message: `Fixture ${source} denied` } });
      const results = phase === "mixed" ? [{ title: "Verified signalprobe result", url: repo.html_url, content: "signalprobe workflow", text: "signalprobe workflow", score: 0 }] : [];
      return route.fulfill({ headers, json: { results } });
    }
    if (url.origin === origin) return route.continue();
    return route.abort("blockedbyclient");
  });
  const page = context.pages()[0] || await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("starvault.guideSeen.v1", "1");
    window.__STARVAULT_GITHUB_REQUEST_SPACING_MS__ = 0;
    window.__STARVAULT_EXA_PROXY__ = "https://api.exa.ai/search";
  });
  await page.goto(origin);
  await page.waitForFunction(() => document.documentElement.dataset.runtime === "ready" && typeof state !== "undefined" && state.summary);
  await page.waitForFunction(() => document.querySelector("#project-rows .repo-item"));
  await page.evaluate(async () => {
    const local = window.StarVaultLocalApi;
    await window.StarVaultIndexedDB.putValue("localSecrets", { githubToken: "fixture-t10-ui-github", tavilyKey: "fixture-t10-ui-tavily", exaKey: "fixture-t10-ui-exa" });
    await local.handle("/api/observation-plans", { method: "POST", body: JSON.stringify({ plan: { id: "signalprobe", name: "signalprobe", searchLogic: { baseMode: "only", keywords: ["signalprobe"], customQueries: [{ key: "signalprobe-core", label: "signalprobe", query: "signalprobe in:name" }] } } }) });
    await local.handle("/api/observation-plans/active", { method: "POST", body: JSON.stringify({ id: "signalprobe" }) });
  });
  async function scan() {
    const taskId = await page.evaluate(async () => (await window.StarVaultLocalApi.handle("/api/scan", { method: "POST", body: JSON.stringify({ mode: "manual" }) })).task.id);
    await page.evaluate(async id => {
      for (let attempt = 0; attempt < 500; attempt++) {
        const { task } = await window.StarVaultLocalApi.handle(`/api/tasks/${encodeURIComponent(id)}`);
        if (["completed", "failed"].includes(task.status)) return;
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      throw new Error(`Fixture scan ${id} did not finish`);
    }, taskId);
    return page.evaluate(async id => {
      const snapshot = await window.StarVaultIndexedDB.getSnapshot();
      const projects = await window.StarVaultIndexedDB.getProjectsByPlan("signalprobe");
      const summary = await window.StarVaultLocalApi.handle("/api/summary");
      state.summary = summary; renderSummary(summary);
      return { task: snapshot.store.tasks[id], scan: summary.lastScan, projects };
    }, taskId);
  }
  const failed = await scan();
  assert.equal(failed.task.status, "completed", failed.task.error);
  assert.equal(failed.scan.status, "completed-with-errors");
  assert.equal(failed.scan.discoveryCoverage.complete, true);
  assert.equal(failed.scan.discoveryCoverage.memberPolicy, "replace");
  assert.deepEqual(failed.scan.discoveryCoverage.reasons, []);
  assert.deepEqual(failed.scan.providerDiagnostics.map(item => item.source).sort(), ["exa", "tavily"]);
  assert.equal(failed.scan.providerDiagnostics.find(item => item.source === "tavily").httpStatus, 401);
  assert.equal(failed.scan.providerDiagnostics.find(item => item.source === "exa").httpStatus, 429);
  assert.equal(failed.projects.length, 1);
  assert.deepEqual(failed.projects[0].signals.externalWeb || [], []);
  for (const width of [1440, 390]) for (const language of ["zh", "en"]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(language => { state.language = language; applyTranslations(); renderSummary(state.summary); }, language);
    const notice = page.locator("#metric-provider-diagnostics");
    assert.equal(await notice.isVisible(), true);
    assert.match(await notice.textContent(), language === "zh" ? /外部信号补充失败（2）.*未计入评分/ : /External signal enrichment failed \(2\).*excluded from scores/);
    assert.match(await notice.getAttribute("title"), /tavily:.*HTTP 401/);
    assert.match(await notice.getAttribute("title"), /exa:/);
    assert.equal(await page.locator("#metric-scan-coverage").isVisible(), false);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), "diagnostic notice must not overflow the viewport");
    await page.screenshot({ path: path.join(profile, `provider-failed-${width}-${language}.png`), fullPage: true });
  }
  phase = "empty";
  const empty = await scan();
  assert.equal(empty.task.status, "completed", empty.task.error);
  assert.equal(empty.scan.status, "completed");
  assert.deepEqual(empty.scan.providerDiagnostics, []);
  assert.equal(empty.scan.discoveryCoverage.complete, true);
  assert.deepEqual(empty.projects[0].signals.externalWeb || [], []);
  for (const width of [1440, 390]) for (const language of ["zh", "en"]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(language => { state.language = language; applyTranslations(); renderSummary(state.summary); }, language);
    assert.equal(await page.locator("#metric-provider-diagnostics").isVisible(), false);
    assert.equal(await page.locator("#metric-provider-diagnostics").getAttribute("title"), "");
    assert.equal(await page.locator("#metric-scan-coverage").isVisible(), false);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    await page.screenshot({ path: path.join(profile, `provider-empty-${width}-${language}.png`), fullPage: true });
  }
  phase = "mixed";
  const mixed = await scan();
  assert.equal(mixed.task.status, "completed", mixed.task.error);
  assert.equal(mixed.scan.discoveryCoverage.complete, true);
  assert.deepEqual(mixed.scan.providerDiagnostics.map(item => item.source), ["exa"]);
  assert.equal(mixed.projects[0].signals.externalWeb.length, 1);
  assert.equal(mixed.projects[0].signals.externalWeb[0].source, "tavily");
  assert.equal(mixed.projects[0].signals.externalWeb[0].title, "Verified signalprobe result");
  assert.match(await page.locator("#metric-provider-diagnostics").textContent(), /\(1\)/);
  assert.equal(calls.tavily, 3); assert.equal(calls.exa, 3);
  t.diagnostic(`All remote fetches were fulfilled or blocked by Playwright routing; mocked service calls: ${JSON.stringify(calls)}`);
});
