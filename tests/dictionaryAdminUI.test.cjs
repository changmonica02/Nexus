require('./loadStudy.cjs');
const ts=require('typescript'),fs=require('node:fs');
require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
const test=require('node:test'),assert=require('node:assert/strict');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {DictionaryEditor,DictionaryPreview}=require('../src/features/dictionary/DictionaryAdmin.tsx');
const detail={entry:{id:'00000000-0000-4000-8000-000000000001',headword:'test',kind:'word',source_id:'source',status:'draft',published_at:null,revision:1,updated_at:''},senses:[{id:'00000000-0000-4000-8000-000000000002',entry_id:'00000000-0000-4000-8000-000000000001',source_id:'source',part_of_speech:'noun',gloss_zh_tw:'測試',revision:1,updated_at:''}],relations:[],etymologies:[],learning_notes:[]};
test('admin editor exposes independent sense/history/memory sections and locks published records',()=>{
  const render=value=>renderToStaticMarkup(React.createElement(DictionaryEditor,{detail:value,entries:[],senses:[],onSaved:async()=>{}}));
  const html=render(detail);
  for(const text of ['單字','詞性','中文意思','歷史詞源','核心概念','構詞關聯','儲存'])assert.ok(html.includes(text),text);
  assert.ok(!html.includes('<fieldset disabled'));
  assert.ok(html.includes('刪除義項'));
  assert.ok(!html.includes('← 返回'));
  const locked=render({...detail,entry:{...detail.entry,status:'published',published_at:'2026-01-01'}});
  assert.ok(locked.includes('<fieldset disabled'));
  assert.ok(!locked.includes('確認首次發布已儲存草稿'));
});
test('admin route owns scrolling and return links use fixed destinations',()=>{
  const admin=fs.readFileSync('src/features/dictionary/DictionaryAdmin.tsx','utf8');
  assert.ok(admin.includes('h-full min-w-0 flex-1 overflow-y-auto'));
  assert.ok(fs.readFileSync('src/components/NexusApp.tsx','utf8').includes('h-[calc(100dvh-3.5rem)]'));
  assert.ok(admin.includes("entryId||newKind?'/dictionary/admin':'/dictionary'"));
  assert.ok(admin.includes('useUnsavedDraft(dirty,busy||publicationBusy,()=>save())'));
  assert.ok(admin.includes('confirmDialog('));
  assert.ok(fs.readFileSync('src/features/dictionary/DictionaryBrowser.tsx','utf8').includes("path.length?'/dictionary':'/study'"));
  assert.match(fs.readFileSync('src/components/WorkspaceRoot.tsx','utf8'), /initialFeature=\{pathname\s*===\s*["']\/study["']\s*\?\s*["']study["']\s*:\s*["']home["']\}/);
});
test('import preview escapes Markdown and distinguishes mnemonic from historical content',()=>{
  const html=renderToStaticMarkup(React.createElement(DictionaryPreview,{bundle:{dictionary_etymologies:[{id:'h',body:'Unverified history',verification:'pending'}],dictionary_learning_notes:[{id:'m',body:'<script>alert(1)</script>',kind:'mnemonic_scenario'}],dictionary_sources:[{id:'s',citation:'Self authored',license:'test-only',raw_text:'raw original'}]}}));
  assert.ok(html.includes('核心概念'));assert.ok(html.includes('pending'));assert.ok(html.includes('test-only'));assert.ok(html.includes('raw original'));assert.ok(!html.includes('<script>'));
});

test('JSON import shares preview and explicit draft confirmation with existing formats',()=>{
  const ui=fs.readFileSync('src/features/dictionary/DictionaryAdmin.tsx','utf8');
  for(const format of ['csv','md','json'])assert.ok(ui.includes(`option value="${format}"`));
  assert.ok(ui.includes('accept=".csv,.md,.json"'));
  assert.ok(ui.includes('<DictionaryImportReview'));
  const workflow=fs.readFileSync('src/features/dictionary/DictionaryImportReview.tsx','utf8');
  for(const text of ['normalizeDictionaryBundle','buildImportSession','confirmDialog','applyImportItems','exchange.applySafe','exchange.onlyPending'])assert.ok(workflow.includes(text),text);
});

