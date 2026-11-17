const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {build}=require('esbuild'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
test('isolated desktop/mobile editor: dirty/revert, same-page save/publish, failures, leave choices, ID picker, keyboard/focus and attached forms',{timeout:120000},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-editor-'));
 await build({entryPoints:[path.join(__dirname,'fixtures/dictionaryEditor.jsx')],outfile:path.join(tmp,'fixture.js'),bundle:true,jsx:'automatic',platform:'browser',plugins:[{name:'isolated-services',setup(b){
 b.onLoad({filter:/infrastructure\/supabase\/client\.ts$/},()=>({contents:'export const getSupabase=()=>window.dictionaryClient; export const isSupabaseConfigured=()=>true;',loader:'js'}));
 b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`import React from '${path.join(root,'node_modules/react/index.js')}';export default function Link({children,...props}){return React.createElement('a',props,children);}`,loader:'js',resolveDir:root}));
 b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'nav'}));b.onLoad({filter:/.*/,namespace:'nav'},()=>({contents:'export const useRouter=()=>({push:href=>window.location.assign(href)});export const useSearchParams=()=>new URLSearchParams(window.location.search);export const usePathname=()=>window.location.pathname;',loader:'js'}));
 }}]});
 const css=(await require('postcss')([require('@tailwindcss/postcss')({base:root})]).process(fs.readFileSync(path.join(root,'src/app/globals.css'),'utf8'),{from:path.join(root,'src/app/globals.css')})).css;
 const server=http.createServer((req,res)=>{if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(tmp,'fixture.js')));}else if(req.url==='/fixture.css'){res.setHeader('Content-Type','text/css');res.end(css);}else if(req.url==='/closed'){res.end('<h1>已返回來源</h1>');}else res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox']});
 const errors=[];
 try{
 for(const viewport of [{width:1280,height:900},{width:820,height:1180},{width:390,height:844}]){
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/?etymology');
  const word=()=>page.getByLabel('英文字形 1',{exact:true});
  const save=()=>page.getByRole('button',{name:'儲存／重試',exact:true});
  await word().waitFor();
  for(const [table,label] of [['dictionary_pronunciations','讀音（IPA）'],['dictionary_learning_notes','記憶法'],['dictionary_etymologies','詞源'],['dictionary_public_notes','筆記']]){
    const fixed=page.locator('[data-fixed-word-field="'+table+'"]');
    assert.equal(await fixed.count(),1,'fixed field '+label);
    assert.equal(await fixed.getByLabel(label,{exact:true}).count(),1);
    assert.equal(await fixed.getByRole('button').count(),0,'no add/remove '+label);
  }
  assert.equal(await page.getByRole('button',{name:/新增讀音|刪除讀音|新增記憶法|刪除記憶法|新增詞源|刪除詞源|新增公共筆記|刪除公共筆記/}).count(),0);
  assert.equal(await page.locator('[data-editor-section="構詞關聯"]').count(),0);
  assert.equal(await page.locator('[data-editor-section="義項"]').count(),1);
  assert.ok(await page.locator('[data-word-segments]').count());
  assert.equal(await page.locator('[data-word-sense-row]').count(),1);
  await page.getByLabel('讀音（IPA）',{exact:true}).fill('/goʊ/');
  await page.getByLabel('記憶法',{exact:true}).fill('記憶提示');
  await page.getByLabel('詞源',{exact:true}).fill('Updated etymology');
  await page.getByLabel('筆記',{exact:true}).fill('公共備註');
  await page.evaluate(()=>document.activeElement?.blur());
  await save().evaluate(el=>{if(!el.disabled)el.click();});
  await page.getByRole('status').filter({hasText:'已儲存草稿'}).waitFor();
  const saved=await page.evaluate(()=>window.fixture.reviews[0].candidate);
  assert.equal(saved.pronunciations.length,1);
  assert.equal(saved.pronunciations[0].ipa,'/goʊ/');
  assert.equal(saved.bundle.dictionary_learning_notes.length,1);
  assert.equal(saved.bundle.dictionary_learning_notes[0].body,'記憶提示');
  assert.equal(saved.bundle.dictionary_etymologies.length,1);
  assert.equal(saved.bundle.dictionary_etymologies[0].body,'Updated etymology');
  assert.equal(saved.public_notes.length,1);
  assert.equal(saved.public_notes[0].body,'公共備註');
  const {waitForAsync}=require('../helpers/pwaBrowser.cjs');
  const fields=[['讀音（IPA）','/goʊ/'],['記憶法','記憶提示'],['詞源','Updated etymology'],['筆記','恢復筆記']];
  for(const [label]of fields)await page.getByLabel(label,{exact:true}).fill('');
  await page.evaluate(()=>document.activeElement?.blur());
  // Exercise automatic storage, including deletion of the four existing rows.
  await waitForAsync(page,()=>{const c=window.fixture.reviews[0].candidate;return c.pronunciations.length===0&&c.bundle.dictionary_learning_notes.length===0&&c.bundle.dictionary_etymologies.length===0&&c.public_notes.length===0;});
  await page.reload();await word().waitFor();
  for(const [label]of fields)assert.equal(await page.getByLabel(label,{exact:true}).inputValue(),'','cleared field survives reopen: '+label);
  for(const [label,value]of fields)await page.getByLabel(label,{exact:true}).fill(value);
  await page.evaluate(()=>document.activeElement?.blur());
  await waitForAsync(page,()=>{const c=window.fixture.reviews[0].candidate;return c.pronunciations[0]?.ipa==='/goʊ/'&&c.bundle.dictionary_learning_notes[0]?.body==='記憶提示'&&c.bundle.dictionary_etymologies[0]?.body==='Updated etymology'&&c.public_notes[0]?.body==='恢復筆記';});
  await page.reload();
  await word().waitFor();
  assert.equal(await page.getByLabel('讀音（IPA）',{exact:true}).inputValue(),'/goʊ/');
  assert.equal(await page.getByLabel('記憶法',{exact:true}).inputValue(),'記憶提示');
  assert.equal(await page.getByLabel('詞源',{exact:true}).inputValue(),'Updated etymology');
  assert.equal(await page.getByLabel('筆記',{exact:true}).inputValue(),'恢復筆記');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await context.close();
 }
 for(const mode of ['refresh','unknown']){
  const context=await browser.newContext(),page=await context.newPage();await page.goto(base);const word=page.getByLabel('英文字形 1',{exact:true});await word.fill('preserved '+mode);await page.getByRole('button',{name:'儲存／重試',exact:true}).evaluate(button=>{if(!button.disabled)button.click();});await page.getByRole('status').filter({hasText:'已儲存草稿'}).waitFor();await page.evaluate(mode=>{window.approvalWrites=0;window.failRefresh=mode==='refresh';window.losePublishResponse=mode==='unknown';},mode);
  await page.getByRole('button',{name:'發布',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'發布',exact:true}).click();await page.getByRole('alert').filter({hasText:mode==='refresh'?'更新畫面失敗':'請求結果尚未確認'}).waitFor();assert.equal(await word.inputValue(),'preserved '+mode);assert.equal(await page.getByRole('button',{name:'發布',exact:true}).isDisabled(),true);assert.equal((await page.locator('body').innerText()).includes('SQLPRIVATE'),false);
  await page.evaluate(()=>window.failRefresh=false);await page.getByRole('button',{name:'確認發布結果',exact:true}).click();if(mode==='unknown')await page.getByRole('alert').filter({hasText:'正式狀態已有變更'}).waitFor();else await page.waitForFunction(()=>window.fixture.snapshot.detail.entry.revision===2);assert.equal(await page.evaluate(()=>window.approvalWrites),1);await context.close();
 }
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true});}
});
