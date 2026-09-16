#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createStorage } = require("../src/lib/storage");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "output", "visual-regression");
const SCREENSHOT_DIR = path.join(OUT_DIR, "screenshots");
const PORT = Number(process.env.VISUAL_PORT || 4179);
const HOST = process.env.VISUAL_HOST || "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "compact-desktop", width: 1024, height: 900 },
  { name: "tablet", width: 900, height: 900 },
  { name: "mobile", width: 390, height: 844 }
];

const LANGUAGES = ["zh", "en"];

const VIEWS = [
  { name: "projects", selector: "#view-projects", prepare: openFirstProject },
  { name: "leaderboard", selector: "#view-leaderboard" },
  { name: "learning", selector: "#view-learning" },
  { name: "brief", selector: "#view-brief" },
  { name: "github", selector: "#view-github" },
  { name: "settings", selector: "#view-settings" }
];

const TEXT_FIT_SELECTORS = [
  ".brand-block h1",
  ".brand-tagline",
  ".nav-list button",
  ".connection-dot",
  ".language-switch button",
  ".compact-action",
  ".metric-tile",
  ".metric-tile span",
  ".metric-tile strong",
  ".clear-all-filters",
  ".favorite-filter-toggle",
  ".filter-group header",
  ".chip",
  ".preset-chip",
  ".repo-score-rail",
  ".mini-metric",
  ".repo-link-icon",
  ".project-pager",
  ".project-page-nav",
  ".project-page-button",
  ".project-page-jump",
  ".leaderboard-archive-control",
  ".leaderboard-meta",
  ".segmented-control button",
  ".learning-score-card",
  ".memory-stat",
  ".secret-field button",
  ".provider-actions button",
  ".key-source-link"
];

const OVERLAP_GROUP_SELECTORS = [
  ".topbar-actions",
  ".connection-strip",
  ".language-switch",
  ".project-page-main",
  ".project-page-buttons",
  ".repo-github-row",
  ".leaderboard-github-row",
  ".github-stat-actions.compact",
  ".repo-primary-actions",
  ".leaderboard-actions",
  ".secret-field",
  ".provider-actions",
  ".nav-list"
];

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (_) {
    console.error("Playwright is required for visual regression checks.");
    console.error("Install it locally with: npm install --save-dev playwright");
    console.error("Then install a browser with: npx playwright install chromium");
    process.exit(1);
  }
}

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

function ensureOutputDirs() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(server) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    if (server.exitCode !== null) {
      throw new Error(`Visual test server exited early with code ${server.exitCode}`);
    }
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch (_) {}
    await wait(250);
  }
  throw new Error(`Server did not become healthy at ${BASE_URL}`);
}

function visualRepositories() {
  const fixtures = [
    ["long-project-name-for-responsive-layout", "Self-hosted customer operations dashboard and workflow automation platform", "TypeScript", ["crm", "dashboard", "workflow"]],
    ["knowledge-search-workbench", "Local-first RAG knowledge search workbench for research teams", "Python", ["rag", "knowledge-base", "search"]],
    ["creative-video-studio", "Open source video editing, subtitles, recording and media workflow studio", "Rust", ["video-editor", "subtitle", "creator-tools"]],
    ["developer-api-console", "API client, testing console and integration workflow for backend developers", "TypeScript", ["api-client", "developer-tools", "testing"]],
    ["design-system-canvas", "Collaborative design system canvas and visual prototyping editor", "TypeScript", ["design-system", "canvas", "prototype"]],
    ["privacy-security-scanner", "Privacy review and security scanning workflow for application teams", "Go", ["security", "privacy", "scanner"]]
  ];
  return Array.from({ length: 24 }, (_, index) => {
    const fixture = fixtures[index % fixtures.length];
    const suffix = String(index + 1).padStart(2, "0");
    const stars = index === 0 ? 8888 : 320 + index * 137;
    return {
      id: index + 1,
      fullName: `visual-fixture/${fixture[0]}-${suffix}`,
      owner: "visual-fixture",
      name: `${fixture[0]}-${suffix}`,
      url: `https://github.com/visual-fixture/${fixture[0]}-${suffix}`,
      description: fixture[1],
      language: fixture[2],
      topics: fixture[3],
      stars,
      forks: index === 0 ? 888 : 24 + index * 11,
      openIssues: index % 7,
      pushedAt: `2026-07-${String(10 - (index % 7)).padStart(2, "0")}T00:00:00.000Z`,
      updatedAt: "2026-07-10T00:00:00.000Z",
      license: { spdx_id: index % 5 === 0 ? "Apache-2.0" : "MIT" },
      scores: {
        opportunity: 90 - (index % 12),
        quality: 82 - (index % 9),
        actionability: 78 - (index % 8),
        momentum: 72 - (index % 10),
        risk: index % 6
      },
      trend: {
        stars: 105 - (index % 12),
        forks: 9 + (index % 5),
        complete: true,
        cached: true,
        date: "2026-07-09"
      }
    };
  });
}

function createVisualStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-visual-"));
  const legacyPath = path.join(dir, "store.json");
  const storage = createStorage(legacyPath);
  storage.upsertProjects(visualRepositories(), { observationPlanId: "default", status: "completed" });
  storage.buildLeaderboard("daily", { limit: 20 });
  return { dir, storePath: path.join(dir, "starvault.db") };
}

function startServer(storePath) {
  const server = spawn(process.execPath, ["src/server.js"], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST,
      RUN_SCAN_ON_BOOT: "false",
      STORE_PATH: storePath,
      GITHUB_TOKEN: "",
      TAVILY_API_KEY: "",
      EXA_API_KEY: "",
      AUTH_TOKEN: "",
      ACCESS_TOKEN: "",
      PUBLIC_ORIGIN: "",
      TRUST_PROXY: "0"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  server.stdout.on("data", (chunk) => process.stdout.write(`[server] ${chunk}`));
  server.stderr.on("data", (chunk) => process.stderr.write(`[server] ${chunk}`));
  return server;
}

async function api(pathname, options = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) {
    throw new Error(`${pathname} failed with ${response.status}`);
  }
  return response.json();
}

async function restoreLanguage(language) {
  if (!language) return;
  await api("/api/settings", {
    method: "POST",
    body: JSON.stringify({ language })
  });
}

async function applyLanguage(page, language) {
  await page.click(`[data-language="${language}"]`);
  await page.waitForTimeout(250);
}

async function switchView(page, view) {
  await page.click(`[data-view-target="${view.name}"]`);
  await page.waitForSelector(`${view.selector}.active`, { timeout: 5000 });
  await page.waitForTimeout(150);
}

async function openFirstProject(page) {
  const firstProject = page.locator(".repo-item [data-action='select']").first();
  if ((await firstProject.count()) === 0) return;
  await firstProject.click();
  await page.waitForTimeout(200);
}

function safeName(parts) {
  return parts.join("-").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
}

function issue(context, type, message, extra = {}) {
  return {
    type,
    message,
    ...context,
    ...extra
  };
}