test('editor uses ordered sections, contextual meaning links, no Sense selector and themed grouping',()=>{
  const root={...detail,entry:{...detail.entry,kind:'root'}};
  const render=d=>renderToStaticMarkup(React.createElement(DictionaryEditor,{detail:d,entries:[],senses:[],onSaved:async()=>{}}));
  const html=render(detail);
  let previous=-1;
  for(const label of ['基本資訊','義項','詞形變化','構詞關聯','補充資料','讀音','核心概念','歷史詞源']){
    const index=html.indexOf('>'+label+'</h3>');assert.ok(index>previous,label);previous=index;
  }
  assert.ok(!html.includes('所屬義項'));assert.ok(!html.includes('義項 ID'));assert.ok(!html.includes('Sense'));
  assert.equal((html.match(/←/g)||[]).length,0);
  const rootHtml=render(root);for(const label of ['主要分類','同字變體','空間、位置與環境','時間、狀態、數量與邏輯'])assert.ok(rootHtml.includes(label));
  assert.ok(rootHtml.includes('var(--color-editor-bg)'));
  assert.ok(!rootHtml.includes('標籤'));assert.ok(!rootHtml.includes('構詞關聯'));
  const header=html.match(/<header[\s\S]*?<\/header>/)[0];
  assert.ok(header.includes('sticky top-0'));assert.ok(!header.includes('返回'));assert.ok(header.includes('儲存'));
  assert.ok(!html.includes('儲存整份草稿'));
  assert.ok(rootHtml.indexOf('主要分類')<rootHtml.indexOf('同字變體'));
  assert.ok(rootHtml.indexOf('同字變體')<rootHtml.indexOf('>義項</h3>'));
  assert.ok(html.includes('中文意思'));assert.ok(html.includes('＋新增義項'));
  assert.ok(html.includes('sm:grid-cols-2'));
  for(const match of html.matchAll(/<(?:input|select|textarea)\b[^>]*class="([^"]*)"/g)) assert.ok(match[1].includes('w-full'),match[0]);
  const source=fs.readFileSync('src/features/dictionary/DictionaryAdmin.tsx','utf8');
  assert.ok(source.includes("modal==='import'&&<DictionaryModal"));
  assert.ok(source.includes("modal==='new'&&<DictionaryModal"));
  assert.ok(source.includes('download="dictionary_master_v1.csv"'));
  assert.ok(fs.readFileSync('src/features/dictionary/useDictionaryAdminAccess.ts','utf8').includes("session?.user.id===ownerRef.current"));
  assert.ok(!source.includes('本次修訂'));
});
test('dictionary modal is bounded, scrollable and cancels through the guarded close handler',()=>{
  const {DictionaryModal}=require('../src/features/dictionary/DictionaryModal.tsx');
  const html=renderToStaticMarkup(React.createElement(DictionaryModal,{title:'匯入',onClose:()=>{}},'內容'));
  assert.ok(html.includes('<dialog'));assert.ok(html.includes('max-h-[90dvh]'));assert.ok(html.includes('overflow-y-auto'));
  assert.ok(html.includes('var(--color-bg)'));assert.ok(html.includes('關閉'));
  const source=fs.readFileSync('src/features/dictionary/DictionaryModal.tsx','utf8');
  assert.ok(source.includes('busy={busy}'));assert.ok(source.includes('onDismiss={onClose}'));
  const base=fs.readFileSync('src/components/ModalDialog.tsx','utf8');assert.ok(base.includes('dialog?.showModal()'));assert.ok(base.includes('if (!busy) onDismiss()'));
});

// Defer functional updaters as React may do after a controlled select's DOM value
// is restored. This catches retaining the event/DOM node instead of its value.
async function withEditorState(props,run){
  const originalState=React.useState,originalEffect=React.useEffect,originalRef=React.useRef,originalContext=React.useContext;
  const values=[],pending=[];let cursor=0;
  React.useState=initial=>{
    const index=cursor++;
    if(index>=values.length)values.push(typeof initial==='function'?initial():initial);
    return [values[index],value=>pending.push(()=>{values[index]=typeof value==='function'?value(values[index]):value;})];
  };
  React.useContext=()=>null;React.useEffect=()=>{};React.useRef=initial=>{const [value]=React.useState({current:initial});return value;};
  const render=()=>{while(pending.length)pending.shift()();cursor=0;return DictionaryEditor(props);};
  try{await run(render);}finally{React.useState=originalState;React.useEffect=originalEffect;React.useRef=originalRef;React.useContext=originalContext;}
}
function nodes(root){
  if(Array.isArray(root))return root.flatMap(nodes);
  if(!React.isValidElement(root))return [];
  return [root,...nodes(root.props.children),...nodes(root.props.actions)];
}
function pick(root,predicate){const result=nodes(root).find(predicate);assert.ok(result,'expected editor control');return result;}
const buttonNamed=(root,text)=>pick(root,node=>node.type==='button'&&(node.props.children===text||node.props['aria-label']===text));

