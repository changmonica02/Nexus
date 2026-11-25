begin;
lock table public.dictionary_entries, public.dictionary_senses, public.dictionary_learning_notes in share row exclusive mode;
do $patch$ declare f text; begin
 f:=pg_get_functiondef('public.dictionary_valid_morpheme_sense(text,text,jsonb)'::regprocedure);
 if strpos(f,'"derivation":[]')=0 then raise exception 'Unexpected category definition'; end if;
 execute replace(f,'"derivation":[]','"derivation":["verb","noun","adjective","variable"]');
 f:=pg_get_functiondef('public.dictionary_guard_change()'::regprocedure);
 if strpos(f,'if tg_table_name = ''dictionary_senses'' then')=0 then raise exception 'Unexpected guard definition'; end if;
 execute replace(f,'if tg_table_name = ''dictionary_senses'' then','if tg_table_name = ''dictionary_learning_notes'' and parent.kind <> ''word'' and new.sense_id is null then raise exception ''Morpheme concepts require a sense''; end if; if tg_table_name = ''dictionary_senses'' then');
 if exists(select 1 from public.dictionary_learning_notes n join public.dictionary_entries e on e.id=n.entry_id where e.kind<>'word' and n.sense_id is null) then raise exception 'Existing unassigned morpheme concepts'; end if;
end $patch$;
alter table public.dictionary_senses disable trigger dictionary_guard;
update public.dictionary_senses s set semantic_subdomain='noun',revision=s.revision+1,updated_at=now() from public.dictionary_entries e where e.id=s.entry_id and e.kind='suffix' and e.headword='ion' and s.semantic_domain='derivation' and s.semantic_subdomain is null;
alter table public.dictionary_senses enable trigger dictionary_guard;
do $verify$ begin
 if exists(select 1 from public.dictionary_senses where not public.dictionary_valid_morpheme_sense(semantic_domain,semantic_subdomain,variants)) then raise exception 'Invalid existing sense'; end if;
 if not public.dictionary_valid_morpheme_sense('derivation','noun',null) or public.dictionary_valid_morpheme_sense('derivation','movement',null) then raise exception 'Invalid validator'; end if;
end $verify$;
notify pgrst,'reload schema';
commit;
