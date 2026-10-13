-- #41 / #42: additive, no backfill or production writes. Apply manually after review.
begin;
create table public.dictionary_inflections (
 id uuid primary key,
 entry_id uuid not null references public.dictionary_entries(id) on delete cascade,
 sense_id uuid,
 form_kind text not null check(form_kind in ('past','past_participle','present_participle','third_person_singular','plural','comparative','superlative')),
 form text not null check(length(btrim(form))>0),
 sort_order integer not null default 0 check(sort_order>=0),
 revision bigint not null default 1, updated_at timestamptz not null default now(),
 foreign key(entry_id,sense_id) references public.dictionary_senses(entry_id,id)
);
create unique index dictionary_inflections_identity on public.dictionary_inflections(entry_id,coalesce(sense_id,'00000000-0000-0000-0000-000000000000'::uuid),form_kind,lower(btrim(form)));
create index dictionary_inflections_search on public.dictionary_inflections(lower(btrim(form)),entry_id);
create index dictionary_inflections_entry on public.dictionary_inflections(entry_id,sort_order,id);
alter table public.dictionary_inflections enable row level security;
revoke all on public.dictionary_inflections from public,anon,authenticated;
grant select on public.dictionary_inflections to authenticated;
create policy dictionary_inflections_read on public.dictionary_inflections for select to authenticated
 using(public.is_dictionary_admin() or exists(select 1 from public.dictionary_entries e where e.id=entry_id and e.status='published'));
create trigger dictionary_inflections_audit after insert or update or delete on public.dictionary_inflections for each row execute function public.audit_dictionary_extension();

create function public.guard_dictionary_inflection() returns trigger language plpgsql security definer set search_path='' as $$
declare parent public.dictionary_entries; valid boolean;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 select * into parent from public.dictionary_entries where id=new.entry_id for update;
 if parent.kind is distinct from 'word' or parent.status is distinct from 'draft' then raise exception 'Inflections require a Word draft';end if;
 if tg_op='UPDATE' and (new.id<>old.id or new.entry_id<>old.entry_id) then raise exception 'Inflection identity immutable';end if;
 select exists(select 1 from public.dictionary_senses s where s.entry_id=new.entry_id and (new.sense_id is null or s.id=new.sense_id) and
  case when new.form_kind in ('past','past_participle','present_participle','third_person_singular') then lower(btrim(s.part_of_speech)) in ('v','v.','verb','動詞')
       when new.form_kind='plural' then lower(btrim(s.part_of_speech)) in ('n','n.','noun','名詞')
       else lower(btrim(s.part_of_speech)) in ('adj','adj.','adjective','形容詞','adv','adv.','adverb','副詞') end) into valid;
 if not valid then raise exception 'Inflection kind does not match sense POS';end if;
 return new;
