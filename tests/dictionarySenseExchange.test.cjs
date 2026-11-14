require('./loadStudy.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseJSONBundleWithIgnored,normalizeDictionaryBundle}=require('../src/features/dictionary/adminImport.ts');
const {draftsFromBundle,mapDictionaryDraft,validateDictionaryDraft}=require('../src/features/dictionary/draftPipeline.ts');
const {exportDictionaryCSV}=require('../src/features/dictionary/dictionaryCSV.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

const base=()=>({
 dictionary_entries:[{id:id(1),kind:'word',headword:'occupation'}],
 dictionary_senses:[{id:id(2),entry_id:id(1),part_of_speech:'noun',gloss_zh_tw:'職業'}],
 dictionary_sense_derivations:[{id:id(3),entry_id:id(1),sense_id:id(2),gloss_zh_tw:'工作',sort_order:0,revision:2}],
 dictionary_examples:[{id:id(4),entry_id:id(1),sense_id:id(2),body:'An occupation',translation_zh_tw:'一份職業',derivation_id:id(3),sort_order:0}],
 dictionary_inflections:[{id:id(5),entry_id:id(1),sense_id:id(2),form_kind:'plural',form:'occupations'}],
});
test('B2 JSON Bundle preserves derivation and bilingual example IDs; drops standalone inflections with an explicit notice',()=>{
 const {bundle,ignoredFields}=parseJSONBundleWithIgnored(JSON.stringify(base()));
 assert.deepEqual(bundle.dictionary_sense_derivations.map(x=>x.id),[id(3)]);
 assert.equal(bundle.dictionary_examples[0].translation_zh_tw,'一份職業');
 assert.equal(bundle.dictionary_examples[0].derivation_id,id(3));
 assert.equal(bundle.dictionary_inflections,undefined);
 assert.ok(ignoredFields.some(x=>x.startsWith('dictionary_inflections')));
 const drafts=draftsFromBundle(bundle);
 assert.deepEqual(validateDictionaryDraft(drafts),[]);
 assert.equal(mapDictionaryDraft(drafts[0]).derivations[0].id,id(3));
 assert.equal(mapDictionaryDraft(drafts[0]).examples[0].derivation_id,id(3));
 assert.throws(()=>exportDictionaryCSV(drafts),/CSV 不支援衍生意思/);
});
test('B2 JSON Bundle validates stable references, nullable translations and rejects invalid derivations',()=>{
 const b=base();b.dictionary_examples[0].translation_zh_tw=null;b.dictionary_examples[0].derivation_id=null;
 assert.equal(parseJSONBundleWithIgnored(JSON.stringify(b)).bundle.dictionary_examples[0].translation_zh_tw,null);
 const bad=base();bad.dictionary_sense_derivations[0].sense_id=id(9);
 assert.ok(validateDictionaryDraft(draftsFromBundle(parseJSONBundleWithIgnored(JSON.stringify(bad)).bundle)).some(x=>x.field==='derivations'));
 const badReference=base();badReference.dictionary_examples[0].derivation_id=id(10);
 assert.ok(validateDictionaryDraft(draftsFromBundle(parseJSONBundleWithIgnored(JSON.stringify(badReference)).bundle)).some(x=>x.field==='derivations'));
 const badUUID=base();badUUID.dictionary_examples[0].derivation_id='invalid';
 assert.throws(()=>parseJSONBundleWithIgnored(JSON.stringify(badUUID)),/UUID/);
});
test('B2 partial bundle loads existing derivations before an example translation update',async()=>{
 const partial={dictionary_entries:[{id:id(1),kind:'word',headword:'occupation'}],dictionary_examples:[{id:id(4),entry_id:id(1),sense_id:id(2),body:'An occupation',translation_zh_tw:'一份職業',derivation_id:id(3),sort_order:0}]};
 const calls=[];
 const rpc=async(name,args)=>{
  calls.push(name);
  if(name!=='get_dictionary_entry'||args.entry_uuid!==id(1))throw Error('Unexpected RPC');
  return {data:{entry:{id:id(1),kind:'word',headword:'occupation',revision:1},senses:[{id:id(2),entry_id:id(1),part_of_speech:'noun',gloss_zh_tw:'職業'}],relations:[],etymologies:[],learning_notes:[],derivations:[{id:id(3),entry_id:id(1),sense_id:id(2),gloss_zh_tw:'工作',sort_order:0,revision:1}]},error:null};
 };
 const drafts=await normalizeDictionaryBundle({rpc},partial);
 assert.deepEqual(calls,['get_dictionary_entry']);
 assert.equal(drafts[0].derivations[0].id,id(3));
 assert.equal(drafts[0].examples[0].derivation_id,id(3));
 assert.deepEqual(validateDictionaryDraft(drafts),[]);
});

test('versioned exchange reads B2 Word extensions without changing legacy row identities',()=>{
 const {parseExchange,draftFromExchange}=require('../src/features/dictionary/dictionaryExchange.ts');
 const stamp='2026-11-14T08:00:00.000Z';
 const json={
  format:'nexus-dictionary-exchange',schema_version:1,exported_at:stamp,
  scope:{kinds:['word'],statuses:['draft'],query:''},
  records:[{
   entry_id:id(1),version:null,reviews:[],
   snapshot:{metadata:null,detail:{
    entry:{id:id(1),kind:'word',headword:'occupation',status:'draft',published_at:null,revision:1,updated_at:stamp},
    senses:[{id:id(2),entry_id:id(1),part_of_speech:'noun',gloss_zh_tw:'職業',revision:1,updated_at:stamp}],
    relations:[],etymologies:[],learning_notes:[],pronunciations:[],inflections:[],lexical_annotations:[],
    derivations:[{id:id(3),entry_id:id(1),sense_id:id(2),gloss_zh_tw:'工作',sort_order:0,revision:2,updated_at:stamp}],
    examples:[{id:id(4),entry_id:id(1),sense_id:id(2),body:'An occupation',sort_order:0,translation_zh_tw:'一份職業',derivation_id:id(3),revision:1,updated_at:stamp}]
   }}
  }]
 };
 const doc=parseExchange(JSON.stringify(json));
 const draft=draftFromExchange(doc.records[0]);
 assert.equal(draft.derivations[0].id,id(3));
 assert.equal(draft.examples[0].translation_zh_tw,'一份職業');
 assert.equal(draft.examples[0].derivation_id,id(3));
 assert.deepEqual(validateDictionaryDraft([draft]),[]);
 // A historical schema-1 export lacking B2 rows must still be readable.
 delete json.records[0].snapshot.detail.derivations;
 delete json.records[0].snapshot.detail.examples[0].translation_zh_tw;
 delete json.records[0].snapshot.detail.examples[0].derivation_id;
 const old=draftFromExchange(parseExchange(JSON.stringify(json)).records[0]);
 assert.equal(old.derivations,undefined);
 assert.equal(old.examples[0].id,id(4));
});
