require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {database,sql,id,owner}=require('./fixtures/dictionaryExchangeDatabase.cjs');
const migration=fs.readFileSync('supabase/migrations/20261018010000_dictionary_entry_deletion.sql','utf8');
async function setup(){const pg=await database();await pg.exec("reset role;create table official_study_pack_entries(pack_id text,dictionary_entry_id uuid references dictionary_entries(id));");await pg.exec(migration);await pg.exec('set role authenticated');return pg;}
async function seed(pg,n,kind='word',publish=true){await pg.query('insert into dictionary_entries(id,kind,headword) values($1,$2,$3)',[id(n),kind,'entry'+n]);await pg.query('insert into dictionary_senses(id,entry_id,part_of_speech,gloss_zh_tw) values($1,$2,$3,$4)',[id(n+1),id(n),kind==='word'?'noun':null,'意思']);if(publish)await pg.query('select publish_dictionary_entry($1,true)',[id(n)]);return sql(pg,'select get_dictionary_ai_snapshot($1) v',[id(n)]);}
const remove=(pg,snapshot,n)=>sql(pg,'select delete_dictionary_entry($1,$2,$3::jsonb,$4) v',[snapshot.detail.entry.id,snapshot.detail.entry.revision,JSON.stringify(snapshot),id(n)]);
test('Word/Prefix/Root atomic deletion preserves history, private cards/states/events, removes only live children/links; retry and retired-ID guard',async()=>{
 const pg=await setup();try{
 for(const [i,kind] of ['word','prefix','root'].entries()){
 const n=100+i*100;let s=await seed(pg,n,kind,false);
 await pg.query("insert into dictionary_etymologies(id,entry_id,sense_id,body) values($1,$2,$3,'history text')",[id(n+2),id(n),id(n+1)]);
 await pg.query("insert into dictionary_learning_notes(id,entry_id,kind,body) values($1,$2,'core_concept','core')",[id(n+3),id(n)]);
 await pg.exec('reset role');
 await pg.query("insert into dictionary_pronunciations(id,entry_id,sense_id,ipa,sort_order) values($1,$2,$3,'/test/',0)",[id(n+4),id(n),id(n+1)]);
 await pg.query("insert into dictionary_examples(id,entry_id,sense_id,body,sort_order) values($1,$2,$3,'example',0)",[id(n+5),id(n),id(n+1)]);
 if(kind==='word')await pg.query("insert into dictionary_inflections(id,entry_id,sense_id,form_kind,form,sort_order) values($1,$2,$3,'plural','tests',0)",[id(n+6),id(n),id(n+1)]);
 await pg.exec('set role authenticated');

 await pg.query('select publish_dictionary_entry($1,true)',[id(n)]);s=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[id(n)]);
 const review=await sql(pg,"select create_dictionary_review($1,$2::jsonb,null,'manual',false) v",[id(n),JSON.stringify(s)]);
 if(kind==='word'){
 await pg.exec('reset role');
 const payload={id:'private',owner_id:owner,front:'my word',back:'我的內容',dictionary_entry_id:id(n)};
 await pg.query('insert into study_cards values($1,$2,$3)',[owner,'private',JSON.stringify(payload)]);
 await pg.query('insert into study_card_states values($1,$2,$3)',[owner,'private',JSON.stringify({...payload,state:'Review',due:999})]);
 await pg.query('insert into study_review_events values($1,$2,$3,$4)',[owner,'event','private',JSON.stringify({id:'event',owner_id:owner,kind:'review'})]);
 await pg.query('insert into study_card_dictionary_links values($1,$2,$3)',[owner,'private',id(n)]);await pg.exec('set role authenticated');
 }
 const result=await remove(pg,s,900+i);assert.equal(result.deleted,true);assert.equal(await sql(pg,'select get_dictionary_entry($1) v',[id(n)]),null);assert.deepEqual(await remove(pg,s,900+i),result);
 assert.equal(await sql(pg,"select state v from dictionary_review_drafts where id=$1",[review.id]),'discarded');
 assert.ok(await sql(pg,'select count(*)::int v from dictionary_published_revisions where entry_id=$1',[id(n)]));
 for(const t of ['dictionary_senses','dictionary_etymologies','dictionary_learning_notes','dictionary_inflections','dictionary_pronunciations','dictionary_examples'])assert.equal(await sql(pg,'select count(*)::int v from '+t+' where entry_id=$1',[id(n)]),0);
 await assert.rejects(pg.query("insert into dictionary_entries(id,kind,headword) values($1,$2,'resurrect')",[id(n),kind]),/permanently deleted/);
 }
 assert.equal(await sql(pg,"select count(*)::int v from study_cards"),1);assert.equal(await sql(pg,"select payload->>'front' v from study_cards"),'my word');assert.equal(await sql(pg,"select payload->>'due' v from study_card_states"),'999');assert.equal(await sql(pg,"select count(*)::int v from study_review_events"),1);assert.equal(await sql(pg,"select count(*)::int v from study_card_dictionary_links"),0);
 }finally{await pg.close();}
});
test('admin/anon checks, revision and full snapshot CAS, external public/official references, unknown FK and receipt failure roll back',async()=>{
 const pg=await setup();try{
 const s=await seed(pg,100,'root');const word=await seed(pg,200,'word',false);
 await pg.query('insert into dictionary_relations(id,entry_id,sense_id,target_entry_id,target_sense_id) values($1,$2,null,$3,$4)',[id(210),id(200),id(100),id(101)]);
 await assert.rejects(remove(pg,s,900),/Other entries/);assert.ok(await sql(pg,'select get_dictionary_entry($1) v',[id(100)]));
 await pg.exec('reset role');await pg.query('delete from dictionary_relations where id=$1',[id(210)]);await pg.query('insert into official_study_pack_entries values($1,$2)',['pack',id(100)]);await pg.exec('set role authenticated');await assert.rejects(remove(pg,s,900),/Official study packs/);
 await pg.exec('reset role');await pg.query('delete from official_study_pack_entries where dictionary_entry_id=$1',[id(100)]);await pg.exec('set role authenticated');
 await assert.rejects(remove(pg,{...s,detail:{...s.detail,entry:{...s.detail.entry,revision:99}}},900),/changed/);
 await assert.rejects(remove(pg,{...s,grouping:{primary_category:'tampered'}},900),/changed/);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(900001)]);await assert.rejects(remove(pg,s,900),/admin/);await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 await pg.exec("reset role;create table test_entry_reference(entry_id uuid references dictionary_entries(id));");await pg.query('insert into test_entry_reference values($1)',[id(100)]);await pg.exec('set role authenticated');await assert.rejects(remove(pg,s,900),/still referenced/);assert.ok(await sql(pg,'select get_dictionary_entry($1) v',[id(100)]));assert.equal(await sql(pg,"select count(*)::int v from dictionary_audit where operation='DELETE_ENTRY'"),0);
 await pg.exec("reset role;drop table test_entry_reference;alter table dictionary_import_operations add constraint fail_delete_receipt check(source_type<>'delete_entry') not valid;set role authenticated");await assert.rejects(remove(pg,s,900),/fail_delete_receipt/);assert.ok(await sql(pg,'select get_dictionary_entry($1) v',[id(100)]));assert.equal(await sql(pg,"select count(*)::int v from dictionary_audit where operation='DELETE_ENTRY'"),0);
 await pg.exec('reset role;set role anon');await assert.rejects(remove(pg,s,900),/permission/);
 }finally{await pg.close();}
});
test('confirmation cancels without mutation; lost reply retries the same operation and snapshot',async()=>{
 const {deleteDictionaryEntry}=require('../src/features/dictionary/deleteEntry.ts');const entry={id:id(10),revision:2};let writes=0,reads=0;const request={id:id(900)};
 const client={rpc:async(name,args)=>{if(name==='get_dictionary_ai_snapshot'){reads++;return {data:{detail:{entry}}};}writes++;if(writes===1)return {error:{message:'lost response'}};return {data:{deleted:true,entry_id:entry.id}};}};
 assert.equal(await deleteDictionaryEntry(client,entry,async()=>false,request),false);assert.equal(writes,0);assert.equal(request.snapshot,undefined);
 await assert.rejects(deleteDictionaryEntry(client,entry,async()=>true,request),/lost response/);assert.ok(request.snapshot);assert.equal(await deleteDictionaryEntry(client,entry,async()=>true,request),true);assert.equal(reads,2);assert.equal(writes,2);
});
