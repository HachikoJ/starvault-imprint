const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const test = require('node:test');

function sourceRoot() {
  if (process.env.STARVAULT_TEST_SOURCE_ROOT) return path.resolve(process.env.STARVAULT_TEST_SOURCE_ROOT);
  let candidate = __dirname;
  while (path.dirname(candidate) !== candidate) {
    if (fs.existsSync(path.join(candidate, 'public', 'app.js')) && fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    candidate = path.dirname(candidate);
  }
  throw new Error('Set STARVAULT_TEST_SOURCE_ROOT to the fixture source checkout');
}
const ROOT = sourceRoot();
const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
const { createStorage } = require(path.join(ROOT, 'src', 'lib', 'storage'));
const PROJECT = 'fixture/node-recovery';
const REPORTS = path.resolve(process.env.T02_EVIDENCE_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'starvault-t02-evidence-')));
fs.mkdirSync(REPORTS, { recursive: true });
function browserOptions() {
  const candidates = [process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'].filter(Boolean);
  const executablePath = candidates.find(fs.existsSync);
  return { headless: true, ...(executablePath ? { executablePath } : {}) };
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function dynamicPort() {
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  return port;
}
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise(resolve => { child.once('exit', resolve); child.kill('SIGTERM'); });
}
async function fixture(t, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'starvault-t02-node-'));
  const db = path.join(dir, 'fixture.db');
  const profile = path.join(dir, 'chromium-profile');
  // A new cwd excludes the user's .env; only static assets are linked in.
  fs.symlinkSync(path.join(ROOT, 'public'), path.join(dir, 'public'), 'dir');
  assert.equal(fs.existsSync(path.join(dir, '.env')), false);
  const seedStorage = createStorage(db);
  seedStorage.upsertProjects([{
    fullName: PROJECT, owner: 'fixture', name: 'node-recovery',
    description: 'Isolated recovery fixture application', language: 'TypeScript',
    url: `https://github.com/${PROJECT}`, stars: 50, forks: 3,
    license: { spdxId: 'MIT', name: 'MIT' },
    scores: { opportunity: 75, quality: 70, actionability: 70, risk: 3 }
  }], { observationPlanId: 'default', status: 'completed' });
  seedStorage.setNote(PROJECT, 'server baseline note', 'watch');
  // Use a consistent pre-server SQLite snapshot, not a live copy of .db.
  const { DatabaseSync } = require('node:sqlite');
  const backupDb = new DatabaseSync(db);
  backupDb.exec(`VACUUM INTO '${path.join(dir, 'r-db-before.sqlite').replaceAll("'", "''")}'`);
  backupDb.close();
  const preload = path.join(dir, 'deny-external.cjs');
  fs.writeFileSync(preload, `const allowed=u=>{const v=new URL(typeof u==='string'?u:u.url||u.href);if(!['127.0.0.1','localhost','[::1]'].includes(v.hostname))throw Error('Fixture denied external network '+v.origin);};const original=global.fetch;global.fetch=(u,o)=>{allowed(u);return original(u,o)};for(const m of ['node:http','node:https']){const lib=require(m);for(const k of ['request','get']){const fn=lib[k];lib[k]=function(u,...a){if(typeof u==='string'||u instanceof URL)allowed(u);else if(u?.hostname&&!['127.0.0.1','localhost','::1'].includes(u.hostname))throw Error('Fixture denied external host');return fn.call(this,u,...a)}}}`);
  const port = await dynamicPort();
  const origin = `http://127.0.0.1:${port}`;
  const childEnv = {};
  for (const key of ['PATH', 'HOME', 'TMPDIR', 'SYSTEMROOT', 'WINDIR', 'LANG']) if (process.env[key]) childEnv[key] = process.env[key];
  Object.assign(childEnv, { STORE_PATH: db, PORT: String(port), HOST: '127.0.0.1',
    AUTH_TOKEN: '', ACCESS_TOKEN: '', GITHUB_TOKEN: '', TAVILY_API_KEY: '', EXA_API_KEY: '',
    RUN_SCAN_ON_BOOT: 'false', SCAN_HOUR: '23', APP_TIME_ZONE: 'UTC' });
  const server = spawn(process.execPath, ['--require', preload, path.join(ROOT, 'src', 'server.js')], {
    cwd: dir, env: childEnv, stdio: ['ignore', 'pipe', 'pipe']
  });
  let logs = '';
  server.stdout.on('data', chunk => logs += chunk.toString());
  server.stderr.on('data', chunk => logs += chunk.toString());
  let context;
  t.after(async () => {
    await context?.close();
    await stop(server);
    fs.writeFileSync(path.join(dir, 'server.log'), logs);
  });
  for (let count = 0; count < 100; count++) {
    if (server.exitCode !== null) throw new Error(`Fixture server exited: ${logs}`);
    try { if ((await fetch(`${origin}/api/health`)).ok) break; } catch {}
    if (count === 99) throw new Error(`Fixture server failed to start: ${logs}`);
    await delay(50);
  }
  const actualRuntimeConfig = await (await fetch(`${origin}/runtime-config.js`)).text();
  assert.match(actualRuntimeConfig, /__STARVAULT_DEPLOYMENT__\s*=\s*"server"/, 'actual Node endpoint must override checked-in static runtime');
  const unexpected = [];
  context = await chromium.launchPersistentContext(profile, browserOptions());
  await context.route('**/*', async route => {
    const requested = new URL(route.request().url());
    if (requested.origin === origin) return route.continue();
    unexpected.push(`${route.request().method()} ${requested.origin}${requested.pathname}`);
    return route.abort('blockedbyclient');
  });
  t.after(() => assert.deepEqual(unexpected, [], 'No non-fixture network may be requested'));
  const page = context.pages()[0] || await context.newPage();
  await page.addInitScript(() => localStorage.setItem('starvault.guideSeen.v1', '1'));
  if (options.static) {
    await page.route('**/runtime-config.js', route => route.fulfill({ contentType: 'text/javascript', body: 'window.__STARVAULT_DEPLOYMENT__="static";window.__STARVAULT_EXA_PROXY__="";' }));
    // Static standalone fixture deliberately starts empty; no remote/demo seed.
    await page.route('**/demo-snapshot.json', route => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
  }
  await page.goto(origin);
  await page.waitForFunction(() => document.documentElement.dataset.runtime === 'ready');
  if (!options.static) {
    await page.waitForFunction(() => Boolean(document.querySelector('#project-rows .repo-item')));
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !state.indexedDbSnapshotSyncing);
    await page.evaluate(async () => { clearTimeout(state.indexedDbSnapshotTimer); await refreshIndexedDbSnapshot({ force: true }); });
    const mode = await page.evaluate(() => ({ deployment: window.__STARVAULT_DEPLOYMENT__, static: window.StarVaultLocalApi.isStaticDeployment() }));
    assert.deepEqual(mode, { deployment: 'server', static: false });
  }
  t.diagnostic(`fixture=${dir}; origin=${origin}; profile=${profile}; source=${ROOT}`);
  return { dir, origin, page, server, context, db, unexpected };
}
async function invoke(page, endpoint, body) {
  return page.evaluate(async ({ endpoint, body }) => {
    try { return { ok: true, value: await api(endpoint, body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }) }; }
    catch (error) { return { ok: false, error: { message: error.message, code: error.code || '', status: error.status || null } }; }
  }, { endpoint, body });
}
async function localAssets(page) {
  return page.evaluate(async () => ({ snapshot: await window.StarVaultIndexedDB.getSnapshot(),
    meta: await window.StarVaultIndexedDB.getSnapshotMeta(), forced: window.StarVaultLocalApi.localModeForced() }));
}
async function serverAssets(f) { return (await (await fetch(`${f.origin}/api/local-snapshot`)).json()).store; }
async function recover(f) {
  await f.page.reload();
  await f.page.waitForFunction(() => document.documentElement.dataset.runtime === 'ready');
  await f.page.waitForLoadState('networkidle');
  await f.page.waitForFunction(() => !state.indexedDbSnapshotSyncing);
  return f.page.evaluate(async () => { clearTimeout(state.indexedDbSnapshotTimer); try { await refreshIndexedDbSnapshot({ force: true }); return { ok: true }; } catch(e) { return { ok: false, message: e.message }; } });
}
function evidence(label, data) { fs.writeFileSync(path.join(REPORTS, `${label}.json`), JSON.stringify(data, null, 2)); }
async function recoveryRecords(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const req = indexedDB.open('starvault-imprint'); req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error); });
    try {
      const names = Array.from(db.objectStoreNames); const tx = db.transaction(names, 'readonly');
      return await Promise.all(names.map(name => new Promise((resolve, reject) => { const req=tx.objectStore(name).getAll();req.onsuccess=()=>resolve({store:name,values:req.result});req.onerror=()=>reject(req.error); })));
    } finally { db.close(); }
  });
}
const TIMEOUT = { timeout: 45000 };

