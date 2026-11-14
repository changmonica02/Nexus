-- Retire legacy Inflections from atomic Draft / Review / import / delete functions.
-- IMPORTANT: additive SQL rewrites only; the table is removed in a separate
-- RESTRICT migration after every dependency and test is verified.
begin;
do $patch$
declare f text; a int; b int; prefix text; next_branch text; i int; signature text;
begin
 -- Draft persistence: keep B2 CAS, public note, derivative and Review helpers.
 f:=pg_get_functiondef('public.apply_dictionary_drafts(jsonb,boolean,boolean)'::regprocedure);
 if strpos(f,'dictionary_apply_sense_extensions')=0 or strpos(f,'dictionary_apply_public_notes')=0
 then raise exception 'Expected B2 Draft integrations before Inflections retirement';end if;
 if strpos(f,$q$  if jsonb_typeof(coalesce(d->'inflections','[]')) is distinct from 'array' then raise exception 'Expected inflections array';end if;$q$)=0
 then raise exception 'Unexpected Draft legacy input validation';end if;
 f:=replace(f,$q$  if jsonb_typeof(coalesce(d->'inflections','[]')) is distinct from 'array' then raise exception 'Expected inflections array';end if;$q$||chr(10),
   $q$  if d ? 'inflections' and d->'inflections' is distinct from '[]'::jsonb then raise exception 'Retired Inflections cannot be written';end if;$q$||chr(10));
 f:=replace(f,$q$  if exists(select 1 from jsonb_array_elements(coalesce(d->'inflections','[]')) x group by x->>'id' having count(*)>1) then raise exception 'Duplicate inflection ID';end if;$q$||chr(10),'');
 f:=replace(f,$q$   if d->'ai'->'expected_snapshot'->'detail'->'entry'->>'status'='published' and jsonb_array_length(coalesce(d->'ai'->'expected_snapshot'->'detail'->'inflections','[]'))>0 then raise exception 'Published inflections require snapshot review';end if;$q$||chr(10),'');
 -- Three switch branches: validation, UPDATE, INSERT.
 prefix:=$q$if tbl='dictionary_inflections' then$q$;
 next_branch:=$q$elsif tbl='dictionary_pronunciations' then$q$;
 for i in 1..3 loop
  a:=strpos(f,prefix);
  if a=0 then raise exception 'Expected 3 legacy Draft write branches, reached %',i;end if;
  b:=strpos(substring(f from a),next_branch);
  if b=0 then raise exception 'No pronunciation branch after legacy Inflections';end if;
  f:=left(f,a-1)||$q$if tbl='dictionary_pronunciations' then$q$||
     substring(f from a+b-1+length(next_branch));
 end loop;
 f:=replace(f,$q$'dictionary_inflections',$q$,'');
 f:=replace(f,$q$,'dictionary_inflections'$q$,'');
 f:=replace(f,$q$when 'dictionary_inflections' then 'inflections' $q$,'');
 f:=replace(f,$q$when tbl='dictionary_inflections' then 'inflections' $q$,'');
 if strpos(f,'dictionary_inflections')>0 then raise exception 'Draft still references legacy table';end if;
 execute f;

 -- The existing Review CAS and technical revision rebasing remain unchanged.
 f:=pg_get_functiondef('public.dictionary_materialize_review(uuid,jsonb)'::regprocedure);
 if strpos(f,'dictionary_sense_derivations')=0 or strpos(f,'dictionary_public_notes')=0
 then raise exception 'Expected B2 Review integration';end if;
 if strpos(f,$q$ if not(c ? 'inflections') then c:=jsonb_set(c,'{inflections}',coalesce((select jsonb_agg(to_jsonb(i)-'updated_at') from public.dictionary_inflections i where i.entry_id=eid),'[]'));end if;$q$)=0
 then raise exception 'Unexpected Review legacy inheritance';end if;
 f:=replace(f,$q$ if not(c ? 'inflections') then c:=jsonb_set(c,'{inflections}',coalesce((select jsonb_agg(to_jsonb(i)-'updated_at') from public.dictionary_inflections i where i.entry_id=eid),'[]'));end if;$q$||chr(10),'');
 f:=replace(f,$q$'dictionary_inflections',$q$,'');
 f:=replace(f,$q$,'dictionary_inflections'$q$,'');
 f:=replace(f,$q$when t='dictionary_inflections' then c->'inflections' $q$,'');
 f:=replace(f,$q$when t='dictionary_inflections' then 'inflections' $q$,'');
 if strpos(f,$q$ perform public.apply_dictionary_drafts(jsonb_build_array(c),false,true);$q$)=0
 then raise exception 'Review Draft writer anchor missing';end if;
 f:=replace(f,$q$ perform public.apply_dictionary_drafts(jsonb_build_array(c),false,true);$q$,
   $q$ c:=c-'inflections'; -- Historic review keeps the original stored receipt, but forms never return to Draft.
 perform public.apply_dictionary_drafts(jsonb_build_array(c),false,true);$q$);
 if strpos(f,'dictionary_inflections')>0 then raise exception 'Review still references legacy table';end if;
 execute f;

 -- Import identity comparison must protect B2 stable IDs before applying changes.
 f:=pg_get_functiondef('public.dictionary_import_context(jsonb)'::regprocedure);
 if strpos(f,'dictionary_sense_derivations')=0 or strpos(f,'dictionary_public_notes')=0
 then raise exception 'Expected B2 import identity mapping';end if;
 f:=replace(f,$q$'dictionary_inflections',$q$,'');
 f:=replace(f,$q$,'dictionary_inflections'$q$,'');
 f:=replace(f,$q$when t='dictionary_inflections' then candidate->'inflections' $q$,'');
 if strpos(f,'dictionary_inflections')>0 then raise exception 'Import context still references legacy table';end if;
 execute f;

 -- Lock B2 tables in the existing import serialization transaction; check
 -- stable IDs of all imported child rows, including derivations and public notes.
 foreach signature in array array[
   'public.apply_dictionary_import_operation(jsonb)',
   'public.apply_dictionary_import_reviews(jsonb)',
   'public.apply_dictionary_safe_import_reviews(jsonb)'
 ] loop
  f:=pg_get_functiondef(signature::regprocedure);
  if strpos(f,'public.dictionary_inflections')=0 then raise exception 'Unexpected import lock layout: %',signature;end if;
  f:=replace(f,'public.dictionary_inflections,','public.dictionary_sense_derivations,public.dictionary_public_notes,');
  f:=replace(f,',public.dictionary_inflections',',public.dictionary_sense_derivations,public.dictionary_public_notes');
  f:=replace(f,$q$'dictionary_inflections',$q$,'');
  f:=replace(f,$q$,'dictionary_inflections'$q$,'');
  f:=replace(f,$q$when t='dictionary_inflections' then candidate->'inflections' $q$,
    $q$when t='dictionary_sense_derivations' then candidate->'derivations' when t='dictionary_public_notes' then candidate->'public_notes' $q$);
  f:=replace(f,$q$when t='dictionary_inflections' then c->'inflections' $q$,
    $q$when t='dictionary_sense_derivations' then c->'derivations' when t='dictionary_public_notes' then c->'public_notes' $q$);
  if strpos(f,'dictionary_inflections')>0 then raise exception 'Import authority still references legacy table: %',signature;end if;
  execute f;
 end loop;

 -- Guarded deletion still uses parent CAS, tombstones and existing Review safeguards.
 f:=pg_get_functiondef('public.delete_dictionary_entry(uuid,bigint,jsonb,uuid)'::regprocedure);
 f:=replace(f,$q$'dictionary_inflections',$q$,'');
 f:=replace(f,$q$,'dictionary_inflections'$q$,'');
 if strpos(f,'dictionary_inflections')>0 then raise exception 'Entry delete still references forms';end if;
 execute f;

 f:=pg_get_functiondef('public.delete_dictionary_drafts(jsonb)'::regprocedure);
 if strpos(f,$q$  delete from public.dictionary_inflections where entry_id=any(ids);$q$)=0
 then raise exception 'Draft delete expected legacy row';end if;
 f:=replace(f,$q$  delete from public.dictionary_inflections where entry_id=any(ids);$q$||chr(10),'');
 if strpos(f,'dictionary_inflections')>0 then raise exception 'Draft delete still references forms';end if;
 execute f;

 -- New Review candidates contain no forms. Old Review JSON is untouched.
 f:=pg_get_functiondef('public.dictionary_snapshot_candidate(jsonb)'::regprocedure);
 f:=replace(f,$q$  'inflections',coalesce((select jsonb_agg(value-'updated_at') from jsonb_array_elements(coalesce(s->'detail'->'inflections','[]'))),'[]'),$q$||chr(10),'');
 execute f;
 f:=pg_get_functiondef('public.dictionary_overlay_candidate(jsonb,jsonb)'::regprocedure);
 f:=replace(f,$q$,'inflections'$q$,'');
 execute f;
end
$patch$;

-- The migration never deletes old historical Review receipts or card records.
-- It deliberately does NOT DROP the Inflections table.
do $verify$
declare proc record; def text;
begin
 for proc in
   select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname in
   ('apply_dictionary_drafts','dictionary_materialize_review','dictionary_import_context',
    'apply_dictionary_import_operation','apply_dictionary_import_reviews','apply_dictionary_safe_import_reviews',
    'delete_dictionary_entry','delete_dictionary_drafts')
 loop
  def:=pg_get_functiondef(proc.oid);
  if strpos(def,'dictionary_inflections')>0 then raise exception 'Remaining legacy reference in %',proc.proname;end if;
 end loop;
end $verify$;
notify pgrst,'reload schema';
commit;
