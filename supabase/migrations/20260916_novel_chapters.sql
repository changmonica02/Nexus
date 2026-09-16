-- Chapters are independent pages records. They inherit owner_id RLS, sync,
-- tombstones and backup support. This migration never alters novel content.
-- Allow the new kind on installations that constrain the kind column.
do $$
declare
  kind_column smallint;
  restriction record;
begin
  select attnum into kind_column from pg_attribute
    where attrelid = 'public.pages'::regclass and attname = 'kind';
  for restriction in
    select conname, pg_get_expr(conbin, conrelid) as expression
    from pg_constraint where conrelid = 'public.pages'::regclass
      and contype = 'c' and conkey = array[kind_column]::smallint[]
  loop
    execute format('alter table public.pages drop constraint %I', restriction.conname);
    execute format('alter table public.pages add constraint %I check ((%s) or kind = ''novel_chapter'')',
      restriction.conname, restriction.expression);
  end loop;
end $$;

alter table public.pages add constraint novel_chapter_required_fields
  check (kind <> 'novel_chapter' or
    (parent_id is not null and parent_id <> id and sort_order is not null
      and title is not null and content_json is not null
      and created_at is not null and updated_at is not null));

create index if not exists pages_novel_chapter_order
  on public.pages (owner_id, parent_id, sort_order)
  where kind = 'novel_chapter' and deleted_at is null;
