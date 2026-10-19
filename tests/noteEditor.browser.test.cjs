const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {build}=require('esbuild'),{chromium}=require('playwright');
test('freeform legacy note, per-note width and math edit/delete/undo preserve source',{timeout:90000},async t=>{
 const bundle=await build({entryPoints:['tests/fixtures/noteEditor.jsx'],outfile:'fixture.js',bundle:true,format:'esm',jsx:'automatic',write:false,loader:{'.woff2':'dataurl','.woff':'dataurl','.ttf':'dataurl'}});
 const css=(await require('postcss')([require('@tailwindcss/postcss')({base:process.cwd()})]).process(fs.readFileSync('src/app/globals.css','utf8'),{from:path.resolve('src/app/globals.css')})).css;
 const server=http.createServer((req,res)=>{res.setHeader('content-type','text/html');if(req.url==='/fixture.js'){res.setHeader('content-type','text/javascript');res.end(bundle.outputFiles.find(f=>f.path.endsWith('.js')).text);}else if(req.url==='/fixture.css'){res.setHeader('content-type','text/css');res.end(css+'\n'+bundle.outputFiles.find(f=>f.path.endsWith('.css')).text);}else res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script type="module" src="/fixture.js"></script>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium'});t.after(()=>browser.close());
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);t.diagnostic(e.message);});
  page.setDefaultTimeout(5000);page.on('console',m=>{if(m.type()==='error')t.diagnostic(m.text());});
  await page.goto('http://127.0.0.1:'+server.address().port);const editor=page.locator('.ProseMirror');
  try { await editor.waitFor({timeout:5000}); } catch(e) { t.diagnostic((await page.content()).slice(-2500)); throw e; }
  assert.equal(await editor.count(),1);assert.equal(await page.locator('[data-page]').count(),0);
  assert.match(await editor.innerText(),/Before[\s\S]*After/);assert.equal(await editor.locator('[data-type="page-break"]').count(),1);
  assert.equal(await page.evaluate(()=>window.currentNote.format),'paged');
  await page.getByRole('button',{name:/^⋯/}).last().click();await page.getByRole('switch',{name:'全寬'}).click();
  assert.equal(await page.locator('[data-note-width]').getAttribute('data-note-width'),'full');await page.keyboard.press('Escape');
  await editor.click();await page.keyboard.press('Control+End');await page.keyboard.insertText(' 中文 English');await page.keyboard.press('Space');await page.keyboard.insertText('tail');
  assert.match(await editor.innerText(),/中文 English tail$/);
  assert.equal(await page.evaluate(()=>window.currentNote.content_json.noteAppearance.fullWidth),true);
  assert.deepEqual(await page.evaluate(()=>window.currentNote.content_json.legacyMarker),{keep:true});
  assert.equal(await page.evaluate(()=>window.currentNote.content_json.content.filter(n=>n.type==='pageBreak').length),1);
  await page.evaluate(()=>window.loadNote('other'));await page.locator('[data-workspace-pane="other"]').waitFor();await editor.waitFor();assert.equal(await page.locator('[data-note-width]').getAttribute('data-note-width'),'reading');
  await editor.click();await page.keyboard.type('$x+1$');await editor.locator('.nexus-math-inline .katex').waitFor();
  await editor.locator('.math-preview').click();const input=editor.locator('input.math-edit-input');await input.fill('x+2');await input.press('Enter');
  await page.waitForFunction(()=>window.currentNote.content_json.content[0].content?.some(n=>n.type==='inlineMath'&&n.attrs.latex==='x+2'));
  await editor.locator('.math-preview').click();await input.fill('');await input.press('Enter');assert.equal(await editor.locator('.nexus-math-inline').count(),0);
  await page.keyboard.press('Control+z');await editor.locator('.nexus-math-inline').waitFor();
  await page.evaluate(()=>window.loadNote('fresh'));await page.locator('[data-workspace-pane="fresh"]').waitFor();await editor.click();await page.keyboard.type('\\$escaped$');assert.equal(await editor.locator('.nexus-math-inline').count(),0);
  await page.keyboard.press('Control+a');await page.keyboard.type('$$x^2$$');await editor.locator('.nexus-math-block').waitFor();await page.locator('input[type=text]').first().click();
  await editor.locator('.math-preview').click();const source=editor.locator('textarea');await source.fill('x^3');await source.press('Backspace');assert.equal(await editor.locator('.nexus-math-block').count(),1);
  await source.fill('');await source.press('Control+Enter');assert.equal(await editor.locator('.nexus-math-block').count(),0);
  assert.deepEqual(errors,[]);await page.close();
 }
});
