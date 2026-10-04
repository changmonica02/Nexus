-- Prefix learning categories belong to senses; existing entry groups/data are retained.
begin;
create table public.dictionary_sense_groups (
  sense_id uuid primary key references public.dictionary_senses(id) on delete cascade,
  primary_category text check (primary_category in ('性質、評價與否定','位置、方向與關係','數值、量與程度','作用與變化'))
);
create index dictionary_sense_groups_category on public.dictionary_sense_groups(primary_category,sense_id);
alter table public.dictionary_sense_groups enable row level security;
revoke all on public.dictionary_sense_groups from public,anon,authenticated;
grant select on public.dictionary_sense_groups to authenticated;
create policy dictionary_sense_groups_read on public.dictionary_sense_groups for select to authenticated
using (public.is_dictionary_admin() or exists (
  select 1 from public.dictionary_senses s join public.dictionary_entries e on e.id=s.entry_id
  where s.id=dictionary_sense_groups.sense_id and e.status='published'
));

-- Includes cascaded metadata removal when an explicitly deleted draft sense is removed.
create function public.audit_dictionary_sense_group() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,before_row,after_row)
  values(auth.uid(),session_user,tg_table_name,
    case when tg_op='DELETE' then old.sense_id else new.sense_id end,tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op='DELETE' then null else to_jsonb(new) end);
  return null;
end $$;
revoke all on function public.audit_dictionary_sense_group() from public,anon,authenticated;
create trigger dictionary_sense_groups_audit after insert or update or delete on public.dictionary_sense_groups
for each row execute function public.audit_dictionary_sense_group();

-- New envelope, unchanged JSON Bundle. No direct client writes to classification tables.
create function public.save_dictionary_prefix_draft(bundle jsonb,group_data jsonb,sense_groups jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare entry_uuid uuid; legacy_category text; row_data jsonb; sense_uuid uuid; result jsonb;
begin
  if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
  if jsonb_typeof(bundle->'dictionary_entries') is distinct from 'array' or jsonb_array_length(bundle->'dictionary_entries')<>1 then raise exception 'Expected one prefix draft'; end if;
  if bundle->'dictionary_entries'->0->>'kind' is distinct from 'prefix' then raise exception 'Expected prefix draft'; end if;
  if jsonb_typeof(group_data) is distinct from 'object' then raise exception 'Invalid group_data'; end if;
  if exists(select 1 from jsonb_object_keys(group_data) k where k not in ('tags','variant_group')) then raise exception 'Prefix entry grouping accepts only tags and variant_group'; end if;
  if jsonb_typeof(sense_groups) is distinct from 'array' then raise exception 'Expected sense_groups array'; end if;
  for row_data in select value from jsonb_array_elements(sense_groups) loop
    if jsonb_typeof(row_data) is distinct from 'object' then raise exception 'Invalid sense group'; end if;
    if jsonb_typeof(row_data->'sense_id') is distinct from 'string' or not (row_data ? 'primary_category') then raise exception 'Missing sense group fields'; end if;
    if jsonb_typeof(row_data->'primary_category') not in ('string','null') then raise exception 'Invalid primary_category'; end if;
    if exists(select 1 from jsonb_object_keys(row_data) k where k not in ('sense_id','primary_category')) then raise exception 'Unknown sense group field'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(sense_groups) r group by (r->>'sense_id')::uuid having count(*)>1) then raise exception 'Duplicate sense ID'; end if;
  perform pg_advisory_xact_lock(710,1);
  entry_uuid:=(bundle->'dictionary_entries'->0->>'id')::uuid;
  -- Do not erase or migrate legacy Prefix entry categories while saving tags/variants.
  select primary_category into legacy_category from public.dictionary_entry_groups where id=entry_uuid;
  -- This existing RPC locks the parent, checks its revision and draft status, and advances
  -- the entry revision exactly once. Any subsequent error rolls back the whole save.
  result:=public.save_dictionary_grouped_draft(bundle,group_data||jsonb_build_object('primary_category',legacy_category));
  for row_data in select value from jsonb_array_elements(sense_groups) loop
    sense_uuid:=(row_data->>'sense_id')::uuid;
    perform 1 from public.dictionary_senses where id=sense_uuid and entry_id=entry_uuid for update;
    if not found then raise exception 'Sense does not belong to this prefix'; end if;
    insert into public.dictionary_sense_groups(sense_id,primary_category)
      values(sense_uuid,row_data->>'primary_category')
      on conflict(sense_id) do update set primary_category=excluded.primary_category;
  end loop;
  return result;
end $$;
revoke all on function public.save_dictionary_prefix_draft(jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_dictionary_prefix_draft(jsonb,jsonb,jsonb) to authenticated;

create function public.search_prefix_dictionary(query_text text default '',page_number integer default 0,primary_category_filter text default '__ungrouped__')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if page_number is null or page_number<0 or page_number>100000 then raise exception 'Invalid page'; end if;
  if query_text is null or length(query_text)>120 then raise exception 'Invalid query'; end if;
  if primary_category_filter is null or primary_category_filter not in ('__ungrouped__','性質、評價與否定','位置、方向與關係','數值、量與程度','作用與變化') then raise exception 'Invalid prefix group'; end if;
  with page_rows as (
    select e.id,e.kind,e.headword,s.id as sense_id,s.gloss_zh_tw,g.primary_category
    from public.dictionary_entries e join public.dictionary_senses s on s.entry_id=e.id
    left join public.dictionary_sense_groups g on g.sense_id=s.id
    where e.kind='prefix' and e.status='published' and strpos(lower(e.headword),lower(btrim(query_text)))>0
      and (case when primary_category_filter='__ungrouped__' then g.primary_category is null else g.primary_category=primary_category_filter end)
    order by e.headword,e.id,s.id limit 21 offset page_number*20
  ), shown as (select * from page_rows order by headword,id,sense_id limit 20)
  select jsonb_build_object('items',coalesce((select jsonb_agg(s order by headword,id,sense_id) from shown s),'[]'::jsonb),
    'has_more',(select count(*)>20 from page_rows),'page',page_number) into result;
  return result;
end $$;
revoke all on function public.search_prefix_dictionary(text,integer,text) from public,anon;
grant execute on function public.search_prefix_dictionary(text,integer,text) to authenticated;

-- Keep the old endpoint compatible, but never classify Prefix by entry metadata.
create or replace function public.search_grouped_dictionary(category text,query_text text default '',page_number integer default 0,primary_category_filter text default '__ungrouped__')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
  if category='prefix' then return public.search_prefix_dictionary(query_text,page_number,primary_category_filter); end if;
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
commit;
