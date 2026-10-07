require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {deleteDictionaryDrafts}=require('../src/features/dictionary/deleteDrafts.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('batch UI preflight rejects Published, cancellation sends nothing, success and failure are explicit',async()=>{
 let calls=0;const client={rpc:async()=>{calls++;return {data:1,error:null};}},draft={id:id(10),revision:1,status:'draft',headword:'Draft'};
 await assert.rejects(deleteDictionaryDrafts(client,[draft,{...draft,status:'published',headword:'Published word'}],()=>true),/Published word/);assert.equal(calls,0);
 assert.equal(await deleteDictionaryDrafts(client,[draft],()=>false),null);assert.equal(calls,0);
 assert.equal(await deleteDictionaryDrafts(client,[draft],()=>true),1);
 await assert.rejects(deleteDictionaryDrafts({rpc:async()=>({error:{message:'referenced'}})},[draft],()=>true),/referenced/);
});
test('batch RPC enforces admin, Published/revision/reference guards, atomic rollback and draft-only content removal',async()=>{
 const pg=new PGlite();try{
 await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,anon;`);
 for(const f of ['20260922_study_fsrs.sql','20260930_public_dictionary.sql','20261010_dictionary_delete_drafts.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 await pg.query('insert into auth.users values($1),($2)',[id(1),id(2)]);await pg.query('insert into dictionary_admins(user_id) values($1)',[id(1)]);
 await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
 await pg.query("insert into dictionary_sources(id,citation,license,raw_text) values($1,'test','test','raw')",[id(3)]);
 for(const n of [10,11,12]){await pg.query("insert into dictionary_entries(id,kind,headword,source_id) values($1,$2,$3,$4)",[id(n),n===11?'word':'root','entry'+n,id(3)]);await pg.query("insert into dictionary_senses(id,entry_id,part_of_speech,gloss_zh_tw,source_id) values($1,$2,'noun','test',$3)",[id(n+100),id(n),id(3)]);}
 await pg.query("insert into dictionary_relations(entry_id,sense_id,target_entry_id,target_sense_id,relation_kind,source_id) values($1,$2,$3,$4,'learning_decomposition',$5)",[id(11),id(111),id(10),id(110),id(3)]);
 await pg.query('select publish_dictionary_entry($1)',[id(12)]);
 const del=(ns,revision=1)=>pg.query('select delete_dictionary_drafts($1::jsonb)',[JSON.stringify(ns.map(n=>({id:id(n),revision})))]);
 await assert.rejects(del([10,12]),/Published.*entry12/);await assert.rejects(del([10],99),/Revision conflict/);await assert.rejects(del([10]),/referenced/);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);await assert.rejects(del([11]),/admin/);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
 await pg.exec(`reset role;create function fail_delete_audit() returns trigger language plpgsql as $$begin if new.operation='DELETE' then raise exception 'audit failed';end if;return new;end$$;create trigger fail_delete before insert on dictionary_audit for each row execute function fail_delete_audit();set role authenticated;`);
 await assert.rejects(del([10,11]),/audit failed/);assert.equal((await pg.query('select * from dictionary_relations')).rows.length,1);assert.equal((await pg.query('select * from dictionary_entries')).rows.length,3);
 await pg.exec('reset role;drop trigger fail_delete on dictionary_audit;set role authenticated');await del([10,11]);
 assert.equal((await pg.query('select * from dictionary_entries')).rows.length,1);assert.equal((await pg.query('select * from dictionary_senses')).rows.length,1);assert.equal((await pg.query('select * from dictionary_sources')).rows.length,1);assert.equal((await pg.query("select * from dictionary_audit where operation='DELETE'")).rows.length,5);
 await pg.exec('reset role;set role anon');await assert.rejects(del([12]),/permission/);
 }finally{await pg.close();}
});
