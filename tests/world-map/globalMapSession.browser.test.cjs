const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {build}=require('esbuild'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
test('desktop/mobile height sessions derive once and ecosystem wrapping has no date-line seam',{timeout:240000},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-session-'));
 const {generate}=await import('../../experiments/spherical-grid/grid.mjs');
 const {exportGlobalTerrainSnapshot}=await import('../../experiments/spherical-grid/snapshot.mjs');
 const grid=generate(60);grid.heights.set(grid.points.map(p=>p[0]<-.1?-25:Math.max(1,Math.round(p[0]*10))));
 const oceanSeed=grid.heights.findIndex(h=>h<0),terrain=exportGlobalTerrainSnapshot({grid,oceanSeed,revision:0});
 const project={format:'nexus-global-map',version:1,settings:{seed:42,landPercent:32,continentCores:8,gridCells:36002},climateVersion:2,packSettings:{version:1,detail:1},naturalGeography:{version:1,rivers:[],lakes:[],overlays:[]},terrain};
 const postcss=require('postcss'),tailwind=require('@tailwindcss/postcss');
 const css=await postcss([tailwind()]).process('@import "tailwindcss"; :root{--color-bg:white;--color-text:#172734}',{from:path.join(root,'src/app/session-qa.css')});fs.writeFileSync(path.join(tmp,'style.css'),css.css);
 await build({entryPoints:[path.join(root,'tests/fixtures/globalMapSession.jsx')],outfile:path.join(tmp,'fixture.js'),bundle:true,jsx:'automatic',platform:'browser',plugins:[{name:'worker-url',setup(b){b.onLoad({filter:/globalMapClient\.ts$/},args=>({contents:fs.readFileSync(args.path,'utf8').replace("new URL('../../../.cache/global-map-worker.js',import.meta.url)","'/worker.js'"),loader:'ts',resolveDir:path.dirname(args.path)}));}}]});
 const server=http.createServer((req,res)=>{if(req.url==='/project.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(project));}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css.css);}else if(req.url==='/fixture.js'||req.url==='/worker.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(req.url==='/worker.js'?path.join(root,'.cache/global-map-worker.js'):path.join(tmp,'fixture.js')));}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/fixture.js"></script>');}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox']});
  for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
   console.log('MAP_SESSION_VIEWPORT',viewport.width,viewport.height);
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.mapQA?.drawing,{timeout:120000});await page.getByRole('button',{name:'顯示',exact:true}).click();const ecosystemStart=Date.now();await page.getByRole('button',{name:'生態',exact:true}).click();console.log('ECOSYSTEM_CLICK_MS',Date.now()-ecosystemStart);
   const canvas=page.locator('canvas[data-global-map-canvas]');await canvas.focus();await canvas.press('ArrowLeft');await page.waitForTimeout(1500);
   const seam=await canvas.evaluate(el=>{const ctx=el.getContext('2d'),w=el.width,h=el.height,s=Math.min(w/360,h/180),x=Math.round(w/2+40-180*s),data=ctx.getImageData(0,0,w,h).data;let bad=0,total=0;for(let y=Math.ceil(h/2-89*s);y<h/2+89*s;y++){const a=(y*w+x-2)*4,b=(y*w+x+2)*4;if(x<2||x>=w-2)continue;total++;if(Math.max(...[0,1,2].map(k=>Math.abs(data[a+k]-data[b+k])))>25)bad++;}return {bad,total};});
   assert.ok(seam.total>200);assert.ok(seam.bad/seam.total<.04,JSON.stringify(seam));
   await page.getByRole('button',{name:'工具',exact:true}).click();await page.getByText('以座標套用',{exact:true}).click();const before=await page.evaluate(()=>({actions:mapQA.actions.length,progress:mapQA.progress}));
   for(let i=0;i<3;i++)await page.getByRole('button',{name:'套用至座標',exact:true}).click();await page.waitForFunction(()=>mapQA.drafts>=3);
   assert.deepEqual(await page.evaluate(()=>({actions:mapQA.actions.length,progress:mapQA.progress})),before);assert.equal(await page.evaluate(()=>mapQA.saves),0);assert.equal(await page.locator('[aria-busy="true"]').count(),0);
   await page.getByRole('button',{name:'儲存並退出',exact:true}).first().click();await page.waitForFunction(()=>mapQA.saves===1,{timeout:120000});assert.equal(await page.evaluate(()=>mapQA.actions.filter(a=>a==='recalculateNature').length),1);assert.equal(await page.evaluate(()=>mapQA.saved.environmentTerrain),undefined);assert.deepEqual(errors,[]);await page.close();
  }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true});}
});
