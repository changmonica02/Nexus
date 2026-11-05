-- Timestamp barrier and a single reproducible projection per immutable study fact.
-- Isolated validation required. This file does not imply production application.
begin;
create table public.study_deck_clears (
 owner_id uuid not null references auth.users(id) on delete cascade,
 deck_id text not null, cleared_at bigint not null check(cleared_at>0),
 operation_id text not null check(length(operation_id) between 1 and 200),
 previous_cleared_at bigint not null,
 primary key(owner_id,deck_id)
);
alter table public.study_deck_clears enable row level security;
revoke all on public.study_deck_clears from public,anon,authenticated;
create index study_cards_owner_deck on public.study_cards(owner_id,(payload->>'deck_id'));
create index study_states_owner_deck on public.study_card_states(owner_id,(payload->>'deck_id'));
create index study_events_owner_deck on public.study_review_events(owner_id,(payload->>'deck_id'));

create function public.study_empty_after_clear(card jsonb, stamp bigint) returns jsonb
language sql immutable set search_path='' as $$
 select jsonb_build_object('id',card->>'id','deck_id',card->>'deck_id','owner_id',card->>'owner_id',
 'fsrs',null,'legacy_due_at',null,'introduced_at',null,'head',null,'generation',0,'conflict',false,'cleared_at',stamp)
$$;
create function public.study_effective_event(event jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select case when event ? 'projection' then
 (event-'projection'-'method_transition') || ((event->'projection')-'cleared_at') else event end
$$;
create function public.get_study_clear_times() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 return coalesce((select jsonb_agg(to_jsonb(c)-'previous_cleared_at' order by c.deck_id) from public.study_deck_clears c where c.owner_id=auth.uid()),'[]'::jsonb);
end $$;

create function public.clear_study_deck(deck_id text, operation_id text, expected_cleared_at bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); prior public.study_deck_clears; next_clear public.study_deck_clears; stamp bigint;
begin
 if actor is null then raise exception 'Authentication required'; end if;
 if operation_id is null or length(operation_id) not between 1 and 200 or expected_cleared_at is null or expected_cleared_at<0 then raise exception 'Invalid clear request'; end if;
 perform pg_advisory_xact_lock(hashtextextended('workspace:'||actor::text,0));
 perform pg_advisory_xact_lock(hashtextextended('study-sync:'||actor::text,0));
 if not exists(select 1 from public.pages p where p.owner_id=actor and p.id=clear_study_deck.deck_id and p.kind='study_set' and p.deleted_at is null)
 or not exists(select 1 from public.study_deck_settings s where s.owner_id=actor and s.id=clear_study_deck.deck_id and s.payload->>'record_type' is distinct from 'style') then raise exception 'Study deck not found for this account'; end if;
 select * into prior from public.study_deck_clears c where c.owner_id=actor and c.deck_id=clear_study_deck.deck_id for update;
 if prior.operation_id=clear_study_deck.operation_id then
   if prior.previous_cleared_at<>expected_cleared_at then raise exception 'Clear operation ID collision'; end if;
   return jsonb_build_object('applied',true,'clear',to_jsonb(prior)-'previous_cleared_at');
 end if;
 if coalesce(prior.cleared_at,0)<>expected_cleared_at then return jsonb_build_object('applied',false,'clear',to_jsonb(prior)-'previous_cleared_at'); end if;
 stamp:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce(prior.cleared_at,0)+1);
 insert into public.study_deck_clears values(actor,deck_id,stamp,operation_id,expected_cleared_at)
 on conflict on constraint study_deck_clears_pkey do update set cleared_at=excluded.cleared_at,operation_id=excluded.operation_id,previous_cleared_at=excluded.previous_cleared_at
 returning * into next_clear;
 delete from public.study_state_decisions d using public.study_cards c where c.owner_id=actor and c.payload->>'deck_id'=clear_study_deck.deck_id and d.owner_id=actor and d.request->>'card_id'=c.id;
 delete from public.study_review_events e where e.owner_id=actor and e.payload->>'deck_id'=clear_study_deck.deck_id;
 update public.study_card_states s set payload=public.study_empty_after_clear(c.payload,stamp) from public.study_cards c where c.owner_id=actor and s.owner_id=actor and s.id=c.id and c.payload->>'deck_id'=clear_study_deck.deck_id;
 -- Sessions are local-only. Feed state updates invalidate them on reconnect.
 return jsonb_build_object('applied',true,'clear',to_jsonb(next_clear)-'previous_cleared_at');
end $$;

