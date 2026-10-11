-- Sense-aware pronunciations, using the existing canonical draft and revision pipeline.
begin;
create table public.dictionary_pronunciations (
 id uuid primary key,
 entry_id uuid not null references public.dictionary_entries(id) on delete cascade,
 sense_id uuid,
 locale text check(locale is null or length(btrim(locale))>0),
 ipa text not null check(length(btrim(ipa))>0),
 note text,
 sort_order integer not null default 0 check(sort_order>=0),
 revision bigint not null default 1,
 updated_at timestamptz not null default now(),
 foreign key(entry_id,sense_id) references public.dictionary_senses(entry_id,id)
);
create index dictionary_pronunciations_entry on public.dictionary_pronunciations(entry_id,sort_order,id);
create index dictionary_pronunciations_sense on public.dictionary_pronunciations(sense_id) where sense_id is not null;
alter table public.dictionary_pronunciations enable row level security;
revoke all on public.dictionary_pronunciations from public,anon,authenticated;
grant select on public.dictionary_pronunciations to authenticated;
create policy dictionary_pronunciations_read on public.dictionary_pronunciations for select to authenticated
 using(public.is_dictionary_admin() or exists(select 1 from public.dictionary_entries e where e.id=entry_id and e.status='published'));
create trigger dictionary_pronunciations_audit after insert or update or delete on public.dictionary_pronunciations
 for each row execute function public.audit_dictionary_extension();


