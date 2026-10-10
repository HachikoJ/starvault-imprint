const assert = require("node:assert/strict");
const test = require("node:test");
const { githubWatchers, watcherFact } = require("../public/domain-core");
const { normalizeRepo } = require("../src/lib/github");
const { scoreRepository } = require("../src/lib/scoring");
const { demoRepositoryRecord } = require("../scripts/build-demo-snapshot");

const raw = { id:1, full_name:"fixture/watch", name:"watch", owner:{login:"fixture"}, stargazers_count:50, watchers_count:50,
  forks_count:2, open_issues_count:0, description:"A useful dashboard for product teams", topics:[], license:{spdx_id:"MIT"},
  created_at:"2020-01-01T00:00:00Z", updated_at:"2026-10-09T00:00:00Z", pushed_at:"2026-10-09T00:00:00Z" };

test("T-21 raw GitHub Watch uses only a nonnegative integer subscribers_count, including zero", () => {
  for (const value of [0,7,undefined,null,"7",-1,1.5,NaN,Infinity]) {
    const input = {...raw, subscribers_count:value};
    const before = JSON.stringify(input);
    const known = Number.isInteger(value) && value >= 0;
    const expected = {watchers:known ? value : null, watchersSource:known ? "github-subscribers" : "unknown", watchersStatus:known ? "known" : "unknown"};
    assert.deepEqual(githubWatchers(input),expected);
    const normalized = normalizeRepo(input,{});
    assert.deepEqual(watcherFact(normalized),expected);
    assert.equal(normalized.watchers,expected.watchers);
    assert.equal(JSON.stringify(input),before,"raw provider payload is unchanged");
  }
});

test("T-21 historical Watch without provenance is legacy unknown, independent of its similarity to Stars", () => {
  for (const value of [0,7,50]) {
    const legacy={watchers:value,stars:50};
    assert.deepEqual(watcherFact(legacy),{watchers:null,watchersSource:"legacy-unknown",watchersStatus:"legacy"});
    assert.deepEqual(legacy,{watchers:value,stars:50});
  }
  for (const record of [{},{watchers:null,watchersSource:"unknown",watchersStatus:"unknown"}]) {
    const fact=watcherFact(record); assert.equal(fact.watchers,null);assert.equal(fact.watchersStatus,"unknown");assert.deepEqual(watcherFact(fact),fact);
  }
  for (const value of [0,7]) {
    const fact=githubWatchers({subscribers_count:value});assert.deepEqual(watcherFact(fact),fact);
  }
});

test("T-21 Node community adds only proven Watch and never counts legacy watchers_count as subscribers", () => {
  const base=normalizeRepo({...raw,subscribers_count:0},{});
  const zero=scoreRepository(base).scores.community;
  const seven=scoreRepository({...base,...githubWatchers({subscribers_count:7})}).scores.community;
  const unknown=scoreRepository({...base,...githubWatchers({})}).scores.community;
  const legacy=scoreRepository({...base,watchers:50,watchersSource:undefined,watchersStatus:undefined}).scores.community;
  assert.equal(seven-zero,7);assert.equal(unknown,zero);assert.equal(legacy,zero);
});

test("T-21 demo builder preserves available subscriber facts without inventing missing ones", () => {
  for(const value of [0,7,undefined,null,"7",-1]) {
    const item=demoRepositoryRecord({...raw,subscribers_count:value});
    if(Number.isInteger(value)&&value>=0) assert.equal(item.subscribers_count,value);
    else assert.equal(Object.hasOwn(item,"subscribers_count"),false);
    assert.equal(item.watchers_count,50,"retain the separate raw GitHub field");
  }
});