-- Every projected transition retains the original structural checks. Interval/fixed
-- projections additionally check the exact scheduling formula; historical FSRS retains
-- its existing client-engine verification and gains canonical-before/counter checks.
create function public.check_study_transition(e jsonb) returns void
language plpgsql set search_path='' as $$
declare b jsonb:=e->'before'; a jsonb:=e->'after'; expected jsonb; rating int; phase int; next_phase int; grp text; seconds numeric; stamp bigint; active boolean; learned boolean;
begin
 if e->>'kind' not in ('review','introduce','reset') or e->>'kind' is null or
 b->>'head' is distinct from e->>'parent' or a->>'head' is distinct from e->>'id' or
 a->>'id' is distinct from e->>'card_id' or b->>'id' is distinct from e->>'card_id' or
 a->>'owner_id' is distinct from e->>'owner_id' or b->>'owner_id' is distinct from e->>'owner_id' or
 a->>'deck_id' is distinct from e->>'deck_id' or b->>'deck_id' is distinct from e->>'deck_id' then raise exception 'Malformed study event'; end if;
 stamp:=(e->>'at')::bigint;rating:=(e->>'rating')::int;
 if e->>'kind'='review' and (rating is null or rating not between 1 and 4 or e->'log' is null or e->'log'='null'::jsonb) then raise exception 'Invalid review'; end if;
 if e->>'engine' not in ('nexus-interval@1','nexus-fixed@1','ts-fsrs@5.4.2/FSRS-6') or e->>'engine' is null then raise exception 'Unknown study engine'; end if;
 expected:=b||jsonb_build_object('head',e->>'id');
 if e->>'kind'='introduce' then
   expected:=expected||jsonb_build_object('introduced_at',stamp);
   if e->>'source'='daily_learning' then expected:=expected||jsonb_build_object('learned_at',stamp); end if;
 elsif e->>'kind'='reset' then
   expected:=(expected-'fixed'-'scheduling_method')||jsonb_build_object('fsrs',null,'legacy_due_at',null,'introduced_at',null,'learned_at',null,'generation',(b->>'generation')::int+1);
   if e->>'source'='legacy_test_reset' then expected:=expected||jsonb_build_object('legacy_test_reset',true); end if;
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

