require('./loadStudy.cjs');
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs');
const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('./etymologyFixture.cjs');
const {parseCatalog,loadCatalog}=require('../src/features/etymology/catalog.ts');
const owner='11111111-1111-4111-8111-111111111111';

test('etymology migration: FKs, statuses, atomic snapshot, RLS and Study isolation in local PostgreSQL',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec(`create schema auth;create role authenticated;create role anon;
   create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema public,auth to authenticated,anon;`);
  await pg.exec(fs.readFileSync('supabase/migrations/20260922_study_fsrs.sql','utf8'));
  const study={owner_id:owner,id:'untouched-card',front:'unchanged'};
  await pg.query('insert into study_cards(owner_id,id,payload) values($1,$2,$3)',[owner,study.id,study]);
  await pg.exec(fs.readFileSync('supabase/migrations/20260928_etymology_catalog.sql','utf8'));
  const data=fixture();
  for(const [name,rows] of Object.entries(data))for(const row of rows){
   const record={owner_id:owner,...row},keys=Object.keys(record);
   await pg.query(`insert into etymology_${name} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(record));
  }
  await assert.rejects(()=>pg.query('insert into etymology_senses select * from etymology_senses limit 1'),/duplicate key/);
  await assert.rejects(()=>pg.query("update etymology_word_senses set sense_id='sense-root' where sense_id='sense-two'"),/foreign key/);
  await assert.rejects(()=>pg.query("update etymology_claims set verification='invented'"),/check constraint/);
  await assert.rejects(()=>pg.query("update etymology_claims set verification='verified',verification_note=''"),/check constraint/);
  await assert.rejects(()=>pg.query("delete from etymology_entries where id='test-root'"),/foreign key/);
  await pg.exec('set role authenticated');
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  const client={rpc:async name=>{assert.equal(name,'get_etymology_catalog');return{data:(await pg.query('select get_etymology_catalog() as data')).rows[0].data,error:null};}};
  const loaded=await loadCatalog(client);parseCatalog(loaded);
  assert.equal(loaded.entries.length,4);assert.equal(loaded.senses.length,3);assert.equal(loaded.word_senses.length,2);
  assert.equal(loaded.sources[0].raw_markdown,data.sources[0].raw_markdown);
  await assert.rejects(()=>pg.query("update etymology_claims set verification='verified'"),/permission denied/);
  await assert.rejects(()=>pg.query('delete from etymology_sources'),/permission denied/);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)",['22222222-2222-4222-8222-222222222222']);
  const empty=await loadCatalog(client);assert.ok(Object.values(empty).every(rows=>rows.length===0));
  assert.equal((await pg.query('select * from etymology_words')).rows.length,0);
  await pg.exec('reset role;set role anon');
  await assert.rejects(()=>pg.query('select get_etymology_catalog()'),/permission denied/);
  await pg.exec('reset role');
  assert.deepEqual((await pg.query('select payload from study_cards')).rows.map(row=>row.payload),[study]);
  assert.equal((await pg.query('select * from study_review_events')).rows.length,0);
 }finally{await pg.close();}
});
