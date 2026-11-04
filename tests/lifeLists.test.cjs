require("./loadStudy.cjs");
require("fake-indexeddb/auto");
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { PGlite } = require("@electric-sql/pglite"),
  { openDB, deleteDB } = require("idb");
const { IndexedDBAdapter } = require("../src/infrastructure/storage/IndexedDBAdapter.ts");
const { LIFE_STORES, lifeBase } = require("../src/features/life/lists.ts");
const { pullWorkspace, flushWorkspace } = require("../src/infrastructure/sync/workspaceSync.ts");
const owner = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const migration = "20261103155520_life_custom_lists.sql";
async function setup() {
  const pg = new PGlite();
  await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;
create table pages(id text primary key,owner_id uuid,title text,content_json jsonb,content_text text,revision bigint,created_at bigint,updated_at bigint,deleted_at bigint);
create table attachments(id text primary key,owner_id uuid,kind text,name text,mime_type text,size_bytes bigint,storage_key text,device_id text,created_at bigint,updated_at bigint,deleted_at bigint);
create table binaries(id text primary key,owner_id uuid,data text,updated_at bigint);
alter table pages enable row level security;alter table attachments enable row level security;alter table binaries enable row level security;
create policy pages_read on pages for select using(owner_id=auth.uid());create policy attachments_read on attachments for select using(owner_id=auth.uid());create policy binaries_read on binaries for select using(owner_id=auth.uid());grant select on pages,attachments,binaries to authenticated;`);
  await pg.exec(fs.readFileSync("supabase/migrations/20261008_workspace_delete_protection.sql", "utf8"));
  await pg.exec(fs.readFileSync("supabase/migrations/" + migration, "utf8"));
  await pg.query("insert into auth.users values($1),($2)", [owner, other]);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  return pg;
}
async function device() {
  const db = await openDB(crypto.randomUUID(), 9, {
    upgrade(db) {
      for (const name of [
        "pages",
        "attachments",
        "binaries",
        "workspace_outbox",
        "workspace_sync_meta",
        ...LIFE_STORES,
        "study_cards",
        "study_states",
        "study_events",
        "study_settings",
        "study_sessions",
        "study_outbox",
        "study_sync_meta",
      ]) {
        const s = db.createObjectStore(name, { keyPath: "id" });
        if (name === "pages" || name === "attachments") s.createIndex("by_updated", "updated_at");
      }
      db.createObjectStore("settings", { keyPath: "key" });
    },
  });
  const a = new IndexedDBAdapter();
  a.db = db;
  a.setWorkspaceOwner(owner);
  return a;
}
function client(pg) {
  return {
    rpc: async (name, { operations }) => {
      try {
        return {
          data: (await pg.query("select apply_workspace_operations($1) v", [JSON.stringify(operations)])).rows[0].v,
        };
      } catch (e) {
        return { error: { message: e.message } };
      }
    },
    from(table) {
      const conditions = [],
        args = [],
        q = {
          select() {
            return q;
          },
          eq(k, v) {
            args.push(v);
            conditions.push(`"${k}"=$${args.length}`);
            return q;
          },
          order() {
            return q;
          },
          limit() {
            return q;
          },
          gt(k, v) {
            args.push(v);
            conditions.push(`"${k}">$${args.length}`);
            return q;
          },
          then(resolve, reject) {
            pg.query(`select * from "${table}" where ${conditions.join(" and ")} order by id`, args).then(
              (r) => resolve({ data: r.rows }),
              reject,
            );
          },
        };
      return q;
    },
  };
}
async function rpc(pg, type, row, revision = 0, kind = "save") {
  return (
    await pg.query("select apply_workspace_operations($1) v", [
      JSON.stringify([
        {
          id: crypto.randomUUID(),
          entity_type: type,
          entity_id: row.id,
          kind,
          expected_revision: revision,
          value: row,
        },
      ]),
    ])
  ).rows[0].v[0];
}
const list = (title = "List") => ({
  ...lifeBase(owner, title),
  fields: [
    { id: "text", name: "Brand", type: "text" },
    { id: "file", name: "File", type: "attachment" },
  ],
  schema_version: 1,
});
const category = (l, title = "Category", parent = null) => ({
  ...lifeBase(owner, title),
  list_id: l.id,
  parent_id: parent,
});
const item = (l, c = null) => ({
  ...lifeBase(owner, "Item"),
  list_id: l.id,
  category_id: c,
  schema_version: l.schema_version,
  values: { text: "kept" },
  attachment_ids: [],
});

test("SQL migration: owner RLS, CAS, typed fields, archive preservation, tree/attachment/delete validation and durable retries", async () => {
  const pg = await setup();
  try {
    await pg.exec("set role authenticated");
    const l = list();
    let r = await rpc(pg, "life_lists", l);
    assert.equal(r.revision, 1);
    const second = list("Second");
    await rpc(pg, "life_lists", second);
    const c = category(l),
      child = category(l, "Child", c.id);
    await rpc(pg, "life_categories", c);
    await rpc(pg, "life_categories", child);
    const i = item(l, child.id);
    await rpc(pg, "life_items", i);
    await assert.rejects(rpc(pg, "life_categories", { ...c, parent_id: child.id }, 1), /cycle/i);
    await assert.rejects(rpc(pg, "life_items", { ...item(second), category_id: c.id }), /category|foreign key/i);
    await assert.rejects(rpc(pg, "life_lists", { ...l, fields: [] }, 1), /Archive/);
    await assert.rejects(
      rpc(
        pg,
        "life_lists",
        {
          ...l,
          fields: [{ ...l.fields[0], type: "number" }, l.fields[1]],
          schema_version: 2,
        },
        1,
      ),
      /has values/,
    );
    r = await rpc(
      pg,
      "life_lists",
      {
        ...l,
        fields: [{ ...l.fields[0], name: "Renamed", archived: true }, l.fields[1]],
      },
      1,
    );
    assert.equal(r.row.fields[0].name, "Renamed");
    assert.equal((await pg.query('select "values" from life_items')).rows[0].values.text, "kept");
    await assert.rejects(rpc(pg, "life_items", { ...i, values: { text: 42 } }, 1), /Invalid field/);
    await assert.rejects(rpc(pg, "life_lists", l, 1), /revision conflict/);
    await assert.rejects(rpc(pg, "life_categories", c, 1, "soft_delete"), /parent/i);
    await assert.rejects(rpc(pg, "life_lists", l, 2, "soft_delete"), /deleted/i);
    const attachment = {
      ...lifeBase(owner, "Attachment"),
      id: "file",
      kind: "file",
      name: "a.txt",
      mime_type: "text/plain",
      size_bytes: 1,
      storage_key: "file",
      device_id: "device",
    };
    await rpc(pg, "attachments", attachment);
    const withFile = {
      ...i,
      values: { ...i.values, file: ["file"] },
      attachment_ids: ["file"],
    };
    await rpc(pg, "life_items", withFile, 1);
    await assert.rejects(rpc(pg, "attachments", attachment, 1, "hard_delete"), /Attachment is deleted/);
    await assert.rejects(
      rpc(
        pg,
        "life_items",
        {
          ...withFile,
          values: { text: "kept", file: ["foreign"] },
          attachment_ids: ["foreign"],
        },
        2,
      ),
      /Attachment/,
    );
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
    assert.equal((await pg.query("select * from life_lists")).rows.length, 0);
    await assert.rejects(pg.query("update life_items set title='bad'"), /permission/);
    await assert.rejects(rpc(pg, "life_items", { ...item(l), workspace_owner_id: other }), /schema|membership/);
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
    const op = {
      id: crypto.randomUUID(),
      entity_type: "life_items",
      entity_id: i.id,
      kind: "soft_delete",
      expected_revision: 2,
    };
    const call = () => pg.query("select apply_workspace_operations($1) v", [JSON.stringify([op])]);
    await call();
    await call();
    assert.equal((await pg.query("select revision from life_items")).rows[0].revision, 3);
    await assert.rejects(rpc(pg, "life_items", i, 3), /explicit restore/);
    await pg.exec("reset role;set role anon");
    await assert.rejects(rpc(pg, "life_lists", list()), /permission/);
  } finally {
    await pg.close();
  }
});

test("real IndexedDB + SQL: offline outbox, second device, conflicts, backup restore, account and attachment isolation", async () => {
  const pg = await setup(),
    a = await device(),
    b = await device(),
    restored = await device();
  try {
    const net = client(pg),
      ar = a.getLifeRepository(),
      l = list();
    await ar.save("life_lists", l);
    const c = category(l);
    await ar.save("life_categories", c);
    const i = item(l, c.id);
    await ar.save("life_items", i);
    assert.equal((await a.getWorkspacePersistence().pending(owner)).length, 3);
    await flushWorkspace(net, a.getWorkspacePersistence(), owner);
    await pullWorkspace(net, b.getWorkspacePersistence(), owner);
    assert.equal((await b.getLifeRepository().read()).life_items[0].values.text, "kept");
    const local = (await ar.read()).life_items[0];
    await ar.save("life_items", { ...local, title: "offline edit" });
    await assert.rejects(ar.save("life_items", { ...local, title: "stale tab" }), /版本/);
    await b.getLifeRepository().save("life_items", {
      ...(await b.getLifeRepository().read()).life_items[0],
      title: "other device",
    });
    await flushWorkspace(net, b.getWorkspacePersistence(), owner);
    await assert.rejects(flushWorkspace(net, a.getWorkspacePersistence(), owner), /revision conflict/);
    assert.equal((await ar.read()).life_items[0].title, "offline edit");
    const backup = await a.exportWorkspaceBackup();
    assert.equal(backup.schema_version, 4);
    await restored.importWorkspaceBackup(backup);
    assert.equal((await restored.getLifeRepository().read()).life_items[0].title, "offline edit");
    await restored.importWorkspaceBackup(backup);
    const bad = structuredClone(backup);
    bad.life.life_categories[0].parent_id = bad.life.life_categories[0].id;
    await assert.rejects(restored.importWorkspaceBackup(bad), /循環/);
    assert.equal((await restored.getLifeRepository().read()).life_categories[0].parent_id, null);
    const old = structuredClone(backup);
    delete old.life;
    old.schema_version = 3;
    await restored.importWorkspaceBackup(old);
    assert.equal((await restored.getLifeRepository().read()).life_items.length, 1);
    const oldRepo = a.getLifeRepository();
    a.setWorkspaceOwner(other);
    assert.equal((await a.getLifeRepository().read()).life_items.length, 0);
    await assert.rejects(oldRepo.save("life_items", local), /帳號/);
    await assert.rejects(a.importWorkspaceBackup(backup), /帳號|account/);
  } finally {
    for (const d of [a, b, restored]) {
      const name = d.db.name;
      await d.close();
      await deleteDB(name);
    }
    await pg.close();
  }
});

test("backup restores attachment bytes before list references; batch delete is atomic and older backup cannot resurrect deleted data", async () => {
  const pg = await setup(),
    source = await device(),
    restored = await device();
  try {
    const l = list("Attachments"),
      a = await source.createAttachment({
        kind: "file",
        name: "receipt.txt",
        mime_type: "text/plain",
        size_bytes: 7,
      });
    await source.attachBinary(a.id, new Blob(["receipt"]));
    l.fields.push(
      { id: "amount", name: "Price", type: "money" },
      { id: "date", name: "Date", type: "date" },
      { id: "number", name: "Count", type: "number" },
      { id: "checked", name: "Checked", type: "checkbox" },
      { id: "option", name: "Option", type: "select", options: ["one", "two"] },
    );
    await source.getLifeRepository().save("life_lists", l);
    const c = category(l);
    await source.getLifeRepository().save("life_categories", c);
    const i = {
      ...item(l, c.id),
      values: {
        text: "value",
        file: [a.id],
        amount: { amount: "0.10", currency: "TWD" },
        date: "2026-11-03",
        number: 2.5,
        checked: true,
        option: "one",
      },
      attachment_ids: [a.id],
    };
    await source.getLifeRepository().save("life_items", i);
    const backup = await source.exportWorkspaceBackup();
    await restored.importWorkspaceBackup(backup);
    assert.equal(await (await restored.readBinary(a.id)).text(), "receipt");
    await flushWorkspace(client(pg), restored.getWorkspacePersistence(), owner);
    assert.equal((await pg.query("select data from binaries")).rows[0].data, btoa("receipt"));
    assert.equal((await pg.query('select "values" from life_items')).rows[0].values.amount.amount, "0.10");
    const repo = restored.getLifeRepository(),
      current = await repo.read();
    await repo.remove("life_lists", current.life_lists[0]);
    assert.ok((await repo.read()).life_items[0].deleted_at);
    await flushWorkspace(client(pg), restored.getWorkspacePersistence(), owner);
    assert.ok((await pg.query("select deleted_at from life_items")).rows[0].deleted_at);
    assert.ok((await pg.query("select deleted_at from life_categories")).rows[0].deleted_at);
    await assert.rejects(restored.importWorkspaceBackup(backup), /版本衝突/);
    await restored.deleteAttachment(a.id);
    await flushWorkspace(client(pg), restored.getWorkspacePersistence(), owner);
    const deletedBackup = await restored.exportWorkspaceBackup();
    const archived = await device(),
      pgArchived = await setup();
    try {
      await archived.importWorkspaceBackup(deletedBackup);
      await flushWorkspace(client(pgArchived), archived.getWorkspacePersistence(), owner);
      assert.ok((await pgArchived.query("select deleted_at from life_items")).rows[0].deleted_at);
      assert.equal((await pgArchived.query("select * from binaries")).rows.length, 0);
    } finally {
      const name = archived.db.name;
      await archived.close();
      await deleteDB(name);
      await pgArchived.close();
    }
    const bad = structuredClone(backup);
    bad.life.life_items[0].values.date = "2026-02-31";
    await assert.rejects(restored.importWorkspaceBackup(bad));
  } finally {
    for (const d of [source, restored]) {
      const name = d.db.name;
      await d.close();
      await deleteDB(name);
    }
    await pg.close();
  }
});
