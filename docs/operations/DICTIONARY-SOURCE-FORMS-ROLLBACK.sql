-- Operator-only rollback. Abort rather than overwrite work created after deployment.
-- Run in one transaction; never expose the backup schema to PostgREST.
begin;
select pg_advisory_xact_lock(710,1);
lock table public.dictionary_lexical_annotations,public.dictionary_review_drafts,public.dictionary_import_review_items in share row exclusive mode;
do $$begin
 if exists(select 1 from dictionary_retirement_backup.review_drafts_after b left join public.dictionary_review_drafts r using(id) where to_jsonb(r) is distinct from to_jsonb(b))
 or exists(select 1 from dictionary_retirement_backup.import_review_items_after b left join public.dictionary_import_review_items r using(id) where to_jsonb(r) is distinct from to_jsonb(b))
 or exists(select 1 from dictionary_retirement_backup.source_forms b join public.dictionary_lexical_annotations r using(id))
 then raise exception 'Post-retirement work exists; restore requires manual reconciliation, nothing changed';end if;
end$$;
alter table public.dictionary_lexical_annotations drop constraint dictionary_lexical_annotations_kind_check;
alter table public.dictionary_lexical_annotations add constraint dictionary_lexical_annotations_kind_check check(kind in ('source_forms','relation_hint'));
insert into public.dictionary_lexical_annotations select * from dictionary_retirement_backup.source_forms;
-- Revisions remain monotonic, invalidating both pre-migration and post-migration stale clients.
update public.dictionary_review_drafts r set candidate=b.candidate,base_snapshot=b.base_snapshot,revision=r.revision+1,updated_at=now()
 from dictionary_retirement_backup.review_drafts b where r.id=b.id;
update public.dictionary_import_review_items r set item=b.item,pending_count=b.pending_count,revision=r.revision+1,updated_at=now()
 from dictionary_retirement_backup.import_review_items b where r.id=b.id;
notify pgrst,'reload schema';
commit;
