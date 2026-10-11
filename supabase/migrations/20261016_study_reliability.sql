-- Incremental, owner-scoped change cursor and retryable derived-state decisions.
-- Existing review events are neither rewritten nor deleted.
begin;
create sequence public.study_sync_sequence;
create table public.study_sync_changes (
 owner_id uuid not null, entity text not null, id text not null, card_id text,
 sequence bigint not null default nextval('public.study_sync_sequence'), deleted boolean not null default false, historical boolean not null default false,
 primary key(owner_id,entity,id)
);
create index study_sync_owner_sequence on public.study_sync_changes(owner_id,sequence);
create index study_sync_card_sequence on public.study_sync_changes(owner_id,card_id,entity,sequence desc);
alter table public.study_sync_changes enable row level security;
revoke all on public.study_sync_changes from anon,authenticated;
create table public.study_state_decisions (
 owner_id uuid not null, id text not null, request jsonb not null, result boolean not null, state jsonb,
 primary key(owner_id,id)
);
alter table public.study_state_decisions enable row level security;
revoke all on public.study_state_decisions from anon,authenticated;

create function public.track_study_change() returns trigger language plpgsql security definer set search_path='' as $$
declare r record; cid text;
begin
 if tg_op='DELETE' then r:=old; else r:=new; end if;
 perform pg_advisory_xact_lock(hashtextextended('study-sync:'||r.owner_id::text,0));
 -- 20260922 defines card_id as a NOT NULL FK column; use it consistently.
 if tg_table_name='study_review_events' then
   cid:=r.card_id;
 elsif tg_table_name in ('study_cards','study_card_states') then
   cid:=r.id;
 else
   cid:=null;
 end if;
 insert into public.study_sync_changes(owner_id,entity,id,card_id,deleted) values(r.owner_id,tg_table_name,r.id,cid,tg_op='DELETE')
 on conflict(owner_id,entity,id) do update set sequence=nextval('public.study_sync_sequence'),deleted=excluded.deleted,card_id=excluded.card_id,historical=false;
 return r;
end $$;
do $$ declare t text; begin
 foreach t in array array['study_cards','study_card_states','study_review_events','study_deck_settings'] loop
 execute format('create trigger study_change after insert or update or delete on public.%I for each row execute function public.track_study_change()',t);
 execute format('insert into public.study_sync_changes(owner_id,entity,id,card_id,historical) select owner_id,%L,id,%s,true from public.%I',t,
 case when t='study_review_events' then 'card_id' when t in ('study_cards','study_card_states') then 'id' else 'null' end,t);
 end loop;
end $$;

create function public.pull_study_changes(after_sequence bigint default 0) returns jsonb
language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by x.sequence),'[]'::jsonb) from (
 select c.*,
 (select jsonb_build_object('id',d.id,'state',d.state) from public.study_state_decisions d join public.study_card_states s on s.owner_id=d.owner_id and s.payload->>'resolution_id'=d.id where c.entity='study_card_states' and s.owner_id=c.owner_id and s.id=c.id and d.result) decision,
 case c.entity
 when 'study_cards' then (select payload from public.study_cards where owner_id=c.owner_id and id=c.id)
 when 'study_card_states' then (select payload from public.study_card_states where owner_id=c.owner_id and id=c.id)
 when 'study_review_events' then (select payload from public.study_review_events where owner_id=c.owner_id and id=c.id)
 when 'study_deck_settings' then (select payload from public.study_deck_settings where owner_id=c.owner_id and id=c.id) end payload
 from public.study_sync_changes c where c.owner_id=auth.uid() and c.sequence>after_sequence order by c.sequence limit 500
 ) x;
$$;

alter function public.apply_study_operation(jsonb) rename to apply_study_operation_before_reliability;
revoke all on function public.apply_study_operation_before_reliability(jsonb) from public,anon,authenticated;
create function public.apply_study_operation(operation jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('workspace:'||auth.uid()::text,0));
 perform pg_advisory_xact_lock(hashtextextended('study-sync:'||auth.uid()::text,0));
 perform public.apply_study_operation_before_reliability(operation);
end $$;
revoke all on function public.apply_study_operation(jsonb) from public,anon;
grant execute on function public.apply_study_operation(jsonb) to authenticated;

create function public.apply_study_resolution(operation jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); v jsonb:=operation->'value'; saved record; current_state jsonb; choice jsonb; ev jsonb; ev_version bigint; state_version bigint; ok boolean;
begin
 if caller is null or v->>'owner_id' is distinct from caller::text or v->>'id' is null then raise exception 'Study owner mismatch'; end if;
 perform pg_advisory_xact_lock(hashtextextended('study-sync:'||caller::text,0));
 select * into saved from public.study_state_decisions where owner_id=caller and id=v->>'id';
 if found then if saved.request<>v then raise exception 'Decision ID collision'; end if; return saved.result; end if;
 select payload into current_state from public.study_card_states where owner_id=caller and id=v->>'card_id' for update;
 if current_state is null then raise exception 'Missing card state'; end if;
 select coalesce(max(sequence),0) into ev_version from public.study_sync_changes where owner_id=caller and card_id=v->>'card_id' and entity='study_review_events';
 select sequence into state_version from public.study_sync_changes where owner_id=caller and id=v->>'card_id' and entity='study_card_states';
 ok:=ev_version=(v->>'event_version')::bigint and state_version=(v->>'state_version')::bigint;
 if ok then
   if coalesce((v->>'relearn')::boolean,false) then
     choice:=(current_state-'ambiguity')||jsonb_build_object('fsrs',null,'legacy_due_at',null,'introduced_at',null,'learned_at',null,'generation',greatest(coalesce((current_state->>'generation')::int,0),coalesce((select max((payload->'after'->>'generation')::int) from public.study_review_events where owner_id=caller and card_id=v->>'card_id'),0))+1,'conflict',false);
   else
     choice:=v->'choice';
     if choice->>'id' is distinct from (v->>'card_id') or choice->>'owner_id' is distinct from caller::text then raise exception 'Invalid candidate'; end if;
     select payload into ev from public.study_review_events where owner_id=caller and id=choice->>'head' and card_id=v->>'card_id';
     if (choice-'conflict'-'ambiguity') is distinct from (current_state-'conflict'-'ambiguity') and
        (ev is null or (choice-'conflict'-'ambiguity') is distinct from ((ev->'after')-'conflict'-'ambiguity')) then raise exception 'Candidate is not a recorded state'; end if;
     choice:=(choice-'ambiguity')||jsonb_build_object('conflict',false);
   end if;
   choice:=choice||jsonb_build_object('resolution_id',v->>'id');
   update public.study_card_states set payload=choice where owner_id=caller and id=v->>'card_id';
 end if;
 insert into public.study_state_decisions values(caller,v->>'id',v,ok,case when ok then choice else null end);
 return ok;
end $$;
revoke all on function public.track_study_change(),public.pull_study_changes(bigint),public.apply_study_resolution(jsonb) from public,anon;
grant execute on function public.pull_study_changes(bigint),public.apply_study_resolution(jsonb) to authenticated;
commit;
