const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const test = require('node:test');
const { IDBFactory, IDBKeyRange } = require('fake-indexeddb');
const { createStorage } = require('../src/lib/storage');
const core = require('../public/domain-core');
const scoring = require('../src/lib/scoring');
const NOW = '2026-10-10T00:00:00Z';
const ROOT = path.resolve(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));
const meta = { scoringVersion: core.SCORING_VERSION, riskSemantics: core.RISK_SEMANTICS };

function project(name, scores = {}, version = 'unknown') {
  return { fullName: `fixture/${name}`, name, owner: 'fixture', language: 'TypeScript',
    description: 'scorefixture notes dashboard', stars: 10, forks: 2, topics: ['notes'],
    createdAt: '2024-01-01T00:00:00Z', pushedAt: NOW, url: `https://github.com/fixture/${name}`,
    scores: { opportunity: 10, risk: 0, licenseRisk: 82, overallRisk: 34, momentum: 10, quality: 10, productization: 10, actionability: 10, ...scores },
    ...(version === core.SCORING_VERSION ? meta : version === 'unknown' ? {} : {scoringVersion: version}) };
}

async function browser(repositories = [], clock = NOW) {
  const indexedDB = new IDBFactory(), values = new Map(), calls = [];
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return Date.parse(clock); } }
  const window = { indexedDB, IDBKeyRange, __STARVAULT_GITHUB_REQUEST_SPACING_MS__: 0,
    localStorage: { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, String(v)), removeItem: k => values.delete(k) },
    location: { origin: 'http://127.0.0.1:4173', hostname: '127.0.0.1', host: '127.0.0.1:4173' } };
  const context = {window, globalThis: {IDBKeyRange}, indexedDB, IDBKeyRange, location: window.location,
    fetch: async input => {
      const url = new URL(String(input)); calls.push(url.href);
      assert.equal(url.origin, 'https://api.github.com', 'outside fixture calls are rejected');
      const payload = url.pathname === '/rate_limit' ? {resources: {search: {remaining: 99, reset: Date.parse(NOW)/1000 + 60}}} :
        url.pathname === '/search/repositories' ? {total_count: repositories.length, incomplete_results: false, items: repositories} : null;
      assert.ok(payload, `unexpected fixture request ${url.pathname}`);
      return {ok: true, status: 200, headers: {get: () => null}, json: async () => payload, text: async () => JSON.stringify(payload)};
    }, setTimeout, clearTimeout, AbortController, TextDecoder, Date: ClockDate, JSON, Map, Set, Promise, Error, Object, Array, String, Number, Boolean, URL, URLSearchParams, Math};
  for (const file of ['domain-core.js','scoring-core.js','indexeddb-storage.js','local-api.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'public', file), 'utf8'), context);
    if (file === 'domain-core.js') window.StarVaultDomainCore = context.globalThis.StarVaultDomainCore;
    if (file === 'scoring-core.js') window.StarVaultScoringCore = context.globalThis.StarVaultScoringCore;
  }
  await window.StarVaultLocalApi.handle('/api/config');
  return {api: window.StarVaultLocalApi, db: window.StarVaultIndexedDB, calls};
}

