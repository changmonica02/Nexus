begin;
-- Keep table-specific record field access in a separate PL/pgSQL statement.
do $patch$
declare f text; old_clause text := 'if tg_table_name = ''dictionary_learning_notes'' and parent.kind <> ''word'' and new.sense_id is null then raise exception ''Morpheme concepts require a sense''; end if;';
new_clause text := 'if tg_table_name = ''dictionary_learning_notes'' then if parent.kind <> ''word'' and new.sense_id is null then raise exception ''Morpheme concepts require a sense''; end if; end if;';
begin
 f:=pg_get_functiondef('public.dictionary_guard_change()'::regprocedure);
 if strpos(f,new_clause)>0 then return; end if;
 if (length(f)-length(replace(f,old_clause,'')))/length(old_clause)<>1 then raise exception 'Unexpected guard definition'; end if;
 execute replace(f,old_clause,new_clause);
end $patch$;
notify pgrst,'reload schema';
commit;
