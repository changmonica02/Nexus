-- Quiz only. No changes to FSRS state, events, or the production baseline RPC.
create table public.study_card_quiz_states (
  owner_id uuid not null,
  card_id text not null,
  mistake_score integer not null default 0 check (mistake_score between 0 and 4),
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  primary key (owner_id, card_id),
  foreign key (owner_id, card_id) references public.study_cards(owner_id,id)
);
create table public.study_quiz_attempt_receipts (
  owner_id uuid not null,
  event_id text not null,
  card_id text not null,
  correct boolean not null,
  answered_at bigint not null,
  batch_id text not null,
  local_sequence bigint not null,
  applied_revision bigint not null,
  received_at timestamptz not null default now(),
  primary key (owner_id,event_id),
  foreign key (owner_id,card_id) references public.study_cards(owner_id,id)
);
create index study_quiz_receipts_card on public.study_quiz_attempt_receipts(owner_id,card_id);
alter table public.study_card_quiz_states enable row level security;
alter table public.study_quiz_attempt_receipts enable row level security;
create policy quiz_owner_read on public.study_card_quiz_states for select to authenticated using (owner_id=auth.uid());
create policy quiz_owner_read on public.study_quiz_attempt_receipts for select to authenticated using (owner_id=auth.uid());
revoke all on public.study_card_quiz_states,public.study_quiz_attempt_receipts from public,anon,authenticated;
grant select on public.study_card_quiz_states,public.study_quiz_attempt_receipts to authenticated;

create function public.apply_study_quiz_operation(attempt jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  caller uuid := auth.uid();
  receipt public.study_quiz_attempt_receipts%rowtype;
  result public.study_card_quiz_states%rowtype;
  card jsonb;
  -- Keep in sync with QUIZ_SCORE in quizPersistence.ts.
  score_min constant integer := 0;
  score_max constant integer := 4;
  wrong_step constant integer := 1;
  correct_step constant integer := 1;
begin
  if caller is null or (attempt->>'owner_id') is distinct from caller::text then
    raise exception 'QUIZ_OWNER_MISMATCH';
  end if;
  if jsonb_typeof(attempt) is distinct from 'object'
     or not (attempt ?& array['event_id','owner_id','card_id','correct','answered_at','batch_id','local_sequence'])
     or (attempt - array['event_id','owner_id','card_id','correct','answered_at','batch_id','local_sequence']) <> '{}'::jsonb
     or jsonb_typeof(attempt->'correct') is distinct from 'boolean'
     or jsonb_typeof(attempt->'event_id') is distinct from 'string'
     or jsonb_typeof(attempt->'card_id') is distinct from 'string'
     or jsonb_typeof(attempt->'batch_id') is distinct from 'string'
     or length(attempt->>'event_id') not between 1 and 200
     or length(attempt->>'card_id') not between 1 and 1000
     or length(attempt->>'batch_id') not between 1 and 200
     or jsonb_typeof(attempt->'answered_at') is distinct from 'number'
     or jsonb_typeof(attempt->'local_sequence') is distinct from 'number'
     or (attempt->>'answered_at') !~ '^[0-9]{1,15}$'
     or (attempt->>'local_sequence') !~ '^[1-9][0-9]{0,14}$' then
    raise exception 'QUIZ_INVALID_ATTEMPT';
  end if;
  -- Serialize reuse of an event ID even when a collision names a different card.
  perform pg_advisory_xact_lock(hashtextextended(caller::text || ':' || (attempt->>'event_id'),0));
  select * into receipt from public.study_quiz_attempt_receipts
    where owner_id=caller and event_id=attempt->>'event_id';
  if found then
    if receipt.card_id is distinct from (attempt->>'card_id')
      or receipt.correct is distinct from (attempt->>'correct')::boolean
      or receipt.answered_at is distinct from (attempt->>'answered_at')::bigint
      or receipt.batch_id is distinct from (attempt->>'batch_id')
      or receipt.local_sequence is distinct from (attempt->>'local_sequence')::bigint then
      raise exception 'QUIZ_EVENT_COLLISION';
    end if;
    select * into result from public.study_card_quiz_states where owner_id=caller and card_id=receipt.card_id;
    return to_jsonb(result);
  end if;
  select payload into card from public.study_cards
    where owner_id=caller and id=attempt->>'card_id' for share;
  if card is null or (card->>'deleted_at') is not null then
    raise exception 'QUIZ_CARD_UNAVAILABLE';
  end if;
  insert into public.study_card_quiz_states(owner_id,card_id)
    values(caller,attempt->>'card_id') on conflict do nothing;
  select * into result from public.study_card_quiz_states
    where owner_id=caller and card_id=attempt->>'card_id' for update;
  update public.study_card_quiz_states set
    mistake_score=greatest(score_min,least(score_max,mistake_score+
      case when (attempt->>'correct')::boolean then -correct_step else wrong_step end)),
    revision=revision+1,updated_at=clock_timestamp()
    where owner_id=caller and card_id=attempt->>'card_id' returning * into result;
  insert into public.study_quiz_attempt_receipts
    (owner_id,event_id,card_id,correct,answered_at,batch_id,local_sequence,applied_revision)
    values(caller,attempt->>'event_id',attempt->>'card_id',(attempt->>'correct')::boolean,
      (attempt->>'answered_at')::bigint,attempt->>'batch_id',(attempt->>'local_sequence')::bigint,result.revision);
  return to_jsonb(result);
end;
$$;
revoke all on function public.apply_study_quiz_operation(jsonb) from public,anon;
grant execute on function public.apply_study_quiz_operation(jsonb) to authenticated;
