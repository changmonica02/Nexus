require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {build}=require('esbuild'),{chromium,webkit}=require('playwright');
const {worldMapHeaders}=require('../next.config.ts');
test('stage 2 map UI: context tools, native transactions, responsive menus and real exports',{timeout:600000},async t=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-world-map-')),root=path.resolve(__dirname,'..'),core=path.join(root,'public/world-map/core');
  await build({entryPoints:['tests/fixtures/worldMap.jsx'],outfile:path.join(tmp,'fixture.js'),bundle:true,loader:{'.woff':'dataurl','.woff2':'dataurl','.ttf':'dataurl'},format:'esm',jsx:'automatic',define:{'process.env':JSON.stringify({NODE_ENV:'development'})}});
  const cssFiles=fs.readdirSync(path.join(root,'.next/static'),{recursive:true}).filter(p=>p.endsWith('.css'));
  const mime={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.html':'text/html'};
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);
    if(pathname.startsWith('/_next/static/')&&pathname.endsWith('.css')){const file=path.resolve(root,'.next/static',pathname.slice('/_next/static/'.length));if(!file.startsWith(path.join(root,'.next/static')+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('content-type','text/css');return res.end(fs.readFileSync(file));}
    if(pathname==='/fixture.js'){res.setHeader('content-type','text/javascript');return res.end(fs.readFileSync(path.join(tmp,'fixture.js')));}
    if(pathname==='/sw.js'){res.setHeader('content-type','text/javascript');return res.end(fs.readFileSync(path.join(root,'public/sw.js')));}
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
  const engine=process.env.MAP_BROWSER==='webkit'?webkit:chromium;const browser=await engine.launch({headless:true,executablePath:process.env.MAP_BROWSER==='webkit'?undefined:process.env.BROWSER_EXECUTABLE||undefined});t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,hasTouch:true,ignoreHTTPSErrors:process.env.MAP_TEST_TRUST_PROXY==='1'}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('pageerror:',e.message);});page.on('console',m=>{if(m.type()==='error')console.log('browser:',m.text().slice(0,350));});
  page.on('requestfailed',r=>console.log('request failed:',r.url().slice(0,140),r.failure()?.errorText));
  if(process.env.MAP_LEGACY_HANDSHAKE)await context.addInitScript(()=>window.addEventListener('message',event=>{if(event.data?.type==='nexus-map-ready')delete event.data.documentId;},true));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('http://127.0.0.1:'+server.address().port);

  const {waitForAsync}=require('./pwaBrowser.cjs');
  await page.getByRole('button',{name:'Manage maps',exact:true}).first().click();
  const manage=page.getByRole('dialog',{name:'Manage maps'});
  if(process.env.MAP_UI_PROJECT){await manage.locator('input[type=file]').setInputFiles(process.env.MAP_UI_PROJECT);await page.getByRole('textbox',{name:'Map name'}).fill('UI Atlas');await page.getByRole('button',{name:'Confirm',exact:true}).click();}
  else{await manage.getByRole('button',{name:'Create map',exact:true}).click();await page.getByRole('textbox',{name:'Map name'}).fill('UI Atlas');await page.getByRole('button',{name:'Confirm creation',exact:true}).click();}
  const editor=page.getByRole('dialog',{name:'World map editor'});await waitForAsync(page,()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),null,120000);
  let frame=await (await editor.locator('iframe').elementHandle()).contentFrame();
  const nativeName=await frame.evaluate(()=>options.map.lore.name);
  const chooseGroup=async group=>{await editor.getByRole('button',{name:group,exact:true}).click();await waitForAsync(page,group=>[...document.querySelectorAll('[role=dialog][aria-label="World map editor"] [data-world-tools] button[aria-pressed="true"]')].some(b=>b.textContent===group),group);};
  if(process.env.MAP_BLOCKS_ONLY){await editor.getByRole('button',{name:'Save',exact:true}).click();await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();await editor.getByRole('button',{name:'← Save and return',exact:true}).click();await editor.waitFor({state:'detached'});}else{
  const waitNativeIdle=()=>waitForAsync(page,()=>[...document.querySelectorAll('[role=dialog][aria-label="World map editor"] section[aria-label="Native map tool"]')].some(el=>el.getAttribute('aria-busy')==='false'));
  const cancelNative=async(native)=>{await waitNativeIdle();await native.getByRole('button',{name:'Cancel',exact:true}).click();const prompt=page.getByRole('dialog',{name:'Discard changes made in this native tool? Earlier edits are preserved.',exact:true});await prompt.waitFor();await prompt.press('Escape');await prompt.waitFor({state:'detached'});assert.equal(await native.isVisible(),true,'cancelling the discard prompt keeps the active tool');await native.getByRole('button',{name:'Cancel',exact:true}).click();await prompt.getByRole('button',{name:'Confirm',exact:true}).click();await native.waitFor({state:'detached'});};
  const waitLayout=async()=>{await page.waitForTimeout(250);await frame.waitForFunction(()=>Math.abs(document.querySelector('#map').getBoundingClientRect().height-innerHeight)<1);};
  await frame.evaluate(()=>Options.set(o=>{o.app.ui.assistant='show';}));
  assert.equal(await frame.locator('#assistantBubble,#assistant,#notesGenerateWithAi,#azgaarAssistant').count(),0);
  assert.equal(await frame.evaluate(()=>options.app.ui.assistant),'show','legacy preference remains readable');
  const tools=editor.locator('[data-world-tools]');
  const exportMenu=editor.locator('[data-map-export]');const more=editor.locator('[data-map-more]');
  for(const viewport of [{width:320,height:700},{width:820,height:1180},{width:1440,height:1000}]){
    await page.setViewportSize(viewport);
    if(await tools.evaluate(el=>el.open))await tools.locator(':scope > summary').click();assert.equal(await editor.getByRole('button',{name:'SVG ↓',exact:true}).isVisible(),false);
    await tools.locator(':scope > summary').click();for(const group of ['Natural geography','Human geography','Display and style']){const button=editor.getByRole('button',{name:group,exact:true});if(viewport.width<1000)await button.tap();else await button.click();await editor.getByRole('button',{name:group,exact:true}).waitFor();assert.equal(await tools.evaluate(el=>el.open),true,'mode switching does not race a native details toggle');}await chooseGroup('Human geography');await editor.getByRole('button',{name:'Add country',exact:true}).waitFor();await chooseGroup('Human geography');await editor.getByRole('button',{name:'Add town',exact:true}).waitFor();
    assert.ok(await editor.locator('[data-map-canvas]').evaluate(el=>el.getBoundingClientRect().height)>150);
    assert.ok(await editor.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'no parent horizontal overflow');
    await tools.locator(':scope > summary').click();
    await waitLayout();fs.mkdirSync('test-results/world-map-ui',{recursive:true});await page.screenshot({path:'test-results/world-map-ui/'+(process.env.MAP_BROWSER||'chromium')+'-'+viewport.width+'.png'});
    await tools.locator(':scope > summary').click();await chooseGroup('Natural geography');
    await editor.locator('[data-world-tools] details > summary').click();await editor.getByRole('button',{name:'Native advanced tools',exact:true}).click();
    const native=editor.getByRole('region',{name:'Native map tool',exact:true});await native.waitFor();
    assert.equal(await editor.locator('[data-map-context]').isVisible(),false,'Nexus context panel yields to the native tool');
    assert.ok(await frame.locator('#optionsContainer').evaluate(el=>{const r=el.getBoundingClientRect();return r.width<=innerWidth+1&&r.height<=innerHeight*.6+1;}),'bounded native advanced panel');
    assert.equal(await frame.locator('#editHeightmapButton').count(),1,'native terrain editor retained');
    await cancelNative(native);
    await more.locator(':scope > summary').click();await more.locator('summary').filter({hasText:'Third-party licenses'}).click();await more.getByRole('link',{name:'MIT License',exact:true}).waitFor();await more.locator('summary').filter({hasText:'Third-party licenses'}).click();await more.locator(':scope > summary').click();
    await exportMenu.locator(':scope > summary').click();
    for(const type of ['SVG','PNG']){
      const pending=page.waitForEvent('download',{timeout:60000});await exportMenu.getByRole('button',{name:type+' ↓',exact:true}).click();const download=await pending;const file=path.join(tmp,viewport.width+'.'+type.toLowerCase());await download.saveAs(file);const bytes=fs.readFileSync(file);assert.ok(bytes.length>1000);if(type==='PNG')assert.deepEqual(Array.from(bytes.subarray(0,8)),[137,80,78,71,13,10,26,10]);else assert.match(bytes.toString(),/<svg/);
    }
    await exportMenu.locator(':scope > summary').click();
    await editor.getByRole('button',{name:'Save',exact:true}).click();await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();
  }
  if(!process.env.MAP_SKIP_NATIVE_TRANSACTIONS){
  // The parent sends only named tool commands. Unknown controller names cannot execute.
  await page.evaluate(()=>{const send=MessagePort.prototype.postMessage;MessagePort.prototype.postMessage=function(data,...rest){if(data?.type==='tool'&&data.settings?.toolCommand?.action==='open'){MessagePort.prototype.postMessage=send;data={...data,settings:{toolCommand:{action:'open',tool:'StatesEditor'}}};}return send.call(this,data,...rest);};});
  if(!await tools.evaluate(el=>el.open))await tools.locator(':scope > summary').click();await chooseGroup('Natural geography');await editor.getByRole('button',{name:'Edit height',exact:true}).click();await editor.getByRole('alert').filter({hasText:'Unknown map tool'}).waitFor();assert.equal(await frame.evaluate(()=>customization),0);
  const originalHeights=await frame.evaluate(()=>Array.from(grid.cells.h));
  await editor.getByRole('button',{name:'Edit height',exact:true}).click();
  const native=editor.getByRole('region',{name:'Native map tool',exact:true});await native.waitFor();await waitLayout();
  assert.equal(await editor.getByRole('button',{name:'Save',exact:true}).isDisabled(),true,'active native draft cannot be saved as a complete project');
  assert.equal(await native.getByRole('button',{name:'Undo stroke',exact:true}).isDisabled(),true,'no invented global history');
  await frame.locator('#brushRaise').click();
  const terrain=await frame.evaluate(()=>{const z=document.querySelector('#map').__zoom,i=grid.cells.i.find(i=>{const [px,py]=grid.points[i],x=z.x+px*z.k,y=z.y+py*z.k;return grid.cells.h[i]>=30&&grid.cells.h[i]<75&&x>20&&y>80&&x<innerWidth-20&&y<innerHeight-20&&document.elementFromPoint(x,y)?.closest('#viewbox');});if(i===undefined)throw Error('No visible land');return {i,h:grid.cells.h[i],x:z.x+grid.points[i][0]*z.k,y:z.y+grid.points[i][1]*z.k};});
  await frame.locator('#map').click({position:{x:terrain.x,y:terrain.y},force:true});
  await native.getByRole('button',{name:'Undo stroke',exact:true}).waitFor();assert.ok(await frame.evaluate(i=>grid.cells.h[i],terrain.i)>terrain.h);
  await native.getByRole('button',{name:'Undo stroke',exact:true}).click();assert.equal(await frame.evaluate(i=>grid.cells.h[i],terrain.i),terrain.h);
  await native.getByRole('button',{name:'Redo stroke',exact:true}).click();assert.ok(await frame.evaluate(i=>grid.cells.h[i],terrain.i)>terrain.h);
  await cancelNative(native);assert.equal(await frame.locator('#exitCustomization').isVisible(),false);assert.equal(await frame.evaluate(()=>typeof edits==='undefined'&&(!document.getElementById('undo')||document.getElementById('undo').disabled)),true);assert.deepEqual(await frame.evaluate(()=>Array.from(grid.cells.h)),originalHeights,'Cancel restores native heights, preserving earlier edits');
  await frame.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keyup',{key:'H',code:'KeyH',shiftKey:true,bubbles:true})));assert.equal(await frame.evaluate(()=>customization),0,'native hotkeys cannot bypass managed tool transactions');
  for(const [tool,id] of [['Coasts and lakes','featuresOverview'],['Rivers','riversOverview'],['Climate settings','worldConfigurator'],['Biome editor','biomesEditor']]){
    if(tool==='Climate settings'&&!await editor.getByRole('button',{name:tool,exact:true}).isVisible())await editor.locator('[data-world-tools] details > summary').click();
    await editor.getByRole('button',{name:tool,exact:true}).click();await native.waitFor();await frame.locator('#'+id).waitFor();
    assert.equal(await editor.locator('[data-map-context]').isVisible(),false);assert.equal(await native.getByRole('button',{name:'Undo stroke',exact:true}).count(),0,'no false undo for tools without a shared native history');
    await waitNativeIdle();await native.getByRole('button',{name:'Confirm tool',exact:true}).click();await native.waitFor({state:'detached'}).catch(async error=>{console.log('NATIVE_CONFIRM_STATE',await editor.innerText());throw error;});
  }
  for(const [group,tool,id] of [['Human geography','Routes','routesOverview'],['Display and style','Labels','labelsOverview'],['Display and style','Map style','styleContent']]){if(!await tools.evaluate(el=>el.open))await tools.locator(':scope > summary').click();await chooseGroup(group);await editor.getByRole('button',{name:tool,exact:true}).click();await native.waitFor();await frame.locator('#'+id).waitFor();assert.equal(await native.getByRole('button',{name:'Undo stroke',exact:true}).count(),0);await waitNativeIdle();await native.getByRole('button',{name:'Confirm tool',exact:true}).click();await native.waitFor({state:'detached'}).catch(async error=>{console.log('NATIVE_TOOL_CONFIRM_FAILED',tool,await editor.innerText());throw error;});}
  }
  await exportMenu.locator(':scope > summary').click();const projectDownload=page.waitForEvent('download');await exportMenu.getByRole('button',{name:'.map ↓',exact:true}).click();await (await projectDownload).saveAs('test-results/world-map-ui/project.map');await exportMenu.locator(':scope > summary').click();
  if(!await tools.evaluate(el=>el.open))await tools.locator(':scope > summary').click();await chooseGroup('Human geography');await editor.getByRole('button',{name:'Add town',exact:true}).click();
  await page.waitForTimeout(250); // Existing MessagePort picker configuration must settle before the synthetic click.
  const box=await frame.locator('#map').boundingBox();await page.mouse.click(box.x+box.width*.55,box.y+box.height*.65);
  const townForm=page.getByRole('dialog',{name:'Edit town entry',exact:true});await townForm.getByLabel('Town name',{exact:true}).fill('UI Harbor');await page.evaluate(()=>{window.failMapSave=true;});await townForm.getByRole('button',{name:'Save entry',exact:true}).click();await townForm.getByRole('alert').filter({hasText:'Simulated local save failure'}).waitFor();assert.equal(await townForm.getByLabel('Town name',{exact:true}).inputValue(),'UI Harbor');await page.evaluate(()=>{window.failMapSave=false;});await townForm.getByRole('button',{name:'Save entry',exact:true}).click();await townForm.waitFor({state:'detached'});
  assert.equal(await tools.evaluate(el=>el.open),true,'tool disclosure stays open after placing an entry');
  await frame.locator('#nexus-placements text').filter({hasText:'UI Harbor'}).click();const marker=page.getByRole('dialog',{name:'Town marker',exact:true});await marker.getByRole('button',{name:'Open world entry',exact:true}).waitFor();await marker.getByRole('button',{name:'Close panel',exact:true}).click();
  await editor.getByRole('button',{name:'Add place',exact:true}).click();await waitLayout();const placeBox=await (await frame.frameElement()).boundingBox(),placePoint=await frame.evaluate(()=>{const p=new DOMPoint(options.map.graph.width*.6,options.map.graph.height*.55).matrixTransform(document.querySelector('#viewbox').getScreenCTM());return {x:p.x,y:p.y};});await page.mouse.click(placeBox.x+placePoint.x,placeBox.y+placePoint.y);
  const placeForm=page.getByRole('dialog',{name:'Edit place entry',exact:true});await placeForm.getByLabel('Name',{exact:true}).fill('UI Ruin');await placeForm.getByRole('button',{name:'Save entry',exact:true}).click();await placeForm.waitFor({state:'detached'});
  assert.equal(await page.evaluate(async()=>{const w=await mapStorage.getPage('world-browser');return w.character_data.world_entities.filter(e=>e.type==='site'&&e.name==='UI Ruin').length;}),1);
  await editor.getByRole('button',{name:'← Save and return',exact:true}).click();await editor.waitFor({state:'detached'});await page.getByRole('button',{name:'Edit map',exact:true}).click();await waitForAsync(page,()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),null,120000);
  await editor.getByRole('button',{name:'← Save and return',exact:true}).click();await editor.waitFor({state:'detached'});
  const details=page.locator('[data-world-details]');await details.getByRole('heading',{name:'World details',exact:true}).waitFor();
  for(const viewport of [{width:320,height:700},{width:820,height:1180},{width:1440,height:1000}]){
    await page.setViewportSize(viewport);assert.ok(await page.locator('[data-map-scroll]').first().evaluate(el=>el.scrollWidth<=el.clientWidth+1),'world homepage has no horizontal overflow');
    assert.ok(await page.locator('[data-map-canvas]').evaluate(el=>el.getBoundingClientRect().height<=385),'preview is bounded instead of a full-page map');
    assert.ok(await page.locator('[data-world-writing]').count(),'original world writing workspace is retained');await page.locator('[data-map-scroll]').first().evaluate(el=>{el.scrollTop=0;});await page.screenshot({path:'test-results/world-map-ui/home-'+viewport.width+'.png'});
  }
  await page.locator('[data-world-writing]').getByText('Original world chronicle',{exact:true}).waitFor();
  await details.getByRole('button',{name:'Country · 0',exact:true}).click();assert.equal(await details.getByRole('button',{name:'UI Harbor',exact:true}).count(),0);await details.getByRole('button',{name:'All entries',exact:true}).click();
  const geography=await page.evaluate(async()=>{const w=await mapStorage.getPage('world-browser');return JSON.stringify(w.character_data.world_maps);});
  await details.getByRole('button',{name:'UI Harbor',exact:true}).click();await townForm.waitFor();
  assert.equal(await townForm.getByLabel('Town name',{exact:true}).getAttribute('readonly'),'','identity can only be renamed in the editor');
  await townForm.getByLabel('Short description',{exact:true}).fill('Updated story without changing geography');
  await townForm.getByRole('button',{name:'Add default fields',exact:true}).click();
  await townForm.getByLabel('History and stories',{exact:true}).fill('Preserved chronicle');
  await townForm.locator('[contenteditable=true]').fill('Long history from the world homepage');
  await townForm.getByRole('button',{name:'Save entry',exact:true}).click();await townForm.waitFor({state:'detached'});
  assert.equal(await page.evaluate(async()=>JSON.stringify((await mapStorage.getPage('world-browser')).character_data.world_maps)),geography,'detail writing does not rewrite geography or project binaries');
  const mapBlock=page.locator('[data-world-map-block]').first(),blockDetails=mapBlock.locator('[data-map-block-details]');
  await blockDetails.locator('summary').click();await blockDetails.getByText('Long history from the world homepage',{exact:true}).waitFor();
  assert.equal(await blockDetails.locator('[contenteditable=true]').count(),0,'canonical rich text is read-only in the preview');
  await blockDetails.locator('summary').click();
  await details.getByRole('button',{name:'UI Harbor',exact:true}).click();await townForm.getByRole('button',{name:'Locate in editor',exact:true}).click();await editor.waitFor();
  const located=page.getByRole('dialog',{name:'Town marker',exact:true});await located.getByRole('button',{name:'Remove from this map',exact:true}).click();
  const removal=page.getByRole('dialog').filter({hasText:'Remove this marker'});if(await removal.count())await removal.getByRole('button',{name:'Confirm',exact:true}).click();
  await editor.getByRole('button',{name:'← Save and return',exact:true}).click();await editor.waitFor({state:'detached'});
  await details.getByRole('button',{name:'UI Harbor',exact:true}).click();await townForm.getByText('Long history from the world homepage',{exact:true}).waitFor();assert.equal(await townForm.getByLabel('History and stories',{exact:true}).inputValue(),'Preserved chronicle');await townForm.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.reload();await page.locator('[data-world-details]').getByRole('button',{name:'UI Harbor',exact:true}).waitFor();
  await page.getByRole('button',{name:'Edit map',exact:true}).click();await waitForAsync(page,()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),null,120000);
  frame=await (await editor.locator('iframe').elementHandle()).contentFrame();
  await frame.evaluate(()=>{const el=document.createElement('div');el.id='nexus-i18n-check';window.mapDataBeforeLocale=window.nexusMapData;window.nexusMapData=()=>[...window.mapDataBeforeLocale(),{name:'Units    Editor'}];el.innerHTML='<span data-ui>Coastline Settings</span><span data-user>Units    Editor</span><p title="Show drainage">Show or hide columns</p><select><option>Render ocean cells</option></select><input type="button" value="Open Image Converter"><input type="text" title="Show drainage" value="Coastline Settings"><div contenteditable="true">Coastline Settings</div>';document.body.append(el);window.nexusSetLanguage('zh-TW');});
  await frame.locator('#nexus-i18n-check [data-ui]').filter({hasText:'海岸線設定'}).waitFor();assert.equal(await frame.locator('#nexus-i18n-check p').getAttribute('title'),'顯示排水');assert.equal(await frame.locator('#nexus-i18n-check option').textContent(),'繪製海洋網格');assert.equal(await frame.locator('#nexus-i18n-check input[type=button]').inputValue(),'開啟圖片轉換器');assert.equal(await frame.locator('#nexus-i18n-check input[type=text]').inputValue(),'Coastline Settings');assert.equal(await frame.locator('#nexus-i18n-check [contenteditable]').textContent(),'Coastline Settings');
  assert.equal(await frame.locator('#nexus-i18n-check [data-user]').textContent(),'Units    Editor');
  await frame.evaluate(()=>{window.nexusSetLanguage('en');window.nexusMapData=window.mapDataBeforeLocale;delete window.mapDataBeforeLocale;});assert.equal(await frame.locator('#nexus-i18n-check [data-ui]').textContent(),'Coastline Settings');await frame.locator('#nexus-i18n-check').evaluate(el=>el.remove());
  await editor.getByRole('button',{name:'← Save and return',exact:true}).click();await editor.waitFor({state:'detached'});await page.getByRole('button',{name:'World entries',exact:true}).click();
  const entries=page.getByRole('dialog',{name:'World entries',exact:true});await entries.locator('li').filter({hasText:'UI Harbor'}).getByRole('button',{name:'Edit town entry',exact:true}).click();
  await townForm.getByRole('button',{name:'Delete entire entry',exact:true}).click();let deletion=page.getByRole('dialog').filter({hasText:'Permanently delete this entry, its writing and all placements?'});await deletion.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await townForm.isVisible(),true,'cancel full deletion preserves the editing entry');
  await townForm.getByRole('button',{name:'Delete entire entry',exact:true}).click();await deletion.getByRole('button',{name:'Confirm',exact:true}).click();await townForm.waitFor({state:'detached'});assert.equal(await page.evaluate(async()=>(await mapStorage.getPage('world-browser')).character_data.world_entities.some(e=>e.name==='UI Harbor')),false);await entries.getByRole('button',{name:'Close panel',exact:true}).click();
  if(await editor.isVisible()){await editor.getByRole('button',{name:'← Save and return',exact:true}).click();await editor.waitFor({state:'detached'});}
  }
  const firstWindow=page.locator('[data-world-map-block]').first();
  await firstWindow.locator('iframe').waitFor();const previewFrame=await (await firstWindow.locator('iframe').elementHandle()).contentFrame();
  await previewFrame.waitForFunction(()=>typeof grid!=='undefined'&&grid.cells?.h?.length);assert.equal(await previewFrame.evaluate(()=>options.map.lore.name),nativeName);
  const originalData=await page.evaluate(async()=>{const w=await mapStorage.getPage('world-browser');return {maps:w.character_data.world_maps,attachments:w.attachment_ids};});
  await page.getByRole('button',{name:'＋新增區塊',exact:true}).click();await page.getByRole('dialog',{name:'新增區塊',exact:true}).getByRole('button',{name:'地圖區塊',exact:true}).click();
  await page.locator('[data-world-map-block]').nth(1).waitFor();
  const secondWindow=page.locator('[data-world-map-block]').nth(1);
  await secondWindow.getByRole('combobox',{name:'Display layers',exact:true}).selectOption('political');
  await waitForAsync(page,async()=>{const w=await mapStorage.getPage('world-browser');return w.character_data.sections.filter(b=>b.worldMapView).some(b=>b.worldMapView.layer==='political');});
  assert.equal(await firstWindow.getByRole('combobox',{name:'Display layers',exact:true}).inputValue(),'physical');
  await previewFrame.locator('#map').dblclick({position:{x:20,y:20}});
  await waitForAsync(page,async()=>{const w=await mapStorage.getPage('world-browser');return !!w.character_data.sections.filter(b=>b.worldMapView)[0].worldMapView.views?.[w.character_data.world_maps[0].id];});
  const independentViews=await page.evaluate(async()=>{const w=await mapStorage.getPage('world-browser');return w.character_data.sections.filter(b=>b.worldMapView).map(b=>b.worldMapView.views);});
  assert.notDeepEqual(independentViews[0],independentViews[1],'preview views belong to each block');
  for(const viewport of [{width:320,height:700},{width:820,height:1180},{width:1440,height:1000}]){
    await page.setViewportSize(viewport);assert.ok(await page.locator('[data-map-scroll]').first().evaluate(el=>el.scrollWidth<=el.clientWidth+1),'multiple map blocks do not overflow');
  }
  const secondBlock=secondWindow.locator('xpath=ancestor::section[@data-character-block][1]');
  await secondBlock.getByRole('button',{name:/複製區塊/}).click();await page.locator('[data-world-map-block]').nth(2).waitFor();
  await secondBlock.getByRole('button',{name:/刪除區塊/}).click();
  await waitForAsync(page,()=>document.querySelectorAll('[data-world-map-block]').length===2);
  const sharedData=await page.evaluate(async()=>{const w=await mapStorage.getPage('world-browser');return {maps:w.character_data.world_maps,attachments:w.attachment_ids};});assert.deepEqual(sharedData,originalData,'adding/copying/removing windows leaves shared projects intact');
  await page.reload();await page.locator('[data-world-map-block]').nth(1).waitFor();
  assert.equal(await page.locator('[data-world-map-block]').nth(1).getByRole('combobox',{name:'Display layers',exact:true}).inputValue(),'political','per-block settings survive reopening');
  const leftWindow=page.locator('[data-world-map-block]').first(),rightWindow=page.locator('[data-world-map-block]').nth(1);
  await leftWindow.getByRole('button',{name:'Edit map',exact:true}).click();await editor.getByRole('button',{name:'Save',exact:true}).waitFor();
  await waitForAsync(page,()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),null,120000);
  const sharedEditorFrame=await (await editor.locator('iframe').elementHandle()).contentFrame();
  await sharedEditorFrame.evaluate(()=>{options.map.lore.name='SHARED_WINDOWS';});await editor.getByRole('button',{name:'Save',exact:true}).click();
  await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();
  await waitForAsync(page,async()=>{const w=await mapStorage.getPage('world-browser'),m=w.character_data.world_maps[0];return (await (await mapStorage.readBinary(m.attachment_id)).text()).includes('SHARED_WINDOWS');});
  // Occluded/offscreen iframe animation frames can pause: assert rendering after returning to previews.
  await editor.getByRole('button',{name:'← Save and return',exact:true}).click();await editor.waitFor({state:'detached'});
  await rightWindow.scrollIntoViewIfNeeded();await rightWindow.locator('iframe').waitFor();const sharedPreviewFrame=await (await rightWindow.locator('iframe').elementHandle()).contentFrame();
  await sharedPreviewFrame.waitForFunction(()=>typeof options!=='undefined'&&options.map.lore.name==='SHARED_WINDOWS').catch(async error=>{console.log('SHARED_PREVIEW_FAILURE',await editor.innerText(),'RIGHT',await rightWindow.innerText(),'NATIVE',await sharedPreviewFrame.evaluate(()=>({lore:typeof options!=='undefined'?options.map?.lore:null,ready:typeof pack!=='undefined'&&!!pack.cells})),await page.evaluate(async()=>{const w=await mapStorage.getPage('world-browser'),m=w.character_data.world_maps[0];return {revision:w.revision,mapRevision:m.revision,snapshotHasMarker:(await (await mapStorage.readBinary(m.attachment_id)).text()).includes('SHARED_WINDOWS')};}));throw error;});
  assert.equal(await rightWindow.getByRole('combobox',{name:'Display layers',exact:true}).inputValue(),'political','shared project updates preserve independent display mode');
  const movingId=await rightWindow.getAttribute('data-world-map-block');
  const previousIndex=await page.evaluate(async id=>(await mapStorage.getPage('world-browser')).character_data.sections.findIndex(b=>b.id===id),movingId);
  await rightWindow.locator('xpath=ancestor::section[@data-character-block][1]').getByRole('button',{name:/上移區塊/}).click();
  await waitForAsync(page,async({id,index})=>(await mapStorage.getPage('world-browser')).character_data.sections.findIndex(b=>b.id===id)===index-1,{id:movingId,index:previousIndex});
  await rightWindow.scrollIntoViewIfNeeded();const reorderedFrame=await (await rightWindow.locator('iframe').elementHandle()).contentFrame();
  await reorderedFrame.waitForFunction(()=>typeof options!=='undefined'&&options.map.lore.name==='SHARED_WINDOWS');
  assert.deepEqual(errors,[]);console.log('WORLD_MAP_UI_STAGE2_VERIFIED' ,{viewports:3,exports:process.env.MAP_BLOCKS_ONLY?0:6,legacyPreference:!process.env.MAP_BLOCKS_ONLY,nativeTools:!process.env.MAP_BLOCKS_ONLY&&!process.env.MAP_SKIP_NATIVE_TRANSACTIONS,reopen:true,mapBlocks:true,sharedProject:true,reorder:true});
});
