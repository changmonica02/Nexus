begin;
do $patch$
declare
  definition text := pg_get_functiondef('public.apply_workspace_operations(jsonb)'::regprocedure);
  anchor text := $$    if tomb.entity_id is not null then raise exception 'Workspace object permanently deleted'; end if;$$;
begin
  if strpos(definition,anchor)=0 or strpos(definition,'^automation:[0-9a-f]{64}$')=0 then
    raise exception 'Review the workspace RPC and apply the schedule automation migration first';
  end if;
  definition := replace(definition,anchor,
    $$    if entity='pages' and action='save' and expected=0
          and entity_id ~ '^automation_task_[0-9a-f]{64}$' and op->'value'->>'kind'='todo' then
      if tomb.entity_id is not null then
        result := jsonb_build_object('entity_type',entity,'entity_id',entity_id,
          'revision',tomb.revision,'deleted_at',tomb.deleted_at,'hard_deleted',true);
      elsif current_row->>'kind'='todo' then
        result := jsonb_build_object('entity_type',entity,'entity_id',entity_id,
          'revision',current_row->'revision','deleted_at',current_row->'deleted_at','hard_deleted',false,'row',current_row);
      else
        result := null;
      end if;
      if result is not null then
        results := results || jsonb_build_array(result);
        continue;
      end if;
    end if;
    if tomb.entity_id is not null then raise exception 'Workspace object permanently deleted'; end if;$$);
  execute definition;
end $patch$;
commit;
