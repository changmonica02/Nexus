require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{PGlite}=require('@electric-sql/pglite');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('content RPC removes only requested draft item, audits atomically, rejects revisions, ownership, Published and non-admin',async()=>{
 const pg=new PGlite();try{
 await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,anon;`);
 for(const f of ['20260922_study_fsrs.sql','20260930_public_dictionary.sql','20261011_dictionary_delete_draft_content.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 await pg.query('insert into auth.users values($1),($2)',[id(1),id(2)]);await pg.query('insert into dictionary_admins(user_id) values($1)',[id(1)]);await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
 await pg.query("insert into dictionary_sources(id,citation,license,raw_text) values($1,'test','test','raw')",[id(3)]);
 for(const n of [10,11]){await pg.query("insert into dictionary_entries(id,kind,headword,source_id) values($1,'root','root',$2)",[id(n),id(3)]);await pg.query("insert into dictionary_senses(entry_id,gloss_zh_tw,source_id) values($1,'sense',$2)",[id(n),id(3)]);}
 await pg.query("insert into dictionary_etymologies(id,entry_id,body,source_id) values($1,$2,'history',$3)",[id(20),id(10),id(3)]);
 for(const [n,kind]of [[21,'learning_decomposition'],[22,'mnemonic_scenario'],[23,'mnemonic_scenario']])await pg.query('insert into dictionary_learning_notes(id,entry_id,body,kind,source_id) values($1,$2,$3,$4,$5)',[id(n),id(10),'note',kind,id(3)]);
 const del=(n,rev=1,entry=10,table=n===20?'dictionary_etymologies':'dictionary_learning_notes')=>pg.query('select delete_dictionary_draft_content($1,$2,$3,$4,1) as revision',[id(entry),table,id(n),rev]);
 await assert.rejects(del(20,99),/Revision/);await assert.rejects(del(20,1,11),/not found/);await assert.rejects(del(20,1,10,'dictionary_entries'),/Invalid/);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);await assert.rejects(del(20),/admin/);await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
 await pg.exec(`reset role;create function fail_content_audit() returns trigger language plpgsql as $$begin if new.operation='DELETE' then raise exception 'audit failed';end if;return new;end$$;create trigger fail_audit before insert on dictionary_audit for each row execute function fail_content_audit();set role authenticated;`);
 await assert.rejects(del(20),/audit failed/);assert.equal((await pg.query('select * from dictionary_etymologies')).rows.length,1);await pg.exec('reset role;drop trigger fail_audit on dictionary_audit;set role authenticated');
 assert.equal((await del(20)).rows[0].revision,2);assert.equal((await del(21,2)).rows[0].revision,3);assert.equal((await del(22,3)).rows[0].revision,4);
 assert.equal((await pg.query('select * from dictionary_learning_notes')).rows.length,1);assert.equal((await pg.query('select * from dictionary_senses')).rows.length,2);assert.equal((await pg.query("select * from dictionary_audit where operation='DELETE'")).rows.length,3);
 await pg.query('select publish_dictionary_entry($1)',[id(10)]);await assert.rejects(del(23,5),/Published/);await pg.exec('reset role;set role anon');await assert.rejects(del(23,5),/permission/);
 }finally{await pg.close();}
});
