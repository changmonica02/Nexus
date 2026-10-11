-- Review snapshots retain canonical identities. Only approval changes current rows.
begin;
create table public.dictionary_published_revisions (
 entry_id uuid not null references public.dictionary_entries(id),
 revision bigint not null, snapshot jsonb not null,
 recorded_at timestamptz not null default now(), actor_id uuid references auth.users(id) on delete set null,
 primary key(entry_id,revision)
);
create table public.dictionary_review_drafts (
 id uuid primary key default gen_random_uuid(), entry_id uuid not null references public.dictionary_entries(id),
 base_revision bigint not null, base_snapshot jsonb not null, candidate jsonb not null,
 revision bigint not null default 1, state text not null default 'active' check(state in ('active','approved','discarded')),
 created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), approved_revision bigint,
 source text not null check(source in ('manual','csv','ai','json','md','legacy_csv','history'))
);
create index dictionary_review_entry on public.dictionary_review_drafts(entry_id,state);
-- Private transaction capability: never a client-settable GUC or JWT claim.
create table public.dictionary_approval_capability (transaction_id bigint primary key,entry_id uuid not null);
revoke all on public.dictionary_approval_capability from public,anon,authenticated;
alter table public.dictionary_approval_capability enable row level security;
alter table public.dictionary_published_revisions enable row level security;
alter table public.dictionary_review_drafts enable row level security;
revoke all on public.dictionary_published_revisions,public.dictionary_review_drafts from public,anon,authenticated;
grant select on public.dictionary_published_revisions,public.dictionary_review_drafts to authenticated;
create policy dictionary_history_admin on public.dictionary_published_revisions for select to authenticated using(public.is_dictionary_admin());
create policy dictionary_review_admin on public.dictionary_review_drafts for select to authenticated using(public.is_dictionary_admin());
create trigger dictionary_review_audit after insert or update or delete on public.dictionary_review_drafts for each row execute function public.audit_dictionary_extension();

-- Convert a complete existing snapshot into the same persistence envelope as all adapters.
create function public.dictionary_snapshot_candidate(s jsonb) returns jsonb language plpgsql set search_path='' as $$
declare b jsonb:='{}'; k text; rows jsonb;
begin
 foreach k in array array['entries','senses','relations','etymologies','learning_notes'] loop
  if k='entries' then rows:=jsonb_build_array(s->'detail'->'entry');else rows:=coalesce(s->'detail'->k,'[]');end if;
  select coalesce(jsonb_agg(value-'status'-'published_at'-'updated_at'-'source_id'),'[]') into rows from jsonb_array_elements(rows);
  b:=b||jsonb_build_object('dictionary_'||k,rows);
 end loop;
 return jsonb_build_object('bundle',b,'group_data',s->'grouping',
  'sense_groups',coalesce((select jsonb_agg(jsonb_build_object('sense_id',key,'primary_category',value)) from jsonb_each(coalesce(s->'sense_groups','{}'))),'[]'),
  'examples',coalesce((select jsonb_agg(value-'updated_at') from jsonb_array_elements(coalesce(s->'detail'->'examples','[]'))),'[]'),
  'annotations',coalesce((select jsonb_agg(value-'updated_at') from jsonb_array_elements(coalesce(s->'detail'->'lexical_annotations','[]'))),'[]'),
  'component_order',coalesce(s->'metadata'->'component_order','[]'));
end $$;
revoke all on function public.dictionary_snapshot_candidate(jsonb) from public,anon,authenticated;

-- Overlay imports onto a full snapshot; omission never deletes imported content.
create function public.dictionary_overlay_candidate(base jsonb,patch jsonb) returns jsonb language plpgsql set search_path='' as $$
declare result jsonb:=base; k text; r jsonb; rows jsonb; old jsonb;
begin
 if patch ? 'ai' then raise exception 'Unexpected AI envelope';end if;
 foreach k in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','examples','annotations','sense_groups'] loop
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
revoke all on function public.dictionary_overlay_candidate(jsonb,jsonb) from public,anon,authenticated;