test('T-02 Node failed write stays failed and recovery does not discard offline assets', TIMEOUT, async t => {
  const f = await fixture(t);
  const before = await localAssets(f.page);
  await f.page.route('**/api/note', route => route.abort('connectionfailed'));
  const outcome = await invoke(f.page, '/api/note', { fullName: PROJECT, text: 'offline edit must not become server success', status: 'watch' });
  const offline = await localAssets(f.page);
  const remote = await serverAssets(f);
  await f.page.unroute('**/api/note');
  const recovery = await recover(f);
  const restored = await localAssets(f.page);
  evidence('offline-write-and-recovery', { fixture: f.dir, before, outcome, offline, remote, recovery, restored });
  assert.equal(outcome.ok, false, 'a failed Node POST must never return a local write success');
  assert.equal(remote.observationPlans.default.userData.notes[PROJECT].text, 'server baseline note');
  assert.equal(offline.snapshot.store.observationPlans.default.userData.notes[PROJECT].text, 'server baseline note', 'Node read cache must stay read-only');
});

for (const fault of [
  { name: '200-non-json', status: 200, contentType: 'text/html', body: '<!doctype html>upstream unavailable' },
  { name: '404-json', status: 404, contentType: 'application/json', body: '{"message":"temporary route missing"}' },
  { name: '401-json', status: 401, contentType: 'application/json', body: '{"authRequired":true,"message":"fixture unauthorized"}' },
  { name: '401-html', status: 401, contentType: 'text/html', body: '<!doctype html>authentication required' }
]) test(`T-02 ${fault.name} must not route a Node write into IndexedDB`, TIMEOUT, async t => {
  const f = await fixture(t);
  await f.page.route('**/api/note', route => route.fulfill(fault));
  const outcome = await invoke(f.page, '/api/note', { fullName: PROJECT, text: `${fault.name} must fail`, status: 'watch' });
  const local = await localAssets(f.page);
  const remote = await serverAssets(f);
  evidence(fault.name, { fixture: f.dir, outcome, local, remote });
  assert.equal(outcome.ok, false, `${fault.name} is an error, not permission to switch writable storage`);
  assert.equal(local.snapshot.store.observationPlans.default.userData.notes[PROJECT].text, 'server baseline note');
  assert.equal(remote.observationPlans.default.userData.notes[PROJECT].text, 'server baseline note');
});

