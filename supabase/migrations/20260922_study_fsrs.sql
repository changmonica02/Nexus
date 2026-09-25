-- FSRS v2: independent content, state, append-only events and per-deck settings.
-- No destructive change to pages.study_items. Old data remains a migration source.
create table if not exists public.study_cards (
  owner_id uuid not null, id text not null, payload jsonb not null,
  primary key (owner_id, id),
  check (payload->>'id' = id and payload->>'owner_id' = owner_id::text)
);
create table if not exists public.study_card_states (
  owner_id uuid not null, id text not null, payload jsonb not null,
  primary key (owner_id, id),
  foreign key (owner_id,id) references public.study_cards(owner_id,id),
  check (payload->>'id' = id and payload->>'owner_id' = owner_id::text)
);
create table if not exists public.study_review_events (
  owner_id uuid not null, id text not null, card_id text not null, payload jsonb not null,
  primary key (owner_id, id),
  foreign key (owner_id,card_id) references public.study_cards(owner_id,id),
  check (payload->>'id' = id and payload->>'owner_id' = owner_id::text),
  check (payload->>'kind' in ('review','introduce','reset'))
);
create index if not exists study_events_card on public.study_review_events(owner_id,card_id);
create table if not exists public.study_deck_settings (
  owner_id uuid not null, id text not null, payload jsonb not null,
  primary key (owner_id, id),
  check (payload->>'id' = id and payload->>'owner_id' = owner_id::text)
);

alter table public.study_cards enable row level security;
alter table public.study_card_states enable row level security;
alter table public.study_review_events enable row level security;
alter table public.study_deck_settings enable row level security;
-- Only the guarded operation below can mutate study data. Clients can read their own rows.
drop policy if exists study_owner_read on public.study_cards;
create policy study_owner_read on public.study_cards for select to authenticated using (owner_id=auth.uid());
drop policy if exists study_owner_read on public.study_card_states;
create policy study_owner_read on public.study_card_states for select to authenticated using (owner_id=auth.uid());
drop policy if exists study_owner_read on public.study_review_events;
create policy study_owner_read on public.study_review_events for select to authenticated using (owner_id=auth.uid());
drop policy if exists study_owner_read on public.study_deck_settings;
create policy study_owner_read on public.study_deck_settings for select to authenticated using (owner_id=auth.uid());
revoke all on public.study_cards,public.study_card_states,public.study_review_events,public.study_deck_settings from anon,authenticated;
grant select on public.study_cards,public.study_card_states,public.study_review_events,public.study_deck_settings to authenticated;

create or replace function public.apply_study_operation(operation jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  caller uuid := auth.uid();
  value jsonb := operation->'value';
  category text := operation->>'kind';
  key text := value->>'id';
  current_state jsonb;
  existing_event jsonb;
begin
  if caller is null or (value->>'owner_id') is distinct from caller::text or key is null then
    raise exception 'Study owner or ID mismatch';
  end if;
  if category = 'card' then
    insert into study_cards(owner_id,id,payload) values(caller,key,value)
    on conflict(owner_id,id) do update set payload=excluded.payload
      where not coalesce((operation->>'initial')::boolean,false) and (study_cards.payload->>'updated_at')::bigint < (excluded.payload->>'updated_at')::bigint;
  elsif category = 'settings' then
    if (value->>'new_limit')::integer not between 0 and 10000 then raise exception 'Invalid new limit'; end if;
    insert into study_deck_settings(owner_id,id,payload) values(caller,key,value)
    on conflict(owner_id,id) do update set payload=excluded.payload
      where not coalesce((operation->>'initial')::boolean,false) and (study_deck_settings.payload->>'updated_at')::bigint < (excluded.payload->>'updated_at')::bigint;
  elsif category = 'seed' then
    if value->>'head' is not null or value->'fsrs' <> 'null'::jsonb then raise exception 'Seed cannot invent review history'; end if;
    insert into study_card_states(owner_id,id,payload) values(caller,key,value) on conflict do nothing;
  elsif category = 'event' then
    select payload into current_state from study_card_states
      where owner_id=caller and id=value->>'card_id' for update;
    if current_state is null then raise exception 'Missing initial card state'; end if;
    select payload into existing_event from study_review_events where owner_id=caller and id=key;
    if existing_event is not null then
      if existing_event <> value then raise exception 'Event ID collision'; end if;
      return;
    end if;
    if value->>'kind' not in ('review','introduce','reset') or
       (value->'after'->>'head') is distinct from key or
       (value->'after'->>'id') is distinct from (value->>'card_id') or
       (value->'after'->>'owner_id') is distinct from caller::text or
       (value->'before'->>'head') is distinct from (value->>'parent') then
      raise exception 'Malformed study event';
    end if;
    if value->>'kind' = 'review' and ((value->>'rating')::integer not between 1 and 4 or value->'log'='null'::jsonb) then
      raise exception 'Invalid review';
    end if;
    if value->>'parent' is not null and not exists(select 1 from study_review_events where owner_id=caller and id=value->>'parent' and card_id=value->>'card_id') then
      raise exception 'Missing parent event';
    end if;
    insert into study_review_events(owner_id,id,card_id,payload) values(caller,key,value->>'card_id',value);
    if (current_state->>'head') is not distinct from (value->>'parent') and
       (coalesce((current_state->>'conflict')::boolean,false)=false or value->>'kind'='reset') then
      update study_card_states set payload=value->'after' where owner_id=caller and id=value->>'card_id';
    else
      -- Preserve both branches, retain the canonical state and block automatic scheduling.
      update study_card_states set payload=jsonb_set(current_state,'{conflict}','true') where owner_id=caller and id=value->>'card_id';
    end if;
  else raise exception 'Unsupported study operation';
  end if;
end;
$$;
revoke all on function public.apply_study_operation(jsonb) from public,anon;
grant execute on function public.apply_study_operation(jsonb) to authenticated;
