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


// Combined regression: explicit morpheme IDs from #177 and ignored columns from #182.
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
