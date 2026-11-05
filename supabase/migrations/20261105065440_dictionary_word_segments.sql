-- Additive Word content. No backfill, cleanup, publication or ID replacement.
begin;
alter table public.dictionary_entries add column word_segments jsonb;
create function public.dictionary_valid_word_segments(kind text,headword text,segments jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare s jsonb; spelling text:=''; ids text[]:='{}';
begin
 if segments is null or segments='null'::jsonb then return true;end if;
 if kind<>'word' or jsonb_typeof(segments)<>'array' then return false;end if;
 if jsonb_array_length(segments) not between 1 and 128 then return false;end if;
 for s in select value from jsonb_array_elements(segments) loop
  if jsonb_typeof(s)<>'object' or not(s ?& array['id','text','hint','relation_id']) or (s-array['id','text','hint','relation_id'])<>'{}'::jsonb then return false;end if;
  if jsonb_typeof(s->'id')<>'string' or (s->>'id')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or lower(s->>'id')=any(ids) then return false;end if;
  if jsonb_typeof(s->'text')<>'string' or btrim(s->>'text')='' or jsonb_typeof(s->'hint')<>'string' then return false;end if;
  if s->'relation_id'<>'null'::jsonb and (jsonb_typeof(s->'relation_id')<>'string' or (s->>'relation_id')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then return false;end if;
  ids:=array_append(ids,lower(s->>'id'));spelling:=spelling||(s->>'text');
 end loop;
 return spelling=headword;
end $$;
alter table public.dictionary_entries add constraint dictionary_word_segments_valid check(public.dictionary_valid_word_segments(kind,headword,word_segments));

create function public.dictionary_assert_segment_links(eid uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from public.dictionary_entries e cross join lateral jsonb_array_elements(coalesce(nullif(e.word_segments,'null'::jsonb),'[]'::jsonb)) s where e.id=eid and s->>'relation_id' is not null and not exists(select 1 from public.dictionary_relations r where r.id=(s->>'relation_id')::uuid and r.entry_id=eid)) then raise exception 'Word segment relation is missing or belongs to another entry';end if;
end $$;
create function public.dictionary_guard_segment_links() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='dictionary_entries' then perform public.dictionary_assert_segment_links(new.id);
 else perform public.dictionary_assert_segment_links(old.entry_id);end if;
 return null;
end $$;
create constraint trigger dictionary_segment_links after insert or update on public.dictionary_entries deferrable initially deferred for each row execute function public.dictionary_guard_segment_links();
create constraint trigger dictionary_segment_relation_links after delete or update on public.dictionary_relations deferrable initially deferred for each row execute function public.dictionary_guard_segment_links();

-- Change only explicit extension points; fail/rollback on unexpected RPC source drift.
do $$ declare definition text;before text;begin
 definition:=pg_get_functiondef('public.apply_dictionary_bundle(jsonb,boolean,boolean)'::regprocedure);
 before:=$anchor$array['id','kind','headword','revision']$anchor$;
 if (length(definition)-length(replace(definition,before,'')))/length(before)<>1 then raise exception 'Unexpected bundle whitelist; inspect schema';end if;
 definition:=replace(definition,before,$anchor$array['id','kind','headword','revision','word_segments']$anchor$);execute definition;

 -- The existing full-editor replacement only removed relations/inflections.
 -- Extend that same CAS-guarded transaction to explicitly supplied child arrays.
 -- Omitted arrays from older clients retain their rows. FK guards still reject references.
 definition:=pg_get_functiondef('public.apply_dictionary_drafts(jsonb,boolean,boolean)'::regprocedure);
 before:=$anchor$delete from public.dictionary_relations where entry_id=eid and not(id in(select (x->>'id')::uuid from jsonb_array_elements(coalesce(b->'dictionary_relations','[]')) x));$anchor$;
 if strpos(definition,before)=0 then raise exception 'Unexpected full editor replacement; inspect schema';end if;
 definition:=replace(definition,before,before||$anchor$
   foreach tbl in array array['dictionary_pronunciations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_senses'] loop
    k:=case tbl when 'dictionary_pronunciations' then 'pronunciations' when 'dictionary_examples' then 'examples' when 'dictionary_lexical_annotations' then 'annotations' else tbl end;
    if (k=tbl and b ? k) or (k<>tbl and d ? k) then
     execute format('delete from public.%I where entry_id=$1 and not(id in(select (x->>''id'')::uuid from jsonb_array_elements($2) x))',tbl)
      using eid,case when k=tbl then b->k else d->k end;
    end if;
   end loop;
$anchor$);
 before:=$anchor$if preview then raise exception using errcode='ZX713',detail=total::text;end if;$anchor$;
 if strpos(definition,before)=0 then raise exception 'Unexpected draft preview boundary; inspect schema';end if;
 definition:=replace(definition,before,$anchor$for d in select value from jsonb_array_elements(drafts) loop perform public.dictionary_assert_segment_links((d->'bundle'->'dictionary_entries'->0->>'id')::uuid);end loop;
 if preview then raise exception using errcode='ZX713',detail=total::text;end if;$anchor$);execute definition;
 definition:=pg_get_functiondef('public.get_published_dictionary_entry(uuid)'::regprocedure);
 before:='e.id,e.kind,e.headword,e.status,e.published_at';
 if strpos(definition,before)=0 then raise exception 'Unexpected published reader projection; inspect schema';end if;
 definition:=replace(definition,before,'e.id,e.kind,e.headword,e.status,e.published_at,e.word_segments');execute definition;
end $$;
revoke all on function public.dictionary_valid_word_segments(text,text,jsonb),public.dictionary_assert_segment_links(uuid),public.dictionary_guard_segment_links() from public,anon;
grant execute on function public.dictionary_valid_word_segments(text,text,jsonb),public.dictionary_assert_segment_links(uuid) to authenticated;
revoke all on function public.dictionary_guard_segment_links() from authenticated;
notify pgrst,'reload schema';
commit;