test('T-08 version boundaries protect objective ordering, risk buckets, and captured analysis meaning', () => {
  const current = project('current', {opportunity: 1}, core.SCORING_VERSION);
  const highOld = project('high-old', {opportunity: 999, risk: 99});
  const objectiveOld = {...project('objective-old', {opportunity: -99}), stars: 20};
  assert.deepEqual([highOld, current, objectiveOld].sort((a,b) => core.compareScoredProjects(a,b,(x,y) => y.scores.opportunity-x.scores.opportunity)).map(p => p.name), ['current','objective-old','high-old']);
  assert.equal(core.projectRisk(highOld), null);
  assert.equal(core.riskLevel(current), 'low', 'zero project risk does not fall back to action risk');
  assert.equal(core.riskLevel(highOld), 'unknown');
  const foreignScore = project('foreign-score',{opportunity:999},'future-v99');
  const foreignStars = {...project('foreign-stars',{opportunity:1},'future-v99'),stars:100};
  assert.deepEqual([foreignScore,foreignStars].sort((a,b)=>core.compareScoredProjects(a,b,(x,y)=>y.scores.opportunity-x.scores.opportunity)).map(p=>p.name),['foreign-stars','foreign-score']);
  assert.equal(core.leaderboardScore(foreignScore),null,'unsupported version cannot be recalculated using v1 weights');
  const memory = {preferences: {riskLevels: {low: 10, high: 50}}};
  assert.ok(core.memoryScore(current, memory) > 0);
  assert.equal(core.memoryScore(highOld, memory), 0, 'unknown definition receives no known-risk learning');
  const prior = {...current, rank: 1, leaderboardVersion: core.LEADERBOARD_VERSION};
  assert.equal(core.comparableRankChange({...current, leaderboardVersion: core.LEADERBOARD_VERSION}, prior, 2), -1);
  assert.equal(core.comparableRankChange({...highOld, leaderboardVersion: core.LEADERBOARD_VERSION}, prior, 2), null);
  const provider = {id: 'fixture', model: 'fixture', baseUrl: 'https://fixture.invalid/v1'};
  const first = core.createAnalysisTaskInput({}, 'default', current, provider);
  const second = core.createAnalysisTaskInput({}, 'default', {...current, riskSemantics: 'unknown'}, provider);
  assert.notEqual(core.analysisTaskIdentity(first), core.analysisTaskIdentity(second));
  assert.deepEqual(first.analysisRequest.project.riskSemantics, core.RISK_SEMANTICS);
});

test('T-08 SQLite lists, summary, same-day archives and IDB paging retain all versions without rewriting legacy data', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'starvault-score-version-db-'));
  t.diagnostic(`Retained temporary score contract database: ${dir}`);
  const store = createStorage(path.join(dir, 'fixture.db'));
  store.upsertProjects([project('low-current', {opportunity: 1}, core.SCORING_VERSION), project('huge-old', {opportunity: 999, risk: 99}), {...project('stars-old', {opportunity: -9}), stars: 100}]);
  const before = store.load();
  const legacyProject = plain(before.projects['fixture/huge-old']);
  const date = new Date().toISOString().slice(0,10);
  const archive = {date, generatedAt: NOW, items: [{fullName: 'fixture/huge-old', rank: 1, scores: {risk: 99, opportunity: 999}}], marker: 'preserve byte-equivalent legacy JSON'};
  before.leaderboards.daily[date] = plain(archive); store.save(before);
  for (const sort of ['opportunity','risk','momentum','quality','actionability','productization','commercial']) {
    assert.equal(store.listProjects({sort, limit: 'all'}).items[0].name, 'low-current', sort);
  }
  assert.deepEqual(store.listProjects({sort: 'opportunity', diversify: 'true', limit: 'all'}).items.map(p => p.name), ['low-current','stars-old','huge-old']);
  const summary = store.summary({});
  assert.equal(summary.top[0].scoringVersion, core.SCORING_VERSION);
  assert.equal(summary.byRisk.unknown, 2);
  assert.equal(store.listProjects({risk: 'critical'}).items.length, 0, 'legacy mixed risk is not current project risk');
  assert.equal(store.listProjects({risk: 'low'}).items.length, 1);
  assert.equal(store.listProjects({risk: 'unknown'}).items.length, 2);

  const board = store.buildLeaderboard('daily', {limit: 20});
  assert.match(board.archiveKey, /~starvault-node-v1~starvault-node-board-v1$/);
  assert.deepEqual(board.items.map(p => p.name), ['low-current','stars-old','huge-old']);
  assert.deepEqual(board.items.map(p => p.rankWithinVersion), [1,1,2]);
  assert.ok(board.items.every(p => p.rankChangeComparable === false));
  const after = store.load();
  assert.deepEqual(after.leaderboards.daily[date], archive);
  assert.deepEqual(after.projects['fixture/huge-old'], legacyProject, 'read paths leave old raw project unchanged');
  assert.deepEqual(store.buildLeaderboard('daily', {date, persist: false}).items[0].scores, archive.items[0].scores);
  const {db} = await browser();
  await db.putSnapshot(store.exportLocalSnapshot({includeProjects: false, includeLeaderboards: false}));
  const exportedProjects = store.exportLocalProjectPage({limit: 250}).items;
  await db.putProjects(exportedProjects);
  await db.putLeaderboardRecords(store.exportLocalLeaderboardPage({limit: 250}).items);
  const mirror = await db.getSnapshot();
  assert.deepEqual(plain(mirror.store.projects['fixture/huge-old']), exportedProjects.find(p => p.fullName === 'fixture/huge-old'));
  assert.deepEqual(plain(mirror.store.leaderboards.daily[date]), archive);
  assert.ok(mirror.store.leaderboards.daily[board.archiveKey]);
  store.setProjectDismissed('fixture/huge-old',true);
  const reason = store.listDismissedProjects().find(row=>row.fullName==='fixture/huge-old').negativeLearning.systemReason;
  assert.notEqual(reason.code,'risk-boundary','unknown old risk is not treated as current project risk');
  assert.notEqual(reason.code,'quality-actionability','unknown score meaning is not treated as current quality');
  store.setProjectDismissed('fixture/huge-old',false);
  const scored = scoring.enrichRepository(project('huge-old'), null, [], {now: NOW});
  store.upsertProjects([scored]);
  assert.deepEqual(store.getProject('fixture/huge-old').scoreHistory.at(-1).scores, legacyProject.scores);
  assert.deepEqual(store.getProject('fixture/huge-old').snapshots.slice(0,legacyProject.snapshots.length), legacyProject.snapshots);
  const futureStore = createStorage(path.join(dir,'unsupported-version.db'));
  futureStore.upsertProjects([
    {...project('future-first',{opportunity:1},'future-v99'),stars:100,category:{key:'a'},useCase:{key:'a'}},
    {...project('future-second',{opportunity:999},'future-v99'),stars:99,category:{key:'a'},useCase:{key:'a'}},
    {...project('future-third',{opportunity:2000},'future-v99'),stars:90,topics:['agent','orchestration'],description:'An autonomous multi-agent orchestration framework for complex AI workflows.'}
  ]);
  assert.equal(new Set(futureStore.listProjects({limit:'all'}).items.map(p=>p.useCase.key)).size,2,'fixture uses two actual computed categories');
  assert.deepEqual(futureStore.listProjects({sort:'opportunity',diversify:'true',limit:'all'}).items.map(p=>p.name),['future-first','future-second','future-third'],'unsupported versions use objective Stars, including diversity mode');
});

