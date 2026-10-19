require('./loadStudy.cjs');
require('fake-indexeddb/auto');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const { openDB, deleteDB } = require('idb');
const { clearAccountCache } = require('../src/infrastructure/storage/clearAccountCache.ts');
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';

test('account deletion: confirmation, permissions, cascades, rollback and stale JWT protection', async () => {
  const pg = new PGlite();
  try {
    await pg.exec(`create schema auth; create role authenticated; create role anon;
      create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to authenticated,anon;
      create table pages(id text primary key,owner_id uuid);
      create table attachments(id text primary key,owner_id uuid);
      create table binaries(id text primary key,owner_id uuid);`);
    for (const file of ['20260922_study_fsrs.sql','20260925_study_quiz_persistence.sql','20260928_etymology_catalog.sql','20260929_account_deletion.sql']) {
      await pg.exec(fs.readFileSync(`supabase/migrations/${file}`,'utf8'));
    }
    for (const id of [owner,other]) {
      await pg.query('insert into auth.users values($1,$2)',[id,`${id}@example.com`]);
      for(const table of ['pages','attachments','binaries']) await pg.query(`insert into ${table} values($1,$2)`,[id,id]);
      await pg.query('insert into study_cards values($1,$2,$3)',[id,'card',{id:'card',owner_id:id}]);
      await pg.query('insert into study_card_states values($1,$2,$3)',[id,'card',{}]);
      await pg.query('insert into study_review_events values($1,$2,$3,$4)',[id,'review','card',{}]);
      await pg.query('insert into study_deck_settings values($1,$2,$3)',[id,'deck',{}]);
      await pg.query('insert into study_card_quiz_states(owner_id,card_id) values($1,$2)',[id,'card']);
      await pg.query('insert into study_quiz_attempt_receipts(owner_id,event_id,card_id,correct,answered_at,batch_id,local_sequence,applied_revision) values($1,$2,$3,false,1,$4,1,1)',[id,'attempt','card','batch']);
      const fixture = require('./etymologyFixture.cjs')();
      for(const [name,rows] of Object.entries(fixture)) for(const row of rows) {
        const record={owner_id:id,...row};
        // This migration test intentionally uses the legacy 2026-09-29 schema.
        // The shared modern import fixture also carries a later data_source field.
        delete record.data_source;
        if (name === 'word_senses' || name === 'claims') record.verification = 'unverified';
        const keys=Object.keys(record);
        await pg.query(`insert into etymology_${name} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(record));
      }
    }
    await pg.exec('set role anon');
    await assert.rejects(pg.query("select delete_own_account('x','刪除帳號')"),/permission denied/);
    await pg.exec('reset role; set role authenticated');
    await assert.rejects(pg.query("select delete_own_account('x','刪除帳號')"),/Authentication required/);
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
    await assert.rejects(pg.query('select delete_own_account($1,$2)',[`${other}@example.com`,'刪除帳號']),/does not match/);
    await assert.rejects(pg.query('select delete_own_account($1,$2)',[`${owner}@example.com`,'wrong']),/does not match/);
    await pg.exec(`reset role; create function public.block_delete() returns trigger language plpgsql as $$ begin raise exception 'injected failure'; end $$;
      create trigger block_delete before delete on study_cards for each row execute function public.block_delete(); set role authenticated;`);
    await assert.rejects(pg.query('select delete_own_account($1,$2)',[`${owner}@example.com`,'刪除帳號']),/injected failure/);
    await pg.exec('reset role');
    assert.equal((await pg.query('select * from auth.users')).rows.length,2);
    assert.equal((await pg.query('select * from pages')).rows.length,2);
    assert.equal((await pg.query('select * from study_review_events')).rows.length,2);
    await pg.exec('drop trigger block_delete on study_cards; set role authenticated');
    await pg.query('select delete_own_account($1,$2)',[`${owner}@example.com`,'刪除帳號']);
    await assert.rejects(pg.query('select delete_own_account($1,$2)',[`${owner}@example.com`,'刪除帳號']),/no longer exists/);
    await pg.exec('reset role');
    assert.deepEqual((await pg.query('select id from auth.users')).rows,[{id:other}]);
    const tables = (await pg.query("select table_name from information_schema.columns where table_schema='public' and column_name='owner_id'")).rows;
    for(const {table_name} of tables) assert.equal((await pg.query(`select * from ${table_name} where owner_id=$1`,[owner])).rows.length,0,table_name);
    assert.equal((await pg.query('select * from study_review_events')).rows.length,1);
    await assert.rejects(pg.query('insert into study_cards values($1,$2,$3)',[owner,'recreated',{}]),/foreign key/);
  } finally { await pg.close(); }
});

test('local account cleanup removes own offline records and binaries, preserves other accounts', async () => {
  await deleteDB('nexus');
  const db=await openDB('nexus',6,{upgrade(db){for(const name of ['pages','attachments','binaries','study_outbox','quiz_attempts','settings'])db.createObjectStore(name,{keyPath:'id'});}});
  for(const name of ['pages','attachments']) {
    await db.put(name,{id:'mine',workspace_owner_id:owner});
    await db.put(name,{id:'theirs',workspace_owner_id:other});
  }
  for(const name of ['study_outbox','quiz_attempts']) {
    await db.put(name,{id:'mine',owner_id:owner});
    await db.put(name,{id:'theirs',owner_id:other});
  }
  await db.put('binaries',{id:'mine'});await db.put('binaries',{id:'theirs'});
  await db.put('settings',{id:'theme',value:'dark'});
  await clearAccountCache(owner);
  for(const name of ['pages','attachments','binaries','study_outbox','quiz_attempts']) assert.deepEqual((await db.getAll(name)).map(row=>row.id),['theirs']);
  assert.equal((await db.get('settings','theme')).value,'dark');
  db.close();await deleteDB('nexus');
});
