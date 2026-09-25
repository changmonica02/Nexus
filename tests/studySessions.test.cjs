require('./loadStudy.cjs');require('fake-indexeddb/auto');
const {openDB,deleteDB}=require('idb');
const {StudyRepository,STUDY_STORES}=require('../src/features/study/StudyRepository.ts');
const {freezingInterval,displayStudyCards,isLearned,hasLearningData,selectSessionCards}=require('../src/features/study/studySessions.ts');
const test=require('node:test'),assert=require('node:assert/strict');
const day=new Date(2026,8,24,23,55).getTime();
async function fixture(count=3){
 const name=crypto.randomUUID();const db=await openDB(name,1,{upgrade(db){for(const name of STUDY_STORES){const s=db.createObjectStore(name,{keyPath:'id'});if(['study_cards','study_states','study_events'].includes(name))s.createIndex('deck','deck_id');}}});
 const repo=new StudyRepository(db,()=>null,'test');await repo.ensureDeck({id:'deck',study_items:[]});await repo.addCards('deck',Array.from({length:count},(_,i)=>({front:['zebra','apple','pear'][i]??String(i),back:String(i)})));
 return {db,repo,close:async()=>{db.close();await deleteDB(name);}};
}
async function rate(repo,sessionId,rating,now=day){const {session,snapshot}=await repo.readSession(sessionId,now);const id=session.queue[0],c=snapshot.cards.find(c=>c.id===id),s=snapshot.states.find(s=>s.id===id);const input={sessionId,cardId:id,revision:session.revision,contentRevision:c.content_revision,expectedHead:s.head,rating,actionId:crypto.randomUUID(),now};return {session:await repo.rateSession(input),input};}

async function learnAll(repo,now=day) {
 const daily=await repo.startSession('deck','daily',now);
 for(const _target of daily.targets) await rate(repo,daily.id,4,now);
}
const reviews=snapshot=>snapshot.events.filter(e=>e.kind==='review');
const expectedFSRS=(state,rating,now)=>{
 const api=require('../src/features/study/studyFSRS.ts');
 return api.serializeFSRS(api.previewStudy(state,now)[rating].card);
};

test('New Good is the sole official rating through Hard/Good/Easy, including repository reload',async()=>{
 const f=await fixture(1);try{
 await learnAll(f.repo);
 const session=await f.repo.startSession('deck','free',day+1);
 const before=(await f.repo.readDeck('deck')).states[0];
 assert.equal(before.fsrs,null);
 const first=await rate(f.repo,session.id,3,day+1);
 const official=(await f.repo.readDeck('deck')).states[0];
 assert.deepEqual(official.fsrs,expectedFSRS(before,3,day+1));
 assert.equal(first.session.completed_at,null);assert.equal(first.session.queue.length,1);
 assert.equal(first.session.targets[0].official_rating,3);
 assert.equal(first.session.targets[0].official_event_id,official.head);
 await f.repo.rateSession(first.input); // Lost-response retry is idempotent.
 const dbName=f.db.name;f.db.close();
 const db=await openDB(dbName);try {
 const reopened=new StudyRepository(db,()=>null,'reopened');
 const resumed=await reopened.startSession('deck','free',day+2);
 assert.equal(resumed.id,session.id);assert.equal(resumed.targets[0].official_event_id,official.head);
 assert.equal(resumed.targets[0].official_rating,3);
 const pendingBefore=await reopened.pending();
 for(const rating of [2,3,4]){
   const result=await rate(reopened,session.id,rating,day+rating+2);
   const snapshot=await reopened.readDeck('deck');
   assert.equal(reviews(snapshot).length,1);assert.deepEqual(snapshot.states[0],official);
   assert.equal(result.session.targets[0].official_rating,3);
   assert.equal(result.session.queue.length,rating===4?0:1);
   assert.equal(result.session.completed_at!=null,rating===4);
 }
 assert.deepEqual(await reopened.pending(),pendingBefore,'session-only answers add no sync operations');
 assert.equal((await reopened.readSession(session.id)).session.targets[0].attempts,4);
 assert.ok(pendingBefore.every(op=>op.kind!=='session'&&!('session' in op)));
 }finally{db.close();}
 }finally{await f.close();}
});

