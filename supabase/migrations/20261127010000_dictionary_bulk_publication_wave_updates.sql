begin;
do $migration$
declare definition text := pg_get_functiondef('public.dictionary_bulk_publish_work(text[],text,boolean,text)'::regprocedure);
begin
  definition := replace(definition,
    'version_row record; result jsonb; token uuid; after_stamp text;',
    'version_row record; result jsonb; token uuid; after_stamp text; wave_plan jsonb; wave_baselines jsonb;');
  definition := replace(definition,
    '   foreach token in array eligible loop',
    '   wave_plan:=''{}'';wave_baselines:=''{}'';
   foreach token in array eligible loop');
  definition := replace(definition,
    $$     baselines:=jsonb_set(baselines,array[token::text],jsonb_build_object('stamp',after_stamp,'status','published'));
     select jsonb_agg(case when n->>'id'=token::text then n||jsonb_build_object('state','published') else n end order by n->>'id') into plan from jsonb_array_elements(plan) n;$$,
    $$     wave_baselines:=wave_baselines||jsonb_build_object(token::text,jsonb_build_object('stamp',after_stamp,'status','published'));
     wave_plan:=wave_plan||jsonb_build_object(token::text,jsonb_build_object('state','published'));$$);
  definition := replace(definition,
    $$     select jsonb_agg(case when n->>'id'=token::text then n||jsonb_build_object('state','invalid','reason',failure_reason) else n end order by n->>'id') into plan from jsonb_array_elements(plan) n;$$,
    $$     wave_plan:=wave_plan||jsonb_build_object(token::text,jsonb_build_object('state','invalid','reason',failure_reason));$$);
  definition := replace(definition, E'   end loop;\n  end loop;\n  token:=session.id;',
    $$   end loop;
   baselines:=baselines||wave_baselines;
   select coalesce(jsonb_agg(n||coalesce(wave_plan->(n->>'id'),'{}'::jsonb) order by n->>'id'),'[]')
     into plan from jsonb_array_elements(plan) n;
  end loop;
  token:=session.id;$$);
  if strpos(definition,'wave_baselines:=wave_baselines')=0
     or strpos(definition,'baselines:=baselines||wave_baselines')=0
     or strpos(definition,'wave_plan:=wave_plan')=0
     or strpos(definition,'version_row record; result jsonb; token uuid; after_stamp text; wave_plan jsonb;')=0
     or strpos(definition,'into plan from jsonb_array_elements(plan) n;')=0
     or strpos(definition,'then n||jsonb_build_object(''state'',''invalid'',''reason'',failure_reason)')>0
     or strpos(definition,'baselines:=jsonb_set(baselines,array[token::text]')>0 then
    raise exception 'Unexpected bulk publication function definition';
  end if;
  execute definition;
end $migration$;
commit;
