-- B2 Review / CAS extension: preserve historical reviews, support explicitly
-- supplied Word derivations in the existing approval transaction.
-- Requires 20261114135000 and 20261114152000.
begin;
do $patch$
declare f text; oldtext text; newtext text;
begin
  -- Older review writers must inherit all existing derivations, so that
  -- an unrelated review can never silently erase previously published B2 data.
  f:=pg_get_functiondef('public.dictionary_snapshot_candidate(jsonb)'::regprocedure);
  oldtext:='  ''pronunciations'',coalesce(';
  if strpos(f,oldtext)=0 or strpos(f,'''derivations'',')>0
    then raise exception 'Unexpected snapshot candidate RPC';end if;
  newtext:='  ''derivations'',coalesce((select jsonb_agg(value-''updated_at'') '
    ||'from jsonb_array_elements(coalesce(s->''detail''->''derivations'',''[]''::jsonb))),''[]''::jsonb),'
    ||chr(10)||oldtext;
  f:=replace(f,oldtext,newtext);
  execute f;

  f:=pg_get_functiondef('public.dictionary_overlay_candidate(jsonb,jsonb)'::regprocedure);
  oldtext:='''annotations'',''inflections'',''pronunciations''';
  if strpos(f,oldtext)=0 or strpos(f,'''derivations''')>0
    then raise exception 'Unexpected overlay candidate RPC';end if;
  f:=replace(f,oldtext,'''annotations'',''inflections'',''pronunciations'',''derivations''');
  execute f;

  -- Review validation and approval both call this function; keep the entire
  -- snapshot CAS and already installed approval-capability checks untouched.
  f:=pg_get_functiondef('public.dictionary_materialize_review(uuid,jsonb)'::regprocedure);
  oldtext:=' if not(c ? ''inflections'') then';
  if strpos(f,oldtext)=0
    or strpos(f,'''dictionary_senses''] loop')=0
    or strpos(f,' perform public.apply_dictionary_drafts(jsonb_build_array(c),false,true);')=0
    or strpos(f,'''dictionary_inflections''] loop')=0
    then raise exception 'Unexpected materialize Review RPC';end if;

  -- Preserve older saved review candidates that lack the B2 section.
  -- Preserve the original review snapshot and fingerprint unchanged.
  f:=replace(f,oldtext,
    ' if not(c ? ''derivations'') then '
    ||'c:=jsonb_set(c,''{derivations}'',coalesce((select jsonb_agg(to_jsonb(x)-''updated_at'' '
    ||'order by x.sort_order,x.id) from public.dictionary_sense_derivations x '
    ||'where x.entry_id=eid),''[]''::jsonb));end if;'
    ||chr(10)||oldtext);

  -- Existing removal loop must handle examples first. A missing derivation
  -- only disappears after its linked examples have been removed; FK RESTRICT
  -- rejects the deletion if any surviving example still refers to it.
  oldtext:='''dictionary_lexical_annotations'',''dictionary_senses''] loop';
  newtext:='''dictionary_lexical_annotations''] loop';
  if strpos(f,oldtext)=0 then raise exception 'Unexpected Review child deletion order';end if;
  f:=replace(f,oldtext,newtext);
  oldtext:=' -- Rebase technical child revisions only after the complete base snapshot was checked.';
  if strpos(f,oldtext)=0 then raise exception 'Unexpected Review rebase anchor';end if;
  newtext:=
    ' if jsonb_typeof(c->''derivations'') is distinct from ''array'' '
    ||'then raise exception ''Invalid Review derivations'';end if;'
    ||chr(10)||
    ' delete from public.dictionary_sense_derivations x where x.entry_id=eid '
    ||'and not exists(select 1 from jsonb_array_elements(c->''derivations'') r '
    ||'where (r->>''id'')::uuid=x.id);'
    ||chr(10)||
    ' delete from public.dictionary_senses x where x.entry_id=eid '
    ||'and not exists(select 1 from jsonb_array_elements(c->''bundle''->''dictionary_senses'') r '
    ||'where (r->>''id'')::uuid=x.id);'
    ||chr(10)||oldtext;
  f:=replace(f,oldtext,newtext);

  -- The existing rebase loop updates technical revisions only, without
  -- renumbering any stable IDs or mutating the original stored candidate.
  oldtext:=' perform public.apply_dictionary_drafts(jsonb_build_array(c),false,true);';
  newtext:=
    ' nextrows:=''[]''::jsonb;'
    ||chr(10)||
    ' for r in select value from jsonb_array_elements(c->''derivations'') loop'
    ||chr(10)||
    '   if r->>''entry_id'' is distinct from eid::text then '
    ||'raise exception ''Review derivation ownership mismatch'';end if;'
    ||chr(10)||
    '   select to_jsonb(x) into current_row from public.dictionary_sense_derivations x '
    ||'where x.id=(r->>''id'')::uuid;'
    ||chr(10)||
    '   if current_row is not null and current_row->>''entry_id'' is distinct from eid::text '
    ||'then raise exception ''Stable derivation ID belongs to another entry'';end if;'
    ||chr(10)||
    '   r:=r-''revision''-''updated_at'';'
    ||chr(10)||
    '   if current_row is not null then r:=r||jsonb_build_object(''revision'',current_row->''revision'');end if;'
    ||chr(10)||
    '   nextrows:=nextrows||jsonb_build_array(r);'
    ||chr(10)||
    ' end loop;'
    ||chr(10)||
    ' c:=jsonb_set(c,''{derivations}'',nextrows);'
    ||chr(10)||
    ' c:=jsonb_set(c,''{replace_editor_children}'',''true''::jsonb);'
    ||chr(10)||oldtext;
  f:=replace(f,oldtext,newtext);
  execute f;
end
$patch$;
notify pgrst,'reload schema';
commit;