test('T-02 server committed but response lost does not duplicate local learning or report success', TIMEOUT, async t => {
  const f = await fixture(t);
  const beforeRemote = await serverAssets(f);
  let posts = 0;
  await f.page.route('**/api/note', async route => {
    posts += 1;
    const response = await route.fetch();
    assert.equal(response.status(), 200, 'fixture must commit at the real Node service first');
    await route.abort('connectionfailed');
  });
  const outcome = await invoke(f.page, '/api/note', { fullName: PROJECT, text: 'committed response lost', status: 'watch' });
  const afterRemote = await serverAssets(f);
  const afterLocal = await localAssets(f.page);
  await f.page.unroute('**/api/note');
  const recovery = await recover(f);
  const restored = await localAssets(f.page);
  const eventCount = value => value?.observationPlans?.default?.memory?.events?.filter(event => event.type === 'triage_note' && event.fullName === PROJECT).length || 0;
  evidence('response-lost-after-commit', { fixture: f.dir, posts, beforeRemote, outcome, afterRemote, afterLocal, recovery, restored });
  assert.equal(posts, 1, 'an unknown write outcome must not be automatically replayed');
  assert.equal(afterRemote.observationPlans.default.userData.notes[PROJECT].text, 'committed response lost');
  assert.equal(outcome.ok, false, 'server response lost must be surfaced as unknown/failed, not a second local success');
  assert.equal(afterLocal.snapshot.store.observationPlans.default.userData.notes[PROJECT].text, 'server baseline note', 'no fallback local mutation may occur');
  assert.equal(eventCount(afterLocal.snapshot.store), eventCount(beforeRemote));
  assert.equal(restored.snapshot.store.observationPlans.default.userData.notes[PROJECT].text, 'committed response lost');
});

