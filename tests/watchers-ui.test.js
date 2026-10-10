const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { chromium } = require("playwright");

test("T-21 real detail page distinguishes zero, nonzero, missing and legacy Watch at desktop/mobile in Chinese/English", {timeout:30000}, async t => {
  const root=path.resolve(__dirname,"../public");
  const server=http.createServer((request,response)=>{
    const pathname=decodeURIComponent(new URL(request.url,"http://localhost").pathname);
    const file=path.resolve(root,`.${pathname==="/"?"/index.html":pathname}`);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404);response.end();return;}
    response.writeHead(200,{"Content-Type":({".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml"})[path.extname(file)]||"application/octet-stream"});response.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  let context;t.after(async()=>{await context?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"starvault-watchers-ui-"));t.diagnostic(`Retained Chrome profile/screenshots ${profile}`);
  const executablePath=[process.env.PLAYWRIGHT_EXECUTABLE_PATH,"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean).find(file=>fs.existsSync(file));
  context=await chromium.launchPersistentContext(profile,{headless:true,serviceWorkers:"block",...(executablePath?{executablePath}:{})});
  const origin=`http://127.0.0.1:${server.address().port}`;
  await context.route("**/*",route=>new URL(route.request().url()).origin===origin?route.continue():route.abort("blockedbyclient"));
  const page=context.pages()[0]||await context.newPage();
  await page.addInitScript(()=>localStorage.setItem("starvault.guideSeen.v1","1"));
  await page.goto(origin);await page.waitForFunction(()=>document.documentElement.dataset.runtime==="ready"&&typeof state!=="undefined"&&state.summary&&state.projects.length);
  await page.evaluate(async()=>{
    const base=state.projects[0];
    const examples=[{id:"zero",watchers:0,watchersSource:"github-subscribers",watchersStatus:"known"},{id:"seven",watchers:7,watchersSource:"github-subscribers",watchersStatus:"known"},
      {id:"unknown",watchers:null,watchersSource:"unknown",watchersStatus:"unknown"},{id:"legacy",watchers:50}];
    await window.StarVaultIndexedDB.putProjects(examples.map(({id,...fact})=>{
      const item={...base,fullName:`fixture/watch-${id}`,name:`watch-${id}`,stars:50};delete item.watchersSource;delete item.watchersStatus;return {...item,...fact};
    }));
  });
  for(const width of [1440,390])for(const language of ["zh","en"])for(const id of ["zero","seven","unknown","legacy"]) {
    await page.setViewportSize({width,height:900});
    await page.evaluate(async({language,id})=>{
      const project=await window.StarVaultLocalApi.handle(`/api/project?fullName=${encodeURIComponent(`fixture/watch-${id}`)}`);
      state.language=language;applyTranslations();state.selected=project;renderDetail(project);switchView("projects");
    },{language,id});
    const summary=page.locator("#detail-panel .detail-more-section > summary");
    if(!await summary.evaluate(element=>element.parentElement.open))await summary.click();
    const row=page.locator("#detail-panel .detail-data-grid > div").filter({hasText:/^Watch/});
    const value=await row.locator("strong").textContent();
    assert.equal(value,id==="zero"?"0":id==="seven"?"7":id==="legacy"?(language==="zh"?"未知（历史来源未确认）":"Unknown (legacy source unconfirmed)"):(language==="zh"?"未知":"Unknown"));
    if(["zero","seven"].includes(id))assert.match(await row.locator("strong span").getAttribute("title"),/GitHub subscribers_count/);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`${width}/${language}/${id} page overflow`);
    assert.ok(await row.evaluate(element=>element.scrollWidth<=element.clientWidth+2),`${width}/${language}/${id} Watch row overflow`);
    await page.screenshot({path:path.join(profile,`watch-${width}-${language}-${id}.png`)});
  }
  const legacy=await page.evaluate(()=>window.StarVaultIndexedDB.getProject("fixture/watch-legacy"));assert.equal(legacy.watchers,50);assert.equal(Object.hasOwn(legacy,"watchersSource"),false);
});
