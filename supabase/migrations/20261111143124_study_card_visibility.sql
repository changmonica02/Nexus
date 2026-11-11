-- Per-card preference in the existing payload/outbox/feed. No scheduling or history rewrite.
begin;
create or replace function public.study_merge_card_visibility(previous jsonb,incoming jsonb)
returns jsonb language plpgsql set search_path='' as $function$
declare result jsonb:=incoming; preference jsonb; next_at numeric; previous_at numeric;
begin
 if incoming ? 'hidden' or incoming ? 'hidden_changed_at' then
  if jsonb_typeof(incoming->'hidden') is distinct from 'boolean' or jsonb_typeof(incoming->'hidden_changed_at') is distinct from 'number' then raise exception 'Invalid study visibility';end if;
  next_at:=(incoming->>'hidden_changed_at')::numeric;
  if next_at<>trunc(next_at) or next_at<=0 or next_at>9007199254740991 then raise exception 'Invalid study visibility time';end if;
 end if;
 if previous is null then return incoming;end if;
 if incoming->>'id' is distinct from previous->>'id' or incoming->>'deck_id' is distinct from previous->>'deck_id' or incoming->>'owner_id' is distinct from previous->>'owner_id' then raise exception 'Study visibility identity mismatch';end if;
 previous_at:=(previous->>'hidden_changed_at')::numeric;
 if previous_at is not null and (next_at is null or previous_at>next_at or previous_at=next_at and previous->'hidden'='true'::jsonb) then
  preference:=jsonb_build_object('hidden',previous->'hidden','hidden_changed_at',previous->'hidden_changed_at');
 elsif next_at is not null then preference:=jsonb_build_object('hidden',incoming->'hidden','hidden_changed_at',incoming->'hidden_changed_at');
 else return incoming;end if;
 -- Older content must not overwrite a newer card, even when its preference is newer.
 if (incoming->>'updated_at')::bigint<=(previous->>'updated_at')::bigint and
    (preference->'hidden_changed_at' is distinct from previous->'hidden_changed_at' or preference->'hidden' is distinct from previous->'hidden') then
  result:=previous||jsonb_build_object('updated_at',(previous->>'updated_at')::bigint+1);
 end if;
 return result||preference;
end $function$;
revoke all on function public.study_merge_card_visibility(jsonb,jsonb) from public,anon,authenticated;

-- Adapt the installed implementation, retaining clear barriers, projection verification,
-- owner locks, event IDs and all existing validation. Unknown contracts fail atomically.
do $migration$
declare definition text; anchor text;
begin
 definition:=pg_get_functiondef('public.apply_study_operation(jsonb)'::regprocedure);
 anchor:=E'   if old_card is not null and old_card->>''deck_id'' is distinct from v->>''deck_id'' then raise exception ''Study card deck cannot change''; end if;\n   perform public.apply_study_operation_before_clear(operation);return;';
 if position(anchor in definition)=0 or position('if k=''card'' then' in definition)=0 then raise exception 'Unexpected study operation contract';end if;
 definition:=replace(definition,anchor,replace(anchor,'   perform public.apply_study_operation_before_clear(operation);return;',E'   v:=public.study_merge_card_visibility(old_card,v);\n   operation:=jsonb_set(operation,''{value}'',v);\n   perform public.apply_study_operation_before_clear(operation);return;'));
 execute definition;
 definition:=pg_get_functiondef('public.guard_official_study_content()'::regprocedure);
 anchor:=E'begin\n';
 if position(anchor in definition)=0 or position('''deleted_at'',''official_custom'']' in definition)=0 then raise exception 'Unexpected official card guard contract';end if;
 definition:=replace(definition,anchor,anchor||E' if tg_table_name=''study_cards'' then\n  if tg_op=''UPDATE'' then new.payload:=public.study_merge_card_visibility(old.payload,new.payload);\n  else new.payload:=public.study_merge_card_visibility(null,new.payload);end if;\n end if;\n');
 definition:=replace(definition,'''deleted_at'',''official_custom'']','''deleted_at'',''official_custom'',''hidden'',''hidden_changed_at'']');
 execute definition;
end $migration$;
commit;
