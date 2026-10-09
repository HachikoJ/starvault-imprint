const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const {validateAnalysisResult,assertAnalysisDelivery}=require('../public/domain-core');
const valid={recommendation:'watch',riskLevel:'medium',summary:'A useful local workflow.',risks:[],boundaries:[],inspirations:[],validations:[]};
test('T-07 accepts canonical empty arrays and neutral missing enum defaults',()=>{
 assert.deepEqual(validateAnalysisResult(valid),{...valid,verdict:valid.summary});
 assert.equal(validateAnalysisResult({verdict:'可测试的维护工作流。'}).recommendation,'watch');
 assert.equal(validateAnalysisResult({verdict:'可测试的维护工作流。'}).riskLevel,'medium');
 assert.deepEqual(validateAnalysisResult(vm.runInNewContext('({summary:"Cross-realm JSON object",risks:[]})')).risks,[]);
});
test('T-07 preserves sections, explicit empty priority, and chosen old scalar aliases',()=>{
 const result=validateAnalysisResult({summary:'Maintainer workflow',decision:'observe',risk:'LOW',sections:{risks:[]},risks:['Lower priority'],practiceBoundary:'Keep notices;Review distribution',reuseIdeas:['Local CLI'],actions:'Test local sample\nAsk one maintainer'});
 assert.deepEqual(result.risks,[]);assert.equal(result.recommendation,'watch');assert.equal(result.riskLevel,'low');
 assert.deepEqual(result.boundaries,['Keep notices','Review distribution']);assert.deepEqual(result.inspirations,['Local CLI']);assert.deepEqual(result.validations,['Test local sample','Ask one maintainer']);
});
for(const [name,input] of [
 ['empty object',{}],['array',[]],['null',null],['summary type',{...valid,summary:{text:'bad'}}],
 ['canonical list string',{...valid,risks:'bad'}],['list member',{...valid,risks:[{}]}],
 ['hidden malformed alias',{...valid,biggestRisks:{text:'bad'}}],['bad enum',{...valid,recommendation:'buy'}],
 ['bad secondary enum',{...valid,decision:'buy'}],['risk type',{...valid,riskLevel:7}],
 ['sections array',{...valid,sections:[]}],['punctuation',{summary:'... ---'}],['refusal',{...valid,refusal:'Denied'}],
 ['error',{...valid,error:{message:'Overloaded'}}]
])test(`T-07 rejects ${name}`,()=>assert.throws(()=>validateAnalysisResult(input),error=>error.code==='AI_ANALYSIS_INVALID'));
for(const payload of [{choices:[{message:{refusal:'Denied',content:JSON.stringify(valid)}}]},{content:[{type:'refusal',text:JSON.stringify(valid)}]},{candidates:[{finishReason:'SAFETY',content:{parts:[{text:JSON.stringify(valid)}]}}]},{promptFeedback:{blockReason:'SAFETY'}}])test('T-07 rejects explicit provider failure metadata',()=>assert.throws(()=>assertAnalysisDelivery(payload),error=>error.code==='AI_ANALYSIS_INVALID'));
test('T-07 does not reject complete delivery merely for length marker',()=>{assertAnalysisDelivery({choices:[{finish_reason:'length',message:{content:JSON.stringify(valid)}}]});assertAnalysisDelivery({stop_reason:'max_tokens',content:[{type:'text',text:JSON.stringify(valid)}]});});
