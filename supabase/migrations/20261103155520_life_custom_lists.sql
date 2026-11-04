-- Additive only. Apply before the client release; no production data cleanup.
begin;
create table public.life_lists (
 id text primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 500), fields jsonb not null default '[]',
 schema_version integer not null check(schema_version>0), sort_order double precision not null default 0,
 revision bigint not null check(revision>0), created_at bigint not null, updated_at bigint not null, deleted_at bigint,
 unique(owner_id,id), check(jsonb_typeof(fields)='array')
);
create table public.life_categories (
 id text primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 list_id text not null, parent_id text, title text not null check(length(trim(title)) between 1 and 500),
 sort_order double precision not null default 0,revision bigint not null check(revision>0),created_at bigint not null,updated_at bigint not null,deleted_at bigint,
 unique(owner_id,list_id,id), foreign key(owner_id,list_id) references public.life_lists(owner_id,id),
 foreign key(owner_id,list_id,parent_id) references public.life_categories(owner_id,list_id,id) deferrable initially deferred
);
create table public.life_items (
 id text primary key,owner_id uuid not null references auth.users(id) on delete cascade,
 list_id text not null,category_id text,title text not null check(length(trim(title)) between 1 and 500),
 "values" jsonb not null default '{}',attachment_ids jsonb not null default '[]',schema_version integer not null check(schema_version>0),
 sort_order double precision not null default 0,revision bigint not null check(revision>0),created_at bigint not null,updated_at bigint not null,deleted_at bigint,
 foreign key(owner_id,list_id) references public.life_lists(owner_id,id),
 foreign key(owner_id,list_id,category_id) references public.life_categories(owner_id,list_id,id) deferrable initially deferred,
 check(jsonb_typeof("values")='object'),check(jsonb_typeof(attachment_ids)='array')
);
create index life_categories_owner_list on public.life_categories(owner_id,list_id);
create index life_categories_parent on public.life_categories(owner_id,list_id,parent_id);
create index life_items_owner_list on public.life_items(owner_id,list_id);
create index life_items_category on public.life_items(owner_id,list_id,category_id);
do $$ declare tab text;begin
 foreach tab in array array['life_lists','life_categories','life_items'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('create policy life_owner_read on public.%I for select to authenticated using(owner_id=(select auth.uid()))',tab);
  execute format('revoke all on public.%I from public,anon,authenticated',tab);
  execute format('grant select on public.%I to authenticated',tab);
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then execute format('alter publication supabase_realtime add table public.%I',tab);end if;
 end loop;
end $$;

-- Called inside the existing owner-serialized workspace RPC transaction.
create function public.validate_life_workspace(actor uuid) returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
declare l record;i record;c record;f jsonb;v jsonb;k text;ids jsonb;seen text[];cursor_id text;next_parent text;
begin
 for l in select * from public.life_lists where owner_id=actor loop
  if jsonb_array_length(l.fields)>100 or exists(select 1 from jsonb_array_elements(l.fields) x group by x->>'id' having count(*)>1) then raise exception 'Invalid list fields';end if;
  for f in select value from jsonb_array_elements(l.fields) loop
   if jsonb_typeof(f) is distinct from 'object' or jsonb_typeof(f->'id') is distinct from 'string' or jsonb_typeof(f->'name') is distinct from 'string' or (f ? 'archived' and jsonb_typeof(f->'archived') is distinct from 'boolean') or nullif(f->>'id','') is null or nullif(trim(f->>'name'),'') is null or f->>'type' is null or f->>'type' not in ('text','longtext','number','money','date','select','checkbox','image','attachment') then raise exception 'Invalid field definition';end if;
   if f ? 'options' then
    if jsonb_typeof(f->'options') is distinct from 'array' then raise exception 'Invalid options';end if;
    if exists(select 1 from jsonb_array_elements(f->'options') x where jsonb_typeof(x)<>'string') or exists(select 1 from jsonb_array_elements(f->'options') x group by x having count(*)>1) then raise exception 'Invalid options';end if;
   end if;
  end loop;
 end loop;
 for c in select * from public.life_categories where owner_id=actor loop
  if c.deleted_at is null and not exists(select 1 from public.life_lists where owner_id=actor and id=c.list_id and deleted_at is null) then raise exception 'List is deleted';end if;
  seen:=array[c.id];cursor_id:=c.parent_id;
  while cursor_id is not null loop
   if cursor_id=any(seen) then raise exception 'Category cycle';end if;
   select parent_id into next_parent from public.life_categories where owner_id=actor and list_id=c.list_id and id=cursor_id and (c.deleted_at is not null or deleted_at is null);
   if not found then raise exception 'Invalid category parent';end if;
   seen:=array_append(seen,cursor_id);cursor_id:=next_parent;
  end loop;
 end loop;
 for i in select * from public.life_items where owner_id=actor loop
  select * into l from public.life_lists where owner_id=actor and id=i.list_id;
  if not found or i.schema_version>l.schema_version or i.deleted_at is null and l.deleted_at is not null then raise exception 'Invalid list membership or schema';end if;
  if i.category_id is not null and not exists(select 1 from public.life_categories where owner_id=actor and list_id=i.list_id and id=i.category_id and (i.deleted_at is not null or deleted_at is null)) then raise exception 'Invalid item category';end if;
  ids:='[]';
  for k,v in select * from jsonb_each(i.values) loop
   select value into f from jsonb_array_elements(l.fields) where value->>'id'=k;
   if not found then raise exception 'Unknown field';end if;
   if v='null'::jsonb or v='""'::jsonb then continue;end if;
   case f->>'type'
    when 'checkbox' then if jsonb_typeof(v)<>'boolean' then raise exception 'Invalid checkbox';end if;
    when 'number' then if jsonb_typeof(v)<>'number' then raise exception 'Invalid number';end if;
    when 'money' then if jsonb_typeof(v) is distinct from 'object' or jsonb_typeof(v->'amount') is distinct from 'string' or (v->>'amount') !~ '^-?[0-9]+(\.[0-9]+)?$' or coalesce(v->>'currency','') !~ '^[A-Z]{3}$' then raise exception 'Invalid money';end if;
    when 'image','attachment' then
     if jsonb_typeof(v)<>'array' then raise exception 'Invalid attachments';end if;
     if exists(select 1 from jsonb_array_elements(v) x where jsonb_typeof(x)<>'string') then raise exception 'Invalid attachment ID';end if;
     ids:=ids||v;
    else
     if jsonb_typeof(v)<>'string' then raise exception 'Invalid field value';end if;
     if f->>'type'='date' then
      if v#>>'{}' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid date';end if;
      perform (v#>>'{}')::date;
     end if;
     if f->>'type'='select' and not coalesce(f->'options','[]'::jsonb) @> jsonb_build_array(v) then raise exception 'Invalid option';end if;
   end case;
  end loop;
  select coalesce(jsonb_agg(x order by x),'[]') into ids from (select distinct value x from jsonb_array_elements(ids)) a;
  if ids is distinct from (select coalesce(jsonb_agg(x order by x),'[]') from (select value x from jsonb_array_elements(i.attachment_ids)) a) then raise exception 'Attachment references mismatch';end if;
  if i.deleted_at is null and exists(select 1 from jsonb_array_elements_text(ids) x where not exists(select 1 from public.attachments a where a.id=x and a.owner_id=actor and a.deleted_at is null)) then raise exception 'Attachment is deleted or belongs to another account';end if;
 end loop;
end $$;
revoke all on function public.validate_life_workspace(uuid) from public,anon,authenticated;

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
  fingerprint text; stamp bigint; allowed text[]; fields text[]; life_changed boolean:=false; old_field jsonb; new_field jsonb;
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
    if entity is null or entity not in ('pages','attachments','life_lists','life_categories','life_items') or nullif(entity_id,'') is null
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
    if entity like 'life_%' then
      life_changed:=true;
      -- No public hard purge: soft deletion preserves barriers for long-offline clients.
      if action not in ('save','soft_delete','restore') then raise exception 'Unsupported list operation';end if;
      if action='save' then
        if entity<>'life_lists' and current_row is not null and current_row->>'list_id' is distinct from op->'value'->>'list_id' then raise exception 'Cross-list move forbidden';end if;
        if entity='life_items' and not exists(select 1 from public.life_lists where owner_id=actor and id=op->'value'->>'list_id' and deleted_at is null and schema_version=(op->'value'->>'schema_version')::integer) then raise exception 'List schema changed; reload required';end if;
        if entity='life_lists' and current_row is not null then
          for old_field in select value from jsonb_array_elements(current_row->'fields') loop
            select value into new_field from jsonb_array_elements(op->'value'->'fields') where value->>'id'=old_field->>'id';
            if not found then raise exception 'Archive fields instead of deleting values';end if;
            if old_field->>'type' is distinct from new_field->>'type' and exists(select 1 from public.life_items where owner_id=actor and list_id=entity_id and "values"->(old_field->>'id') is not null and "values"->(old_field->>'id') not in ('null'::jsonb,'""'::jsonb)) then raise exception 'Field has values; add another field';end if;
          end loop;
          if (op->'value'->>'schema_version')::integer < (current_row->>'schema_version')::integer or (op->'value'->>'schema_version')::integer > (current_row->>'schema_version')::integer+1 then raise exception 'Invalid schema version';end if;
          if exists(select 1 from jsonb_array_elements(op->'value'->'fields') n where not exists(select 1 from jsonb_array_elements(current_row->'fields') o where o->>'id'=n->>'id' and o->>'type'=n->>'type')) and (op->'value'->>'schema_version')::integer<>(current_row->>'schema_version')::integer+1 then raise exception 'Schema revision required';end if;
        end if;
      end if;
    elsif entity='attachments' and action in ('soft_delete','hard_delete') then life_changed:=true;
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
         ] when entity='life_lists' then array['title','fields','schema_version','sort_order']
          when entity='life_categories' then array['title','list_id','parent_id','sort_order']
          when entity='life_items' then array['title','list_id','category_id','values','attachment_ids','schema_version','sort_order']
          else array['kind','name','mime_type','size_bytes','storage_key','device_id','page_count'] end;
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
  if life_changed then perform public.validate_life_workspace(actor);end if;
  return results;
end $$;
revoke all on function public.apply_workspace_operations(jsonb) from public, anon;
grant execute on function public.apply_workspace_operations(jsonb) to authenticated;


commit;
