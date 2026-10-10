const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const { IDBFactory, IDBKeyRange } = require("fake-indexeddb");

test("T-21 browser scan, views, bilingual exports and archive reads distinguish Watch facts without extra requests", async () => {
  const values = new Map(), indexedDB = new IDBFactory(), calls = [];
  const repositories = [0,7,undefined,null,"7",-1].map((value,index) => ({id:index+1, full_name:`fixture/watchfixture-${index}`,name:`watchfixture-${index}`,
    owner:{login:"fixture"},html_url:`https://github.com/fixture/watchfixture-${index}`,description:"watchfixture dashboard toolkit",stargazers_count:50,watchers_count:50,
    subscribers_count:value,forks_count:2,topics:[],license:{spdx_id:"MIT"},created_at:"2020-01-01T00:00:00Z",pushed_at:new Date().toISOString()}));
  const window = {indexedDB,IDBKeyRange,__STARVAULT_GITHUB_REQUEST_SPACING_MS__:0,
    localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)},
    location:{origin:"http://127.0.0.1:4173",hostname:"127.0.0.1",host:"127.0.0.1:4173"}};
  const context={window,globalThis:{IDBKeyRange},indexedDB,IDBKeyRange,location:window.location,fetch:async input=>{
    const url=new URL(String(input)); calls.push(url.href);
    assert.equal(url.origin,"https://api.github.com","no real requests allowed");
    let payload;
    if(url.pathname==="/rate_limit")payload={resources:{search:{remaining:30,reset:Date.now()/1000+60}}};
    else {assert.equal(url.pathname,"/search/repositories","no per-repository subscriber requests");payload={total_count:repositories.length,incomplete_results:false,items:repositories};}
    return {ok:true,status:200,headers:{get:()=>null},json:async()=>payload,text:async()=>JSON.stringify(payload)};
  },setTimeout,clearTimeout,AbortController,TextDecoder,Date,JSON,Map,Set,Promise,Error,Object,Array,String,Number,Boolean,URL,URLSearchParams,Math};
  for(const file of ["domain-core.js","indexeddb-storage.js","local-api.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../public",file),"utf8"),context);
    if(file==="domain-core.js")window.StarVaultDomainCore=context.globalThis.StarVaultDomainCore;
  }
  const api=window.StarVaultLocalApi,storage=window.StarVaultIndexedDB,plan="watch-fixture";
  await api.handle("/api/settings",{method:"POST",body:JSON.stringify({githubToken:"fixture-watch-token"})});
  await api.handle("/api/observation-plans",{method:"POST",body:JSON.stringify({plan:{id:plan,name:"Watch fixture",searchLogic:{baseMode:"only",keywords:["watchfixture"],customQueries:[{key:"watch",query:"watchfixture in:name"}]}}})});
  await api.handle("/api/observation-plans/active",{method:"POST",body:JSON.stringify({id:plan})});
  const {task}=await api.handle("/api/scan",{method:"POST",body:"{}"});
  let finished=false;
  for(let i=0;i<400;i++) {
    const row=(await api.handle(`/api/tasks/${task.id}`)).task;
    if(!["queued","running"].includes(row.status)){assert.equal(row.status,"completed",row.error);finished=true;break;}
    await new Promise(resolve=>setTimeout(resolve,5));
  }
  assert.equal(finished,true);
  for(let index=0;index<repositories.length;index++) {
    const saved=await storage.getProject(repositories[index].full_name);
    assert.equal(saved.watchers,index<2?[0,7][index]:null);
    assert.equal(saved.watchersStatus,index<2?"known":"unknown");
    assert.equal(saved.stars,50);
  }
  assert.ok(calls.some(url=>new URL(url).pathname==="/search/repositories"));
  const legacy={...(await storage.getProject(repositories[0].full_name)),fullName:"fixture/watchfixture-legacy",name:"watchfixture-legacy",watchers:50};
  delete legacy.watchersSource;delete legacy.watchersStatus;
  await storage.putProjects([legacy]);
  const snap=await storage.getSnapshot();
  const oldDate="2020-01-01";
  snap.store.leaderboards.byPlan[plan].daily[oldDate]={date:oldDate,period:"daily",observationPlan:{id:plan},items:[{...legacy,rank:1}]};
  await storage.putSnapshot(snap);
  const rawBefore=JSON.stringify((await storage.getSnapshot()).store);
  const views=[(await api.handle("/api/projects?limit=all")).items,(await api.handle("/api/summary")).top,(await api.handle("/api/leaderboard?period=daily&limit=20")).items];
  for(const items of views) {
    assert.equal(items.find(item=>item.fullName===repositories[0].full_name).watchers,0);
    assert.equal(items.find(item=>item.fullName===repositories[1].full_name).watchers,7);
    const old=items.find(item=>item.fullName===legacy.fullName);assert.equal(old.watchers,null);assert.equal(old.watchersStatus,"legacy");
  }
  const detail=await api.handle("/api/project?fullName="+encodeURIComponent(legacy.fullName));assert.equal(detail.watchers,null);assert.equal(detail.watchersSource,"legacy-unknown");
  const archive=await api.handle(`/api/leaderboard?period=daily&date=${oldDate}`);assert.equal(archive.items[0].watchers,null);assert.equal(archive.items[0].watchersStatus,"legacy");
  for(const lang of ["zh","en"]) {
    const exported=JSON.parse((await api.handle(`/api/export?format=json&language=${lang}`)).content);
    const rows=lang==="zh"?exported.项目:exported.items, name=lang==="zh"?"仓库全名":"fullName",count=lang==="zh"?"Watch":"watchers",status=lang==="zh"?"Watch状态":"watchersStatus";
    assert.equal(rows.find(row=>row[name]===repositories[0].full_name)[count],0);
    assert.equal(rows.find(row=>row[name]===repositories[1].full_name)[count],7);
    assert.equal(rows.find(row=>row[name]===repositories[2].full_name)[count],null);
    assert.equal(rows.find(row=>row[name]===legacy.fullName)[status],lang==="zh"?"历史来源未知":"legacy");
    const csv=(await api.handle(`/api/export?format=csv&language=${lang}`)).content.replace(/^\ufeff/,"");
    const lines=csv.trimEnd().split("\n"),header=lines.shift().split(",");
    for(const [fullName,expected] of [[repositories[0].full_name,"0"],[repositories[1].full_name,"7"],[repositories[2].full_name,""],[legacy.fullName,""]]) {
      const row=lines.find(line=>line.includes(fullName)).split(",");assert.equal(row[header.indexOf(count)],expected);
    }
    assert.doesNotMatch(csv,/fixture-watch-token/);
  }
  assert.equal(JSON.stringify((await storage.getSnapshot()).store),rawBefore,"all view/export/archive reads preserve raw legacy data and saved scores");
});
