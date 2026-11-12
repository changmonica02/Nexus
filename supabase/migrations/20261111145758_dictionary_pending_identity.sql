-- Fix list identity/counting only. No content, Review or published data changes.
begin;
do $$
begin
 if to_regprocedure('public.search_prefix_dictionary(text,integer,text)') is null or
    to_regprocedure('public.list_dictionary_admin_work(text[],text[],text,text,integer)') is null or
    to_regprocedure('public.dictionary_transfer_pending(jsonb,integer)') is null then raise exception 'Missing dictionary list contract';end if;
 if pg_get_function_result('public.search_prefix_dictionary(text,integer,text)'::regprocedure)<>'jsonb' or
    pg_get_function_result('public.list_dictionary_admin_work(text[],text[],text,text,integer)'::regprocedure)<>'jsonb' then raise exception 'Unexpected dictionary list contract';end if;
end $$;
create or replace function public.search_prefix_dictionary(query_text text default '',page_number integer default 0,primary_category_filter text default '__ungrouped__')
returns jsonb language plpgsql stable set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if page_number is null or page_number<0 or page_number>100000 then raise exception 'Invalid page';end if;
 if query_text is null or length(query_text)>120 then raise exception 'Invalid query';end if;
 if primary_category_filter is null or primary_category_filter not in ('__ungrouped__','性質、評價與否定','位置、方向與關係','數值、量與程度','作用與變化') then raise exception 'Invalid prefix group';end if;
 with sense_matches as (
  select e.id,e.kind,e.headword,s.id sense_id,s.gloss_zh_tw,g.primary_category
  from public.dictionary_entries e join public.dictionary_senses s on s.entry_id=e.id
  left join public.dictionary_sense_groups g on g.sense_id=s.id
  where e.kind='prefix' and e.status='published' and strpos(lower(e.headword),lower(btrim(query_text)))>0
   and case when primary_category_filter='__ungrouped__' then g.primary_category is null else g.primary_category=primary_category_filter end
 ), matches as (
  select id,kind,headword,(array_agg(sense_id order by sense_id))[1] sense_id,
   array_agg(sense_id order by sense_id) matched_sense_ids,string_agg(gloss_zh_tw,'；' order by sense_id) gloss_zh_tw,min(primary_category) primary_category
  from sense_matches group by id,kind,headword
 ), page_rows as (select * from matches order by headword,id limit 21 offset page_number*20),shown as (select * from page_rows order by headword,id limit 20)
 select jsonb_build_object('items',coalesce((select jsonb_agg(s order by headword,id) from shown s),'[]'::jsonb),'has_more',(select count(*)>20 from page_rows),'page',page_number,'total',(select count(*) from matches)) into result;
 return result;
end $$;

create or replace function public.list_dictionary_admin_work(kind_filters text[] default '{}',status_filters text[] default '{}',query_text text default '',work_filter text default '',page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if work_filter not in ('','red','yellow','green') then raise exception 'Invalid work filter';end if;
 with pending as (
  select entry_id,sum(greatest(pending_count,case when item->>'status' in ('failed','stale') then 1 else 0 end))::int n,min(item->'draft'->>'headword') headword,min(item->'draft'->>'kind') kind
  from public.dictionary_import_review_items where public.dictionary_transfer_pending(item,pending_count) group by entry_id
 ), editor_pending as (
  select entry_id,count(*)::int n from public.dictionary_review_drafts where state='active' group by entry_id
 ), work as (
  select e.id::text id,e.kind,e.headword,e.status,e.published_at,e.revision,e.updated_at,
   coalesce(p.n,0)+coalesce(d.n,0) pending_count,coalesce(p.n,0) import_pending_count,coalesce(d.n,0) editor_pending_count,
   case when p.n>0 or d.n>0 then 'red' when e.status='draft' then 'yellow' else 'green' end work_status
  from public.dictionary_entries e left join pending p on p.entry_id=e.id::text left join editor_pending d on d.entry_id=e.id
  union all select p.entry_id,p.kind,p.headword,'draft',null,0,now(),p.n,p.n,0,'red' from pending p where not exists(select 1 from public.dictionary_entries e where e.id::text=p.entry_id)
 ), filtered as (
  select * from work where (cardinality(kind_filters)=0 or kind=any(kind_filters)) and (cardinality(status_filters)=0 or status=any(status_filters)) and (query_text='' or position(lower(btrim(query_text)) in lower(headword))>0)
 ), page as (
  select * from filtered where work_filter='' or work_status=work_filter order by headword,id limit 100 offset greatest(page_number,0)*100
 ) select jsonb_build_object('total',(select count(*) from filtered where work_filter='' or work_status=work_filter),
  'stats',jsonb_build_object('red',(select count(*) from filtered where work_status='red'),'yellow',(select count(*) from filtered where work_status='yellow'),'green',(select count(*) from filtered where work_status='green')),
  'items',coalesce((select jsonb_agg(to_jsonb(page) order by headword,id) from page),'[]')) into result;
 return result;
end $$;
commit;
