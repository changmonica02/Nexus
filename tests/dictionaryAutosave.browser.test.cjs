const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {build}=require('esbuild'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
test('autosave composition and adjacent editing: IME, newline, serialization, retry, invalid leave and bilingual responsive forms',{timeout:120000},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-editor-'));
 await build({entryPoints:[path.join(__dirname,'fixtures/dictionaryEditor.jsx')],outfile:path.join(tmp,'fixture.js'),bundle:true,jsx:'automatic',platform:'browser',plugins:[{name:'isolated-services',setup(b){
 b.onLoad({filter:/infrastructure\/supabase\/client\.ts$/},()=>({contents:'export const getSupabase=()=>window.dictionaryClient; export const isSupabaseConfigured=()=>true;',loader:'js'}));
 b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`import React from '${path.join(root,'node_modules/react/index.js')}';export default function Link({children,...props}){return React.createElement('a',props,children);}`,loader:'js',resolveDir:root}));
 b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'nav'}));b.onLoad({filter:/.*/,namespace:'nav'},()=>({contents:'export const useRouter=()=>({push:href=>window.location.assign(href)});export const useSearchParams=()=>new URLSearchParams(window.location.search);export const usePathname=()=>window.location.pathname;',loader:'js'}));
 }}]});
 const css=(await require('postcss')([require('@tailwindcss/postcss')({base:root})]).process(fs.readFileSync(path.join(root,'src/app/globals.css'),'utf8'),{from:path.join(root,'src/app/globals.css')})).css;
 const server=http.createServer((req,res)=>{if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(tmp,'fixture.js')));}else if(req.url==='/fixture.css'){res.setHeader('Content-Type','text/css');res.end(css);}else if(req.url.startsWith('/closed')){res.end('<h1>已返回來源</h1>');}else res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox']});
 const errors=[];
 try{

 for(const viewport of [{width:1280,height:900},{width:820,height:1180},{width:390,height:844},{width:320,height:844}]){
  const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/?etymology');
  const text=()=>page.getByLabel('英文字形 1',{exact:true}),hint=()=>page.getByLabel('中文提示 1',{exact:true});await text().waitFor();
  assert.equal(await text().inputValue(),'go');assert.equal(await page.locator('[data-segment-row]').count(),1);
  assert.equal(await page.getByLabel('單字',{exact:true}).count(),0);
  await text().fill('ab');await hint().fill('分離');await page.getByRole('button',{name:'＋新增構詞格',exact:true}).click();await page.getByLabel('英文字形 2',{exact:true}).fill('ort');await page.getByLabel('中文提示 2',{exact:true}).fill('出生');await page.getByRole('button',{name:'＋新增構詞格',exact:true}).click();await page.getByLabel('英文字形 3',{exact:true}).fill('ion');await page.getByLabel('中文提示 3',{exact:true}).fill('名詞');await page.getByLabel('英文字形 3',{exact:true}).press('Enter');
  await page.waitForFunction(()=>window.fixture.reviews[0]?.candidate.bundle.dictionary_entries[0].headword==='abortion');assert.equal(await page.evaluate(()=>window.fixture.snapshot.detail.entry.headword),'go');
  const entry=await page.evaluate(()=>window.fixture.reviews[0].candidate.bundle.dictionary_entries[0]);assert.equal(entry.id,'00000000-0000-4000-8000-000000000010');assert.equal(entry.word_segments.length,3);
  // No automatic target creation, and the optional picker hides quick-create.
  await page.locator('[data-segment-row] details summary').first().click();await page.getByRole('button',{name:'選擇正式字典連結（可選）',exact:true}).first().click();assert.equal(await page.getByRole('button',{name:/快速建立/}).count(),0);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.quickCalls||0),0);
  assert.equal(await page.getByRole('button',{name:/[上下]移構詞格/}).count(),0);await page.getByRole('button',{name:'移除構詞格 2',exact:true}).click();await page.waitForFunction(()=>window.fixture.reviews[0].candidate.bundle.dictionary_entries[0].headword==='abion');assert.equal(await page.getByLabel('英文字形 2',{exact:true}).inputValue(),'ion');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  // Composition does not submit before compositionend/blur.
  const before=await page.evaluate(()=>window.fixture.writes);await hint().focus();await hint().dispatchEvent('compositionstart');await hint().fill('新的中文');await hint().dispatchEvent('blur');await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.fixture.writes),before);await hint().dispatchEvent('compositionend');await hint().blur();await page.waitForFunction(()=>window.fixture.reviews[0].candidate.bundle.dictionary_entries[0].word_segments[0].hint==='新的中文');
  // Slow acknowledgement cannot overwrite a newer input. Each saved snapshot is serialized.
  await page.evaluate(()=>window.saveDelay=450);await hint().fill('first');await hint().press('Enter');await page.waitForTimeout(230);await hint().fill('second');await hint().press('Enter');await page.getByRole('button',{name:'移除構詞格 2',exact:true}).click();await page.waitForFunction(()=>window.fixture.reviews[0].candidate.bundle.dictionary_entries[0].word_segments[0].hint==='second');assert.equal(await hint().inputValue(),'second');await page.waitForFunction(()=>window.fixture.reviews[0].candidate.bundle.dictionary_entries[0].word_segments.length===1&&window.fixture.reviews[0].candidate.bundle.dictionary_entries[0].headword==='ab');assert.equal(await page.evaluate(()=>window.fixture.reviews.length),1);
  await page.evaluate(()=>{window.saveDelay=0;window.failSave=true;});await hint().fill('retry preserved');await hint().press('Enter');await page.getByText('儲存失敗',{exact:false}).first().waitFor();assert.equal(await hint().inputValue(),'retry preserved');await page.evaluate(()=>window.failSave=false);await page.getByRole('button',{name:'儲存／重試',exact:true}).click();await page.waitForFunction(()=>window.fixture.reviews[0].candidate.bundle.dictionary_entries[0].word_segments[0].hint==='retry preserved');
  const history=page.getByLabel('歷史詞源',{exact:true});await history.fill('line one');await history.press('Enter');await history.press('a');assert.equal(await history.inputValue(),'line one\na');await history.blur();await page.waitForFunction(()=>window.fixture.reviews[0].candidate.bundle.dictionary_etymologies[0].body==='line one\na');
  // An invalid segment blocks both manual save and adjacent navigation without losing input.
  await text().fill('');await page.getByRole('button',{name:'下一筆',exact:true}).click();assert.equal(new URL(page.url()).pathname,'/');assert.equal(await text().inputValue(),'');await text().fill('ab');await page.getByRole('button',{name:'下一筆',exact:true}).click();await page.waitForURL('**/closed?next');assert.equal(await page.evaluate(()=>window.fixture),undefined);
  await context.close();
 }
 for(const kind of ['prefix','root']){const context=await browser.newContext();const page=await context.newPage();await page.goto(base+'/?kind='+kind+'&lang=en');const meaning=page.getByLabel('Chinese meaning',{exact:true});await meaning.fill('stored Chinese unchanged');await meaning.press('Enter');await page.waitForFunction(()=>window.fixture.reviews[0]?.candidate.bundle.dictionary_senses[0].gloss_zh_tw==='stored Chinese unchanged');await page.getByRole('status').filter({hasText:'Draft saved'}).waitFor();assert.equal(await meaning.inputValue(),'stored Chinese unchanged');await context.close();}
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});}
});
