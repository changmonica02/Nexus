require('./loadStudy.cjs');
require('fake-indexeddb/auto');
const {openDB,deleteDB}=require('idb');
const {StudyRepository,STUDY_STORES}=require('../src/features/study/StudyRepository.ts');
const {IndexedDBAdapter}=require('../src/infrastructure/storage/IndexedDBAdapter.ts');
const test=require('node:test');const assert=require('node:assert/strict');
const now=new Date(2026,8,22,12).getTime();
async function fixture() {
 const name=crypto.randomUUID();const db=await openDB(name,1,{upgrade(db){for(const name of STUDY_STORES){const s=db.createObjectStore(name,{keyPath:'id'});if(['study_cards','study_states','study_events'].includes(name))s.createIndex('deck','deck_id');}}});
 const repo=new StudyRepository(db,()=>null,'test');await repo.ensureDeck({id:'deck',study_items:[]});await repo.addCards('deck',[{front:'apple',back:'蘋果'},{front:'pear',back:'梨'}]);
 return {db,repo,close:async()=>{db.close();await deleteDB(name);}};
}
test('presentation consumes quota durably before grading; reopen never replenishes allowance',async()=>{
 const f=await fixture();try{
 await f.repo.configure('deck',{new_limit:1});
 await f.repo.peekNext('deck',now);
 assert.equal((await f.repo.readDeck('deck',true)).events.length,0,'preloading is not presentation');
 const first=await f.repo.presentNext('deck',now);assert.ok(first);
 const reopened=new StudyRepository(f.db,()=>null,'second');
 const again=await reopened.presentNext('deck',now);assert.equal(again.card.id,first.card.id);
 assert.equal((await reopened.readDeck('deck',true)).events.length,1);
 await reopened.review(first.card.id,first.state.head,first.card.content_revision,3,'answer',now);
 assert.equal(await reopened.presentNext('deck',now),null);
 assert.ok(await reopened.presentNext('deck',now+86400000));
 }finally{await f.close();}
});
test('upgrading a v3 database preserves legacy pages and migrates only once',async()=>{
 await deleteDB('nexus');
 const legacy=await openDB('nexus',3,{upgrade(db){const p=db.createObjectStore('pages',{keyPath:'id'});p.createIndex('by_updated','updated_at');p.createIndex('by_deleted','deleted_at');db.createObjectStore('settings',{keyPath:'key'});db.createObjectStore('attachments',{keyPath:'id'});db.createObjectStore('binaries',{keyPath:'id'});}});
 const original={id:'old',kind:'study_set',updated_at:1,deleted_at:null,study_items:[{id:'one',front:'one',back:'一',mastery:'mastered',review_count:10,last_reviewed_at:1,daily_due_at:now+1000}]};
 await legacy.put('pages',original);legacy.close();
 const adapter=new IndexedDBAdapter();await adapter.init();
 try{const page=await adapter.getPage('old');assert.deepEqual(page,original);const repo=adapter.getStudyRepository();await repo.ensureDeck(page);await repo.ensureDeck(page);const snapshot=await repo.readDeck('old',true);assert.equal(snapshot.cards.length,1);assert.equal(snapshot.events.length,0);assert.equal(snapshot.states[0].legacy_due_at,now+1000);}
 finally{await adapter.close();await deleteDB('nexus');}
});
test('anonymous claim includes review events and pending operations, and account switch stays isolated',async()=>{
 await deleteDB('nexus');const adapter=new IndexedDBAdapter();await adapter.init();
 try{
 const page=await adapter.createPage({kind:'study_set'}),repo=adapter.getStudyRepository();await repo.ensureDeck(page);await repo.addCards(page.id,[{front:'one',back:'一'}]);
 const q=await repo.presentNext(page.id,now);await repo.review(q.card.id,q.state.head,1,3,'claim-event',now);
 const user='11111111-1111-4111-8111-111111111111';await adapter.claimAnonymousWorkspace(user);adapter.setWorkspaceOwner(user);
 const owned=adapter.getStudyRepository(),snapshot=await owned.readDeck(page.id,true);
 assert.equal(snapshot.events[0].owner_id,user);assert.equal(snapshot.events[0].after.owner_id,user);
 assert.ok((await owned.pending()).every(op=>op.owner_id===user && op.value.owner_id===user));
 adapter.setWorkspaceOwner('other');await assert.rejects(()=>adapter.getStudyRepository().readDeck(page.id,true));
 }finally{await adapter.close();await deleteDB('nexus');}
});
test('answer, state and outbox persist together, duplicate event retries do not double count',async()=>{
 const f=await fixture();try{
 const q=await f.repo.presentNext('deck',now);
 const e=await f.repo.review(q.card.id,q.state.head,q.card.content_revision,1,'answer',now);
 await f.repo.review(q.card.id,q.state.head,q.card.content_revision,1,'answer',now);
 const reopened=new StudyRepository(f.db,()=>null,'second');const snapshot=await reopened.readDeck('deck',true);
 assert.equal(snapshot.events.filter(e=>e.kind==='review').length,1);
 assert.equal(snapshot.states.find(s=>s.id===q.card.id).head,e.id);
 assert.equal((await reopened.pending()).filter(op=>op.kind==='event'&&op.value.id===e.id).length,1);
 await assert.rejects(()=>reopened.review(q.card.id,q.state.head,q.card.content_revision,3,'stale',now));
 assert.equal((await reopened.readDeck('deck',true)).events.length,2);
 }finally{await f.close();}
});
test('failure of outbox write rolls back event and state, preserving retry on same question',async()=>{
 const f=await fixture();try{
 const q=await f.repo.presentNext('deck',now);
 // IndexedDB structured clone failure during the transaction must roll back prior writes.
 const original=globalThis.crypto.randomUUID;
 Object.defineProperty(globalThis.crypto,'randomUUID',{configurable:true,value:()=>()=>{}});
 try{await assert.rejects(()=>f.repo.review(q.card.id,q.state.head,q.card.content_revision,3,'failed',now));}
 finally{Object.defineProperty(globalThis.crypto,'randomUUID',{configurable:true,value:original});}
 const snapshot=await f.repo.readDeck('deck',true);
 assert.equal(snapshot.events.some(e=>e.id==='failed'),false);
 assert.equal(snapshot.states.find(s=>s.id===q.card.id).head,q.state.head);
 }finally{await f.close();}
});
test('legacy migration idempotent; text changes preserve schedule unless explicitly reset; copies start New',async()=>{
 const f=await fixture();try{
 const item={id:'x',front:'word',back:'字',mastery:'mastered',review_count:50,last_reviewed_at:1,daily_due_at:now+10000};
 const page={id:'old',study_items:[item]};
 let snapshot=await f.repo.ensureDeck(page);assert.deepEqual(snapshot.cards[0].legacy.item,item);
 await f.repo.ensureDeck(page);assert.equal((await f.repo.readDeck('old',true)).cards.length,1);
 assert.equal(snapshot.states[0].fsrs,null);assert.equal(snapshot.events.length,0);
 await f.repo.configure('old',{direction_confirmed:true});assert.equal(await f.repo.presentNext('old',now),null);
 const q=await f.repo.presentNext('old',now+10000);await f.repo.review(q.card.id,q.state.head,1,3,'legacy-real',now+10000);
 const state=(await f.repo.readDeck('old',true)).states[0];await f.repo.updateCard(q.card.id,{back:'單字'});
 assert.deepEqual((await f.repo.readDeck('old',true)).states[0],state);
 await f.repo.addCards('old',[{front:q.card.front,back:q.card.back}]);snapshot=await f.repo.readDeck('old',true);
 assert.equal(snapshot.states.find(s=>s.id!==q.card.id).fsrs,null);
 await f.repo.updateCard(q.card.id,{front:'changed'},true);snapshot=await f.repo.readDeck('old',true);
 assert.equal(snapshot.states.find(s=>s.id===q.card.id).fsrs,null);assert.equal(snapshot.events.filter(e=>e.kind==='review').length,1);
 }finally{await f.close();}
});
test('remote event union preserves divergent histories and blocks scheduling conflict',async()=>{
 const f=await fixture();try{
 const q=await f.repo.presentNext('deck',now);
 const {createStudyEvent}=require('../src/features/study/studyFSRS.ts');
 await f.repo.review(q.card.id,q.state.head,1,3,'local',now);
 const remote=createStudyEvent(q.card,q.state,'review',now,'remote','remote',1);
 await f.repo.mergeRemote({cards:[],settings:[],events:[remote],states:[remote.after]});
 const snapshot=await f.repo.readDeck('deck',true);assert.equal(snapshot.events.filter(e=>e.kind==='review').length,2);
 assert.equal(snapshot.states.find(s=>s.id===q.card.id).conflict,true);
 }finally{await f.close();}
});
test('v2 backup round trip retains events; importing old backup cannot erase FSRS history',async()=>{
 await deleteDB('nexus');let adapter=new IndexedDBAdapter();await adapter.init();
 try{
 const page=await adapter.createPage({kind:'study_set'});let repo=adapter.getStudyRepository();await repo.ensureDeck(page);await repo.addCards(page.id,[{front:'one',back:'一'}]);
 const q=await repo.presentNext(page.id,now);await repo.review(q.card.id,q.state.head,1,3,'backup-event',now);
 const backup=await adapter.exportWorkspaceBackup();assert.equal(backup.schema_version,3);
 await adapter.close();await deleteDB('nexus');adapter=new IndexedDBAdapter();await adapter.init();await adapter.importWorkspaceBackup(backup);
 repo=adapter.getStudyRepository();assert.equal((await repo.readDeck(page.id,true)).events.filter(e=>e.kind==='review').length,1);
 const old={...backup,schema_version:1};delete old.study;await adapter.importWorkspaceBackup(old);
 assert.equal((await repo.readDeck(page.id,true)).events.filter(e=>e.kind==='review').length,1);
 const damaged=structuredClone(backup);damaged.study.events=[];
 await assert.rejects(()=>adapter.importWorkspaceBackup(damaged),/歷史/);
 assert.equal((await repo.readDeck(page.id,true)).events.filter(e=>e.kind==='review').length,1);
 }finally{await adapter.close();await deleteDB('nexus');}
});
