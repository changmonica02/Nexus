require('./loadStudy.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {draftsFromBundle,mapDictionaryDraft,validateDictionaryDraft}=require('../src/features/dictionary/draftPipeline.ts');
const {reviewSnapshot}=require('../src/features/dictionary/revisionLifecycle.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const schema=fs.readFileSync('supabase/migrations/20261114172000_dictionary_public_notes.sql','utf8');
const patch=fs.readFileSync('supabase/migrations/20261114173000_dictionary_public_notes_draft_review.sql','utf8');

test('public notes are independent Word records; stable IDs and revision checks survive editing',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec(`create role anon; create role authenticated;
   create function public.is_dictionary_admin() returns boolean language sql stable as $$select true$$;
   create table public.dictionary_entries(id uuid primary key,kind text not null,status text not null);`);
  await pg.exec(schema.slice(0,schema.indexOf('do $patch$'))+'commit;');
  await pg.exec(patch.slice(0,patch.indexOf('do $patch$'))+'commit;');
  await pg.query('insert into public.dictionary_entries(id,kind,status) values($1,$2,$3),($4,$5,$6)',[id(1),'word','draft',id(2),'root','draft']);
  const act=(entry,rows,replace=true,edit=true)=>pg.query('select public.dictionary_apply_public_notes($1,$2,$3) changed',[entry,JSON.stringify({public_notes:rows,replace_editor_children:replace}),edit]);
  const first={id:id(3),entry_id:id(1),body:'**公共筆記**'};
  assert.equal((await act(id(1),[first])).rows[0].changed,true);
  assert.equal((await act(id(1),[first])).rows[0].changed,false);
  await assert.rejects(act(id(2),[{...first,id:id(4),entry_id:id(2)}]),/Word draft/i);
  await assert.rejects(act(id(1),[{...first,body:'新版本'}]),/revision conflict/i);
  assert.equal((await act(id(1),[{...first,revision:1,body:'新版本'}])).rows[0].changed,true);
  await assert.rejects(act(id(1),[{...first,id:id(4)}]),/stable ID/i);
  assert.equal((await act(id(1),[])).rows[0].changed,true);
  assert.equal((await pg.query('select count(*)::int n from public.dictionary_public_notes')).rows[0].n,0);
 }finally{await pg.close();}
});
test('public note draft and Review candidates preserve identity and do not reparent legacy mnemonic',()=>{
 const row={id:id(3),entry_id:id(1),body:'公共筆記',revision:2};
 const bundle={dictionary_entries:[{id:id(1),kind:'word',headword:'example'}],dictionary_senses:[{id:id(2),entry_id:id(1),part_of_speech:'noun',gloss_zh_tw:'例子'}],dictionary_public_notes:[row],dictionary_learning_notes:[{id:id(4),entry_id:id(1),sense_id:id(2),kind:'core_concept',body:'既有記憶法'}]};
 const draft=draftsFromBundle(bundle)[0];
 assert.deepEqual(validateDictionaryDraft([draft]),[]);
 assert.equal(mapDictionaryDraft(draft).public_notes[0].id,id(3));
 assert.equal(draft.learning_notes[0].sense_id,id(2));
 const review={revision:5,base_snapshot:{detail:{entry:{id:id(1),kind:'word'}},metadata:null},candidate:{bundle:{dictionary_entries:[{id:id(1),kind:'word'}],dictionary_senses:bundle.dictionary_senses,dictionary_relations:[],dictionary_etymologies:[],dictionary_learning_notes:bundle.dictionary_learning_notes},public_notes:[row],derivations:[],examples:[],annotations:[],inflections:[],pronunciations:[]}};
 const reloaded=reviewSnapshot(review);
 assert.equal(reloaded.detail.public_notes[0].body,'公共筆記');
 assert.equal(reloaded.detail.learning_notes[0].sense_id,id(2));
});
test('public-note migrations only add isolated records and preserve old Review functions',()=>{
 assert.doesNotMatch(schema+patch,/\bdrop\s+(?:table|column)\b|\btruncate\b|\bcascade\b/i);
 assert.match(patch,/dictionary_apply_public_notes/);
 assert.match(patch,/dictionary_materialize_review/);
 assert.match(patch,/dictionary_snapshot_candidate/);
 assert.match(patch,/Public note revision conflict/);
});
