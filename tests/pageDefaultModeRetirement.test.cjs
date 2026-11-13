require('./loadStudy.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {database,sql,id}=require('./fixtures/retirementDatabase.cjs');

const migration=fs.readFileSync('supabase/migrations/20261113193000_pages_default_mode_retired.sql','utf8');

test('Page default_mode retirement preserves legacy operation receipts, Page content and new writes',async()=>{
 const pg=await database();
 try{
  const original={
   id:id(991),entity_type:'pages',entity_id:'old-note',kind:'save',expected_revision:0,
   value:{id:'old-note',title:'Original',kind:'note',content_json:{type:'doc'},content_text:'text',
    default_mode:'note',device_id:'device',created_at:1,deleted_at:null}
  };
  const first=await sql(pg,'select apply_workspace_operations($1) v',[JSON.stringify([original])]);
  assert.equal(first[0].revision,1);
  assert.equal((await sql(pg,"select default_mode v from pages where id='old-note'")),'note');
  const receipt=await sql(pg,'select fingerprint v from workspace_operation_receipts where id=$1',[id(991)]);
  const pagesBefore=await sql(pg,'select count(*)::int v from pages');

  await pg.exec('reset role');
  await pg.exec(migration);
  const remaining=await sql(pg,"select count(*)::int v from information_schema.columns where table_schema='public' and table_name='pages' and column_name='default_mode'");
  assert.equal(remaining,0);
  assert.equal(await sql(pg,'select count(*)::int v from pages'),pagesBefore);
  const refs=await sql(pg,"select count(*)::int v from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and pg_get_functiondef(p.oid) ilike '%default_mode%'");
  assert.equal(refs,0);
  await pg.exec('set role authenticated');

  // An unacknowledged pre-upgrade operation remains idempotent with the SAME bytes.
  const replay=await sql(pg,'select apply_workspace_operations($1) v',[JSON.stringify([original])]);
  assert.equal(replay[0].revision,first[0].revision);
  assert.equal(await sql(pg,'select fingerprint v from workspace_operation_receipts where id=$1',[id(991)]),receipt);
  await assert.rejects(sql(pg,'select apply_workspace_operations($1) v',[JSON.stringify([{...original,value:{...original.value,title:'changed'}}])]),/payload conflict/i);

  // An old client may still send the retired key; it is not persisted or projected.
  const second={...original,id:id(992),expected_revision:1,value:{...original.value,title:'Current',default_mode:'note'}};
  const saved=await sql(pg,'select apply_workspace_operations($1) v',[JSON.stringify([second])]);
  assert.equal(saved[0].revision,2);
  assert.equal(saved[0].row.title,'Current');
  assert.equal(Object.hasOwn(saved[0].row,'default_mode'),false);
  assert.equal((await sql(pg,"select title v from pages where id='old-note'")),'Current');
 }finally{await pg.close();}
});
