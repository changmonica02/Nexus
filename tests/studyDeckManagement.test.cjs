require('./loadStudy.cjs');require('fake-indexeddb/auto');
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,grade}=require('./fixtures/studyStyleRepository.cjs');
const {defaultStudyStyle}=require('../src/features/study/studyStyles.ts');
const {StudyRepository}=require('../src/features/study/StudyRepository.ts');
const {scheduledCounts,planScheduled}=require('../src/features/study/scheduledStudy.ts');
test('per-deck copy-on-edit preserves legacy shared settings, active snapshots, history, daily quota, isolation and atomic failure',async()=>{
 const f=await fixture(3,'owner-a');try{
  await f.repo.ensureDeck({id:'other',workspace_owner_id:f.owner,study_items:[]});
  const shared={...defaultStudyStyle(f.owner),id:'study-style:custom',name:'Old shared settings',new_limit:2,review_limit:2,scheduling_method:'fixed'};
  await f.repo.saveStyle(shared);await f.repo.assignStyle('deck',shared.id);await f.repo.assignStyle('other',shared.id);
  const now=Date.now(),active=await f.repo.startSession('deck','scheduled',now);await grade(f.repo,active.id,3,now);
  const before=await f.repo.exportData(),snapshot=await f.repo.readSession(active.id),oldOther=await f.repo.styleForDeck('other');
  await f.repo.saveDeckStyle('deck',{new_limit:7,scheduling_method:'fsrs',review_limit:5});
  const current=await f.repo.styleForDeck('deck');assert.equal(current.style.new_limit,7);assert.match(current.style.id,/^study-style:deck:/);
  assert.deepEqual(await f.repo.styleForDeck('other'),oldOther);assert.deepEqual((await f.repo.listStyles()).find(s=>s.id===shared.id),shared);
  const after=await f.repo.exportData();for(const key of ['cards','states','events','sessions'])assert.deepEqual(after[key],before[key],key);
  assert.deepEqual((await f.repo.readSession(active.id)).session.settings_snapshot,snapshot.session.settings_snapshot);
  assert.equal((await f.repo.startSession('deck','scheduled',now+1)).id,active.id);
  await f.repo.saveDeckStyle('deck',{review_order:'random'});assert.equal((await f.repo.styleForDeck('deck')).style.id,current.style.id);
  const stable=await f.repo.exportData(),pending=await f.repo.pending();await assert.rejects(f.repo.saveDeckStyle('deck',{new_limit:-1}));
  assert.deepEqual(await f.repo.exportData(),stable);assert.deepEqual(await f.repo.pending(),pending);
  const foreign=new StudyRepository(f.db,()=> 'owner-b','other-device');await assert.rejects(foreign.saveDeckStyle('deck',{new_limit:10}),/帳號/);
  assert.deepEqual(await f.repo.exportData(),stable);
  const deck=await f.repo.readScheduledDeck('deck',now);const counts=scheduledCounts(deck,now);assert.ok(counts.new<=7);assert.equal(counts.new+counts.learning+counts.review,planScheduled(deck,now).cards.filter(c=>!planScheduled(deck,now).earlyIds.has(c.id)).length);
 }finally{await f.close();}
});