test('Prefix selection snapshots DOM value, saves current sense_groups, preserves hidden tags, and reloads',async()=>{
  const {prefixCategories,readSenseGroups}=require('../src/features/dictionary/grouping.ts');
  const supabase=require('../src/infrastructure/supabase/client.ts'),original=supabase.getSupabase;
  const prefix={...detail,entry:{...detail.entry,kind:'prefix'},senses:[{...detail.senses[0],part_of_speech:null},{...detail.senses[0],part_of_speech:null,id:'00000000-0000-4000-8000-000000000003',gloss_zh_tw:'第二義'}]};
  const grouping={primary_category:'historical category',tags:[' unchanged ','unchanged','unchanged'],variant_group:'variants'};
  const calls=[];let saved=false;
  supabase.getSupabase=()=>({rpc:async(name,args)=>{calls.push({name,args});return {error:null};}});
  try{
    await withEditorState({detail:prefix,entries:[],senses:[],initialGrouping:grouping,initialSenseGroups:{[detail.senses[0].id]:prefixCategories[0],['00000000-0000-4000-8000-000000000003']:prefixCategories[2]},onSaved:async id=>{assert.equal(id,'00000000-0000-4000-8000-000000000001');saved=true;}},async render=>{
      let tree=render();
      const select=pick(tree,node=>node.props['aria-label']==='義項 1 的分類');
      const target={value:prefixCategories[1]};select.props.onChange({currentTarget:target,target});
      target.value=prefixCategories[0]; // controlled DOM restored before queued state runs
      tree=render();assert.equal(pick(tree,n=>n.props['aria-label']==='義項 1 的分類').props.value,prefixCategories[1]);
      assert.equal(pick(tree,n=>n.props['aria-label']==='義項 2 的分類').props.value,prefixCategories[2]);
      buttonNamed(tree,'＋新增中文義項').props.onClick();tree=render();
      const newTarget={value:prefixCategories[3]};
      pick(tree,n=>n.props['aria-label']==='義項 3 的分類').props.onChange({currentTarget:newTarget,target:newTarget});
      newTarget.value='';tree=render();nodes(tree).filter(n=>n.props.label==='中文意思')[2].props.onChange('新義項');tree=render();
      tree=render();buttonNamed(tree,'儲存').props.onClick();
      await new Promise(resolve=>setImmediate(resolve));render();
    });
    assert.equal(saved,true);assert.equal(calls.length,1);
    assert.equal(calls[0].name,'apply_dictionary_drafts');
    const args=calls[0].args.drafts[0];
    assert.deepEqual(args.group_data,{primary_category:'historical category',tags:grouping.tags,variant_group:'variants'});
    assert.deepEqual(args.sense_groups.map(row=>row.primary_category),[prefixCategories[1],prefixCategories[2],prefixCategories[3]]);
    assert.deepEqual(args.sense_groups.map(row=>row.sense_id),args.bundle.dictionary_senses.map(row=>row.id));
    const reloaded=await readSenseGroups({from:()=>({select:()=>({in:async()=>({data:args.sense_groups,error:null})})})},args.sense_groups.map(row=>row.sense_id));
    const html=renderToStaticMarkup(React.createElement(DictionaryEditor,{detail:prefix,entries:[],senses:[],initialGrouping:grouping,initialSenseGroups:reloaded,onSaved:async()=>{}}));
    assert.ok(html.includes(`value="${prefixCategories[1]}" selected=""`));
    assert.ok(!html.includes('標籤'));
  }finally{supabase.getSupabase=original;}
});

