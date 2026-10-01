-- Dictionary group_data is separate from the unchanged JSON Bundle contract.
begin;
create table public.dictionary_entry_groups (
  id uuid primary key references public.dictionary_entries(id),
  primary_category text check (primary_category in ('空間、位置與環境','動作、接觸與物理作用','移動、轉變與方向','物質、自然與元素','生命、身體與感官','情感、心理與意志','心智、溝通與學習','社會、法律與制度','時間、狀態、數量與邏輯')),
  tags text[] not null default '{}',
  variant_group text,
  check (array_position(tags,null) is null),
  check (variant_group is null or length(btrim(variant_group))>0)
);
alter table public.dictionary_entry_groups enable row level security;
revoke all on public.dictionary_entry_groups from public,anon,authenticated;
grant select on public.dictionary_entry_groups to authenticated;
create policy dictionary_groups_read on public.dictionary_entry_groups for select to authenticated
using (public.is_dictionary_admin() or exists(select 1 from public.dictionary_entries e where e.id=dictionary_entry_groups.id and e.status='published'));
create index dictionary_groups_category on public.dictionary_entry_groups(primary_category,id);
create trigger dictionary_groups_audit after insert or update on public.dictionary_entry_groups
for each row execute function public.dictionary_audit_change();

-- A single transaction saves content, technical revision, group_data and audit records.
-- Only this explicit admin RPC can write group_data; the original importer is unchanged.
create function public.save_dictionary_grouped_draft(bundle jsonb,group_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare entry_uuid uuid; entry_kind text; entry_status text; result jsonb; previous_revision bigint; saved_revision bigint;
begin
  if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
  if jsonb_typeof(bundle->'dictionary_entries') is distinct from 'array' or jsonb_array_length(bundle->'dictionary_entries')<>1 then raise exception 'Expected one draft entry'; end if;
  if jsonb_typeof(group_data) is distinct from 'object' then raise exception 'Invalid group_data'; end if;
  if exists(select 1 from jsonb_object_keys(group_data) k where k not in ('primary_category','tags','variant_group')) then raise exception 'Unknown group_data field'; end if;
  if jsonb_typeof(group_data->'tags') is distinct from 'array' then raise exception 'Expected tags array'; end if;
  if exists(select 1 from jsonb_array_elements(group_data->'tags') v where jsonb_typeof(v)<>'string' or btrim(v#>>'{}')='') then raise exception 'Invalid tag'; end if;
  if (group_data ? 'primary_category' and jsonb_typeof(group_data->'primary_category') not in ('string','null')) or
     (group_data ? 'variant_group' and jsonb_typeof(group_data->'variant_group') not in ('string','null')) then raise exception 'Invalid group_data text'; end if;
  -- Match the bundle lock order to avoid deadlocks, and lock the parent through the save.
  perform pg_advisory_xact_lock(710,1);
  entry_uuid:=(bundle->'dictionary_entries'->0->>'id')::uuid;
  perform 1 from public.dictionary_entries where id=entry_uuid for update;
  -- Group-only edits must also use the current technical revision.
  if exists(select 1 from public.dictionary_entries e where e.id=entry_uuid and e.revision is distinct from (bundle->'dictionary_entries'->0->>'revision')::bigint) then raise exception 'Revision conflict'; end if;
  select revision into previous_revision from public.dictionary_entries where id=entry_uuid;
  result:=public.apply_dictionary_bundle(bundle,false,true);
  select kind,status,revision into entry_kind,entry_status,saved_revision from public.dictionary_entries where id=entry_uuid for update;
  if entry_kind not in ('prefix','root') or entry_status<>'draft' then raise exception 'Only prefix/root drafts support group_data edits'; end if;
  -- Inserts start at revision 1. Content updates already advance the entry revision.
  -- Only when the bundle skipped the entry (e.g. a grouping-only edit) advance it here.
  -- The existing guard trigger also sets OLD.revision + 1, not NEW.revision + 1.
  if previous_revision is not null and saved_revision=previous_revision then
    update public.dictionary_entries set revision=previous_revision+1
    where id=entry_uuid and revision=previous_revision;
  end if;
  insert into public.dictionary_entry_groups(id,primary_category,tags,variant_group)
  values(entry_uuid,group_data->>'primary_category',array(select distinct v from jsonb_array_elements_text(group_data->'tags') v order by v),nullif(btrim(group_data->>'variant_group'),''))
  on conflict(id) do update set primary_category=excluded.primary_category,tags=excluded.tags,variant_group=excluded.variant_group;
  return result;
end $$;
revoke all on function public.save_dictionary_grouped_draft(jsonb,jsonb) from public,anon;
grant execute on function public.save_dictionary_grouped_draft(jsonb,jsonb) to authenticated;

create function public.search_grouped_dictionary(category text,query_text text default '',page_number integer default 0,primary_category_filter text default '__ungrouped__')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if category is null or category not in ('prefix','root') then raise exception 'Invalid category'; end if;
  if page_number is null or page_number<0 or page_number>100000 then raise exception 'Invalid page'; end if;
  if query_text is null or length(query_text)>120 then raise exception 'Invalid query'; end if;
  if primary_category_filter is null or primary_category_filter not in ('__ungrouped__','空間、位置與環境','動作、接觸與物理作用','移動、轉變與方向','物質、自然與元素','生命、身體與感官','情感、心理與意志','心智、溝通與學習','社會、法律與制度','時間、狀態、數量與邏輯') then raise exception 'Invalid group'; end if;
  with page_rows as (
    select e.id,e.kind,e.headword,g.primary_category,g.tags,g.variant_group
    from public.dictionary_entries e left join public.dictionary_entry_groups g on g.id=e.id
    where e.status='published' and e.kind=category and strpos(lower(e.headword),lower(btrim(query_text)))>0
      and (case when primary_category_filter='__ungrouped__' then g.primary_category is null else g.primary_category=primary_category_filter end)
    order by e.headword,e.id limit 21 offset page_number*20
  ), shown as (select * from page_rows order by headword,id limit 20)
  select jsonb_build_object('items',coalesce((select jsonb_agg(s order by headword,id) from shown s),'[]'::jsonb),'has_more',(select count(*)>20 from page_rows),'page',page_number) into result;
  return result;
end $$;
revoke all on function public.search_grouped_dictionary(text,text,integer,text) from public,anon;
grant execute on function public.search_grouped_dictionary(text,text,integer,text) to authenticated;
commit;
