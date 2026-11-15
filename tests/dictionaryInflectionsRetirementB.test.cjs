require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {mapDictionaryDraft,draftsFromBundle,validateDictionaryDraft}=require('../src/features/dictionary/draftPipeline.ts');
const {parseAI}=require('../src/features/dictionary/aiDictionary.ts');
const {draftFromExchange,parseExchange}=require('../src/features/dictionary/dictionaryExchange.ts');
const {withoutSense}=require('../src/features/dictionary/draftEditing.ts');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
test('retired Inflections cannot be accidentally persisted in new Draft/AI formats',()=>{
 const d={kind:'word',entry_id:id(1),headword:'work',senses:[{id:id(2),part_of_speech:'verb',gloss_zh_tw:'工作'}],relations:[],etymologies:[],learning_notes:[],examples:[],relation_hints:[],derivations:[]};
 assert.equal(validateDictionaryDraft([d]).length,0);
 assert.equal(Object.hasOwn(mapDictionaryDraft(d),'inflections'),false);
 assert.equal(Object.hasOwn(draftsFromBundle({dictionary_entries:[{id:id(1),kind:'word',headword:'work'}],dictionary_senses:[{id:id(2),entry_id:id(1),part_of_speech:'verb',gloss_zh_tw:'工作'}],dictionary_inflections:[{id:id(3),entry_id:id(1),form_kind:'past',form:'worked'}]})[0],'inflections'),false);
 assert.ok(validateDictionaryDraft([{...d,inflections:[{id:id(3),form_kind:'past',form:'worked'}]}]).some(e=>e.field==='inflections'));
 assert.equal(withoutSense({dictionary_senses:[{id:id(2)},{id:id(9)}],dictionary_inflections:[{id:id(3),sense_id:id(2)}]},id(2)).dictionary_senses.length,1);
 const current={format:'nexus-dictionary-ai',version:1,entries:[{type:'word',headword:'work',meanings:[{zh_tw:'工作',classification:'verb'}]}]};
 assert.equal(parseAI(JSON.stringify(current)).entries.length,1);
 current.entries[0].inflections=[{form_kind:'past',form:'worked'}];
 assert.throws(()=>parseAI(JSON.stringify(current)),/不允許欄位 inflections/);
});
test('legacy v1 Exchange and retired Inflections are rejected',()=>{
 const now='2026-11-14T00:00:00Z';
 const detail={entry:{id:id(1),kind:'word',headword:'work',word_segments:null,status:'draft',published_at:null,revision:1,updated_at:now},
 senses:[{id:id(2),entry_id:id(1),part_of_speech:'verb',gloss_zh_tw:'工作',revision:1,updated_at:now}],
 relations:[],etymologies:[],learning_notes:[],pronunciations:[],examples:[],lexical_annotations:[],inflections:[{id:id(3),entry_id:id(1),sense_id:id(2),form_kind:'past',form:'worked',sort_order:0,revision:1,updated_at:now}]};
 const doc={format:'nexus-dictionary-exchange',schema_version:1,exported_at:now,scope:{kinds:['word'],statuses:['draft'],query:''},records:[{entry_id:id(1),version:null,reviews:[],snapshot:{detail,metadata:null}}]};
 assert.throws(()=>parseExchange(JSON.stringify(doc)),/Unsupported dictionary exchange schema version/);
 doc.schema_version=2;
 doc.records[0].snapshot.detail.derivations=[];
 doc.records[0].snapshot.detail.public_notes=[];
 assert.throws(()=>draftFromExchange(parseExchange(JSON.stringify(doc)).records[0]),/unsupported field|Retired inflections/);
});
test('retirement SQL only changes selected RPC bodies and never drops production records prematurely',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261114224000_dictionary_inflections_read_retired.sql','utf8');
 assert.doesNotMatch(sql,/\bdrop\s+(?:table|function|trigger)\b|\btruncate\b|\bcascade\b/i);
 for(const name of ['get_dictionary_entry','get_published_dictionary_entry','dictionary_guard_change','guard_dictionary_extension_sense_delete','dictionary_exchange_scope_version'])assert.ok(sql.includes(name));
 assert.match(sql,/dictionary_inflections/);
});
