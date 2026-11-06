const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {build}=require('esbuild'),{chromium,webkit}=require('playwright');
test('actual start button: local/cloud phases, bounded first-card data, resume, offline/reconnect, pending and remote changes',{timeout:300000},async()=>{
 const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-startup-'));
 await build({entryPoints:['tests/fixtures/studyStartup.jsx'],outfile:path.join(tmp,'app.js'),bundle:true,format:'esm',jsx:'automatic',define:{'process.env':JSON.stringify({NODE_ENV:'development'})},plugins:[{name:'isolation',setup(b){
 b.onLoad({filter:/infrastructure\/supabase\/client.ts$/},()=>({contents:'export const getSupabase=()=>window.dictionaryClient;',loader:'js'}));
 if(process.env.BASELINE)b.onLoad({filter:/(StudyRepository\.ts|StudySetView\.tsx|ScheduledStudySession\.tsx)$/},args=>({contents:fs.readFileSync(path.join(process.env.BASELINE_DIR,path.basename(args.path)),'utf8'),loader:args.path.endsWith('tsx')?'tsx':'ts'}));
 }}]});
 const css=(await require('postcss')([require('@tailwindcss/postcss')({base:root})]).process(fs.readFileSync('src/app/globals.css','utf8'),{from:path.join(root,'src/app/globals.css')})).css;
 const server=http.createServer((req,res)=>{if(req.url==='/app.js'){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(path.join(tmp,'app.js')));}else if(req.url==='/app.css')res.end(css);else res.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><div id="root"></div><script type="module" src="/app.js"></script></html>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const engine=process.env.STUDY_BROWSER==='webkit'?webkit:chromium,browser=await engine.launch({executablePath:engine===webkit?process.env.WEBKIT_EXECUTABLE:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',args:engine===chromium?['--no-sandbox']:[]}),results=[],errors=[];
 try{for(const count of [20,6300])for(const scenario of ['new','resume','offline','reconnect','pending','remote','endless','official',...(count===20?['cancel']:[])]){
  const context=await browser.newContext({viewport:{width:390,height:844}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:'+server.address().port+'/?count='+count+(scenario==='new'?'':'&'+scenario)+(scenario==='reconnect'?'&offline&resume':scenario==='offline'?'&resume':''));
  const start=p.getByRole('button',{name:'開始學習',exact:true});await start.waitFor().catch(async e=>{console.error({count,scenario,errors,body:await p.locator('body').innerText()});throw e;});await p.waitForTimeout(100);
  if(scenario==='reconnect')await p.evaluate(()=>{Object.defineProperty(navigator,'onLine',{get:()=>true,configurable:true});window.dispatchEvent(new Event('online'));});
  await p.evaluate(()=>window.measureStart());await start.evaluate(b=>{b.click();b.click();});if(scenario==='cancel'){await p.locator('[data-scheduled-study]').waitFor();await p.getByRole('button',{name:'Close fixture'}).click();await p.waitForTimeout(300);const exported=await p.evaluate(()=>window.startupRepo.exportData());assert.equal(exported.events.length,0);await context.close();continue;}await p.getByRole('button',{name:'翻至答案',exact:true}).waitFor();await p.waitForFunction(()=>window.metrics.first>0);
  if(scenario==='official'){await p.locator('[data-study-card] p[lang=en]').filter({hasText:'published word'}).waitFor();await p.evaluate(()=>window.metrics.officialReady=performance.now()-window.metrics.begin);}
  const m=await p.evaluate(()=>window.metrics);results.push({count,scenario,...m});
  const state=await p.evaluate(()=>window.startupRepo.exportData());assert.equal(state.sessions.filter(s=>s.completed_at==null).length,1);if(scenario==='resume'||scenario==='offline'||scenario==='reconnect')assert.equal(state.sessions[0].id,await p.evaluate(()=>window.startupExisting));
  if(scenario==='remote')assert.ok(state.cards.some(c=>c.front==='remote published-safe text'));
  assert.equal(state.events.filter(e=>e.kind==='introduce').length,scenario==='pending'?2:1);
  if(scenario==='offline')assert.equal(m.calls.filter(c=>c.name==='get_study_clear_times').length,0);else assert.equal(m.calls.filter(c=>c.name==='get_study_clear_times').length,2);
  if(!process.env.BASELINE){if(scenario!=='remote'){assert.equal(m.reads,2);assert.equal(m.records,count*2);}assert.equal(m.methods.snapshotIn.calls,1);assert.equal(m.methods.openScheduledSession.calls,1);}
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('BROWSER_STARTUP '+JSON.stringify(results));fs.writeFileSync(path.join('/tmp',process.env.BASELINE?'nexus-browser-before.json':'nexus-browser-after.json'),JSON.stringify(results,null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});}
});