create or replace function public.apply_dictionary_drafts(drafts jsonb,preview boolean default true,allow_edits boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d jsonb; b jsonb; r jsonb; old_row jsonb; stored jsonb; total jsonb; item jsonb; g jsonb;
 eid uuid; tbl text; k text; before_rev bigint; changed boolean; result jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
 if jsonb_typeof(drafts) is distinct from 'array' or jsonb_array_length(drafts)=0 then raise exception 'Expected drafts'; end if;
 perform pg_advisory_xact_lock(710,1);
 begin
 total:=jsonb_build_object('inserted',0,'updated',0,'skipped',0,'warnings','[]'::jsonb,'preview',preview,'items','[]'::jsonb);
 for d in select value from jsonb_array_elements(drafts) order by (value->'bundle'->'dictionary_entries'->0->>'kind'='word') loop
  b:=d->'bundle';
  if jsonb_array_length(b->'dictionary_entries')<>1 then raise exception 'Expected one entry per draft'; end if;
  eid:=(b->'dictionary_entries'->0->>'id')::uuid;
  select revision into before_rev from public.dictionary_entries where id=eid for update;
  if not(d ? 'ai') and exists(select 1 from public.dictionary_entries where id=eid and status<>'draft') then raise exception 'Published content requires AI review draft'; end if;
  if before_rev is not null and allow_edits and before_rev is distinct from (b->'dictionary_entries'->0->>'revision')::bigint then raise exception 'Revision conflict'; end if;
  if d ? 'ai' then
   result:=public.apply_dictionary_ai_change((d->'ai'->>'entry_uuid')::uuid,nullif(d->'ai'->'expected_snapshot','null'::jsonb),b,
    coalesce(nullif(d->'group_data','null'::jsonb),'{"primary_category":null,"tags":[],"variant_group":null}'::jsonb),d->'sense_groups',
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
   result:=result->'result';
  else
  -- Verify the complete bundle under its normal allow_edits policy before grouping RPCs.
  result:=public.apply_dictionary_bundle(b,true,allow_edits);
  g:=d->'group_data';
  if b->'dictionary_entries'->0->>'kind'='prefix' and (jsonb_array_length(coalesce(d->'sense_groups','[]'))>0 or g<>'null'::jsonb) then
   if g is null or g='null'::jsonb then
    select jsonb_build_object('tags',tags,'variant_group',variant_group) into g from public.dictionary_entry_groups where id=eid;
    g:=coalesce(g,'{"tags":[],"variant_group":null}'::jsonb);
   end if;
   -- Replayed unchanged imports must not bump the parent merely to rewrite identical grouping.
   if not exists(select 1 from public.dictionary_entry_groups where id=eid) or exists(
    select 1 from jsonb_array_elements(d->'sense_groups') x left join public.dictionary_sense_groups s on s.sense_id=(x->>'sense_id')::uuid
    where s.sense_id is null or s.primary_category is distinct from x->>'primary_category'
   ) or exists(select 1 from public.dictionary_entry_groups where id=eid and (to_jsonb(tags) is distinct from g->'tags' or variant_group is distinct from g->>'variant_group')) then
    b:=jsonb_set(b,'{dictionary_entries,0,revision}',to_jsonb(coalesce(before_rev,0)));
    result:=public.save_dictionary_prefix_draft(b,g-'primary_category',coalesce(d->'sense_groups','[]'));
   else result:=public.apply_dictionary_bundle(b,false,allow_edits); end if;
  elsif b->'dictionary_entries'->0->>'kind'='root' and g is not null and g<>'null'::jsonb then
   if not exists(select 1 from public.dictionary_entry_groups where id=eid and primary_category is not distinct from g->>'primary_category' and to_jsonb(tags)=g->'tags' and variant_group is not distinct from g->>'variant_group') then
    b:=jsonb_set(b,'{dictionary_entries,0,revision}',to_jsonb(coalesce(before_rev,0)));
    result:=public.save_dictionary_grouped_draft(b,g);
   else result:=public.apply_dictionary_bundle(b,false,allow_edits); end if;
  else result:=public.apply_dictionary_bundle(b,false,allow_edits); end if;
  end if;
  foreach k in array array['inserted','updated','skipped'] loop total:=jsonb_set(total,array[k],to_jsonb((total->>k)::int+(result->>k)::int));end loop;
  total:=jsonb_set(total,'{warnings}',(total->'warnings')||coalesce(result->'warnings','[]'));
  changed:=false;
  foreach tbl in array array['dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations'] loop
   for r in select value from jsonb_array_elements(coalesce(d->case when tbl='dictionary_examples' then 'examples' when tbl='dictionary_pronunciations' then 'pronunciations' else 'annotations' end,'[]')) loop
    if r->>'entry_id' is distinct from eid::text then raise exception 'Content belongs to another entry'; end if;
    if tbl='dictionary_pronunciations' then
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
     if tbl='dictionary_pronunciations' then
      update public.dictionary_pronunciations set ipa=r->>'ipa',locale=r->>'locale',note=r->>'note',sense_id=(r->>'sense_id')::uuid,
       sort_order=coalesce((r->>'sort_order')::int,0),revision=revision+1,updated_at=now() where id=(r->>'id')::uuid;
     else
     execute format('update public.%I set body=$1,sense_id=$2,sort_order=$3,revision=revision+1,updated_at=now() where id=$4',tbl)
     using r->>'body',(r->>'sense_id')::uuid,coalesce((r->>'sort_order')::int,0),(r->>'id')::uuid;
     end if;
     if tbl='dictionary_lexical_annotations' and old_row->>'kind' is distinct from r->>'kind' then raise exception 'Annotation kind immutable';end if;
     k:='updated';
    else
     if tbl='dictionary_pronunciations' then
      insert into public.dictionary_pronunciations(id,entry_id,sense_id,locale,ipa,note,sort_order)
       values((r->>'id')::uuid,eid,(r->>'sense_id')::uuid,r->>'locale',r->>'ipa',r->>'note',coalesce((r->>'sort_order')::int,0));
     elsif tbl='dictionary_examples' then
      insert into public.dictionary_examples(id,entry_id,sense_id,body,sort_order) values((r->>'id')::uuid,eid,(r->>'sense_id')::uuid,r->>'body',coalesce((r->>'sort_order')::int,0));
     else insert into public.dictionary_lexical_annotations(id,entry_id,sense_id,kind,body,sort_order) values((r->>'id')::uuid,eid,(r->>'sense_id')::uuid,r->>'kind',r->>'body',coalesce((r->>'sort_order')::int,0));end if;
     k:='inserted';
    end if;
    changed:=true;total:=jsonb_set(total,array[k],to_jsonb((total->>k)::int+1));
   end loop;
  end loop;
  if changed and before_rev is not null then update public.dictionary_entries set revision=revision+1 where id=eid and revision=before_rev;end if;
  total:=jsonb_set(total,'{items}',(total->'items')||jsonb_build_array(jsonb_build_object('entry_id',eid,'kind',b->'dictionary_entries'->0->>'kind','headword',b->'dictionary_entries'->0->>'headword','status',case when before_rev is null then 'new' when changed or (result->>'updated')::int>0 or (result->>'inserted')::int>0 or exists(select 1 from public.dictionary_entries where id=eid and revision<>before_rev) then 'modified' else 'unchanged' end)));

 end loop;
 if preview then raise exception using errcode='ZX713',detail=total::text;end if;
 return total;
 exception when sqlstate 'ZX713' then get stacked diagnostics k=pg_exception_detail;return k::jsonb;
 when others then raise exception using message=sqlerrm,errcode=sqlstate,detail=coalesce(d->'origin','{}'::jsonb)::text;
 end;
end $$;

create or replace function public.get_dictionary_entry(entry_uuid uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('entry',to_jsonb(e)-'source_id',
    'senses',coalesce((select jsonb_agg(to_jsonb(s)-'source_id' order by s.id) from public.dictionary_senses s where s.entry_id=e.id),'[]'::jsonb),
    'relations',coalesce((select jsonb_agg(to_jsonb(r)-'source_id' order by r.id) from public.dictionary_relations r where r.entry_id=e.id),'[]'::jsonb),
    'etymologies',coalesce((select jsonb_agg(to_jsonb(h)-'source_id' order by h.id) from public.dictionary_etymologies h where h.entry_id=e.id),'[]'::jsonb),
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
    'pronunciations',coalesce((select jsonb_agg(p order by p.sort_order,p.id) from (select id,entry_id,sense_id,locale,ipa,note,sort_order from public.dictionary_pronunciations where entry_id=v.id) p),'[]'::jsonb),
    'examples',coalesce((select jsonb_agg(x order by x.sort_order,x.id) from (select id,entry_id,sense_id,body,sort_order from public.dictionary_examples where entry_id=v.id) x),'[]'::jsonb),
    'lexical_annotations',coalesce((select jsonb_agg(x order by x.sort_order,x.id) from (select id,entry_id,sense_id,kind,body,sort_order from public.dictionary_lexical_annotations where entry_id=v.id) x),'[]'::jsonb),
    'related',coalesce((select jsonb_agg(r order by headword,sense_id) from related r),'[]'::jsonb))
  from visible v;
$$;

create or replace function public.guard_dictionary_extension_sense_delete() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.dictionary_pronunciations where sense_id=old.id) then raise exception 'Sense contains pronunciations; remove or reassign pronunciations first';end if;
 if exists(select 1 from public.dictionary_examples where sense_id=old.id) or exists(select 1 from public.dictionary_lexical_annotations where sense_id=old.id) then
  raise exception 'Sense contains examples or lexical annotations; remove those contents first';
 end if;
 return old;
end $$;

create or replace function public.delete_dictionary_drafts(targets jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare ids uuid[]; blocked text; t text; affected integer;
begin
  if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
  if targets is null or jsonb_typeof(targets)<>'array' then raise exception 'Invalid deletion targets'; end if;
  if jsonb_array_length(targets)=0 then raise exception 'No deletion targets'; end if;
  if exists(select 1 from jsonb_array_elements(targets) x where x->>'id' is null or x->>'revision' is null) then raise exception 'Missing ID or revision'; end if;
  select array_agg((x->>'id')::uuid) into ids from jsonb_array_elements(targets) x;
  if cardinality(ids)<>(select count(distinct v) from unnest(ids) v) then raise exception 'Duplicate deletion ID'; end if;
  -- Same parent locks used by publication and child edits, acquired in stable order.
  perform id from public.dictionary_entries where id=any(ids) order by id for update;
  if (select count(*) from public.dictionary_entries where id=any(ids))<>cardinality(ids) then raise exception 'Entry missing; reload before deleting'; end if;
  select string_agg(headword||' ('||id::text||')',', ' order by id) into blocked
    from public.dictionary_entries where id=any(ids) and status<>'draft';
  if blocked is not null then raise exception 'Cannot delete Published: %',blocked; end if;
  if exists(select 1 from public.dictionary_entries e join jsonb_array_elements(targets) x on e.id=(x->>'id')::uuid where e.revision<>(x->>'revision')::bigint) then raise exception 'Revision conflict; reload before deleting'; end if;
  if exists(select 1 from public.dictionary_relations where target_entry_id=any(ids) and not(entry_id=any(ids))) then raise exception 'Entry is referenced by another entry; deletion cancelled'; end if;
  -- Keep immutable source snapshots and audit history. Delete only selected entries' content.
  delete from public.dictionary_pronunciations where entry_id=any(ids);
  delete from public.dictionary_examples where entry_id=any(ids);
  delete from public.dictionary_lexical_annotations where entry_id=any(ids);
  foreach t in array array['dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_senses','dictionary_entries'] loop
    execute format('with removed as (delete from public.%I where %I=any($1) returning *) insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,before_row,after_row) select auth.uid(),session_user,$2,id,''DELETE'',to_jsonb(removed),null from removed',t,case when t='dictionary_entries' then 'id' else 'entry_id' end) using ids,t;
  end loop;
  affected:=cardinality(ids);
  return affected;
exception when foreign_key_violation then
  raise exception 'Entry is still referenced; entire deletion cancelled';
end $$;

create or replace function public.delete_dictionary_draft_content(entry_uuid uuid, content_table text, content_uuid uuid, expected_entry_revision bigint, expected_content_revision bigint)
returns bigint language plpgsql security definer set search_path='' as $$
declare parent public.dictionary_entries; content jsonb; next_revision bigint;
begin
  if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
  if content_table is null or content_table not in ('dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations') then raise exception 'Invalid content table'; end if;
  select * into parent from public.dictionary_entries where id=entry_uuid for update;
  if not found then raise exception 'Entry not found'; end if;
  if parent.status<>'draft' then raise exception 'Published content cannot be deleted'; end if;
  execute format('select to_jsonb(r) from public.%I r where id=$1 and entry_id=$2 for update',content_table) into content using content_uuid,entry_uuid;
  if content is null then raise exception 'Content not found'; end if;
  if parent.revision is distinct from expected_entry_revision or (content->>'revision')::bigint is distinct from expected_content_revision then raise exception 'Revision conflict; reload before deleting'; end if;
  execute format('delete from public.%I where id=$1 and entry_id=$2',content_table) using content_uuid,entry_uuid;
  if content_table in ('dictionary_etymologies','dictionary_learning_notes') then
  insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,before_row,after_row)
    values(auth.uid(),session_user,content_table,content_uuid,'DELETE',content,null);
  end if;
  update public.dictionary_entries set headword=headword where id=entry_uuid returning revision into next_revision;
  return next_revision;
end $$;

create or replace function public.dictionary_import_context(candidate jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b jsonb:=candidate->'bundle'; e jsonb:=b->'dictionary_entries'->0;
 identities jsonb:='{}'; rows jsonb; ids uuid[]; t text;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations'] loop
  rows:=case when t='dictionary_pronunciations' then candidate->'pronunciations' when t='dictionary_examples' then candidate->'examples' when t='dictionary_lexical_annotations' then candidate->'annotations' else b->t end;
  select array_agg((r->>'id')::uuid) into ids from jsonb_array_elements(coalesce(rows,'[]')) r;
  execute format('select coalesce(jsonb_agg(to_jsonb(x)-''source_id'' order by x.id),''[]''::jsonb) from public.%I x where id=any($1)',t) into rows using ids;
  identities:=jsonb_set(identities,array[t],rows);
 end loop;
 return jsonb_build_object(
  'snapshot',public.get_dictionary_ai_snapshot((e->>'id')::uuid),
  'identities',identities,
  'similar',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'kind',x.kind,'headword',x.headword,'status',x.status,'revision',x.revision) order by x.id)
    from public.dictionary_entries x where x.kind=e->>'kind' and lower(btrim(x.headword))=lower(btrim(e->>'headword')) and x.id<>(e->>'id')::uuid),'[]'::jsonb));
