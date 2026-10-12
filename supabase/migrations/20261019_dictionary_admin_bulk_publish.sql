-- Bounded, admin-only first publication. No content snapshots or trial publications in preview.
begin;
-- Opaque preview token, fixed scope and progress. No direct client access, including admins.
create table public.dictionary_bulk_publish_previews (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null references auth.users(id) on delete cascade,
 kind_filters text[] not null,
 query_text text not null,
 plan jsonb not null,
 baselines jsonb not null,
 expires_at timestamptz not null default now()+interval '24 hours'
);
alter table public.dictionary_bulk_publish_previews enable row level security;
revoke all on public.dictionary_bulk_publish_previews from public,anon,authenticated;
create index dictionary_bulk_preview_expiry on public.dictionary_bulk_publish_previews(expires_at);

-- Lightweight content-version fingerprint, evaluated set-wise under one MVCC snapshot.
-- Child IDs/revisions detect edits/deletes even when a legacy direct child edit didn't bump its parent.
-- Grouping/metadata have no technical revision, so include only their small structural values.
create function public.dictionary_bulk_versions(ids uuid[]) returns table(entry_id uuid,stamp text)
language sql stable security definer set search_path='' as $$
 with pieces as (
 select e.id eid,'entry' t,e.id rid,jsonb_build_array(e.id,e.revision,e.status) v from public.dictionary_entries e where e.id=any(ids)
 union all select entry_id,'sense',id,jsonb_build_array(id,revision) from public.dictionary_senses where entry_id=any(ids)
 union all select entry_id,'relation',id,jsonb_build_array(id,revision) from public.dictionary_relations where entry_id=any(ids)
 union all select entry_id,'etymology',id,jsonb_build_array(id,revision) from public.dictionary_etymologies where entry_id=any(ids)
 union all select entry_id,'note',id,jsonb_build_array(id,revision) from public.dictionary_learning_notes where entry_id=any(ids)
 union all select entry_id,'example',id,jsonb_build_array(id,revision) from public.dictionary_examples where entry_id=any(ids)
 union all select entry_id,'annotation',id,jsonb_build_array(id,revision) from public.dictionary_lexical_annotations where entry_id=any(ids)
 union all select entry_id,'pronunciation',id,jsonb_build_array(id,revision) from public.dictionary_pronunciations where entry_id=any(ids)
 union all select id,'group',id,to_jsonb(g) from public.dictionary_entry_groups g where id=any(ids)
 union all select s.entry_id,'sense_group',g.sense_id,to_jsonb(g) from public.dictionary_sense_groups g join public.dictionary_senses s on s.id=g.sense_id where s.entry_id=any(ids)
 union all select entry_id,'metadata',entry_id,to_jsonb(m) from public.dictionary_ai_metadata m where entry_id=any(ids)
 ) select eid,md5(jsonb_agg(jsonb_build_array(t,v) order by t,rid)::text) from pieces group by eid;
$$;
revoke all on function public.dictionary_bulk_versions(uuid[]) from public,anon,authenticated;

