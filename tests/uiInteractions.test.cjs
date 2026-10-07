require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
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
test('desktop sidebar choice survives remount; mobile changes do not overwrite it',()=>{
  const stored=new Map(),listeners=new Map();
  const previousWindow=global.window,previousStorage=global.localStorage;
  global.window={innerWidth:1200,addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k)};
  global.localStorage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v)};
  try{
    function mount(){let state;const effects=[];const mod=new Module('sidebar-test');
      mod.require=name=>name==='react'?{useState:initial=>{state=initial;return[state,action=>{state=typeof action==='function'?action(state):action;}];},useEffect:effect=>effects.push(effect),useCallback:fn=>fn}:require(name);
      mod._compile(ts.transpileModule(fs.readFileSync('src/components/useSidebarPreference.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,'sidebar-test.js');
      const [,update]=mod.exports.useSidebarPreference('left',false);const cleanups=effects.map(e=>e());return{update,value:()=>state,close:()=>cleanups.forEach(f=>f?.())};}
    let instance=mount();instance.update(true);assert.equal(instance.value(),true);instance.close();
    instance=mount();assert.equal(instance.value(),true);instance.update(false);instance.close();
    window.innerWidth=400;instance=mount();instance.update(true);assert.equal(stored.get('left'),'false');
    window.innerWidth=1200;listeners.get('resize')();assert.equal(instance.value(),false);instance.close();
  }finally{global.window=previousWindow;global.localStorage=previousStorage;}
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
