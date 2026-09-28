require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {withoutSense,deleteDraftSense}=require('../src/features/dictionary/draftEditing.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('unsaved sense removal preserves other form data and refuses in-form references',()=>{
  const form={dictionary_entries:[{id:'entry'}],dictionary_senses:[{id:'a'},{id:'b'}],dictionary_relations:[],dictionary_etymologies:[],dictionary_learning_notes:[]};
  assert.deepEqual(withoutSense(form,'b').dictionary_senses,[{id:'a'}]);assert.equal(form.dictionary_senses.length,2);
  for(const table of ['dictionary_relations','dictionary_etymologies','dictionary_learning_notes'])assert.throws(()=>withoutSense({...form,[table]:[{sense_id:'b'}]},'b'),/引用/);
  assert.throws(()=>withoutSense({...form,dictionary_relations:[{target_sense_id:'b'}]},'b'),/引用/);
});
test('persisted draft sense deletion: admin-only, revision guard, references, publication and transaction rollback',async()=>{
  const pg=new PGlite();try{
    await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated,anon;`);
    for(const f of ['20260922_study_fsrs.sql','20260930_public_dictionary.sql','20261004_dictionary_delete_draft_sense.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
    await pg.query('insert into auth.users values($1),($2)',[id(1),id(2)]);await pg.query('insert into dictionary_admins(user_id) values($1)',[id(1)]);
    await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
    await pg.query("insert into dictionary_sources(id,citation,license,raw_text) values($1,'fixture','test','raw')",[id(3)]);
    for(const [n,kind]of [[10,'root'],[11,'word']])await pg.query("insert into dictionary_entries(id,kind,headword,source_id) values($1,$2,'test',$3)",[id(n),kind,id(3)]);
    for(const [n,entry]of [[20,10],[21,10],[22,11],[23,10]])await pg.query("insert into dictionary_senses(id,entry_id,part_of_speech,gloss_zh_tw,source_id) values($1,$2,'noun','fixture',$3)",[id(n),id(entry),id(3)]);
    await pg.query("insert into dictionary_relations(entry_id,sense_id,target_entry_id,target_sense_id,relation_kind,source_id) values($1,$2,$3,$4,'learning_decomposition',$5)",[id(11),id(22),id(10),id(20),id(3)]);
    const client={rpc:async(_name,p)=>{try{return {data:(await pg.query('select delete_dictionary_draft_sense($1,$2,$3,$4) as revision',[p.entry_uuid,p.sense_uuid,p.expected_entry_revision,p.expected_sense_revision])).rows[0].revision,error:null};}catch(error){return{data:null,error};}}};
    await assert.rejects(deleteDraftSense(client,id(10),id(20),1,1),/引用/);
    await assert.rejects(deleteDraftSense(client,id(11),id(22),1,1),/引用/);
    await assert.rejects(deleteDraftSense(client,id(10),id(21),9,1),/修改/);
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);
    await assert.rejects(deleteDraftSense(client,id(10),id(21),1,1),/未能/);
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
    await pg.exec(`reset role;create function fail_sense_audit() returns trigger language plpgsql as $$begin if new.operation='DELETE' then raise exception 'injected audit failure';end if;return new;end$$;
      create trigger fail_audit before insert on dictionary_audit for each row execute function fail_sense_audit();set role authenticated;`);
    await assert.rejects(deleteDraftSense(client,id(10),id(21),1,1),/未能/);
    assert.equal((await pg.query('select * from dictionary_senses where id=$1',[id(21)])).rows.length,1);
    await pg.exec('reset role;drop trigger fail_audit on dictionary_audit;set role authenticated');
    assert.equal(await deleteDraftSense(client,id(10),id(21),1,1),2);
    assert.equal((await pg.query('select * from dictionary_senses where id=$1',[id(21)])).rows.length,0);
    assert.equal((await pg.query('select * from dictionary_entries')).rows.length,2);
    assert.equal((await pg.query('select * from dictionary_senses')).rows.length,3);
    assert.equal((await pg.query('select * from dictionary_relations')).rows.length,1);
    assert.equal((await pg.query("select * from dictionary_audit where operation='DELETE'")).rows.length,1);
    await pg.query('select publish_dictionary_entry($1)',[id(10)]);
    await assert.rejects(deleteDraftSense(client,id(10),id(23),3,1),/已發布/);
    await pg.exec('reset role;set role anon');await assert.rejects(deleteDraftSense(client,id(10),id(23),3,1),/未能/);
  }finally{await pg.close();}
});