-- Called only inside an admin transaction. Intermediate rows are never committed.
create function public.dictionary_materialize_review(eid uuid,c jsonb) returns void language plpgsql security definer set search_path='' as $$
declare t text; rows jsonb; r jsonb; current_row jsonb; b jsonb; field text; nextrows jsonb; rev bigint;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if c ? 'ai' or jsonb_array_length(c->'bundle'->'dictionary_entries')<>1 or c->'bundle'->'dictionary_entries'->0->>'id' is distinct from eid::text then raise exception 'Stable entry identity required';end if;
 if c->'bundle'->'dictionary_entries'->0->>'kind' is distinct from (select kind from public.dictionary_entries where id=eid) then raise exception 'Entry kind immutable';end if;
 insert into public.dictionary_approval_capability values(txid_current(),eid);
 update public.dictionary_entries set status='draft' where id=eid and status='published';
 if not found then raise exception 'Expected current Published';end if;
 -- Remove omitted dependent content before senses. External references reject, never cascade.
 foreach t in array array['dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_senses'] loop
  rows:=coalesce(case when t='dictionary_examples' then c->'examples' when t='dictionary_lexical_annotations' then c->'annotations' else c->'bundle'->t end,'[]');
  if t in ('dictionary_examples','dictionary_lexical_annotations') then
   -- These tables already audit DELETE through their 20261013 triggers.
   execute format('delete from public.%I where entry_id=$1 and not(id in(select (value->>''id'')::uuid from jsonb_array_elements($2)))',t) using eid,rows;
  else
   execute format('with removed as (delete from public.%I where entry_id=$1 and not(id in(select (value->>''id'')::uuid from jsonb_array_elements($2))) returning *) insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,before_row) select auth.uid(),session_user,$3,id,''DELETE'',to_jsonb(removed) from removed',t) using eid,rows,t;
  end if;
 end loop;
 -- Rebase technical child revisions only after the complete base snapshot was checked.
 foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations'] loop
  field:=case when t='dictionary_examples' then 'examples' when t='dictionary_lexical_annotations' then 'annotations' else t end;
  rows:=coalesce(case when t in ('dictionary_examples','dictionary_lexical_annotations') then c->field else c->'bundle'->t end,'[]');nextrows:='[]';
  for r in select value from jsonb_array_elements(rows) loop
   execute format('select to_jsonb(x) from public.%I x where id=$1',t) into current_row using (r->>'id')::uuid;
   if t<>'dictionary_entries' and r->>'entry_id' is distinct from eid::text then raise exception 'Content ownership immutable';end if;
   if t<>'dictionary_entries' and current_row is not null and current_row->>'entry_id' is distinct from eid::text then raise exception 'Stable child ID belongs to another entry';end if;
   r:=r-'revision'-'updated_at'-'status'-'published_at';
   if current_row is not null then r:=r||jsonb_build_object('revision',current_row->'revision');end if;
   nextrows:=nextrows||jsonb_build_array(r);
  end loop;
  c:=jsonb_set(c,case when t in ('dictionary_examples','dictionary_lexical_annotations') then array[field] else array['bundle',t] end,nextrows);
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

