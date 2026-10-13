-- #42 acceptance: additive compatibility release; never run against production without approval.
-- Prerequisite: migrations through 20261020. Back up and validate staging first.
-- Legacy metadata columns/constraints/history remain untouched; current RPCs omit them.
begin;
alter table public.dictionary_relations alter column sense_id drop not null;
alter table public.dictionary_relations alter column relation_kind set default 'learning_decomposition';
-- The composite Sense FK does not enforce entry ownership for NULL source senses.
alter table public.dictionary_relations add constraint dictionary_relations_source_entry_fkey
 foreign key(entry_id) references public.dictionary_entries(id);
create index dictionary_relations_shared_scope on public.dictionary_relations(entry_id,target_sense_id) where sense_id is null;

-- Preserve legacy duplicate rows; prohibit NEW duplicates without depending on retired kind.
create function public.guard_dictionary_composition_scope() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.entry_id=old.entry_id and new.sense_id is not distinct from old.sense_id
 and new.target_entry_id=old.target_entry_id and new.target_sense_id=old.target_sense_id then return new;end if;
 perform pg_advisory_xact_lock(710,1);
 if exists(select 1 from public.dictionary_relations r where r.id<>new.id and r.entry_id=new.entry_id
 and r.sense_id is not distinct from new.sense_id and r.target_entry_id=new.target_entry_id and r.target_sense_id=new.target_sense_id)
 then raise exception 'Duplicate composition relation in source scope';end if;
 return new;
end $$;
revoke all on function public.guard_dictionary_composition_scope() from public,anon,authenticated;
create trigger dictionary_composition_scope before insert or update on public.dictionary_relations
 for each row execute function public.guard_dictionary_composition_scope();

