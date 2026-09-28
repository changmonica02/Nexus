require('./loadStudy.cjs');
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs');
const test=require('node:test'),assert=require('node:assert/strict');
const {parseCatalog}=require('../src/features/etymology/catalog.ts');
const owner='11111111-1111-4111-8111-111111111111';
const modules=Promise.all([import('../scripts/etymology/parser.mjs'),import('../scripts/etymology/store.mjs')]);
const originals=modules.then(async([parser])=>parser.readBatch('data/etymology/batch-08'));

test('real batch parses 150 originals, stable senses and only explicit word links; raw notes are byte-identical',async()=>{
 const [parser]=await modules,files=await originals,{catalog,report}=parser.compileBatch(files);
 assert.equal(report.status,'valid');assert.deepEqual(report.errors,[]);parseCatalog(catalog);
 assert.equal(files.length,150);assert.equal(catalog.entries.length,93);assert.equal(catalog.words.length,39);
 assert.equal(catalog.senses.length,82);assert.equal(catalog.word_senses.length,42);
 for(const source of catalog.sources) {
   const original=files.find(file=>`batch-08/${file.path}`===source.path);
   assert.equal(source.raw_markdown,original.raw);assert.equal(source.sha256,original.sha256);
   assert.deepEqual(Buffer.from(source.raw_markdown),fs.readFileSync('data/etymology/'+source.path));
 }
 const notes=catalog.sources.filter(s=>s.path.includes('/review/'));
 assert.equal(notes.length,16);assert.ok(notes.every(s=>s.metadata.unstructured));
 assert.equal(catalog.entries.some(e=>e.label==='im-'),false,'conditional spelling is not an inferred entry');
 assert.equal(catalog.words.some(w=>w.lemma==='impossible'),false,'illustrative example is not a word relation');
 assert.equal(catalog.senses.filter(s=>s.entry_id==='prefix-re').length,3);
 assert.equal(catalog.senses.filter(s=>s.entry_id==='prefix-auto').length,0,'no fake sense ID from draft prose');
 assert.ok(catalog.claims.filter(c=>c.kind==='historical_scene').every(c=>c.verification==='unverified'));
 assert.ok(catalog.word_senses.every(link=>link.relation_kind==='learning_decomposition'&&link.verification==='pending'));
 assert.ok(!catalog.claims.some(c=>c.body.includes('## 舊版內容')));
});

test('YAML handles quoted/flow/block forms, BOM, CRLF and duplicate-key/tag rejection',async()=>{
 const [p]=await modules;
 const result=p.parseMarkdown('\uFEFF---\r\nid: "stable:id"\r\nforms: ["a", "b"]\r\nnote: |\r\n  first\r\n  second\r\n---\r\n# 原文\r\n');
 assert.equal(result.frontmatter.id,'stable:id');assert.deepEqual(result.frontmatter.forms,['a','b']);
 assert.equal(result.frontmatter.note,'first\nsecond\n');assert.equal(result.body,'# 原文\r\n');
 assert.throws(()=>p.parseMarkdown('---\nid: a\nid: b\n---\n'),/duplicated mapping key/);
 assert.throws(()=>p.parseMarkdown('---\nid: !!js/function evil\n---\n'),/unknown tag/);
 assert.throws(()=>p.parseMarkdown('---\nid: a'),/結束/);
 assert.throws(()=>p.parseMarkdown('abc\0'),/NUL/);
 const sections=p.bodySections('# x\n```md\n## Not a heading\n```\n## 詞源與構詞說明\nBody\n## 舊版內容（留存供審計，不作為正式義項）\n## 詞源與構詞說明\nOld');
 assert.equal(sections.length,2);assert.equal(sections[1].body,'Body\n');
});

test('duplicate IDs, absent required fields, bad sense references and unknown statuses report file-specific failures',async()=>{
 const [p]=await modules,files=await originals;
 const cases=[
  ['DUPLICATE_ID',f=>{const copy={...f.find(x=>x.path==='roots/pos.md'),path:'roots/duplicate.md'};f.push(copy);}],
  ['MISSING_FIELD',f=>{const x=f.find(x=>x.path==='words/propose.md');x.raw=x.raw.replace('headword: "propose"','headword: null');}],
  ['INVALID_SENSE_REFERENCE',f=>{const x=f.find(x=>x.path==='words/propose.md');x.raw=x.raw.replace('root-pos-sense-1','missing-sense');}],
  ['UNKNOWN_VERIFICATION',f=>{const x=f.find(x=>x.path==='words/propose.md');x.raw=x.raw.replace('verification: meaning_only','verification: presumed_true');}],
 ];
 for(const [code,mutate]of cases){const f=structuredClone(files);mutate(f);const {report}=p.compileBatch(f);assert.equal(report.status,'invalid');assert.ok(report.errors.some(e=>e.code===code&&e.path.endsWith('.md')));}
 assert.deepEqual(files,await originals);
});

