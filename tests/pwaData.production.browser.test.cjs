const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { build } = require('esbuild');
const { chromium } = require('playwright');
const { waitForAsync, setNetwork } = require('./pwaBrowser.cjs');

// Production client + real IndexedDB/Repository/SyncEngine; isolated HTTP contract
// double only. PostgreSQL event/conflict rules are covered by studySync tests.
test('PWA stage 2: account data, offline edits/review/PDF, reconnect, conflicts and isolation', { timeout: 180000 }, async t => {
  const origin = process.env.NEXUS_PWA_URL || 'http://127.0.0.1:32131';
  const A = '00000000-0000-4000-8000-000000000121', B = '00000000-0000-4000-8000-000000000122';
  const session = owner => {
    const user = { id: owner, email: owner === A ? 'a@example.invalid' : 'b@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const access_token = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: owner, exp, iat: exp - 3600, aud: 'authenticated', role: 'authenticated' })).toString('base64url') + '.' + Buffer.from('synthetic-signature').toString('base64url');
    return { user, access_token, refresh_token: 'fixture-refresh', expires_at: exp, expires_in: 3600, token_type: 'bearer' };
  };
  const bundled = await build({ entryPoints: ['tests/fixtures/pwaData.js'], bundle: true, write: false, format: 'esm', target: 'es2022' });
  const helper = bundled.outputFiles[0].text;
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || undefined }); t.after(() => browser.close());
  const context = await browser.newContext({ locale: 'en-US' });
  await context.routeWebSocket('wss://pwa-fixture.supabase.co/**', socket => socket.close());
  let offline = false, hold = false, releaseHold;
  const held = new Promise(resolve => { releaseHold = resolve; }); t.after(() => releaseHold());
  const calls = [], offlineCalls = [], sockets = [], studyReceipts = new Map(), receipts = new Map();
  const rows = { pages: new Map(), attachments: new Map(), binaries: new Map(), workspace_tombstones: new Map() };
  context.on('page', p => p.on('websocket', socket => { if (offline) sockets.push(socket.url()); }));
  await context.addInitScript(({ origin, initial }) => { if (location.origin !== origin || localStorage.getItem('pwa-seeded-session')) return; localStorage.setItem('pwa-seeded-session', '1'); localStorage.setItem('sb-pwa-fixture-auth-token', JSON.stringify(initial)); }, { origin, initial: session(A) });
  await context.route('https://pwa-fixture.supabase.co/**', async route => {
    const request = route.request(), url = new URL(request.url()), name = url.pathname.split('/').at(-1);
    if (offline) { offlineCalls.push(name); await route.abort('internetdisconnected'); return; }
    calls.push(name);
    const token = request.headers().authorization?.split(' ')[1];
    let owner = A; try { owner = JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).sub; } catch {}
    const respond = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Content-Range': '0-0/0' }, body: JSON.stringify(data) });
    if (url.pathname.includes('/auth/')) return respond(name === 'user' ? session(owner).user : {});
    if (url.pathname.includes('/rpc/')) {
      const body = request.postDataJSON();
      if (name === 'apply_workspace_operations') {
        const next = structuredClone(rows), nextReceipts = structuredClone(receipts), results = [];
        for (const op of body.operations) {
          const row = next[op.entity_type].get(op.entity_id);
          if (!nextReceipts.has(op.id) && ((row?.revision ?? 0) !== op.expected_revision || (row && row.owner_id !== owner))) return respond({ code: '40001', message: 'Workspace revision conflict' }, 409);
          if (nextReceipts.has(op.id)) { results.push(nextReceipts.get(op.id)); continue; }
          let saved = op.kind === 'save' ? { ...op.value, owner_id: owner } : { ...row };
          delete saved.workspace_owner_id; saved.revision = (row?.revision ?? 0) + 1;
          if (op.kind === 'binary') next.binaries.set(op.entity_id, { id: op.entity_id, owner_id: owner, data: op.data });
          if (op.kind === 'soft_delete') saved.deleted_at = Date.now();
          next[op.entity_type].set(op.entity_id, saved);
          const result = { entity_type: op.entity_type, entity_id: op.entity_id, revision: saved.revision, deleted_at: saved.deleted_at ?? null, hard_deleted: false, row: saved };
          nextReceipts.set(op.id, result); results.push(result);
        }
        for (const key of Object.keys(rows)) rows[key] = next[key]; receipts.clear(); for (const [k, v] of nextReceipts) receipts.set(k, v);
        return respond(results);
      }
      if (name === 'apply_study_operation') { studyReceipts.set(body.operation.id, body.operation); return respond(true); }
      return respond(name === 'is_dictionary_admin' ? false : []);
    }
    if (hold && name === 'workspace_tombstones') await held;
    let data = [...(rows[name]?.values() || [])].filter(row => row.owner_id === owner);
    for (const [key, value] of url.searchParams) {
      if (value.startsWith('eq.')) data = data.filter(row => String(row[key]) === value.slice(3));
      if (value.startsWith('gt.')) data = data.filter(row => String(row[key]) > value.slice(3));
    }
    data.sort((a, b) => (String(a.id) < String(b.id) ? -1 : String(a.id) === String(b.id) ? 0 : 1));
    const columns = url.searchParams.get('select');
    if (columns && columns !== '*') data = data.map(row => Object.fromEntries(columns.split(',').map(k => [k, row[k]])));
    return respond(data);
  });
  const newPage = async () => { const p = await context.newPage(); await setNetwork(p, offline); return p; };
  let page = await newPage(); page.setDefaultTimeout(10000);
  const errors = []; context.on('page', p => p.on('pageerror', e => errors.push(e.message))); page.on('pageerror', e => errors.push(e.message));
  const inject = async () => { await page.addScriptTag({ type: 'module', content: helper }); await waitForAsync(page, () => !!window.pwaData); };
  const home = async () => { await inject(); await page.evaluate(() => window.pwaData.home()); await page.goto(origin); await page.locator('main').waitFor(); await inject(); };
  const switchAccount = async owner => {
    const tab = await newPage(); await tab.goto(origin, { waitUntil: 'domcontentloaded' });
    await tab.addScriptTag({ type: 'module', content: helper });
    await waitForAsync(tab, () => !!window.pwaData);
    const result = await tab.evaluate(value => window.pwaData.auth(value), owner ? session(owner) : null);
    if (owner || !offline) assert.equal(result.error, null);
    await tab.waitForTimeout(100);
    await tab.close();
  };
  await page.goto(origin); await page.locator('main').waitFor(); await inject();
  // Minimal valid PDF; bytes are intentionally local and contain no user data.
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>', '<< /Length 0 >>\nstream\n\nendstream'];
  let pdf = '%PDF-1.4\n', offsets = [0]; objects.forEach((obj, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; }); const xref = Buffer.byteLength(pdf); pdf += `xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const ids = await page.evaluate(async ({ A, pdf }) => window.pwaData.seed(A, pdf), { A, pdf });
  await waitForAsync(page, async A => { const p = await window.pwaData.pending(A); return !p.workspace.length && !p.study.length; }, A);
  await waitForAsync(page, async () => !!await (await caches.open('nexus-shell-v2')).match('/'));
  await home();
  offline = true; await context.setOffline(true); await setNetwork(page, true); await page.close(); page = await newPage(); page.setDefaultTimeout(10000);
  await page.goto(origin); await page.locator('main').waitFor(); await inject();
  await page.locator('main').getByText('PWA Note', { exact: true }).first().click();
  const editor = page.locator('.ProseMirror').first(); await editor.waitFor(); assert.match(await editor.innerText(), /original body/);
  await editor.click(); await page.keyboard.press('ControlOrMeta+End'); await page.keyboard.type(' OFFLINE_EDIT');
  await waitForAsync(page, async ({ A, id }) => (await window.pwaData.read(A, id)).content_text.includes('OFFLINE_EDIT'), { A, id: ids.note });
  await page.evaluate(async ({ A, id }) => window.pwaData.edit(A, id, 'LOCAL_CONFLICT_EDIT'), { A, id: ids.conflict });
  await page.close(); page = await newPage(); await page.goto(origin); await page.locator('main').waitFor(); await inject();
  assert.match((await page.evaluate(({ A, id }) => window.pwaData.read(A, id), { A, id: ids.note })).content_text, /OFFLINE_EDIT/);
  await home(); await page.locator('main').getByText('PWA Character', { exact: true }).first().click(); await page.getByText('CREATIVE_BODY', { exact: true }).first().waitFor();
  await home(); await page.locator('main').getByText('PWA World', { exact: true }).first().click(); await page.getByRole('button', { name: 'Manage maps', exact: true }).first().waitFor(); assert.equal((await page.evaluate(({ A, id }) => window.pwaData.read(A, id), { A, id: ids.world })).character_data.sections[0].richText, 'WORLD_BODY');
  await home(); await page.locator('main').getByText('PWA Cached PDF', { exact: true }).first().click();
  await waitForAsync(page, () => !!document.querySelector('iframe[src^="blob:"], embed[src^="blob:"], object[data^="blob:"]'));
  const localPDF = await page.evaluate(async () => { const el = document.querySelector('iframe[src^="blob:"], embed[src^="blob:"], object[data^="blob:"]'); return (await (await fetch(el.src || el.data)).text()).slice(0, 8); }); assert.equal(localPDF, '%PDF-1.4');
  await home(); await page.locator('main').getByText('PWA Missing PDF', { exact: true }).first().click(); await page.getByText(/not found|unavailable|無法|找不到/i).first().waitFor();
  await home(); await page.locator('main').getByText('PWA Study', { exact: true }).first().click(); await page.getByRole('button', { name: /Start learning|開始學習/i, exact: true }).click();
  assert.equal(await page.evaluate(()=>navigator.onLine),false); await page.getByRole('button', { name: /Show answer|顯示答案/i, exact: true }).click(); await page.getByRole('button', { name: /Easy|熟記/ }).first().click();
  await waitForAsync(page, async ({ A, id }) => (await window.pwaData.study(A, id)).events.some(e => e.kind === 'review'), { A, id: ids.deck });
  const learned = await page.evaluate(({ A, id }) => window.pwaData.study(A, id), { A, id: ids.deck });
  const review = learned.events.find(e => e.kind === 'review'); assert.equal(review.scheduling_method, 'fsrs'); assert.ok(review.log); assert.ok(learned.states[0].fsrs);
  await page.close(); page = await newPage(); await page.goto(origin); await page.locator('main').waitFor(); await inject();
  assert.equal((await page.evaluate(({ A, id }) => window.pwaData.study(A, id), { A, id: ids.deck })).events.filter(e => e.kind === 'review').length, 1);
  assert.deepEqual(offlineCalls.filter(name => /apply_workspace|apply_study|pull_study/.test(name)), []);
  assert.deepEqual(sockets, [], 'offline cold launch never opens Realtime');
  rows.pages.set(ids.conflict, { ...rows.pages.get(ids.conflict), revision: rows.pages.get(ids.conflict).revision + 1, content_text: 'OTHER_DEVICE_EDIT' });
  offline = false; await context.setOffline(false); await setNetwork(page, false);
  await waitForAsync(page, async ({ A, id }) => !(await window.pwaData.pending(A)).workspace.some(batch => batch.operations.some(op => op.entity_id === id)), { A, id: ids.note });
  await waitForAsync(page, async A => !(await window.pwaData.pending(A)).study.length, A);
  assert.match(rows.pages.get(ids.note).content_text, /OFFLINE_EDIT/);
  assert.equal(rows.pages.get(ids.conflict).content_text, 'OTHER_DEVICE_EDIT');
  const queued = await page.evaluate(A => window.pwaData.pending(A), A); assert.ok(queued.workspace.some(batch => batch.error?.includes('conflict')));
  assert.equal((await page.evaluate(({ A, id }) => window.pwaData.read(A, id), { A, id: ids.conflict })).content_text, 'LOCAL_CONFLICT_EDIT');
  assert.equal([...studyReceipts.values()].filter(op => op.kind === 'event' && op.value.kind === 'review').length, 1);
  await page.evaluate(B => window.pwaData.seedOther(B), B);
  await switchAccount(B); await waitForAsync(page, () => !/PWA Study|offline word|offline answer/.test(document.querySelector('main')?.innerText || ''));
  offline = true; await context.setOffline(true); await setNetwork(page, true); await home(); await page.locator('main').getByText('ACCOUNT B PRIVATE', { exact: true }).first().waitFor();
  assert.ok(!/PWA Note|PWA Character|PWA World/.test(await page.locator('main').innerText()));
  await switchAccount(null); await page.getByText(/Sign in to Nexus|登入 Nexus/).waitFor(); assert.equal(await page.locator('main').count(), 0);
  offline = false; await context.setOffline(false); await setNetwork(page, false);
  await switchAccount(A); await page.locator('main').waitFor(); await inject(); assert.match((await page.evaluate(({ A, id }) => window.pwaData.read(A, id), { A, id: ids.note })).content_text, /OFFLINE_EDIT/);
  // An in-flight initial pull cannot postpone sign-out or restore account A data.
  offline = false; await context.setOffline(false); await setNetwork(page, false); hold = true;
  await home(); await switchAccount(null); await page.getByText(/Sign in to Nexus|登入 Nexus/).waitFor();
  releaseHold(); await page.waitForTimeout(100); assert.equal(await page.locator('main').count(), 0);
  assert.deepEqual(errors, []);
  fs.mkdirSync('test-results/pwa-stage2', { recursive: true });
  fs.writeFileSync('test-results/pwa-stage2/result.json', JSON.stringify({ offlineEdit: true, fsrsEvent: review.id, pdf: true, accountIsolation: true, conflictPreserved: true, cloudRequests: calls.length, pageErrors: errors }, null, 2));
  console.log('PWA_STAGE2_VERIFIED', JSON.stringify({ offlineEdit: true, fsrs: true, pdf: true, isolation: true, conflict: true, pageErrors: errors.length }));
});
