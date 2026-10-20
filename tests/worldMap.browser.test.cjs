require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {build}=require('esbuild'),{chromium}=require('playwright');
const {worldMapHeaders}=require('../next.config.ts');
test('actual fork: isolated native editing, save/reopen, project roundtrip, images, offline, multi-map and restore',{timeout:600000},async t=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-world-map-')),root=path.resolve(__dirname,'..'),core=path.join(root,'public/world-map/core');
  await build({entryPoints:['tests/fixtures/worldMap.jsx'],outfile:path.join(tmp,'fixture.js'),bundle:true,format:'esm',jsx:'automatic',define:{'process.env':JSON.stringify({NODE_ENV:'development'})}});
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
    res.setHeader('content-type','text/html');res.end(cssFiles.map(p=>'<link rel="stylesheet" href="/_next/static/'+p+'">').join('')+'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;height:100vh}#root{height:100%;min-width:0}button{padding:6px;margin:3px}dialog{max-width:none;max-height:none}[role="dialog"][aria-label="World map editor"]{width:100vw;height:100vh;margin:0;padding:0;display:flex;flex-direction:column}.relative{position:relative}.absolute{position:absolute}.inset-0{inset:0}.flex-1{flex:1}.min-h-0{min-height:0}.h-full{height:100%}.w-full{width:100%}.grid{display:grid}.place-items-center{place-items:center}</style><div id="root"></div><script type="module" src="/fixture.js"></script>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.close();fs.rmSync(tmp,{recursive:true,force:true});});
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,hasTouch:true}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('pageerror:',e.message);});page.on('console',m=>{if(m.type()==='error')console.log('browser:',m.text().slice(0,350));});
  page.on('requestfailed',r=>console.log('request failed:',r.url().slice(0,140),r.failure()?.errorText));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('http://127.0.0.1:'+server.address().port);
  const confirmName=async name=>{if(name==='Detail Created'){await page.getByLabel('Terrain source',{exact:true}).selectOption('precreated');await page.getByLabel('Terrain template',{exact:true}).selectOption('world');await page.getByRole('dialog',{name:'Create map',exact:true}).locator('summary').filter({hasText:'Advanced settings'}).click();await page.getByLabel('Geographic width (km, optional)',{exact:true}).fill('1000');}await page.getByRole('textbox',{name:'Map name'}).fill(name);await page.getByRole('button',{name:await page.getByRole('button',{name:'Confirm creation',exact:true}).count()?'Confirm creation':'Confirm',exact:true}).click();};
  const manage=page.getByRole('dialog',{name:'Manage maps'});
  const openManage=async()=>{if(!await manage.isVisible())await page.getByRole('button',{name:'Manage maps',exact:true}).first().click();};
  const closeManage=async()=>{if(await manage.isVisible())await manage.getByRole('button',{name:'Close panel'}).click();};
  assert.equal(await manage.count(),0,'management is hidden by default');
  // Preview every shipped source in a disposable sandbox, then cancel with zero persistence.
  await openManage();await manage.getByRole('button',{name:'Create map',exact:true}).click();
  const creator=page.getByRole('dialog',{name:'Create map',exact:true});
  await creator.locator('img').waitFor({timeout:120000});
  for(const size of [{width:390,height:844},{width:820,height:1180},{width:1440,height:1000}]){
    await page.setViewportSize(size);
    assert.ok(await creator.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&el.scrollWidth<=el.clientWidth+1;}),'responsive creation dialog');
  }
  await page.getByRole('button',{name:'繁體中文',exact:true}).click();
  await creator.getByRole('heading',{name:'建立自然地圖',exact:true}).waitFor();
  assert.equal(await creator.getByLabel('地形模板',{exact:true}).locator('option').filter({hasText:'azgaar.'}).count(),0);
  await page.getByRole('button',{name:'English',exact:true}).click();
  const creationFrame=page.frames().find(f=>f.parentFrame()===page.mainFrame());
  const beforePreview=await creationFrame.evaluate(()=>JSON.stringify([pack,grid.cells.h,options.map]));
  for(const kind of ['procedural','precreated']){
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
  let frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());
  assert.ok(frame);
  assert.equal(await frame.evaluate(()=>{try{void parent.document.body;return false;}catch{return true;}}),true,'core cannot access Nexus document');
  assert.equal(await frame.evaluate(()=>localStorage.getItem('nexus-owner')),null);
  assert.equal(await frame.locator('#aboutTab,#aboutContent,#tourPromptButton,#loading,#regenerate,#newMapButton,#saveButton,#loadButton,#saveMapData,#loadMapData,#mapToLoad,#loadGoogleTranslateButton,#autosaveIntervalInput,#onloadBehavior,#optionsReset').count(),0);
  assert.equal(await frame.locator('a[href*="patreon"],a[href*="discord"],a[href*="reddit"],a[href*="deorum"],a[href*="u24.gov.ua"]').count(),0);
  await editor.locator('summary').filter({hasText:'Third-party licenses'}).click();
  assert.equal(await editor.getByRole('link',{name:'MIT License',exact:true}).getAttribute('href'),'/world-map/core/AZGAAR-LICENSE.txt');
  await editor.locator('summary').filter({hasText:'Third-party licenses'}).click();
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
  // Reopen actual native project before making any edits.
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});
  await page.reload();
  await page.getByRole('button',{name:'Edit map',exact:true}).click();await editor.waitFor({state:'visible'});
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());
  assert.equal(await dataDigest(),naturalData);
  await frame.locator('#optionsTrigger').click();await frame.locator('#toolsTab').click();
  await frame.evaluate(()=>Controllers.HeightmapEditor.open({mode:'keep'}));
  await frame.locator('#paintBrushes').click();await frame.locator('#brushRaise').click();
  const terrain=await frame.evaluate(()=>{
    const z=document.querySelector('#map').__zoom;
    const i=grid.cells.i.filter(i=>{const x=z.x+grid.points[i][0]*z.k,y=z.y+grid.points[i][1]*z.k;return grid.cells.h[i]>=30&&grid.cells.h[i]<80&&x>20&&y>80&&x<innerWidth-20&&y<innerHeight-20&&document.elementFromPoint(x,y)?.closest('#viewbox');}).sort((a,b)=>Math.hypot(grid.points[a][0]-640,grid.points[a][1]-400)-Math.hypot(grid.points[b][0]-640,grid.points[b][1]-400))[0];
    if(i===undefined)throw Error('No uncovered terrain cell');return {i,h:grid.cells.h[i],x:z.x+grid.points[i][0]*z.k,y:z.y+grid.points[i][1]*z.k};
  });
  await frame.locator('#map').click({position:{x:terrain.x,y:terrain.y},force:true});
  assert.ok(await frame.evaluate(i=>grid.cells.h[i],terrain.i)>terrain.h,'native raise brush edits height');
  await frame.locator('#undo').click();assert.equal(await frame.evaluate(i=>grid.cells.h[i],terrain.i),terrain.h);
  await frame.locator('#redo').click();assert.ok(await frame.evaluate(i=>grid.cells.h[i],terrain.i)>terrain.h);
  await frame.locator('#finalizeHeightmap').click();
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
    const i=pack.cells.i.find(i=>{const [px,py]=pack.cells.p[i],x=z.x+px*z.k,y=z.y+py*z.k;return pack.cells.h[i]>=20&&pack.cells.biome[i]!==4&&x>20&&y>100&&x<innerWidth-20&&y<innerHeight-20&&!rects.some(r=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom);});
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
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});
  for(const preset of ['contours','temperature','precipitation','biomes','political','cultural','religions','physical']){
    await page.getByLabel('Display layers',{exact:true}).selectOption(preset);await page.waitForTimeout(100);
    assert.equal(await dataDigest(),geography,'view is presentation-only: '+preset);
    if(preset==='contours')await frame.locator('.heightmap-contours path').first().waitFor();
  }
  await page.getByRole('button',{name:'Edit map',exact:true}).click();await editor.waitFor({state:'visible'});
  await frame.evaluate(async()=>Services.Load.quickLoad());
  await frame.waitForFunction(i=>pack.cells.biome[i]===4,manual.i);
  assert.deepEqual(await frame.evaluate(()=>options.map.nexus.stale),['hydrology','biomes']);
  assert.equal(await page.evaluate(async id=>{const w=await mapStorage.getPage('world-browser');return w.character_data.world_maps[0].id===id;},naturalId),true);
  await frame.locator('#optionsTrigger').click();

  await frame.evaluate(async()=>{await window.generateMapOnLoad({naturalOnly:false});});
  await frame.locator('#optionsTrigger').click();
  await frame.locator('#exportButton').click();
  assert.equal(await frame.locator('#exportMapData button').filter({hasText:/^\.(svg|png)$/}).count(),0);
  assert.equal(await frame.locator('#exportMapData button').filter({hasText:'.jpeg'}).count(),1);
  await frame.evaluate(()=>$('#exportMapData').dialog('close'));
  await frame.locator('#toolsTab').click();
  const burgId=await frame.evaluate(async()=>{const burg=pack.burgs.find(b=>b.i&&!b.removed);if(!burg)throw Error('No burg generated');await Controllers.BurgEditor.open(burg.i);return burg.i;});
  await frame.locator('#burgName').fill('Nexus Port');
  await frame.locator('#burgName').press('Control+s');
  await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor({timeout:60000});
  await frame.evaluate(id=>{pack.burgs[id].name='Temporary unsaved name';for(const code of ['F1','F2','F6','F9'])document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));},burgId);
  assert.equal(await frame.evaluate(id=>pack.burgs[id].name,burgId),'Temporary unsaved name','removed standalone shortcuts cannot replace the project');
  await frame.evaluate(async()=>Services.Load.quickLoad());
  await frame.waitForFunction(id=>pack.burgs[id].name==='Nexus Port',burgId);
  let downloadEvent=page.waitForEvent('download');await editor.getByRole('button',{name:'.map ↓',exact:true}).click();
  const native=await downloadEvent,file=path.join(tmp,'roundtrip.map');await native.saveAs(file);assert.ok(fs.statSync(file).size>10000);
  for(const type of ['SVG','PNG']){downloadEvent=page.waitForEvent('download',{timeout:60000});await editor.getByRole('button',{name:type+' ↓',exact:true}).click();const image=await downloadEvent;const p=path.join(tmp,type.toLowerCase());await image.saveAs(p);assert.ok(fs.statSync(p).size>1000);}
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});
  const firstSession=await frame.evaluate(()=>location.href);
  assert.ok(await frame.evaluate(()=>{const m=document.querySelector('#map'),z=m.__zoom,w=options.map.graph.width,h=options.map.graph.height;return z.x>=-1&&z.y>=-1&&z.x+w*z.k<=m.width.baseVal.value+1&&z.y+h*z.k<=m.height.baseVal.value+1;}),'initial preview contains the whole map: '+JSON.stringify(await frame.evaluate(()=>({z:document.querySelector('#map').__zoom,w:options.map.graph.width,h:options.map.graph.height,viewport:[innerWidth,innerHeight]}))));
  const revisionBefore=await page.evaluate(async()=>{const p=await window.mapStorage.getPage('world-browser');return p.revision;});
  await page.getByLabel('Display layers',{exact:true}).selectOption('temperature');
  await frame.waitForFunction(()=>{const node=document.querySelector('[data-layer=temperature]');return node&&getComputedStyle(node).display!=='none';});
  assert.equal(await frame.evaluate(()=>location.href),firstSession,'layer preview reuses the core');
  assert.equal(await frame.evaluate(()=>document.body.classList.contains('nexus-preview')),true);
  await frame.locator('#map').click({position:{x:120,y:120}});
  assert.equal(await page.getByRole('dialog',{name:'World map editor'}).count(),0);
  await frame.evaluate(()=>{const field=document.createElement('input');field.id='locale-user-input';field.value='Save';document.body.append(field);document.querySelector('#layersPreset').add(new Option('Cancel','Cancel'));});
  await frame.evaluate(id=>{window.localeOldDescription=pack.burgs[id].description;pack.burgs[id].description='<p>Save</p>';const data=document.createElement('p');data.id='locale-map-data';data.textContent='Save';document.querySelector('#dialogs').append(data);},burgId);
  await page.getByRole('button',{name:'繁體中文',exact:true}).click();
  await frame.waitForFunction(()=>document.documentElement.lang==='zh-TW');
  assert.equal(await page.getByLabel('地圖範圍',{exact:true}).count(),1);
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
  assert.ok(editBounds.y>=0&&editBounds.y+editBounds.height<=844,'phone editing tool is not clipped by the viewport: '+JSON.stringify({editBounds,canvas:await page.locator('[data-map-canvas]').boundingBox(),page:await page.evaluate(()=>({height:innerHeight,scroll:document.querySelector('[data-map-scroll]').scrollTop,y:scrollY}))}));
  assert.equal(await frame.locator('#map').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)','preview whitespace inherits the Nexus theme');
  console.log('NEXUS_MOBILE_SCREEN:'+ (await page.screenshot({type:'jpeg',quality:35})).toString('base64'));
  await openManage();
  assert.ok(await manage.evaluate(el=>el.scrollWidth<=el.clientWidth),'mobile management has no internal horizontal overflow');
  console.log('NEXUS_MANAGEMENT_SCREEN:'+ (await page.screenshot({type:'jpeg',quality:35})).toString('base64'));
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
  const scrollBefore=await page.locator('[data-map-scroll]').evaluate(el=>el.scrollTop);
  await touches([{x:cx,y:cy+50,id:1}]);
  for(let d=0;d<=100;d+=20)await moveTouches([{x:cx,y:cy+50-d,id:1}]);
  await endTouches();
  assert.ok(await page.locator('[data-map-scroll]').evaluate(el=>el.scrollTop)>scrollBefore,'single finger scrolls the page');
  assert.ok(Math.abs(await frame.evaluate(()=>document.querySelector('#map').__zoom.k)-beforeTouchScale)<0.0001);
  await page.locator('[data-map-scroll]').evaluate(el=>el.scrollTop=0);
  touchBox=await frame.locator('#map').boundingBox();
  const py=Math.min(touchBox.y+touchBox.height/2,580),px=touchBox.x+touchBox.width/2;
  const beforePinch=await frame.evaluate(()=>({k:document.querySelector('#map').__zoom.k,x:document.querySelector('#map').__zoom.x,y:document.querySelector('#map').__zoom.y}));
  const pageBeforePinch=await page.locator('[data-map-scroll]').evaluate(el=>el.scrollTop);
  await touches([{x:px-35,y:py,id:1},{x:px+35,y:py,id:2}]);
  for(let d=40;d<=90;d+=10)await moveTouches([{x:px-d,y:py,id:1},{x:px+d,y:py,id:2}]);
  await endTouches();
  assert.ok(await frame.evaluate(()=>document.querySelector('#map').__zoom.k)>beforePinch.k*1.5,'two fingers zoom smoothly');
  assert.equal(await page.locator('[data-map-scroll]').evaluate(el=>el.scrollTop),pageBeforePinch);
  const zoomed=await frame.evaluate(()=>document.querySelector('#map').__zoom.k);
  await touches([{x:px-85,y:py,id:1},{x:px+85,y:py,id:2}]);
  for(let d=75;d>=50;d-=5)await moveTouches([{x:px-d,y:py,id:1},{x:px+d,y:py,id:2}]);
  await endTouches();
  assert.ok(await frame.evaluate(()=>document.querySelector('#map').__zoom.k)<zoomed,'pinch inward zooms out');
  const pinchPosition=await frame.evaluate(()=>({x:document.querySelector('#map').__zoom.x,y:document.querySelector('#map').__zoom.y}));
  await touches([{x:px-45,y:py,id:1},{x:px+45,y:py,id:2}]);
  for(let d=5;d<=25;d+=5)await moveTouches([{x:px-45+d,y:py+15,id:1},{x:px+45+d,y:py+15,id:2}]);
  await endTouches();
  assert.ok(await frame.evaluate(p=>{const z=document.querySelector('#map').__zoom;return Math.abs(z.x-p.x)>1||Math.abs(z.y-p.y)>1;},pinchPosition),'two-finger pan moves the map');
  const gestureScale=await frame.evaluate(()=>document.querySelector('#map').__zoom.k);
  await page.getByLabel('Display layers',{exact:true}).selectOption('physical');
  await page.waitForTimeout(250);
  assert.ok(Math.abs(await frame.evaluate(()=>document.querySelector('#map').__zoom.k)-gestureScale)<0.0001,'layers preserve manual zoom');
  const stableView=await frame.evaluate(()=>({x:document.querySelector('#map').__zoom.x,y:document.querySelector('#map').__zoom.y,k:document.querySelector('#map').__zoom.k}));
  await page.evaluate(()=>{window.setMapCloud({status:'error',error:'simulated',pendingPushes:1});window.setMapTitle('A very long world title '.repeat(20));});
  await page.getByRole('alert').filter({hasText:'Sync failed'}).waitFor();
  assert.ok(await page.locator('h1').evaluate(el=>el.scrollWidth>el.clientWidth),'long title is truncated');
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
  const fullScroll=await page.locator('[data-map-scroll]').evaluate(el=>el.scrollTop);
  await touches([{x:touchBox.width/2,y:touchBox.height/2,id:1}]);
  for(let d=10;d<=70;d+=10)await moveTouches([{x:touchBox.width/2+d,y:touchBox.height/2+20,id:1}]);
  await endTouches();
  assert.ok(await frame.evaluate(p=>{const z=document.querySelector('#map').__zoom;return Math.abs(z.x-p.x)>1||Math.abs(z.y-p.y)>1;},fullBefore),'full-screen allows single-finger pan');
  assert.equal(await page.locator('[data-map-scroll]').evaluate(el=>el.scrollTop),fullScroll);
  await page.getByRole('button',{name:'Exit full screen',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);
  const bodyOverflow=await page.evaluate(()=>document.body.style.overflow);
  await page.locator('[data-map-canvas]').evaluate(el=>{el.parentElement.requestFullscreen=undefined;});
  await page.getByRole('button',{name:'Full screen',exact:true}).click();
  await page.getByRole('button',{name:'Exit full screen',exact:true}).waitFor();
  await page.waitForFunction(()=>document.body.style.overflow==='hidden');
  assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),false,'full-screen fallback works without the browser API');
  await page.getByRole('button',{name:'Exit full screen',exact:true}).focus();await page.keyboard.press('Escape');
  await page.waitForFunction(old=>document.body.style.overflow===old,bodyOverflow);
  await page.setViewportSize({width:820,height:1180});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'tablet has no horizontal overflow');
  await page.setViewportSize({width:1440,height:1000});
  await page.getByLabel('Display layers',{exact:true}).selectOption('political');
  const zoomBefore=await frame.evaluate(()=>document.querySelector('#map').__zoom.k);
  await page.getByRole('button',{name:zoomBefore<19?'Zoom in':'Zoom out',exact:true}).click();
  await frame.waitForFunction(before=>document.querySelector('#map').__zoom.k!==before,zoomBefore);
  const beforeDouble=await frame.evaluate(()=>document.querySelector('#map').__zoom.k);
  await frame.locator('#map').dblclick({position:{x:200,y:180}});await page.waitForTimeout(250);
  assert.ok(await frame.evaluate(()=>document.querySelector('#map').__zoom.k)>beforeDouble,'double click zooms in read-only preview');
  const mapBox=await frame.locator('#map').boundingBox();
  const panBefore=await frame.evaluate(()=>({x:document.querySelector('#map').__zoom.x,y:document.querySelector('#map').__zoom.y}));let panned=false;
  for(const direction of [1,-1]){await page.mouse.move(mapBox.x+mapBox.width/2,mapBox.y+mapBox.height/2);await page.mouse.down();await page.mouse.move(mapBox.x+mapBox.width/2+direction*40,mapBox.y+mapBox.height/2+direction*20,{steps:3});await page.mouse.up();const after=await frame.evaluate(()=>({x:document.querySelector('#map').__zoom.x,y:document.querySelector('#map').__zoom.y}));panned=panned||after.x!==panBefore.x||after.y!==panBefore.y;}
  assert.ok(panned,'read-only map can be dragged');
  const viewScale=await frame.evaluate(()=>document.querySelector('#map').__zoom.k);
  await page.getByRole('button',{name:'Edit map',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());
  assert.equal(await frame.evaluate(()=>document.querySelector('#map').__zoom.k),viewScale);
  assert.equal(await frame.evaluate(id=>pack.burgs[id].name,burgId),'Nexus Port');
  // A failed canonical write keeps the editor and a local-only recovery project.
  await frame.evaluate(id=>{pack.burgs[id].name='Recovery Port';document.dispatchEvent(new Event('input',{bubbles:true}));},burgId);
  await page.evaluate(()=>{window.failMapSave=true;});await editor.getByRole('button',{name:'Save',exact:true}).click();
  await editor.getByRole('alert').filter({hasText:'Simulated local save failure'}).waitFor();
  assert.ok(await page.evaluate(async()=>{const p=await window.mapStorage.getPage('world-browser'),map=p.character_data.world_maps[0];return Boolean(await window.mapStorage.getWorkspacePersistence().readMapDraft('map-browser-owner',p.id,map.id));}));
  await page.reload();await page.getByRole('button',{name:'Edit map',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());assert.equal(await frame.evaluate(id=>pack.burgs[id].name,burgId),'Recovery Port');
  await editor.getByRole('button',{name:'Save',exact:true}).click();await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();
  await context.setOffline(true);
  await frame.evaluate(id=>{pack.burgs[id].name='Offline Port';document.dispatchEvent(new Event('input',{bubbles:true}));},burgId);
  await editor.getByRole('button',{name:'Save',exact:true}).click();await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});
  await page.getByRole('button',{name:'Edit map',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());
  assert.equal(await frame.evaluate(id=>pack.burgs[id].name,burgId),'Offline Port');
  await context.setOffline(false);await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});
  await openManage();await manage.locator('input[type=file]').setInputFiles(file);await confirmName('Atlas Imported');
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());assert.equal(await frame.evaluate(id=>pack.burgs[id].name,burgId),'Nexus Port');
  await frame.evaluate(async id=>{await Controllers.BurgEditor.open(id);},burgId);await frame.locator('#burgName').fill('Imported Editable Port');
  // The retained loader API still uses the awaitable failure boundary.
  await editor.getByRole('button',{name:'Save',exact:true}).click();await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();
  await frame.evaluate(()=>Services.Load.uploadMap(new Blob(['invalid'],{type:'application/octet-stream'})));
  await editor.getByRole('alert').filter({hasText:'Native project loading failed'}).waitFor();
  assert.equal(await editor.getByRole('button',{name:'Save',exact:true}).isDisabled(),true);
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});
  assert.equal(await page.evaluate(async()=>{const backup=await window.mapStorage.exportWorkspaceBackup();return backup.pages[0].character_data.world_maps.filter(m=>m.deleted_at==null).length;}),2);
  await openManage();
  const row=manage.locator('li').filter({has:page.getByRole('button',{name:'Atlas One',exact:true})});
  await row.locator('summary').click();
  await row.getByRole('button',{name:'Duplicate',exact:true}).click();await page.getByRole('button',{name:/Atlas One copy/}).waitFor();
  await row.getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await page.getByText('Deleted maps',{exact:true}).click();
  const restore=page.getByRole('button',{name:'Restore',exact:true});await restore.click();await restore.waitFor({state:'detached'});
  assert.equal(await page.evaluate(async()=>{const p=await window.mapStorage.getPage('world-browser');return p.character_data.world_maps.filter(m=>m.deleted_at==null).length;}),3);
  const sessionBeforeSwitch=await frame.evaluate(()=>location.href);
  await manage.getByRole('button',{name:'Atlas One copy',exact:true}).click();
  await page.getByLabel('Selected map',{exact:true}).selectOption({label:'Atlas One copy'});
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')==='Zoom in'&&!b.disabled),{},{timeout:120000});
  assert.equal(await frame.evaluate(()=>location.href),sessionBeforeSwitch,'switching maps reuses the core');
  assert.ok(await frame.evaluate(()=>{const m=document.querySelector('#map'),z=m.__zoom;return Math.abs(z.k-Math.min(m.width.baseVal.value/options.map.graph.width,m.height.baseVal.value/options.map.graph.height))<0.0001;}),'switching maps returns to fit');
  await page.getByLabel('Map scope',{exact:true}).selectOption('town');
  await page.waitForFunction(async()=>{const p=await window.mapStorage.getPage('world-browser');return p.character_data.world_maps.find(m=>m.title==='Atlas One copy').scope==='town';});
  const parentId=await page.evaluate(async()=>{const p=await window.mapStorage.getPage('world-browser');return p.character_data.world_maps.find(m=>m.title==='Atlas One').id;});
  await openManage();await page.getByLabel('Parent map',{exact:true}).selectOption(parentId);
  await page.waitForFunction(async parentId=>{const p=await window.mapStorage.getPage('world-browser');return p.character_data.world_maps.find(m=>m.title==='Atlas One copy').parent_map_id===parentId;},parentId);
  await closeManage();await page.getByRole('button',{name:'↑ Parent map',exact:true}).click();
  await page.getByRole('navigation',{name:'Detail maps'}).getByRole('button',{name:/Atlas One copy/}).waitFor();
  assert.equal(await frame.evaluate(()=>location.href),sessionBeforeSwitch);
  await page.getByRole('button',{name:'Create detail map',exact:true}).click();await confirmName('Detail Created');
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  assert.equal(await frame.evaluate(()=>pack.burgs.filter(b=>b?.i).length),0);
  assert.equal(await frame.evaluate(()=>options.map.nexus.scaleKnown),true);
  assert.equal(await frame.evaluate(()=>options.map.units.distance.scale),1000/1280);
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});
  await page.getByRole('button',{name:'↑ Parent map',exact:true}).click();
  await page.getByRole('navigation',{name:'Detail maps'}).getByRole('button',{name:/Detail Created/}).waitFor();
  await page.getByRole('button',{name:'Link existing map',exact:true}).click();
  const link=page.getByRole('dialog',{name:'Link existing map'});
  const importedId=await page.evaluate(async()=>{const p=await window.mapStorage.getPage('world-browser');return p.character_data.world_maps.find(m=>m.title==='Atlas Imported').id;});
  await link.getByLabel('Detail map',{exact:true}).selectOption(importedId);await link.getByRole('button',{name:'Confirm',exact:true}).click();
  await link.waitFor({state:'detached'});await page.getByRole('navigation',{name:'Detail maps'}).getByRole('button',{name:/Atlas Imported/}).waitFor();
  await openManage();await manage.getByRole('button',{name:'Create map',exact:true}).click();await confirmName('Aspect map');
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),{},{timeout:120000});
  for(const [width,height] of [[1600,400],[400,1600]]){
    frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());
    await frame.evaluate(async size=>{await window.generateMapOnLoad(size);}, {width,height});
    await editor.getByRole('button',{name:'Save',exact:true}).click();await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();
    await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});
    await page.getByRole('button',{name:'Reset view',exact:true}).click();await page.waitForTimeout(200);
    const bounds=await frame.evaluate(()=>{const m=document.querySelector('#map'),z=m.__zoom,w=options.map.graph.width,h=options.map.graph.height;return {left:z.x,top:z.y,right:z.x+w*z.k,bottom:z.y+h*z.k,vw:m.width.baseVal.value,vh:m.height.baseVal.value,k:z.k,w,h};});
    assert.equal(bounds.w,width);assert.equal(bounds.h,height);
    assert.ok(bounds.left>=-1&&bounds.top>=-1&&bounds.right<=bounds.vw+1&&bounds.bottom<=bounds.vh+1,'all four map edges fit inside the container');
    assert.ok(Math.abs(bounds.k-Math.min(bounds.vw/bounds.w,bounds.vh/bounds.h))<0.0001);
    await page.getByRole('button',{name:'Edit map',exact:true}).click();await editor.waitFor({state:'visible'});
  }
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});
  console.log('Browser errors observed:',JSON.stringify(errors));
  assert.deepEqual(errors,[]);
});


