const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const test = require('node:test');
const ROOT = path.resolve(process.env.STARVAULT_TEST_SOURCE_ROOT || path.join(__dirname, '..'));
const fixtureBase = path.resolve(process.env.STARVAULT_TEST_FIXTURE_PARENT || os.tmpdir());
const fixture = fs.mkdtempSync(path.join(fixtureBase, 'fixture-'));
process.chdir(fixture);
Object.assign(process.env, {
  STORE_PATH: path.join(fixture, 'queue.db'), GITHUB_TOKEN: 'fixture-t14-github-token', TAVILY_API_KEY: '', EXA_API_KEY: '',
  AUTH_TOKEN: '', ACCESS_TOKEN: '', PUBLIC_ORIGIN: '', TRUST_PROXY: '0', HOST: '127.0.0.1',
  RUN_SCAN_ON_BOOT: 'false', ALLOW_PRIVATE_PROVIDER_URLS: 'true'
});
const { createStorage } = require(path.join(ROOT, 'src/lib/storage'));
const domain = require(path.join(ROOT, 'public/domain-core'));
const storage = createStorage(process.env.STORE_PATH);
const originalFetch = global.fetch;
const { server, initializeRuntime } = require(path.join(ROOT, 'src/server'));
const { clearGithubCooldown, restoreGithubCooldown, activateGithubCooldown } = require(path.join(ROOT, 'src/lib/github'));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, timeout = 5000) {
  const end = Date.now() + timeout;
  while (!predicate() && Date.now() < end) await sleep(10);
  return predicate();
}
function completion() {
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({
    recommendation:'watch', riskLevel:'low', summary:'Queue fixture',
    risks:[], boundaries:[], inspirations:[], validations:[]
  })}}]}), {status:200, headers:{'Content-Type':'application/json'}});
}

