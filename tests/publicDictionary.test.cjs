require('./loadStudy.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const { getDictionaryEntry, publishDictionaryEntry, saveDictionaryDraft } = require('../src/features/dictionary/dictionary.ts');
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

test('public dictionary: UUID authority, draft isolation, publishing, provenance, relations and Study isolation', async () => {
  const pg = new PGlite();
  try {
    await pg.exec(`create schema auth; create role authenticated; create role anon;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to authenticated,anon;`);
    await pg.exec(fs.readFileSync('supabase/migrations/20260922_study_fsrs.sql','utf8'));
    // Legacy encyclopedia remains private and untouched.
    await pg.exec(fs.readFileSync('supabase/migrations/20260928_etymology_catalog.sql','utf8'));
    await pg.exec(fs.readFileSync('supabase/migrations/20260930_public_dictionary.sql','utf8'));
    await pg.query('insert into auth.users values($1),($2)',[uuid(1),uuid(2)]);
    const card={id:'personal',owner_id:uuid(2),front:'my English',back:'我的中文'};
    await pg.query('insert into study_cards values($1,$2,$3)',[uuid(2),card.id,card]);
    await pg.query("insert into etymology_sources values($1,'private','private.md','private raw',$2,'{}',now())",[uuid(1),'a'.repeat(64)]);
    await pg.exec('set role authenticated');
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[uuid(1)]);
    assert.equal((await pg.query('select is_dictionary_admin() as value')).rows[0].value,false);
    await assert.rejects(pg.query('insert into dictionary_admins(user_id) values($1)',[uuid(1)]),/permission denied/);
    await pg.exec('reset role');
    await pg.query('insert into dictionary_admins(user_id) values($1)',[uuid(1)]);
    await pg.exec('set role authenticated');
    const raw='Original licensed test fixture, not real etymology.';
    await pg.query("insert into dictionary_sources(id,citation,license,raw_text) values($1,'Test fixture','test-only',$2)",[uuid(10),raw]);
    assert.equal((await pg.query('select sha256 from dictionary_sources')).rows[0].sha256,createHash('sha256').update(raw).digest('hex'));
    for(const [id,kind,headword] of [[20,'root','test-root'],[21,'prefix','test-prefix'],[22,'word','same'],[23,'word','same']]) {
      await pg.query('insert into dictionary_entries(id,kind,headword,source_id) values($1,$2,$3,$4)',[uuid(id),kind,headword,uuid(10)]);
    }
    await assert.rejects(pg.query("insert into dictionary_senses(id,entry_id,gloss_zh_tw,source_id) values($1,$2,'無詞性',$3)",[uuid(30),uuid(22),uuid(10)]),/part of speech/);
    for(const [id,entry,pos,gloss] of [[30,20,null,'根'],[31,21,null,'首'],[32,22,'noun','名詞義'],[33,22,'verb','動詞義'],[34,23,'noun','同形異義']]) {
      await pg.query('insert into dictionary_senses(id,entry_id,part_of_speech,gloss_zh_tw,source_id) values($1,$2,$3,$4,$5)',[uuid(id),uuid(entry),pos,gloss,uuid(10)]);
    }
    await assert.rejects(pg.query("insert into dictionary_etymologies(entry_id,sense_id,body,source_id) values($1,$2,'wrong sense',$3)",[uuid(22),uuid(34),uuid(10)]),/foreign key/);
    await assert.rejects(pg.query("insert into dictionary_etymologies(entry_id,body,source_id,verification) values($1,'test',$2,'verified')",[uuid(22),uuid(10)]),/check constraint/);
    await assert.rejects(pg.query("insert into dictionary_etymologies(entry_id,body,source_id,verification) values($1,'test',$2,'invented')",[uuid(22),uuid(10)]),/check constraint/);
    await pg.query("insert into dictionary_etymologies(entry_id,sense_id,body,source_id) values($1,$2,'Unverified historical claim',$3)",[uuid(22),uuid(32),uuid(10)]);
    await pg.query("insert into dictionary_learning_notes(entry_id,sense_id,kind,body,source_id) values($1,$2,'mnemonic_scenario','Memory only',$3)",[uuid(22),uuid(32),uuid(10)]);
    await pg.query("insert into dictionary_learning_notes(entry_id,sense_id,kind,body,source_id) values($1,$2,'mnemonic_scenario','SECRET DRAFT',$3)",[uuid(23),uuid(34),uuid(10)]);
    await pg.query("insert into dictionary_relations(entry_id,sense_id,target_entry_id,target_sense_id,relation_kind,source_id) values($1,$2,$3,$4,'learning_decomposition',$5)",[uuid(22),uuid(32),uuid(20),uuid(30),uuid(10)]);
    const rpcClient={rpc:async(name,args)=>{
      try { return {data:(await pg.query(`select ${name}($1) as value`,[args.entry_uuid])).rows[0].value,error:null}; }
      catch(error){return {data:null,error:{message:error.message}};}
    }};
    await assert.rejects(publishDictionaryEntry(rpcClient,uuid(22)),/published first/);
    await publishDictionaryEntry(rpcClient,uuid(20));
    await publishDictionaryEntry(rpcClient,uuid(22));
    await pg.exec('reset role');
    await assert.rejects(pg.query('insert into study_card_dictionary_links values($1,$2,$3)',[uuid(2),'personal',uuid(20)]),/published word/);
    await assert.rejects(pg.query('insert into study_card_dictionary_links values($1,$2,$3)',[uuid(2),'personal',uuid(23)]),/published word/);
    await assert.rejects(pg.query('insert into study_card_dictionary_links values($1,$2,$3)',[uuid(1),'personal',uuid(22)]),/foreign key/);
    await pg.query('insert into study_card_dictionary_links values($1,$2,$3)',[uuid(2),'personal',uuid(22)]);
    await pg.exec('set role authenticated');
    assert.equal((await pg.query('select * from study_card_dictionary_links')).rows.length,0);
    assert.equal((await getDictionaryEntry(rpcClient,uuid(22))).senses.length,2);
    await assert.rejects(pg.query("update dictionary_senses set gloss_zh_tw='leak' where id=$1",[uuid(32)]),/await A3/);
    await assert.rejects(pg.query("update dictionary_entries set status='draft' where id=$1",[uuid(22)]),/await A3/);
    await assert.rejects(pg.query("update dictionary_sources set raw_text='rewritten' where id=$1",[uuid(10)]),/immutable/);
    assert.ok((await pg.query('select * from dictionary_audit')).rows.length>10);
    await assert.rejects(pg.query('delete from dictionary_audit'),/permission denied/);
    await assert.rejects(pg.query('delete from dictionary_entries'),/permission denied/);
    await pg.query("update dictionary_entries set headword='changed draft' where id=$1",[uuid(23)]);
    assert.equal((await pg.query('select revision from dictionary_entries where id=$1',[uuid(23)])).rows[0].revision,2);
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[uuid(2)]);
    // Editable metadata does not confer an admin role.
    await pg.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:uuid(2),user_metadata:{admin:true,email:'admin@example.test'}})]);
    assert.equal((await pg.query('select is_dictionary_admin() as value')).rows[0].value,false);
    assert.equal(await getDictionaryEntry(rpcClient,uuid(23)),null);
    assert.equal((await pg.query('select * from dictionary_entries')).rows.length,2);
    assert.equal((await pg.query('select * from dictionary_senses')).rows.length,3);
    assert.equal((await pg.query('select * from dictionary_sources')).rows.length,0);
    assert.equal((await pg.query('select * from dictionary_learning_notes')).rows.length,1);
    assert.equal((await pg.query('select * from study_card_dictionary_links')).rows.length,1);
    await assert.rejects(pg.query('insert into study_card_dictionary_links values($1,$2,$3)',[uuid(2),'personal',uuid(22)]),/permission denied/);
    assert.equal((await pg.query('select * from dictionary_audit')).rows.length,0);
    assert.equal((await pg.query('select * from etymology_sources')).rows.length,0);
    await assert.rejects(publishDictionaryEntry(rpcClient,uuid(23)),/admin required/);
    await assert.rejects(pg.query("insert into dictionary_entries(kind,headword,source_id) values('word','injected',$1)",[uuid(10)]),/row-level security/);
    assert.equal((await pg.query("update dictionary_entries set headword='injected' returning id")).rows.length,0);
    const detail=await getDictionaryEntry(rpcClient,uuid(22));
    assert.equal(detail.etymologies[0].verification,'unverified');
    assert.equal(detail.learning_notes[0].kind,'mnemonic_scenario');
    assert.equal(detail.relations[0].target_sense_id,uuid(30));
    assert.deepEqual((await pg.query('select payload from study_cards')).rows[0].payload,card);
    assert.equal((await pg.query('select * from study_review_events')).rows.length,0);
    await pg.exec('reset role;set role anon');
    await assert.rejects(pg.query('select * from dictionary_entries'),/permission denied/);
    await assert.rejects(getDictionaryEntry(rpcClient,uuid(22)),/permission denied/);
    await pg.exec('reset role');
    await pg.query('delete from dictionary_admins where user_id=$1',[uuid(1)]);
    await pg.exec('set role authenticated');
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[uuid(1)]);
    assert.equal((await pg.query('select is_dictionary_admin() as value')).rows[0].value,false);
  } finally { await pg.close(); }
});

test('dictionary writes use canonical RPC and propagate authorization errors',async()=>{
 const calls=[],client={rpc:async(name,args)=>{calls.push({name,args});return {data:{},error:null};}};
 const row={id:uuid(1),kind:'word',headword:'draft'};
 await saveDictionaryDraft(client,'dictionary_entries',row);
 assert.equal(calls[0].name,'apply_dictionary_drafts');assert.equal(calls[0].args.drafts[0].bundle.dictionary_entries[0].status,undefined);
 await assert.rejects(saveDictionaryDraft({rpc:async()=>({error:{message:'denied'}})},'dictionary_entries',row),/denied/);
});
