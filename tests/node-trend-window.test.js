const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const STORAGE_HTTP_FIXTURE = String.raw`
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = process.env.STARVAULT_FIXTURE_ROOT;
const fixed = Date.parse("2026-10-09T00:30:00.000Z");
const RealDate = Date;
global.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
const nativeFetch = global.fetch;
global.fetch = async input => { throw new Error("Denied non-fixture network request: " + input); };
const { createStorage } = require(path.join(root, "src/lib/storage"));
const store = createStorage(process.env.STORE_PATH);
const make = (name, trend, snapshots) => ({ fullName: "fixture/" + name, name, owner:"fixture",
  description:"A deployable dashboard toolkit for product teams", topics:["dashboard"], language:"TypeScript",
  url:"https://github.com/fixture/"+name, stars:150, forks:15, openIssues:1, createdAt:"2020-01-01T00:00:00Z", pushedAt:new Date().toISOString(),
  scores:{ opportunity:80, productization:80, actionability:80, momentum:50, overallRisk:10, risk:10 }, trend, snapshots });
const now = "2026-10-09T00:30:00.000Z";
const atMonth = "2026-09-09T00:30:00.000Z";
const point = (at, stars, forks) => ({ at, stars, forks });
const examples = [
  make("month", { source:"github-browser-snapshots", stars:50, forks:5, intervalStart:atMonth, intervalEnd:now, complete:true, cached:true }, [point(atMonth,100,10),point(now,150,15)]),
  make("negative", { source:"github-browser-snapshots", stars:-5, forks:0, intervalStart:"2026-10-09T00:00:00Z", intervalEnd:now, complete:true, cached:true }, [point(now,150,15), point("2026-10-08T20:00:00-04:00",155,15)]),
  make("legacy-unknown", { source:"github-browser-snapshots", stars:99999, forks:99999, date:"2026-10-09", complete:true, cached:true }, [point(now,150,15)]),
  make("legacy-node", { source:"github-online", period:"previous-day-online", method:"graphql-star-v1", stars:0, forks:1, date:"2026-10-08", complete:true, cached:true }, [point("2026-10-08T23:00:00Z",150,15),point(now,150,15)]),
  make("partial", { source:"github-online", period:"previous-day-online", method:"graphql-star-v1", stars:2, forks:8, date:"2026-10-08", starsComplete:false, forksComplete:true, complete:false, cached:true }, []),
  make("error", { source:"github-online", period:"previous-day-online", stars:null, forks:null, date:"2026-10-08", complete:false, cached:true, error:"fixture upstream failure" }, [])
];
// Seed through the actual storage, then set the deliberately controlled history
// through its explicit fixture save API. No application migration is involved.
store.upsertProjects(examples, { observationPlanId:"default" });
const raw = store.load();
for (const example of examples) raw.projects[example.fullName].snapshots = example.snapshots;
raw.leaderboards.daily["2020-01-01"] = { period:"daily", date:"2020-01-01", generatedAt:"2020-01-01T00:00:00Z", items:[{ fullName:"fixture/month", rank:1, leaderboardScore:88, scoreParts:{ starDelta:50 } }] };
store.save(raw);
const legacyArchive = JSON.stringify(store.load().leaderboards.daily["2020-01-01"]);
const beforeProjects = JSON.stringify(store.load().projects);
const daily = store.buildLeaderboard("daily", { limit:20, persist:true });
const monthly = store.buildLeaderboard("monthly", { limit:20, persist:false });
const dailyMonth = daily.items.find(item => item.fullName === "fixture/month");
const monthlyMonth = monthly.items.find(item => item.fullName === "fixture/month");
assert.equal(dailyMonth.scoreParts.starDelta, null, "a 30-day observation is not a daily bonus");
assert.equal(dailyMonth.scoreParts.forkDelta, null);
assert.equal(dailyMonth.scoreParts.growthWindow.windowKnown, false);
assert.equal(monthlyMonth.scoreParts.starDelta, 50);
assert.equal(monthlyMonth.scoreParts.forkDelta, 5);
assert.equal(monthlyMonth.scoreParts.growthWindow.intervalStart, atMonth);
assert.equal(monthlyMonth.scoreParts.growthWindow.intervalEnd, now);
assert.equal(monthlyMonth.scoreParts.growthWindow.periodCoverage, "observed-interval");
assert.ok(monthlyMonth.leaderboardScore > dailyMonth.leaderboardScore);
const negative = daily.items.find(item => item.fullName === "fixture/negative");
assert.equal(negative.scoreParts.starDelta, -5, "raw observed declines remain visible");
assert.equal(negative.scoreParts.forkDelta, 0, "measured zero differs from unknown");
assert.equal(negative.scoreParts.growthWindow.durationMs, 1800000);
const zero = daily.items.find(item => item.fullName === "fixture/legacy-node");
assert.equal(zero.scoreParts.starDelta, 0);
assert.equal(negative.leaderboardScore, zero.leaderboardScore, "negative growth creates no reward or NaN penalty");
assert.equal(JSON.stringify(store.load().projects), beforeProjects, "reading/scoring does not rewrite historical project records");
const reader = createStorage(process.env.STORE_PATH);
const archive = reader.buildLeaderboard("daily", { date:"2026-10-09", limit:20, persist:false });
assert.deepEqual(archive.items.find(item => item.fullName === "fixture/negative").scoreParts, negative.scoreParts, "SQLite archive preserves the measured window and raw deltas");
reader.buildLeaderboard("daily", { date:"2020-01-01", persist:false });
assert.equal(JSON.stringify(reader.load().leaderboards.daily["2020-01-01"]), legacyArchive, "existing archives are retained without inventing windows");
for (const [field, knownNegative] of [["trendStars","fixture/negative"],["trendForks","fixture/negative"]]) {
  const sorted = reader.listProjects({ sort:field, limit:"all" }).items.map(item => item.fullName);
  assert.ok(sorted.indexOf(knownNegative) < sorted.indexOf("fixture/legacy-unknown"), "unknown values sort after known negatives and zeroes: " + sorted);
}
function parseCsv(text) {
  return text.replace(/^\uFEFF/, "").trimEnd().split("\n").map(line => {
    const fields=[]; let current="", quoted=false;
    for (let i=0;i<line.length;i++) {
      if(line[i] === '"') { if(quoted && line[i+1] === '"') {current+='"';i++;} else quoted=!quoted; }
      else if(line[i]===','&&!quoted){fields.push(current);current="";} else current+=line[i];
    }
    fields.push(current);return fields;
  });
}
(async () => {
  const { server } = require(path.join(root,"src/server"));
  await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
  try {
    const base = "http://127.0.0.1:" + server.address().port;
    const exported = {};
    for (const language of ["en","zh"]) {
      const response = await nativeFetch(base + "/api/export?format=json&language="+language);
      assert.equal(response.status,200);
      const payload = await response.json();
      const items = language === "zh" ? payload["项目"] : payload.items;
      const names = language === "zh" ? {name:"仓库全名", stars:"趋势 Stars", forks:"趋势 Forks", source:"趋势来源", kind:"趋势种类", start:"趋势区间开始", end:"趋势区间结束", duration:"趋势区间毫秒", status:"趋势状态"}
        : {name:"fullName",stars:"trendStars",forks:"trendForks",source:"trendSource",kind:"trendKind",start:"trendIntervalStart",end:"trendIntervalEnd",duration:"trendDurationMs",status:"trendStatus"};
      const byName = Object.fromEntries(items.map(item=>[item[names.name],item]));
      const unknown = byName["fixture/legacy-unknown"];
      assert.equal(unknown[names.stars], "");
      assert.equal(unknown[names.forks], "");
      assert.equal(unknown[names.start], "");
      assert.equal(unknown[names.duration], "");
      assert.match(unknown[names.status], /未知|unknown/);
      const month = byName["fixture/month"];
      assert.equal(month[names.stars],50);
      assert.equal(month[names.start],atMonth);
      assert.equal(month[names.end],now);
      assert.equal(month[names.duration],30*86400000);
      assert.equal(month[names.source],"github-browser-snapshots");
      assert.equal(month[names.kind],language === "zh" ? "观测区间净变化" : "snapshot-net-change");
      assert.equal(byName["fixture/negative"][names.stars],-5);
      const node = byName["fixture/legacy-node"];
      assert.equal(node[names.stars],0);
      assert.equal(node[names.start],"2026-10-08T00:00:00.000Z");
      assert.equal(node[names.end],"2026-10-09T00:00:00.000Z");
      assert.equal(node[names.kind],language === "zh" ? "UTC 自然日新增事件" : "utc-day-events");
      assert.match(byName["fixture/partial"][names.status],/部分|partial/);
      assert.equal(byName["fixture/partial"][names.stars],"");
      assert.equal(byName["fixture/partial"][names.forks],8);
      assert.match(byName["fixture/error"][names.status],/失败|failed/);
      const csvResponse = await nativeFetch(base + "/api/export?format=csv&language="+language);
      assert.equal(csvResponse.status,200);
      const rows = parseCsv(await csvResponse.text());
      const headers = rows.shift();
      for (const item of items) {
        const row = rows.find(values=>values[headers.indexOf(names.name)]===item[names.name]);
        assert.ok(row);
        for(const key of Object.values(names)) assert.equal(row[headers.indexOf(key)],String(item[key]), "CSV/JSON metadata parity: " + key);
      }
      exported[language]=items;
    }
    fs.writeFileSync(path.join(process.cwd(),"result.json"),JSON.stringify({daily,monthly,archive,exported},null,2));
    console.log("NODE_TREND_STORAGE_HTTP_OK " + JSON.stringify({ daily:daily.items.length, exported:Object.keys(exported) }));
  } finally { await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
`;

