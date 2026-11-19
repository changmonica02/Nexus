const {test}=require('node:test'),assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs');
const {chromium}=require('playwright');
test('PWA cached Worker bootstrap uses the new request fragment after reload',{timeout:60000},async t=>{
 const sw=fs.readFileSync('public/sw.js','utf8');
 const html='<!doctype html><title>Worker update regression</title><script src="/_next/static/app.js"></script>';
 const server=http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/sw.js'){res.setHeader('Content-Type','text/javascript');return res.end(sw);}
  if(req.url.startsWith('/_next/static/worker.js')){res.setHeader('Content-Type','text/javascript');return res.end('self.postMessage({hash:location.hash,href:location.href});');}
  if(req.url.startsWith('/_next/static/')){res.setHeader('Content-Type','text/javascript');return res.end('');}
  res.setHeader('Content-Type','text/html');res.end(html);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox']});t.after(()=>browser.close());
 const context=await browser.newContext(),page=await context.newPage(),origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin);await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
 await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const run=version=>page.evaluate(version=>new Promise((resolve,reject)=>{
  const worker=new Worker('/_next/static/worker.js#params='+encodeURIComponent(JSON.stringify({version}))),timer=setTimeout(()=>{worker.terminate();reject(Error('Worker bootstrap timeout'));},10000);
  worker.onmessage=({data})=>{clearTimeout(timer);worker.terminate();resolve(data);};
  worker.onerror=()=>{clearTimeout(timer);worker.terminate();reject(Error('Worker failed'));};
 }),version);
 const old=await run('old');console.log('old bootstrap',old);
 await page.waitForFunction(async()=>!!await(await caches.open('nexus-shell-v2')).match('/_next/static/worker.js'));
 await page.reload();const updated=await run('natural-v4');console.log('updated bootstrap',updated);
 assert.equal(updated.hash,'#params='+encodeURIComponent(JSON.stringify({version:'natural-v4'})),'a cached response must not restore the previous Worker URL fragment');
 await context.setOffline(true);const offline=await run('natural-v4');assert.equal(offline.hash,updated.hash);
});
