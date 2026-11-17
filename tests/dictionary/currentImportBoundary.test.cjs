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

// Current AI review documents are separate from the retired CSV and source-snapshot formats.
test('current AI review format validates stable meanings and rejects retired provenance',()=>{
 const {parseAI}=require('../../src/features/dictionary/aiDictionary.ts');
 const valid={format:'nexus-dictionary-ai',version:1,entries:[{type:'word',headword:'harbor',classification:'noun',meanings:[{zh_tw:'港口',classification:'noun'}],core_concept:[{text:'避風港'}]}]};
 const parsed=parseAI(JSON.stringify(valid));
 assert.equal(parsed.entries[0].meanings[0].zh_tw,'港口');
 assert.equal(parsed.entries[0].core_concept[0].text,'避風港');
 assert.throws(()=>parseAI(JSON.stringify({...valid,entries:[{...valid.entries[0],sources:[]}]})),/已淘汰/);
 assert.throws(()=>parseAI(JSON.stringify({...valid,entries:[{...valid.entries[0],source_ids:[]}]})),/已淘汰/);
 assert.throws(()=>parseAI(JSON.stringify({...valid,entries:[{...valid.entries[0],inflections:[{form_kind:'past',form:'harbored'}]}]})),/不允許欄位 inflections/);
 assert.throws(()=>parseAI(JSON.stringify({...valid,entries:[{...valid.entries[0],meanings:[{zh_tw:'港口',old_group:'legacy'}]}]})),/不允許欄位/);
});

// Merged from the retired duplicate admin parser suite: keep unique malformed-input protections.
test('JSON bundle rejects malformed identities, rows and conflicting case-insensitive IDs',async()=>{
 const doc={dictionary_entries:[{id:id(10),kind:'word',headword:'test'}],dictionary_senses:[{id:id(11),entry_id:id(10),part_of_speech:'noun',gloss_zh_tw:'測試'}]};
 for(const malformed of [null,[],{}, {dictionary_entries:{}},{dictionary_admins:[]},
  {dictionary_entries:[null]}, {dictionary_entries:[{id:id(1)}]},
  {dictionary_entries:[{...doc.dictionary_entries[0],id:'bad'}]},
  {dictionary_entries:[{...doc.dictionary_entries[0],revision:0}]},
  {dictionary_senses:[{...doc.dictionary_senses[0],gloss_zh_tw:42}]}]){
  await assert.rejects(parseDictionaryImport(JSON.stringify(malformed),'json'));
 }
 await assert.rejects(parseDictionaryImport('{','json'),/JSON 格式/);
 const uppercase={...doc.dictionary_entries[0],id:'abcdefab-abcd-4abc-8abc-abcdefabcdef'};
 await assert.rejects(parseDictionaryImport(JSON.stringify({dictionary_entries:[uppercase,{...uppercase,id:uppercase.id.toUpperCase()}]}),'json'),/重複 ID/);
 const details={dictionary_etymologies:[{id:id(20),entry_id:id(10),sense_id:id(11),body:'歷史原文',data_source:'https://example.test/source'}],dictionary_learning_notes:[{id:id(21),entry_id:id(10),sense_id:id(11),kind:'core_concept',body:'完整記憶情境\\n保留原文'}]};
 assert.deepEqual(await parseDictionaryImport(JSON.stringify(details),'json'),details);
});
