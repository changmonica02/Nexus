require('../loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {parseDictionaryImport}=require('../../src/features/dictionary/adminImport.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
// Public imports accept current JSON only. CSV/Markdown are not fallback formats.
const sourceBundle={
 dictionary_entries:[{id:id(10),kind:'word',headword:'test'}],
 dictionary_senses:[
  {id:id(11),entry_id:id(10),part_of_speech:'noun',gloss_zh_tw:'測試'},
  {id:id(12),entry_id:id(10),part_of_speech:'verb',gloss_zh_tw:'測試,驗證'}
 ]
};
test('current JSON import preserves identities and rejects retired CSV/Markdown at the public entry point',async()=>{
 const raw=JSON.stringify(sourceBundle);
 const first=await parseDictionaryImport(raw,'json'),second=await parseDictionaryImport(raw,'json');
 assert.deepEqual(first,sourceBundle);
 assert.deepEqual(second,first);
 assert.equal(first.dictionary_senses[1].gloss_zh_tw,'測試,驗證');
 await assert.rejects(parseDictionaryImport('entry_id,headword\\n'+id(10)+',test','csv'),/CSV.*Markdown.*停用/);
 await assert.rejects(parseDictionaryImport('---\\nid: '+id(10)+'\\n---','md'),/CSV.*Markdown.*停用/);
 const history={dictionary_etymologies:[{id:id(20),entry_id:id(10),sense_id:id(11),body:'## 未查證測試\\n原始正文',data_source:'https://example.test/source'}]};
 assert.deepEqual(await parseDictionaryImport(JSON.stringify(history),'json'),history);
 const memory={dictionary_learning_notes:[{id:id(21),entry_id:id(10),sense_id:id(11),kind:'core_concept',body:'記憶情境'}]};
 assert.deepEqual(await parseDictionaryImport(JSON.stringify(memory),'json'),memory);
 assert.equal('dictionary_sources' in first,false);
});
test('JSON bundle rejects invalid structure, fields, UUIDs, duplicate IDs and verification',async()=>{
  const original=await parseDictionaryImport(JSON.stringify(sourceBundle),'json');
  assert.deepEqual(await parseDictionaryImport(JSON.stringify(original),'json'),original);
  const invalid=[null,[],{}, {dictionary_entries:{}},{dictionary_admins:[]},
    {dictionary_entries:[null]}, {dictionary_entries:[{id:id(1)}]},
    {dictionary_entries:[{...original.dictionary_entries[0],id:'bad'}]},
    {dictionary_entries:[{...original.dictionary_entries[0],status:'published'}]},
    {dictionary_entries:[{...original.dictionary_entries[0],kind:'private'}]},
    {dictionary_sources:[{id:id(4),citation:'old',license:'old',raw_text:'old',verification:'invented'}]},
    {dictionary_sources:[{id:id(4),citation:'old',license:'old',raw_text:'old',verification:'verified'}]},
    {dictionary_entries:[{...original.dictionary_entries[0],revision:0}]},
    {dictionary_senses:[{...original.dictionary_senses[0],gloss_zh_tw:42}]},
    {dictionary_entries:[original.dictionary_entries[0],original.dictionary_entries[0]]}];
  for(const value of invalid)await assert.rejects(parseDictionaryImport(JSON.stringify(value),'json'));
  await assert.rejects(parseDictionaryImport('{','json'),/JSON 格式/);
  const uppercase={...original.dictionary_entries[0],id:'abcdefab-abcd-4abc-8abc-abcdefabcdef'};
  await assert.rejects(parseDictionaryImport(JSON.stringify({dictionary_entries:[uppercase,{...uppercase,id:uppercase.id.toUpperCase()}]}),'json'),/重複 ID/);
  const notes={dictionary_learning_notes:[{id:id(90),entry_id:id(10),kind:'core_concept',body:'完整記憶情境\n保留原文',sense_id:null}]};
  assert.deepEqual(await parseDictionaryImport(JSON.stringify(notes),'json'),notes);
});
