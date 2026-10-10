const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { IDBFactory, IDBKeyRange } = require("fake-indexeddb");
const core = require("../public/domain-core");

// Only harmless arithmetic/text samples; never DDE, external links or commands.
const CASES = [
  ["=1+1", "'=1+1"], ["+1+1", "'+1+1"], ["-1+1", "'-1+1"], ["@SUM(1,1)", "'@SUM(1,1)"],
  [" \t=1+1", "' \t=1+1"], ["\r\n+1+1", "'\r\n+1+1"], ["\u0000-1+1", "'\u0000-1+1"],
  ["\u001f@SUM(1,1)", "'\u001f@SUM(1,1)"], ["\u00a0=1+1", "'\u00a0=1+1"], ["\ufeff=1+1", "'\ufeff=1+1"],
  ["\u200b=1+1", "'\u200b=1+1"], ["-5", "'-5"],
  ['普通中文,"quote"\n第二行 café 🐕', '普通中文,"quote"\n第二行 café 🐕'],
  ["a=1+1", "a=1+1"], ["'already text", "'already text"], ["", ""]
];

function csvRows(text) {
  text = text.replace(/^\ufeff/, "");
  const rows = []; let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if (char === "\n" && !quoted) { row.push(field); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  assert.equal(quoted, false, "well-formed CSV quoting");
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function projects() {
  return CASES.map(([value], i) => ({ fullName: `fixture/csv-${i}`, name: value, nameZh: value, owner: value,
    url: value, homepage: value, description: value, descriptionZh: value, language: value, topics: [value],
    category: {key: "csv-fixture", label: value}, useCase: {key: "csv-fixture", labelZh: value, labelEn: value},
    stars: 50, forks: 5, watchers: 0, watchersStatus: "known", watchersSource: "github-subscribers", openIssues: 0,
    scores: {opportunity: 80, actionability: 80, quality: 80, risk: 0},
    trend: {stars: -5, forks: -2, source: "browser-snapshot", kind: "snapshot-net-change", intervalStart: "2026-10-01T00:00:00.000Z", intervalEnd: "2026-10-02T00:00:00.000Z"},
    observationPlanIds: ["default"] }));
}

function checkExport(csv, payload, language) {
  assert.ok(csv.startsWith("\ufeff"), "UTF-8 BOM retained");
  const table = csvRows(csv), headers = table.shift(), items = language === "zh" ? payload.项目 : payload.items;
  assert.equal(table.length, CASES.length); assert.equal(items.length, CASES.length);
  const fullName = language === "zh" ? "仓库全名" : "fullName", note = language === "zh" ? "研判记录" : "note";
  for (const item of items) {
    const index = Number(item[fullName].split("-").pop()), row = table.find(row => row[headers.indexOf(fullName)] === item[fullName]);
    assert.equal(row.length, headers.length, "comma, quote and newline never create extra columns/rows");
    assert.equal(item[note], CASES[index][0], "JSON retains the exact untrusted note");
    assert.equal(row[headers.indexOf(note)], CASES[index][1], "CSV neutralizes every boundary while preserving original text");
    for (const [key, value] of Object.entries(item)) {
      const expected = typeof value === "string" && /^[\s\x00-\x1f\x7f-\x9f\u200b-\u200f\u202a-\u202e\u2060-\u206f]*[=+\-@]/u.test(value) ? "'" + value : String(value ?? "");
      assert.equal(row[headers.indexOf(key)], expected, `every actual export field is covered: ${key}`);
    }
    assert.equal(row[headers.indexOf(language === "zh" ? "趋势 Stars" : "trendStars")], "-5", "a real negative numeric measurement stays numeric");
    assert.equal(row[headers.indexOf(language === "zh" ? "Watch" : "watchers")], "0");
  }
}

test("T-17 CSV text boundaries, syntax and original numeric types", () => {
  assert.equal(typeof core.csvCell, "function");
  for (const [value, expected] of CASES) assert.equal(csvRows(core.csvCell(value))[0]?.[0] ?? "", expected);
  for (const value of [-5, -2.5, 0, 5, 1e20, true, false, null, undefined]) assert.equal(core.csvCell(value), String(value ?? ""));
});

test("T-17 real IndexedDB/local export covers all text fields and preserves raw JSON/storage", async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "starvault-csv-browser-")); t.diagnostic(`Retained CSV/JSON fixture: ${dir}`);
  const indexedDB = new IDBFactory(), values = new Map();
  const window = {indexedDB, IDBKeyRange, localStorage: {getItem: k => values.get(k) || null, setItem: (k,v) => values.set(k,String(v)), removeItem: k => values.delete(k)}, location: {origin: "http://127.0.0.1:4173",hostname: "127.0.0.1",host: "127.0.0.1:4173"}};
  const context = {window,globalThis: {IDBKeyRange},indexedDB,IDBKeyRange,location: window.location,fetch: async () => {throw Error("No external requests allowed");},setTimeout,clearTimeout,AbortController,TextDecoder,Date,JSON,Map,Set,Promise,Error,Object,Array,String,Number,Boolean,URL,URLSearchParams,Math};
  for (const file of ["domain-core.js","indexeddb-storage.js","local-api.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../public",file),"utf8"),context);
    if (file === "domain-core.js") window.StarVaultDomainCore = context.globalThis.StarVaultDomainCore;
  }
  const api = window.StarVaultLocalApi, db = window.StarVaultIndexedDB;
  await api.handle("/api/config"); await db.putProjects(projects());
  for (const [i, [text]] of CASES.entries()) await api.handle("/api/note",{method:"POST",body:JSON.stringify({fullName:`fixture/csv-${i}`,text,status:"review"})});
  const before = JSON.stringify((await db.getSnapshot()).store);
  for (const language of ["zh","en"]) {
    const json = (await api.handle(`/api/export?format=json&language=${language}`)).content;
    const csv = (await api.handle(`/api/export?format=csv&language=${language}`)).content;
    fs.writeFileSync(path.join(dir,`local-${language}.json`),json); fs.writeFileSync(path.join(dir,`local-${language}.csv`),csv);
    checkExport(csv,JSON.parse(json),language);
  }
  assert.equal(JSON.stringify((await db.getSnapshot()).store),before,"export reads do not rewrite raw project or note fields");
});