test("T-09 Node SQLite archives, trend sorting and HTTP Chinese/English CSV/JSON preserve real windows", { timeout: 20000 }, t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-node-trend-window-"));
  t.diagnostic(`retained fixture=${dir}`);
  const env = { ...process.env, STARVAULT_FIXTURE_ROOT:ROOT, STORE_PATH:path.join(dir,"fixture.db"), HOST:"127.0.0.1",
    AUTH_TOKEN:"", ACCESS_TOKEN:"", PUBLIC_ORIGIN:"", TRUST_PROXY:"0", RUN_SCAN_ON_BOOT:"false", GITHUB_TOKEN:"", TAVILY_API_KEY:"", EXA_API_KEY:"", DEEPSEEK_API_KEY:"" };
  delete env.NODE_OPTIONS;
  const child = spawnSync(process.execPath,["-e",STORAGE_HTTP_FIXTURE],{cwd:dir,env,encoding:"utf8",timeout:18000,maxBuffer:4*1024*1024});
  fs.writeFileSync(path.join(dir,"stdout.log"),child.stdout||"");
  fs.writeFileSync(path.join(dir,"stderr.log"),child.stderr||"");
  assert.equal(child.status,0,child.stderr||child.stdout||String(child.error));
  assert.match(child.stdout,/NODE_TREND_STORAGE_HTTP_OK/);
  t.diagnostic(child.stdout.trim());
});

