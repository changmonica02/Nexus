-- Sense-scoped morphology. No data conversion, publication, or ID rewriting.
-- Apply only after isolated validation and separate production authorization.
begin;
alter table public.dictionary_senses add column if not exists semantic_domain text;
alter table public.dictionary_senses add column if not exists semantic_subdomain text;
alter table public.dictionary_senses add column if not exists variants jsonb;
create or replace function public.dictionary_valid_morpheme_sense(domain text, subdomain text, forms jsonb)
returns boolean language plpgsql immutable set search_path='' as $body$
declare categories jsonb:= '{"action":["movement","force","cutting","joining","holding"],"space_time":["orientation","distance","position","time","sequence"],"nature":["celestial","geography","elements","flora_fauna"],"life_body":["body","physiology","senses","life_activity"],"language_mind":["speech","cognition","memory","emotion","will"],"society_culture":["interpersonal","law","politics","culture","religion"],"life_work":["housing","food","clothing","manufacturing","trade"],"states_properties":["size","quantity","degree","quality","existence"],"grammar_affixes":["negation","reversal","repetition","derivation"]}'::jsonb; r jsonb; seen text[]:='{}';
begin
 if domain is null then if subdomain is not null then return false;end if;
 elsif not categories ? domain or (subdomain is not null and not(categories->domain ? subdomain)) then return false;end if;
 if forms is null or forms='null'::jsonb then return true;end if;
 if jsonb_typeof(forms)<>'array' then return false;end if;
 for r in select value from jsonb_array_elements(forms) loop
  if jsonb_typeof(r)<>'object' or exists(select 1 from jsonb_object_keys(r) k where k not in ('id','form','condition'))
   or jsonb_typeof(r->'id') is distinct from 'string' or (r->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   or lower(r->>'id')=any(seen) or jsonb_typeof(r->'form') is distinct from 'string' or btrim(r->>'form')=''
   or jsonb_typeof(r->'condition') is distinct from 'string' then return false;end if;
  seen:=array_append(seen,lower(r->>'id'));
 end loop;return true;
end $body$;
revoke all on function public.dictionary_valid_morpheme_sense(text,text,jsonb) from public,anon;
grant execute on function public.dictionary_valid_morpheme_sense(text,text,jsonb) to authenticated;
alter table public.dictionary_senses drop constraint if exists dictionary_morpheme_sense_valid;
alter table public.dictionary_senses add constraint dictionary_morpheme_sense_valid check(public.dictionary_valid_morpheme_sense(semantic_domain,semantic_subdomain,variants));
alter table public.dictionary_entries drop constraint dictionary_entries_kind_check;
alter table public.dictionary_entries add constraint dictionary_entries_kind_check check(kind in ('word','prefix','root','suffix'));
-- Independent component identities may have the same spelling even after reclassification.
-- Existing ID/owner/CAS and import homograph checks remain authoritative.
drop index public.dictionary_component_equivalent_name;
drop index public.dictionary_entries_unique_kind_headword;
create unique index dictionary_words_unique_headword on public.dictionary_entries(lower(btrim(headword))) where kind='word';
create index dictionary_components_lookup on public.dictionary_entries(kind,public.dictionary_component_key(headword)) where kind<>'word';
create or replace function public.dictionary_normalize_morpheme_senses(s jsonb) returns jsonb
language plpgsql immutable set search_path='' as $body$
declare result jsonb; k text; v jsonb;
begin
 if jsonb_typeof(s)='array' then return coalesce((select jsonb_agg(public.dictionary_normalize_morpheme_senses(value) order by ordinality) from jsonb_array_elements(s) with ordinality),'[]');end if;
 if jsonb_typeof(s) is distinct from 'object' then return s;end if;
 result:='{}';
 for k,v in select * from jsonb_each(s) loop
  if s ? 'id' and s ? 'gloss_zh_tw' and k in ('semantic_domain','semantic_subdomain','variants') and v='null'::jsonb then continue;end if;
  result:=result||jsonb_build_object(k,public.dictionary_normalize_morpheme_senses(v));
 end loop;return result;
end $body$;
revoke all on function public.dictionary_normalize_morpheme_senses(jsonb) from public,anon,authenticated;
-- Retired/older clients may omit additive sense fields; omissions and variants:null
-- cannot erase newer fields. Explicit variants:[] and semantic nulls remain real edits.
create or replace function public.dictionary_merge_morpheme_candidate(base jsonb,incoming jsonb) returns jsonb
language plpgsql immutable set search_path='' as $body$
declare rows jsonb:='[]';r jsonb;old jsonb;k text;
begin
 if incoming#>'{bundle,dictionary_senses}' is null then return incoming;end if;
 for r in select value from jsonb_array_elements(incoming#>'{bundle,dictionary_senses}') loop
  select value into old from jsonb_array_elements(coalesce(base#>'{bundle,dictionary_senses}','[]')) x where x->>'id'=r->>'id';
  foreach k in array array['semantic_domain','semantic_subdomain','variants'] loop
   if (not r ? k or k='variants' and r->k='null') and old ? k then r:=jsonb_set(r,array[k],old->k);end if;
  end loop;
  rows:=rows||jsonb_build_array(r);
 end loop;
 return jsonb_set(incoming,'{bundle,dictionary_senses}',rows);
end $body$;
revoke all on function public.dictionary_merge_morpheme_candidate(jsonb,jsonb) from public,anon,authenticated;
-- Wrap the installed normalization expression, retaining verification/core/IPA/segments logic.
do $patch$
declare body text; d text; original text; f record;
begin
 select prosrc into strict body from pg_proc where oid='public.dictionary_normalize_snapshot(jsonb)'::regprocedure;
 if position('dictionary_without_verification' in body)=0 or position('dictionary_core_content' in body)=0 or position('dictionary_clean_ipa_snapshot' in body)=0 then raise exception 'Unexpected installed snapshot normalization';end if;
 body:=regexp_replace(btrim(body),';[[:space:]]*$','');
 execute 'create or replace function public.dictionary_normalize_snapshot(s jsonb) returns jsonb language sql immutable set search_path='''' as '||quote_literal('select public.dictionary_normalize_morpheme_senses(('||body||'));');
 select pg_get_functiondef('public.apply_dictionary_bundle(jsonb,boolean,boolean)'::regprocedure) into d;
 original:=d;
 d:=replace(d,'array[''id'',''entry_id'',''part_of_speech'',''gloss_zh_tw'',''revision'']','array[''id'',''entry_id'',''part_of_speech'',''gloss_zh_tw'',''revision'',''semantic_domain'',''semantic_subdomain'',''variants'']');
 d:=replace(d,'incoming := row_data - ''revision'';', 'if t=''dictionary_senses'' and row_data->''variants''=''null'' then row_data:=row_data-''variants'';end if; incoming := row_data - ''revision'';');
 d:=replace(d,'if existing @> incoming and', 'if existing @> incoming and (t<>''dictionary_senses'' or not(incoming ? ''variants'') or existing->''variants'' is not distinct from incoming->''variants'') and');
 if d=original or position('''semantic_domain'',''semantic_subdomain'',''variants''' in d)=0 then raise exception 'Unexpected installed bundle contract';end if;execute d;
 for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and (p.proname like '%dictionary%' or p.proname='get_published_dictionary_entry') loop
  select pg_get_functiondef(f.oid) into d;original:=d;
  -- Extend existing type filters; never remove a permission, status or revision predicate.
  d:=replace(d,'(''word'',''prefix'',''root'')','(''word'',''prefix'',''root'',''suffix'')');
  d:=replace(d,'(''prefix'',''root'')','(''prefix'',''root'',''suffix'')');
  d:=replace(d,'ARRAY[''word''::text, ''prefix''::text, ''root''::text]','ARRAY[''word''::text, ''prefix''::text, ''root''::text, ''suffix''::text]');
  d:=replace(d,'array[''word'',''prefix'',''root'']','array[''word'',''prefix'',''root'',''suffix'']');
  if f.proname='dictionary_guard_change' then
   if position('if new.kind <> old.kind then raise exception ''Entry kind is immutable''' in d)=0 then raise exception 'Unexpected kind guard';end if;
   d:=replace(d,'if new.kind <> old.kind then', 'if new.kind <> old.kind and (new.kind=''word'' or old.kind=''word'') then');
  elsif f.proname='dictionary_materialize_review' then
   d:=replace(d,'if c->''bundle''->''dictionary_entries''->0->>''kind'' is distinct from (select kind from public.dictionary_entries where id=eid) then', 'if (c->''bundle''->''dictionary_entries''->0->>''kind''=''word'') is distinct from (select kind=''word'' from public.dictionary_entries where id=eid) then');
  elsif f.proname='apply_dictionary_ai_change' then
   d:=replace(d,'if entry_kind is distinct from current_snapshot->''detail''->''entry''->>''kind'' then', 'if (entry_kind=''word'') is distinct from (current_snapshot->''detail''->''entry''->>''kind''=''word'') then');
  elsif f.proname='dictionary_exchange_record' then
   d:=replace(d,'md5(jsonb_build_array(s,reviews)::text)', 'md5(public.dictionary_normalize_morpheme_senses(jsonb_build_array(s,reviews))::text)');
  elsif f.proname='dictionary_exchange_scope_version' then
   d:=replace(d,'md5(to_jsonb(x)::text)', 'md5((case when to_jsonb(x) ? ''''gloss_zh_tw'''' then public.dictionary_normalize_morpheme_senses(to_jsonb(x)) else to_jsonb(x) end)::text)');
  elsif f.proname='apply_dictionary_import_reviews' then
   d:=replace(d,'(t=''dictionary_entries'' and existing_row->>''kind'' is distinct from r.item->''draft''->>''kind'')', '(t=''dictionary_entries'' and (existing_row->>''kind''=''word'') is distinct from (r.item->''draft''->>''kind''=''word''))');
  elsif f.proname='save_dictionary_review' then
   d:=replace(d,'begin perform public.dictionary_materialize_review(r.entry_id,candidate);', 'candidate:=public.dictionary_merge_morpheme_candidate(r.candidate,candidate); begin perform public.dictionary_materialize_review(r.entry_id,candidate);');
  elsif f.proname='create_dictionary_review' then
   d:=replace(d,'-- Exercise the real constraints', 'c:=public.dictionary_merge_morpheme_candidate(public.dictionary_snapshot_candidate(s),c); -- Exercise the real constraints');
  elsif f.proname='apply_dictionary_drafts' then
   d:=replace(d,'elsif b->''dictionary_entries''->0->>''kind''=''root'' and g is not null', 'elsif b->''dictionary_entries''->0->>''kind'' in (''root'',''suffix'') and g is not null');
   d:=replace(d,'g:=d->''group_data'';', 'g:=d->''group_data''; if b->''dictionary_entries''->0->>''kind''=''prefix'' and g ? ''primary_category'' and g->>''primary_category'' is distinct from (select primary_category from public.dictionary_entry_groups where id=eid) then raise exception ''Legacy entry category is retained; use semantic_domain for new classification'';end if; if b->''dictionary_entries''->0->>''kind''<>''prefix'' and exists(select 1 from jsonb_array_elements(coalesce(d->''sense_groups'',''[]'')) x left join public.dictionary_sense_groups old on old.sense_id=(x->>''sense_id'')::uuid where x->>''primary_category'' is distinct from old.primary_category) then raise exception ''Legacy sense categories are retained; use semantic_domain for new classification'';end if;');
  elsif f.proname='quick_create_dictionary_component' then
   d:=replace(d,'begin
 if not public.is_dictionary_admin()', 'begin
 perform pg_advisory_xact_lock(710,1);
 if not public.is_dictionary_admin()');
   d:=replace(d,'select * into e from public.dictionary_entries where kind=component_kind and public.dictionary_component_key(headword)=key for update;',
    'if (select count(*) from public.dictionary_entries where kind=component_kind and public.dictionary_component_key(headword)=key)>1 then raise exception ''Ambiguous component identity; select an explicit entry ID'';end if; select * into e from public.dictionary_entries where kind=component_kind and public.dictionary_component_key(headword)=key for update;');
  elsif f.proname='get_published_dictionary_entry' then
   d:=replace(d,'select id,entry_id,part_of_speech,gloss_zh_tw from public.dictionary_senses','select id,entry_id,part_of_speech,gloss_zh_tw,semantic_domain,semantic_subdomain,variants from public.dictionary_senses');
  end if;
  if d<>original then execute d;end if;
 end loop;
end $patch$;
create or replace function public.dictionary_legacy_variant_forms(raw text) returns jsonb
language plpgsql immutable set search_path='' as $body$
declare value jsonb;
begin
 if raw is null then return '[]';end if;
 begin value:=raw::jsonb;exception when invalid_text_representation then return '[]';end;
 if value->>'format' is distinct from 'nexus-variants-v1' or jsonb_typeof(value->'rows') is distinct from 'array' then return '[]';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('form',r->>'variant','legacy',true) order by ordinality) from jsonb_array_elements(value->'rows') with ordinality x(r,ordinality) where jsonb_typeof(r->'variant')='string' and btrim(r->>'variant')<>''),'[]');
end $body$;
revoke all on function public.dictionary_legacy_variant_forms(text) from public,anon,authenticated;
-- One derived catalog for reader/admin navigation. Original tables and review authority remain unchanged.
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
 ), variant_rows as (
  select s.entry_id,s.id sid,f.ordinality ord,f.value v from sense_rows s cross join lateral jsonb_array_elements(coalesce(nullif(s.variants,'null'),'[]')) with ordinality f
  union all select e.id,null::uuid,f.ordinality,f.value from all_entries e join public.dictionary_entry_groups g on g.id::text=e.id
   cross join lateral jsonb_array_elements(public.dictionary_legacy_variant_forms(g.variant_group)) with ordinality f
   where not exists(select 1 from sense_rows s where s.entry_id=e.id and s.variants is not null and s.variants<>'null')
 ), matches as (
  select e.*,
   coalesce((select string_agg(s.gloss_zh_tw,'；' order by s.id) from sense_rows s where s.entry_id=e.id),'') summary,
   coalesce((select jsonb_agg(v order by sid nulls last,ord) from (select distinct on (v->>'form') * from variant_rows where entry_id=e.id order by v->>'form',sid nulls last,ord) forms),'[]') variants,
   coalesce((select jsonb_agg(jsonb_build_object('form',i.form,'form_kind',i.form_kind,'sense_id',i.sense_id) order by i.sort_order,i.id) from public.dictionary_inflections i where i.entry_id::text=e.id and btrim(query_text)<>'' and strpos(lower(i.form),lower(btrim(query_text)))>0),'[]') inflection_matches,
   coalesce((select jsonb_agg(s.id order by s.id) from sense_rows s where s.entry_id=e.id and (domain is null or s.semantic_domain=domain) and (subdomain is null or s.semantic_subdomain=subdomain)
     and (btrim(query_text)='' or strpos(lower(e.headword),lower(btrim(query_text)))>0 or strpos(lower(s.gloss_zh_tw),lower(btrim(query_text)))>0 or exists(select 1 from jsonb_array_elements(coalesce(nullif(s.variants,'null'),'[]')) v where strpos(lower(v->>'form'),lower(btrim(query_text)))>0))),'[]') matched_sense_ids
  from all_entries e where (scope='all' or scope='word' and e.kind='word' or scope='morpheme' and e.kind=any(kind_filters))
   and (domain is null or exists(select 1 from sense_rows s where s.entry_id=e.id and s.semantic_domain=domain and (subdomain is null or s.semantic_subdomain=subdomain)))
   and (btrim(query_text)='' or strpos(lower(e.headword),lower(btrim(query_text)))>0 or exists(select 1 from variant_rows v where v.entry_id=e.id and strpos(lower(v.v->>'form'),lower(btrim(query_text)))>0) or exists(select 1 from sense_rows s where s.entry_id=e.id and strpos(lower(s.gloss_zh_tw),lower(btrim(query_text)))>0) or exists(select 1 from public.dictionary_inflections i where i.entry_id::text=e.id and strpos(lower(i.form),lower(btrim(query_text)))>0))
 ), filtered as (select * from matches where not admin_mode or cardinality(work_filters)=0 or work_status=any(work_filters)),
 shown as (select * from filtered order by lower(headword) collate "C",id limit size offset page_number*size)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('sense_id',s.matched_sense_ids->>0) order by lower(headword) collate "C",id) from shown s),'[]'),
 'total',(select count(*) from filtered),'has_more',(page_number+1)*size<(select count(*) from filtered),'page',page_number,
 'stats',case when admin_mode then (select jsonb_build_object('red',count(*) filter(where work_status='red'),'yellow',count(*) filter(where work_status='yellow'),'green',count(*) filter(where work_status='green')) from matches) else null end) into result;
 return result;
