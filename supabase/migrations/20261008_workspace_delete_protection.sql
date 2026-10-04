-- Pages / attachment metadata only. Apply manually before releasing the new client.
-- Legacy clients' direct writes are intentionally denied; reads remain owner scoped.
-- No inference/backfill of historical hard deletions, and no tombstone/receipt expiry.
begin;

alter table public.attachments add column if not exists revision bigint not null default 1;

create table public.workspace_tombstones (
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('pages', 'attachments')),
  entity_id text not null,
  id text generated always as (entity_type || ':' || entity_id) stored,
  revision bigint not null check (revision > 0),
  deleted_at bigint not null,
  primary key (owner_id, entity_type, entity_id),
  unique (owner_id, id)
);
create table public.workspace_operation_receipts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  fingerprint text not null,
  result jsonb not null,
  primary key (owner_id, id)
);
alter table public.workspace_tombstones enable row level security;
alter table public.workspace_operation_receipts enable row level security;
create policy workspace_tombstone_owner_read on public.workspace_tombstones
  for select to authenticated using (owner_id = auth.uid());
revoke all on public.workspace_tombstones, public.workspace_operation_receipts from public, anon, authenticated;
grant select on public.workspace_tombstones to authenticated;

revoke insert, update, delete, truncate on public.pages, public.attachments, public.binaries from public, anon, authenticated;
-- Restrictive policies also close any legacy column-level DML grants.
do $$
declare tab text;
begin
  foreach tab in array array['pages','attachments','binaries'] loop
    execute format('create policy workspace_rpc_insert_only on public.%I as restrictive for insert to anon, authenticated with check (false)', tab);
    execute format('create policy workspace_rpc_update_only on public.%I as restrictive for update to anon, authenticated using (false) with check (false)', tab);
    execute format('create policy workspace_rpc_delete_only on public.%I as restrictive for delete to anon, authenticated using (false)', tab);
  end loop;
end $$;

