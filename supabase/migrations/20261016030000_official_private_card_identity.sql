-- Incremental, transactional; production application requires separate authorization.
-- Depends on 20261009 official packs, 20261015 private text guard and dictionary links.
begin;
create or replace function public.guard_official_study_content() returns trigger
language plpgsql security definer set search_path='' as $$
declare deck text; source text; previous jsonb;
begin
 if tg_table_name='study_cards' and tg_op='UPDATE' and old.payload ? 'official_pack_id' then
  source:=coalesce(old.payload->>'official_source_entry_id',old.payload->>'dictionary_entry_id');
  if nullif(source,'') is null then raise exception 'Official source missing; manual reconciliation required'; end if;
  previous:=old.payload||jsonb_build_object('official_source_entry_id',source);
  -- Old clients may omit the newly added identity; never infer it from a new link.
  new.payload:=jsonb_build_object('official_source_entry_id',source)||new.payload;
  if new.owner_id is distinct from old.owner_id or new.id is distinct from old.id or
    (new.payload-array['updated_at','content_revision','migration_only','front','back','dictionary_entry_id','deleted_at']) is distinct from
    (previous-array['updated_at','content_revision','migration_only','front','back','dictionary_entry_id','deleted_at']) then
   raise exception 'Official card source identity is immutable';
  end if;
  if old.payload->>'deleted_at' is not null and new.payload->>'deleted_at' is distinct from old.payload->>'deleted_at' then raise exception 'Deleted official card cannot be resurrected'; end if;
 end if;
 deck:=case when tg_table_name='study_deck_settings' then new.id else new.payload->>'deck_id' end;
 if not (new.payload ? 'official_pack_id') and not exists(select 1 from public.official_study_pack_downloads d where d.owner_id=new.owner_id and d.deck_id=deck) then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended('workspace:'||new.owner_id::text,0));
 if exists(select 1 from public.official_study_pack_downloads d where d.owner_id=new.owner_id and d.deck_id=deck and d.deleted_at is not null) then raise exception 'Official study set was deleted'; end if;
 if tg_table_name='study_cards' and tg_op='INSERT' and new.payload ? 'official_pack_id' then
  -- ON CONFLICT invokes INSERT triggers before UPDATE triggers. Old clients may
  -- omit source after unlinking, and a previously installed source may leave the manifest.
  select payload into previous from public.study_cards where owner_id=new.owner_id and id=new.id;
  if found then
   if not(previous ? 'official_pack_id') then raise exception 'Cannot convert a private card into an official source';end if;
   source:=coalesce(new.payload->>'official_source_entry_id',previous->>'official_source_entry_id',previous->>'dictionary_entry_id');
  else
   source:=coalesce(new.payload->>'official_source_entry_id',new.payload->>'dictionary_entry_id');
   if not exists(select 1 from public.official_study_pack_downloads d join public.official_study_pack_entries m on m.pack_id=d.pack_id where d.owner_id=new.owner_id and d.deck_id=deck and d.pack_id=new.payload->>'official_pack_id' and d.deleted_at is null and m.dictionary_entry_id::text=source) then raise exception 'Invalid official source'; end if;
  end if;
  new.payload:=new.payload||jsonb_build_object('official_source_entry_id',source);
 end if;
 return new;
end $$;
-- Guard's legacy normalization only uses the old immutable source. No content/timestamps change.
do $$begin
 if exists(select 1 from public.study_cards where payload ? 'official_pack_id' and nullif(coalesce(payload->>'official_source_entry_id',payload->>'dictionary_entry_id'),'') is null) then raise exception 'Missing official source; migration aborted without guessing';end if;
