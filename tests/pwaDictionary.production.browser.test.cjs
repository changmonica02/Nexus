const {test}=require('node:test'),assert=require('node:assert/strict');
const {build}=require('esbuild'),{chromium}=require('playwright');
const {waitForAsync,setNetwork}=require('./pwaBrowser.cjs');
// Actual production UI/SDK/IndexedDB, synthetic sessions and isolated public API.
test('PWA dictionary: public offline reading/search, invalidation, isolation and storage failures',{timeout:180000},async t=>{
 const origin=process.env.NEXUS_PWA_URL||'http://127.0.0.1:32142';
 const A='00000000-0000-4000-8000-000000000121',B='00000000-0000-4000-8000-000000000122',id='11111111-1111-4111-8111-111111111111',missing='22222222-2222-4222-8222-222222222222';
 const session=owner=>{const exp=Math.floor(Date.now()/1000)+3600;return {user:{id:owner,email:'fixture@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}},access_token:[{alg:'HS256',typ:'JWT'},{sub:owner,exp,iat:exp-3600,aud:'authenticated',role:'authenticated'},'synthetic-signature'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.'),refresh_token:'fixture-refresh',expires_at:exp,expires_in:3600,token_type:'bearer'};};
 let headword='example',published=true,offline=false;const calls=[],offlineCalls=[];
 const detail=()=>({entry:{id,headword,kind:'word',status:'published'},senses:[{id:'sense-public',entry_id:id,part_of_speech:'noun',gloss_zh_tw:'公開詞義'}],relations:[],etymologies:[],learning_notes:[],related:[]});
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined});t.after(()=>browser.close());
 const context=await browser.newContext();const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await context.routeWebSocket('wss://pwa-fixture.supabase.co/**',s=>s.close());
 await context.addInitScript(({origin,initial})=>{if(location.origin===origin&&!localStorage.getItem('dict-seeded')){localStorage.setItem('dict-seeded','1');localStorage.setItem('sb-pwa-fixture-auth-token',JSON.stringify(initial));}},{origin,initial:session(A)});
 await context.route('https://pwa-fixture.supabase.co/**',async route=>{
  const r=route.request(),url=new URL(r.url()),name=url.pathname.split('/').at(-1),args=r.postDataJSON?.()||{};
  if(offline){offlineCalls.push(name);return route.abort('internetdisconnected');}calls.push(name);
  let owner=A;try{owner=JSON.parse(Buffer.from(r.headers().authorization.split(' ')[1].split('.')[1],'base64url')).sub;}catch{}
  let data=[];
  if(url.pathname.includes('/auth/'))data=name==='user'?session(owner).user:{};
  else if(name==='is_dictionary_admin')data=false;
  else if(name==='get_published_dictionary_entry')data=published&&args.entry_uuid===id?detail():null;
  else if(['search_published_dictionary','search_dictionary_with_inflections'].includes(name))data={items:published&&(!args.query_text||args.query_text==='example')?[{id,headword,kind:'word'}]:[],has_more:false,page:args.page_number||0,total:published?1:0};
  else if(name==='apply_workspace_operations')data={results:[]};
  else if(name==='pull_study_changes')data={changes:[],cursor:0};
  return route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Content-Range':'0-0/0'},body:JSON.stringify(data)});
 });
 const helper=(await build({stdin:{contents:`import * as reader from './src/features/dictionary/reader';import * as cache from './src/features/dictionary/publicCache';import {createClient} from '@supabase/supabase-js';window.dictionaryProbe={...reader,...cache,client:createClient('https://pwa-fixture.supabase.co','synthetic-pwa-public-key')};`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm'})).outputFiles[0].text;
 const page=await context.newPage();page.setDefaultTimeout(15000);
 const inject=async()=>{await page.addScriptTag({type:'module',content:helper});await waitForAsync(page,()=>!!window.dictionaryProbe);};
 const cacheRows=()=>page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('nexus-public-dictionary',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise((resolve,reject)=>{const tx=db.transaction('responses');const r=tx.objectStore('responses').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}});
 await page.goto(origin+'/dictionary?q=example');await page.getByRole('link',{name:/^example/}).last().waitFor();await inject();
 await page.getByRole('link',{name:/^example/}).last().click();await page.getByRole('heading',{name:'example',exact:true}).waitFor();
 await page.goBack();await page.getByRole('link',{name:/^example/}).last().waitFor();
 offline=true;await context.setOffline(true);await setNetwork(page,true);
 await page.getByRole('link',{name:/^example/}).last().click();await page.getByRole('heading',{name:'example',exact:true}).waitFor();await page.getByText('公開詞義',{exact:true}).waitFor();
 await page.goBack();await page.getByRole('link',{name:/^example/}).last().waitFor();
 await page.getByLabel('搜尋英文單字、字首或字根').fill('unread');await page.getByRole('button',{name:'搜尋',exact:true}).click();await page.getByRole('alert').filter({hasText:'請連線後閱讀'}).waitFor();
 await page.evaluate(id=>{const a=document.createElement('a');a.href='/dictionary/'+id;document.querySelector('main').append(a);a.click();a.remove();},missing);await page.getByRole('alert').filter({hasText:'請連線後閱讀'}).waitFor();
 await inject();const missingMessage=await page.evaluate(async id=>{try{await window.dictionaryProbe.readPublishedEntry(window.dictionaryProbe.client,id);}catch(e){return e.message;}},missing);assert.match(missingMessage,/尚未離線保存/);
 assert.equal(offlineCalls.filter(n=>/search_|get_published/.test(n)).length,0);
 await page.evaluate(id=>{const a=document.createElement('a');a.href='/dictionary/'+id;document.querySelector('main').append(a);a.click();a.remove();},id);await page.getByRole('heading',{name:'example',exact:true}).waitFor();
 headword='updated';offline=false;await context.setOffline(false);await setNetwork(page,false);await page.getByRole('heading',{name:'updated',exact:true}).waitFor();
await page.evaluate(id=>window.dictionaryProbe.readPublishedEntry(window.dictionaryProbe.client,id),id);
 assert.equal((await cacheRows()).find(r=>r.key==='entry:'+id).data.entry.headword,'updated');
 for(const action of ['withdraw','delete']){
  published=true;await page.evaluate(id=>window.dictionaryProbe.readPublishedEntry(window.dictionaryProbe.client,id),id);await page.evaluate(()=>window.dictionaryProbe.searchDictionaryWithInflections(window.dictionaryProbe.client,'all','example'));
  published=false;assert.equal(await page.evaluate(id=>window.dictionaryProbe.readPublishedEntry(window.dictionaryProbe.client,id),id),null);
  assert.ok(!(await cacheRows()).some(r=>r.key==='entry:'+id||r.data?.items?.some(e=>e.id===id)),action+' invalidates dependent snapshots');
 }
 published=true;await page.evaluate(id=>window.dictionaryProbe.readPublishedEntry(window.dictionaryProbe.client,id),id);
 await page.evaluate(async()=>{const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('quota exhausted','QuotaExceededError');};try{await window.dictionaryProbe.searchDictionary(window.dictionaryProbe.client,'all','quota');}finally{IDBObjectStore.prototype.put=original;}});
 assert.ok(!(await cacheRows()).some(r=>r.key.includes('quota')));
 const switchAccount=async owner=>{const tab=await context.newPage();await tab.goto(origin+'/dictionary?q=example');await tab.addScriptTag({type:'module',content:helper});await waitForAsync(tab,()=>!!window.dictionaryProbe);const result=await tab.evaluate(s=>s?window.dictionaryProbe.client.auth.setSession(s):window.dictionaryProbe.client.auth.signOut({scope:'local'}),owner?session(owner):null);assert.equal(result.error,null);await tab.waitForTimeout(150);await tab.close();};
 await switchAccount(B);await page.getByRole('heading',{name:'updated',exact:true}).waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sb-pwa-fixture-auth-token')).user.id),B);await switchAccount(null);await page.getByText('請先回到 Nexus 登入，再搜尋字典。').waitFor();assert.equal(await page.getByRole('heading',{name:'updated',exact:true}).count(),0);
 const serialized=JSON.stringify(await cacheRows());assert.ok(!/access_token|refresh_token|PRIVATE|owner_id|raw_text|license_note/.test(serialized));
 assert.ok(!calls.some(n=>/get_dictionary_entry|publish_dictionary|save_dictionary|list_dictionary_admin/.test(n)));
 await page.evaluate(async()=>{for(let i=0;i<101;i++)await window.dictionaryProbe.savePublicCache('capacity:'+i,{public:true});});
 assert.equal((await cacheRows()).length,100);
 await page.evaluate(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('nexus-public-dictionary',1);r.onsuccess=()=>resolve(r.result);});await new Promise((resolve,reject)=>{const tx=db.transaction('responses','readwrite');tx.objectStore('responses').put({key:'expired',data:{public:true},savedAt:Date.now()-30*86400000});tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});db.close();});
 assert.equal(await page.evaluate(()=>window.dictionaryProbe.readPublicCache('expired')),undefined);
 await page.evaluate(()=>window.dictionaryProbe.savePublicCache('newest',{public:true}));assert.ok(!(await cacheRows()).some(r=>r.key==='expired'));assert.equal((await cacheRows()).length,100);
 const apiCache=await page.evaluate(async()=>{const urls=[];for(const key of await caches.keys())for(const r of await (await caches.open(key)).keys())if(r.url.includes('supabase.co'))urls.push(r.url);return urls;});assert.deepEqual(apiCache,[]);
 assert.deepEqual(errors,[]);
 console.log('PWA_DICTIONARY_VERIFIED',JSON.stringify({offlineRead:true,offlineSearch:true,missPrompt:true,invalidation:true,quota:true,isolation:true,publicRpcCalls:calls.filter(n=>/search_|get_published/.test(n)).length,offlinePublicRpcCalls:0}));
});
