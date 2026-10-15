const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {build}=require('esbuild'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
test('desktop/mobile pagination: inline Enter/Esc, validation, last-request wins, retry, data changes and actual list integrations',{timeout:120000},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-pagination-'));
 await build({entryPoints:[path.join(__dirname,'fixtures/pagination.jsx')],outfile:path.join(tmp,'fixture.js'),bundle:true,jsx:'automatic',platform:'browser',plugins:[{name:'isolated-services',setup(b){
 b.onLoad({filter:/infrastructure\/supabase\/client\.ts$/},()=>({contents:'export const getSupabase=()=>window.dictionaryClient; export const isSupabaseConfigured=()=>true;',loader:'js'}));
 b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`import React from '${path.join(root,'node_modules/react/index.js')}';export default function Link({children,...props}){return React.createElement('a',props,children);}`,loader:'js',resolveDir:root}));
 b.onResolve({filter:/^next\/navigation$/},()=>({path:'nav',namespace:'navigation'}));b.onLoad({filter:/.*/,namespace:'navigation'},()=>({contents:`import {useSyncExternalStore} from '${path.join(root,'node_modules/react/index.js')}';const go=href=>{history.pushState(null,'',href);window.dispatchEvent(new Event('fixture-navigation'));};export const useRouter=()=>({push:go});export function useSearchParams(){const search=useSyncExternalStore(cb=>{window.addEventListener('fixture-navigation',cb);return ()=>window.removeEventListener('fixture-navigation',cb);},()=>location.search);return new URLSearchParams(search);}`,loader:'js',resolveDir:root}));
 }}]});
 const css=(await require('postcss')([require('@tailwindcss/postcss')({base:root})]).process(fs.readFileSync(path.join(root,'src/app/globals.css'),'utf8'),{from:path.join(root,'src/app/globals.css')})).css;
 const server=http.createServer((req,res)=>{if(req.url==='/fixture.js')res.end(fs.readFileSync(path.join(tmp,'fixture.js')));else if(req.url==='/fixture.css')res.end(css);else res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});const errors=[];
 try{for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
 const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
 const number=()=>page.getByRole('button',{name:/編輯第 \d+ 頁/}).first(),input=()=>page.getByLabel('頁碼',{exact:true});
 await number().waitFor();await page.getByText('/ 共 32 頁',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'上一頁',exact:true}).isDisabled(),true);
 const jump=async(value)=>{await number().click();assert.equal(await input().evaluate(el=>el===document.activeElement),true);assert.equal(await input().evaluate(el=>el.selectionStart===0&&el.selectionEnd===el.value.length),true);await input().fill(value);await input().press('Enter');};
 await jump('4');await page.getByTestId('rows').getByText('row 3',{exact:true}).waitFor();
 for(const value of ['','0','-1','4.2','text','33']){const before=await page.evaluate(()=>window.calls.length);await jump(value);assert.equal(await number().innerText(),'4');assert.equal(await page.evaluate(()=>window.calls.length),before);}
 await number().click();await input().fill('8');await input().press('Escape');assert.equal(await number().innerText(),'4');assert.equal(await number().evaluate(el=>el===document.activeElement),true);
 await page.getByLabel('排序').selectOption('descending');await page.waitForFunction(()=>window.calls.at(-1).sort==='descending');await jump('2');await jump('3');await page.getByTestId('rows').getByText('row 2',{exact:true}).waitFor();await page.waitForTimeout(400);assert.equal(await number().innerText(),'3');assert.equal(await page.evaluate(()=>window.calls.at(-1).sort),'descending');
 await page.evaluate(()=>window.failNext=true);await jump('5');await page.getByRole('alert').waitFor();assert.equal(await number().innerText(),'3');assert.equal(await page.getByTestId('rows').innerText(),'row 2');await page.getByRole('button',{name:'重試'}).click();await page.getByTestId('rows').getByText('row 4',{exact:true}).waitFor();
 await jump('32');await page.getByRole('button',{name:'下一頁',exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('[data-testid=rows]').textContent==='row 31');assert.equal(await page.getByRole('button',{name:'下一頁',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'縮減資料'}).click();await page.getByText('/ 共 2 頁',{exact:true}).waitFor();assert.equal(await number().innerText(),'2');
 await page.getByLabel('篩選').selectOption('empty');await page.getByText('/ 共 0 頁',{exact:true}).waitFor();assert.equal(await number().innerText(),'0');assert.equal(await number().isDisabled(),true);
 for(const [fixture,total,target] of [['admin',3,2],['reader',13,3],['groups',13,2],['relations',13,2],['links',13,2],['card',13,2],['suggestions',3,2]]){
  await page.goto(base+'/?fixture='+fixture+(fixture==='groups'?'&kind=prefix&category=__ungrouped__':''));if(fixture==='links')await page.getByRole('button',{name:'搜尋',exact:true}).click();if(fixture==='card')await page.getByRole('button',{name:'▸ 字典詳情',exact:true}).click();
  await page.getByText('/ 共 '+total+' 頁',{exact:true}).first().waitFor();if(fixture==='admin'){assert.equal(await page.getByRole('navigation',{name:'管理詞條分頁'}).count(),2);assert.equal(await page.locator('input[aria-label^=勾選]').count(),0);}await jump(String(target));await page.getByRole('button',{name:'編輯第 '+target+' 頁',exact:true}).first().waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(fixture==='admin')assert.equal(await page.locator('input[aria-label^=勾選]:checked').count(),0);
  if(fixture==='reader')assert.equal(new URL(page.url()).searchParams.get('page'),'2');
 }
 await context.close();}assert.deepEqual(errors,[]);}finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});}
});
