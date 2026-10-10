const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");
const { chromium } = require("playwright");
const { createStorage } = require("../src/lib/storage");
const ROOT=path.resolve(__dirname,"..");
const TOKEN="fixture-t15-access-a",NEXT_TOKEN="fixture-t15-access-b";

async function fixture(t, presetToken="", { serviceToken=TOKEN, staticRuntime=false } = {}) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"starvault-auth-export-"));t.diagnostic(`Retained authenticated service, downloads and Chrome profile: ${dir}`);
  fs.symlinkSync(path.join(ROOT,"public"),path.join(dir,"public"),"dir");
  const store=createStorage(path.join(dir,"fixture.db"));
  store.upsertProjects([{fullName:"fixture/auth-export",name:"auth-export",owner:"fixture",url:"https://github.com/fixture/auth-export",description:"认证导出 fixture dashboard",language:"TypeScript",topics:["dashboard"],stars:50,forks:5,
    scores:{opportunity:80,quality:80,actionability:80,risk:0},license:{spdxId:"MIT"}}],{observationPlanId:"default"});
  const preload=path.join(dir,"deny-remote.cjs");
  fs.writeFileSync(preload,`const allowed=u=>{const v=new URL(typeof u==='string'?u:u.url||u.href);if(!['127.0.0.1','localhost','[::1]'].includes(v.hostname))throw Error('Fixture denied external network '+v.origin);};const original=global.fetch;global.fetch=(u,o)=>{allowed(u);return original(u,o)};for(const m of ['node:http','node:https']){const lib=require(m);for(const k of ['request','get']){const fn=lib[k];lib[k]=function(u,...a){if(typeof u==='string'||u instanceof URL)allowed(u);else if(u?.hostname&&!['127.0.0.1','localhost','::1'].includes(u.hostname))throw Error('Fixture denied external host');return fn.call(this,u,...a)}}}`);
  const listener=net.createServer();await new Promise(resolve=>listener.listen(0,"127.0.0.1",resolve));const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
  const origin=`http://127.0.0.1:${port}`;
  let child,logs="",context;
  async function stop() {if(child&&child.exitCode===null)await new Promise(resolve=>{child.once("exit",resolve);child.kill("SIGTERM");});}
  async function start(token) {
    const env={};for(const key of ["PATH","HOME","TMPDIR","LANG","SYSTEMROOT","WINDIR"])if(process.env[key])env[key]=process.env[key];
    Object.assign(env,{STORE_PATH:path.join(dir,"fixture.db"),HOST:"127.0.0.1",PORT:String(port),AUTH_TOKEN:token,ACCESS_TOKEN:"",PUBLIC_ORIGIN:"",TRUST_PROXY:"0",RUN_SCAN_ON_BOOT:"false",GITHUB_TOKEN:"",TAVILY_API_KEY:"",EXA_API_KEY:"",DEEPSEEK_API_KEY:""});
    child=spawn(process.execPath,["--require",preload,path.join(ROOT,"src/server.js")],{cwd:dir,env,stdio:["ignore","pipe","pipe"]});
    child.stdout.on("data",chunk=>logs+=chunk);child.stderr.on("data",chunk=>logs+=chunk);
    for(let i=0;i<100;i++) {
      if(child.exitCode!==null)throw new Error(`Fixture server exited: ${logs}`);
      try {if((await fetch(origin+"/api/health",{headers:token?{Authorization:`Bearer ${token}`}:{}})).ok)return;}catch{}
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    throw new Error("Fixture server readiness expired");
  }
  t.after(async()=>{await context?.close();await stop();fs.writeFileSync(path.join(dir,"server.log"),logs);assert.doesNotMatch(logs,/fixture-t15-access-[ab]|fixture-t15-wrong/);});
  await start(serviceToken);
  const executablePath=[process.env.PLAYWRIGHT_EXECUTABLE_PATH,"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean).find(file=>fs.existsSync(file));
  context=await chromium.launchPersistentContext(path.join(dir,"chrome-profile"),{headless:true,acceptDownloads:true,serviceWorkers:"block",...(executablePath?{executablePath}:{})});
  await context.route("**/*",route=>{
    const url=new URL(route.request().url());
    if(staticRuntime&&url.origin===origin&&url.pathname==="/runtime-config.js")return route.fulfill({contentType:"text/javascript",body:fs.readFileSync(path.join(ROOT,"public/runtime-config.js"),"utf8")});
    return url.origin===origin?route.continue():route.abort("blockedbyclient");
  });
  const page=context.pages()[0]||await context.newPage();
  await page.addInitScript(token=>{localStorage.setItem("starvault.guideSeen.v1","1");if(token)localStorage.setItem("sv_token",token);},presetToken);
  const requests=[];page.on("request",request=>{requests.push(request.url());assert.doesNotMatch(request.url(),/fixture-t15-access|fixture-t15-wrong/);});
  await page.goto(origin);
  await page.waitForFunction(()=>document.documentElement.dataset.runtime==="ready"&&window.StarVaultLocalApi);
  return {page,origin,dir,requests,store,rotate:async()=>{await stop();await start(NEXT_TOKEN);}};
}

test("T-15 first 401 offers a real credential flow; wrong/expired/cleared tokens never switch to local success or erase IndexedDB",{timeout:45000},async t=>{
  const f=await fixture(t),page=f.page,dialog=page.locator("#server-auth-dialog");
  await dialog.waitFor({state:"visible",timeout:2500});
  assert.equal(await page.evaluate(()=>window.StarVaultLocalApi.localModeForced()),false);
  await page.evaluate(()=>window.StarVaultIndexedDB.putValue("t15-retained-marker",{note:"retain through authentication"}));
  await page.locator("#server-auth-token").fill("fixture-t15-wrong");await page.locator("#server-auth-submit").click();
  await page.waitForFunction(()=>document.querySelector("#server-auth-status")?.dataset.status==="error");
  assert.equal(await page.evaluate(()=>window.StarVaultLocalApi.localModeForced()),false);
  assert.equal(await page.evaluate(()=>getAuthToken()),"");
  await page.locator("#server-auth-token").fill(TOKEN);await page.locator("#server-auth-submit").click();
  await dialog.waitFor({state:"hidden"});await page.waitForFunction(()=>state.projects.some(row=>row.fullName==="fixture/auth-export"));
  assert.equal(await page.evaluate(()=>state.config.authRequired),true);
  assert.equal(await page.evaluate(()=>getAuthToken()),TOKEN);
  for(const width of [1440,390])for(const language of ["zh","en"]) {
    await page.setViewportSize({width,height:900});await page.evaluate(language=>{state.language=language;applyTranslations();},language);
    await page.locator("#server-auth-button").click();await dialog.waitFor({state:"visible"});
    assert.equal(await page.locator("#server-auth-status").getAttribute("data-status"),"info","opening token management resets a previous failed attempt");
    assert.match(await page.locator("#server-auth-title").textContent(),language==="zh"?/访问令牌/:/access token/i);
    assert.equal(await page.locator("#server-auth-token").inputValue(),"","do not reveal stored credentials into the form");
    assert.ok(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+2));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`authenticated page overflow ${width}/${language}`);
    await page.screenshot({path:path.join(f.dir,`auth-${width}-${language}.png`)});
    await page.locator("#server-auth-close").click();
  }
  await page.route(f.origin+"/api/provider-test",route=>route.fulfill({status:401,json:{error:"Fixture provider authentication denied"}}));
  const providerError=await page.evaluate(()=>api("/api/provider-test",{method:"POST",body:"{}"}).catch(error=>({status:error.status})));
  assert.equal(providerError.status,401);assert.equal(await dialog.isVisible(),false,"a provider 401 is not a server login request");
  assert.equal(await page.evaluate(()=>getAuthToken()),TOKEN);
  await f.rotate();
  const rejectedExport=page.waitForResponse(response=>new URL(response.url()).pathname==="/api/export");
  await page.locator("#export-menu > summary").click();await page.locator('[data-export-format="csv"]').click();
  assert.equal((await rejectedExport).status(),401);assert.equal(page.url(),f.origin+"/");await dialog.waitFor({state:"visible"});
  const expired=await page.evaluate(()=>api("/api/config").then(()=>"unexpected success",error=>({status:error.status})));
  assert.equal(expired.status,401);await dialog.waitFor({state:"visible"});
  assert.equal(await page.evaluate(()=>window.StarVaultLocalApi.localModeForced()),false);
  await page.locator("#server-auth-token").fill(NEXT_TOKEN);await page.locator("#server-auth-submit").click();await dialog.waitFor({state:"hidden"});
  await page.locator("#server-auth-button").click();await page.locator("#server-auth-clear").click();
  assert.equal(await page.evaluate(()=>getAuthToken()),"");assert.equal(await dialog.isVisible(),true);
  assert.equal(await page.locator("#server-auth-status").getAttribute("data-status"),"info");
  const marker=await page.evaluate(()=>window.StarVaultIndexedDB.getValue("t15-retained-marker"));assert.deepEqual(marker,{note:"retain through authentication"});
  await page.locator("#server-auth-token").fill(NEXT_TOKEN);await page.locator("#server-auth-submit").click();await dialog.waitFor({state:"hidden"});
  assert.equal(await page.evaluate(()=>getAuthToken()),NEXT_TOKEN);
  assert.doesNotMatch(await page.locator("body").textContent(),/fixture-t15-access-[ab]|fixture-t15-wrong/);
  assert.equal(f.store.load().projects["fixture/auth-export"].stars,50);
});