test('T-08 real browser scan API matches shared Node scores and explanations while retaining old scores/archives and export meaning', async t => {
  const raw = [
    {name: 'notes', topics: ['notes','dashboard'], stars: 800, license: {spdx_id:'MIT'}},
    {name: 'swarm', topics: ['agent','orchestration'], stars: 4000, license: {spdx_id:'MIT'}},
    {name: 'no-license', topics: ['notes'], stars: 600, license: null},
    {name: 'unknown-watch', topics: [], stars: 0, license: null}
  ].map((row,i) => ({id:i+1, name:`scorefixture-${row.name}`,full_name:`fixture/scorefixture-${row.name}`,owner:{login:'fixture'},html_url:`https://github.com/fixture/scorefixture-${row.name}`,
    description:`scorefixture ${row.name} application toolkit dashboard`,language:'TypeScript',topics:row.topics,stargazers_count:row.stars,forks_count:25,
    open_issues_count:3,license:row.license,created_at:'2025-01-01T00:00:00Z',pushed_at:NOW,updated_at:NOW,default_branch:'main',...(i===3?{}:{subscribers_count:0})}));
  const {api,db,calls} = await browser(raw);
  await api.handle('/api/settings',{method:'POST',body:JSON.stringify({githubToken:'fixture-t08-token'})});
  await api.handle('/api/observation-plans',{method:'POST',body:JSON.stringify({plan:{id:'scorefixture',name:'scorefixture',searchLogic:{baseMode:'only',keywords:['scorefixture'],customQueries:[{key:'core',label:'scorefixture',query:'scorefixture in:name'}]}}})});
  await api.handle('/api/observation-plans/active',{method:'POST',body:JSON.stringify({id:'scorefixture'})});
  const old = project('scorefixture-notes', {opportunity:999, risk:57});
  old.observationPlanMatches = {scorefixture:{planId:'scorefixture'}};
  old.snapshots = Array.from({length:180}, (_,i) => ({at:'2026-10-09T00:00:00Z',stars:10,forks:2,marker:i}));
  await db.putProjects([old]);
  const snapshot = await db.getSnapshot(), date = NOW.slice(0,10);
  const legacyArchive = {date,marker:'old untouched',items:[{fullName:old.fullName,scores:old.scores,rank:1}]};
  snapshot.store.leaderboards.byPlan = {scorefixture:{daily:{[date]:legacyArchive}}}; await db.putSnapshot(snapshot);
  const started = await api.handle('/api/scan',{method:'POST',body:'{}'});
  let task = started.task;
  for (let i=0; i<500 && ['queued','running'].includes(task.status); i++) {
    await new Promise(resolve=>setTimeout(resolve,10));
    task = (await api.handle(`/api/tasks/${encodeURIComponent(task.id)}`)).task;
  }
  assert.equal(task.status,'completed',task.error || JSON.stringify(task));
  const scan = (await api.handle('/api/summary')).lastScan;
  assert.equal(scan.received,raw.length);
  for (const repo of raw) {
    const actual = await db.getProject(repo.full_name);
    const expected = scoring.scoreRepository(repo, repo.full_name===old.fullName?old:null, [], {now:NOW});
    for (const field of ['scores','category','useCase','licensePolicy','reasons','actions','scoringVersion','riskSemantics','riskDefinitions']) assert.deepEqual(plain(actual[field]),plain(expected[field]),`${repo.name} ${field}`);
    const signals = {...plain(actual.signals)}; delete signals.externalWeb;
    assert.deepEqual(signals,plain(expected.signals),`${repo.name} signal explanation`);
  }
  const final = await db.getSnapshot();
  assert.deepEqual(plain(final.store.leaderboards.byPlan.scorefixture.daily[date]),legacyArchive);
  const board = await api.handle('/api/leaderboard');
  assert.ok(final.store.leaderboards.byPlan.scorefixture.daily[board.archiveKey]);
  assert.ok(board.items.every(p=>p.scoringVersion===core.SCORING_VERSION && p.rankChangeComparable===false));
  assert.deepEqual(plain((await db.getProject(old.fullName)).scoreHistory.at(-1).scores),old.scores);
  assert.deepEqual(plain((await db.getProject(old.fullName)).snapshots.slice(0,180)),old.snapshots);
  for (const language of ['zh','en']) {
    const exported = JSON.parse((await api.handle(`/api/export?format=json&language=${language}`)).content);
    const item = (exported.items || exported.项目)[0];
    assert.equal(item[language==='en'?'scoringVersion':'评分版本'],core.SCORING_VERSION);
    assert.equal(item[language==='en'?'riskSemantics':'风险定义'],core.RISK_SEMANTICS);
    assert.match(item[language==='en'?'rankScope':'排名含义'],language==='en'? /row order.*same scoringVersion/ : /行序.*同一评分版本/);
    const csv = (await api.handle(`/api/export?format=csv&language=${language}`)).content;
    assert.match(csv,/starvault-node-v1/);
  }
  assert.ok(calls.every(url=>new URL(url).origin==='https://api.github.com'));
  t.diagnostic(`Fixture scan requests: ${calls.length}; no real provider requests`);
});