end $body$;
revoke all on function public.search_dictionary_catalog(text,text,text,text,text[],text[],integer,boolean,text[]) from public,anon;
grant execute on function public.search_dictionary_catalog(text,text,text,text,text[],text[],integer,boolean,text[]) to authenticated;
create or replace function public.dictionary_morpheme_capabilities() returns jsonb language sql stable set search_path='' as $body$
 select case when auth.uid() is not null then jsonb_build_object('version',1,'sense_variants',true,'catalog',true) else null end;
$body$;
revoke all on function public.dictionary_morpheme_capabilities() from public,anon;
grant execute on function public.dictionary_morpheme_capabilities() to authenticated;

-- Conversion creates ordinary current Reviews only; canonical content is never rewritten.
create or replace function public.preview_dictionary_morpheme_conversion(page_number integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $body$
declare answer jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if page_number is null or page_number<0 or page_number>100000 then raise exception 'Invalid page';end if;
 with entries as (select e.*, (select count(*) from public.dictionary_senses s where s.entry_id=e.id) sense_count,
  exists(select 1 from public.dictionary_review_drafts r where r.entry_id=e.id and r.state='active') has_review,
  (select g.variant_group from public.dictionary_entry_groups g where g.id=e.id) legacy_variants,
  (select g.primary_category from public.dictionary_entry_groups g where g.id=e.id) legacy_category,
  exists(select 1 from public.dictionary_import_operations o where o.request->>'action'='morpheme_draft_conversion_v1' and o.request->>'entry_id'=e.id::text and o.result->>'status'='created') already_prepared
  from public.dictionary_entries e where e.kind in ('prefix','root','suffix')),
 shown as (select * from entries order by id limit 100 offset page_number*100)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(e)||jsonb_build_object('snapshot',public.get_dictionary_ai_snapshot(e.id)) order by e.id) from shown e),'[]'),
  'total',(select count(*) from entries),'has_more',(page_number+1)*100<(select count(*) from entries),'page',page_number) into answer;
 return answer;
