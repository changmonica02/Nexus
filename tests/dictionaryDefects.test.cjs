require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {database,sql,id,draft}=require('./fixtures/dictionaryTransferDatabase.cjs');
const {mapDictionaryDraft}=require('../src/features/dictionary/draftPipeline.ts');
async function migrated(){const pg=await database();if(process.env.NEXUS_C_BASELINE!=='1'){await pg.exec('reset role');await pg.exec(require('node:fs').readFileSync('supabase/migrations/20261111145758_dictionary_pending_identity.sql','utf8'));await pg.exec('set role authenticated');}return pg;}
const save=(pg,value)=>sql(pg,'select apply_dictionary_drafts($1,false,true) v',[JSON.stringify([mapDictionaryDraft(value)])]);
async function publish(pg,value){await save(pg,value);await sql(pg,'select publish_dictionary_entry($1,true) v',[value.entry_id]);}
test('C1 latest schema: standalone Word with segments, IPA and active editor Review can be deleted; official manifest blocks atomically',async()=>{
 const pg=await migrated();try{
  const word=draft(10);word.word_segments=[{id:id(13),text:word.headword,hint:'提示',relation_id:null}];word.pronunciations=[{id:id(14),sense_id:null,ipa:'/a/',sort_order:0}];await publish(pg,word);
  const snapshot=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[id(10)]);await sql(pg,"select create_dictionary_review($1,$2,null,'manual',false) v",[id(10),JSON.stringify(snapshot)]);
  const result=await sql(pg,'select delete_dictionary_entry($1,$2,$3,$4) v',[id(10),snapshot.detail.entry.revision,JSON.stringify(snapshot),id(1000)]);assert.equal(result.deleted,true);
  const protectedWord=draft(20);await publish(pg,protectedWord);await pg.exec('reset role');await pg.query("insert into official_study_pack_entries values('gsat-1-2',$1,1,0)",[id(20)]);await pg.exec('set role authenticated');const current=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[id(20)]);
  await assert.rejects(sql(pg,'select delete_dictionary_entry($1,$2,$3,$4) v',[id(20),current.detail.entry.revision,JSON.stringify(current),id(1001)]),/Official study packs reference/);assert.deepEqual(await sql(pg,'select get_dictionary_ai_snapshot($1) v',[id(20)]),current);
 }finally{await pg.close();}
});
test('C2 prefix classification lists a stable Entry once despite multiple matching senses',async()=>{
 const pg=await migrated();try{
  const prefix=draft(100);prefix.kind='prefix';prefix.senses=[{id:id(101),gloss_zh_tw:'向',part_of_speech:null},{id:id(102),gloss_zh_tw:'靠近',part_of_speech:null}];await publish(pg,prefix);
  const result=await sql(pg,"select search_prefix_dictionary('',0,'__ungrouped__') v");assert.equal(result.items.length,1);assert.equal(result.total,1);assert.equal(result.items[0].id,id(100));
  assert.deepEqual(result.items[0].matched_sense_ids,[id(101),id(102)]);
  const root=draft(900);root.kind='root';root.headword=prefix.headword;root.senses=root.senses.map(row=>({...row,part_of_speech:null}));await publish(pg,root);
  for(let i=0;i<21;i++){const n=1000+i*10,d=draft(n);d.kind='prefix';d.senses=[{id:id(n+1),gloss_zh_tw:'一',part_of_speech:null},{id:id(n+2),gloss_zh_tw:'二',part_of_speech:null}];await publish(pg,d);}
  const first=await sql(pg,"select search_prefix_dictionary('',0,'__ungrouped__') v"),second=await sql(pg,"select search_prefix_dictionary('',1,'__ungrouped__') v");assert.equal(first.total,22);assert.equal(first.items.length,20);assert.equal(second.items.length,2);assert.equal(new Set([...first.items,...second.items].map(row=>row.id)).size,22);
  const current=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[id(100)]);await sql(pg,'select delete_dictionary_entry($1,$2,$3,$4) v',[id(100),current.detail.entry.revision,JSON.stringify(current),id(9999)]);assert.ok(await sql(pg,'select get_published_dictionary_entry($1) v',[id(900)]),'same spelling in another formal kind retains its own ID');

 }finally{await pg.close();}
});
test('C3 active editor Review has the same pending Entry identity in admin and complete export; ordinary draft is not pending',async()=>{
 const pg=await migrated();try{
  await publish(pg,draft(200));const snapshot=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[id(200)]);await sql(pg,"select create_dictionary_review($1,$2,null,'manual',false) v",[id(200),JSON.stringify(snapshot)]);await save(pg,draft(300));
  const admin=await sql(pg,"select list_dictionary_admin_work('{}','{}','','red',0) v"),exported=await sql(pg,"select export_dictionary_exchange_page(array['word','prefix','root'],'{}','',null,null,true,true) v");assert.equal(admin.total,1);assert.equal(admin.items[0].id,id(200));assert.equal(admin.total,exported.total);
  const source={type:'json',session_id:id(9000),preview_at:new Date().toISOString()};
  const proposals=[{key:'same-entry-1',source,item:{status:'pending',draft:draft(200),issues:[{id:'a',applied:false}]}},{key:'same-entry-2',source,item:{status:'pending',draft:draft(200),issues:[{id:'b',applied:false}]}},{key:'ghost-root',source,item:{status:'pending',draft:{...draft(400),kind:'root'},issues:[{id:'c',applied:false}]}},{key:'failed-prefix',source,item:{status:'failed',draft:{...draft(500),kind:'prefix'},issues:[]}}];
  await sql(pg,'select stage_dictionary_import_reviews($1) v',[JSON.stringify(proposals)]);
  const reviews=await sql(pg,'select jsonb_agg(to_jsonb(r) order by id) v from dictionary_import_review_items r');
  const pending=await sql(pg,"select list_dictionary_admin_work('{}','{}','','red',0) v"),allExport=await sql(pg,"select export_dictionary_exchange_page(array['word','prefix','root'],'{}','',null,null,true,true) v");assert.equal(pending.total,3);assert.equal(pending.total,allExport.total);assert.equal(pending.items.filter(row=>row.id===id(200)).length,1);assert.equal(pending.items.find(row=>row.id===id(200)).editor_pending_count,1);assert.equal(pending.items.find(row=>row.id===id(200)).import_pending_count,2);
  const yellow=await sql(pg,"select list_dictionary_admin_work('{}','{}','','yellow',0) v");assert.equal(yellow.total,1);assert.equal(yellow.items[0].id,id(300));
  for(const kind of ['word','prefix','root']){const scoped=await sql(pg,"select list_dictionary_admin_work($1,'{}','','red',0) v",[[kind]]),exportScope=await sql(pg,"select export_dictionary_exchange_page($1,'{}','',null,null,true,true) v",[[kind]]);assert.equal(scoped.total,exportScope.total);}
  assert.deepEqual(await sql(pg,'select jsonb_agg(to_jsonb(r) order by id) v from dictionary_import_review_items r'),reviews,'counts do not mutate pending work');

 }finally{await pg.close();}
});

