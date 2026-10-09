const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const ROOT = process.env.STARVAULT_TEST_SOURCE_ROOT || path.resolve(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'starvault-t12-node-'));
Object.assign(process.env, { STORE_PATH: path.join(dir, 'fixture.db'), GITHUB_TOKEN: '', TAVILY_API_KEY: '', EXA_API_KEY: '',
  AUTH_TOKEN: '', ACCESS_TOKEN: '', PUBLIC_ORIGIN: '', TRUST_PROXY: '0', HOST: '127.0.0.1', RUN_SCAN_ON_BOOT: 'false', ALLOW_PRIVATE_PROVIDER_URLS: 'true' });
const { createStorage } = require(path.join(ROOT, 'src/lib/storage'));
const storage = createStorage(process.env.STORE_PATH);
const originalFetch = global.fetch;
const { server, initializeRuntime } = require(path.join(ROOT, 'src/server'));
const { clearGithubCooldown } = require(path.join(ROOT, 'src/lib/github'));

test('T-12 Node API binds distinct analysis requests and refuses unknown legacy replay', async t => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const calls = [];
  global.fetch = async (url, init = {}) => {
    if (String(url).startsWith('https://127.0.0.1:41991/')) {
      calls.push(JSON.parse(init.body)); await gate;
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ recommendation:'watch', riskLevel:'low', summary:'Owning plan fixture', risks:[], boundaries:[], inspirations:[], validations:[] }) } }] }), { status:200, headers:{'Content-Type':'application/json'} });
    }
    throw new Error(`Unexpected upstream request: ${url}`);
  };
  t.after(async () => { release();global.fetch=originalFetch;clearGithubCooldown();server.closeAllConnections();if(server.listening)await new Promise(resolve=>server.close(resolve)); });
  t.diagnostic(`Retained isolated SQLite fixture: ${dir}`);
  storage.saveObservationPlan({ id:'identity-a',name:'Identity A' });
  storage.saveObservationPlan({ id:'identity-b',name:'Identity B' });
  const project={fullName:'acme/identity',description:'Request-time description',stars:50,scores:{risk:12},category:{key:'tools'},useCase:{key:'personal'}};
  storage.upsertProjects([project],{observationPlanId:'identity-a'});
  storage.upsertProjects([project],{observationPlanId:'identity-b'});
  storage.updateSettings({ llmProviders:[{id:'deepseek',name:'Fixture',enabled:true,baseUrl:'https://127.0.0.1:41991/model',model:'fixture',apiKey:'fixture-t12-node-secret'}] });
  const legacy=storage.createTask({type:'analysis',key:'analysis:acme/identity',status:'running',attempts:1,input:{fullName:'acme/identity',userNeed:'Old unbound need'}});
  initializeRuntime();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=async (url,body)=>{
    const res=await originalFetch(base+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const json=await res.json();assert.ok(res.ok,JSON.stringify(json));return json;
  };
  await post('/api/observation-plans/active',{id:'identity-a'});
  const a=await post('/api/analyze',{fullName:'acme/identity',method:'technical',userNeed:' ship  tool '});
  const duplicate=await post('/api/analyze',{fullName:'acme/identity',method:'technical',userNeed:'ship\n tool'});
  assert.equal(duplicate.task.id,a.task.id);
  const need=await post('/api/analyze',{fullName:'acme/identity',method:'technical',userNeed:'learn tool'});
  const method=await post('/api/analyze',{fullName:'acme/identity',method:'commercial',userNeed:'ship tool'});
  assert.notEqual(need.task.id,a.task.id);assert.notEqual(method.task.id,a.task.id);
  const normalized=await post('/api/analyze',{fullName:' ACME/IDENTITY ',method:' technical ',userNeed:'ship tool'});
  assert.equal(normalized.task.id,a.task.id);
  await post('/api/observation-plans/active',{id:'identity-b'});
  const b=await post('/api/analyze',{fullName:'acme/identity',method:'technical',userNeed:'ship tool'});
  assert.notEqual(b.task.id,a.task.id);
  const tasks=[a,need,method,b].map(row=>storage.getTask(row.task.id));
  assert.deepEqual(tasks.map(row=>row.input.observationPlanId),['identity-a','identity-a','identity-a','identity-b']);
  assert.doesNotMatch(JSON.stringify(tasks.map(row=>row.input)),/fixture-t12-node-secret|apiKey|authorization/i);
  assert.equal(storage.getTask(legacy.id).status,'failed');assert.match(storage.getTask(legacy.id).error,/identity is unknown/);
  // Later project updates must not change the payload of a queued analysis.
  storage.upsertProjects([{...project,description:'Later description'}],{observationPlanId:'identity-b'});
  release();
  const deadline=Date.now()+5000;
  while(tasks.some(row=>['queued','running'].includes(storage.getTask(row.id).status))&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,25));
  for(const row of tasks)assert.equal(storage.getTask(row.id).status,'completed',storage.getTask(row.id).error);
  assert.equal(calls.length,4);assert.ok(calls.every(row=>JSON.stringify(row.messages).includes('Request-time description')));
  assert.ok(calls.some(row=>JSON.stringify(row.messages).includes('learn tool')));
  assert.ok(calls.some(row=>JSON.stringify(row.messages).includes('commercial')));
  assert.equal(storage.getObservationPlan().id,'identity-b');
  assert.ok(storage.getProject('acme/identity',{observationPlanId:'identity-a'}).analysis);
  assert.ok(storage.getProject('acme/identity',{observationPlanId:'identity-b'}).analysis);
  assert.equal(storage.getTask(legacy.id).input.observationPlanId,undefined);
});
