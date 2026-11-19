const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {build}=require('esbuild'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
test('planet creator desktop/mobile: automatic land-only preview, uint32 validation, stale preview, name and full generation',{timeout:300000},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-planet-'));
 await build({entryPoints:[path.join(root,'tests/fixtures/globalMapCreator.jsx')],outfile:path.join(tmp,'fixture.js'),bundle:true,jsx:'automatic',platform:'browser',plugins:[{name:'worker-url',setup(b){
  b.onLoad({filter:/globalMapClient\.ts$/},()=>({contents:fs.readFileSync(path.join(root,'src/features/worldMap/globalMapClient.ts'),'utf8').replace("new URL('../../../.cache/global-map-worker.js',import.meta.url)","'/worker.js'"),loader:'ts',resolveDir:path.join(root,'src/features/worldMap')}));
 }}]});
 let workers=0;
 const server=http.createServer((req,res)=>{
  res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':'text/html');
  if(req.url==='/fixture.js')res.end(fs.readFileSync(path.join(tmp,'fixture.js')));
  else if(req.url==='/worker.js'){workers++;res.end(fs.readFileSync(path.join(root,'.cache/global-map-worker.js')));}
  else res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script src="/fixture.js"></script>');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox']});
  for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
   const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port);
   const seed=page.getByLabel('種子碼（uint32）'),confirm=page.getByRole('button',{name:'生成',exact:true});
   await seed.waitFor();
   assert.equal(await confirm.isDisabled(),true,'full generation must wait for a land-only preview');
   await page.locator('canvas').waitFor({timeout:120000});
   assert.equal(await confirm.isEnabled(),true,'initial land-only preview is automatic');
   const before=await seed.inputValue();
   await page.getByRole('button',{name:'刷新種子碼'}).click();
   const refreshed=Number(await seed.inputValue());assert.ok(Number.isInteger(refreshed)&&refreshed>=0&&refreshed<=0xffffffff);
   await seed.fill('4294967296');await page.getByRole('alert').waitFor({timeout:120000});
   assert.equal(await confirm.isDisabled(),true);
   await seed.fill('42');await page.getByLabel('星球類型').selectOption('25');
   await page.waitForFunction(()=>document.querySelector('canvas')&&![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='生成')?.disabled,{timeout:120000});
   await seed.fill('43');assert.equal(await confirm.isDisabled(),true);
   await seed.fill('42');
   await page.waitForFunction(()=>![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='生成')?.disabled,{timeout:120000});
   await page.getByLabel('名稱（可重新命名）').fill('海洋測試星');
   await confirm.click();await page.waitForFunction(()=>window.created.length===1,{timeout:120000});
   const saved=await page.evaluate(()=>window.created[0]);
   assert.equal(saved.name,'海洋測試星');assert.equal(saved.project.settings.seed,42);assert.equal(saved.project.settings.landPercent,25);
   assert.equal(saved.project.terrain.heights.length,36002);
   assert.equal(saved.project.climateVersion,1);assert.equal(saved.project.packSettings.version,1);
   assert.equal(saved.project.naturalGeography.version,1);
   assert.ok(saved.project.naturalGeography.rivers.length>0);
   assert.equal(new Set(saved.project.naturalGeography.rivers.map(r=>r.id)).size,saved.project.naturalGeography.rivers.length);
   // Exercise the shipped Worker in a browser, including persistent base geometry
   // and IDs across a JSON round trip and a different Pack density.
   const lifecycle=await page.evaluate(async()=>{
    const worker=new Worker('/worker.js');let seq=0;
    const request=(action,project,patch)=>new Promise((resolve,reject)=>{
     const id=++seq,timer=setTimeout(()=>reject(Error('lifecycle timeout')),120000);
     worker.onmessage=({data})=>{if(data.id!==id)return;clearTimeout(timer);data.error?reject(Error(data.error)):resolve(data);};
     worker.onerror=()=>{clearTimeout(timer);reject(Error('lifecycle worker failed'));};
     worker.postMessage({id,action,project,patch});
    });
    try{
     const base=window.created[0].project;
     const loaded=await request('load',JSON.parse(JSON.stringify(base)));
     const river=base.naturalGeography.rivers[0];
     const edited=await request('editNatural',loaded.project,{id:river.id,name:'保存的河名'});
     const rebuilt=await request('rebuildPack',edited.project);
     const reopened=await request('load',JSON.parse(JSON.stringify(rebuilt.project)));
     return {baseUnchanged:JSON.stringify(base.terrain)===JSON.stringify(reopened.project.terrain),
      basePreserved:JSON.stringify(edited.project.naturalGeography)===JSON.stringify(reopened.project.naturalGeography),
      name:reopened.project.naturalGeography.rivers.find(r=>r.id===river.id).name,
      months:reopened.drawing.climate.months.length,
      remeshed:loaded.drawing.natural.pack.cells!==reopened.drawing.natural.pack.cells};
    }finally{worker.terminate();}
   });
   assert.deepEqual(lifecycle,{baseUnchanged:true,basePreserved:true,name:'保存的河名',months:12,remeshed:true});
   await page.getByRole('button',{name:'關閉視窗'}).click();
   assert.equal(await page.evaluate(()=>window.cancelled),1);assert.equal(await page.evaluate(()=>window.created.length),1);
   assert.deepEqual(errors,[]);assert.ok(before.length);await context.close();
  }
  assert.equal(workers,4);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true});}
});
