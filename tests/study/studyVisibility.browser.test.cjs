const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {build}=require('esbuild'),{chromium,webkit}=require('playwright');
test('hide/restore, stable active question and safe Session exit in real IndexedDB',{timeout:120000},async()=>{
 const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-startup-'));
 await build({entryPoints:['tests/fixtures/studyVisibility.jsx'],outfile:path.join(tmp,'app.js'),bundle:true,format:'esm',jsx:'automatic',define:{'process.env':JSON.stringify({NODE_ENV:'development'})},plugins:[{name:'isolation',setup(b){
 b.onLoad({filter:/infrastructure\/supabase\/client.ts$/},()=>({contents:'export const getSupabase=()=>window.dictionaryClient;',loader:'js'}));
 if(process.env.BASELINE)b.onLoad({filter:/(StudyRepository\.ts|StudySetView\.tsx|ScheduledStudySession\.tsx)$/},args=>({contents:fs.readFileSync(path.join(process.env.BASELINE_DIR,path.basename(args.path)),'utf8'),loader:args.path.endsWith('tsx')?'tsx':'ts'}));
 }}]});
 const css=(await require('postcss')([require('@tailwindcss/postcss')({base:root})]).process(fs.readFileSync('src/app/globals.css','utf8'),{from:path.join(root,'src/app/globals.css')})).css;
 const server=http.createServer((req,res)=>{if(req.url==='/app.js'){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(path.join(tmp,'app.js')));}else if(req.url==='/app.css')res.end(css);else res.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><div id="root"></div><script type="module" src="/app.js"></script></html>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));

 const engine=process.env.STUDY_BROWSER==='webkit'?webkit:chromium,browser=await engine.launch({executablePath:engine===webkit?process.env.WEBKIT_EXECUTABLE:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',args:engine===chromium?['--no-sandbox']:[]});
 const errors=[];
 try{
 const p=await browser.newPage({viewport:{width:320,height:800}});p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);
 const snapshot=()=>p.evaluate(()=>window.visibilityRepo.exportData());
 await p.getByRole('button',{name:'翻至答案',exact:true}).waitFor();await p.getByRole('button',{name:'翻至答案',exact:true}).click();
 await p.getByRole('button',{name:'隱藏字卡',exact:true}).waitFor({timeout:3000}).catch(async e=>{console.error(await p.locator('body').innerText(),errors);throw e;});await p.getByRole('button',{name:'隱藏字卡',exact:true}).click();const dialog=p.getByRole('dialog');await dialog.getByRole('button',{name:'取消',exact:true}).click();assert.equal((await snapshot()).events.filter(e=>e.kind==='review').length,0);
 await p.context().setOffline(true);await p.evaluate(()=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false}));
 await p.getByRole('button',{name:'隱藏字卡',exact:true}).click();await dialog.getByRole('button',{name:'隱藏',exact:true}).click();await dialog.waitFor({state:'hidden'});
 await p.evaluate(async()=>{window.hiddenBackup=await window.visibilityStorage.exportWorkspaceBackup();});
 const hidden=await snapshot(),hiddenCard=hidden.cards.find(c=>c.hidden);assert.equal(hiddenCard.front,'first');assert.equal(hidden.events.filter(e=>e.kind==='review').length,0);assert.equal(hidden.events.filter(e=>e.kind==='introduce').length,2);
 await p.evaluate(()=>{const original=window.visibilityRepo.rateSession.bind(window.visibilityRepo);window.visibilityRepo.rateSession=async input=>{await original(input);window.visibilityRepo.rateSession=original;throw Error('Uncertain local response');};});
 await p.getByRole('button',{name:'翻至答案',exact:true}).click();await p.getByRole('button',{name:/忘記/}).click();await p.getByRole('alert').filter({hasText:'Uncertain local response'}).waitFor();
 assert.equal((await snapshot()).events.filter(e=>e.kind==='review').length,1);
 await p.getByRole('button',{name:'離開',exact:true}).click();await dialog.getByRole('button',{name:'離開',exact:true}).click();await dialog.getByRole('alert').waitFor();assert.equal((await snapshot()).sessions[0].ended_at,undefined,'unknown answer result prevents exit');await dialog.getByRole('button',{name:'取消',exact:true}).click();
 await p.getByRole('button',{name:'重試儲存同一作答',exact:true}).click();await p.getByRole('button',{name:'翻至答案',exact:true}).waitFor();assert.equal((await snapshot()).events.filter(e=>e.kind==='review').length,1,'same action retry is idempotent');
 const active=await p.locator('[data-study-card] p[lang=en]').innerText();const real=await snapshot();
 await p.evaluate(()=>{const realNow=Date.now;Date.now=()=>realNow()+60001;window.dispatchEvent(new Event('nexus-study-changed'));});await p.waitForTimeout(1250);
 assert.equal(await p.locator('[data-study-card] p[lang=en]').innerText(),active,'due forgotten never preempts visible card');assert.deepEqual((await snapshot()).events,real.events);
 await p.getByRole('button',{name:'離開',exact:true}).click();await dialog.getByRole('button',{name:'取消',exact:true}).click();assert.equal(await p.locator('[data-study-card] p[lang=en]').innerText(),active);
 await p.evaluate(()=>{const original=window.visibilityRepo.endSession.bind(window.visibilityRepo);window.visibilityRepo.endSession=async(...args)=>{window.visibilityRepo.endSession=original;throw Error('Storage unavailable');};});
 await p.getByRole('button',{name:'離開',exact:true}).click();await dialog.getByRole('button',{name:'離開',exact:true}).click();await dialog.getByRole('alert').filter({hasText:'Storage unavailable'}).waitFor();assert.equal((await snapshot()).sessions[0].ended_at,undefined,'failed durable write keeps Session');
 await dialog.getByRole('button',{name:'離開',exact:true}).click();await dialog.waitFor({state:'hidden'});await p.getByRole('table').waitFor();
 const ended=await snapshot();assert.deepEqual(ended.events,real.events);assert.ok(ended.sessions[0].ended_at);assert.equal(ended.sessions[0].answers,1);assert.equal(ended.sessions[0].completed_at,null);
 await p.context().setOffline(false);await p.evaluate(()=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>true}));
 await p.evaluate(async()=>{const legacy=structuredClone(window.hiddenBackup);for(const card of legacy.study.cards){delete card.hidden;delete card.hidden_changed_at;card.updated_at=Date.now()+100;}await window.visibilityStorage.importWorkspaceBackup(legacy);});
 assert.equal((await snapshot()).cards.find(c=>c.id===hiddenCard.id).hidden,true,'old backup missing visibility cannot unhide');
 await p.getByRole('button',{name:'恢復字卡 first',exact:true}).click();await p.getByRole('button',{name:'隱藏字卡 first',exact:true}).waitFor();assert.equal((await snapshot()).cards.find(c=>c.id===hiddenCard.id).hidden,false);
 await p.evaluate(()=>window.visibilityStorage.importWorkspaceBackup(structuredClone(window.hiddenBackup)));assert.equal((await snapshot()).cards.find(c=>c.id===hiddenCard.id).hidden,false,'old hidden backup cannot undo a newer explicit restore');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});}
});
