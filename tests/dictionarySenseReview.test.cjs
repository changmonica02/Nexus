require('./loadStudy.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {reviewSnapshot}=require('../src/features/dictionary/revisionLifecycle.ts');
const {draftsFromBundle}=require('../src/features/dictionary/draftPipeline.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const migration=fs.readFileSync('supabase/migrations/20261114162000_dictionary_sense_extensions_review.sql','utf8');

test('B2 Review candidate restores derivation identity and bilingual examples on reload',()=>{
 const base={detail:{entry:{id:id(1),kind:'word',headword:'test',status:'published',revision:7},senses:[{id:id(2),entry_id:id(1),part_of_speech:'noun',gloss_zh_tw:'核心'}],relations:[],etymologies:[],learning_notes:[],examples:[],derivations:[]},metadata:{}};
 const derivation={id:id(3),entry_id:id(1),sense_id:id(2),gloss_zh_tw:'延伸',sort_order:0,revision:4};
 const example={id:id(4),entry_id:id(1),sense_id:id(2),body:'One sentence',translation_zh_tw:'一句話',derivation_id:id(3),sort_order:0};
 const review={id:id(9),entry_id:id(1),revision:2,base_revision:7,base_snapshot:base,candidate:{bundle:{dictionary_entries:[{...base.detail.entry}],dictionary_senses:base.detail.senses,dictionary_relations:[],dictionary_etymologies:[],dictionary_learning_notes:[]},derivations:[derivation],examples:[example],inflections:[],pronunciations:[],annotations:[]}};
 const snapshot=reviewSnapshot(review);
 assert.deepEqual(snapshot.detail.derivations,[derivation]);
 assert.deepEqual(snapshot.detail.examples,[example]);
 const d=draftsFromBundle({dictionary_entries:[snapshot.detail.entry],dictionary_senses:snapshot.detail.senses,dictionary_sense_derivations:snapshot.detail.derivations,dictionary_examples:snapshot.detail.examples});
 assert.equal(d[0].derivations[0].id,id(3));
 assert.equal(d[0].examples[0].translation_zh_tw,'一句話');
 assert.equal(d[0].examples[0].derivation_id,id(3));
});

test('B2 Review SQL patch compiles in PostgreSQL against the established RPC signatures',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec(`
   create table public.dictionary_sense_derivations(id uuid primary key,entry_id uuid,sense_id uuid,sort_order integer,updated_at timestamptz);
   create table public.dictionary_senses(id uuid primary key,entry_id uuid);
   create function public.apply_dictionary_drafts(drafts jsonb,preview boolean,allow_edits boolean)
     returns jsonb language plpgsql as $$begin return '{}'::jsonb;end$$;
   create function public.dictionary_snapshot_candidate(s jsonb) returns jsonb language plpgsql as $$
   begin
     return jsonb_build_object(
  'pronunciations',coalesce(s->'detail'->'pronunciations','[]'::jsonb));
   end $$;
   create function public.dictionary_overlay_candidate(base jsonb,patch jsonb) returns jsonb language plpgsql as $$
   declare k text;
   begin
     foreach k in array array['annotations','inflections','pronunciations'] loop
       null;
     end loop;
     return base;
   end $$;
   create function public.dictionary_materialize_review(eid uuid,c jsonb) returns void language plpgsql as $$
   declare t text; rows jsonb; r jsonb; current_row jsonb; nextrows jsonb;
   begin
     if not(c ? 'inflections') then c:=jsonb_set(c,'{inflections}','[]'::jsonb);end if;
     foreach t in array array['dictionary_inflections','dictionary_pronunciations','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_senses'] loop
       null;
     end loop;
     -- Rebase technical child revisions only after the complete base snapshot was checked.
     foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations','dictionary_inflections'] loop
       null;
     end loop;
     perform public.apply_dictionary_drafts(jsonb_build_array(c),false,true);
   end $$;
  `);
  await pg.exec(migration);
  const rows=(await pg.query(`select proname,pg_get_functiondef(oid) definition from pg_proc where proname in ('dictionary_snapshot_candidate','dictionary_overlay_candidate','dictionary_materialize_review') order by proname`)).rows;
  assert.equal(rows.length,3);
  assert.match(rows.find(x=>x.proname==='dictionary_snapshot_candidate').definition,/derivations/);
  assert.match(rows.find(x=>x.proname==='dictionary_overlay_candidate').definition,/derivations/);
  const materialize=rows.find(x=>x.proname==='dictionary_materialize_review').definition;
  assert.match(materialize,/c#>>'\{bundle,dictionary_entries,0,kind\}' <> 'word'/);
  assert.match(materialize,/delete from public.dictionary_sense_derivations/);
  assert.match(materialize,/if c \? 'derivations' then/);
  assert.match(materialize,/replace_editor_children/);
  await assert.rejects(pg.exec(migration),/Unexpected snapshot candidate RPC/,'retirement patch must be single-use');
 }finally{await pg.close();}
});

test('B2 Review migration leaves historical review tables and permanent learning data untouched',()=>{
 assert.doesNotMatch(migration,/\bdrop\s+(?:table|column)\b|\btruncate\b|\bcascade\b/i);
 assert.doesNotMatch(migration,/delete from public.dictionary_review_drafts|\bstudy_cards\b|\bstudy_card_states\b/i);
});
