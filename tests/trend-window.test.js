const assert = require('node:assert/strict');
const test = require('node:test');
const {describeTrend,snapshotTrend,snapshotGrowth} = require('../public/domain-core');
const end = '2026-10-09T00:30:00.000Z';
const current = {stars:250,forks:10};

for (const [name,start,duration] of [
 ['30 days','2026-09-09T00:30:00.000Z',30*86400000],
 ['same day half hour','2026-10-09T00:00:00.000Z',1800000],
 ['timezone crossing UTC midnight','2026-10-08T19:30:00-04:00',3600000]
]) test(`T-09 snapshot measurement preserves ${name}`,()=>{
 const previous={stars:200,forks:8,lastSeenAt:start};
 const trend=snapshotTrend(previous,current,end),description=describeTrend(trend);
 assert.equal(trend.stars,50);assert.equal(trend.forks,2);assert.equal(trend.complete,true);
 assert.equal(description.kind,'snapshot-net-change');assert.equal(description.durationMs,duration);
 assert.equal(description.intervalStart,new Date(start).toISOString());assert.equal(description.intervalEnd,end);
 assert.equal(description.complete,true);assert.equal(trend.period,'since-previous-scan');
 assert.deepEqual(previous,{stars:200,forks:8,lastSeenAt:start},'Never rewrite the historical baseline');
});

for(const start of [undefined,'','not-a-date','0','2026-10-08','2026-02-30T00:00:00Z','2026-10-09T00:30:00.000Z','2026-10-08T20:30:00-04:00','2026-10-10T00:30:00Z']) {
 test(`T-09 missing/invalid/non-increasing snapshot baseline is unknown (${String(start)})`,()=>{
  const trend=snapshotTrend({stars:200,forks:8,lastSeenAt:start},current,end);
  assert.equal(trend.complete,false);assert.equal(trend.stars,null);assert.equal(trend.forks,null);
  assert.equal(trend.intervalStart,'');assert.equal(describeTrend(trend).windowKnown,false);
 });
}

test('T-09 first observation is unknown; measured zero and negative net changes remain real values',()=>{
 const first=snapshotTrend(null,current,end);assert.equal(first.status,'baseline');assert.equal(first.stars,null);
 const zero=snapshotTrend({...current,lastSeenAt:'2026-10-09T00:00:00Z'},current,end);
 assert.equal(zero.stars,0);assert.equal(describeTrend(zero).complete,true);
 const negative=snapshotTrend({stars:300,forks:11,lastSeenAt:'2026-10-09T00:00:00Z'},current,end);
 assert.equal(negative.stars,-50);assert.equal(negative.forks,-1);assert.equal(describeTrend(negative).stars,-50);
 for(const bad of [undefined,null,'200',NaN,Infinity,-1]) {
  const unknown=snapshotTrend({stars:bad,forks:8,lastSeenAt:'2026-10-09T00:00:00Z'},current,end);
  assert.equal(unknown.stars,null);assert.equal(unknown.complete,false);assert.equal(unknown.forks,2);
 }
});

test('T-09 fallback pairs timestamp and counts from one snapshot, sorted by parsed time',()=>{
 const snapshots=[{at:'2026-10-09T00:00:00Z',stars:220,forks:9},{at:'2026-10-08T19:30:00-04:00',stars:210,forks:8},{at:end,stars:250,forks:10}];
 const raw=JSON.stringify(snapshots);
 const trend=snapshotTrend({stars:999,forks:999,snapshots},current,end);
 assert.equal(trend.intervalStart,'2026-10-09T00:00:00.000Z');assert.equal(trend.stars,30);assert.equal(trend.forks,1);
 assert.equal(JSON.stringify(snapshots),raw);
});

