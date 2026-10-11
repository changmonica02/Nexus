-- Retire per-entry attribution. Preserve legacy snapshots/IDs for audit compatibility.
begin;
do $$ declare t text; begin
 foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes'] loop
  execute format('alter table public.%I alter column source_id drop not null',t);
  execute format('alter table public.%I drop constraint if exists %I',t,t||'_source_id_fkey');
  execute format('comment on column public.%I.source_id is %L',t,'Legacy attribution ID; retained for historical audit only. New content must leave null.');
 end loop;
end $$;
revoke insert,update on public.dictionary_sources from authenticated;
comment on table public.dictionary_sources is 'Archived immutable attribution snapshots; not used by current dictionary imports or readers.';
comment on column public.dictionary_ai_metadata.source_ids is 'Legacy source IDs, retained unchanged for historical audit only.';

create or replace function public.dictionary_guard_change() returns trigger
language plpgsql set search_path = '' as $$
declare parent public.dictionary_entries; target public.dictionary_entries;
begin
  if tg_table_name = 'dictionary_sources' then
    if tg_op <> 'INSERT' then raise exception 'Source snapshots are immutable'; end if;
    new.sha256 := encode(sha256(convert_to(new.raw_text, 'UTF8')), 'hex');
    return new;
  end if;
  if (tg_op='INSERT' and new.source_id is not null) or (tg_op='UPDATE' and new.source_id is distinct from old.source_id) then raise exception 'source_id is retired; omit legacy attribution'; end if;
  if tg_op = 'UPDATE' then
    if new.id <> old.id then raise exception 'Stable IDs cannot change'; end if;
    new.revision := old.revision + 1;
  else new.revision := 1;
  end if;
  new.updated_at := now();
  if tg_table_name = 'dictionary_entries' then
    if tg_op = 'INSERT' and new.status <> 'draft' then raise exception 'Create a draft before publishing'; end if;
    if tg_op = 'UPDATE' then
      if old.status = 'published' then raise exception 'Published revision changes await A3'; end if;
      if new.kind <> old.kind then raise exception 'Entry kind is immutable'; end if;
    end if;
    if new.status = 'published' then
      if not exists(select 1 from public.dictionary_senses where entry_id=new.id) then raise exception 'At least one sense is required'; end if;
      if exists(select 1 from public.dictionary_relations r join public.dictionary_entries e on e.id=r.target_entry_id where r.entry_id=new.id and e.status<>'published') then
        raise exception 'Related entries must be published first';
      end if;
      new.published_at := now();
    else new.published_at := null;
    end if;
  else
    if tg_op = 'UPDATE' and new.entry_id <> old.entry_id then raise exception 'Sense and content ownership cannot change'; end if;
    -- Same lock as publishing, so concurrent child edits cannot leak into a publication.
    select * into parent from public.dictionary_entries where id=new.entry_id for update;
    if not found then raise exception 'Entry not found'; end if;
    if parent.status <> 'draft' then raise exception 'Published revision changes await A3'; end if;
    if tg_table_name = 'dictionary_senses' then
      if parent.kind = 'word' and new.part_of_speech is null then raise exception 'Word senses require part of speech'; end if;
    elsif tg_table_name = 'dictionary_relations' then
      select * into target from public.dictionary_entries where id=new.target_entry_id;
      if parent.kind <> 'word' or target.kind not in ('prefix','root') then raise exception 'Relations must connect word senses to prefix/root senses'; end if;
    end if;
  end if;
  return new;
end $$;