test('unknown frontmatter fields preserved with review issue, never discarded or interpreted',async()=>{
 const [p]=await modules,files=structuredClone(await originals);
 const file=files.find(f=>f.path==='words/propose.md');file.raw=file.raw.replace('headword:', 'unknown_annotation: "保留，不能猜測"\nheadword:');
 const {catalog,report}=p.compileBatch(files);
 assert.equal(report.status,'valid');assert.ok(report.review.some(r=>r.code==='UNMAPPED_FIELD'&&r.path===file.path));
 assert.equal(catalog.sources.find(s=>s.path.endsWith(file.path)).metadata.frontmatter.unknown_annotation,'保留，不能猜測');
});

test('full local import, replay, dry-run, owner isolation and content collision rollback',async()=>{
 const [p,store]=await modules,compiled=p.compileBatch(await originals),pg=new PGlite();
 try{
  await store.initializeLocalDatabase(pg);
  const dry=await store.importCatalog(pg,compiled,owner,{dryRun:true});assert.equal(dry.inserted,721);assert.equal(dry.database_writes,0);
  assert.equal((await pg.query('select * from etymology_sources')).rows.length,0);
  const first=await store.importCatalog(pg,compiled,owner);assert.equal(first.files_inserted,150);assert.equal(first.inserted,721);
  const repeat=await store.importCatalog(pg,compiled,owner);assert.equal(repeat.inserted,0);assert.equal(repeat.files_skipped,150);assert.equal(repeat.skipped,721);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  await pg.exec('set role authenticated');
  const snapshot=(await pg.query('select get_etymology_catalog() as data')).rows[0].data;parseCatalog(snapshot);
  assert.equal(snapshot.sources.length,150);assert.equal(snapshot.words.length,39);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)",['22222222-2222-4222-8222-222222222222']);
  assert.equal((await pg.query('select get_etymology_catalog() as data')).rows[0].data.sources.length,0);
  await pg.exec('reset role');
  const changed=structuredClone(compiled);
  changed.catalog.sources.unshift({...changed.catalog.sources[0],id:'new-then-rollback',path:'new-then-rollback.md'});
  changed.catalog.words[0].definition+=' changed';
  await assert.rejects(()=>store.importCatalog(pg,changed,owner),/ID_CONTENT_COLLISION/);
  assert.equal((await pg.query("select * from etymology_sources where id='new-then-rollback'")).rows.length,0);
  assert.equal((await pg.query('select * from etymology_sources')).rows.length,150);
 }finally{await pg.close();}
});

test('late database failure rolls back all tables, including source originals',async()=>{
 const [p,store]=await modules,compiled=p.compileBatch(await originals),pg=new PGlite();
 try{
  await store.initializeLocalDatabase(pg);
  await pg.exec("create function reject_claim() returns trigger language plpgsql as $$ begin raise exception 'injected failure'; end; $$; create trigger reject_claim before insert on etymology_claims for each row execute function reject_claim();");
  await assert.rejects(()=>store.importCatalog(pg,compiled,owner),/injected failure/);
  for(const table of p.TABLES)assert.equal((await pg.query(`select * from etymology_${table}`)).rows.length,0);
  const invalid={...compiled,report:{...compiled.report,status:'invalid'}};
  await assert.rejects(()=>store.importCatalog(pg,invalid,owner),/整批拒絕/);
 }finally{await pg.close();}
});

test('CLI rejects remote locations, report-over-source and an already locked local database',async()=>{
 const {spawnSync}=require('node:child_process');
 const {resolve}=require('node:path');
 const run=args=>spawnSync(process.execPath,['scripts/import-etymology.mjs',...args],{encoding:'utf8'});
 let result=run(['--apply']);assert.equal(result.status,2);assert.match(result.stderr,/不支援參數/);
 result=run(['--report','data/etymology/batch-08/README.md']);assert.equal(result.status,2);assert.match(result.stderr,/原始資料包/);
 result=run(['--apply-local','--local-db','https://example.invalid/database','--owner',owner]);assert.equal(result.status,2);
 assert.equal(JSON.parse(result.stdout).database_writes,0);
 const path=resolve('.local/etymology',`lock-test-${crypto.randomUUID()}`),lockPath=path+'.import-lock';
 fs.mkdirSync(require('node:path').dirname(path),{recursive:true});fs.writeFileSync(lockPath,'test lock',{flag:'wx'});
 try{
  result=run(['--apply-local','--local-db',path,'--owner',owner]);assert.equal(result.status,2);
  assert.equal(JSON.parse(result.stdout).errors[0].code,'EEXIST');assert.equal(fs.readFileSync(lockPath,'utf8'),'test lock');
  assert.deepEqual(fs.readdirSync(path),[],'no database opened behind another process lock');
 }finally{fs.unlinkSync(lockPath);if(fs.existsSync(path))fs.rmdirSync(path);}
});
