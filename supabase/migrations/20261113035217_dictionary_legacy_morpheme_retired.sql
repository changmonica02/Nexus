-- No content conversion or publication. Apply only after backup and authorization.
begin;
-- Unknown tag content must be reviewed instead of being silently discarded.
do $guard$ begin if exists(select 1 from public.dictionary_entry_groups where cardinality(tags)>0) then raise exception 'Nonempty legacy tags require explicit review';end if;end $guard$;
create function public.dictionary_current_morphology_json(s jsonb) returns jsonb
language plpgsql immutable set search_path='' as $clean$
declare r jsonb;
begin
 if jsonb_typeof(s)='array' then select coalesce(jsonb_agg(public.dictionary_current_morphology_json(v) order by n),'[]') into r from jsonb_array_elements(s) with ordinality x(v,n);return r;
 elsif jsonb_typeof(s)='object' then select coalesce(jsonb_object_agg(k,public.dictionary_current_morphology_json(v)),'{}') into r from jsonb_each(s) x(k,v) where k not in ('grouping','group_data','sense_groups','primary_category','variant_group') and not(k='category' and s ? 'gloss_zh_tw');return r;
 else return s;end if;
end $clean$;
revoke all on function public.dictionary_current_morphology_json(jsonb) from public,anon;
grant execute on function public.dictionary_current_morphology_json(jsonb) to authenticated;

