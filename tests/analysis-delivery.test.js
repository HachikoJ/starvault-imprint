const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const ROOT = process.env.STARVAULT_TEST_SOURCE_ROOT || path.resolve(__dirname, '..');
const { analyzeWithProvider } = require(path.join(ROOT, 'src/lib/llm'));
const base = { recommendation:'watch',riskLevel:'medium',summary:'A local CLI can simplify checks for maintainers.',risks:[],boundaries:[],inspirations:[],validations:[] };
const good = [
 {name:'canonical English and empty arrays',result:base,expect:base},
 {name:'canonical Chinese',result:{...base,summary:'可为维护者提供可重复的本地检查工具。'},expect:{recommendation:'watch',riskLevel:'medium'}},
 {name:'sections',result:{recommendation:'validate',riskLevel:'low',summary:'值得先用本地样本验证维护工作流。',sections:{risks:[],boundaries:['保留许可声明'],inspirations:['本地检查工具'],validations:['验证一个工作流']}},expect:{recommendation:'validate',riskLevel:'low'}},
 {name:'old array aliases',result:{decision:'observe',riskLevel:'medium',marketAngle:'A testable maintainer workflow.',biggestRisks:[],reuseBoundary:['Keep notices'],reuseIdeas:['Local workflow'],actions:['Run a fixture']},expect:{recommendation:'watch',riskLevel:'medium'}},
 {name:'old scalar aliases',result:{summary:'A testable local tool.',recommendationTag:'review',riskLevel:'medium',riskAnalysis:'Limited maintenance;Uncertain demand',practiceBoundary:'Keep notices;Review distribution',developmentPath:'Local CLI',nextActions:'Test one workflow'},expect:{recommendation:'watch',riskLevel:'medium'}},
 {name:'browser aliases',result:{suggestion:'watch',risk:'medium',verdict:'先验证维护者的重复检查需求。',practiceIdeas:[],nextActions:[]},expect:{recommendation:'watch',riskLevel:'medium'}},
 {name:'verdict only uses conservative defaults',result:{verdict:'A narrow local workflow is worth investigating.'},expect:{recommendation:'watch',riskLevel:'medium'}},
 {name:'complete JSON with length marker',result:base,length:true,expect:base},
 {name:'fenced complete JSON',raw:'```json\n'+JSON.stringify(base)+'\n```',expect:base}
];
const bad = [
 {name:'empty visible response',raw:''}, {name:'empty object',raw:'{}'},
 {name:'overload prose',raw:'Service overloaded, try again later'},
 {name:'overload disguised as business JSON',result:{...base,summary:'Service overloaded, try again later'}},
 {name:'refusal disguised as summary',result:{...base,summary:'I cannot analyze this request.'}},
 {name:'truncated JSON',raw:'{"summary":"A local tool"',length:true},
 {name:'refusal-only JSON',result:{refusal:'I cannot analyze this request'}},
 {name:'invalid recommendation',result:{...base,recommendation:'buy'}},
 {name:'invalid risk',result:{...base,riskLevel:'safe'}},
 {name:'summary object',result:{...base,summary:{text:'not a string'}}},
 {name:'summary number',result:{...base,summary:42}},
 {name:'empty summary',result:{...base,summary:'   '}},
 {name:'punctuation-only summary',result:{...base,summary:'... ---'}},
 {name:'canonical array as string',result:{...base,risks:'not an array'}},
 {name:'canonical array object member',result:{...base,risks:[{text:'not a string'}]}},
 {name:'sections array',result:{...base,sections:[]}},
 {name:'hidden invalid alias',result:{...base,biggestRisks:{text:'invalid alias type'}}},
 {name:'hidden invalid enum alias',result:{...base,decision:'buy'}},
 {name:'provider error envelope',error:true},
 {name:'explicit refusal metadata with apparently valid content',result:base,refusal:true}
];
function envelope(protocol,fixture) {
 const raw=fixture.raw === undefined ? JSON.stringify(fixture.result) : fixture.raw;
 if(fixture.error)return {error:{message:'Service overloaded'}};
 if(protocol==='anthropic')return {content:[{type:'text',text:raw},...(fixture.refusal?[{type:'refusal',text:'Refused'}]:[])],stop_reason:fixture.length?'max_tokens':'end_turn'};
 if(protocol==='gemini')return {candidates:[{content:{parts:[{text:raw}]},finishReason:fixture.refusal?'SAFETY':fixture.length?'MAX_TOKENS':'STOP'}],...(fixture.refusal?{promptFeedback:{blockReason:'SAFETY'}}:{})};
 return {choices:[{message:{content:fixture.parts?[{type:'text',text:raw}]:raw,...(fixture.refusal?{refusal:'Refused'}:{})},finish_reason:fixture.length?'length':'stop'}]};
}
async function run(t,protocol,fixture,shouldAccept) {
 const originalFetch=global.fetch;let calls=0;
 global.fetch=async(url,init={})=>{
  calls++;assert.ok(String(url).startsWith('https://provider.invalid/'),'Unexpected outbound request blocked');
  assert.equal(init.method,'POST');assert.ok(init.signal,'T-11 signal must remain present');
  return new Response(JSON.stringify(envelope(protocol,fixture)),{status:200,headers:{'Content-Type':'application/json'}});
 };
 t.after(()=>{global.fetch=originalFetch;});
 const analyze=()=>analyzeWithProvider({provider:{protocol,baseUrl:'https://provider.invalid',model:'fixture-model',apiKey:'fixture-only'},project:{fullName:'acme/validation',scores:{risk:0}},language:fixture.name.includes('Chinese')||fixture.name==='sections'?'zh':'en'});
 if(shouldAccept){
  const output=await analyze();assert.ok(output.result.summary.trim());
  assert.equal(output.result.recommendation,fixture.expect.recommendation);
  assert.equal(output.result.riskLevel,fixture.expect.riskLevel);
  for(const field of ['risks','boundaries','inspirations','validations']){
   assert.ok(Array.isArray(output.result[field]));assert.ok(output.result[field].every(item=>typeof item==='string'));
   if(Object.hasOwn(fixture.expect,field))assert.deepEqual(output.result[field],fixture.expect[field]);
  }
 }else await assert.rejects(analyze,error=>error.code==='AI_ANALYSIS_INVALID');
 assert.equal(calls,1,'Invalid business content must not trigger an automatic paid retry');
}
for(const protocol of ['openai-compatible','anthropic','gemini']) {
 for(const fixture of good)test(`T-07 ${protocol} accepts ${fixture.name}`,t=>run(t,protocol,fixture,true));
 for(const fixture of bad)test(`T-07 ${protocol} rejects ${fixture.name}`,t=>run(t,protocol,fixture,false));
}
test('T-07 openai-compatible accepts supported array text content',t=>run(t,'openai-compatible',{name:'array text content',result:base,expect:base,parts:true},true));
