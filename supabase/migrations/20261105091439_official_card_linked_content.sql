begin;
-- Only a display preference in the existing card payload. Existing source IDs/CAS remain authoritative.
do $$declare definition text;anchor text;begin
 definition:=pg_get_functiondef('public.guard_official_study_content()'::regprocedure);
 anchor:=$a$if tg_table_name='study_cards' and tg_op='UPDATE' and old.payload ? 'official_pack_id' then$a$;
 if strpos(definition,anchor)=0 then raise exception 'Unexpected official card guard';end if;
 definition:=replace(definition,anchor,$a$if tg_table_name='study_cards' and new.payload ? 'official_custom' and jsonb_typeof(new.payload->'official_custom')<>'boolean' then raise exception 'Invalid official customization';end if;
 $a$||anchor||$a$
  if old.payload->'official_custom'='true'::jsonb and new.payload->'official_custom'='false'::jsonb then raise exception 'Private customization cannot be reversed';end if;
  if not(new.payload ? 'official_custom') and old.payload ? 'official_custom' then new.payload:=new.payload||jsonb_build_object('official_custom',case when old.payload->'official_custom'='true'::jsonb or new.payload->>'content_revision' is distinct from old.payload->>'content_revision' then 'true'::jsonb else old.payload->'official_custom' end);end if;
  if old.payload->'official_custom'='false'::jsonb and old.payload->>'dictionary_entry_id' is not null and new.payload->>'dictionary_entry_id' is null and new.payload->'official_custom' is distinct from 'true'::jsonb then
   new.payload:=new.payload||coalesce((select jsonb_build_object('front',e.headword,'back',(select string_agg(s.gloss_zh_tw,'；' order by s.id) from public.dictionary_senses s where s.entry_id=e.id)) from public.dictionary_entries e where e.id::text=old.payload->>'dictionary_entry_id' and e.kind='word' and e.status='published'),jsonb_build_object('front',old.payload->>'front','back',old.payload->>'back'))||'{"official_custom":true}'::jsonb;
  end if;
  if old.payload->'official_custom'='false'::jsonb and (new.payload->>'front' is distinct from old.payload->>'front' or new.payload->>'back' is distinct from old.payload->>'back') then new.payload:=new.payload||'{"official_custom":true}'::jsonb;end if;
  if new.payload ? 'official_custom' and jsonb_typeof(new.payload->'official_custom')<>'boolean' then raise exception 'Invalid official customization';end if;
  if not(old.payload ? 'official_custom') and new.payload->'official_custom'='false'::jsonb and not(
    old.payload->>'content_revision'='1' and old.payload->>'created_at'=old.payload->>'updated_at' and old.payload->>'deleted_at' is null
    and old.payload->>'dictionary_entry_id'=old.payload->>'official_source_entry_id'
    and exists(select 1 from public.dictionary_entries e where e.id::text=old.payload->>'dictionary_entry_id' and e.kind='word' and e.status='published' and e.headword=old.payload->>'front'
      and (select string_agg(s.gloss_zh_tw,'；' order by s.id) from public.dictionary_senses s where s.entry_id=e.id)=old.payload->>'back')
  ) then raise exception 'Unverified old official card; preserve private content';end if;
$a$);
 definition:=replace(definition,$a$'updated_at','content_revision','migration_only','front','back','dictionary_entry_id','deleted_at'$a$,$a$'updated_at','content_revision','migration_only','front','back','dictionary_entry_id','deleted_at','official_custom'$a$);execute definition;
 definition:=pg_get_functiondef('public.download_official_study_pack(text)'::regprocedure);
 anchor:=$a$'official_level',item.level$a$;
 if strpos(definition,anchor)=0 then raise exception 'Unexpected official download';end if;
 definition:=replace(definition,anchor,anchor||$a$,'official_custom',false$a$);execute definition;
end $$;
-- Conservative opt-in only: no text guessing, no edited/deleted/relinked legacy card conversion.
do $$declare account_id uuid;begin
 for account_id in select distinct owner_id from public.study_cards order by owner_id loop
 perform pg_advisory_xact_lock(hashtextextended('workspace:'||account_id::text,0));
 update public.study_cards c set payload=c.payload||jsonb_build_object('official_custom',false)
where c.owner_id=account_id and c.payload ? 'official_pack_id' and not(c.payload ? 'official_custom') and c.payload->>'content_revision'='1'
and c.payload->>'created_at'=c.payload->>'updated_at' and c.payload->>'deleted_at' is null
and c.payload->>'dictionary_entry_id'=c.payload->>'official_source_entry_id'
and exists(select 1 from public.official_study_pack_downloads d where d.owner_id=c.owner_id and d.deck_id=c.payload->>'deck_id' and d.deleted_at is null and d.pack_id=c.payload->>'official_pack_id')
and exists(select 1 from public.dictionary_entries e where e.id::text=c.payload->>'dictionary_entry_id' and e.kind='word' and e.status='published' and e.headword=c.payload->>'front'
 and (select string_agg(s.gloss_zh_tw,'；' order by s.id) from public.dictionary_senses s where s.entry_id=e.id)=c.payload->>'back');
 end loop;
end $$;
create function public.get_published_study_content(entry_ids uuid[]) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if entry_ids is null or cardinality(entry_ids)>200 then raise exception 'At most 200 entries';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'status',e.status,'front',e.headword,'back',(select string_agg(s.gloss_zh_tw,'；' order by s.id) from public.dictionary_senses s where s.entry_id=e.id)) order by e.id)
 from public.dictionary_entries e where e.id=any(entry_ids) and e.kind='word' and e.status='published'),'[]'::jsonb);
end $$;
revoke all on function public.get_published_study_content(uuid[]) from public,anon;
grant execute on function public.get_published_study_content(uuid[]) to authenticated;
notify pgrst,'reload schema';
commit;
