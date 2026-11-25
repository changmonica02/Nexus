begin;
-- Reverse links are scoped to the published source word and the actual source sense.
-- A shared relation (NULL sense_id) applies to all senses of that word.
create or replace function public.dictionary_related_word_senses(component_uuid uuid, page_number integer default 0)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if component_uuid is null or page_number is null or page_number<0 or page_number>100000 then raise exception 'Invalid related word request'; end if;
 return (
  with matched as materialized (
   select distinct e.id,e.headword,s.id sense_id,s.part_of_speech,s.gloss_zh_tw
   from public.dictionary_relations r
   join public.dictionary_entries e on e.id=r.entry_id and e.status='published' and e.kind='word'
   join public.dictionary_entries target on target.id=r.target_entry_id and target.status='published' and target.kind in ('prefix','root','suffix')
   join public.dictionary_senses ts on ts.id=r.target_sense_id and ts.entry_id=target.id
   join public.dictionary_senses s on s.entry_id=e.id and (r.sense_id is null or r.sense_id=s.id)
   where r.target_entry_id=component_uuid
  ), shown as (
   select * from matched order by lower(headword) collate "C",id,sense_id limit 100 offset page_number*100
  )
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(shown) order by lower(headword) collate "C",id,sense_id) from shown),'[]'::jsonb),
    'total',(select count(*) from matched),'has_more',(page_number+1)*100<(select count(*) from matched))
 );
end $$;
revoke all on function public.dictionary_related_word_senses(uuid,integer) from public,anon;
grant execute on function public.dictionary_related_word_senses(uuid,integer) to authenticated;
notify pgrst,'reload schema';
commit;
