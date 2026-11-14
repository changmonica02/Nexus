-- Retire only the one-off administrator Review cleanup endpoints (#174).
-- Keep the cleanup receipts and the stage_dictionary_import_reviews replay barrier.
-- These are normal user Review workflows, NOT a deletion of pending items.
begin;

do $check$
declare
  staging text;
begin
  staging := pg_get_functiondef('public.stage_dictionary_import_reviews(jsonb)'::regprocedure);
  if staging is null
     or strpos(staging, 'review_cleanup') = 0
     or strpos(staging, 'invalidated_sessions') = 0
     or strpos(staging, 'source_preview_at') = 0 then
    raise exception 'Cannot retire cleanup endpoints: stale import replay barrier is missing';
  end if;
  if to_regprocedure('public.clear_dictionary_pending_reviews(jsonb,uuid)') is null
     or to_regprocedure('public.preview_dictionary_review_cleanup()') is null then
    raise exception 'Unexpected review cleanup function version';
  end if;
end
$check$;

drop function public.clear_dictionary_pending_reviews(jsonb,uuid) restrict;
drop function public.preview_dictionary_review_cleanup() restrict;

-- The historical maintenance receipt in dictionary_import_operations must survive:
-- stage_dictionary_import_reviews still uses it to reject obsolete previews.
commit;
