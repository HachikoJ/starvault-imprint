const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

test("T-21 Node SQLite, API, bilingual exports and archived views preserve Watch provenance and legacy raw values", {timeout:20000}, t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"starvault-node-watchers-"));
  t.diagnostic(`Retained SQLite/HTTP fixture ${dir}`);
  const script=String.raw`
const assert=require("node:assert/strict"),path=require("node:path");
const root=process.env.STARVAULT_FIXTURE_ROOT,nativeFetch=global.fetch;
global.fetch=async input=>{throw new Error("Denied non-fixture request: "+input);};
const {normalizeRepo}=require(path.join(root,"src/lib/github"));
const {enrichRepository}=require(path.join(root,"src/lib/scoring"));
const {createStorage}=require(path.join(root,"src/lib/storage"));
const store=createStorage(process.env.STORE_PATH);
const examples=[0,7,undefined,null,"7",-1].map((value,i)=>enrichRepository(normalizeRepo({
 id:i+1,full_name:"fixture/watch-"+i,name:"watch-"+i,owner:{login:"fixture"},html_url:"https://github.com/fixture/watch-"+i,
 description:"Deployable dashboard toolkit for product teams",language:"TypeScript",topics:["dashboard"],stargazers_count:50,watchers_count:50,
 subscribers_count:value,forks_count:2,open_issues_count:0,created_at:"2020-01-01T00:00:00Z",pushed_at:new Date().toISOString(),license:{spdx_id:"MIT"}
},{}),null));
const legacy={...examples[0],fullName:"fixture/watch-legacy",name:"watch-legacy",watchers:50,scores:{...examples[0].scores,community:68}};
delete legacy.watchersSource;delete legacy.watchersStatus;
store.upsertProjects([...examples,legacy],{observationPlanId:"default"});
const seeded=store.load();seeded.leaderboards.daily["2020-01-01"]={date:"2020-01-01",period:"daily",items:[{...legacy,rank:1}]};store.save(seeded);
const preserved=()=>({projects:store.load().projects,archive:store.load().leaderboards.daily["2020-01-01"]});
const before=JSON.stringify(preserved());
for(const items of [store.listProjects({limit:"all"}).items,store.summary({}).top,store.buildLeaderboard("daily",{limit:20,persist:false}).items]) {
 assert.equal(items.find(row=>row.fullName==="fixture/watch-0").watchers,0);
 assert.equal(items.find(row=>row.fullName==="fixture/watch-1").watchers,7);
 const old=items.find(row=>row.fullName===legacy.fullName);assert.equal(old.watchers,null);assert.equal(old.watchersStatus,"legacy");assert.equal(old.scores.community,68);
}
assert.equal(store.getProject(legacy.fullName).watchers,null);
const old=store.buildLeaderboard("daily",{date:"2020-01-01",persist:false}).items[0];assert.equal(old.watchers,null);assert.equal(old.watchersStatus,"legacy");
assert.equal(JSON.stringify(preserved()),before,"read views do not migrate legacy fields, scores or archives");
const {server}=require(path.join(root,"src/server"));
function csvRows(text) {
 const rows=[];let row=[],field="",quoted=false;
 for(let i=0;i<text.length;i++) {
  const char=text[i];
  if(char==='"') {if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(char===','&&!quoted){row.push(field);field="";}
  else if(char==='\n'&&!quoted){row.push(field.replace(/\r$/,""));rows.push(row);row=[];field="";}
  else field+=char;
 }
 if(field||row.length){row.push(field);rows.push(row);}return rows;
}
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 try {
  const origin="http://127.0.0.1:"+server.address().port;
  const get=async route=>{const response=await nativeFetch(origin+route);assert.equal(response.status,200);return response;};
  const detail=await (await get("/api/project?fullName=fixture%2Fwatch-legacy")).json();assert.equal(detail.watchers,null);assert.equal(detail.watchersStatus,"legacy");
  for(const language of ["zh","en"]) {
   const payload=await (await get("/api/export?format=json&language="+language)).json();
   const rows=language==="zh"?payload.项目:payload.items,name=language==="zh"?"仓库全名":"fullName",count=language==="zh"?"Watch":"watchers",status=language==="zh"?"Watch状态":"watchersStatus",source=language==="zh"?"Watch来源":"watchersSource";
   const row=n=>rows.find(item=>item[name]==="fixture/watch-"+n);
   assert.equal(row(0)[count],0);assert.equal(row(1)[count],7);assert.equal(row(2)[count],"");assert.equal(row(2)[status],language==="zh"?"未知":"unknown");
   assert.equal(row("legacy")[count],"");assert.equal(row("legacy")[status],language==="zh"?"历史来源未知":"legacy");assert.equal(row(0)[source],"github-subscribers");
   const csv=(await (await get("/api/export?format=csv&language="+language)).text()).replace(/^\uFEFF/,"");
   const lines=csvRows(csv),header=lines.shift();
   for(const [n,value] of [[0,"0"],[1,"7"],[2,""],["legacy",""]])assert.equal(lines.find(line=>line[header.indexOf(name)]==="fixture/watch-"+n)[header.indexOf(count)],value);
  }
  const after=store.load();assert.equal(after.projects[legacy.fullName].watchers,50);assert.equal(after.projects[legacy.fullName].scores.community,68);assert.equal(after.leaderboards.daily["2020-01-01"].items[0].watchers,50);
  console.log("NODE_WATCH_API_ARCHIVE_OK");
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});`;
  const env={...process.env,STARVAULT_FIXTURE_ROOT:path.resolve(__dirname,".."),STORE_PATH:path.join(dir,"fixture.db"),HOST:"127.0.0.1",AUTH_TOKEN:"",ACCESS_TOKEN:"",PUBLIC_ORIGIN:"",TRUST_PROXY:"0",RUN_SCAN_ON_BOOT:"false",GITHUB_TOKEN:"",TAVILY_API_KEY:"",EXA_API_KEY:"",DEEPSEEK_API_KEY:""};
  delete env.NODE_OPTIONS;
  const child=spawnSync(process.execPath,["-e",script],{cwd:dir,env,encoding:"utf8",timeout:18000,maxBuffer:4*1024*1024});
  fs.writeFileSync(path.join(dir,"stdout.log"),child.stdout||"");fs.writeFileSync(path.join(dir,"stderr.log"),child.stderr||"");
  assert.equal(child.status,0,child.stderr||child.stdout||String(child.error));assert.match(child.stdout,/NODE_WATCH_API_ARCHIVE_OK/);
});
