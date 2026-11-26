begin;
alter table public.life_finance_records drop constraint life_finance_records_kind_check;
alter table public.life_finance_records add constraint life_finance_records_kind_check
  check (kind in ('account','transaction','estimate','preferences','budget','subscription','asset','goal','contribution','instrument','trade'));
alter table public.life_finance_records add constraint life_finance_estimate_check
  check (kind <> 'estimate' or coalesce(
    jsonb_typeof(payload->'amount')='string' and payload->>'amount' ~ '^[0-9]{1,24}$' and payload->>'amount' ~ '[1-9]'
    and payload->>'currency' in ('TWD','USD','JPY','EUR','SGD','GBP','HKD','KRW','CAD','AUD','CHF','CNY','KWD')
    and payload->>'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and (payload->>'date')::date is not null and length(btrim(payload->>'title')) between 1 and 160
    and jsonb_typeof(payload->'notes')='string' and length(payload->>'notes')<=4000
    and jsonb_typeof(payload->'category')='string',false));

do $patch$
declare definition text := pg_get_functiondef('public.apply_workspace_operations(jsonb)'::regprocedure);
begin
  definition := replace(definition,
    '  column_names text; expressions text; assignments text;',
    '  column_names text; expressions text; assignments text; automation_failure text;');
  definition := replace(definition,
    $$    if current_row is null and action <> 'save' then raise exception 'Workspace object not found'; end if;$$,
    $$    if entity='life_automation_runs' and automation_failure is not null then
      op := jsonb_set(op,'{value,run,error}',to_jsonb(automation_failure));
      automation_failure := null;
    end if;
    if current_row is null and action <> 'save' then raise exception 'Workspace object not found'; end if;$$);
  definition := replace(definition,
    $$    if current_revision <> expected then raise exception 'Workspace revision conflict'; end if;$$,
    $$    if action='save' and expected=0 and current_row is not null and (
        entity='life_finance_records' and entity_id ~ '^automation_estimate_[0-9a-f]{64}$'
          and current_row->>'kind'='estimate' and op->'value'->>'kind'='estimate'
        or entity='life_items' and entity_id ~ '^automation_relation_[0-9a-f]{64}$'
          and current_row->>'list_id'=op->'value'->>'list_id') then
      results := results || jsonb_build_array(jsonb_build_object('entity_type',entity,'entity_id',entity_id,
        'revision',current_row->'revision','deleted_at',current_row->'deleted_at','hard_deleted',false,'row',current_row));
      continue;
    end if;
    if op ? 'automation_field' then
      if entity<>'pages' or action<>'save' or current_row->>'kind' is distinct from 'todo'
        or current_row->>'deleted_at' is not null or coalesce(op->>'automation_field','') not in ('title','priority','completed')
        or not (op->'value' ? (op->>'automation_field'))
        or (op->>'automation_field'='completed' and (current_row->>'task_repeat' is not null
          or jsonb_typeof(op->'value'->'completed') is distinct from 'boolean'))
        or (op->>'automation_field'='priority' and coalesce(op->'value'->>'priority','') not in ('low','medium','high'))
        or (op->>'automation_field'='title' and (jsonb_typeof(op->'value'->'title') is distinct from 'string'
          or coalesce(length(btrim(op->'value'->>'title')),0) not between 1 and 100))
      then raise exception 'Invalid automation task update'; end if;
      if current_row->(op->>'automation_field') is not distinct from op->'value'->(op->>'automation_field') then
        results := results || jsonb_build_array(jsonb_build_object('entity_type',entity,'entity_id',entity_id,
          'revision',current_row->'revision','deleted_at',current_row->'deleted_at','hard_deleted',false,'row',current_row));
        continue;
      end if;
      if current_revision <> expected and jsonb_array_length(operations)=2 and operations->0->>'id'=operation_id::text
        and operations->1->>'entity_type'='life_automation_runs' and operations->1->>'kind'='save' then
        automation_failure := '待辦已在其他裝置更新，請確認後重試。';
        result := jsonb_build_object('entity_type',entity,'entity_id',entity_id,
          'revision',current_row->'revision','deleted_at',current_row->'deleted_at','hard_deleted',false,'row',current_row);
        insert into public.workspace_operation_receipts(owner_id,id,fingerprint,result) values(actor,operation_id,fingerprint,result - 'row');
        results := results || jsonb_build_array(result);
        continue;
      end if;
      op := jsonb_set(op,'{value}',jsonb_build_object('id',entity_id,op->>'automation_field',op->'value'->(op->>'automation_field')));
    end if;
    if current_revision <> expected then raise exception 'Workspace revision conflict'; end if;
    if entity='life_items' and action='save' and current_row is null and entity_id ~ '^automation_relation_[0-9a-f]{64}$'
      and not exists (
        select 1 from public.life_lists l
        cross join lateral jsonb_array_elements(l.fields) f
        where l.owner_id=actor and l.id=op->'value'->>'list_id' and l.deleted_at is null
          and l.schema_version=(op->'value'->>'schema_version')::integer
          and coalesce(f->>'archived','false')='false'
          and (f->>'relation'='task' and exists (
            select 1 from public.pages p where p.owner_id=actor and p.kind='todo' and p.deleted_at is null
              and p.id=op->'value'->'values'->>(f->>'id'))
          or f->>'relation' in ('schedule','milestone') and exists (
            select 1 from public.life_schedule_events s where s.owner_id=actor and s.deleted_at is null
              and (s.milestone is not null)=(f->>'relation'='milestone') and s.id=op->'value'->'values'->>(f->>'id')))
      ) then
      if jsonb_array_length(operations)<>2 or operations->0->>'id' is distinct from operation_id::text
        or operations->1->>'entity_type' is distinct from 'life_automation_runs' or operations->1->>'kind' is distinct from 'save'
      then raise exception 'Automation relation source unavailable'; end if;
      automation_failure := '關聯來源已刪除或欄位已變更，請確認後重試。';
      result := jsonb_build_object('entity_type',entity,'entity_id',entity_id,'revision',0,'deleted_at',null,
        'hard_deleted',false,'discarded',true);
      insert into public.workspace_operation_receipts(owner_id,id,fingerprint,result) values(actor,operation_id,fingerprint,result);
      results := results || jsonb_build_array(result);
      continue;
    end if;$$);
  definition := replace(definition,
    $$    if tomb.entity_id is not null then raise exception 'Workspace object permanently deleted'; end if;$$,
    $$    if entity='pages' and action='save' and op ? 'automation_field'
      and (tomb.entity_id is not null or current_row->>'deleted_at' is not null)
      and jsonb_array_length(operations)=2 and operations->0->>'id'=operation_id::text
      and operations->1->>'entity_type'='life_automation_runs' and operations->1->>'kind'='save' then
      automation_failure := '待辦已刪除，請選擇其他待辦後重試。';
      if tomb.entity_id is not null then
        result := jsonb_build_object('entity_type',entity,'entity_id',entity_id,'revision',tomb.revision,
          'deleted_at',tomb.deleted_at,'hard_deleted',true);
      else
        result := jsonb_build_object('entity_type',entity,'entity_id',entity_id,'revision',current_row->'revision',
          'deleted_at',current_row->'deleted_at','hard_deleted',false,'row',current_row);
      end if;
      insert into public.workspace_operation_receipts(owner_id,id,fingerprint,result) values(actor,operation_id,fingerprint,result - 'row');
      results := results || jsonb_build_array(result);
      continue;
    end if;
    if tomb.entity_id is not null then raise exception 'Workspace object permanently deleted'; end if;$$);
  if strpos(definition,'Invalid automation task update')=0 or strpos(definition,'Automation relation source unavailable')=0
    or strpos(definition,'automation_failure text;')=0 or strpos(definition,'{value,run,error}')=0
    or strpos(definition,'^automation_estimate_[0-9a-f]{64}$')=0 then
    raise exception 'Unexpected workspace RPC definition';
  end if;
  execute definition;
end $patch$;
commit;