test('Root category snapshots selection and saves unchanged tags via existing grouped RPC',async()=>{
  const {primaryCategories}=require('../src/features/dictionary/grouping.ts');
  const supabase=require('../src/infrastructure/supabase/client.ts'),original=supabase.getSupabase,calls=[];
  supabase.getSupabase=()=>({rpc:async(name,args)=>{calls.push({name,args});return {error:null};}});
  try{
    await withEditorState({detail:{...detail,senses:detail.senses.map(s=>({...s,part_of_speech:null})),entry:{...detail.entry,kind:'root'}},entries:[],senses:[],initialGrouping:{primary_category:null,tags:[' old ','old'],variant_group:null},onSaved:async()=>{}},async render=>{
      let tree=render();const select=pick(tree,n=>n.type==='select'&&n.props['aria-label']==='主要分類');
      const target={value:primaryCategories[2]};select.props.onChange({currentTarget:target,target});target.value='';
      tree=render();assert.equal(pick(tree,n=>n.type==='select').props.value,primaryCategories[2]);
      pick(tree,n=>n.type?.name==='VariantEditor').props.onChange('cap/cept/cip');
      tree=render();buttonNamed(tree,'儲存').props.onClick();await new Promise(resolve=>setImmediate(resolve));render();
    });
    assert.equal(calls[0].name,'apply_dictionary_drafts');
    assert.deepEqual(calls[0].args.drafts[0].group_data,{primary_category:primaryCategories[2],tags:[' old ','old'],variant_group:'cap/cept/cip'});
  }finally{supabase.getSupabase=original;}
});

