require('./loadStudy.cjs');
const ts=require('typescript'),fs=require('node:fs');
require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
const test=require('node:test'),assert=require('node:assert/strict');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {DictionaryEditor,DictionaryPreview}=require('../src/features/dictionary/DictionaryAdmin.tsx');
const detail={entry:{id:'entry',headword:'test',kind:'word',source_id:'source',status:'draft',published_at:null,revision:1,updated_at:''},senses:[{id:'sense',entry_id:'entry',source_id:'source',part_of_speech:'noun',gloss_zh_tw:'測試',revision:1,updated_at:''}],relations:[],etymologies:[],learning_notes:[]};
test('admin editor exposes independent sense/history/memory sections and locks published records',()=>{
  const render=value=>renderToStaticMarkup(React.createElement(DictionaryEditor,{detail:value,entries:[],senses:[],onSaved:async()=>{}}));
  const html=render(detail);
  for(const text of ['單字','中文義項','歷史詞源','記憶故事','構詞關聯','儲存整份草稿','確認首次發布'])assert.ok(html.includes(text),text);
  assert.ok(!html.includes('<fieldset disabled'));
  assert.ok(html.includes('刪除義項'));
  assert.ok(html.includes('href="/dictionary/admin"'));
  const locked=render({...detail,entry:{...detail.entry,status:'published',published_at:'2026-01-01'}});
  assert.ok(locked.includes('<fieldset disabled'));
  assert.ok(!locked.includes('確認首次發布已儲存草稿'));
});
test('admin route owns scrolling and return links use fixed destinations',()=>{
  const admin=fs.readFileSync('src/features/dictionary/DictionaryAdmin.tsx','utf8');
  assert.ok(admin.includes('h-dvh overflow-y-auto'));
  assert.ok(admin.includes('href="/dictionary"'));
  assert.ok(admin.includes('useUnsavedDraft(dirty,busy)'));
  assert.ok(admin.includes('window.confirm('));
  assert.ok(fs.readFileSync('src/features/dictionary/DictionaryBrowser.tsx','utf8').includes("path.length?'/dictionary':'/study'"));
  assert.ok(fs.readFileSync('src/app/study/page.tsx','utf8').includes('initialFeature="study"'));
});
test('import preview escapes Markdown and distinguishes mnemonic from historical content',()=>{
  const html=renderToStaticMarkup(React.createElement(DictionaryPreview,{bundle:{dictionary_etymologies:[{id:'h',body:'Unverified history',verification:'pending'}],dictionary_learning_notes:[{id:'m',body:'<script>alert(1)</script>',kind:'mnemonic_scenario'}],dictionary_sources:[{id:'s',citation:'Self authored',license:'test-only',raw_text:'raw original'}]}}));
  assert.ok(html.includes('不是歷史事實'));assert.ok(html.includes('pending'));assert.ok(html.includes('test-only'));assert.ok(html.includes('raw original'));assert.ok(!html.includes('<script>'));
});

test('JSON import shares preview and explicit draft confirmation with existing formats',()=>{
  const ui=fs.readFileSync('src/features/dictionary/DictionaryAdmin.tsx','utf8');
  for(const format of ['csv','md','json'])assert.ok(ui.includes(`option value="${format}"`));
  assert.ok(ui.includes('accept=".csv,.md,.json"'));
  assert.ok(ui.includes('setResult(await applyBundle(getSupabase()!,parsed,true))'));
  assert.ok(ui.includes('if(!window.confirm("確定匯入目前預覽的草稿？'));
  assert.ok(ui.includes('applyBundle(getSupabase()!,candidate!,false)'));
});

test('editor uses ordered sections, contextual meaning links, no Sense selector and themed grouping',()=>{
  const root={...detail,entry:{...detail.entry,kind:'root'}};
  const render=d=>renderToStaticMarkup(React.createElement(DictionaryEditor,{detail:d,entries:[],senses:[],onSaved:async()=>{}}));
  const html=render(detail);
  let previous=-1;
  for(const label of ['分類','中文義項','構詞關聯','歷史詞源','記憶拆解','記憶故事','來源與授權']){
    const index=html.indexOf('>'+label+'</h3>');assert.ok(index>previous,label);previous=index;
  }
  assert.ok(!html.includes('所屬義項'));assert.ok(!html.includes('義項 ID'));assert.ok(!html.includes('Sense'));
  assert.equal((html.match(/←/g)||[]).length,1);
  const rootHtml=render(root);for(const label of ['主要分類','標籤','形態群／變體群','空間、位置與環境','時間、狀態、數量與邏輯'])assert.ok(rootHtml.includes(label));
  assert.ok(rootHtml.includes('var(--color-editor-bg)'));
  const source=fs.readFileSync('src/features/dictionary/DictionaryAdmin.tsx','utf8');
  assert.ok(source.includes("modal==='import'&&<DictionaryModal"));
  assert.ok(source.includes("modal==='new'&&<DictionaryModal"));
  assert.ok(!source.includes('<a '));
  assert.ok(source.includes("session?.user.id===ownerRef.current"));
  assert.ok(!source.includes('本次修訂'));
});
test('dictionary modal is bounded, scrollable and cancels through the guarded close handler',()=>{
  const {DictionaryModal}=require('../src/features/dictionary/DictionaryModal.tsx');
  const html=renderToStaticMarkup(React.createElement(DictionaryModal,{title:'匯入',onClose:()=>{}},'內容'));
  assert.ok(html.includes('<dialog'));assert.ok(html.includes('max-h-[90dvh]'));assert.ok(html.includes('overflow-y-auto'));
  assert.ok(html.includes('var(--color-bg)'));assert.ok(html.includes('關閉'));
  const source=fs.readFileSync('src/features/dictionary/DictionaryModal.tsx','utf8');
  assert.ok(source.includes('dialog.showModal()'));assert.ok(source.includes('if(!busy)onClose()'));
});
