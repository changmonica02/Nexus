-- B phase: retire Inflections from entry readers, guards and exchange stamps.
-- No data is dropped here; legacy reviews keep their original JSON unchanged.
-- Execute after the B2 schema/read additions and exchange scope version patch.
begin;
do $patch$
declare f text; a text; b text;
begin
 f:=pg_get_functiondef('public.get_dictionary_entry(uuid)'::regprocedure);
 a:='    ''inflections'',coalesce((select jsonb_agg(i order by i.sort_order,i.id) from public.dictionary_inflections i where i.entry_id=entry_uuid),''[]''::jsonb),'||chr(10);
 if strpos(f,a)=0 then raise exception 'Unexpected dictionary entry reader Inflections dependency';end if;
 execute replace(f,a,'');

 f:=pg_get_functiondef('public.get_published_dictionary_entry(uuid)'::regprocedure);
 a:='    ''inflections'',coalesce((select jsonb_agg(i order by i.sort_order,i.id) from (select id,entry_id,sense_id,form_kind,form,sort_order from public.dictionary_inflections where entry_id=v.id) i),''[]''::jsonb),'||chr(10);
 if strpos(f,a)=0 then raise exception 'Unexpected public dictionary reader Inflections dependency';end if;
 execute replace(f,a,'');

 f:=pg_get_functiondef('public.guard_dictionary_extension_sense_delete()'::regprocedure);
 a:=' if exists(select 1 from public.dictionary_inflections where sense_id=old.id) then raise exception ''Sense contains inflections; remove or reassign first'';end if;'||chr(10);
 if strpos(f,a)=0 then raise exception 'Unexpected sense-delete guard Inflections dependency';end if;
 execute replace(f,a,'');

 f:=pg_get_functiondef('public.dictionary_guard_change()'::regprocedure);
 a:='      if exists(select 1 from public.dictionary_inflections i where i.entry_id=new.id and not exists(select 1 from public.dictionary_senses s where s.entry_id=new.id and (i.sense_id is null or i.sense_id=s.id) and case when i.form_kind in (''past'',''past_participle'',''present_participle'',''third_person_singular'') then lower(btrim(s.part_of_speech)) in (''v'',''v.'',''verb'',''動詞'') when i.form_kind=''plural'' then lower(btrim(s.part_of_speech)) in (''n'',''n.'',''noun'',''名詞'') else lower(btrim(s.part_of_speech)) in (''adj'',''adj.'',''adjective'',''形容詞'',''adv'',''adv.'',''adverb'',''副詞'') end)) then raise exception ''Inflection kind does not match sense POS'';end if;'||chr(10);
 if strpos(f,a)=0 then raise exception 'Unexpected dictionary publish guard Inflections dependency';end if;
 execute replace(f,a,'');

 f:=pg_get_functiondef('public.dictionary_exchange_scope_version(uuid[])'::regprocedure);
 a:='''dictionary_inflections'',';
 b:='';
 if strpos(f,a)>0 then
  -- The scope version patch may place new tables after Inflections.
  execute replace(f,a,b);
 elsif strpos(f,'''dictionary_inflections''')>0 then
  a:='''dictionary_inflections''';
  if strpos(f,a)=0 then raise exception 'Unexpected exchange scope Inflections reference';end if;
  f:=replace(f,a,'''dictionary_public_notes''');
  -- Avoid producing a duplicate public-notes entry in a historical scope.
  if strpos(f,'''dictionary_public_notes'',''dictionary_public_notes''')>0 then
   f:=replace(f,'''dictionary_public_notes'',''dictionary_public_notes''','''dictionary_public_notes''');
  end if;
  execute f;
 end if;
end $patch$;

-- Fail closed: every selected RPC must have stopped referencing the retired table.
do $verify$
declare name text; def text;
begin
 foreach name in array array[
  'get_dictionary_entry','get_published_dictionary_entry',
  'guard_dictionary_extension_sense_delete','dictionary_guard_change',
  'dictionary_exchange_scope_version'
 ] loop
  select pg_get_functiondef(p.oid) into def from pg_proc p
   join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname=name limit 1;
  if def is null or strpos(def,'dictionary_inflections')>0 then
   raise exception 'Inflections still referenced by %',name;
  end if;
 end loop;
end $verify$;
notify pgrst,'reload schema';
commit;
