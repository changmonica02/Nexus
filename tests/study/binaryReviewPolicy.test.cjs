require('../loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {defaultBinaryIntervals,binaryReviewTransition}=require('../../src/features/study/binaryReviewPolicy.ts');
const {defaultStudyStyle,unifiedStudyStyle,validateStudyStyle}=require('../../src/features/study/studyStyles.ts');
const {createStudyEvent,emptyStudyState,previewStudy}=require('../../src/features/study/studyFSRS.ts');
const {reliableEvent}=require('../../src/features/study/studyReliability.ts');
test('binary defaults and custom intervals preserve box and memory transitions',()=>{
 const intervals={general:[120,864000],fuzzy:[180,345600],forgotten:[240,172800]};
 assert.deepEqual(defaultBinaryIntervals(),{general:[60,604800],fuzzy:[60,259200],forgotten:[60,86400]});
 let s={level:'general',inForgottenBox:false};
 for(const [rating,level,box,seconds] of [[1,'forgotten',true,120],[3,'forgotten',false,172800],[3,'fuzzy',false,172800],[3,'general',false,345600],[3,'general',false,864000]]){
  s=binaryReviewTransition(s,rating,intervals);assert.deepEqual(s,{level,inForgottenBox:box,seconds});
 }
 const card={id:'card',deck_id:'deck',owner_id:'owner',front:'word',back:'字',content_revision:1};
 const style={...defaultStudyStyle('owner'),binary_intervals:intervals};
 validateStudyStyle(style);let state=emptyStudyState(card),now=1000000;
 for(const rating of [1,3,3,3,3]){
  const due=previewStudy(state,now,style)[rating].card.due.getTime();
  const event=createStudyEvent(card,state,'review',now,'device',String(now),rating,'scheduled',style);
  assert.equal(event.after.fixed.due,due);assert.deepEqual(event.parameters.binary_intervals,intervals);assert.ok(reliableEvent(event));
  state=event.after;now=due;
 }
});
test('old custom durations map to surviving buttons without modifying stored style',()=>{
 const old={...defaultStudyStyle('owner'),interval_version:1,intervals:{general:[120,600,864000],forgotten:[240,600,172800]}};
 delete old.binary_intervals;const before=structuredClone(old);
 assert.deepEqual(unifiedStudyStyle(old).binary_intervals,{general:[120,864000],fuzzy:[60,259200],forgotten:[240,172800]});assert.deepEqual(old,before);
});
