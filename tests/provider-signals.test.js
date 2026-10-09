const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const ROOT = process.env.STARVAULT_TEST_SOURCE_ROOT || path.resolve(__dirname, '..');
const { externalSignalOutcome } = require(path.join(ROOT, 'public/domain-core'));
const { scoreRepository, enrichRepository } = require(path.join(ROOT, 'src/lib/scoring'));
const { createStorage } = require(path.join(ROOT, 'src/lib/storage'));
const { analyzeWithProvider } = require(path.join(ROOT, 'src/lib/llm'));
const project = { fullName:'fixture/signals', name:'signals', owner:'fixture', description:'A useful developer productivity application', stars:50, forks:4, topics:[], language:'JavaScript', defaultBranch:'main', createdAt:'2020-01-01T00:00:00Z', pushedAt:'2026-10-08T00:00:00Z', license:{spdx_id:'MIT'} };
const realZero = { source:'tavily', title:'A real zero-weight result', url:'https://evidence.invalid/result', score:0, weight:0, content:'Relevant evidence' };
const legacyError = source => ({ source, title:`${source === 'exa' ? 'Exa' : 'Tavily'} enrichment failed`, url:'', score:0, content:'Fixture failure' });

for (const [source, method] of [['tavily','enrichTopProjectsWithTavily'], ['exa','enrichTopProjectsWithExa']]) {
  for (const scenario of [401,429,503,'network']) {
    test(`T-10 ${source}/${scenario}: real enrichment → score → SQLite → AI excludes failed evidence`, async t => {
      const originalFetch = global.fetch;
      t.after(() => { global.fetch = originalFetch; });
      let calls = 0;
      global.fetch = async url => {
        assert.equal(String(url), source === 'tavily' ? 'https://api.tavily.com/search' : 'https://api.exa.ai/search', 'Unexpected upstream blocked');
        calls++;
        if (scenario === 'network') throw new TypeError('Fixture transport failure');
        return new Response(JSON.stringify({error:'Fixture service failure'}), {status:scenario,headers:{'retry-after':'0'}});
      };
      const progress = [];
      const outcomes = await require(path.join(ROOT, `src/lib/${source}`))[method]([project], 'fixture-only', 1, value => progress.push(value));
      const outcome = outcomes.get(project.fullName);
      assert.equal(outcome.status, 'error');
      assert.deepEqual(outcome.signals, []);
      assert.equal(outcome.errors.length, 1);
      assert.equal(outcome.errors[0].source, source);
      assert.equal(outcome.errors[0].fullName, project.fullName);
      assert.equal(outcome.errors[0].httpStatus, scenario === 'network' ? 0 : scenario);
      assert.ok(outcome.errors[0].message);
      assert.equal(calls, [429,503].includes(scenario) ? 3 : 1);
      assert.equal(progress.length, 1);
      const baseline = scoreRepository(project);
      const scored = enrichRepository(project, null, outcome);
      assert.deepEqual(scored.scores, baseline.scores);
      assert.deepEqual(scored.reasons, baseline.reasons);
      assert.equal(scored.signals.externalMentions, 0);
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'starvault-provider-signals-'));
      t.diagnostic(`Retained isolated SQLite: ${directory}`);
      const storage = createStorage(path.join(directory, 'fixture.db'));
      storage.upsertProjects([scored], {observationPlanId:'default', status:'completed-with-errors',providerDiagnostics:outcome.errors});
      const saved = storage.getProject(project.fullName);
      assert.equal(saved.signals.externalMentions, 0);
      assert.deepEqual(storage.summary().lastScan.providerDiagnostics, outcome.errors);
      let request;
      global.fetch = async (url, init) => {
        assert.equal(String(url), 'https://model.invalid/chat/completions', 'Unexpected model request blocked');
        request = JSON.parse(init.body);
        return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({summary:'A testable local maintainer workflow.',recommendation:'watch',riskLevel:'medium'})}}]}));
      };
      await analyzeWithProvider({provider:{apiKey:'fixture-only',model:'fixture',baseUrl:'https://model.invalid'},project:saved,language:'en'});
      const prompt = request.messages.find(message => message.role === 'user').content;
      assert.match(prompt, /"externalMentions":\s*0/);
      assert.doesNotMatch(prompt, /external web signals were found|enrichment failed|Fixture service failure/);
    });
  }

  test(`T-10 ${source}: success-empty, successful zero score, disabled enrichment remain distinct`, async t => {
    const originalFetch = global.fetch;
    t.after(() => { global.fetch = originalFetch; });
    const enrich = require(path.join(ROOT, `src/lib/${source}`))[method];
    let results = [];
    let calls = 0;
    global.fetch = async url => {
      assert.equal(String(url), source === 'tavily' ? 'https://api.tavily.com/search' : 'https://api.exa.ai/search');
      calls++;
      return new Response(JSON.stringify({results}));
    };
    let outcome = (await enrich([project], 'fixture-only', 1)).get(project.fullName);
    assert.deepEqual(outcome, {status:'success',signals:[],errors:[]});
    results = [{title:'Real result',url:'https://evidence.invalid/real',score:0,text:'Evidence',content:'Evidence'}];
    outcome = (await enrich([project], 'fixture-only', 1)).get(project.fullName);
    assert.equal(outcome.status, 'success');
    assert.equal(outcome.signals.length, 1);
    assert.equal(outcome.signals[0].score, 0);
    assert.equal(scoreRepository(project,null,outcome).signals.externalMentions,1);
    assert.equal((await enrich([project], '', 1)).size,0);
    assert.equal((await enrich([project], 'fixture-only', 0)).size,0);
    assert.equal(calls,2,'Skipped providers must not make a request');
    assert.equal(externalSignalOutcome(undefined,source).status,'skipped');
  });
}

