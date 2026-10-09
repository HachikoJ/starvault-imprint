const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const test=require('node:test');
const ROOT=process.env.STARVAULT_TEST_SOURCE_ROOT||path.resolve(__dirname,'..');
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'starvault-analysis-validation-'));
process.chdir(fixture);
Object.assign(process.env,{STORE_PATH:path.join(fixture,'fixture.db'),GITHUB_TOKEN:'',TAVILY_API_KEY:'',EXA_API_KEY:'',AUTH_TOKEN:'',ACCESS_TOKEN:'',PUBLIC_ORIGIN:'',TRUST_PROXY:'0',HOST:'127.0.0.1',RUN_SCAN_ON_BOOT:'false',ALLOW_PRIVATE_PROVIDER_URLS:'true'});
const {createStorage}=require(path.join(ROOT,'src/lib/storage'));
const storage=createStorage(process.env.STORE_PATH);
const originalFetch=global.fetch;
const {server,initializeRuntime}=require(path.join(ROOT,'src/server'));

test('T-07 Node API rejects invalid deliveries before saved analysis, runCount, learning or provider success',async t=>{
  t.diagnostic(`Retained isolated SQLite: ${fixture}`);
  const valid={summary:'A local maintainer workflow.',recommendation:'watch',riskLevel:'medium',risks:[],boundaries:[],inspirations:[],validations:[]};
  const invalid=['','{}','Service overloaded, try again later','{"summary":"Truncated"',
    JSON.stringify({...valid,riskLevel:'safe'}),JSON.stringify({...valid,boundaries:'bad type'}),
    {choices:[{message:{refusal:'Refused',content:JSON.stringify(valid)}}]}];
  let current;let calls=0;
  global.fetch=async url=>{
    assert.ok(String(url).startsWith('https://127.0.0.1:41992/'),'Unexpected upstream blocked');calls++;
    return new Response(JSON.stringify(typeof current==='object'?current:{choices:[{message:{content:current},finish_reason:'length'}]}),{status:200});
  };
  t.after(async()=>{assert.equal(storage.listTasks({status:'running',limit:120}).length,0);global.fetch=originalFetch;server.closeAllConnections();if(server.listening)await new Promise(resolve=>server.close(resolve));});
  storage.upsertProjects([{fullName:'acme/validation',description:'Fixture',scores:{risk:0}}],{observationPlanId:'default'});
  storage.setAnalysis('acme/validation',valid,{raw:'old fixture',observationPlanId:'default'});
  storage.updateSettings({llmProviders:[{id:'deepseek',name:'Fixture',enabled:true,baseUrl:'https://127.0.0.1:41992/model',model:'fixture',apiKey:'fixture-t07-key',testStatus:'fixture-before'}]});
  const old=storage.getProject('acme/validation').analysis;
  const events=()=>storage.getMemory().events.filter(e=>e.type==='ai_analyze').length;
  const before=events();
  initializeRuntime();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const submit=async need=>{
    const res=await originalFetch(`http://127.0.0.1:${server.address().port}/api/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName:'acme/validation',userNeed:need})});
    const body=await res.json();assert.equal(res.status,202,JSON.stringify(body));
    const end=Date.now()+5000;let task;
    do{task=storage.getTask(body.task.id);if(!['queued','running'].includes(task.status))return task;await new Promise(resolve=>setTimeout(resolve,10));}while(Date.now()<end);
    throw new Error(`Fixture task did not finish: ${JSON.stringify(task)}`);
  };
  for(let index=0;index<invalid.length;index++){
    current=invalid[index];const task=await submit('invalid '+index);
    assert.equal(task.status,'failed',JSON.stringify(task));assert.match(task.error,/AI analysis is invalid/);
    assert.deepEqual(storage.getProject('acme/validation').analysis,old);
    assert.equal(events(),before);assert.equal(storage.getSettings(true).llmProviders[0].testStatus,'fixture-before');
  }
  current=JSON.stringify({...valid,summary:'有效的本地维护工作流。'});
  const task=await submit('valid fixture');assert.equal(task.status,'completed',task.error);
  const after=storage.getProject('acme/validation').analysis;
  assert.equal(after.result.summary,'有效的本地维护工作流。');assert.equal(after.runCount,old.runCount+1);
  assert.equal(events(),before+1);assert.equal(storage.getSettings(true).llmProviders[0].testStatus,'ok');
  assert.equal(calls,invalid.length+1);
});