end $$;

create or replace function public.dictionary_snapshot_candidate(s jsonb) returns jsonb language plpgsql set search_path='' as $$
declare b jsonb:='{}'; k text; rows jsonb;
begin
 foreach k in array array['entries','senses','relations','etymologies','learning_notes'] loop
  if k='entries' then rows:=jsonb_build_array(s->'detail'->'entry');else rows:=coalesce(s->'detail'->k,'[]');end if;
  select coalesce(jsonb_agg(value-'status'-'published_at'-'updated_at'-'source_id'),'[]') into rows from jsonb_array_elements(rows);
  b:=b||jsonb_build_object('dictionary_'||k,rows);
 end loop;
 return jsonb_build_object('bundle',b,'group_data',s->'grouping',
  'sense_groups',coalesce((select jsonb_agg(jsonb_build_object('sense_id',key,'primary_category',value)) from jsonb_each(coalesce(s->'sense_groups','{}'))),'[]'),
  'pronunciations',coalesce((select jsonb_agg(value-'updated_at') from jsonb_array_elements(coalesce(s->'detail'->'pronunciations','[]'))),'[]'),
  'examples',coalesce((select jsonb_agg(value-'updated_at') from jsonb_array_elements(coalesce(s->'detail'->'examples','[]'))),'[]'),
  'annotations',coalesce((select jsonb_agg(value-'updated_at') from jsonb_array_elements(coalesce(s->'detail'->'lexical_annotations','[]'))),'[]'),
  'component_order',coalesce(s->'metadata'->'component_order','[]'));
