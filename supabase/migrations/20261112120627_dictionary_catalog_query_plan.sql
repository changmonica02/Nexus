-- Replace only the catalog query. No data/schema/timeout changes.
-- Match once, count stable entry identities, paginate before response enrichment.
begin;
create or replace function public.search_dictionary_catalog(scope text default 'all',query_text text default '',domain text default null,subdomain text default null,kind_filters text[] default array['prefix','root','suffix'],work_filters text[] default '{}',page_number integer default 0,admin_mode boolean default false,status_filters text[] default '{}')
returns jsonb language plpgsql stable security definer set search_path='' as $body$
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
  select s.entry_id::text entry_id,s.id,s.gloss_zh_tw,s.semantic_domain,s.semantic_subdomain,s.variants from public.dictionary_senses s where not exists(select 1 from editor_pending r where r.entry_id=s.entry_id and r.candidate is not null)
  union all select r.entry_id::text,(s->>'id')::uuid,s->>'gloss_zh_tw',s->>'semantic_domain',s->>'semantic_subdomain',s->'variants' from editor_pending r cross join lateral jsonb_array_elements(coalesce(r.candidate#>'{bundle,dictionary_senses}','[]')) s where r.candidate is not null
 ), sense_flags as (
  select entry_id,
   bool_or((domain is null or semantic_domain=domain) and (subdomain is null or semantic_subdomain=subdomain)) domain_match,
   bool_or(strpos(lower(gloss_zh_tw),lower(btrim(query_text)))>0) gloss_match,
   bool_or(variants is not null and variants<>'null') has_variants
  from sense_rows group by entry_id
 ), variant_rows as (
  select s.entry_id,s.id sid,f.ordinality ord,f.value v from sense_rows s cross join lateral jsonb_array_elements(coalesce(nullif(s.variants,'null'),'[]')) with ordinality f
  union all select e.id,null::uuid,f.ordinality,f.value from all_entries e join public.dictionary_entry_groups g on g.id::text=e.id
   cross join lateral jsonb_array_elements(public.dictionary_legacy_variant_forms(g.variant_group)) with ordinality f
   where not exists(select 1 from sense_flags s where s.entry_id=e.id and s.has_variants)
 ), variant_hits as (
  select distinct entry_id from variant_rows where btrim(query_text)<>'' and strpos(lower(v->>'form'),lower(btrim(query_text)))>0
 ), inflection_hits as (
  select distinct entry_id::text entry_id from public.dictionary_inflections where btrim(query_text)<>'' and strpos(lower(form),lower(btrim(query_text)))>0
 ), matches as (
  select e.* from all_entries e left join sense_flags sf on sf.entry_id=e.id
  left join variant_hits vh on vh.entry_id=e.id left join inflection_hits ih on ih.entry_id=e.id
  where (scope='all' or scope='word' and e.kind='word' or scope='morpheme' and e.kind=any(kind_filters))
   and (domain is null or sf.domain_match)
   and (btrim(query_text)='' or strpos(lower(e.headword),lower(btrim(query_text)))>0 or sf.gloss_match or vh.entry_id is not null or ih.entry_id is not null)
 ), filtered as (select * from matches where not admin_mode or cardinality(work_filters)=0 or work_status=any(work_filters)),
 shown as materialized (select * from filtered order by lower(headword) collate "C",id limit size offset page_number*size),
 page_senses as materialized (
  select s.*,e.headword from sense_rows s join shown e on e.id=s.entry_id
 ), summaries as (
  select entry_id,string_agg(gloss_zh_tw,'；' order by id) summary,
   jsonb_agg(id order by id) filter(where (domain is null or semantic_domain=domain) and (subdomain is null or semantic_subdomain=subdomain)
    and (btrim(query_text)='' or strpos(lower(headword),lower(btrim(query_text)))>0 or strpos(lower(gloss_zh_tw),lower(btrim(query_text)))>0
     or exists(select 1 from jsonb_array_elements(coalesce(nullif(variants,'null'),'[]')) v where strpos(lower(v->>'form'),lower(btrim(query_text)))>0))) matched_sense_ids
  from page_senses group by entry_id
 ), page_forms as (
  select distinct on (v.entry_id,v.v->>'form') v.* from variant_rows v join shown e on e.id=v.entry_id
  order by v.entry_id,v.v->>'form',v.sid nulls last,v.ord
 ), variants as (
  select entry_id,jsonb_agg(v order by sid nulls last,ord) variants from page_forms group by entry_id
 ), inflections as (
  select i.entry_id::text entry_id,jsonb_agg(jsonb_build_object('form',i.form,'form_kind',i.form_kind,'sense_id',i.sense_id) order by i.sort_order,i.id) inflection_matches
  from shown e join public.dictionary_inflections i on i.entry_id::text=e.id
  where btrim(query_text)<>'' and strpos(lower(i.form),lower(btrim(query_text)))>0 group by i.entry_id
 ), projected as (
  select e.*,coalesce(s.summary,'') summary,coalesce(v.variants,'[]') variants,coalesce(i.inflection_matches,'[]') inflection_matches,coalesce(s.matched_sense_ids,'[]') matched_sense_ids
  from shown e left join summaries s on s.entry_id=e.id left join variants v on v.entry_id=e.id left join inflections i on i.entry_id=e.id
 )
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('sense_id',s.matched_sense_ids->>0) order by lower(headword) collate "C",id) from projected s),'[]'),
 'total',(select count(*) from filtered),'has_more',(page_number+1)*size<(select count(*) from filtered),'page',page_number,
 'stats',case when admin_mode then (select jsonb_build_object('red',count(*) filter(where work_status='red'),'yellow',count(*) filter(where work_status='yellow'),'green',count(*) filter(where work_status='green')) from matches) else null end) into result;
 return result;
end $body$;
revoke all on function public.search_dictionary_catalog(text,text,text,text,text[],text[],integer,boolean,text[]) from public,anon;
grant execute on function public.search_dictionary_catalog(text,text,text,text,text[],text[],integer,boolean,text[]) to authenticated;

commit;
