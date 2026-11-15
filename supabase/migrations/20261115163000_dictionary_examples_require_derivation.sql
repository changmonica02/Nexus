-- Latest-only dictionary examples: Word derivation owns zero or one example.
-- Chinese translation remains optional. Existing examples are checked, never rewritten.
do $$
begin
 if exists(select 1 from public.dictionary_examples where derivation_id is null) then
   raise exception 'Unlinked legacy examples must be resolved before migration';
 end if;
 if exists(select 1 from public.dictionary_examples x join public.dictionary_entries e on e.id=x.entry_id where e.kind<>'word') then
   raise exception 'Prefix/root/suffix example records are unsupported';
 end if;
end $$;
alter table public.dictionary_examples alter column derivation_id set not null;