test('T-09 only the proven legacy online event contract derives a UTC day',()=>{
 const legacy={source:'github-online',period:'previous-day-online',date:'2026-10-08',stars:0,forks:2,complete:true};
 const daily=describeTrend(legacy);
 assert.equal(daily.kind,'utc-day-events');assert.equal(daily.intervalStart,'2026-10-08T00:00:00.000Z');
 assert.equal(daily.intervalEnd,'2026-10-09T00:00:00.000Z');assert.equal(daily.durationMs,86400000);assert.equal(daily.stars,0);
 for(const trend of [{...legacy,source:'github-browser-snapshots'},{...legacy,source:'unknown'},{...legacy,date:'2026-02-30'},{...legacy,period:'unknown'},{...legacy,cached:false},{...legacy,pending:true}]) {
  assert.equal(describeTrend(trend).windowKnown,false);assert.equal(describeTrend(trend).stars,null);
 }
 const corrupt=describeTrend({...legacy,intervalStart:'2026-10-08T00:30:00Z',intervalEnd:end});
 assert.notEqual(corrupt.kind,'utc-day-events','Non-midnight observations cannot claim a UTC calendar day');
});

test('T-09 online partial/error/cache states retain their actual semantics',()=>{
 const trend={source:'github-online',period:'previous-day-online',date:'2026-10-08',stars:3,forks:0};
 for(const flags of [{complete:false},{starsComplete:false},{forksComplete:false}]) {
  const value=describeTrend({...trend,...flags});assert.equal(value.complete,false);assert.equal(value.windowKnown,true);assert.equal(value.stars,3);
 }
 for(const flags of [{error:'failed'},{unavailable:true},{pending:true},{cached:false}]) {
  const value=describeTrend({...trend,...flags});assert.equal(value.complete,false);assert.equal(value.stars,null);
 }
});

test('T-09 rolling-period growth never counts a month-old observation as daily growth',()=>{
 const project={snapshots:[{at:'2026-09-09T00:30:00Z',stars:200,forks:8},{at:end,...current}]};
 const daily=snapshotGrowth(project,1,Date.parse(end));
 assert.equal(daily.stars,null);assert.equal(daily.forks,null);assert.equal(daily.windowKnown,false);assert.equal(daily.periodCoverage,'unknown');
 const month=snapshotGrowth(project,30,Date.parse(end));
 assert.equal(month.stars,50);assert.equal(month.durationMs,30*86400000);assert.equal(month.requestedDays,30);
 assert.equal(month.periodCoverage,'observed-interval');
});

test('T-09 growth sorts offset timestamps numerically, preserves negatives, and rejects duplicate/future baselines',()=>{
 const snapshots=[{at:'2026-10-09T00:00:00Z',stars:300,forks:11},{at:end,...current},{at:'2026-10-08T19:30:00-04:00',stars:270,forks:10},{at:'2026-10-10T00:00:00Z',stars:999,forks:999}];
 const raw=JSON.stringify(snapshots);
 const value=snapshotGrowth({snapshots},1,Date.parse(end));
 assert.equal(value.intervalStart,'2026-10-08T23:30:00.000Z');assert.equal(value.stars,-20);assert.equal(value.forks,0);
 assert.equal(JSON.stringify(snapshots),raw);
 const duplicate=snapshotGrowth({snapshots:[{at:end,stars:10,forks:1},{at:'2026-10-08T20:30:00-04:00',stars:20,forks:2}]},1,Date.parse(end));
 assert.equal(duplicate.stars,null);assert.equal(duplicate.windowKnown,false);
});

test('T-09 conflicting counts at the same instant cannot prove a growth baseline',()=>{
 const one={at:'2026-10-09T00:00:00Z',stars:200,forks:8};
 const conflict={at:'2026-10-08T20:00:00-04:00',stars:220,forks:8};
 const growth=snapshotGrowth({snapshots:[one,conflict,{at:end,...current}]},1,Date.parse(end));
 assert.equal(growth.stars,null);assert.equal(growth.forks,2);assert.equal(growth.complete,false);
 const fallback=snapshotTrend({snapshots:[one,conflict]},current,end);
 assert.equal(fallback.stars,null);assert.equal(fallback.forks,2);assert.equal(fallback.complete,false);
 const same=snapshotGrowth({snapshots:[one,{...conflict,stars:200},{at:end,...current}]},1,Date.parse(end));
 assert.equal(same.stars,50);assert.equal(same.complete,true,'Identical duplicate observations remain usable');
});