end$$;
update public.study_cards set payload=payload||jsonb_build_object('official_source_entry_id',payload->>'dictionary_entry_id') where payload ? 'official_pack_id' and not(payload ? 'official_source_entry_id');
create unique index official_source_identity on public.study_cards(owner_id,(payload->>'deck_id'),(payload->>'official_source_entry_id')) where payload ? 'official_pack_id';
drop index public.official_card_identity;
create or replace function public.download_official_study_pack(pack_id text) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); pack public.official_study_packs%rowtype;
  installed public.official_study_pack_downloads%rowtype; item record; card_id text; stamp bigint;
  word text; meanings text; card jsonb; deck text; next_order integer;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('workspace:'||actor::text,0));
  select * into pack from public.official_study_packs p where p.id=download_official_study_pack.pack_id for share;
  if not found then raise exception 'Official pack not found'; end if;
  select * into installed from public.official_study_pack_downloads d where d.owner_id=actor and d.pack_id=pack.id and d.deleted_at is null for update;
  stamp:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
  if installed.deck_id is null then
    deck:='page_'||gen_random_uuid()::text;
    perform public.apply_workspace_operations(jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'entity_type','pages','entity_id',deck,'kind','save','expected_revision',0,
      'value',jsonb_build_object('id',deck,'title',pack.name,'content_json','{}'::jsonb,'content_text','','default_mode','note','created_at',stamp,'deleted_at',null,'device_id','official-pack','kind','study_set','study_items','[]'::jsonb,'format','flow','tags','[]'::jsonb,'links','[]'::jsonb,'attachment_ids','[]'::jsonb))));
    insert into public.official_study_pack_downloads values(actor,deck,pack.id,pack.version,null);
    insert into public.study_deck_settings(owner_id,id,payload) values(actor,deck,jsonb_build_object('id',deck,'owner_id',actor,'new_limit',20,'direction_confirmed',true,'updated_at',stamp,'schema',2,'official_pack_id',pack.id,'official_pack_version',pack.version));
  else
    deck:=installed.deck_id;
    if exists(select 1 from public.workspace_tombstones t where t.owner_id=actor and t.entity_type='pages' and t.entity_id=deck) then raise exception 'Deleted official download'; end if;
  end if;
  select coalesce(max((payload->>'sort_order')::integer),-1)+1 into next_order from public.study_cards where owner_id=actor and payload->>'deck_id'=deck;
  for item in select * from public.official_study_pack_entries m where m.pack_id=pack.id order by m.sort_order,m.dictionary_entry_id loop
    -- Existing cards (even entries no longer in the manifest) are never rebuilt or deleted.
    if exists(select 1 from public.study_cards c where c.owner_id=actor and c.payload ? 'official_pack_id' and c.payload->>'deck_id'=deck and c.payload->>'official_source_entry_id'=item.dictionary_entry_id::text) then continue; end if;
    select e.headword into word from public.dictionary_entries e where e.id=item.dictionary_entry_id and e.kind='word' and e.status='published';
    if word is null then raise exception 'Manifest contains an unavailable published Word'; end if;
    select string_agg(s.gloss_zh_tw,'；' order by s.id) into meanings from public.dictionary_senses s where s.entry_id=item.dictionary_entry_id;
    if nullif(btrim(meanings),'') is null then raise exception 'Word has no Chinese meaning'; end if;
    card_id:=gen_random_uuid()::text;
    card:=jsonb_build_object('id',card_id,'deck_id',deck,'owner_id',actor,'front',word,'back',meanings,'direction','en-zh','sort_order',next_order,'content_revision',1,'created_at',stamp,'updated_at',stamp,'deleted_at',null,
      'dictionary_entry_id',item.dictionary_entry_id,'official_source_entry_id',item.dictionary_entry_id,'official_pack_id',pack.id,'official_pack_version',pack.version,'official_level',item.level);
    insert into public.study_cards(owner_id,id,payload) values(actor,card_id,card);
    insert into public.study_card_states(owner_id,id,payload) values(actor,card_id,jsonb_build_object('id',card_id,'deck_id',deck,'owner_id',actor,'fsrs',null,'legacy_due_at',null,'introduced_at',null,'head',null,'generation',0,'conflict',false));
    insert into public.study_card_dictionary_links(owner_id,card_id,dictionary_entry_id) values(actor,card_id,item.dictionary_entry_id);
    next_order:=next_order+1;
  end loop;
  update public.pages set official_pack_id=pack.id,official_pack_version=pack.version,deleted_at=null,
    revision=revision+1,updated_at=stamp where id=deck and owner_id=actor and (official_pack_id is distinct from pack.id or official_pack_version is distinct from pack.version or deleted_at is not null);
  update public.study_deck_settings set payload=payload||jsonb_build_object('official_pack_version',pack.version,'updated_at',greatest(stamp,(payload->>'updated_at')::bigint+1)) where owner_id=actor and id=deck and (payload->>'official_pack_version')::integer is distinct from pack.version;
  update public.official_study_pack_downloads set version=pack.version where owner_id=actor and deck_id=deck;
  return deck;
end $$;


-- One card operation atomically updates its current link; identity never comes from this link.
create function public.sync_official_private_dictionary_link() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.payload ? 'official_pack_id' and (new.payload->>'dictionary_entry_id' is distinct from old.payload->>'dictionary_entry_id' or new.payload->>'deleted_at' is distinct from old.payload->>'deleted_at') then
  if new.payload->>'dictionary_entry_id' is null or new.payload->>'deleted_at' is not null then
   delete from public.study_card_dictionary_links where owner_id=new.owner_id and card_id=new.id;
  else
   insert into public.study_card_dictionary_links(owner_id,card_id,dictionary_entry_id) values(new.owner_id,new.id,(new.payload->>'dictionary_entry_id')::uuid) on conflict(owner_id,card_id) do update set dictionary_entry_id=excluded.dictionary_entry_id;
  end if;
 end if;
 return new;
end$$;
create trigger official_private_link after update on public.study_cards for each row execute function public.sync_official_private_dictionary_link();
create function public.official_private_card_capabilities() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin if auth.uid() is null then raise exception 'Authentication required';end if;return jsonb_build_object('version',1);end$$;
revoke all on function public.guard_official_study_content(),public.sync_official_private_dictionary_link(),public.official_private_card_capabilities() from public,anon,authenticated;
grant execute on function public.official_private_card_capabilities() to authenticated;
-- Existing download grants survive CREATE OR REPLACE; no direct table grants or RLS changes.
commit;
