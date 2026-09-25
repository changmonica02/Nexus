require('./loadStudy.cjs');require('fake-indexeddb/auto');
const {openDB,deleteDB}=require('idb');
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),test=require('node:test'),assert=require('node:assert/strict');
const {StudyRepository,STUDY_STORES}=require('../src/features/study/StudyRepository.ts');
const {QUIZ_STORES,QUIZ_SCORE}=require('../src/features/study/quiz/quizPersistence.ts');
const {syncQuiz}=require('../src/features/study/quiz/quizSync.ts');
const {syncStudy}=require('../src/features/study/studySync.ts');
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
async function fixture(){
 const name=crypto.randomUUID(),db=await openDB(name,1,{upgrade(db){
  for(const name of [...STUDY_STORES,...QUIZ_STORES]){
   const s=db.createObjectStore(name,{keyPath:'id'});
   if(['study_cards','study_states','study_events'].includes(name))s.createIndex('deck','deck_id');
  }
 }});
 const repo=new StudyRepository(db,()=>owner,'device');
 await repo.ensureDeck({id:'deck',workspace_owner_id:owner,study_items:[]});
 await repo.addCards('deck',[{front:'word',back:'字'}]);
 const card=(await repo.readDeck('deck')).cards[0];
 const daily=await repo.startSession('deck','daily',1000),state=(await repo.readDeck('deck')).states[0];
 await repo.rateSession({sessionId:daily.id,cardId:card.id,revision:daily.revision,contentRevision:card.content_revision,expectedHead:state.head,rating:4,actionId:crypto.randomUUID(),now:1000});
 const quiz=repo.getQuizRepository();
 return {name,db,repo,quiz,card,record:(correct=false,batchId='batch',eventId=crypto.randomUUID())=>quiz.record({cardId:card.id,correct,batchId,eventId,now:2000}),
 close:async()=>{db.close();await deleteDB(name);}};
}
async function server(f){
 const pg=new PGlite();
 await pg.exec("create schema auth; create role authenticated; create role anon; create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema public,auth to authenticated,anon;");
 await pg.exec(fs.readFileSync('supabase/migrations/20260922_study_fsrs.sql','utf8'));
 await pg.exec(fs.readFileSync('supabase/migrations/20260925_study_quiz_persistence.sql','utf8'));
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 await pg.query('insert into study_cards values($1,$2,$3)',[owner,f.card.id,JSON.stringify(f.card)]);
 const rpc=async attempt=>{
  try{return {data:(await pg.query('select apply_study_quiz_operation($1::jsonb) as state',[JSON.stringify(attempt)])).rows[0].state,error:null};}
  catch(e){return {data:null,error:{message:e.message,code:e.code}};}
 };
 const tables=['study_cards','study_card_states','study_review_events','study_deck_settings','study_card_quiz_states'];
 const client={rpc:async(name,{attempt,operation})=>{
  if(name==='apply_study_quiz_operation')return rpc(attempt);
  assert.equal(name,'apply_study_operation');
  try{await pg.query('select apply_study_operation($1::jsonb)',[JSON.stringify(operation)]);return {error:null};}
  catch(e){return {error:{message:e.message,code:e.code}};}
 },
 from:table=>{assert.ok(tables.includes(table));return {select:()=>({eq:(_key,user)=>({order:()=>({range:async(start,end)=>({data:(await pg.query('select * from '+table+' where owner_id=$1 order by '+(table==='study_card_quiz_states'?'card_id':'id')+' offset $2 limit $3',[user,start,end-start+1])).rows,error:null})})})})};}};
 return {pg,rpc,client};
}

test('online authorized; offline decisions persist and authorize only the displayed IDs',async()=>{
 const f=await fixture();try{
 const online=await f.record();assert.equal(online.status,'authorized');assert.equal((await f.quiz.pending()).length,1);
 f.quiz.setReachable(false);
 const a=await f.record(false,'A'),b=await f.record(false,'B');
 assert.equal(a.status,'awaiting_decision');assert.equal((await f.quiz.pending()).length,1);
 await f.quiz.decide([a.id],'later');assert.equal((await f.quiz.awaiting()).length,2);
 await f.quiz.decide([a.id],'upload');
 const later=await f.record(false,'A'); // Even new attempts sharing a batch stay unapproved.
 assert.equal((await f.quiz.pending()).length,2);
 assert.deepEqual(new Set((await f.quiz.awaiting()).map(a=>a.id)),new Set([b.id,later.id]));
 await f.quiz.decide([b.id],'discard');assert.equal((await f.quiz.attempts()).find(a=>a.id===b.id).status,'discarded');
 await f.quiz.decide([online.id],'discard');assert.equal((await f.quiz.attempts()).find(a=>a.id===online.id).status,'authorized');
 const {QuizRepository}=require('../src/features/study/quiz/quizPersistence.ts');
 const reopened=new QuizRepository(f.db,()=>owner);
 assert.equal((await reopened.pending()).length,2);assert.equal((await reopened.awaiting()).length,1);
 }finally{await f.close();}
});

