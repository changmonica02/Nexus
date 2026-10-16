require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('./etymologyFixture.cjs');
const {parseCatalog,searchEntries,claimLabel,loadCatalog}=require('../src/features/etymology/catalog.ts');

test('independent senses, variants and multi-root words retain source data and filter by family/category',()=>{
 const data=fixture();assert.equal(parseCatalog(data),data);
 assert.deepEqual(searchEntries(data,'prefix','義項二','test-category').map(e=>e.id),['test-prefix']);
 assert.deepEqual(searchEntries(data,'root','', 'test-category').map(e=>e.id),['test-root']);
 assert.equal(searchEntries(data,'prefix','missing').length,0);
 assert.equal(data.senses.filter(s=>s.entry_id==='test-prefix').length,2);
 assert.equal(data.word_senses.length,2);
 assert.equal(data.sources[0].metadata.unmapped_field,'preserved');
});

test('duplicate IDs, missing fields, unknown verification, wrong senses and cyclic variants fail closed',()=>{
 const invalid=[
  d=>d.senses.push({...d.senses[0]}),d=>delete d.entries[0].label,
  d=>d.claims[0].verification='assume-verified',d=>d.word_senses[0].sense_id='sense-root',
  d=>delete d.claims[2].data_source,d=>d.entries[3].variant_of='test-variant',
  d=>d.word_senses[0].word_id='missing',d=>d.claims[0].word_id='test-word',
 ];
 for(const mutate of invalid){const data=fixture();mutate(data);assert.throws(()=>parseCatalog(data),/驗證失敗/);}
});

test('claim labels depend on content kind, with no verification state or inferred upgrade',()=>{
 assert.equal(claimLabel('historical_scene'),'場景說明');
 assert.equal(claimLabel('historical_etymology'),'歷史詞源');
 assert.equal(claimLabel('learning_decomposition'),'學習用構詞拆解');
 assert.equal(claimLabel('mnemonic_story'),'記憶故事');
});

test('catalog query uses only independent read RPC and rejects unavailable or malformed data',async()=>{
 const data=fixture();
 assert.equal(await loadCatalog({rpc:async name=>{assert.equal(name,'get_etymology_catalog');return{data,error:null};}}),data);
 await assert.rejects(()=>loadCatalog({rpc:async()=>({data:null,error:{message:'missing migration'}})}),/missing migration/);
 await assert.rejects(()=>loadCatalog({rpc:async()=>({data:{},error:null})}),/驗證失敗/);
});