test('T-08 a first version transition and repeated current scans retain all old observations without duplicating full score history', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'starvault-score-retention-'));
  t.diagnostic(`Retained version retention SQLite fixture: ${dir}`);
  const store = createStorage(path.join(dir,'fixture.db'));
  const old = project('retention', {risk:71});
  store.upsertProjects([old]);
  const raw = store.load();
  const history = Array.from({length:180}, (_,i) => ({at:NOW,stars:i,forks:2,marker:i,scores:{risk:i}}));
  raw.projects[old.fullName].snapshots = plain(history);
  store.save(raw);
  const current = scoring.enrichRepository(old,null,[],{now:NOW});
  store.upsertProjects([current]);
  store.upsertProjects([current]);
  const stored = store.getProject(old.fullName);
  assert.deepEqual(stored.snapshots.slice(0,180),history);
  assert.equal(stored.scoreHistory.length,1);
  assert.deepEqual(stored.scoreHistory[0].scores,old.scores);
  let retained = stored.snapshots;
  for (let i=0;i<185;i++) retained = core.appendScoreSnapshot(retained,{at:NOW,scoringVersion:core.SCORING_VERSION,marker:i});
  assert.deepEqual(retained.slice(0,180),history);
  assert.equal(retained.length,360,'180 current observations plus all 180 historical observations');
  assert.equal(retained.at(-1).marker,184);
  assert.equal(core.scoreHistoryAfterUpdate(stored,current,NOW).length,1);
});

