const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const commands = ['ssh', 'rsync', 'curl', 'sudo', 'nginx', 'systemctl', 'rm', 'install', 'cp', 'ln', 'mv', 'chown', 'find', 'readlink', 'sha256sum', 'tee'];
// These fixtures are disposable deployment targets. Even their rm operations are
// intercepted as rename into retained/, so no test deletes any file or contacts a host.
const shimSource = String.raw`#!/usr/bin/env node
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const root = process.env.MOCK_ROOT, command = path.basename(process.argv[1]), args = process.argv.slice(2);
const stateFile = path.join(root, 'state.json');
const state = () => JSON.parse(fs.readFileSync(stateFile, 'utf8'));
const update = value => fs.writeFileSync(stateFile, JSON.stringify(value));
const fail = message => {console.error('MOCK: ' + message); process.exit(73);};
const safe = value => { const resolved = path.resolve(value); if (!resolved.startsWith(root + path.sep)) fail('outside fixture: ' + value); return resolved; };
const exists = value => {try {fs.lstatSync(value); return true;} catch {return false;}};
const retain = value => {safe(value); if (exists(value)) {fs.mkdirSync(path.join(root,'retained'),{recursive:true}); fs.renameSync(value,path.join(root,'retained',crypto.randomUUID()+'-'+path.basename(value)));}};
const audit = {command,args,rollback: process.env.MOCK_ROLLBACK === '1'};
fs.appendFileSync(path.join(root,'calls.jsonl'), JSON.stringify(audit)+'\n');
const run = (program, argv, env = process.env) => {const result=spawnSync(program,argv,{env,stdio:'inherit'});process.exit(result.status ?? 74);};
const rollback = process.env.MOCK_ROLLBACK === '1';
const current = state();
if (command === 'ssh') {
  if (!args.includes('deploy-fixture.invalid')) fail('unauthorized host');
  const code = args.at(-1);
  // Only this copied script is interpreted; network and privileged tools remain shims.
  if (!code.includes(root) || /\/usr\/bin\/(ssh|curl|rsync|sudo)|\/bin\/rm/.test(code)) fail('unisolated remote command');
  const restoring = code.includes('failed=0');
  if (restoring) {current.rollbackSeen = true; update(current);}
  run('/bin/bash',['-c',code],{...process.env,MOCK_ROLLBACK:restoring?'1':'0'});
} else if (command === 'sudo') {
  if (args[0] !== '-n' || !['install','cp','ln','mv','chown','test','cmp','cat','tee','rm','nginx','systemctl'].includes(args[1])) fail('unapproved sudo command');
  run(args[1],args.slice(2));
} else if (command === 'rsync') {
  const from = args.at(-2), destination=args.at(-1);
  const remote = destination.startsWith('deploy-fixture.invalid:');
  if (destination.includes(':') && !remote) fail('unapproved rsync host');
  const to = safe(remote ? destination.slice('deploy-fixture.invalid:'.length) : destination);
  if(remote && !args.includes('--rsync-path=sudo rsync')) fail('remote upload must use the existing privileged rsync boundary');
  if (remote && ((current.fault==='upload-site' && from.endsWith('/')) || (current.fault==='upload-config' && !from.endsWith('/')))) fail(current.fault);
  safe(from);
  if (from.endsWith('/')) {fs.mkdirSync(to,{recursive:true}); for (const file of fs.readdirSync(from)) fs.cpSync(path.join(from,file),path.join(to,file),{recursive:true});}
  else {fs.mkdirSync(path.dirname(to),{recursive:true}); fs.copyFileSync(from,to);}
} else if (command === 'install') {
  const positional=[]; let directory=false;
  for(let i=0;i<args.length;i++){if(args[i]==='-d'){directory=true;continue;} if(['-m','-o','-g'].includes(args[i])){i++;continue;} positional.push(safe(args[i]));}
  if(directory) positional.forEach(file=>fs.mkdirSync(file,{recursive:true}));
  else {if(rollback && current.rollbackFault==='config') fail('rollback config');fs.mkdirSync(path.dirname(positional[1]),{recursive:true});fs.copyFileSync(positional[0],positional[1]);}
} else if (command === 'cp') {
  const from=safe(args.at(-2)), to=safe(args.at(-1)); fs.copyFileSync(from,to);
} else if (command === 'ln') {
  const from=args.at(-2),to=safe(args.at(-1));
  if(rollback && current.rollbackFault==='link') fail('rollback link');
  safe(path.isAbsolute(from)?from:path.resolve(path.dirname(to),from)); retain(to);fs.symlinkSync(from,to);
} else if (command === 'mv') {
  const from=safe(args.at(-2)),to=safe(args.at(-1));
  if(!rollback && current.fault==='switch' && to===process.env.WEB_ROOT) fail('switch');
  retain(to); fs.renameSync(from,to);
} else if (command === 'rm') {
  if(current.fault==='cleanup' && args.includes('-rf') && args.some(value=>value.includes('/remote/releases/'))) fail('cleanup');
  for(const value of args.filter(value=>!value.startsWith('-'))) retain(value);
} else if (command === 'chown') {
  safe(args.at(-1)); // Ownership is deliberately not changed by a local mock.
} else if (command === 'nginx') {
  if(args.join(' ')!=='-t') fail('unknown nginx call');
  const latest=state(); latest.nginxCount=(latest.nginxCount||0)+1;update(latest);
  if(rollback && latest.rollbackFault==='nginx') fail('rollback nginx');
  if(!rollback && ((latest.fault==='precheck' && latest.nginxCount===1)||(latest.fault==='postcheck' && latest.nginxCount===2))) fail('nginx check');
} else if (command === 'systemctl') {
  if(args.join(' ')!=='reload nginx') fail('unknown systemctl call');
  if((rollback && current.rollbackFault==='reload')||(!rollback && current.fault==='reload')) fail('reload');
} else if (command === 'readlink') {
  const target=safe(args.at(-1)); process.stdout.write((args.includes('-f')?fs.realpathSync(target):fs.readlinkSync(target))+'\n');
} else if (command === 'tee') {
  const target=safe(args.at(-1));const bytes=fs.readFileSync(0);fs.writeFileSync(target,bytes);process.stdout.write(bytes);
} else if (command === 'sha256sum') {
  process.stdout.write(crypto.createHash('sha256').update(fs.readFileSync(0)).digest('hex')+'  -\n');
} else if (command === 'find') {
  const target=safe(args[0]);if(args.includes('-printf')) {
    if(current.fault==='cleanup-list') fail('cleanup listing');
    for(const item of fs.readdirSync(target)){const file=path.join(target,item);if(fs.statSync(file).isDirectory())process.stdout.write(fs.statSync(file).mtimeMs/1000+' '+file+'\n');}
  } else {for(const item of fs.readdirSync(target,{recursive:true})) if(path.basename(item)==='.DS_Store'){process.stdout.write(path.join(target,item)+'\n');break;}}
} else if (command === 'curl') {
  const url=args.find(arg=>arg.startsWith('https://'));
  if(!url?.startsWith('https://deploy-fixture.invalid/')) fail('unapproved curl URL');
  if(args.includes('-X') && (!args.includes('x-api-key: starvault-deploy-probe') || !url.endsWith('/api/exa/search'))) fail('unapproved request');
  if(current.rollbackSeen && current.rollbackFault==='home') fail('rollback HTTP');
  if(current.rollbackSeen && current.rollbackFault==='home-version') {process.stdout.write('wrong old version');process.exit(0);}
  if(url.endsWith('/api/exa/search')) {process.stdout.write(current.fault==='exa-status'?'gateway failed\n502':current.fault==='exa-body'?'unexpected\n401':'{"error":"INVALID_API_KEY"}\n401');}
  else if(url.endsWith('/runtime-config.js')) {if(current.fault==='runtime-http') fail('runtime HTTP');process.stdout.write(current.fault==='runtime-version'?'wrong config':current.fault==='runtime-content'?'window.__STARVAULT_DEPLOYMENT__ = \"server\"; // /api/exa/search':fs.readFileSync(path.join(process.env.WEB_ROOT,'runtime-config.js')));}
  else {if(!current.rollbackSeen && current.fault==='home-http') fail('home HTTP');let page=fs.readFileSync(path.join(process.env.WEB_ROOT,'index.html'),'utf8');if(!current.rollbackSeen && current.fault==='filing') page=page.replaceAll(process.env.ICP_NUMBER,'missing filing');process.stdout.write(!current.rollbackSeen && current.fault==='home-version'?'old cached homepage':page);}
} else fail('unknown shim '+command);
`;

