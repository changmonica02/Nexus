-- Retire the discontinued four-choice Quiz storage and its RPC.
-- Ordinary study_cards, study_card_states, review events, Session and FSRS
-- are independent and must remain intact. Never silently discard Quiz data.
begin;

lock table public.study_card_quiz_states,public.study_quiz_attempt_receipts in access exclusive mode;
do $retire$
declare
  d text;
  old_receipts constant text := '  delete from public.study_quiz_attempt_receipts q using public.study_cards c where c.owner_id=actor and c.payload->>''deck_id''=delete_official_study_pack.deck_id and q.owner_id=actor and q.card_id=c.id;' || chr(13) || chr(10);
  old_states constant text := '  delete from public.study_card_quiz_states q using public.study_cards c where c.owner_id=actor and c.payload->>''deck_id''=delete_official_study_pack.deck_id and q.owner_id=actor and q.card_id=c.id;' || chr(13) || chr(10);
begin
  if exists(select 1 from public.study_card_quiz_states limit 1)
    or exists(select 1 from public.study_quiz_attempt_receipts limit 1) then
    raise exception 'Quiz retirement blocked: remaining Quiz user records require review';
  end if;
  if to_regprocedure('public.apply_study_quiz_operation(jsonb)') is null then
    raise exception 'Unexpected Quiz RPC version';
  end if;
  d := pg_get_functiondef('public.delete_official_study_pack(text)'::regprocedure);
  if d is null or strpos(d,old_receipts)=0 or strpos(d,old_states)=0 then
    raise exception 'Unexpected official pack deletion RPC version';
  end if;
  d:=replace(replace(d,old_receipts,''),old_states,'');
  execute d;

  if exists(
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f'
    and p.proname <> 'apply_study_quiz_operation'
    and (pg_get_functiondef(p.oid) ilike '%study_card_quiz_states%'
       or pg_get_functiondef(p.oid) ilike '%study_quiz_attempt_receipts%')
  ) then
    raise exception 'Other live RPCs still refer to retired Quiz tables';
  end if;
end
$retire$;

drop function public.apply_study_quiz_operation(jsonb) restrict;
drop table public.study_quiz_attempt_receipts restrict;
drop table public.study_card_quiz_states restrict;
notify pgrst,'reload schema';
commit;
