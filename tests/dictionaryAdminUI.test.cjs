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
  for(const text of ['英文詞條','繁體中文義項','歷史詞源','記憶情境','Sense 級構詞關聯','儲存整份草稿','確認首次發布'])assert.ok(html.includes(text),text);
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
  assert.ok(fs.readFileSync('src/features/dictionary/DictionaryBrowser.tsx','utf8').includes('href="/study"'));
  assert.ok(fs.readFileSync('src/app/study/page.tsx','utf8').includes('initialFeature="study"'));
});
test('import preview escapes Markdown and distinguishes mnemonic from historical content',()=>{
  const html=renderToStaticMarkup(React.createElement(DictionaryPreview,{bundle:{dictionary_etymologies:[{id:'h',body:'Unverified history',verification:'pending'}],dictionary_learning_notes:[{id:'m',body:'<script>alert(1)</script>',kind:'mnemonic_scenario'}],dictionary_sources:[{id:'s',citation:'Self authored',license:'test-only',raw_text:'raw original'}]}}));
  assert.ok(html.includes('不是歷史事實'));assert.ok(html.includes('pending'));assert.ok(html.includes('test-only'));assert.ok(html.includes('raw original'));assert.ok(!html.includes('<script>'));
});
