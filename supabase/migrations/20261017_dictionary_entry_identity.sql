-- One canonical Entry per kind + normalized spelling. Existing identities are never merged.
begin;
lock table public.dictionary_entries in share row exclusive mode;
do $$
declare duplicates text;
begin
 select string_agg(kind || ':' || spelling || ' [' || ids || ']', E'\n') into duplicates
 from (select kind, lower(btrim(headword)) spelling, string_agg(id::text, ', ' order by id) ids
       from public.dictionary_entries group by kind,lower(btrim(headword)) having count(*)>1) d;
 if duplicates is not null then
  raise exception 'Dictionary identity duplicates require manual review; no IDs or content have been changed'
   using detail=duplicates, hint='Review legacy duplicate Entries (including copied review drafts) before applying this migration. Do not delete linked identities automatically.';
 end if;
end $$;
-- A unique index protects all RPCs and direct administrator writes, including concurrent inserts.
create unique index dictionary_entries_unique_kind_headword
 on public.dictionary_entries(kind,lower(btrim(headword)));
commit;
