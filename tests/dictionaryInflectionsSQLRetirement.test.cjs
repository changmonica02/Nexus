require('./loadStudy.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {database,migrate}=require('./fixtures/retirementDatabase.cjs');

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
 }finally{await pg.close();}
});
test('Final retirement refuses all external SQL table dependencies and never uses CASCADE',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261114231000_dictionary_inflections_final_drop.sql','utf8');
 assert.match(sql,/drop table public\.dictionary_inflections restrict/i);
 assert.match(sql,/drop function if exists public\.search_dictionary_with_inflections/i);
 assert.doesNotMatch(sql,/\bcascade\b/i);
});
