require('./loadStudy.cjs');require('fake-indexeddb/auto');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {fixture,grade}=require('./fixtures/studyStyleRepository.cjs');
const {installStudyClear}=require('./fixtures/studyClearDatabase.cjs');
const {syncStudy,clearStudyDeck}=require('../src/features/study/studySync.ts');
const {originalEvent,effectiveEvent,reliableEvent,projectStudyEvent,clearedStudyState}=require('../src/features/study/studyReliability.ts');
const {createStudyEvent,sameStudyRecord}=require('../src/features/study/studyFSRS.ts');
const {dailyNewUsed}=require('../src/features/study/scheduledStudy.ts');
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
async function setup(count=1){
 const pg=new PGlite(),devices=[];
 await pg.exec(`create schema auth;create role authenticated;create role anon;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;`);
 for(const file of ['20260922_study_fsrs.sql','20261016_study_reliability.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 await installStudyClear(pg);
 await pg.query('insert into auth.users values($1),($2)',[owner,other]);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 await pg.query("insert into pages values('deck',$1,'study_set',null),('other-deck',$1,'study_set',null)",[owner]);
 const calls=[],loss={name:null};
 const client={auth:{getUser:async()=>({data:{user:{id:owner}},error:null})},rpc:async(name,args={})=>{
  calls.push(name);
  try {
   let result;
   if(name==='get_study_clear_times')result=await pg.query('select get_study_clear_times() value');
   else if(name==='clear_study_deck')result=await pg.query('select clear_study_deck($1,$2,$3) value',[args.deck_id,args.operation_id,args.expected_cleared_at]);
   else if(name==='pull_study_changes')result=await pg.query('select pull_study_changes($1) value',[args.after_sequence]);
   else if(name==='apply_study_operation')result=await pg.query('select apply_study_operation($1) value',[JSON.stringify(args.operation)]);
   else if(name==='apply_study_resolution')result=await pg.query('select apply_study_resolution($1) value',[JSON.stringify(args.operation)]);
   else throw Error('Unexpected RPC '+name);
   if(loss.name===name){loss.name=null;return {error:{message:'response lost'}};}
   return {data:result.rows[0].value,error:null};
  }catch(e){return {error:{message:e.message}};}
 }};
 const device=async n=>{const d=await fixture(n,owner);devices.push(d);return d;};
 const a=await device(count);
 return {pg,client,calls,loss,a,device,sync:d=>syncStudy(d.repo,client,owner),clear:(id='clear-1',expected=0)=>client.rpc('clear_study_deck',{deck_id:'deck',operation_id:id,expected_cleared_at:expected}),close:async()=>{for(const d of devices)await d.close();await pg.close();}};
}
async function oldLearning(f){
 const at=Date.now()-120000,session=await f.a.repo.startSession('deck','scheduled',at);
 await grade(f.a.repo,session.id,1,at);await f.sync(f.a);
 return {at,session,snapshot:await f.a.repo.readDeck('deck',true)};
}
test('offline answers on each side of clear: immutable facts, original snapshot replay, due, quota, old Session and retry deduplication',async()=>{
 const f=await setup();try{
  const old=await oldLearning(f),b=await f.device(0);await f.sync(b);
  const session=await b.repo.startSession('deck','scheduled',Date.now()-1000);
  const response=await f.clear();assert.equal(response.error,null);const clear=response.data.clear;
  await grade(b.repo,session.id,3,clear.cleared_at+1000);
  const facts=(await b.repo.readDeck('deck',true)).events,late=facts.find(e=>e.kind==='review'&&e.at>clear.cleared_at);
  assert.equal(late.log.group,'forgotten');assert.ok(late.after.fixed.due<late.at+604800000);
  // Local settings can change after the answer; replay must use the frozen snapshot.
  await b.repo.saveDeckStyle('deck',{intervals:{general:[2,3,4],forgotten:[5,6,7]}});
  f.calls.length=0;f.loss.name='apply_study_operation';await assert.rejects(()=>f.sync(b),/response lost/);
  assert.equal(f.calls[0],'get_study_clear_times');await f.sync(b);
  const snapshot=await b.repo.readDeck('deck',true),stored=snapshot.events.find(e=>e.id===late.id);
  assert.deepEqual(originalEvent(stored),late);assert.equal(reliableEvent(stored),true);
  assert.equal(effectiveEvent(stored).log.group,'general');
  assert.equal(effectiveEvent(stored).after.fixed.due,late.at+late.style_snapshot.intervals.general[2]*1000);
  assert.equal(effectiveEvent(stored).before.fsrs,null);assert.equal(effectiveEvent(stored).before.learned_at,undefined);
  assert.equal(snapshot.events.filter(e=>e.kind==='review').length,1);assert.ok(snapshot.events.every(e=>e.at>clear.cleared_at));
  assert.equal((await f.pg.query("select count(*)::int n from study_review_events where payload->>'kind'='review'")).rows[0].n,1);
  assert.equal((await f.pg.query('select payload from study_card_states')).rows[0].payload.fixed.due,effectiveEvent(stored).after.fixed.due);
  assert.equal(dailyNewUsed(await b.repo.readScheduledDeck('deck',late.at),late.at),0);
  await assert.rejects(()=>b.repo.readSession(session.id),/sessionCleared/);
  await f.sync(f.a);assert.deepEqual((await f.a.repo.readDeck('deck',true)).events,snapshot.events);
  assert.equal((await f.a.repo.startSession('deck','scheduled',late.at)).answers,0);
 }finally{await f.close();}
});
test('clear is atomic and idempotent; consecutive clears supersede delayed requests/replies; preserve content, other decks and account isolation',async()=>{
 const f=await setup();try{
  await oldLearning(f);await f.a.repo.ensureDeck({id:'other-deck',workspace_owner_id:owner,study_items:[]});
  const [otherCard]=await f.a.repo.addCards('other-deck',[{front:'other',back:'其他'}]);await f.sync(f.a);
  const before=(await f.pg.query('select id,payload from study_cards order by id')).rows;
  const settings=(await f.pg.query('select * from study_deck_settings order by id')).rows;
  const otherState=(await f.pg.query('select payload from study_card_states where id=$1',[otherCard.id])).rows[0].payload;
  const first=await f.clear('first');assert.equal(first.error,null);assert.deepEqual((await f.clear('first')).data,first.data);
  const stamp=first.data.clear.cleared_at;const second=await f.clear('second',stamp);assert.equal(second.error,null);assert.ok(second.data.clear.cleared_at>stamp);
  assert.equal((await f.clear('first')).data.applied,false);assert.equal((await f.clear('late-first',0)).data.applied,false);
  await f.a.repo.applyClearTimes([second.data.clear]);await f.a.repo.applyClearTimes([first.data.clear]);
  assert.equal((await f.a.repo.clearTimes())[0].cleared_at,second.data.clear.cleared_at);
  assert.equal((await f.pg.query('select count(*)::int n from study_deck_clears')).rows[0].n,1);
  assert.deepEqual((await f.pg.query('select id,payload from study_cards order by id')).rows,before);
  assert.deepEqual((await f.pg.query('select * from study_deck_settings order by id')).rows,settings);
  assert.deepEqual((await f.pg.query('select payload from study_card_states where id=$1',[otherCard.id])).rows[0].payload,otherState);
  await f.pg.exec('set role authenticated');await f.pg.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
  assert.equal((await f.clear('cross-account')).error.message,'Study deck not found for this account');
  assert.deepEqual((await f.client.rpc('get_study_clear_times')).data,[]);
  await assert.rejects(()=>f.pg.exec('delete from study_deck_clears'),/permission denied/);
  await f.pg.exec('reset role');await f.pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  await f.pg.exec(`create function fail_clear() returns trigger language plpgsql as $$begin raise exception 'injected failure';end$$;create trigger fail_clear before update on study_card_states for each row execute function fail_clear();`);
  const failed=await f.clear('rollback',second.data.clear.cleared_at);assert.match(failed.error.message,/injected failure/);
  assert.equal((await f.client.rpc('get_study_clear_times')).data[0].operation_id,'second');
 }finally{await f.close();}
});
test('unknown clear response retries saved operation, not another destructive clear; local commit failure preserves request',async()=>{
 const f=await setup();try{
  await oldLearning(f);f.loss.name='clear_study_deck';
  await assert.rejects(()=>clearStudyDeck(f.a.repo,f.client,owner,'deck'),/clearUnknown/);
  const pending=await f.a.repo.clearRequest('deck'),first=(await f.client.rpc('get_study_clear_times')).data[0];assert.equal(pending.operation_id,first.operation_id);
  await clearStudyDeck(f.a.repo,f.client,owner,'deck');
  assert.deepEqual((await f.client.rpc('get_study_clear_times')).data[0],first);
  const apply=f.a.repo.applyClearTimes.bind(f.a.repo);let fail=true;
  f.a.repo.applyClearTimes=async rows=>{if(fail&&rows.some(r=>r.cleared_at>first.cleared_at)){fail=false;throw Error('local storage failure');}return apply(rows);};
  await assert.rejects(()=>clearStudyDeck(f.a.repo,f.client,owner,'deck'),/local storage failure/);
  const second=(await f.client.rpc('get_study_clear_times')).data[0];
  await clearStudyDeck(f.a.repo,f.client,owner,'deck');assert.deepEqual((await f.client.rpc('get_study_clear_times')).data[0],second);
 }finally{await f.close();}
});
test('server rejects old event, forged parent/barrier/due, raw-content collision, stale resolution; seed and legacy cannot restore progress',async()=>{
 const f=await setup();try{
  const old=await oldLearning(f),raw=old.snapshot.events.find(e=>e.kind==='review'),card=old.snapshot.cards[0];
  const {data:{clear}}=await f.clear();
  const send=value=>f.client.rpc('apply_study_operation',{operation:{owner_id:owner,kind:'event',value}});
  assert.match((await send(raw)).error.message,/time/);
  assert.match((await f.client.rpc('apply_study_operation',{operation:{kind:'seed',value:{...raw.before,id:card.id,head:null,fsrs:null}}})).error?.message??'',/^$/);
  const state=(await f.pg.query('select payload from study_card_states')).rows[0].payload;assert.equal(state.introduced_at,null);assert.equal(state.legacy_due_at,null);
  const late=createStudyEvent(card,raw.after,'review',clear.cleared_at+1,'offline','late',3,'scheduled',raw.style_snapshot);
  const projected=projectStudyEvent(late,clearedStudyState(card,clear.cleared_at),clear.cleared_at);assert.equal(reliableEvent(projected),true);
  const stale=structuredClone(projected);stale.projection.cleared_at--;assert.match((await send(stale)).error.message,/Stale/);
  const injected=structuredClone(projected);injected.projection.at=raw.at;assert.equal(reliableEvent(injected),false);assert.match((await send(injected)).error.message,/Malformed/);
  const bad=structuredClone(projected);bad.projection.after.fixed.due++;assert.equal(reliableEvent(bad),false);assert.match((await send(bad)).error.message,/transition|log/);
  const badBefore=structuredClone(projected);badBefore.projection.before.introduced_at=raw.at;badBefore.projection.after.introduced_at=raw.at;assert.match((await send(badBefore)).error.message,/predecessor/);
  assert.equal((await send(projected)).error,null);assert.equal((await send(projected)).error,null);
  const collision={...projected,answer:'changed original'};assert.match((await send(collision)).error.message,/collision/);
  assert.equal((await f.client.rpc('apply_study_resolution',{operation:{value:{owner_id:owner,id:'stale',card_id:card.id,event_version:0,state_version:0,choice:raw.after,relearn:false}}})).data,false);
  const wrongDeck={...projected,deck_id:'other-deck'};assert.match((await send(wrongDeck)).error.message,/mismatch/);
  const originalChanged=structuredClone(projected);originalChanged.after.fixed.due++;assert.equal(reliableEvent(originalChanged),false);assert.match((await send(originalChanged)).error.message,/transition|log/);
 }finally{await f.close();}
});
test('new RPCs and internal helpers have explicit ACLs/RLS; official direct seeds also obey the barrier',async()=>{
 const f=await setup();try{
  await f.sync(f.a);const {data:{clear}}=await f.clear();
  assert.equal((await f.pg.query("select relrowsecurity enabled from pg_class where oid='public.study_deck_clears'::regclass")).rows[0].enabled,true);
  for(const name of ['get_study_clear_times()','clear_study_deck(text,text,bigint)','apply_study_operation(jsonb)','apply_study_resolution(jsonb)']) {
   assert.equal((await f.pg.query('select has_function_privilege($1,$2,$3) ok',['anon','public.'+name,'execute'])).rows[0].ok,false);
   assert.equal((await f.pg.query('select has_function_privilege($1,$2,$3) ok',['authenticated','public.'+name,'execute'])).rows[0].ok,true);
  }
  for(const name of ['apply_study_operation_before_clear(jsonb)','apply_study_resolution_before_clear(jsonb)','check_study_transition(jsonb)','study_empty_after_clear(jsonb,bigint)','study_effective_event(jsonb)'])assert.equal((await f.pg.query('select has_function_privilege($1,$2,$3) ok',['authenticated','public.'+name,'execute'])).rows[0].ok,false);
  const card={id:'new-official',owner_id:owner,deck_id:'deck',front:'official',back:'官方',dictionary_entry_id:'entry',official_source_entry_id:'source',official_pack_id:'pack',sort_order:99,created_at:1,updated_at:1,content_revision:1};
  await f.pg.query('insert into study_cards values($1,$2,$3)',[owner,card.id,JSON.stringify(card)]);
  await f.pg.query('insert into study_card_states values($1,$2,$3)',[owner,card.id,JSON.stringify({id:card.id,owner_id:owner,deck_id:'deck',head:null,fsrs:null,legacy_due_at:100,introduced_at:100,generation:12,conflict:false})]);
  assert.deepEqual((await f.pg.query('select payload from study_card_states where id=$1',[card.id])).rows[0].payload,clearedStudyState(card,clear.cleared_at));
  assert.deepEqual((await f.pg.query('select payload from study_cards where id=$1',[card.id])).rows[0].payload,card);
 }finally{await f.close();}
});
test('unverifiable offline fact is retained for recovery, excluded from scheduling/outbox, and sign-in failures cannot clear',async()=>{
 const f=await setup();try{
  const old=await oldLearning(f),event=old.snapshot.events.find(e=>e.kind==='review');
  const broken={...event,id:'missing-time'};delete broken.at;
  await f.a.db.put('study_events',broken);await f.a.db.put('study_outbox',{id:'missing-time-op',owner_id:owner,kind:'event',value:broken});
  const {data:{clear}}=await f.clear();await f.a.repo.applyClearTimes([clear]);
  assert.deepEqual(await f.a.repo.recoveryEvents('deck'),[broken]);assert.equal((await f.a.repo.readDeck('deck',true)).events.length,0);assert.ok(!(await f.a.repo.pending()).some(op=>op.id==='missing-time-op'));
  const client={...f.client,auth:{getUser:async()=>({data:{user:null},error:null})}};
  await assert.rejects(()=>clearStudyDeck(f.a.repo,client,owner,'deck'),/clearOnline/);
  // Ordinary offline learning uses no server and is projected against the last known clear.
  const s=await f.a.repo.startSession('deck','scheduled',clear.cleared_at+100);await grade(f.a.repo,s.id,3,clear.cleared_at+100);
  assert.equal((await f.a.repo.readDeck('deck',true)).events.filter(e=>e.kind==='review').length,1);
 }finally{await f.close();}
});
test('a second clear rebuilds the same post-clear fact again without retaining the first projection or counting it twice',async()=>{
 const f=await setup();try{
  await oldLearning(f);const b=await f.device(0);await f.sync(b);
  const firstSession=await b.repo.startSession('deck','scheduled',Date.now());
  const first=(await f.clear()).data.clear;await grade(b.repo,firstSession.id,3,first.cleared_at+1);await f.sync(b);
  await b.repo.saveDeckStyle('deck',{study_mode:'endless'});await f.sync(b);
  const session=await b.repo.startSession('deck','scheduled',Date.now());
  const second=(await f.clear('second',first.cleared_at)).data.clear;
  await grade(b.repo,session.id,3,second.cleared_at+1);
  const late=(await b.repo.readDeck('deck',true)).events.find(e=>e.at>second.cleared_at);
  assert.equal(late.projection.cleared_at,first.cleared_at);
  await f.sync(b);await f.sync(b);const after=await b.repo.readDeck('deck',true);
  assert.equal(after.events.length,1);assert.equal(after.events[0].id,late.id);assert.deepEqual(originalEvent(after.events[0]),originalEvent(late));
  assert.equal(after.events[0].projection.cleared_at,second.cleared_at);assert.equal(after.events[0].projection.before.head,null);assert.equal(after.events[0].projection.before.learned_at,undefined);
  assert.equal((await f.pg.query('select count(*)::int n from study_review_events')).rows[0].n,1);
 }finally{await f.close();}
});
test('historical pinned FSRS and fixed snapshots still validate and replay from empty memory',async()=>{
 const f=await setup();try{
  await f.sync(f.a);const card=(await f.a.repo.readDeck('deck')).cards[0],style=require('../src/features/study/studyStyles.ts').defaultStudyStyle(owner);
  const {data:{clear}}=await f.clear();
  for(const [id,snapshot] of [['fsrs',undefined],['fixed',{...style,interval_version:undefined,scheduling_method:'fixed'}]]){
   const initial={...clearedStudyState(card,clear.cleared_at),cleared_at:undefined},old=createStudyEvent(card,initial,'review',clear.cleared_at-1000,'old',id+'-old',3,'scheduled',snapshot);
   const raw=createStudyEvent(card,old.after,'review',clear.cleared_at+1,'offline',id+'-late',3,'scheduled',snapshot);
   const projected=projectStudyEvent(raw,clearedStudyState(card,clear.cleared_at),clear.cleared_at);
   assert.equal(reliableEvent(projected),true);assert.equal(effectiveEvent(projected).before.fsrs,null);assert.deepEqual(originalEvent(projected),raw);
   const result=await f.client.rpc('apply_study_operation',{operation:{kind:'event',value:projected}});assert.equal(result.error,null);
   if(id==='fsrs')assert.equal(effectiveEvent(projected).after.fsrs.reps,1);
  }
 }finally{await f.close();}
});
test('two offline devices retain distinct post-clear facts as conflicts; guarded relearn and subsequent learning use effective state',async()=>{
 const f=await setup();try{
  await oldLearning(f);const b=await f.device(0),c=await f.device(0);await f.sync(b);await f.sync(c);
  const sb=await b.repo.startSession('deck','scheduled',Date.now()),sc=await c.repo.startSession('deck','scheduled',Date.now());
  const {data:{clear}}=await f.clear();
  await grade(b.repo,sb.id,3,clear.cleared_at+10);await grade(c.repo,sc.id,2,clear.cleared_at+20);
  await f.sync(b);await f.sync(c);await f.sync(b);
  let snapshot=await c.repo.readDeck('deck',true);assert.equal(snapshot.states[0].conflict,true);assert.equal(snapshot.events.filter(e=>e.kind==='review').length,2);assert.ok(snapshot.events.every(reliableEvent));
  await c.repo.resolveSchedule(snapshot.cards[0].id,'relearn');await f.sync(c);
  snapshot=await c.repo.readDeck('deck',true);assert.equal(snapshot.states[0].conflict,false);assert.equal(snapshot.states[0].fixed,undefined);assert.equal(snapshot.states[0].fsrs,null);assert.equal(snapshot.states[0].introduced_at,null);
  const next=await c.repo.startSession('deck','scheduled',clear.cleared_at+100);await grade(c.repo,next.id,3,clear.cleared_at+100);await f.sync(c);await f.sync(b);
  snapshot=await b.repo.readDeck('deck',true);assert.equal(snapshot.states[0].conflict,false);assert.equal(snapshot.events.filter(e=>e.kind==='review').length,3);
  const tx=c.db.transaction(require('../src/features/study/StudyRepository.ts').STUDY_STORES,'readwrite');await c.repo.reconcileBackupIn(tx);await tx.done;
  assert.equal((await c.repo.readDeck('deck',true)).states[0].conflict,false,'rebuilding an already resolved backup cannot revive old branches');
  await f.sync(c);assert.equal((await c.repo.readDeck('deck',true)).events.filter(e=>e.kind==='review').length,3);
 }finally{await f.close();}
});
test('6301 cards clear in one transaction and local barrier pass without deleting content or another group',{timeout:120000},async()=>{
 const f=await setup(0);try{
  const cards=Array.from({length:6301},(_,i)=>({id:'large-'+i,deck_id:'deck',owner_id:owner,front:'word'+i,back:'字'+i,direction:'en-zh',sort_order:i,content_revision:1,created_at:1,updated_at:1,deleted_at:null,legacy:{schema:1,migrated_at:1,item:{daily_due_at:123,daily_introduced_at:122}}}));
  await f.sync(f.a);
  await f.pg.query("insert into study_cards select $1,value->>'id',value from jsonb_array_elements($2::jsonb)",[owner,JSON.stringify(cards)]);
  await f.pg.query("insert into study_card_states select owner_id,id,jsonb_build_object('id',id,'owner_id',owner_id,'deck_id','deck','generation',0,'head',null,'fsrs',null,'legacy_due_at',123,'introduced_at',122,'conflict',false) from study_cards");
  await f.sync(f.a);const start=performance.now();await clearStudyDeck(f.a.repo,f.client,owner,'deck');
  const snapshot=await f.a.repo.readDeck('deck',true);assert.equal(snapshot.cards.length,6301);assert.ok(snapshot.states.every(s=>s.fsrs===null&&s.legacy_due_at===null&&s.introduced_at===null));
  assert.deepEqual(snapshot.cards,cards);assert.equal(snapshot.sessions.length,0);console.log('6301-card isolated clear ms:',Math.round(performance.now()-start));
 }finally{await f.close();}
});
test('actual v4 backup import checks cloud barrier, preserves content, cannot revive old facts/sessions/legacy, and retries with one fact per ID',async()=>{
 const {IndexedDBAdapter}=require('../src/infrastructure/storage/IndexedDBAdapter.ts'),{deleteDB}=require('idb');
 const clientModule=require('../src/infrastructure/supabase/client.ts'),getClient=clientModule.getSupabase;
 const f=await setup();let adapter;
 try{
  const old=await oldLearning(f);await deleteDB('nexus');adapter=new IndexedDBAdapter();await adapter.init();adapter.setWorkspaceOwner(owner);
  const backup=await adapter.exportWorkspaceBackup();backup.study=await f.a.repo.exportData();
  backup.pages=[{id:'deck',title:'Deck',kind:'study_set',workspace_owner_id:owner,created_at:1,updated_at:1,deleted_at:null,revision:1,device_id:'backup',default_mode:'note',content_json:{},content_text:'',attachment_ids:[],study_items:[{id:'legacy',front:'Legacy',back:'舊字卡',daily_due_at:99,daily_introduced_at:98,review_count:50,mastery:'mastered'}]}];
  clientModule.getSupabase=()=>f.client;
  const fact=backup.study.events.find(e=>e.kind==='review'),ghost=projectStudyEvent(fact,clearedStudyState(backup.study.cards[0],fact.at-1),fact.at-1);
  const forged={...backup,study:{...backup.study,events:[ghost],states:[ghost.projection.after],sessions:[],clears:[{owner_id:owner,deck_id:'deck',cleared_at:fact.at-1,operation_id:'file-is-not-authority'}]}};
  await assert.rejects(()=>adapter.importWorkspaceBackup(forged),/clearInvalidEvent/);
  const clear=await f.clear();assert.equal(clear.error,null);
  f.loss.name='get_study_clear_times';await assert.rejects(()=>adapter.importWorkspaceBackup(backup),/clearCheckFailed/);
  assert.equal((await adapter.listPages()).length,0);
  await adapter.importWorkspaceBackup(backup);
  assert.ok((await adapter.listPages()).every(page=>!('study_items' in page)));
  assert.ok((await adapter.exportWorkspaceBackup()).pages.every(page=>!('study_items' in page)));
  let snapshot=await adapter.getStudyRepository().readDeck('deck',true);assert.equal(snapshot.events.length,0);assert.equal(snapshot.sessions.length,0);assert.equal(snapshot.states[0].introduced_at,null);assert.equal(snapshot.states[0].fsrs,null);assert.equal(snapshot.cards[0].front,old.snapshot.cards[0].front);
  await syncStudy(adapter.getStudyRepository(),f.client,owner);assert.equal((await f.pg.query('select count(*)::int n from study_review_events')).rows[0].n,0);
  // A current projected backup may omit cleared original parents, but remains verifiable.
  const s=await adapter.getStudyRepository().startSession('deck','scheduled',clear.data.clear.cleared_at+1000);
  await grade(adapter.getStudyRepository(),s.id,3,clear.data.clear.cleared_at+1000);await syncStudy(adapter.getStudyRepository(),f.client,owner);
  const current=await adapter.exportWorkspaceBackup();assert.equal(current.schema_version,4);assert.ok(current.study.events.every(reliableEvent));
  await adapter.importWorkspaceBackup(current);await syncStudy(adapter.getStudyRepository(),f.client,owner);
  snapshot=await adapter.getStudyRepository().readDeck('deck',true);assert.equal(snapshot.events.filter(e=>e.kind==='review').length,1);
  const count=(await f.pg.query("select count(*)::int n from study_review_events where payload->>'kind'='review'")).rows[0].n;assert.equal(count,1);
  // A v1 Page-only restore gets the same preflight and cannot seed old progress.
  const legacy={...current,schema_version:1};delete legacy.study;
  await adapter.importWorkspaceBackup(legacy);assert.equal((await adapter.getStudyRepository().readDeck('deck',true)).events.filter(e=>e.kind==='review').length,1);
  adapter.setWorkspaceOwner(other);await assert.rejects(()=>adapter.importWorkspaceBackup(current),/different account/);
 }finally{clientModule.getSupabase=getClient;if(adapter)await adapter.close();await deleteDB('nexus');await f.close();}
});
test('migration failure rolls back table, RPC rename and triggers; old RPC remains usable',async()=>{
 const pg=new PGlite();try{
  await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);create table pages(id text,owner_id uuid,kind text,deleted_at bigint);create function auth.uid() returns uuid language sql as $$select null::uuid$$;`);
  for(const file of ['20260922_study_fsrs.sql','20261016_study_reliability.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
  await pg.exec(`create function fake_guard() returns trigger language plpgsql as $$begin return new;end$$;create trigger study_clear_state_guard before update on study_card_states for each row execute function fake_guard();`);
  await assert.rejects(()=>pg.exec(fs.readFileSync('supabase/migrations/20261105032115_study_deck_clear.sql','utf8')),/already exists/);await pg.exec('rollback');
  assert.equal((await pg.query("select to_regclass('public.study_deck_clears') value")).rows[0].value,null);
  assert.equal((await pg.query("select to_regprocedure('public.apply_study_operation_before_clear(jsonb)') value")).rows[0].value,null);
  await assert.rejects(()=>pg.query("select apply_study_operation('{}'::jsonb)"),/Authentication required/);
 }finally{await pg.close();}
});
