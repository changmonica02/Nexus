require('./loadStudy.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../src/lib/studyFSRS.ts');
const now = new Date(2026,8,22,12).getTime();
const item = {id:'one',front:'word',back:'中文',mastery:'mastered',review_count:99,last_reviewed_at:now-1000,daily_due_at:now+60000};
const migrated = () => api.migrateStudyDeck({id:'deck',study_items:[item]},now);

test('legacy exposure is distinct from daily-learning graduation; neither creates FSRS state',()=>{
 const {isLearned}=require('../src/lib/studySessions.ts');
 const snapshot=migrated(), card=snapshot.cards[0], state=snapshot.states[0];
 const exposure=api.createStudyEvent(card,state,'introduce',now,'device','exposure');
 assert.equal(exposure.after.introduced_at,now);assert.equal(isLearned(exposure.after),false);
 const graduation=api.createStudyEvent(card,exposure.after,'introduce',now+1,'device','learned',null,'daily_learning');
 assert.equal(graduation.after.learned_at,now+1);assert.equal(isLearned(graduation.after),true);
 assert.equal(graduation.after.fsrs,null);assert.equal(graduation.rating,null);assert.equal(graduation.log,null);
 assert.equal(graduation.after.legacy_due_at,state.legacy_due_at);
 assert.equal(graduation.parent,exposure.id);
});
test('fixed FSRS configuration has real 10 minute steps; Good/Easy graduate; Review Again relearns', () => {
 const snapshot = migrated(), card=snapshot.cards[0], state=snapshot.states[0];
 const preview = api.previewStudy(state,now);
 assert.equal(preview[1].card.due.getTime()-now,600000);
 assert.equal(preview[1].card.state,api.State.Learning);
 for(const rating of [3,4]) assert.equal(preview[rating].card.state,api.State.Review);
 const good=api.createStudyEvent(card,state,'review',now,'device','e1',3);
 const again=api.createStudyEvent(card,good.after,'review',good.after.fsrs.due,'device','e2',1);
 assert.equal(again.after.fsrs.state,api.State.Relearning);
 assert.equal(again.after.fsrs.due-again.at,600000);
 assert.deepEqual(good.after.fsrs,api.serializeFSRS(preview[3].card));
 assert.equal(good.after.fsrs.reps,1);
});
test('migration preserves all legacy data without fabricating a single review or memory state',()=>{
 const snapshot=migrated();
 assert.deepEqual(snapshot.cards[0].legacy.item,item);
 assert.equal(snapshot.events.length,0); assert.equal(snapshot.states[0].fsrs,null);
 snapshot.settings.direction_confirmed=true;
 assert.equal(api.nextDailyCard(snapshot,now),null);
 assert.equal(api.nextDailyCard(snapshot,now+60000).id,snapshot.cards[0].id);
});
test('due relearning outranks new cards; no early review; introductions consume local-day quota',()=>{
 const snapshot=api.migrateStudyDeck({id:'deck',study_items:Array.from({length:22},(_,i)=>({...item,id:String(i),daily_due_at:undefined,mastery:'new'}))},now);
 snapshot.settings.direction_confirmed=true;
 for(let i=0;i<20;i++) {
   const card=api.nextDailyCard(snapshot,now); assert.ok(card);
   let event=api.createStudyEvent(card,snapshot.states.find(s=>s.id===card.id),'introduce',now,'dev',`intro${i}`);
   snapshot.events.push(event);
   event=api.createStudyEvent(card,event.after,'review',now,'dev',`review${i}`,3);
   snapshot.events.push(event);
   snapshot.states=snapshot.states.map(s=>s.id===card.id?event.after:s);
 }
 assert.equal(api.nextDailyCard(snapshot,now),null);
 assert.ok(api.nextDailyCard(snapshot,now+86400000));
 const card=snapshot.cards[0];
 const event=api.createStudyEvent(card,snapshot.states[0],'review',now,'dev','again',1);
 snapshot.states[0]=event.after;
 assert.equal(api.nextDailyCard(snapshot,now),null);
 snapshot.settings.new_limit=22;
 assert.notEqual(api.nextDailyCard(snapshot,now).id,card.id);
 assert.equal(api.nextDailyCard(snapshot,now+600000).id,card.id);
});