end $$;

create or replace function public.dictionary_overlay_candidate(base jsonb,patch jsonb) returns jsonb language plpgsql set search_path='' as $$
declare result jsonb:=base; k text; r jsonb; rows jsonb; old jsonb;
begin
 if patch ? 'ai' then raise exception 'Unexpected AI envelope';end if;
 foreach k in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','examples','annotations','pronunciations','sense_groups'] loop
  rows:=coalesce(case when k like 'dictionary_%' then result->'bundle'->k else result->k end,'[]');
  for r in select value from jsonb_array_elements(coalesce(case when k like 'dictionary_%' then patch->'bundle'->k else patch->k end,'[]')) loop
   select value into old from jsonb_array_elements(rows) where value->>case when k='sense_groups' then 'sense_id' else 'id' end=r->>case when k='sense_groups' then 'sense_id' else 'id' end;
   select coalesce(jsonb_agg(value),'[]') into rows from jsonb_array_elements(rows) where value->>case when k='sense_groups' then 'sense_id' else 'id' end is distinct from r->>case when k='sense_groups' then 'sense_id' else 'id' end;
   rows:=rows||jsonb_build_array(coalesce(old,'{}')||r);
  end loop;
  result:=jsonb_set(result,case when k like 'dictionary_%' then array['bundle',k] else array[k] end,rows);
 end loop;
 if patch->'group_data' is not null and patch->'group_data'<>'null'::jsonb then result:=jsonb_set(result,'{group_data}',patch->'group_data');end if;
 if patch ? 'component_order' then result:=jsonb_set(result,'{component_order}',patch->'component_order');end if;
 return result;