test("T-15 loopback without AUTH_TOKEN initializes without an authentication barrier",{timeout:15000},async t=>{
  const f=await fixture(t,"",{serviceToken:""});
  await f.page.waitForFunction(()=>state.projects.some(row=>row.fullName==="fixture/auth-export"));
  t.diagnostic(JSON.stringify(await f.page.evaluate(()=>({authRequired:state.config.authRequired,authButtonHidden:document.querySelector("#server-auth-button").hidden,authButtonDisplay:getComputedStyle(document.querySelector("#server-auth-button")).display}))));
  assert.equal(await f.page.locator("#server-auth-dialog").isVisible(),false);assert.equal(await f.page.locator("#server-auth-button").isVisible(),false);
  assert.equal(await f.page.evaluate(()=>window.StarVaultLocalApi.localModeForced()),false);
});

test("T-15 static runtime initializes and exports locally without asking for the server access token",{timeout:15000},async t=>{
  const f=await fixture(t,"",{staticRuntime:true});
  await f.page.waitForFunction(()=>state.projects.length>0&&window.StarVaultLocalApi.isStaticDeployment());
  t.diagnostic(JSON.stringify(await f.page.evaluate(()=>({authRequired:state.config.authRequired,authButtonHidden:document.querySelector("#server-auth-button").hidden,authButtonDisplay:getComputedStyle(document.querySelector("#server-auth-button")).display}))));
  assert.equal(await f.page.locator("#server-auth-dialog").isVisible(),false);assert.equal(await f.page.locator("#server-auth-button").isVisible(),false);
  assert.equal(f.requests.some(url=>new URL(url).pathname.startsWith("/api/")),false,"static reads stay in the local adapter");
  const downloadPromise=f.page.waitForEvent("download");await f.page.locator("#export-menu > summary").click();await f.page.locator('[data-export-format="csv"]').click();
  const download=await downloadPromise;await download.saveAs(path.join(f.dir,"static-export.csv"));assert.match(fs.readFileSync(path.join(f.dir,"static-export.csv"),"utf8"),/仓库全名/);
});

