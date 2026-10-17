-- Additive only: no existing content/revisions changed. Prerequisites: core_concept,
-- composition_shared, bulk_exchange. Rollback: remove new RPCs/index/helper only;
-- keep any manually created Entries/receipts/history. No legacy migration replay.
begin;
set local lock_timeout='5s';
set local statement_timeout='90s';
-- Named minimal-Sense contract: no POS + empty gloss. The existing parent-kind
-- guard rejects null POS for Word; thus Word's original nonempty constraint holds.
-- No existing rows are rewritten; null text remains forbidden by NOT NULL.
alter table public.dictionary_senses drop constraint dictionary_senses_gloss_zh_tw_check;
alter table public.dictionary_senses add constraint dictionary_senses_gloss_zh_tw_check check(length(btrim(gloss_zh_tw))>0 or part_of_speech is null);
create function public.dictionary_component_key(value text) returns text language sql immutable strict set search_path='' as $$
 select lower(btrim(regexp_replace(translate(value,'‐‑–—','----'),'[[:space:]]+',' ','g'),' -'))
$$;
revoke all on function public.dictionary_component_key(text) from public,anon;
grant execute on function public.dictionary_component_key(text) to authenticated;
-- Fail closed on pre-existing equivalence collisions; never merge/delete stable identities.
create unique index dictionary_component_equivalent_name on public.dictionary_entries(kind,public.dictionary_component_key(headword)) where kind in ('prefix','root');

create function public.dictionary_variant_names(value text) returns text[] language plpgsql immutable set search_path='' as $$
declare doc jsonb;
begin
 if value is null then return array[]::text[];end if;
 begin doc:=value::jsonb;exception when invalid_text_representation then return array[value];end;
 if doc->>'format'='nexus-variants-v1' and jsonb_typeof(doc->'rows')='array' then
  return coalesce((select array_agg(r->>'variant') from jsonb_array_elements(doc->'rows') r where jsonb_typeof(r->'variant')='string'),array[]::text[]);
 end if;
 return array[value];
end $$;
revoke all on function public.dictionary_variant_names(text) from public,anon,authenticated;

-- Full candidate ranking BEFORE LIMIT. Correlated child probes use existing entry_id
-- indexes; a bounded 6k dictionary scan also handles single characters/CJK reliably.
-- No trigram/fulltext language tokenizer or truncated frontend candidate list.
create or replace function public.search_dictionary_relation_targets(query_text text default '',page_number integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare q text:=lower(btrim(query_text));k text:=public.dictionary_component_key(query_text);
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if query_text is null or length(query_text)>120 or page_number is null or page_number<0 or page_number>100000 then raise exception 'Invalid relation search';end if;
 return (with candidates as (
 select e.id,e.headword,e.kind,
  case when q='' then 5
   when (case when e.kind='word' then lower(btrim(e.headword)) else public.dictionary_component_key(e.headword) end)=(case when e.kind='word' then q else k end) then 0
   when starts_with(lower(btrim(e.headword)),q) or (e.kind<>'word' and k<>'' and starts_with(public.dictionary_component_key(e.headword),k)) then 1
   when exists(select 1 from public.dictionary_entry_groups g cross join unnest(public.dictionary_variant_names(g.variant_group)) v where g.id=e.id and k<>'' and (public.dictionary_component_key(v)=k or starts_with(public.dictionary_component_key(v),k))) then 2
   when strpos(lower(e.headword),q)>0 then 3
   when exists(select 1 from public.dictionary_senses s where s.entry_id=e.id and strpos(lower(s.gloss_zh_tw),q)>0)
    or exists(select 1 from public.dictionary_etymologies h where h.entry_id=e.id and strpos(lower(h.body||' '||coalesce(h.data_source,'')),q)>0)
    or exists(select 1 from public.dictionary_learning_notes n where n.entry_id=e.id and strpos(lower(n.body),q)>0)
    or exists(select 1 from public.dictionary_examples x where x.entry_id=e.id and strpos(lower(x.body),q)>0)
    or exists(select 1 from public.dictionary_pronunciations p where p.entry_id=e.id and strpos(lower(p.ipa||' '||coalesce(p.locale,'')||' '||coalesce(p.note,'')),q)>0)
    or exists(select 1 from public.dictionary_inflections i where i.entry_id=e.id and strpos(lower(i.form),q)>0)
    or exists(select 1 from public.dictionary_entry_groups g where g.id=e.id and strpos(lower(coalesce(g.primary_category,'')||' '||array_to_string(g.tags,' ')),q)>0) then 4 else 9 end rank
 from public.dictionary_entries e where e.status='published' and e.kind in ('word','prefix','root')
 ), matched as materialized(select * from candidates where rank<9), shown as (
 select * from matched order by rank,length(headword),case kind when 'prefix' then 0 when 'root' then 1 else 2 end,lower(headword) collate "C",id limit 20 offset page_number*20
 ) select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'headword',x.headword,'kind',x.kind,'senses',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'gloss_zh_tw',s.gloss_zh_tw,'part_of_speech',s.part_of_speech) order by s.id) from public.dictionary_senses s where s.entry_id=x.id),'[]'::jsonb)) order by rank,length(headword),case kind when 'prefix' then 0 when 'root' then 1 else 2 end,lower(headword) collate "C",id) from shown x),'[]'::jsonb),'total',(select count(*) from matched),'has_more',(page_number+1)*20<(select count(*) from matched),'page',page_number));