test('C1 deletion diagnostics preserve RPC evidence while user messages identify protected dependencies',()=>{
 const {DictionaryDeletionFailure,deletionFailureText}=require('../src/features/dictionary/deleteEntry.ts');
 for(const [message,reason] of [['Official study packs reference this entry','official'],['Other entries reference this component','relation'],['Another active Review references this entry','review'],['Entry changed; reopen','stale'],['Dictionary admin required','permission'],['SQL statement with private data','unknown']]){
  const error=new DictionaryDeletionFailure('delete_dictionary_entry',{message,code:'P0001',details:'private SQL',hint:'hint'});assert.equal(error.reason,reason);assert.equal(error.diagnostic.message,message);assert.equal(error.diagnostic.details,'private SQL');assert.equal(deletionFailureText(error,key=>key),'deletion.'+reason);
 }
});

test('C3 pending routes retain editor/import separation and original management context',()=>{
 const {adminWorkHref}=require('../src/features/dictionary/adminNavigation.ts'),filter={kinds:['word'],statuses:[],query:'word',work:'red',page:3};
 const editor=adminWorkHref({id:id(1),work_status:'red',pending_count:2,import_pending_count:0,editor_pending_count:2},filter);assert.equal(new URL(editor,'https://nexus.invalid').searchParams.get('entry'),id(1));assert.ok(new URL(editor,'https://nexus.invalid').searchParams.get('from').includes('page=3'));
 assert.equal(adminWorkHref({id:id(2),work_status:'red',pending_count:3,import_pending_count:1,editor_pending_count:2},filter),'/dictionary/admin/reviews?entry='+id(2));
});

test('C migration is repeatable without data changes; unknown installed return contract rolls back preceding query replacement',async()=>{
 const pg=await database();try{
  const fs=require('node:fs'),migration=fs.readFileSync('supabase/migrations/20261111145758_dictionary_pending_identity.sql','utf8');await pg.exec('reset role');
  await pg.exec(migration);await pg.exec(migration);const definition=await sql(pg,"select pg_get_functiondef('search_prefix_dictionary(text,integer,text)'::regprocedure) v");
  await pg.exec('drop function list_dictionary_admin_work(text[],text[],text,text,integer)');await pg.exec("create function list_dictionary_admin_work(text[],text[],text,text,integer) returns integer language sql as $$select 0$$");
  await assert.rejects(pg.exec(migration),/Unexpected dictionary list contract/);await pg.exec('rollback');assert.equal(await sql(pg,"select pg_get_functiondef('search_prefix_dictionary(text,integer,text)'::regprocedure) v"),definition);
 }finally{await pg.close();}
});
