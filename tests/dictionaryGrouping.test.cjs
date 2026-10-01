require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {primaryCategories}=require('../src/features/dictionary/grouping.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('grouped drafts: atomic save, technical revisions, RLS, immutable published groups and paginated category search',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth,public to authenticated,anon;`);
  for(const file of ['20260922_study_fsrs.sql','20260930_public_dictionary.sql','20261001_dictionary_admin.sql','20261005_dictionary_grouping.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
  await pg.query('insert into auth.users values($1),($2)',[id(1),id(2)]);await pg.query('insert into dictionary_admins(user_id) values($1)',[id(1)]);
  await pg.exec('set role authenticated');
  const owner=async n=>pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);await owner(1);
  const grouping={primary_category:primaryCategories[0],tags:['位置','空間'],variant_group:'cap/cept/cip'};
  const bundle={dictionary_sources:[{id:id(3),citation:'self authored test',license:'test only',raw_text:'test'}],dictionary_entries:[{id:id(10),kind:'root',headword:'cap',source_id:id(3)}],dictionary_senses:[{id:id(11),entry_id:id(10),gloss_zh_tw:'自建測試',source_id:id(3)}]};
  const save=(b,g)=>pg.query('select save_dictionary_grouped_draft($1,$2)',[b,g]);
  await assert.rejects(save(bundle,{...grouping,primary_category:'invalid'}),/check constraint/);
  assert.equal((await pg.query('select * from dictionary_entries')).rows.length,0);
  assert.equal((await pg.query('select * from dictionary_sources')).rows.length,0);
  assert.equal((await pg.query('select * from dictionary_audit')).rows.length,0);
  await save(bundle,grouping);
  assert.equal((await pg.query('select revision from dictionary_entries')).rows[0].revision,1);
  assert.equal((await pg.query('select * from dictionary_entry_groups')).rows[0].variant_group,'cap/cept/cip');
  assert.equal((await pg.query("select * from dictionary_audit where table_name='dictionary_entry_groups'")).rows.length,1);
  const update=structuredClone(bundle);update.dictionary_entries[0].revision=1;
  await save(update,{...grouping,tags:['新標籤']});
  assert.equal((await pg.query('select revision from dictionary_entries')).rows[0].revision,2);
  await assert.rejects(save(update,grouping),/Revision conflict/);
  // Entry + content + grouping changes must advance the entry exactly once.
  update.dictionary_entries[0].revision=2;
  update.dictionary_entries[0].headword='cept';
  update.dictionary_senses[0].revision=1;
  update.dictionary_senses[0].gloss_zh_tw='更新測試';
  const auditBefore=(await pg.query("select * from dictionary_audit where table_name='dictionary_entries'")).rows.length;
  await save(update,{...grouping,tags:['更新']});
  assert.equal((await pg.query('select revision from dictionary_entries')).rows[0].revision,3);
  assert.equal((await pg.query("select * from dictionary_audit where table_name='dictionary_entries'")).rows.length,auditBefore+1);
  await assert.rejects(save(update,grouping),/Revision conflict/);
  // Failure after the bundle update rolls back entry, content and grouping together.
  update.dictionary_entries[0].revision=3;
  update.dictionary_entries[0].headword='must rollback';
  update.dictionary_senses[0].revision=2;
  update.dictionary_senses[0].gloss_zh_tw='must rollback';
  await assert.rejects(save(update,{...grouping,primary_category:'invalid'}),/check constraint/);
  assert.equal((await pg.query('select revision,headword from dictionary_entries')).rows[0].revision,3);
  assert.equal((await pg.query('select headword from dictionary_entries')).rows[0].headword,'cept');
  assert.equal((await pg.query('select gloss_zh_tw from dictionary_senses')).rows[0].gloss_zh_tw,'更新測試');
  assert.deepEqual((await pg.query('select tags from dictionary_entry_groups')).rows[0].tags,['更新']);
  update.dictionary_entries[0].headword='cept';
  update.dictionary_senses[0].gloss_zh_tw='更新測試';

  await assert.rejects(pg.query("update dictionary_entry_groups set tags='{}'"),/permission denied/);
  await owner(2);
  assert.equal((await pg.query('select * from dictionary_entry_groups')).rows.length,0);
  await assert.rejects(save(bundle,grouping),/admin required/);
  await owner(1);
  await pg.query('select publish_dictionary_entry($1)',[id(10)]);
  update.dictionary_entries[0].revision=4;
  await assert.rejects(save(update,grouping),/Only prefix\/root drafts/);
  await owner(2);
  assert.equal((await pg.query('select * from dictionary_entry_groups')).rows.length,1);
  const search=async(category,page=0)=> (await pg.query("select search_grouped_dictionary('root','', $1,$2) as result",[page,category])).rows[0].result;
  assert.equal((await search(primaryCategories[0])).items[0].id,id(10));
  assert.equal((await search(primaryCategories[1])).items.length,0);
  await owner(1);
  for(let n=0;n<22;n++){
   const eid=id(100+n),sid=id(200+n);
   await pg.query("insert into dictionary_entries(id,kind,headword,source_id) values($1,'root',$2,$3)",[eid,'test'+n,id(3)]);
   await pg.query("insert into dictionary_senses(id,entry_id,gloss_zh_tw,source_id) values($1,$2,'fixture',$3)",[sid,eid,id(3)]);
   if(n<21)await pg.query('select publish_dictionary_entry($1)',[eid]);
  }
  await owner(2);
  const first=await search('__ungrouped__'),second=await search('__ungrouped__',1);
  assert.equal(first.items.length,20);assert.equal(first.has_more,true);assert.equal(second.items.length,1);assert.equal(second.has_more,false);
  assert.ok(![...first.items,...second.items].some(e=>e.id===id(121)));
  await pg.exec('reset role;set role anon');await assert.rejects(search(primaryCategories[0]),/permission denied/);
 }finally{await pg.close();}
});

test('grouped revision SQL uses an explicit single-advance fallback',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261005_dictionary_grouping.sql','utf8');
 assert.ok(!sql.includes('headword=headword'));
 assert.match(sql,/if previous_revision is not null and saved_revision=previous_revision then/);
 assert.match(sql,/set revision=previous_revision\+1\s+where id=entry_uuid and revision=previous_revision/);
 assert.ok(sql.indexOf('result:=public.apply_dictionary_bundle')<sql.indexOf('if previous_revision is not null and saved_revision'));
 assert.match(sql,/e\.revision is distinct from/);
});
