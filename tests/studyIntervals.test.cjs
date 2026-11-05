require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,grade}=require('./fixtures/studyStyleRepository.cjs');
const {createStudyEvent,State,emptyStudyState,forgottenStudyState}=require('../src/features/study/studyFSRS.ts');
const {defaultStudyStyle}=require('../src/features/study/studyStyles.ts');
const {reliableEvent}=require('../src/features/study/studyReliability.ts');
const {scheduledStatus,dueAt,dailyNewUsed}=require('../src/features/study/scheduledStudy.ts');
const now=new Date(2026,10,4,12).getTime();
test('six intervals, forgotten classification and frozen FSRS memory are deterministic real events',()=>{
 const style=defaultStudyStyle('owner'),card={id:'card',owner_id:'owner',deck_id:'deck',front:'word',back:'字',content_revision:1};
 for(const intervals of [style.intervals,{general:[2,3,4],forgotten:[5,6,7]}])for(const forgotten of [false,true])for(const rating of [1,2,3]){
  style.intervals=intervals;
  const before={...emptyStudyState(card),introduced_at:now-1000,...(forgotten?{fsrs:{state:State.Relearning,due:now,last_review:now-60000,stability:2,difficulty:3}}:{})};
  const event=createStudyEvent(card,before,'review',now,'device',`event-${forgotten}-${rating}`,rating,'scheduled',style);
  assert.equal(event.engine,'nexus-interval@1');assert.equal(event.after.fixed.due-now,intervals[forgotten?'forgotten':'general'][rating-1]*1000);assert.equal(forgottenStudyState(event.after),rating!==3);assert.deepEqual(event.after.fsrs,before.fsrs);assert.ok(reliableEvent(event));
 }
 assert.throws(()=>createStudyEvent(card,emptyStudyState(card),'review',now,'device','invalid',4,'scheduled',style),/response/);
});
test('Again waits; Vague exits even after becoming due; only different exited targets count and retries are idempotent',async()=>{
 const f=await fixture(2);try{
  const start=await f.repo.startSession('deck','scheduled',now);const first=await grade(f.repo,start.id,1,now),snapshot=await f.repo.readScheduledDeck('deck',now);
  assert.equal(first.session.targets.length,2);assert.equal(scheduledStatus(first.session,snapshot,now).completed,0);assert.equal(first.session.queue.length,1);
  const second=await grade(f.repo,start.id,2,now);assert.equal(scheduledStatus(second.session,await f.repo.readScheduledDeck('deck',now),now).completed,1);assert.equal(second.session.completed_at,null);assert.equal(second.session.queue.length,0);
  let waiting=await f.repo.presentScheduled(start.id,now+59999);assert.equal(waiting.session.queue.length,0);assert.equal(waiting.session.targets.length,2);
  const last=await grade(f.repo,start.id,3,now+60000);assert.equal(last.session.completed_at,now+60000);assert.equal(scheduledStatus(last.session,await f.repo.readScheduledDeck('deck',now+60000),now+60000).completed,2);
  assert.deepEqual(await f.repo.rateSession(last.input),last.session);const data=await f.repo.readDeck('deck',true);assert.equal(dailyNewUsed(data,now),2);assert.equal(data.events.filter(e=>e.log?.method==='interval').length,3);assert.ok(data.events.every(reliableEvent));
  assert.equal(data.events.filter(e=>e.log?.method==='interval').at(-1).after.fixed.due,now+60000+86400000);
  await f.repo.configure('deck',{study_mode:'endless'});const next=await f.repo.startSession('deck','scheduled',now+60001);assert.equal(next.targets.length,1,'unexpired forgotten card cannot be pulled forward by endless mode');
 }finally{await f.close();}
});
test('old due, history, unfinished Session ID and consumed quota survive transition; settings remain frozen',async()=>{
 const f=await fixture(1);try{
  const oldStyle={...defaultStudyStyle(f.owner),scheduling_method:'fsrs',interval_version:undefined,intervals:undefined};const data=await f.repo.readDeck('deck',true),card=data.cards[0],before=emptyStudyState(card);
  const event=createStudyEvent(card,before,'review',now,'old-device','old-fsrs',1,'scheduled',oldStyle);event.session_id='old-session';await f.db.put('study_states',event.after);await f.db.put('study_events',event);
  const old={id:'old-session',owner_id:f.owner,deck_id:'deck',mode:'scheduled',day:'2026-11-04',targets:[{card_id:card.id,generation:0,easy_at:null,official_event_id:event.id,official_rating:1,event_id:'pending',attempts:1}],queue:[],started_at:now,completed_at:null,revision:2,updated_at:now,answers:1,quota_limit:10,settings_snapshot:oldStyle};await f.db.put('study_sessions',old);
  const restored=await f.repo.startSession('deck','scheduled',now+1);assert.equal(restored.id,old.id);assert.equal(restored.answers,1);assert.equal(restored.settings_snapshot.interval_version,1);assert.deepEqual(restored.legacy_settings_snapshot,oldStyle);assert.equal(restored.queue.length,0);assert.deepEqual((await f.repo.readDeck('deck',true)).states[0],event.after);assert.ok(reliableEvent(event));
  await f.repo.saveDeckStyle('deck',{intervals:{general:[2,3,4],forgotten:[5,6,7]}});assert.equal((await f.repo.presentScheduled(old.id,now+2)).session.settings_snapshot.intervals.general[0],60);
  const backup=await f.repo.exportData(),other=await fixture(0);try{await other.repo.mergeRemote(backup);const roundtrip=await other.repo.exportData();assert.deepEqual(roundtrip.states,backup.states);assert.deepEqual(roundtrip.events,backup.events);}finally{await other.close();}
 }finally{await f.close();}
});

test('presented but unanswered new card is not a review backlog that discards the rest of its batch',async()=>{
 const f=await fixture(2);try{await f.repo.configure('deck',{new_pause_threshold:1});const s=await f.repo.startSession('deck','scheduled',now);assert.equal(s.targets.length,2);await grade(f.repo,s.id,3,now);const d=await f.repo.presentScheduled(s.id,now);assert.equal(d.session.queue.length,1);assert.equal(d.session.targets.some(t=>t.skipped),false);await grade(f.repo,s.id,3,now);assert.equal(dailyNewUsed(await f.repo.readScheduledDeck('deck',now),now),2);}finally{await f.close();}
});

test('disconnect during sync stops subsequent RPCs and retains unsent operations',async()=>{
 const owner='11111111-1111-4111-8111-111111111111',f=await fixture(1,owner),descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');let online=true;const calls=[];
 try{Object.defineProperty(globalThis,'navigator',{configurable:true,value:{get onLine(){return online;}}});const before=await f.repo.pending();await require('../src/features/study/studySync.ts').syncStudy(f.repo,{rpc:async name=>{calls.push(name);online=false;return{data:[],error:null};}},owner);assert.deepEqual(calls,['get_study_clear_times']);assert.equal((await f.repo.pending()).length,before.length);
 online=true;calls.length=0;await require('../src/features/study/studySync.ts').syncStudy(f.repo,{rpc:async name=>{calls.push(name);if(name==='get_study_clear_times')return{data:[],error:null};online=false;return{data:true,error:null};}},owner);assert.deepEqual(calls,['get_study_clear_times','apply_study_operation']);assert.equal((await f.repo.pending()).length,before.length-1);}
 finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;await f.close();}
});
