require('./loadStudy.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseCSV,parseCSVWithIgnored}=require('../src/features/dictionary/csvRows.ts');
const {parseJSONBundle,parseJSONBundleWithIgnored,normalizeDictionaryBundle}=require('../src/features/dictionary/adminImport.ts');
const {dictionaryCSVHeaders,parseDictionaryCSV,parseDictionaryCSVPreview}=require('../src/features/dictionary/dictionaryCSV.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

test('CSV ignores every unsupported input column, reports its name and keeps valid columns',async()=>{
 const values={kind:'word',entry_id:id(1),sense_id:id(2),headword:'harbor',part_of_speech:'noun',gloss_zh_tw:'港口'};
 const raw=dictionaryCSVHeaders.join(',')+'\n'+dictionaryCSVHeaders.map(h=>values[h]??'').join(',');
 const expanded=raw.split('\n')[0]+',locale,extra,source_id,verification_note\n'+raw.split('\n')[1]+',en,with content,'+id(7)+',legacy';
 const report=parseCSVWithIgnored(expanded);
 assert.deepEqual(report.rows,parseCSV(raw));
 assert.deepEqual(report.ignoredFields,['locale','extra','source_id','verification_note']);
 const preview=await parseDictionaryCSVPreview(expanded);
 assert.equal(preview.issues.length,0);
 assert.deepEqual(preview.ignoredFields,report.ignoredFields);
 assert.equal((await parseDictionaryCSV(expanded))[0].senses[0].gloss_zh_tw,'港口');
 assert.throws(()=>parseCSV(raw.replace(',headword,',',headwrod,')),/缺少必要欄位/);
 assert.throws(()=>parseCSV(expanded.replace(',en,with content,'+id(7)+',legacy',',en,with content')),/欄數不符/);
});


test('CSV keeps distinct homographic morpheme IDs while ignoring extra columns',async()=>{
 const csv=rows=>dictionaryCSVHeaders.join(',')+',unused_column\n'+rows.map(r=>dictionaryCSVHeaders.map(h=>r[h]??'').join(',')+',legacy').join('\n');
 const same=(kind,entry_id,sense_id)=>({kind,entry_id,sense_id,headword:'tri-',part_of_speech:'',gloss_zh_tw:'構詞'});
 for(const kind of ['prefix','root','suffix']){
  const a=same(kind,id(201),id(202)),b=same(kind,id(203),id(204));
  const preview=await parseDictionaryCSVPreview(csv([a,b]));
  assert.equal(preview.issues.length,0);
  assert.deepEqual(preview.ignoredFields,['unused_column']);
  assert.deepEqual(preview.drafts.map(x=>x.entry_id),[id(201),id(203)]);
  const ambiguous=await parseDictionaryCSVPreview(csv([a,b,same(kind,'',id(205))]));
  assert.ok(ambiguous.issues.some(x=>x.field==='entry_id'&&/明確填入/.test(x.error)));
  await assert.rejects(parseDictionaryCSV(csv([a,b,same(kind,'',id(205))])),/明確填入/);
 }
 await assert.rejects(parseDictionaryCSV(csv([
  {kind:'word',entry_id:id(301),sense_id:id(302),headword:'bank',part_of_speech:'noun',gloss_zh_tw:'銀行'},
  {kind:'word',entry_id:id(303),sense_id:id(304),headword:'bank',part_of_speech:'verb',gloss_zh_tw:'傾斜'}
 ])),/不同 Entry ID/);
});

test('JSON bundle ignores unsupported fields and tables but preserves current data',async()=>{
 const doc={
  dictionary_entries:[{id:id(1),kind:'word',headword:'harbor',source_id:id(9),unexpected:'not imported'}],
  dictionary_relations:[{id:id(3),entry_id:id(1),target_entry_id:id(4),target_sense_id:id(5),relation_kind:'historical_etymology',verification_note:'meaningful old content',additional:'other'}],
  dictionary_sources:[{id:id(9),raw_text:'not imported'}],
  custom_table:[{note:'extra'}],
 };
 const original=structuredClone(doc);
 const {bundle,ignoredFields}=parseJSONBundleWithIgnored(JSON.stringify(doc));
 assert.deepEqual(doc,original);
 assert.deepEqual(bundle.dictionary_entries,[{id:id(1),kind:'word',headword:'harbor'}]);
 assert.deepEqual(bundle.dictionary_relations,[{id:id(3),entry_id:id(1),target_entry_id:id(4),target_sense_id:id(5)}]);
 assert.deepEqual(ignoredFields.sort(),[
  'dictionary_entries[1].source_id','dictionary_entries[1].unexpected','dictionary_relations[1].relation_kind',
  'dictionary_relations[1].verification_note','dictionary_relations[1].additional',
  'dictionary_sources（不支援的資料表）','custom_table（不支援的資料表）'
 ].sort());
 assert.deepEqual(parseJSONBundle(JSON.stringify(doc)),bundle);
 const drafts=await normalizeDictionaryBundle({rpc:async()=>{throw Error('Unexpected RPC')}},doc);
 assert.equal(drafts.length,1);
 assert.equal(Object.hasOwn(drafts[0].relations[0],'relation_kind'),false);
 assert.equal(Object.hasOwn(drafts[0].relations[0],'verification_note'),false);
 const make=(patch)=>JSON.stringify({...doc,dictionary_relations:[{...doc.dictionary_relations[0],...patch}]});
 assert.throws(()=>parseJSONBundle(make({target_entry_id:'not-a-uuid'})),/UUID/);
 assert.throws(()=>parseJSONBundle(JSON.stringify({...doc,dictionary_entries:[{...doc.dictionary_entries[0],kind:'invalid'}]})),/未知 kind/);
});
