const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {build}=require('esbuild'),{chromium}=require('playwright');
test('freeform legacy note, per-note width and math edit/delete/undo preserve source',{timeout:90000},async t=>{
 const bundle=await build({entryPoints:['tests/fixtures/noteEditor.jsx'],outfile:'fixture.js',bundle:true,format:'esm',jsx:'automatic',write:false,loader:{'.woff2':'dataurl','.woff':'dataurl','.ttf':'dataurl'}});
 const css=(await require('postcss')([require('@tailwindcss/postcss')({base:process.cwd()})]).process(fs.readFileSync('src/app/globals.css','utf8'),{from:path.resolve('src/app/globals.css')})).css;
 const server=http.createServer((req,res)=>{res.setHeader('content-type','text/html');if(req.url==='/fixture.js'){res.setHeader('content-type','text/javascript');res.end(bundle.outputFiles.find(f=>f.path.endsWith('.js')).text);}else if(req.url==='/fixture.css'){res.setHeader('content-type','text/css');res.end(css+'\n'+bundle.outputFiles.find(f=>f.path.endsWith('.css')).text);}else res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script type="module" src="/fixture.js"></script>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined});t.after(()=>browser.close());
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
  if(width===1440){
   await page.evaluate(()=>window.loadNote('dragcreate'));await page.locator('[data-workspace-pane="dragcreate"]').waitFor();
   await editor.click();await page.keyboard.type('Left drag');await page.keyboard.press('Enter');await page.keyboard.type('Right drag');
   const moving=editor.locator('p').filter({hasText:'Right drag'});await moving.hover();
   const sideHandle=await page.locator('.nexus-drag-handle').boundingBox(),heading=await editor.locator('p').filter({hasText:'Left drag'}).boundingBox();
   await page.mouse.move(sideHandle.x+sideHandle.width/2,sideHandle.y+sideHandle.height/2);await page.mouse.down();
   await page.mouse.move(heading.x+heading.width*0.8,heading.y+heading.height/2,{steps:12});await page.mouse.up();
   await page.waitForFunction(()=>window.currentNote.content_json.content.some(n=>n.type==='multiColumn'));
   const created=await page.evaluate(()=>window.currentNote.content_json.content.find(n=>n.type==='multiColumn'));
   assert.deepEqual(created.content.map(c=>c.content.map(n=>n.content?.map(t=>t.text).join(''))),[['Left drag'],['Right drag']]);
   await page.keyboard.press('Control+z');await page.waitForFunction(()=>window.currentNote.content_json.content.every(n=>n.type!=='multiColumn'));
   assert.match(await editor.innerText(),/Left drag[\s\S]*Right drag/);
   await page.evaluate(()=>window.loadNote('dragcreate-reverse'));await page.locator('[data-workspace-pane="dragcreate-reverse"]').waitFor();
   await editor.click();await page.keyboard.type('First drag');await page.keyboard.press('Enter');await page.keyboard.type('Second drag');
   await editor.locator('p').filter({hasText:'First drag'}).hover();
   const firstHandle=await page.locator('.nexus-drag-handle').boundingBox(),second=await editor.locator('p').filter({hasText:'Second drag'}).boundingBox();
   await page.mouse.move(firstHandle.x+firstHandle.width/2,firstHandle.y+firstHandle.height/2);await page.mouse.down();
   await page.mouse.move(second.x+second.width*0.8,second.y+second.height/2,{steps:12});await page.mouse.up();
   await page.waitForFunction(()=>window.currentNote.content_json.content.some(n=>n.type==='multiColumn'));
   assert.deepEqual(await page.evaluate(()=>window.currentNote.content_json.content.find(n=>n.type==='multiColumn').content.map(c=>c.content.map(n=>n.content?.map(t=>t.text).join('')))),[['Second drag'],['First drag']]);
   await page.keyboard.press('Control+z');await page.waitForFunction(()=>window.currentNote.content_json.content.every(n=>n.type!=='multiColumn'));
  }
  await page.evaluate(()=>window.loadNote('columns'));await page.locator('[data-workspace-pane="columns"]').waitFor();
  await editor.click();await page.keyboard.type('Left content /');
  const slash=page.getByRole('menu',{name:'斜線指令'});await slash.waitFor();await slash.getByRole('menuitem',{name:'建立雙欄'}).click();
  const group=editor.locator('[data-type="multiColumn"]');await group.waitFor();
  assert.match(await group.locator('[data-type="column"]').first().innerText(),/Left content/);
  assert.equal(await group.locator('[data-type="column"]').count(),2);
  await group.locator('[data-type="column"]').nth(1).click();await page.keyboard.type('Right content');
  const divider=group.getByRole('separator',{name:'調整雙欄寬度'});
  const bounds=await divider.boundingBox();await page.mouse.move(bounds.x+4,bounds.y+Math.max(4,bounds.height/2));
  await page.mouse.down();await page.mouse.move(bounds.x+65,bounds.y+Math.max(4,bounds.height/2),{steps:4});await page.mouse.up();
  assert.deepEqual(await page.evaluate(()=>window.currentNote.content_json.content.find(n=>n.type==='multiColumn').content.map(c=>c.content.map(b=>b.content?.map(t=>t.text).join('')||''))),[['Left content '],['Right content']]);
  if(width===1440){
   await group.locator('[data-type="column"]').nth(1).locator('p').hover();
   const handle=await page.locator('.nexus-drag-handle').boundingBox(),target=await group.locator('[data-type="column"]').first().locator('p').boundingBox();
   await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();
   await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:12});await page.mouse.up();
   await page.waitForFunction(()=>window.currentNote.content_json.content.find(n=>n.type==='multiColumn')?.content[0].content.some(n=>n.content?.some(t=>t.text==='Right content')));
   assert.equal((await group.locator('[data-type="column"]').nth(1).innerText()).trim(),'');
   await page.keyboard.press('Control+z');
   await page.waitForFunction(()=>window.currentNote.content_json.content.find(n=>n.type==='multiColumn')?.content[1].content.some(n=>n.content?.some(t=>t.text==='Right content')));
  }
  if(width===1440){await editor.locator('p').first().hover();await page.locator('.nexus-drag-handle').click();const menu=page.getByRole('menu',{name:'區塊操作'});await menu.getByRole('menuitem',{name:'建立副本'}).click();assert.equal(await group.locator('[data-type=column]').first().locator('p').count(),2);await page.keyboard.press('Control+z');assert.equal(await group.locator('[data-type=column]').first().locator('p').count(),1);}
  if(width===1440){
   await group.locator('[data-type="column"]').nth(1).locator('p').hover();await page.locator('.nexus-drag-handle').click();
   await page.getByRole('menu',{name:'區塊操作'}).getByRole('menuitem',{name:'移至左欄'}).click();
   assert.match(await group.locator('[data-type="column"]').first().innerText(),/Right content/);
   assert.equal((await group.locator('[data-type="column"]').nth(1).innerText()).trim(),'');
   await group.locator('[data-type="column"]').first().locator('p').last().hover();await page.locator('.nexus-drag-handle').click();
   await page.getByRole('menu',{name:'區塊操作'}).getByRole('menuitem',{name:'移出雙欄'}).click();
   assert.match(await editor.locator(':scope > p').allInnerTexts().then(a=>a.join(' ')),/Right content/);
   await editor.locator(':scope > p').filter({hasText:'Right content'}).hover();
   const outerHandle=await page.locator('.nexus-drag-handle').boundingBox(),emptyColumn=await group.locator('[data-type="column"]').nth(1).boundingBox();
   await page.mouse.move(outerHandle.x+outerHandle.width/2,outerHandle.y+outerHandle.height/2);await page.mouse.down();
   await page.mouse.move(emptyColumn.x+emptyColumn.width/2,emptyColumn.y+Math.min(16,emptyColumn.height/2),{steps:12});await page.mouse.up();
   await page.waitForFunction(()=>window.currentNote.content_json.content.find(n=>n.type==='multiColumn')?.content[1].content.some(n=>n.content?.some(t=>t.text==='Right content')));
   assert.equal((await editor.locator(':scope > p').allInnerTexts()).some(text=>text.includes('Right content')),false);
   await page.keyboard.press('Control+z');
   await page.waitForFunction(()=>window.currentNote.content_json.content.some(n=>n.type==='paragraph'&&n.content?.some(t=>t.text==='Right content')));
  }
  const beforeExport=await page.evaluate(()=>JSON.stringify(window.currentNote.content_json));
  await page.getByTitle('檔案選單').click();await page.getByRole('button',{name:/匯出為 PDF/}).click();
  const preview=page.getByRole('dialog',{name:'筆記匯出預覽'});await preview.waitFor();
  assert.match(await preview.innerText(),/Left content/);assert.match(await preview.innerText(),/Right content/);
  await preview.getByLabel('紙張方向').selectOption('landscape');await preview.getByLabel('頁面邊界').selectOption('20');
  await preview.getByLabel('匯出頁首').fill('Preview header');await preview.getByLabel('匯出頁尾').fill('Preview footer');
  assert.match(await preview.locator('.nexus-export-header').first().innerText(),/Preview header/);
  assert.match(await preview.locator('.nexus-export-footer').first().innerText(),/Preview footer/);
  assert.equal(await preview.locator('.nexus-export-paper').first().getAttribute('style').then(s=>s.includes('297mm')),true);
  if(width===1440){const pdf=await page.pdf({printBackground:true});assert.equal(pdf.subarray(0,4).toString(),'%PDF');assert.ok(pdf.length>10000);}
  await preview.getByRole('button',{name:'關閉'}).click();assert.equal(await page.evaluate(()=>JSON.stringify(window.currentNote.content_json)),beforeExport);
  await page.evaluate(()=>window.loadNote('fold'));await page.locator('[data-workspace-pane="fold"]').waitFor();
  await editor.click();await page.keyboard.type('Question /');await slash.getByRole('menuitem',{name:'轉換成摺疊'}).click();
  const fold=editor.locator('details[data-type="fold-block"]');await fold.waitFor();assert.match(await fold.innerText(),/Question/);
  await fold.locator('summary').click();await page.waitForFunction(()=>window.currentNote.content_json.content[0].attrs?.open===false);
  const closedSource=await page.evaluate(()=>JSON.stringify(window.currentNote.content_json));
  await page.getByTitle('檔案選單').click();await page.getByRole('button',{name:/匯出為 PDF/}).click();
  const foldPreview=page.getByRole('dialog',{name:'筆記匯出預覽'});await foldPreview.waitFor();
  assert.equal(await foldPreview.locator('details').first().evaluate(el=>el.open),true);
  assert.equal(await fold.first().evaluate(el=>el.open),false);await foldPreview.getByRole('button',{name:'關閉'}).click();
  assert.equal(await page.evaluate(()=>JSON.stringify(window.currentNote.content_json)),closedSource);
  await page.evaluate(()=>window.loadNote('blocks'));await page.locator('[data-workspace-pane="blocks"]').waitFor();
  await editor.click();await page.keyboard.type('Alpha');await page.keyboard.press('Enter');await page.keyboard.type('Beta');
  await editor.locator('p').first().hover();await page.locator('.nexus-drag-handle').click();
  await page.getByRole('menu',{name:'區塊操作'}).getByRole('menuitem',{name:'轉換成標題'}).click();
  assert.equal(await editor.locator('h2').innerText(),'Alpha');
  await editor.locator('h2').hover();await page.locator('.nexus-drag-handle').click();
  await page.keyboard.press('Escape');
  await editor.locator('p').last().hover();await page.locator('.nexus-drag-handle').click({modifiers:['Shift']});
  await page.getByRole('menu',{name:'區塊操作'}).getByRole('menuitem',{name:'刪除'}).click();
  assert.equal((await editor.innerText()).includes('Beta'),false);
  await page.keyboard.press('Control+z');assert.match(await editor.innerText(),/Alpha[\s\S]*Beta/);
  if(width===1440){
   assert.equal(await editor.locator('h2').count(),1);
   const beta=editor.locator('p').filter({hasText:'Beta'});
   await beta.click();await beta.hover();
   const target=await editor.locator('h2').boundingBox(),handle=await page.locator('.nexus-drag-handle').boundingBox();
   await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();
   await page.mouse.move(target.x+12,target.y+3,{steps:12});await page.mouse.up();
   await page.waitForFunction(()=>window.currentNote.content_json.content[0]?.content?.[0]?.text==='Beta',null,{timeout:1000});
   assert.match(await editor.innerText(),/^Beta[\s\S]*Alpha/);
   await page.keyboard.press('Control+z');assert.match(await editor.innerText(),/^Alpha[\s\S]*Beta/);
  }
  await page.evaluate(()=>window.loadNote('typing-regression'));await page.locator('[data-workspace-pane="typing-regression"]').waitFor();
  await editor.click();await page.keyboard.type('fast English words ',{delay:1});
  await page.keyboard.type('and more ',{delay:1});await page.keyboard.press('Backspace');await page.keyboard.press('Backspace');await page.keyboard.type('e ');
  // Synthetic composition checks that React updates do not replace the editor
  // while composing. Actual Chinese IME behavior still requires device review.
  await editor.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'中'})));
  await page.keyboard.insertText('中文');
  await editor.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'中文'})));
  await page.keyboard.press('Space');await page.keyboard.type('tail',{delay:1});
  const typingText=await editor.innerText();assert.match(typingText,/fast English words and more 中文 tail$/);
  assert.equal(await page.evaluate(()=>{const s=getSelection();return s?.anchorOffset===s?.anchorNode?.textContent?.length}),true,'cursor remains at the end after space and composition');
  await page.evaluate(()=>window.reopenCurrentNote());await editor.waitFor();
  assert.equal(await editor.innerText(),typingText,'reopening preserves the complete typed text');
  if(width===1440){
   await page.evaluate(()=>{const p=(id,text)=>({type:'paragraph',attrs:{id},content:[{type:'text',text}]});const rows=[{type:'tableRow',attrs:{id:'table-head'},content:[{type:'tableHeader',attrs:{id:'head-cell',colspan:2},content:[p('head-text','Repeated editor header')]}]},...Array.from({length:110},(_,i)=>({type:'tableRow',attrs:{id:'row-'+i},content:[{type:'tableCell',attrs:{id:'cell-a-'+i},content:[p('text-a-'+i,'Saved row '+i)]},{type:'tableCell',attrs:{id:'cell-b-'+i},content:[p('text-b-'+i,'中文 English content')]}]}))];window.loadPaginationNote({type:'doc',unknownMetadata:{keep:true},content:[{type:'table',attrs:{id:'saved-table'},content:rows}]});});
   await page.locator('[data-workspace-pane="pagination-note"]').waitFor();await page.waitForFunction(()=>document.querySelectorAll('.ProseMirror tr').length===111);
   const savedTableJSON=await page.evaluate(()=>JSON.stringify(window.currentNote.content_json));assert.equal(await page.evaluate(async()=>JSON.stringify(await window.persistPaginationNote())),savedTableJSON);
   await page.getByTitle('檔案選單').click();await page.getByRole('button',{name:/匯出為 PDF/}).click();const tablePreview=page.getByRole('dialog',{name:'筆記匯出預覽'});await tablePreview.waitFor();await page.waitForFunction(()=>!document.querySelector('.nexus-export-controls button')?.disabled);
   assert.ok(await tablePreview.locator('.nexus-export-paper').count()>1);assert.equal(await tablePreview.locator('tbody tr').count(),110);assert.equal(await page.evaluate(()=>JSON.stringify(window.currentNote.content_json)),savedTableJSON);
   await tablePreview.getByRole('button',{name:'關閉',exact:true}).click();await page.evaluate(()=>window.reopenCurrentNote());await editor.waitFor();assert.equal(await page.evaluate(async()=>JSON.stringify(await window.readPaginationNote())),savedTableJSON,'export never changes the durable table');assert.equal(await page.evaluate(async()=>JSON.stringify(await window.reopenPaginationNote())),savedTableJSON,'fresh IndexedDB adapter restores table, IDs and metadata');assert.equal(await page.evaluate(()=>JSON.stringify(window.currentNote.content_json)),savedTableJSON,'saved table, stable IDs and unknown metadata survive reopen/export');
  }
  assert.deepEqual(errors,[]);await page.close();
 }
});

