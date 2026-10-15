-- Additive only. Requires the dictionary lifecycle/inflections/composition/bulk-exchange migrations.
-- Does not migrate browser Sessions or publish/rewrite any existing dictionary content.
begin;
create table public.dictionary_import_review_items (
 id uuid primary key default gen_random_uuid(), proposal_key text not null unique,
 entry_id text not null, source jsonb not null, item jsonb not null,
 revision bigint not null default 1, pending_count integer not null default 0,
 result jsonb, created_by uuid references auth.users(id) on delete set null,
 updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index dictionary_import_review_entry on public.dictionary_import_review_items(entry_id);
create index dictionary_import_review_pending on public.dictionary_import_review_items(updated_at,id) where pending_count>0 or item->>'status' in ('pending','failed','stale');
alter table public.dictionary_import_review_items enable row level security;
revoke all on public.dictionary_import_review_items from public,anon,authenticated;
grant select on public.dictionary_import_review_items to authenticated;
create policy dictionary_import_review_admin_read on public.dictionary_import_review_items for select to authenticated using(public.is_dictionary_admin());
create trigger dictionary_import_review_audit after insert or update or delete on public.dictionary_import_review_items for each row execute function public.audit_dictionary_extension();

create function public.dictionary_import_pending(i jsonb) returns integer language sql immutable set search_path='' as $$
 select count(*)::int from jsonb_array_elements(coalesce(i->'issues','[]')) x where not coalesce((x->>'applied')::boolean,false);
$$;
revoke all on function public.dictionary_import_pending(jsonb) from public,anon,authenticated;
create function public.dictionary_import_review_capabilities() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;return '{"version":1}'::jsonb;end$$;

create function public.stage_dictionary_import_reviews(proposals jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb; r public.dictionary_import_review_items; result jsonb:='[]'; k text;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if jsonb_typeof(proposals) is distinct from 'array' or jsonb_array_length(proposals)>25 then raise exception 'Expected at most 25 proposals';end if;
 for p in select value from jsonb_array_elements(proposals) loop
  if coalesce(p->>'key','')='' or jsonb_typeof(p->'item'->'draft') is distinct from 'object' or p->'item'->'draft'->>'entry_id' is null or p->'source'->>'type' is null or p->'source'->>'type' not in ('csv','legacy_csv','json','md') or jsonb_typeof(p->'item'->'issues') is distinct from 'array' then raise exception 'Invalid proposal';end if;
  if p->'source'->>'session_id' is null or p->'source'->>'preview_at' is null then raise exception 'Missing source identity';end if;
  perform (p->'source'->>'session_id')::uuid;perform (p->'source'->>'preview_at')::timestamptz;
  k:=encode(sha256(convert_to(p->>'key','UTF8')),'hex');
  insert into public.dictionary_import_review_items(proposal_key,entry_id,source,item,pending_count,created_by,updated_by)
  values(k,p->'item'->'draft'->>'entry_id',p->'source',p->'item',public.dictionary_import_pending(p->'item'),auth.uid(),auth.uid()) on conflict(proposal_key) do nothing;
  select * into r from public.dictionary_import_review_items where proposal_key=k;
  result:=result||jsonb_build_array(to_jsonb(r));
 end loop;
 return result;
end$$;

create function public.save_dictionary_import_review(review_item_id uuid,expected_revision bigint,review_item jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.dictionary_import_review_items; issue jsonb; old_issue jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 select * into r from public.dictionary_import_review_items where id=review_item_id for update;
 if not found or r.revision<>expected_revision then raise exception 'Import review revision conflict; reload';end if;
 if review_item->'original' is distinct from coalesce(r.item->'original',r.item->'draft') or review_item->'draft'->>'entry_id' is distinct from r.entry_id then raise exception 'Original proposal/identity is immutable';end if;
 for issue in select value from jsonb_array_elements(review_item->'issues') loop
  if coalesce((issue->>'applied')::boolean,false) or issue->>'selectedAction' is not null then
   select v into old_issue from jsonb_array_elements(r.item->'issues') v where v->>'id'=issue->>'id';
   if old_issue is null or (issue->>'selectedAction') is distinct from (old_issue->>'selectedAction') or issue->'existing' is distinct from old_issue->'existing' or issue->'incoming' is distinct from old_issue->'incoming' or coalesce((issue->>'applied')::boolean,false) and not coalesce((old_issue->>'applied')::boolean,false) then raise exception 'Recompare cannot invent decisions or applied outcomes';end if;
  end if;
 end loop;
 update public.dictionary_import_review_items set item=review_item,pending_count=public.dictionary_import_pending(review_item),revision=revision+1,updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
 return to_jsonb(r);
end$$;

create function public.decide_dictionary_import_review(review_item_id uuid,expected_revision bigint,issue_id text,decision text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.dictionary_import_review_items; x jsonb; issues jsonb:='[]'; matched boolean:=false; child jsonb; section text; clones jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 select * into r from public.dictionary_import_review_items where id=review_item_id for update;
 if not found or r.revision<>expected_revision then raise exception 'Import review revision conflict; reload';end if;
 for x in select value from jsonb_array_elements(r.item->'issues') loop
  if x->>'id'=issue_id then
   if coalesce((x->>'applied')::boolean,false) or not (x->'allowedActions' ? decision) then raise exception 'Decision not allowed';end if;
   matched:=true;x:=x||jsonb_build_object('selectedAction',decision);
   if decision='new_sense' and x->>'proposedSenseID' is null then x:=x||jsonb_build_object('proposedSenseID',gen_random_uuid());end if;
   if decision='new_sense' then
    clones:=coalesce(x->'proposedChildIDs','{}'::jsonb);
    foreach section in array array['inflections','pronunciations','etymologies','learning_notes','relations','examples','lexical_annotations','relation_hints'] loop
     for child in select value from jsonb_array_elements(coalesce(r.item->'draft'->section,'[]')) loop
      if child->>'sense_id'=x->'target'->>'id' and not (clones ? (child->>'id')) then clones:=clones||jsonb_build_object(child->>'id',gen_random_uuid());end if;
     end loop;
    end loop;
    x:=x||jsonb_build_object('proposedChildIDs',clones);
   end if;
  end if;issues:=issues||jsonb_build_array(x);
 end loop;
 if not matched then raise exception 'Unknown issue';end if;
 update public.dictionary_import_review_items set item=jsonb_set(item,'{issues}',issues),revision=revision+1,updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
 return to_jsonb(r);
end$$;

-- Atomic receipt + dictionary action + review outcome. A replay uses the same server-derived
-- operation UUID, even after a lost response or on a different browser. No new Stable IDs here.
create function public.apply_dictionary_import_reviews(operations jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
    lock table public.dictionary_entries,public.dictionary_senses,public.dictionary_relations,public.dictionary_etymologies,public.dictionary_learning_notes,public.dictionary_entry_groups,public.dictionary_sense_groups,public.dictionary_examples,public.dictionary_lexical_annotations,public.dictionary_pronunciations,public.dictionary_inflections,public.dictionary_ai_metadata,public.dictionary_review_drafts in share row exclusive mode;
    context:=public.dictionary_import_context(r.item->'observed');current_record:=public.dictionary_exchange_record(eid);
    if context is distinct from ((r.item->'context')-'exchange') or (r.item->'context' ? 'exchange' and (current_record->>'version') is distinct from (r.item->'context'->'exchange'->>'version')) then
     outcome:=jsonb_build_object('status','stale','message','Preview changed; recompare before applying');
    else
     -- Match the existing import authority's unobserved-child collision check, also for active Review updates.
     known:=true;
     foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations','dictionary_inflections'] loop
      for row_data in select value from jsonb_array_elements(coalesce(case when t='dictionary_inflections' then c->'inflections' when t='dictionary_pronunciations' then c->'pronunciations' when t='dictionary_examples' then c->'examples' when t='dictionary_lexical_annotations' then c->'annotations' else c->'bundle'->t end,'[]')) loop
       execute format('select to_jsonb(x) from public.%I x where id=$1',t) into existing_row using (row_data->>'id')::uuid;
       if existing_row is not null and ((t='dictionary_entries' and existing_row->>'kind' is distinct from r.item->'draft'->>'kind') or (t<>'dictionary_entries' and existing_row->>'entry_id' is distinct from r.entry_id)) then raise exception 'Identity owner/kind conflict';end if;
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
end$$;

create function public.get_dictionary_import_reviews(entry_key text default null,page_number integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 select jsonb_build_object('total',count(*),'items',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at,x.id) from (select * from public.dictionary_import_review_items where (entry_key is null or entry_id=entry_key) and (pending_count>0 or item->>'status' in ('pending','failed','stale')) order by updated_at,id limit 50 offset greatest(page_number,0)*50) x),'[]')) into result from public.dictionary_import_review_items where (entry_key is null or entry_id=entry_key) and (pending_count>0 or item->>'status' in ('pending','failed','stale'));
 return result;
end$$;

create function public.list_dictionary_admin_work(kind_filters text[] default '{}',status_filters text[] default '{}',query_text text default '',work_filter text default '',page_number integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if work_filter not in ('','red','yellow','green') then raise exception 'Invalid work filter';end if;
 with pending as (select entry_id,sum(greatest(pending_count,case when item->>'status' in ('failed','stale') then 1 else 0 end))::int n,min(item->'draft'->>'headword') headword,min(item->'draft'->>'kind') kind from public.dictionary_import_review_items where pending_count>0 or item->>'status' in ('failed','stale') group by entry_id),
 work as (
  select e.id::text id,e.kind,e.headword,e.status,e.published_at,e.revision,e.updated_at,coalesce(p.n,0) pending_count,case when p.n>0 then 'red' when e.status='draft' or exists(select 1 from public.dictionary_review_drafts d where d.entry_id=e.id and d.state='active') then 'yellow' else 'green' end work_status from public.dictionary_entries e left join pending p on p.entry_id=e.id::text
  union all select p.entry_id,p.kind,p.headword,'draft',null,0,now(),p.n,'red' from pending p where not exists(select 1 from public.dictionary_entries e where e.id::text=p.entry_id)
 ), filtered as (select * from work where (cardinality(kind_filters)=0 or kind=any(kind_filters)) and (cardinality(status_filters)=0 or status=any(status_filters)) and (query_text='' or position(lower(btrim(query_text)) in lower(headword))>0)),
 page as (select * from filtered where work_filter='' or work_status=work_filter order by headword,id limit 100 offset greatest(page_number,0)*100)
 select jsonb_build_object('total',(select count(*) from filtered where work_filter='' or work_status=work_filter),'stats',jsonb_build_object('red',(select count(*) from filtered where work_status='red'),'yellow',(select count(*) from filtered where work_status='yellow'),'green',(select count(*) from filtered where work_status='green')),'items',coalesce((select jsonb_agg(to_jsonb(page) order by headword,id) from page),'[]')) into result;
 return result;
end$$;

revoke all on function public.dictionary_import_review_capabilities(),public.stage_dictionary_import_reviews(jsonb),public.save_dictionary_import_review(uuid,bigint,jsonb),public.decide_dictionary_import_review(uuid,bigint,text,text),public.apply_dictionary_import_reviews(jsonb),public.get_dictionary_import_reviews(text,integer),public.list_dictionary_admin_work(text[],text[],text,text,integer) from public,anon;
grant execute on function public.dictionary_import_review_capabilities(),public.stage_dictionary_import_reviews(jsonb),public.save_dictionary_import_review(uuid,bigint,jsonb),public.decide_dictionary_import_review(uuid,bigint,text,text),public.apply_dictionary_import_reviews(jsonb),public.get_dictionary_import_reviews(text,integer),public.list_dictionary_admin_work(text[],text[],text,text,integer) to authenticated;
commit;
