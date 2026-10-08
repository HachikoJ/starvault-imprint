const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { chromium } = require("playwright");

test("T-04 full static page displays incomplete coverage in both languages and clears it after success", { timeout: 30000 }, async t => {
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
  const executablePath = [process.env.PLAYWRIGHT_EXECUTABLE_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean).find(file => fs.existsSync(file));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-coverage-ui-"));
  t.diagnostic(`Retained isolated browser profile: ${profile}`);
  context = await chromium.launchPersistentContext(profile, { headless: true, ...(executablePath ? { executablePath } : {}) });
  const origin = `http://127.0.0.1:${server.address().port}`;
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort("blockedbyclient"));
  const page = context.pages()[0] || await context.newPage();
  await page.addInitScript(() => localStorage.setItem("starvault.guideSeen.v1", "1"));
  await page.goto(origin);
  await page.waitForFunction(() => document.documentElement.dataset.runtime === "ready");
  await page.waitForFunction(() => typeof state !== "undefined" && state.summary && document.querySelector("#metric-scan-coverage"));
  await page.waitForFunction(() => document.querySelector("#project-rows .repo-item"));
  for (const width of [1440, 390]) for (const language of ["zh", "en"]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(language => {
      state.language = language;
      applyTranslations();
      state.summary = { ...state.summary, lastScan: { at: "2026-10-08T00:00:00Z",
        discoveryCoverage: { complete: false, memberPolicy: "retain", reasons: ["Fixture query failed"] } } };
      renderSummary(state.summary);
    }, language);
    const notice = page.locator("#metric-scan-coverage");
    await page.screenshot({ path: path.join(profile, `coverage-${width}-${language}.png`), fullPage: true });
    assert.equal(await notice.isVisible(), true, JSON.stringify(await notice.evaluate(el => {
      const ancestors = []; for (let node = el; node; node = node.parentElement) {
        const css = getComputedStyle(node); const box = node.getBoundingClientRect();
        ancestors.push({ id: node.id, hidden: node.hidden, display: css.display, visibility: css.visibility, width: box.width, height: box.height, rows: css.gridTemplateRows });
      } return { ancestors, text: el.textContent, scan: state.summary.lastScan, language: state.language, viewport: innerWidth };
    })));
    assert.match(await notice.textContent(), language === "zh" ? /检索不完整.*保留旧成员/ : /Search incomplete.*members retained/);
    assert.equal(await page.locator("#metric-scan").getAttribute("title"), "Fixture query failed");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), "coverage copy must not create horizontal overflow");
    await page.screenshot({ path: path.join(profile, `coverage-${width}-${language}.png`), fullPage: true });
    await page.evaluate(() => {
      state.summary.lastScan.discoveryCoverage = { complete: true, memberPolicy: "replace", reasons: [] };
      renderSummary(state.summary);
    });
    assert.equal(await notice.isVisible(), false);
    assert.equal(await page.locator("#metric-scan").getAttribute("title"), "");
  }
});