test('New first Easy writes scheduler result and immediately leaves the session',async()=>{
 const f=await fixture(1);try{
 await learnAll(f.repo);const before=(await f.repo.readDeck('deck')).states[0];
 const session=await f.repo.startSession('deck','free',day+1);
 const result=await rate(f.repo,session.id,4,day+1);
 const snapshot=await f.repo.readDeck('deck');
 assert.equal(reviews(snapshot).length,1);assert.deepEqual(snapshot.states[0].fsrs,expectedFSRS(before,4,day+1));
 assert.equal(result.session.targets[0].official_rating,4);
 assert.equal(result.session.targets[0].easy_at,day+1);
 assert.equal(result.session.completed_at,day+1);assert.deepEqual(result.session.queue,[]);
 }finally{await f.close();}
});

test('Due Review Again uses real scheduler; reaching due again does not duplicate target or review',async()=>{
 const f=await fixture(1);try{
 await learnAll(f.repo);const initial=await f.repo.startSession('deck','free',day+1);
 await rate(f.repo,initial.id,4,day+1);
 const before=(await f.repo.readDeck('deck')).states[0],now=before.fsrs.due;
 const session=await f.repo.startSession('deck','free',now);
 await rate(f.repo,session.id,1,now);
 const official=(await f.repo.readDeck('deck')).states[0];
 assert.deepEqual(official.fsrs,expectedFSRS(before,1,now));
 const count=reviews(await f.repo.readDeck('deck')).length;assert.equal(count,2);
 const resumed=await f.repo.startSession('deck','free',official.fsrs.due);
 assert.equal(resumed.id,session.id);assert.equal(resumed.targets.length,1);assert.equal(resumed.queue.length,1);
 await rate(f.repo,session.id,3,official.fsrs.due);
 await rate(f.repo,session.id,4,official.fsrs.due+1);
 const after=await f.repo.readDeck('deck');
 assert.equal(reviews(after).length,count);assert.deepEqual(after.states[0],official);
 const next=await f.repo.startSession('deck','free',official.fsrs.due+2);
 assert.notEqual(next.id,session.id);assert.equal(next.targets[0].card_id,official.id);
 }finally{await f.close();}
});

test('not-due filler receives an official FSRS rating from its current state',async()=>{
 const f=await fixture(1);try{
 await learnAll(f.repo);const initial=await f.repo.startSession('deck','free',day+1);
 await rate(f.repo,initial.id,4,day+1);
 const before=(await f.repo.readDeck('deck')).states[0],now=day+60000;
 assert.ok(before.fsrs.due>now);
 const session=await f.repo.startSession('deck','free',now);
 const result=await rate(f.repo,session.id,2,now);
 const snapshot=await f.repo.readDeck('deck');
 assert.equal(reviews(snapshot).length,2);assert.deepEqual(snapshot.states[0].fsrs,expectedFSRS(before,2,now));
 assert.equal(result.session.targets[0].official_rating,2);
 assert.equal(reviews(snapshot).find(e=>e.id===result.session.targets[0].official_event_id).parent,before.head);
 }finally{await f.close();}
});

test('20-target session resumes only 8 remaining cards after 12 Easy; completes only after all Easy',async()=>{
 const f=await fixture(20);try{
 await learnAll(f.repo);const session=await f.repo.startSession('deck','free',day+1);
 for(let i=0;i<12;i++)await rate(f.repo,session.id,4,day+2);
 const reopened=new StudyRepository(f.db,()=>null,'reopened');
 await reopened.addCards('deck',[{front:'extra',back:'額外'}]);
 const resumed=await reopened.startSession('deck','free',day+3);
 assert.equal(resumed.id,session.id);assert.equal(resumed.targets.length,20);
 assert.deepEqual(resumed.queue,session.queue.slice(12));
 for(let i=0;i<8;i++)await rate(reopened,session.id,3,day+4);
 let progress=(await reopened.readSession(session.id)).session;
 assert.equal(progress.answers,20);assert.equal(progress.completed_at,null);assert.equal(progress.queue.length,8);
 for(let i=0;i<8;i++)await rate(reopened,session.id,4,day+5);
 progress=(await reopened.readSession(session.id)).session;
 assert.equal(progress.answers,28);assert.equal(progress.completed_at,day+5);
 assert.ok(progress.targets.every(t=>t.easy_at!=null));assert.deepEqual(progress.queue,[]);
 assert.equal(reviews(await reopened.readDeck('deck')).length,20);
 }finally{await f.close();}
});

