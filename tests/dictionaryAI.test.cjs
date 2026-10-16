require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const {parseAI,chooseExport,categoryMatches,toAI,planAI,submitAI}=require('../src/features/dictionary/aiDictionary.ts');
const {primaryCategories,prefixCategories}=require('../src/features/dictionary/grouping.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const source={id:id(1),citation:'自建測試',license:'test-only',source_url:null,raw_text:'original',sha256:'a'.repeat(64),verification:'verified',verification_note:'manual',license_note:''};
function snapshot(n,kind='word',status='draft'){
 const row={entry_id:id(n),source_id:id(1),revision:1,updated_at:''};
 return {detail:{entry:{id:id(n),kind,headword:kind==='word'?'propose':kind==='prefix'?'pro-':'pose',source_id:id(1),status,published_at:status==='published'?'2026-01-01':null,revision:2,updated_at:''},senses:[{...row,id:id(n+1),part_of_speech:kind==='word'?'verb':null,gloss_zh_tw:kind==='word'?'提議':'向前'}],relations:[],etymologies:[{...row,id:id(n+2),sense_id:null,body:'既有詞源',data_source:'manual'}],learning_notes:[{...row,id:id(n+3),sense_id:null,body:'既有故事',kind:'mnemonic_scenario'}]},sources:[source],grouping:{primary_category:primaryCategories[0],tags:['test'],variant_group:null},sense_groups:{[id(n+1)]:prefixCategories[1]},metadata:null};
}
const prefix=snapshot(20,'prefix','published'),word=snapshot(10);
word.detail.relations=[{id:id(15),entry_id:id(10),source_id:id(1),revision:1,updated_at:'',sense_id:id(11),target_entry_id:id(20),target_sense_id:id(21),relation_kind:'historical_etymology',verification:'verified',verification_note:'manual'}];
const targets=new Map([[id(20),prefix]]);
const document=entries=>JSON.stringify({format:'nexus-dictionary-ai',version:1,entries});
const generator=()=>{let n=1000;return()=>id(n++);};
test('AI export scopes select draft/published and deduplicate linked drafts without merging homographs',()=>{
 const published={...word.detail.entry,status:'published'},draft={...published,id:id(40),status:'draft'},other={...draft,id:id(50),kind:'root'};
 const meta=[{entry_id:id(40),published_entry_id:published.id}];
 assert.deepEqual(chooseExport([published,draft,other],meta,'draft','word','',null).map(e=>e.id),[id(40)]);
 assert.deepEqual(chooseExport([published,draft,other],meta,'published','all','',null).map(e=>e.id),[id(10)]);
 assert.deepEqual(chooseExport([published,draft,other],meta,'all','all','',null).map(e=>e.id),[id(40),id(50)]);
 assert.deepEqual(chooseExport([published,draft],meta,'all','word','pro',[id(10)]).map(e=>e.id),[id(40)]);
 assert.equal(chooseExport([draft],meta,'draft','word','other',null).length,0);
});
test('Word/Prefix/Root AI projections preserve meanings and category levels without relation UUIDs',()=>{
 const w=toAI(word,targets);assert.equal(w.classification,'verb');assert.equal(w.meanings[0].zh_tw,'提議');assert.equal(w.components[0].target_id,id(20));assert.equal(w.components[0].zh_tw,'向前');assert.equal(w.components[0].order,0);assert.ok(!JSON.stringify(w).includes(id(15)));
 const p=toAI(prefix,new Map());assert.ok(!('primary_category' in p.grouping));assert.equal(p.meanings[0].grouping.primary_category,prefixCategories[1]);assert.equal(categoryMatches(prefix,prefixCategories[1]),true);
 const r=snapshot(30,'root');assert.equal(toAI(r,new Map()).grouping.primary_category,primaryCategories[0]);assert.equal(categoryMatches(r,primaryCategories[0]),true);assert.ok(!toAI(r,new Map()).meanings[0].grouping);
 assert.equal(parseAI(document([w,p,toAI(r,new Map())])).entries.length,3);
});
test('AI parser rejects identity/verification/delete/unknown fields and invalid classification',()=>{
 const base=toAI(word,targets);
 for(const changed of [{...base,type:'invalid'},{...base,revision:0},{...base,delete:true},{...base,sources:[{id:id(1),citation:'old',license:'old',url:null,verification:'verified'}]},{...base,meanings:[{id:'bad',zh_tw:'x'}]},{...toAI(prefix,new Map()),grouping:{primary_category:primaryCategories[0]}}])assert.throws(()=>parseAI(document([changed])));
 assert.throws(()=>parseAI(document([base,base])),/重複/);
 assert.throws(()=>parseAI('{'));
});
test('draft Diff updates only a draft, keeps omissions without creating source snapshots',()=>{
 const input={id:id(10),revision:2,type:'word',headword:'propose anew',meanings:[],components:[],etymology:[],story:[]};
 const plan=planAI(parseAI(document([input])).entries[0],word,targets,generator());
 assert.equal(plan.target_id,id(10));assert.equal(plan.bundle.dictionary_entries[0].revision,2);
 assert.equal(plan.bundle.dictionary_senses.length,1);assert.equal(plan.bundle.dictionary_relations.length,1);assert.equal(plan.bundle.dictionary_etymologies.length,1);assert.equal(plan.bundle.dictionary_learning_notes.length,1);
 assert.ok(plan.warnings.some(w=>w.includes('保留原資料')));assert.ok(plan.changes.some(d=>d.label==='headword'&&d.kind==='修改'));
 assert.equal(plan.bundle.dictionary_sources,undefined);assert.equal(source.verification,'verified');
 assert.equal(word.detail.entry.headword,'propose');assert.equal(plan.conflict,false);
});
test('published changes retain canonical IDs in a separate review snapshot; public content stays untouched',()=>{
 const published=structuredClone(word);published.detail.entry.status='published';
 const input={...toAI(published,targets),headword:'changed'};
 const before=structuredClone(published),plan=planAI(input,published,targets,generator());
 assert.equal(plan.target_id,id(10));assert.equal(plan.published_entry_id,id(10));assert.deepEqual(plan.origin_ids,{});
 for(const table of ['dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes'])for(const r of plan.bundle[table]){assert.equal(r.entry_id,plan.target_id);assert.ok('revision' in r);}
 assert.equal(plan.bundle.dictionary_relations[0].sense_id,id(11));assert.deepEqual(published,before);
 assert.ok(!('status' in plan.bundle.dictionary_entries[0]));assert.ok(plan.warnings.some(w=>w.includes('審核草稿')));
});
test('new entries generate IDs and remain draft-only; revision conflicts cannot submit',async()=>{
 const input=parseAI(document([{type:'root',headword:'new',grouping:{primary_category:primaryCategories[0],tags:[],variant_group:null},meanings:[{zh_tw:'自建'}]}])).entries[0];
 const plan=planAI(input,null,new Map(),generator());assert.ok(plan.target_id);assert.ok(!('status' in plan.bundle.dictionary_entries[0]));assert.equal(plan.bundle.dictionary_sources,undefined);
 const stale=planAI({...toAI(word,targets),revision:1},word,targets,generator());assert.equal(stale.conflict,true);
 let calls=0;await assert.rejects(submitAI({rpc:async()=>{calls++;}},stale,false),/版本衝突/);assert.equal(calls,0);
 const client={rpc:async(name,args)=>{calls++;assert.equal(name,'apply_dictionary_drafts');assert.equal(args.preview,true);assert.equal(args.drafts[0].ai.entry_uuid,null);return {data:{preview:true},error:null};}};await submitAI(client,plan,true);assert.equal(calls,1);
});
test('classification edits, content omissions, ambiguous components and unknown IDs are handled explicitly',()=>{
 const input=toAI(word,targets);input.classification='noun';const plan=planAI(input,word,targets,generator());assert.equal(plan.bundle.dictionary_senses[0].part_of_speech,'noun');
 assert.throws(()=>planAI({...input,id:id(999)},null,targets,generator()),/未知 id/);
 assert.throws(()=>planAI({...input,type:'root'},word,targets,generator()),/type/);
 const ambiguous=structuredClone(prefix);ambiguous.detail.senses.push({...ambiguous.detail.senses[0],id:id(29)});
 assert.throws(()=>planAI(input,word,new Map([[id(20),ambiguous]]),generator()),/多個候選/);
});
test('AI migration statically isolates writes, checks complete snapshots, rolls previews back and blocks review publication',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261007_dictionary_ai_roundtrip.sql','utf8');
 assert.match(sql,/current_snapshot is distinct from expected_snapshot/);assert.match(sql,/AI sources must be pending/);assert.match(sql,/if preview then raise exception/);assert.match(sql,/Review drafts cannot be published/);
 assert.match(sql,/enable row level security/);assert.ok(!/delete from|drop table|create or replace function public.apply_dictionary_bundle/i.test(sql));
 assert.match(sql,/AI saves only drafts/);assert.match(sql,/published_entry_id uuid unique/);
});
require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
test('export modal defaults Draft; editor hides initial publication for review drafts',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');const {AIExport}=require('../src/features/dictionary/DictionaryAI.tsx');const {DictionaryEditor}=require('../src/features/dictionary/DictionaryAdmin.tsx');
 const html=renderToStaticMarkup(React.createElement(AIExport,{query:'',selected:[],onBusy:()=>{}}));assert.ok(html.includes('value="draft" selected=""'));for(const label of ['Published','Draft + Published','已勾選詞條','目前搜尋结果'.replace('结果','結果'),'主要分類'])assert.ok(html.includes(label),label);
 const editor=renderToStaticMarkup(React.createElement(DictionaryEditor,{detail:word.detail,entries:[],senses:[],onSaved:async()=>{},reviewDraft:true}));assert.ok(editor.includes('審核草稿'));assert.ok(!editor.includes('確認首次發布已儲存草稿'));
});