const {visibleAdminEntries,DictionaryListActions}=require('../src/features/dictionary/DictionaryAdmin.tsx');
test('list filtering retains search/type behavior without selection controls',()=>{
 const entries=[{id:'a',headword:'alpha',kind:'word'},{id:'b',headword:'beta',kind:'word'},{id:'c',headword:'alpha-',kind:'prefix'}];
 const visible=visibleAdminEntries(entries,'word','ALP');assert.deepEqual(visible.map(e=>e.id),['a']);
 assert.deepEqual(visibleAdminEntries(entries,'prefix','ALP').map(e=>e.id),['c']);
 assert.deepEqual(visibleAdminEntries(entries,[],'missing'),[]);
 assert.deepEqual(visibleAdminEntries(entries,[],'').map(e=>e.id),['a','b','c']);
});
test('dictionary toolbar keeps only create, import and export without row selection actions',()=>{
 const props={busy:false,onNew:()=>{},onImport:()=>{},onExport:()=>{}};
 const render=p=>renderToStaticMarkup(React.createElement(DictionaryListActions,{...props,...p}));
 const html=render({});let last=-1;for(const label of ['新增','匯入資料','匯出資料']){const index=html.indexOf('>'+label+'</button>');assert.ok(index>last);last=index;}
 assert.ok(!html.includes('>全選</button>'));assert.ok(!html.includes('>刪除</button>'));assert.ok(!html.includes('>本頁選取發布</button>'));
 assert.match(render({busy:true}),/disabled=""/);
 const publishing=fs.readFileSync('src/features/dictionary/DictionaryBulkPublish.tsx','utf8');assert.match(publishing,/kind_filters:\[\],query_text:''/);assert.match(publishing,/kinds:\[\],query:''/);
 const source=fs.readFileSync('src/features/dictionary/DictionaryAdmin.tsx','utf8');assert.ok(!source.includes('max-h-64 overflow-auto'));assert.ok(source.includes('{visible.map'));assert.ok(source.includes('overflow-wrap:anywhere'));assert.ok(!source.includes('aria-label={'+String.fromCharCode(96)+'勾選'));
});
test('multi-select types and statuses intersect with search; empty groups impose no restriction',()=>{
 const rows=[{id:'a',kind:'word',status:'draft',headword:'alpha'},{id:'b',kind:'prefix',status:'published',headword:'alpha-'},{id:'c',kind:'root',status:'draft',headword:'cap'},{id:'d',kind:'word',status:'published',headword:'beta'}];
 assert.deepEqual(visibleAdminEntries(rows,[],'',[]),rows);
 assert.deepEqual(visibleAdminEntries(rows,['word','prefix'],'ALP',['draft','published']).map(r=>r.id),['a','b']);
 const visible=visibleAdminEntries(rows,[],'a',['draft']);assert.deepEqual(visible.map(e=>e.id),['a','c']);
 assert.deepEqual(visibleAdminEntries(rows,['prefix'],'',['draft']),[]);
 const {DictionaryListFilters}=require('../src/features/dictionary/DictionaryAdmin.tsx');
 const html=renderToStaticMarkup(React.createElement(DictionaryListFilters,{kinds:['word'],statuses:['draft'],onKinds:()=>{},onStatuses:()=>{}}));
 assert.equal((html.match(/type="checkbox"/g)||[]).length,5);assert.ok(!html.includes('<select'));assert.match(html,/flex-wrap/);
});
test('history source is optional; edits retain source content without recreating review-state metadata',async()=>{
 const d={...detail,etymologies:[{id:'00000000-0000-4000-8000-000000000004',entry_id:'00000000-0000-4000-8000-000000000001',source_id:'source',sense_id:null,body:'old',data_source:'old source',revision:1}]};
 const html=renderToStaticMarkup(React.createElement(DictionaryEditor,{detail:d,entries:[],senses:[],onSaved:async()=>{}}));
 assert.ok(html.includes('資料來源'));for(const text of ['查證狀態','已查證必填','本次草稿來源','來源與授權','首次發布','← 返回'])assert.ok(!html.includes(text),text);
 const supabase=require('../src/infrastructure/supabase/client.ts'),original=supabase.getSupabase;let payload;
 supabase.getSupabase=()=>({rpc:async(name,args)=>{payload=args.drafts[0].bundle;return {error:null,data:{}};}});
 try{await withEditorState({detail:d,entries:[],senses:[],onSaved:async()=>{}},async render=>{
  let tree=render();pick(tree,n=>n.props.label==='資料來源').props.onChange('');tree=render();buttonNamed(tree,'儲存').props.onClick();await new Promise(r=>setImmediate(r));
 });assert.equal(payload.dictionary_etymologies[0].verification,undefined);assert.equal(payload.dictionary_etymologies[0].verification_note,undefined);assert.equal(payload.dictionary_etymologies[0].data_source,'');assert.equal(payload.dictionary_etymologies[0].source_id,undefined);assert.equal(payload.dictionary_sources,undefined);
 }finally{supabase.getSupabase=original;}
});
test('manual drafts strip legacy attribution and never create placeholder sources',()=>{
 const {prepareEditorBundle}=require('../src/features/dictionary/DictionaryAdmin.tsx');
 const bundle={dictionary_entries:[{id:'00000000-0000-4000-8000-000000000001',source_id:'source'}],dictionary_senses:[{id:'00000000-0000-4000-8000-000000000002',source_id:'source'}]};
 const prepared=prepareEditorBundle(bundle);assert.equal(prepared.dictionary_sources,undefined);assert.equal(prepared.dictionary_entries[0].source_id,undefined);assert.equal(prepared.dictionary_senses[0].source_id,undefined);assert.equal(bundle.dictionary_entries[0].source_id,'source');
});
test('return sits beside page title and shared copyright information is reachable under About',()=>{
 const source=fs.readFileSync('src/features/dictionary/DictionaryAdmin.tsx','utf8');assert.ok(!source.includes('僅管理員可編輯。字典不會覆寫任何人的字卡或學習紀錄。'));
 assert.match(source,/<header[^>]*><SidebarToggle\/><Link[^>]*>← 返回上一頁<\/Link><h1[^>]*>字典管理/);
 const settings=fs.readFileSync('src/components/SettingsDialog.tsx','utf8');assert.ok(settings.includes('"關於 Nexus"'));assert.ok(settings.includes('<DataSourcesAndCopyright/>'));
 const {default:Page}=require('../src/components/DataSourcesAndCopyright.tsx');const html=renderToStaticMarkup(React.createElement(Page));assert.ok(html.includes('資料來源與版權'));assert.ok(html.includes('官方單字集'));assert.ok(html.includes('不代表已取得公開授權'));assert.ok(!/查證狀態|待審核標示/.test(html));
});