create or replace function public.get_dictionary_entry(entry_uuid uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('entry',to_jsonb(e)-'source_id',
    'senses',coalesce((select jsonb_agg(to_jsonb(s)-'source_id' order by s.id) from public.dictionary_senses s where s.entry_id=e.id),'[]'::jsonb),
    'relations',coalesce((select jsonb_agg(to_jsonb(r)-'source_id' order by r.id) from public.dictionary_relations r where r.entry_id=e.id),'[]'::jsonb),
    'etymologies',coalesce((select jsonb_agg(to_jsonb(h)-'source_id' order by h.id) from public.dictionary_etymologies h where h.entry_id=e.id),'[]'::jsonb),
    'learning_notes',coalesce((select jsonb_agg(to_jsonb(n)-'source_id' order by n.id) from public.dictionary_learning_notes n where n.entry_id=e.id),'[]'::jsonb))
  from public.dictionary_entries e where e.id=entry_uuid;
$$;

create or replace function public.apply_dictionary_bundle(bundle jsonb, preview boolean default true, allow_edits boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  t text; row_data jsonb; existing jsonb; incoming jsonb; cols text; vals text; key text;
  permitted text[]; inserted integer:=0; skipped integer:=0; updated integer:=0; result jsonb;
  warnings jsonb:='[]'::jsonb; matches jsonb; comparison text;
begin
  if bundle ? 'dictionary_sources' then raise exception 'dictionary_sources is retired; remove legacy source fields'; end if;
  if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
  if jsonb_typeof(bundle) is distinct from 'object' then raise exception 'Expected bundle object'; end if;
  if exists(select 1 from jsonb_object_keys(bundle) k where k not in ('dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes')) then
    raise exception 'Unknown bundle table';
  end if;
  -- Serialize bundle operations; row locks/revisions also protect against direct API edits.
  perform pg_advisory_xact_lock(710,1);
  begin
    foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes'] loop
      if jsonb_typeof(coalesce(bundle->t,'[]')) <> 'array' then raise exception 'Expected array: %',t; end if;
      if exists(select 1 from jsonb_array_elements(coalesce(bundle->t,'[]')) r group by r->>'id' having count(*)>1) then raise exception 'Duplicate ID in %',t; end if;
      permitted := case t
        when 'dictionary_entries' then array['id','kind','headword','revision']
        when 'dictionary_senses' then array['id','entry_id','part_of_speech','gloss_zh_tw','revision']
        when 'dictionary_relations' then array['id','entry_id','sense_id','target_entry_id','target_sense_id','relation_kind','verification','verification_note','revision']
        when 'dictionary_etymologies' then array['id','entry_id','sense_id','body','verification','verification_note','revision']
        else array['id','entry_id','sense_id','kind','body','revision'] end;
      for row_data in select value from jsonb_array_elements(coalesce(bundle->t,'[]')) loop
        if jsonb_typeof(row_data) <> 'object' or row_data->>'id' is null then raise exception 'Missing row ID in %',t; end if;
        for key in select jsonb_object_keys(row_data) loop
          if not key=any(permitted) then raise exception 'Unexpected field %.%',t,key; end if;
        end loop;
        execute format('select to_jsonb(r) from public.%I r where id=$1::uuid for update',t) into existing using row_data->>'id';
        incoming := row_data - 'revision';
        if existing is not null then
          if existing @> incoming then skipped:=skipped+1; continue; end if;
          if not allow_edits then raise exception 'ID conflict in %: %',t,row_data->>'id'; end if;
          if row_data->>'revision' is null or (row_data->>'revision')::bigint <> (existing->>'revision')::bigint then raise exception 'Revision conflict in %: %',t,row_data->>'id'; end if;
          select string_agg(format('%I = p.%I',k,k),',') into cols from jsonb_object_keys(incoming) k where k<>'id';
          execute format('update public.%I r set %s from jsonb_populate_record(null::public.%I,$1) p where r.id=p.id',t,cols,t) using incoming;
          updated:=updated+1;
        else
          select string_agg(format('%I',k),','),string_agg(format('p.%I',k),',') into cols,vals from jsonb_object_keys(incoming) k;
          execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) p',t,cols,vals,t) using incoming;
          inserted:=inserted+1;
        end if;
      end loop;
    end loop;
    -- Advisory only: homographs/different origins keep independent stable IDs.
    -- Run after staged inserts so both existing data and this batch are compared.
    foreach t in array array['dictionary_entries','dictionary_senses','dictionary_etymologies','dictionary_learning_notes'] loop
      comparison:=case t
        when 'dictionary_entries' then 'a.kind=b.kind and lower(btrim(a.headword))=lower(btrim(b.headword))'
        when 'dictionary_senses' then 'a.entry_id=b.entry_id and a.part_of_speech is not distinct from b.part_of_speech and btrim(a.gloss_zh_tw)=btrim(b.gloss_zh_tw)'
        when 'dictionary_etymologies' then 'a.entry_id=b.entry_id and a.sense_id is not distinct from b.sense_id and btrim(a.body)=btrim(b.body)'
        else 'a.entry_id=b.entry_id and a.sense_id is not distinct from b.sense_id and a.kind=b.kind and btrim(a.body)=btrim(b.body)' end;
      for row_data in select value from jsonb_array_elements(coalesce(bundle->t,'[]')) loop
        execute format('select coalesce(jsonb_agg(x.id),''[]''::jsonb) from (select b.id from public.%I a join public.%I b on a.id<>b.id and %s where a.id=$1::uuid order by b.id limit 5) x',t,t,comparison)
          into matches using row_data->>'id';
        if jsonb_array_length(matches)>0 then
          warnings:=warnings||jsonb_build_array(jsonb_build_object('table',t,'id',row_data->>'id','similar_ids',matches));
        end if;
      end loop;
    end loop;
    result:=jsonb_build_object('inserted',inserted,'updated',updated,'skipped',skipped,'preview',preview,'warnings',warnings);
    -- Roll back all preview writes AND audit entries, using a private subtransaction.
    if preview then raise exception using errcode='ZX710',detail=result::text; end if;
    return result;
  exception when sqlstate 'ZX710' then
    get stacked diagnostics vals=pg_exception_detail;
    return vals::jsonb;
  end;
end $$;
create or replace function public.get_dictionary_ai_snapshot(entry_uuid uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare detail jsonb; result jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
 detail:=public.get_dictionary_entry(entry_uuid);
 if detail is null then return null; end if;
 select jsonb_build_object('detail',detail,
 'grouping',(select jsonb_build_object('primary_category',primary_category,'tags',tags,'variant_group',variant_group) from public.dictionary_entry_groups where id=entry_uuid),
 'sense_groups',coalesce((select jsonb_object_agg(g.sense_id,g.primary_category) from public.dictionary_sense_groups g join public.dictionary_senses s on s.id=g.sense_id where s.entry_id=entry_uuid),'{}'::jsonb),
 'metadata',(select to_jsonb(m)-'source_ids' from public.dictionary_ai_metadata m where m.entry_id=entry_uuid)) into result;
 return result;
end $$;

create or replace function public.apply_dictionary_ai_change(entry_uuid uuid,expected_snapshot jsonb,bundle jsonb,group_data jsonb,sense_groups jsonb,component_order uuid[],origin_ids jsonb,preview boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $$
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
  if current_snapshot is null or current_snapshot is distinct from expected_snapshot then raise exception 'Revision conflict: regenerate Diff'; end if;
  if entry_kind is distinct from current_snapshot->'detail'->'entry'->>'kind' then raise exception 'Entry type is immutable'; end if;
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
  if entry_kind='prefix' then
   result:=public.save_dictionary_prefix_draft(bundle,group_data-'primary_category',sense_groups);
  elsif entry_kind='root' then result:=public.save_dictionary_grouped_draft(bundle,group_data);
  else result:=public.apply_dictionary_bundle(bundle,false,true);
  end if;
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
end $$;
create or replace function public.get_published_dictionary_entry(entry_uuid uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  with visible as (
    select e.id,e.kind,e.headword,e.status,e.published_at from public.dictionary_entries e
    where auth.uid() is not null and e.id=entry_uuid and e.status='published'
  ), related as (
    select distinct e.id,e.kind,e.headword,s.id as sense_id,s.gloss_zh_tw
    from public.dictionary_relations r
    join public.dictionary_entries e on e.id=r.target_entry_id and e.status='published'
    join public.dictionary_senses s on s.id=r.target_sense_id and s.entry_id=e.id
    where r.entry_id in (select id from visible)
  ), senses as (
    select id,entry_id,part_of_speech,gloss_zh_tw from public.dictionary_senses where entry_id in (select id from visible)
  ), relations as (
    select id,entry_id,sense_id,target_entry_id,target_sense_id,relation_kind,verification
    from public.dictionary_relations where entry_id in (select id from visible)
  ), histories as (
    select id,entry_id,sense_id,body,verification,verification_note as data_source from public.dictionary_etymologies where entry_id in (select id from visible)
  ), notes as (
    select id,entry_id,sense_id,kind,body from public.dictionary_learning_notes where entry_id in (select id from visible)
  )
  select jsonb_build_object('entry',to_jsonb(v),
    'senses',coalesce((select jsonb_agg(s order by id) from senses s),'[]'::jsonb),
    'relations',coalesce((select jsonb_agg(r order by (select array_position(m.component_order,r.id) from public.dictionary_ai_metadata m where m.entry_id=entry_uuid) nulls last,r.id) from relations r),'[]'::jsonb),
    'etymologies',coalesce((select jsonb_agg(h order by id) from histories h),'[]'::jsonb),
    'learning_notes',coalesce((select jsonb_agg(n order by id) from notes n),'[]'::jsonb),
    'related',coalesce((select jsonb_agg(r order by headword,sense_id) from related r),'[]'::jsonb))
  from visible v;
$$;
commit;
