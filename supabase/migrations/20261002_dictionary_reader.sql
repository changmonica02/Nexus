-- M7-11: bounded published search and safe public detail projection.
begin;
create function public.search_published_dictionary(category text default 'word', query_text text default '', page_number integer default 0)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if category is null or category not in ('word','prefix','root') then raise exception 'Invalid category'; end if;
  if page_number is null or page_number<0 or page_number>100000 then raise exception 'Invalid page'; end if;
  if query_text is null or length(query_text)>120 then raise exception 'Invalid query'; end if;
  with page_rows as (
    select id,kind,headword from public.dictionary_entries
    where status='published' and kind=category
      and strpos(lower(headword),lower(btrim(query_text)))>0
    order by headword,id limit 21 offset page_number*20
  ), shown as (select * from page_rows order by headword,id limit 20)
  select jsonb_build_object('items',coalesce((select jsonb_agg(s order by headword,id) from shown s),'[]'::jsonb),
    'has_more',(select count(*)>20 from page_rows),'page',page_number) into result;
  return result;
end $$;
revoke all on function public.search_published_dictionary(text,text,integer) from public,anon;
grant execute on function public.search_published_dictionary(text,text,integer) to authenticated;

-- Narrow definer projection: raw_text, license_note and audit records stay private.
-- This does not change source-table RLS or the admin detail RPC.
create function public.get_published_dictionary_entry(entry_uuid uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  with visible as (
    select e.id,e.kind,e.headword,e.source_id,e.status,e.published_at from public.dictionary_entries e
    where auth.uid() is not null and e.id=entry_uuid and e.status='published'
  ), source_ids as (
    select source_id from visible
    union select source_id from public.dictionary_senses where entry_id in (select id from visible)
    union select source_id from public.dictionary_relations where entry_id in (select id from visible)
    union select source_id from public.dictionary_etymologies where entry_id in (select id from visible)
    union select source_id from public.dictionary_learning_notes where entry_id in (select id from visible)
  ), source_info as (
    select id,citation,source_url,license,sha256,verification from public.dictionary_sources
    where id in (select source_id from source_ids)
  ), related as (
    select distinct e.id,e.kind,e.headword,s.id as sense_id,s.gloss_zh_tw
    from public.dictionary_relations r
    join public.dictionary_entries e on e.id=r.target_entry_id and e.status='published'
    join public.dictionary_senses s on s.id=r.target_sense_id and s.entry_id=e.id
    where r.entry_id in (select id from visible)
  ), senses as (
    select id,entry_id,part_of_speech,gloss_zh_tw,source_id from public.dictionary_senses where entry_id in (select id from visible)
  ), relations as (
    select id,entry_id,sense_id,target_entry_id,target_sense_id,relation_kind,source_id,verification
    from public.dictionary_relations where entry_id in (select id from visible)
  ), histories as (
    select id,entry_id,sense_id,body,source_id,verification from public.dictionary_etymologies where entry_id in (select id from visible)
  ), notes as (
    select id,entry_id,sense_id,kind,body,source_id from public.dictionary_learning_notes where entry_id in (select id from visible)
  )
  -- Explicit public field allowlists are the projections above. Never serialize
  -- base-table rows or call the admin detail RPC here. Verification/review notes,
  -- raw sources, revisions and any future management columns remain private.
  select jsonb_build_object('entry',to_jsonb(v),
    'senses',coalesce((select jsonb_agg(s order by id) from senses s),'[]'::jsonb),
    'relations',coalesce((select jsonb_agg(r order by id) from relations r),'[]'::jsonb),
    'etymologies',coalesce((select jsonb_agg(h order by id) from histories h),'[]'::jsonb),
    'learning_notes',coalesce((select jsonb_agg(n order by id) from notes n),'[]'::jsonb),
    'sources',coalesce((select jsonb_agg(s order by id) from source_info s),'[]'::jsonb),
    'related',coalesce((select jsonb_agg(r order by headword,sense_id) from related r),'[]'::jsonb))
  from visible v;
$$;
revoke all on function public.get_published_dictionary_entry(uuid) from public,anon;
grant execute on function public.get_published_dictionary_entry(uuid) to authenticated;
commit;
