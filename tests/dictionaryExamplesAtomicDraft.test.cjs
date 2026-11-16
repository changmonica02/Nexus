require('./loadStudy.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const migration=fs.readFileSync('supabase/migrations/20261116140000_dictionary_examples_atomic_draft.sql','utf8');
const schema=fs.readFileSync('supabase/migrations/20261114135000_dictionary_sense_derivations.sql','utf8');
const helper=migration.slice(0,migration.indexOf('do $patch$'))+'commit;';

test('current Word example writer creates, updates and rereads linked bilingual examples',async()=>{
 const pg=new PGlite();
 try {
  await pg.exec(`create role anon;create role authenticated;
   create function public.is_dictionary_admin() returns boolean language sql stable as $$select true$$;
   create table public.dictionary_entries(id uuid primary key,kind text not null,status text not null);
   create table public.dictionary_senses(id uuid primary key,entry_id uuid not null references public.dictionary_entries(id),unique(entry_id,id));
   create table public.dictionary_examples(
    id uuid primary key,entry_id uuid not null references public.dictionary_entries(id),
    sense_id uuid,body text not null,sort_order int not null default 0,
    revision bigint not null default 1,updated_at timestamptz not null default now(),
    foreign key(entry_id,sense_id) references public.dictionary_senses(entry_id,id));`);
  await pg.exec(schema);
  await pg.exec('alter table public.dictionary_examples alter column derivation_id set not null');
  await pg.exec('create unique index dictionary_examples_one_per_derivation on public.dictionary_examples(derivation_id)');
  await pg.exec(helper);
  await pg.query('insert into public.dictionary_entries(id,kind,status) values($1,$2,$3)',[id(1),'word','draft']);
  await pg.query('insert into public.dictionary_senses(id,entry_id) values($1,$2)',[id(2),id(1)]);
  const derivation={id:id(3),entry_id:id(1),sense_id:id(2),gloss_zh_tw:'工作',sort_order:0};
  const example={id:id(4),entry_id:id(1),sense_id:id(2),derivation_id:id(3),
   body:'What is your occupation?',translation_zh_tw:'你的職業是什麼？',sort_order:0};
  const run=(candidate,allowEdits=true)=>pg.query('select public.dictionary_apply_sense_extensions($1,$2,$3) changed',
   [id(1),JSON.stringify(candidate),allowEdits]);
  const candidate={derivations:[derivation],examples:[example],replace_editor_children:true};
  assert.equal((await run(candidate)).rows[0].changed,true);
  assert.equal((await run(candidate)).rows[0].changed,false);
  let saved=(await pg.query('select * from public.dictionary_examples where id=$1',[id(4)])).rows[0];
  assert.equal(saved.derivation_id,id(3));
  assert.equal(saved.body,example.body);
  assert.equal(saved.translation_zh_tw,example.translation_zh_tw);

  await assert.rejects(run({...candidate,examples:[{...example,body:'New text'}]}),/revision conflict/);
  const revised={...example,revision:saved.revision,body:'New example',translation_zh_tw:'新例句'};
  assert.equal((await run({...candidate,examples:[revised]})).rows[0].changed,true);
  saved=(await pg.query('select * from public.dictionary_examples where id=$1',[id(4)])).rows[0];
  assert.equal(saved.body,'New example');
  assert.equal(saved.translation_zh_tw,'新例句');
  assert.equal(Number(saved.revision),2);
  await assert.rejects(run({...candidate,examples:[{...example,id:id(5)}]}),/unique|duplicate/i);
  await assert.rejects(run({...candidate,examples:[{...example,id:id(5),derivation_id:null}]}),/Invalid bilingual Example fields/);
  await assert.rejects(run({...candidate,examples:[{...example,id:id(5),sense_id:id(99)}]}),/same Word and Sense/);
  assert.equal((await pg.query('select count(*)::int n from public.dictionary_examples')).rows[0].n,1);
 }finally{await pg.close();}
});

test('migration bypasses only legacy Example writes for B2 while keeping other Draft children',()=>{
 assert.match(migration,/case when b2_input \? ''derivations'' then/);
 assert.match(migration,/array\[''dictionary_lexical_annotations'',''dictionary_pronunciations''\]/);
 assert.match(migration,/public\.dictionary_apply_sense_extensions/);
 assert.match(migration,/Unexpected Draft RPC layout/);
 assert.doesNotMatch(migration,/\bdrop\s+table\b|\btruncate\b|\bcascade\b/i);
});