async function collectLayoutIssues(page, context) {
  const result = await page.evaluate(
    ({ textSelectors, overlapSelectors, actionRowSelectors }) => {
      const issues = [];
      const viewport = {
        width: document.documentElement.clientWidth,
        height: window.innerHeight
      };
      const activeView = document.querySelector(".view-panel.active");
      const activeViewId = activeView?.id || "";

      function isVisible(element) {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity || 1) > 0.01 &&
          rect.width > 1 &&
          rect.height > 1
        );
      }

      function labelFor(element) {
        return (
          element.getAttribute("data-i18n") ||
          element.getAttribute("aria-label") ||
          element.getAttribute("title") ||
          element.textContent.trim().replace(/\s+/g, " ").slice(0, 90) ||
          element.className ||
          element.tagName
        );
      }

      function rectData(rect) {
        return {
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      }

      const horizontalOverflow = Math.max(
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.documentElement.clientWidth
      );
      if (horizontalOverflow > 2) {
        issues.push({
          type: "document-horizontal-overflow",
          message: `Document scrollWidth exceeds viewport by ${Math.round(horizontalOverflow)}px`,
          activeViewId
        });
      }

      const footerLinks = Array.from(document.querySelectorAll(".site-footer-link")).filter(isVisible);
      const footerIconRects = [];
      for (const link of footerLinks) {
        const linkRect = link.getBoundingClientRect();
        const visibleTextParts = Array.from(
          link.querySelectorAll("span:not(.ui-icon-only):not(.sr-only)")
        ).filter(isVisible);
        if (visibleTextParts.length > 0) {
          issues.push({
            type: "footer-link-visible-text",
            message: "Footer icon link contains visible text",
            label: labelFor(link),
            text: visibleTextParts.map((part) => part.textContent.trim()).filter(Boolean).join(" / "),
            rect: rectData(linkRect),
            activeViewId
          });
        }

        const icon = link.querySelector(".ui-icon");
        if (!icon || !isVisible(icon)) {
          issues.push({
            type: "footer-link-missing-icon",
            message: "Footer link does not render its icon",
            label: labelFor(link),
            rect: rectData(linkRect),
            activeViewId
          });
          continue;
        }

        const iconRect = icon.getBoundingClientRect();
        const overflow = Math.max(
          linkRect.left - iconRect.left,
          iconRect.right - linkRect.right,
          linkRect.top - iconRect.top,
          iconRect.bottom - linkRect.bottom
        );
        if (overflow > 1) {
          issues.push({
            type: "footer-link-icon-overflow",
            message: `Footer icon exceeds its link by ${Math.round(overflow)}px`,
            label: labelFor(link),
            icon: rectData(iconRect),
            link: rectData(linkRect),
            activeViewId
          });
        }
        footerIconRects.push({ link, icon, rect: iconRect });
      }

      for (let i = 0; i < footerIconRects.length; i += 1) {
        for (let j = i + 1; j < footerIconRects.length; j += 1) {
          const first = footerIconRects[i];
          const second = footerIconRects[j];
          const overlapArea =
            Math.max(0, Math.min(first.rect.right, second.rect.right) - Math.max(first.rect.left, second.rect.left)) *
            Math.max(0, Math.min(first.rect.bottom, second.rect.bottom) - Math.max(first.rect.top, second.rect.top));
          if (overlapArea > 4) {
            issues.push({
              type: "footer-icon-overlap",
              message: "Footer icons overlap",
              label: `${labelFor(first.link)} / ${labelFor(second.link)}`,
              overlapArea: Math.round(overlapArea),
              first: rectData(first.rect),
              second: rectData(second.rect),
              activeViewId
            });
          }
        }
      }

      const horizontalTargets = [
        ".app-shell",
        ".sidebar",
        ".workspace",
        ".view-panel.active",
        ".content-grid",
        ".filter-board",
        ".project-table-panel",
        ".detail-panel",
        ".leaderboard-panel",
        ".learning-shell",
        ".overview-dashboard",
        ".settings-grid"
      ];

      for (const selector of horizontalTargets) {
        for (const element of document.querySelectorAll(selector)) {
          if (!isVisible(element)) continue;
          const rect = element.getBoundingClientRect();
          if (rect.left < -2 || rect.right > viewport.width + 2) {
            issues.push({
              type: "container-horizontal-overflow",
              selector,
              label: labelFor(element),
              rect: rectData(rect),
              activeViewId
            });
          }
        }
      }

      for (const selector of textSelectors) {
        for (const element of document.querySelectorAll(selector)) {
          if (!isVisible(element)) continue;
          if (activeView && !activeView.contains(element) && !element.closest(".sidebar")) continue;
          const style = window.getComputedStyle(element);
          const hasText = element.innerText?.trim();
          if (!hasText) continue;
          const widthOverflow = element.scrollWidth - element.clientWidth;
          const heightOverflow = element.scrollHeight - element.clientHeight;
          const lineClamp = Number.parseInt(style.webkitLineClamp || "0", 10);
          const intentionallyTruncated =
            (style.textOverflow === "ellipsis" && style.whiteSpace === "nowrap") ||
            (Number.isFinite(lineClamp) && lineClamp > 0);
          const hidesOverflow =
            ["hidden", "clip", "auto", "scroll"].includes(style.overflowX) ||
            ["hidden", "clip", "auto", "scroll"].includes(style.overflowY);
          if ((widthOverflow > 2 || heightOverflow > 2) && hidesOverflow && !intentionallyTruncated) {
            issues.push({
              type: "text-clipped",
              selector,
              label: labelFor(element),
              widthOverflow: Math.round(widthOverflow),
              heightOverflow: Math.round(heightOverflow),
              rect: rectData(element.getBoundingClientRect()),
              activeViewId
            });
          }
        }
      }

      function intersectionArea(a, b) {
        const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        return width * height;
      }

      for (const selector of overlapSelectors) {
        for (const group of document.querySelectorAll(selector)) {
          if (!isVisible(group)) continue;
          if (activeView && !activeView.contains(group) && !group.closest(".sidebar")) continue;
          const children = Array.from(group.children).filter(isVisible);
          for (let i = 0; i < children.length; i += 1) {
            for (let j = i + 1; j < children.length; j += 1) {
              const a = children[i].getBoundingClientRect();
              const b = children[j].getBoundingClientRect();
              const area = intersectionArea(a, b);
              if (area > 4) {
                issues.push({
                  type: "sibling-overlap",
                  selector,
                  label: `${labelFor(children[i])} / ${labelFor(children[j])}`,
                  overlapArea: Math.round(area),
                  first: rectData(a),
                  second: rectData(b),
                  activeViewId
                });
              }
            }
          }
        }
      }

      for (const selector of actionRowSelectors) {
        for (const row of document.querySelectorAll(selector)) {
          if (!isVisible(row)) continue;
          if (activeView && !activeView.contains(row)) continue;

          const actionContainer = row.querySelector(".github-stat-actions.compact");
          if (!actionContainer || !isVisible(actionContainer)) continue;

          const containerRect = actionContainer.getBoundingClientRect();
          const trend = row.querySelector(".trend-tag");
          const trendRect = trend && isVisible(trend) ? trend.getBoundingClientRect() : null;
          const actions = Array.from(actionContainer.querySelectorAll(".github-stat-action")).filter(isVisible);

          for (const action of actions) {
            const actionRect = action.getBoundingClientRect();
            const overflow = Math.max(
              containerRect.left - actionRect.left,
              actionRect.right - containerRect.right,
              containerRect.top - actionRect.top,
              actionRect.bottom - containerRect.bottom
            );
            if (overflow > 2) {
              issues.push({
                type: "github-action-overflow",
                selector,
                label: labelFor(action),
                overflow: Math.round(overflow),
                action: rectData(actionRect),
                container: rectData(containerRect),
                activeViewId
              });
            }

            if (trendRect) {
              const overlapArea = intersectionArea(actionRect, trendRect);
              if (overlapArea > 4) {
                issues.push({
                  type: "github-action-trend-overlap",
                  selector,
                  label: `${labelFor(action)} / ${labelFor(trend)}`,
                  overlapArea: Math.round(overlapArea),
                  action: rectData(actionRect),
                  trend: rectData(trendRect),
                  activeViewId
                });
              }
            }
          }
        }
      }

      return issues;
    },
    {
      textSelectors: TEXT_FIT_SELECTORS,
      overlapSelectors: OVERLAP_GROUP_SELECTORS,
      actionRowSelectors: [".repo-github-row", ".leaderboard-github-row"]
    }
  );

  return result.map((entry) => issue(context, entry.type, entry.message || entry.label || entry.type, entry));
}

