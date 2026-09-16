#!/usr/bin/env node

/**
 * Serves public/ under a GitHub Pages style sub path and drives it with
 * Chromium to prove the static deployment works without any backend or key.
 *
 * Usage: node scripts/static-pages-check.js
 */

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const BASE_PATH = "/starvault-imprint";
const OUTPUT_DIR = path.join(ROOT, "output", "static-pages-check");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function chromiumLaunchOptions() {
  const candidates = [
    process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
  ].filter(Boolean);
  const executablePath = candidates.find((candidate) => fs.existsSync(candidate));
  return executablePath ? { headless: true, executablePath } : { headless: true };
}

function startStaticServer() {
  const requests = [];
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    let pathname = decodeURIComponent(url.pathname);
    if (!pathname.startsWith(BASE_PATH)) {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("Not found");
      return;
    }
    pathname = pathname.slice(BASE_PATH.length) || "/";
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const target = path.resolve(PUBLIC_DIR, relative);
    if (!target.startsWith(PUBLIC_DIR) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
      requests.push({ path: pathname, status: 404 });
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("Not found");
      return;
    }
    const body = fs.readFileSync(target);
    requests.push({ path: pathname, status: 200 });
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(target)] || "application/octet-stream",
      "Content-Length": body.length
    });
    response.end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, requests, port: server.address().port });
    });
  });
}

async function bootPage(browser, url, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const httpErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error.message || error)));
  page.on("requestfailed", (request) => failedRequests.push(`${request.url()} ${request.failure()?.errorText || ""}`));
  page.on("response", (response) => {
    if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.runtime === "ready", null, { timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll("#project-rows .repo-item").length > 0, null, {
    timeout: 30000
  });
  return { context, page, consoleErrors, failedRequests, httpErrors };
}

async function readApi(page, endpoint) {
  return page.evaluate(async (target) => window.StarVaultLocalApi.handle(target), endpoint);
}

async function inspect(page) {
  return page.evaluate(() => ({
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    visibleText: document.body.innerText,
    runtime: document.documentElement.dataset.runtime
  }));
}

async function exerciseBackToTop(page) {
  const setup = await page.evaluate(async () => {
    const button = document.querySelector("#back-to-top");
    const row = document.querySelector("#project-rows .project-row-scroll") || document.querySelector("#project-rows");
    const panel = document.querySelector(".view-panel.active");
    const target = [row, panel, document.scrollingElement].find((node) => node && node.scrollHeight - node.clientHeight > 600) || row;
    if (!button || !target) return { found: false };
    target.scrollTop = Math.min(900, target.scrollHeight - target.clientHeight);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      found: true,
      target: target === row ? "project-list" : target === panel ? "view-panel" : "page",
      scrollTop: target.scrollTop,
      visibleAfterScroll: !button.hidden
    };
  });
  if (!setup.found) return setup;

  const button = page.locator("#back-to-top");
  await button.focus();
  const focused = await page.evaluate(() => document.activeElement?.id === "back-to-top");
  const label = await button.getAttribute("aria-label");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1200);
  const settled = await page.evaluate(() => {
    const row = document.querySelector("#project-rows .project-row-scroll") || document.querySelector("#project-rows");
    const panel = document.querySelector(".view-panel.active");
    const tops = [row, panel].filter(Boolean).map((node) => Math.max(0, node.scrollTop || 0));
    return {
      maxScrollTop: Math.max(0, ...tops, window.scrollY || 0),
      hidden: document.querySelector("#back-to-top")?.hidden ?? null
    };
  });
  return { ...setup, focused, label, ...settled };
}

