require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {parseCSV,parseDictionaryImport,applyBundle}=require('../src/features/dictionary/adminImport.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const csv=`entry_id,sense_id,headword,part_of_speech,gloss_zh_tw,citation,license\n${id(10)},${id(11)},test,noun,測試,自建測試,test-only\n${id(10)},${id(12)},test,verb,"測試,驗證",自建測試,test-only`;
test('CSV/Markdown validation preserves original text, stable IDs and history separation',async()=>{
  const a=await parseDictionaryImport(csv,'csv'),b=await parseDictionaryImport(csv,'csv');
  assert.deepEqual(a,b);assert.equal(a.dictionary_entries.length,1);assert.equal(a.dictionary_senses.length,2);
  assert.equal(a.dictionary_sources[0].raw_text,csv);assert.equal(a.dictionary_senses[1].gloss_zh_tw,'測試,驗證');
  await assert.rejects(parseDictionaryImport(csv.replace(id(12),id(11)),'csv'),/重複/);
  await assert.rejects(parseDictionaryImport(csv.replace(',verb,',',,'),'csv'),/缺少/);
  assert.throws(()=>parseCSV(csv+'"'),/引號/);
  const md=`---\nid: ${id(20)}\nentry_id: ${id(10)}\nsense_id: ${id(11)}\nkind: historical_etymology\ncitation: 自建測試\nlicense: test-only\nverification: pending\n---\n## 未查證測試\n原始正文\n`;
  const doc=await parseDictionaryImport(md,'md');assert.equal(doc.dictionary_etymologies[0].body,'## 未查證測試\n原始正文\n');assert.equal(doc.dictionary_sources[0].raw_text,md);
  await assert.rejects(parseDictionaryImport(md.replace('pending','verified'),'md'),/查證說明/);
  await assert.rejects(parseDictionaryImport(md.replace('pending','fake'),'md'),/未知查證/);
  await assert.rejects(parseDictionaryImport(md.replace('historical_etymology','mnemonic_scenario'),'md'),/不可標記/);
  const memory=await parseDictionaryImport(md.replace('historical_etymology','mnemonic_scenario').replace('verification: pending\n',''),'md');
  assert.equal(memory.dictionary_etymologies.length,0);assert.equal(memory.dictionary_learning_notes.length,1);
  await assert.rejects(parseDictionaryImport(md.replace('license: test-only','license: test-only\nlicense: duplicate'),'md'),/重複欄位/);
});
test('admin bundle: preview rollback, atomic import, replay/conflict, revisions, RLS and audit rollback',async()=>{
  const pg=new PGlite();
  try{
    await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated,anon;`);
    for(const f of ['20260922_study_fsrs.sql','20260930_public_dictionary.sql','20261001_dictionary_admin.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
    await pg.query('insert into auth.users values($1),($2)',[id(1),id(2)]);await pg.query('insert into dictionary_admins(user_id) values($1)',[id(1)]);
    await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
    const client={rpc:async(name,args)=>{try{return{data:(await pg.query('select apply_dictionary_bundle($1,$2,$3) as result',[args.bundle,args.preview,args.allow_edits])).rows[0].result,error:null};}catch(e){return{data:null,error:{message:e.message}};}}};
    const bundle=await parseDictionaryImport(JSON.stringify(await parseDictionaryImport(csv,'csv')),'json');
    assert.equal((await applyBundle(client,bundle)).inserted,4);
    assert.equal((await pg.query('select * from dictionary_entries')).rows.length,0);
    assert.equal((await pg.query('select * from dictionary_audit')).rows.length,0);
    assert.equal((await applyBundle(client,bundle,false)).inserted,4);
    assert.equal((await applyBundle(client,bundle,false)).skipped,4);
    const homograph=structuredClone(bundle);
    homograph.dictionary_entries[0].id=id(40);
    homograph.dictionary_senses=homograph.dictionary_senses.map((s,i)=>({...s,id:id(41+i),entry_id:id(40)}));
    const warning=await applyBundle(client,homograph,true);
    assert.deepEqual(warning.warnings.find(w=>w.id===id(40)).similar_ids,[id(10)]);
    assert.equal((await pg.query('select * from dictionary_entries')).rows.length,1);
    await applyBundle(client,homograph,false);
    assert.equal((await pg.query('select * from dictionary_entries')).rows.length,2);
    const inBatch=structuredClone(homograph);
    inBatch.dictionary_entries.push({...inBatch.dictionary_entries[0],id:id(50)});
    assert.ok((await applyBundle(client,inBatch,true)).warnings.find(w=>w.id===id(50)).similar_ids.includes(id(40)));
    const sameSense={dictionary_senses:[{...bundle.dictionary_senses[0],id:id(60)}]};
    assert.ok((await applyBundle(client,sameSense,true)).warnings.some(w=>w.id===id(60)));
    const auditCount=(await pg.query('select * from dictionary_audit')).rows.length;
    const conflict=structuredClone(bundle);conflict.dictionary_entries[0].headword='conflict';
    await assert.rejects(applyBundle(client,conflict,false),/ID conflict/);
    await assert.rejects(applyBundle(client,conflict,false,true),/Revision conflict/);
    conflict.dictionary_entries[0].revision=1;
    assert.equal((await applyBundle(client,conflict,false,true)).updated,1);
    conflict.dictionary_entries[0].headword='stale';
    await assert.rejects(applyBundle(client,conflict,false,true),/Revision conflict/);
    const bad=await parseDictionaryImport(`---\nid: ${id(20)}\nentry_id: ${id(10)}\nsense_id: ${id(999)}\nkind: historical_etymology\ncitation: failure fixture\nlicense: test-only\n---\nfailed relationship`,'md');
    await assert.rejects(applyBundle(client,bad,false),/foreign key/);
    assert.equal((await pg.query('select * from dictionary_sources')).rows.length,1);
    assert.equal((await pg.query('select * from dictionary_audit')).rows.length,auditCount+1);
    const duplicate={dictionary_senses:[bundle.dictionary_senses[0],bundle.dictionary_senses[0]]};
    await assert.rejects(applyBundle(client,duplicate,false),/Duplicate ID/);
    await assert.rejects(applyBundle(client,{dictionary_admins:[{id:id(2)}]},false),/Unknown bundle table/);
    await assert.rejects(applyBundle(client,{dictionary_entries:[{...bundle.dictionary_entries[0],status:'published'}]},false),/Unexpected field/);
    await pg.query('select publish_dictionary_entry($1)',[id(10)]);
    const published={dictionary_entries:[{...bundle.dictionary_entries[0],headword:'cannot edit',revision:3}]};
    await assert.rejects(applyBundle(client,published,false,true),/await A3/);
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);
    await assert.rejects(applyBundle(client,bundle,false),/admin required/);
    await assert.rejects(applyBundle(client,bundle,true),/admin required/);
    await pg.exec('reset role;set role anon');
    await assert.rejects(applyBundle(client,bundle,false),/permission denied/);
  }finally{await pg.close();}
});

 test('JSON bundle rejects invalid structure, fields, UUIDs, duplicate IDs and verification',async()=>{
  const original=await parseDictionaryImport(csv,'csv');
  assert.deepEqual(await parseDictionaryImport(JSON.stringify(original),'json'),original);
  const invalid=[null,[],{}, {dictionary_entries:{}},{dictionary_admins:[]},
    {dictionary_entries:[null]}, {dictionary_entries:[{id:id(1)}]},
    {dictionary_entries:[{...original.dictionary_entries[0],id:'bad'}]},
    {dictionary_entries:[{...original.dictionary_entries[0],status:'published'}]},
    {dictionary_entries:[{...original.dictionary_entries[0],kind:'private'}]},
    {dictionary_sources:[{...original.dictionary_sources[0],verification:'invented'}]},
    {dictionary_sources:[{...original.dictionary_sources[0],verification:'verified'}]},
    {dictionary_entries:[{...original.dictionary_entries[0],revision:0}]},
    {dictionary_senses:[{...original.dictionary_senses[0],gloss_zh_tw:42}]},
    {dictionary_entries:[original.dictionary_entries[0],original.dictionary_entries[0]]}];
  for(const value of invalid)await assert.rejects(parseDictionaryImport(JSON.stringify(value),'json'));
  await assert.rejects(parseDictionaryImport('{','json'),/JSON 格式/);
  const uppercase={...original.dictionary_entries[0],id:'abcdefab-abcd-4abc-8abc-abcdefabcdef'};
  await assert.rejects(parseDictionaryImport(JSON.stringify({dictionary_entries:[uppercase,{...uppercase,id:uppercase.id.toUpperCase()}]}),'json'),/重複 ID/);
  const notes={dictionary_learning_notes:[{id:id(90),entry_id:id(10),source_id:original.dictionary_sources[0].id,kind:'mnemonic_scenario',body:'完整記憶情境\n保留原文',sense_id:null}]};
  assert.deepEqual(await parseDictionaryImport(JSON.stringify(notes),'json'),notes);
});
