const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {chromium} = require("playwright");
const ROOT = path.resolve(__dirname, "..");

function project(name, fields = {}) {
  return {fullName: `fixture/${name}`, name, owner: "fixture", url: `https://github.com/fixture/${name}`,
    description: "Private test fixture for score definitions", language: "TypeScript", topics: ["notes"],
    stars: 250, forks: 20, openIssues: 1, pushedAt: "2026-10-10T00:00:00Z", createdAt: "2025-01-01T00:00:00Z",
    category: {key: "other", labelZh: "其他", labelEn: "Other"}, licensePolicy: {bucket: "unknown-no-license", risk: 82, labelZh: "无许可", labelEn: "No license"},
    scores: {opportunity: 62, actionability: 43, risk: 0, licenseRisk: 82, overallRisk: 34},
    rank: 1, rankWithinVersion: 1, rankChange: null, rankChangeComparable: false, ...fields};
}

test("T-08 real browser separates current and historical score/risk definitions and versioned archives in both languages", {timeout: 60000}, async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-scoring-ui-"));
  t.diagnostic(`Retained fresh Chrome profile and score contract screenshots: ${dir}`);
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, "http://127.0.0.1").pathname;
    const name = pathname.slice(1) || "index.html";
    if (!/^[\w.-]+$/.test(name) || !fs.existsSync(path.join(ROOT, "public", name))) {res.writeHead(404); res.end(); return;}
    res.writeHead(200, {"Content-Type": name.endsWith(".js") ? "text/javascript" : name.endsWith(".css") ? "text/css" : name.endsWith(".json") ? "application/json" : name.endsWith(".html") ? "text/html" : name.endsWith(".svg") ? "image/svg+xml" : "application/octet-stream"});
    res.end(fs.readFileSync(path.join(ROOT, "public", name)));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let context;
  t.after(async () => {await context?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));});
  const origin = `http://127.0.0.1:${server.address().port}`;
  const blocked = [];
  const executablePath = [process.env.PLAYWRIGHT_EXECUTABLE_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean).find(file => fs.existsSync(file));
  context = await chromium.launchPersistentContext(path.join(dir, "profile"), {headless: true, serviceWorkers: "block", ...(executablePath ? {executablePath} : {})});
  await context.route("**/*", route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    blocked.push(route.request().url()); return route.abort("blockedbyclient");
  });
  const page = context.pages()[0] || await context.newPage();
  await page.addInitScript(() => localStorage.setItem("starvault.guideSeen.v1", "1"));
  await page.goto(origin);
  await page.waitForFunction(() => document.documentElement.dataset.runtime === "ready" && state.config && state.summary && state.leaderboard && state.projects?.length);
  const current = project("current-no-license", {scoringVersion: "starvault-node-v1", riskSemantics: "project-license-action-v1"});
  const legacy = project("legacy", {scores: {opportunity: 55, actionability: 41, risk: 51, overallRisk: 51}});
  const unknown = project("future-version", {scoringVersion: "future-v99", riskSemantics: "future-risk-v99", scores: {opportunity: 85, actionability: 84}});
  const keys = ["2026-10-10", "2026-10-10~starvault-node-v1~starvault-node-board-v1"];
  for (const width of [1440, 390]) for (const language of ["zh", "en"]) {
    await page.setViewportSize({width, height: 1000});
    await page.evaluate(({current, legacy, unknown, keys, language}) => {
      state.language = language; applyTranslations(); state.planTransition.active = false;
      renderProjects({items: [current, legacy, unknown], total: 3}); state.selected = current;
      renderDetail(current); switchView("projects");
      state.leaderboard = {period: "daily", date: "2026-10-10", archiveKey: keys[1], generatedAt: "2026-10-10T00:00:00Z", archiveDates: keys, items: [current, legacy, unknown], memory: {}};
      renderLeaderboard(state.leaderboard);
    }, {current, legacy, unknown, keys, language});
    const currentBadge = page.locator('#project-rows [data-full-name="fixture/current-no-license"] .scoring-version');
    assert.match(await currentBadge.textContent(), language === "zh" ? /共享评分 v1/ : /Shared scoring v1/);
    assert.match(await page.locator('#project-rows [data-full-name="fixture/legacy"] .scoring-version').textContent(), language === "zh" ? /旧版评分（定义未知）/ : /Legacy scoring \(definition unknown\)/);
    assert.match(await page.locator('#project-rows [data-full-name="fixture/future-version"] .scoring-version').textContent(), /future-v99/);
    const detail = page.locator("#detail-panel");
    for (const [key, label, value] of [["risk", language === "zh" ? "项目风险" : "Project risk", 0], ["licenseRisk", language === "zh" ? "许可风险" : "License risk", 82], ["overallRisk", language === "zh" ? "行动风险" : "Action risk", 34]]) {
      assert.equal(await detail.locator(`[data-risk-kind="${key}"] span`).textContent(), label);
      assert.equal(await detail.locator(`[data-risk-kind="${key}"] strong`).textContent(), String(value));
    }
    assert.match(await detail.locator(".scoring-risk-definition").textContent(), /58%.*42%/);
    await detail.scrollIntoViewIfNeeded();
    await page.screenshot({path: path.join(dir, `current-${width}-${language}.png`)});
    await page.evaluate(legacy => {state.selected = legacy; renderDetail(legacy);}, legacy);
    assert.equal(await detail.locator("[data-risk-kind]").count(), 0, "legacy risk is not relabeled as project/license/action risk");
    assert.match(await detail.locator(".detail-basis-row").textContent(), language === "zh" ? /历史风险值51/ : /Historical risk value51/);
    assert.match(await detail.locator(".scoring-risk-definition").textContent(), language === "zh" ? /定义未知/ : /definition.*unknown/);
    assert.equal(await detail.locator(".hero-metrics strong").first().textContent(), "55", "historical value is preserved");
    const overlappingMetrics = await detail.locator('.hero-metrics').evaluate(container => Array.from(container.children).filter(cell => {
      const label = cell.querySelector('span').getBoundingClientRect(), value = cell.querySelector('strong').getBoundingClientRect();
      return !(label.right + 3 <= value.left || label.bottom + 3 <= value.top);
    }).map(cell => cell.textContent));
    assert.deepEqual(overlappingMetrics, [], 'historical labels and values remain distinct without overlap');
    await page.screenshot({path: path.join(dir, `legacy-${width}-${language}.png`)});
    await page.evaluate(unknown => {state.selected = unknown; renderDetail(unknown);}, unknown);
    assert.match(await detail.locator(".detail-basis-row").textContent(), language === "zh" ? /未知/ : /Unknown/);
    assert.doesNotMatch(await detail.locator(".detail-basis-row").textContent(), /0\/100/);
    await page.evaluate(() => switchView("leaderboard"));
    const archive = page.locator("#leaderboard-archive");
    assert.equal(await archive.inputValue(), keys[1]);
    assert.match(await archive.locator('option[value="2026-10-10"]').textContent(), language === "zh" ? /旧版评分/ : /Legacy scoring/);
    assert.match(await archive.locator(`option[value="${keys[1]}"]`).textContent(), /2026-10-10.*starvault-node-v1.*starvault-node-board-v1/);
    assert.doesNotMatch(await page.locator("#leaderboard-meta").textContent(), /Invalid|NaN/);
    assert.match(await page.locator("#leaderboard-meta").textContent(), language === "zh" ? /分版本比较/ : /within each version/);
    assert.match(await page.locator('.leaderboard-item .rank-change').first().getAttribute("aria-label"), language === "zh" ? /不可比/ : /not comparable/);
    assert.match(await page.locator('.leaderboard-item .rank-cell').first().getAttribute("data-tooltip"), language === "zh" ? /版本组内排名/ : /Rank within version/);
    await page.screenshot({path: path.join(dir, `leaderboard-${width}-${language}.png`)});
    assert.ok(await page.locator('#view-leaderboard .scoring-version').first().isVisible());
    await page.evaluate(() => switchView("projects"));
  }
  assert.deepEqual(blocked, [], "the fixture neither sends nor attempts remote requests");
});