create or replace function public.get_dictionary_entry(entry_uuid uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('entry',to_jsonb(e)-'source_id',
    'senses',coalesce((select jsonb_agg(to_jsonb(s)-'source_id' order by s.id) from public.dictionary_senses s where s.entry_id=e.id),'[]'::jsonb),
    'relations',coalesce((select jsonb_agg(to_jsonb(r)-'source_id'-'relation_kind'-'verification'-'verification_note' order by (select array_position(m.component_order,r.id) from public.dictionary_ai_metadata m where m.entry_id=entry_uuid) nulls last,r.id) from public.dictionary_relations r where r.entry_id=e.id),'[]'::jsonb),
    'etymologies',coalesce((select jsonb_agg(to_jsonb(h)-'source_id' order by h.id) from public.dictionary_etymologies h where h.entry_id=e.id),'[]'::jsonb),
    'inflections',coalesce((select jsonb_agg(i order by i.sort_order,i.id) from public.dictionary_inflections i where i.entry_id=entry_uuid),'[]'::jsonb),
    'pronunciations',coalesce((select jsonb_agg(p order by p.sort_order,p.id) from public.dictionary_pronunciations p where p.entry_id=entry_uuid),'[]'::jsonb),
    'examples',coalesce((select jsonb_agg(x order by x.sort_order,x.id) from public.dictionary_examples x where x.entry_id=entry_uuid),'[]'::jsonb),
    'lexical_annotations',coalesce((select jsonb_agg(x order by x.sort_order,x.id) from public.dictionary_lexical_annotations x where x.entry_id=entry_uuid),'[]'::jsonb),
    'learning_notes',coalesce((select jsonb_agg(to_jsonb(n)-'source_id' order by n.id) from public.dictionary_learning_notes n where n.entry_id=e.id),'[]'::jsonb))
  from public.dictionary_entries e where e.id=entry_uuid;
$$;

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
    select id,entry_id,sense_id,body,verification,verification_note as data_source from public.dictionary_etymologies where entry_id in (select id from visible)
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
 select case when s is null then null else jsonb_set(jsonb_set(s,'{detail,inflections}',coalesce(s->'detail'->'inflections','[]'::jsonb)),'{detail,relations}',coalesce((select jsonb_agg(value-'relation_kind'-'verification'-'verification_note' order by value->>'id') from jsonb_array_elements(coalesce(s->'detail'->'relations','[]'::jsonb))),'[]'::jsonb)) end;
$$;
revoke all on function public.dictionary_normalize_snapshot(jsonb) from public,anon,authenticated;

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

create or replace function public.dictionary_materialize_review(eid uuid,c jsonb) returns void language plpgsql security definer set search_path='' as $$
declare t text; rows jsonb; r jsonb; current_row jsonb; b jsonb; field text; nextrows jsonb; rev bigint;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if c ? 'ai' or jsonb_array_length(c->'bundle'->'dictionary_entries')<>1 or c->'bundle'->'dictionary_entries'->0->>'id' is distinct from eid::text then raise exception 'Stable entry identity required';end if;
 if c->'bundle'->'dictionary_entries'->0->>'kind' is distinct from (select kind from public.dictionary_entries where id=eid) then raise exception 'Entry kind immutable';end if;
 if not(c ? 'inflections') then c:=jsonb_set(c,'{inflections}',coalesce((select jsonb_agg(to_jsonb(i)-'updated_at') from public.dictionary_inflections i where i.entry_id=eid),'[]'));end if;
 insert into public.dictionary_approval_capability values(txid_current(),eid);
 update public.dictionary_entries set status='draft' where id=eid and status='published';
 if not found then raise exception 'Expected current Published';end if;
 -- Remove omitted dependent content before senses. External references reject, never cascade.
 foreach t in array array['dictionary_inflections','dictionary_pronunciations','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_senses'] loop
  rows:=coalesce(case when t='dictionary_inflections' then c->'inflections' when t='dictionary_pronunciations' then c->'pronunciations' when t='dictionary_examples' then c->'examples' when t='dictionary_lexical_annotations' then c->'annotations' else c->'bundle'->t end,'[]');
  if t in ('dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations','dictionary_inflections') then
   -- These extension tables already audit DELETE through their triggers.
   execute format('delete from public.%I where entry_id=$1 and not(id in(select (value->>''id'')::uuid from jsonb_array_elements($2)))',t) using eid,rows;
  else
   execute format('with removed as (delete from public.%I where entry_id=$1 and not(id in(select (value->>''id'')::uuid from jsonb_array_elements($2))) returning *) insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,before_row) select auth.uid(),session_user,$3,id,''DELETE'',to_jsonb(removed) from removed',t) using eid,rows,t;
  end if;
 end loop;
 -- Rebase technical child revisions only after the complete base snapshot was checked.
 foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations','dictionary_inflections'] loop
  field:=case when t='dictionary_inflections' then 'inflections' when t='dictionary_pronunciations' then 'pronunciations' when t='dictionary_examples' then 'examples' when t='dictionary_lexical_annotations' then 'annotations' else t end;
  rows:=coalesce(case when t in ('dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations','dictionary_inflections') then c->field else c->'bundle'->t end,'[]');nextrows:='[]';
  for r in select value from jsonb_array_elements(rows) loop
   execute format('select to_jsonb(x) from public.%I x where id=$1',t) into current_row using (r->>'id')::uuid;
   if t<>'dictionary_entries' and r->>'entry_id' is distinct from eid::text then raise exception 'Content ownership immutable';end if;
   if t<>'dictionary_entries' and current_row is not null and current_row->>'entry_id' is distinct from eid::text then raise exception 'Stable child ID belongs to another entry';end if;
   r:=r-'revision'-'updated_at'-'status'-'published_at';
   if t='dictionary_relations' then r:=r-'relation_kind'-'verification'-'verification_note';end if;
   if current_row is not null then r:=r||jsonb_build_object('revision',current_row->'revision');end if;
   nextrows:=nextrows||jsonb_build_array(r);
  end loop;
  c:=jsonb_set(c,case when t in ('dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations','dictionary_inflections') then array[field] else array['bundle',t] end,nextrows);
 end loop;
 perform public.apply_dictionary_drafts(jsonb_build_array(c),false,true);
 if c ? 'component_order' then
  insert into public.dictionary_ai_metadata(entry_id,component_order) values(eid,array(select jsonb_array_elements_text(c->'component_order'))::uuid[])
  on conflict(entry_id) do update set component_order=excluded.component_order;
 end if;
 update public.dictionary_entries set status='published' where id=eid;
 delete from public.dictionary_approval_capability where transaction_id=txid_current();
end $$;
revoke all on function public.dictionary_materialize_review(uuid,jsonb) from public,anon,authenticated;

create table public.dictionary_publication_confirmation(transaction_id bigint not null,actor_id uuid not null,primary key(transaction_id,actor_id));
revoke all on public.dictionary_publication_confirmation from public,anon,authenticated;
alter table public.dictionary_publication_confirmation enable row level security;
create or replace function public.dictionary_guard_change() returns trigger
language plpgsql security definer set search_path = '' as $$
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
    if tg_table_name='dictionary_entries' then
      if exists(select 1 from public.dictionary_approval_capability where transaction_id=txid_current() and entry_id=new.id) and new.status<>'published' then new.revision:=old.revision;end if;
    end if;
  else new.revision := 1;
  end if;
  new.updated_at := now();
  if tg_table_name = 'dictionary_entries' then
    if tg_op = 'INSERT' and new.status <> 'draft' then raise exception 'Create a draft before publishing'; end if;
    if tg_op = 'UPDATE' then
      if old.status = 'published' and not exists(select 1 from public.dictionary_approval_capability where transaction_id=txid_current() and entry_id=new.id) then raise exception 'Published changes require Review approval'; end if;
      if new.kind <> old.kind then raise exception 'Entry kind is immutable'; end if;
    end if;
    if new.status = 'published' then
      if not exists(select 1 from public.dictionary_publication_confirmation where transaction_id=txid_current() and actor_id=auth.uid())
      and not exists(select 1 from public.dictionary_approval_capability where transaction_id=txid_current() and entry_id=new.id)
      then raise exception 'Content verification confirmation required';end if;
      if not exists(select 1 from public.dictionary_senses where entry_id=new.id) then raise exception 'At least one sense is required'; end if;
      if exists(select 1 from public.dictionary_inflections i where i.entry_id=new.id and not exists(select 1 from public.dictionary_senses s where s.entry_id=new.id and (i.sense_id is null or i.sense_id=s.id) and case when i.form_kind in ('past','past_participle','present_participle','third_person_singular') then lower(btrim(s.part_of_speech)) in ('v','v.','verb','動詞') when i.form_kind='plural' then lower(btrim(s.part_of_speech)) in ('n','n.','noun','名詞') else lower(btrim(s.part_of_speech)) in ('adj','adj.','adjective','形容詞','adv','adv.','adverb','副詞') end)) then raise exception 'Inflection kind does not match sense POS';end if;
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
    if parent.status <> 'draft' then raise exception 'Published changes require Review approval'; end if;
    if tg_table_name = 'dictionary_senses' then
      if parent.kind = 'word' and new.part_of_speech is null then raise exception 'Word senses require part of speech'; end if;
    elsif tg_table_name = 'dictionary_relations' then
      select * into target from public.dictionary_entries where id=new.target_entry_id;
      if new.entry_id=new.target_entry_id then raise exception 'Cannot link entry to itself';end if;
      if parent.kind <> 'word' or target.kind not in ('word','prefix','root') then raise exception 'Relations must connect word senses to component senses'; end if;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.dictionary_guard_change() from public,anon,authenticated;

-- New publication calls require a human attestation, recorded atomically with publication.
-- Internal legacy implementations remain private for existing server-side batch helpers.
revoke all on function public.publish_dictionary_entry(uuid),public.approve_dictionary_review(uuid,bigint),public.publish_dictionary_bulk(text[],text,text) from public,anon,authenticated;
create function public.publish_dictionary_entry(entry_uuid uuid,content_verified boolean) returns public.dictionary_entries
language plpgsql security definer set search_path='' as $$
declare result public.dictionary_entries;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if content_verified is distinct from true then raise exception 'Content verification confirmation required';end if;
 insert into public.dictionary_publication_confirmation values(txid_current(),auth.uid()) on conflict do nothing;
 result:=public.publish_dictionary_entry(entry_uuid);
 insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,after_row)
 values(auth.uid(),session_user,'dictionary_entries',entry_uuid,'PUBLISH_VERIFIED',jsonb_build_object('revision',result.revision,'content_verified',true));
 delete from public.dictionary_publication_confirmation where transaction_id=txid_current() and actor_id=auth.uid();
 return result;
