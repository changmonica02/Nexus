require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {join}=require('node:path');
const {tmpdir}=require('node:os');
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
  d=>d.claims[2].verification_note='',d=>d.entries[3].variant_of='test-variant',
  d=>d.word_senses[0].word_id='missing',d=>d.claims[0].word_id='test-word',
 ];
 for(const mutate of invalid){const data=fixture();mutate(data);assert.throws(()=>parseCatalog(data),/驗證失敗/);}
});

test('only verified historical scenes can be presented as history',()=>{
 for(const status of ['unverified','pending','disputed'])assert.equal(claimLabel('historical_scene',status),'記憶情境');
 assert.equal(claimLabel('historical_scene','verified'),'歷史場景（已查證）');
 assert.equal(claimLabel('historical_etymology','pending'),'詞源說法（尚未確認）');
 assert.equal(claimLabel('learning_decomposition','verified'),'學習用構詞拆解');
 assert.equal(claimLabel('mnemonic_story','verified'),'記憶故事');
});

test('catalog query uses only independent read RPC and rejects unavailable or malformed data',async()=>{
 const data=fixture();
 assert.equal(await loadCatalog({rpc:async name=>{assert.equal(name,'get_etymology_catalog');return{data,error:null};}}),data);
 await assert.rejects(()=>loadCatalog({rpc:async()=>({data:null,error:{message:'missing migration'}})}),/missing migration/);
 await assert.rejects(()=>loadCatalog({rpc:async()=>({data:{},error:null})}),/驗證失敗/);
});

test('missing source is blocked; repeated parsing preserves raw notes and performs no import',async()=>{
 const {inspectBatch,main}=await import('../scripts/import-etymology.mjs');
 const directory=await fs.mkdtemp(join(tmpdir(),'nexus-etymology-'));
 try{
  const {report:missing}=await inspectBatch(join(directory,'absent'));
  assert.equal(missing.errors[0].code,'BATCH08_MISSING');assert.equal(missing.imported,0);assert.equal(missing.record_counts_available,false);
  const raw='---\nunrecognized: [preserve, all]\n---\nSynthetic test only.\n';
  await fs.writeFile(join(directory,'synthetic.md'),raw);
  const first=await inspectBatch(directory),second=await inspectBatch(directory);
  assert.deepEqual(first,second);assert.equal(first.report.database_writes,0);assert.equal(first.report.imported,0);
  assert.equal(first.report.status,'valid');assert.equal(first.report.review[0].code,'RAW_PRESERVED');
  assert.equal(first.catalog.sources[0].raw_markdown,raw);assert.deepEqual(first.catalog.sources[0].metadata.frontmatter,{unrecognized:['preserve','all']});
  assert.equal(await fs.readFile(join(directory,'synthetic.md'),'utf8'),raw);
  await assert.rejects(()=>main(['--apply']),/不支援參數/);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