create or replace function public.apply_workspace_operations(operations jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
<<workspace>>
declare
  actor uuid := auth.uid();
  op jsonb; previous public.workspace_operation_receipts%rowtype;
  tomb public.workspace_tombstones%rowtype;
  entity text; entity_id text; action text; operation_id uuid;
  expected bigint; current_revision bigint; next_revision bigint;
  current_row jsonb; next_row jsonb; result jsonb; results jsonb := '[]'::jsonb;
  fingerprint text; stamp bigint; allowed text[]; fields text[];
  column_names text; expressions text; assignments text;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(operations) is distinct from 'array' or jsonb_array_length(operations) = 0 then
    raise exception 'Expected nonempty workspace operation array';
  end if;
  -- Serializes same-owner batches, including creates where no row exists to lock.
  -- The complete batch (e.g. novel parent + chapters), receipts and binaries are atomic.
  perform pg_advisory_xact_lock(hashtextextended('workspace:' || actor::text, 0));
  for op in select value from jsonb_array_elements(operations) loop
    entity := op->>'entity_type'; entity_id := op->>'entity_id'; action := op->>'kind';
    operation_id := (op->>'id')::uuid;
    expected := (op->>'expected_revision')::bigint;
    if entity is null or entity not in ('pages','attachments') or nullif(entity_id,'') is null
       or action is null or action not in ('save','soft_delete','restore','hard_delete','binary')
       or operation_id is null or expected is null or expected < 0 then
      raise exception 'Invalid workspace operation';
    end if;
    fingerprint := encode(sha256(convert_to(op::text, 'UTF8')), 'hex');
    select * into previous from public.workspace_operation_receipts r where r.owner_id = actor and r.id = operation_id;
    if found and previous.fingerprint <> fingerprint then raise exception 'Operation ID payload conflict'; end if;
    select * into tomb from public.workspace_tombstones t
      where t.owner_id = actor and t.entity_type = entity and t.entity_id = workspace.entity_id;
    execute format('select to_jsonb(t) from public.%I t where id = $1 and owner_id = $2 for update', entity)
      into current_row using entity_id, actor;
    if previous.id is not null then
      -- Server may have advanced after a lost response: acknowledge the receipt,
      -- but return today's authoritative state rather than replaying an old row.
      if tomb.entity_id is not null then
        result := jsonb_build_object('entity_type',entity,'entity_id',entity_id,'revision',tomb.revision,'deleted_at',tomb.deleted_at,'hard_deleted',true);
      elsif current_row is not null then
        result := jsonb_build_object('entity_type',entity,'entity_id',entity_id,'revision',current_row->'revision','deleted_at',current_row->'deleted_at','hard_deleted',false,'row',current_row);
      else
        result := previous.result;
      end if;
      results := results || jsonb_build_array(result);
      continue;
    end if;
    if tomb.entity_id is not null then raise exception 'Workspace object permanently deleted'; end if;
    current_revision := coalesce((current_row->>'revision')::bigint, 0);
    if current_revision <> expected then raise exception 'Workspace revision conflict'; end if;
    if current_row is null and action <> 'save' then raise exception 'Workspace object not found'; end if;
    if action = 'save' and (current_row->>'deleted_at' is not null or op->'value'->>'deleted_at' is not null) then
      raise exception 'Deleted objects require explicit restore';
    end if;
    next_revision := current_revision + 1;
    stamp := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
    if action = 'hard_delete' then
      insert into public.workspace_tombstones(owner_id, entity_type, entity_id, revision, deleted_at)
        values (actor, entity, entity_id, next_revision, stamp);
      -- Failure to remove binary rolls back metadata/tombstone/receipt as well.
      if entity = 'attachments' then delete from public.binaries where id = entity_id and owner_id = actor; end if;
      execute format('delete from public.%I where id = $1 and owner_id = $2', entity) using entity_id, actor;
      result := jsonb_build_object('entity_type',entity,'entity_id',entity_id,'revision',next_revision,'deleted_at',stamp,'hard_deleted',true);
    else
      if action = 'save' then
        if jsonb_typeof(op->'value') is distinct from 'object' or op->'value'->>'id' is distinct from entity_id then
          raise exception 'Invalid workspace record';
        end if;
        allowed := case when entity = 'pages' then array[
          'title','content_json','content_text','default_mode','device_id','tags','folder','links',
          'attachment_ids','primary_attachment_id','kind','study_items','presentation_data','is_favorite',
          'format','sort_order','parent_id','margins','due_date','priority','completed','color',
          'creative_type','character_data','novel_settings','assistant_blocks'
        ] else array['kind','name','mime_type','size_bytes','storage_key','device_id','page_count'] end;
        select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into next_row
          from jsonb_each(op->'value') e(k,v) where k = any(allowed);
        next_row := next_row || jsonb_build_object('id',entity_id,'owner_id',actor,'revision',next_revision,'updated_at',stamp,'deleted_at',null,
          'created_at',coalesce(current_row->'created_at',op->'value'->'created_at',to_jsonb(stamp)));
        select array_agg(k order by k) into fields from jsonb_object_keys(next_row) k;
        select string_agg(format('%I', f), ', '),
          string_agg(format('(jsonb_populate_record(null::public.%I, $1)).%I', entity, f), ', '),
          string_agg(format('%I = (jsonb_populate_record(null::public.%I, $1)).%I', f, entity, f), ', ')
          into column_names, expressions, assignments from unnest(fields) f;
        if current_row is null then
          execute format('insert into public.%I (%s) select %s returning to_jsonb(%I.*)', entity, column_names, expressions, entity)
            into current_row using next_row;
        else
          execute format('update public.%I set %s where id = $2 and owner_id = $3 returning to_jsonb(%I.*)', entity, assignments, entity)
            into current_row using next_row, entity_id, actor;
        end if;
      else
        if action = 'binary' then
          if entity <> 'attachments' or current_row->>'deleted_at' is not null or jsonb_typeof(op->'data') is distinct from 'string' then
            raise exception 'Binary requires a live attachment';
          end if;
          if exists(select 1 from public.binaries where id = entity_id and owner_id is distinct from actor) then
            raise exception 'Binary ownership mismatch' using errcode = '42501';
          end if;
          insert into public.binaries(id, owner_id, data, updated_at) values (entity_id, actor, op->>'data', stamp)
            on conflict(id) do update set data = excluded.data, updated_at = excluded.updated_at;
        end if;
        execute format('update public.%I set revision = $1, updated_at = $2, deleted_at = $3 where id = $4 and owner_id = $5 returning to_jsonb(%I.*)', entity, entity)
          into current_row using next_revision, stamp,
            case when action = 'soft_delete' then stamp when action = 'restore' then null else (current_row->>'deleted_at')::bigint end, entity_id, actor;
      end if;
      result := jsonb_build_object('entity_type',entity,'entity_id',entity_id,'revision',next_revision,'deleted_at',current_row->'deleted_at','hard_deleted',false,'row',current_row);
    end if;
    -- Compact durable receipts: fingerprints + result metadata, never content/binary snapshots.
    insert into public.workspace_operation_receipts(owner_id,id,fingerprint,result) values(actor,operation_id,fingerprint,result - 'row');
    results := results || jsonb_build_array(result);
  end loop;
  return results;
end $$;
revoke all on function public.apply_workspace_operations(jsonb) from public, anon;
grant execute on function public.apply_workspace_operations(jsonb) to authenticated;

-- Tombstone INSERT events are reliable even when Realtime DELETE only has a PK.
do $$
begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.workspace_tombstones;
  end if;
end $$;
commit;