async function main() {
  const { server, requests, port } = await startStaticServer();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const url = `http://127.0.0.1:${port}${BASE_PATH}/`;
  let browser;
  const failures = [];
  const evidence = {};

  const assert = (condition, message) => {
    if (!condition) failures.push(message);
  };

  try {
    browser = await chromium.launch(chromiumLaunchOptions());
    const desktop = await bootPage(browser, url, { width: 1440, height: 900 });
    const projects = await readApi(desktop.page, "/api/projects?limit=all");
    const plans = await readApi(desktop.page, "/api/observation-plans");
    const leaderboard = await readApi(desktop.page, "/api/leaderboard");
    const summary = await readApi(desktop.page, "/api/summary");
    const layout = await inspect(desktop.page);

    evidence.desktop = {
      activePlan: plans.active?.id,
      activePlanName: plans.active?.name,
      totalProjects: projects.total,
      leaderboardItems: leaderboard.items?.length || 0,
      leaderboardSource: leaderboard.source,
      scanCount: summary.scans?.length ?? summary.lastScan ? 1 : 0,
      overflowX: layout.overflowX
    };

    assert(plans.active?.id === "demo-content", `desktop active plan was ${plans.active?.id}`);
    assert(projects.total === 25, `desktop project pool was ${projects.total}`);
    assert((leaderboard.items || []).length > 0, "desktop leaderboard was empty");
    assert(String(layout.visibleText).includes("在线体验：内容与设计工作流"), "desktop UI did not render the demo plan name");
    assert(layout.overflowX <= 1, `desktop page overflowed horizontally by ${layout.overflowX}px`);
    assert(desktop.consoleErrors.length === 0, `desktop console errors: ${desktop.consoleErrors.join(" | ")}`);
    assert(desktop.failedRequests.length === 0, `desktop failed requests: ${desktop.failedRequests.join(" | ")}`);
    assert(desktop.httpErrors.length === 0, `desktop HTTP errors: ${desktop.httpErrors.join(" | ")}`);
    const desktopBackToTop = await exerciseBackToTop(desktop.page);
    evidence.backToTop = { desktop: desktopBackToTop };
    assert(desktopBackToTop.found, "desktop back-to-top button was not rendered");
    assert(desktopBackToTop.visibleAfterScroll, "desktop back-to-top button stayed hidden after scrolling");
    assert(desktopBackToTop.focused, "desktop back-to-top button was not keyboard focusable");
    assert(desktopBackToTop.label === "返回顶部", `desktop back-to-top label was ${desktopBackToTop.label}`);
    assert(desktopBackToTop.maxScrollTop <= 8, `desktop back-to-top left scroll offset ${desktopBackToTop.maxScrollTop}`);
    assert(desktopBackToTop.hidden === true, "desktop back-to-top button stayed visible at the top");
    await desktop.page.screenshot({ path: path.join(OUTPUT_DIR, "desktop.png"), fullPage: true });

    // Reload must not re-seed or duplicate scans and archive entries.
    await desktop.page.reload({ waitUntil: "domcontentloaded" });
    await desktop.page.waitForFunction(() => document.documentElement.dataset.runtime === "ready", null, { timeout: 30000 });
    const reloadedProjects = await readApi(desktop.page, "/api/projects?limit=all");
    const reloadedSummary = await readApi(desktop.page, "/api/summary");
    const archives = await readApi(desktop.page, "/api/leaderboard-archives");
    evidence.reload = {
      totalProjects: reloadedProjects.total,
      scans: reloadedSummary.scans?.length ?? null,
      archiveDates: archives.dates?.length ?? archives.items?.length ?? null
    };
    assert(reloadedProjects.total === 25, `projects changed after reload: ${reloadedProjects.total}`);
    assert((reloadedSummary.scans || []).length === 1, `scan records after reload: ${(reloadedSummary.scans || []).length}`);
    await desktop.context.close();

    const mobile = await bootPage(browser, url, { width: 390, height: 844 });
    const mobileProjects = await readApi(mobile.page, "/api/projects?limit=all");
    const mobileLayout = await inspect(mobile.page);
    evidence.mobile = { totalProjects: mobileProjects.total, overflowX: mobileLayout.overflowX };
    assert(mobileProjects.total === 25, `mobile project pool was ${mobileProjects.total}`);
    assert(mobileLayout.overflowX <= 1, `mobile page overflowed horizontally by ${mobileLayout.overflowX}px`);
    assert(mobile.consoleErrors.length === 0, `mobile console errors: ${mobile.consoleErrors.join(" | ")}`);
    assert(mobile.failedRequests.length === 0, `mobile failed requests: ${mobile.failedRequests.join(" | ")}`);
    assert(mobile.httpErrors.length === 0, `mobile HTTP errors: ${mobile.httpErrors.join(" | ")}`);
    const mobileBackToTop = await exerciseBackToTop(mobile.page);
    evidence.backToTop.mobile = mobileBackToTop;
    assert(mobileBackToTop.found, "mobile back-to-top button was not rendered");
    assert(mobileBackToTop.visibleAfterScroll, "mobile back-to-top button stayed hidden after scrolling");
    assert(mobileBackToTop.maxScrollTop <= 8, `mobile back-to-top left scroll offset ${mobileBackToTop.maxScrollTop}`);
    await mobile.page.screenshot({ path: path.join(OUTPUT_DIR, "mobile.png"), fullPage: true });
    await mobile.context.close();

    const assets = ["/index.html", "/styles.css", "/runtime-config.js", "/bootstrap.js", "/domain-core.js", "/indexeddb-storage.js", "/local-api.js", "/app.js", "/demo-snapshot.json", "/og-cover.png", "/favicon.svg"];
    for (const asset of assets) {
      const response = await fetch(`${url.replace(/\/$/, "")}${asset}`);
      const ok = response.status === 200;
      const contentType = response.headers.get("content-type") || "";
      evidence.assets = evidence.assets || {};
      evidence.assets[asset] = `${response.status} ${contentType}`;
      assert(ok, `asset ${asset} returned ${response.status}`);
      if (asset.endsWith(".json")) {
        assert(contentType.includes("application/json"), `asset ${asset} content-type was ${contentType}`);
      }
    }

    const missing = requests.filter((entry) => entry.status === 404);
    assert(missing.length === 0, `static host saw 404s: ${missing.map((entry) => entry.path).join(", ")}`);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, "report.json"), JSON.stringify({ evidence, failures, requests }, null, 2));
  if (failures.length) {
    console.error("Static GitHub Pages check failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }
  console.log("Static GitHub Pages check passed.");
  console.log(JSON.stringify(evidence, null, 2));
  console.log(`Screenshots: ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
