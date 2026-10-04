-- AI round-trip metadata only. Existing Bundle and category schemas are unchanged.
begin;
create table public.dictionary_ai_metadata (
 entry_id uuid primary key references public.dictionary_entries(id) on delete cascade,
 published_entry_id uuid unique references public.dictionary_entries(id),
 origin_ids jsonb not null default '{}',
 component_order uuid[] not null default '{}',
 source_ids uuid[] not null default '{}',
 check (published_entry_id is null or published_entry_id<>entry_id)
);
alter table public.dictionary_ai_metadata enable row level security;
revoke all on public.dictionary_ai_metadata from public,anon,authenticated;
grant select on public.dictionary_ai_metadata to authenticated;
create policy dictionary_ai_admin_read on public.dictionary_ai_metadata for select to authenticated using(public.is_dictionary_admin());

create function public.get_dictionary_ai_snapshot(entry_uuid uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare detail jsonb; result jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
 detail:=public.get_dictionary_entry(entry_uuid);
 if detail is null then return null; end if;
 select jsonb_build_object('detail',detail,
 'grouping',(select jsonb_build_object('primary_category',primary_category,'tags',tags,'variant_group',variant_group) from public.dictionary_entry_groups where id=entry_uuid),
 'sense_groups',coalesce((select jsonb_object_agg(g.sense_id,g.primary_category) from public.dictionary_sense_groups g join public.dictionary_senses s on s.id=g.sense_id where s.entry_id=entry_uuid),'{}'::jsonb),
 'metadata',(select to_jsonb(m) from public.dictionary_ai_metadata m where m.entry_id=entry_uuid),
 'sources',coalesce((select jsonb_agg(s order by s.id) from public.dictionary_sources s where s.id in (
  select source_id from public.dictionary_entries where id=entry_uuid
  union select source_id from public.dictionary_senses where entry_id=entry_uuid
  union select source_id from public.dictionary_relations where entry_id=entry_uuid
  union select source_id from public.dictionary_etymologies where entry_id=entry_uuid
  union select source_id from public.dictionary_learning_notes where entry_id=entry_uuid
  union select unnest(source_ids) from public.dictionary_ai_metadata where entry_id=entry_uuid
 )),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.get_dictionary_ai_snapshot(uuid) from public,anon;
grant execute on function public.get_dictionary_ai_snapshot(uuid) to authenticated;

-- A review draft cannot accidentally be published as a second public homograph.
-- Replacement publication remains outside this first AI round-trip release.
create function public.guard_dictionary_review_publication() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='published' and exists(select 1 from public.dictionary_ai_metadata where entry_id=new.id and published_entry_id is not null) then
  raise exception 'Review drafts cannot be published in this release';
 end if;
 return new;
end $$;
revoke all on function public.guard_dictionary_review_publication() from public,anon,authenticated;
create trigger dictionary_review_publication before update on public.dictionary_entries for each row execute function public.guard_dictionary_review_publication();

create function public.apply_dictionary_ai_change(entry_uuid uuid,expected_snapshot jsonb,bundle jsonb,group_data jsonb,sense_groups jsonb,component_order uuid[],origin_ids jsonb,preview boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_snapshot jsonb; target uuid; entry_kind text; origin_published uuid; old_revision bigint; result jsonb; t text; r jsonb; k text; ids uuid[]; mapped text;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
 perform pg_advisory_xact_lock(710,1);
 if jsonb_typeof(bundle->'dictionary_entries') is distinct from 'array' or jsonb_array_length(bundle->'dictionary_entries')<>1 then raise exception 'Expected one AI entry'; end if;
 target:=(bundle->'dictionary_entries'->0->>'id')::uuid;
 entry_kind:=bundle->'dictionary_entries'->0->>'kind';
 if entry_uuid is not null then
  perform 1 from public.dictionary_entries where id=entry_uuid for update;
  -- Lock children too: direct admin edits need not have advanced the parent revision.
  perform 1 from public.dictionary_senses where entry_id=entry_uuid for update;
  perform 1 from public.dictionary_relations where entry_id=entry_uuid for update;
  perform 1 from public.dictionary_etymologies where entry_id=entry_uuid for update;
  perform 1 from public.dictionary_learning_notes where entry_id=entry_uuid for update;
  current_snapshot:=public.get_dictionary_ai_snapshot(entry_uuid);
  if current_snapshot is null or current_snapshot is distinct from expected_snapshot then raise exception 'Revision conflict: regenerate Diff'; end if;
  if entry_kind is distinct from current_snapshot->'detail'->'entry'->>'kind' then raise exception 'Entry type is immutable'; end if;
  old_revision:=(current_snapshot->'detail'->'entry'->>'revision')::bigint;
  if current_snapshot->'detail'->'entry'->>'status'='published' then
   if target=entry_uuid or exists(select 1 from public.dictionary_entries where id=target) then raise exception 'Published changes require a new review draft'; end if;
   if exists(select 1 from public.dictionary_ai_metadata where published_entry_id=entry_uuid) then raise exception 'Review draft already exists: regenerate Diff against that draft'; end if;
   origin_published:=entry_uuid;
   -- Cloning must retain every original sense/relation/content record.
   foreach t in array array['senses','relations','etymologies','learning_notes'] loop
    k:='dictionary_'||t;
    for r in select value from jsonb_array_elements(current_snapshot->'detail'->t) loop
     mapped:=origin_ids->>(r->>'id');
     if mapped is null or not exists(select 1 from jsonb_array_elements(bundle->k) v where v->>'id'=mapped) then raise exception 'AI cannot omit original clone records'; end if;
    end loop;
   end loop;
  elsif target<>entry_uuid then raise exception 'Draft ID is immutable';
  else
   if (bundle->'dictionary_entries'->0->>'revision')::bigint is distinct from old_revision then raise exception 'Revision conflict'; end if;
   select published_entry_id into origin_published from public.dictionary_ai_metadata where entry_id=target;
  end if;
 else
  if expected_snapshot is not null or exists(select 1 from public.dictionary_entries where id=target) then raise exception 'New entry ID already exists'; end if;
 end if;
 foreach t in array array['dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes'] loop
  if exists(select 1 from jsonb_array_elements(coalesce(bundle->t,'[]'::jsonb)) v where (v->>'entry_id')::uuid is distinct from target) then raise exception 'AI content belongs to another entry'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(coalesce(bundle->'dictionary_sources','[]'::jsonb)) v where v->>'verification' is distinct from 'pending') then raise exception 'AI sources must be pending'; end if;
 begin
  if entry_kind='prefix' then
   result:=public.save_dictionary_prefix_draft(bundle,group_data-'primary_category',sense_groups);
  elsif entry_kind='root' then result:=public.save_dictionary_grouped_draft(bundle,group_data);
  else result:=public.apply_dictionary_bundle(bundle,false,true);
  end if;
  if not exists(select 1 from public.dictionary_entries where id=target and status='draft') then raise exception 'AI saves only drafts'; end if;
  -- Word content-only or ordering-only edits must advance the entry revision once.
  if target=entry_uuid then update public.dictionary_entries set revision=old_revision+1 where id=target and revision=old_revision; end if;
  if exists(select 1 from unnest(component_order) x where not exists(select 1 from public.dictionary_relations where id=x and entry_id=target)) then raise exception 'Invalid component order'; end if;
  select array_agg(distinct id) into ids from (
   select (v->>'id')::uuid as id from jsonb_array_elements(coalesce(bundle->'dictionary_sources','[]'::jsonb)) v
   union select (v->>'id')::uuid from jsonb_array_elements(coalesce(current_snapshot->'sources','[]'::jsonb)) v
  ) all_sources;
  insert into public.dictionary_ai_metadata(entry_id,published_entry_id,origin_ids,component_order,source_ids)
   values(target,origin_published,coalesce(origin_ids,'{}'::jsonb),coalesce(component_order,'{}'),coalesce(ids,'{}'))
   on conflict(entry_id) do update set component_order=excluded.component_order,source_ids=excluded.source_ids;
  result:=jsonb_build_object('entry_id',target,'preview',preview,'result',result);
  if preview then raise exception using errcode='ZX711',detail=result::text; end if;
  return result;
 exception when sqlstate 'ZX711' then get stacked diagnostics k=pg_exception_detail;return k::jsonb;
 end;
end $$;
revoke all on function public.apply_dictionary_ai_change(uuid,jsonb,jsonb,jsonb,jsonb,uuid[],jsonb,boolean) from public,anon;
grant execute on function public.apply_dictionary_ai_change(uuid,jsonb,jsonb,jsonb,jsonb,uuid[],jsonb,boolean) to authenticated;
-- Preserve the existing explicit public allowlist; only relation ordering and explicitly linked source IDs change.
create or replace function public.get_published_dictionary_entry(entry_uuid uuid) returns jsonb
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
    union select unnest(source_ids) from public.dictionary_ai_metadata where entry_id in (select id from visible)
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
    'relations',coalesce((select jsonb_agg(r order by (select array_position(m.component_order,r.id) from public.dictionary_ai_metadata m where m.entry_id=entry_uuid) nulls last,r.id) from relations r),'[]'::jsonb),
    'etymologies',coalesce((select jsonb_agg(h order by id) from histories h),'[]'::jsonb),
    'learning_notes',coalesce((select jsonb_agg(n order by id) from notes n),'[]'::jsonb),
    'sources',coalesce((select jsonb_agg(s order by id) from source_info s),'[]'::jsonb),
    'related',coalesce((select jsonb_agg(r order by headword,sense_id) from related r),'[]'::jsonb))
  from visible v;
$$;
commit;
