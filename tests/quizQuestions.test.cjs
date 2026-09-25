require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const api=require('../src/lib/studyFSRS.ts');
const quiz=require('../src/lib/quizQuestions.ts');
const now=1_800_000_000_000;
function snapshot(){
 const s=api.migrateStudyDeck({id:'deck',study_items:[
  {id:'a',front:'apple',back:'蘋果'},{id:'b',front:'book',back:'書'},
  {id:'c',front:'cat',back:'貓'},{id:'d',front:'dog',back:'狗'},
  {id:'e',front:' secret ',back:'秘密'},{id:'f',front:' apple ',back:'水果'},
  {id:'g',front:'   ',back:'空白'}]},now);
 s.states.forEach((state,i)=>{if(i!==4)state.learned_at=now;});
 return s;
}
test('default direction, strict eligibility, New cards and distinct displayed answers',()=>{
 const s=snapshot(),before=structuredClone(s);
 assert.equal(quiz.DEFAULT_QUIZ_DIRECTION,'zh-en');
 assert.equal(quiz.quizEligible(s).length,5);
 for(const direction of ['zh-en','en-zh']){
  for(const rng of [()=>0,()=>0.3,()=>0.999]){
   const q=quiz.nextQuizQuestion(s,[],direction,null,now,rng);
   const card=s.cards.find(c=>c.id===q.cardId);
   assert.equal(q.prompt,(direction==='zh-en'?card.back:card.front).trim());
   assert.equal(q.answer,(direction==='zh-en'?card.front:card.back).trim());
   assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);
   assert.ok(q.choices.every(c=>c.trim()&&!['secret','秘密','空白'].includes(c)));
  }
 }
 assert.deepEqual(s,before);
 s.cards[3].front='apple';
 assert.equal(quiz.canStartQuiz(s,'zh-en'),false);
 assert.throws(()=>quiz.nextQuizQuestion(s,[],'zh-en',null,now),new RegExp(quiz.QUIZ_REQUIRED_ANSWERS));
 assert.equal(quiz.canStartQuiz(s,'en-zh'),true);
 s.cards[3].back='貓';s.cards[5].back='書';
 assert.equal(quiz.canStartQuiz(s,'en-zh'),false);
});
test('real ts-fsrs retrievability, New bonus, score progression, base and cap',()=>{
 const s=snapshot(),state=s.states[0];
 const before=structuredClone(state),original=api.studyScheduler.get_retrievability;
 api.studyScheduler.get_retrievability=()=>{throw new Error('New must not call retrievability');};
 try{
  const w=quiz.quizWeight(state,0,now);
  assert.equal(w.retrievability,null);assert.equal(w.memoryBonus,quiz.QUIZ_WEIGHT.NEW_CARD_BONUS);
 }finally{api.studyScheduler.get_retrievability=original;}
 assert.deepEqual(state,before);
 const scheduled=api.createStudyEvent(s.cards[0],state,'review',now,'d','e',4).after;
 const fresh=quiz.quizWeight(scheduled,0,now),old=quiz.quizWeight(scheduled,0,now+90*86400000);
 assert.equal(old.retrievability,api.studyScheduler.get_retrievability(api.schedulerCard(scheduled,now),new Date(now+90*86400000),false));
 assert.ok(old.memoryBonus>fresh.memoryBonus);assert.ok(fresh.weight>=quiz.QUIZ_WEIGHT.BASE_WEIGHT);
 let previous=0;
 for(let score=0;score<=4;score++){
  const w=quiz.quizWeight(scheduled,score,now);
  assert.ok(w.weight>previous);assert.ok(w.weight<=quiz.QUIZ_WEIGHT.MAX_TOTAL_WEIGHT);previous=w.weight;
 }
 assert.equal(quiz.quizWeight(scheduled,1000,now).weight,quiz.quizWeight(scheduled,4,now).weight);
});
test('weighted sampling uses intervals, excludes previous only, permits later repeat',()=>{
 const s=snapshot();s.cards=s.cards.slice(0,4);s.states=s.states.slice(0,4);
 const states=[{card_id:s.cards[0].id,owner_id:s.cards[0].owner_id,mistake_score:4}];
 // Weights 2.5,1.5,1.5,1.5: at 0.3 the weighted draw is A, while equal random would be B.
 assert.equal(quiz.nextQuizQuestion(s,states,'zh-en',null,now,()=>0.3).cardId,s.cards[0].id);
 assert.equal(quiz.nextQuizQuestion(s,states,'zh-en',null,now,()=>0.5).cardId,s.cards[1].id);
 const first=quiz.nextQuizQuestion(s,states,'zh-en',null,now,()=>0);
 const second=quiz.nextQuizQuestion(s,states,'zh-en',first.cardId,now,()=>0);
 const third=quiz.nextQuizQuestion(s,states,'zh-en',second.cardId,now,()=>0);
 assert.notEqual(first.cardId,second.cardId);assert.equal(first.cardId,third.cardId);
});
test('answer submission is immutable across retries and reports correct/incorrect',async()=>{
 const s=snapshot(),q=quiz.nextQuizQuestion(s,[],'zh-en',null,now,()=>0),calls=[];
 const repo={record:async input=>{calls.push(input);return input;}};
 const wrong=quiz.createQuizSubmission(q,q.choices.find(c=>c!==q.answer),'batch',now,'event');
 assert.equal(wrong.correct,false);
 await quiz.saveQuizAnswer(repo,wrong);await quiz.saveQuizAnswer(repo,wrong);
 assert.deepEqual(calls[0],calls[1]);
 assert.equal(quiz.createQuizSubmission(q,q.answer,'batch',now,'right').correct,true);
 assert.throws(()=>quiz.createQuizSubmission(q,'undefined','batch',now),/無效/);
});