test("T-17 actual authenticated Node/SQLite exports use the same strategy with raw JSON/storage retained", {timeout: 20000}, t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"starvault-csv-node-"));t.diagnostic(`Retained authenticated CSV/JSON fixture: ${dir}`);
  const script = `const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const CASES=${JSON.stringify(CASES)};
${csvRows.toString()}
${projects.toString()}
${checkExport.toString()}
const nativeFetch=global.fetch;global.fetch=async()=>{throw Error('Denied external network');};
const root=process.env.STARVAULT_FIXTURE_ROOT,{createStorage}=require(path.join(root,'src/lib/storage'));
const store=createStorage(process.env.STORE_PATH);store.upsertProjects(projects(),{observationPlanId:'default'});
const raw=store.load();for(const [i,[text]] of CASES.entries())raw.observationPlans.default.userData.notes['fixture/csv-'+i]={text,status:'review'};store.save(raw);
const preserved=()=>({projects:store.load().projects,notes:store.load().observationPlans.default.userData.notes});const before=JSON.stringify(preserved());
const {server}=require(path.join(root,'src/server'));
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));try{
 const origin='http://127.0.0.1:'+server.address().port;
 assert.equal((await nativeFetch(origin+'/api/export?format=csv')).status,401);
 for(const language of ['zh','en']){
  const get=async format=>{const response=await nativeFetch(origin+'/api/export?format='+format+'&language='+language,{headers:{Authorization:'Bearer fixture-csv-token'}});assert.equal(response.status,200);return Buffer.from(await response.arrayBuffer()).toString('utf8');};
  const json=await get('json'),csv=await get('csv');fs.writeFileSync(path.join(process.cwd(),'node-'+language+'.json'),json);fs.writeFileSync(path.join(process.cwd(),'node-'+language+'.csv'),csv);checkExport(csv,JSON.parse(json),language);
 }assert.equal(JSON.stringify(preserved()),before,'export never rewrites raw data');console.log('AUTHENTICATED_NODE_CSV_OK');
}finally{await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});`;
  const env={};for(const key of ["PATH","HOME","TMPDIR","LANG","SYSTEMROOT","WINDIR"])if(process.env[key])env[key]=process.env[key];
  Object.assign(env,{STARVAULT_FIXTURE_ROOT:path.resolve(__dirname,".."),STORE_PATH:path.join(dir,"fixture.db"),HOST:"127.0.0.1",AUTH_TOKEN:"fixture-csv-token",ACCESS_TOKEN:"",PUBLIC_ORIGIN:"",TRUST_PROXY:"0",RUN_SCAN_ON_BOOT:"false",GITHUB_TOKEN:"",TAVILY_API_KEY:"",EXA_API_KEY:"",DEEPSEEK_API_KEY:""});
  const child=spawnSync(process.execPath,["-e",script],{cwd:dir,env,encoding:"utf8",timeout:18000,maxBuffer:4*1024*1024});
  fs.writeFileSync(path.join(dir,"stdout.log"),child.stdout||"");fs.writeFileSync(path.join(dir,"stderr.log"),child.stderr||"");
  assert.equal(child.status,0,child.stderr||child.stdout||String(child.error));assert.match(child.stdout,/AUTHENTICATED_NODE_CSV_OK/);
});