end $$;
create trigger dictionary_inflections_guard before insert or update on public.dictionary_inflections for each row execute function public.guard_dictionary_inflection();
revoke all on function public.guard_dictionary_inflection() from public,anon,authenticated;


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
  if jsonb_typeof(coalesce(d->'inflections','[]')) is distinct from 'array' then raise exception 'Expected inflections array';end if;
  if exists(select 1 from jsonb_array_elements(coalesce(d->'inflections','[]')) x group by x->>'id' having count(*)>1) then raise exception 'Duplicate inflection ID';end if;
  b:=d->'bundle';
  if jsonb_array_length(b->'dictionary_entries')<>1 then raise exception 'Expected one entry per draft'; end if;
  eid:=(b->'dictionary_entries'->0->>'id')::uuid;
  select revision into before_rev from public.dictionary_entries where id=eid for update;
  if not(d ? 'ai') and exists(select 1 from public.dictionary_entries where id=eid and status<>'draft') then raise exception 'Published content requires AI review draft'; end if;
  if before_rev is not null and allow_edits and before_rev is distinct from (b->'dictionary_entries'->0->>'revision')::bigint then raise exception 'Revision conflict'; end if;
  if coalesce((d->>'replace_editor_children')::boolean,false) then
   if not allow_edits or before_rev is null or exists(select 1 from public.dictionary_entries where id=eid and status<>'draft') then raise exception 'Full editor save requires existing Draft';end if;
   delete from public.dictionary_inflections where entry_id=eid and not(id in(select (x->>'id')::uuid from jsonb_array_elements(coalesce(d->'inflections','[]')) x));
   with removed as (delete from public.dictionary_relations where entry_id=eid and not(id in(select (x->>'id')::uuid from jsonb_array_elements(coalesce(b->'dictionary_relations','[]')) x)) returning *)
    insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,before_row) select auth.uid(),session_user,'dictionary_relations',id,'DELETE',to_jsonb(removed) from removed;
  end if;
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
   if d->'ai'->'expected_snapshot'->'detail'->'entry'->>'status'='published' and jsonb_array_length(coalesce(d->'ai'->'expected_snapshot'->'detail'->'inflections','[]'))>0 then raise exception 'Published inflections require snapshot review';end if;
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
  foreach tbl in array array['dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations','dictionary_inflections'] loop
   for r in select value from jsonb_array_elements(coalesce(d->case when tbl='dictionary_examples' then 'examples' when tbl='dictionary_inflections' then 'inflections' when tbl='dictionary_pronunciations' then 'pronunciations' else 'annotations' end,'[]')) loop
    if r->>'entry_id' is distinct from eid::text then raise exception 'Content belongs to another entry'; end if;
    if tbl='dictionary_inflections' then
     if jsonb_typeof(r->'form') is distinct from 'string' or jsonb_typeof(r->'form_kind') is distinct from 'string' or (r ? 'sort_order' and jsonb_typeof(r->'sort_order') is distinct from 'number') then raise exception 'Invalid inflection fields';end if;
     if exists(select 1 from jsonb_object_keys(r) x where x not in ('id','entry_id','sense_id','form_kind','form','sort_order','revision')) then raise exception 'Unknown inflection field';end if;
    elsif tbl='dictionary_pronunciations' then
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
     elsif tbl='dictionary_pronunciations' then
      update public.dictionary_pronunciations set ipa=r->>'ipa',locale=r->>'locale',note=r->>'note',sense_id=(r->>'sense_id')::uuid,
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
     elsif tbl='dictionary_pronunciations' then
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
  if d ? 'component_order' then
   if exists(select 1 from public.dictionary_ai_metadata where entry_id=eid and to_jsonb(component_order) is distinct from d->'component_order') or (not exists(select 1 from public.dictionary_ai_metadata where entry_id=eid) and jsonb_array_length(d->'component_order')>0) then changed:=true;end if;
   insert into public.dictionary_ai_metadata(entry_id,component_order) values(eid,array(select jsonb_array_elements_text(d->'component_order'))::uuid[]) on conflict(entry_id) do update set component_order=excluded.component_order;
  end if;
  if coalesce((d->>'replace_editor_children')::boolean,false) then changed:=true;end if;
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
    'relations',coalesce((select jsonb_agg(to_jsonb(r)-'source_id' order by (select array_position(m.component_order,r.id) from public.dictionary_ai_metadata m where m.entry_id=entry_uuid) nulls last,r.id) from public.dictionary_relations r where r.entry_id=e.id),'[]'::jsonb),
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
    'inflections',coalesce((select jsonb_agg(i order by i.sort_order,i.id) from (select id,entry_id,sense_id,form_kind,form,sort_order from public.dictionary_inflections where entry_id=v.id) i),'[]'::jsonb),
    'pronunciations',coalesce((select jsonb_agg(p order by p.sort_order,p.id) from (select id,entry_id,sense_id,locale,ipa,note,sort_order from public.dictionary_pronunciations where entry_id=v.id) p),'[]'::jsonb),
    'examples',coalesce((select jsonb_agg(x order by x.sort_order,x.id) from (select id,entry_id,sense_id,body,sort_order from public.dictionary_examples where entry_id=v.id) x),'[]'::jsonb),
    'lexical_annotations',coalesce((select jsonb_agg(x order by x.sort_order,x.id) from (select id,entry_id,sense_id,kind,body,sort_order from public.dictionary_lexical_annotations where entry_id=v.id) x),'[]'::jsonb),
    'related',coalesce((select jsonb_agg(r order by headword,sense_id) from related r),'[]'::jsonb))
  from visible v;