test('T-08 actual authenticated Node HTTP exports and paging preserve score versions and honest legacy risk fields', {timeout: 25000}, t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'starvault-score-http-'));
  t.diagnostic(`Retained authenticated HTTP fixture: ${dir}`);
  const script = `const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=${JSON.stringify(ROOT)},dir=${JSON.stringify(dir)};
process.chdir(dir);process.env.STORE_PATH=path.join(dir,'fixture.db');
process.env.AUTH_TOKEN='fixture-t08-auth';process.env.ACCESS_TOKEN='';process.env.GITHUB_TOKEN='';process.env.TAVILY_API_KEY='';process.env.EXA_API_KEY='';process.env.PUBLIC_ORIGIN='';process.env.TRUST_PROXY='0';process.env.HOST='127.0.0.1';process.env.PORT='0';process.env.RUN_SCAN_ON_BOOT='0';
const nativeFetch=global.fetch;global.fetch=async()=>{throw Error('External network forbidden');};
const {createStorage}=require(path.join(root,'src/lib/storage'));
const scoring=require(path.join(root,'src/lib/scoring'));
const store=createStorage(process.env.STORE_PATH);
const old=${JSON.stringify(project('legacy-http',{risk:51,opportunity:999}))};
const current=scoring.enrichRepository(${JSON.stringify(project('current-http'))},null,[],{now:${JSON.stringify(NOW)}});
store.upsertProjects([old,current]);
const {server}=require(path.join(root,'src/server'));
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const get=async p=>{assert.ok(p.startsWith('/api/'));const r=await nativeFetch(origin+p,{headers:{Authorization:'Bearer fixture-t08-auth'}});assert.equal(r.status,200,p);return r;};
for(const language of ['zh','en']){const payload=await(await get('/api/export?format=json&language='+language)).json();const items=payload.items||payload.项目;
const first=items.find(p=>(p.fullName||p.仓库全名)==='fixture/current-http');assert.ok(first,JSON.stringify(items));
assert.equal(first[language==='en'?'scoringVersion':'评分版本'],'starvault-node-v1');assert.equal(first[language==='en'?'riskSemantics':'风险定义'],'project-license-action-v1');
assert.match(first[language==='en'?'rankScope':'排名含义'],language==='en'?/row order.*same scoringVersion/:/行序.*同一评分版本/);
const legacy=items.find(p=>(p.fullName||p.仓库全名)==='fixture/legacy-http');assert.ok(legacy);assert.equal(legacy[language==='en'?'projectRisk':'项目风险'],'');assert.equal(legacy[language==='en'?'historicalRisk':'历史风险值'],51);
assert.deepEqual(JSON.parse(legacy[language==='en'?'rawScores':'原始分数']),old.scores);
const csv=await(await get('/api/export?format=csv&language='+language)).text();assert.match(csv,/starvault-node-v1/);assert.match(csv,/unknown/);
fs.writeFileSync(path.join(dir,language+'.csv'),csv);fs.writeFileSync(path.join(dir,language+'.json'),JSON.stringify(payload,null,2));}
const projects=await(await get('/api/local-projects?limit=250')).json();assert.equal(projects.items.find(p=>p.fullName==='fixture/current-http').scoringVersion,'starvault-node-v1');
assert.deepEqual(store.load().projects['fixture/legacy-http'].scores,old.scores);
console.log(JSON.stringify({authenticatedExports:'PASS',languages:['zh','en'],projectPaging:'PASS',legacyRisk:'PASS'}));
server.closeAllConnections();await new Promise(resolve=>server.close(resolve));})().catch(e=>{console.error(e);server.closeAllConnections();server.close();process.exitCode=1;});`;
  const file = path.join(dir,'acceptance.cjs'); fs.writeFileSync(file,script);
  const stdout = execFileSync(process.execPath,[file],{cwd:dir,env:{PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR},timeout:20000,encoding:'utf8'});
  fs.writeFileSync(path.join(dir,'acceptance.log'),stdout);
  assert.match(stdout,/authenticatedExports.*PASS/);
});


