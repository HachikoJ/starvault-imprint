const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const os=require('node:os');
const path=require('node:path');
const test=require('node:test');
const {chromium}=require('playwright');

test('T-07 full page preserves old analysis and displays failed delivery before accepting a valid retry',{timeout:40000},async t=>{
  const root=path.resolve(__dirname,'../public');
  const server=http.createServer((req,res)=>{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
    const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':type});res.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let context;t.after(async()=>{await context?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'starvault-analysis-ui-'));t.diagnostic(`Retained Chrome profile and screenshots: ${profile}`);
  const executablePath=[process.env.PLAYWRIGHT_EXECUTABLE_PATH,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean).find(file=>fs.existsSync(file));
  context=await chromium.launchPersistentContext(profile,{headless:true,...(executablePath?{executablePath}:{})});
  const origin=`http://127.0.0.1:${server.address().port}`;
  let phase='empty';let calls=0;
  const valid={recommendation:'watch',riskLevel:'medium',summary:'New accepted local workflow',risks:[],boundaries:[],inspirations:[],validations:[]};
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin===origin)return route.continue();
    if(url.hostname==='api.deepseek.com'&&url.pathname.endsWith('/chat/completions')){
      const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
      if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
      calls++;
      const message={content:JSON.stringify(phase==='valid'?valid:phase==='refusal'?valid:{})};
      if(phase==='refusal')message.refusal='Refused fixture';
      return route.fulfill({headers,json:{choices:[{message,finish_reason:'length'}]}});
    }
    return route.abort('blockedbyclient');
  });
  const page=context.pages()[0]||await context.newPage();
  await page.addInitScript(()=>localStorage.setItem('starvault.guideSeen.v1','1'));
  await page.goto(origin);await page.waitForFunction(()=>document.documentElement.dataset.runtime==='ready'&&typeof state!=='undefined'&&state.summary);
  await page.waitForFunction(()=>document.querySelector('#project-rows .repo-item'));
  const seeded=await page.evaluate(async()=>{
    await api('/api/settings',{method:'POST',body:JSON.stringify({validateProvider:false,llmProviders:[{id:'deepseek',apiKey:'fixture-t07-ui-key'}]})});
    const projects=await api('/api/projects?limit=all');const fullName=projects.items[0].fullName;
    const snapshot=await window.StarVaultIndexedDB.getSnapshot();const planId=snapshot.activeObservationPlanId;
    const old={result:{summary:'Previously verified fixture analysis',recommendation:'watch',riskLevel:'medium',risks:[],boundaries:[],inspirations:[],validations:[]},updatedAt:'2026-01-01T00:00:00.000Z'};
    snapshot.store.observationPlans[planId].userData.analysis[fullName.toLowerCase()]=old;
    await window.StarVaultIndexedDB.putSnapshot(snapshot);
    state.settings=await api('/api/settings');state.config=await api('/api/config');
    await selectProject(fullName,{recordMemory:false});
    return {fullName,planId,old,events:(snapshot.store.observationPlans[planId].memory.events||[]).filter(e=>e.type==='ai_analyze').length};
  });
  for(const width of [1440,390])for(const language of ['zh','en']){
    phase=language==='zh'?'empty':'refusal';
    await page.setViewportSize({width,height:900});
    await page.evaluate(language=>{state.language=language;applyTranslations();renderDetail(state.selected);},language);
    await page.locator('#analysis-need').fill(`invalid ${width} ${language}`);
    await page.locator('[data-action="ai-analyze"]').click();
    await page.locator('.toast').filter({hasText:'AI analysis is invalid'}).last().waitFor({state:'visible'});
    await page.waitForFunction(()=>!Object.values(state.analysisInFlight||{}).some(Boolean));
    assert.match(await page.locator('#analysis-box').textContent(),/Previously verified fixture analysis/);
    const saved=await page.evaluate(({planId,fullName})=>window.StarVaultIndexedDB.getSnapshot().then(s=>({analysis:s.store.observationPlans[planId].userData.analysis[fullName.toLowerCase()],events:(s.store.observationPlans[planId].memory.events||[]).filter(e=>e.type==='ai_analyze').length,tasks:Object.values(s.store.tasks||{})})),seeded);
    assert.deepEqual(saved.analysis,seeded.old);assert.equal(saved.events,seeded.events);
    assert.ok(saved.tasks.filter(row=>row.type==='analysis').every(row=>row.status==='failed'));
    assert.equal(await page.locator('[data-action="ai-analyze"]').getAttribute('aria-busy'),'false');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
    await page.screenshot({path:path.join(profile,`invalid-${width}-${language}.png`),fullPage:true});
  }
  phase='valid';await page.locator('#analysis-need').fill('explicit valid retry');await page.locator('[data-action="ai-analyze"]').click();
  await page.waitForFunction(()=>document.querySelector('#analysis-box')?.textContent.includes('New accepted local workflow'));
  const after=await page.evaluate(planId=>window.StarVaultIndexedDB.getSnapshot().then(s=>(s.store.observationPlans[planId].memory.events||[]).filter(e=>e.type==='ai_analyze').length),seeded.planId);
  assert.equal(after,seeded.events+1);assert.equal(calls,5);
});
