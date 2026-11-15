-- B: extend existing protected deletion RPCs to cover additive Word child tables.
-- These tables are deleted only AFTER dependent examples, never via CASCADE.
begin;
do $patch$
declare f text; a text;
begin
 f:=pg_get_functiondef('public.delete_dictionary_entry(uuid,bigint,jsonb,uuid)'::regprocedure);
 a:='''dictionary_examples'',''dictionary_lexical_annotations''';
 if strpos(f,a)=0 then raise exception 'Unexpected entry deletion version';end if;
 f:=replace(f,a,'''dictionary_examples'',''dictionary_sense_derivations'',''dictionary_public_notes'',''dictionary_lexical_annotations''');
 execute f;

 f:=pg_get_functiondef('public.delete_dictionary_drafts(jsonb)'::regprocedure);
 a:='  delete from public.dictionary_lexical_annotations where entry_id=any(ids);';
 if strpos(f,a)=0 then raise exception 'Unexpected bulk draft deletion version';end if;
 f:=replace(f,a,
   '  delete from public.dictionary_sense_derivations where entry_id=any(ids);'
   ||chr(10)||
   '  delete from public.dictionary_public_notes where entry_id=any(ids);'
   ||chr(10)||a);
 execute f;
end
$patch$;
commit;
