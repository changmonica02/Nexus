const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { build } = require('esbuild');
const { chromium } = require('playwright');

test('real browser IndexedDB: two tabs download once, unchanged syncs zero, update/offline/account isolation', { timeout: 60000 }, async t => {
  const bundle = await build({ entryPoints: ['tests/fixtures/attachmentSync.js'], bundle: true, format: 'esm', write: false });
  let revision = 1, content = '%PDF synthetic first', downloads = 0, bytes = 0, deleted = false;
  const server = http.createServer(async (req, res) => {
    if (req.url === '/fixture.js') { res.setHeader('content-type', 'text/javascript'); res.end(bundle.outputFiles[0].text); return; }
    if (req.url !== '/query') { res.end('<script type="module" src="/fixture.js"></script>'); return; }
    let body = ''; for await (const chunk of req) body += chunk;
    const q = JSON.parse(body);
    const row = q.table === 'attachments' ? { id: 'pdf', owner_id: 'browser-owner', name: 'PDF', mime_type: 'application/pdf', revision, deleted_at: deleted ? 1 : null }
      : q.table === 'binaries' ? { id: 'pdf', owner_id: 'browser-owner', data: Buffer.from(content).toString('base64') } : null;
    let data = row && q.filters.every(([key, value]) => row[key] === value) && (!q.cursor || row.id > q.cursor[1]) ? [row] : [];
    if (q.table === 'binaries' && q.columns.includes('data') && data.length) {
      downloads++; bytes += Buffer.byteLength(row.data);
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    if (q.columns !== '*') data = data.map(row => Object.fromEntries(q.columns.split(',').map(key => [key, row[key]])));
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ data, error: null }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || '/usr/bin/chromium', headless: true });
  try {
    const context = await browser.newContext();
    const a = await context.newPage(), b = await context.newPage();
    const url = `http://127.0.0.1:${server.address().port}`;
    await Promise.all([a.goto(url), b.goto(url)]);
    await Promise.all([a.waitForFunction(() => window.ready), b.waitForFunction(() => window.ready)]);
    await Promise.all([a.evaluate(() => window.sync()), b.evaluate(() => window.sync())]);
    assert.equal(downloads, 1); assert.equal(await b.evaluate(() => window.read()), content);
    const initialBytes = bytes;
    for (let i = 0; i < 5; i++) await Promise.all([a.evaluate(() => window.sync()), b.evaluate(() => window.sync())]);
    assert.equal(downloads, 1); assert.equal(bytes, initialBytes);
    content = '%PDF updated'; revision++;
    await Promise.all([a.evaluate(() => window.sync()), b.evaluate(() => window.sync())]);
    assert.equal(downloads, 2); assert.equal(await a.evaluate(() => window.read()), content);
    await context.setOffline(true); await a.evaluate(() => window.sync());
    assert.equal(await a.evaluate(() => window.read()), content);
    await a.evaluate(() => window.owner('other')); assert.equal(await a.evaluate(() => window.read()), null);
    await a.evaluate(() => window.owner(null)); assert.equal(await a.evaluate(() => window.read()), null);
    await a.evaluate(() => window.owner('browser-owner'));
    await context.setOffline(false); await a.evaluate(() => window.sync()); assert.equal(downloads, 2);
    deleted = true; revision++; await b.evaluate(() => window.sync());
    assert.equal(await a.evaluate(() => window.read()), null); assert.equal(downloads, 2);
    await context.close();
  } finally { await browser.close(); }
});