test('confirmation requires successful API health, excludes authorized, and discard snapshot excludes later arrivals',async()=>{
 const f=await fixture();try{
 assert.equal(f.quiz.canOfferUpload(),false);
 const online=await f.record();
 f.quiz.setReachable(false);const a=await f.record(false,'A');
 const ids=(await f.quiz.awaiting()).map(a=>a.id);
 const b=await f.record(false,'B');
 f.quiz.setReachable(true);assert.equal(f.quiz.canOfferUpload(),true);
 await f.quiz.decide(ids,'discard');
 assert.equal((await f.quiz.attempts()).find(x=>x.id===a.id).status,'discarded');
 assert.equal((await f.quiz.attempts()).find(x=>x.id===b.id).status,'awaiting_decision');
 assert.equal((await f.quiz.attempts()).find(x=>x.id===online.id).status,'authorized');
 const before=await f.quiz.attempts();await f.quiz.decide([b.id],'later');assert.deepEqual(await f.quiz.attempts(),before);
 }finally{await f.close();}
});

test('deck quiz direction persists on reload and syncs to another device without touching FSRS',async()=>{
 const f=await fixture(),computer=await fixture(),s=await server(f);try{
 const {DEFAULT_QUIZ_DIRECTION}=require('../src/features/study/quiz/quizQuestions.ts');
 assert.equal((await f.repo.readDeck('deck')).settings.quiz_direction??DEFAULT_QUIZ_DIRECTION,'zh-en');
 const before=await f.repo.exportData();
 await f.repo.configure('deck',{quiz_direction:'en-zh'});
 const reopened=new StudyRepository(f.db,()=>owner,'reload');
 assert.equal((await reopened.readDeck('deck')).settings.quiz_direction,'en-zh');
 await syncStudy(f.repo,s.client,owner);
 const settings=(await s.pg.query('select payload from study_deck_settings')).rows.map(r=>r.payload);
 await computer.repo.mergeRemote({cards:[],states:[],events:[],settings,sessions:[]});
 assert.equal((await computer.repo.readDeck('deck')).settings.quiz_direction,'en-zh');
 const after=await f.repo.exportData();
 for(const field of ['states','events','sessions'])assert.deepEqual(after[field],before[field]);
 await assert.rejects(()=>f.repo.configure('deck',{quiz_direction:'bad'}),/無效/);
 }finally{await s.pg.close();await f.close();await computer.close();}
});

test('ordinary sync never uploads awaiting attempts; approved attempts sync and pull leaves FSRS untouched',async()=>{
 const f=await fixture(),s=await server(f);try{
 const review=await f.repo.startSession('deck','free',1500),state=(await f.repo.readDeck('deck')).states[0];
 await f.repo.rateSession({sessionId:review.id,cardId:f.card.id,revision:review.revision,contentRevision:f.card.content_revision,expectedHead:state.head,rating:3,actionId:crypto.randomUUID(),now:1500});
 await syncStudy(f.repo,s.client,owner);
 const before=await f.repo.exportData();
 assert.ok(before.states[0].fsrs);
 const cloudBefore=(await s.pg.query('select payload from study_card_states')).rows;
 const eventsBefore=(await s.pg.query('select payload from study_review_events order by id')).rows;
 f.quiz.setReachable(false);const a=await f.record();
 await syncStudy(f.repo,s.client,owner);
 assert.equal((await s.pg.query('select count(*)::int n from study_quiz_attempt_receipts')).rows[0].n,0);
 assert.equal((await f.quiz.awaiting()).length,1);
 await f.quiz.decide([a.id],'upload');await syncStudy(f.repo,s.client,owner);
 assert.equal((await f.quiz.states())[0].mistake_score,1);
 assert.equal((await f.quiz.pending()).length,0);
 assert.equal((await f.quiz.attempts())[0].status,'synced');
 assert.deepEqual(await f.repo.exportData(),before);
 assert.deepEqual((await s.pg.query('select payload from study_card_states')).rows,cloudBefore);
 assert.deepEqual((await s.pg.query('select payload from study_review_events order by id')).rows,eventsBefore);
 }finally{await s.pg.close();await f.close();}
});

