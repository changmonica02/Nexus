-- Independent transaction: does not touch Study cards/states/events/settings/sessions.
begin;
do $$declare definition text;begin
 if exists(select 1 from public.pages where study_items is not null and study_items<>'[]'::jsonb) then raise notice 'Retiring Page-only legacy cards per explicit authorization; modern study stores are untouched';end if;
 definition:=pg_get_functiondef('public.apply_workspace_operations(jsonb)'::regprocedure);
 if strpos(definition,$a$'study_items',$a$)=0 then raise exception 'Unexpected workspace schema';end if;
 -- Old device payloads are ignored by the existing column whitelist, not migrated.
 definition:=replace(definition,$a$'study_items',$a$,'');execute definition;
 definition:=pg_get_functiondef('public.download_official_study_pack(text)'::regprocedure);
 if strpos(definition,$a$'study_items','[]'::jsonb,$a$)=0 then raise exception 'Unexpected official Page creation';end if;
 definition:=replace(definition,$a$'study_items','[]'::jsonb,$a$,'');execute definition;
 definition:=pg_get_functiondef('public.guard_official_study_page()'::regprocedure);
 if strpos(definition,' or new.study_items is distinct from old.study_items')=0 then raise exception 'Unexpected official Page guard';end if;
 definition:=replace(definition,' or new.study_items is distinct from old.study_items','');execute definition;
end $$;
alter table public.pages drop column study_items;
notify pgrst,'reload schema';
commit;
