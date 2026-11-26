begin;
do $patch$
declare definition text := pg_get_functiondef('public.validate_life_workspace(uuid)'::regprocedure);
begin
  definition := replace(definition,
    $$'checkbox','image','attachment') then raise exception 'Invalid field definition'$$,
    $$'checkbox','image','attachment','time','url','rating','duration','multiselect') then raise exception 'Invalid field definition'$$);
  definition := replace(definition, $$    when 'money' then$$, $$
    when 'time' then
      if jsonb_typeof(v)<>'string' or v#>>'{}' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Invalid time'; end if;
    when 'url' then
      if jsonb_typeof(v)<>'string' or v#>>'{}' !~* '^https?://[^[:space:]]+$' then raise exception 'Invalid URL'; end if;
    when 'duration','rating' then
      if jsonb_typeof(v)<>'number' then raise exception 'Invalid numeric value'; end if;
      if (v#>>'{}')::numeric<0 or f->>'type'='rating' and ((v#>>'{}')::numeric>5 or mod((v#>>'{}')::numeric,1)<>0) then
        raise exception 'Numeric value outside range';
      end if;
    when 'multiselect' then
      if jsonb_typeof(v)<>'array' then raise exception 'Invalid selections'; end if;
      if exists(select 1 from jsonb_array_elements(v) x where jsonb_typeof(x)<>'string' or not coalesce(f->'options','[]'::jsonb) @> jsonb_build_array(x))
        or exists(select 1 from jsonb_array_elements(v) x group by x having count(*)>1) then raise exception 'Invalid selections'; end if;
    when 'money' then$$);
  if strpos(definition,$$'duration','multiselect') then raise$$)=0 or strpos(definition,$$when 'multiselect' then$$)=0 then
    raise exception 'Unexpected list validator definition';
  end if;
  execute definition;
end $patch$;
commit;