alter function public.apply_study_operation(jsonb) rename to apply_study_operation_before_clear;
revoke all on function public.apply_study_operation_before_clear(jsonb) from public,anon,authenticated;
create function public.apply_study_operation(operation jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); v jsonb:=operation->'value'; k text:=operation->>'kind'; card jsonb; old_card jsonb; cutoff bigint; e jsonb; prior jsonb; parent jsonb; expected jsonb; current_state jsonb;
begin
 if actor is null or operation->>'owner_id' is not null and operation->>'owner_id'<>actor::text or v->>'owner_id' is distinct from actor::text or v->>'id' is null then raise exception 'Study owner or ID mismatch'; end if;
 perform pg_advisory_xact_lock(hashtextextended('workspace:'||actor::text,0));
 perform pg_advisory_xact_lock(hashtextextended('study-sync:'||actor::text,0));
 if k='settings' then perform public.apply_study_operation_before_clear(operation); return; end if;
 if k='card' then
   select payload into old_card from public.study_cards where owner_id=actor and id=v->>'id';
   if old_card is not null and old_card->>'deck_id' is distinct from v->>'deck_id' then raise exception 'Study card deck cannot change'; end if;
   perform public.apply_study_operation_before_clear(operation);return;
 end if;
 select payload into card from public.study_cards where owner_id=actor and id=case when k='event' then v->>'card_id' else v->>'id' end;
 if card is null or card->>'deck_id' is distinct from v->>'deck_id' then raise exception 'Study card/deck mismatch'; end if;
 select cleared_at into cutoff from public.study_deck_clears where owner_id=actor and deck_id=card->>'deck_id';
 if cutoff is null then
   if v ? 'projection' or v ? 'cleared_at' then raise exception 'Unknown clear barrier'; end if;
   perform public.apply_study_operation_before_clear(operation);return;
 end if;
 if k='seed' then
   perform public.apply_study_operation_before_clear(jsonb_set(operation,'{value}',public.study_empty_after_clear(card,cutoff)));return;
 end if;
 if k<>'event' then raise exception 'Unsupported study operation'; end if;
 if jsonb_typeof(v->'at') is distinct from 'number' or (v->>'at')::numeric<>trunc((v->>'at')::numeric) or (v->>'at')::bigint<=cutoff or (v->>'at')::numeric>floor(extract(epoch from clock_timestamp())*1000)+86400000 then raise exception 'Invalid or cleared study event time'; end if;
 if jsonb_typeof(v->'projection') is distinct from 'object' or ((v->'projection')-array['cleared_at','parent','before','after','log','method_transition'])<>'{}'::jsonb or not ((v->'projection') ?& array['cleared_at','parent','before','after','log']) then raise exception 'Malformed study projection'; end if;
 if ((v->'projection')->>'cleared_at')::bigint is distinct from cutoff then raise exception 'Stale study projection; pull clear time and retry'; end if;
 perform public.check_study_transition(v-'projection');
 e:=public.study_effective_event(v);
 perform public.check_study_transition(e);
 if (e->'before')->>'cleared_at' is distinct from cutoff::text or (e->'after')->>'cleared_at' is distinct from cutoff::text then raise exception 'Invalid projection barrier'; end if;
 select payload into prior from public.study_review_events where owner_id=actor and id=v->>'id';
 if prior is not null and prior-'projection' is distinct from v-'projection' then raise exception 'Event ID collision'; end if;
 if e->>'parent' is null then expected:=public.study_empty_after_clear(card,cutoff);
 else
   select public.study_effective_event(payload)->'after' into expected from public.study_review_events where owner_id=actor and id=e->>'parent' and card_id=card->>'id' and (payload->>'at')::bigint>cutoff;
   if expected is null then raise exception 'Missing parent event'; end if;
 end if;
 if ((e->'before')-'conflict'-'ambiguity') is distinct from (expected-'conflict'-'ambiguity') and (e->'before')->>'resolution_id' is not null then
   select state into expected from public.study_state_decisions where owner_id=actor and id=(e->'before')->>'resolution_id' and result and state->>'cleared_at'=cutoff::text;
   if expected is null then raise exception 'Unproven projection decision'; end if;
 end if;
 if ((e->'before')-'conflict'-'ambiguity') is distinct from (expected-'conflict'-'ambiguity') then raise exception 'Invalid projection predecessor'; end if;
 if prior=v then return; end if;
 if prior is not null then raise exception 'Projection collision at current clear time'; end if;
 select payload into current_state from public.study_card_states where owner_id=actor and id=card->>'id' for update;
 if current_state is null then current_state:=public.study_empty_after_clear(card,cutoff);insert into public.study_card_states values(actor,card->>'id',current_state); end if;
 insert into public.study_review_events values(actor,v->>'id',card->>'id',v);
 if current_state->>'head' is not distinct from e->>'parent' and (not coalesce((current_state->>'conflict')::boolean,false) or e->>'kind'='reset') then
   update public.study_card_states set payload=e->'after' where owner_id=actor and id=card->>'id';
 else update public.study_card_states set payload=jsonb_set(current_state,'{conflict}','true') where owner_id=actor and id=card->>'id';end if;
end $$;

alter function public.apply_study_resolution(jsonb) rename to apply_study_resolution_before_clear;
revoke all on function public.apply_study_resolution_before_clear(jsonb) from public,anon,authenticated;
create function public.apply_study_resolution(operation jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); v jsonb:=operation->'value'; card jsonb; cutoff bigint; choice jsonb:=v->'choice'; e jsonb; current_state jsonb; saved record; ev_version bigint; st_version bigint; ok boolean;
begin
 if actor is null or v->>'owner_id' is distinct from actor::text or v->>'id' is null then raise exception 'Study owner mismatch';end if;
 perform pg_advisory_xact_lock(hashtextextended('workspace:'||actor::text,0));
 perform pg_advisory_xact_lock(hashtextextended('study-sync:'||actor::text,0));
 select payload into card from public.study_cards where owner_id=actor and id=v->>'card_id';
 select cleared_at into cutoff from public.study_deck_clears where owner_id=actor and deck_id=card->>'deck_id';
 if cutoff is null then return public.apply_study_resolution_before_clear(operation);end if;
 if (v->>'cleared_at')::bigint is distinct from cutoff then return false;end if;
 select * into saved from public.study_state_decisions where owner_id=actor and id=v->>'id';
 if found then if saved.request<>v then raise exception 'Decision ID collision';end if;return saved.result;end if;
 select payload into current_state from public.study_card_states where owner_id=actor and id=v->>'card_id' for update;
 if current_state is null then raise exception 'Missing card state';end if;
 select coalesce(max(sequence) filter(where entity='study_review_events'),0),max(sequence) filter(where entity='study_card_states') into ev_version,st_version from public.study_sync_changes where owner_id=actor and card_id=v->>'card_id';
 ok:=ev_version=(v->>'event_version')::bigint and st_version=(v->>'state_version')::bigint;
 if ok then
   if coalesce((v->>'relearn')::boolean,false) then
     choice:=(current_state-'ambiguity'-'fixed'-'scheduling_method')||jsonb_build_object('fsrs',null,'legacy_due_at',null,'introduced_at',null,'learned_at',null,'generation',greatest((current_state->>'generation')::int,coalesce((select max((public.study_effective_event(payload)->'after'->>'generation')::int) from public.study_review_events where owner_id=actor and card_id=v->>'card_id'),0))+1,'conflict',false);
   else
     select public.study_effective_event(payload) into e from public.study_review_events where owner_id=actor and id=choice->>'head' and card_id=v->>'card_id' and (payload->>'at')::bigint>cutoff;
     if choice->>'cleared_at' is distinct from cutoff::text or choice->>'owner_id' is distinct from actor::text or choice->>'deck_id' is distinct from card->>'deck_id' or choice->>'id' is distinct from card->>'id' or
     ((choice-'conflict'-'ambiguity') is distinct from (current_state-'conflict'-'ambiguity') and (e is null or (choice-'conflict'-'ambiguity') is distinct from ((e->'after')-'conflict'-'ambiguity'))) then raise exception 'Candidate is not an effective recorded state';end if;
   end if;
   choice:=(choice-'ambiguity')||jsonb_build_object('resolution_id',v->>'id','conflict',false);
   update public.study_card_states set payload=choice where owner_id=actor and id=v->>'card_id';
 end if;
 insert into public.study_state_decisions values(actor,v->>'id',v,ok,case when ok then choice else null end);
 return ok;