async function collectTooltipIssues(page, context) {
  const handles = await page.$$("[data-tooltip], .has-tooltip[aria-label]");
  const issues = [];
  const maxChecks = Math.min(handles.length, 18);

  for (let index = 0; index < maxChecks; index += 1) {
    const handle = handles[index];
    const visible = await handle.evaluate((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 2 && rect.height > 2;
    });
    if (!visible) continue;

    await handle.dispatchEvent("pointerover", { bubbles: true });
    await page.waitForTimeout(80);
    const tooltipIssue = await page.evaluate((element) => {
      const tooltip = document.querySelector(".floating-tooltip.visible");
      if (!tooltip) return null;
      const target = element.getBoundingClientRect();
      const tip = tooltip.getBoundingClientRect();
      const outOfViewport = tip.left < 0 || tip.top < 0 || tip.right > window.innerWidth || tip.bottom > window.innerHeight;
      const overlapWidth = Math.max(0, Math.min(target.right, tip.right) - Math.max(target.left, tip.left));
      const overlapHeight = Math.max(0, Math.min(target.bottom, tip.bottom) - Math.max(target.top, tip.top));
      const overlapArea = overlapWidth * overlapHeight;
      const label = element.getAttribute("data-tooltip") || element.getAttribute("aria-label") || element.textContent.trim();
      if (!outOfViewport && overlapArea <= 2) return null;
      return {
        label,
        outOfViewport,
        overlapArea: Math.round(overlapArea),
        tooltip: {
          left: Math.round(tip.left),
          top: Math.round(tip.top),
          right: Math.round(tip.right),
          bottom: Math.round(tip.bottom)
        },
        target: {
          left: Math.round(target.left),
          top: Math.round(target.top),
          right: Math.round(target.right),
          bottom: Math.round(target.bottom)
        }
      };
    }, handle);

    if (tooltipIssue) {
      issues.push(issue(context, "tooltip-position", tooltipIssue.label || "Tooltip position issue", tooltipIssue));
    }
    await handle.dispatchEvent("pointerout", { bubbles: true });
  }

  return issues;
}

