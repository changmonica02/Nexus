-- Incremental; do NOT apply to production without explicit authorization.
-- Requires auth.uid(), authenticated/anon roles and public.is_dictionary_admin().
begin;
create schema if not exists nexus_private;
revoke all on schema nexus_private from public,anon;
grant usage on schema nexus_private to authenticated;
create table public.creation_templates (
 id uuid primary key, owner_id uuid not null references auth.users(id), kind text not null check(kind in ('character','world')),
 author_name text not null check(length(author_name) between 1 and 120), title text not null check(length(title) between 1 and 200),
 visibility text not null default 'draft' check(visibility in ('draft','published','delisted','taken_down')),
 official boolean not null default false, allow_derivatives boolean not null default false,
 latest_version integer not null default 0, downloads bigint not null default 0,
 source_id uuid, source_snapshot jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.creation_template_drafts (
 template_id uuid primary key references public.creation_templates(id) on delete cascade,
 owner_id uuid not null references auth.users(id), revision integer not null check(revision>0), title text not null,
 structure jsonb not null, updated_at timestamptz not null default now()
);
create table public.creation_template_versions (
 template_id uuid not null references public.creation_templates(id) on delete cascade,
 version integer not null check(version>0), draft_revision integer not null, title text not null, structure jsonb not null,
 license_snapshot jsonb not null, created_at timestamptz not null default now(), primary key(template_id,version),unique(template_id,draft_revision)
);
create table public.creation_template_downloads (
 owner_id uuid not null references auth.users(id),template_id uuid not null references public.creation_templates(id) on delete cascade,
 private_page_id uuid not null default gen_random_uuid(), version integer not null,created_at timestamptz not null default now(),
 primary key(owner_id,template_id),unique(private_page_id)
);
create table public.creation_template_reports (
 id uuid primary key,owner_id uuid not null references auth.users(id), template_id uuid not null references public.creation_templates(id) on delete cascade,
 reason text not null check(length(reason) between 1 and 2000), resolved boolean not null default false,created_at timestamptz not null default now()
);
create index creation_templates_owner on public.creation_templates(owner_id,updated_at desc);
create index creation_template_drafts_owner on public.creation_template_drafts(owner_id);
create index creation_template_reports_owner on public.creation_template_reports(owner_id);
create index creation_templates_listing on public.creation_templates(kind,visibility,updated_at desc,id);
create index creation_template_reports_open on public.creation_template_reports(resolved,created_at);

-- Recursive allowlist: reject private values instead of silently dropping them.
create function public.creation_validate_structure_node(j jsonb, depth integer default 0) returns void
language plpgsql immutable set search_path='' as $$
declare k text; v jsonb; item jsonb;
begin
 if depth>12 then raise exception 'Template structure too deep';end if;
 if jsonb_typeof(j)='array' then
  if jsonb_array_length(j)>1000 then raise exception 'Template array too large';end if;
  for item in select value from jsonb_array_elements(j) loop perform public.creation_validate_structure_node(item,depth+1);end loop;
 elsif jsonb_typeof(j)='object' then
  for k,v in select key,value from jsonb_each(j) loop
   if not(k=any(array['id','type','title','isTemplate','blocks_version','basicBlock','enabled','basic','name','age','gender','race','avatarUrl','sections','tabs','contents','size','span','height','statisticHeaders','keyValues','key','value','richText','tags','stats','ratings','label','relations','palette','color','tendency','left','right','statistics','gallery','galleryAttachmentIds','externalLinks','music','url','description','unit'])) then raise exception 'Unsupported template field: %',k;end if;
   if k=any(array['name','age','gender','race','avatarUrl','richText','url','color']) and v<>'""'::jsonb then raise exception 'Private template value: %',k;end if;
   if k='statisticHeaders' then
    if jsonb_typeof(v)<>'object' or exists(select 1 from jsonb_each(v) h where h.key not in ('label','description','value','unit') or jsonb_typeof(h.value)<>'string' or length(h.value#>>'{}')>200) then raise exception 'Invalid field headers';end if;
    continue;
   end if;
   if k='value' and v not in ('""'::jsonb,'0'::jsonb) then raise exception 'Private numeric or text value';end if;
   if k=any(array['tags','relations','statistics','gallery','galleryAttachmentIds']) and v<>'[]'::jsonb then raise exception 'Private template collection: %',k;end if;
   if k='span' and (jsonb_typeof(v)<>'number' or (v#>>'{}')::numeric not between 4 and 12 or trunc((v#>>'{}')::numeric)<>(v#>>'{}')::numeric) then raise exception 'Invalid span';end if;
   if k='height' and (jsonb_typeof(v)<>'number' or (v#>>'{}')::numeric not between 120 and 1600) then raise exception 'Invalid height';end if;
   if jsonb_typeof(v) in ('array','object') then perform public.creation_validate_structure_node(v,depth+1);end if;
  end loop;
 end if;
end $$;
create function public.creation_validate_sections(items jsonb, level integer default 0) returns void language plpgsql immutable set search_path='' as $$
declare node jsonb;
begin
 if level>8 or jsonb_typeof(items) is distinct from 'array' then raise exception 'Invalid section collection';end if;
 for node in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(node) is distinct from 'object' or jsonb_typeof(node->'id') is distinct from 'string' or length(node->>'id') not between 1 and 200 or jsonb_typeof(node->'title') is distinct from 'string' or length(node->>'title')>200 or coalesce(node->>'type','') not in ('group','key_value','rich_text','tags','stats','rating','relations','radar','palette','tendency','statistics','gallery','links','music') then raise exception 'Invalid template component';end if;
  if node ? 'contents' then
   if node->>'type'<>'group' then raise exception 'Only blocks contain components';end if;
   perform public.creation_validate_sections(node->'contents',level+1);
  elsif node->>'type'='group' then raise exception 'Block contents required';end if;
  if exists(select 1 from jsonb_each(node) x where x.key=any(array['keyValues','stats','ratings','relations','palette','tendency','statistics','gallery','galleryAttachmentIds','externalLinks','music','tags']) and jsonb_typeof(x.value)<>'array') then raise exception 'Invalid component fields';end if;
 end loop;
end $$;
create function public.creation_validate_structure(j jsonb) returns void language plpgsql immutable set search_path='' as $$
declare total integer; distinct_ids integer; tab jsonb;
begin
 if jsonb_typeof(j) is distinct from 'object' or jsonb_typeof(j->'sections') is distinct from 'array' or j->'isTemplate' is distinct from 'true'::jsonb or jsonb_typeof(j->'basic') is distinct from 'object' or octet_length(j::text)>1000000 then raise exception 'Invalid template structure';end if;
 if exists(select 1 from jsonb_object_keys(j) k where k not in ('isTemplate','blocks_version','basicBlock','basic','sections','tabs')) then raise exception 'Unsupported root field';end if;
 if exists(select 1 from jsonb_each(j->'basic') b where b.key not in ('name','age','gender','race','avatarUrl') or b.value<>'""'::jsonb) then raise exception 'Private basic content';end if;
 perform public.creation_validate_sections(j->'sections');
 if j ? 'tabs' then
  if jsonb_typeof(j->'tabs')<>'array' then raise exception 'Invalid tabs';end if;
  for tab in select value from jsonb_array_elements(j->'tabs') loop
   if jsonb_typeof(tab->'id') is distinct from 'string' or length(tab->>'id')=0 or jsonb_typeof(tab->'title') is distinct from 'string' then raise exception 'Invalid tab';end if;
   perform public.creation_validate_sections(tab->'sections');
  end loop;
 end if;
 perform public.creation_validate_structure_node(j);
 with recursive nodes(node) as (
  select j union all select c.value from nodes n cross join lateral (
   select value from jsonb_each(case when jsonb_typeof(n.node)='object' then n.node else '{}'::jsonb end)
   union all select value from jsonb_array_elements(case when jsonb_typeof(n.node)='array' then n.node else '[]'::jsonb end)
  ) c where jsonb_typeof(c.value) in ('object','array')
 ) select count(*),count(distinct node->>'id') into total,distinct_ids from nodes where node ? 'id';
 if total<>distinct_ids then raise exception 'Duplicate template node ID';end if;
end $$;

alter table public.creation_templates enable row level security;
alter table public.creation_template_drafts enable row level security;
alter table public.creation_template_versions enable row level security;
alter table public.creation_template_downloads enable row level security;
alter table public.creation_template_reports enable row level security;
create policy creation_read on public.creation_templates for select to authenticated using(owner_id=(select auth.uid()) or (visibility='published' and latest_version>0) or public.is_dictionary_admin());
create policy creation_draft_owner on public.creation_template_drafts for select to authenticated using(owner_id=(select auth.uid()));
create policy creation_version_read on public.creation_template_versions for select to authenticated using(exists(select 1 from public.creation_templates t where t.id=template_id and (t.owner_id=(select auth.uid()) or t.visibility='published')));
create policy creation_download_owner on public.creation_template_downloads for select to authenticated using(owner_id=(select auth.uid()));
create policy creation_report_read on public.creation_template_reports for select to authenticated using(owner_id=(select auth.uid()) or public.is_dictionary_admin());
revoke all on public.creation_templates,public.creation_template_drafts,public.creation_template_versions,public.creation_template_downloads,public.creation_template_reports from anon,authenticated;
grant select on public.creation_templates,public.creation_template_drafts,public.creation_template_versions,public.creation_template_downloads,public.creation_template_reports to authenticated;

create function public.creation_template_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('version',1,'admin',public.is_dictionary_admin()) where auth.uid() is not null$$;
create function nexus_private.creation_template_mutate(p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); tid uuid:=(p_input->>'id')::uuid; t public.creation_templates; d public.creation_template_drafts; v public.creation_template_versions; r public.creation_template_downloads;
 src public.creation_templates; snap jsonb; expected integer; n integer;
begin
 if uid is null then raise exception 'Authentication required';end if;
 if p_action='report' then
  if not exists(select 1 from public.creation_templates where id=tid and visibility='published') then raise exception 'Published template required';end if;
  insert into public.creation_template_reports(id,owner_id,template_id,reason) values((p_input->>'operation_id')::uuid,uid,tid,p_input->>'reason') on conflict(id) do nothing;
  return jsonb_build_object('reported',true);
 end if;
 select * into t from public.creation_templates where id=tid for update;
 if p_action='save' and t.id is null then
  if (p_input->>'revision')::integer<>0 then raise exception 'Draft revision conflict';end if;
  if p_input->>'source_id' is not null then
   select * into src from public.creation_templates where id=(p_input->>'source_id')::uuid for share;
   if src.id is null or src.visibility<>'published' or not src.allow_derivatives then raise exception 'Source does not allow public derivatives';end if;
   snap:=jsonb_build_object('id',src.id,'author_id',src.owner_id,'author_name',src.author_name,'version',src.latest_version,'allow_derivatives',true,'captured_at',now());
  end if;
  insert into public.creation_templates(id,owner_id,kind,author_name,title,source_id,source_snapshot) values(tid,uid,p_input->>'kind',p_input->>'author_name',p_input->>'title',src.id,snap) returning * into t;
 end if;
 if t.id is null then raise exception 'Template not found';end if;
 if p_action='download' then
  if t.visibility<>'published' or t.latest_version=0 then raise exception 'Published template required';end if;
  if (p_input->>'version')::integer is distinct from t.latest_version then raise exception 'Latest version changed; refresh';end if;
  select * into v from public.creation_template_versions where template_id=tid and version=t.latest_version;
  insert into public.creation_template_downloads(owner_id,template_id,version) values(uid,tid,t.latest_version) on conflict(owner_id,template_id) do nothing returning * into r;
  if found then update public.creation_templates set downloads=downloads+1 where id=tid;
  else update public.creation_template_downloads set version=t.latest_version where owner_id=uid and template_id=tid returning * into r;end if;
  return jsonb_build_object('page_id',r.private_page_id,'source_id',tid,'version',v.version,'title',v.title,'kind',t.kind,'author_name',t.author_name,'structure',v.structure,'license_snapshot',v.license_snapshot);
 end if;
 if p_action in ('official','takedown','resolve_report') then
  if not public.is_dictionary_admin() then raise exception 'Admin required';end if;
  if p_action='official' then update public.creation_templates set official=(p_input->>'value')::boolean where id=tid returning * into t;
  elsif p_action='takedown' then update public.creation_templates set visibility='taken_down' where id=tid returning * into t;
  else update public.creation_template_reports set resolved=true where id=(p_input->>'report_id')::uuid and template_id=tid;end if;
  return to_jsonb(t);
 end if;
 if t.owner_id<>uid then raise exception 'Owner required';end if;
 select * into d from public.creation_template_drafts where template_id=tid for update;
 if p_action='save' then
  expected:=coalesce(d.revision,0);
  if (p_input->>'revision')::integer=0 and expected=1 and d.title=p_input->>'title' and d.structure=p_input->'structure' then return to_jsonb(d);end if;
  if (p_input->>'revision')::integer is distinct from expected then raise exception 'Draft revision conflict';end if;
  perform public.creation_validate_structure(p_input->'structure');
  if length(trim(p_input->>'title')) not between 1 and 200 then raise exception 'Invalid title';end if;
  insert into public.creation_template_drafts(template_id,owner_id,revision,title,structure) values(tid,uid,expected+1,p_input->>'title',p_input->'structure')
  on conflict(template_id) do update set revision=excluded.revision,title=excluded.title,structure=excluded.structure,updated_at=now() returning * into d;
  return to_jsonb(d);
 elsif p_action='publish' then
  select * into v from public.creation_template_versions where template_id=tid and draft_revision=(p_input->>'revision')::integer;
  if found then return to_jsonb(t);end if;
  if t.visibility='taken_down' then raise exception 'Admin takedown cannot be bypassed';end if;
  if d.template_id is null or d.revision is distinct from (p_input->>'revision')::integer or t.latest_version is distinct from (p_input->>'latest_version')::integer then raise exception 'Publication version conflict';end if;
  if t.latest_version=0 and t.source_id is not null then
   select * into src from public.creation_templates where id=t.source_id for share;
   if src.id is null or src.visibility<>'published' or not src.allow_derivatives then raise exception 'Source license changed';end if;
   snap:=jsonb_build_object('id',src.id,'author_id',src.owner_id,'author_name',src.author_name,'version',src.latest_version,'allow_derivatives',true,'captured_at',now());
  else snap:=t.source_snapshot;end if;
  perform public.creation_validate_structure(d.structure);
  n:=t.latest_version+1;
  insert into public.creation_template_versions(template_id,version,draft_revision,title,structure,license_snapshot) values(tid,n,d.revision,d.title,d.structure,jsonb_build_object('author_id',uid,'author_name',t.author_name,'source',snap,'allow_derivatives',t.allow_derivatives));
  update public.creation_templates set title=d.title,visibility='published',latest_version=n,source_snapshot=snap,updated_at=now() where id=tid returning * into t;
  return to_jsonb(t);
 elsif p_action='derive' then
  if (p_input->>'revision')::integer is distinct from coalesce(d.revision,0) then raise exception 'Draft revision conflict';end if;
  select * into v from public.creation_template_versions where template_id=tid and version=(p_input->>'version')::integer;
  if v.template_id is null then raise exception 'Version not found';end if;
  insert into public.creation_template_drafts(template_id,owner_id,revision,title,structure) values(tid,uid,coalesce(d.revision,0)+1,v.title,v.structure)
  on conflict(template_id) do update set revision=excluded.revision,title=excluded.title,structure=excluded.structure,updated_at=now() returning * into d;
  return to_jsonb(d);
 elsif p_action='discard' then
  if (p_input->>'revision')::integer is distinct from coalesce(d.revision,0) then raise exception 'Draft revision conflict';end if;
  -- Keep monotonic revision, preventing ABA when an old browser later submits.
  if t.latest_version>0 then
   select * into v from public.creation_template_versions where template_id=tid and version=t.latest_version;
   update public.creation_template_drafts set revision=revision+1,title=v.title,structure=v.structure,updated_at=now() where template_id=tid returning * into d;
   return to_jsonb(d);
  else raise exception 'Unpublished submission: delete it to discard';end if;
 elsif p_action='visibility' then
  if t.visibility='taken_down' or t.latest_version=0 or p_input->>'value' not in ('published','delisted') then raise exception 'Invalid visibility transition';end if;
  update public.creation_templates set visibility=p_input->>'value',updated_at=now() where id=tid returning * into t;return to_jsonb(t);
 elsif p_action='license' then
  update public.creation_templates set allow_derivatives=(p_input->>'value')::boolean where id=tid returning * into t;return to_jsonb(t);
 elsif p_action='delete' then
  if p_input->>'confirmation' is distinct from tid::text then raise exception 'Explicit deletion confirmation required';end if;
  delete from public.creation_templates where id=tid;return jsonb_build_object('deleted',true);
 end if;
 raise exception 'Unsupported action';
end $$;
-- Exposed RPC is invoker-only; privileged implementation stays in a non-exposed schema.
create function public.creation_template_mutate(p_action text,p_input jsonb) returns jsonb
language sql security invoker set search_path='' as $$select nexus_private.creation_template_mutate(p_action,p_input)$$;
revoke all on function nexus_private.creation_template_mutate(text,jsonb) from public,anon,authenticated;
grant execute on function nexus_private.creation_template_mutate(text,jsonb) to authenticated;
revoke all on function public.creation_validate_structure_node(jsonb,integer),public.creation_validate_structure(jsonb),public.creation_validate_sections(jsonb,integer),public.creation_template_capabilities(),public.creation_template_mutate(text,jsonb) from public,anon,authenticated;
grant execute on function public.creation_template_capabilities(),public.creation_template_mutate(text,jsonb) to authenticated;
commit;
