-- Remove per-content verification state. Keep publication attestation and lifecycle guards.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
select pg_advisory_xact_lock(710,1);
lock table public.dictionary_sources,public.dictionary_relations,public.dictionary_etymologies,public.dictionary_review_drafts in share row exclusive mode;
create schema dictionary_verification_backup;
revoke all on schema dictionary_verification_backup from public,anon,authenticated;
create table dictionary_verification_backup.sources as table public.dictionary_sources;
create table dictionary_verification_backup.relations as table public.dictionary_relations;
create table dictionary_verification_backup.etymologies as table public.dictionary_etymologies;
create table dictionary_verification_backup.reviews as select * from public.dictionary_review_drafts where state='active';
create table dictionary_verification_backup.functions as select p.oid::regprocedure::text identity,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('dictionary_normalize_snapshot','apply_dictionary_bundle','get_published_dictionary_entry');
revoke all on all tables in schema dictionary_verification_backup from public,anon,authenticated;
create function public.dictionary_without_verification(v jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare result jsonb; k text; x jsonb;
begin
 if jsonb_typeof(v)='object' then
  result:='{}';
  for k,x in select * from jsonb_each(v) loop
   if k='verification' then continue;end if;
   if k='field' and x='"verification_note"'::jsonb and (v->>'section'='etymologies' or v->'target'->>'section'='etymologies') then x:='"data_source"';end if;
   if k in ('raw_candidate','operation') then result:=result||jsonb_build_object(k,x);continue;end if;
   if k='verification_note' and v ? 'body' and not(v ? 'kind') then
    if v ? 'data_source' then
     if coalesce(x#>>'{}','')<>'' and x is distinct from v->'data_source' then raise exception 'Conflicting etymology source fields; retain both and resolve before migration';end if;
     continue;
    end if;
    k:='data_source';
   end if;
   result:=result||jsonb_build_object(k,public.dictionary_without_verification(x));
  end loop;
  return result;
 elsif jsonb_typeof(v)='array' then
  select coalesce(jsonb_agg(public.dictionary_without_verification(a.x) order by a.n),'[]') into result from jsonb_array_elements(v) with ordinality a(x,n)
  where not(coalesce(a.x->'target'->>'section','') in ('etymologies','relations') and coalesce(a.x->'target'->>'field','')='verification');return result;
 end if;
 return v;
end$$;
revoke all on function public.dictionary_without_verification(jsonb) from public,anon,authenticated;

alter table public.dictionary_sources drop column verification;
alter table public.dictionary_relations drop column verification;
alter table public.dictionary_etymologies drop column verification;
alter table public.dictionary_etymologies rename column verification_note to data_source;

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
    select id,entry_id,sense_id,target_entry_id,target_sense_id
    from public.dictionary_relations where entry_id in (select id from visible)
  ), histories as (
    select id,entry_id,sense_id,body,data_source from public.dictionary_etymologies where entry_id in (select id from visible)
  ), notes as (
    select id,entry_id,sense_id,kind,body from public.dictionary_learning_notes where entry_id in (select id from visible)
  )
  select jsonb_build_object('entry',to_jsonb(v),
    'senses',coalesce((select jsonb_agg(s order by id) from senses s),'[]'::jsonb),
    'relations',coalesce((select jsonb_agg(r order by (select array_position(m.component_order,r.id) from public.dictionary_ai_metadata m where m.entry_id=entry_uuid) nulls last,r.id) from relations r),'[]'::jsonb),
    'etymologies',coalesce((select jsonb_agg(h order by id) from histories h),'[]'::jsonb),
    'learning_notes',coalesce((select jsonb_agg(n order by id) from notes n),'[]'::jsonb),
    'inflections',coalesce((select jsonb_agg(i order by i.sort_order,i.id) from (select id,entry_id,sense_id,form_kind,form,sort_order from public.dictionary_inflections where entry_id=v.id) i),'[]'::jsonb),
    'pronunciations',coalesce((select jsonb_agg(p order by p.sort_order,p.id) from (select id,entry_id,sense_id,locale,ipa,note,sort_order from public.dictionary_pronunciations where entry_id=v.id) p),'[]'::jsonb),
    'examples',coalesce((select jsonb_agg(x order by x.sort_order,x.id) from (select id,entry_id,sense_id,body,sort_order from public.dictionary_examples where entry_id=v.id) x),'[]'::jsonb),
    'lexical_annotations',coalesce((select jsonb_agg(x order by x.sort_order,x.id) from (select id,entry_id,sense_id,kind,body,sort_order from public.dictionary_lexical_annotations where entry_id=v.id) x),'[]'::jsonb),
    'related',coalesce((select jsonb_agg(r order by headword,sense_id) from related r),'[]'::jsonb))
  from visible v;
$$;
create or replace function public.dictionary_normalize_snapshot(s jsonb) returns jsonb language sql immutable set search_path='' as $$
 select public.dictionary_without_verification(case when s is null then null else jsonb_set(jsonb_set(s,'{detail,inflections}',coalesce(s->'detail'->'inflections','[]'::jsonb)),'{detail,relations}',coalesce((select jsonb_agg(value-'relation_kind'-'verification'-'verification_note' order by value->>'id') from jsonb_array_elements(coalesce(s->'detail'->'relations','[]'::jsonb))),'[]'::jsonb)) end);
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
        when 'dictionary_relations' then array['id','entry_id','sense_id','target_entry_id','target_sense_id','relation_kind','verification_note','revision']
        when 'dictionary_etymologies' then array['id','entry_id','sense_id','body','data_source','revision']
        else array['id','entry_id','sense_id','kind','body','revision'] end;
      for row_data in select value from jsonb_array_elements(coalesce(bundle->t,'[]')) loop
        if jsonb_typeof(row_data) <> 'object' or row_data->>'id' is null then raise exception 'Missing row ID in %',t; end if;
        for key in select jsonb_object_keys(row_data) loop
          if not key=any(permitted) then raise exception 'Unexpected field %.%',t,key; end if;
        end loop;
        execute format('select to_jsonb(r) from public.%I r where id=$1::uuid for update',t) into existing using row_data->>'id';
        if t='dictionary_relations' then row_data:=row_data-'relation_kind'-'verification'-'verification_note';end if;
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

-- Active workflows move forward monotonically; immutable history/receipts and raw archives are not rewritten.
update public.dictionary_review_drafts set candidate=public.dictionary_without_verification(candidate),base_snapshot=public.dictionary_without_verification(base_snapshot),revision=revision+1,updated_at=now()
where state='active' and (candidate is distinct from public.dictionary_without_verification(candidate) or base_snapshot is distinct from public.dictionary_without_verification(base_snapshot));
do $$begin
 if to_regclass('public.dictionary_import_review_items') is not null then
  lock table public.dictionary_import_review_items in share row exclusive mode;
  create table dictionary_verification_backup.import_items as table public.dictionary_import_review_items;
  update public.dictionary_import_review_items set item=public.dictionary_without_verification(item)||jsonb_build_object('status','stale','message','內容審核狀態欄位已移除；請重新比對，其他決策保留。'),pending_count=public.dictionary_import_pending(public.dictionary_without_verification(item)),revision=revision+1,updated_at=now()
  where item is distinct from public.dictionary_without_verification(item);
  create table dictionary_verification_backup.import_items_after as table public.dictionary_import_review_items;
 end if;
end$$;
-- Old catalog is not deployed on Nexus. If present in an older installation, retire its state too.
do $$declare t text;begin
 foreach t in array array['etymology_claims','etymology_word_senses'] loop
  if to_regclass('public.'||t) is not null then
   execute format('create table dictionary_verification_backup.%I as table public.%I',t,t);
   execute format('alter table public.%I drop column verification',t);
   execute format('alter table public.%I rename column verification_note to data_source',t);
  end if;
 end loop;
end$$;
create table dictionary_verification_backup.reviews_after as select * from public.dictionary_review_drafts where id in(select id from dictionary_verification_backup.reviews);
revoke all on all tables in schema dictionary_verification_backup from public,anon,authenticated;
-- Compare all remaining live columns against backups; only the retired state/name may differ.
do $$begin
 if exists(select 1 from public.dictionary_sources r full join dictionary_verification_backup.sources b using(id) where to_jsonb(r) is distinct from (to_jsonb(b)-'verification'))
 or exists(select 1 from public.dictionary_relations r full join dictionary_verification_backup.relations b using(id) where to_jsonb(r) is distinct from (to_jsonb(b)-'verification'))
 or exists(select 1 from public.dictionary_etymologies r full join dictionary_verification_backup.etymologies b using(id) where to_jsonb(r) is distinct from ((to_jsonb(b)-'verification'-'verification_note')||jsonb_build_object('data_source',b.verification_note)))
 then raise exception 'Unexpected content loss during verification retirement';end if;
end$$;
notify pgrst,'reload schema';
commit;