function fixture({ priorWeb = true, priorConfig = true, relativeWeb = false } = {}) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'starvault-t16-disposable-'));
  for(const directory of ['deploy/nginx','scripts','public','bin','tmp','remote/releases']) fs.mkdirSync(path.join(root,directory),{recursive:true});
  fs.copyFileSync(path.join(projectRoot,'deploy/deploy-static.sh'),path.join(root,'deploy/deploy-static.sh'));
  fs.copyFileSync(path.join(projectRoot,'scripts/inject-runtime-config.js'),path.join(root,'scripts/inject-runtime-config.js'));
  fs.writeFileSync(path.join(root,'public/index.html'),'<html>new fixture</html>\n<!-- deployment:extra-footer-link -->\n');
  fs.writeFileSync(path.join(root,'public/demo-snapshot.json'),'{}');
  fs.copyFileSync(path.join(projectRoot,'public/runtime-config.js'),path.join(root,'public/runtime-config.js'));
  fs.writeFileSync(path.join(root,'deploy/nginx/starvault.deline.top.conf'),'new nginx fixture');
  fs.writeFileSync(path.join(root,'fixture.key'),'NO REAL PRIVATE KEY');
  fs.writeFileSync(path.join(root,'shim.cjs'),shimSource,{mode:0o755});
  commands.forEach(command=>fs.symlinkSync(path.join(root,'shim.cjs'),path.join(root,'bin',command)));
  const prior=path.join(root,'remote/releases/previous'), web=path.join(root,'remote/site'), conf=path.join(root,'remote/nginx.conf');
  for(let i=0;i<4;i++) {const directory=i===0?prior:path.join(root,'remote/releases/old-'+i);fs.mkdirSync(directory);fs.writeFileSync(path.join(directory,'index.html'),'old homepage '+i+'\n');fs.writeFileSync(path.join(directory,'runtime-config.js'),'old runtime');fs.utimesSync(directory,1000+i,1000+i);}
  if(priorWeb) fs.symlinkSync(relativeWeb?'releases/previous':prior,web);
  if(priorConfig) fs.writeFileSync(conf,'original nginx fixture');
  fs.writeFileSync(path.join(root,'state.json'),JSON.stringify({}));
  const env={PATH:path.join(root,'bin')+':'+process.env.PATH, MOCK_ROOT:root, TMPDIR:path.join(root,'tmp'),HOST:'deploy-fixture.invalid', DOMAIN:'deploy-fixture.invalid', SSH_KEY:path.join(root,'fixture.key'),WEB_ROOT:web,DEPLOY_ROOT:path.join(root,'remote'),NGINX_TARGET:conf,RELEASES_TO_KEEP:'1',EXA_PROXY_PATH:'/api/exa/search',FILING_FILE:path.join(root,'nonexistent-filing'),NODE_OPTIONS:'', ICP_NUMBER:''};
  // Prove the entire executable boundary is intercepted BEFORE invoking the copied script.
  for(const command of commands){const located=spawnSync('/bin/bash',['-c','command -v "$1"','shim-check',command],{env,encoding:'utf8'});assert.equal(located.status,0);assert.equal(located.stdout.trim(),path.join(root,'bin',command));}
  return {root,prior,web,conf,env};
}
function deploy(f, fault='', rollbackFault='') {
  fs.writeFileSync(path.join(f.root,'state.json'),JSON.stringify({fault,rollbackFault}));
  const result=spawnSync('/bin/bash',[path.join(f.root,'deploy/deploy-static.sh')],{env:f.env,encoding:'utf8',timeout:60000});
  fs.writeFileSync(path.join(f.root,'last-run.log'),result.stdout+'\n'+result.stderr);
  assert.equal(result.error,undefined,result.error?.message);
  const calls=fs.readFileSync(path.join(f.root,'calls.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line));
  console.log('T-16 retained isolated fixture:',f.root,'fault:',fault||'none','rollbackFault:',rollbackFault||'none');
  return {...result,calls};
}
function cleanupCalls(calls) {return calls.filter(call=>call.command==='rm' && call.args.includes('-rf') && call.args.some(value=>value.includes('/remote/releases/')));}
test('T-16 completion message survives the deployment UTF-8 locale', () => {
  const completion = fs.readFileSync(path.join(projectRoot, 'deploy/deploy-static.sh'), 'utf8').trim().split('\n').at(-1);
  for (const locale of ['C', 'C.UTF-8']) {
    const result = spawnSync('/bin/bash', ['-uc', `DOMAIN=deploy-fixture.invalid; STATE_DIR=/fixture/restore; ${completion}`], { env: { PATH: process.env.PATH, LANG: locale, LC_ALL: locale }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /部署完成：https:\/\/deploy-fixture.invalid\/（恢复资料：\/fixture\/restore）/);
  }
});
function assertRestored(f,result,{priorWeb=true,priorConfig=true,relativeWeb=false}={}) {
  assert.notEqual(result.status,0,result.stdout+result.stderr);
  assert.match(result.stderr,/已恢复发布前/);
  assert.doesNotMatch(result.stderr,/回滚失败/);
  if(priorWeb){assert.equal(fs.readlinkSync(f.web),relativeWeb?'releases/previous':f.prior);assert.equal(fs.readFileSync(path.join(f.web,'index.html'),'utf8'),'old homepage 0\n');}
  else assert.equal(fs.existsSync(f.web),false);
  if(priorConfig)assert.equal(fs.readFileSync(f.conf,'utf8'),'original nginx fixture'); else assert.equal(fs.existsSync(f.conf),false);
  assert.equal(cleanupCalls(result.calls).length,0,'failure must never clean releases');
}

for(const fault of ['upload-site','upload-config','switch','precheck','postcheck','reload','home-http','home-version','runtime-http','runtime-version','runtime-content','exa-status','exa-body']) {
  test('T-16 isolated '+fault+' restores static target and nginx config',()=>{const f=fixture();const result=deploy(f,fault);assertRestored(f,result);assert.equal(result.status,['home-version','runtime-http','runtime-version','runtime-content','exa-status','exa-body'].includes(fault)?1:73);});
}
for(const options of [{priorWeb:false,priorConfig:false},{priorWeb:true,priorConfig:false},{priorWeb:false,priorConfig:true},{relativeWeb:true}]) {
  test('T-16 original absence/relative target '+JSON.stringify(options),()=>{const f=fixture(options);assertRestored(f,deploy(f,'exa-body'),options);});
}
for(const rollbackFault of ['link','config','nginx','reload','home','home-version']) {
  test('T-16 rollback '+rollbackFault+' failure is explicitly separate',()=>{const f=fixture();const result=deploy(f,'exa-status',rollbackFault);assert.equal(result.status,1);assert.match(result.stderr,/Exa 代理未生效/);assert.match(result.stderr,/回滚失败：不能确认旧版本已恢复/);assert.doesNotMatch(result.stderr,/已恢复发布前/);assert.equal(cleanupCalls(result.calls).length,0);});
}
test('T-16 success probes new release before cleanup and protects the prior target',()=>{
  const f=fixture({relativeWeb:true});const result=deploy(f);assert.equal(result.status,0,result.stdout+result.stderr);const target=fs.readlinkSync(f.web);assert.notEqual(target,f.prior);assert.match(fs.readFileSync(path.join(f.web,'index.html'),'utf8'),/starvault-release:/);assert.equal(fs.readFileSync(f.conf,'utf8'),'new nginx fixture');assert.ok(fs.existsSync(f.prior));const cleanup=cleanupCalls(result.calls);assert.equal(cleanup.length,3);const exaIndex=result.calls.findLastIndex(call=>call.command==='curl'&&call.args.some(value=>value.endsWith('/api/exa/search')));assert.ok(result.calls.indexOf(cleanup[0])>exaIndex);assert.equal(result.calls.some(call=>call.command==='rm'&&call.args.some(value=>value===f.prior)),false);
});
test('T-16 consecutive releases restore their own predecessor, not a stale .prev',()=>{
  const f=fixture();const first=deploy(f);assert.equal(first.status,0,first.stderr);const firstTarget=fs.readlinkSync(f.web), firstPage=fs.readFileSync(path.join(f.web,'index.html'),'utf8');fs.writeFileSync(path.join(f.root,'deploy/nginx/starvault.deline.top.conf'),'second nginx fixture');const start=first.calls.length;const second=deploy(f,'exa-status');assert.notEqual(second.status,0);assert.match(second.stderr,/已恢复发布前/);assert.equal(fs.readlinkSync(f.web),firstTarget);assert.equal(fs.readFileSync(path.join(f.web,'index.html'),'utf8'),firstPage);assert.equal(fs.readFileSync(f.conf,'utf8'),'new nginx fixture');assert.equal(cleanupCalls(second.calls.slice(start)).length,0);const states=fs.readdirSync(path.join(f.root,'remote')).filter(name=>name.startsWith('.restore-'));assert.equal(states.length,2);assert.notEqual(states[0],states[1]);assert.equal(second.calls.some(call=>call.args.some(value=>value.includes('starvault.deline.top.conf.prev'))),false);
});
test('T-16 refuses a pre-existing non-symlink WEB_ROOT before changing it or nginx',()=>{
  const f=fixture({priorWeb:false});fs.mkdirSync(f.web);fs.writeFileSync(path.join(f.web,'index.html'),'untouched directory');const result=deploy(f);assert.notEqual(result.status,0);assert.match(result.stderr,/不是软链接/);assert.equal(fs.readFileSync(path.join(f.web,'index.html'),'utf8'),'untouched directory');assert.equal(fs.readFileSync(f.conf,'utf8'),'original nginx fixture');assert.equal(result.calls.some(call=>call.rollback),false);assert.equal(cleanupCalls(result.calls).length,0);
});

test('T-16 cleanup failure reports accepted new deployment without pretending rollback',()=>{
  const f=fixture();const result=deploy(f,'cleanup');assert.notEqual(result.status,0);assert.match(result.stderr,/发布验收已通过，但旧版本清理失败/);assert.doesNotMatch(result.stderr,/已恢复发布前|回滚失败/);assert.match(fs.readFileSync(path.join(f.web,'index.html'),'utf8'),/starvault-release:/);assert.ok(fs.existsSync(f.prior));assert.equal(result.calls.some(call=>call.rollback),false);assert.doesNotMatch(result.stdout,/部署完成/);
});

test('T-16 missing filing after switch restores the original release and config',()=>{
  const f=fixture();f.env.ICP_NUMBER='粤ICP备00000000号';const result=deploy(f,'filing');assertRestored(f,result);assert.match(result.stderr,/线上页面未包含备案信息/);assert.equal(result.status,1);
});
test('T-16 release listing failure is reported after acceptance, without deleting releases',()=>{
  const f=fixture();const result=deploy(f,'cleanup-list');assert.equal(result.status,73);assert.match(result.stderr,/发布验收已通过，但旧版本清理失败/);assert.match(fs.readFileSync(path.join(f.web,'index.html'),'utf8'),/starvault-release:/);assert.ok(fs.existsSync(f.prior));assert.equal(cleanupCalls(result.calls).length,0);assert.equal(result.calls.some(call=>call.rollback),false);
});