end $body$;
revoke all on function public.preview_dictionary_morpheme_conversion(integer) from public,anon;
grant execute on function public.preview_dictionary_morpheme_conversion(integer) to authenticated;
create or replace function public.prepare_dictionary_morpheme_draft(entry_uuid uuid,expected_snapshot jsonb,operation_uuid uuid) returns jsonb
language plpgsql security definer set search_path='' as $body$
declare receipt public.dictionary_import_operations;request jsonb;s jsonb;c jsonb;review jsonb;raw text;parsed jsonb;r jsonb;forms jsonb:='[]';sid uuid;digest text;ordinal integer:=0;reason text;answer jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if entry_uuid is null or expected_snapshot is null or operation_uuid is null then raise exception 'Invalid conversion request';end if;
 perform pg_advisory_xact_lock(710,1);
 request:=jsonb_build_object('action','morpheme_draft_conversion_v1','entry_id',entry_uuid,'snapshot_hash',md5(expected_snapshot::text));
 select * into receipt from public.dictionary_import_operations where owner_id=auth.uid() and operation_id=operation_uuid;
 if found then if receipt.request is distinct from request then raise exception 'Operation ID reused for different request';end if;return receipt.result;end if;
 perform 1 from public.dictionary_entries where id=entry_uuid for update;
 s:=public.get_dictionary_ai_snapshot(entry_uuid);
 if s is null or s->'detail'->'entry'->>'kind' not in ('prefix','root','suffix') then raise exception 'Expected morpheme entry';end if;
 if public.dictionary_normalize_snapshot(s) is distinct from public.dictionary_normalize_snapshot(expected_snapshot) then raise exception 'Conversion source changed; preview again';end if;
 if s->'detail'->'entry'->>'status'='draft' then answer:=jsonb_build_object('entry_id',entry_uuid,'status','existing_draft');
 elsif exists(select 1 from public.dictionary_review_drafts where entry_id=entry_uuid and state='active') then answer:=jsonb_build_object('entry_id',entry_uuid,'status','existing_review');
 elsif exists(select 1 from public.dictionary_import_operations o where o.request->>'action'='morpheme_draft_conversion_v1' and o.request->>'entry_id'=entry_uuid::text and o.result->>'status'='created') then answer:=jsonb_build_object('entry_id',entry_uuid,'status','already_prepared');
 else
  c:=public.dictionary_snapshot_candidate(s);raw:=s->'grouping'->>'variant_group';
  if raw is not null and not exists(select 1 from jsonb_array_elements(s->'detail'->'senses') x where x->'variants' is not null and x->'variants'<>'null') then
   begin
    parsed:=raw::jsonb;
    if jsonb_typeof(parsed) is distinct from 'object' or parsed->>'format' is distinct from 'nexus-variants-v1' or jsonb_typeof(parsed->'rows') is distinct from 'array'
     or exists(select 1 from jsonb_object_keys(parsed) k where k not in ('format','rows')) then reason:='unstructured_legacy_variants';
    elsif jsonb_array_length(s->'detail'->'senses')<>1 then reason:='ambiguous_sense';
    else
     sid:=(s->'detail'->'senses'->0->>'id')::uuid;
     for r in select value from jsonb_array_elements(parsed->'rows') loop
      if jsonb_typeof(r) is distinct from 'object' or exists(select 1 from jsonb_object_keys(r) k where k not in ('variant','condition'))
       or jsonb_typeof(r->'variant') is distinct from 'string' or btrim(r->>'variant')='' or jsonb_typeof(r->'condition') is distinct from 'string' then reason:='invalid_legacy_variants';exit;end if;
      ordinal:=ordinal+1;digest:=md5('nexus-morpheme-variant:'||entry_uuid::text||':'||sid::text||':'||ordinal::text||':'||raw);
      forms:=forms||jsonb_build_array(jsonb_build_object('id',(substr(digest,1,8)||'-'||substr(digest,9,4)||'-5'||substr(digest,14,3)||'-8'||substr(digest,18,3)||'-'||substr(digest,21,12))::uuid,'form',r->>'variant','condition',r->>'condition'));
     end loop;
     if reason is null then c:=jsonb_set(c,'{bundle,dictionary_senses,0,variants}',forms);end if;
    end if;
   exception when invalid_text_representation then reason:='unstructured_legacy_variants';
   end;
  end if;
  -- Runs the existing real materialization validation in a rolled-back subtransaction.
  review:=public.create_dictionary_review(entry_uuid,s,c,'manual',false);
  answer:=jsonb_build_object('entry_id',entry_uuid,'status','created','review_id',review->'id','manual_reason',reason,'legacy_category_retained',true,'variants_assigned',case when reason is null then jsonb_array_length(forms) else 0 end);
 end if;
 insert into public.dictionary_import_operations(owner_id,operation_id,session_id,source_type,preview_at,request,result)
 values(auth.uid(),operation_uuid,operation_uuid,'morpheme_conversion',now(),request,answer);
 return answer;
