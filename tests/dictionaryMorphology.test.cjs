require('./loadStudy.cjs');require('fake-indexeddb/auto');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {readPublishedTargets}=require('../src/features/dictionary/reader.ts');
const {fixture,grade}=require('./fixtures/studyStyleRepository.cjs');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('linked etymology reads deduplicate, bound concurrency, reject drafts, tolerate failures and stop queued work after unmount',async()=>{
 let concurrent=0,max=0,calls=0;const client={rpc:async(_,args)=>{calls++;concurrent++;max=Math.max(max,concurrent);await new Promise(r=>setTimeout(r,2));concurrent--;if(args.entry_uuid===id(2))throw Error('offline');return{data:{entry:{id:args.entry_uuid,status:args.entry_uuid===id(3)?'draft':'published'}}};}};
 const ids=Array.from({length:12},(_,i)=>id(i+1)),result=await readPublishedTargets(client,[...ids,...ids]);assert.equal(calls,12);assert.equal(max,4);assert.equal(result.size,10);assert.equal(result.has(id(3)),false);
 calls=0;let active=true;client.rpc=async(_,args)=>{calls++;active=false;return{data:{entry:{id:args.entry_uuid,status:'published'}}};};assert.equal((await readPublishedTargets(client,ids,()=>active)).size,0);assert.equal(calls,1);
});
test('one-transaction opening retains resume, settings, quota, clear barrier, conflicts, ownership and rollback',async()=>{
 const f=await fixture(8,'owner');try{
  await f.repo.configure('deck',{direction_confirmed:true});const now=Date.now();
  const [first,second]=await Promise.all([f.repo.openScheduledSession('deck',now),f.repo.openScheduledSession('deck',now)]);assert.equal(first.session.id,second.session.id);
  let data=await f.repo.exportData();assert.equal(data.sessions.length,1);assert.equal(data.events.filter(e=>e.kind==='introduce').length,1);
  const before=structuredClone(data);await f.repo.openScheduledSession('deck',now);data=await f.repo.exportData();for(const k of ['cards','states','events','sessions'])assert.deepEqual(data[k],before[k]);
  await grade(f.repo,first.session.id,3,now);const graded=await f.repo.exportData();await f.repo.openScheduledSession('deck',now);assert.equal((await f.repo.exportData()).events.filter(e=>e.kind==='review').length,graded.events.filter(e=>e.kind==='review').length);
  const {StudyRepository}=require('../src/features/study/StudyRepository.ts');const foreign=new StudyRepository(f.db,()=> 'foreign','x');await assert.rejects(foreign.openScheduledSession('deck'),/帳號/);
  await f.repo.applyClearTimes([{owner_id:'owner',deck_id:'deck',operation_id:crypto.randomUUID(),cleared_at:now+10}]);const cleared=await f.repo.openScheduledSession('deck',now+20);assert.notEqual(cleared.session.id,first.session.id);await assert.rejects(f.repo.readPresentedSession(first.session.id),/study.sessionCleared/);assert.equal((await f.repo.exportData()).events.filter(e=>e.kind==='review').length,0);
  await f.db.put('study_sessions',{...cleared.session,conflict:true});const unchanged=await f.repo.exportData();await assert.rejects(f.repo.openScheduledSession('deck',now+30),/衝突/);assert.deepEqual(await f.repo.exportData(),unchanged);
 }finally{await f.close();}
});