create function public.dictionary_bulk_publish_work(kind_filters text[], query_text text, preview boolean, expected_signature text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
<<work>>
declare session public.dictionary_bulk_publish_previews; kinds text[]; query_normal text:=lower(btrim(coalesce(query_text,'')));
 plan jsonb; baselines jsonb; ids uuid[]; expected_ids uuid[]; eligible uuid[]; reached uuid[]:='{}'; locks uuid[];
 version_row record; result jsonb; token uuid; after_stamp text;
 attempted integer:=0; published integer:=0; remaining integer; ready integer; blocked integer; invalid integer; total integer;
 succeeded boolean; failure_reason text; no_progress boolean:=false; batch_size constant integer:=200;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if exists(select 1 from unnest(kind_filters) k where k not in ('word','prefix','root') or k is null) then raise exception 'Invalid kind filter';end if;
 select coalesce(array_agg(k order by k),'{}') into kinds from (select distinct unnest(kind_filters) k) x;
 if preview then
  -- Only expired bookkeeping is reclaimed; published data/audit are never cleaned here.
  delete from public.dictionary_bulk_publish_previews where id in
   (select id from public.dictionary_bulk_publish_previews where expires_at<now() order by expires_at limit 100);
  -- One statement captures fixed membership, graph and fingerprints. No content row locks.
  with scope as materialized (
   select id,headword from public.dictionary_entries where status='draft'
   and (cardinality(kinds)=0 or kind=any(kinds)) and position(query_normal in lower(headword))>0
  ), graph as materialized (
   select s.id,s.headword,exists(select 1 from public.dictionary_senses where entry_id=s.id) has_sense,
    coalesce((select jsonb_agg(distinct target_entry_id) from public.dictionary_relations where entry_id=s.id),'[]') targets
   from scope s
  ), all_ids as (
   select id from scope union select (x#>>'{}')::uuid from graph g cross join lateral jsonb_array_elements(g.targets) x
  ), versions as materialized (select * from public.dictionary_bulk_versions(array(select id from all_ids)))
  select coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'headword',g.headword,'targets',g.targets,
    'state',case when g.has_sense then 'pending' else 'invalid' end,
    'reason',case when g.has_sense then null else 'At least one sense is required' end) order by g.id) from graph g),'[]'),
   coalesce((select jsonb_object_agg(e.id,jsonb_build_object('stamp',v.stamp,'status',e.status)) from versions v join public.dictionary_entries e on e.id=v.entry_id),'{}')
  into plan,baselines;
  -- Topological analysis only: a node is ready if all targets are already published or reachable.
  loop
   select coalesce(array_agg((n->>'id')::uuid),'{}') into eligible from jsonb_array_elements(plan) n
   where n->>'state'='pending' and not((n->>'id')::uuid=any(reached))
   and not exists(select 1 from jsonb_array_elements_text(n->'targets') t where baselines->t->>'status' is distinct from 'published' and not(t::uuid=any(reached)));
   exit when cardinality(eligible)=0;
   reached:=reached||eligible;
  end loop;
  select coalesce(jsonb_agg(case when n->>'state'='pending' and not((n->>'id')::uuid=any(reached)) then
   n||jsonb_build_object('state','blocked','reason','Unpublished external, invalid or cyclic dependency') else n end order by n->>'id'),'[]') into plan from jsonb_array_elements(plan) n;
  insert into public.dictionary_bulk_publish_previews(actor_id,kind_filters,query_text,plan,baselines)
   values(auth.uid(),kinds,query_normal,plan,baselines) returning id into token;
 else
  perform pg_advisory_xact_lock(710,1);
  -- Same token across batches. Session lock serializes concurrent/retried calls; completed cards cannot repeat.
  begin token:=expected_signature::uuid;exception when invalid_text_representation then raise exception 'Preview stale or invalid; preview again';end;
  select * into session from public.dictionary_bulk_publish_previews where id=token and actor_id=auth.uid() for update;
  if not found or session.expires_at<now() then raise exception 'Preview stale or expired; preview again';end if;
  if session.kind_filters is distinct from kinds or session.query_text is distinct from query_normal then raise exception 'Preview filter changed; preview again';end if;
  plan:=session.plan;baselines:=session.baselines;
  -- Lightweight membership check; newly matching rows are never silently added to an authorized preview.
  select coalesce(array_agg(id order by id),'{}') into ids from public.dictionary_entries where status='draft'
   and (cardinality(kinds)=0 or kind=any(kinds)) and position(query_normal in lower(headword))>0;
  select coalesce(array_agg((n->>'id')::uuid order by (n->>'id')::uuid),'{}') into expected_ids from jsonb_array_elements(plan) n where n->>'state'<>'published';
  if ids is distinct from expected_ids then raise exception 'Preview stale: membership or status changed; preview again';end if;
  -- Every pass may unlock another dependency layer, but the entire RPC attempts <=200 entries.
  while attempted<batch_size loop
   select coalesce(array_agg(id order by id),'{}') into eligible from (
    select (n->>'id')::uuid id from jsonb_array_elements(plan) n where n->>'state'='pending'
    and not exists(select 1 from jsonb_array_elements_text(n->'targets') t where baselines->t->>'status' is distinct from 'published')
    order by id limit (batch_size-attempted)
   ) available;
   if cardinality(eligible)=0 then
    no_progress:=attempted=0;
    -- Remaining nodes depend on rejected targets (or a cycle). Terminal, never retry indefinitely.
    select coalesce(jsonb_agg(case when n->>'state'='pending' then n||jsonb_build_object('state','blocked','reason','Dependency could not be published') else n end order by n->>'id'),'[]') into plan from jsonb_array_elements(plan) n;
    exit;
   end if;
   -- Lock only this bounded wave and its direct dependencies, never the entire matching scope.
   select coalesce(array_agg(distinct id order by id),'{}') into locks from (
    select unnest(eligible) id union select t::uuid from jsonb_array_elements(plan) n cross join lateral jsonb_array_elements_text(n->'targets') t where (n->>'id')::uuid=any(eligible)
   ) targets;
   perform id from public.dictionary_entries where id=any(locks) order by id for update;
   if (select count(*) from public.dictionary_entries where id=any(locks))<>cardinality(locks) then raise exception 'Preview stale: entry missing; preview again';end if;
   for version_row in select * from public.dictionary_bulk_versions(locks) loop
    if version_row.stamp is distinct from baselines->(version_row.entry_id::text)->>'stamp' then raise exception 'Preview stale: content changed; preview again';end if;
   end loop;
   foreach token in array eligible loop
    attempted:=attempted+1;
    succeeded:=true;
    begin
     perform public.publish_dictionary_entry(token);
    exception when others then
     -- Only the authority's rejected publication is invalid; unexpected bookkeeping errors abort the batch.
     succeeded:=false;failure_reason:=sqlerrm;
    end;
    if succeeded then
     published:=published+1;
     select stamp into after_stamp from public.dictionary_bulk_versions(array[token]);
     baselines:=jsonb_set(baselines,array[token::text],jsonb_build_object('stamp',after_stamp,'status','published'));
     select jsonb_agg(case when n->>'id'=token::text then n||jsonb_build_object('state','published') else n end order by n->>'id') into plan from jsonb_array_elements(plan) n;
    else
     select jsonb_agg(case when n->>'id'=token::text then n||jsonb_build_object('state','invalid','reason',failure_reason) else n end order by n->>'id') into plan from jsonb_array_elements(plan) n;
    end if;
   end loop;
  end loop;
  token:=session.id;
  update public.dictionary_bulk_publish_previews set plan=work.plan,baselines=work.baselines where id=session.id;
 end if;
 select count(*),count(*) filter(where n->>'state'='pending'),count(*) filter(where n->>'state'='blocked'),count(*) filter(where n->>'state'='invalid')
  into total,remaining,blocked,invalid from jsonb_array_elements(plan) n;
 ready:=remaining;
 select jsonb_build_object('total',total,'ready',ready,'published',published,
  'published_total',(select count(*) from jsonb_array_elements(plan) n where n->>'state'='published'),
  'blocked',blocked,'invalid',invalid,'remaining',remaining,'continuation',remaining>0,'no_progress',no_progress,
  'batch_size',batch_size,'attempted',attempted,'signature',token::text,
  'issues',coalesce((select jsonb_agg(jsonb_build_object('id',n->>'id','headword',n->>'headword','status',n->>'state','reason',n->>'reason')) from
   (select n from jsonb_array_elements(plan) n where n->>'state' in ('blocked','invalid') limit 100) problems),'[]')) into result;
 return result;
end $$;
revoke all on function public.dictionary_bulk_publish_work(text[],text,boolean,text) from public,anon,authenticated;
create function public.preview_dictionary_bulk_publish(kind_filters text[] default '{}',query_text text default '') returns jsonb
language sql security definer set search_path='' as $$select public.dictionary_bulk_publish_work(kind_filters,query_text,true,null)$$;
create function public.publish_dictionary_bulk(kind_filters text[],query_text text,expected_signature text) returns jsonb
language sql security definer set search_path='' as $$select public.dictionary_bulk_publish_work(kind_filters,query_text,false,expected_signature)$$;
revoke all on function public.preview_dictionary_bulk_publish(text[],text),public.publish_dictionary_bulk(text[],text,text) from public,anon;
grant execute on function public.preview_dictionary_bulk_publish(text[],text),public.publish_dictionary_bulk(text[],text,text) to authenticated;
commit;