$$;

create or replace function public.dictionary_import_context(candidate jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b jsonb:=candidate->'bundle'; e jsonb:=b->'dictionary_entries'->0;
 identities jsonb:='{}'; rows jsonb; ids uuid[]; t text;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations','dictionary_inflections'] loop
  rows:=case when t='dictionary_inflections' then candidate->'inflections' when t='dictionary_pronunciations' then candidate->'pronunciations' when t='dictionary_examples' then candidate->'examples' when t='dictionary_lexical_annotations' then candidate->'annotations' else b->t end;
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
  'inflections',coalesce((select jsonb_agg(value-'updated_at') from jsonb_array_elements(coalesce(s->'detail'->'inflections','[]'))),'[]'),
  'pronunciations',coalesce((select jsonb_agg(value-'updated_at') from jsonb_array_elements(coalesce(s->'detail'->'pronunciations','[]'))),'[]'),
  'examples',coalesce((select jsonb_agg(value-'updated_at') from jsonb_array_elements(coalesce(s->'detail'->'examples','[]'))),'[]'),
  'annotations',coalesce((select jsonb_agg(value-'updated_at') from jsonb_array_elements(coalesce(s->'detail'->'lexical_annotations','[]'))),'[]'),
  'component_order',coalesce(s->'metadata'->'component_order','[]'));
end $$;

create or replace function public.dictionary_overlay_candidate(base jsonb,patch jsonb) returns jsonb language plpgsql set search_path='' as $$
declare result jsonb:=base; k text; r jsonb; rows jsonb; old jsonb;
begin
 if patch ? 'ai' then raise exception 'Unexpected AI envelope';end if;
 foreach k in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','examples','annotations','inflections','pronunciations','sense_groups'] loop
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

create or replace function public.guard_dictionary_extension_sense_delete() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.dictionary_inflections where sense_id=old.id) then raise exception 'Sense contains inflections; remove or reassign first';end if;
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
  delete from public.dictionary_inflections where entry_id=any(ids);
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