test('old session recovers first rating from its real event without writing another review',async()=>{
 const f=await fixture(1);try{
 await learnAll(f.repo);const session=await f.repo.startSession('deck','free',day+1);
 await rate(f.repo,session.id,2,day+1);
 const old=await f.db.get('study_sessions',session.id);delete old.targets[0].official_rating;
 await f.db.put('study_sessions',old);
 const restored=await f.repo.readSession(session.id,day+2);
 assert.equal(restored.session.targets[0].official_rating,2);
 await rate(f.repo,session.id,4,day+3);
 assert.equal(reviews(await f.repo.readDeck('deck')).length,1);
 assert.equal((await f.repo.readSession(session.id)).session.targets[0].official_rating,2);
 }finally{await f.close();}
});

test('free first rating atomically rolls back session, FSRS event/state and outbox on write failure',async()=>{
 const f=await fixture(1);try{
 await learnAll(f.repo);const session=await f.repo.startSession('deck','free',day+1);
 const before=await f.repo.exportData(),pending=await f.repo.pending(),original=crypto.randomUUID;
 Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>()=>{}});
 try{await assert.rejects(()=>rate(f.repo,session.id,3,day+1));}
 finally{Object.defineProperty(crypto,'randomUUID',{configurable:true,value:original});}
 assert.deepEqual(await f.repo.exportData(),before);assert.deepEqual(await f.repo.pending(),pending);
 await rate(f.repo,session.id,3,day+1);
 assert.equal(reviews(await f.repo.readDeck('deck')).length,1);
 }finally{await f.close();}
});

