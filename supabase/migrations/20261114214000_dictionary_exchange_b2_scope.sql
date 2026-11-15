-- B phase: include all new Word content in exchange optimistic version stamps
-- and import identity lookups. Older import reviews remain read-only.
-- This migration is additive and must be installed after B2 Word content tables.
begin;
do $patch$
declare f text; anchor text;
begin
 f:=pg_get_functiondef('public.dictionary_exchange_scope_version(uuid[])'::regprocedure);
 anchor:='''dictionary_pronunciations'',''dictionary_inflections'',';
 if strpos(f,anchor)=0 or strpos(f,'''dictionary_sense_derivations''')>0
   then raise exception 'Unexpected exchange scope RPC; review dependencies before continuing';end if;
 f:=replace(f,anchor,
  '''dictionary_pronunciations'',''dictionary_inflections'',''dictionary_sense_derivations'',''dictionary_public_notes'',');
 execute f;

 f:=pg_get_functiondef('public.dictionary_import_context(jsonb)'::regprocedure);
 anchor:='''dictionary_pronunciations'',''dictionary_inflections''] loop';
 if strpos(f,anchor)=0 or strpos(f,'''dictionary_sense_derivations''')>0
   then raise exception 'Unexpected import context RPC; review dependencies before continuing';end if;
 f:=replace(f,anchor,
  '''dictionary_pronunciations'',''dictionary_inflections'',''dictionary_sense_derivations'',''dictionary_public_notes''] loop');
 anchor:='when t=''dictionary_inflections'' then candidate->''inflections''';
 if strpos(f,anchor)=0 then raise exception 'Missing import context candidate projection';end if;
 f:=replace(f,anchor,
   'when t=''dictionary_sense_derivations'' then candidate->''derivations'' '
   ||'when t=''dictionary_public_notes'' then candidate->''public_notes'' '
   ||anchor);
 execute f;
end
$patch$;

-- Block deployment if a later function definition unexpectedly drops the
-- newly versioned tables. This also makes the intended scope explicit.
do $verify$
declare definition text;
begin
 definition:=pg_get_functiondef('public.dictionary_exchange_scope_version(uuid[])'::regprocedure);
 if strpos(definition,'''dictionary_sense_derivations''')=0
    or strpos(definition,'''dictionary_public_notes''')=0 then
   raise exception 'B2 exchange scope missing new data tables';
 end if;
 definition:=pg_get_functiondef('public.dictionary_import_context(jsonb)'::regprocedure);
 if strpos(definition,'''dictionary_sense_derivations''')=0
    or strpos(definition,'''dictionary_public_notes''')=0 then
   raise exception 'B2 import identity lookup missing new data tables';
 end if;
end
$verify$;
commit;
