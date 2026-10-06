-- Requires dictionary, study/quiz and 20261008 workspace protection migrations.
-- Only manifest metadata is seeded. No vocabulary or dictionary content imported.
begin;
create table public.official_study_packs (
  id text primary key check(id in ('gsat-1-2','gsat-3-4','gsat-5-6')),
  name text not null,
  version integer not null check(version>0)
);
create table public.official_study_pack_entries (
  pack_id text not null references public.official_study_packs(id),
  dictionary_entry_id uuid not null references public.dictionary_entries(id),
  level integer not null check(level between 1 and 6),
  sort_order integer not null check(sort_order>=0),
  primary key(pack_id,dictionary_entry_id),
  check((pack_id='gsat-1-2' and level between 1 and 2) or (pack_id='gsat-3-4' and level between 3 and 4) or (pack_id='gsat-5-6' and level between 5 and 6))
);
create index official_pack_order on public.official_study_pack_entries(pack_id,sort_order,dictionary_entry_id);
insert into public.official_study_packs values ('gsat-1-2','學測單字 1–2 級',1),('gsat-3-4','學測單字 3–4 級',1),('gsat-5-6','學測單字 5–6 級',1);
-- Retain deletion identities only, not deleted learning progress. A new download gets a new deck ID.
create table public.official_study_pack_downloads (
  owner_id uuid not null references auth.users(id) on delete cascade,
  deck_id text not null,
  pack_id text not null references public.official_study_packs(id),
  version integer not null,
  deleted_at bigint,
  primary key(owner_id,deck_id)
);
create unique index official_pack_one_download on public.official_study_pack_downloads(owner_id,pack_id) where deleted_at is null;
create unique index official_card_identity on public.study_cards(owner_id,(payload->>'deck_id'),(payload->>'dictionary_entry_id')) where payload ? 'official_pack_id';
alter table public.pages add column official_pack_id text references public.official_study_packs(id);
alter table public.pages add column official_pack_version integer;
alter table public.official_study_packs enable row level security;
alter table public.official_study_pack_entries enable row level security;
alter table public.official_study_pack_downloads enable row level security;
revoke all on public.official_study_packs,public.official_study_pack_entries,public.official_study_pack_downloads from public,anon,authenticated;
grant select on public.official_study_packs,public.official_study_pack_entries,public.official_study_pack_downloads to authenticated;
create policy official_packs_read on public.official_study_packs for select to authenticated using(true);
create policy official_entries_read on public.official_study_pack_entries for select to authenticated using(exists(select 1 from public.dictionary_entries e where e.id=dictionary_entry_id and e.kind='word' and e.status='published'));
create policy official_downloads_read on public.official_study_pack_downloads for select to authenticated using(owner_id=auth.uid());

create function public.list_official_study_packs() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return (select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'version',p.version,
    'word_count',(select count(*) from public.official_study_pack_entries m where m.pack_id=p.id),
    'deck_id',d.deck_id,'installed_version',d.version) order by p.id)
    from public.official_study_packs p left join public.official_study_pack_downloads d on d.pack_id=p.id and d.owner_id=auth.uid() and d.deleted_at is null);
end $$;

create function public.download_official_study_pack(pack_id text) returns text
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
    if exists(select 1 from public.study_cards c where c.owner_id=actor and c.payload ? 'official_pack_id' and c.payload->>'deck_id'=deck and c.payload->>'dictionary_entry_id'=item.dictionary_entry_id::text) then continue; end if;
    select e.headword into word from public.dictionary_entries e where e.id=item.dictionary_entry_id and e.kind='word' and e.status='published';
    if word is null then raise exception 'Manifest contains an unavailable published Word'; end if;
    select string_agg(s.gloss_zh_tw,'；' order by s.id) into meanings from public.dictionary_senses s where s.entry_id=item.dictionary_entry_id;
    if nullif(btrim(meanings),'') is null then raise exception 'Word has no Chinese meaning'; end if;
    card_id:=gen_random_uuid()::text;
    card:=jsonb_build_object('id',card_id,'deck_id',deck,'owner_id',actor,'front',word,'back',meanings,'direction','en-zh','sort_order',next_order,'content_revision',1,'created_at',stamp,'updated_at',stamp,'deleted_at',null,
      'dictionary_entry_id',item.dictionary_entry_id,'official_pack_id',pack.id,'official_pack_version',pack.version,'official_level',item.level);
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