end $$;

-- Official pack SQL may insert a new empty state directly. It must not seed legacy
-- progress after a clear, even though it does not use apply_study_operation.
create function public.guard_cleared_study_state() returns trigger
language plpgsql security definer set search_path='' as $$
declare cutoff bigint; card jsonb;
begin
 select payload into card from public.study_cards where owner_id=new.owner_id and id=new.id;
 select cleared_at into cutoff from public.study_deck_clears where owner_id=new.owner_id and deck_id=card->>'deck_id';
 if cutoff is not null and new.payload->>'cleared_at' is distinct from cutoff::text then
   if tg_op='INSERT' and new.payload->>'head' is null then new.payload:=public.study_empty_after_clear(card,cutoff);
   else raise exception 'Stale cleared card state';end if;
 end if;
 return new;
end $$;
create trigger study_clear_state_guard before insert or update on public.study_card_states for each row execute function public.guard_cleared_study_state();

-- Include a decision proof used by an event's effective predecessor, not only the
-- latest card checkpoint. A device can skip several relearn decisions while offline.
create or replace function public.pull_study_changes(after_sequence bigint default 0) returns jsonb
language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by x.sequence),'[]'::jsonb) from (
 select c.*,
 (select jsonb_build_object('id',d.id,'state',d.state) from public.study_state_decisions d where d.owner_id=c.owner_id and d.result and d.id=case c.entity
 when 'study_card_states' then (select s.payload->>'resolution_id' from public.study_card_states s where s.owner_id=c.owner_id and s.id=c.id)
 when 'study_review_events' then (select public.study_effective_event(e.payload)->'before'->>'resolution_id' from public.study_review_events e where e.owner_id=c.owner_id and e.id=c.id) end) decision,
 case c.entity
 when 'study_cards' then (select payload from public.study_cards where owner_id=c.owner_id and id=c.id)
 when 'study_card_states' then (select payload from public.study_card_states where owner_id=c.owner_id and id=c.id)
 when 'study_review_events' then (select payload from public.study_review_events where owner_id=c.owner_id and id=c.id)
 when 'study_deck_settings' then (select payload from public.study_deck_settings where owner_id=c.owner_id and id=c.id) end payload
 from public.study_sync_changes c where c.owner_id=auth.uid() and c.sequence>after_sequence order by c.sequence limit 500
 ) x;
$$;

revoke all on function public.study_empty_after_clear(jsonb,bigint),public.study_effective_event(jsonb),public.check_study_transition(jsonb),public.guard_cleared_study_state() from public,anon,authenticated;
revoke all on function public.get_study_clear_times(),public.clear_study_deck(text,text,bigint),public.apply_study_operation(jsonb),public.apply_study_resolution(jsonb) from public,anon;
grant execute on function public.get_study_clear_times(),public.clear_study_deck(text,text,bigint),public.apply_study_operation(jsonb),public.apply_study_resolution(jsonb) to authenticated;
commit;
