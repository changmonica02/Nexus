-- Superseded before production application by
-- 20261105091518_dictionary_pronunciation_columns_retired.sql.
-- Intentionally no cleanup/trigger: that independent migration physically retires
-- locale/note and handles deployments where the earlier trigger was already applied.
do $$begin raise notice 'IPA value-only cleanup superseded by physical column retirement';end$$;
