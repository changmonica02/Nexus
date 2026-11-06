const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./fixtures/studyStyleRepository.cjs');
// Repeatable local repository benchmark. No simulated latency is called production latency.
// BASELINE=1 exercises main's exact four-read opening sequence, before the UI changes.
test('startup: small/6300-card new/resumed sessions retain IDs, quota and events',async()=>{
 const results=[];
 for(const count of [20,6300])for(const resumed of [false,true]){
  const f=await fixture(count);await f.repo.configure('deck',{direction_confirmed:true});
  const now=Date.now();let existing;if(resumed){existing=await f.repo.startSession('deck','scheduled',now);await f.repo.presentScheduled(existing.id,now);}
  let reads=0,records=0;const original=IDBIndex.prototype.getAll;
  IDBIndex.prototype.getAll=function(...args){const request=original.apply(this,args);if(['study_cards','study_states'].includes(this.objectStore.name)){reads++;request.addEventListener('success',()=>records+=request.result.length);}return request;};
  try{
   const begin=performance.now();let data;
   if(process.env.BASELINE==='1'){
    await f.repo.readScheduledDeck('deck');const s=await f.repo.startSession('deck','scheduled',now);await f.repo.readSession(s.id,now);data=await f.repo.presentScheduled(s.id,now);
   }else data=await f.repo.openScheduledSession('deck',now);
   const elapsed=performance.now()-begin;
   if(process.env.BASELINE!=='1'){assert.equal(reads,2);assert.equal(records,count*2);}
   if(existing)assert.equal(data.session.id,existing.id);
   assert.ok(data.session.queue.length);assert.equal((await f.repo.exportData()).events.filter(e=>e.kind==='introduce').length,1);
   results.push({count,resumed,ms:+elapsed.toFixed(2),fullReads:reads,records});
  }finally{IDBIndex.prototype.getAll=original;await f.close();}
 }
 console.log('STARTUP_BENCHMARK '+JSON.stringify(results));
});
