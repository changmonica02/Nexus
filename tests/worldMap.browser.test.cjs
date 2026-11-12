require('./loadStudy.cjs');
const {setNetwork,waitForAsync}=require('./pwaBrowser.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {build}=require('esbuild'),{chromium}=require('playwright');
const {worldMapHeaders}=require('../next.config.ts');
test('actual fork: isolated native editing, save/reopen, project roundtrip, images, offline, multi-map and restore',{timeout:600000},async t=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-world-map-')),root=path.resolve(__dirname,'..'),core=path.join(root,'public/world-map/core');
  await build({entryPoints:['tests/fixtures/worldMap.jsx'],outfile:path.join(tmp,'fixture.js'),bundle:true,loader:{'.woff':'dataurl','.woff2':'dataurl','.ttf':'dataurl'},format:'esm',jsx:'automatic',define:{'process.env':JSON.stringify({NODE_ENV:'development'})}});
  const cssFiles=fs.readdirSync(path.join(root,'.next/static'),{recursive:true}).filter(p=>p.endsWith('.css'));
  const mime={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.html':'text/html'};
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);
    if(pathname.startsWith('/_next/static/')&&pathname.endsWith('.css')){const file=path.resolve(root,'.next/static',pathname.slice('/_next/static/'.length));if(!file.startsWith(path.join(root,'.next/static')+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('content-type','text/css');return res.end(fs.readFileSync(file));}
    if(pathname==='/fixture.js'){res.setHeader('content-type','text/javascript');return res.end(fs.readFileSync(path.join(tmp,'fixture.js')));}
    if(pathname==='/world-map/offline.js'){res.setHeader('content-type','text/javascript');return res.end(fs.readFileSync(path.join(root,'public/world-map/offline.js')));}
    if(pathname.startsWith('/world-map/core/')){
      const file=path.resolve(core,pathname.slice('/world-map/core/'.length));
      if(!file.startsWith(core+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('missing');}
      for(const h of worldMapHeaders)res.setHeader(h.key,h.value);
      res.setHeader('content-type',mime[path.extname(file)]??'application/octet-stream');return res.end(fs.readFileSync(file));
    }
    res.setHeader('content-type','text/html');res.end(cssFiles.map(p=>'<link rel="stylesheet" href="/_next/static/'+p+'">').join('')+'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;height:100vh}#root{height:100%;min-width:0}button{padding:6px;margin:3px}[role="dialog"][aria-label="World map editor"]{width:100vw;height:100vh;margin:0;padding:0;display:flex;flex-direction:column}.relative{position:relative}.absolute{position:absolute}.inset-0{inset:0}.flex-1{flex:1}.min-h-0{min-height:0}.h-full{height:100%}.w-full{width:100%}.grid{display:grid}.place-items-center{place-items:center}</style><div id="root"></div><script type="module" src="/fixture.js"></script>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.close();fs.rmSync(tmp,{recursive:true,force:true});});
  const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:process.env.MAP_TEST_CA_SPKI?['--ignore-certificate-errors-spki-list='+process.env.MAP_TEST_CA_SPKI]:[]});t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,hasTouch:true,ignoreHTTPSErrors:process.env.MAP_TEST_TRUST_PROXY==='1'}),page=await context.newPage();
  page.setDefaultTimeout(20000);
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('pageerror:',e.message);});page.on('console',m=>{if(m.type()==='error'||m.text().startsWith('DISTRIBUTION_'))console.log('browser:',m.text().slice(0,350));});
  page.on('requestfailed',r=>console.log('request failed:',r.url().slice(0,140),r.failure()?.errorText));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('http://127.0.0.1:'+server.address().port);
  let frame;
  const currentMapFrame=async()=>{const active=page.getByRole('dialog',{name:'World map editor',exact:true});const target=await active.isVisible()?active.locator('iframe'):page.locator('iframe:visible').first();await page.waitForFunction(el=>el.parentElement?.getAttribute('aria-busy')==='false',await target.elementHandle(),{timeout:120000});return (await target.elementHandle()).contentFrame();};
  const confirmName=async name=>{if(name==='Atlas One')await page.getByLabel('Seed',{exact:true}).fill('nexus-natural-v2-browser');if(name==='Detail Created'){await page.getByLabel('Terrain source',{exact:true}).selectOption('precreated');await page.getByLabel('Terrain template',{exact:true}).selectOption('world');await page.getByRole('dialog',{name:'Create map',exact:true}).locator('summary').filter({hasText:'Advanced settings'}).click();await page.getByLabel('Geographic width (km, optional)',{exact:true}).fill('1000');}await page.getByRole('textbox',{name:'Map name'}).fill(name);await page.getByRole('button',{name:await page.getByRole('button',{name:'Confirm creation',exact:true}).count()?'Confirm creation':'Confirm',exact:true}).click();await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),null,{timeout:120000});frame=await currentMapFrame();};
  const manage=page.getByRole('dialog',{name:'Manage maps'});
  const openManage=async()=>{if(!await manage.isVisible())await page.getByRole('button',{name:'Manage maps',exact:true}).first().click();};
  const closeManage=async()=>{if(await manage.isVisible())await manage.getByRole('button',{name:'Close panel'}).click();};
  assert.equal(await manage.count(),0,'management is hidden by default');
  // Preview every shipped source in a disposable sandbox, then cancel with zero persistence.
  await openManage();await manage.getByRole('button',{name:'Create map',exact:true}).click();
  const creator=page.locator('dialog').filter({has:page.locator('iframe[aria-hidden="true"]')});
  await creator.locator('img').waitFor({timeout:120000});
  for(const size of [{width:390,height:844},{width:820,height:1180},{width:1440,height:1000}]){
    await page.setViewportSize(size);
    assert.ok(await creator.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&el.scrollWidth<=el.clientWidth+1;}),'responsive creation dialog');
  }
  await page.getByRole('button',{name:'繁體中文',exact:true}).evaluate(el=>el.click());
  await creator.getByRole('heading',{name:'建立自然地圖',exact:true}).waitFor();
  assert.equal(await creator.getByLabel('地形模板',{exact:true}).locator('option').filter({hasText:'azgaar.'}).count(),0);
  await page.getByRole('button',{name:'English',exact:true}).evaluate(el=>el.click());
  const creationFrame=page.frames().find(f=>f.parentFrame()===page.mainFrame());
  const beforePreview=await creationFrame.evaluate(()=>JSON.stringify([pack,grid.cells.h,options.map]));
  if(!process.env.MAP_SKIP_TEMPLATE_SWEEP)for(const kind of ['procedural','precreated']){
    await creator.getByLabel('Terrain source',{exact:true}).selectOption(kind);
    const source=creator.getByLabel('Terrain template',{exact:true});
    const ids=await source.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value));
    assert.equal(ids.length,kind==='procedural'?14:23);
    for(const id of ids){
      const old=await creator.locator('img').getAttribute('src');
      await source.selectOption(id);
      // Selecting the already-selected first item is not a resample.
      if(await source.inputValue()===id){
        await creator.getByRole('button',{name:'Resample',exact:true}).click();
      }
      await page.waitForFunction(old=>{const img=document.querySelector('img[alt="Terrain template preview"]');return img&&img.getAttribute('src')!==old&&img.complete&&img.naturalWidth>0;},old,{timeout:30000});
      assert.equal(await creator.getByRole('alert').count(),0,'template '+id);
    }
  }
  assert.equal(await creationFrame.evaluate(()=>JSON.stringify([pack,grid.cells.h,options.map])),beforePreview,'preview never changes active geography');
  assert.equal(await page.evaluate(async()=>{const w=await mapStorage.getPage('world-browser');return (w.character_data.world_maps??[]).length;}),0);
  await creator.getByRole('button',{name:'Cancel',exact:true}).click();await creator.waitFor({state:'detached'});
  assert.equal(await page.evaluate(async()=>{const w=await mapStorage.getPage('world-browser');return (w.character_data.world_maps??[]).length;}),0,'cancel creates no map');
  await openManage();await manage.getByRole('button',{name:'Create map',exact:true}).click();await confirmName('Atlas One');
  const editor=page.getByRole('dialog',{name:'World map editor'});
  await editor.getByRole('button',{name:'Save',exact:true}).waitFor({state:'visible',timeout:120000});
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  frame=await currentMapFrame();
  assert.ok(frame);
  const enterEditor=async()=>{if(await editor.isVisible())return;await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')==='Edit map'&&!b.disabled&&b.getClientRects().length));frame=await currentMapFrame();await waitMapLayout();await page.getByRole('button',{name:'Edit map',exact:true}).press('Enter');await editor.waitFor({state:'visible'});frame=await currentMapFrame();};
  const openWorldTools=async(group='Human geography',category='Landmarks')=>{if(!await editor.locator('[data-map-context]').isVisible())await editor.locator('[data-map-sidebar-toggle]').click();if(group==='Display and style')return;await editor.getByRole('tab',{name:group,exact:true}).click();if(group==='Human geography'){if(await editor.locator('[data-map-category-back]').count())await editor.locator('[data-map-category-back]').click();await editor.getByRole('button',{name:category,exact:true}).click();}else{if(await editor.locator('[data-map-natural-back]').count())await editor.locator('[data-map-natural-back]').click();await editor.getByRole('button',{name:'Height',exact:true}).click();}};
  const refreshPreviewFrame=async()=>{frame=await currentMapFrame();await frame.waitForFunction(()=>typeof pack!=='undefined'&&pack.cells?.i?.length,null,{timeout:120000});};
  const regionSelect=async()=>await editor.isVisible()?editor.getByLabel('Region',{exact:true}):page.getByLabel('Region',{exact:true});
  const openEntries=async()=>{if(await editor.isVisible()){await openWorldTools('Human geography');await editor.getByRole('button',{name:'Place existing entry',exact:true}).click();}else await page.getByRole('button',{name:'World entries',exact:true}).click();};
  const openExports=async()=>{if(!await editor.locator('[data-map-export]').evaluate(el=>el.open))await editor.locator('[data-map-export] > summary').click();};
  assert.equal(await frame.evaluate(()=>{try{void parent.document.body;return false;}catch{return true;}}),true,'core cannot access Nexus document');
  assert.equal(await frame.evaluate(()=>localStorage.getItem('nexus-owner')),null);
  assert.equal(await frame.locator('#aboutTab,#aboutContent,#tourPromptButton,#loading,#regenerate,#newMapButton,#saveButton,#loadButton,#saveMapData,#loadMapData,#mapToLoad,#loadGoogleTranslateButton,#autosaveIntervalInput,#onloadBehavior,#optionsReset').count(),0);
  assert.equal(await frame.locator('a[href*="patreon"],a[href*="discord"],a[href*="reddit"],a[href*="deorum"],a[href*="u24.gov.ua"]').count(),0);
  assert.equal(await editor.locator('[data-map-more]').count(),0,'license access moved to Settings About');
  assert.match(fs.readFileSync(path.join(core,'AZGAAR-LICENSE.txt'),'utf8'),/Copyright/);
  assert.match(fs.readFileSync(path.join(core,'THIRD-PARTY-NOTICES.txt'),'utf8'),/fake-indexeddb/);
  // The old first-visit announcement ran after six seconds.
  await page.waitForTimeout(6500);
  assert.equal(await frame.locator('.ui-dialog:visible').count(),0);

  assert.equal(await frame.evaluate(()=>pack.burgs.filter(b=>b?.i&&!b.removed).length),0,'new maps have no random towns');
  assert.deepEqual(await frame.evaluate(()=>[pack.states,pack.cultures,pack.religions].map(a=>a.filter(e=>e.i&&!e.removed).length)),[0,0,0]);
  const dataDigest=()=>frame.evaluate(()=>JSON.stringify([pack,grid.cells.h,grid.cells.temp,grid.cells.prec,options.map],(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value)).then(value=>require('node:crypto').createHash('sha256').update(value).digest('hex'));
  assert.deepEqual(await frame.evaluate(()=>options.map.lore.calendar),{year:0,era:'',eraShort:''},'no generated human era or history');
  const naturalId=await page.evaluate(async()=>{const w=await mapStorage.getPage('world-browser');return w.character_data.world_maps[0].id;});
  const naturalData=await dataDigest();
  console.log('NEXUS_NATURAL_METRICS',JSON.stringify({
    coreBytes:fs.readdirSync(core,{recursive:true}).reduce((sum,name)=>{const file=path.join(core,name);return sum+(fs.statSync(file).isFile()?fs.statSync(file).size:0);},0),
    geography:await frame.evaluate(()=>({gridCells:grid.cells.i.length,packedCells:pack.cells.i.length,heapSampleBytes:performance.memory?.usedJSHeapSize??null})),
    projectBytes:await page.evaluate(async()=>{const w=await mapStorage.getPage('world-browser');return (await mapStorage.getAttachment(w.character_data.world_maps[0].attachment_id)).size_bytes;})
  }));
  // V2-2A: use real editor clicks and canonical Page persistence, without regenerating native data.
  const townForm=page.getByRole('dialog',{name:'Edit town entry',exact:true});
  const townPanel=page.getByRole('dialog',{name:'World entries',exact:true});
  const markerDialog=page.getByRole('dialog',{name:'Town marker',exact:true});
  const clickMapPoint=async(x=0.55,y=0.65)=>{
    await waitMapLayout();const box=await (await frame.frameElement()).boundingBox();
    const point=await frame.evaluate(({x,y})=>{const view=document.querySelector('#viewbox'),p=new DOMPoint(options.map.graph.width*x,options.map.graph.height*y).matrixTransform(view.getScreenCTM());return {x:p.x,y:p.y};},{x,y});
    await page.mouse.click(box.x+point.x,box.y+point.y);
  };
  // Let the existing asynchronous iframe configuration and resize settle before pointer coordinates are used.
  const waitMapLayout=async()=>{await page.waitForTimeout(250);await frame.waitForFunction(()=>Math.abs(document.getElementById('map').getBoundingClientRect().height-innerHeight)<1);assert.ok(await frame.evaluate(()=>!!document.querySelector('#viewbox').getScreenCTM()),'map transform is ready for pointer coordinates');};
  const readTowns=()=>page.evaluate(async()=>{const w=await mapStorage.getPage('world-browser');return {entities:w.character_data.world_entities??[],maps:w.character_data.world_maps};});
  await openWorldTools();await editor.getByRole('button',{name:'Add town',exact:true}).click();
  await townForm.waitFor();
  for(const viewport of [{width:390,height:844},{width:820,height:1180},{width:1440,height:1000}]){await page.setViewportSize(viewport);const layout=await townForm.evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,viewport:innerWidth,scroll:el.scrollWidth,client:el.clientWidth};});assert.ok(layout.left>=-1&&layout.right<=layout.viewport+1&&layout.scroll<=layout.client+1,'entry dialog fits viewport '+JSON.stringify(layout));}
  await page.getByRole('button',{name:'繁體中文',exact:true}).evaluate(el=>el.click());await page.getByLabel('城鎮名稱',{exact:true}).waitFor();
  await page.getByRole('button',{name:'English',exact:true}).evaluate(el=>el.click());
  await townForm.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal((await readTowns()).entities.length,0,'cancel point form leaves no entity');
  await openWorldTools();await editor.getByRole('button',{name:'Add town',exact:true}).click();
  await townForm.getByRole('button',{name:'Open world entry',exact:true}).click();
  await townForm.getByLabel('Town name',{exact:true}).fill('Canonical Harbor');
  await townForm.getByLabel('Short description',{exact:true}).fill('One official record');
  await townForm.locator('[contenteditable=true]').fill('Harbor chronicle');
  await page.evaluate(()=>{window.failMapSave=true;});
  await townForm.getByRole('button',{name:'Save entry',exact:true}).click();await townForm.getByRole('alert').waitFor();
  assert.equal((await readTowns()).entities.length,0,'transaction failure creates no half-record');
  await page.evaluate(()=>{window.failMapSave=false;});await townForm.getByRole('button',{name:'Save entry',exact:true}).click();await townForm.waitFor({state:'detached'});
  assert.equal((await readTowns()).maps[0].placements?.length??0,0,'creating an entry does not place it');
  await editor.getByRole('button',{name:'Place on selected map',exact:true}).click();await clickMapPoint();await frame.locator('#nexus-placements text').filter({hasText:'Canonical Harbor'}).waitFor();
  const townCreated=await readTowns(),townId=townCreated.entities[0].entityId;
  assert.equal(townCreated.entities.length,1);assert.equal(townCreated.maps[0].placements[0].entityId,townId);
  assert.match(JSON.stringify(townCreated.entities[0].content),/Harbor chronicle/,'Tiptap details are saved in the canonical entry');
  await frame.locator('#nexus-placements text').filter({hasText:'Canonical Harbor'}).waitFor();
  await openWorldTools();await editor.getByRole('button',{name:'Place existing entry',exact:true}).click();await townPanel.waitFor();
  await townPanel.getByText('Canonical Harbor',{exact:true}).waitFor();
  await townPanel.getByRole('button',{name:'Add town',exact:true}).click();
  await townForm.getByLabel('Town name',{exact:true}).fill('Unplaced Town');
  await townForm.getByRole('button',{name:'Save entry',exact:true}).click();await townForm.waitFor({state:'detached'});
  const unplaced=townPanel.locator('li').filter({hasText:'Unplaced Town'});await unplaced.getByText('Unplaced',{exact:true}).waitFor();
  await unplaced.getByRole('button',{name:'Place on selected map',exact:true}).click();await clickMapPoint(0.7,0.7);
  await frame.locator('#nexus-placements text').filter({hasText:'Unplaced Town'}).waitFor();
  // Both entrances edit the same canonical entry; no copy of the body is sent to the core.
  await waitMapLayout();await frame.locator('#nexus-placements text').filter({hasText:'Canonical Harbor'}).click();
  await markerDialog.getByRole('button',{name:'Open world entry',exact:true}).click();

  await townForm.getByLabel('Town name',{exact:true}).fill('Renamed Harbor');
  await townForm.getByRole('button',{name:'Save entry',exact:true}).click();await townForm.waitFor({state:'detached'});
  await frame.locator('#nexus-placements text').filter({hasText:'Renamed Harbor'}).waitFor();
  const beforeMove=(await readTowns()).entities;
  await waitMapLayout();await frame.locator('#nexus-placements text').filter({hasText:'Renamed Harbor'}).click();
  await markerDialog.getByRole('button',{name:'Move marker',exact:true}).click();await clickMapPoint(0.6,0.75);
  await page.waitForTimeout(300);assert.deepEqual((await readTowns()).entities,beforeMove,'moving never alters canonical body');
  assert.notDeepEqual((await readTowns()).maps[0].placements[0].geometry,townCreated.maps[0].placements[0].geometry);
  await waitMapLayout();await frame.locator('#nexus-placements text').filter({hasText:'Unplaced Town'}).click();
  await markerDialog.getByRole('button',{name:'Remove from this map',exact:true}).click();
  await page.getByRole('button',{name:'Confirm',exact:true}).click();await markerDialog.waitFor({state:'detached'});
  assert.equal((await readTowns()).entities.length,2,'removing marker retains entry');
  assert.equal(await frame.locator('#nexus-placements text').filter({hasText:'Unplaced Town'}).count(),0);
  assert.equal(await dataDigest(),naturalData,'entity changes never regenerate geography');
  await editor.getByRole('button',{name:'Save',exact:true}).click();
  await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();
  assert.equal(await page.evaluate(async()=>{const w=await mapStorage.getPage('world-browser');return (await (await mapStorage.readBinary(w.character_data.world_maps[0].attachment_id)).text()).includes('nexus-placements');}),false,'native snapshot excludes canonical label overlay');
  // Real IndexedDB backup: reject corrupt / foreign-owner input, restore, then cold-reopen.
  await page.evaluate(async()=>{
    const backup=await mapStorage.exportWorkspaceBackup();
    const original=backup.pages[0].character_data.world_maps[0];
    if(!backup.attachments.find(entry=>entry.attachment.id===original.attachment_id)?.binary_base64)throw Error('Natural project missing from backup');
    const corrupt=structuredClone(backup);corrupt.pages[0].character_data.world_maps[0].project_sha256='0'.repeat(64);
    let rejected=false;try{await mapStorage.importWorkspaceBackup(corrupt);}catch{rejected=true;}if(!rejected)throw Error('Corrupt backup accepted');
    mapStorage.setWorkspaceOwner('foreign-map-owner');
    try{rejected=false;try{await mapStorage.importWorkspaceBackup(backup);}catch{rejected=true;}if(!rejected)throw Error('Foreign owner backup accepted');}
    finally{mapStorage.setWorkspaceOwner('map-browser-owner');}
    await mapStorage.importWorkspaceBackup(backup);
    const restored=await mapStorage.getPage('world-browser');if(restored.character_data.world_maps[0].id!==original.id)throw Error('Backup changed map identity');
  });
  // Reopen actual native project before making any edits.
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});await refreshPreviewFrame();
  await openEntries();
  await townPanel.locator('li').filter({hasText:'Renamed Harbor'}).getByRole('button',{name:'Edit town entry',exact:true}).click();
  await townForm.getByLabel('Town name',{exact:true}).fill('Manager Harbor');await townForm.getByRole('button',{name:'Save entry',exact:true}).click();await townForm.waitFor({state:'detached'});
  await townPanel.getByRole('button',{name:'Close panel',exact:true}).click();
  frame=await currentMapFrame();await frame.locator('#nexus-placements text').filter({hasText:'Manager Harbor'}).waitFor();
  assert.equal((await readTowns()).entities[0].entityId,townId,'manager rename preserves stable ID');
  await page.reload();
  await enterEditor();await editor.waitFor({state:'visible'});
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  frame=await currentMapFrame();
  assert.equal(await dataDigest(),naturalData);
  frame=await currentMapFrame();await frame.locator('#nexus-placements text').filter({hasText:'Manager Harbor'}).waitFor();
  assert.equal((await readTowns()).entities.length,2,'towns survive backup and cold reopen');
  await openWorldTools('Natural geography');await editor.getByRole('button',{name:'Open native editor',exact:true}).click();
  const confirmNativeTool=async()=>{
    await nativeToolPanel.getByRole('button',{name:'Confirm tool',exact:true}).evaluate(el=>{window.nativeConfirmClicks=0;el.addEventListener('click',()=>window.nativeConfirmClicks++);});
    await nativeToolPanel.getByRole('button',{name:'Confirm tool',exact:true}).click();
    try{await nativeToolPanel.waitFor({state:'detached'});}catch(error){console.log('NATIVE_CONFIRM_FAILURE',await page.evaluate(()=>({clicks:window.nativeConfirmClicks,alerts:[...document.querySelectorAll('[role=alert]')].map(e=>e.textContent)})),await frame.evaluate(()=>({customization,tool:document.body.dataset.nexusTool,routeDraft:!!document.querySelector('#routeCreatorBody .editorLine')})));throw error;}
  };
  const nativeToolPanel=editor.getByRole('region',{name:'Native map tool',exact:true});await nativeToolPanel.waitFor();await waitMapLayout();await frame.locator('#brushRaise').click();
  const terrain=await frame.evaluate(()=>{
    const z=document.querySelector('#map').__zoom;
    const i=grid.cells.i.filter(i=>{const x=z.x+grid.points[i][0]*z.k,y=z.y+grid.points[i][1]*z.k;return grid.cells.h[i]>=30&&grid.cells.h[i]<80&&x>20&&y>80&&x<innerWidth-20&&y<innerHeight-20&&document.elementFromPoint(x,y)?.closest('#viewbox');}).sort((a,b)=>Math.hypot(grid.points[a][0]-640,grid.points[a][1]-400)-Math.hypot(grid.points[b][0]-640,grid.points[b][1]-400))[0];
    if(i===undefined)throw Error('No uncovered terrain cell');return {i,h:grid.cells.h[i],x:z.x+grid.points[i][0]*z.k,y:z.y+grid.points[i][1]*z.k};
  });
  await frame.locator('#map').click({position:{x:terrain.x,y:terrain.y},force:true});
  assert.ok(await frame.evaluate(i=>grid.cells.h[i],terrain.i)>terrain.h,'native raise brush edits height');
  await nativeToolPanel.getByRole('button',{name:'Undo stroke',exact:true}).click();assert.equal(await frame.evaluate(i=>grid.cells.h[i],terrain.i),terrain.h);
  await nativeToolPanel.getByRole('button',{name:'Redo stroke',exact:true}).click();assert.ok(await frame.evaluate(i=>grid.cells.h[i],terrain.i)>terrain.h);
  await confirmNativeTool();
  assert.deepEqual(await frame.evaluate(()=>options.map.nexus.stale),['hydrology','climate','biomes']);
  assert.equal(await frame.evaluate(()=>pack.burgs.filter(b=>b?.i).length),0);
  await frame.evaluate(()=>{closeDialogs();});
  // Manual biome paint and river name survive climate application; hydrology is never regenerated.
  const river=await frame.evaluate(()=>pack.rivers[0].i);
  await frame.evaluate(async id=>Controllers.RiverEditor.open('river'+id),river);
  await frame.locator('#riverName').fill('Manual River');await frame.evaluate(()=>closeDialogs());
  await frame.evaluate(()=>Controllers.BiomesEditor.open());await frame.locator('#biomesManually').click();
  await frame.locator('#paintEditorSelect').selectOption('4');
  const paint=await frame.evaluate(()=>{
    const z=document.querySelector('#map').__zoom,rects=[...document.querySelectorAll('.ui-dialog')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect());
    const i=pack.cells.i.find(i=>{const [px,py]=pack.cells.p[i],x=z.x+px*z.k,y=z.y+py*z.k;return pack.cells.h[i]>=20&&pack.cells.biome[i]!==4&&x>20&&y>100&&x<innerWidth-20&&y<innerHeight-20&&document.elementFromPoint(x,y)?.closest('#viewbox')&&document.elementFromPoint(x+8,y+1)?.closest('#viewbox')&&!rects.some(r=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom);});
    if(i===undefined)throw Error('No visible land cell for painting');return {i,x:z.x+pack.cells.p[i][0]*z.k,y:z.y+pack.cells.p[i][1]*z.k};
  });
  const paintFrameBounds=await (await frame.frameElement()).boundingBox();
  await page.mouse.move(paintFrameBounds.x+paint.x,paintFrameBounds.y+paint.y);await page.mouse.down();
  await page.mouse.move(paintFrameBounds.x+paint.x+8,paintFrameBounds.y+paint.y+1,{steps:4});await page.mouse.up();
  assert.equal(await frame.locator('#paintEditorUndo').isEnabled(),true,'drag creates a native paint history entry');
  await frame.locator('#paintEditorApply').click();
  assert.equal(await frame.evaluate(i=>pack.cells.biome[i],paint.i),4,'native biome brush is usable without civilization');
  await frame.evaluate(()=>closeDialogs());
  const manual=await frame.evaluate(i=>({i,rivers:JSON.stringify(pack.rivers),biomes:Array.from(pack.cells.biome)}),paint.i);
  await frame.evaluate(()=>Controllers.WorldConfigurator.open());
  await frame.getByRole('button',{name:'Apply climate',exact:true}).click();
  assert.equal(await frame.evaluate(()=>JSON.stringify(pack.rivers)),manual.rivers);
  assert.deepEqual(await frame.evaluate(()=>Array.from(pack.cells.biome)),manual.biomes);
  await frame.evaluate(()=>closeDialogs());
  await editor.getByRole('button',{name:'Save',exact:true}).click();await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();
  const geography=await dataDigest();
  await openExports();
  for(const type of ['SVG','PNG']){
    const pending=page.waitForEvent('download',{timeout:60000});await editor.getByRole('button',{name:type+' ↓',exact:true}).click();
    const download=await pending,file=path.join(tmp,'natural.'+type.toLowerCase());await download.saveAs(file);assert.ok(fs.statSync(file).size>1000,'natural '+type+' export');if(type==='SVG')assert.match(fs.readFileSync(file,'utf8'),/Manager Harbor/,'SVG includes canonical town label');
  }
  assert.equal(await dataDigest(),geography,'image exports preserve geography');
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});await refreshPreviewFrame();
  for(const preset of ['contours','temperature','precipitation','biomes','political','cultural','religions','physical']){
    await page.getByLabel('Display mode',{exact:true}).selectOption(preset);await page.waitForTimeout(100);
    assert.equal(await dataDigest(),geography,'view is presentation-only: '+preset);
    if(preset==='contours')await frame.locator('.heightmap-contours path').first().waitFor();
  }
  await enterEditor();await editor.waitFor({state:'visible'});
  await frame.evaluate(async()=>Services.Load.quickLoad());
  await frame.waitForFunction(i=>pack.cells.biome[i]===4,manual.i);
  assert.deepEqual(await frame.evaluate(()=>options.map.nexus.stale),['hydrology','biomes']);
  assert.equal(await page.evaluate(async id=>{const w=await mapStorage.getPage('world-browser');return w.character_data.world_maps[0].id===id;},naturalId),true);
  // The legacy-civilization fixture replaces content only; retain the native extent and placement coordinate system.
  await frame.evaluate(async()=>{const {width,height}=options.map.graph;await window.generateMapOnLoad({naturalOnly:false,width,height});});
  await openWorldTools('Natural geography');await editor.locator('[data-map-natural-back]').click();await editor.getByRole('button',{name:'Advanced tools',exact:true}).click();await editor.getByRole('button',{name:'Open native editor',exact:true}).click();await nativeToolPanel.waitFor();await waitMapLayout();
  await frame.locator('#exportButton').click();await frame.locator('#exportMapData').waitFor();
  assert.equal(await frame.locator('#exportMapData button').filter({hasText:/^\.(svg|png)$/}).count(),0);
  assert.equal(await frame.locator('#exportMapData button').filter({hasText:'.jpeg'}).count(),1);
  await frame.evaluate(()=>$('#exportMapData').dialog('close'));
  await frame.locator('#toolsTab').click();
  const burgId=await frame.evaluate(async()=>{const burg=pack.burgs.find(b=>b.i&&!b.removed);if(!burg)throw Error('No burg generated');await Controllers.BurgEditor.open(burg.i);return burg.i;});
  await frame.locator('#burgName').fill('Nexus Port');
  await confirmNativeTool();await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled));await frame.locator('#map').press('Control+s');
  await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor({timeout:60000});
  await frame.evaluate(id=>{pack.burgs[id].name='Temporary unsaved name';for(const code of ['F1','F2','F6','F9'])document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));},burgId);
  assert.equal(await frame.evaluate(id=>pack.burgs[id].name,burgId),'Temporary unsaved name','removed standalone shortcuts cannot replace the project');
  await frame.evaluate(async()=>Services.Load.quickLoad());
  await frame.waitForFunction(id=>pack.burgs[id].name==='Nexus Port',burgId);
  await openExports();
  let downloadEvent=page.waitForEvent('download',{timeout:60000});await editor.getByRole('button',{name:'.map ↓',exact:true}).click();
  const native=await downloadEvent,file=path.join(tmp,'roundtrip.map');await native.saveAs(file);assert.ok(fs.statSync(file).size>10000);
  await openExports();
  for(const type of ['SVG','PNG']){downloadEvent=page.waitForEvent('download',{timeout:60000});await editor.getByRole('button',{name:type+' ↓',exact:true}).click();const image=await downloadEvent;const p=path.join(tmp,type.toLowerCase());await image.saveAs(p);assert.ok(fs.statSync(p).size>1000);}
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});await refreshPreviewFrame();
  const firstSession=await frame.evaluate(()=>location.href);
  assert.ok(await frame.evaluate(()=>{const m=document.querySelector('#map'),z=m.__zoom,w=options.map.graph.width,h=options.map.graph.height;return z.x>=-1&&z.y>=-1&&z.x+w*z.k<=m.width.baseVal.value+1&&z.y+h*z.k<=m.height.baseVal.value+1;}),'initial preview contains the whole map: '+JSON.stringify(await frame.evaluate(()=>({z:document.querySelector('#map').__zoom,w:options.map.graph.width,h:options.map.graph.height,viewport:[innerWidth,innerHeight]}))));
  const revisionBefore=await page.evaluate(async()=>{const p=await window.mapStorage.getPage('world-browser');return p.revision;});
  await page.getByLabel('Display mode',{exact:true}).selectOption('temperature');
  await frame.waitForFunction(()=>{const node=document.querySelector('[data-layer=temperature]');return node&&getComputedStyle(node).display!=='none';});
  assert.equal(await frame.evaluate(()=>location.href),firstSession,'layer preview reuses the core');
  assert.equal(await frame.evaluate(()=>document.body.classList.contains('nexus-preview')),true);
  await frame.locator('#map').click({position:{x:120,y:120}});
  assert.equal(await page.getByRole('dialog',{name:'World map editor'}).count(),0);
  await frame.evaluate(()=>{const field=document.createElement('input');field.id='locale-user-input';field.value='Save';document.body.append(field);document.querySelector('#layersPreset').add(new Option('Cancel','Cancel'));});
  await frame.evaluate(id=>{window.localeOldDescription=pack.burgs[id].description;pack.burgs[id].description='<p>Save</p>';const data=document.createElement('p');data.id='locale-map-data';data.textContent='Save';document.querySelector('#dialogs').append(data);},burgId);
  await page.getByRole('button',{name:'繁體中文',exact:true}).click();
  await frame.waitForFunction(()=>document.documentElement.lang==='zh-TW');
  assert.equal(await page.getByLabel('地圖範圍',{exact:true}).count(),0);assert.match(await page.getByLabel('地區',{exact:true}).locator('option:checked').innerText(),/^主地表/);
  assert.equal(await frame.locator('#layersTab').innerText(),'圖層');
  assert.equal(await frame.locator('#locale-user-input').inputValue(),'Save');
  assert.equal(await frame.locator('#layersPreset option[value=Cancel]').textContent(),'Cancel');
  assert.equal(await frame.locator('#locale-map-data').textContent(),'Save');
  await frame.evaluate(id=>{document.querySelector('#locale-user-input').remove();document.querySelector('#locale-map-data').remove();if(window.localeOldDescription===undefined)delete pack.burgs[id].description;else pack.burgs[id].description=window.localeOldDescription;},burgId);
  assert.equal(await frame.locator('#optionsContent').getByText('介面大小',{exact:true}).count(),1);
  assert.equal(await frame.locator('#editStatesButton').getAttribute('data-tip'),'開啟國家編輯器');
  assert.equal(await frame.locator('#exportButton').innerText(),'進階匯出');
  assert.notEqual(await frame.locator('#tooltip').evaluate(el=>getComputedStyle(el).opacity),'0');
  assert.equal(await frame.evaluate(id=>pack.burgs[id].name,burgId),'Nexus Port');
  await page.getByRole('button',{name:'English',exact:true}).click();
  await frame.waitForFunction(()=>document.documentElement.lang==='en');
  assert.equal(await frame.locator('#layersTab').innerText(),'Layers');
  assert.equal(await page.evaluate(async()=>{const p=await window.mapStorage.getPage('world-browser');return p.revision;}),revisionBefore,'preview/layers/language do not write');
  await page.getByRole('button',{name:'Full screen',exact:true}).click();
  await page.waitForFunction(()=>Boolean(document.fullscreenElement));
  await page.evaluate(()=>document.exitFullscreen());
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'mobile has no horizontal overflow');
  assert.equal(await page.getByText('Legacy gender',{exact:true}).count(),0);
  assert.equal(await page.evaluate(async()=>{const p=await window.mapStorage.getPage('world-browser');return p.character_data.basic.gender;}),'Legacy gender');
  assert.equal(await page.getByRole('button',{name:'Zoom in',exact:true}).isVisible(),false,'phone uses gestures instead of persistent +/-');
  await page.getByRole('button',{name:'Full screen',exact:true}).waitFor();
  await page.evaluate(()=>{window.scrollTo(0,0);document.querySelector('[data-map-scroll]').scrollTop=0;});
  await page.waitForFunction(()=>{const canvas=document.querySelector('[data-map-canvas]');return canvas.getBoundingClientRect().bottom<=innerHeight+1;});
  await page.waitForTimeout(200);
  const editBounds=await page.getByRole('button',{name:'Edit map',exact:true}).boundingBox();
  assert.ok(editBounds.y>=0&&editBounds.y+editBounds.height<=844,'phone editing tool is not clipped by the viewport: '+JSON.stringify({editBounds,canvas:await page.locator('[data-map-canvas]').first().boundingBox(),page:await page.evaluate(()=>({height:innerHeight,scroll:document.querySelector('[data-map-scroll]').scrollTop,y:scrollY}))}));
  assert.equal(await frame.locator('#map').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)','preview whitespace inherits the Nexus theme');
  await page.screenshot({path:path.join(tmp,'mobile.jpg')});
  await openManage();
  assert.ok(await manage.evaluate(el=>el.scrollWidth<=el.clientWidth),'mobile management has no internal horizontal overflow');
  await page.screenshot({path:path.join(tmp,'management.jpg')});
  await closeManage();
  const cdp=await context.newCDPSession(page);
  const touches=async(points)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});};
  const moveTouches=async(points)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points});await page.waitForTimeout(30);};
  const endTouches=async()=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(250);};
  await page.getByRole('button',{name:'Reset view',exact:true}).click();
  await page.waitForTimeout(200);
  let touchBox=await frame.locator('#map').boundingBox();
  const cx=touchBox.x+touchBox.width/2,cy=Math.min(touchBox.y+touchBox.height/2,600);
  const beforeTouchScale=await frame.evaluate(()=>document.querySelector('#map').__zoom.k);
  const mapScroll=()=>page.evaluate(()=>{let value=scrollY,node=document.querySelector('[data-map-canvas]');while(node){value+=node.scrollTop;node=node.parentElement;}return value;});
  const scrollBefore=await mapScroll();
  await touches([{x:cx,y:cy+50,id:1}]);
  for(let d=0;d<=100;d+=20)await moveTouches([{x:cx,y:cy+50-d,id:1}]);
  await endTouches();
  assert.ok(await mapScroll()>scrollBefore,'single finger scrolls the page');
  assert.ok(Math.abs(await frame.evaluate(()=>document.querySelector('#map').__zoom.k)-beforeTouchScale)<0.0001);
  await page.evaluate(()=>{window.scrollTo(0,0);let node=document.querySelector('[data-map-canvas]');while(node){node.scrollTop=0;node=node.parentElement;}});
  touchBox=await frame.locator('#map').boundingBox();
  const py=Math.min(touchBox.y+touchBox.height/2,580),px=touchBox.x+touchBox.width/2;
  const beforePinch=await frame.evaluate(()=>({k:document.querySelector('#map').__zoom.k,x:document.querySelector('#map').__zoom.x,y:document.querySelector('#map').__zoom.y}));
  const pageBeforePinch=await mapScroll();
  await touches([{x:px-35,y:py,id:1},{x:px+35,y:py,id:2}]);
  for(let d=40;d<=90;d+=10)await moveTouches([{x:px-d,y:py,id:1},{x:px+d,y:py,id:2}]);
  await endTouches();
  await frame.waitForFunction(k=>document.querySelector('#map').__zoom.k>k*1.5,beforePinch.k);assert.ok(await frame.evaluate(()=>document.querySelector('#map').__zoom.k)>beforePinch.k*1.5,'two fingers zoom smoothly');
  assert.equal(await mapScroll(),pageBeforePinch);
  const zoomed=await frame.evaluate(()=>document.querySelector('#map').__zoom.k);
  await touches([{x:px-85,y:py,id:1},{x:px+85,y:py,id:2}]);
  for(let d=75;d>=50;d-=5)await moveTouches([{x:px-d,y:py,id:1},{x:px+d,y:py,id:2}]);
  await endTouches();
  await frame.waitForFunction(k=>document.querySelector('#map').__zoom.k<k,zoomed);assert.ok(await frame.evaluate(()=>document.querySelector('#map').__zoom.k)<zoomed,'pinch inward zooms out');
  const pinchPosition=await frame.evaluate(()=>({x:document.querySelector('#map').__zoom.x,y:document.querySelector('#map').__zoom.y}));
  await touches([{x:px-45,y:py,id:1},{x:px+45,y:py,id:2}]);
  for(let d=5;d<=25;d+=5)await moveTouches([{x:px-45+d,y:py+15,id:1},{x:px+45+d,y:py+15,id:2}]);
  await endTouches();
  await frame.waitForFunction(p=>{const z=document.querySelector('#map').__zoom;return Math.abs(z.x-p.x)>1||Math.abs(z.y-p.y)>1;},pinchPosition);assert.ok(await frame.evaluate(p=>{const z=document.querySelector('#map').__zoom;return Math.abs(z.x-p.x)>1||Math.abs(z.y-p.y)>1;},pinchPosition),'two-finger pan moves the map');
  const gestureScale=await frame.evaluate(()=>document.querySelector('#map').__zoom.k);
  await page.getByLabel('Display mode',{exact:true}).selectOption('physical');
  await page.waitForTimeout(250);
  assert.ok(Math.abs(await frame.evaluate(()=>document.querySelector('#map').__zoom.k)-gestureScale)<0.0001,'layers preserve manual zoom');
  const stableView=await frame.evaluate(()=>({x:document.querySelector('#map').__zoom.x,y:document.querySelector('#map').__zoom.y,k:document.querySelector('#map').__zoom.k}));
  await page.evaluate(()=>{window.setMapCloud({status:'error',error:'simulated',pendingPushes:1});window.setMapTitle('A very long world title '.repeat(20));});
  await page.getByRole('alert').filter({hasText:'Sync failed'}).waitFor();
  await page.locator('h1').filter({hasText:'A very long world title'}).waitFor();assert.ok(await page.locator('h1').evaluate(el=>el.scrollWidth>el.clientWidth),'long title is truncated');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
  assert.deepEqual(await frame.evaluate(()=>({x:document.querySelector('#map').__zoom.x,y:document.querySelector('#map').__zoom.y,k:document.querySelector('#map').__zoom.k})),stableView,'sync/title updates preserve the view');
  await page.evaluate(()=>window.setMapCloud({status:'connected',error:null,pendingPushes:2}));
  await page.getByText('Waiting to sync',{exact:true}).waitFor();
  await page.evaluate(()=>{window.setMapCloud({status:'idle',error:null,pendingPushes:0});window.setMapTitle('Test World');});
  assert.equal(await page.getByText('Cloud connected',{exact:true}).count(),0,'idle is not called synchronized');
  await page.getByRole('button',{name:'Full screen',exact:true}).click();
  await page.waitForFunction(()=>Boolean(document.fullscreenElement));await page.waitForTimeout(250);
  touchBox=await frame.locator('#map').boundingBox();
  const fullBefore=await frame.evaluate(()=>({x:document.querySelector('#map').__zoom.x,y:document.querySelector('#map').__zoom.y}));
  const fullScroll=await mapScroll();
  await touches([{x:touchBox.width/2,y:touchBox.height/2,id:1}]);
  for(let d=10;d<=70;d+=10)await moveTouches([{x:touchBox.width/2+d,y:touchBox.height/2+20,id:1}]);
  await endTouches();
  assert.ok(await frame.evaluate(p=>{const z=document.querySelector('#map').__zoom;return Math.abs(z.x-p.x)>1||Math.abs(z.y-p.y)>1;},fullBefore),'full-screen allows single-finger pan');
  assert.equal(await mapScroll(),fullScroll);
  await page.getByRole('button',{name:'Exit full screen',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);
  const bodyOverflow=await page.evaluate(()=>document.body.style.overflow);
  await page.locator('[data-map-canvas]').evaluate(el=>{el.closest('[aria-label]').requestFullscreen=undefined;});
  await page.getByRole('button',{name:'Full screen',exact:true}).click();
  await page.getByRole('button',{name:'Exit full screen',exact:true}).waitFor();
  await page.waitForFunction(()=>document.body.style.overflow==='hidden');
  assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),false,'full-screen fallback works without the browser API');
  await page.getByRole('button',{name:'Exit full screen',exact:true}).focus();await page.keyboard.press('Escape');
  await page.waitForFunction(old=>document.body.style.overflow===old,bodyOverflow);
  await page.setViewportSize({width:820,height:1180});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'tablet has no horizontal overflow');
  await page.setViewportSize({width:1440,height:1000});
  await page.getByLabel('Display mode',{exact:true}).selectOption('political');
  const zoomBefore=await frame.evaluate(()=>document.querySelector('#map').__zoom.k);
  await page.getByRole('button',{name:zoomBefore<19?'Zoom in':'Zoom out',exact:true}).click();
  await frame.waitForFunction(before=>document.querySelector('#map').__zoom.k!==before,zoomBefore);
  if(await frame.evaluate(()=>document.querySelector('#map').__zoom.k>=19)){const capped=await frame.evaluate(()=>document.querySelector('#map').__zoom.k);await page.getByRole('button',{name:'Zoom out',exact:true}).click();await frame.waitForFunction(before=>document.querySelector('#map').__zoom.k<before,capped);}
  const beforeDouble=await frame.evaluate(()=>document.querySelector('#map').__zoom.k);
  await frame.locator('#map').dblclick({position:{x:200,y:180}});await frame.waitForFunction(before=>document.querySelector('#map').__zoom.k>before,beforeDouble,{timeout:5000});
  assert.ok(await frame.evaluate(()=>document.querySelector('#map').__zoom.k)>beforeDouble,'double click zooms in read-only preview');
  const mapBox=await frame.locator('#map').boundingBox();
  const panBefore=await frame.evaluate(()=>({x:document.querySelector('#map').__zoom.x,y:document.querySelector('#map').__zoom.y}));let panned=false;
  for(const direction of [1,-1]){await page.mouse.move(mapBox.x+mapBox.width/2,mapBox.y+mapBox.height/2);await page.mouse.down();await page.mouse.move(mapBox.x+mapBox.width/2+direction*40,mapBox.y+mapBox.height/2+direction*20,{steps:3});await page.mouse.up();const after=await frame.evaluate(()=>({x:document.querySelector('#map').__zoom.x,y:document.querySelector('#map').__zoom.y}));panned=panned||after.x!==panBefore.x||after.y!==panBefore.y;}
  assert.ok(panned,'read-only map can be dragged');
  const viewScale=await frame.evaluate(()=>document.querySelector('#map').__zoom.k);
  await enterEditor();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  frame=await currentMapFrame();
  assert.ok(await frame.evaluate(previous=>{const map=document.querySelector('#map'),fit=Math.min(map.width.baseVal.value/options.map.graph.width,map.height.baseVal.value/options.map.graph.height);return Math.abs(map.__zoom.k-Math.max(previous,fit))<0.0001;},viewScale),'editor preserves zoom subject to its larger contain-fit minimum');
  assert.equal(await frame.evaluate(id=>pack.burgs[id].name,burgId),'Nexus Port');
  // A failed canonical write keeps the editor and a local-only recovery project.
  await frame.evaluate(id=>{pack.burgs[id].name='Recovery Port';document.dispatchEvent(new Event('input',{bubbles:true}));},burgId);
  await page.evaluate(()=>{window.failMapSave=true;});await editor.getByRole('button',{name:'Save',exact:true}).click();
  await editor.getByRole('alert').filter({hasText:'Simulated local save failure'}).waitFor();
  assert.ok(await page.evaluate(async()=>{const p=await window.mapStorage.getPage('world-browser'),map=p.character_data.world_maps[0];return Boolean(await window.mapStorage.getWorkspacePersistence().readMapDraft('map-browser-owner',p.id,map.id));}));
  await page.reload();await enterEditor();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  frame=await currentMapFrame();assert.equal(await frame.evaluate(id=>pack.burgs[id].name,burgId),'Recovery Port');
  await editor.getByRole('button',{name:'Save',exact:true}).click();await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();
  await context.setOffline(true);await setNetwork(page,true);
  await frame.evaluate(id=>{pack.burgs[id].name='Offline Port';document.dispatchEvent(new Event('input',{bubbles:true}));},burgId);
  await editor.getByRole('button',{name:'Save',exact:true}).click();await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});await refreshPreviewFrame();
  await enterEditor();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  frame=await currentMapFrame();
  assert.equal(await frame.evaluate(id=>pack.burgs[id].name,burgId),'Offline Port');
  await context.setOffline(false);await setNetwork(page,false);await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});await refreshPreviewFrame();
  await openManage();await manage.locator('input[type=file]').setInputFiles(file);await confirmName('Atlas Imported');
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  frame=await currentMapFrame();assert.equal(await frame.evaluate(id=>pack.burgs[id].name,burgId),'Nexus Port');
  await frame.evaluate(async id=>{await Controllers.BurgEditor.open(id);},burgId);await frame.locator('#burgName').fill('Imported Editable Port');
  // The retained loader API still uses the awaitable failure boundary.
  await editor.getByRole('button',{name:'Save',exact:true}).click();await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();
  await frame.evaluate(()=>Services.Load.uploadMap(new Blob(['invalid'],{type:'application/octet-stream'})));
  await editor.getByRole('alert').filter({hasText:'Native project loading failed'}).waitFor();
  assert.equal(await editor.getByRole('button',{name:'Save',exact:true}).isDisabled(),true);
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});await refreshPreviewFrame();
  assert.equal(await page.evaluate(async()=>{const backup=await window.mapStorage.exportWorkspaceBackup();return backup.pages[0].character_data.world_maps.filter(m=>m.deleted_at==null).length;}),2);
  // A second native project references the same canonical body, rather than copying it.
  await (await regionSelect()).selectOption(await (await regionSelect()).locator('option').filter({hasText:'Atlas One'}).getAttribute('value'));
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')==='Edit map'&&!b.disabled),{},{timeout:120000});
  await openEntries();
  await townPanel.getByLabel('Placement map',{exact:true}).selectOption({label:'Atlas Imported'});
  await townPanel.locator('li').filter({hasText:'Manager Harbor'}).getByRole('button',{name:'Place on selected map',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  frame=await currentMapFrame();await clickMapPoint();
  frame=await currentMapFrame();await frame.locator('#nexus-placements text').filter({hasText:'Manager Harbor'}).waitFor();
  const crossMap=await readTowns();assert.equal(crossMap.entities.length,2);
  assert.equal(crossMap.maps.find(map=>map.title==='Atlas Imported').placements[0].entityId,townId);
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});await refreshPreviewFrame();
  await openManage();
  const row=manage.locator('li').filter({has:page.getByRole('button',{name:'Atlas Imported',exact:true})});
  await row.locator('summary').click();
  await row.getByRole('button',{name:'Duplicate',exact:true}).click();await page.getByRole('button',{name:/Atlas Imported copy/}).waitFor();
  await row.getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await page.getByText('Deleted maps',{exact:true}).click();
  const restore=page.getByRole('button',{name:'Restore',exact:true});await restore.click();await restore.waitFor({state:'detached'});
  assert.equal(await page.evaluate(async()=>{const p=await window.mapStorage.getPage('world-browser');return p.character_data.world_maps.filter(m=>m.deleted_at==null).length;}),3);
  frame=await currentMapFrame();const sessionBeforeSwitch=await frame.evaluate(()=>location.href);
  await manage.getByRole('button',{name:'Atlas Imported copy',exact:true}).click();
  await (await regionSelect()).selectOption(await (await regionSelect()).locator('option').filter({hasText:'Atlas Imported copy'}).getAttribute('value'));
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')==='Zoom in'&&!b.disabled),{},{timeout:120000});
  assert.equal(await frame.evaluate(()=>location.href),sessionBeforeSwitch,'switching maps reuses the core');
  assert.ok(await frame.evaluate(()=>{const m=document.querySelector('#map'),z=m.__zoom;return Math.abs(z.k-Math.min(m.width.baseVal.value/options.map.graph.width,m.height.baseVal.value/options.map.graph.height))<0.0001;}),'switching maps returns to fit');
  assert.equal(await page.getByLabel('Map scope',{exact:true}).count(),0,'new region/town submaps are not offered');
  const spaces=await page.evaluate(async()=>{const p=await mapStorage.getPage('world-browser');return p.character_data.world_maps.filter(m=>m.deleted_at==null);});assert.equal(spaces.filter(m=>m.scope==='surface').length,1);assert.equal(spaces.find(m=>m.title==='Atlas Imported copy').scope,'underground');
  await openManage();await manage.getByLabel('New space type',{exact:true}).selectOption('sky');await manage.getByRole('button',{name:'Create map',exact:true}).click();await confirmName('Detail Created');
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  assert.equal(await frame.evaluate(()=>pack.burgs.filter(b=>b?.i).length),0);assert.equal(await frame.evaluate(()=>options.map.nexus.scaleKnown),true);assert.equal(await frame.evaluate(()=>options.map.units.distance.scale),1000/1280);
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});await refreshPreviewFrame();
  assert.equal(await page.evaluate(async()=>{const p=await mapStorage.getPage('world-browser');return p.character_data.world_maps.find(m=>m.title==='Detail Created').scope;}),'sky');
  await openManage();await manage.getByRole('button',{name:'Create map',exact:true}).click();await confirmName('Aspect map');
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  for(const [width,height] of [[1600,400],[400,1600]]){
    frame=await currentMapFrame();
    await openWorldTools('Natural geography');await editor.locator('[data-map-natural-back]').click();await editor.getByRole('button',{name:'Advanced tools',exact:true}).click();await editor.getByRole('button',{name:'Open native editor',exact:true}).click();await nativeToolPanel.waitFor();
    await frame.evaluate(async size=>{await window.generateMapOnLoad(size);}, {width,height});assert.deepEqual(await frame.evaluate(()=>[options.map.graph.width,options.map.graph.height]),[width,height]);await confirmNativeTool();
    await editor.getByRole('button',{name:'Save',exact:true}).click();await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();
    await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});await refreshPreviewFrame();
    const aspectMapId=await (await regionSelect()).locator('option').filter({hasText:'Aspect map'}).getAttribute('value');await (await regionSelect()).selectOption(aspectMapId);await refreshPreviewFrame();await frame.waitForFunction(({width,height})=>options.map.graph.width===width&&options.map.graph.height===height,{width,height});
    await page.getByRole('button',{name:'Reset view',exact:true}).click();await frame.waitForFunction(()=>{const m=document.querySelector('#map'),z=m.__zoom,w=options.map.graph.width,h=options.map.graph.height;return z.x>=-1&&z.y>=-1&&z.x+w*z.k<=m.width.baseVal.value+1&&z.y+h*z.k<=m.height.baseVal.value+1&&Math.abs(z.k-Math.min(m.width.baseVal.value/w,m.height.baseVal.value/h))<0.0001;});
    const bounds=await frame.evaluate(()=>{const m=document.querySelector('#map'),z=m.__zoom,w=options.map.graph.width,h=options.map.graph.height;return {left:z.x,top:z.y,right:z.x+w*z.k,bottom:z.y+h*z.k,vw:m.width.baseVal.value,vh:m.height.baseVal.value,k:z.k,w,h};});
    const storedGraph=await page.evaluate(async()=>{const w=await mapStorage.getPage('world-browser'),m=w.character_data.world_maps.find(m=>m.title==='Aspect map');return JSON.parse((await(await mapStorage.readBinary(m.attachment_id)).text()).split('\r\n')[1]).graph;});assert.deepEqual([storedGraph.width,storedGraph.height],[width,height],'canonical attachment preserves the edited extent');
    assert.equal(bounds.w,width);assert.equal(bounds.h,height);
    assert.ok(bounds.left>=-1&&bounds.top>=-1&&bounds.right<=bounds.vw+1&&bounds.bottom<=bounds.vh+1,'all four map edges fit inside the container');
    assert.ok(Math.abs(bounds.k-Math.min(bounds.vw/bounds.w,bounds.vh/bounds.h))<0.0001);
    await enterEditor();await editor.waitFor({state:'visible'});
  }
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});await refreshPreviewFrame();
  // V2-2B: real canonical country/admin forms, manual candidate geometry and derived area.
  await (await regionSelect()).selectOption(await (await regionSelect()).locator('option').filter({hasText:'Detail Created'}).getAttribute('value'));
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')==='Edit map'&&!b.disabled),{},{timeout:120000});
  frame=await currentMapFrame();
  await openEntries();
  await townPanel.getByRole('button',{name:'Add country',exact:true}).click();
  const countryForm=page.getByRole('dialog',{name:'Edit country entry',exact:true}),adminForm=page.getByRole('dialog',{name:'Edit administrative entry',exact:true});
  await countryForm.getByLabel('Name',{exact:true}).fill('North Republic');
  await countryForm.getByLabel('Custom political / administrative type',{exact:true}).fill('Merchant council');
  await countryForm.getByLabel('Capital town',{exact:true}).selectOption({label:'Manager Harbor'});
  await countryForm.locator('[contenteditable=true]').fill('Constitution and history');
  await countryForm.getByRole('button',{name:'Save entry',exact:true}).click();await countryForm.waitFor({state:'detached'});
  const countryId=(await readTowns()).entities.find(e=>e.name==='North Republic').entityId;
  await townPanel.getByRole('button',{name:'Add administrative area',exact:true}).click();
  await adminForm.getByLabel('Name',{exact:true}).fill('North Province');
  await adminForm.getByLabel('Parent country / administrative area',{exact:true}).selectOption(countryId);
  await adminForm.getByLabel('Administrative center',{exact:true}).selectOption({label:'Manager Harbor'});
  await adminForm.getByRole('button',{name:'Save entry',exact:true}).click();await adminForm.waitFor({state:'detached'});
  await townPanel.getByRole('button',{name:'Close panel',exact:true}).click();
  await enterEditor();
  await openWorldTools('Human geography','Polities');await editor.getByRole('button',{name:'Add polity',exact:true}).click();
  await countryForm.getByLabel('Name',{exact:true}).fill('Cancelled Realm');
  await countryForm.getByRole('button',{name:'Save entry',exact:true}).click();await countryForm.waitFor({state:'detached'});
  await editor.getByRole('button',{name:'Edit territory',exact:true}).click();
  const paintTools=page.getByLabel('Territory painting',{exact:true}),areaOutput=page.getByLabel('Territory area',{exact:true});
  await paintTools.waitFor();assert.equal(await paintTools.getByRole('group',{name:'Brush mode',exact:true}).getByRole('button').count(),2);await paintTools.getByRole('button',{name:'Cancel',exact:true}).click();await paintTools.waitFor({state:'detached'});
  assert.equal((await readTowns()).entities.some(e=>e.name==='Cancelled Realm'),true,'cancel painting preserves the separately saved unplaced entry');
  await openWorldTools();await editor.getByRole('button',{name:'Place existing entry',exact:true}).click();
  await townPanel.getByLabel('Placement map',{exact:true}).selectOption({label:'Detail Created'});
  await townPanel.locator('li').filter({hasText:'North Republic'}).getByRole('button',{name:'Place on selected map',exact:true}).click();
  await areaOutput.waitFor();await page.waitForTimeout(250);
  frame=await currentMapFrame();const regionMapId=await (await regionSelect()).inputValue();
  const nativeBefore=(await readTowns()).maps.find(m=>m.id===regionMapId).attachment_id,politicalDigest=await dataDigest();
  await page.waitForFunction(()=>/:\s*[0-9]/.test(document.querySelector('output[aria-label="Territory area"]')?.textContent??''));await waitMapLayout();
  const candidates=await frame.evaluate(()=>{const z=document.querySelector('#map').__zoom;const cells=pack.cells.i.filter(i=>{const p=pack.cells.p[i],x=z.x+p[0]*z.k,y=z.y+p[1]*z.k;return pack.cells.h[i]>=20&&x>100&&x<innerWidth-100&&y>130&&y<innerHeight-70&&document.elementFromPoint(x,y)?.closest('#viewbox');});const a=cells[Math.floor(cells.length/3)];const b=cells.find(i=>Math.hypot(pack.cells.p[i][0]-pack.cells.p[a][0],pack.cells.p[i][1]-pack.cells.p[a][1])*z.k>180);if(a===undefined||b===undefined)throw Error('No separated visible land cells '+JSON.stringify({visible:cells.length,graph:options.map.graph,viewport:[innerWidth,innerHeight],zoom:z}));return [a,b];});
  const stroke=async(cell,touch=false)=>{frame=await currentMapFrame();await page.waitForFunction(()=>/[0-9]/.test(document.querySelector('output[aria-label="Territory area"]')?.textContent??''));await waitMapLayout();const p=await frame.evaluate(i=>{const z=document.querySelector('#map').__zoom;return {x:z.x+pack.cells.p[i][0]*z.k,y:z.y+pack.cells.p[i][1]*z.k};},cell),box=await (await frame.frameElement()).boundingBox();if(touch){await touches([{id:61,x:box.x+p.x,y:box.y+p.y}]);await moveTouches([{id:61,x:box.x+p.x+8,y:box.y+p.y+1}]);await endTouches();}else{await page.mouse.move(box.x+p.x,box.y+p.y);await page.mouse.down();await page.mouse.move(box.x+p.x+8,box.y+p.y+1,{steps:4});await page.mouse.up();}await page.waitForTimeout(200);};
  await stroke(candidates[0]);await paintTools.getByRole('button',{name:'Undo stroke',exact:true}).waitFor();
  const firstArea=await areaOutput.innerText();assert.match(firstArea,/km²/,'calibrated region uses a labelled planar estimate');
  assert.equal((await readTowns()).maps.find(m=>m.id===regionMapId).placements?.some(p=>p.entityId===countryId)??false,false,'painting is not persisted before confirmation');
  await paintTools.getByRole('button',{name:'Undo stroke',exact:true}).click();await page.waitForFunction(()=>/: 0 km²/.test(document.querySelector('output[aria-label="Territory area"]')?.textContent??''));assert.match(await areaOutput.innerText(),/: 0 km²/);
  await paintTools.getByRole('button',{name:'Redo stroke',exact:true}).click();await page.waitForFunction(value=>document.querySelector('output[aria-label="Territory area"]')?.textContent===value,firstArea);assert.equal(await areaOutput.innerText(),firstArea);
  await stroke(candidates[1]);
  await page.evaluate(()=>{window.failMapSave=true;});await paintTools.getByRole('button',{name:'Save territory',exact:true}).click();
  await editor.getByRole('alert').filter({hasText:'Simulated local save failure'}).waitFor();
  assert.equal((await readTowns()).maps.find(m=>m.id===regionMapId).placements?.some(p=>p.entityId===countryId)??false,false,'failed territory transaction keeps the candidate without a partial placement');
  await page.evaluate(()=>{window.failMapSave=false;});await paintTools.getByRole('button',{name:'Save territory',exact:true}).click();await paintTools.waitFor({state:'detached'});
  let regionWorld=await readTowns();let territory=regionWorld.maps.find(m=>m.id===regionMapId).placements.find(p=>p.entityId===countryId&&p.deletedAt===null);
  assert.ok(territory.geometry.cells.length>1);assert.equal(regionWorld.maps.find(m=>m.id===regionMapId).attachment_id,nativeBefore,'political edits enqueue no native binary');
  assert.equal(await dataDigest(),politicalDigest,'territory painting never changes geography or native civilization');
  assert.ok(await frame.evaluate(cells=>{const unseen=new Set(cells);let n=0;while(unseen.size){n++;const queue=[unseen.values().next().value];unseen.delete(queue[0]);while(queue.length){for(const c of pack.cells.c[queue.pop()])if(unseen.delete(c))queue.push(c);}}return n>=2;},territory.geometry.cells),'detached territories are supported');
  // Direct map creation remains a candidate, then atomically creates the country and transfers explicitly confirmed overlap.
  await openWorldTools('Human geography','Polities');await editor.getByRole('button',{name:'Add polity',exact:true}).click();await countryForm.getByLabel('Name',{exact:true}).fill('South Realm');
  await countryForm.getByRole('button',{name:'Save entry',exact:true}).click();await countryForm.waitFor({state:'detached'});await editor.getByRole('button',{name:'Edit territory',exact:true}).click();await areaOutput.waitFor();
  assert.equal((await readTowns()).entities.some(e=>e.name==='South Realm'),true,'entry is saved before placement');
  await stroke(candidates[0]);await paintTools.getByRole('alert').filter({hasText:'Overlaps these countries:'}).waitFor();
  await paintTools.getByRole('button',{name:'Save territory',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await paintTools.waitFor({state:'detached'});
  regionWorld=await readTowns();assert.equal(regionWorld.entities.filter(e=>e.name==='South Realm').length,1);
  territory=regionWorld.maps.find(m=>m.id===regionMapId).placements.find(p=>p.placementId===territory.placementId);
  assert.equal(await dataDigest(),politicalDigest,'confirmed reassignment does not regenerate native geography');
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});await refreshPreviewFrame();
  const openRegionInfo=async name=>{if(await editor.isVisible()){await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});await refreshPreviewFrame();}await page.locator('[data-world-details]').getByRole('button',{name,exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Locate in editor',exact:true}).click().catch(async error=>{console.log('DETAIL_LOCATE_STATE',await page.locator('dialog[open]').allTextContents());throw error;});frame=await currentMapFrame();await waitMapLayout();};
  await openRegionInfo('North Republic');const regionInfo=page.getByRole('dialog',{name:'Territory details',exact:true});
  await regionInfo.getByRole('button',{name:'Open world entry',exact:true}).click();await countryForm.getByLabel('Name',{exact:true}).fill('North Union');
  await countryForm.getByRole('button',{name:'Save entry',exact:true}).click();await countryForm.waitFor({state:'detached'});
  await openRegionInfo('North Union');await regionInfo.getByRole('button',{name:'Edit territory',exact:true}).click();await paintTools.waitFor();await areaOutput.waitFor();
  await paintTools.getByRole('button',{name:'Erase cells',exact:true}).click();await stroke(candidates[1]);
  await paintTools.getByRole('button',{name:'Cancel',exact:true}).click();await paintTools.waitFor({state:'detached'});
  assert.deepEqual((await readTowns()).maps.find(m=>m.id===regionMapId).placements.find(p=>p.placementId===territory.placementId).geometry,territory.geometry,'cancelled edit preserves saved geometry');
  await openWorldTools();await editor.getByRole('button',{name:'Place existing entry',exact:true}).click();await townPanel.getByLabel('Placement map',{exact:true}).selectOption({label:'Detail Created'});
  await townPanel.locator('li').filter({hasText:'North Province'}).getByRole('button',{name:'Place on selected map',exact:true}).click();await paintTools.waitFor();await areaOutput.waitFor();
  await stroke(candidates[0]);await paintTools.getByRole('button',{name:'Save territory',exact:true}).click();await paintTools.waitFor({state:'detached'});
  await editor.getByRole('alert').filter({hasText:'Administrative territory extends outside its parent.'}).waitFor();
  assert.equal((await readTowns()).entities.find(e=>e.name==='North Province').relations.find(r=>r.type==='parent').entityId,countryId);
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});await refreshPreviewFrame();
  // Explicit world scope does not claim calibrated spherical km², even with a known width.
  await (await regionSelect()).selectOption(await (await regionSelect()).locator('option').filter({hasText:'Atlas One'}).getAttribute('value'));await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.includes('North Union')&&!b.textContent.includes('km²')));
  await page.getByRole('button',{name:/North Union/}).waitFor();assert.doesNotMatch(await page.getByRole('button',{name:/North Union/}).innerText(),/km²/);
  await page.evaluate(async()=>{const backup=await mapStorage.exportWorkspaceBackup();await mapStorage.importWorkspaceBackup(backup);});await page.reload();
  await (await regionSelect()).selectOption(regionMapId);await page.getByRole('button',{name:/North Union/}).waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')==='Edit map'&&!b.disabled),{},{timeout:120000});frame=await currentMapFrame();
  assert.equal(await page.getByText('Grid differs; saved territory is preserved but cannot be overlaid.',{exact:true}).count(),0,'mesh fingerprint survives native project reload');
  assert.match(JSON.stringify((await readTowns()).entities.find(e=>e.entityId===countryId).content),/Constitution and history/);
  // Real one-finger drawing in explicit paint mode; offline confirmation stays in local Page/outbox.
  await openRegionInfo('North Union');await regionInfo.getByRole('button',{name:'Edit territory',exact:true}).click();await paintTools.waitFor();await areaOutput.waitFor();
  await context.setOffline(true);await setNetwork(page,true);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);
  const phoneBefore=await areaOutput.innerText(),phoneExisting=(await readTowns()).maps.find(m=>m.id===regionMapId).placements.find(p=>p.entityId===countryId&&p.deletedAt===null).geometry.cells;
  const phoneCell=await frame.evaluate(existing=>{const z=document.querySelector('#map').__zoom;return pack.cells.i.find(i=>{const p=pack.cells.p[i],x=z.x+p[0]*z.k,y=z.y+p[1]*z.k;return !existing.includes(i)&&pack.cells.h[i]>=20&&x>25&&x<innerWidth-25&&y>50&&y<innerHeight-30&&document.elementFromPoint(x,y)?.closest('#viewbox');});},phoneExisting);
  assert.notEqual(phoneCell,undefined,'mobile painting retains visible map space');await stroke(phoneCell,true);assert.notEqual(await areaOutput.innerText(),phoneBefore,'one-finger touch changes only the explicit region candidate');
  await paintTools.getByRole('button',{name:'Save territory',exact:true}).click();await page.waitForTimeout(100);if(await page.getByRole('button',{name:'Confirm',exact:true}).isVisible())await page.getByRole('button',{name:'Confirm',exact:true}).click();await paintTools.waitFor({state:'detached'});await context.setOffline(false);await setNetwork(page,false);await page.setViewportSize({width:1440,height:1000});
  const finalEntity=(await readTowns()).entities.find(e=>e.entityId===countryId);assert.match(JSON.stringify(finalEntity.content),/Constitution and history/);
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});await refreshPreviewFrame();
  await openRegionInfo('North Province');await regionInfo.getByRole('button',{name:'Remove from this map',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await regionInfo.waitFor({state:'detached'});
  assert.ok((await readTowns()).entities.some(e=>e.name==='North Province'),'removing territory keeps the canonical administrative entry');
  // V2-3: actual shared forms and cell brush; culture/faith overlap never transfers political ownership.
  const distributionBefore=await readTowns(),distributionDigest=await dataDigest();
  const politicalBefore=distributionBefore.maps.find(m=>m.id===regionMapId).placements.filter(p=>distributionBefore.entities.find(e=>e.entityId===p.entityId)?.type==='country');
  await openEntries();
  const cultureForm=page.getByRole('dialog',{name:'Edit culture entry',exact:true}),faithForm=page.getByRole('dialog',{name:'Edit religion entry',exact:true});
  await townPanel.getByRole('button',{name:'Add culture',exact:true}).click();await cultureForm.getByLabel('Name',{exact:true}).fill('Dawn culture');
  await cultureForm.getByLabel('Languages / naming',{exact:true}).fill('Dawn speech');await cultureForm.getByLabel('Customs',{exact:true}).fill('Shared journeys');
  await cultureForm.getByLabel('Custom culture / faith type',{exact:true}).fill('Cross-border culture');
  await cultureForm.locator('[contenteditable=true]').fill('Canonical cultural history');
  await cultureForm.getByRole('button',{name:'Save entry',exact:true}).click();await cultureForm.waitFor({state:'detached'});
  assert.ok((await readTowns()).entities.find(e=>e.name==='Dawn culture'));
  await townPanel.getByLabel('Placement map',{exact:true}).selectOption(regionMapId);
  await townPanel.locator('li').filter({hasText:'Dawn culture'}).getByRole('button',{name:'Place on selected map',exact:true}).click();
  await areaOutput.waitFor();await page.waitForTimeout(250);await stroke(candidates[0]);await stroke(candidates[1]);
  await paintTools.getByRole('button',{name:'Save territory',exact:true}).click();await paintTools.waitFor({state:'detached'});
  const distributionNames=['Dusk culture','Night culture','Sun faith','Moon faith','River faith'];
  for(const name of distributionNames){
    const type=name.endsWith('culture')?'culture':'religion',form=type==='culture'?cultureForm:faithForm;
    await openWorldTools('Human geography',type==='culture'?'Cultures':'Religions');await editor.getByRole('button',{name:type==='culture'?'Add culture':'Add religion',exact:true}).click();await form.getByLabel('Name',{exact:true}).fill(name);
    await form.getByRole('button',{name:'Save entry',exact:true}).click();await form.waitFor({state:'detached'});await editor.getByRole('button',{name:'Edit territory',exact:true}).click();await areaOutput.waitFor();await page.waitForTimeout(120);
    assert.equal((await readTowns()).entities.some(e=>e.name===name),true,'new entry persists independently of the distribution draft');
    await stroke(candidates[0]);await stroke(candidates[1]);await paintTools.getByRole('button',{name:'Save territory',exact:true}).click();await paintTools.waitFor({state:'detached'});
  }
  let distributions=await readTowns();const distributionMap=distributions.maps.find(m=>m.id===regionMapId),dawn=distributions.entities.find(e=>e.name==='Dawn culture');
  assert.deepEqual(distributionMap.placements.filter(p=>politicalBefore.some(b=>b.placementId===p.placementId)),politicalBefore);
  assert.equal(distributionMap.attachment_id,nativeBefore);
  assert.equal(await dataDigest(),distributionDigest);
  const dawnPlacement=distributionMap.placements.find(p=>p.entityId===dawn.entityId&&p.deletedAt===null),overlapCell=dawnPlacement.geometry.cells.find(c=>distributionMap.placements.filter(p=>p.geometry.type==='cells'&&p.deletedAt===null&&p.geometry.cells.includes(c)&&['culture','religion'].includes(distributions.entities.find(e=>e.entityId===p.entityId)?.type)).length===6);
  assert.notEqual(overlapCell,undefined,'three cultures and three religions occupy the same cell');
  await openWorldTools('Display and style');await editor.getByLabel('Display mode',{exact:true}).selectOption('cultural');await frame.waitForFunction(()=>document.querySelector('#nexus-regions [data-members]'));
  const mixed=await frame.evaluate(()=>[...document.querySelectorAll('#nexus-regions [data-members]')].map(e=>({members:e.dataset.members,fill:e.getAttribute('fill')})));
  assert.ok(mixed.some(x=>x.members.split(' ').length===3),'commutative mixed fills represent all three cultures');
  await openWorldTools('Human geography','Cultures');
  const editDistribution=async name=>{await editor.locator('[data-map-entity-list]').getByRole('button',{name,exact:true}).click();await editor.locator('[data-map-selected]').getByRole('button',{name:'Edit territory',exact:true}).click();await areaOutput.waitFor();};
  await editDistribution('Dawn culture');await editor.getByLabel('Opacity',{exact:true}).selectOption('0.6');await paintTools.getByRole('button',{name:'Save territory',exact:true}).click();await paintTools.waitFor({state:'detached'});
  await editDistribution('Dusk culture');await editor.getByLabel('Visible',{exact:true}).uncheck();await paintTools.getByRole('button',{name:'Save territory',exact:true}).click();await paintTools.waitFor({state:'detached'});
  const queryPosition=await frame.evaluate(c=>{const z=document.querySelector('#map').__zoom;return {x:z.x+pack.cells.p[c][0]*z.k,y:z.y+pack.cells.p[c][1]*z.k};},overlapCell),queryBox=await (await frame.frameElement()).boundingBox();
  await page.mouse.click(queryBox.x+queryPosition.x,queryBox.y+queryPosition.y);
  const queryDialog=page.getByRole('dialog',{name:'Distributions at this location',exact:true});await queryDialog.waitFor();
  for(const name of ['Dawn culture',...distributionNames])await queryDialog.getByRole('button',{name:new RegExp(name)}).waitFor();
  await queryDialog.getByRole('button',{name:/Dawn culture/}).click();await regionInfo.getByRole('button',{name:'Open world entry',exact:true}).click();
  await cultureForm.getByLabel('Name',{exact:true}).fill('Dawn renamed');await cultureForm.getByRole('button',{name:'Save entry',exact:true}).click();await cultureForm.waitFor({state:'detached'});
  await editor.locator('[data-map-entity-list]').getByRole('button',{name:'Dawn renamed',exact:true}).waitFor();
  await openWorldTools();await editor.getByRole('button',{name:'Add town',exact:true}).click();await townForm.waitFor();
  // Exercise native dialog cancellation without reusing pointer state from the iframe picker.
  await townForm.press('Escape');await townForm.waitFor({state:'detached'});
  assert.equal(await queryDialog.count(),0,'distribution query never intercepts town point picking');
  const distributionSaved=structuredClone((await readTowns()).maps.find(m=>m.id===regionMapId).placements);
  await openWorldTools('Human geography','Cultures');await editDistribution('Dawn renamed');await page.waitForTimeout(150);
  const savedCultureArea=await areaOutput.innerText();await paintTools.getByRole('button',{name:'Erase cells',exact:true}).click();await stroke(candidates[0]);assert.notEqual(await areaOutput.innerText(),savedCultureArea);
  await paintTools.getByRole('button',{name:'Undo stroke',exact:true}).click();await page.waitForFunction(v=>document.querySelector('output[aria-label="Territory area"]')?.textContent===v,savedCultureArea);
  await paintTools.getByRole('button',{name:'Redo stroke',exact:true}).click();await page.waitForFunction(v=>document.querySelector('output[aria-label="Territory area"]')?.textContent!==v,savedCultureArea);
  await paintTools.getByRole('button',{name:'Cancel',exact:true}).click();await paintTools.waitFor({state:'detached'});
  assert.deepEqual((await readTowns()).maps.find(m=>m.id===regionMapId).placements,distributionSaved,'cancel restores all confirmed overlapping distributions');
  await openWorldTools('Human geography','Religions');await editor.getByRole('button',{name:'Add religion',exact:true}).click();await faithForm.getByLabel('Name',{exact:true}).fill('Cancelled faith');await faithForm.getByRole('button',{name:'Save entry',exact:true}).click();await faithForm.waitFor({state:'detached'});await editor.getByRole('button',{name:'Edit territory',exact:true}).click();await areaOutput.waitFor();
  await paintTools.getByRole('button',{name:'Cancel',exact:true}).click();await paintTools.waitFor({state:'detached'});assert.equal((await readTowns()).entities.some(e=>e.name==='Cancelled faith'),true);
  await openWorldTools('Display and style');await editor.getByLabel('Display mode',{exact:true}).selectOption('cultural');
  const cultureExportIds=(await readTowns()).maps.find(m=>m.id===regionMapId).placements.filter(p=>p.deletedAt===null&&distributions.entities.some(e=>e.entityId===p.entityId&&e.type==='culture')).map(p=>p.placementId);await frame.waitForFunction(ids=>{const rows=[...document.querySelectorAll('#nexus-regions [data-members]')];return rows.length>0&&rows.every(row=>row.dataset.members.split(' ').every(id=>ids.includes(id)));},cultureExportIds);await waitMapLayout();
  // All confirmed overlays export as images; native serialization excludes derived Nexus layers.
  await openExports();
  const pendingExportRequests=new Set();page.on('request',request=>pendingExportRequests.add(request));page.on('requestfinished',request=>pendingExportRequests.delete(request));page.on('requestfailed',request=>pendingExportRequests.delete(request));
  await page.evaluate(()=>document.addEventListener('click',event=>{if(event.target.closest?.('[data-map-export]'))console.log('DISTRIBUTION_CLICK',event.target.textContent);},true));
  for(const type of ['SVG','PNG']){console.log('DISTRIBUTION_EXPORT_START',type);const pending=page.waitForEvent('download',{timeout:60000}).catch(async error=>{fs.mkdirSync('test-results/world-map-ui/chromium',{recursive:true});await page.screenshot({path:'test-results/world-map-ui/chromium/distribution-export-failure.png'});console.log('DISTRIBUTION_PENDING_REQUESTS',[...pendingExportRequests].map(request=>request.url()));console.log('DISTRIBUTION_EXPORT_FAILURE',type,(await editor.innerText()).slice(-3000),await frame.evaluate(()=>({customization,graph:options.map.graph,groups:document.querySelectorAll('#nexus-regions [data-members]').length})));throw error;});await editor.getByRole('button',{name:type+' ↓',exact:true}).click();const download=await pending,file=path.join(tmp,'distribution.'+type.toLowerCase());await download.saveAs(file);assert.ok(fs.statSync(file).size>1000);if(type==='SVG')assert.match(fs.readFileSync(file,'utf8'),/data-members/);}
  assert.equal(await frame.evaluate(async()=>{const text=await Services.Save.prepareMapData();return String(text).includes('nexus-regions');}),false);
  await openWorldTools('Display and style');await editor.getByLabel('Display mode',{exact:true}).selectOption('religions');const religionIds=(await readTowns()).maps.find(m=>m.id===regionMapId).placements.filter(p=>p.deletedAt===null&&(distributions.entities.find(e=>e.entityId===p.entityId)?.type==='religion')).map(p=>p.placementId);await frame.waitForFunction(ids=>{const rows=[...document.querySelectorAll('#nexus-regions [data-members]')];return rows.length>0&&rows.every(row=>row.dataset.members.split(' ').every(id=>ids.includes(id)));},religionIds);await openWorldTools('Human geography','Religions');await editor.locator('[data-map-entity-list]').getByRole('button',{name:'Moon faith',exact:true}).waitFor();
  assert.equal(await dataDigest(),distributionDigest);
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});await refreshPreviewFrame();
  await page.evaluate(async()=>{const b=await mapStorage.exportWorkspaceBackup();await mapStorage.importWorkspaceBackup(b);});await page.reload();
  await (await regionSelect()).selectOption(regionMapId);await page.getByLabel('Display mode',{exact:true}).selectOption('cultural');
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')==='Edit map'&&!b.disabled),{},{timeout:120000});
  distributions=await readTowns();assert.match(JSON.stringify(distributions.entities.find(e=>e.entityId===dawn.entityId).content),/Canonical cultural history/);
  assert.equal(distributions.maps.find(m=>m.id===regionMapId).placements.find(p=>p.placementId===dawnPlacement.placementId).distribution.opacity,0.6);
  console.log('V2-3 overlap fixture: six distributions on',dawnPlacement.geometry.cellCount,'cells; metadata and cold backup reopen verified');
  await page.locator('[data-map-preview-legend] > summary').click();await page.getByRole('button',{name:'繁體中文',exact:true}).click();await page.getByLabel('顯示 Dawn renamed',{exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'distribution legend fits a phone');
  await page.getByRole('button',{name:'世界觀條目',exact:true}).click();await page.getByRole('dialog',{name:'世界觀條目',exact:true}).getByRole('button',{name:'新增宗教',exact:true}).waitFor();
  await page.getByRole('button',{name:'關閉面板',exact:true}).click();await page.getByRole('button',{name:'← 儲存並返回',exact:true}).click();await page.getByRole('dialog',{name:'世界觀地圖編輯器',exact:true}).waitFor({state:'detached'});await page.getByRole('button',{name:'English',exact:true}).click();await page.setViewportSize({width:1440,height:1000});
  // Synthetic overlap load on the same real grid, not a large-map or real-device performance claim.
  const stressMeta=await readTowns(),stressStarted=Date.now();
  await page.evaluate(async({mapId,entityId})=>{const p=await mapStorage.getPage('world-browser'),revision=p.revision,map=p.character_data.world_maps.find(m=>m.id===mapId),source=p.character_data.world_entities.find(e=>e.entityId===entityId),placement=map.placements.find(p=>p.entityId===entityId&&p.deletedAt===null);
    for(let i=0;i<50;i++){const id='stress-culture-'+i;p.character_data.world_entities.push({...source,entityId:id,name:'Overlap culture '+i,relations:[],content:undefined});map.placements.push({...placement,placementId:'stress-placement-'+i,entityId:id,visible:true,distribution:undefined});}p.revision++;p.updated_at=Date.now();await mapStorage.getWorkspacePersistence().mutate(mapStorage.getWorkspaceOwner(),[{type:'pages',kind:'save',value:p}],[{type:'pages',id:p.id,revision}]);await mapStorage.exportWorkspaceBackup();
  },{mapId:regionMapId,entityId:dawn.entityId});
  assert.equal((await readTowns()).entities.filter(e=>e.entityId.startsWith('stress-culture-')).length,50,'synthetic stress fixture is durable before reloading');
  await page.reload();await (await regionSelect()).selectOption(regionMapId);await page.getByLabel('Display mode',{exact:true}).selectOption('cultural');
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')==='Edit map'&&!b.disabled),{},{timeout:120000});frame=await currentMapFrame();
  await frame.waitForFunction(()=>[...document.querySelectorAll('#nexus-regions [data-members]')].some(p=>p.dataset.members.split(' ').length>=50));
  await page.locator('[data-map-canvas]').first().scrollIntoViewIfNeeded();const frameTimings=await frame.evaluate(async()=>{const samples=[];let last=performance.now();for(let i=0;i<12;i++){await new Promise(requestAnimationFrame);const now=performance.now();samples.push(now-last);last=now;}return {max:Math.max(...samples),mean:samples.reduce((a,b)=>a+b,0)/samples.length,cells:pack.cells.i.length};});
  console.log('V2-3 synthetic overlap load:',JSON.stringify({extraDistributions:50,loadMs:Date.now()-stressStarted,...frameTimings}));
  // A foreign mesh is preserved but is neither rendered nor accepted for editing.
  await page.evaluate(async({meta,mapId,placementId})=>{const p=await mapStorage.getPage('world-browser'),revision=p.revision;p.character_data.world_entities=meta.entities;p.character_data.world_maps=meta.maps;const target=p.character_data.world_maps.find(m=>m.id===mapId).placements.find(p=>p.placementId===placementId);target.geometry.meshId='f'.repeat(64);p.revision++;p.updated_at=Date.now();await mapStorage.getWorkspacePersistence().mutate(mapStorage.getWorkspaceOwner(),[{type:'pages',kind:'save',value:p}],[{type:'pages',id:p.id,revision}]);await mapStorage.exportWorkspaceBackup();},{meta:stressMeta,mapId:regionMapId,placementId:dawnPlacement.placementId});
  await page.reload();await (await regionSelect()).selectOption(regionMapId);await page.getByLabel('Display mode',{exact:true}).selectOption('cultural');
  await page.getByRole('alert').filter({hasText:'Grid differs; saved territory is preserved but cannot be overlaid.'}).first().waitFor();
  await openRegionInfo('Dawn renamed');await regionInfo.getByRole('button',{name:'Edit territory',exact:true}).click();
  await editor.getByRole('alert').filter({hasText:'Region mesh changed; keep the saved territory'}).waitFor();
  await paintTools.getByRole('button',{name:'Cancel',exact:true}).click();await paintTools.waitFor({state:'detached'});
  console.log('Browser errors observed:',JSON.stringify(errors));
  assert.deepEqual(errors,[]);
});