test('all three editor content types remove new items locally and confirm persisted deletion without losing other edits',async()=>{
 const dialogs=require('../src/lib/confirmDialog.ts'),supabase=require('../src/infrastructure/supabase/client.ts'),original=supabase.getSupabase;
 try{for(const [table,kind,title]of [['dictionary_etymologies',null,'歷史詞源'],['dictionary_learning_notes','core_concept','核心概念']]){
  let calls=0;supabase.getSupabase=()=>({rpc:async(name,args)=>{calls++;assert.equal(name,'delete_dictionary_draft_content');assert.equal(args.content_table,table);return {data:2,error:null};}});
  const row={id:'content',entry_id:'00000000-0000-4000-8000-000000000001',source_id:'source',body:'content',sense_id:null,...(kind?{kind}:{data_source:''})};
  const key=table==='dictionary_etymologies'?'etymologies':'learning_notes';
  for(const saved of [false,true])await withEditorState({detail:{...detail,[key]:[{...row,...(saved?{revision:1}:{})}]},entries:[],senses:[],onSaved:async()=>{}},async render=>{
   let tree=render();pick(tree,n=>n.props.label==='中文意思').props.onChange('待補');tree=render();
   pick(tree,n=>n.props['aria-label']===`刪除${title}`).props.onClick();
   if(saved){assert.ok(dialogs.currentDialog());dialogs.finishDialog(dialogs.currentDialog().id,false);await new Promise(r=>setImmediate(r));tree=render();assert.ok(nodes(tree).some(n=>n.props['aria-label']===`刪除${title}`));assert.equal(calls,0);pick(tree,n=>n.props['aria-label']===`刪除${title}`).props.onClick();dialogs.finishDialog(dialogs.currentDialog().id,true);}
   await new Promise(r=>setImmediate(r));tree=render();assert.ok(!nodes(tree).some(n=>n.props['aria-label']===`刪除${title}`));assert.equal(pick(tree,n=>n.props.label==='中文意思').props.value,'待補');assert.equal(calls,saved?1:0);
  });
 }}finally{supabase.getSupabase=original;}
});
test('empty classification uses unset placeholder and empty composition hides sense placeholder headings',()=>{
 const d={...detail,senses:[{...detail.senses[0],part_of_speech:null,gloss_zh_tw:'待補'}]};
 const html=renderToStaticMarkup(React.createElement(DictionaryEditor,{detail:d,entries:[],senses:[],onSaved:async()=>{}}));
 assert.ok(html.includes('placeholder="未設定"'));assert.ok(html.includes('value="待補"'));const section=html.slice(html.indexOf('>構詞關聯</h3>'),html.indexOf('>歷史詞源</h3>'));assert.ok(section.includes('新增構詞關聯'));assert.ok(!section.includes('待補'));
});


test('Word Sense rows keep stable identities and blank legacy values; basic info has no Sense fields',()=>{
 const senses=[detail.senses[0],{...detail.senses[0],id:'blank-sense',part_of_speech:null,gloss_zh_tw:''}];
 const html=renderToStaticMarkup(React.createElement(DictionaryEditor,{detail:{...detail,senses},entries:[],senses:[],onSaved:async()=>{}}));
 const basic=html.slice(html.indexOf('data-editor-section="基本資訊"'),html.indexOf('data-editor-section="義項"'));
 assert.ok(!basic.includes('詞性'));assert.ok(!html.includes('分類 · 義項'));
 assert.equal((html.match(/data-word-sense-row=/g)||[]).length,2);
 assert.ok(html.includes('data-word-sense-row="blank-sense"'));assert.equal((html.match(/>詞性<\/span>/g)||[]).length,2);
 assert.ok(html.includes('sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_44px]'));
 const bundle={dictionary_entries:[detail.entry],dictionary_senses:senses};
 assert.deepEqual(require('../src/features/dictionary/DictionaryAdmin.tsx').prepareEditorBundle(bundle).dictionary_senses.map(({id,part_of_speech,gloss_zh_tw})=>({id,part_of_speech,gloss_zh_tw})),senses.map(({id,part_of_speech,gloss_zh_tw})=>({id,part_of_speech,gloss_zh_tw})));
});

test('normal preview places core concept before etymology without legacy kind or retired hint controls',()=>{
 const html=renderToStaticMarkup(React.createElement(DictionaryPreview,{technical:false,bundle:{dictionary_etymologies:[{id:'h',body:'history'}],dictionary_learning_notes:[{id:'n',kind:'core_concept',body:'image'}],dictionary_lexical_annotations:[{id:'old',kind:'relation_hint',body:'archived hint'}]}}));
 assert.ok(html.indexOf('核心概念')<html.indexOf('歷史詞源'));assert.ok(!html.includes('core_concept'));assert.ok(!html.includes('archived hint'));assert.ok(html.includes('image'));assert.ok(html.includes('history'));
});
