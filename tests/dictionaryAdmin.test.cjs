require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {parseCSV,parseDictionaryImport,applyBundle}=require('../src/features/dictionary/adminImport.ts');
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
 const memory={dictionary_learning_notes:[{id:id(21),entry_id:id(10),sense_id:id(11),kind:'mnemonic_scenario',body:'記憶情境'}]};
 assert.deepEqual(await parseDictionaryImport(JSON.stringify(memory),'json'),memory);
 assert.equal('dictionary_sources' in first,false);
});
test('admin bundle: preview rollback, atomic import, replay/conflict, revisions, RLS and audit rollback',async()=>{
  const pg=new PGlite();
  try{
    await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated,anon;`);
    for(const f of ['20260922_study_fsrs.sql','20260930_public_dictionary.sql','20261001_dictionary_admin.sql','20261002_dictionary_reader.sql','20261005_dictionary_grouping.sql','20261006_dictionary_prefix_sense_groups.sql','20261007_dictionary_ai_roundtrip.sql','20261012_dictionary_retire_sources.sql','20261013_dictionary_draft_pipeline.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
    await pg.query('insert into auth.users values($1),($2)',[id(1),id(2)]);await pg.query('insert into dictionary_admins(user_id) values($1)',[id(1)]);
    await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
    const client={rpc:async(name,args)=>{try{if(name==='get_dictionary_entry')return {data:(await pg.query('select get_dictionary_entry($1) as data',[args.entry_uuid])).rows[0].data};return{data:(await pg.query('select apply_dictionary_drafts($1,$2,$3) as result',[JSON.stringify(args.drafts),args.preview,args.allow_edits])).rows[0].result,error:null};}catch(e){return{data:null,error:{message:e.message}};}}};
    const bundle=await parseDictionaryImport(JSON.stringify(sourceBundle),'json');
    assert.equal((await applyBundle(client,bundle)).inserted,3);
    assert.equal((await pg.query('select * from dictionary_entries')).rows.length,0);
    assert.equal((await pg.query('select * from dictionary_audit')).rows.length,0);
    assert.equal((await applyBundle(client,bundle,false)).inserted,3);
    assert.equal((await applyBundle(client,bundle,false)).skipped,3);
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
    const bad=await parseDictionaryImport(JSON.stringify({dictionary_etymologies:[{id:id(20),entry_id:id(10),sense_id:id(999),body:'failed relationship'}]}),'json');
    await assert.rejects(applyBundle(client,bad,false),/無效的所屬義項/);
    assert.equal((await pg.query('select * from dictionary_sources')).rows.length,0);
    assert.equal((await pg.query('select * from dictionary_audit')).rows.length,auditCount+1);
    const duplicate={dictionary_senses:[bundle.dictionary_senses[0],bundle.dictionary_senses[0]]};
    await assert.rejects(applyBundle(client,duplicate,false),/重複 ID/);
    await assert.rejects(applyBundle(client,{dictionary_admins:[{id:id(2)}]},false),/沒有資料/);
    const {parseJSONBundleWithIgnored}=require('../src/features/dictionary/adminImport.ts');
    const report=parseJSONBundleWithIgnored(JSON.stringify({dictionary_entries:[{...bundle.dictionary_entries[0],status:'published'}]}));
    assert.ok(report.ignoredFields.includes('dictionary_entries[1].status'));
    assert.equal('status' in report.bundle.dictionary_entries[0],false);
    await pg.query('select publish_dictionary_entry($1)',[id(10)]);
    const published={dictionary_entries:[{...bundle.dictionary_entries[0],headword:'cannot edit',revision:3}]};
    await assert.rejects(applyBundle(client,published,false,true),/Published/);
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);
    await assert.rejects(applyBundle(client,bundle,false),/admin required/);
    await assert.rejects(applyBundle(client,bundle,true),/admin required/);
    await pg.exec('reset role;set role anon');
    await assert.rejects(applyBundle(client,bundle,false),/permission denied/);
  }finally{await pg.close();}
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
