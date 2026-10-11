const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const domain = require('../public/domain-core');
const node = require('../src/lib/scoring');
const now = '2026-10-10T00:00:00.000Z';
const base = {fullName:'fixture/notes', name:'notes', description:'Deployable collaborative notes dashboard with user authentication and offline editing.', language:'TypeScript', topics:['notes','dashboard'], homepage:'https://fixture.invalid', stars:120, forks:20, watchers:0, watchersStatus:'known', watchersSource:'github-subscribers', openIssues:8, defaultBranch:'main', createdAt:'2026-07-01T00:00:00.000Z', pushedAt:'2026-10-05T00:00:00.000Z', license:{spdxId:'MIT'}};
function browserCore() {
  // An explicit clock must work even if the runtime clock is unavailable.
  class ForbiddenDate extends Date { constructor(...args) { if(!args.length) throw new Error('Hidden current time'); super(...args); } static now() {throw new Error('Hidden Date.now');} }
  const context = vm.createContext({StarVaultDomainCore:domain, Date:ForbiddenDate});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/scoring-core.js'),'utf8'), context);
  return context.StarVaultScoringCore;
}
function plain(value) {return JSON.parse(JSON.stringify(value));}
function raw(repo) {return {full_name:repo.fullName,name:repo.name,description:repo.description,language:repo.language,topics:repo.topics,homepage:repo.homepage,stargazers_count:repo.stars,forks_count:repo.forks,subscribers_count:repo.watchers,open_issues_count:repo.openIssues,default_branch:repo.defaultBranch,created_at:repo.createdAt,pushed_at:repo.pushedAt,license:repo.license && {spdx_id:repo.license.spdxId},archived:repo.archived,disabled:repo.disabled,fork:repo.fork};}
const cases = [
  ['notes',{},[69,22,68,79,93,52,0,14,6,81]],
  ['swarm',{fullName:'fixture/swarm',name:'swarm',description:'An autonomous multi-agent orchestration framework for complex AI workflows.',topics:['agent','orchestration'],homepage:'',stars:4000,forks:10},[35,51,58,100,23,52,48,14,34,41]],
  ['no-license',{license:null},[62,22,68,79,89,52,0,82,34,72]],
  ['stale-archived',{archived:true,pushedAt:'2024-01-01T00:00:00.000Z'},[32,10,0,79,63,52,82,14,53,40]]
];
for (const [label, patch, expected] of cases) test(`shared fixed ${label} preserves approved Node weights and full explanations`, () => {
  const browser = browserCore(), repo={...base,...patch};
  const left=node.scoreRepository(repo,null,[],{now}), right=browser.scoreRepository(raw(repo),null,[],{now});
  assert.deepEqual(Object.values(left.scores),expected);
  assert.deepEqual(plain(right),plain(left));
  assert.equal(left.scoringVersion,'starvault-node-v1'); assert.equal(left.riskSemantics,'project-license-action-v1');
  assert.equal(left.riskDefinitions.risk,'project-maintenance-maturity-metadata-hype');
  assert.equal(left.riskDefinitions.licenseRisk,'license-policy');
  assert.equal(left.riskDefinitions.overallRisk,'clamp(0.58 * projectRisk + 0.42 * licenseRisk, 0, 100)');
});
test('previous deltas and successful/error evidence share one actual calculation', () => {
 const browser=browserCore(), previous={...base,stars:100,forks:12};
 const error=[{source:'exa',title:'Exa enrichment failed',score:0,weight:0,error:'Provider unavailable'}];
 const empty=node.scoreRepository(base,previous,[],{now});
 assert.deepEqual(node.scoreRepository(base,previous,error,{now}),empty);
 const signals=[{source:'github-trending',period:'daily',rank:2,weight:1,url:'https://github.com/fixture/notes'}];
 const left=node.scoreRepository(base,previous,signals,{now});
 assert.deepEqual(plain(browser.scoreRepository(raw(base),raw(previous),signals,{now})),left);
 assert.equal(left.signals.starDelta,20); assert.equal(left.signals.forkDelta,8);
 assert.equal(left.signals.externalMentions,1); assert.ok(left.scores.momentum>empty.scores.momentum);
});
test('watcher provenance stays unknown or genuinely known zero without manufacturing a subscriber count', () => {
 const core=browserCore();
 const unknown={...base,watchers:100,watchersSource:'legacy-unknown',watchersStatus:'legacy'};
 const normalized=plain(core.normalizeScoringRepository(unknown,{now}));
 assert.equal(normalized.watchers,null);assert.equal(normalized.watchersSource,'legacy-unknown');
 const rawUnknown={...raw(base),subscribers_count:undefined,watchers_count:100};
 assert.equal(core.normalizeScoringRepository(rawUnknown,{now}).watchers,null);
 assert.equal(core.normalizeScoringRepository(raw(base),{now}).watchers,0);
 assert.equal(node.scoreRepository(unknown,null,[],{now}).scores.community,node.scoreRepository(base,null,[],{now}).scores.community);
});
test('missing/invalid metadata and date boundaries produce finite bounded scores without mutating old input', () => {
 const core=browserCore();
 assert.equal(core.normalizeScoringRepository({}, {now}).createdAt, '', 'unknown creation time is not manufactured from the scan clock');
 assert.equal(core.normalizeScoringRepository({pushedAt:'invalid'}, {now}).pushedAt, '');
 for(const repo of [{},{...base,stars:Infinity,forks:NaN,openIssues:-5,createdAt:'invalid',pushedAt:'invalid',topics:null},{...base,stars:Number.MAX_VALUE,createdAt:'2099-01-01',pushedAt:'2099-01-01'},{...base,createdAt:now,pushedAt:now}]) {
  const scored=node.scoreRepository(repo,null,[],{now});
  for(const value of Object.values(scored.scores)) assert.ok(Number.isFinite(value) && value>=0 && value<=100);
  for(const field of ['ageDays','pushedDays','starsPerDay','forksPerDay','starDelta','forkDelta']) assert.ok(Number.isFinite(scored.signals[field]),field);
  assert.deepEqual(plain(core.scoreRepository(repo,null,[],{now})),scored);
 }
 const legacy=Object.freeze({...base,scores:Object.freeze({risk:9}),snapshots:Object.freeze([{risk:9}])});
 const enriched=node.enrichRepository(legacy,null,[],{now});
 assert.equal(legacy.scores.risk,9);assert.equal(legacy.scoringVersion,undefined);
 assert.equal(enriched.updatedInMonitorAt,now);assert.equal(enriched.scoringVersion,'starvault-node-v1');
 assert.throws(()=>node.scoreRepository(base,null,[],{now:'invalid'}),/clock|time|date/i);
});
test('the explicit clock controls boundary risk independently of runtime Date', () => {
 const core=browserCore();
 const repo={...base,createdAt:'2026-10-01T00:00:00.000Z',stars:1600,forks:2};
 const young=core.scoreRepository(repo,null,[],{now});
 const older=core.scoreRepository(repo,null,[],{now:'2026-12-01T00:00:00.000Z'});
 assert.equal(young.signals.ageDays,9);assert.equal(young.signals.riskBreakdown.maturity,18);
 assert.equal(older.signals.riskBreakdown.maturity,0);
 assert.equal(core.enrichRepository(raw(repo),null,[],{now}).updatedInMonitorAt,now);
});