test('T-02 legacy local differences remain recoverable before server snapshot replacement and after reload', TIMEOUT, async t => {
  const f = await fixture(t);
  await f.page.evaluate(async fullName => {
    await window.StarVaultLocalApi.handle('/api/note', { method: 'POST', body: JSON.stringify({ fullName, text: 'legacy offline asset without dirty metadata', status: 'watch' }) });
    window.StarVaultLocalApi.activateLocalMode();
    clearTimeout(state.indexedDbSnapshotTimer);
  }, PROJECT);
  const before = await localAssets(f.page);
  fs.writeFileSync(path.join(f.dir, 'r-idb-before.json'), JSON.stringify(before, null, 2));
  const recovery = await recover(f);
  const after = await localAssets(f.page);
  const persistedRecords = await recoveryRecords(f.page);
  evidence('legacy-difference', { fixture: f.dir, before, recovery, after, persistedRecords, remote: await serverAssets(f) });
  // Implementation neutral: retaining the original snapshot and blocking sync,
  // or a durable independent backup, is acceptable. A JS-memory copy is not.
  assert.ok(JSON.stringify(persistedRecords).includes('legacy offline asset without dirty metadata'), 'legacy user note must exist in durable IDB after recovery, either current state or a recovery asset');
  assert.equal((await serverAssets(f)).observationPlans.default.userData.notes[PROJECT].text, 'server baseline note', 'recovery may not silently push legacy edits to Node');
  await f.page.waitForFunction(() => !document.querySelector('#node-cache-status button').hidden);
  for (const width of [1440, 390]) for (const language of ['zh', 'en']) {
    await f.page.setViewportSize({ width, height: 900 });
    await f.page.evaluate(async language => { state.language = language; applyTranslations(); await renderNodeCacheStatus(); }, language);
    assert.equal(await f.page.locator('#node-cache-status').isVisible(), true);
    assert.match(await f.page.locator('#node-cache-status button').textContent(), language === 'zh' ? /恢复副本/ : /recovery copies/);
    assert.ok(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    await f.page.screenshot({ path: path.join(f.dir, `recovery-${width}-${language}.png`), fullPage: true });
  }
  const downloadPromise = f.page.waitForEvent('download');
  await f.page.locator('#node-cache-status button').click();
  const download = await downloadPromise;
  const bundle = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  assert.equal(bundle.schema, 'starvault-cache-recovery-bundle/v1');
  assert.ok(JSON.stringify(bundle.snapshots).includes('legacy offline asset without dirty metadata'), 'the user recovery entry must download the durable local differences');
  await f.page.reload();
  await f.page.waitForFunction(() => document.documentElement.dataset.runtime === 'ready');
  assert.ok(JSON.stringify(await recoveryRecords(f.page)).includes('legacy offline asset without dirty metadata'), 'recovery copy must survive a second reload');
});

test('T-02 Node offline cache remains readable while writes fail', TIMEOUT, async t => {
  const f = await fixture(t);
  await f.page.route('**/api/**', route => route.abort('connectionfailed'));
  const reading = await invoke(f.page, '/api/projects?limit=10');
  const writing = await invoke(f.page, '/api/note', { fullName: PROJECT, text: 'read-only cache write rejected', status: 'watch' });
  evidence('readonly-offline-cache', { fixture: f.dir, reading, writing, local: await localAssets(f.page) });
  assert.equal(reading.ok, true, 'cached browsing must remain available');
  assert.ok(reading.value.items.some(project => project.fullName === PROJECT));
  assert.equal(writing.ok, false, 'offline read mode must not imply local write mode');
  await f.page.waitForFunction(() => document.querySelector('#node-cache-status span')?.textContent.includes('服务离线'));
  assert.equal(await f.page.locator('#node-cache-status').isVisible(), true);
});

test('T-02 static standalone deployment retains local write behavior', TIMEOUT, async t => {
  const f = await fixture(t, { static: true });
  await f.page.evaluate(async fullName => {
    const api = window.StarVaultLocalApi;
    await api.handle('/api/settings', { method:'POST', body: JSON.stringify({ validateProvider:false }) });
    await window.StarVaultIndexedDB.putProjects([{ fullName, owner:'fixture', name:'node-recovery', description:'static fixture', stars:50, observationPlanMatches:{default:{planId:'default'}} }]);
  }, PROJECT);
  let nodeWrites = 0;
  await f.page.route('**/api/note', route => { nodeWrites += 1; return route.abort('blockedbyclient'); });
  const written = await invoke(f.page, '/api/note', { fullName: PROJECT, text: 'static local note remains supported', status: 'watch' });
  const local = await localAssets(f.page);
  evidence('static-writable', { fixture: f.dir, written, nodeWrites, local });
  assert.equal(written.ok, true);
  assert.equal(nodeWrites, 0);
  assert.equal(local.snapshot.store.observationPlans.default.userData.notes[PROJECT].text, 'static local note remains supported');
  await f.page.reload();
  await f.page.waitForFunction(() => document.documentElement.dataset.runtime === 'ready');
  assert.equal((await localAssets(f.page)).snapshot.store.observationPlans.default.userData.notes[PROJECT].text, 'static local note remains supported');
});

test('T-02 interrupted paged refresh preserves local-only assets in a durable copy', TIMEOUT, async t => {
  const f = await fixture(t);
  await f.page.evaluate(async () => {
    clearTimeout(state.indexedDbSnapshotTimer);
    await window.StarVaultIndexedDB.putProjects([{ fullName: 'fixture/local-only', description: 'local-only recovery asset' }]);
  });
  await f.page.route('**/api/local-projects?*', route => route.abort('connectionfailed'));
  const interruption = await f.page.evaluate(async () => {
    try { await refreshIndexedDbSnapshot({ force: true, syncProjects: true }); return { ok: true }; }
    catch (error) { return { ok: false, code: error.code }; }
  });
  assert.equal(interruption.ok, false);
  assert.ok(JSON.stringify(await recoveryRecords(f.page)).includes('local-only recovery asset'));
  await f.page.unroute('**/api/local-projects?*');
  const recovery = await recover(f);
  assert.equal(recovery.ok, true);
  assert.ok(JSON.stringify(await recoveryRecords(f.page)).includes('local-only recovery asset'));
});
