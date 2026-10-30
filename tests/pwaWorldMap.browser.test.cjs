require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {build}=require('esbuild'),{chromium}=require('playwright');
const {worldMapHeaders}=require('../next.config.ts');
test('PWA stage 2: native world map offline save and reopen with independent worker',{timeout:600000},async t=>{
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
  const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined});t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,hasTouch:true}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('pageerror:',e.message);});page.on('console',m=>{if(m.type()==='error')console.log('browser:',m.text().slice(0,350));});
  page.on('requestfailed',r=>console.log('request failed:',r.url().slice(0,140),r.failure()?.errorText));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('http://127.0.0.1:'+server.address().port);
  const {waitForAsync,setNetwork}=require('./pwaBrowser.cjs');
  const manage=page.getByRole('dialog',{name:'Manage maps'});
  await page.getByRole('button',{name:'Manage maps',exact:true}).first().click();
  await manage.getByRole('button',{name:'Create map',exact:true}).click();
  await page.getByRole('textbox',{name:'Map name'}).fill('Offline Atlas');
  await page.getByRole('button',{name:'Confirm creation',exact:true}).click();
  const editor=page.getByRole('dialog',{name:'World map editor'});
  await waitForAsync(page,()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),null,120000);
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js',{scope:'/'});await navigator.serviceWorker.ready;});
  await editor.getByRole('button',{name:'Save',exact:true}).click();
  await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});
  await context.setOffline(true);await setNetwork(page,true);
  await page.getByRole('button',{name:'Edit map',exact:true}).click();
  await waitForAsync(page,()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),null,120000);
  let frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());
  await frame.evaluate(()=>{options.map.name='OFFLINE_STAGE2';});
  await editor.getByRole('button',{name:'Save',exact:true}).click();await editor.getByRole('status').filter({hasText:'Saved on this device'}).waitFor();
  await editor.getByRole('button',{name:'← Save and return'}).click();await editor.waitFor({state:'detached'});
  await page.getByRole('button',{name:'Edit map',exact:true}).click();
  await waitForAsync(page,()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Save'&&!b.disabled),null,120000);
  frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());assert.equal(await frame.evaluate(()=>options.map.name),'OFFLINE_STAGE2');
  const result=await page.evaluate(async()=>{const world=await mapStorage.getPage('world-browser');return {pending:(await mapStorage.getWorkspacePersistence().pending('map-browser-owner')).length,scope:(await navigator.serviceWorker.getRegistration('/world-map/')).scope,native:(await (await mapStorage.readBinary(world.character_data.world_maps[0].attachment_id)).text()).includes('OFFLINE_STAGE2')};});
  assert.ok(result.pending>0);assert.ok(result.scope.endsWith('/world-map/'));assert.ok(result.native);
  assert.deepEqual(errors,[]);console.log('PWA_WORLD_MAP_OFFLINE_VERIFIED',JSON.stringify(result));
});