test('review selection uses caller time: New, random Due, then nearest not-due; excludes unlearned',()=>{
 const api=require('../src/features/study/studyFSRS.ts');
 const snapshot=api.migrateStudyDeck({id:'deck',study_items:Array.from({length:9},(_,i)=>({id:String(i),front:String(i),back:'字'}))},day);
 snapshot.states.forEach((s,i)=>{
   if(i<8)s.learned_at=day-1000;
   if(i>=3&&i<8)s.fsrs={...api.serializeFSRS(api.schedulerCard(s,day)),due:[day-5000,day,day+3000,day+1000,day+2000][i-3]};
 });
 const select=limit=>{snapshot.settings.review_limit=limit;return selectSessionCards(snapshot,'free',day).map(c=>snapshot.cards.indexOf(c));};
 const original=Math.random;
 try {
   Math.random=()=>0;
   assert.deepEqual(select(2),[1,2],'overflow New is shuffled');
   assert.deepEqual(select(4),[0,1,2,4],'boundary due is eligible; most overdue is not privileged');
   assert.deepEqual(select(6),[0,1,2,3,4,6]);
   assert.deepEqual(select(7),[0,1,2,3,4,6,7]);
   assert.deepEqual(select(20),[0,1,2,3,4,6,7,5]);
   snapshot.settings.review_limit=4;
   assert.deepEqual(selectSessionCards(snapshot,'free',day-1).map(c=>snapshot.cards.indexOf(c)),[0,1,2,3]);
   assert.deepEqual(selectSessionCards(snapshot,'daily',day).map(c=>snapshot.cards.indexOf(c)),[8]);
 } finally {Math.random=original;}
});
test('daily fixed batch survives midnight/reopen, quota edits, Easy introduces without FSRS, repeat same batch',async()=>{
 const f=await fixture();try{
 await f.repo.configure('deck',{new_limit:2});let session=await f.repo.startSession('deck','daily',day);
 const ids=session.targets.map(t=>t.card_id);await rate(f.repo,session.id,2);await rate(f.repo,session.id,3);
 assert.equal((await f.repo.readDeck('deck')).events.length,0);
 await f.repo.configure('deck',{new_limit:3});const reopened=new StudyRepository(f.db,()=>null,'other');
 assert.equal((await reopened.startSession('deck','daily',day+600000)).id,session.id);
 const first=await rate(reopened,session.id,4);let snapshot=await reopened.readDeck('deck');
 assert.equal(snapshot.states.filter(isLearned).length,1);assert.equal(snapshot.events.length,1);
 assert.equal(snapshot.events[0].kind,'introduce');assert.equal(snapshot.events[0].rating,null);
 assert.equal(snapshot.events[0].log,null);assert.equal(snapshot.events[0].source,'daily_learning');
 assert.equal(snapshot.events[0].after.learned_at,day);assert.equal(snapshot.events[0].after.fsrs,null);
 assert.equal(freezingInterval(snapshot.events[0].after),null);
 await reopened.rateSession(first.input);assert.equal((await reopened.readDeck('deck')).events.length,1);
 await rate(reopened,session.id,4);session=await reopened.startSession('deck','daily',day+1000);
 assert.deepEqual(session.targets.map(t=>t.card_id),ids);assert.ok(session.targets.every(t=>t.easy_at===null));
 await rate(reopened,session.id,4);await rate(reopened,session.id,4);assert.equal((await reopened.readDeck('deck')).events.length,2);
 assert.equal((await reopened.readDeck('deck')).events.filter(e=>e.kind==='review').length,0);
 const tomorrow=await reopened.startSession('deck','daily',day+600000);assert.equal(tomorrow.targets.length,1);
 }finally{await f.close();}
});
test('free selects only learned cards, permits early review, first Hard stays official through Good and Easy',async()=>{
 const f=await fixture();try{
 const empty=await f.repo.startSession('deck','free',day);assert.equal(empty.targets.length,0);
 await f.repo.configure('deck',{new_limit:1});const daily=await f.repo.startSession('deck','daily',day);await rate(f.repo,daily.id,4);
 const free=await f.repo.startSession('deck','free',day+1000);assert.equal(free.targets.length,1);
 await rate(f.repo,free.id,2,day+1000);const official=(await f.repo.readDeck('deck')).states.find(s=>s.id===free.queue[0]);
 assert.equal(freezingInterval(official),900000);
 await rate(f.repo,free.id,3,day+2000);await rate(f.repo,free.id,4,day+3000);
 const after=await f.repo.readDeck('deck');assert.deepEqual(after.states.find(s=>s.id===official.id),official);assert.equal(after.events.filter(e=>e.source==='free_review').length,1);
 assert.ok((await f.repo.readSession(free.id)).session.completed_at);
 const next=await f.repo.startSession('deck','free',day+4000);await rate(f.repo,next.id,4,day+4000);assert.equal((await f.repo.readDeck('deck')).events.filter(e=>e.source==='free_review').length,2);
 }finally{await f.close();}
});
test('session official event, state, mastery and outbox all roll back on persistence failure',async()=>{
 const f=await fixture(1);try{
 const session=await f.repo.startSession('deck','daily',day);const before=await f.repo.readSession(session.id);const original=crypto.randomUUID;
 Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>()=>{}});
 try{await assert.rejects(()=>rate(f.repo,session.id,4));}finally{Object.defineProperty(crypto,'randomUUID',{configurable:true,value:original});}
 assert.deepEqual(await f.repo.readSession(session.id),before);assert.equal((await f.repo.readDeck('deck')).events.length,0);
 await rate(f.repo,session.id,4);assert.equal((await f.repo.readDeck('deck')).events.length,1);
 }finally{await f.close();}
});
test('delete and reset remove stale generation targets; reset can relearn in a fresh daily session',async()=>{
 const f=await fixture(2);try{
 const daily=await f.repo.startSession('deck','daily',day);await rate(f.repo,daily.id,4);const id=daily.queue[0];
 const free=await f.repo.startSession('deck','free',day);await f.repo.updateCard(id,{},true);
 assert.equal((await f.repo.readSession(free.id)).session.targets.length,0);
 assert.equal((await f.repo.readDeck('deck')).states.find(s=>s.id===id).learned_at,null);
 await f.repo.updateCard(daily.queue[1],{deleted_at:Date.now()});assert.ok((await f.repo.readSession(daily.id)).session.completed_at);
 const repeat=await f.repo.startSession('deck','daily',day);assert.equal(repeat.targets.length,1);assert.equal(repeat.targets[0].generation,1);
 await rate(f.repo,repeat.id,4);const snapshot=await f.repo.readDeck('deck');assert.equal(snapshot.events.filter(e=>e.source==='daily_learning').length,2);
 }finally{await f.close();}
});
test('A–Z is live and independent of custom order; blank New state has no edit warning',async()=>{
 const f=await fixture();try{
 let snapshot=await f.repo.readDeck('deck');assert.equal(hasLearningData(snapshot.states[0]),false);
 await f.repo.configure('deck',{sort_mode:'az'});await f.repo.addCards('deck',[{front:'banana',back:'蕉'}]);snapshot=await f.repo.readDeck('deck');
 assert.deepEqual(displayStudyCards(snapshot.cards,'az').map(c=>c.front),['apple','banana','pear','zebra']);
 assert.deepEqual(displayStudyCards(snapshot.cards,'custom').map(c=>c.front),['zebra','apple','pear','banana']);
 await assert.rejects(()=>f.repo.reorder('deck',snapshot.cards.map(c=>c.id)),/A–Z/);
 }finally{await f.close();}
});
test('only four authorized legacy IDs reset, keeping snapshot/history without fabricated reviews',async()=>{
 const f=await fixture(0);try{
 const page={id:'page_kXB_pon1cdluNzbAk2EBJ',study_items:[{id:'item_da626310-0b85-4ecd-88d0-dee59e00599d',front:'raise',back:'升起',review_count:99,mastery:'mastered',daily_due_at:day+100000,daily_introduced_at:day-1000}]};
 await f.repo.ensureDeck(page);await f.repo.ensureDeck(page);const snapshot=await f.repo.readDeck(page.id);
 assert.equal(isLearned(snapshot.states[0]),false);assert.equal(snapshot.states[0].legacy_due_at,null);assert.equal(snapshot.cards[0].legacy.item.review_count,99);
 assert.equal(snapshot.events.length,1);assert.equal(snapshot.events[0].kind,'reset');assert.equal(snapshot.events[0].source,'legacy_test_reset');
 }finally{await f.close();}
});

