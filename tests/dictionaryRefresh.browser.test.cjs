const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {build}=require('esbuild'),{chromium}=require('playwright');
test('dictionary publish/resume revalidates list, stats and exact pages; preserves filters and active Review, cross-tab/focus refresh',{timeout:120000},async()=>{
 const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-refresh-'));
 await build({entryPoints:['tests/fixtures/persistentImport.jsx'],outfile:path.join(tmp,'fixture.js'),bundle:true,format:'esm',jsx:'automatic',define:{'process.env':JSON.stringify({NODE_ENV:'development'})},plugins:[{name:'isolated',setup(b){b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`import React from '${root}/node_modules/react/index.js';export default function Link(props){return React.createElement('a',props)}`,loader:'js',resolveDir:root}));b.onLoad({filter:/infrastructure\/supabase\/client\.ts$/},()=>({contents:'export const getSupabase=()=>window.dictionaryClient;',loader:'js'}));}}]});
 let completed=false,red=false,batches=0;const calls=[];
 const server=http.createServer(async(req,res)=>{if(req.url==='/fixture.js'){res.setHeader('content-type','application/javascript');res.end(fs.readFileSync(path.join(tmp,'fixture.js')));return;}if(req.url==='/rpc'){
 let body='';for await(const chunk of req)body+=chunk;const {name,args}=JSON.parse(body);calls.push({name,args});let result;
 if(name==='list_dictionary_admin_work'){
 let rows=Array.from({length:103},(_,i)=>({id:'entry'+i,headword:'item'+String(i).padStart(3,'0'),kind:'word',status:completed?'published':'draft',work_status:red&&i===0?'red':!completed||i===102?'yellow':'green',pending_count:red&&i===0?1:0}));
 rows=rows.filter(x=>(!args.query_text||x.headword.includes(args.query_text))&&(!args.kind_filters.length||args.kind_filters.includes(x.kind)));
 const stats={red:0,yellow:0,green:0};for(const row of rows)stats[row.work_status]++;
 if(args.work_filter)rows=rows.filter(x=>x.work_status===args.work_filter);
 result={data:{total:rows.length,stats,items:rows.slice(args.page_number*100,(args.page_number+1)*100)}};
 }else if(name==='preview_dictionary_bulk_publish'||name==='publish_dictionary_bulk'){
 if(name==='publish_dictionary_bulk'){await new Promise(r=>setTimeout(r,180));completed=++batches>=2;}
 result={data:{total:102,ready:completed?0:102,blocked:0,invalid:0,published:batches?51:0,published_total:completed?102:batches?51:0,remaining:completed?0:batches?51:102,continuation:!completed,no_progress:false,attempted:51,batch_size:51,signature:'token',issues:[]}};
 }else result={error:{code:'42883',message:'fixture unavailable '+name}};
 res.setHeader('content-type','application/json');res.end(JSON.stringify(result));return;
 }res.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/fixture.js"></script></html>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});const errors=[];
 try{const context=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});const url='http://127.0.0.1:'+server.address().port;
 await page.goto(url);await page.getByRole('link',{name:/item000/}).waitFor();
 await page.getByRole('button',{name:'發布全部草稿',exact:true}).click();await page.getByRole('dialog',{name:'批次發布預覽'}).getByRole('button',{name:'確認批次發布',exact:true}).click();await page.getByRole('dialog',{name:'確認批次發布',exact:true}).getByRole('button',{name:'確認批次發布',exact:true}).click();
 await page.getByRole('button',{name:'停止未開始的批次',exact:true}).click();await page.getByText(/已發布 51/).waitFor();
 await page.reload();await page.getByRole('link',{name:/item000/}).waitFor();
 await page.getByRole('textbox',{name:'搜尋管理詞條'}).fill('item');await page.getByLabel('單字',{exact:true}).check();await page.getByLabel('🟡 有草稿',{exact:true}).check();
 await page.getByRole('button',{name:'下一頁',exact:true}).first().click();await page.getByRole('link',{name:/item102.*有草稿/}).waitFor();
 await page.getByRole('button',{name:'恢復已保存的批次發布',exact:true}).click();await page.getByRole('dialog',{name:'批次發布預覽'}).getByRole('button',{name:'恢復已保存的批次發布',exact:true}).click();await page.getByText(/已發布 102 · 待處理 0/).waitFor();
 await page.getByRole('link',{name:/item102.*有草稿/}).waitFor();
 await page.waitForFunction(()=>document.querySelectorAll('[data-dictionary-list] li').length===1);
 assert.equal(await page.getByRole('textbox',{name:'搜尋管理詞條'}).inputValue(),'item');assert.equal(await page.getByLabel('單字',{exact:true}).isChecked(),true);assert.equal(await page.getByLabel('🟡 有草稿',{exact:true}).isChecked(),true);
 assert.ok(calls.filter(c=>c.name==='list_dictionary_admin_work').some(c=>c.args.page_number===0&&c.args.work_filter==='yellow'&&c.args.query_text==='item'));
 await page.getByRole('dialog',{name:'批次發布預覽'}).getByRole('button',{name:'關閉'}).click();
 await page.getByLabel('🟡 有草稿',{exact:true}).uncheck();await page.getByRole('link',{name:/item000.*新發布/}).waitFor();
 red=true;const tab=await context.newPage();await tab.goto(url);await tab.evaluate(()=>localStorage.setItem('nexus-dictionary-invalidation',crypto.randomUUID()));await page.getByRole('link',{name:/item000.*待審核/}).waitFor();
 const before=calls.length;await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('pageshow'));});await page.waitForTimeout(150);assert.equal(calls.length,before+1,'coalesce lifecycle signals');
 assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});}
});