test("T-09 actual GitHub UTC event counts retain left-closed/right-open boundaries and partial/error state", { timeout:15000 }, async t => {
  const { repositoryOnlineTrends, clearGithubCooldown } = require("../src/lib/github");
  const nativeFetch = global.fetch;
  t.after(()=>{global.fetch=nativeFetch;clearGithubCooldown();});
  const start="2026-10-08T00:00:00.000Z", end="2026-10-09T00:00:00.000Z";
  const requests=[];
  global.fetch=async(input,init={})=>{
    const url=new URL(String(input));
    assert.equal(url.origin,"https://api.github.com","no fixture request escapes to a real service");
    requests.push({path:url.pathname,method:init.method||"GET"});
    let body;
    if(url.pathname==="/graphql"){
      assert.equal(init.method,"POST");
      const repo=JSON.parse(init.body).variables.repo;
      if(repo==="error") return new Response(JSON.stringify({message:"fixture missing repo"}),{status:404});
      body={data:{repository:{stargazers:{pageInfo:{hasNextPage:repo==="partial",endCursor:"fixture-cursor"},edges:[{starredAt:end},{starredAt:"2026-10-08T23:59:59.999Z"},{starredAt:start},...(repo==="partial"?[]:[{starredAt:"2026-10-07T23:59:59.999Z"}])]}}}};
    }else if(/^\/repos\/fixture\/(complete|partial)\/forks$/.test(url.pathname)){
      body=[{created_at:end},{created_at:"2026-10-08T23:59:59.999Z"},{created_at:start},{created_at:"2026-10-07T23:59:59.999Z"}];
    }else if(url.pathname==="/repos/fixture/error/stargazers") return new Response(JSON.stringify({message:"fixture missing repo"}),{status:404});
    else throw new Error("Unexpected fixture route: "+url.pathname);
    return new Response(JSON.stringify(body),{status:200,headers:{"Content-Type":"application/json"}});
  };
  const result=await repositoryOnlineTrends("fixture-token",["fixture/complete","fixture/partial","fixture/error"],{reference:new Date("2026-10-09T20:30:00+08:00"),maxPages:1,concurrency:1,limit:3});
  const complete=result.items["fixture/complete"];
  assert.equal(complete.stars,2);
  assert.equal(complete.forks,2);
  assert.equal(complete.complete,true);
  assert.equal(complete.intervalStart,start);
  assert.equal(complete.intervalEnd,end);
  assert.equal(complete.date,"2026-10-08");
  const partial=result.items["fixture/partial"];
  assert.equal(partial.stars,2);
  assert.equal(partial.forks,2);
  assert.equal(partial.starsComplete,false);
  assert.equal(partial.forksComplete,true);
  assert.equal(partial.complete,false);
  assert.equal(partial.intervalStart,start);
  assert.equal(partial.intervalEnd,end);
  const error=result.items["fixture/error"];
  assert.equal(error.stars,null);
  assert.equal(error.forks,null);
  assert.equal(error.complete,false);
  assert.ok(error.error);
  assert.equal(error.intervalStart,start);
  assert.equal(error.intervalEnd,end);
  assert.equal(result.errors.length,1);
  t.diagnostic(JSON.stringify({requests,result}));
});
