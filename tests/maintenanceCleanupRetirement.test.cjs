require('./loadStudy.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {database,sql,id}=require('./fixtures/morphemeRetirementDatabase.cjs');
const filename='supabase/migrations/20261113195500_dictionary_one_shot_cleanup_retired.sql';

test('retire one-shot cleanup RPCs without deleting Review work or replay-blocking receipts',async()=>{
 const pg=await database();
 try{
  const snapshot=await sql(pg,'select preview_dictionary_review_cleanup() v');
  assert.deepEqual(snapshot,{reviews:[],imports:[]});
  const operation=id(930001);
  const receipt=await sql(pg,'select clear_dictionary_pending_reviews($1,$2) v',[JSON.stringify(snapshot),operation]);
  assert.equal(receipt.reviews_cleared,0);
  const before=await sql(pg,"select count(*)::int v from dictionary_import_operations where request->>'maintenance'='review_cleanup'");
  assert.equal(before,1);

  await pg.exec('reset role');
  await pg.exec(fs.readFileSync(filename,'utf8'));
  assert.equal(await sql(pg,"select to_regprocedure('public.clear_dictionary_pending_reviews(jsonb,uuid)')::text v"),null);
  assert.equal(await sql(pg,"select to_regprocedure('public.preview_dictionary_review_cleanup()')::text v"),null);
  await pg.exec('set role authenticated');

  assert.equal(await sql(pg,"select count(*)::int v from dictionary_import_operations where request->>'maintenance'='review_cleanup'"),before);
  assert.deepEqual(await sql(pg,'select stage_dictionary_import_reviews($1) v',[JSON.stringify([])]),[]);
  assert.equal(await sql(pg,'select count(*)::int v from dictionary_review_drafts'),0);
 });
 finally{await pg.close();}
});
