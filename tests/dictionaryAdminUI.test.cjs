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
  for(const text of ['單字','中文義項','歷史詞源','記憶故事','構詞關聯','儲存','確認首次發布'])assert.ok(html.includes(text),text);
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
  for(const label of ['基本資料','中文義項','構詞關聯','歷史詞源','口訣','記憶故事','來源與授權']){
    const index=html.indexOf('>'+label+'</h3>');assert.ok(index>previous,label);previous=index;
  }
  assert.ok(!html.includes('所屬義項'));assert.ok(!html.includes('義項 ID'));assert.ok(!html.includes('Sense'));
  assert.equal((html.match(/←/g)||[]).length,1);
  const rootHtml=render(root);for(const label of ['主要分類','同字變體','空間、位置與環境','時間、狀態、數量與邏輯'])assert.ok(rootHtml.includes(label));
  assert.ok(rootHtml.includes('var(--color-editor-bg)'));
  assert.ok(!rootHtml.includes('標籤'));assert.ok(!rootHtml.includes('構詞關聯'));
  const header=html.match(/<header[\s\S]*?<\/header>/)[0];
  assert.ok(header.includes('sticky top-0'));assert.ok(header.includes('返回'));assert.ok(header.includes('儲存'));
  assert.ok(!html.includes('儲存整份草稿'));
  assert.ok(rootHtml.indexOf('主要分類')<rootHtml.indexOf('同字變體'));
  assert.ok(rootHtml.indexOf('同字變體')<rootHtml.indexOf('>中文義項</h3>'));
  assert.ok(html.includes('中文意思'));assert.ok(html.includes('＋新增中文義項'));
  assert.ok(!html.includes('grid-cols-2'));
  for(const match of html.matchAll(/<(?:input|select|textarea)\b[^>]*class="([^"]*)"/g)) assert.ok(match[1].includes('w-full'),match[0]);
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

// Defer functional updaters as React may do after a controlled select's DOM value
// is restored. This catches retaining the event/DOM node instead of its value.
async function withEditorState(props,run){
  const originalState=React.useState,originalEffect=React.useEffect;
  const values=[],pending=[];let cursor=0;
  React.useState=initial=>{
    const index=cursor++;
    if(index>=values.length)values.push(typeof initial==='function'?initial():initial);
    return [values[index],value=>pending.push(()=>{values[index]=typeof value==='function'?value(values[index]):value;})];
  };
  React.useEffect=()=>{};
  const render=()=>{while(pending.length)pending.shift()();cursor=0;return DictionaryEditor(props);};
  try{await run(render);}finally{React.useState=originalState;React.useEffect=originalEffect;}
}
function nodes(root){
  if(Array.isArray(root))return root.flatMap(nodes);
  if(!React.isValidElement(root))return [];
  return [root,...nodes(root.props.children)];
}
function pick(root,predicate){const result=nodes(root).find(predicate);assert.ok(result,'expected editor control');return result;}
const buttonNamed=(root,text)=>pick(root,node=>node.type==='button'&&node.props.children===text);

test('Prefix selection snapshots DOM value, saves current sense_groups, preserves hidden tags, and reloads',async()=>{
  const {prefixCategories,readSenseGroups}=require('../src/features/dictionary/grouping.ts');
  const supabase=require('../src/infrastructure/supabase/client.ts'),original=supabase.getSupabase;
  const prefix={...detail,entry:{...detail.entry,kind:'prefix'},senses:[detail.senses[0],{...detail.senses[0],id:'second',gloss_zh_tw:'第二義'}]};
  const grouping={primary_category:'historical category',tags:[' unchanged ','unchanged','unchanged'],variant_group:'variants'};
  const calls=[];let saved=false;
  supabase.getSupabase=()=>({rpc:async(name,args)=>{calls.push({name,args});return {error:null};}});
  try{
    await withEditorState({detail:prefix,entries:[],senses:[],initialGrouping:grouping,initialSenseGroups:{sense:prefixCategories[0],second:prefixCategories[2]},onSaved:async id=>{assert.equal(id,'entry');saved=true;}},async render=>{
      let tree=render();
      const select=pick(tree,node=>node.props['aria-label']==='義項 1 的分類');
      const target={value:prefixCategories[1]};select.props.onChange({currentTarget:target,target});
      target.value=prefixCategories[0]; // controlled DOM restored before queued state runs
      tree=render();assert.equal(pick(tree,n=>n.props['aria-label']==='義項 1 的分類').props.value,prefixCategories[1]);
      assert.equal(pick(tree,n=>n.props['aria-label']==='義項 2 的分類').props.value,prefixCategories[2]);
      buttonNamed(tree,'＋新增中文義項').props.onClick();tree=render();
      const newTarget={value:prefixCategories[3]};
      pick(tree,n=>n.props['aria-label']==='義項 3 的分類').props.onChange({currentTarget:newTarget,target:newTarget});
      newTarget.value='';tree=render();
      pick(tree,n=>n.props.label==='本次草稿來源／作者').props.onChange('Self-authored');
      pick(tree,n=>n.props.label==='本次草稿授權說明').props.onChange('Test');
      tree=render();buttonNamed(tree,'儲存').props.onClick();
      await new Promise(resolve=>setImmediate(resolve));render();
    });
    assert.equal(saved,true);assert.equal(calls.length,1);
    assert.equal(calls[0].name,'save_dictionary_prefix_draft');
    const args=calls[0].args;
    assert.deepEqual(args.group_data,{tags:grouping.tags,variant_group:'variants'});
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
    await withEditorState({detail:{...detail,entry:{...detail.entry,kind:'root'}},entries:[],senses:[],initialGrouping:{primary_category:null,tags:[' old ','old'],variant_group:null},onSaved:async()=>{}},async render=>{
      let tree=render();const select=pick(tree,n=>n.type==='select'&&!n.props['aria-label']);
      const target={value:primaryCategories[2]};select.props.onChange({currentTarget:target,target});target.value='';
      tree=render();assert.equal(pick(tree,n=>n.type==='select').props.value,primaryCategories[2]);
      pick(tree,n=>n.type?.name==='VariantEditor').props.onChange('cap/cept/cip');
      pick(tree,n=>n.props.label==='本次草稿來源／作者').props.onChange('Author');
      pick(tree,n=>n.props.label==='本次草稿授權說明').props.onChange('Test');
      tree=render();buttonNamed(tree,'儲存').props.onClick();await new Promise(resolve=>setImmediate(resolve));render();
    });
    assert.equal(calls[0].name,'save_dictionary_grouped_draft');
    assert.deepEqual(calls[0].args.group_data,{primary_category:primaryCategories[2],tags:[' old ','old'],variant_group:'cap/cept/cip'});
  }finally{supabase.getSupabase=original;}
});
