const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {build}=require('esbuild'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
test('isolated desktop/mobile editor: dirty/revert, same-page save/publish, failures, leave choices, ID picker, keyboard/focus and attached forms',{timeout:120000},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-editor-'));
 await build({entryPoints:[path.join(__dirname,'fixtures/dictionaryEditor.jsx')],outfile:path.join(tmp,'fixture.js'),bundle:true,jsx:'automatic',platform:'browser',plugins:[{name:'isolated-services',setup(b){
 b.onLoad({filter:/infrastructure\/supabase\/client\.ts$/},()=>({contents:'export const getSupabase=()=>window.dictionaryClient; export const isSupabaseConfigured=()=>true;',loader:'js'}));
 b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`import React from '${path.join(root,'node_modules/react/index.js')}';export default function Link({children,...props}){return React.createElement('a',props,children);}`,loader:'js',resolveDir:root}));
 b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'nav'}));b.onLoad({filter:/.*/,namespace:'nav'},()=>({contents:'export const useRouter=()=>({push:href=>window.location.assign(href)});export const useSearchParams=()=>new URLSearchParams(window.location.search);',loader:'js'}));
 }}]});
 const css=(await require('postcss')([require('@tailwindcss/postcss')({base:root})]).process(fs.readFileSync(path.join(root,'src/app/globals.css'),'utf8'),{from:path.join(root,'src/app/globals.css')})).css;
 const server=http.createServer((req,res)=>{if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(tmp,'fixture.js')));}else if(req.url==='/fixture.css'){res.setHeader('Content-Type','text/css');res.end(css);}else if(req.url==='/closed'){res.end('<h1>已返回來源</h1>');}else res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox']});
 const errors=[];
 try{
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.getByRole('button',{name:'儲存',exact:true}).waitFor();
  const save=()=>page.getByRole('button',{name:'儲存',exact:true}),publish=()=>page.getByRole('button',{name:'發布',exact:true}),word=()=>page.getByLabel('單字',{exact:true});
  assert.equal(await save().isDisabled(),true);assert.equal(await publish().isDisabled(),true);assert.equal(await page.evaluate(()=>window.fixture.reviews.length),0);
  await word().fill('go-edited');assert.equal(await save().isEnabled(),true);await word().fill('go');assert.equal(await save().isDisabled(),true);
  // History navigation is guarded before a router can unmount the editor.
  await word().fill('history draft');await page.evaluate(()=>{window.history.pushState(null,'','?history=1');window.history.back();});await page.getByRole('dialog').getByRole('button',{name:'繼續編輯'}).click();assert.equal(await word().inputValue(),'history draft');await word().fill('go');
  // Empty sections have no form inputs; adding/removing and reverting clears dirty.
  assert.equal(await page.getByLabel('詞形',{exact:true}).count(),0);await page.getByRole('button',{name:'＋新增詞形變化'}).click();await page.getByLabel('變化類型').selectOption('past');await page.getByLabel('詞形',{exact:true}).fill('went');await page.getByRole('button',{name:'＋新增詞形變化'}).click();await page.getByLabel('變化類型').nth(1).selectOption('past_participle');await page.getByLabel('詞形',{exact:true}).nth(1).fill('gone');
  await save().click();await page.getByText('續編審核草稿 2',{exact:false}).waitFor();assert.equal(await save().isDisabled(),true);assert.equal(await page.evaluate(()=>window.fixture.snapshot.detail.inflections.length),0);assert.equal(await publish().isEnabled(),true);
  // Subsequent changes do not publish the older saved draft, and reverting clears dirty.
  await page.getByLabel('詞形',{exact:true}).first().fill('not-saved');await publish().click();await page.getByRole('alert').filter({hasText:'請先儲存'}).waitFor();assert.equal(await page.evaluate(()=>window.fixture.snapshot.detail.inflections.length),0);await page.getByLabel('詞形',{exact:true}).first().fill('went');assert.equal(await save().isDisabled(),true);
  await page.reload();await page.getByLabel('詞形',{exact:true}).first().waitFor();assert.equal(await page.getByLabel('詞形',{exact:true}).first().inputValue(),'went');assert.equal(await page.evaluate(()=>window.fixture.reviews.length),1);
  // Picker zero results, errors, multi-sense choice, self rejection, cancel/Escape and focus restoration.
  const add=page.getByRole('button',{name:'＋新增構詞關聯'});await add.focus();await page.keyboard.press('Enter');let modal=page.getByRole('dialog');await modal.getByLabel('搜尋詞條或中文義項').fill('missing');await modal.getByText('查無可連結',{exact:false}).waitFor();await page.keyboard.press('Escape');assert.equal(await modal.count(),0);assert.equal(await add.evaluate(el=>el===document.activeElement),true);assert.equal(await save().isDisabled(),true);
  await page.evaluate(()=>window.failSearch=true);await add.click();await modal.getByRole('alert').waitFor();await page.evaluate(()=>window.failSearch=false);await modal.getByRole('button',{name:'重試'}).click();await modal.getByRole('button',{name:/go · Word/}).waitFor();assert.equal(await modal.getByRole('button',{name:/go · Word/}).isDisabled(),true);await modal.getByLabel('搜尋詞條或中文義項').fill('poly');await modal.getByRole('button',{name:/poly · Word/}).click();await modal.getByRole('button',{name:/另一個義項/}).click();assert.equal(await modal.count(),0);assert.equal(await save().isEnabled(),true);
  await page.getByRole('button',{name:'移除構詞關聯'}).click();assert.equal(await save().isDisabled(),true);
  await add.click();await modal.getByLabel('搜尋詞條或中文義項').fill('un-');await modal.getByRole('button',{name:/un- · Prefix/}).click();await add.click();await modal.getByLabel('搜尋詞條或中文義項').fill('happy');await modal.getByRole('button',{name:/happy · Word/}).click();await page.getByRole('button',{name:'上移',exact:true}).nth(1).click();await save().click();await page.getByText('已儲存審核草稿',{exact:false}).waitFor();assert.deepEqual(await page.evaluate(()=>window.fixture.reviews[0].candidate.bundle.dictionary_relations.map(r=>r.target_entry_id)),['00000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000020']);
  // Native unload protection, cancel and failed save on leave keep all input.
  await word().fill('go changed');const protectedUnload=await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;});assert.equal(protectedUnload,true);
  await page.getByRole('link',{name:'返回來源清單'}).click();await modal.getByRole('button',{name:'繼續編輯'}).click();assert.equal(await word().inputValue(),'go changed');await page.evaluate(()=>window.failSave=true);await page.getByRole('link',{name:'返回來源清單'}).click();await modal.getByRole('button',{name:'儲存變更'}).click();await page.getByRole('alert').filter({hasText:'revision conflict'}).waitFor();assert.equal(await modal.count(),1);assert.equal(await word().inputValue(),'go changed');await page.evaluate(()=>window.failSave=false);await modal.getByRole('button',{name:'繼續編輯'}).click();await word().fill('go');
  // Publication conflict remains editable and retry succeeds only after confirmation.
  await page.evaluate(()=>window.failPublish=true);await publish().click();await modal.getByRole('button',{name:'發布',exact:true}).click();await page.getByRole('alert').filter({hasText:'Stale'}).waitFor();assert.equal(await page.evaluate(()=>window.fixture.snapshot.detail.inflections.length),0);await page.evaluate(()=>window.failPublish=false);await publish().click();await modal.getByRole('button',{name:'發布',exact:true}).click();await page.getByText('目前 Published revision 2',{exact:false}).waitFor();assert.equal(await page.evaluate(()=>window.fixture.snapshot.detail.inflections.length),2);
  await page.getByText('公開閱讀結果',{exact:true}).click();const reading=page.getByRole('article');await reading.getByText('(verb) go',{exact:true}).click();assert.ok(await reading.getByText('went',{exact:true}).count());assert.equal(await reading.getByRole('link',{name:'went',exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  // Save-and-leave resumes the original destination, reopening continues the same review.
  await word().fill('go final');await page.getByRole('link',{name:'返回來源清單'}).click();await modal.getByRole('button',{name:'儲存變更'}).click();await page.waitForURL(base+'/closed');await page.goto(base);await word().waitFor();assert.equal(await word().inputValue(),'go final');await word().fill('discarded');await page.getByRole('link',{name:'返回來源清單'}).click();await modal.getByRole('button',{name:'放棄變更'}).click();await page.waitForURL(base+'/closed');await page.goto(base);await word().waitFor();assert.equal(await word().inputValue(),'go final');
  await page.getByRole('link',{name:'返回來源清單'}).click();await page.waitForURL(base+'/closed');
  await context.close();
 }
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true});}
});
