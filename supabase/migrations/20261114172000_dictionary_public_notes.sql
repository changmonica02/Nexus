-- B phase: public Word notes are separate from mnemonic/etymology records.
-- Additive only. Existing Sense-owned notes and histories are never reparented.
begin;
create table public.dictionary_public_notes (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null unique references public.dictionary_entries(id) on delete restrict,
  body text not null check (length(btrim(body)) > 0 and length(body) <= 100000),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
create function public.dictionary_public_notes_word_only()
returns trigger language plpgsql set search_path='' as $body$
begin
 if not exists(select 1 from public.dictionary_entries e
  where e.id=new.entry_id and e.kind='word') then
  raise exception 'Public notes belong to a Word entry';
 end if;
 return new;
end $body$;
create trigger dictionary_public_notes_word_only
  before insert or update of entry_id on public.dictionary_public_notes
  for each row execute function public.dictionary_public_notes_word_only();
alter table public.dictionary_public_notes enable row level security;
revoke all on public.dictionary_public_notes from public,anon,authenticated;
grant select on public.dictionary_public_notes to authenticated;
create policy dictionary_public_notes_read on public.dictionary_public_notes
 for select to authenticated using (
  public.is_dictionary_admin() or exists (
   select 1 from public.dictionary_entries e
   where e.id=entry_id and e.status='published'
  )
 );
-- Publication visibility is provided through the existing published entry RPC;
-- this table is deliberately not directly writable by the client.
do $patch$
declare f text;
begin
 f:=pg_get_functiondef('public.get_dictionary_entry(uuid)'::regprocedure);
 if strpos(f,'''learning_notes'',coalesce(')=0 then raise exception 'Unexpected dictionary entry reader';end if;
 f:=replace(f,'''learning_notes'',coalesce(',
   '''public_notes'',coalesce((select jsonb_agg(to_jsonb(p) order by p.id) '
   ||'from public.dictionary_public_notes p where p.entry_id=e.id),''[]''::jsonb),'
   ||chr(10)||'    ''learning_notes'',coalesce(');
 execute f;
 f:=pg_get_functiondef('public.get_published_dictionary_entry(uuid)'::regprocedure);
 if strpos(f,'''learning_notes'',coalesce(')=0 then raise exception 'Unexpected published entry reader';end if;
 f:=replace(f,'''learning_notes'',coalesce(',
   '''public_notes'',coalesce((select jsonb_agg(p) from '
   ||'(select id,entry_id,body from public.dictionary_public_notes where entry_id=v.id) p),''[]''::jsonb),'
   ||chr(10)||'    ''learning_notes'',coalesce(');
 execute f;
end $patch$;
notify pgrst,'reload schema';
commit;