test("T-15 existing Bearer credentials authorize actual CSV/JSON button downloads with server filename, encoding and raw format",{timeout:30000},async t=>{
  const f=await fixture(t,TOKEN),page=f.page;
  await page.waitForFunction(()=>state.projects.some(row=>row.fullName==="fixture/auth-export"));
  for(const language of ["zh","en"])for(const format of ["csv","json"]) {
    await page.evaluate(language=>{state.language=language;applyTranslations();},language);
    const responsePromise=page.waitForResponse(response=>new URL(response.url()).pathname==="/api/export"&&new URL(response.url()).searchParams.get("format")===format);
    const downloadPromise=page.waitForEvent("download",{timeout:4000});
    await page.locator("#export-menu > summary").click();await page.locator(`[data-export-format="${format}"]`).click();
    const [download,response]=await Promise.all([downloadPromise,responsePromise]);
    assert.equal(response.status(),200);assert.equal(response.request().headers().authorization,`Bearer ${TOKEN}`);
    assert.match(response.headers()["content-type"],format==="csv"?/text\/csv/:/application\/json/);
    assert.match(response.headers()["content-disposition"],new RegExp(download.suggestedFilename().replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
    assert.ok(download.suggestedFilename().endsWith("."+format));
    const file=path.join(f.dir,`download-${language}-${format}.${format}`);await download.saveAs(file);const text=fs.readFileSync(file,"utf8");
    if(format==="csv") {assert.ok(text.startsWith("\ufeff"));assert.match(text,/fixture\/auth-export/);assert.match(text,language==="zh"?/仓库全名/:/fullName/);}
    else {const payload=JSON.parse(text);const rows=language==="zh"?payload.项目:payload.items;assert.equal(rows.length,1);assert.equal(rows[0][language==="zh"?"仓库全名":"fullName"],"fixture/auth-export");}
    assert.doesNotMatch(text,/fixture-t15-access-[ab]/);assert.equal(page.url(),f.origin+"/");
  }
});