test('response lost after commit retries same event; API failure makes new attempts awaiting',async()=>{
 const f=await fixture(),s=await server(f);try{
 const a=await f.record();
 let lost=true;
 const client={...s.client,rpc:async(...args)=>{const result=await s.client.rpc(...args);if(lost){lost=false;throw new Error('response lost');}return result;}};
 await assert.rejects(()=>syncQuiz(f.quiz,client,owner),/response lost/);
 assert.equal((await f.quiz.pending()).length,1);
 const b=await f.record();assert.equal(b.status,'awaiting_decision');
 await syncQuiz(f.quiz,client,owner);await syncQuiz(f.quiz,client,owner);
 const state=(await f.quiz.states())[0];assert.equal(state.mistake_score,1);assert.equal(state.revision,1);
 assert.equal((await s.pg.query('select count(*)::int n from study_quiz_attempt_receipts')).rows[0].n,1);
 assert.equal((await f.quiz.attempts()).find(x=>x.id===a.id).status,'synced');
 }finally{await s.pg.close();await f.close();}
});

test('event identity rejects collisions; two-device wrongs apply once and processing order is authoritative',async()=>{
 const f=await fixture(),s=await server(f);try{
 const a=await f.record(),b={...a.payload,event_id:crypto.randomUUID(),batch_id:'computer'};
 const results=await Promise.all([s.rpc(a.payload),s.rpc(b)]);
 assert.ok(results.every(r=>!r.error));
 let result=await s.rpc(a.payload);assert.equal(result.data.mistake_score,2);assert.equal(result.data.revision,2);
 assert.equal((await s.rpc({...a.payload,correct:true})).error.message,'QUIZ_EVENT_COLLISION');
 assert.equal((await s.rpc({...a.payload,card_id:'different-card'})).error.message,'QUIZ_EVENT_COLLISION');
 // Sequential requests are the authoritative server order.
 for(let i=0;i<8;i++)result=await s.rpc({...a.payload,event_id:'wrong-'+i});
 assert.equal(result.data.mistake_score,QUIZ_SCORE.max);
 for(let i=0;i<8;i++)result=await s.rpc({...a.payload,event_id:'right-'+i,correct:true});
 assert.equal(result.data.mistake_score,QUIZ_SCORE.min);
 result=await s.rpc({...a.payload,event_id:'correct-first',correct:true});assert.equal(result.data.mistake_score,0);
 result=await s.rpc({...a.payload,event_id:'wrong-second'});assert.equal(result.data.mistake_score,1);
 result=await s.rpc({...a.payload,event_id:'correct-last',correct:true});assert.equal(result.data.mistake_score,0);
 assert.equal((await s.pg.query('select count(*)::int n from study_review_events')).rows[0].n,0);
 }finally{await s.pg.close();await f.close();}
});

test('second device pulls revisions; pending answers never replace shared aggregate',async()=>{
 const f=await fixture(),computer=await fixture(),s=await server(f);try{
 await computer.db.put('study_cards',f.card);
 await computer.db.put('study_states',(await f.repo.readDeck('deck')).states[0]);
 const a=await f.record();await syncQuiz(f.quiz,s.client,owner);
 computer.quiz.setReachable(false);
 await computer.quiz.record({cardId:f.card.id,correct:false,batchId:'offline',eventId:crypto.randomUUID(),now:3000});
 await syncQuiz(computer.quiz,s.client,owner);
 assert.equal((await computer.quiz.states())[0].mistake_score,1);
 assert.equal((await computer.quiz.awaiting()).length,1);
 const old=(await computer.quiz.states())[0];
 const b={...a.payload,event_id:crypto.randomUUID()};
 await s.rpc(b);await syncQuiz(computer.quiz,s.client,owner);
 await computer.quiz.merge([old]);
 assert.equal((await computer.quiz.states())[0].mistake_score,2);
 assert.equal((await computer.quiz.states())[0].revision,2);
 }finally{await s.pg.close();await f.close();await computer.close();}
});

