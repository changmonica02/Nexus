require('./loadStudy.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {build}=require('esbuild'),{chromium}=require('playwright'),{PGlite}=require('@electric-sql/pglite');
const {installStudyClear}=require('./fixtures/studyClearDatabase.cjs');
test('history-only clear entry retains named confirmation and real SQL; offline refusal, dropped reply retry, keyboard/focus and bilingual responsive layout',{timeout:120000},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-clear-')),root=path.resolve(__dirname,'..'),pg=new PGlite();let server,browser;
 try{
  await pg.exec(`create schema auth;create role authenticated;create role anon;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
  for(const file of ['20260922_study_fsrs.sql','20261016_study_reliability.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
  await installStudyClear(pg);await pg.exec(`insert into auth.users values('11111111-1111-4111-8111-111111111111');select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);`);
  await build({entryPoints:['tests/fixtures/studyClear.jsx'],outfile:path.join(tmp,'fixture.js'),bundle:true,format:'esm',jsx:'automatic',define:{'process.env':JSON.stringify({NODE_ENV:'development'})},plugins:[{name:'client',setup(b){b.onLoad({filter:/infrastructure[\\/]supabase[\\/]client\.ts$/},()=>({contents:'export const getSupabase=()=>window.studyClearClient;export const isSupabaseConfigured=()=>true;',loader:'js'}));}}]});
  const css=(await require('postcss')([require('@tailwindcss/postcss')({base:root})]).process(fs.readFileSync('src/app/globals.css','utf8'),{from:path.join(root,'src/app/globals.css')})).css;
  let clearCalls=0;
  server=http.createServer(async(req,res)=>{try{
   if(req.url==='/fixture.js'){res.setHeader('content-type','application/javascript');return res.end(fs.readFileSync(path.join(tmp,'fixture.js')));}
   if(req.url==='/fixture.css')return res.end(css);
   if(req.method==='POST'){
    let body='';for await(const chunk of req)body+=chunk;
    const input=JSON.parse(body);res.setHeader('content-type','application/json');
    if(req.url==='/register'){await pg.query("insert into pages values($1,'11111111-1111-4111-8111-111111111111','study_set',null)",[input.id]);return res.end('{}');}
    const {name,args}=input;let result;
    if(name==='get_study_clear_times')result=await pg.query('select get_study_clear_times() value');
    else if(name==='clear_study_deck'){clearCalls++;result=await pg.query('select clear_study_deck($1,$2,$3) value',[args.deck_id,args.operation_id,args.expected_cleared_at]);}
    else if(name==='pull_study_changes')result=await pg.query('select pull_study_changes($1) value',[args.after_sequence]);
    else if(name==='apply_study_operation')result=await pg.query('select apply_study_operation($1) value',[JSON.stringify(args.operation)]);
    else if(name==='apply_study_resolution')result=await pg.query('select apply_study_resolution($1) value',[JSON.stringify(args.operation)]);
    else throw Error('Unexpected RPC '+name);
    return res.end(JSON.stringify({data:result.rows[0].value,error:null}));
   }
   res.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script type="module" src="/fixture.js"></script></html>');
  }catch(error){res.end(JSON.stringify({error:{message:error.message}}));}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
  const errors=[];
  for(const [width,lang] of [[1280,'zh-TW'],[820,'en'],[390,'zh-TW'],[320,'en']]){
   const context=await browser.newContext({viewport:{width,height:950}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/?lang=${lang}`);
   const en=lang==='en',manage=page.getByRole('button',{name:en?'Clear learning history':'清除學習紀錄',exact:true}),history=page.getByRole('button',{name:en?'Review history':'複習紀錄',exact:true});
   await history.waitFor();assert.equal(await manage.count(),0,'management has no clear action');assert.equal(await page.getByRole('dialog').count(),0);await history.click();const clearHistory=page.getByRole('button',{name:en?'Clear history':'清除紀錄',exact:true});
   await clearHistory.click();const dialog=page.getByRole('dialog'),confirm=dialog.getByRole('button',{name:en?'Permanently clear':'確認清除',exact:true});
   assert.equal(await confirm.isDisabled(),true);await dialog.getByRole('textbox').fill('wrong');assert.equal(await confirm.isDisabled(),true);
   await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await clearHistory.evaluate(el=>el===document.activeElement),true);
   await clearHistory.click();
   await dialog.getByRole('textbox').fill('清除測試');await context.setOffline(true);const initialCalls=clearCalls;await confirm.click();await dialog.getByRole('alert').waitFor();assert.equal(clearCalls,initialCalls);
   assert.equal((await page.evaluate(()=>window.clearFixture.repo.readDeck(window.clearFixture.page.id,true))).events.filter(e=>e.kind==='review').length,1);
   await context.setOffline(false);
   let lose=true;await page.route('**/rpc',async route=>{const input=route.request().postDataJSON();if(lose&&input.name==='clear_study_deck'){lose=false;await route.fetch();await route.fulfill({json:{error:{message:'response lost'}}});}else await route.continue();});
   await confirm.click();await page.waitForFunction(()=>document.querySelector('dialog [role=alert]')?.textContent.includes('response lost'));
   const first=(await pg.query('select cleared_at,operation_id from study_deck_clears where deck_id=$1',[await page.evaluate(()=>window.clearFixture.page.id)])).rows[0];
   await confirm.click();await dialog.waitFor({state:'detached'});
   assert.match(await page.getByRole('status').innerText(),en?/Learning history cleared/:/學習紀錄已清除/);
   assert.deepEqual((await pg.query('select cleared_at,operation_id from study_deck_clears where deck_id=$1',[await page.evaluate(()=>window.clearFixture.page.id)])).rows[0],first);
   const data=await page.evaluate(()=>window.clearFixture.repo.readDeck(window.clearFixture.page.id,true));assert.equal(data.events.length,0);assert.equal(data.sessions.length,0);assert.equal(data.cards.length,2);assert.ok(data.states.every(s=>s.introduced_at===null&&s.fsrs===null));
   const position=await clearHistory.evaluate(el=>{const header=el.closest('header');return {inside:!!header,overflow:document.documentElement.scrollWidth>innerWidth};});assert.equal(position.inside,true);assert.equal(position.overflow,false);
   await page.getByRole('button',{name:en?'All cards':'返回全部預覽',exact:true}).click();
   await page.getByRole('button',{name:/查看字卡|View cards/}).first().click();assert.equal(await manage.count(),0);assert.equal(await clearHistory.count(),0);
   await context.close();
  }
  assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));await pg.close();fs.rmSync(tmp,{recursive:true,force:true});}
});
