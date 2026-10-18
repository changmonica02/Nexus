require('./loadStudy.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {draftsFromBundle,mapDictionaryDraft,saveDictionaryDraft,validateDictionaryDraft}=require('../src/features/dictionary/draftPipeline.ts');
const {parseJSONBundle,normalizeDictionaryBundle}=require('../src/features/dictionary/adminImport.ts');
const {buildImportSession,chooseIssue,applyImportItems}=require('../src/features/dictionary/importReview.ts');
const {parseAI,toAI,planAI,submitAI}=require('../src/features/dictionary/aiDictionary.ts');
const {reviewSnapshot}=require('../src/features/dictionary/revisionLifecycle.ts');
const {withoutSense}=require('../src/features/dictionary/draftEditing.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const bundle=()=>({dictionary_entries:[{id:id(10),kind:'word',headword:'record'}],dictionary_senses:[{id:id(11),entry_id:id(10),part_of_speech:'noun',gloss_zh_tw:'紀錄'},{id:id(12),entry_id:id(10),part_of_speech:'verb',gloss_zh_tw:'記錄'}],dictionary_pronunciations:[{id:id(20),entry_id:id(10),sense_id:null,locale:null,ipa:'/shared/',note:null,sort_order:2},{id:id(21),entry_id:id(10),sense_id:id(11),locale:'en-GB',ipa:'/ˈrek.ɔːd/',note:'名詞',sort_order:0},{id:id(22),entry_id:id(10),sense_id:id(12),locale:'en-US',ipa:'/rɪˈkɔːrd/',note:'動詞',sort_order:1}]});
const snapshot=()=>({detail:{entry:{...bundle().dictionary_entries[0],revision:1,status:'draft'},senses:bundle().dictionary_senses,pronunciations:bundle().dictionary_pronunciations,etymologies:[],learning_notes:[],relations:[],examples:[],lexical_annotations:[]},grouping:null,sense_groups:{},metadata:null});
test('JSON and canonical draft preserve entry/sense scope, multiple locales, ordering and reject invalid content',()=>{
 const b=parseJSONBundle(JSON.stringify(bundle())),d=draftsFromBundle(b)[0];assert.deepEqual(mapDictionaryDraft(d).pronunciations,b.dictionary_pronunciations);assert.equal(validateDictionaryDraft([d]).length,0);
 for(const bad of [{ipa:''},{sense_id:id(99)},{sort_order:-1},{locale:''}]){const invalid=structuredClone(d);Object.assign(invalid.pronunciations[0],bad);assert.ok(validateDictionaryDraft([invalid]).length);}
 assert.throws(()=>parseJSONBundle(JSON.stringify({...bundle(),dictionary_pronunciations:[{...bundle().dictionary_pronunciations[0],sort_order:'1'}]})),/sort_order/);
 assert.throws(()=>withoutSense(b,id(11)),/引用/);
});
test('AI export/import preserves pronunciation IDs and scope; omission retains rows and cannot delete',()=>{
 const s=snapshot(),ai=toAI(s,new Map());const parsed=parseAI(JSON.stringify({format:'nexus-dictionary-ai',version:1,entries:[ai]})).entries[0];
 const plan=planAI(parsed,s,new Map());assert.deepEqual(plan.bundle.dictionary_pronunciations,s.detail.pronunciations);
 delete parsed.pronunciations;assert.equal(planAI(parsed,s,new Map()).bundle.dictionary_pronunciations.length,3);
 const changed={...ai,pronunciations:[{id:id(21),ipa:'/changed/',meaning_id:id(12),locale:'en-AU',sort_order:3}]};const update=planAI(changed,s,new Map());assert.equal(update.bundle.dictionary_pronunciations.find(r=>r.id===id(21)).sense_id,id(12));
 assert.throws(()=>planAI({...ai,pronunciations:[{id:id(99),ipa:'x'}]},s,new Map()),/不屬於/);
});
test('Review snapshot retains sense reassignment and stable pronunciation identity',()=>{
 const s=snapshot(),draft=draftsFromBundle(bundle())[0];draft.pronunciations[1].sense_id=id(12);
 const review={base_snapshot:s,candidate:mapDictionaryDraft(draft),revision:2};assert.equal(reviewSnapshot(review).detail.pronunciations[1].id,id(21));assert.equal(reviewSnapshot(review).detail.pronunciations[1].sense_id,id(12));assert.equal(s.detail.pronunciations[1].sense_id,id(11));
});
test('local PostgreSQL: import/preview rollback, Safe/Review, ownership/RLS, Published lifecycle, deletion and audit',async()=>{
 const pg=new PGlite();try{
 await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,anon;`);
 for(const f of ['20260922_study_fsrs.sql','20260930_public_dictionary.sql','20261001_dictionary_admin.sql','20261002_dictionary_reader.sql','20261004_dictionary_delete_draft_sense.sql','20261005_dictionary_grouping.sql','20261006_dictionary_prefix_sense_groups.sql','20261007_dictionary_ai_roundtrip.sql','20261010_dictionary_delete_drafts.sql','20261011_dictionary_delete_draft_content.sql','20261012_dictionary_retire_sources.sql','20261013_dictionary_draft_pipeline.sql','20261014_dictionary_revision_lifecycle.sql','20261017_dictionary_entry_identity.sql','20261018_dictionary_pronunciations.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 await pg.query('insert into auth.users values($1),($2)',[id(1),id(2)]);await pg.query('insert into dictionary_admins(user_id) values($1)',[id(1)]);await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
 const sql=async(q,values=[])=>(await pg.query(q,values)).rows[0]?.v;
 const client={rpc:async(name,args)=>{try{const signatures={inspect_dictionary_import:['drafts'],apply_dictionary_import_operation:['operation'],get_dictionary_ai_snapshot:['entry_uuid'],get_dictionary_entry:['entry_uuid'],apply_dictionary_drafts:['drafts','preview','allow_edits'],create_dictionary_review:['entry_uuid','expected_snapshot','patch','source_type','preview']};const keys=signatures[name];if(!keys)throw Error(name);return {data:await sql(`select ${name}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) v`,keys.map(k=>typeof args[k]==='object'&&args[k]!==null?JSON.stringify(args[k]):args[k]))};}catch(error){return {error};}}};
 const drafts=await normalizeDictionaryBundle(client,parseJSONBundle(JSON.stringify(bundle())));
 await saveDictionaryDraft(client,drafts,true);assert.equal(await sql('select count(*)::int v from dictionary_pronunciations'),0);assert.equal(await sql('select count(*)::int v from dictionary_audit'),0);
 let session=await buildImportSession(client,id(1),'json',drafts);assert.equal(session.items[0].bucket,'safe');let applied=await applyImportItems(client,session,false,async()=>{});assert.equal(applied.items[0].status,'applied');assert.equal(await sql('select count(*)::int v from dictionary_pronunciations'),3);
 session=await buildImportSession(client,id(1),'json',drafts);assert.equal(session.items[0].bucket,'safe');assert.equal(session.items[0].safeAction,'unchanged');
 const altered=structuredClone(drafts);altered[0].pronunciations[0].note='updated';session=await buildImportSession(client,id(1),'json',altered);assert.equal(session.items[0].bucket,'review');for(const issue of session.items[0].issues)session.items[0]=chooseIssue(session.items[0],issue.id,'incoming');applied=await applyImportItems(client,session,true,async()=>{});assert.equal(applied.items[0].status,'applied');
 let s=await sql('select get_dictionary_ai_snapshot($1) v',[id(10)]);assert.equal(s.detail.pronunciations.length,3);
 await assert.rejects(pg.query('select delete_dictionary_draft_sense($1,$2,$3,$4)',[id(10),id(11),s.detail.entry.revision,s.detail.senses.find(x=>x.id===id(11)).revision]),/pronunciations/);
 // Cross-entry sense FK and child identity collision both roll back all writes.
 const other={...drafts[0],entry_id:id(30),headword:'other',senses:[{id:id(31),part_of_speech:'noun',gloss_zh_tw:'其他'}],pronunciations:[{id:id(32),ipa:'x',sense_id:id(11)}]};
 await assert.rejects(pg.query('select apply_dictionary_drafts($1,false,true)',[JSON.stringify([mapDictionaryDraft(other)])]),/foreign key/);assert.equal(await sql('select count(*)::int v from dictionary_entries where id=$1',[id(30)]),0);
 other.pronunciations=[{id:id(21),ipa:'x',sense_id:null}];await assert.rejects(pg.query('select apply_dictionary_drafts($1,false,true)',[JSON.stringify([mapDictionaryDraft(other)])]),/ownership/);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);assert.equal(await sql('select count(*)::int v from dictionary_pronunciations'),0);await assert.rejects(pg.query('insert into dictionary_pronunciations(id,entry_id,ipa) values($1,$2,$3)',[id(99),id(10),'x']),/permission/);await assert.rejects(saveDictionaryDraft(client,drafts),/admin/);assert.equal(await sql('select get_published_dictionary_entry($1) v',[id(10)]),null);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);await pg.query('select publish_dictionary_entry($1)',[id(10)]);s=await sql('select get_dictionary_ai_snapshot($1) v',[id(10)]);
 const ai=toAI(s,new Map());ai.pronunciations[0].ipa='/revised/';const plan=planAI(ai,s,new Map());const audit=await sql('select count(*)::int v from dictionary_audit');await submitAI(client,plan,true);assert.equal(await sql('select count(*)::int v from dictionary_audit'),audit);
 const review=await submitAI(client,plan,false);assert.equal(review.candidate.pronunciations.length,3);assert.equal((await sql('select get_published_dictionary_entry($1) v',[id(10)])).pronunciations[0].ipa,s.detail.pronunciations[0].ipa);
 await pg.query('select approve_dictionary_review($1,$2)',[review.id,review.revision]);const published=await sql('select get_published_dictionary_entry($1) v',[id(10)]);assert.equal(published.pronunciations[0].ipa,'/revised/');assert.equal(published.pronunciations[0].id,s.detail.pronunciations[0].id);assert.equal('revision' in published.pronunciations[0],false);
 const historic=await sql('select snapshot v from dictionary_published_revisions where entry_id=$1 and revision=$2',[id(10),s.detail.entry.revision]);assert.equal(historic.detail.pronunciations[0].ipa,s.detail.pronunciations[0].ipa);
 // A review cannot remove a sense while retaining a pronunciation referencing it.
 const current=await sql('select get_dictionary_ai_snapshot($1) v',[id(10)]);const r=await sql("select create_dictionary_review($1,$2,null,'manual',false) v",[id(10),JSON.stringify(current)]);const candidate=structuredClone(r.candidate);candidate.bundle.dictionary_senses=candidate.bundle.dictionary_senses.filter(x=>x.id!==id(11));await assert.rejects(pg.query('select save_dictionary_review($1,$2,$3)',[r.id,r.revision,JSON.stringify(candidate)]),/pronunciations/);
 // Remove dependent pronunciation then sense in the same review; one DELETE audit only.
 candidate.pronunciations=candidate.pronunciations.filter(x=>x.sense_id!==id(11));const saved=await sql('select save_dictionary_review($1,$2,$3) v',[r.id,r.revision,JSON.stringify(candidate)]);await pg.query('select approve_dictionary_review($1,$2)',[r.id,saved.revision]);assert.equal(await sql("select count(*)::int v from dictionary_audit where table_name='dictionary_pronunciations' and record_id=$1 and operation='DELETE'",[id(21)]),1);
 // Direct draft content deletion and whole-draft deletion include pronunciation audit.
 other.pronunciations=[{id:id(32),ipa:'x',sense_id:id(31)}];await saveDictionaryDraft(client,[other]);let o=await sql('select get_dictionary_ai_snapshot($1) v',[id(30)]);await pg.query('select delete_dictionary_draft_content($1,$2,$3,$4,$5)',[id(30),'dictionary_pronunciations',id(32),o.detail.entry.revision,o.detail.pronunciations[0].revision]);assert.equal(await sql("select count(*)::int v from dictionary_audit where table_name='dictionary_pronunciations' and record_id=$1 and operation='DELETE'",[id(32)]),1);
 o=await sql('select get_dictionary_ai_snapshot($1) v',[id(30)]);other.revision=o.detail.entry.revision;other.pronunciations=[{id:id(33),ipa:'y',sense_id:null}];await saveDictionaryDraft(client,[other],false,true);o=await sql('select get_dictionary_ai_snapshot($1) v',[id(30)]);await pg.query('select delete_dictionary_drafts($1)',[JSON.stringify([{id:id(30),revision:o.detail.entry.revision}])]);assert.equal(await sql('select count(*)::int v from dictionary_pronunciations where entry_id=$1',[id(30)]),0);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);assert.equal(await sql('select count(*)::int v from dictionary_pronunciations'),2);await pg.exec('reset role;set role anon');await assert.rejects(pg.query('select * from dictionary_pronunciations'),/permission/);
 }finally{await pg.close();}
});
test('Admin and Reader render editable scopes/locales and escaped, ordered pronunciation details',()=>{
 const ts=require('typescript');require.extensions['.tsx']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,f);
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const {DictionaryEditor}=require('../src/features/dictionary/DictionaryAdmin.tsx');
 const {DictionaryArticle}=require('../src/features/dictionary/DictionaryBrowser.tsx');
 const detail=snapshot().detail;detail.pronunciations[0].note='<script>unsafe</script>';
 const html=renderToStaticMarkup(React.createElement(DictionaryEditor,{detail,entries:[],senses:[],onSaved:async()=>{}}));for(const label of ['IPA','適用義項','en-GB','新增讀音','刪除讀音'])assert.ok(html.includes(label),label);
 assert.ok(!html.includes('>排序<'));assert.ok(html.includes('上移讀音'));assert.ok(html.includes('下移讀音'));
 const reader=renderToStaticMarkup(React.createElement(DictionaryArticle,{data:{...detail,related:[]},showConnections:false}));for(const text of ['讀音','en-US','紀錄','記錄'])assert.ok(reader.includes(text),text);assert.ok(reader.indexOf('/ˈrek.ɔːd/')<reader.indexOf('/rɪˈkɔːrd/'));assert.ok(!reader.includes('<script>'));assert.ok(reader.includes('&lt;script&gt;'));
});
