require('./loadStudy.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseCSV}=require('../src/features/dictionary/csvRows.ts');
const {parseJSONBundle,normalizeDictionaryBundle}=require('../src/features/dictionary/adminImport.ts');
const {dictionaryCSVHeaders,parseDictionaryCSV}=require('../src/features/dictionary/dictionaryCSV.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

test('only known empty retired CSV columns are ignored, never meaningful or unknown fields',async()=>{
 const values={kind:'word',entry_id:id(1),sense_id:id(2),headword:'harbor',part_of_speech:'noun',gloss_zh_tw:'港口'};
 const raw=dictionaryCSVHeaders.join(',')+'\n'+dictionaryCSVHeaders.map(h=>values[h]??'').join(',');
 const expanded=raw.split('\n')[0]+',locale,note,verification_note\n'+raw.split('\n')[1]+', , , ';
 assert.deepEqual(parseCSV(expanded),parseCSV(raw));
 const imported=await parseDictionaryCSV(expanded);
 assert.equal(imported.length,1);
 assert.equal(imported[0].senses[0].gloss_zh_tw,'港口');
 await assert.rejects(parseDictionaryCSV(expanded.replace(/, , , $/,',en, , ')),/退休欄位 locale/);
 assert.throws(()=>parseCSV(expanded.replace(',locale,note,verification_note',',locale,extra,note,verification_note').replace(/, , , $/,', , , , ')),/CSV 欄位/);
 assert.throws(()=>parseCSV(expanded.replace('locale,note,verification_note','locale,source_id,verification_note')),/CSV 欄位/);
 assert.throws(()=>parseCSV(raw.replace(',headword,',',headwrod,')),/CSV 欄位/);
});

test('JSON imports discard only fixed, empty retired relation metadata and never propagate it into new drafts',async()=>{
 const doc={
  dictionary_entries:[{id:id(1),kind:'word',headword:'harbor'}],
  dictionary_relations:[{id:id(3),entry_id:id(1),target_entry_id:id(4),target_sense_id:id(5),relation_kind:'learning_decomposition',verification_note:' '}],
 };
 const original=structuredClone(doc);
 const normalized=parseJSONBundle(JSON.stringify(doc));
 assert.deepEqual(doc,original);
 assert.equal(Object.hasOwn(normalized.dictionary_relations[0],'relation_kind'),false);
 assert.equal(Object.hasOwn(normalized.dictionary_relations[0],'verification_note'),false);
 const drafts=await normalizeDictionaryBundle({rpc:async()=>{throw Error('Unexpected RPC')}},doc);
 assert.equal(drafts.length,1);
 assert.equal(Object.hasOwn(drafts[0].relations[0],'relation_kind'),false);
 assert.equal(Object.hasOwn(drafts[0].relations[0],'verification_note'),false);
 const make=(patch)=>JSON.stringify({...doc,dictionary_relations:[{...doc.dictionary_relations[0],...patch}]});
 assert.throws(()=>parseJSONBundle(make({relation_kind:'historical_etymology'})),/relation_kind/);
 assert.throws(()=>parseJSONBundle(make({verification_note:'曾人工審核'})),/verification_note/);
 assert.throws(()=>parseJSONBundle(make({unknown:'test'})),/不允許欄位 unknown/);
 assert.throws(()=>parseJSONBundle(make({target_entry_id:'not-a-uuid'})),/UUID/);
 assert.throws(()=>parseJSONBundle(JSON.stringify({...doc,dictionary_relations:[{...doc.dictionary_relations[0],source_id:id(9)}]})),/source_id/);
});
