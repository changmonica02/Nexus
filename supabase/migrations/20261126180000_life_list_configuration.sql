begin;
alter table public.life_lists add column configuration jsonb not null default '{}'::jsonb
  check (jsonb_typeof(configuration) = 'object' and octet_length(configuration::text)<=32768);

do $patch$
declare definition text := replace(pg_get_functiondef('public.apply_workspace_operations(jsonb)'::regprocedure), chr(13), '');
begin
  definition := replace(definition,
    $$when entity='life_lists' then array['title','fields','schema_version','sort_order']$$,
    $$when entity='life_lists' then array['title','fields','schema_version','sort_order','configuration']$$);
  definition := replace(definition,
    $$        next_row := next_row || jsonb_build_object('id',entity_id$$,
    $$        if entity = 'life_items' and exists (
          select 1
          from public.life_lists l cross join lateral jsonb_array_elements(l.fields) f
          cross join lateral (select (next_row->'values')->(f->>'id') v) field_value
          where l.owner_id=actor and l.id=next_row->>'list_id'
            and f->'required'='true'::jsonb and f->'archived' is distinct from 'true'::jsonb
            and (v is null or v='null'::jsonb
              or (jsonb_typeof(v)='string' and (v#>>'{}') !~ '[^[:space:]]')
              or v='[]'::jsonb)
        ) then raise exception 'Missing required list field'; end if;
        next_row := next_row || jsonb_build_object('id',entity_id$$);
  if strpos(definition,$$'sort_order','configuration']$$)=0 or strpos(definition,'Missing required list field')=0 then
    raise exception 'Unexpected workspace function definition';
  end if;
  execute definition;
end $patch$;
commit;