end $$;
create function public.approve_dictionary_review(review_uuid uuid,expected_revision bigint,content_verified boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;eid uuid;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if content_verified is distinct from true then raise exception 'Content verification confirmation required';end if;
 insert into public.dictionary_publication_confirmation values(txid_current(),auth.uid()) on conflict do nothing;
 result:=public.approve_dictionary_review(review_uuid,expected_revision);
 select entry_id into eid from public.dictionary_review_drafts where id=review_uuid;
 insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,after_row)
 values(auth.uid(),session_user,'dictionary_entries',eid,'PUBLISH_VERIFIED',jsonb_build_object('review_id',review_uuid,'review_revision',expected_revision,'content_verified',true));
 delete from public.dictionary_publication_confirmation where transaction_id=txid_current() and actor_id=auth.uid();
 return result;
end $$;
create function public.publish_dictionary_bulk(kind_filters text[],query_text text,expected_signature text,content_verified boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if content_verified is distinct from true then raise exception 'Content verification confirmation required';end if;
 insert into public.dictionary_publication_confirmation values(txid_current(),auth.uid()) on conflict do nothing;
 result:=public.publish_dictionary_bulk(kind_filters,query_text,expected_signature);
 insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,after_row)
 values(auth.uid(),session_user,'dictionary_bulk_publish_previews',(result->>'signature')::uuid,'PUBLISH_VERIFIED',jsonb_build_object('content_verified',true,'published',result->'published'));
 delete from public.dictionary_publication_confirmation where transaction_id=txid_current() and actor_id=auth.uid();
 return result;
end $$;
revoke all on function public.publish_dictionary_entry(uuid,boolean),public.approve_dictionary_review(uuid,bigint,boolean),public.publish_dictionary_bulk(text[],text,text,boolean) from public,anon;
grant execute on function public.publish_dictionary_entry(uuid,boolean),public.approve_dictionary_review(uuid,bigint,boolean),public.publish_dictionary_bulk(text[],text,text,boolean) to authenticated;
-- Notify PostgREST to discover the new overloads and the source Entry FK.
notify pgrst,'reload schema';

commit;