CREATE OR REPLACE FUNCTION public.get_dictionary_ai_snapshot(entry_uuid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare detail jsonb; result jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
 detail:=public.get_dictionary_entry(entry_uuid);
 if detail is null then return null; end if;
 select jsonb_build_object('detail',detail,
 'metadata',(select to_jsonb(m)-'source_ids' from public.dictionary_ai_metadata m where m.entry_id=entry_uuid)) into result;
 return result;
end $function$;

CREATE OR REPLACE FUNCTION public.dictionary_snapshot_candidate(s jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare b jsonb:='{}'; k text; rows jsonb;
begin
 foreach k in array array['entries','senses','relations','etymologies','learning_notes'] loop
  if k='entries' then rows:=jsonb_build_array(s->'detail'->'entry');else rows:=coalesce(s->'detail'->k,'[]');end if;
  select coalesce(jsonb_agg(value-'status'-'published_at'-'updated_at'-'source_id'),'[]') into rows from jsonb_array_elements(rows);
  b:=b||jsonb_build_object('dictionary_'||k,rows);
 end loop;
 return jsonb_build_object('bundle',b,
  'inflections',coalesce((select jsonb_agg(value-'updated_at') from jsonb_array_elements(coalesce(s->'detail'->'inflections','[]'))),'[]'),
  'pronunciations',coalesce((select jsonb_agg(value-'updated_at') from jsonb_array_elements(coalesce(s->'detail'->'pronunciations','[]'))),'[]'),
  'examples',coalesce((select jsonb_agg(value-'updated_at') from jsonb_array_elements(coalesce(s->'detail'->'examples','[]'))),'[]'),
  'annotations',coalesce((select jsonb_agg(value-'updated_at') from jsonb_array_elements(coalesce(s->'detail'->'lexical_annotations','[]'))),'[]'),
  'component_order',coalesce(s->'metadata'->'component_order','[]'));
end $function$;

CREATE OR REPLACE FUNCTION public.dictionary_normalize_snapshot(s jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$select public.dictionary_current_morphology_json(public.dictionary_normalize_morpheme_senses((
 select public.dictionary_clean_ipa_snapshot(public.dictionary_core_content(public.dictionary_without_verification(case when s is null then null else jsonb_set(jsonb_set(case when s#>'{detail,entry,word_segments}'='null'::jsonb then s#-'{detail,entry,word_segments}' else s end,'{detail,inflections}',coalesce(s->'detail'->'inflections','[]'::jsonb)),'{detail,relations}',coalesce((select jsonb_agg(value-'relation_kind'-'verification'-'verification_note' order by value->>'id') from jsonb_array_elements(coalesce(s->'detail'->'relations','[]'::jsonb))),'[]'::jsonb)) end))))));$function$;

CREATE OR REPLACE FUNCTION public.apply_dictionary_ai_change(entry_uuid uuid, expected_snapshot jsonb, bundle jsonb, component_order uuid[], origin_ids jsonb, preview boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare current_snapshot jsonb; target uuid; entry_kind text; origin_published uuid; old_revision bigint; result jsonb; t text; r jsonb; k text; mapped text;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
 perform pg_advisory_xact_lock(710,1);
 if jsonb_typeof(bundle->'dictionary_entries') is distinct from 'array' or jsonb_array_length(bundle->'dictionary_entries')<>1 then raise exception 'Expected one AI entry'; end if;
 target:=(bundle->'dictionary_entries'->0->>'id')::uuid;
 entry_kind:=bundle->'dictionary_entries'->0->>'kind';
 if entry_uuid is not null then
  perform 1 from public.dictionary_entries where id=entry_uuid for update;
  -- Lock children too: direct admin edits need not have advanced the parent revision.
  perform 1 from public.dictionary_senses where entry_id=entry_uuid for update;
  perform 1 from public.dictionary_relations where entry_id=entry_uuid for update;
  perform 1 from public.dictionary_etymologies where entry_id=entry_uuid for update;
  perform 1 from public.dictionary_learning_notes where entry_id=entry_uuid for update;
  current_snapshot:=public.get_dictionary_ai_snapshot(entry_uuid);
  if current_snapshot is null or public.dictionary_normalize_snapshot(current_snapshot) is distinct from public.dictionary_normalize_snapshot(expected_snapshot) then raise exception 'Revision conflict: regenerate Diff'; end if;
  if (entry_kind='word') is distinct from (current_snapshot->'detail'->'entry'->>'kind'='word') then raise exception 'Entry type is immutable'; end if;
  old_revision:=(current_snapshot->'detail'->'entry'->>'revision')::bigint;
  if current_snapshot->'detail'->'entry'->>'status'='published' then
   if target=entry_uuid or exists(select 1 from public.dictionary_entries where id=target) then raise exception 'Published changes require a new review draft'; end if;
   if exists(select 1 from public.dictionary_ai_metadata where published_entry_id=entry_uuid) then raise exception 'Review draft already exists: regenerate Diff against that draft'; end if;
   origin_published:=entry_uuid;
   -- Cloning must retain every original sense/relation/content record.
   foreach t in array array['senses','relations','etymologies','learning_notes'] loop
    k:='dictionary_'||t;
    for r in select value from jsonb_array_elements(current_snapshot->'detail'->t) loop
     mapped:=origin_ids->>(r->>'id');
     if mapped is null or not exists(select 1 from jsonb_array_elements(bundle->k) v where v->>'id'=mapped) then raise exception 'AI cannot omit original clone records'; end if;
    end loop;
   end loop;
  elsif target<>entry_uuid then raise exception 'Draft ID is immutable';
  else
   if (bundle->'dictionary_entries'->0->>'revision')::bigint is distinct from old_revision then raise exception 'Revision conflict'; end if;
   select published_entry_id into origin_published from public.dictionary_ai_metadata where entry_id=target;
  end if;
 else
  if expected_snapshot is not null or exists(select 1 from public.dictionary_entries where id=target) then raise exception 'New entry ID already exists'; end if;
 end if;
 foreach t in array array['dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes'] loop
  if exists(select 1 from jsonb_array_elements(coalesce(bundle->t,'[]'::jsonb)) v where (v->>'entry_id')::uuid is distinct from target) then raise exception 'AI content belongs to another entry'; end if;
 end loop;
 begin
  result:=public.apply_dictionary_bundle(bundle,false,true);
  if not exists(select 1 from public.dictionary_entries where id=target and status='draft') then raise exception 'AI saves only drafts'; end if;
  -- Word content-only or ordering-only edits must advance the entry revision once.
  if target=entry_uuid then update public.dictionary_entries set revision=old_revision+1 where id=target and revision=old_revision; end if;
  if exists(select 1 from unnest(component_order) x where not exists(select 1 from public.dictionary_relations where id=x and entry_id=target)) then raise exception 'Invalid component order'; end if;
  insert into public.dictionary_ai_metadata(entry_id,published_entry_id,origin_ids,component_order)
   values(target,origin_published,coalesce(origin_ids,'{}'::jsonb),coalesce(component_order,'{}'))
   on conflict(entry_id) do update set component_order=excluded.component_order;
  result:=jsonb_build_object('entry_id',target,'preview',preview,'result',result);
  if preview then raise exception using errcode='ZX711',detail=result::text; end if;
  return result;
 exception when sqlstate 'ZX711' then get stacked diagnostics k=pg_exception_detail;return k::jsonb;
 end;
end $function$;

revoke all on function public.apply_dictionary_ai_change(uuid,jsonb,jsonb,uuid[],jsonb,boolean) from public,anon;grant execute on function public.apply_dictionary_ai_change(uuid,jsonb,jsonb,uuid[],jsonb,boolean) to authenticated;

CREATE OR REPLACE FUNCTION public.apply_dictionary_drafts(drafts jsonb, preview boolean DEFAULT true, allow_edits boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d jsonb; b jsonb; r jsonb; old_row jsonb; stored jsonb; total jsonb; item jsonb; g jsonb;
 eid uuid; tbl text; k text; before_rev bigint; changed boolean; result jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
 if jsonb_typeof(drafts) is distinct from 'array' or jsonb_array_length(drafts)=0 then raise exception 'Expected drafts'; end if;
 perform pg_advisory_xact_lock(710,1);
 begin
 total:=jsonb_build_object('inserted',0,'updated',0,'skipped',0,'warnings','[]'::jsonb,'preview',preview,'items','[]'::jsonb);
 for d in select value from jsonb_array_elements(drafts) order by (value->'bundle'->'dictionary_entries'->0->>'kind'='word') loop
  if jsonb_typeof(coalesce(d->'inflections','[]')) is distinct from 'array' then raise exception 'Expected inflections array';end if;
  if exists(select 1 from jsonb_array_elements(coalesce(d->'inflections','[]')) x group by x->>'id' having count(*)>1) then raise exception 'Duplicate inflection ID';end if;
  d:=public.dictionary_current_morphology_json(d);b:=d->'bundle';
  if jsonb_array_length(b->'dictionary_entries')<>1 then raise exception 'Expected one entry per draft'; end if;
  eid:=(b->'dictionary_entries'->0->>'id')::uuid;
  select revision into before_rev from public.dictionary_entries where id=eid for update;
  if not(d ? 'ai') and exists(select 1 from public.dictionary_entries where id=eid and status<>'draft') then raise exception 'Published content requires AI review draft'; end if;
  if before_rev is not null and allow_edits and before_rev is distinct from (b->'dictionary_entries'->0->>'revision')::bigint then raise exception 'Revision conflict'; end if;
  if coalesce((d->>'replace_editor_children')::boolean,false) then
   if not allow_edits or before_rev is null or exists(select 1 from public.dictionary_entries where id=eid and status<>'draft') then raise exception 'Full editor save requires existing Draft';end if;
   
   foreach tbl in array array['dictionary_inflections','dictionary_relations','dictionary_pronunciations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_senses'] loop
    k:=case tbl when 'dictionary_inflections' then 'inflections' when 'dictionary_pronunciations' then 'pronunciations' when 'dictionary_examples' then 'examples' when 'dictionary_lexical_annotations' then 'annotations' else tbl end;
    if (k=tbl and b ? k) or (k<>tbl and d ? k) then
     if jsonb_typeof(case when k=tbl then b->k else d->k end) is distinct from 'array' then raise exception 'Full editor child content must be an array: %',k;end if;
     execute format('delete from public.%I where entry_id=$1 and not(id in(select (x->>''id'')::uuid from jsonb_array_elements($2) x))',tbl)
      using eid,case when k=tbl then b->k else d->k end;
    end if;
   end loop;

  end if;
  if d ? 'ai' then
   result:=public.apply_dictionary_ai_change((d->'ai'->>'entry_uuid')::uuid,nullif(d->'ai'->'expected_snapshot','null'::jsonb),b,
    array(select jsonb_array_elements_text(d->'ai'->'component_order'))::uuid[],d->'ai'->'origin_ids',false);
   -- Omissions cannot remove existing published extension rows when creating its review draft.
   if d->'ai'->'expected_snapshot'->'detail'->'entry'->>'status'='published' then
    for item in select value from jsonb_array_elements(coalesce(d->'ai'->'expected_snapshot'->'detail'->'examples','[]')) loop
     if not exists(select 1 from jsonb_array_elements(d->'examples') x where x->>'id'=d->'ai'->'origin_ids'->>(item->>'id')) then raise exception 'Published examples must be retained';end if;
    end loop;
    for item in select value from jsonb_array_elements(coalesce(d->'ai'->'expected_snapshot'->'detail'->'lexical_annotations','[]')) loop
     if not exists(select 1 from jsonb_array_elements(d->'annotations') x where x->>'id'=d->'ai'->'origin_ids'->>(item->>'id')) then raise exception 'Published lexical annotations must be retained';end if;
    end loop;
   end if;
   if d->'ai'->'expected_snapshot'->'detail'->'entry'->>'status'='published' and jsonb_array_length(coalesce(d->'ai'->'expected_snapshot'->'detail'->'inflections','[]'))>0 then raise exception 'Published inflections require snapshot review';end if;
   result:=result->'result';
  else
  result:=public.apply_dictionary_bundle(b,false,allow_edits);
  end if;
  foreach k in array array['inserted','updated','skipped'] loop total:=jsonb_set(total,array[k],to_jsonb((total->>k)::int+(result->>k)::int));end loop;
  total:=jsonb_set(total,'{warnings}',(total->'warnings')||coalesce(result->'warnings','[]'));
  changed:=false;
  foreach tbl in array array['dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations','dictionary_inflections'] loop
   for r in select value from jsonb_array_elements(coalesce(d->case when tbl='dictionary_examples' then 'examples' when tbl='dictionary_inflections' then 'inflections' when tbl='dictionary_pronunciations' then 'pronunciations' else 'annotations' end,'[]')) loop
    if r->>'entry_id' is distinct from eid::text then raise exception 'Content belongs to another entry'; end if;
    if tbl='dictionary_inflections' then
     if jsonb_typeof(r->'form') is distinct from 'string' or jsonb_typeof(r->'form_kind') is distinct from 'string' or (r ? 'sort_order' and jsonb_typeof(r->'sort_order') is distinct from 'number') then raise exception 'Invalid inflection fields';end if;
     if exists(select 1 from jsonb_object_keys(r) x where x not in ('id','entry_id','sense_id','form_kind','form','sort_order','revision')) then raise exception 'Unknown inflection field';end if;
    elsif tbl='dictionary_pronunciations' then r:=r-array['locale','note'];
     if jsonb_typeof(r->'ipa') is distinct from 'string'
       or (r ? 'locale' and jsonb_typeof(r->'locale') not in ('string','null'))
       or (r ? 'note' and jsonb_typeof(r->'note') not in ('string','null'))
       or (r ? 'sort_order' and jsonb_typeof(r->'sort_order') is distinct from 'number') then raise exception 'Invalid pronunciation fields';end if;
     if exists(select 1 from jsonb_object_keys(r) x where x not in ('id','entry_id','sense_id','locale','ipa','note','sort_order','revision')) then raise exception 'Unknown pronunciation field';end if;
    elsif exists(select 1 from jsonb_object_keys(r) x where x not in ('id','entry_id','sense_id','body','sort_order','revision','kind')) or (tbl='dictionary_examples' and r ? 'kind') then raise exception 'Unknown extension field';end if;
    execute format('select to_jsonb(t) from public.%I t where id=$1 for update',tbl) into old_row using (r->>'id')::uuid;
    if old_row is not null then
     if old_row->>'entry_id' is distinct from eid::text then raise exception 'Content ownership immutable';end if;
     if not exists(select 1 from jsonb_each(r-'revision') x where old_row->x.key is distinct from x.value) then
      total:=jsonb_set(total,'{skipped}',to_jsonb((total->>'skipped')::int+1));continue;
     end if;
     if not allow_edits or r->>'revision' is distinct from old_row->>'revision' then raise exception 'Revision conflict';end if;
     if tbl='dictionary_inflections' then
      update public.dictionary_inflections set form=r->>'form',form_kind=r->>'form_kind',sense_id=(r->>'sense_id')::uuid,sort_order=coalesce((r->>'sort_order')::int,0),revision=revision+1,updated_at=now() where id=(r->>'id')::uuid;
     elsif tbl='dictionary_pronunciations' then r:=r-array['locale','note'];
      update public.dictionary_pronunciations set ipa=r->>'ipa',sense_id=(r->>'sense_id')::uuid,
       sort_order=coalesce((r->>'sort_order')::int,0),revision=revision+1,updated_at=now() where id=(r->>'id')::uuid;
     else
     execute format('update public.%I set body=$1,sense_id=$2,sort_order=$3,revision=revision+1,updated_at=now() where id=$4',tbl)
     using r->>'body',(r->>'sense_id')::uuid,coalesce((r->>'sort_order')::int,0),(r->>'id')::uuid;
     end if;
     if tbl='dictionary_lexical_annotations' and old_row->>'kind' is distinct from r->>'kind' then raise exception 'Annotation kind immutable';end if;
     k:='updated';
    else
     if tbl='dictionary_inflections' then
      insert into public.dictionary_inflections(id,entry_id,sense_id,form_kind,form,sort_order) values((r->>'id')::uuid,eid,(r->>'sense_id')::uuid,r->>'form_kind',r->>'form',coalesce((r->>'sort_order')::int,0));
     elsif tbl='dictionary_pronunciations' then r:=r-array['locale','note'];
      insert into public.dictionary_pronunciations(id,entry_id,sense_id,ipa,sort_order)
       values((r->>'id')::uuid,eid,(r->>'sense_id')::uuid,r->>'ipa',coalesce((r->>'sort_order')::int,0));
     elsif tbl='dictionary_examples' then
      insert into public.dictionary_examples(id,entry_id,sense_id,body,sort_order) values((r->>'id')::uuid,eid,(r->>'sense_id')::uuid,r->>'body',coalesce((r->>'sort_order')::int,0));
     else insert into public.dictionary_lexical_annotations(id,entry_id,sense_id,kind,body,sort_order) values((r->>'id')::uuid,eid,(r->>'sense_id')::uuid,r->>'kind',r->>'body',coalesce((r->>'sort_order')::int,0));end if;
     k:='inserted';
    end if;
    changed:=true;total:=jsonb_set(total,array[k],to_jsonb((total->>k)::int+1));
   end loop;
  end loop;
  if d ? 'component_order' then
   if exists(select 1 from public.dictionary_ai_metadata where entry_id=eid and to_jsonb(component_order) is distinct from d->'component_order') or (not exists(select 1 from public.dictionary_ai_metadata where entry_id=eid) and jsonb_array_length(d->'component_order')>0) then changed:=true;end if;
   insert into public.dictionary_ai_metadata(entry_id,component_order) values(eid,array(select jsonb_array_elements_text(d->'component_order'))::uuid[]) on conflict(entry_id) do update set component_order=excluded.component_order;
  end if;
  if coalesce((d->>'replace_editor_children')::boolean,false) then changed:=true;end if;
  if changed and before_rev is not null then update public.dictionary_entries set revision=revision+1 where id=eid and revision=before_rev;end if;
  total:=jsonb_set(total,'{items}',(total->'items')||jsonb_build_array(jsonb_build_object('entry_id',eid,'kind',b->'dictionary_entries'->0->>'kind','headword',b->'dictionary_entries'->0->>'headword','status',case when before_rev is null then 'new' when changed or (result->>'updated')::int>0 or (result->>'inserted')::int>0 or exists(select 1 from public.dictionary_entries where id=eid and revision<>before_rev) then 'modified' else 'unchanged' end)));

 end loop;
 for d in select value from jsonb_array_elements(drafts) loop perform public.dictionary_assert_segment_links((d->'bundle'->'dictionary_entries'->0->>'id')::uuid);end loop;
 if preview then raise exception using errcode='ZX713',detail=total::text;end if;
 return total;
 exception when sqlstate 'ZX713' then get stacked diagnostics k=pg_exception_detail;return k::jsonb;
 when others then raise exception using message=sqlerrm,errcode=sqlstate,detail=coalesce(d->'origin','{}'::jsonb)::text;
 end;
end $function$;

CREATE OR REPLACE FUNCTION public.dictionary_overlay_candidate(base jsonb, patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare result jsonb:=base; k text; r jsonb; rows jsonb; old jsonb;
begin
 result:=public.dictionary_current_morphology_json(base);patch:=public.dictionary_current_morphology_json(patch);
 if patch ? 'ai' then raise exception 'Unexpected AI envelope';end if;
 foreach k in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','examples','annotations','inflections','pronunciations'] loop
  rows:=coalesce(case when k like 'dictionary_%' then result->'bundle'->k else result->k end,'[]');
  for r in select value from jsonb_array_elements(coalesce(case when k like 'dictionary_%' then patch->'bundle'->k else patch->k end,'[]')) loop
   select value into old from jsonb_array_elements(rows) where value->>'id'=r->>'id';
   select coalesce(jsonb_agg(value),'[]') into rows from jsonb_array_elements(rows) where value->>'id' is distinct from r->>'id';
   rows:=rows||jsonb_build_array(coalesce(old,'{}')||r);
  end loop;
  result:=jsonb_set(result,case when k like 'dictionary_%' then array['bundle',k] else array[k] end,rows);
 end loop;
 if patch ? 'component_order' then result:=jsonb_set(result,'{component_order}',patch->'component_order');end if;
 return result;
end $function$;

CREATE OR REPLACE FUNCTION public.dictionary_assert_safe_transfer(c jsonb, base jsonb)
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare section text;rows jsonb;old_rows jsonb;r jsonb;old_row jsonb;other jsonb;f text;field_value jsonb;old_value jsonb;key_name text;new_sense boolean:=false;
begin
 if jsonb_typeof(c) is distinct from 'object' or c ? 'ai' then raise exception 'Invalid safe import candidate';end if;
 if base is not null and (c->'bundle'->'dictionary_entries'->0->>'id' is distinct from base->'bundle'->'dictionary_entries'->0->>'id'
 or c->'bundle'->'dictionary_entries'->0->>'kind' is distinct from base->'bundle'->'dictionary_entries'->0->>'kind'
 or c->'bundle'->'dictionary_entries'->0->>'headword' is distinct from base->'bundle'->'dictionary_entries'->0->>'headword') then raise exception 'Existing Entry identity/content requires review';end if;
 if c->'bundle'->'dictionary_entries'->0 ? 'word_segments'
 and c->'bundle'->'dictionary_entries'->0->'word_segments' is distinct from base->'bundle'->'dictionary_entries'->0->'word_segments'
 and coalesce(base->'bundle'->'dictionary_entries'->0->'word_segments','null')<>'null'::jsonb then raise exception 'Existing word segments require review';end if;
 foreach section in array array['dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','examples','annotations','pronunciations','inflections'] loop
  rows:=coalesce(case when section like 'dictionary_%' then c->'bundle'->section else c->section end,'[]');
  old_rows:=coalesce(case when section like 'dictionary_%' then base->'bundle'->section else base->section end,'[]');
  key_name:='id';
  for r in select value from jsonb_array_elements(rows) loop
   select value into old_row from jsonb_array_elements(old_rows) where value->>key_name=r->>key_name;
   if old_row is not null then
    for f,field_value in select key,value from jsonb_each(r) loop
     if f in ('id','revision','updated_at','row') then continue;end if;
     old_value:=old_row->f;
     if field_value is not distinct from old_value or field_value='null'::jsonb and old_value is null then continue;end if;
     if f in ('entry_id','sense_id','target_entry_id','target_sense_id','form_kind','kind','sort_order')
      or not (old_value is null or old_value in ('null'::jsonb,'""'::jsonb,'[]'::jsonb)) then raise exception 'Existing content or ownership requires review: %',f;end if;
    end loop;
   else
    if section='dictionary_senses' then new_sense:=true;end if;
    for other in select value from jsonb_array_elements(old_rows||rows) where value->>key_name<>r->>key_name loop
     if section='dictionary_senses' and lower(btrim(coalesce(other->>'part_of_speech','')))=lower(btrim(coalesce(r->>'part_of_speech','')))
       and lower(btrim(other->>'gloss_zh_tw'))=lower(btrim(r->>'gloss_zh_tw'))
     or section='dictionary_relations' and other->'sense_id' is not distinct from r->'sense_id' and other->>'target_sense_id'=r->>'target_sense_id'
     or section='inflections' and other->'sense_id' is not distinct from r->'sense_id' and other->>'form_kind'=r->>'form_kind'
     or section='pronunciations' and other->'sense_id' is not distinct from r->'sense_id' and other->>'ipa'=r->>'ipa'
     or section in ('dictionary_etymologies','dictionary_learning_notes','examples','annotations') and other->'sense_id' is not distinct from r->'sense_id' and other->'kind' is not distinct from r->'kind' and lower(btrim(other->>'body'))=lower(btrim(r->>'body')) then raise exception 'Potential duplicate content requires review';end if;
    end loop;
   end if;
  end loop;
 end loop;
 if new_sense then
  foreach section in array array['dictionary_etymologies','dictionary_learning_notes','examples','annotations','pronunciations','inflections'] loop
   old_rows:=coalesce(case when section like 'dictionary_%' then base->'bundle'->section else base->section end,'[]');
   if exists(select 1 from jsonb_array_elements(old_rows) v where v->>'sense_id' is null) then raise exception 'New Sense with existing shared content requires review';end if;
  end loop;
 end if;
 if c ? 'component_order' and coalesce(base->'component_order','[]')<>'[]'::jsonb and c->'component_order' is distinct from base->'component_order' then
  if (select coalesce(jsonb_agg(v order by n),'[]') from jsonb_array_elements(c->'component_order') with ordinality x(v,n) where n<=jsonb_array_length(base->'component_order')) is distinct from base->'component_order' then raise exception 'Existing component order requires review';end if;
 end if;
end$function$;

CREATE OR REPLACE FUNCTION public.dictionary_transfer_covers(issue jsonb, c jsonb, base jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare section text:=issue->'target'->>'section';row_id text:=issue->'target'->>'id';field text:=issue->'target'->>'field';rows jsonb;old_rows jsonb;r jsonb;old_row jsonb;incoming jsonb;
begin
 if coalesce((issue->>'applied')::boolean,false) then return false;end if;
 if section='entry' and field in ('word_segments','component_order') then
  r:=case when field='word_segments' then c->'bundle'->'dictionary_entries'->0->field else c->field end;old_row:=case when field='word_segments' then base->'bundle'->'dictionary_entries'->0->field else base->field end;
  return r is not null and r<>'null'::jsonb and r is distinct from old_row and (old_row is null or old_row in ('null'::jsonb,'[]'::jsonb));
 end if;
 if row_id is null or section not in ('senses','relations','etymologies','learning_notes','examples','relation_hints','pronunciations','inflections') then return false;end if;
 section:=case section when 'relation_hints' then 'annotations' when 'senses' then 'dictionary_senses' when 'relations' then 'dictionary_relations' when 'etymologies' then 'dictionary_etymologies' when 'learning_notes' then 'dictionary_learning_notes' else section end;
 rows:=coalesce(case when section like 'dictionary_%' then c->'bundle'->section else c->section end,'[]');
 old_rows:=coalesce(case when section like 'dictionary_%' then base->'bundle'->section else base->section end,'[]');
 select value into r from jsonb_array_elements(rows) where value->>'id'=row_id;
 select value into old_row from jsonb_array_elements(old_rows) where value->>'id'=row_id;
 if r is null then return false;end if;
 if field is not null then return old_row is not null and r->field is distinct from old_row->field and (old_row->field is null or old_row->field in ('null'::jsonb,'""'::jsonb,'[]'::jsonb));end if;
 incoming:=issue->'incoming';
 return old_row is null and (incoming->>'id' is null or incoming->>'id'=row_id)
 and coalesce(incoming->'sense_id','null') is not distinct from coalesce(r->'sense_id','null');
end$function$;

CREATE OR REPLACE FUNCTION public.apply_dictionary_import_operation(operation jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare receipt public.dictionary_import_operations; current_context jsonb; result jsonb;
 candidate jsonb:=operation->'candidate'; observed jsonb:=operation->'observed';
 op uuid:=(operation->>'operation_id')::uuid; sid uuid:=(operation->>'session_id')::uuid;
 t text; r jsonb; existing_row jsonb; known boolean;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if (operation->>'owner_id')::uuid is distinct from auth.uid() then raise exception 'Import session owner mismatch';end if;
 if op is null or sid is null or operation->>'source_type' is null or operation->>'effect' is null or operation->>'source_type' not in ('csv','legacy_csv','md','json') or operation->>'effect' not in ('write','unchanged','review') then raise exception 'Invalid import operation';end if;
 perform pg_advisory_xact_lock(710,1);
 select * into receipt from public.dictionary_import_operations where owner_id=auth.uid() and operation_id=op;
 if found then
  if receipt.request is distinct from operation then raise exception 'Operation identity collision';end if;
  return receipt.result;
 end if;
 -- Also serialize direct admin DML, including phantom inserts into the homograph candidate set.
 -- Each item is a short, independent transaction; other stale items do not block valid items.
 lock table public.dictionary_entries,public.dictionary_senses,public.dictionary_relations,
 public.dictionary_etymologies,public.dictionary_learning_notes,public.dictionary_examples,public.dictionary_lexical_annotations,
 public.dictionary_pronunciations,public.dictionary_inflections,public.dictionary_ai_metadata in share row exclusive mode;
 current_context:=public.dictionary_import_context(observed);
 if current_context is distinct from operation->'expected_context' then
  result:=jsonb_build_object('status','stale','message','資料自預覽後已變更，請重新審核');
 else
  -- Decisions may introduce a fresh sense, but may never overwrite an unobserved stable ID.
  known:=true;
  foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations','dictionary_inflections'] loop
   for r in select value from jsonb_array_elements(coalesce(case when t='dictionary_inflections' then candidate->'inflections' when t='dictionary_pronunciations' then candidate->'pronunciations' when t='dictionary_examples' then candidate->'examples' when t='dictionary_lexical_annotations' then candidate->'annotations' else candidate->'bundle'->t end,'[]')) loop
    execute format('select to_jsonb(x)-''source_id'' from public.%I x where id=$1',t) into existing_row using (r->>'id')::uuid;
    if existing_row is not null and not exists(select 1 from jsonb_array_elements(current_context->'identities'->t) x where x->>'id'=r->>'id') then known:=false;end if;
   end loop;
  end loop;
  if not known then result:=jsonb_build_object('status','stale','message','資料自預覽後已變更，請重新審核');
  elsif operation->>'effect'='unchanged' then
   result:=jsonb_build_object('status','unchanged','entry_id',candidate->'bundle'->'dictionary_entries'->0->>'id');
  else
   if candidate ? 'ai' then raise exception 'AI review uses the existing dedicated flow';end if;
   if operation->>'effect'='review' then
    result:=public.create_dictionary_review((candidate->'bundle'->'dictionary_entries'->0->>'id')::uuid,current_context->'snapshot',candidate,operation->>'source_type',false);
   else result:=public.apply_dictionary_drafts(jsonb_build_array(candidate),false,true);end if;
   result:=jsonb_build_object('status','applied','entry_id',candidate->'bundle'->'dictionary_entries'->0->>'id','result',result);
  end if;
 end if;
 insert into public.dictionary_import_operations(owner_id,operation_id,session_id,source_type,preview_at,request,result)
 values(auth.uid(),op,sid,operation->>'source_type',(operation->>'preview_at')::timestamptz,operation,result);
 return result;
end $function$;

CREATE OR REPLACE FUNCTION public.apply_dictionary_safe_import_reviews(operations jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare request jsonb;r public.dictionary_import_review_items;old public.dictionary_import_review_items;receipt public.dictionary_import_operations;oid uuid;c jsonb;ctx jsonb;base jsonb;editor_count integer;ref jsonb;issue jsonb;issues jsonb;covered jsonb;ids jsonb;reply jsonb;results jsonb:='[]';entry_key text;
begin
 if auth.uid() is null or not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if jsonb_typeof(operations) is distinct from 'array' or jsonb_array_length(operations)>25 then raise exception 'Expected at most 25 operations';end if;
 perform pg_advisory_xact_lock(710,1);
 for request in select value from jsonb_array_elements(operations) loop
  begin
   select * into r from public.dictionary_import_review_items where id=(request->>'id')::uuid for update;
   if not found then raise exception 'Unknown import review';end if;
   oid:=md5(r.id::text||':'||(request->>'revision')||':apply')::uuid;
   select * into receipt from public.dictionary_import_operations where owner_id=auth.uid() and operation_id=oid;
   if found then
    if receipt.request->'durable_request' is distinct from request or receipt.result->>'safe_replacement' is distinct from 'true' then raise exception 'Safe import operation identity collision';end if;
    results:=results||jsonb_build_array(to_jsonb(r));continue;
   end if;
   if request->>'revision' is null or r.revision<>(request->>'revision')::bigint then raise exception 'Import review revision conflict; reanalyze';end if;
   c:=request->'candidate';entry_key:=c->'bundle'->'dictionary_entries'->0->>'id';
   if c is null or c='null'::jsonb or entry_key is distinct from r.entry_id then raise exception 'Invalid safe import identity';end if;
   lock table public.dictionary_entries,public.dictionary_senses,public.dictionary_relations,public.dictionary_etymologies,public.dictionary_learning_notes,public.dictionary_examples,public.dictionary_lexical_annotations,public.dictionary_pronunciations,public.dictionary_inflections,public.dictionary_ai_metadata,public.dictionary_review_drafts in share row exclusive mode;
   ctx:=public.dictionary_import_context(r.item->'observed');
   base:=case when ctx->'snapshot'='null'::jsonb or ctx->'snapshot' is null then null else public.dictionary_snapshot_candidate(ctx->'snapshot') end;
   select count(*) into editor_count from public.dictionary_review_drafts where entry_id=entry_key::uuid and state='active';
   if editor_count>1 then raise exception 'Multiple active Reviews';end if;
   if editor_count=1 then select candidate into base from public.dictionary_review_drafts where entry_id=entry_key::uuid and state='active' for update;end if;
   if exists(select 1 from jsonb_array_elements(r.item->'issues') i where not coalesce((i->>'applied')::boolean,false) and i->>'type' in ('identity_kind','identity_owner','homograph','invalid','revision_conflict','preview_changed','batch_homograph','apply_failed','legacy_operation','invalid_reference','invalid_content')) then raise exception 'Blocked proposal cannot use safe import';end if;
   perform public.dictionary_assert_safe_transfer(c,base);
   if jsonb_typeof(coalesce(request->'replaces','[]')) is distinct from 'array' then raise exception 'Invalid replacement references';end if;
   -- Lock in stable ID order, before the original import authority writes anything.
   for ref in select value from jsonb_array_elements(coalesce(request->'replaces','[]')) order by value->>'id' loop
    select * into old from public.dictionary_import_review_items where id=(ref->>'id')::uuid for update;
    if not found or old.id=r.id or old.entry_id<>entry_key or old.item->'draft'->>'kind' is distinct from c->'bundle'->'dictionary_entries'->0->>'kind' or old.revision<>(ref->>'revision')::bigint or md5(to_jsonb(old)::text) is distinct from ref->>'version' then raise exception 'Replacement source changed; reanalyze';end if;
    ids:=ref->'issue_ids';
    if jsonb_typeof(ids) is distinct from 'array' or jsonb_array_length(ids)<>(select count(distinct v) from jsonb_array_elements_text(ids) v) then raise exception 'Invalid replacement issue IDs';end if;
    for issue in select value from jsonb_array_elements(old.item->'issues') where ids ? (value->>'id') loop
     if not public.dictionary_transfer_covers(issue,c,base) then raise exception 'Replacement content correspondence is unproven';end if;
    end loop;
    if jsonb_array_length(ids)<>(select count(*) from jsonb_array_elements(old.item->'issues') v where ids ? (v->>'id')) then raise exception 'Unknown replacement issue';end if;
   end loop;
   reply:=public.apply_dictionary_import_reviews(jsonb_build_array(request))->0;
   if reply->>'request_conflict' is not null then raise exception '%',reply->>'request_conflict';end if;
   if reply->'result'->>'status'='applied' then
    covered:='[]';
    for ref in select value from jsonb_array_elements(coalesce(request->'replaces','[]')) loop
     if jsonb_array_length(ref->'issue_ids')=0 then continue;end if;
     select * into old from public.dictionary_import_review_items where id=(ref->>'id')::uuid;
     select jsonb_agg(case when ref->'issue_ids' ? (v->>'id') then v||'{"applied":true}'::jsonb else v end) into issues from jsonb_array_elements(old.item->'issues') v;
     old.item:=jsonb_set(old.item,'{issues}',issues);old.pending_count:=public.dictionary_import_pending(old.item);
     if old.pending_count=0 then old.item:=jsonb_set(old.item,'{status}','"applied"');end if;
     update public.dictionary_import_review_items set item=old.item,pending_count=old.pending_count,revision=revision+1,updated_by=auth.uid(),updated_at=now(),result=coalesce(result,'{}')||jsonb_build_object('safe_replaced_by',oid,'replaced_issue_ids',ref->'issue_ids') where id=old.id;
     covered:=covered||jsonb_build_array(ref->'id');
    end loop;
    update public.dictionary_import_operations set result=result||jsonb_build_object('safe_replacement',true,'cleared',covered) where owner_id=auth.uid() and operation_id=oid;
    update public.dictionary_import_review_items set result=result||jsonb_build_object('safe_replacement',true,'cleared',covered) where id=r.id returning * into r;
    reply:=to_jsonb(r);
   elsif exists(select 1 from jsonb_array_elements(coalesce(request->'replaces','[]')) source where jsonb_array_length(source->'issue_ids')>0) then
    -- Unchanged/stale/failed cannot consume any replacement proof or leave a partial write.
    raise exception 'Safe write did not commit; old reviews retained: %',reply->'result'->>'status';
   else
    update public.dictionary_import_operations set result=result||'{"safe_replacement":true}' where owner_id=auth.uid() and operation_id=oid;
   end if;
   results:=results||jsonb_build_array(reply);
  exception when others then
   select * into r from public.dictionary_import_review_items where id=(request->>'id')::uuid;
   results:=results||jsonb_build_array(to_jsonb(r)||jsonb_build_object('request_conflict',sqlerrm));
  end;
 end loop;
 return results;
end$function$;

CREATE OR REPLACE FUNCTION public.apply_dictionary_import_reviews(operations jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare request jsonb; r public.dictionary_import_review_items; op jsonb; receipt public.dictionary_import_operations;
 c jsonb; context jsonb; current_record jsonb; outcome jsonb; review_row public.dictionary_review_drafts;
 oid uuid; issues jsonb; x jsonb; out_rows jsonb:='[]'; eid uuid; ctx jsonb; known boolean; t text; row_data jsonb; existing_row jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if jsonb_typeof(operations) is distinct from 'array' or jsonb_array_length(operations)>25 then raise exception 'Expected at most 25 operations';end if;
 perform pg_advisory_xact_lock(710,1);
 for request in select value from jsonb_array_elements(operations) loop
  select * into r from public.dictionary_import_review_items where id=(request->>'id')::uuid for update;
  if not found then raise exception 'Unknown import review';end if;
  oid:=md5(r.id::text||':'||(request->>'revision')||':apply')::uuid;
  select * into receipt from public.dictionary_import_operations where owner_id=auth.uid() and operation_id=oid;
  if found then
   if receipt.request->'durable_request' is distinct from request then out_rows:=out_rows||jsonb_build_array(to_jsonb(r)||jsonb_build_object('request_conflict','Operation identity collision'));continue;end if;
   out_rows:=out_rows||jsonb_build_array(to_jsonb(r));continue;
  end if;
  if r.revision<>(request->>'revision')::bigint then out_rows:=out_rows||jsonb_build_array(to_jsonb(r)||jsonb_build_object('request_conflict','Import review revision conflict; reload'));continue;end if;
  begin
   c:=request->'candidate';outcome:=null;
   -- Even a manual request must not move any stable identity or change Entry kind.
   if c is not null and c<>'null'::jsonb then
    eid:=(c->'bundle'->'dictionary_entries'->0->>'id')::uuid;
    if eid::text<>r.entry_id or c->'bundle'->'dictionary_entries'->0->>'kind' is distinct from r.item->'draft'->>'kind' then raise exception 'Identity mismatch';end if;
    lock table public.dictionary_entries,public.dictionary_senses,public.dictionary_relations,public.dictionary_etymologies,public.dictionary_learning_notes,public.dictionary_examples,public.dictionary_lexical_annotations,public.dictionary_pronunciations,public.dictionary_inflections,public.dictionary_ai_metadata,public.dictionary_review_drafts in share row exclusive mode;
    context:=public.dictionary_import_context(r.item->'observed');current_record:=public.dictionary_exchange_record(eid);
    if context is distinct from ((r.item->'context')-'exchange') or (r.item->'context' ? 'exchange' and (current_record->>'version') is distinct from (r.item->'context'->'exchange'->>'version')) then
     outcome:=jsonb_build_object('status','stale','message','Preview changed; recompare before applying');
    else
     -- Match the existing import authority's unobserved-child collision check, also for active Review updates.
     known:=true;
     foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations','dictionary_inflections'] loop
      for row_data in select value from jsonb_array_elements(coalesce(case when t='dictionary_inflections' then c->'inflections' when t='dictionary_pronunciations' then c->'pronunciations' when t='dictionary_examples' then c->'examples' when t='dictionary_lexical_annotations' then c->'annotations' else c->'bundle'->t end,'[]')) loop
       execute format('select to_jsonb(x) from public.%I x where id=$1',t) into existing_row using (row_data->>'id')::uuid;
       if existing_row is not null and ((t='dictionary_entries' and (existing_row->>'kind'='word') is distinct from (r.item->'draft'->>'kind'='word')) or (t<>'dictionary_entries' and existing_row->>'entry_id' is distinct from r.entry_id)) then raise exception 'Identity owner/kind conflict';end if;
       if existing_row is not null and not exists(select 1 from jsonb_array_elements(context->'identities'->t) v where v->>'id'=row_data->>'id') then known:=false;end if;
      end loop;
     end loop;
     if not known then raise exception 'Unobserved identity; recompare';end if;
     select * into review_row from public.dictionary_review_drafts where entry_id=eid and state='active' order by created_at limit 1 for update;
     if request->>'effect'='unchanged' then outcome:='{"status":"unchanged"}';
     elsif review_row.id is not null then
      if (select count(*) from public.dictionary_review_drafts where entry_id=eid and state='active')<>1 then raise exception 'Multiple active Reviews';end if;
      outcome:=public.save_dictionary_review(review_row.id,review_row.revision,public.dictionary_overlay_candidate(review_row.candidate,c));
      outcome:=jsonb_build_object('status','applied','effect','review','result',outcome);
     else
      op:=jsonb_build_object('owner_id',auth.uid(),'session_id',r.source->>'session_id','operation_id',oid,'source_type',r.source->>'type','preview_at',r.item->>'preview_at','candidate',c,'observed',r.item->'observed','expected_context',context,'effect',request->>'effect','durable_request',request);
      outcome:=public.apply_dictionary_import_operation(op)||jsonb_build_object('effect',request->>'effect');
     end if;
    end if;
   else outcome:='{"status":"unchanged"}';end if;
   -- Existing authority may have created the receipt. All routes use this immutable request for replay.
   if not exists(select 1 from public.dictionary_import_operations where owner_id=auth.uid() and operation_id=oid) then
    op:=jsonb_build_object('owner_id',auth.uid(),'operation_id',oid,'durable_request',request);
    insert into public.dictionary_import_operations(owner_id,operation_id,session_id,source_type,preview_at,request,result) values(auth.uid(),oid,(r.source->>'session_id')::uuid,r.source->>'type',(r.source->>'preview_at')::timestamptz,op,outcome);
   end if;
   issues:='[]';for x in select value from jsonb_array_elements(r.item->'issues') loop
    if outcome->>'status' in ('applied','unchanged') and request->'handled' ? (x->>'id') then x:=x||'{"applied":true}'::jsonb;end if;issues:=issues||jsonb_build_array(x);
   end loop;
   r.item:=jsonb_set(r.item,'{issues}',issues);r.pending_count:=public.dictionary_import_pending(r.item);
   r.item:=jsonb_set(r.item,'{status}',to_jsonb(case when outcome->>'status'='stale' then 'stale' when r.pending_count>0 then 'pending' else outcome->>'status' end));
  exception when others then
   outcome:=jsonb_build_object('status','failed','message',sqlerrm);r.item:=jsonb_set(r.item,'{status}','"failed"'::jsonb);
  end;
  if outcome->>'status' in ('failed','stale') and not exists(select 1 from jsonb_array_elements(r.item->'issues') i where i->>'type' in ('apply_failed','preview_changed')) then
   r.item:=jsonb_set(r.item,'{issues}',coalesce(r.item->'issues','[]')||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'row',1,'kind',r.item->'draft'->>'kind','headword',r.item->'draft'->>'headword','field','operation','type',case when outcome->>'status'='stale' then 'preview_changed' else 'apply_failed' end,'existing',null,'incoming',null,'reason',outcome->>'message','allowedActions',jsonb_build_array('keep','later'),'selectedAction',null)));
  end if;
  update public.dictionary_import_review_items set item=r.item,pending_count=public.dictionary_import_pending(r.item),result=outcome,revision=revision+1,updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
  out_rows:=out_rows||jsonb_build_array(to_jsonb(r));
 end loop;
 return out_rows;
end$function$;

CREATE OR REPLACE FUNCTION public.dictionary_bulk_versions(ids uuid[])
 RETURNS TABLE(entry_id uuid, stamp text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 with pieces as (
 select e.id eid,'entry' t,e.id rid,jsonb_build_array(e.id,e.revision,e.status) v from public.dictionary_entries e where e.id=any(ids)
 union all select entry_id,'sense',id,jsonb_build_array(id,revision) from public.dictionary_senses where entry_id=any(ids)
 union all select entry_id,'relation',id,jsonb_build_array(id,revision) from public.dictionary_relations where entry_id=any(ids)
 union all select entry_id,'etymology',id,jsonb_build_array(id,revision) from public.dictionary_etymologies where entry_id=any(ids)
 union all select entry_id,'note',id,jsonb_build_array(id,revision) from public.dictionary_learning_notes where entry_id=any(ids)
 union all select entry_id,'example',id,jsonb_build_array(id,revision) from public.dictionary_examples where entry_id=any(ids)
 union all select entry_id,'annotation',id,jsonb_build_array(id,revision) from public.dictionary_lexical_annotations where entry_id=any(ids)
 union all select entry_id,'pronunciation',id,jsonb_build_array(id,revision) from public.dictionary_pronunciations where entry_id=any(ids)
 union all select entry_id,'metadata',entry_id,to_jsonb(m) from public.dictionary_ai_metadata m where entry_id=any(ids)
 ) select eid,md5(jsonb_agg(jsonb_build_array(t,v) order by t,rid)::text) from pieces group by eid;
$function$;

CREATE OR REPLACE FUNCTION public.dictionary_exchange_scope_version(entry_ids uuid[])
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t text; row_key text; predicate text; digest text; digests text[]:='{}';
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations',
  'dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations',
  'dictionary_pronunciations','dictionary_inflections',
  'dictionary_ai_metadata','dictionary_review_drafts'] loop
  row_key:=case when t='dictionary_ai_metadata' then 'entry_id' else 'id' end;
  predicate:=case when t in ('dictionary_entries') then 'x.id=any($1)'
   when t='dictionary_review_drafts' then 'x.entry_id=any($1) and x.state=''active'''
   else 'x.entry_id=any($1)' end;
  execute format('select md5(coalesce(string_agg(md5((case when to_jsonb(x) ? ''gloss_zh_tw'' then public.dictionary_normalize_morpheme_senses(to_jsonb(x)) else to_jsonb(x) end)::text),'''' order by x.%I),'''')) from public.%I x where %s',row_key,t,predicate)
   into digest using entry_ids;
  digests:=array_append(digests,digest);
 end loop;
 return 'content-v2:'||md5(to_jsonb(digests)::text);
end$function$;

CREATE OR REPLACE FUNCTION public.delete_dictionary_entry(entry_uuid uuid, expected_revision bigint, expected_snapshot jsonb, operation_uuid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare e public.dictionary_entries;receipt public.dictionary_import_operations;request jsonb;answer jsonb;t text;unlinked integer;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if entry_uuid is null or expected_revision is null or expected_revision<1 or operation_uuid is null or expected_snapshot is null then raise exception 'Invalid deletion request';end if;
 request:=jsonb_build_object('action','delete_entry_v1','entry_id',entry_uuid,'revision',expected_revision,'snapshot',expected_snapshot);
 request:=jsonb_build_object('fingerprint',encode(sha256(convert_to(request::text,'UTF8')),'hex'));
 perform pg_advisory_xact_lock(710,1);
 select * into receipt from public.dictionary_import_operations where owner_id=auth.uid() and operation_id=operation_uuid;
 if found then
  if receipt.request is distinct from request then raise exception 'Operation ID reused for different request';end if;
  return receipt.result;
 end if;
 select * into e from public.dictionary_entries where id=entry_uuid for update;
 if not found then raise exception 'Entry no longer exists; check the management list';end if;
 if e.revision<>expected_revision or public.get_dictionary_ai_snapshot(entry_uuid) is distinct from expected_snapshot then raise exception 'Entry changed; reopen it before deleting';end if;
 if exists(select 1 from public.dictionary_relations where target_entry_id=entry_uuid and entry_id<>entry_uuid) then raise exception 'Other entries reference this component; remove those relations first';end if;
 if exists(select 1 from public.dictionary_review_drafts r cross join jsonb_array_elements(coalesce(r.candidate->'bundle'->'dictionary_relations','[]'::jsonb)) c where r.state='active' and r.entry_id<>entry_uuid and c->>'target_entry_id'=entry_uuid::text) then raise exception 'Another active Review references this entry; resolve that review first';end if;
 if exists(select 1 from public.dictionary_ai_metadata where published_entry_id=entry_uuid and entry_id<>entry_uuid) then raise exception 'A legacy Review references this entry; resolve it first';end if;
 if exists(select 1 from public.official_study_pack_entries where dictionary_entry_id=entry_uuid) then raise exception 'Official study packs reference this entry; update the official manifest first';end if;
 -- Lock/CAS above is shared with publication/child/import flows. New FK references
 -- also require a conflicting parent key lock; failures roll back this entire operation.
 delete from public.study_card_dictionary_links where dictionary_entry_id=entry_uuid;
 get diagnostics unlinked=row_count;
 delete from public.dictionary_review_drafts where entry_id=entry_uuid;
 -- Preserve only the deleted UUID and the compact retry receipt.
 insert into public.dictionary_deleted_ids values(entry_uuid) on conflict do nothing;
 foreach t in array array['dictionary_relations','dictionary_inflections','dictionary_pronunciations','dictionary_examples','dictionary_lexical_annotations','dictionary_etymologies','dictionary_learning_notes'] loop
  execute format('delete from public.%I where entry_id=$1',t) using entry_uuid;
 end loop;
 delete from public.dictionary_ai_metadata where entry_id=entry_uuid;
 delete from public.dictionary_senses where entry_id=entry_uuid;
 delete from public.dictionary_entries where id=entry_uuid;
 answer:=jsonb_build_object('deleted',true,'entry_id',entry_uuid,'unlinked_cards',unlinked);
 insert into public.dictionary_import_operations(owner_id,operation_id,session_id,source_type,preview_at,request,result) values(auth.uid(),operation_uuid,operation_uuid,'delete_entry',now(),request,answer);
 return answer;
exception when foreign_key_violation then raise exception 'Entry is still referenced; no data was deleted';
end $function$;

CREATE OR REPLACE FUNCTION public.search_dictionary_catalog(scope text DEFAULT 'all'::text, query_text text DEFAULT ''::text, domain text DEFAULT NULL::text, subdomain text DEFAULT NULL::text, kind_filters text[] DEFAULT ARRAY['prefix'::text, 'root'::text, 'suffix'::text], work_filters text[] DEFAULT '{}'::text[], page_number integer DEFAULT 0, admin_mode boolean DEFAULT false, status_filters text[] DEFAULT '{}'::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;size integer:=case when admin_mode then 100 else 20 end;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if admin_mode and not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if scope is null or scope not in ('all','word','morpheme') or query_text is null or length(query_text)>120 or page_number is null or page_number<0 or page_number>100000
  or kind_filters is null or not kind_filters<@array['prefix','root','suffix']::text[] or work_filters is null or not work_filters<@array['red','yellow','green']::text[]
  or status_filters is null or not status_filters<@array['draft','published']::text[] or admin_mode is null or not public.dictionary_valid_morpheme_sense(domain,subdomain,null) then raise exception 'Invalid dictionary catalog filter';end if;
 with pending as (
  select entry_id,sum(greatest(pending_count,case when item->>'status' in ('failed','stale') then 1 else 0 end))::int n,min(item->'draft'->>'headword') headword,min(item->'draft'->>'kind') kind
  from public.dictionary_import_review_items where admin_mode and public.dictionary_transfer_pending(item,pending_count) group by entry_id
 ), editor_pending as (
  select entry_id,count(*)::int n,case when count(*)=1 then jsonb_agg(candidate order by id)->0 else null end candidate from public.dictionary_review_drafts where admin_mode and state='active' group by entry_id
 ), all_entries as (
  select e.id::text id,coalesce(r.candidate#>>'{bundle,dictionary_entries,0,kind}',e.kind) kind,coalesce(r.candidate#>>'{bundle,dictionary_entries,0,headword}',e.headword) headword,e.status,e.revision,e.published_at,e.updated_at,coalesce(p.n,0) import_pending_count,coalesce(r.n,0) editor_pending_count,
   case when p.n>0 or r.n>0 then 'red' when e.status='draft' then 'yellow' else 'green' end work_status
  from public.dictionary_entries e left join pending p on p.entry_id=e.id::text left join editor_pending r on r.entry_id=e.id where (admin_mode or e.status='published') and (cardinality(status_filters)=0 or e.status=any(status_filters))
  union all select p.entry_id,p.kind,p.headword,'draft',0,null,null,p.n,0,'red' from pending p where not exists(select 1 from public.dictionary_entries e where e.id::text=p.entry_id) and (cardinality(status_filters)=0 or 'draft'=any(status_filters))
 ), sense_rows as (
  select s.entry_id::text entry_id,s.id,s.gloss_zh_tw,s.semantic_domain,s.semantic_subdomain,s.variants from public.dictionary_senses s where not exists(select 1 from editor_pending r where r.entry_id=s.entry_id and r.candidate is not null)
  union all select r.entry_id::text,(s->>'id')::uuid,s->>'gloss_zh_tw',s->>'semantic_domain',s->>'semantic_subdomain',s->'variants' from editor_pending r cross join lateral jsonb_array_elements(coalesce(r.candidate#>'{bundle,dictionary_senses}','[]')) s where r.candidate is not null
 ), sense_flags as (
  select entry_id,
   bool_or((domain is null or semantic_domain=domain) and (subdomain is null or semantic_subdomain=subdomain)) domain_match,
   bool_or(strpos(lower(gloss_zh_tw),lower(btrim(query_text)))>0) gloss_match,
   bool_or(variants is not null and variants<>'null') has_variants
  from sense_rows group by entry_id
 ), variant_rows as (
  select s.entry_id,s.id sid,f.ordinality ord,f.value v from sense_rows s cross join lateral jsonb_array_elements(coalesce(nullif(s.variants,'null'),'[]')) with ordinality f
 ), variant_hits as (
  select distinct entry_id from variant_rows where btrim(query_text)<>'' and strpos(lower(v->>'form'),lower(btrim(query_text)))>0
 ), inflection_hits as (
  select distinct entry_id::text entry_id from public.dictionary_inflections where btrim(query_text)<>'' and strpos(lower(form),lower(btrim(query_text)))>0
 ), matches as (
  select e.* from all_entries e left join sense_flags sf on sf.entry_id=e.id
  left join variant_hits vh on vh.entry_id=e.id left join inflection_hits ih on ih.entry_id=e.id
  where (scope='all' or scope='word' and e.kind='word' or scope='morpheme' and e.kind=any(kind_filters))
   and (domain is null or sf.domain_match)
   and (btrim(query_text)='' or strpos(lower(e.headword),lower(btrim(query_text)))>0 or sf.gloss_match or vh.entry_id is not null or ih.entry_id is not null)
 ), filtered as (select * from matches where not admin_mode or cardinality(work_filters)=0 or work_status=any(work_filters)),
 shown as materialized (select * from filtered order by lower(headword) collate "C",id limit size offset page_number*size),
 page_senses as materialized (
  select s.*,e.headword from sense_rows s join shown e on e.id=s.entry_id
 ), summaries as (
  select entry_id,string_agg(gloss_zh_tw,'；' order by id) summary,
   jsonb_agg(id order by id) filter(where (domain is null or semantic_domain=domain) and (subdomain is null or semantic_subdomain=subdomain)
    and (btrim(query_text)='' or strpos(lower(headword),lower(btrim(query_text)))>0 or strpos(lower(gloss_zh_tw),lower(btrim(query_text)))>0
     or exists(select 1 from jsonb_array_elements(coalesce(nullif(variants,'null'),'[]')) v where strpos(lower(v->>'form'),lower(btrim(query_text)))>0))) matched_sense_ids
  from page_senses group by entry_id
 ), page_forms as (
  select distinct on (v.entry_id,v.v->>'form') v.* from variant_rows v join shown e on e.id=v.entry_id
  order by v.entry_id,v.v->>'form',v.sid nulls last,v.ord
 ), variants as (
  select entry_id,jsonb_agg(v order by sid nulls last,ord) variants from page_forms group by entry_id
 ), inflections as (
  select i.entry_id::text entry_id,jsonb_agg(jsonb_build_object('form',i.form,'form_kind',i.form_kind,'sense_id',i.sense_id) order by i.sort_order,i.id) inflection_matches
  from shown e join public.dictionary_inflections i on i.entry_id::text=e.id
  where btrim(query_text)<>'' and strpos(lower(i.form),lower(btrim(query_text)))>0 group by i.entry_id
 ), projected as (
  select e.*,coalesce(s.summary,'') summary,coalesce(v.variants,'[]') variants,coalesce(i.inflection_matches,'[]') inflection_matches,coalesce(s.matched_sense_ids,'[]') matched_sense_ids
  from shown e left join summaries s on s.entry_id=e.id left join variants v on v.entry_id=e.id left join inflections i on i.entry_id=e.id
 )
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('sense_id',s.matched_sense_ids->>0) order by lower(headword) collate "C",id) from projected s),'[]'),
 'total',(select count(*) from filtered),'has_more',(page_number+1)*size<(select count(*) from filtered),'page',page_number,
 'stats',case when admin_mode then (select jsonb_build_object('red',count(*) filter(where work_status='red'),'yellow',count(*) filter(where work_status='yellow'),'green',count(*) filter(where work_status='green')) from matches) else null end) into result;
 return result;
end $function$;

CREATE OR REPLACE FUNCTION public.search_dictionary_relation_targets(query_text text DEFAULT ''::text, page_number integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare q text:=lower(btrim(query_text));k text:=public.dictionary_component_key(query_text);
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if query_text is null or length(query_text)>120 or page_number is null or page_number<0 or page_number>100000 then raise exception 'Invalid relation search';end if;
 return (with candidates as (
 select e.id,e.headword,e.kind,
  case when q='' then 5
   when (case when e.kind='word' then lower(btrim(e.headword)) else public.dictionary_component_key(e.headword) end)=(case when e.kind='word' then q else k end) then 0
   when starts_with(lower(btrim(e.headword)),q) or (e.kind<>'word' and k<>'' and starts_with(public.dictionary_component_key(e.headword),k)) then 1
   when exists(select 1 from public.dictionary_senses s cross join lateral jsonb_array_elements(coalesce(nullif(s.variants,'null'),'[]')) v where s.entry_id=e.id and k<>'' and (public.dictionary_component_key(v->>'form')=k or starts_with(public.dictionary_component_key(v->>'form'),k))) then 2
   when strpos(lower(e.headword),q)>0 then 3
   when exists(select 1 from public.dictionary_senses s where s.entry_id=e.id and strpos(lower(s.gloss_zh_tw),q)>0)
    or exists(select 1 from public.dictionary_etymologies h where h.entry_id=e.id and strpos(lower(h.body||' '||coalesce(h.data_source,'')),q)>0)
    or exists(select 1 from public.dictionary_learning_notes n where n.entry_id=e.id and strpos(lower(n.body),q)>0)
    or exists(select 1 from public.dictionary_examples x where x.entry_id=e.id and strpos(lower(x.body),q)>0)
    or exists(select 1 from public.dictionary_pronunciations p where p.entry_id=e.id and strpos(lower(p.ipa),q)>0)
    or exists(select 1 from public.dictionary_inflections i where i.entry_id=e.id and strpos(lower(i.form),q)>0)
    or exists(select 1 from public.dictionary_senses s where s.entry_id=e.id and strpos(lower(coalesce(s.semantic_domain,'')||' '||coalesce(s.semantic_subdomain,'')),q)>0) then 4 else 9 end rank
 from public.dictionary_entries e where e.status='published' and e.kind in ('word','prefix','root','suffix')
 ), matched as materialized(select * from candidates where rank<9), shown as (
 select * from matched order by rank,length(headword),case kind when 'prefix' then 0 when 'root' then 1 else 2 end,lower(headword) collate "C",id limit 20 offset page_number*20
 ) select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'headword',x.headword,'kind',x.kind,'senses',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'gloss_zh_tw',s.gloss_zh_tw,'part_of_speech',s.part_of_speech) order by s.id) from public.dictionary_senses s where s.entry_id=x.id),'[]'::jsonb)) order by rank,length(headword),case kind when 'prefix' then 0 when 'root' then 1 else 2 end,lower(headword) collate "C",id) from shown x),'[]'::jsonb),'total',(select count(*) from matched),'has_more',(page_number+1)*20<(select count(*) from matched),'page',page_number));
end $function$;

CREATE OR REPLACE FUNCTION public.dictionary_exchange_record(eid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s jsonb; reviews jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 s:=public.get_dictionary_ai_snapshot(eid);if s is null then return null;end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]') into reviews from public.dictionary_review_drafts r where entry_id=eid and state='active';
 s:=public.dictionary_current_morphology_json(public.dictionary_clean_ipa_snapshot(s));
 select coalesce(jsonb_agg(jsonb_set(jsonb_set(value,'{base_snapshot}',public.dictionary_clean_ipa_snapshot(value->'base_snapshot')),'{candidate}',public.dictionary_clean_ipa_candidate(value->'candidate')) order by value->>'id'),'[]'::jsonb) into reviews from jsonb_array_elements(reviews);
 return jsonb_build_object('snapshot',s,'reviews',public.dictionary_current_morphology_json(reviews),'version',md5(public.dictionary_normalize_morpheme_senses(jsonb_build_array(s,public.dictionary_current_morphology_json(reviews)))::text));
end$function$;

drop function public.prepare_dictionary_morpheme_draft(uuid,jsonb,uuid);

drop function public.preview_dictionary_morpheme_conversion(integer);

drop function public.save_dictionary_prefix_draft(jsonb,jsonb,jsonb);

drop function public.save_dictionary_grouped_draft(jsonb,jsonb);

drop function public.search_grouped_dictionary(text,text,integer,text);

drop function public.search_prefix_dictionary(text,integer,text);

drop function public.dictionary_legacy_variant_forms(text);

drop function public.dictionary_variant_names(text);

drop function public.apply_dictionary_ai_change(uuid,jsonb,jsonb,jsonb,jsonb,uuid[],jsonb,boolean);

drop table public.dictionary_sense_groups;
drop table public.dictionary_entry_groups;
commit;
