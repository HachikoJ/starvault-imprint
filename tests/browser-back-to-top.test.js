const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');

test('initial guide blocks background clicks; closing it allows back-to-top keyboard navigation', { timeout: 60000 }, async t => {
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://127.0.0.1').pathname.slice(1) || 'index.html';
    if (!/^[\w.-]+$/.test(name) || !fs.existsSync(path.join(ROOT, 'public', name))) { res.writeHead(404); res.end(); return; }
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': types[path.extname(name)] || 'application/octet-stream' });
    res.end(fs.readFileSync(path.join(ROOT, 'public', name)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const candidate = [process.env.PLAYWRIGHT_EXECUTABLE_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean).find(p => fs.existsSync(p));
  const browser = await chromium.launch({ headless: true, ...(candidate ? { executablePath: candidate } : {}) });
  t.after(async () => { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  for (const width of [1440, 390]) for (const reducedMotion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion, serviceWorkers: 'block' });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    await page.goto(origin);
    await page.waitForFunction(() => document.documentElement.dataset.runtime === 'ready' && state.projects?.length && state.config);
    await page.waitForFunction(() => state.guideTourActive, null, { timeout: 10000 });
    const blockedOffset = await page.evaluate(async () => {
      projectListScrollElement().scrollTop = 600;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return projectListScrollElement().scrollTop;
    });
    assert.ok(blockedOffset > 320);
    await page.locator('#back-to-top').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => projectListScrollElement().scrollTop), blockedOffset, 'the modal intentionally blocks background activation');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !state.guideTourActive && !document.documentElement.classList.contains('guide-tour-open'));
    // Repeat real keyboard activation after scrolling again; a preceding animation
    // must not cancel the next return-to-top operation.
    for (let repetition = 0; repetition < 3; repetition++) {
      await page.evaluate(async () => {
        const row = projectListScrollElement();
        row.scrollTo({ top: Math.min(900, row.scrollHeight - row.clientHeight), behavior: 'instant' });
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const before = await page.evaluate(() => projectListScrollElement().scrollTop);
      assert.ok(before > 320, `${width}/${reducedMotion}: fixture must actually scroll`);
      const button = page.locator('#back-to-top');
      await button.waitFor({ state: 'visible' }); await button.focus();
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'back-to-top');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => backToTopScrollTargets().every(node => (node.scrollTop || 0) === 0) && window.scrollY === 0 && elements.backToTop.hidden, null, { timeout: 8000 });
      assert.equal(await page.evaluate(() => projectListScrollElement().scrollTop), 0);
    }
    // Also cover simultaneous document and nested offsets, not only a root at zero.
    await page.evaluate(async () => {
      document.body.style.minHeight = '4000px';
      projectListScrollElement().style.setProperty('max-height', '300px', 'important');
      projectListScrollElement().scrollTo({ top: 600, behavior: 'instant' });
      window.scrollTo({ top: 700, behavior: 'instant' });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    assert.ok(await page.evaluate(() => window.scrollY > 320));
    assert.ok(await page.evaluate(() => projectListScrollElement().scrollTop > 320));
    await page.locator('#back-to-top').focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => backToTopScrollTargets().every(node => (node.scrollTop || 0) === 0) && window.scrollY === 0 && elements.backToTop.hidden, null, { timeout: 8000 });
    await context.close();
  }
});
