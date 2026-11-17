require('../loadStudy.cjs');
const ts=require('typescript'),fs=require('node:fs');
require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
const test=require('node:test'),assert=require('node:assert/strict');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {DictionaryEditor,DictionaryPreview}=require('../../src/features/dictionary/DictionaryAdmin.tsx');
const detail={entry:{id:'00000000-0000-4000-8000-000000000001',headword:'test',kind:'word',source_id:'source',status:'draft',published_at:null,revision:1,updated_at:''},senses:[{id:'00000000-0000-4000-8000-000000000002',entry_id:'00000000-0000-4000-8000-000000000001',source_id:'source',part_of_speech:'noun',gloss_zh_tw:'測試',revision:1,updated_at:''}],relations:[],etymologies:[],learning_notes:[]};
test('admin editor exposes independent sense/history/memory sections and locks published records',()=>{
  const render=value=>renderToStaticMarkup(React.createElement(DictionaryEditor,{detail:value,entries:[],senses:[],onSaved:async()=>{}}));
  const html=render(detail);
  for(const text of ['構詞英中與其連結','讀音（IPA）','詞性','中文意思','詞源','記憶法','儲存'])assert.ok(html.includes(text),text);
  assert.ok(!html.includes('<fieldset disabled'));
  assert.ok(html.includes('刪除義項'));
  assert.ok(!html.includes('← 返回'));
  const locked=render({...detail,entry:{...detail.entry,status:'published',published_at:'2026-01-01'}});
  assert.ok(locked.includes('<fieldset disabled'));
  assert.ok(!locked.includes('確認首次發布已儲存草稿'));
});
test('current JSON preview keeps etymology attribution separate and escapes mnemonic markup',()=>{
  const html=renderToStaticMarkup(React.createElement(DictionaryPreview,{bundle:{
    dictionary_etymologies:[{id:'h',body:'Unverified history',data_source:'Synthetic test source'}],
    dictionary_learning_notes:[{id:'m',body:'<script>alert(1)</script>',kind:'mnemonic_scenario'}],
  }}));
  assert.ok(html.includes('記憶法'));
  assert.ok(html.includes('Unverified history'));
  assert.ok(html.includes('Synthetic test source'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
test('morpheme subtype changes retain stable entry and sense variants without saving retired grouping',async()=>{
 const supabase=require('../../src/infrastructure/supabase/client.ts'),original=supabase.getSupabase,calls=[];
 supabase.getSupabase=()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:null,error:null};}});
 const grouping={primary_category:'legacy',tags:[' old ','old'],variant_group:'cap/cept'},variants=[{id:'00000000-0000-4000-8000-000000000003',form:'modern-',condition:'current sense'}];
 try{await withEditorState({detail:{...detail,entry:{...detail.entry,kind:'root'},senses:detail.senses.map(s=>({...s,part_of_speech:null,variants}))},entries:[],senses:[],initialGrouping:grouping,onSaved:async()=>{}},async render=>{
  let tree=render();const select=pick(tree,n=>n.type==='select'&&n.props['aria-label']==='構詞分類');const target={value:'suffix'};select.props.onChange({currentTarget:target,target});target.value='root';tree=render();
  assert.equal(pick(tree,n=>n.props['aria-label']==='構詞分類').props.value,'suffix');
  const sense=pick(tree,n=>n.type?.name==='MorphemeSenseEditor');sense.props.onChange({semantic_domain:'action',semantic_subdomain:'movement',gloss_zh_tw:'新概述'});tree=render();
  buttonNamed(tree,'儲存／重試').props.onClick();await new Promise(r=>setImmediate(r));
 });const value=calls.find(c=>c.name==='apply_dictionary_drafts').args.drafts[0];assert.equal(value.bundle.dictionary_entries[0].id,detail.entry.id);assert.equal(value.bundle.dictionary_entries[0].kind,'suffix');assert.equal('group_data'in value,false);assert.equal('sense_groups'in value,false);assert.deepEqual(value.bundle.dictionary_senses[0].variants,variants);assert.equal(value.bundle.dictionary_senses[0].id,detail.senses[0].id);assert.equal(value.bundle.dictionary_senses[0].gloss_zh_tw,'新概述');assert.equal(value.bundle.dictionary_senses[0].semantic_domain,'action');
 }finally{supabase.getSupabase=original;}
});

