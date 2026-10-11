-- Allow private text edits only; preserve pack identity and deletion guards.
begin;
create or replace function public.guard_official_study_content() returns trigger
language plpgsql security definer set search_path='' as $$
declare deck text;
begin
  if tg_table_name='study_cards' and tg_op='UPDATE' and old.payload ? 'official_pack_id' and
     (new.payload - array['updated_at','content_revision','migration_only','front','back']) is distinct from (old.payload - array['updated_at','content_revision','migration_only','front','back']) then raise exception 'Official card source identity is immutable'; end if;
  deck:=case when tg_table_name='study_deck_settings' then new.id else new.payload->>'deck_id' end;
  if not (new.payload ? 'official_pack_id') and not exists(select 1 from public.official_study_pack_downloads d where d.owner_id=new.owner_id and d.deck_id=deck) then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('workspace:'||new.owner_id::text,0));
  if exists(select 1 from public.official_study_pack_downloads d where d.owner_id=new.owner_id and d.deck_id=deck and d.deleted_at is not null) then raise exception 'Official study set was deleted'; end if;
  return new;
end $$;
commit;
