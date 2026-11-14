require('./loadStudy.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {studyDictionaryBack}=require('../src/features/dictionary/studyDictionaryBack.ts');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const base=()=>({
 entry:{id:id(1),kind:'word',status:'published',headword:'occupation',word_segments:[{id:id(11),text:'oc',hint:'朝向',relation_id:null},{id:id(12),text:'cupation',hint:'抓取',relation_id:null}]},
 senses:[{id:id(2),part_of_speech:'noun',gloss_zh_tw:'職業'},{id:id(3),part_of_speech:'noun',gloss_zh_tw:'佔領'}],
 relations:[],related:[],
 learning_notes:[{id:id(4),sense_id:id(2),kind:'core_concept',body:'佔據時間'}],
 etymologies:[{id:id(5),sense_id:id(2),body:'古老來源',data_source:'來源'}],
 public_notes:[{id:id(6),entry_id:id(1),body:'**共用筆記**'}],
 derivations:[{id:id(7),entry_id:id(1),sense_id:id(2),gloss_zh_tw:'工作',sort_order:0}],
 examples:[
  {id:id(8),sense_id:id(2),body:'What is your occupation?',translation_zh_tw:'你的職業是什麼？',derivation_id:id(7),sort_order:0},
  {id:id(9),sense_id:id(2),body:'He changed his job.',translation_zh_tw:'他換工作了。',derivation_id:null,sort_order:1},
  {id:id(10),sense_id:id(3),body:'Military occupation.',translation_zh_tw:'軍事佔領。',derivation_id:null,sort_order:0}],
});
test('Study back shows Word mnemonic and each Sense core, derivation and bilingual examples without duplicates',()=>{
 const d=studyDictionaryBack(base(),'occupation');
 assert.ok(d);
 assert.deepEqual(d.mnemonic,['佔據時間']);
 assert.equal(d.senses.length,2);
 assert.deepEqual(d.senses[0].derivations[0].examples.map(x=>x.id),[id(8)]);
 assert.deepEqual(d.senses[0].examples.map(x=>x.id),[id(9)]);
 assert.deepEqual(d.senses[1].examples.map(x=>x.id),[id(10)]);
 assert.equal(d.senses[0].derivations[0].examples[0].chinese,'你的職業是什麼？');
 assert.equal(d.notes[0].body,'**共用筆記**');
 assert.equal(d.etymologies[0].body,'古老來源');
});
test('Study back never shows unpublished, mismatched or non-Word public data',()=>{
 const d=base();d.entry.status='draft';
 assert.equal(studyDictionaryBack(d,'occupation'),null);
 d.entry.status='published';
 assert.equal(studyDictionaryBack(d,'another word'),null);
 d.entry.kind='root';
 assert.equal(studyDictionaryBack(d,'occupation'),null);
 assert.equal(studyDictionaryBack(null,'occupation'),null);
});
test('Study back isolates examples, skips orphan Sense links and allows legacy records',()=>{
 const d=base();d.derivations=[];d.examples[0].derivation_id=id(35);
 d.examples.push({id:id(22),sense_id:id(33),body:'Wrong sense',sort_order:1});
 const content=studyDictionaryBack(d,'occupation');
 assert.equal(content.senses[0].examples.length,2);
 assert.equal(content.senses[0].examples[0].id,id(8));
 assert.equal(content.senses[0].examples[0].chinese,'你的職業是什麼？');
 assert.equal(content.senses[1].examples.length,1);
});
test('Study display has tablet-only single dividing line and leaves grading / private FSRS untouched',()=>{
 const code=fs.readFileSync('src/features/dictionary/StudyDictionaryBack.tsx','utf8');
 const session=fs.readFileSync('src/features/study/components/ScheduledStudySession.tsx','utf8');
 assert.match(code,/md:grid-cols-2/);assert.match(code,/md:border-l/);
 assert.match(code,/border-t/);assert.match(code,/readPublishedEntry/);
 assert.match(session,/revealed&&<>{card.dictionary_entry_id&&<StudyDictionaryBack/);
 assert.match(session,/rateSession\(input\)/);
 assert.match(session,/\(\[1,2,3\] as const\)/);
 assert.doesNotMatch(code,/rateSession|syncStudy|update.*study_card/i);
});
