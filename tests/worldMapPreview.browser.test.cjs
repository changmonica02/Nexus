require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {build}=require('esbuild'),{chromium,webkit}=require('playwright');
const {worldMapHeaders}=require('../next.config.ts');
test('natural map preview: real PNG pixels, hidden iframe, mobile decoding and failure recovery',{timeout:600000},async t=>{
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
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('pageerror:',e.message);});page.on('console',m=>{if(m.type()==='error')console.log('browser:',m.text().slice(0,350));});
  page.on('requestfailed',r=>console.log('request failed:',r.url().slice(0,140),r.failure()?.errorText));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('http://127.0.0.1:'+server.address().port);

  const {waitForAsync}=require('./pwaBrowser.cjs');
  await page.getByRole('button',{name:'Manage maps',exact:true}).first().click();
  await page.getByRole('dialog',{name:'Manage maps'}).getByRole('button',{name:'Create map',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Create map',exact:true}),img=dialog.locator('img[alt="Terrain template preview"]');
  await img.waitFor({timeout:120000});await waitForAsync(page,()=>{const i=document.querySelector('img[alt="Terrain template preview"]');return i?.complete&&i.naturalWidth>0&&i.closest('[aria-busy]')?.getAttribute('aria-busy')==='false' ;});
  const frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());
  const heights=await frame.evaluate(()=>{const random=Math.random;try{const graph=Grid.generate('preview-regression',1280,800,5000);const h=HeightmapGenerator.fromTemplate(graph,'continents',{width:1280,height:800,points:5000});return {count:h.length,width:graph.cellsX,height:graph.cellsY,min:Math.min(...h),max:Math.max(...h),levels:new Set(h).size};}finally{HeightmapGenerator.clearData();Math.random=random;}});
  assert.equal(heights.count,heights.width*heights.height);assert.ok(heights.max>heights.min&&heights.levels>10,JSON.stringify(heights));
  const checkPixels=async()=>{
    const result=await img.evaluate(async i=>{const response=await fetch(i.src),blob=await response.blob(),bytes=new Uint8Array(await blob.arrayBuffer());const canvas=document.createElement('canvas');canvas.width=i.naturalWidth;canvas.height=i.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(i,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;const colors=new Set();let opaque=0,nonblack=0;for(let n=0;n<pixels.length;n+=4){colors.add(pixels[n]+','+pixels[n+1]+','+pixels[n+2]);if(pixels[n+3]===255)opaque++;if(pixels[n]||pixels[n+1]||pixels[n+2])nonblack++;}return {type:blob.type,size:blob.size,signature:Array.from(bytes.slice(0,8)),width:canvas.width,height:canvas.height,colors:colors.size,opaque,nonblack};});
    assert.equal(result.type,'image/png');assert.deepEqual(result.signature,[137,80,78,71,13,10,26,10]);assert.ok(result.size>100);assert.equal(result.opaque,result.width*result.height);assert.ok(result.nonblack>0&&result.colors>10,'valid decoded PNG must contain real terrain colors: '+JSON.stringify(result));return result;
  };
  const initial=await checkPixels();
  const before=await frame.evaluate(()=>JSON.stringify([pack,grid.cells.h,options.map]));
  let templates=0;
  for(const source of ['procedural','precreated']){
    await dialog.getByLabel('Terrain source',{exact:true}).selectOption(source);
    const select=dialog.getByLabel('Terrain template',{exact:true});
    for(const id of await select.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value))){
      const old=await img.getAttribute('src');await select.selectOption(id);await dialog.getByRole('button',{name:'Resample',exact:true}).click();
      await waitForAsync(page,old=>{const i=document.querySelector('img[alt="Terrain template preview"]');return i?.src!==old&&i?.complete&&i.naturalWidth>0&&i.closest('[aria-busy]')?.getAttribute('aria-busy')==='false' &&!document.querySelector('[role="alert"]');},old,60000);
      await checkPixels();templates++;
    }
  }
  assert.equal(await frame.evaluate(()=>JSON.stringify([pack,grid.cells.h,options.map])),before,'preview cannot replace current map data');
  await page.setViewportSize({width:820,height:1180});assert.ok(await img.isVisible());await checkPixels();
  const bounds=await dialog.locator('iframe').boundingBox();assert.equal(bounds.width,1280);assert.equal(bounds.height,800);assert.ok(bounds.x<0,'exercise existing offscreen opaque iframe');
  // Simulate a browser that cannot encode a valid PNG; the parent must report failure.
  await frame.evaluate(()=>{window.originalPreviewEncode=HTMLCanvasElement.prototype.toDataURL;HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,AAAA';});
  await dialog.getByRole('button',{name:'Resample',exact:true}).click();await dialog.getByRole('alert').waitFor({timeout:15000});
  assert.match(await dialog.getByRole('alert').innerText(),/preview|預覽/i);assert.equal(await img.count(),0);assert.equal(await dialog.getByRole('button',{name:'Confirm creation',exact:true}).isDisabled(),true);
  await frame.evaluate(()=>{HTMLCanvasElement.prototype.toDataURL=window.originalPreviewEncode;});await dialog.getByRole('button',{name:'Resample',exact:true}).click();await img.waitFor();await waitForAsync(page,()=>{const i=document.querySelector('img[alt="Terrain template preview"]');return i?.complete&&i.naturalWidth>0&&i.closest('[aria-busy]')?.getAttribute('aria-busy')==='false' ;});await checkPixels();assert.equal(await dialog.getByRole('alert').count(),0);
  // Optional transport-offline coverage, separate from mobile image/iframe compatibility.
  if(process.env.MAP_PREVIEW_OFFLINE==='1'){
  // Reopen the creator from its cached offline document, including the new online broker script.
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.evaluate(()=>navigator.serviceWorker.register('/world-map/offline.js',{scope:'/world-map/'}));
  await waitForAsync(page,async()=>!!(await navigator.serviceWorker.getRegistration('/world-map/'))?.active,null,120000);
  await context.setOffline(true);await page.evaluate(()=>Object.defineProperty(navigator,'onLine',{configurable:true,value:false}));
  const manage=page.getByRole('dialog',{name:'Manage maps'});if(!await manage.isVisible())await page.getByRole('button',{name:'Manage maps',exact:true}).first().click();
  await manage.getByRole('button',{name:'Create map',exact:true}).click();await img.waitFor({timeout:60000});await waitForAsync(page,()=>{const i=document.querySelector('img[alt="Terrain template preview"]');return i?.complete&&i.naturalWidth>0&&i.closest('[aria-busy]')?.getAttribute('aria-busy')==='false' ;});await checkPixels();
  const oldOffline=await img.getAttribute('src');await dialog.getByLabel('Terrain source',{exact:true}).selectOption('precreated');await waitForAsync(page,old=>{const i=document.querySelector('img[alt="Terrain template preview"]');return i?.src!==old&&i?.complete&&i.naturalWidth>0&&i.closest('[aria-busy]')?.getAttribute('aria-busy')==='false' ;},oldOffline);await checkPixels();
  }
  assert.equal(await page.evaluate(async()=>((await mapStorage.getPage('world-browser')).character_data.world_maps??[]).length),0);
  assert.deepEqual(errors,[]);console.log('NATURAL_PREVIEW_VERIFIED',JSON.stringify({engine:process.env.MAP_BROWSER||'chromium',heights,initial,templates,mobile:true,tablet:true,hiddenFrame:true,failureRecovery:true,offlineCreator:process.env.MAP_PREVIEW_OFFLINE==='1'}));
});