async function run() {
  const { chromium } = loadPlaywright();
  ensureOutputDirs();
  const visualStore = createVisualStore();
  const server = startServer(visualStore.storePath);
  let originalLanguage = "";

  try {
    await waitForHealth(server);
    const settings = await api("/api/settings");
    originalLanguage = settings?.language || "zh";
    const browser = await chromium.launch(chromiumLaunchOptions());
    const page = await browser.newPage();
    await page.addInitScript(() => localStorage.setItem("starvault.guideSeen.v1", "1"));
    const issues = [];
    const consoleIssues = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleIssues.push({
          type: "console-error",
          message: message.text()
        });
      }
    });
    page.on("pageerror", (error) => {
      consoleIssues.push({
        type: "page-error",
        message: error.message
      });
    });

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const language of LANGUAGES) {
        await page.goto(BASE_URL, { waitUntil: "networkidle" });
        await page.waitForSelector(".app-shell", { timeout: 10000 });
        await applyLanguage(page, language);

        for (const view of VIEWS) {
          const context = {
            viewport: viewport.name,
            width: viewport.width,
            height: viewport.height,
            language,
            view: view.name
          };
          await switchView(page, view);
          if (view.prepare) await view.prepare(page);
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, `${safeName([viewport.name, language, view.name])}.png`),
            fullPage: true
          });
          issues.push(...(await collectLayoutIssues(page, context)));
          issues.push(...(await collectTooltipIssues(page, context)));
        }
      }
    }

    await browser.close();

    const report = {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      viewports: VIEWPORTS,
      languages: LANGUAGES,
      views: VIEWS.map((view) => view.name),
      issueCount: issues.length + consoleIssues.length,
      issues: [...consoleIssues, ...issues]
    };
    fs.writeFileSync(path.join(OUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);

    if (report.issueCount > 0) {
      console.error(`Visual regression check failed with ${report.issueCount} issue(s).`);
      console.error(`Report: ${path.join(OUT_DIR, "report.json")}`);
      throw new Error("Visual regression check failed.");
    }

    console.log("Visual regression check passed.");
    console.log(`Screenshots: ${SCREENSHOT_DIR}`);
    console.log(`Report: ${path.join(OUT_DIR, "report.json")}`);
  } finally {
    if (originalLanguage) {
      await restoreLanguage(originalLanguage).catch(() => {});
    }
    if (server.exitCode === null) {
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 3000);
        server.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
        server.kill("SIGTERM");
      });
    }
    fs.rmSync(visualStore.dir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
