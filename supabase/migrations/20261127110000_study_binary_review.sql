create or replace function public.check_study_transition(e jsonb) returns void
language plpgsql set search_path='' as $$
declare b jsonb:=e->'before'; a jsonb:=e->'after'; expected jsonb; rating int; phase int; next_phase int; grp text; seconds numeric; stamp bigint; active boolean; learned boolean; box_member boolean; memory_level text; next_level text;
begin
 if e->>'kind' not in ('review','introduce','reset') or e->>'kind' is null or
 b->>'head' is distinct from e->>'parent' or a->>'head' is distinct from e->>'id' or
 a->>'id' is distinct from e->>'card_id' or b->>'id' is distinct from e->>'card_id' or
 a->>'owner_id' is distinct from e->>'owner_id' or b->>'owner_id' is distinct from e->>'owner_id' or
 a->>'deck_id' is distinct from e->>'deck_id' or b->>'deck_id' is distinct from e->>'deck_id' then raise exception 'Malformed study event'; end if;
 stamp:=(e->>'at')::bigint;rating:=(e->>'rating')::int;
 if e->>'kind'='review' and (rating is null or rating not between 1 and 4 or e->'log' is null or e->'log'='null'::jsonb) then raise exception 'Invalid review'; end if;
 if e->>'engine' not in ('nexus-binary@2','nexus-interval@1','nexus-fixed@1','ts-fsrs@5.4.2/FSRS-6') or e->>'engine' is null then raise exception 'Unknown study engine'; end if;
 expected:=b||jsonb_build_object('head',e->>'id');
 if e->>'kind'='introduce' then
   expected:=expected||jsonb_build_object('introduced_at',stamp);
   if e->>'source'='daily_learning' then expected:=expected||jsonb_build_object('learned_at',stamp); end if;
 elsif e->>'kind'='reset' then
   expected:=(expected-'fixed'-'scheduling_method')||jsonb_build_object('fsrs',null,'legacy_due_at',null,'introduced_at',null,'learned_at',null,'generation',(b->>'generation')::int+1);
   if e->>'source'='legacy_test_reset' then expected:=expected||jsonb_build_object('legacy_test_reset',true); end if;
 elsif e->>'engine'='nexus-binary@2' then
   if rating not in (1,3) or (e->'style_snapshot')->>'interval_version' is distinct from '2' or e->'parameters' is distinct from (jsonb_build_object('version',2)||case when (e->'style_snapshot') ? 'binary_intervals' then jsonb_build_object('binary_intervals',(e->'style_snapshot')->'binary_intervals') else '{}'::jsonb end) then raise exception 'Invalid binary snapshot'; end if;
   active:=coalesce(b->>'scheduling_method'='fixed' and (b->'fixed')->>'generation'=b->>'generation',false);
   phase:=case when active then ((b->'fixed')->>'state')::int else coalesce(((b->'fsrs')->>'state')::int,0) end;
   box_member:=case when active and (b->'fixed') ? 'memory_level' then ((b->'fixed')->>'in_forgotten_box')::boolean else coalesce(phase in (1,3) and (case when active then b->'fixed' else b->'fsrs' end)->>'last_review' is not null,false) end;
   memory_level:=case when active and (b->'fixed') ? 'memory_level' then (b->'fixed')->>'memory_level' when box_member then 'forgotten' else 'general' end;
   if memory_level is null or memory_level not in ('general','fuzzy','forgotten') or box_member is null then raise exception 'Invalid memory level'; end if;
   if (e->'parameters') ? 'binary_intervals' then
     for grp in select unnest(array['general','fuzzy','forgotten']) loop
       if jsonb_typeof((e->'parameters')->'binary_intervals'->grp) is distinct from 'array' then raise exception 'Invalid binary intervals'; end if;
       if jsonb_array_length((e->'parameters')->'binary_intervals'->grp)<>2 or exists(select 1 from jsonb_array_elements((e->'parameters')->'binary_intervals'->grp) v where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 1 and 315360000 or trunc((v::text)::numeric)<>(v::text)::numeric) then raise exception 'Invalid binary intervals'; end if;
     end loop;
     seconds:=((e->'parameters')->'binary_intervals'->memory_level->>(case when rating=1 then 0 else 1 end))::numeric;
   else
     seconds:=case when rating=1 then 60 when memory_level='forgotten' then 86400 when memory_level='fuzzy' then 259200 else 604800 end;
   end if;
   next_level:=case when rating=1 or box_member then 'forgotten' when memory_level='forgotten' then 'fuzzy' else 'general' end;
   phase:=case when active then phase when box_member then 3 when b->>'fsrs' is not null or b->>'legacy_due_at' is not null or b->>'learned_at' is not null then 2 else 0 end;
   next_phase:=case when rating=1 then 3 else 2 end;
   expected:=expected||jsonb_build_object('scheduling_method','fixed','fixed',jsonb_build_object('state',next_phase,'due',stamp+seconds*1000,'last_review',stamp,'generation',(b->>'generation')::int,'memory_level',next_level,'in_forgotten_box',rating=1),'legacy_due_at',null);
   if next_phase=2 and b->>'learned_at' is null then expected:=expected||jsonb_build_object('learned_at',stamp); end if;
   if (e->'log')->>'method' is distinct from 'binary' or (e->'log')->>'version' is distinct from '2' or (e->'log')->>'group' is distinct from memory_level or ((e->'log')->>'review')::bigint is distinct from stamp or ((e->'log')->>'due')::numeric is distinct from stamp+seconds*1000 or ((e->'log')->>'rating')::int is distinct from rating or ((e->'log')->>'interval_seconds')::numeric is distinct from seconds or ((e->'log')->>'state_before')::int is distinct from phase or ((e->'log')->>'state_after')::int is distinct from next_phase then raise exception 'Invalid binary log'; end if;
 elsif e->>'engine' in ('nexus-interval@1','nexus-fixed@1') then
   active:=coalesce(b->>'scheduling_method'='fixed' and (b->'fixed')->>'generation'=b->>'generation',false);
   phase:=case when active then ((b->'fixed')->>'state')::int else coalesce(((b->'fsrs')->>'state')::int,case when b->>'learned_at' is not null or b->>'legacy_due_at' is not null then 2 else 0 end) end;
   if e->>'engine'='nexus-interval@1' then
     if rating not between 1 and 3 or (e->'style_snapshot')->>'interval_version' is distinct from '1' or e->'parameters' is distinct from jsonb_build_object('intervals',(e->'style_snapshot')->'intervals','version',1) then raise exception 'Invalid interval snapshot'; end if;
     grp:=case when (active and (b->'fixed')->>'last_review' is not null and phase in(1,3)) or (not active and (b->'fsrs')->>'last_review' is not null and phase in(1,3)) then 'forgotten' else 'general' end;
     seconds:=((e->'parameters')->'intervals'->grp->>(rating-1))::numeric;
     next_phase:=case when rating=3 then 2 else 3 end;
   else
     if e->'parameters' is distinct from jsonb_build_object('fixed_intervals',(e->'style_snapshot')->'fixed_intervals') then raise exception 'Invalid fixed snapshot'; end if;
     grp:=case when phase=2 then 'review' when phase=3 then 'relearning' else 'new' end;
     seconds:=((e->'parameters')->'fixed_intervals'->grp->>(rating-1))::numeric;
     next_phase:=case when phase=2 then case when rating=1 then 3 else 2 end else case when rating>=3 then 2 when phase=3 then 3 else 1 end end;
   end if;
   if seconds is null or seconds<=0 then raise exception 'Invalid interval seconds'; end if;
   expected:=expected||jsonb_build_object('scheduling_method','fixed','fixed',jsonb_build_object('state',next_phase,'due',stamp+seconds*1000,'last_review',stamp,'generation',(b->>'generation')::int),'legacy_due_at',null);
   if next_phase=2 and b->>'learned_at' is null then expected:=expected||jsonb_build_object('learned_at',stamp); end if;
   if ((e->'log')->>'review')::bigint is distinct from stamp or ((e->'log')->>'due')::numeric is distinct from stamp+seconds*1000 or ((e->'log')->>'rating')::int is distinct from rating or ((e->'log')->>'interval_seconds')::numeric is distinct from seconds or ((e->'log')->>'state_after')::int is distinct from next_phase then raise exception 'Invalid projected review log'; end if;
 else
   -- FSRS calculation stays verified by reliableEvent with the pinned original engine.
   -- SQL never accepts an old before or inherited pre-clear dates/counters as a root.
   if ((a->'fsrs')->>'last_review')::bigint is distinct from stamp or ((a->'fsrs')->>'reps')::int is distinct from coalesce(((b->'fsrs')->>'reps')::int,0)+1 then raise exception 'Invalid FSRS transition counters'; end if;
   expected:=expected||jsonb_build_object('fsrs',a->'fsrs','legacy_due_at',null);
   if e ? 'style_snapshot' or b ? 'scheduling_method' then expected:=expected||jsonb_build_object('scheduling_method','fsrs'); end if;
 end if;
 if (a-'conflict'-'ambiguity') is distinct from (expected-'conflict'-'ambiguity') then raise exception 'Invalid study scheduling transition'; end if;
end $$;

-- Check new engine events even on decks without a clear barrier; retain installed visibility and ownership logic.
do $migration$
declare definition text; anchor text;
begin
 definition:=pg_get_functiondef('public.apply_study_operation(jsonb)'::regprocedure);
 anchor:=E'   if v ? ''projection'' or v ? ''cleared_at'' then raise exception ''Unknown clear barrier''; end if;';
 if position(anchor in definition)=0 then raise exception 'Unexpected study operation contract'; end if;
 execute replace(definition,anchor,anchor||E'\n   if k=''event'' and v->>''engine''=''nexus-binary@2'' then perform public.check_study_transition(v); end if;');
end $migration$;
