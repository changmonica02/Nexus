require('./loadStudy.cjs');require('fake-indexeddb/auto');
const {PGlite}=require('@electric-sql/pglite');
const {openDB,deleteDB}=require('idb');
const fs=require('node:fs');const test=require('node:test');const assert=require('node:assert/strict');
const {StudyRepository,STUDY_STORES}=require('../src/features/study/StudyRepository.ts');
const {syncStudy}=require('../src/features/study/studySync.ts');
const {createStudyEvent}=require('../src/features/study/studyFSRS.ts');
const owner='11111111-1111-4111-8111-111111111111';
test('real PostgreSQL migration: retry after lost response, event deduplication, conflict retention, owner isolation',async()=>{
 const pg=new PGlite();const dbName=crypto.randomUUID();let db;
 try{
 await pg.exec(`create schema auth; create role authenticated; create role anon;
 create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth to authenticated,anon;`);
 const sql=fs.readFileSync('supabase/migrations/20260922_study_fsrs.sql','utf8');
 await pg.exec(sql);await pg.exec(sql);
 await pg.exec(fs.readFileSync('supabase/migrations/20261016_study_reliability.sql','utf8'));
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 db=await openDB(dbName,1,{upgrade(db){for(const name of STUDY_STORES){const store=db.createObjectStore(name,{keyPath:'id'});if(['study_cards','study_states','study_events'].includes(name))store.createIndex('deck','deck_id');}}});
 const repo=new StudyRepository(db,()=>owner,'device');
 await repo.ensureDeck({id:'deck',workspace_owner_id:owner,study_items:[]});await repo.addCards('deck',[{front:'word',back:'字'}]);
 const now=Date.now(),q=await repo.presentNext('deck',now);
 const event=await repo.review(q.card.id,q.state.head,1,3,'event-one',now);
 // Simulate a pending operation written before sessions became local-only.
 const queued=(await repo.pending()).find(op=>op.kind==='event'&&op.value.id===event.id);
 await db.put('study_outbox',{...queued,session:{id:'local-session',targets:[]}});
 let loseResponse=true;
 const rpc=async(operation)=>{
   try{await pg.query('select apply_study_operation($1::jsonb)',[JSON.stringify(operation)]);return {error:null};}
   catch(e){return {error:{message:e.message}};}
 };
 const client={rpc:async(name,{operation,after_sequence})=>{
   if(name==='pull_study_changes')return {data:(await pg.query('select pull_study_changes($1) as changes',[after_sequence])).rows[0].changes,error:null};
   if(name==='apply_study_resolution')return {data:(await pg.query('select apply_study_resolution($1) as ok',[JSON.stringify(operation)])).rows[0].ok,error:null};
   assert.equal('session' in operation,false,'even old queued session envelopes must stay local');
   const result=await rpc(operation);
   if(loseResponse&&operation.kind==='event'&&operation.value.id==='event-one'&&!result.error){loseResponse=false;return {error:{message:'response lost'}};}
   return result;
 },from:table=>({select:()=>({eq:()=>({order:()=>({range:async(start,end)=>{
   const result=await pg.query(`select payload from ${table} where owner_id=$1 order by id offset $2 limit $3`,[owner,start,end-start+1]);return {data:result.rows,error:null};
 }})})})})};
 await assert.rejects(()=>syncStudy(repo,client,owner),/response lost/);
 assert.ok((await repo.pending()).some(op=>op.kind==='event'&&op.value.id==='event-one'));
 await syncStudy(repo,client,owner);
 assert.equal((await repo.pending()).length,0);
 assert.equal((await pg.query("select count(*)::int as n from study_review_events where payload->>'kind'='review'")).rows[0].n,1);
 assert.equal((await repo.readDeck('deck',true)).states[0].head,event.id);
 // A second device migrating an old pages.study_items copy cannot overwrite edited content/settings.
 const edited={...q.card,back:'新答案',content_revision:2,updated_at:now+100,migration_only:false};
 assert.equal((await rpc({kind:'card',value:edited})).error,null);
 assert.equal((await rpc({kind:'card',initial:true,value:{...q.card,updated_at:now+99999}})).error,null);
 assert.equal((await pg.query('select payload from study_cards where id=$1',[q.card.id])).rows[0].payload.back,'新答案');
 // A simultaneous offline branch is stored, but never silently replaces the first result.
 const branch=createStudyEvent(q.card,q.state,'review',now+1,'other-device','other-event',1);
 assert.equal((await rpc({kind:'event',value:branch})).error,null);
 await syncStudy(repo,client,owner);
 let snapshot=await repo.readDeck('deck',true);assert.equal(snapshot.events.filter(e=>e.kind==='review').length,2);assert.equal(snapshot.states[0].conflict,true);assert.equal(snapshot.states[0].head,event.id);assert.equal(snapshot.states[0].ambiguity.candidates.length,2);
 await repo.updateCard(q.card.id,{},true);await syncStudy(repo,client,owner);
 snapshot=await repo.readDeck('deck',true);assert.equal(snapshot.states[0].conflict,false);assert.equal(snapshot.states[0].fsrs,null);assert.equal(snapshot.events.filter(e=>e.kind==='review').length,2);
 // The function cannot write another owner and clients cannot directly delete history.
 await pg.exec('set role authenticated');
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",['22222222-2222-4222-8222-222222222222']);
 assert.equal((await pg.query('select * from study_review_events')).rows.length,0);
 assert.ok((await rpc({kind:'event',value:branch})).error);
 await assert.rejects(()=>pg.exec('delete from study_review_events'),/permission denied/);
 await pg.exec('reset role');
 }finally{if(db){db.close();await deleteDB(dbName);}await pg.close();}
});