test('T-10 legacy checkpoint arrays exclude only provable failures, preserving zero scores and Trending', () => {
  const trending = {source:'github-trending',title:'Trending',period:'daily',rank:1,score:0,weight:0};
  const ambiguous = {...legacyError('tavily'),url:'https://evidence.invalid/not-proven-failed',weight:0};
  const outcome = externalSignalOutcome([realZero,legacyError('tavily'),legacyError('exa'),trending,ambiguous], 'tavily', project.fullName);
  assert.equal(outcome.status,'partial');
  assert.deepEqual(outcome.signals,[realZero,trending,ambiguous]);
  assert.equal(outcome.errors.length,2);
  assert.deepEqual(externalSignalOutcome(outcome),outcome,'New checkpoint recovery is idempotent');
  const mixed = scoreRepository(project,null,outcome);
  const valid = scoreRepository(project,null,[realZero,trending,ambiguous]);
  assert.deepEqual(mixed,valid);
  assert.equal(mixed.signals.externalMentions,3);
  assert.equal(mixed.signals.githubTrending.length,1);
  assert.doesNotMatch(JSON.stringify(mixed.reasons), /enrichment failed/);
});

test('T-10 explicit zero/invalid weight cannot inflate scores; default weight and valid evidence remain', () => {
  const baseline = scoreRepository(project);
  for (const weight of [0,-1,NaN,Infinity,'invalid']) {
    const scored = scoreRepository(project,null,[{...realZero,weight}]);
    assert.equal(scored.scores.novelty,baseline.scores.novelty,String(weight));
    assert.equal(scored.signals.externalMentions,1,'Real result is retained independently of its weight');
    assert.ok(Object.values(scored.scores).every(Number.isFinite));
  }
  for (const weight of [undefined,null,1]) {
    assert.equal(scoreRepository(project,null,[{...realZero,weight}]).scores.novelty,baseline.scores.novelty+4);
  }
  assert.equal(externalSignalOutcome([null,{},[],{source:''}]).signals.length,0);
  assert.equal(externalSignalOutcome({status:'error',signals:[realZero]}).signals.length,0);
});
