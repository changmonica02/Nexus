-- #44 additive RPCs. Apply ONLY after approval, after existing dictionary migrations through
-- 20261021 (production ledger uses 20261013041717/20261013060430/20261013072108).
-- No source data rewrite/delete, no direct publication, no new competing import pipeline.
begin;
do $$begin
 if to_regprocedure('public.apply_dictionary_import_operation(jsonb)') is null
 or to_regprocedure('public.publish_dictionary_bulk(text[],text,text,boolean)') is null
 or to_regclass('public.dictionary_inflections') is null then raise exception 'Dictionary #41/#42 prerequisites missing';end if;
end$$;
create function public.dictionary_exchange_record(eid uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s jsonb; reviews jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 s:=public.get_dictionary_ai_snapshot(eid);if s is null then return null;end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]') into reviews from public.dictionary_review_drafts r where entry_id=eid and state='active';
 return jsonb_build_object('snapshot',s,'reviews',reviews,'version',md5(jsonb_build_array(s,reviews)::text));
end$$;
revoke all on function public.dictionary_exchange_record(uuid) from public,anon,authenticated;

create function public.export_dictionary_exchange_page(kind_filters text[] default '{}',status_filters text[] default '{}',query_text text default '',after_id uuid default null,expected_scope text default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ids uuid[]; total integer; stamp text; result jsonb; cursor uuid;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if exists(select 1 from unnest(kind_filters) k where k not in ('word','prefix','root') or k is null)
 or exists(select 1 from unnest(status_filters) s where s not in ('draft','published') or s is null) then raise exception 'Invalid exchange scope';end if;
 select count(*),md5(coalesce(jsonb_agg(jsonb_build_array(id,revision,status) order by id),'[]')::text)
 into total,stamp from public.dictionary_entries where (cardinality(kind_filters)=0 or kind=any(kind_filters))
 and (cardinality(status_filters)=0 or status=any(status_filters)) and position(lower(btrim(coalesce(query_text,''))) in lower(headword))>0;
 if expected_scope is not null and expected_scope<>stamp then raise exception 'Export scope changed; restart export';end if;
 select array_agg(id order by id) into ids from (select id from public.dictionary_entries
 where (cardinality(kind_filters)=0 or kind=any(kind_filters)) and (cardinality(status_filters)=0 or status=any(status_filters))
 and position(lower(btrim(coalesce(query_text,''))) in lower(headword))>0 and (after_id is null or id>after_id) order by id limit 100) p;
 select coalesce(jsonb_agg(public.dictionary_exchange_record(id) order by id),'[]'),max(id::text)::uuid into result,cursor from unnest(ids) id;
 return jsonb_build_object('records',result,'total',total,'scope_version',stamp,'cursor',cursor,'has_more',exists(select 1 from public.dictionary_entries where id>cursor
 and (cardinality(kind_filters)=0 or kind=any(kind_filters)) and (cardinality(status_filters)=0 or status=any(status_filters)) and position(lower(btrim(coalesce(query_text,''))) in lower(headword))>0));
end$$;
revoke all on function public.export_dictionary_exchange_page(text[],text[],text,uuid,text) from public,anon;
grant execute on function public.export_dictionary_exchange_page(text[],text[],text,uuid,text) to authenticated;

create function public.inspect_dictionary_exchange(drafts jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d jsonb; c jsonb; record jsonb; result jsonb:='[]'; targets jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if jsonb_typeof(drafts) is distinct from 'array' or jsonb_array_length(drafts)>25 then raise exception 'Expected at most 25 drafts';end if;
 for d in select value from jsonb_array_elements(drafts) loop
  c:=public.dictionary_import_context(d);record:=public.dictionary_exchange_record((d->'bundle'->'dictionary_entries'->0->>'id')::uuid);
  select coalesce(jsonb_agg(jsonb_build_object('entry_id',s.entry_id,'sense_id',s.id)),'[]') into targets from public.dictionary_senses s
  where exists(select 1 from jsonb_array_elements(coalesce(d->'bundle'->'dictionary_relations','[]')) r where r->>'target_entry_id'=s.entry_id::text and r->>'target_sense_id'=s.id::text);
  result:=result||jsonb_build_array(c||jsonb_build_object('exchange',jsonb_build_object('version',record->'version','reviews',coalesce(record->'reviews','[]'),'targets',targets)));
 end loop;
 return result;
end$$;
revoke all on function public.inspect_dictionary_exchange(jsonb) from public,anon;
grant execute on function public.inspect_dictionary_exchange(jsonb) to authenticated;

-- Each item delegates to the existing receipt/revision/Draft/Review authority, in its own
-- subtransaction. A lost response can replay the same operation UUID, never mint new IDs.
create function public.apply_dictionary_import_batch(operations jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare op jsonb; result jsonb; results jsonb:='[]'; existing public.dictionary_import_operations; current_record jsonb; eid uuid; has_receipt boolean;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if jsonb_typeof(operations) is distinct from 'array' or jsonb_array_length(operations)>25 then raise exception 'Expected at most 25 operations';end if;
 perform pg_advisory_xact_lock(710,1);
 for op in select value from jsonb_array_elements(operations) loop
  begin
   if op->>'owner_id' is distinct from auth.uid()::text then raise exception 'Import owner mismatch';end if;
   select * into existing from public.dictionary_import_operations where owner_id=auth.uid() and operation_id=(op->>'operation_id')::uuid;
   has_receipt:=found;
   eid:=(op->'candidate'->'bundle'->'dictionary_entries'->0->>'id')::uuid;
   if not has_receipt and op->>'effect'='review' and exists(select 1 from public.dictionary_review_drafts where entry_id=eid and state='active') then
    result:=jsonb_build_object('status','stale','message','Active Review already exists; edit it in the existing editor');
   elsif not has_receipt and op ? 'exchange_version' then
    current_record:=public.dictionary_exchange_record(eid);
    if (op->>'exchange_version') is distinct from (current_record->>'version') then
     result:=jsonb_build_object('status','stale','message','Exchange version or Review changed; preview again');
    elsif op->>'effect'='review' and jsonb_array_length(coalesce(current_record->'reviews','[]'))>0 then
     result:=jsonb_build_object('status','stale','message','Active Review already exists; edit it in the existing editor');
    else result:=public.apply_dictionary_import_operation(op);end if;
   else result:=public.apply_dictionary_import_operation(op);end if;
  exception when others then result:=jsonb_build_object('status','failed','message',sqlerrm);
  end;
  results:=results||jsonb_build_array(jsonb_build_object('operation_id',op->>'operation_id')||result);
 end loop;
 return results;
end$$;
revoke all on function public.apply_dictionary_import_batch(jsonb) from public,anon;
grant execute on function public.apply_dictionary_import_batch(jsonb) to authenticated;
create function public.dictionary_bulk_publish_report(preview_id uuid,page_number integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare plan jsonb; items jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if page_number<0 then raise exception 'Invalid report page';end if;
 select p.plan into plan from public.dictionary_bulk_publish_previews p where p.id=preview_id and p.actor_id=auth.uid();
 if plan is null then raise exception 'Publication report not found or expired';end if;
 select coalesce(jsonb_agg(n),'[]') into items from (select value n from jsonb_array_elements(plan) offset page_number*200 limit 200) p;
 return jsonb_build_object('items',items,'total',jsonb_array_length(plan));
end$$;
revoke all on function public.dictionary_bulk_publish_report(uuid,integer) from public,anon;
grant execute on function public.dictionary_bulk_publish_report(uuid,integer) to authenticated;
commit;