create or replace function public.apply_dictionary_import_operation(operation jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
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
 public.dictionary_etymologies,public.dictionary_learning_notes,public.dictionary_entry_groups,
 public.dictionary_sense_groups,public.dictionary_examples,public.dictionary_lexical_annotations,
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
end $$;

create function public.dictionary_normalize_snapshot(s jsonb) returns jsonb language sql immutable set search_path='' as $$
 select case when s is null then null else jsonb_set(jsonb_set(s,'{detail,inflections}',coalesce(s->'detail'->'inflections','[]'::jsonb)),'{detail,relations}',coalesce((select jsonb_agg(value order by value->>'id') from jsonb_array_elements(coalesce(s->'detail'->'relations','[]'::jsonb))),'[]'::jsonb)) end;
$$;
revoke all on function public.dictionary_normalize_snapshot(jsonb) from public,anon,authenticated;

create or replace function public.create_dictionary_review(entry_uuid uuid,expected_snapshot jsonb,patch jsonb default null,source_type text default 'manual',preview boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb; c jsonb; result jsonb; saved public.dictionary_review_drafts;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 perform pg_advisory_xact_lock(710,1);
 perform 1 from public.dictionary_entries where id=entry_uuid for update;
 s:=public.get_dictionary_ai_snapshot(entry_uuid);
 if public.dictionary_normalize_snapshot(s) is distinct from public.dictionary_normalize_snapshot(expected_snapshot) then raise exception 'Stale Published snapshot; regenerate Diff';end if;
 if s->'detail'->'entry'->>'status' is distinct from 'published' then raise exception 'Published entry required';end if;
 c:=public.dictionary_snapshot_candidate(s);
 if patch is not null then c:=public.dictionary_overlay_candidate(c,patch);end if;
 -- Exercise the real constraints, then roll back every row/audit change from validation.
 begin perform public.dictionary_materialize_review(entry_uuid,c);raise exception using errcode='ZX714';exception when sqlstate 'ZX714' then null;end;
 if preview then return jsonb_build_object('preview',true,'inserted',0,'updated',0,'skipped',0,'warnings','[]'::jsonb);end if;
 insert into public.dictionary_published_revisions(entry_id,revision,snapshot,actor_id) values(entry_uuid,(s->'detail'->'entry'->>'revision')::bigint,s,auth.uid()) on conflict do nothing;
 insert into public.dictionary_review_drafts(entry_id,base_revision,base_snapshot,candidate,created_by,updated_by,source) values(entry_uuid,(s->'detail'->'entry'->>'revision')::bigint,s,c,auth.uid(),auth.uid(),source_type) returning * into saved;
 return to_jsonb(saved);
end $$;

create or replace function public.save_dictionary_review(review_uuid uuid,expected_revision bigint,candidate jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.dictionary_review_drafts;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 perform pg_advisory_xact_lock(710,1);
 select * into r from public.dictionary_review_drafts where id=review_uuid for update;
 if not found or r.state<>'active' or r.revision<>expected_revision then raise exception 'Review revision conflict';end if;
 perform 1 from public.dictionary_entries where id=r.entry_id for update;
 if public.dictionary_normalize_snapshot(public.get_dictionary_ai_snapshot(r.entry_id)) is distinct from public.dictionary_normalize_snapshot(r.base_snapshot) then raise exception 'Stale Review Draft';end if;
 begin perform public.dictionary_materialize_review(r.entry_id,candidate);raise exception using errcode='ZX714';exception when sqlstate 'ZX714' then null;end;
 update public.dictionary_review_drafts set candidate=save_dictionary_review.candidate,revision=revision+1,updated_at=now(),updated_by=auth.uid() where id=review_uuid returning * into r;
 return to_jsonb(r);
end $$;

create or replace function public.approve_dictionary_review(review_uuid uuid,expected_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.dictionary_review_drafts; s jsonb; next_snapshot jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 perform pg_advisory_xact_lock(710,1);
 select * into r from public.dictionary_review_drafts where id=review_uuid for update;
 if not found or r.revision<>expected_revision then raise exception 'Review revision conflict';end if;
 if r.state='approved' then return to_jsonb(r);end if;
 if r.state<>'active' then raise exception 'Review not active';end if;
 perform 1 from public.dictionary_entries where id=r.entry_id for update;
 s:=public.get_dictionary_ai_snapshot(r.entry_id);
 if public.dictionary_normalize_snapshot(s) is distinct from public.dictionary_normalize_snapshot(r.base_snapshot) or (s->'detail'->'entry'->>'revision')::bigint<>r.base_revision then raise exception 'Stale Review Draft; Published changed';end if;
 insert into public.dictionary_published_revisions(entry_id,revision,snapshot,actor_id) values(r.entry_id,r.base_revision,s,auth.uid()) on conflict do nothing;
 perform public.dictionary_materialize_review(r.entry_id,r.candidate);
 next_snapshot:=public.get_dictionary_ai_snapshot(r.entry_id);
 insert into public.dictionary_published_revisions(entry_id,revision,snapshot,actor_id) values(r.entry_id,(next_snapshot->'detail'->'entry'->>'revision')::bigint,next_snapshot,auth.uid());
 update public.dictionary_review_drafts set state='approved',approved_revision=(next_snapshot->'detail'->'entry'->>'revision')::bigint,updated_at=now(),updated_by=auth.uid() where id=review_uuid returning * into r;
 return to_jsonb(r);
end $$;

-- Atomic first editor save: no empty drafts, no duplicate races, exact candidate including removals.
create function public.create_dictionary_edit_review(entry_uuid uuid,expected_snapshot jsonb,candidate jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 perform pg_advisory_xact_lock(710,1);
 perform 1 from public.dictionary_entries where id=entry_uuid for update;
 if exists(select 1 from public.dictionary_review_drafts where entry_id=entry_uuid and state='active') then raise exception 'Active Review Draft already exists; reload and continue existing draft';end if;
 r:=public.create_dictionary_review(entry_uuid,expected_snapshot,null,'manual',false);
 return public.save_dictionary_review((r->>'id')::uuid,(r->>'revision')::bigint,candidate);
end $$;
revoke all on function public.create_dictionary_edit_review(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.create_dictionary_edit_review(uuid,jsonb,jsonb) to authenticated;

create function public.search_dictionary_relation_targets(query_text text default '',page_number integer default 0) returns jsonb language sql stable security definer set search_path='' as $$
 with matches as (
  select e.id,e.headword,e.kind,coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'gloss_zh_tw',s.gloss_zh_tw,'part_of_speech',s.part_of_speech) order by s.id) from public.dictionary_senses s where s.entry_id=e.id),'[]') senses
  from public.dictionary_entries e where public.is_dictionary_admin() and e.status='published'
   and (strpos(lower(e.headword),lower(btrim(query_text)))>0 or exists(select 1 from public.dictionary_senses s where s.entry_id=e.id and strpos(lower(s.gloss_zh_tw),lower(btrim(query_text)))>0))
  order by e.headword,e.id limit 21 offset greatest(page_number,0)*20
 ) select jsonb_build_object('items',coalesce((select jsonb_agg(x) from (select * from matches limit 20) x),'[]'),'has_more',(select count(*)>20 from matches));
$$;
revoke all on function public.search_dictionary_relation_targets(text,integer) from public,anon;
grant execute on function public.search_dictionary_relation_targets(text,integer) to authenticated;

-- Exact, indexed form matches plus original spelling / gloss hits; never force redirect or swallow homographs.
create function public.search_dictionary_with_inflections(category text default 'all',query_text text default '',page_number integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if category is null or category not in ('all','word','prefix','root') or query_text is null or length(query_text)>120 or page_number is null or page_number<0 then raise exception 'Invalid dictionary search';end if;
 return (with matches as (
  select e.id,e.kind,e.headword,coalesce((select jsonb_agg(jsonb_build_object('form',i.form,'form_kind',i.form_kind,'sense_id',i.sense_id) order by i.sort_order,i.id) from public.dictionary_inflections i where i.entry_id=e.id and lower(btrim(i.form))=lower(btrim(query_text))),'[]') inflection_matches
  from public.dictionary_entries e where auth.uid() is not null and e.status='published' and (category='all' or e.kind=category)
   and (strpos(lower(e.headword),lower(btrim(query_text)))>0 or exists(select 1 from public.dictionary_senses s where s.entry_id=e.id and strpos(lower(s.gloss_zh_tw),lower(btrim(query_text)))>0) or exists(select 1 from public.dictionary_inflections i where i.entry_id=e.id and lower(btrim(i.form))=lower(btrim(query_text))))
  order by e.headword,e.id limit 21 offset greatest(page_number,0)*20
 ) select jsonb_build_object('items',coalesce((select jsonb_agg(x) from (select * from matches limit 20) x),'[]'),'has_more',(select count(*)>20 from matches),'page',greatest(page_number,0)));
end $$;
revoke all on function public.search_dictionary_with_inflections(text,text,integer) from public,anon;
grant execute on function public.search_dictionary_with_inflections(text,text,integer) to authenticated;
commit;
