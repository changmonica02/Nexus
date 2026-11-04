const fs = require("node:fs");
// Bootstrap the original workspace columns (not supplied by a versioned initial
// schema), then execute the actual owner/creative/chapter/RPC migrations.
// No production dump, endpoint, data or credentials are used.
async function workspaceDatabase(pg) {
  await pg.exec(`create schema auth;create role authenticated;create role anon;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to authenticated,anon;
 create table pages(id text primary key,title text not null,content_json jsonb not null default '{}',content_text text not null default '',default_mode text not null default 'note',device_id text not null,revision bigint not null default 1,created_at bigint not null,updated_at bigint not null,deleted_at bigint,tags text[],folder text,links text[],attachment_ids text[],primary_attachment_id text,kind text,study_items jsonb,presentation_data jsonb,is_favorite boolean,format text,sort_order double precision,parent_id text,margins jsonb,due_date bigint,priority text,completed boolean,color text,official_pack_id text,official_pack_version integer);
 create table attachments(id text primary key,kind text not null,name text not null,mime_type text not null,size_bytes bigint not null,storage_key text not null,device_id text not null,page_count integer,created_at bigint not null,updated_at bigint not null,deleted_at bigint);
 create table binaries(id text primary key,data text not null,updated_at bigint not null);
 grant select,insert,update,delete on pages,attachments,binaries to authenticated;
 create publication supabase_realtime;
 `);
  for (const file of [
    "20260913_account_isolation.sql",
    "20260914_creative_sync_fields.sql",
    "20260916_novel_chapters.sql",
    "20261008_workspace_delete_protection.sql",
  ])
    await pg.exec(fs.readFileSync("supabase/migrations/" + file, "utf8"));
}
module.exports = { workspaceDatabase };
