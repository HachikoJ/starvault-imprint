const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');

test('T-11 real browser aborts stalled AI, releases task execution, and sends distinct output budgets', { timeout: 75000 }, async t => {
  const requests = []; let phase = 'cancel'; let aborts = 0;
  const scripts = new Set(['domain-core.js','indexeddb-storage.js','local-api.js']);
  const server = http.createServer((req,res) => {
    const name = new URL(req.url, 'http://localhost').pathname.slice(1);
    if (!name) { res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8' });res.end('<!doctype html><script src="/domain-core.js"></script><script src="/indexeddb-storage.js"></script><script src="/local-api.js"></script>');return; }
    if (scripts.has(name)) { res.writeHead(200, { 'Content-Type':'text/javascript; charset=utf-8' });res.end(fs.readFileSync(path.join(ROOT,'public',name)));return; }
    if (name !== 'model/v1/chat/completions') { res.writeHead(404);res.end();return; }
    let body='';req.on('data', chunk=>body+=chunk);req.on('end',()=>{
      const payload=JSON.parse(body);requests.push({ phase, ...payload });
      res.writeHead(200, { 'Content-Type':'application/json' });
      if (phase==='cancel' || phase==='timeout') { res.write('{"choices":[');res.on('close',()=>aborts++);return; }
      const result = phase==='plan' ? {} : { recommendation:'watch',riskLevel:'low',summary:'Fixture analysis',risks:[],boundaries:[],inspirations:['Inspect the fixture'],validations:['Run the fixture'] };
      res.end(JSON.stringify({ choices:[{message:{content:JSON.stringify(result)}}] }));
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let context;t.after(async()=>{await context?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
  const origin=`http://127.0.0.1:${server.address().port}`;
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'starvault-t11-browser-'));t.diagnostic(`Retained browser fixture: ${profile}`);
  const executablePath=[process.env.PLAYWRIGHT_EXECUTABLE_PATH,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean).find(file=>fs.existsSync(file));
  context=await chromium.launchPersistentContext(profile,{headless:true,...(executablePath?{executablePath}:{})});
  await context.route('**/*', route=>new URL(route.request().url()).origin===origin?route.continue():route.abort('blockedbyclient'));
  const page=context.pages()[0]||await context.newPage();
  page.on('pageerror',error=>t.diagnostic(`Fixture page error: ${error.message}`));
  page.on('requestfailed',request=>t.diagnostic(`Fixture request failed: ${request.url()} ${request.failure()?.errorText}`));
  await page.goto(origin);
  await page.waitForFunction(()=>Boolean(window.StarVaultLocalApi),null,{timeout:5000});
  async function waitTask(id, status, timeout) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const response = await page.evaluate(id => window.StarVaultLocalApi.handle('/api/tasks/'+id), id);
      if (response.task.status === status) return response;
      if (['failed','completed'].includes(response.task.status)) throw new Error(`Unexpected terminal task: ${JSON.stringify(response.task)}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Fixture task ${id} did not reach ${status}`);
  }
  await page.evaluate(async baseUrl=>{
    await window.StarVaultLocalApi.handle('/api/settings',{method:'POST',body:JSON.stringify({validateProvider:false,llmProviders:[{id:'deepseek',enabled:true,baseUrl,apiKey:'fixture-t11-key',model:'fixture'}]})});
    await window.StarVaultIndexedDB.putProjects([{fullName:'fixture/deadline',description:'Fixture repo',stars:25,observationPlanMatches:{default:{planId:'default'}}}]);
  },origin+'/model');
  const cancellation=await page.evaluate(async()=>{
    const controller=new AbortController();setTimeout(()=>controller.abort(Object.assign(new Error('Fixture cancelled'),{name:'AbortError'})),150);
    try { await window.StarVaultLocalApi.handle('/api/provider-test',{method:'POST',body:'{}',signal:controller.signal});return {ok:true}; }
    catch(error){return {ok:false,name:error.name,message:error.message};}
  });
  assert.equal(cancellation.ok,false);assert.equal(cancellation.name,'AbortError');assert.doesNotMatch(cancellation.message,/CORS/);
  phase='timeout';
  const started=await page.evaluate(()=>window.StarVaultLocalApi.handle('/api/analyze',{method:'POST',body:JSON.stringify({fullName:'fixture/deadline',method:'balanced'})}));
  const failed=await waitTask(started.task.id,'failed',52000);
  assert.match(failed.task.error,/timed out/i);assert.doesNotMatch(failed.task.error,/CORS/);
  assert.equal(requests.filter(row=>row.phase==='timeout').length,1);
  assert.ok(aborts>=2,'cancel and total deadline must close the stalled streams');
  const read=await page.evaluate(()=>window.StarVaultIndexedDB.getSnapshot());
  assert.equal(Object.keys(read.store.observationPlans.default.userData.analysis||{}).length,0);
  phase='success';
  const next=await page.evaluate(()=>window.StarVaultLocalApi.handle('/api/analyze',{method:'POST',body:JSON.stringify({fullName:'fixture/deadline',method:'balanced'})}));
  await waitTask(next.task.id,'completed',5000);
  phase='plan';
  const plan=await page.evaluate(()=>window.StarVaultLocalApi.handle('/api/observation-plans/generate',{method:'POST',body:JSON.stringify({name:'Fixture Plan',idea:'Track fixture telemetry tools'})}));
  await waitTask(plan.task.id,'failed',5000);
  assert.equal(requests.find(row=>row.phase==='cancel').max_tokens,700);
  assert.equal(requests.find(row=>row.phase==='timeout').max_tokens,2000);
  assert.ok(requests.some(row=>row.phase==='plan'));
  assert.ok(requests.filter(row=>row.phase==='plan').every(row=>row.max_tokens===16000));
  fs.writeFileSync(path.join(profile,'requests.json'),JSON.stringify(requests,null,2));
});
