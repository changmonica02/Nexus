require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {build}=require('esbuild'),{chromium}=require('playwright');
const {worldMapHeaders}=require('../next.config.ts');
test('actual fork: isolated native editing, save/reopen, project roundtrip, images, offline, multi-map and restore',{timeout:300000},async t=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-world-map-')),root=path.resolve(__dirname,'..'),core=path.join(root,'public/world-map/core');
  await build({entryPoints:['tests/fixtures/worldMap.jsx'],outfile:path.join(tmp,'fixture.js'),bundle:true,format:'esm',jsx:'automatic',define:{'process.env':JSON.stringify({NODE_ENV:'development'})}});
  const mime={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.html':'text/html'};
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);
    if(pathname==='/fixture.js'){res.setHeader('content-type','text/javascript');return res.end(fs.readFileSync(path.join(tmp,'fixture.js')));}
    if(pathname==='/world-map/offline.js'){res.setHeader('content-type','text/javascript');return res.end(fs.readFileSync(path.join(root,'public/world-map/offline.js')));}
    if(pathname.startsWith('/world-map/core/')){
      const file=path.resolve(core,pathname.slice('/world-map/core/'.length));
      if(!file.startsWith(core+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('missing');}
      for(const h of worldMapHeaders)res.setHeader(h.key,h.value);
      res.setHeader('content-type',mime[path.extname(file)]??'application/octet-stream');return res.end(fs.readFileSync(file));
    }
    res.setHeader('content-type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}button{padding:6px;margin:3px}dialog{max-width:none;max-height:none}dialog[aria-label="World map editor"]{width:100vw;height:100vh;margin:0;padding:0;display:flex;flex-direction:column}.relative{position:relative}.absolute{position:absolute}.inset-0{inset:0}.flex-1{flex:1}.min-h-0{min-height:0}.h-full{height:100%}.w-full{width:100%}.grid{display:grid}.place-items-center{place-items:center}</style><div id="root"></div><script type="module" src="/fixture.js"></script>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.close();fs.rmSync(tmp,{recursive:true,force:true});});
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('pageerror:',e.message);});page.on('console',m=>{if(m.type()==='error')console.log('browser:',m.text().slice(0,350));});
  page.on('requestfailed',r=>console.log('request failed:',r.url().slice(0,140),r.failure()?.errorText));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('http://127.0.0.1:'+server.address().port);await page.getByText('Maps (0)',{exact:true}).click();
  const confirmName=async name=>{await page.getByRole('textbox',{name:'Map name'}).fill(name);await page.getByRole('button',{name:'確認',exact:true}).click();};
  await page.getByRole('button',{name:'＋ Create map'}).click();await confirmName('Atlas One');
  const editor=page.getByRole('dialog',{name:'World map editor'});
  await editor.getByRole('button',{name:'Save',exact:true}).waitFor({state:'visible',timeout:120000});
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  let frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());
  assert.ok(frame);
  assert.equal(await frame.evaluate(()=>{try{void parent.document.body;return false;}catch{return true;}}),true,'core cannot access Nexus document');
  assert.equal(await frame.evaluate(()=>localStorage.getItem('nexus-owner')),null);
  await frame.locator('#optionsTrigger').click();await frame.locator('#toolsTab').click();
  const burgId=await frame.evaluate(async()=>{const burg=pack.burgs.find(b=>b.i&&!b.removed);if(!burg)throw Error('No burg generated');await Controllers.BurgEditor.open(burg.i);return burg.i;});
  await frame.locator('#burgName').fill('Nexus Port');
  await editor.getByRole('button',{name:'Save',exact:true}).click();
  await editor.getByRole('status').filter({hasText:'Saved to this device'}).waitFor({timeout:60000});
  await frame.evaluate(async id=>{pack.burgs[id].name='Temporary unsaved name';await Services.Load.quickLoad();},burgId);
  await frame.waitForFunction(id=>pack.burgs[id].name==='Nexus Port',burgId);
  let downloadEvent=page.waitForEvent('download');await editor.getByRole('button',{name:'.map ↓',exact:true}).click();
  const native=await downloadEvent,file=path.join(tmp,'roundtrip.map');await native.saveAs(file);assert.ok(fs.statSync(file).size>10000);
  for(const type of ['SVG','PNG']){downloadEvent=page.waitForEvent('download',{timeout:60000});await editor.getByRole('button',{name:type+' ↓',exact:true}).click();const image=await downloadEvent;const p=path.join(tmp,type.toLowerCase());await image.saveAs(p);assert.ok(fs.statSync(p).size>1000);}
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});
  await page.getByRole('button',{name:'Atlas One',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());
  assert.equal(await frame.evaluate(id=>pack.burgs[id].name,burgId),'Nexus Port');
  // A failed canonical write keeps the editor and a local-only recovery project.
  await frame.evaluate(id=>{pack.burgs[id].name='Recovery Port';document.dispatchEvent(new Event('input',{bubbles:true}));},burgId);
  await page.evaluate(()=>{window.failMapSave=true;});await editor.getByRole('button',{name:'Save',exact:true}).click();
  await editor.getByRole('alert').filter({hasText:'Simulated local save failure'}).waitFor();
  assert.ok(await page.evaluate(async()=>{const p=await window.mapStorage.getPage('world-browser'),map=p.character_data.world_maps[0];return Boolean(await window.mapStorage.getWorkspacePersistence().readMapDraft('map-browser-owner',p.id,map.id));}));
  await page.reload();await page.getByText('Maps (1)',{exact:true}).click();await page.getByRole('button',{name:'Atlas One',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());assert.equal(await frame.evaluate(id=>pack.burgs[id].name,burgId),'Recovery Port');
  await editor.getByRole('button',{name:'Save',exact:true}).click();await editor.getByRole('status').filter({hasText:'Saved to this device'}).waitFor();
  await context.setOffline(true);
  await frame.evaluate(id=>{pack.burgs[id].name='Offline Port';document.dispatchEvent(new Event('input',{bubbles:true}));},burgId);
  await editor.getByRole('button',{name:'Save',exact:true}).click();await editor.getByRole('status').filter({hasText:'Saved to this device'}).waitFor();
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});
  await page.getByRole('button',{name:'Atlas One',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());
  assert.equal(await frame.evaluate(id=>pack.burgs[id].name,burgId),'Offline Port');
  await context.setOffline(false);await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});
  await page.locator('input[type=file]').setInputFiles(file);await confirmName('Atlas Imported');
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());assert.equal(await frame.evaluate(id=>pack.burgs[id].name,burgId),'Nexus Port');
  await frame.evaluate(async id=>{await Controllers.BurgEditor.open(id);},burgId);await frame.locator('#burgName').fill('Imported Editable Port');
  // Native UI imports also use the awaitable failure boundary, not the old void loader.
  await editor.getByRole('button',{name:'Save',exact:true}).click();await editor.getByRole('status').filter({hasText:'Saved to this device'}).waitFor();
  await frame.locator('#mapToLoad').setInputFiles({name:'invalid.map',mimeType:'application/octet-stream',buffer:Buffer.from('invalid')});
  await editor.getByRole('alert').filter({hasText:'Native project loading failed'}).waitFor();
  assert.equal(await editor.getByRole('button',{name:'Save',exact:true}).isDisabled(),true);
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});
  assert.equal(await page.evaluate(async()=>{const backup=await window.mapStorage.exportWorkspaceBackup();return backup.pages[0].character_data.world_maps.filter(m=>m.deleted_at==null).length;}),2);
  const row=page.locator('li').filter({has:page.getByRole('button',{name:'Atlas One',exact:true})});
  await row.getByRole('button',{name:'Duplicate',exact:true}).click();await page.getByRole('button',{name:'Atlas One copy',exact:true}).waitFor();
  await row.getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('button',{name:'確認',exact:true}).click();
  await page.getByText('Deleted maps',{exact:true}).click();
  const restore=page.getByRole('button',{name:'Restore',exact:true});await restore.click();await restore.waitFor({state:'detached'});
  assert.equal(await page.evaluate(async()=>{const p=await window.mapStorage.getPage('world-browser');return p.character_data.world_maps.filter(m=>m.deleted_at==null).length;}),3);
  console.log('Browser errors observed:',JSON.stringify(errors));
  assert.deepEqual(errors,[]);
});
