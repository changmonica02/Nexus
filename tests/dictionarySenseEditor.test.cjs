require('./loadStudy.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const {validateSenseExtensions,removeDerivationSafely}=require('../src/features/dictionary/senseDerivations.ts');
const {withoutSense,withoutDerivation}=require('../src/features/dictionary/draftEditing.ts');
const {draftsFromBundle,mapDictionaryDraft,validateDictionaryDraft}=require('../src/features/dictionary/draftPipeline.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const derivation={id:id(3),entry_id:id(1),sense_id:id(2),gloss_zh_tw:'延伸意思',sort_order:0};
const example={id:id(4),entry_id:id(1),sense_id:id(2),body:'Example sentence',translation_zh_tw:'中文翻譯',derivation_id:id(3)};
const data=()=>({dictionary_entries:[{id:id(1),kind:'word',headword:'example'}],dictionary_senses:[{id:id(2),entry_id:id(1),part_of_speech:'noun',gloss_zh_tw:'核心意思'}],dictionary_sense_derivations:[{...derivation}],dictionary_relations:[],dictionary_examples:[{...example}],dictionary_etymologies:[],dictionary_learning_notes:[],dictionary_pronunciations:[],dictionary_inflections:[],dictionary_lexical_annotations:[]});
test('B2 editor draft preserves derivation IDs and bilingual example fields through mapping',()=>{
  const d=draftsFromBundle(data())[0];
  assert.equal(d.derivations[0].id,id(3));
  assert.equal(d.examples[0].translation_zh_tw,'中文翻譯');
  assert.deepEqual(validateDictionaryDraft([d]),[]);
  const mapped=mapDictionaryDraft(d);
  assert.equal(mapped.derivations[0].sense_id,id(2));
  assert.equal(mapped.examples[0].derivation_id,id(3));
});
test('B2 rejects a cross-Sense example link and missing linked derivation',()=>{
  assert.deepEqual(validateSenseExtensions([{id:id(2)}],[derivation],[example]),[]);
  assert.ok(validateSenseExtensions([{id:id(2)}],[derivation],[{...example,sense_id:id(5)}]).length);
  assert.ok(validateSenseExtensions([{id:id(2)}],[],[example]).length);
});
test('B2 cannot silently remove a referenced derivation or its parent Sense',()=>{
  assert.throws(()=>removeDerivationSafely([derivation],[example],id(3)),/例句/);
  assert.throws(()=>withoutDerivation(data(),id(3)),/例句/);
  assert.throws(()=>withoutSense(data(),id(2)),/衍生意思/);
  const clean=data();clean.dictionary_examples=[];
  assert.equal(withoutDerivation(clean,id(3)).dictionary_sense_derivations.length,0);
});