test('owner isolation, RLS, deleted cards and permanent failures',async()=>{
 const f=await fixture(),s=await server(f);try{
 const a=await f.record();
 assert.equal((await s.rpc({...a.payload,owner_id:other})).error.message,'QUIZ_OWNER_MISMATCH');
 await s.pg.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
 assert.equal((await s.rpc({...a.payload,owner_id:other})).error.message,'QUIZ_CARD_UNAVAILABLE');
 await s.pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 await s.rpc(a.payload);
 await s.pg.exec('set role authenticated');
 await assert.rejects(()=>s.pg.exec('update study_card_quiz_states set mistake_score=4'),/permission denied/);
 await s.pg.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
 assert.equal((await s.pg.query('select * from study_card_quiz_states')).rows.length,0);
 assert.equal((await s.pg.query('select * from study_quiz_attempt_receipts')).rows.length,0);
 await s.pg.exec('reset role');
 await s.pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 await s.pg.query("update study_cards set payload=jsonb_set(payload,'{deleted_at}','123') where id=$1",[f.card.id]);
 assert.equal((await s.rpc(a.payload)).error,null,'already-applied retry still succeeds after deletion');
 const b=await f.record();
 await syncQuiz(f.quiz,s.client,owner);
 assert.equal((await f.quiz.attempts()).find(x=>x.id===b.id).status,'failed');
 assert.equal((await f.quiz.attempts()).find(x=>x.id===b.id).error,'QUIZ_CARD_UNAVAILABLE');
 assert.equal((await s.pg.query('select count(*)::int n from study_cards')).rows[0].n,1);
 const {QuizRepository}=require('../src/features/study/quiz/quizPersistence.ts');
 const wrongOwner=new QuizRepository(f.db,()=>other);
 await assert.rejects(()=>wrongOwner.decide([a.id],'upload'),/owner mismatch/);
 assert.deepEqual(await wrongOwner.attempts(),[]);
 }finally{await s.pg.close();await f.close();}
});

test('receipt insertion failure rolls back aggregate; local outbox failure rolls back attempt',async()=>{
 const f=await fixture(),s=await server(f);try{
 const a=await f.record();
 await s.pg.exec("create function fail_quiz_receipt() returns trigger language plpgsql as $$ begin raise exception 'test failure'; end $$; create trigger fail_receipt before insert on study_quiz_attempt_receipts for each row execute function fail_quiz_receipt();");
 assert.match((await s.rpc(a.payload)).error.message,/test failure/);
 assert.equal((await s.pg.query('select count(*)::int n from study_card_quiz_states')).rows[0].n,0);
 assert.equal((await s.pg.query('select count(*)::int n from study_quiz_attempt_receipts')).rows[0].n,0);
 await s.pg.exec('drop trigger fail_receipt on study_quiz_attempt_receipts');
 assert.equal((await s.rpc(a.payload)).data.revision,1);
 const prototype=IDBObjectStore.prototype,original=prototype.put;
 prototype.put=function(...args){if(this.name==='quiz_outbox')throw new Error('disk failure');return original.apply(this,args);};
 try{await assert.rejects(()=>f.record(),/disk failure/);}finally{prototype.put=original;}
 assert.equal((await f.quiz.attempts()).length,1);
 }finally{await s.pg.close();await f.close();}
});

test('IndexedDB v5 upgrades to v6 retaining existing records',async()=>{
 await deleteDB('nexus');
 const old=await openDB('nexus',5,{upgrade(db){
  for(const name of STUDY_STORES){const s=db.createObjectStore(name,{keyPath:'id'});if(['study_cards','study_states','study_events'].includes(name))s.createIndex('deck','deck_id');}
 }});
 await old.put('study_settings',{id:'preserved'});old.close();
 const {IndexedDBAdapter}=require('../src/infrastructure/storage/IndexedDBAdapter.ts'),adapter=new IndexedDBAdapter();
 try{
 await adapter.init();const db=await openDB('nexus');
 assert.equal(db.version,6);assert.ok(QUIZ_STORES.every(s=>db.objectStoreNames.contains(s)));
 assert.equal((await db.get('study_settings','preserved')).id,'preserved');db.close();
 }finally{await adapter.close();await deleteDB('nexus');}
});
