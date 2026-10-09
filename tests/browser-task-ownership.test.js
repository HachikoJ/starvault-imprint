const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');
const ROOT = process.env.STARVAULT_TEST_SOURCE_ROOT || path.resolve(__dirname, '..');
const result = { recommendation:'watch',riskLevel:'low',summary:'One owning task',risks:[],boundaries:[],inspirations:[],validations:[] };
const envelope = JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]});
async function fixture(t) {
  const model = []; const search = []; let holdSearch = false; let releaseSearch;
  const searchGate = new Promise(resolve=>{releaseSearch=resolve;});
  const server=http.createServer((req,res)=>{
    const name=new URL(req.url,'http://localhost').pathname.slice(1);
    if (!name) {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><script src="/domain-core.js"></script><script src="/indexeddb-storage.js"></script><script src="/local-api.js"></script>');return;}
    if (['domain-core.js','indexeddb-storage.js','local-api.js'].includes(name)) {res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});res.end(fs.readFileSync(path.join(ROOT,'public',name)));return;}
    if (name !== 'model/v1/chat/completions') {res.writeHead(404);res.end();return;}
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{model.push({payload:JSON.parse(body),res});res.writeHead(200,{'Content-Type':'application/json'});res.flushHeaders();});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'starvault-t06-browser-'));t.diagnostic(`Retained real browser fixture: ${profile}`);
  const executablePath=[process.env.PLAYWRIGHT_EXECUTABLE_PATH,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean).find(file=>fs.existsSync(file));
  const context=await chromium.launchPersistentContext(profile,{headless:true,...(executablePath?{executablePath}:{})});
  await context.addInitScript(()=>Object.defineProperty(navigator,'locks',{value:undefined,configurable:true}));
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin===origin)return route.continue();
    if(url.hostname!=='api.github.com')return route.abort('blockedbyclient');
    if(url.pathname==='/rate_limit')return route.fulfill({json:{resources:{core:{remaining:4990,reset:Math.floor(Date.now()/1000)+3600},search:{remaining:29,reset:Math.floor(Date.now()/1000)+3600}}}});
    if(url.pathname==='/search/repositories'){
      search.push(url.searchParams.get('q'));if(holdSearch&&search.length===1)await searchGate;
      return route.fulfill({json:{total_count:1,incomplete_results:false,items:[{id:123,full_name:'fixture/ownerprobe',name:'ownerprobe',owner:{login:'fixture'},description:'ownerprobe toolkit',stargazers_count:50,forks_count:5,watchers_count:50,language:'JavaScript',topics:['ownerprobe'],license:{spdx_id:'MIT'},created_at:'2025-01-01T00:00:00Z',pushed_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-01T00:00:00Z',html_url:'https://github.com/fixture/ownerprobe'}]}}).catch(()=>{});
    }
    throw new Error(`Unexpected fixture GitHub endpoint: ${url.pathname}`);
  });
  t.after(async()=>{releaseSearch();await context.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
  const page=async()=>{const p=await context.newPage();await p.goto(origin);await p.waitForFunction(()=>Boolean(window.StarVaultLocalApi));return p;};
  const a=await page();const b=await page();
  await a.evaluate(async baseUrl=>{
    await window.StarVaultLocalApi.handle('/api/settings',{method:'POST',body:JSON.stringify({validateProvider:false,llmProviders:[{id:'deepseek',baseUrl,model:'fixture',apiKey:'fixture-owner-key'}]})});
    await window.StarVaultIndexedDB.putProjects([{fullName:'fixture/owner',description:'Ownership fixture',category:{key:'tools'},useCase:{key:'personal'}}]);
  },origin+'/model');
  const post=(p,url,body)=>p.evaluate(({url,body})=>window.StarVaultLocalApi.handle(url,{method:'POST',body:JSON.stringify(body)}),{url,body});
  const task=(p,id)=>p.evaluate(id=>window.StarVaultLocalApi.handle('/api/tasks/'+id),id);
  const lease=(p,id)=>p.evaluate(id=>window.StarVaultIndexedDB.getTaskLease(id),id);
  const wait=async(predicate,ms=5000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,25));}throw new Error('Fixture wait expired');};
  return {a,b,page,post,task,lease,wait,model,search,hold:()=>{holdSearch=true;},releaseSearch};
}
test('T-06 real tabs without Web Locks reuse one owner, renew, and fence a late AI response', {timeout:25000},async t=>{
  const f=await fixture(t);
  assert.equal(await f.a.evaluate(()=>navigator.locks),undefined);
  const body={fullName:'fixture/owner',userNeed:'One effective request'};
  const [one,two]=await Promise.all([f.post(f.a,'/api/analyze',body),f.post(f.b,'/api/analyze',body)]);
  assert.equal(one.task.id,two.task.id);
  await f.wait(()=>f.model.length===1);
  const observer=await f.page();
  const before=await f.lease(observer,one.task.id);
  await Promise.all([f.task(f.a,one.task.id),f.task(observer,one.task.id)]);
  await new Promise(resolve=>setTimeout(resolve,10500));
  const renewed=await f.lease(observer,one.task.id);
  assert.equal(renewed.token,before.token);assert.ok(renewed.expiresAt>before.expiresAt+8000);
  assert.equal(f.model.length,1);
  // Simulate suspension past expiry while keeping the old network response live.
  await observer.evaluate(async id=>{
    const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('starvault-imprint',5);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    const tx=db.transaction('meta','readwrite');const done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
    const req=tx.objectStore('meta').get('taskLease:'+id);req.onsuccess=()=>tx.objectStore('meta').put({...req.result,value:{...req.result.value,expiresAt:Date.now()-1}});await done;db.close();
  },one.task.id);
  const unknown=await f.task(observer,one.task.id);assert.equal(unknown.task.status,'failed');assert.match(unknown.task.error,/outcome is unknown/);
  f.model[0].res.end(envelope);
  await new Promise(resolve=>setTimeout(resolve,250));
  assert.equal((await f.task(observer,one.task.id)).task.status,'failed');assert.equal(f.model.length,1);
  const saved=await observer.evaluate(()=>window.StarVaultIndexedDB.getSnapshot());
  assert.equal(saved.store.observationPlans.default.userData.analysis['fixture/owner'],undefined);
  assert.equal(saved.store.observationPlans.default.memory.stats.eventCounts.ai_analyze||0,0);
});
test('T-06 closing owners allows expired readonly scan recovery but never automatic paid replay', {timeout:65000},async t=>{
  const f=await fixture(t);
  const started=await f.post(f.a,'/api/analyze',{fullName:'fixture/owner',userNeed:'Unknown closing-owner result'});
  await f.wait(()=>f.model.length===1);
  const scanOwner=await f.page();
  await f.post(scanOwner,'/api/settings',{githubToken:'fixture-github-key',validateProvider:false});
  await f.post(scanOwner,'/api/observation-plans',{plan:{id:'ownerprobe',name:'Ownerprobe',searchLogic:{baseMode:'only',keywords:['ownerprobe'],customQueries:[{key:'ownerprobe-core',label:'Ownerprobe',query:'ownerprobe in:name'}]}}});
  await f.post(scanOwner,'/api/observation-plans/active',{id:'ownerprobe'});
  f.hold();const scan=await f.post(scanOwner,'/api/scan',{mode:'manual'});
  await f.wait(()=>f.search.length===1);
  const aLease=await f.lease(f.b,started.task.id),sLease=await f.lease(f.b,scan.task.id);
  await f.a.close();await scanOwner.close();
  const until=Math.max(aLease.expiresAt,sLease.expiresAt)+150;
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,until-Date.now())));
  const unknown=await f.task(f.b,started.task.id);assert.equal(unknown.task.status,'failed');assert.match(unknown.task.error,/outcome is unknown/);
  assert.equal(f.model.length,1);
  f.releaseSearch();
  const recovered=await f.task(f.b,scan.task.id);assert.equal(recovered.task.status,'running');
  await f.wait(async()=>['completed','failed'].includes((await f.task(f.b,scan.task.id)).task.status));
  const completed=await f.task(f.b,scan.task.id);assert.equal(completed.task.status,'completed',completed.task.error);
  assert.equal(f.search.length,2);assert.equal(f.model.length,1);
  const owned=await f.b.evaluate(()=>window.StarVaultIndexedDB.getProjectsByPlan('ownerprobe'));
  assert.deepEqual(owned.map(row=>row.fullName),['fixture/ownerprobe']);
  assert.equal((await f.lease(f.b,scan.task.id)).released,true);
  const unknownRaw=await f.b.evaluate(id=>window.StarVaultIndexedDB.getSnapshot().then(s=>s.store.tasks[id]),started.task.id);
  assert.equal(unknownRaw.recoveryRequired,true);assert.equal(unknownRaw.errorCode,'TASK_OUTCOME_UNKNOWN');
});
