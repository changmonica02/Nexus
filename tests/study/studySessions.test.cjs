require('../loadStudy.cjs');require('fake-indexeddb/auto');
const {openDB,deleteDB}=require('idb');
const {StudyRepository,STUDY_STORES}=require('../../src/features/study/StudyRepository.ts');
const {displayStudyCards,hasLearningData}=require('../../src/features/study/studySessions.ts');
const test=require('node:test'),assert=require('node:assert/strict');
const day=new Date(2026,8,24,23,55).getTime();
async function fixture(count=3){
 const name=crypto.randomUUID();const db=await openDB(name,1,{upgrade(db){for(const name of STUDY_STORES){const s=db.createObjectStore(name,{keyPath:'id'});if(['study_cards','study_states','study_events'].includes(name))s.createIndex('deck','deck_id');}}});
 const repo=new StudyRepository(db,()=>null,'test');await repo.ensureDeck({id:'deck',study_items:[]});await repo.addCards('deck',Array.from({length:count},(_,i)=>({front:['zebra','apple','pear'][i]??String(i),back:String(i)})));
 return {db,repo,close:async()=>{db.close();await deleteDB(name);}};
}
async function rate(repo,sessionId,rating,now=day){
 const {session,snapshot}=await repo.presentScheduled(sessionId,now);
 const id=session.queue[0],card=snapshot.cards.find(c=>c.id===id),state=snapshot.states.find(s=>s.id===id);
 return repo.rateSession({sessionId,cardId:id,revision:session.revision,contentRevision:card.content_revision,expectedHead:state.head,rating,actionId:crypto.randomUUID(),now});
}

for(const mode of ['daily','free'])test(`an unfinished ${mode} session converts to the existing scheduled flow`,async()=>{
 const f=await fixture(1);try{
  const initial=await f.repo.startSession('deck','scheduled',day);
  const legacy={...initial,mode,settings_snapshot:undefined};
  await f.db.put('study_sessions',legacy);
  assert.deepEqual((await f.repo.readSession(legacy.id,day)).session,legacy);
  await assert.rejects(()=>f.repo.startSession('deck',mode,day),/正式排程/);
  const resumed=await f.repo.openScheduledSession('deck',day);
  assert.equal(resumed.session.id,legacy.id);
  assert.equal(resumed.session.mode,'scheduled');
  assert.equal(resumed.session.legacy_mode,mode);
  assert.equal((await f.repo.readDeck('deck',true)).events.filter(e=>e.kind==='review').length,0);
  await rate(f.repo,legacy.id,3);
  const history=(await f.repo.readDeck('deck',true)).events;
  assert.equal(history.filter(e=>e.kind==='review'&&e.source==='scheduled').length,1);
 }finally{await f.close();}
});

test('A–Z is live and independent of custom order; blank New state has no edit warning',async()=>{
 const f=await fixture();try{
 let snapshot=await f.repo.readDeck('deck',true);assert.equal(hasLearningData(snapshot.states[0]),false);
 await f.repo.configure('deck',{sort_mode:'az'});await f.repo.addCards('deck',[{front:'banana',back:'蕉'}]);snapshot=await f.repo.readDeck('deck',true);
 assert.deepEqual(displayStudyCards(snapshot.cards,'az').map(c=>c.front),['apple','banana','pear','zebra']);
 assert.deepEqual(displayStudyCards(snapshot.cards,'custom').map(c=>c.front),['zebra','apple','pear','banana']);
 await assert.rejects(()=>f.repo.reorder('deck',snapshot.cards.map(c=>c.id)),/A–Z/);
 }finally{await f.close();}
});
test('retired Page cards never create test resets or progress',async()=>{const f=await fixture(0);try{const page={id:'page_kXB_pon1cdluNzbAk2EBJ',study_items:[{id:'item_da626310-0b85-4ecd-88d0-dee59e00599d',front:'discard',back:'discard'}]};await f.repo.ensureDeck(page);await f.repo.ensureDeck(page);const snapshot=await f.repo.readDeck(page.id,true);assert.equal(snapshot.cards.length,0);assert.equal(snapshot.states.length,0);assert.equal(snapshot.events.length,0);}finally{await f.close();}});

test('v3 backup restores unfinished sessions and official IDs; old backups do not erase them',async()=>{
 const {IndexedDBAdapter}=require('../../src/infrastructure/storage/IndexedDBAdapter.ts');await deleteDB('nexus');let adapter=new IndexedDBAdapter();await adapter.init();
 try{
 const page=await adapter.createPage({kind:'study_set'});let repo=adapter.getStudyRepository();await repo.ensureDeck(page);await repo.addCards(page.id,[{front:'word',back:'字'}]);
 const {session}=await repo.openScheduledSession(page.id,day);
 const backup=await adapter.exportWorkspaceBackup();assert.equal(backup.study.sessions.length,1);
 await adapter.close();await deleteDB('nexus');adapter=new IndexedDBAdapter();await adapter.init();await adapter.importWorkspaceBackup(backup);repo=adapter.getStudyRepository();
 assert.equal((await repo.startSession(page.id,'scheduled',day+2)).id,session.id);await rate(repo,session.id,3,day+2);
 assert.equal((await repo.readDeck(page.id,true)).events.length,2);
 const old=structuredClone(backup);old.schema_version=2;delete old.study.sessions;await adapter.importWorkspaceBackup(old);
 assert.equal((await repo.exportData()).sessions.length,1);
 }finally{await adapter.close();await deleteDB('nexus');}
});

test('a cloud session cannot outrun its event/state snapshot; partial pulls roll back and retry safely',async()=>{
 const source=await fixture(1),target=await fixture(0);try{
 const {session}=await source.repo.openScheduledSession('deck',day);const before=await source.repo.exportData();
 await rate(source.repo,session.id,3);const complete=await source.repo.exportData();
 await assert.rejects(()=>target.repo.mergeRemote({...complete,states:before.states}),/不完整進度/);
 assert.equal((await target.repo.readDeck('deck',true)).events.length,0);
 assert.equal((await target.repo.exportData()).sessions.length,0);
 await target.repo.mergeRemote(complete);assert.equal((await target.repo.readDeck('deck',true)).events.length,2);
 await target.repo.mergeRemote(complete);
 assert.equal((await target.repo.readDeck('deck',true)).events.length,2);
 }finally{await source.close();await target.close();}
});
