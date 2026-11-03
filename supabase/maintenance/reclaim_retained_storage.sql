-- Refs #128. OPTIONAL physical compaction AFTER dictionary_current_content_only.
-- Run separately with psql -v ON_ERROR_STOP=1 -f this-file, as database owner,
-- outside any transaction and in a low-traffic window. Never run via db push.
-- VACUUM FULL briefly blocks readers/writers; timeout rather than queue forever.
-- It does NOT prune live sync markers, FSRS events, tombstones, receipts or drafts.
set lock_timeout='5s';
set statement_timeout='120s';
select relname,pg_total_relation_size(relid) as bytes_before
from pg_stat_user_tables where relname in
 ('dictionary_import_operations','dictionary_review_drafts','study_sync_changes');
vacuum (full,analyze) public.dictionary_import_operations;
vacuum (full,analyze) public.dictionary_review_drafts;
vacuum (full,analyze) public.study_sync_changes;
select relname,pg_total_relation_size(relid) as bytes_after
from pg_stat_user_tables where relname in
 ('dictionary_import_operations','dictionary_review_drafts','study_sync_changes');
reset lock_timeout;
reset statement_timeout;
