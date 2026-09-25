require('./loadStudy.cjs');
const test=require('node:test');const assert=require('node:assert/strict');
const {advanceFreeQueue,shuffleCards}=require('../src/lib/studyPractice.ts');
test('free practice exhausts cards before repeats and never mutates original data',()=>{
 const cards=[{id:'1'},{id:'2'},{id:'3'}];const original=structuredClone(cards);
 let queue=advanceFreeQueue(cards,false);assert.deepEqual(queue.map(c=>c.id),['2','3','1']);
 queue=advanceFreeQueue(queue,true);queue=advanceFreeQueue(queue,true);queue=advanceFreeQueue(queue,true);
 assert.equal(queue.length,0);assert.deepEqual(cards,original);
 for(let i=0;i<30;i++)assert.deepEqual(shuffleCards(cards).map(c=>c.id).sort(),['1','2','3']);
});
