const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const {spawnSync} = require("node:child_process");
const test = require("node:test");
const {chromium} = require("playwright");
const ROOT = path.resolve(__dirname, "..");

function nodeCapabilities(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-scheduler-config-"));
  t.diagnostic(`Retained actual Node scheduler configuration: ${dir}`);
  const script = `const fs=require('node:fs'),path=require('node:path');
global.fetch=async()=>{throw Error('No external requests');};
const mod=require(path.join(process.env.FIXTURE_ROOT,'src/server'));
(async()=>{await new Promise(resolve=>mod.server.listen(0,'127.0.0.1',resolve));
 const port=mod.server.address().port;
 const get=()=>new Promise((resolve,reject)=>require('node:http').get('http://127.0.0.1:'+port+'/api/config',res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve(JSON.parse(text)));}).on('error',reject));
 const withoutScheduler=await get();mod.startServer();const withScheduler=await get();
 fs.writeFileSync('configuration.json',JSON.stringify({withoutScheduler,withScheduler},null,2));process.exit(0);
})().catch(error=>{console.error(error);process.exit(1);});`;
  const env = {};
  for (const key of ["PATH", "HOME", "TMPDIR", "LANG"]) if (process.env[key]) env[key] = process.env[key];
  Object.assign(env, {FIXTURE_ROOT: ROOT, STORE_PATH: path.join(dir, "fixture.db"), HOST: "127.0.0.1", PORT: "0", RUN_SCAN_ON_BOOT: "false", SCAN_HOUR: "6", APP_TIME_ZONE: "Pacific/Auckland",
    GITHUB_TOKEN: "", TAVILY_API_KEY: "", EXA_API_KEY: "", AUTH_TOKEN: "", ACCESS_TOKEN: "", PUBLIC_ORIGIN: "", TRUST_PROXY: "0", DEEPSEEK_API_KEY: ""});
  const result = spawnSync(process.execPath, ["-e", script], {cwd: dir, env, encoding: "utf8", timeout: 15000});
  fs.writeFileSync(path.join(dir, "process.log"), result.stdout + result.stderr);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(fs.readFileSync(path.join(dir, "configuration.json"), "utf8"));
}

test("T-22 actual Node config distinguishes an unstarted scheduler from its running timezone/hour", t => {
  const config = nodeCapabilities(t);
  assert.equal(config.withoutScheduler.schedulerEnabled, false);
  assert.equal(config.withoutScheduler.scanCapabilities.manual, true);
  assert.equal(config.withoutScheduler.scanCapabilities.scheduled, false);
  assert.equal(config.withScheduler.schedulerEnabled, true);
  assert.equal(config.withScheduler.scanCapabilities.scheduled, true);
  assert.equal(config.withScheduler.scanHour, 6);
  assert.equal(config.withScheduler.timeZone, "Pacific/Auckland");
});

test("T-22 real Pages browser renders manual, scheduled, unknown and read-only offline scan capabilities in both languages", {timeout: 60000}, async t => {
  const node = nodeCapabilities(t), dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-scheduler-browser-"));
  t.diagnostic(`Retained fresh Chrome profile and capability screenshots: ${dir}`);
  const prefix = "/mirror/starvault/";
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, "http://127.0.0.1").pathname;
    const name = pathname.startsWith(prefix) ? pathname.slice(prefix.length) || "index.html" : "";
    if (!name || !/^[\w.-]+$/.test(name) || !fs.existsSync(path.join(ROOT, "public", name))) {res.writeHead(404); res.end(); return;}
    res.writeHead(200, {"Content-Type": name.endsWith(".js") ? "text/javascript" : name.endsWith(".css") ? "text/css" : name.endsWith(".json") ? "application/json" : name.endsWith(".html") ? "text/html" : name.endsWith(".svg") ? "image/svg+xml" : name.endsWith(".png") ? "image/png" : "application/octet-stream"});
    res.end(fs.readFileSync(path.join(ROOT, "public", name)));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let context;
  t.after(async () => {await context?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));});
  const origin = `http://127.0.0.1:${server.address().port}`;
  const executablePath = [process.env.PLAYWRIGHT_EXECUTABLE_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean).find(file => fs.existsSync(file));
  context = await chromium.launchPersistentContext(path.join(dir, "profile"), {headless: true, serviceWorkers: "block", ...(executablePath ? {executablePath} : {})});
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort("blockedbyclient"));
  const page = context.pages()[0] || await context.newPage();
  await page.addInitScript(() => localStorage.setItem("starvault.guideSeen.v1", "1"));
  await page.goto(origin + prefix);
  await page.waitForFunction(() => document.documentElement.dataset.runtime === "ready" && state.config && window.StarVaultLocalApi);
  await page.waitForFunction(() => document.querySelector(".brand-mark img")?.naturalWidth > 0);
  const staticConfig = await page.evaluate(() => window.StarVaultLocalApi.handle("/api/config"));
  const offlineConfig = await page.evaluate(() => window.StarVaultLocalApi.handle("/api/config", {readOnlyCache: true}));
  assert.equal(staticConfig.schedulerEnabled, false); assert.equal(staticConfig.scanCapabilities.manual, true); assert.equal(staticConfig.scanHour, null);
  assert.equal(offlineConfig.schedulerEnabled, null); assert.equal(offlineConfig.scanCapabilities.manual, false);
  const cases = [["static", staticConfig], ["running", node.withScheduler], ["unstarted", node.withoutScheduler], ["unknown", {scanHour: 8}], ["offline", offlineConfig]];
  const dot = page.locator('[data-config-source="github"]');
  for (const width of [1440, 390]) for (const language of ["zh", "en"]) for (const [name, config] of cases) {
    await page.setViewportSize({width, height: 900});
    await page.evaluate(({language, config}) => {state.language = language; state.config = config; applyTranslations(); renderConfig(config);}, {language, config});
    const tooltip = await dot.getAttribute("data-tooltip"), aria = await dot.getAttribute("aria-label");
    assert.equal(aria, tooltip); assert.doesNotMatch(tooltip, /NaN|undefined|08:00/);
    if (name === "running") {assert.match(tooltip, /06:00/); assert.match(tooltip, /Pacific\/Auckland/);}
    else {
      assert.doesNotMatch(tooltip, /自动扫描：|Auto scan:/);
      assert.match(tooltip, name === "offline" ? language === "zh" ? /只读|离线/ : /read-only|offline/i : name === "unknown" ? language === "zh" ? /未知/ : /unknown/i : language === "zh" ? /手动扫描/ : /Manual scan/i);
    }
    await dot.hover();
    assert.equal(await page.getByRole("tooltip").textContent(), tooltip, "the visible tooltip updates while the pointer stays over the connection dot");
    await page.screenshot({path: path.join(dir, `${name}-${width}-${language}.png`)});
  }
  assert.equal(await page.evaluate(() => window.StarVaultLocalApi.isStaticDeployment()), true);
  assert.equal(await page.locator("#server-auth-button").isVisible(), false);
});