end $$;

create or replace function public.dictionary_materialize_review(eid uuid,c jsonb) returns void language plpgsql security definer set search_path='' as $$
declare t text; rows jsonb; r jsonb; current_row jsonb; b jsonb; field text; nextrows jsonb; rev bigint;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if c ? 'ai' or jsonb_array_length(c->'bundle'->'dictionary_entries')<>1 or c->'bundle'->'dictionary_entries'->0->>'id' is distinct from eid::text then raise exception 'Stable entry identity required';end if;
 if c->'bundle'->'dictionary_entries'->0->>'kind' is distinct from (select kind from public.dictionary_entries where id=eid) then raise exception 'Entry kind immutable';end if;
 insert into public.dictionary_approval_capability values(txid_current(),eid);
 update public.dictionary_entries set status='draft' where id=eid and status='published';
 if not found then raise exception 'Expected current Published';end if;
 -- Remove omitted dependent content before senses. External references reject, never cascade.
 foreach t in array array['dictionary_pronunciations','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_senses'] loop
  rows:=coalesce(case when t='dictionary_pronunciations' then c->'pronunciations' when t='dictionary_examples' then c->'examples' when t='dictionary_lexical_annotations' then c->'annotations' else c->'bundle'->t end,'[]');
  if t in ('dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations') then
   -- These extension tables already audit DELETE through their triggers.
   execute format('delete from public.%I where entry_id=$1 and not(id in(select (value->>''id'')::uuid from jsonb_array_elements($2)))',t) using eid,rows;
  else
   execute format('with removed as (delete from public.%I where entry_id=$1 and not(id in(select (value->>''id'')::uuid from jsonb_array_elements($2))) returning *) insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,before_row) select auth.uid(),session_user,$3,id,''DELETE'',to_jsonb(removed) from removed',t) using eid,rows,t;
  end if;
 end loop;
 -- Rebase technical child revisions only after the complete base snapshot was checked.
 foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations'] loop
  field:=case when t='dictionary_pronunciations' then 'pronunciations' when t='dictionary_examples' then 'examples' when t='dictionary_lexical_annotations' then 'annotations' else t end;
  rows:=coalesce(case when t in ('dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations') then c->field else c->'bundle'->t end,'[]');nextrows:='[]';
  for r in select value from jsonb_array_elements(rows) loop
   execute format('select to_jsonb(x) from public.%I x where id=$1',t) into current_row using (r->>'id')::uuid;
   if t<>'dictionary_entries' and r->>'entry_id' is distinct from eid::text then raise exception 'Content ownership immutable';end if;
   if t<>'dictionary_entries' and current_row is not null and current_row->>'entry_id' is distinct from eid::text then raise exception 'Stable child ID belongs to another entry';end if;
   r:=r-'revision'-'updated_at'-'status'-'published_at';
   if current_row is not null then r:=r||jsonb_build_object('revision',current_row->'revision');end if;
   nextrows:=nextrows||jsonb_build_array(r);
  end loop;
  c:=jsonb_set(c,case when t in ('dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations') then array[field] else array['bundle',t] end,nextrows);
 end loop;
 perform public.apply_dictionary_drafts(jsonb_build_array(c),false,true);
 if c ? 'component_order' then
  insert into public.dictionary_ai_metadata(entry_id,component_order) values(eid,array(select jsonb_array_elements_text(c->'component_order'))::uuid[])
  on conflict(entry_id) do update set component_order=excluded.component_order;
 end if;
 update public.dictionary_entries set status='published' where id=eid;
 delete from public.dictionary_approval_capability where transaction_id=txid_current();
end $$;

commit;
