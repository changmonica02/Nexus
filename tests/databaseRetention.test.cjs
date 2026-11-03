require('./loadStudy.cjs');require('fake-indexeddb/auto');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=process.env.NEXUS_TEST_POSTGRES_CONTAINER?require('./fixtures/postgresContainer.cjs'):require('@electric-sql/pglite');
const {mapDictionaryDraft}=require('../src/features/dictionary/draftPipeline.ts');
const {createStudyEvent,emptyStudyState}=require('../src/features/study/studyFSRS.ts');
const migration=fs.readFileSync('supabase/migrations/20261103021039_dictionary_current_content_only.sql','utf8');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,owner=id(1);
const files=['20260922_study_fsrs.sql','20260930_public_dictionary.sql','20261001_dictionary_admin.sql','20261002_dictionary_reader.sql','20261003_study_dictionary_links.sql','20261004_dictionary_delete_draft_sense.sql','20261005_dictionary_grouping.sql','20261006_dictionary_prefix_sense_groups.sql','20261007_dictionary_ai_roundtrip.sql','20261010_dictionary_delete_drafts.sql','20261011_dictionary_delete_draft_content.sql','20261012_dictionary_retire_sources.sql','20261013_dictionary_draft_pipeline.sql','20261014_dictionary_revision_lifecycle.sql','20261017_dictionary_entry_identity.sql','20261018_dictionary_pronunciations.sql','20261019_dictionary_admin_bulk_publish.sql','20261020_dictionary_edit_inflections.sql','20261021_dictionary_composition_shared.sql','20261013064759_dictionary_pagination_totals.sql','20261013084116_dictionary_bulk_exchange.sql','20261015020759_dictionary_persistent_import_review.sql','20261016050000_dictionary_retire_source_forms.sql','20261016060000_dictionary_retire_verification_state.sql','20261017010000_dictionary_core_concept.sql','20261017020000_dictionary_ranked_components.sql','20261018010000_dictionary_entry_deletion.sql','20261016_study_reliability.sql'];
async function setup(){
 const pg=new PGlite();await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;`);
 for(const file of files)await pg.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 await pg.exec(`create table official_study_pack_entries(pack_id text,dictionary_entry_id uuid references dictionary_entries(id));create table pages(id text primary key,owner_id uuid,content_json jsonb,attachment_ids jsonb,character_data jsonb,deleted_at bigint);create table attachments(id text primary key,owner_id uuid);create table binaries(id text primary key,owner_id uuid,data text);
 create schema cron;create table cron.job(jobid bigint generated always as identity primary key,jobname text unique,schedule text,command text);
 create function cron.schedule(job_name text,schedule text,command text) returns bigint language sql as $$insert into cron.job(jobname,schedule,command) values($1,$2,$3) returning jobid$$;
 create function cron.alter_job(job_id bigint,command text) returns void language sql as $$update cron.job set command=$2 where jobid=$1$$;
 insert into cron.job(jobname,schedule,command) values('nexus-import-history-3d','15 3 * * *','DELETE FROM public.dictionary_import_operations WHERE source_type IN (''csv'',''json'') AND created_at < now() - interval ''3 days''');`);
 await pg.query('insert into auth.users values($1),($2)',[owner,id(2)]);await pg.query('insert into dictionary_admins(user_id) values($1)',[owner]);await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 return pg;
}
const sql=async(pg,q,args=[])=>(await pg.query(q,args)).rows[0]?.v;
const draft=(n,name,kind='word')=>({entry_id:id(n),kind,headword:name,senses:[{id:id(n+1),part_of_speech:kind==='word'?'noun':null,gloss_zh_tw:name}],relations:[],etymologies:[],learning_notes:[],examples:[],lexical_annotations:[],relation_hints:[]});
async function save(pg,d){return sql(pg,'select apply_dictionary_drafts($1,false,true) v',[JSON.stringify([mapDictionaryDraft(d)])]);}
async function snapshot(pg,n){return sql(pg,'select get_dictionary_ai_snapshot($1) v',[id(n)]);}
async function review(pg,n){return sql(pg,"select create_dictionary_review($1,$2,null,'manual',false) v",[id(n),JSON.stringify(await snapshot(pg,n))]);}
async function apply(pg){try{await pg.exec(migration);}catch(e){await pg.exec('rollback');throw e;}}

test('retention migration preserves current content/active work, deletes archives, keeps compact retry and offline safety',async()=>{
 const pg=await setup();try{
 await pg.exec('set role authenticated');
 await save(pg,draft(10,'pre','prefix'));await sql(pg,'select publish_dictionary_entry($1,true) v',[id(10)]);
 const word=draft(20,'current');word.relations=[{id:id(24),entry_id:id(20),sense_id:id(21),target_entry_id:id(10),target_sense_id:id(11)}];word.examples=[{id:id(22),entry_id:id(20),sense_id:id(21),body:'current example',sort_order:0}];
 await save(pg,word);await sql(pg,'select publish_dictionary_entry($1,true) v',[id(20)]);
 const stale=await review(pg,20),approved=await review(pg,20);await sql(pg,'select approve_dictionary_review($1,$2,true) v',[approved.id,approved.revision]);
 const active=await review(pg,20),discarded=await review(pg,10);await sql(pg,'select discard_dictionary_review($1,$2) v',[discarded.id,discarded.revision]);
 await save(pg,draft(40,'deleted'));await sql(pg,'select publish_dictionary_entry($1,true) v',[id(40)]);const deletedSnapshot=await snapshot(pg,40);await sql(pg,'select delete_dictionary_entry($1,$2,$3,$4) v',[id(40),deletedSnapshot.detail.entry.revision,JSON.stringify(deletedSnapshot),id(400)]);
 const quick=await sql(pg,'select quick_create_dictionary_component($1,\'root\',\'compact\',true) v',[id(500)]);
 const before=await snapshot(pg,20),prefixBefore=await snapshot(pg,10);
 await pg.exec('reset role');
 const card={id:'card',owner_id:owner,deck_id:'deck',front:'word',back:'字',content_revision:1,updated_at:1};const state=emptyStudyState(card),event=createStudyEvent(card,state,'review',1800000000000,'offline-device','event',3);
 await sql(pg,"select apply_study_operation($1) v",[JSON.stringify({kind:'card',value:card})]);await sql(pg,"select apply_study_operation($1) v",[JSON.stringify({kind:'seed',value:state})]);await sql(pg,"select apply_study_operation($1) v",[JSON.stringify({kind:'event',value:event})]);
 await pg.query('insert into study_card_dictionary_links values($1,$2,$3)',[owner,'card',id(20)]);
 const fsrsBefore=await sql(pg,"select jsonb_build_object('state',(select payload from study_card_states where id='card'),'events',(select jsonb_agg(payload) from study_review_events)) v");
 const cursor=await sql(pg,'select coalesce(max(sequence),0)::int v from study_sync_changes');
 await pg.query("insert into dictionary_import_operations(owner_id,operation_id,session_id,source_type,preview_at,request,result,created_at) values($1,$2,$2,'csv',now(),'{}','{}',now()-interval '7 days'),($1,$3,$3,'json',now(),'{}','{}',now()-interval '1 day')",[owner,id(600),id(601)]);
 await pg.query("update dictionary_import_operations set created_at=now()-interval '7 days' where source_type in ('quick_component','delete_entry')");
 for(const [n,status,pending,days] of [[700,'applied',0,7],[701,'pending',0,7],[702,'failed',1,7],[703,'applied',0,1]])await pg.query("insert into dictionary_import_review_items(id,proposal_key,entry_id,source,item,pending_count,created_by,updated_by,updated_at) values($1::uuid,$1::uuid::text,$2,'{}',$3,$4,$5,$5,now()-$6::double precision*interval '1 day')",[id(n),id(20),JSON.stringify({status,issues:[]}),pending,owner,days]);
 await pg.query("insert into dictionary_bulk_publish_previews(id,actor_id,kind_filters,query_text,plan,baselines,expires_at) values($1,$2,'{}','','[]','{}',now()-interval '1 hour'),($3,$2,'{}','','[]','{}',now()+interval '1 hour')",[id(800),owner,id(801)]);
 await pg.query("insert into pages values('page',$1,$2,'[]',$3,null)",[owner,JSON.stringify({type:'doc',content:[{attrs:{attachmentId:'pdf'}}]}),JSON.stringify({world_maps:[{attachment_id:'map'}]})]);await pg.query("insert into attachments values('pdf',$1),('map',$1),('not-uploaded-yet',$1)",[owner]);await pg.query("insert into binaries values('pdf',$1,'PDF'),('map',$1,'MAP')",[owner]);
 const activeBefore=await sql(pg,"select jsonb_agg(jsonb_build_object('id',id,'base',base_snapshot,'candidate',candidate) order by id) v from dictionary_review_drafts where state='active'");
 // An external dependency aborts all cleanup rather than cascading out of the backup namespace.
 await pg.exec("create table dictionary_core_backup.extra(payload text);insert into dictionary_core_backup.extra values('old');create view public.retention_dependency as select * from dictionary_core_backup.extra;");
 await assert.rejects(apply(pg),/depend|cannot drop/i);assert.ok(await sql(pg,"select to_regclass('dictionary_audit')::text v"));assert.equal(await sql(pg,"select to_regclass('dictionary_deleted_ids')::text v"),null);await pg.exec('drop view public.retention_dependency');
 // A newly referenced retired source must stop the transaction without losing content.
 await pg.exec("alter table dictionary_sources disable trigger user;insert into dictionary_sources(id,citation,license,raw_text,sha256) values('00000000-0000-4000-8000-000000000999','source','test','old content',repeat('a',64));alter table dictionary_sources enable trigger user;alter table dictionary_entries disable trigger user;");
 await pg.query('update dictionary_entries set source_id=$1 where id=$2',[id(999),id(10)]);
 await pg.exec('alter table dictionary_entries enable trigger user');
 await assert.rejects(apply(pg),/Live source references/);
 assert.ok(await sql(pg,"select to_regclass('dictionary_audit')::text v"));
 await pg.exec('alter table dictionary_entries disable trigger user');await pg.query('update dictionary_entries set source_id=null where id=$1',[id(10)]);await pg.exec('alter table dictionary_entries enable trigger user');
 await apply(pg);
 assert.equal(await sql(pg,"select count(*)::int v from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and p.prosrc ~ 'public\\.(dictionary_audit|dictionary_published_revisions|dictionary_sources)'"),0);
 for(const name of ['dictionary_audit','dictionary_published_revisions','dictionary_sources'])assert.equal(await sql(pg,'select to_regclass($1)::text v',[name]),null);
 for(const name of ['dictionary_core_backup','dictionary_verification_backup','dictionary_retirement_backup'])assert.equal(await sql(pg,'select to_regnamespace($1)::text v',[name]),null);
 assert.equal(await sql(pg,"select count(*)::int v from pg_trigger t join pg_proc p on p.oid=t.tgfoid where not t.tgisinternal and p.proname in ('dictionary_audit_change','audit_dictionary_extension','audit_dictionary_sense_group')"),0);
 assert.deepEqual(await snapshot(pg,20),before);assert.deepEqual(await snapshot(pg,10),prefixBefore);
 assert.deepEqual(await sql(pg,"select jsonb_agg(jsonb_build_object('id',id,'base',base_snapshot,'candidate',candidate) order by id) v from dictionary_review_drafts"),activeBefore);
 assert.equal(await sql(pg,'select count(*)::int v from dictionary_review_drafts'),2);
 assert.equal(await sql(pg,'select count(*)::int v from dictionary_import_operations where operation_id=$1',[id(600)]),0);assert.equal(await sql(pg,'select count(*)::int v from dictionary_import_operations where operation_id=$1',[id(601)]),1);
 assert.equal(await sql(pg,'select count(*)::int v from dictionary_import_review_items'),3);assert.equal(await sql(pg,'select count(*)::int v from dictionary_bulk_publish_previews'),1);
 assert.equal(await sql(pg,'select count(*)::int v from cron.job'),1);const job=await sql(pg,'select command v from cron.job');assert.match(job,/3 days/);assert.match(job,/pending_count=0/);
 assert.deepEqual(await sql(pg,"select jsonb_build_object('state',(select payload from study_card_states where id='card'),'events',(select jsonb_agg(payload) from study_review_events)) v"),fsrsBefore);
 assert.equal(await sql(pg,'select count(*)::int v from binaries'),2);assert.equal(await sql(pg,'select count(*)::int v from attachments'),3);
 await pg.exec('set role authenticated');
 // Fresh writes after retirement exercise publication wrappers and editor child replacement.
 await save(pg,draft(60,'fresh'));
 const bulk=await sql(pg,"select preview_dictionary_bulk_publish('{}','fresh') v");
 assert.equal((await sql(pg,"select publish_dictionary_bulk('{}','fresh',$1,true) v",[bulk.signature])).published,1);
 assert.ok((await sql(pg,"select quick_create_dictionary_component($1,'prefix','new-prefix',true) v",[id(501)])).id);
 await assert.rejects(sql(pg,"select quick_create_dictionary_component($1,'prefix','different-prefix',true) v",[id(501)]),/reused/);
 const editor=draft(70,'editor');editor.relations=[{id:id(74),entry_id:id(70),sense_id:id(71),target_entry_id:id(10),target_sense_id:id(11)}];await save(pg,editor);
 const savedEditor=await snapshot(pg,70);const replacement=mapDictionaryDraft({...editor,revision:savedEditor.detail.entry.revision,relations:[],senses:savedEditor.detail.senses});replacement.replace_editor_children=true;
 await sql(pg,'select apply_dictionary_drafts($1,false,true) v',[JSON.stringify([replacement])]);assert.equal(await sql(pg,'select count(*)::int v from dictionary_relations where entry_id=$1',[id(70)]),0);
 assert.deepEqual(await sql(pg,'select quick_create_dictionary_component($1,\'root\',\'compact\',true) v',[id(500)]),quick);
 assert.equal(await sql(pg,"select request ? 'fingerprint' v from dictionary_import_operations where operation_id=$1",[id(500)]),true);
 assert.deepEqual(await sql(pg,'select result v from dictionary_import_operations where operation_id=$1',[id(500)]),{id:quick.id});
 assert.equal((await sql(pg,'select delete_dictionary_entry($1,$2,$3,$4) v',[id(40),deletedSnapshot.detail.entry.revision,JSON.stringify(deletedSnapshot),id(400)])).deleted,true);
 await assert.rejects(save(pg,draft(40,'resurrected')),/permanently deleted/);
 await assert.rejects(sql(pg,'select approve_dictionary_review($1,$2,true) v',[stale.id,stale.revision]),/Stale/);
 assert.equal((await sql(pg,'select approve_dictionary_review($1,$2,true) v',[active.id,active.revision])).published,true);
 assert.equal(await sql(pg,'select count(*)::int v from dictionary_review_drafts where id=$1',[active.id]),0);
 await assert.rejects(sql(pg,'select approve_dictionary_review($1,$2,true) v',[active.id,active.revision]),/revision conflict/);
 const pending=await review(pg,10);await sql(pg,'select discard_dictionary_review($1,$2) v',[pending.id,pending.revision]);assert.equal(await sql(pg,'select count(*)::int v from dictionary_review_drafts where id=$1',[pending.id]),0);
 const latest=await snapshot(pg,20);await sql(pg,'select delete_dictionary_entry($1,$2,$3,$4) v',[id(20),latest.detail.entry.revision,JSON.stringify(latest),id(900)]);assert.equal(await sql(pg,'select count(*)::int v from study_card_dictionary_links'),0);assert.equal(await sql(pg,'select count(*)::int v from study_review_events'),1);
 await pg.exec('reset role');
 // Many writes coalesce to the latest sequence. A years-old cursor still gets deletion.
 for(let i=0;i<30;i++)await pg.query("insert into study_deck_settings values($1,'temporary',$2) on conflict(owner_id,id) do update set payload=excluded.payload",[owner,JSON.stringify({id:'temporary',owner_id:owner,updated_at:i})]);
 await pg.query("delete from study_deck_settings where owner_id=$1 and id='temporary'",[owner]);const delta=await sql(pg,'select pull_study_changes($1) v',[cursor]);assert.equal(delta.filter(c=>c.id==='temporary').length,1);assert.equal(delta.find(c=>c.id==='temporary').deleted,true);assert.equal(await sql(pg,"select count(*)::int v from study_sync_changes where id='temporary'"),1);
 // Physical compaction must not change the cursor, event log, attachment bytes or state.
 const syncBefore=await sql(pg,'select jsonb_agg(to_jsonb(s) order by sequence) v from study_sync_changes s');
 const maintenance=fs.readFileSync('supabase/maintenance/reclaim_retained_storage.sql','utf8');
 for(const statement of maintenance.replace(/^--.*$/gm,'').split(';').filter(s=>/\S/.test(s)))await pg.exec(statement+';');
 assert.deepEqual(await sql(pg,'select jsonb_agg(to_jsonb(s) order by sequence) v from study_sync_changes s'),syncBefore);assert.deepEqual(await sql(pg,"select jsonb_build_object('state',(select payload from study_card_states where id='card'),'events',(select jsonb_agg(payload) from study_review_events)) v"),fsrsBefore);
 await pg.exec(job);assert.equal(await sql(pg,"select count(*)::int v from dictionary_import_review_items where item->>'status' in ('pending','failed')"),2);
 await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);await assert.rejects(pg.query('select * from dictionary_deleted_ids'),/permission denied/);await assert.rejects(sql(pg,'select create_dictionary_review($1,$2,null,\'manual\',false) v',[id(10),JSON.stringify(prefixBefore)]),/admin/);assert.deepEqual(await sql(pg,'select pull_study_changes(0) v'),[]);
 }finally{await pg.close();}
});