test('free fills not-due cards by nearest due, respects limit and freezes its targets',async()=>{
 const f=await fixture();try{
 const daily=await f.repo.startSession('deck','daily',day);for(let i=0;i<3;i++)await rate(f.repo,daily.id,4);
 const initial=await f.repo.startSession('deck','free',day+1);
 await rate(f.repo,initial.id,3,day+1);await rate(f.repo,initial.id,2,day+2);await rate(f.repo,initial.id,4,day+3);
 while((await f.repo.readSession(initial.id)).session.completed_at==null)await rate(f.repo,initial.id,4,day+4);
 await f.repo.configure('deck',{review_limit:2});const snapshot=await f.repo.readDeck('deck');
 const next=await f.repo.startSession('deck','free',day+5);assert.equal(next.targets.length,2);
 assert.equal(next.targets[0].card_id,initial.targets[1].card_id,'15-minute Hard outranks both day intervals');
 assert.equal(freezingInterval(snapshot.states.find(s=>s.id===next.targets[0].card_id)),900000);
 await f.repo.configure('deck',{review_limit:3});assert.deepEqual((await f.repo.startSession('deck','free',day+6)).targets,next.targets);
 }finally{await f.close();}
});

test('v3 backup restores unfinished sessions and official IDs; old backups do not erase them',async()=>{
 const {IndexedDBAdapter}=require('../src/infrastructure/storage/IndexedDBAdapter.ts');await deleteDB('nexus');let adapter=new IndexedDBAdapter();await adapter.init();
 try{
 const page=await adapter.createPage({kind:'study_set'});let repo=adapter.getStudyRepository();await repo.ensureDeck(page);await repo.addCards(page.id,[{front:'word',back:'字'}]);
 const daily=await repo.startSession(page.id,'daily',day);await rate(repo,daily.id,4);
 const free=await repo.startSession(page.id,'free',day+1);await rate(repo,free.id,2,day+1);
 const backup=await adapter.exportWorkspaceBackup();assert.equal(backup.study.sessions.length,3);
 await adapter.close();await deleteDB('nexus');adapter=new IndexedDBAdapter();await adapter.init();await adapter.importWorkspaceBackup(backup);repo=adapter.getStudyRepository();
 assert.equal((await repo.startSession(page.id,'free',day+2)).id,free.id);await rate(repo,free.id,4,day+2);
 assert.equal((await repo.readDeck(page.id)).events.length,2);
 const old=structuredClone(backup);old.schema_version=2;delete old.study.sessions;await adapter.importWorkspaceBackup(old);
 assert.equal((await repo.exportData()).sessions.length,3);
 }finally{await adapter.close();await deleteDB('nexus');}
});

test('a cloud session cannot outrun its event/state snapshot; partial pulls roll back and retry safely',async()=>{
 const source=await fixture(1),target=await fixture(0);try{
 const daily=await source.repo.startSession('deck','daily',day);const before=await source.repo.exportData();
 await rate(source.repo,daily.id,4);const complete=await source.repo.exportData();
 await assert.rejects(()=>target.repo.mergeRemote({...complete,states:before.states}),/不完整進度/);
 assert.equal((await target.repo.readDeck('deck')).events.length,0);
 assert.equal((await target.repo.exportData()).sessions.length,0);
 await target.repo.mergeRemote(complete);assert.equal((await target.repo.readDeck('deck')).events.length,1);
 const repeat=await target.repo.startSession('deck','daily',day+1);await rate(target.repo,repeat.id,4,day+1);
 assert.equal((await target.repo.readDeck('deck')).events.length,1);
 }finally{await source.close();await target.close();}
});
