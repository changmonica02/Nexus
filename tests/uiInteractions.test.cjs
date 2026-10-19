require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const {bindMenuDismiss}=require('../src/components/menuDismiss.ts');
test('shared menus dismiss outside/Escape, preserve inside interactions and remove listeners',()=>{
  const events=new EventTarget();let closed=0;let inside=true;
  const cleanup=bindMenuDismiss(events,()=>inside,()=>closed++);
  events.dispatchEvent(new Event('pointerdown'));assert.equal(closed,0);
  inside=false;events.dispatchEvent(new Event('pointerdown'));assert.equal(closed,1);
  const key=new Event('keydown',{cancelable:true});Object.defineProperty(key,'key',{value:'Escape'});events.dispatchEvent(key);assert.equal(closed,2);assert.equal(key.defaultPrevented,true);
  const typing=new Event('keydown');Object.defineProperty(typing,'key',{value:'a'});events.dispatchEvent(typing);assert.equal(closed,2);
  cleanup();events.dispatchEvent(new Event('pointerdown'));assert.equal(closed,2);
});
require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
test('card editor header owns save/close and keeps copy; novel menu is local to headers',()=>{
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const Editor=require('../src/features/study/components/StudyCardEditor.tsx').default;
  const html=renderToStaticMarkup(React.createElement(Editor,{card:{id:'card',front:'test',back:'測試'},requiresScheduleChoice:false,onSave:async()=>{},onClose:()=>{},onCopy:()=>{}}));
  const header=html.slice(html.indexOf('<header'),html.indexOf('</header>'));
  assert.ok(header.includes('儲存'));assert.ok(header.includes('關閉'));assert.ok(header.includes('sticky'));assert.ok(html.includes('複製為新卡'));
  const source=fs.readFileSync('src/features/study/components/StudyCardEditor.tsx','utf8');assert.ok(source.includes('confirmDiscard()'));assert.ok(source.includes('event.preventDefault(); close();'));
  const novel=fs.readFileSync('src/components/NovelReaderView.tsx','utf8');assert.equal((novel.match(/\{moreMenu\}/g)||[]).length,3);assert.ok(novel.includes('confirmDialog('));
  assert.ok(!fs.readFileSync('src/components/NexusApp.tsx','utf8').includes('isNovelMoreOpen'));
});
