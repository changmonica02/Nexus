require('./loadStudy.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const schema=fs.readFileSync('supabase/migrations/20261114135000_dictionary_sense_derivations.sql','utf8');
const patch=fs.readFileSync('supabase/migrations/20261114152000_dictionary_sense_extensions_draft_rpc.sql','utf8');

test('B2 atomic helper persists and rereads bilingual examples and Sense derivations',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec(`create role anon;create role authenticated;
   create function public.is_dictionary_admin() returns boolean language sql stable as $$select true$$;
   create table public.dictionary_entries(id uuid primary key,kind text not null,status text not null);
   create table public.dictionary_senses(id uuid primary key,entry_id uuid not null references public.dictionary_entries(id),unique(entry_id,id));
   create table public.dictionary_examples(
    id uuid primary key,entry_id uuid not null references public.dictionary_entries(id),
    sense_id uuid,body text not null,sort_order int not null default 0,
    revision bigint not null default 1,updated_at timestamptz not null default now(),
    foreign key(entry_id,sense_id) references public.dictionary_senses(entry_id,id));
  `);
  await pg.exec(schema);
  // The migration patches full historical RPC definitions separately. Execute
  // its helper in isolation here to cover data and FK behavior deterministically.
  await pg.exec(patch.slice(0,patch.indexOf('do $patch$'))+'commit;');
  await pg.query('insert into public.dictionary_entries(id,kind,status) values($1,$2,$3)',[id(1),'word','draft']);
  await pg.query('insert into public.dictionary_senses(id,entry_id) values($1,$2),($3,$4)',[id(2),id(1),id(3),id(1)]);
  await pg.query('insert into public.dictionary_examples(id,entry_id,sense_id,body) values($1,$2,$3,$4)',[id(4),id(1),id(2),'Original example']);
  const candidate={
   derivations:[{id:id(5),entry_id:id(1),sense_id:id(2),gloss_zh_tw:'衍生意思',sort_order:0}],
   examples:[{id:id(4),entry_id:id(1),sense_id:id(2),translation_zh_tw:'中文翻譯',derivation_id:id(5)}],
   replace_editor_children:true
  };
  const run=(c,edit=true)=>pg.query('select public.dictionary_apply_sense_extensions($1,$2,$3) changed',[id(1),JSON.stringify(c),edit]);
  assert.equal((await run(candidate)).rows[0].changed,true);
  assert.equal((await run(candidate)).rows[0].changed,false);
  const saved=(await pg.query('select body,translation_zh_tw,derivation_id from public.dictionary_examples where id=$1',[id(4)])).rows[0];
  assert.equal(saved.body,'Original example');
  assert.equal(saved.translation_zh_tw,'中文翻譯');
  assert.equal(saved.derivation_id,id(5));
  await assert.rejects(run({...candidate,derivations:[{...candidate.derivations[0],sense_id:id(3)}]}),/ownership immutable/);
  await assert.rejects(run({...candidate,derivations:[]}),/foreign key/i);
  await assert.rejects(run({...candidate,derivations:[{...candidate.derivations[0],gloss_zh_tw:'變更'}]}),/revision conflict/);
  const revision=(await pg.query('select revision from public.dictionary_sense_derivations where id=$1',[id(5)])).rows[0].revision;
  assert.equal((await run({...candidate,derivations:[{...candidate.derivations[0],gloss_zh_tw:'新意思',revision}]})).rows[0].changed,true);
  assert.equal((await run({...candidate,examples:[{...candidate.examples[0],derivation_id:null}],derivations:[]})).rows[0].changed,true);
  assert.equal((await pg.query('select count(*)::int as n from public.dictionary_sense_derivations')).rows[0].n,0);
  assert.equal((await pg.query('select derivation_id from public.dictionary_examples where id=$1',[id(4)])).rows[0].derivation_id,null);
 }finally{await pg.close();}
});
test('B2 draft RPC extension is guarded and preserves legacy paths',()=>{
 assert.match(patch,/pg_get_functiondef\('public.apply_dictionary_drafts/);
 assert.match(patch,/Unexpected Draft RPC/);
 assert.match(patch,/b2_input \? ''derivations''/);
 assert.match(patch,/get_published_dictionary_entry/);
 assert.doesNotMatch(patch,/\bdrop\s+table\b|\btruncate\b|\bcascade\b/i);
});
