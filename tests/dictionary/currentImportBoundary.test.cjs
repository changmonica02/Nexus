require('../loadStudy.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseDictionaryImport,parseJSONBundle,parseJSONBundleWithIgnored,normalizeDictionaryBundle}=require('../../src/features/dictionary/adminImport.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

test('public import accepts current JSON only and does not silently accept retired interchange formats',async()=>{
 const doc={dictionary_entries:[{id:id(1),kind:'word',headword:'harbor'}],dictionary_senses:[{id:id(2),entry_id:id(1),part_of_speech:'noun',gloss_zh_tw:'港口'}]};
 assert.deepEqual(await parseDictionaryImport(JSON.stringify(doc),'json'),doc);
 await assert.rejects(parseDictionaryImport('kind,headword\\nword,harbor','csv'),/CSV.*Markdown.*停用/);
 await assert.rejects(parseDictionaryImport('---\\nheadword: harbor\\n---','md'),/CSV.*Markdown.*停用/);
});

test('current JSON preserves independent homographic morpheme identities and rejects duplicate row IDs',async()=>{
 for(const kind of ['prefix','root','suffix']){
  const doc={dictionary_entries:[{id:id(201),kind,headword:'tri-'},{id:id(203),kind,headword:'tri-'}],dictionary_senses:[{id:id(202),entry_id:id(201),part_of_speech:null,gloss_zh_tw:'構詞甲'},{id:id(204),entry_id:id(203),part_of_speech:null,gloss_zh_tw:'構詞乙'}]};
  const parsed=await parseDictionaryImport(JSON.stringify(doc),'json');
  assert.deepEqual(parsed.dictionary_entries.map(x=>x.id),[id(201),id(203)]);
  assert.deepEqual(parsed.dictionary_senses.map(x=>x.id),[id(202),id(204)]);
  const drafts=await normalizeDictionaryBundle({rpc:async()=>{throw Error('complete JSON must not issue extra RPCs');}},parsed);
  assert.deepEqual(drafts.map(x=>x.entry_id),[id(201),id(203)]);
  assert.throws(()=>parseJSONBundle(JSON.stringify({...doc,dictionary_senses:[doc.dictionary_senses[0],doc.dictionary_senses[0]]})),/重複 ID/);
 }
});

test('JSON bundle rejects unsupported fields and retired tables rather than silently dropping them',async()=>{
 const doc={dictionary_entries:[{id:id(1),kind:'word',headword:'harbor'}],dictionary_senses:[{id:id(2),entry_id:id(1),part_of_speech:'noun',gloss_zh_tw:'港口'}],dictionary_sense_derivations:[],dictionary_examples:[]};
 assert.deepEqual(parseJSONBundleWithIgnored(JSON.stringify(doc)).ignoredFields,[]);
 assert.equal(parseJSONBundle(JSON.stringify(doc)).dictionary_entries[0].headword,'harbor');
 const outdated={...doc,dictionary_entries:[{...doc.dictionary_entries[0],source_id:id(9)}]};
 assert.throws(()=>parseJSONBundle(JSON.stringify(outdated)),/不接受過時或未知欄位/);
 assert.throws(()=>parseJSONBundle(JSON.stringify({...doc,dictionary_sources:[]})),/不接受過時或未知欄位/);
 assert.throws(()=>parseJSONBundle(JSON.stringify({...doc,dictionary_entries:[{...doc.dictionary_entries[0],kind:'invalid'}]})),/未知 kind/);
 assert.throws(()=>parseJSONBundle(JSON.stringify({...doc,dictionary_examples:[{id:id(3),entry_id:id(1),body:'Harbor'}]})),/缺少 sense_id|derivation_id/);
});
