const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

test('production Next shell: manifest, install icons, real JS/CSS and cold offline reopen', { timeout: 90000 }, async t => {
  const origin = process.env.NEXUS_PWA_URL || 'http://127.0.0.1:32120';
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || undefined });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const privateResponses = [];
  context.on('response', response => { if (response.url().startsWith('https://pwa-fixture.supabase.co/')) privateResponses.push(response.fromServiceWorker()); });
  // Optional local-build-only authentication fixture; no real credentials or APIs.
  const authenticated = process.env.NEXUS_PWA_AUTH_FIXTURE === '1';
  let disconnected = false;
  const authRequests = [];
  if (authenticated) {
    const user = { id: '00000000-0000-4000-8000-000000000120', email: 'pwa@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const token = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: user.id, role: user.role, aud: user.aud, exp: expires, iat: expires - 3600 })).toString('base64url') + '.synthetic-signature';
    await context.addInitScript(({ user, token, expires, origin }) => { if (location.origin !== origin) return; if (!localStorage.getItem('sb-pwa-fixture-auth-token')) localStorage.setItem('sb-pwa-fixture-auth-token', JSON.stringify({ user, access_token: token, refresh_token: 'synthetic-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer' })); }, { user, token, expires, origin });
    await context.route('https://pwa-fixture.supabase.co/**', async route => {
      authRequests.push(route.request().url());
      if (disconnected) { await route.abort('internetdisconnected'); return; }
      const url = new URL(route.request().url());
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(url.pathname.endsWith('/user') ? user : url.pathname.includes('is_dictionary_admin') ? false : []) });
    });
  }
  let page = await context.newPage(); const errors = [], failed = [];
  context.on('page', next => next.on('pageerror', e => errors.push(e.message)));
  page.on('pageerror', e => errors.push(e.message));
  context.on('requestfailed', req => failed.push(req.url()));
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.body.innerText.includes('Nexus'));
  if (authenticated) await page.locator('main').waitFor();
  const manifestURL = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await context.request.get(new URL(manifestURL, origin).href)).json();
  assert.equal(manifest.name, 'Nexus'); assert.equal(manifest.display, 'standalone'); assert.equal(manifest.start_url, '/');
  for (const size of [192, 512]) {
    const entry = manifest.icons.find(icon => icon.sizes === `${size}x${size}` && icon.type === 'image/png'); assert.ok(entry);
    const response = await context.request.get(new URL(entry.src, origin).href); assert.equal(response.status(), 200);
    const bytes = await response.body(); assert.equal(bytes.readUInt32BE(16), size); assert.equal(bytes.readUInt32BE(20), size);
  }
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
  const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href'); assert.equal((await context.request.get(new URL(apple, origin).href)).status(), 200);
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration('/'))?.active && !!navigator.serviceWorker.controller);
  // Registration alone is not the offline-ready signal: verify persisted shell data.
  await page.waitForFunction(async () => !!await (await caches.open('nexus-shell-v2')).match('/'));
  const cdp = await context.newCDPSession(page); await cdp.send('Page.enable');
  const install = await cdp.send('Page.getInstallabilityErrors'); assert.deepEqual(install.installabilityErrors, []);
  const state = await page.evaluate(async () => {
    const cache = await caches.open('nexus-shell-v2'); const urls = (await cache.keys()).map(r => r.url);
    return { urls, html: !!await cache.match('/'), registration: (await navigator.serviceWorker.getRegistration('/')).scope };
  });
  assert.ok(state.html, JSON.stringify(state)); assert.ok(state.urls.some(url => url.includes('/_next/static/') && url.endsWith('.js'))); assert.ok(state.urls.some(url => url.includes('/_next/static/') && url.endsWith('.css')));
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('pwa-preservation'); r.onupgradeneeded = () => r.result.createObjectStore('sentinel'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    await new Promise((resolve, reject) => { const tx = db.transaction('sentinel', 'readwrite'); tx.objectStore('sentinel').put('UNCHANGED', 'pending'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); db.close();
  });
  fs.mkdirSync('test-results/pwa', { recursive: true });
  await page.screenshot({ path: 'test-results/pwa/online.png', fullPage: true });
  const offlineAssets = [];
  disconnected = true;
  await context.setOffline(true); await page.close(); page = await context.newPage();
  page.on('response', r => { if (r.url().includes('/_next/static/')) offlineAssets.push({ url: r.url(), status: r.status(), worker: r.fromServiceWorker() }); });
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.body.innerText.includes('Nexus'));
  if (authenticated) await page.locator('main').waitFor();
  assert.ok(offlineAssets.length > 0); assert.ok(offlineAssets.every(r => r.status === 200 && r.worker));
  assert.ok(!failed.some(url => url.includes('/_next/static/')), 'no missing scripts or styles after cold offline navigation');
  await page.screenshot({ path: 'test-results/pwa/offline.png', fullPage: true });
  await page.evaluate(async () => { window.pwaPendingInput = 'DO_NOT_RELOAD'; await (await caches.open('nexus-shell-v2')).delete('/'); });
  disconnected = false;
  await context.setOffline(false);
  await page.waitForFunction(async () => !!await (await caches.open('nexus-shell-v2')).match('/'));
  assert.equal(await page.evaluate(() => window.pwaPendingInput), 'DO_NOT_RELOAD', 'online refresh does not force a page reload');
  assert.equal(await page.evaluate(() => new Promise(resolve => { const r = indexedDB.open('pwa-preservation'); r.onsuccess = () => { const db = r.result, tx = db.transaction('sentinel'), q = tx.objectStore('sentinel').get('pending'); q.onsuccess = () => resolve(q.result); tx.oncomplete = () => db.close(); }; })), 'UNCHANGED');
  assert.deepEqual(errors, []);
  assert.ok(privateResponses.every(fromWorker => !fromWorker), 'Supabase responses never come from shell worker');
  fs.writeFileSync('test-results/pwa/production.json', JSON.stringify({ manifest, installabilityErrors: install.installabilityErrors, cache: state, offlineAssets, pageErrors: errors, authenticatedFixture: authenticated, authRequestCount: authRequests.length }, null, 2));
  console.log('PWA_PRODUCTION_VERIFIED', JSON.stringify({ installabilityErrors: install.installabilityErrors, offlineAssets: offlineAssets.length, indexedDB: 'UNCHANGED' }));
});
