require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,grade}=require('./fixtures/studyStyleRepository.cjs');
const now=new Date(2026,10,11,12).getTime();

test('due forgotten card cannot displace the already presented question or reject its legitimate grade',async()=>{
 const f=await fixture(2);
 try{
  const opened=await f.repo.openScheduledSession('deck',now),id=opened.session.id;
  const forgotten=opened.session.queue[0];
  await grade(f.repo,id,1,now);
  const shown=await f.repo.presentScheduled(id,now),current=shown.session.queue[0];
  assert.notEqual(current,forgotten);
  const before=await f.repo.readDeck('deck',true);
  const tick=await f.repo.readPresentedSession(id,now+60000);
  assert.equal(tick.session.queue[0],current,'a due-time refresh must retain the presented card');
  const after=await f.repo.readDeck('deck',true);
  assert.deepEqual(after.events,before.events,'time passing alone is not another answer or introduction');
  const card=tick.snapshot.cards.find(c=>c.id===current),state=tick.snapshot.states.find(s=>s.id===current);
  const rated=await f.repo.rateSession({sessionId:id,cardId:current,revision:tick.session.revision,contentRevision:card.content_revision,expectedHead:state.head,rating:3,actionId:'stable-current-grade',now:now+60000});
  assert.equal(rated.queue[0],forgotten,'due forgotten card becomes next only after the current grade');
 }finally{await f.db.close();}
});
