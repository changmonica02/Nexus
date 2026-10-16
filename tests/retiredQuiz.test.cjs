require('./loadStudy.cjs');require('fake-indexeddb/auto');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {openDB,deleteDB}=require('idb');
const {STUDY_STORES,StudyRepository}=require('../src/features/study/StudyRepository.ts');
const {QUIZ_STORES}=require('../src/features/study/legacyQuiz.ts');
const {syncStudy}=require('../src/features/study/studySync.ts');
test('formal sync leaves every legacy Quiz store unchanged, even authorized queues; ownerless empty sync has no Quiz login check',async()=>{
 const name=crypto.randomUUID(),db=await openDB(name,1,{upgrade(db){for(const s of [...STUDY_STORES,...QUIZ_STORES])db.createObjectStore(s,{keyPath:'id'});}});
 try{
 const snapshots={};for(const store of QUIZ_STORES){const value={id:store,owner_id:'owner',status:'authorized',payload:{original:true}};await db.put(store,value);snapshots[store]=[value];}
 const calls=[],client={rpc:async(name)=>{calls.push(name);assert.equal(name,'pull_study_changes');return {data:[],error:null};}};
 await syncStudy(new StudyRepository(db,()=> 'owner','device'),client,'owner');
 await syncStudy(new StudyRepository(db,()=>null,'device'),client,'owner');
 for(const store of QUIZ_STORES)assert.deepEqual(await db.getAll(store),snapshots[store]);
 assert.ok(calls.length>0);
 }finally{db.close();await deleteDB(name);}
});
test('product entry points cannot instantiate or retry canceled Quiz',()=>{
 for(const file of ['src/components/NexusApp.tsx','src/features/study/StudyRepository.ts','src/features/study/studySync.ts','src/infrastructure/sync/syncEngine.ts','src/features/study/components/StudySetView.tsx']){
  const source=fs.readFileSync(file,'utf8');assert.doesNotMatch(source,/QuizOfflinePrompt|QuizSession|getQuizRepository|syncQuiz|nexus-quiz-connectivity/);
 }
 assert.doesNotMatch(fs.readFileSync('src/infrastructure/storage/IndexedDBAdapter.ts','utf8'),/quiz\/quizPersistence/);
});