const {visibleAdminEntries}=require('../../src/features/dictionary/DictionaryAdmin.tsx');
test('multi-select types and statuses intersect with search; empty groups impose no restriction',()=>{
 const rows=[{id:'a',kind:'word',status:'draft',headword:'alpha'},{id:'b',kind:'prefix',status:'published',headword:'alpha-'},{id:'c',kind:'root',status:'draft',headword:'cap'},{id:'d',kind:'word',status:'published',headword:'beta'}];
 assert.deepEqual(visibleAdminEntries(rows,[],'',[]),rows);
 assert.deepEqual(visibleAdminEntries(rows,['word','prefix'],'ALP',['draft','published']).map(r=>r.id),['a','b']);
 const visible=visibleAdminEntries(rows,[],'a',['draft']);assert.deepEqual(visible.map(e=>e.id),['a','c']);
 assert.deepEqual(visibleAdminEntries(rows,['prefix'],'',['draft']),[]);
 assert.deepEqual(visibleAdminEntries(rows,[],'missing',[]),[]);
 const {DictionaryListFilters}=require('../../src/features/dictionary/DictionaryAdmin.tsx');
 const html=renderToStaticMarkup(React.createElement(DictionaryListFilters,{kinds:['word'],statuses:['draft'],onKinds:()=>{},onStatuses:()=>{}}));
 assert.ok(html.includes('type="checkbox"'));
});
test('fixed Word etymology edits retain its identity and source without exposing a second input',async()=>{
 const row={id:'00000000-0000-4000-8000-000000000004',entry_id:detail.entry.id,source_id:'source',sense_id:null,body:'old',data_source:'old source',revision:1};
 const d={...detail,etymologies:[row]};
 const html=renderToStaticMarkup(React.createElement(DictionaryEditor,{detail:d,entries:[],senses:[],onSaved:async()=>{}}));
 assert.ok(!html.includes('資料來源'));for(const text of ['查證狀態','已查證必填','本次草稿來源','來源與授權','首次發布','← 返回'])assert.ok(!html.includes(text),text);
 const supabase=require('../../src/infrastructure/supabase/client.ts'),original=supabase.getSupabase;let payload;
 supabase.getSupabase=()=>({rpc:async(name,args)=>{payload=args.drafts[0].bundle;return {error:null,data:{}};}});
 try{await withEditorState({detail:d,entries:[],senses:[],onSaved:async()=>{}},async render=>{
  let tree=render();pick(tree,n=>n.props.label==='詞源').props.onChange('updated');tree=render();buttonNamed(tree,'儲存／重試').props.onClick();await new Promise(r=>setImmediate(r));
 });assert.equal(payload.dictionary_etymologies[0].id,row.id);assert.equal(payload.dictionary_etymologies[0].body,'updated');assert.equal(payload.dictionary_etymologies[0].revision,1);assert.equal(payload.dictionary_etymologies[0].data_source,'old source');assert.equal(payload.dictionary_etymologies[0].verification,undefined);assert.equal(payload.dictionary_etymologies[0].verification_note,undefined);assert.equal(payload.dictionary_etymologies[0].source_id,undefined);assert.equal(payload.dictionary_sources,undefined);
 }finally{supabase.getSupabase=original;}
});
test('manual drafts strip legacy attribution and never create placeholder sources',()=>{
 const {prepareEditorBundle}=require('../../src/features/dictionary/DictionaryAdmin.tsx');
 const bundle={dictionary_entries:[{id:'00000000-0000-4000-8000-000000000001',source_id:'source'}],dictionary_senses:[{id:'00000000-0000-4000-8000-000000000002',source_id:'source'}]};
 const prepared=prepareEditorBundle(bundle);assert.equal(prepared.dictionary_sources,undefined);assert.equal(prepared.dictionary_entries[0].source_id,undefined);assert.equal(prepared.dictionary_senses[0].source_id,undefined);assert.equal(bundle.dictionary_entries[0].source_id,'source');
});
test('clearing fixed Word fields keeps an editable empty control and unrelated Sense changes',async()=>{
 const supabase=require('../../src/infrastructure/supabase/client.ts'),original=supabase.getSupabase;
 try{for(const [key,title,field,extra]of [['etymologies','詞源','body',{data_source:'source'}],['learning_notes','記憶法','body',{kind:'core_concept'}],['pronunciations','讀音（IPA）','ipa',{sort_order:0}],['public_notes','筆記','body',{}]]){
  const row={id:'00000000-0000-4000-8000-000000000004',entry_id:detail.entry.id,[field]:'content',...extra};
  for(const saved of [false,true])await withEditorState({detail:{...detail,[key]:[{...row,...(saved?{revision:1}:{})}]},entries:[],senses:[],onSaved:async()=>{}},async render=>{
   let tree=render();pick(tree,n=>n.props.label==='中文意思').props.onChange('待補');tree=render();
   pick(tree,n=>n.props.label===title).props.onChange('');tree=render();
   assert.equal(pick(tree,n=>n.props.label===title).props.value,'');
   assert.equal(pick(tree,n=>n.props.label==='中文意思').props.value,'待補');
   assert.ok(!nodes(tree).some(n=>n.props['aria-label']===`刪除 ${title}`));
   // A cleared field can be populated again without an add button or another row.
   pick(tree,n=>n.props.label===title).props.onChange('replacement');tree=render();
   assert.equal(nodes(tree).filter(n=>n.props.label===title).length,1);
   assert.equal(pick(tree,n=>n.props.label===title).props.value,'replacement');
  });
 }}finally{supabase.getSupabase=original;}
});
test('Word Sense rows keep stable identities and blank legacy values; basic info has no Sense fields',()=>{
 const senses=[detail.senses[0],{...detail.senses[0],id:'blank-sense',part_of_speech:null,gloss_zh_tw:''}];
 const html=renderToStaticMarkup(React.createElement(DictionaryEditor,{detail:{...detail,senses},entries:[],senses:[],onSaved:async()=>{}}));
 const basic=html.slice(html.indexOf('data-editor-section="基本資料"'),html.indexOf('data-editor-section="義項"'));
 assert.ok(!basic.includes('詞性'));assert.ok(!html.includes('分類 · 義項'));
 assert.equal((html.match(/data-word-sense-row=/g)||[]).length,2);
 assert.ok(html.includes('data-word-sense-row="blank-sense"'));assert.equal((html.match(/>詞性<\/span>/g)||[]).length,2);
 assert.ok(html.includes('sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_44px]'));
 const bundle={dictionary_entries:[detail.entry],dictionary_senses:senses};
 assert.deepEqual(require('../../src/features/dictionary/DictionaryAdmin.tsx').prepareEditorBundle(bundle).dictionary_senses.map(({id,part_of_speech,gloss_zh_tw})=>({id,part_of_speech,gloss_zh_tw})),senses.map(({id,part_of_speech,gloss_zh_tw})=>({id,part_of_speech,gloss_zh_tw})));
});