create function public.create_dictionary_review(entry_uuid uuid,expected_snapshot jsonb,patch jsonb default null,source_type text default 'manual',preview boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb; c jsonb; result jsonb; saved public.dictionary_review_drafts;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 perform pg_advisory_xact_lock(710,1);
 perform 1 from public.dictionary_entries where id=entry_uuid for update;
 s:=public.get_dictionary_ai_snapshot(entry_uuid);
 if s is distinct from expected_snapshot then raise exception 'Stale Published snapshot; regenerate Diff';end if;
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

create function public.save_dictionary_review(review_uuid uuid,expected_revision bigint,candidate jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.dictionary_review_drafts;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 perform pg_advisory_xact_lock(710,1);
 select * into r from public.dictionary_review_drafts where id=review_uuid for update;
 if not found or r.state<>'active' or r.revision<>expected_revision then raise exception 'Review revision conflict';end if;
 perform 1 from public.dictionary_entries where id=r.entry_id for update;
 if public.get_dictionary_ai_snapshot(r.entry_id) is distinct from r.base_snapshot then raise exception 'Stale Review Draft';end if;
 begin perform public.dictionary_materialize_review(r.entry_id,candidate);raise exception using errcode='ZX714';exception when sqlstate 'ZX714' then null;end;
 update public.dictionary_review_drafts set candidate=save_dictionary_review.candidate,revision=revision+1,updated_at=now(),updated_by=auth.uid() where id=review_uuid returning * into r;
 return to_jsonb(r);
end $$;

create function public.approve_dictionary_review(review_uuid uuid,expected_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
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
 if s is distinct from r.base_snapshot or (s->'detail'->'entry'->>'revision')::bigint<>r.base_revision then raise exception 'Stale Review Draft; Published changed';end if;
 insert into public.dictionary_published_revisions(entry_id,revision,snapshot,actor_id) values(r.entry_id,r.base_revision,s,auth.uid()) on conflict do nothing;
 perform public.dictionary_materialize_review(r.entry_id,r.candidate);
 next_snapshot:=public.get_dictionary_ai_snapshot(r.entry_id);
 insert into public.dictionary_published_revisions(entry_id,revision,snapshot,actor_id) values(r.entry_id,(next_snapshot->'detail'->'entry'->>'revision')::bigint,next_snapshot,auth.uid());
 update public.dictionary_review_drafts set state='approved',approved_revision=(next_snapshot->'detail'->'entry'->>'revision')::bigint,updated_at=now(),updated_by=auth.uid() where id=review_uuid returning * into r;
 return to_jsonb(r);
end $$;

create function public.discard_dictionary_review(review_uuid uuid,expected_revision bigint) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 update public.dictionary_review_drafts set state='discarded',revision=revision+1,updated_by=auth.uid(),updated_at=now() where id=review_uuid and state='active' and revision=expected_revision;
 if not found then raise exception 'Review revision conflict';end if;
end $$;
revoke all on function public.create_dictionary_review(uuid,jsonb,jsonb,text,boolean),public.save_dictionary_review(uuid,bigint,jsonb),public.approve_dictionary_review(uuid,bigint),public.discard_dictionary_review(uuid,bigint) from public,anon;
grant execute on function public.create_dictionary_review(uuid,jsonb,jsonb,text,boolean),public.save_dictionary_review(uuid,bigint,jsonb),public.approve_dictionary_review(uuid,bigint),public.discard_dictionary_review(uuid,bigint) to authenticated;

-- Guard replacement and import routing appended below before COMMIT.

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
      if parent.kind <> 'word' or target.kind not in ('prefix','root') then raise exception 'Relations must connect word senses to prefix/root senses'; end if;
    end if;
  end if;
  return new;
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
 public.dictionary_ai_metadata in share row exclusive mode;
 current_context:=public.dictionary_import_context(observed);
 if current_context is distinct from operation->'expected_context' then
  result:=jsonb_build_object('status','stale','message','資料自預覽後已變更，請重新審核');
 else
  -- Decisions may introduce a fresh sense, but may never overwrite an unobserved stable ID.
  known:=true;
  foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations'] loop
   for r in select value from jsonb_array_elements(coalesce(case when t='dictionary_examples' then candidate->'examples' when t='dictionary_lexical_annotations' then candidate->'annotations' else candidate->'bundle'->t end,'[]')) loop
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
revoke all on function public.apply_dictionary_import_operation(jsonb) from public,anon;
grant execute on function public.apply_dictionary_import_operation(jsonb) to authenticated;

commit;
