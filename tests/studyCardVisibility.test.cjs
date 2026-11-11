require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,grade}=require('./fixtures/studyStyleRepository.cjs');
const {mergeCardVisibility,validateCardVisibility}=require('../src/features/study/cardVisibility.ts');
const {planScheduled,scheduledStatus}=require('../src/features/study/scheduledStudy.ts');
const now=Date.now();

test('hide/restore keeps content revision, scheduling, review events and quota; same word in another deck is independent',async()=>{
 const f=await fixture(2,'owner');try{
  const shown=await f.repo.openScheduledSession('deck',now),card=shown.snapshot.cards.find(c=>c.id===shown.session.queue[0]);
  await f.repo.ensureDeck({id:'other',workspace_owner_id:'owner'});const [other]=await f.repo.addCards('other',[{front:card.front,back:card.back}]);
  const before=await f.repo.exportData();await f.repo.setCardHidden('deck',card.id,true);
  const hidden=await f.repo.exportData(),row=hidden.cards.find(c=>c.id===card.id);
  assert.equal(row.hidden,true);assert.equal(row.content_revision,card.content_revision);assert.equal(row.front,card.front);assert.equal(row.back,card.back);
  for(const key of ['events','states'])assert.deepEqual(hidden[key],before[key],key);
  assert.equal(hidden.cards.find(c=>c.id===other.id).hidden,undefined);
  await assert.rejects(f.repo.setCardHidden('other',card.id,false));
  const next=await f.repo.readPresentedSession(shown.session.id,now+1);assert.notEqual(next.session.queue[0],card.id);
  assert.equal(next.session.targets.find(t=>t.card_id===card.id).easy_at,null,'hiding is not completion');
  assert.equal(scheduledStatus(next.session,next.snapshot,now+1).completed,0);
  const snapshot=await f.repo.readScheduledDeck('deck',now+1);assert.ok(!planScheduled(snapshot,now+1).cards.some(c=>c.id===card.id));
  const ops=(await f.repo.pending()).length;await f.repo.setCardHidden('deck',card.id,true);assert.equal((await f.repo.pending()).length,ops,'same toggle retry queues no duplicate');
  await f.repo.setCardHidden('deck',card.id,false);const restored=await f.repo.readScheduledDeck('deck',now+2);
  assert.equal(restored.cards.find(c=>c.id===card.id).hidden,false);assert.deepEqual(restored.states,before.states.filter(s=>s.deck_id==='deck').map(s=>s.id===next.session.queue[0]?next.snapshot.states.find(n=>n.id===s.id):s));
  assert.ok(planScheduled(restored,now+2).cards.some(c=>c.id===card.id));
 }finally{await f.close();}
});

test('hidden forgotten and early endless candidates stay out while their due and history remain intact',async()=>{
 const f=await fixture(2);try{
  const opened=await f.repo.openScheduledSession('deck',now),id=opened.session.id,forgotten=opened.session.queue[0];
  await grade(f.repo,id,1,now);const before=await f.repo.readDeck('deck',true);
  await f.repo.setCardHidden('deck',forgotten,true);
  const tick=await f.repo.readPresentedSession(id,now+60000);assert.ok(!tick.session.queue.includes(forgotten));
  assert.equal(scheduledStatus(tick.session,tick.snapshot,now+60000).waiting,0);
  const after=await f.repo.readDeck('deck',true);assert.deepEqual(after.states.find(s=>s.id===forgotten),before.states.find(s=>s.id===forgotten));assert.deepEqual(after.events.filter(e=>e.card_id===forgotten),before.events.filter(e=>e.card_id===forgotten));
  await f.repo.configure('deck',{study_mode:'endless'});const current=await f.repo.readScheduledDeck('deck',now+60000);assert.ok(!planScheduled(current,now+60000).cards.some(c=>c.id===forgotten));
 }finally{await f.close();}
});

test('old devices, official content and older JSON cannot erase visibility; timestamps merge independently of content',async()=>{
 const base={id:'c',deck_id:'d',owner_id:'o',front:'word',back:'字',content_revision:1,updated_at:1},hidden={...base,hidden:true,hidden_changed_at:20};
 assert.equal(mergeCardVisibility(hidden,{...base,front:'newer content',updated_at:100}).hidden,true);
 assert.equal(mergeCardVisibility(hidden,{...base,hidden:false,hidden_changed_at:10,updated_at:200}).hidden,true);
 assert.equal(mergeCardVisibility(hidden,{...base,hidden:false,hidden_changed_at:21}).hidden,false);
 assert.equal(mergeCardVisibility(hidden,{...base,hidden:false,hidden_changed_at:20}).hidden,true,'concurrent tie retains hiding');
 for(const invalid of [{hidden:true},{hidden:'true',hidden_changed_at:1},{hidden:false,hidden_changed_at:-1}])assert.throws(()=>validateCardVisibility({...base,...invalid}));
 const f=await fixture(1,'owner');try{
  const [card]=(await f.repo.readDeck('deck')).cards;await f.repo.setCardHidden('deck',card.id,true);
  const backup=JSON.parse(JSON.stringify(await f.repo.exportData()));assert.equal(backup.cards[0].hidden,true);
  const legacy={...backup.cards[0],front:'legacy device edit',updated_at:backup.cards[0].updated_at+10};delete legacy.hidden;delete legacy.hidden_changed_at;
  await f.repo.mergeRemote({cards:[legacy],states:[],events:[],settings:[]});const merged=(await f.repo.readDeck('deck')).cards[0];assert.equal(merged.hidden,true);assert.equal(merged.front,'legacy device edit');
  await assert.rejects(f.repo.mergeRemote({cards:[{...legacy,owner_id:'another'}],states:[],events:[],settings:[]}));
 }finally{await f.close();}
});
