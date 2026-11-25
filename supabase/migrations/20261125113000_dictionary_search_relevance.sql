begin;
-- Rank before LIMIT/OFFSET, and keep the same ordering when aggregating JSON.
create or replace function public.dictionary_search_rank(spelling text, query_text text)
returns integer language sql immutable set search_path='' as $$
 select case when btrim(query_text)='' then 0
 when lower(btrim(spelling))=lower(btrim(query_text)) then 0
 when starts_with(lower(btrim(spelling)),lower(btrim(query_text))) then 1
 when strpos(lower(spelling),lower(btrim(query_text)))>0 then 2
 else 3 end
$$;
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
  select s.entry_id::text entry_id,s.id,s.gloss_zh_tw,s.part_of_speech::text part_of_speech,s.semantic_domain,s.semantic_subdomain,s.variants from public.dictionary_senses s where not exists(select 1 from editor_pending r where r.entry_id=s.entry_id and r.candidate is not null)
  union all select r.entry_id::text,(s->>'id')::uuid,s->>'gloss_zh_tw',s->>'part_of_speech',s->>'semantic_domain',s->>'semantic_subdomain',s->'variants' from editor_pending r cross join lateral jsonb_array_elements(coalesce(r.candidate#>'{bundle,dictionary_senses}','[]')) s where r.candidate is not null
 ), sense_flags as (
  select entry_id,
   bool_or((domain is null or semantic_domain=domain) and (subdomain is null or semantic_subdomain=subdomain)) domain_match,
   bool_or(strpos(lower(gloss_zh_tw),lower(btrim(query_text)))>0) gloss_match,
   bool_or(variants is not null and variants<>'null') has_variants
  from sense_rows group by entry_id
 ), variant_rows as (
  select s.entry_id,s.id sid,f.ordinality ord,f.value v from sense_rows s cross join lateral jsonb_array_elements(coalesce(nullif(s.variants,'null'),'[]')) with ordinality f
 ), variant_hits as (
  select entry_id,min(public.dictionary_search_rank(v->>'form',query_text)) variant_rank from variant_rows where btrim(query_text)<>'' and strpos(lower(v->>'form'),lower(btrim(query_text)))>0 group by entry_id
 ), matches as (
  select e.*,least(public.dictionary_search_rank(e.headword,query_text),coalesce(vh.variant_rank,4)) search_rank from all_entries e left join sense_flags sf on sf.entry_id=e.id
  left join variant_hits vh on vh.entry_id=e.id
  where (scope='all' or scope='word' and e.kind='word' or scope='morpheme' and e.kind=any(kind_filters))
   and (domain is null or sf.domain_match)
   and (btrim(query_text)='' or strpos(lower(e.headword),lower(btrim(query_text)))>0 or sf.gloss_match or vh.entry_id is not null)
 ), filtered as (select * from matches where not admin_mode or cardinality(work_filters)=0 or work_status=any(work_filters)),
 shown as materialized (select * from filtered order by search_rank,lower(headword) collate "C",id limit size offset page_number*size),
 page_senses as materialized (
  select s.*,e.headword from sense_rows s join shown e on e.id=s.entry_id
 ), summaries as (
  select entry_id,(array_agg(gloss_zh_tw order by id))[1] summary,(array_agg(part_of_speech order by id))[1] part_of_speech,
   jsonb_agg(id order by id) filter(where (domain is null or semantic_domain=domain) and (subdomain is null or semantic_subdomain=subdomain)
    and (btrim(query_text)='' or strpos(lower(headword),lower(btrim(query_text)))>0 or strpos(lower(gloss_zh_tw),lower(btrim(query_text)))>0
     or exists(select 1 from jsonb_array_elements(coalesce(nullif(variants,'null'),'[]')) v where strpos(lower(v->>'form'),lower(btrim(query_text)))>0))) matched_sense_ids
  from page_senses group by entry_id
 ), page_forms as (
  select distinct on (v.entry_id,v.v->>'form') v.* from variant_rows v join shown e on e.id=v.entry_id
  order by v.entry_id,v.v->>'form',v.sid nulls last,v.ord
 ), variants as (
  select entry_id,jsonb_agg(v order by sid nulls last,ord) variants from page_forms group by entry_id
 ), projected as (
  select e.*,coalesce(s.summary,'') summary,s.part_of_speech,coalesce(v.variants,'[]') variants,coalesce(s.matched_sense_ids,'[]') matched_sense_ids
  from shown e left join summaries s on s.entry_id=e.id left join variants v on v.entry_id=e.id
 )
 select jsonb_build_object('items',coalesce((select jsonb_agg((to_jsonb(s)-'search_rank')||jsonb_build_object('sense_id',s.matched_sense_ids->>0,'gloss_zh_tw',s.summary) order by search_rank,lower(headword) collate "C",id) from projected s),'[]'),
 'total',(select count(*) from filtered),'has_more',(page_number+1)*size<(select count(*) from filtered),'page',page_number,
 'stats',case when admin_mode then (select jsonb_build_object('red',count(*) filter(where work_status='red'),'yellow',count(*) filter(where work_status='yellow'),'green',count(*) filter(where work_status='green')) from matches) else null end) into result;
 return result;
end $function$
;
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
   when strpos(lower(e.headword),q)>0 or exists(select 1 from public.dictionary_senses s cross join lateral jsonb_array_elements(coalesce(nullif(s.variants,'null'),'[]')) v where s.entry_id=e.id and strpos(lower(v->>'form'),q)>0) then 3
   when exists(select 1 from public.dictionary_senses s where s.entry_id=e.id and strpos(lower(s.gloss_zh_tw),q)>0)
    or exists(select 1 from public.dictionary_etymologies h where h.entry_id=e.id and strpos(lower(h.body||' '||coalesce(h.data_source,'')),q)>0)
    or exists(select 1 from public.dictionary_learning_notes n where n.entry_id=e.id and strpos(lower(n.body),q)>0)
    or exists(select 1 from public.dictionary_examples x where x.entry_id=e.id and strpos(lower(x.body),q)>0)
    or exists(select 1 from public.dictionary_pronunciations p where p.entry_id=e.id and strpos(lower(p.ipa),q)>0)
    or exists(select 1 from public.dictionary_senses s where s.entry_id=e.id and strpos(lower(coalesce(s.semantic_domain,'')||' '||coalesce(s.semantic_subdomain,'')),q)>0) then 4 else 9 end rank
 from public.dictionary_entries e where e.status='published' and e.kind in ('word','prefix','root','suffix')
 ), matched as materialized(select * from candidates where rank<9), shown as (
 select * from matched order by rank,length(headword),case kind when 'prefix' then 0 when 'root' then 1 else 2 end,lower(headword) collate "C",id limit 20 offset page_number*20
 ) select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'headword',x.headword,'kind',x.kind,'senses',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'gloss_zh_tw',s.gloss_zh_tw,'part_of_speech',s.part_of_speech) order by s.id) from public.dictionary_senses s where s.entry_id=x.id),'[]'::jsonb)) order by rank,length(headword),case kind when 'prefix' then 0 when 'root' then 1 else 2 end,lower(headword) collate "C",id) from shown x),'[]'::jsonb),'total',(select count(*) from matched),'has_more',(page_number+1)*20<(select count(*) from matched),'page',page_number));
end $function$
;

-- Legacy public search used by study and manual card links uses the same catalog.
create or replace function public.search_published_dictionary(category text default 'word', query_text text default '', page_number integer default 0)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if category is null or category not in ('all','word','prefix','root','suffix') then raise exception 'Invalid category'; end if;
 return public.search_dictionary_catalog(case when category in ('all','word') then category else 'morpheme' end,query_text,null,null,case when category in ('all','word') then array['prefix','root','suffix'] else array[category] end,'{}',page_number,false,'{}');
end $$;
notify pgrst,'reload schema';
commit;
