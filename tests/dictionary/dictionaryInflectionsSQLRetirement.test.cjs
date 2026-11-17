require('../loadStudy.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {draft,id,sql}=require('../fixtures/dictionaryExchangeDatabase.cjs');
const {mapDictionaryDraft}=require('../../src/features/dictionary/draftPipeline.ts');
const {database,migrate}=require('../fixtures/retirementDatabase.cjs');

const baselineMigrations=[
 '20261106032651_dictionary_exchange_safe_replacement.sql',
 '20261111145758_dictionary_pending_identity.sql',
 '20261112012042_dictionary_morpheme_senses.sql',
 '20261112120627_dictionary_catalog_query_plan.sql',
 '20261113035217_dictionary_legacy_morpheme_retired.sql',
 '20261113035226_dictionary_review_cleanup.sql',
 '20261113061500_dictionary_semantic_ten_domains.sql',
];
const migrations=[
 '20261114135000_dictionary_sense_derivations.sql',
 '20261114152000_dictionary_sense_extensions_draft_rpc.sql',
 '20261114162000_dictionary_sense_extensions_review.sql',
 '20261114172000_dictionary_public_notes.sql',
 '20261114173000_dictionary_public_notes_draft_review.sql',
 '20261114174000_dictionary_public_notes_deletion.sql',
 '20261114214000_dictionary_exchange_b2_scope.sql',
 '20261114224000_dictionary_inflections_read_retired.sql',
 '20261114230000_dictionary_inflections_transactions_retired.sql',
 '20261114231000_dictionary_inflections_final_drop.sql',
];
test('B phase retirement runs ordered migrations in isolated PostgreSQL, retains Review and B2 child tables',async()=>{
 const pg=await database();
 try{
  // Install the actual main-branch migrations between the shared test
  // fixture's 2026-11-05 baseline and the B2 branch.
  for(const stage of ['official','ipa','page'])await migrate(pg,stage);
  await pg.exec('reset role');
  for(const name of baselineMigrations){
   const sql=fs.readFileSync('supabase/migrations/'+name,'utf8');
   try{await pg.exec(sql)}catch(error){throw new Error('Baseline '+name+': '+error.message,{cause:error});}
  }
  for(const name of migrations){
   const sql=fs.readFileSync('supabase/migrations/'+name,'utf8');
   try{await pg.exec(sql)}catch(error){throw new Error('Migration '+name+': '+error.message,{cause:error});}
  }
  const result=(await pg.query(`select
    to_regclass('public.dictionary_inflections')::text retired,
    to_regclass('public.dictionary_sense_derivations')::text derived,
    to_regclass('public.dictionary_public_notes')::text notes,
    to_regclass('public.dictionary_review_drafts')::text reviews,
    to_regclass('public.study_cards')::text cards`)).rows[0];
  assert.equal(result.retired,null);
  assert.ok(result.derived&&result.notes&&result.reviews&&result.cards);
  const sqlRefs=(await pg.query(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosrc ilike '%dictionary_inflections%' order by p.proname`)).rows;
  assert.deepEqual(sqlRefs,[]);
  assert.equal((await pg.query(`select to_regprocedure('public.search_dictionary_with_inflections(text,text,integer)')::text value`)).rows[0].value,null);
  // CAS and security-definer RPCs survive; they are rewritten, not removed.
  for(const name of ['apply_dictionary_drafts(jsonb,boolean,boolean)','dictionary_materialize_review(uuid,jsonb)',
    'dictionary_import_context(jsonb)','apply_dictionary_import_operation(jsonb)','delete_dictionary_entry(uuid,bigint,jsonb,uuid)']){
   const check=await pg.query('select pg_get_functiondef($1::regprocedure) definition',['public.'+name]);
   assert.ok(check.rows[0].definition.includes('SECURITY DEFINER'),name);
  }

  await pg.exec('set role authenticated');
  const d=draft(9900);d.headword='b2-smoke';
  d.derivations=[{id:id(9902),sense_id:id(9901),gloss_zh_tw:'延伸義',sort_order:0}];
  d.examples=[{id:id(9903),sense_id:id(9901),body:'A smoke test.',translation_zh_tw:'驗證例句。',derivation_id:id(9902),sort_order:0}];
  d.public_notes=[{id:id(9904),body:'共用筆記'}];
  await sql(pg,'select apply_dictionary_drafts($1,false,true) v',[JSON.stringify([mapDictionaryDraft(d)])]);
  await sql(pg,'select publish_dictionary_entry($1,true) v',[d.entry_id]);
  const published=await sql(pg,'select get_published_dictionary_entry($1) v',[d.entry_id]);
  assert.equal(published.derivations[0].id,id(9902));
  assert.equal(published.examples[0].translation_zh_tw,'驗證例句。');
  assert.equal(published.public_notes[0].body,'共用筆記');
  const snapshot=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[d.entry_id]);
  await pg.exec('reset role');
  const candidate=await sql(pg,'select dictionary_snapshot_candidate($1) v',[JSON.stringify(snapshot)]);
  await pg.exec('set role authenticated');
  candidate.public_notes[0].body='審核後的共用筆記';
  candidate.derivations[0].gloss_zh_tw='審核後的延伸義';
  candidate.examples[0].translation_zh_tw='審核後的中文例句。';
  const review=await sql(pg,'select create_dictionary_edit_review($1,$2,$3) v',[d.entry_id,JSON.stringify(snapshot),JSON.stringify(candidate)]);
  await sql(pg,'select approve_dictionary_review($1,$2,true) v',[review.id,review.revision]);
  const reread=await sql(pg,'select get_published_dictionary_entry($1) v',[d.entry_id]);
  assert.equal(reread.public_notes[0].body,'審核後的共用筆記');
  assert.equal(reread.examples[0].derivation_id,id(9902));
  assert.equal(reread.derivations[0].gloss_zh_tw,'審核後的延伸義');
  assert.equal(reread.examples[0].translation_zh_tw,'審核後的中文例句。');
  const latest=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[d.entry_id]);
  const deleted=await sql(pg,'select delete_dictionary_entry($1,$2,$3,$4) v',[d.entry_id,latest.detail.entry.revision,JSON.stringify(latest),id(9999)]);
  assert.equal(deleted.deleted,true);
  assert.equal(await sql(pg,'select get_published_dictionary_entry($1) v',[d.entry_id]),null);
  console.log('B2_FULL_CHAIN_DRAFT_PUBLISH_REVIEW_DELETE_VERIFIED');
 }finally{await pg.close();}
});
test('Final retirement refuses all external SQL table dependencies and never uses CASCADE',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261114231000_dictionary_inflections_final_drop.sql','utf8');
 assert.match(sql,/drop table public\.dictionary_inflections restrict/i);
 assert.match(sql,/drop function if exists public\.search_dictionary_with_inflections/i);
 assert.doesNotMatch(sql,/\bcascade\b/i);
});
