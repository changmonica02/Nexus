require('../loadStudy.cjs');
const {recordLegacyEvent}=require('../fixtures/legacyStudyEvents.cjs');
require('fake-indexeddb/auto');
const {openDB,deleteDB}=require('idb');
const {StudyRepository,STUDY_STORES}=require('../../src/features/study/StudyRepository.ts');
const {IndexedDBAdapter}=require('../../src/infrastructure/storage/IndexedDBAdapter.ts');
const test=require('node:test');const assert=require('node:assert/strict');
const now=new Date(2026,8,22,12).getTime();
async function fixture() {
 const name=crypto.randomUUID();const db=await openDB(name,1,{upgrade(db){for(const name of STUDY_STORES){const s=db.createObjectStore(name,{keyPath:'id'});if(['study_cards','study_states','study_events'].includes(name))s.createIndex('deck','deck_id');}}});
 const repo=new StudyRepository(db,()=>null,'test');await repo.ensureDeck({id:'deck',study_items:[]});await repo.addCards('deck',[{front:'apple',back:'蘋果'},{front:'pear',back:'梨'}]);
 return {db,repo,close:async()=>{db.close();await deleteDB(name);}};
}
function answerInput({session,snapshot},rating,actionId,at=now){
 const card=snapshot.cards.find(card=>card.id===session.presented_card_id);
 const state=snapshot.states.find(state=>state.id===card.id);
 return {sessionId:session.id,cardId:card.id,revision:session.revision,contentRevision:card.content_revision,expectedHead:state.head,rating,actionId,now:at};
}
test('presentation consumes quota durably before grading; reopen never replenishes allowance',async()=>{
 const f=await fixture();try{
 await f.repo.configure('deck',{new_limit:1});
 const planned=await f.repo.startSession('deck','scheduled',now);
 assert.equal((await f.repo.readDeck('deck',true)).events.length,0,'planning is not presentation');
 const first=await f.repo.openScheduledSession('deck',now);
 assert.equal(first.session.id,planned.id);
 assert.ok(first.session.presented_card_id);
 const reopened=new StudyRepository(f.db,()=>null,'second');
 const again=await reopened.openScheduledSession('deck',now);
 assert.equal(again.session.presented_card_id,first.session.presented_card_id);
 assert.equal((await reopened.readDeck('deck',true)).events.length,1);
 await reopened.rateSession(answerInput(again,3,'answer'));
 assert.equal((await reopened.startSession('deck','scheduled',now)).targets.length,0);
 assert.ok((await reopened.startSession('deck','scheduled',now+86400000)).targets.length);
 }finally{await f.close();}
});
test('upgrading a v3 database preserves legacy pages and migrates only once',async()=>{
 await deleteDB('nexus');
 const legacy=await openDB('nexus',3,{upgrade(db){const p=db.createObjectStore('pages',{keyPath:'id'});p.createIndex('by_updated','updated_at');p.createIndex('by_deleted','deleted_at');db.createObjectStore('settings',{keyPath:'key'});db.createObjectStore('attachments',{keyPath:'id'});db.createObjectStore('binaries',{keyPath:'id'});}});
 const original={id:'old',kind:'study_set',updated_at:1,deleted_at:null,study_items:[{id:'one',front:'one',back:'一',mastery:'mastered',review_count:10,last_reviewed_at:1,daily_due_at:now+1000}]};
 await legacy.put('pages',original);legacy.close();
 const adapter=new IndexedDBAdapter();await adapter.init();
 try{const page=await adapter.getPage('old');assert.deepEqual(page,original);const repo=adapter.getStudyRepository();await repo.ensureDeck(page);await repo.ensureDeck(page);const snapshot=await repo.readDeck('old',true);assert.equal(snapshot.cards.length,0);assert.equal(snapshot.events.length,0);assert.equal(snapshot.states.length,0);}
 finally{await adapter.close();await deleteDB('nexus');}
});
test('anonymous claim includes review events and pending operations, and account switch stays isolated',async()=>{
 await deleteDB('nexus');const adapter=new IndexedDBAdapter();await adapter.init();
 try{
 const page=await adapter.createPage({kind:'study_set'}),repo=adapter.getStudyRepository();await repo.ensureDeck(page);await repo.addCards(page.id,[{front:'one',back:'一'}]);
 await repo.rateSession(answerInput(await repo.openScheduledSession(page.id,now),3,'claim-event'));
 const user='11111111-1111-4111-8111-111111111111';await adapter.claimAnonymousWorkspace(user);adapter.setWorkspaceOwner(user);
 const owned=adapter.getStudyRepository(),snapshot=await owned.readDeck(page.id,true);
 assert.equal(snapshot.events[0].owner_id,user);assert.equal(snapshot.events[0].after.owner_id,user);
 assert.ok((await owned.pending()).every(op=>op.owner_id===user && op.value.owner_id===user));
 adapter.setWorkspaceOwner('other');await assert.rejects(()=>adapter.getStudyRepository().readDeck(page.id,true));
 }finally{await adapter.close();await deleteDB('nexus');}
});
test('answer, state and outbox persist together, duplicate event retries do not double count',async()=>{
 const f=await fixture();try{
 const question=await f.repo.openScheduledSession('deck',now);
 const input=answerInput(question,1,'answer');
 const answered=await f.repo.rateSession(input);
 const reopened=new StudyRepository(f.db,()=>null,'second');
 assert.deepEqual(await reopened.rateSession(input),answered);
 const snapshot=await reopened.readDeck('deck',true);
 const answer=snapshot.events.find(event=>event.kind==='review');
 assert.ok(answer);
 assert.equal(snapshot.states.find(state=>state.id===input.cardId).head,answer.id);
 assert.equal((await reopened.pending()).filter(op=>op.kind==='event'&&op.value.id===answer.id).length,1);
 await assert.rejects(()=>reopened.rateSession({...input,rating:3,actionId:'stale'}));
 assert.equal((await reopened.readDeck('deck',true)).events.length,2);
 }finally{await f.close();}
});
test('failure of outbox write rolls back event and state, preserving retry on same question',async()=>{
 const f=await fixture();try{
 const input=answerInput(await f.repo.openScheduledSession('deck',now),3,'failed');
 // IndexedDB structured clone failure during the transaction must roll back prior writes.
 const original=globalThis.crypto.randomUUID;
 let generated=0;
 Object.defineProperty(globalThis.crypto,'randomUUID',{configurable:true,value:()=>++generated===2?()=>{}:original.call(globalThis.crypto)});
 try{await assert.rejects(()=>f.repo.rateSession(input),{name:'DataCloneError'});}
 finally{Object.defineProperty(globalThis.crypto,'randomUUID',{configurable:true,value:original});}
 const snapshot=await f.repo.readDeck('deck',true);
 assert.equal(snapshot.events.some(e=>e.kind==='review'),false);
 assert.equal(snapshot.states.find(s=>s.id===input.cardId).head,input.expectedHead);
 await f.repo.rateSession(input);
 assert.equal((await f.repo.readDeck('deck',true)).events.filter(e=>e.kind==='review').length,1);
 }finally{await f.close();}
});
test('Page-only cards are ignored; new cards preserve scheduling on edits and copies start New',async()=>{
 const f=await fixture();try{
 const item={id:'x',front:'word',back:'字',mastery:'mastered',review_count:50,last_reviewed_at:1,daily_due_at:now+10000};
 const page={id:'old',study_items:[item]};
 let snapshot=await f.repo.ensureDeck(page);assert.equal(snapshot.cards.length,0);await f.repo.addCards('old',[{front:item.front,back:item.back}]);snapshot=await f.repo.readDeck('old',true);
 await f.repo.ensureDeck(page);assert.equal((await f.repo.readDeck('old',true)).cards.length,1);
 assert.equal(snapshot.states[0].fsrs,null);assert.equal(snapshot.events.length,0);
 const [card]=snapshot.cards;
 await recordLegacyEvent(f.db,card.id,'introduce',now,'test',crypto.randomUUID());
 await recordLegacyEvent(f.db,card.id,'review',now+10000,'test','legacy-real',3);
 const state=(await f.repo.readDeck('old',true)).states[0];await f.repo.updateCard(card.id,{back:'單字'});
 assert.deepEqual((await f.repo.readDeck('old',true)).states[0],state);
 await f.repo.addCards('old',[{front:card.front,back:card.back}]);snapshot=await f.repo.readDeck('old',true);
 assert.equal(snapshot.states.find(s=>s.id!==card.id).fsrs,null);
 await f.repo.updateCard(card.id,{front:'changed'},true);snapshot=await f.repo.readDeck('old',true);
 assert.equal(snapshot.states.find(s=>s.id===card.id).fsrs,null);assert.equal(snapshot.events.filter(e=>e.kind==='review').length,1);
 }finally{await f.close();}
});
test('remote event union preserves divergent histories and blocks scheduling conflict',async()=>{
 const f=await fixture();try{
 const [card]=(await f.repo.readDeck('deck')).cards;
 const {createStudyEvent}=require('../../src/features/study/studyFSRS.ts');
 const intro=await recordLegacyEvent(f.db,card.id,'introduce',now,'test',crypto.randomUUID());
 await recordLegacyEvent(f.db,card.id,'review',now,'test','local',3);
 const remote=createStudyEvent(card,intro.after,'review',now,'remote','remote',1);
 await f.repo.mergeRemote({cards:[],settings:[],events:[remote],states:[remote.after]});
 const snapshot=await f.repo.readDeck('deck',true);assert.equal(snapshot.events.filter(e=>e.kind==='review').length,2);
 assert.equal(snapshot.states.find(s=>s.id===card.id).conflict,true);
 }finally{await f.close();}
});
test('v2 backup round trip retains events; importing old backup cannot erase FSRS history',async()=>{
 await deleteDB('nexus');let adapter=new IndexedDBAdapter();await adapter.init();
 try{
 const page=await adapter.createPage({kind:'study_set'});let repo=adapter.getStudyRepository();await repo.ensureDeck(page);await repo.addCards(page.id,[{front:'one',back:'一'}]);
 const db=await openDB('nexus');
 try{const [card]=(await repo.readDeck(page.id)).cards;await recordLegacyEvent(db,card.id,'review',now,'test','backup-event',3);}finally{db.close();}
 const backup=await adapter.exportWorkspaceBackup();assert.equal(backup.schema_version,4);
 await adapter.close();await deleteDB('nexus');adapter=new IndexedDBAdapter();await adapter.init();await adapter.importWorkspaceBackup(backup);
 repo=adapter.getStudyRepository();assert.equal((await repo.readDeck(page.id,true)).events.filter(e=>e.kind==='review').length,1);
 const old={...backup,schema_version:1};delete old.study;await adapter.importWorkspaceBackup(old);
 assert.equal((await repo.readDeck(page.id,true)).events.filter(e=>e.kind==='review').length,1);
 const damaged=structuredClone(backup);damaged.study.events=[];
 await assert.rejects(()=>adapter.importWorkspaceBackup(damaged),/歷史/);
 assert.equal((await repo.readDeck(page.id,true)).events.filter(e=>e.kind==='review').length,1);
 }finally{await adapter.close();await deleteDB('nexus');}
});
