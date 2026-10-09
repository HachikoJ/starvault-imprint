const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { chromium } = require("playwright");

test("T-09 full page shows actual trend and ranking windows, signed or unknown counts, in both languages", { timeout: 40000 }, async t => {
  const root = path.resolve(__dirname, "../public");
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const file = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); response.end(); return; }
    const type = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" }[path.extname(file)] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": type }); response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let context;
  t.after(async () => { await context?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-trend-window-ui-"));
  t.diagnostic(`Retained Chrome profile and screenshots: ${profile}`);
  const executablePath = [process.env.PLAYWRIGHT_EXECUTABLE_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean).find(file => fs.existsSync(file));
  context = await chromium.launchPersistentContext(profile, { headless: true, serviceWorkers: "block", ...(executablePath ? { executablePath } : {}) });
  const origin = `http://127.0.0.1:${server.address().port}`;
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort("blockedbyclient"));
  const page = context.pages()[0] || await context.newPage();
  await page.addInitScript(() => localStorage.setItem("starvault.guideSeen.v1", "1"));
  await page.goto(origin);
  await page.waitForFunction(() => document.documentElement.dataset.runtime === "ready" && typeof state !== "undefined" && state.summary);
  await page.waitForFunction(() => document.querySelector("#project-rows .repo-item"));
  const base = await page.evaluate(() => state.projects[0]);
  const month = { source: "github-browser-snapshots", period: "since-previous-scan", intervalStart: "2026-09-09T00:30:00.000Z", intervalEnd: "2026-10-09T00:30:00.000Z", stars: 50, forks: 0, complete: true };
  const halfHour = { ...month, intervalStart: "2026-10-09T00:00:00.000Z", stars: -5, forks: -2 };
  const online = { source: "github-online", period: "previous-day-online", date: "2026-10-08", stars: 2, forks: 1, complete: true };
  const fixtures = [
    { id: "month", trend: month, count: /\+50 Stars \/ 0 Forks/, duration: { zh: /30 天/, en: /30 days/ } },
    { id: "half-hour", trend: halfHour, count: /-5 Stars \/ -2 Forks/, duration: { zh: /30 分钟/, en: /30 minutes/ } },
    { id: "utc-day", trend: online, count: /\+2 Stars \/ \+1 Forks/, duration: { zh: /1 天/, en: /1 days/ } },
    { id: "zero", trend: { ...halfHour, stars: 0, forks: 0 }, count: /0 Stars \/ 0 Forks/, duration: { zh: /30 分钟/, en: /30 minutes/ } },
    { id: "legacy", trend: { source: "github-browser-snapshots", date: "2026-10-08", stars: 50, forks: 3, complete: true }, unknown: true },
    { id: "partial", trend: { ...online, complete: false, starsComplete: false }, count: /\+2 Stars/, partial: true },
    { id: "unknown-count", trend: { ...halfHour, stars: null, forks: 1, complete: false }, partialCount: true },
    { id: "failed", trend: { ...online, error: "Fixture request failed", reason: "rate-limited" }, failed: true },
    { id: "uncached", trend: { cached: false, source: "github-online",period:"previous-day-online",date:"2026-10-08" }, uncached: true }
  ];
  for (const width of [1440, 390]) for (const language of ["zh", "en"]) {
    await page.setViewportSize({ width, height: 900 });
    for (const fixture of fixtures) {
      const project = { ...base, fullName: `fixture/${fixture.id}`, name: fixture.id, rank: 1, trend: fixture.trend, scoreParts: fixture.unknown ? {} : { growthWindow: { ...fixture.trend, source: "github-snapshots" } } };
      await page.evaluate(({ language, project }) => {
        state.language = language; applyTranslations(); renderChips();
        state.selected = project; renderProjects({ items: [project], total: 1 }); renderDetail(project); switchView("projects");
      }, { language, project });
      const row = page.locator("#project-rows .trend-tag");
      const label = await row.textContent();
      const hint = await row.getAttribute("data-tooltip");
      assert.doesNotMatch(label, /\+-/);
      assert.match(hint, /github-/);
      if (fixture.unknown) {
        assert.match(label, language === "zh" ? /窗口未知/ : /window unknown/);
        assert.doesNotMatch(label, /50|3|等待|Awaiting/);
        assert.doesNotMatch(hint, /Previous-day change|前一日增量|2026-10-08 00:00/);
      } else if (fixture.failed) {
        assert.match(label, language === "zh" ? /统计失败/ : /failed/);
        assert.match(hint, /Fixture request failed/);
      } else if (fixture.uncached) {
        assert.match(label, language === "zh" ? /未纳入趋势缓存/ : /Not in trend cache/);
        assert.match(hint, language === "zh" ? /窗口未知/ : /window unknown/);
        assert.doesNotMatch(hint, /2026-10-08 00:00:00 UTC/);
      } else {
        if (fixture.partialCount) {
          assert.match(label, language === "zh" ? /未知 Stars \/ \+1 Forks/ : /Unknown Stars \/ \+1 Forks/);
          assert.doesNotMatch(label, /窗口未知|window unknown|Awaiting|等待/);
          assert.match(hint, language === "zh" ? /30 分钟/ : /30 minutes/);
        } else assert.match(label, fixture.count);
        if (fixture.duration) assert.match(hint, fixture.duration[language]);
        if (fixture.id === "utc-day" || fixture.id === "partial") {
          assert.match(label, language === "zh" ? /前一 UTC 日新增/ : /Previous UTC day additions/);
          assert.match(hint, /2026-10-08 00:00:00 UTC → 2026-10-09 00:00:00 UTC/);
        } else {
          assert.match(label, language === "zh" ? /扫描间净变化/ : /Net change between scans/);
          assert.doesNotMatch(hint, /Previous UTC day|前一 UTC 日/);
        }
        if (fixture.partial) assert.match(hint, language === "zh" ? /未完整/ : /incomplete/);
        if (fixture.id === "zero") assert.match(hint, language === "zh" ? /不是未知数据/ : /not unknown data/);
      }
      assert.equal(await page.locator("#detail-panel .trend-tag").textContent(), label);
      assert.equal(await page.locator("#detail-panel .trend-tag").getAttribute("data-tooltip"), hint);
      if (fixture.id === "month" || fixture.unknown) {
        await page.locator("#detail-panel .detail-more-section > summary").click();
        const details = page.locator("#detail-panel .detail-more-section > .muted-inline").first();
        assert.equal(await details.isVisible(), true);
        assert.equal(await details.textContent(), hint);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), "Expanded measurement details must fit the viewport");
      }
      const sortHint = await page.locator('#sort-chips [data-filter-value="trendStars"]').getAttribute("title");
      assert.match(sortHint, language === "zh" ? /实际观测区间.*不折算每日.*未知最后/ : /observed Star change.*no daily-rate conversion.*unknown last/);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `project/detail overflow ${width}/${language}/${fixture.id}`);
      if (["month", "half-hour", "legacy"].includes(fixture.id)) await page.screenshot({ path: path.join(profile, `project-${width}-${language}-${fixture.id}.png`), fullPage: true });
      await page.evaluate(project => {
        state.leaderboard = { ...(state.leaderboard || {}), period: "daily", items: [project] };
        renderLeaderboard(state.leaderboard); switchView("leaderboard");
      }, project);
      const growthHint = await page.locator("#leaderboard-list .rank-cell").getAttribute("data-tooltip");
      assert.match(growthHint, language === "zh" ? /榜单增长输入.*不折算每日速率/ : /Ranking growth input.*not a daily rate/);
      if (fixture.unknown) assert.match(growthHint, language === "zh" ? /窗口未知/ : /window unknown/);
      if (fixture.id === "month") assert.match(growthHint, fixture.duration[language]);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `leaderboard overflow ${width}/${language}/${fixture.id}`);
      if (fixture.id === "month") {
        await page.locator("#leaderboard-list .rank-cell").hover();
        await page.locator(".floating-tooltip.visible").waitFor({ state: "visible" });
        assert.match(await page.locator(".floating-tooltip.visible").textContent(), fixture.duration[language]);
        await page.screenshot({ path: path.join(profile, `ranking-${width}-${language}-${fixture.id}.png`), fullPage: true });
      }
    }
  }
});
