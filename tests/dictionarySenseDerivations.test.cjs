require('./loadStudy.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const migration=fs.readFileSync('supabase/migrations/20261114135000_dictionary_sense_derivations.sql','utf8');

test('B2 schema adds derivations/translation without rewriting legacy examples, and rejects cross-Sense links',async()=>{
  const pg=new PGlite();
  try{
    await pg.exec(`
      create role authenticated;
      create role anon;
      create function public.is_dictionary_admin() returns boolean language sql stable as $$select false$$;
      create table public.dictionary_entries(id uuid primary key,status text not null);
      create table public.dictionary_senses(
        id uuid primary key,entry_id uuid not null references public.dictionary_entries(id),
        unique(entry_id,id)
      );
      create table public.dictionary_examples(
        id uuid primary key,entry_id uuid not null references public.dictionary_entries(id),
        sense_id uuid,body text not null,sort_order integer not null default 0,
        revision bigint not null default 1,updated_at timestamptz not null default now(),
        foreign key(entry_id,sense_id) references public.dictionary_senses(entry_id,id)
      );
    `);
    for(const [a,b] of [[1,'published'],[2,'published']]){
      await pg.query('insert into public.dictionary_entries(id,status) values($1,$2)',[id(a),b]);
    }
    await pg.query('insert into public.dictionary_senses(id,entry_id) values($1,$2),($3,$4),($5,$6)',[id(10),id(1),id(11),id(1),id(20),id(2)]);
    await pg.query('insert into public.dictionary_examples(id,entry_id,sense_id,body) values($1,$2,$3,$4)',[id(100),id(1),id(10),'Existing English example']);
    const before=(await pg.query('select id,entry_id,sense_id,body,revision from public.dictionary_examples')).rows;
    await pg.exec(migration);
    const legacy=(await pg.query('select id,entry_id,sense_id,body,revision,translation_zh_tw,derivation_id from public.dictionary_examples')).rows;
    assert.deepEqual(legacy.map(({translation_zh_tw,derivation_id,...row})=>row),before);
    assert.equal(legacy[0].translation_zh_tw,null);
    assert.equal(legacy[0].derivation_id,null);
    const insert='insert into public.dictionary_sense_derivations(id,entry_id,sense_id,gloss_zh_tw) values($1,$2,$3,$4)';
    await pg.query(insert,[id(200),id(1),id(10),'衍生意思']);
    await pg.query(insert,[id(201),id(1),id(11),'另一義項']);
    await assert.rejects(pg.query(insert,[id(202),id(2),id(10),'跨詞條']),/foreign key/i);
    await assert.rejects(pg.query(insert,[id(203),id(1),id(10),'  ']),/check constraint/i);
    await pg.query('update public.dictionary_examples set derivation_id=$1,translation_zh_tw=$2 where id=$3',[id(200),'既有英文例句',id(100)]);
    await assert.rejects(pg.query('update public.dictionary_examples set derivation_id=$1 where id=$2',[id(201),id(100)]),/foreign key/i);
    await assert.rejects(pg.query('update public.dictionary_examples set derivation_id=$1 where id=$2',[id(202),id(100)]),/foreign key/i);
    await assert.rejects(pg.query('delete from public.dictionary_sense_derivations where id=$1',[id(200)]),/foreign key/i);
    const saved=(await pg.query('select translation_zh_tw,derivation_id from public.dictionary_examples where id=$1',[id(100)])).rows[0];
    assert.equal(saved.translation_zh_tw,'既有英文例句');
    assert.equal(saved.derivation_id,id(200));
    const directGrants=(await pg.query(`select has_table_privilege('authenticated','public.dictionary_sense_derivations','INSERT') as insert_allowed,has_table_privilege('authenticated','public.dictionary_sense_derivations','SELECT') as select_allowed`)).rows[0];
    assert.equal(directGrants.insert_allowed,false);
    assert.equal(directGrants.select_allowed,true);
  }finally{await pg.close();}
});

test('B2 migration does not contain destructive operations or modify study tables',()=>{
  assert.doesNotMatch(migration,/\b(?:drop\s+(?:table|column)|truncate|delete\s+from|update\s+public\.dictionary_(?:entries|senses|examples))\b/i);
  assert.doesNotMatch(migration,/\bstudy_(?:cards|card_states|review_events)\b/i);
});
