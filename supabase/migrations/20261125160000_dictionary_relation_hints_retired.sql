-- Retire the old relation hint feature without cascading into other dictionary objects.
begin;
do $patch$
declare p record; f text; old_f text; a integer; b integer;
begin
 for p in select x.oid,x.proname from pg_proc x join pg_namespace n on n.oid=x.pronamespace
 where n.nspname='public' and x.prokind='f' and x.prosrc ~ 'dictionary_lexical_annotations|lexical_annotations|relation_hints?|''annotations'''
 loop
  f:=pg_get_functiondef(p.oid); old_f:=f;
  if p.proname='apply_dictionary_drafts' then
   a:=strpos(f,$q$for item in select value from jsonb_array_elements(coalesce(d->'ai'->'expected_snapshot'->'detail'->'lexical_annotations','[]')) loop$q$);
   if a=0 then raise exception 'Unexpected legacy draft loop';end if;
   b:=strpos(substring(f from a),'end loop;');
   if b=0 then raise exception 'Missing legacy draft loop end';end if;
   f:=left(f,a-1)||substring(f from a+b-1+length('end loop;'));
   f:=regexp_replace(f,$q$[ \t]*if tbl='dictionary_lexical_annotations' and old_row[^\n]*\n$q$,'');
   f:=regexp_replace(f,$q$else insert into public\.dictionary_lexical_annotations[^\n]*end if;$q$,'end if;');
   f:=replace(f,$q$when tbl='dictionary_pronunciations' then 'pronunciations' else 'annotations' end$q$,$q$else 'pronunciations' end$q$);
  end if;
  f:=regexp_replace(f,$q$[ \t]*'lexical_annotations',coalesce\([^\n]*\n$q$,'','g');
  f:=regexp_replace(f,$q$[ \t]*'annotations',coalesce\([^\n]*\n$q$,'','g');
  f:=regexp_replace(f,$q$[ \t]*delete from public\.dictionary_lexical_annotations where entry_id=any\(ids\);\n$q$,'','g');
  f:=regexp_replace(f,$q$[ \t]*union all select entry_id,'annotation',id,jsonb_build_array\(id,revision\) from public\.dictionary_lexical_annotations where entry_id=any\(ids\)\n$q$,'','g');
  f:=replace(f,$q$ or exists(select 1 from public.dictionary_lexical_annotations where sense_id=old.id)$q$,'');
  f:=replace(f,'examples or lexical annotations','examples');
  f:=replace(f,$q$when 'dictionary_lexical_annotations' then 'annotations' $q$,'');
  f:=regexp_replace(f,$q$when t='dictionary_lexical_annotations' then (candidate->'annotations'|c->'annotations'|'annotations') $q$,'','g');
  f:=replace(f,$q$when 'relation_hints' then 'annotations' $q$,'');
  f:=replace(f,'public.dictionary_lexical_annotations,','');
  f:=replace(f,',public.dictionary_lexical_annotations','');
  f:=replace(f,$q$'dictionary_lexical_annotations',$q$,'');
  f:=replace(f,$q$,'dictionary_lexical_annotations'$q$,'');
  f:=replace(f,$q$,'lexical_annotations'$q$,'');
  f:=replace(f,$q$,'relation_hints'$q$,'');
  f:=replace(f,$q$,'annotations'$q$,'');
  if f ~ 'dictionary_lexical_annotations|lexical_annotations|relation_hints?|''annotations''' then
   raise exception 'Unresolved retired annotation dependency: %',p.proname;
  end if;
  if f<>old_f then execute f;end if;
 end loop;
end
$patch$;
-- Never cascade. Any external dependency causes the entire migration to fail.
drop table public.dictionary_lexical_annotations restrict;
notify pgrst,'reload schema';
commit;
