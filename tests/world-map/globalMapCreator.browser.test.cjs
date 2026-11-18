const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {build}=require('esbuild'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
test('planet creator desktop/mobile: explicit preview, uint32 validation, stale preview, name and confirmation',{timeout:120000},async()=>{
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
   const seed=page.getByLabel('種子碼（uint32）'),preview=page.getByRole('button',{name:'生成預覽',exact:true}),confirm=page.getByRole('button',{name:'生成',exact:true});
   await seed.waitFor();
   assert.equal(await page.locator('canvas').count(),0,'opening must not generate terrain');
   assert.equal(await confirm.isDisabled(),true);
   const before=await seed.inputValue();
   await page.getByRole('button',{name:'刷新種子碼'}).click();
   const refreshed=Number(await seed.inputValue());assert.ok(Number.isInteger(refreshed)&&refreshed>=0&&refreshed<=0xffffffff);
   assert.equal(await page.locator('canvas').count(),0,'refresh must not generate terrain');
   await seed.fill('4294967296');await preview.click();await page.getByRole('alert').waitFor();
   assert.equal(await confirm.isDisabled(),true);
   await seed.fill('42');await page.getByLabel('星球類型').selectOption('25');await preview.click();
   await page.locator('canvas').waitFor({timeout:30000});await page.waitForFunction(()=>!document.querySelector('fieldset').disabled);
   assert.equal(await confirm.isEnabled(),true);
   await seed.fill('43');assert.equal(await confirm.isDisabled(),true);
   await seed.fill('42');
   await page.getByLabel('名稱（可重新命名）').fill('海洋測試星');
   await confirm.click();await page.waitForFunction(()=>window.created.length===1);
   const saved=await page.evaluate(()=>window.created[0]);
   assert.equal(saved.name,'海洋測試星');assert.equal(saved.project.settings.seed,42);assert.equal(saved.project.settings.landPercent,25);
   assert.equal(saved.project.terrain.heights.length,36002);
   await page.getByRole('button',{name:'取消',exact:true}).click();
   assert.equal(await page.evaluate(()=>window.cancelled),1);assert.equal(await page.evaluate(()=>window.created.length),1);
   assert.deepEqual(errors,[]);assert.ok(before.length);await context.close();
  }
  assert.equal(workers,2);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true});}
});
