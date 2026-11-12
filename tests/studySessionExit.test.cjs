require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,grade}=require('./fixtures/studyStyleRepository.cjs');
test('ending keeps actual forgotten answer, pending outbox and quota, never completes unanswered cards; restart uses latest settings',async()=>{
 const f=await fixture(3);try{
  const now=Date.now(),opened=await f.repo.openScheduledSession('deck',now),id=opened.session.id;
  await grade(f.repo,id,1,now);const before=await f.repo.exportData(),pending=await f.repo.pending();
  await f.repo.endSession(id,now+100);await f.repo.endSession(id,now+200);
  const ended=await f.repo.readSession(id,now+201);assert.deepEqual(ended.session.queue,[]);assert.equal(ended.session.completed_at,null);assert.equal(ended.session.answers,1);assert.equal(ended.session.ended_at,now+100);
  const after=await f.repo.exportData();for(const key of ['events','states','cards'])assert.deepEqual(after[key],before[key],key);assert.deepEqual(await f.repo.pending(),pending);
  assert.ok(ended.session.targets.some(t=>t.easy_at==null),'unanswered or forgotten remains unfinished');
  await f.repo.configure('deck',{review_limit:1});const next=await f.repo.openScheduledSession('deck',now+202);assert.notEqual(next.session.id,id);assert.equal(next.session.quota_limit,1);
 }finally{await f.close();}
});
