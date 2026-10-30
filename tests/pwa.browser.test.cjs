const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { waitForAsync, setNetwork } = require('./pwaBrowser.cjs');

test('PWA shell: anonymous complete releases, offline restart, exclusions and durable data', { timeout: 90000 }, async t => {
  let release = 'a', missing = false, workerVersion = 'v2';
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push(req.url);
    if (req.url === '/sw.js') { res.setHeader('Content-Type', 'application/javascript'); res.setHeader('Cache-Control', 'no-store'); res.end(fs.readFileSync('public/sw.js', 'utf8').replace('nexus-shell-v2', 'nexus-shell-' + workerVersion)); return; }
    if (req.url === '/') {
      res.setHeader('Content-Type', 'text/html');
      res.end(`<!doctype html><link rel="stylesheet" href="/_next/static/${release}.css"><p>${req.headers.cookie ? 'PRIVATE_PROFILE' : 'ANONYMOUS'}</p><script src="/_next/static/${release}.js"></script>`); return;
    }
    if (req.url.startsWith('/_next/static/')) {
      if (missing && req.url.includes('/b.')) { res.writeHead(503); res.end('unavailable'); return; }
      res.setHeader('Content-Type', req.url.endsWith('.js') ? 'application/javascript' : 'text/css');
      res.end(req.url.endsWith('.js') ? `window.shellBoot=${JSON.stringify(req.url.includes('/a.') ? 'a' : 'b')}` : 'body{color:rgb(20,30,40)}'); return;
    }
    if (req.url === '/world-map/offline.js') { res.setHeader('Content-Type', 'application/javascript'); res.end("self.addEventListener('fetch', e => { if(new URL(e.request.url).pathname==='/world-map/probe') e.respondWith(new Response('MAP_OWN_WORKER')); });"); return; }
    if (req.url === '/world-map/probe') { res.setHeader('Content-Type', 'text/html'); res.end('MAP_NETWORK'); return; }
    res.end('NETWORK_ONLY');
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(() => new Promise(r => { server.closeAllConnections(); server.close(r); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || undefined });
  t.after(() => browser.close());
  const context = await browser.newContext();
  const responses = [];
  context.on('response', r => responses.push({ url: r.url(), sw: r.fromServiceWorker() }));
  let page = await context.newPage();
  await page.goto(origin);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready;
    await new Promise(resolve => { if (navigator.serviceWorker.controller) resolve(); else navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }); });
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('nexus', 1);
      req.onupgradeneeded = () => { req.result.createObjectStore('pages', { keyPath: 'id' }); req.result.createObjectStore('workspace_outbox', { keyPath: 'id' }); };
      req.onsuccess = () => { const db = req.result, tx = db.transaction(['pages', 'workspace_outbox'], 'readwrite'); tx.objectStore('pages').put({ id: 'sentinel', content_json: { text: 'KEEP_PENDING_EDIT' } }); tx.objectStore('workspace_outbox').put({ id: 'pending', payload: 'KEEP_OUTBOX' }); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
    });
    await (await caches.open('nexus-world-map-sentinel')).put('/world-map/sentinel', new Response('KEEP_MAP_CACHE'));
  });
  // Anonymous install/preparation must finish caching the matching JS AND CSS.
  await waitForAsync(page, async () => {
    const keys = (await caches.keys()).filter(n => n.startsWith('nexus-shell-'));
    return keys.length && !!await (await caches.open(keys.at(-1))).match('/');
  });
  const cacheState = () => page.evaluate(async () => {
    const name = (await caches.keys()).find(n => n.startsWith('nexus-shell-'));
    const cache = await caches.open(name);
    return { html: await (await cache.match('/')).text(), urls: (await cache.keys()).map(r => new URL(r.url).pathname) };
  });
  assert.ok((await cacheState()).urls.includes('/_next/static/a.js'), 'install includes initial JS');
  assert.ok((await cacheState()).urls.includes('/_next/static/a.css'), 'install includes initial CSS');
  await context.addCookies([{ name: 'session', value: 'private', url: origin }]);
  await page.reload();
  assert.match(await page.textContent('body'), /PRIVATE_PROFILE/);
  assert.doesNotMatch((await cacheState()).html, /PRIVATE_PROFILE/, 'never cache credentialed navigation HTML');
  for (const url of ['/api/ping', '/auth/token', '/attachments/secret', '/world-map/data', '/_next/static/a.js']) {
    await page.evaluate(url => fetch(url).then(r => r.text()), url);
  }
  await page.evaluate(() => fetch('/_next/static/a.js', { headers: { Authorization: 'Bearer synthetic' } }).then(r => r.text()));
  await context.route('https://pwa-api.supabase.co/**', route => route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' }));
  await page.evaluate(async () => {
    await fetch('https://pwa-api.supabase.co/rest/v1/pages');
    await fetch('https://pwa-api.supabase.co/auth/v1/token', { method: 'POST', body: '{}' });
    await fetch('https://pwa-api.supabase.co/storage/v1/object/private/attachment');
    await fetch('/', { headers: { RSC: '1' } });
  });
  for (const path of ['/rest/v1/pages', '/auth/v1/token', '/storage/v1/object/private/attachment']) assert.ok(responses.some(r => r.url === 'https://pwa-api.supabase.co' + path && !r.sw), `${path} bypasses SW`);
  for (const path of ['/api/ping', '/auth/token', '/attachments/secret', '/world-map/data']) {
    assert.ok(responses.some(r => r.url === origin + path && !r.sw), `${path} bypasses main SW`);
  }
  assert.ok(responses.filter(r => r.url === origin + '/_next/static/a.js').at(-1).sw === false, 'authorized requests bypass SW');
  await context.setOffline(true); await setNetwork(page, true);
  await page.close(); page = await context.newPage(); await setNetwork(page, true);
  await page.goto(origin);
  await waitForAsync(page, () => window.shellBoot === 'a');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).color), 'rgb(20, 30, 40)');
  const missingRoute = await page.goto(origin + '/study');
  assert.equal(missingRoute.status(), 503, 'uncached app route shows a clear offline response');
  const privateResponse = await page.goto(origin + '/attachments/secret').catch(() => null);
  assert.ok(!privateResponse || !/ANONYMOUS|PRIVATE_PROFILE/.test(await privateResponse.text()), 'private navigation is not replaced by cached home');
  await context.setOffline(false); await setNetwork(page, false); await context.clearCookies(); await page.goto(origin);
  // Do not replace the last working shell when the next release assets are missing.
  release = 'b'; missing = true;
  await page.reload();
  assert.match((await cacheState()).html, /a\.js/, 'partial release cannot replace complete cached home');
  missing = false; await page.reload();
  await waitForAsync(page, async () => {
    const names = (await caches.keys()).filter(n => n.startsWith('nexus-shell-'));
    const cache = await caches.open(names.at(-1)); const home = await cache.match('/');
    return home && (await home.text()).includes('/b.js');
  });
  await context.setOffline(true); await setNetwork(page, true); await page.close(); page = await context.newPage(); await page.goto(origin);
  await waitForAsync(page, () => window.shellBoot === 'b');
  const preserved = await page.evaluate(async () => {
    const record = await new Promise((resolve, reject) => { const req = indexedDB.open('nexus'); req.onsuccess = () => { const db = req.result; const tx = db.transaction('pages'); const get = tx.objectStore('pages').get('sentinel'); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); tx.oncomplete = () => db.close(); }; });
    return { record, map: await (await caches.match('/world-map/sentinel')).text() };
  });
  assert.equal(preserved.record.content_json.text, 'KEEP_PENDING_EDIT'); assert.equal(preserved.map, 'KEEP_MAP_CACHE');
  await context.setOffline(false); await setNetwork(page, false);
  await page.evaluate(() => { const input = document.createElement('input'); input.id = 'pending-editor'; input.value = 'UNSAVED'; document.body.append(input); });
  workerVersion = 'v3';
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration('/'); await registration.update(); });
  await waitForAsync(page, async () => !!(await navigator.serviceWorker.getRegistration('/'))?.waiting);
  assert.equal(await page.locator('#pending-editor').inputValue(), 'UNSAVED', 'update never forces an editing tab to reload');
  await page.close(); page = await context.newPage(); await page.goto(origin);
  await waitForAsync(page, async () => (await caches.keys()).includes('nexus-shell-v3') && !(await caches.keys()).includes('nexus-shell-v2'));
  const afterActivation = await page.evaluate(async () => {
    const records = await new Promise(resolve => { const req = indexedDB.open('nexus'); req.onsuccess = () => { const db = req.result, tx = db.transaction(['pages', 'workspace_outbox']); const page = tx.objectStore('pages').get('sentinel'), pending = tx.objectStore('workspace_outbox').get('pending'); tx.oncomplete = () => { resolve({ page: page.result, pending: pending.result }); db.close(); }; }; });
    return { ...records, map: await (await caches.match('/world-map/sentinel')).text() };
  });
  assert.equal(afterActivation.map, 'KEEP_MAP_CACHE'); assert.equal(afterActivation.page.content_json.text, 'KEEP_PENDING_EDIT'); assert.equal(afterActivation.pending.payload, 'KEEP_OUTBOX');
  await page.evaluate(async () => { await navigator.serviceWorker.register('/world-map/offline.js', { scope: '/world-map/' }); });
  await waitForAsync(page, async () => (await navigator.serviceWorker.getRegistration('/world-map/'))?.active?.scriptURL.endsWith('/world-map/offline.js'));
  await page.goto(origin + '/world-map/probe'); await page.reload();
  assert.equal(await page.textContent('body'), 'MAP_OWN_WORKER');
  console.log('PWA_FIXTURE_VERIFIED', JSON.stringify({ shell: 'a→offline→partial b rejected→b→offline', exclusions: true, indexedDB: true, mapScope: true }));
});
