const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http');
const { build } = require('esbuild'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
test('learning home: actual IDB and study session, responsive layout, preview quota, account preferences, offline use and retained classic home', { timeout: 120000 }, async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-learning-home-'));
  await build({ entryPoints: ['tests/fixtures/learningHome.jsx'], outfile: path.join(tmp, 'fixture.js'), format: 'esm', bundle: true, jsx: 'automatic', define: { 'process.env': JSON.stringify({ NODE_ENV: 'development' }) }, plugins: [{ name: 'isolated', setup(b) {
    b.onLoad({ filter: /infrastructure[\\/]supabase[\\/]client\.ts$/ }, () => ({ contents: 'export const getSupabase=()=>null;export const isSupabaseConfigured=()=>false;', loader: 'js' }));
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `import React from ${JSON.stringify(path.join(root, 'node_modules/react/index.js'))};export default function Link(p){return React.createElement('a',p)}`, loader: 'js', resolveDir: root }));
  } }] });
  const css = (await require('postcss')([require('@tailwindcss/postcss')({ base: root })]).process(fs.readFileSync('src/app/globals.css', 'utf8'), { from: path.join(root, 'src/app/globals.css') })).css;
  const server = http.createServer((req, res) => { if (req.url === '/fixture.js') { res.setHeader('content-type', 'application/javascript'); res.end(fs.readFileSync(path.join(tmp, 'fixture.js'))); } else if (req.url === '/fixture.css') res.end(css); else res.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script type="module" src="/fixture.js"></script></html>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox'] }), errors = [];
  try {
    for (const width of [1280, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, isMobile: width < 500, hasTouch: width < 900 }), page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message)); await page.goto('http://127.0.0.1:' + server.address().port);
      const mode = () => page.getByLabel('切換首頁', { exact: true });
      await mode().waitFor(); assert.equal(await mode().inputValue(), 'classic');
      await page.getByLabel('搜尋項目', { exact: true }).waitFor();
      const choose=async title=>{await page.getByRole('button',{name:'切換學習組',exact:true}).click();await page.getByRole('dialog').getByRole('radio',{name:title,exact:true}).check();await page.getByRole('dialog').getByRole('button',{name:'關閉',exact:true}).click();};
      await mode().selectOption('learning');await choose('English words');await page.getByText('新卡 1｜學習中 0｜待複習 0',{exact:true}).waitFor();
      assert.equal(await page.evaluate(async()=>{const pages=await window.homeStorage.listPages();return(await window.homeStorage.getStudyRepository().readDeck(pages.find(p=>p.title==='English words').id,true)).events.length;}),0);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.getByRole('button',{name:'日曆與待辦',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Task 3',exact:true}).waitFor();await page.keyboard.press('Escape');
      await page.reload();assert.equal(await mode().inputValue(),'learning');await page.getByText('新卡 1｜學習中 0｜待複習 0',{exact:true}).waitFor();
      await context.setOffline(true);await page.getByRole('button',{name:'開始學習',exact:true}).click();await page.getByRole('button',{name:'顯示答案',exact:true}).waitFor();
      const session=await page.evaluate(async()=>{const pages=await window.homeStorage.listPages();return window.homeStorage.getStudyRepository().readDeck(pages.find(p=>p.title==='English words').id,true);});
      assert.equal(session.sessions.length,1);assert.equal(session.events.filter(e=>e.kind==='introduce').length,1);
      await page.getByRole('button',{name:'Nexus Home',exact:true}).click();await choose('Other words');
      await page.getByRole('button',{name:'切換學習組',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'管理 Other words',exact:true}).click();await page.getByRole('table',{name:'單字列表',exact:true}).waitFor();
      await page.getByRole('button',{name:'Nexus Home',exact:true}).click();await choose('English words');await page.getByRole('button',{name:'開始學習',exact:true}).click();await page.getByRole('button',{name:'顯示答案',exact:true}).waitFor();
      const resumed=await page.evaluate(async()=>{const pages=await window.homeStorage.listPages();return window.homeStorage.getStudyRepository().readDeck(pages.find(p=>p.title==='English words').id,true);});
      assert.equal(resumed.sessions[0].id,session.sessions[0].id);assert.equal(resumed.events.filter(e=>e.kind==='introduce').length,1);
      await page.getByRole('button',{name:'Nexus Home',exact:true}).click();
      await page.evaluate(()=>window.switchOwner('home-account-b'));await page.waitForFunction(()=>window.homeStorage.getWorkspaceOwner()==='home-account-b');assert.equal(await mode().inputValue(),'classic');
      await page.evaluate(()=>window.switchOwner('home-account-a'));await page.waitForFunction(()=>window.homeStorage.getWorkspaceOwner()==='home-account-a');assert.equal(await mode().inputValue(),'learning');
      if(width===320){
        await choose('Empty set');await page.getByText('學習組尚無字卡，請進入管理字卡新增。',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'開始學習',exact:true}).isDisabled(),true);
        await page.evaluate(()=>window.failHomeRead());await page.getByRole('alert').waitFor();await mode().selectOption('classic');await page.getByLabel('搜尋項目',{exact:true}).waitFor();await page.evaluate(()=>window.restoreHomeRead());
        await page.evaluate(()=>window.switchOwner('home-account-c'));await page.waitForFunction(()=>window.homeStorage.getWorkspaceOwner()==='home-account-c');await mode().selectOption('learning');
        await page.getByRole('button',{name:'切換學習組',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'新增學習組'}).click();assert.equal(await page.evaluate(()=>window.studySetsOpened),true);await page.keyboard.press('Escape');
        await mode().selectOption('classic');await page.evaluate(()=>{Storage.prototype.setItem=function(key){if(key.startsWith('nexus-home:'))throw Error('blocked');};});await mode().selectOption('learning');await page.getByRole('status').waitFor();
      }
      await context.setOffline(false); await context.close();
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); fs.rmSync(tmp, { recursive: true, force: true }); }
});