test('T-14 real finally pump skips blocked scans, fills slots fairly, and preserves concurrency bounds', {timeout:30000}, async t => {
  const calls = [];
  const scanGates = new Map();
  const failures = new Set();
  const observations = [];
  const observe = () => {
    const running = storage.listTasks({status:'running',limit:120});
    observations.push({active:running.length,scans:running.filter(task=>task.type==='scan').length});
  };
  const sample = setInterval(observe,10);
  let releases = [];
  let cleaning = false;
  global.fetch = async (url, init = {}) => {
    if (new URL(String(url)).hostname === 'api.github.com') {
      const endpoint = new URL(String(url)).pathname;
      if (endpoint === '/user') return new Response(JSON.stringify({login:'fixture'}));
      if (endpoint === '/rate_limit') return new Response(JSON.stringify({resources:{core:{limit:5000,remaining:4990,reset:Math.floor(Date.now()/1000)+3600},search:{limit:30,remaining:29,reset:Math.floor(Date.now()/1000)+3600}}}));
      assert.equal(endpoint,'/search/repositories',`Unexpected GitHub endpoint: ${endpoint}`);
      const scans = storage.listTasks({type:'scan',status:'running',limit:120});
      assert.equal(scans.length,1,'Only one scan may occupy the scan slot, including before its runner microtask');
      const id=scans[0].id;
      if (!scanGates.has(id)) {
        let release; const promise = new Promise(resolve=>{release=resolve;});
        scanGates.set(id,{promise,release});
      }
      if (!cleaning) await scanGates.get(id).promise;
      return new Response(JSON.stringify({total_count:0,incomplete_results:false,items:[]}));
    }
    assert.ok(String(url).startsWith('https://127.0.0.1:41991/'), `Denied unexpected upstream: ${url}`);
    const payload = JSON.parse(init.body);
    const index = calls.length;
    calls.push(payload);observe();
    if (!cleaning) await new Promise(resolve => { releases[index] = resolve; });
    if (failures.has(index)) return new Response(JSON.stringify({error:{message:'Fixture provider unavailable'}}),{status:503});
    return completion();
  };
  t.after(async () => {
    cleaning = true;clearInterval(sample);
    clearGithubCooldown();
    scanGates.forEach(gate=>gate.release());
    releases.forEach(resolve => resolve?.());
    const settled = await until(()=>storage.listTasks({limit:120}).every(task=>!['queued','running'].includes(task.status)),15000);
    assert.equal(settled,true,'Fixture queue must settle while all upstream requests are still mocked');
    global.fetch = originalFetch;
    server.closeAllConnections();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  });
  t.diagnostic(`Source: ${ROOT}`);
  t.diagnostic(`Retained fixture: ${fixture}`);
  const provider = {id:'deepseek', name:'Fixture', enabled:true, baseUrl:'https://127.0.0.1:41991/model', model:'fixture', apiKey:'fixture-t14-not-real'};
  storage.saveObservationPlan({id:'queue-plan', name:'Queue plan',searchLogic:{baseMode:'only',keywords:['queueprobe'],minStars:0,customQueries:[{key:'queueprobe',query:'queueprobe in:name'}]}});
  storage.setActiveObservationPlan('queue-plan');
  const project = {fullName:'acme/queue', description:'Isolated queue verification', stars:50, scores:{risk:12}, category:{key:'tools'},useCase:{key:'personal'}};
  storage.upsertProjects([project], {observationPlanId:'queue-plan'});
  storage.updateSettings({llmProviders:[provider],providerCatalog:{updatedAt:new Date().toISOString(),endpoints:[{baseUrl:provider.baseUrl,protocol:'openai-compatible'}]}});
  initializeRuntime();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const submit = async need => {
    const res = await originalFetch(base+'/api/analyze', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName:project.fullName,userNeed:need})});
    const json = await res.json();
    assert.equal(res.status, 202, JSON.stringify(json));
    return json.task;
  };
  const first = await submit('first occupied slot');
  const second = await submit('second occupied slot');
  assert.equal(await until(() => calls.length === 2), true, 'Both real provider runners must occupy the two worker slots');
  assert.equal(storage.getTask(first.id).status, 'running');
  assert.equal(storage.getTask(second.id).status, 'running');
  const input = domain.createAnalysisTaskInput({fullName:project.fullName,userNeed:'older queued analysis'}, 'queue-plan', storage.getProject(project.fullName), provider, 'zh');
  const older = storage.createTask({id:'t14-older-analysis', type:'analysis',key:domain.analysisTaskKey(input),input,createdAt:'2026-01-01T00:00:00.000Z'});
  await sleep(15);
  const scanA = storage.createTask({id:'t14-cooling-scan-a', type:'scan',key:'scan:queue-a',input:{observationPlanId:'queue-plan',trendCount:0,trendingCount:0},createdAt:'2026-01-02T00:00:00.000Z'});
  await sleep(15);
  const scanB = storage.createTask({id:'t14-cooling-scan-b', type:'scan',key:'scan:queue-b',input:{observationPlanId:'queue-plan',trendCount:0,trendingCount:0},createdAt:'2026-01-03T00:00:00.000Z'});
  const cooldown = {active:true,until:new Date(Date.now()+60_000).toISOString(),reason:'secondary',message:'Fixture cooldown'};
  storage.setRuntimeState('githubCooldown', cooldown);
  restoreGithubCooldown(cooldown);
  releases[0]();
  assert.equal(await until(() => storage.getTask(first.id).status === 'completed'), true, 'First runner must complete, invoking its real finally/pump');
  const advanced = await until(() => storage.getTask(older.id).status === 'running', 1500);
  const snapshot = {first:storage.getTask(first.id),second:storage.getTask(second.id),older:storage.getTask(older.id),scans:[storage.getTask(scanA.id),storage.getTask(scanB.id)],providerCalls:calls.length};
  fs.writeFileSync(path.join(fixture, 'observed.json'), JSON.stringify(snapshot,null,2)+'\n');
  assert.equal(advanced,true,`Free slot must run older analysis despite newer cooling scans; observed older=${snapshot.older.status}, providerCalls=${calls.length}`);
  assert.equal(calls.length,3);
  for (const scan of snapshot.scans) {assert.equal(scan.status,'queued');assert.equal(scan.attempts,0);}
  assert.equal(snapshot.second.status,'running');
  // Newly submitted work joins FIFO; failures return their slot just as success does.
  const newerOne = await submit('newer FIFO one');
  const newerTwo = await submit('newer FIFO two');
  assert.equal(storage.getTask(newerOne.id).status,'queued');
  failures.add(1);releases[1]();
  assert.equal(await until(()=>storage.getTask(second.id).status==='failed' && calls.length===4),true);
  assert.equal(storage.getTask(newerOne.id).status,'running');
  assert.equal(storage.getTask(newerTwo.id).status,'queued');
  const newest = await submit('newest cannot overtake existing work');
  releases[2]();
  assert.equal(await until(()=>calls.length===5),true);
  assert.equal(storage.getTask(newerTwo.id).status,'running');
  assert.equal(storage.getTask(newest.id).status,'queued');
  releases[3]();
  assert.equal(await until(()=>calls.length===6),true);
  assert.equal(storage.getTask(newest.id).status,'running');
  releases[4]();releases[5]();
  assert.equal(await until(()=>storage.listTasks({type:'analysis',status:'running',limit:120}).length===0),true);
  // The real breaker expiry timer resumes scans. One scan is reserved before
  // its async body runs; another queued scan cannot prevent an analysis filling slot two.
  clearGithubCooldown();activateGithubCooldown({delayMs:1000,reason:'secondary',message:'Fixture short cooldown'});
  assert.equal(await until(()=>scanGates.has(scanA.id)),true,'Cooldown expiry must invoke the real pump');
  assert.equal(storage.getTask(scanA.id).status,'running');
  assert.equal(storage.getTask(scanB.id).status,'queued');assert.equal(storage.getTask(scanB.id).attempts,0);
  const duringScan = await submit('analysis while older scan is busy');
  assert.equal(await until(()=>calls.length===7),true);
  assert.equal(storage.getTask(duringScan.id).status,'running');
  assert.equal(storage.getTask(scanB.id).status,'queued');assert.equal(storage.getTask(scanB.id).attempts,0);
  releases[6]();
  assert.equal(await until(()=>storage.getTask(duringScan.id).status==='completed'),true);
  scanGates.get(scanA.id).release();
  // Keep the production pacer (2.2s for search, 350ms for core requests);
  // allow scan A to finish and scan B to pass its own validation and rate checks.
  assert.equal(await until(()=>scanGates.has(scanB.id),12000),true);
  assert.equal(storage.getTask(scanA.id).status,'completed');
  scanGates.get(scanB.id).release();
  assert.equal(await until(()=>storage.getTask(scanB.id).status==='completed'),true);
  for (const task of [scanA,scanB]) assert.equal(storage.getTask(task.id).attempts,1);
  observe();
  assert.ok(observations.every(row=>row.active<=2 && row.scans<=1),JSON.stringify(observations));
  assert.equal(storage.listTasks({status:'queued',limit:120}).length,0);
  assert.equal(storage.listTasks({status:'running',limit:120}).length,0);
  fs.writeFileSync(path.join(fixture,'accepted.json'),JSON.stringify({observations,tasks:storage.listTasks({limit:120}),providerCalls:calls.length},null,2));
});
