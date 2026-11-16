require('./loadStudy.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const {validateSenseExtensions,removeDerivationSafely}=require('../src/features/dictionary/senseDerivations.ts');
const {withoutSense,withoutDerivation}=require('../src/features/dictionary/draftEditing.ts');
const {draftsFromBundle,mapDictionaryDraft,validateDictionaryDraft}=require('../src/features/dictionary/draftPipeline.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const derivation={id:id(3),entry_id:id(1),sense_id:id(2),gloss_zh_tw:'延伸意思',sort_order:0};
const example={id:id(4),entry_id:id(1),sense_id:id(2),body:'Example sentence',translation_zh_tw:'中文翻譯',derivation_id:id(3)};
const data=()=>({dictionary_entries:[{id:id(1),kind:'word',headword:'example'}],dictionary_senses:[{id:id(2),entry_id:id(1),part_of_speech:'noun',gloss_zh_tw:'核心意思'}],dictionary_sense_derivations:[{...derivation}],dictionary_relations:[],dictionary_examples:[{...example}],dictionary_etymologies:[],dictionary_learning_notes:[],dictionary_pronunciations:[],dictionary_inflections:[],dictionary_lexical_annotations:[]});
test('B2 editor draft preserves derivation IDs and bilingual example fields through mapping',()=>{
  const d=draftsFromBundle(data())[0];
  assert.equal(d.derivations[0].id,id(3));
  assert.equal(d.examples[0].translation_zh_tw,'中文翻譯');
  assert.deepEqual(validateDictionaryDraft([d]),[]);
  const mapped=mapDictionaryDraft(d);
  assert.equal(mapped.derivations[0].sense_id,id(2));
  assert.equal(mapped.examples[0].derivation_id,id(3));
});
test('B2 rejects a cross-Sense example link and missing linked derivation',()=>{
  assert.deepEqual(validateSenseExtensions([{id:id(2)}],[derivation],[example]),[]);
  assert.ok(validateSenseExtensions([{id:id(2)}],[derivation],[{...example,sense_id:id(5)}]).length);
  assert.ok(validateSenseExtensions([{id:id(2)}],[],[example]).length);
});
test('B2 cannot silently remove a referenced derivation or its parent Sense',()=>{
  assert.throws(()=>removeDerivationSafely([derivation],[example],id(3)),/例句/);
  assert.throws(()=>withoutDerivation(data(),id(3)),/例句/);
  assert.throws(()=>withoutSense(data(),id(2)),/衍生意思/);
  const clean=data();clean.dictionary_examples=[];
  assert.equal(withoutDerivation(clean,id(3)).dictionary_sense_derivations.length,0);
});

test('new derivation contract allows zero or one bilingual example; translation is optional',()=>{
 assert.deepEqual(validateSenseExtensions([{id:id(2)}],[derivation],[]),[]);
 assert.deepEqual(validateSenseExtensions([{id:id(2)}],[derivation],[{...example,translation_zh_tw:null}]),[]);
 const duplicates=validateSenseExtensions([{id:id(2)}],[derivation],[example,{...example,id:id(9)}]);
 assert.ok(duplicates.some(message=>message.includes('最多只能連結一組')));
 const duplicated=data();duplicated.dictionary_examples.push({...example,id:id(9)});
 assert.ok(validateDictionaryDraft(draftsFromBundle(duplicated)).some(x=>JSON.stringify(x).includes('最多只能連結一組')));
});

test('Word editor contract requires a core sense and allows at most one reading, mnemonic, etymology and note',()=>{
 const current=draftsFromBundle(data())[0];
 assert.deepEqual(validateDictionaryDraft([current]),[]);
 const missing={...current,senses:[]};
 assert.ok(validateDictionaryDraft([missing]).some(issue=>issue.field==='senses'));
 const fixture=(field)=>({...current,[field]:[
  {id:id(100),entry_id:id(1),sense_id:null,ipa:'ipa',kind:'core_concept',body:'first'},
  {id:id(101),entry_id:id(1),sense_id:null,ipa:'ipa2',kind:'core_concept',body:'second'}
 ]});
 for(const field of ['pronunciations','learning_notes','etymologies']){
  assert.ok(validateDictionaryDraft([fixture(field)]).some(issue=>issue.field===field),field);
 }
 const notes={...current,public_notes:[{id:id(100),body:'a'},{id:id(101),body:'b'}]};
 assert.ok(validateDictionaryDraft([notes]).some(issue=>issue.field==='public_notes'));
 const single={...current,pronunciations:[{id:id(100),ipa:'test',sense_id:null}],learning_notes:[{id:id(101),kind:'core_concept',body:'memory',sense_id:null}],etymologies:[{id:id(102),body:'history',sense_id:null}],public_notes:[{id:id(103),body:'notes'}]};
 assert.deepEqual(validateDictionaryDraft([single]),[]);
});

test('Word-only singleton database guards reject second row while preserving morpheme multiplicity',async()=>{
 const fs=require('node:fs');
 const {PGlite}=require('@electric-sql/pglite');
 const pg=new PGlite();
 const sql=fs.readFileSync('supabase/migrations/20261115170000_dictionary_word_singleton_sections.sql','utf8');
 try{
  await pg.exec(`create table public.dictionary_entries(id uuid primary key,kind text not null);
  create table public.dictionary_pronunciations(id uuid primary key,entry_id uuid references public.dictionary_entries(id));
  create table public.dictionary_learning_notes(id uuid primary key,entry_id uuid references public.dictionary_entries(id));
  create table public.dictionary_etymologies(id uuid primary key,entry_id uuid references public.dictionary_entries(id));`);
  await pg.query('insert into public.dictionary_entries(id,kind) values ($1,$2),($3,$4)',[id(1),'word',id(2),'root']);
  await pg.exec(sql);
  for(const table of ['dictionary_pronunciations','dictionary_learning_notes','dictionary_etymologies']){
    await pg.query(`insert into public.${table}(id,entry_id) values($1,$2)`,[id(100),id(1)]);
    await assert.rejects(pg.query(`insert into public.${table}(id,entry_id) values($1,$2)`,[id(101),id(1)]),/at most one row/);
    await pg.query(`insert into public.${table}(id,entry_id) values($1,$2),($3,$4)`,[id(102),id(2),id(103),id(2)]);
    assert.equal((await pg.query(`select count(*)::int n from public.${table} where entry_id=$1`,[id(2)])).rows[0].n,2);
    await pg.query(`delete from public.${table}`);
  }
 }finally{await pg.close();}
});

