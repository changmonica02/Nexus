begin;
do $patch$
declare definition text := pg_get_functiondef('public.apply_workspace_operations(jsonb)'::regprocedure);
begin
  definition := replace(definition,
    $$    if current_revision <> expected then raise exception 'Workspace revision conflict'; end if;$$,
    $$    if entity='life_schedule_events' and action='save' and expected=0
          and entity_id ~ '^automation:[0-9a-f]{64}$' and current_row is not null then
      results := results || jsonb_build_array(jsonb_build_object(
        'entity_type',entity,'entity_id',entity_id,'revision',current_row->'revision',
        'deleted_at',current_row->'deleted_at','hard_deleted',false,'row',current_row));
      continue;
    end if;
    if current_revision <> expected then raise exception 'Workspace revision conflict'; end if;$$);
  if strpos(definition,'^automation:[0-9a-f]{64}$')=0 then raise exception 'Unexpected workspace RPC definition'; end if;
  execute definition;
end $patch$;
commit;
