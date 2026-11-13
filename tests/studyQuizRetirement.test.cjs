require('./loadStudy.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {database,sql,owner}=require('./fixtures/retirementDatabase.cjs');
const migration=fs.readFileSync('supabase/migrations/20261113203000_study_quiz_legacy_retired.sql','utf8');

test('retired Quiz schema cannot erase remaining records and leaves normal Study and official pack deletion intact',async()=>{
 const pg=await database();
 try{
  await pg.exec('reset role');
  if(await sql(pg,"select to_regclass('public.study_card_quiz_states') v")===null)
   await pg.exec(fs.readFileSync('supabase/migrations/20260925_study_quiz_persistence.sql','utf8'));
  assert.notEqual(await sql(pg,"select to_regprocedure('public.apply_study_quiz_operation(jsonb)')::text v"),null);
  assert.notEqual(await sql(pg,"select to_regprocedure('public.delete_official_study_pack(text)')::text v"),null);
  const card='retirement-quiz-card';
  await pg.query('insert into study_cards(owner_id,id,payload) values($1,$2,$3)',[owner,card,{id:card,deck_id:'deck',front:'unchanged'}]);
  await pg.query('insert into study_card_quiz_states(owner_id,card_id) values($1,$2)',[owner,card]);
  await assert.rejects(pg.exec(migration),/Quiz retirement blocked/i);
  await pg.exec('rollback');
  assert.equal(await sql(pg,'select count(*)::int v from study_card_quiz_states'),1);
  assert.notEqual(await sql(pg,"select to_regprocedure('public.apply_study_quiz_operation(jsonb)')::text v"),null);

  await pg.query('delete from study_card_quiz_states where owner_id=$1 and card_id=$2',[owner,card]);
  const studyBefore=await sql(pg,'select count(*)::int v from study_cards');
  await pg.exec(migration);
  assert.equal(await sql(pg,'select count(*)::int v from study_cards'),studyBefore);
  assert.equal(await sql(pg,"select to_regclass('public.study_card_quiz_states')::text v"),null);
  assert.equal(await sql(pg,"select to_regclass('public.study_quiz_attempt_receipts')::text v"),null);
  assert.equal(await sql(pg,"select to_regprocedure('public.apply_study_quiz_operation(jsonb)')::text v"),null);
  const official=await sql(pg,"select pg_get_functiondef('public.delete_official_study_pack(text)'::regprocedure) v");
  assert.doesNotMatch(official,/study_card_quiz_states|study_quiz_attempt_receipts/);
  assert.match(official,/study_review_events|study_card_states/);
 }finally{await pg.close();}
});