create function public.delete_official_study_pack(deck_id text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); current_revision bigint; deleted bigint;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('workspace:'||actor::text,0));
  select d.deleted_at into deleted from public.official_study_pack_downloads d where d.owner_id=actor and d.deck_id=delete_official_study_pack.deck_id for update;
  if not found then raise exception 'Official download not found'; end if;
  if deleted is not null then return; end if;
  update public.official_study_pack_downloads d set deleted_at=floor(extract(epoch from clock_timestamp())*1000)::bigint where d.owner_id=actor and d.deck_id=delete_official_study_pack.deck_id;
  -- State/history deletion is scoped to this owned installation. Public dictionary is untouched.
  delete from public.study_quiz_attempt_receipts q using public.study_cards c where c.owner_id=actor and c.payload->>'deck_id'=delete_official_study_pack.deck_id and q.owner_id=actor and q.card_id=c.id;
  delete from public.study_card_quiz_states q using public.study_cards c where c.owner_id=actor and c.payload->>'deck_id'=delete_official_study_pack.deck_id and q.owner_id=actor and q.card_id=c.id;
  delete from public.study_review_events where owner_id=actor and payload->>'deck_id'=delete_official_study_pack.deck_id;
  delete from public.study_card_states where owner_id=actor and payload->>'deck_id'=delete_official_study_pack.deck_id;
  delete from public.study_cards where owner_id=actor and payload->>'deck_id'=delete_official_study_pack.deck_id;
  delete from public.study_deck_settings where owner_id=actor and id=delete_official_study_pack.deck_id;
  select p.revision into current_revision from public.pages p where p.owner_id=actor and p.id=delete_official_study_pack.deck_id for update;
  perform public.apply_workspace_operations(jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'entity_type','pages','entity_id',delete_official_study_pack.deck_id,'kind','hard_delete','expected_revision',current_revision)));
end $$;

-- Old offline Study outboxes may not recreate cards/settings after uninstall. The
-- scheduler/event logic remains unchanged; only official installation identity is checked.
create function public.guard_official_study_content() returns trigger
language plpgsql security definer set search_path='' as $$
declare deck text;
begin
  deck:=case when tg_table_name='study_deck_settings' then new.id else new.payload->>'deck_id' end;
  if not (new.payload ? 'official_pack_id') and not exists(select 1 from public.official_study_pack_downloads d where d.owner_id=new.owner_id and d.deck_id=deck) then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('workspace:'||new.owner_id::text,0));
  if exists(select 1 from public.official_study_pack_downloads d where d.owner_id=new.owner_id and d.deck_id=deck and d.deleted_at is not null) then raise exception 'Official study set was deleted'; end if;
  if tg_table_name='study_cards' and tg_op='UPDATE' and old.payload ? 'official_pack_id' and
     (new.payload - array['updated_at','content_revision','migration_only']) is distinct from (old.payload - array['updated_at','content_revision','migration_only']) then raise exception 'Official cards are read-only'; end if;
  return new;
end $$;
create trigger official_cards_guard before insert or update on public.study_cards for each row execute function public.guard_official_study_content();
create trigger official_settings_guard before insert or update on public.study_deck_settings for each row execute function public.guard_official_study_content();

create function public.guard_official_study_page() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  -- Do not interfere with the existing explicit account-deletion cascade.
  if tg_op='DELETE' and not exists(select 1 from auth.users u where u.id=old.owner_id) then return old; end if;
  if old.official_pack_id is not null then
    if tg_op='DELETE' or new.deleted_at is not null then
      if exists(select 1 from public.official_study_pack_downloads d where d.owner_id=old.owner_id and d.deck_id=old.id and d.deleted_at is null) then raise exception 'Use official study set deletion'; end if;
    elsif new.title is distinct from old.title or new.kind is distinct from old.kind or new.content_json is distinct from old.content_json or new.study_items is distinct from old.study_items then
      raise exception 'Official study set content is read-only';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger official_page_guard before update or delete on public.pages for each row execute function public.guard_official_study_page();
revoke all on function public.guard_official_study_page() from public,anon,authenticated;

revoke all on function public.list_official_study_packs(),public.download_official_study_pack(text),public.delete_official_study_pack(text),public.guard_official_study_content() from public,anon;
grant execute on function public.list_official_study_packs(),public.download_official_study_pack(text),public.delete_official_study_pack(text) to authenticated;
commit;
