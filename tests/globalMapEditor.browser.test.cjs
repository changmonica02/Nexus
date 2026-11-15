const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {build}=require('esbuild'),{chromium,webkit}=require('playwright');
const {waitForAsync}=require('./pwaBrowser.cjs');
test('Nexus global editor: generation, candidate isolation, replacement, recovery, offline reopen and responsive bilingual canvas',{timeout:360000},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-global-')),root=path.resolve(__dirname,'..');let server,browser,transportDown=false;
 const errors=[];
 try{
  await build({entryPoints:['tests/fixtures/globalMapEditor.jsx'],outfile:path.join(tmp,'app.js'),bundle:true,format:'esm',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'worker-url',setup(b){b.onLoad({filter:/globalMapClient\.ts$/},args=>({contents:fs.readFileSync(args.path,'utf8').replace("new URL('../../../.cache/global-map-worker.js',import.meta.url)","new URL('/_next/static/global-worker.js',location.href)"),loader:'ts',resolveDir:path.dirname(args.path)}));}}]});
  await build({entryPoints:['src/features/worldMap/globalMapWorker.ts'],outfile:path.join(tmp,'worker.js'),bundle:true,format:'iife',platform:'browser'});
  const css=(await require('postcss')([require('@tailwindcss/postcss')({base:root})]).process(fs.readFileSync('src/app/globals.css','utf8'),{from:path.join(root,'src/app/globals.css')})).css;
  server=http.createServer((req,res)=>{if(transportDown){req.socket.destroy();return;}const file=req.url==='/_next/static/app.js'?'app.js':req.url==='/_next/static/global-worker.js'?'worker.js':null;if(file){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(tmp,file)));return;}if(req.url==='/_next/static/app.css'){res.setHeader('Content-Type','text/css');res.end(css);return;}if(req.url?.startsWith('/test-network?')){res.setHeader('Cache-Control','no-store');res.end('online');return;}if(req.url==='/sw.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync('public/sw.js'));return;}if(new URL(req.url,'http://localhost').pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/_next/static/app.css"><div id="root"></div><script type="module" src="/_next/static/app.js"></script></html>');return;}res.writeHead(404);res.end();});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
  const engine=process.env.GLOBAL_MAP_BROWSER==='webkit'?webkit:chromium;
  for(const width of [1280,390]){
   // Match real persistent workspaces and the existing WebKit map regression.
   // WebKit ephemeral contexts can reject IndexedDB Blob writes.
   const context=await engine.launchPersistentContext(path.join(tmp,'profile-'+width),{headless:true,executablePath:engine===chromium?process.env.BROWSER_EXECUTABLE:undefined,args:engine===chromium?['--no-sandbox']:[],viewport:{width,height:900}});browser=context;const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>{errors.push(e.message);console.error('GLOBAL_PAGE_ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')console.error('GLOBAL_CONSOLE',m.text());});const readyEditor=(caption='重新生成海陸')=>page.waitForFunction(caption=>[...document.querySelectorAll('button')].some(b=>b.textContent===caption&&!b.disabled),caption);
   console.log('GLOBAL_STAGE',width,'create');await page.goto(url);await page.getByRole('button',{name:'New map',exact:true}).click();
   const create=page.getByRole('button',{name:'確認並建立',exact:true});await create.waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='確認並建立'&&!b.disabled));
   await page.getByLabel('亂數種子',{exact:true}).fill('42');await page.getByRole('button',{name:'生成海陸',exact:true}).click();await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='確認並建立'&&!b.disabled));await create.click();
   await readyEditor().catch(async error=>{console.error('GLOBAL_CREATE_BODY',await page.locator('body').innerText());fs.mkdirSync('test-results/global-map',{recursive:true});await page.screenshot({path:`test-results/global-map/${process.env.GLOBAL_MAP_BROWSER??'chromium'}-failure.png`,fullPage:true});throw error;});await page.waitForFunction(()=>document.querySelector('[data-global-map-canvas]')?.width>0);
   console.log('GLOBAL_STAGE',width,'created');const original=await page.evaluate(()=>window.testGlobal.snapshot());assert.equal(original.settings.seed,42);
   const pixels=await page.locator('[data-global-map-canvas]').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]===162&&d[i+1]===186&&d[i+2]===129)n++;return n;});assert.ok(pixels>1000,'Actual Voronoi land must be visible');
   await page.locator('[data-global-map-canvas]').evaluate(c=>window.mapBefore=c.toDataURL());await page.locator('[data-global-map-canvas]').hover();await page.mouse.wheel(0,-300);await page.waitForFunction(()=>document.querySelector('[data-global-map-canvas]').toDataURL()!==window.mapBefore);await page.getByRole('button',{name:'放大',exact:true}).click();await page.getByRole('button',{name:'重設視野',exact:true}).click();
   const candidate=async seed=>{await page.getByRole('button',{name:'重新生成海陸',exact:true}).click();await page.getByLabel('亂數種子',{exact:true}).fill(String(seed));await page.getByRole('button',{name:'生成海陸',exact:true}).click();await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='確認替換'&&!b.disabled));};
   console.log('GLOBAL_STAGE',width,'candidate');await candidate(99);assert.deepEqual(await page.evaluate(()=>window.testGlobal.snapshot()),original);await page.getByRole('button',{name:'取消替換',exact:true}).click();assert.deepEqual(await page.evaluate(()=>window.testGlobal.snapshot()),original);
   await candidate(99);await page.getByRole('button',{name:'確認替換',exact:true}).click();await waitForAsync(page,async()=>(await window.testGlobal.snapshot()).settings.seed===99);await page.getByRole('button',{name:'儲存並返回',exact:true}).click();await page.getByRole('button',{name:'Reopen',exact:true}).click();await readyEditor();
   // Failed save retains the old canonical snapshot and a recoverable local draft.
   console.log('GLOBAL_STAGE',width,'recovery');await page.evaluate(()=>window.failSave=true);await candidate(101);await page.getByRole('button',{name:'確認替換',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal((await page.evaluate(()=>window.testGlobal.snapshot())).settings.seed,99);assert.ok(await page.evaluate(async()=>!!(await window.testGlobal.draft())));
   const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'匯出快照',exact:true}).click();const dl=await downloading;assert.equal(JSON.parse(fs.readFileSync(await dl.path(),'utf8')).settings.seed,101);
   await page.evaluate(()=>window.failSave=false);await page.getByRole('button',{name:'儲存',exact:true}).click();await waitForAsync(page,async()=>(await window.testGlobal.snapshot()).settings.seed===101);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   fs.mkdirSync('test-results/global-map',{recursive:true});await page.screenshot({path:`test-results/global-map/${process.env.GLOBAL_MAP_BROWSER??'chromium'}-${width}.png`,fullPage:true});
   // Production shell policy caches the hashed worker like any other public JS asset.
   console.log('GLOBAL_STAGE',width,'offline');await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
   await page.getByRole('button',{name:'儲存並返回',exact:true}).click();await page.reload();await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);await readyEditor();
   // Drop every HTTP connection so both engines exercise an actual failed
   // fetch and the production service worker's cached-shell fallback.
   await page.evaluate(()=>localStorage.setItem('global-map-test-offline','1'));await page.addInitScript(()=>{if(localStorage.getItem('global-map-test-offline')==='1')Object.defineProperty(navigator,'onLine',{configurable:true,value:false});});transportDown=true;assert.equal(await page.evaluate(()=>fetch('/test-network?offline').then(()=>false,()=>true)),true,'The test server must actually be unreachable');await page.reload();await readyEditor();assert.equal((await page.evaluate(()=>window.testGlobal.snapshot())).settings.seed,101);assert.equal(await page.evaluate(()=>navigator.onLine),false);
   transportDown=false;await page.evaluate(()=>{localStorage.removeItem('global-map-test-offline');Object.defineProperty(navigator,'onLine',{configurable:true,value:true});window.dispatchEvent(new Event('online'));});
   assert.equal(await page.evaluate(()=>fetch('/test-network?restored='+Date.now(),{cache:'no-store'}).then(r=>r.text())),'online','Reconnection must reach the real server');
   // Nexus changes language through the existing context, without a document navigation.
   console.log('GLOBAL_STAGE',width,'language');await page.getByRole('button',{name:'儲存並返回',exact:true}).click();await page.getByRole('button',{name:'English',exact:true}).click();await page.getByRole('button',{name:'Edit map',exact:true}).click();await readyEditor('Generate replacement');
   assert.equal((await page.evaluate(()=>window.testGlobal.snapshot())).settings.seed,101);
   // Also retain the original reconnect navigation. Readiness means the new
   // document has rendered an enabled editor with the correct stored terrain,
   // rather than waiting for every unrelated resource's global load event.
   console.log('GLOBAL_STAGE',width,'reconnect-navigation');await page.goto(url+'/?en',{waitUntil:'domcontentloaded'});await readyEditor('Generate replacement');
   assert.equal((await page.evaluate(()=>window.testGlobal.snapshot())).settings.seed,101);
   await context.close();
  }
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();if(server)await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});}
});