end $body$;
revoke all on function public.prepare_dictionary_morpheme_draft(uuid,jsonb,uuid) from public,anon;
grant execute on function public.prepare_dictionary_morpheme_draft(uuid,jsonb,uuid) to authenticated;

create or replace function public.get_dictionary_morpheme_links(entry_uuid uuid,sense_uuid uuid,page_number integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $body$
declare answer jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if page_number is null or page_number<0 or page_number>100000 then raise exception 'Invalid page';end if;
 with review_counts as (select entry_id,count(*) n from public.dictionary_review_drafts where state='active' group by entry_id),
 pending as (
  select x->>'id' id,r.entry_id::text entry_id,x->>'sense_id' sense_id,x->>'target_entry_id' target_entry_id,x->>'target_sense_id' target_sense_id,e.headword,true pending,false removed,c.n>1 ambiguous,r.id::text review_id
  from public.dictionary_review_drafts r join public.dictionary_entries e on e.id=r.entry_id and e.kind='word' join review_counts c on c.entry_id=r.entry_id
  cross join lateral jsonb_array_elements(coalesce(r.candidate#>'{bundle,dictionary_relations}','[]')) x
  where r.state='active' and x->>'target_entry_id'=entry_uuid::text and x->>'target_sense_id'=sense_uuid::text
 ), links as (
  select r.id::text,r.entry_id::text,r.sense_id::text,r.target_entry_id::text,r.target_sense_id::text,e.headword,e.status='draft' pending,
   coalesce(c.n=1,false) removed,coalesce(c.n>1,false) ambiguous,null::text review_id
  from public.dictionary_relations r join public.dictionary_entries e on e.id=r.entry_id and e.kind='word' left join review_counts c on c.entry_id=r.entry_id
  where r.target_entry_id=entry_uuid and r.target_sense_id=sense_uuid and not exists(select 1 from pending p where p.id=r.id::text and not p.ambiguous)
  union all select * from pending
 ), shown as (select * from links order by lower(headword) collate "C",entry_id,id,review_id nulls first limit 50 offset page_number*50)
 select jsonb_build_object('items',coalesce((select jsonb_agg(s order by lower(headword) collate "C",entry_id,id,review_id nulls first) from shown s),'[]'),'page',page_number,'total',(select count(*) from links),'has_more',(page_number+1)*50<(select count(*) from links)) into answer;
 return answer;
end $body$;
revoke all on function public.get_dictionary_morpheme_links(uuid,uuid,integer) from public,anon;
grant execute on function public.get_dictionary_morpheme_links(uuid,uuid,integer) to authenticated;

commit;