test('T-08 actual SQLite and browser leaderboard entries agree for both strategy inputs, periods and a timezone date boundary', {timeout:30000}, async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'starvault-score-board-parity-'));
  t.diagnostic(`Retained shared-board fixtures: ${dir}`);
  const clock = '2026-10-09T18:30:00.000Z'; // Oct 10 in Asia/Shanghai; UTC archive is Oct 9.
  const inputs = [project('notes-board'), project('agent-board'), project('legacy-board',{opportunity:999,risk:99})];
  inputs[0].topics = ['notes','dashboard']; inputs[0].stars = 250;
  inputs[1].topics = ['agent','orchestration']; inputs[1].stars = 3000;
  inputs[1].description = 'An autonomous multi-agent orchestration framework for complex AI workflows.';
  const script = `const fs=require('node:fs'),path=require('node:path'),root=${JSON.stringify(ROOT)};
const fixed=Date.parse(${JSON.stringify(clock)}),RealDate=Date;
global.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};
const {createStorage}=require(path.join(root,'src/lib/storage')),scoring=require(path.join(root,'src/lib/scoring'));
const inputs=${JSON.stringify(inputs)};
const rows=inputs.map((p,i)=>i===2?p:scoring.enrichRepository(p,null,[],{now:new Date().toISOString()}));
const outcomes=[];
for(let strategy=0;strategy<2;strategy++){
const store=createStorage(path.join(process.cwd(),'strategy-'+strategy+'.db'));store.upsertProjects(rows);
store.updateMemoryPreference('category',rows[strategy].category.key,{value:8});
store.updateMemoryPreference('risk','low',{value:4});
const boards=['daily','monthly'].map(period=>store.buildLeaderboard(period,{persist:false,limit:20}));
outcomes.push({strategy,snapshot:store.exportLocalSnapshot({includeProjects:true,includeLeaderboards:true}),boards});}
console.log(JSON.stringify(outcomes));`;
  const file = path.join(dir,'parity.cjs'); fs.writeFileSync(file,script);
  const output = execFileSync(process.execPath,[file],{cwd:dir,env:{PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,TZ:'Asia/Shanghai'},encoding:'utf8',timeout:15000});
  fs.writeFileSync(path.join(dir,'node.json'),output);
  for (const {snapshot,boards,strategy} of JSON.parse(output)) {
    const {api,db} = await browser([],clock);
    await db.putSnapshot(snapshot);
    for (const expected of boards) {
      assert.ok(expected.items.some(row=>row.scoreParts.memoryBoost>0),'strategy learning is actually applied');
      const actual = await api.handle(`/api/leaderboard?period=${expected.period}&limit=20`);
      assert.equal(actual.date,'2026-10-09'); assert.equal(actual.archiveKey,expected.archiveKey);
      assert.deepEqual(plain(actual.scoreGroups),expected.scoreGroups);
      const fields = ['fullName','rank','rankWithinVersion','rankChange','rankChangeComparable','leaderboardScore','scores','scoringVersion','riskSemantics','scoreParts'];
      const normalize = board => board.items.map(row => Object.fromEntries(fields.map(key=>[key,row[key]])));
      assert.deepEqual(plain(normalize(actual)),normalize(expected),`strategy ${strategy} / ${expected.period}`);
    }
  }
});
