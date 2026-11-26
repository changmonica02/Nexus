const {test}=require('node:test'),assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs');
const {chromium}=require('playwright');
test('PWA cached Worker bootstrap uses the new request fragment after reload',{timeout:60000},async t=>{
 const sw=fs.readFileSync('public/sw.js','utf8');
 const html='<!doctype html><title>Worker update regression</title><script src="/_next/static/app.js"></script>';
 const server=http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url.startsWith('/sw.js')){res.setHeader('Content-Type','text/javascript');return res.end(req.url.includes('legacy')?`self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(new URL(e.request.url).pathname.startsWith('/_next/static/'))e.respondWith((async()=>{const c=await caches.open('nexus-shell-v2'),hit=await c.match(e.request);if(hit)return hit;const r=await fetch(e.request);await c.put(e.request,r.clone());return r;})());});`:sw);}
  if(req.url.startsWith('/_next/static/natural-worker-v4.js')){res.setHeader('Content-Type','text/javascript');return res.end('self.postMessage({version:"natural-v4",hash:location.hash});');}
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
 // Also prove the client-side route works while the old SW still controls it.
 const legacyContext=await browser.newContext(),legacyPage=await legacyContext.newPage();
 await legacyPage.goto(origin);await legacyPage.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js?legacy');await navigator.serviceWorker.ready;});
 await legacyPage.reload();await legacyPage.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const legacyRequest=url=>legacyPage.evaluate(url=>new Promise((resolve,reject)=>{const w=new Worker(url),timer=setTimeout(()=>{w.terminate();reject(Error('legacy Worker timeout'));},10000);w.onmessage=({data})=>{clearTimeout(timer);w.terminate();resolve(data)};w.onerror=()=>{clearTimeout(timer);w.terminate();reject(Error('legacy Worker failed'))};}),url);
 const first=await legacyRequest('/_next/static/worker.js#old');
 await legacyPage.waitForFunction(async()=>!!await(await caches.open('nexus-shell-v2')).match('/_next/static/worker.js'));
 await legacyPage.reload();const stale=await legacyRequest('/_next/static/worker.js#new');assert.equal(stale.hash,first.hash,'control reproduces the original cached-fragment defect');
 const direct=await legacyRequest('/_next/static/natural-worker-v4.js');assert.equal(direct.version,'natural-v4');
 await legacyContext.setOffline(true);assert.equal((await legacyRequest('/_next/static/natural-worker-v4.js')).version,'natural-v4');
 await legacyContext.close();
});

test('PWA registration handles online, load and unmount during asynchronous setup', async () => {
 const vm = require('node:vm');
 const { transformSync } = require('esbuild');
 const source = fs.readFileSync('src/components/PWARegister.tsx', 'utf8');
 const { code } = transformSync(source, { loader: 'tsx', format: 'cjs' });

 for (const unmountWhile of ['registering', 'waiting for ready', null]) {
  const window = new EventTarget();
  const messages = [];
  const worker = { postMessage: message => messages.push(message.type) };
  let registrations = 0;
  let updates = 0;
  let cleanup;
  let finishRegistration;
  let finishReady;
  const registrationPending = new Promise(resolve => { finishRegistration = resolve; });
  const ready = new Promise(resolve => { finishReady = resolve; });
  const registration = { active: worker, update: async () => { updates++; } };
  const serviceWorker = { register: () => { registrations++; return registrationPending; }, ready };
  const module = { exports: {} };
  vm.runInNewContext(code, {
   module,
   require: name => {
    assert.equal(name, 'react');
    return { useEffect: effect => { cleanup = effect(); } };
   },
   window,
   document: { readyState: 'loading' },
   navigator: { serviceWorker, onLine: true },
   performance: { getEntriesByType: () => [] },
  });
  module.exports.default();
  window.dispatchEvent(new Event('online'));
  window.dispatchEvent(new Event('load'));
  assert.equal(registrations, 1);
  if (unmountWhile === 'registering') cleanup();
  finishRegistration(registration);
  await new Promise(resolve => setImmediate(resolve));
  if (unmountWhile === 'waiting for ready') cleanup();
  finishReady(registration);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(messages, unmountWhile ? [] : ['NEXUS_PRECACHE_ASSETS', 'NEXUS_REFRESH_SHELL']);
  if (!unmountWhile) {
   window.dispatchEvent(new Event('online'));
   assert.deepEqual(messages.slice(2), ['NEXUS_REFRESH_SHELL', 'NEXUS_PRECACHE_ASSETS']);
   assert.equal(updates, 1);
   cleanup();
  }
  window.dispatchEvent(new Event('online'));
  assert.equal(registrations, 1);
  assert.equal(updates, unmountWhile ? 0 : 1);
 }
});
