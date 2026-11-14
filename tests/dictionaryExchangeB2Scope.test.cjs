require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const sql=fs.readFileSync('supabase/migrations/20261114214000_dictionary_exchange_b2_scope.sql','utf8');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
test('exchange scope recognizes new Word content changes and keeps old stamped scope behavior',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec(`
   create table public.dictionary_entries(id uuid primary key,revision integer,entry_id uuid);
   create table public.dictionary_sense_derivations(id uuid primary key,entry_id uuid,gloss_zh_tw text);
   create table public.dictionary_public_notes(id uuid primary key,entry_id uuid,body text);
   create table public.dictionary_inflections(id uuid primary key,entry_id uuid,form text);
   create function public.dictionary_exchange_scope_version(entry_ids uuid[])
   returns text language plpgsql stable as $$
   declare t text; out_text text:='';
   begin
    foreach t in array array[
     'dictionary_entries','dictionary_inflections','dictionary_pronunciations','dictionary_inflections',
     'dictionary_review_drafts'
    ] loop
     if t='dictionary_sense_derivations' then
       out_text:=out_text||coalesce((select md5(string_agg(x.gloss_zh_tw,',' order by x.id)) from public.dictionary_sense_derivations x where x.entry_id=any(entry_ids)),'');
     elsif t='dictionary_public_notes' then
       out_text:=out_text||coalesce((select md5(string_agg(x.body,',' order by x.id)) from public.dictionary_public_notes x where x.entry_id=any(entry_ids)),'');
     else
       out_text:=out_text||t;
     end if;
    end loop;
    return md5(out_text);
   end $$;
   create function public.dictionary_import_context(candidate jsonb)
   returns jsonb language plpgsql as $$
   declare t text; rows jsonb:='{}'; ids uuid[];
   begin
    foreach t in array array['dictionary_entries','dictionary_pronunciations','dictionary_inflections'] loop
      ids:=case when t='dictionary_sense_derivations' then array(select (x->>'id')::uuid from jsonb_array_elements(coalesce(candidate->'derivations','[]'::jsonb)) x)
         when t='dictionary_public_notes' then array(select (x->>'id')::uuid from jsonb_array_elements(coalesce(candidate->'public_notes','[]'::jsonb)) x)
         when t='dictionary_inflections' then array(select (x->>'id')::uuid from jsonb_array_elements(coalesce(candidate->'inflections','[]'::jsonb)) x)
         else '{}'::uuid[] end;
      rows:=rows||jsonb_build_object(t,to_jsonb(ids));
    end loop;
    return rows;
   end $$;
  `);
  // The patch intentionally requires the installed legacy structure.
  await pg.exec(sql);
  await pg.query('insert into public.dictionary_entries(id,revision,entry_id) values($1,1,$1)',[id(1)]);
  const stamp=async()=>(await pg.query('select public.dictionary_exchange_scope_version($1::uuid[]) s',[[id(1)]])).rows[0].s;
  const before=await stamp();
  await pg.query('insert into public.dictionary_sense_derivations(id,entry_id,gloss_zh_tw) values($1,$2,$3)',[id(2),id(1),'工作']);
  const changed=await stamp();assert.notEqual(changed,before);
  await pg.query('insert into public.dictionary_public_notes(id,entry_id,body) values($1,$2,$3)',[id(3),id(1),'原始筆記']);
  assert.notEqual(await stamp(),changed);
  const res=(await pg.query('select public.dictionary_import_context($1) result',[JSON.stringify({derivations:[{id:id(2)}],public_notes:[{id:id(3)}]})])).rows[0].result;
  assert.deepEqual(res.dictionary_sense_derivations,[id(2)]);
  assert.deepEqual(res.dictionary_public_notes,[id(3)]);
  await assert.rejects(pg.exec(sql),/Unexpected exchange scope RPC/);
 }finally{await pg.close();}
});
test('exchange B2 scope patch does not remove historical reviews or private study records',()=>{
 assert.doesNotMatch(sql,/\\bdrop\\s+(?:table|column)\\b|\\btruncate\\b|\\bcascade\\b/i);
 assert.doesNotMatch(sql,/delete\\s+from\\s+public\\.dictionary_review_drafts|study_card_states|fsrs/i);
});