end $$;
revoke all on function public.search_dictionary_relation_targets(text,integer) from public,anon;
grant execute on function public.search_dictionary_relation_targets(text,integer) to authenticated;

-- At most 100 first senses; no Data API row-cap risk for high-Sense entries.
create function public.dictionary_admin_first_senses(entry_ids uuid[]) returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if entry_ids is null or cardinality(entry_ids)>100 then raise exception 'Invalid summary page';end if;
 return coalesce((select jsonb_agg(to_jsonb(s)) from unnest(entry_ids) eid cross join lateral(select id,entry_id,part_of_speech,gloss_zh_tw from public.dictionary_senses where entry_id=eid order by id limit 1) s),'[]'::jsonb);
end $$;
revoke all on function public.dictionary_admin_first_senses(uuid[]) from public,anon;
grant execute on function public.dictionary_admin_first_senses(uuid[]) to authenticated;

-- Atomic, explicitly confirmed creation. Existing drafts are NEVER silently published.
-- A real empty Sense keeps all existing target FKs and blank-Sense exchange contracts.
-- Existing receipt table preserves same-device retry, audit and request identity.
create function public.quick_create_dictionary_component(operation_uuid uuid,component_kind text,component_name text,content_verified boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.dictionary_entries;sid uuid;answer jsonb;receipt public.dictionary_import_operations;request jsonb;key text:=public.dictionary_component_key(component_name);
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if content_verified is distinct from true then raise exception 'Content verification confirmation required';end if;
 if operation_uuid is null or component_kind is null or component_kind not in ('prefix','root') or key is null or key='' or length(component_name)>120 or component_name ~ '[[:cntrl:]]' then raise exception 'Invalid component name or kind';end if;
 request:=jsonb_build_object('kind',component_kind,'name',key,'action','quick_component_v1');
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||operation_uuid::text,0));
 select * into receipt from public.dictionary_import_operations where owner_id=auth.uid() and operation_id=operation_uuid;
 if found then
  if receipt.request is distinct from request then raise exception 'Operation ID reused for different request';end if;
  -- Re-read current publication, not a stale receipt snapshot.
  select * into e from public.dictionary_entries where id=(receipt.result->>'id')::uuid and status='published';
  if not found then raise exception 'Created target changed; search again';end if;
 else
  -- Also serializes with regular editor inserts: their unique index arbitrates races.
  perform pg_advisory_xact_lock(hashtextextended(component_kind||':'||key,0));
  select * into e from public.dictionary_entries where kind=component_kind and public.dictionary_component_key(headword)=key for update;
  if found then
   if e.status<>'published' then raise exception 'Matching draft exists; complete its normal publication first';end if;
  else
   begin
    insert into public.dictionary_entries(kind,headword) values(component_kind,btrim(component_name)) returning * into e;
   exception when unique_violation then
    select * into e from public.dictionary_entries where kind=component_kind and public.dictionary_component_key(headword)=key for update;
    if not found or e.status<>'published' then raise exception 'Matching entry changed or is a draft; search again';end if;
   end;
   if e.status='draft' then
    insert into public.dictionary_senses(entry_id,part_of_speech,gloss_zh_tw) values(e.id,null,'') returning id into sid;
    e:=public.publish_dictionary_entry(e.id,true);
    insert into public.dictionary_published_revisions(entry_id,revision,snapshot,actor_id) values(e.id,e.revision,public.get_dictionary_ai_snapshot(e.id),auth.uid()) on conflict do nothing;
   end if;
  end if;
 end if;
 answer:=jsonb_build_object('id',e.id,'headword',e.headword,'kind',e.kind,'senses',(select jsonb_agg(jsonb_build_object('id',s.id,'part_of_speech',s.part_of_speech,'gloss_zh_tw',s.gloss_zh_tw) order by s.id) from public.dictionary_senses s where s.entry_id=e.id));
 if answer->'senses'='null'::jsonb then raise exception 'Target has no valid Sense';end if;
 insert into public.dictionary_import_operations(owner_id,operation_id,session_id,source_type,preview_at,request,result) values(auth.uid(),operation_uuid,operation_uuid,'quick_component',now(),request,answer) on conflict(owner_id,operation_id) do nothing;
 return answer;
end $$;
revoke all on function public.quick_create_dictionary_component(uuid,text,text,boolean) from public,anon;
grant execute on function public.quick_create_dictionary_component(uuid,text,text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
