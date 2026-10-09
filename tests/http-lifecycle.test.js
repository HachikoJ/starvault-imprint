const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const path = require('node:path');
const ROOT = process.env.STARVAULT_TEST_SOURCE_ROOT || path.resolve(__dirname, '..');
const { fetchWithRetries, fetchPinnedHttps } = require(path.join(ROOT, 'src/lib/http-client'));
async function upstream(t, handler) {
  const timers = new Set();
  const later = (callback, ms) => { const timer = setTimeout(callback, ms); timers.add(timer); return timer; };
  const server = http.createServer((req, res) => handler(req, res, later));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { for (const timer of timers) clearTimeout(timer); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  return `http://127.0.0.1:${server.address().port}`;
}
test('T-11 native fetch deadline includes headers and the complete body', async t => {
  const url = await upstream(t, (req, res, later) => {
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.write('{"value":');
    later(() => res.end('1}'), 750);
  });
  const started = performance.now();
  await assert.rejects(async () => { const response = await fetchWithRetries(url, {}, { timeoutMs: 250, retries: 0 }); await response.json(); }, /timed out|aborted/i);
  assert.ok(performance.now() - started < 550, 'deadline must not wait for the 750ms body');
});
test('T-11 continuous slow body is bounded by the total deadline', async t => {
  const url = await upstream(t, (req, res, later) => {
    res.writeHead(200); res.write('first');
    for (let i=1; i<=15; i++) later(() => i===15 ? res.end('last') : res.write('chunk'), i*50);
  });
  await assert.rejects(fetchWithRetries(url, {}, { timeoutMs: 250, retries: 0 }), /timed out|aborted/i);
});
test('T-11 response limit rejects overflow and successful buffered response remains consumable once', async t => {
  const url = await upstream(t, (req, res) => res.end(req.url === '/ok' ? '{"ok":true}' : 'x'.repeat(129)));
  await assert.rejects(fetchWithRetries(url, {}, { maxResponseBytes: 128, retries: 0 }), /too large/i);
  const response = await fetchWithRetries(url+'/ok', {}, { maxResponseBytes: 128, retries: 0 });
  assert.deepEqual(await response.json(), { ok: true });
  await assert.rejects(response.text());
});
test('T-11 pre-cancelled requests send no upstream request', async t => {
  let requests = 0;
  const url = await upstream(t, (req, res) => { requests++; res.end('{}'); });
  const controller = new AbortController(); controller.abort(new Error('caller cancelled'));
  await assert.rejects(fetchWithRetries(url, { signal: controller.signal }, { retries: 2 }), /caller cancelled/);
  assert.equal(requests, 0);
});
test('T-11 cancellation during Retry-After/backoff prevents a second request', async t => {
  let requests = 0; const controller = new AbortController();
  const url = await upstream(t, (req, res, later) => { requests++; res.writeHead(503); res.end('{}'); later(() => controller.abort(new Error('backoff cancelled')), 25); });
  await assert.rejects(fetchWithRetries(url, { signal: controller.signal }, { retries: 1, retryDelay: () => 250 }), /backoff cancelled/);
  assert.equal(requests, 1);
});
test('T-11 a POST with an unknown timeout result is not automatically retried', async t => {
  let requests=0;
  const url = await upstream(t, (req,res,later) => { requests++; res.writeHead(200); res.write('committed'); later(()=>res.end('end'),750); });
  await assert.rejects(fetchWithRetries(url, { method:'POST', body:'fixture' }, { timeoutMs:100, retries:2 }), /timed out|aborted/i);
  assert.equal(requests,1);
});

test('T-11 successful requests release caller cancellation listeners', async t => {
  const url = await upstream(t, (req,res) => res.end('{}'));
  const controller = new AbortController(); const active = new Set();
  const add = controller.signal.addEventListener.bind(controller.signal);
  const remove = controller.signal.removeEventListener.bind(controller.signal);
  controller.signal.addEventListener = (type, listener, options) => { if (type==='abort') active.add(listener); return add(type,listener,options); };
  controller.signal.removeEventListener = (type, listener, options) => { if (type==='abort') active.delete(listener); return remove(type,listener,options); };
  for (let i=0;i<3;i++) await (await fetchWithRetries(url, {signal:controller.signal}, {retries:0})).json();
  assert.equal(active.size,0);
});
test('T-11 pinned HTTPS continuous body also has a total deadline and keeps TLS verification', async t => {
  const https = require('node:https'); const dns = require('node:dns/promises'); const { EventEmitter } = require('node:events');
  const oldRequest=https.request, oldLookup=dns.lookup;
  const timers=[]; let destroyed=false;
  dns.lookup=async()=>[{ address:'203.0.113.71',family:4 }];
  https.request=(options, callback)=>{
    assert.equal(options.rejectUnauthorized,true);
    const req=new EventEmitter();req.write=()=>{};req.setTimeout=()=>{};
    req.destroy=error=>{destroyed=true;timers.forEach(clearTimeout);req.emit('error',error);req.emit('close');};
    req.end=()=>{const res=new EventEmitter();res.statusCode=200;res.headers={};callback(res);for(let i=1;i<=15;i++)timers.push(setTimeout(()=>i===15?res.emit('end'):res.emit('data',Buffer.from('chunk')),i*50));};
    return req;
  };
  t.after(()=>{https.request=oldRequest;dns.lookup=oldLookup;timers.forEach(clearTimeout);});
  await assert.rejects(fetchPinnedHttps('https://fixture-deadline.example/api', {}, { timeoutMs:250 }), /timed out|aborted/i);
  assert.equal(destroyed,true);
});

test('T-11 Trending reads use the same complete-body deadline', async t => {
  const { fetchTrendingRepositories, clearGithubCooldown } = require(path.join(ROOT, 'src/lib/github'));
  const original = global.fetch; let requests = 0; let cancelled = 0; let timer;
  clearGithubCooldown();
  global.fetch = async input => {
    assert.match(String(input), /^https:\/\/github\.com\/trending\?/); requests++;
    return new Response(new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode('<html>')); timer=setTimeout(()=>{controller.enqueue(new TextEncoder().encode('</html>'));controller.close();},4000); },
      cancel() { cancelled++;clearTimeout(timer); }
    }), {status:200});
  };
  t.after(()=>{global.fetch=original;clearTimeout(timer);clearGithubCooldown();});
  const started=performance.now();
  const result=await fetchTrendingRepositories({token:'fixture-trending-token',periods:['daily'],timeoutMs:3000});
  assert.equal(result.errors.length,1);assert.match(result.errors[0].message,/timed out/i);
  assert.ok(performance.now()-started<3800);assert.equal(requests,1);assert.equal(cancelled,1);
});
