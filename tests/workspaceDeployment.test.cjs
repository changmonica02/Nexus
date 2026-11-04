require("./loadStudy.cjs");
require("fake-indexeddb/auto");
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { PGlite } = process.env.NEXUS_TEST_POSTGRES_CONTAINER
  ? require("./fixtures/postgresContainer.cjs")
  : require("@electric-sql/pglite");
const { workspaceDatabase } = require("./fixtures/workspaceDatabase.cjs");
const { IndexedDBAdapter } = require("../src/infrastructure/storage/IndexedDBAdapter.ts");
const { pullWorkspace, flushWorkspace } = require("../src/infrastructure/sync/workspaceSync.ts");
const { openDB, deleteDB } = require("idb");
const A = "11111111-1111-4111-8111-111111111111",
  B = "22222222-2222-4222-8222-222222222222";
const migration = fs.readFileSync("supabase/migrations/20261103155520_life_custom_lists.sql", "utf8");
const op = (type, id, kind = "save", rev = 0, value) => ({
  id: crypto.randomUUID(),
  entity_type: type,
  entity_id: id,
  kind,
  expected_revision: rev,
  ...(value ? { value } : {}),
});
const page = (id) => ({
  id,
  title: "Page",
  content_json: { type: "doc", content: [] },
  content_text: "content",
  default_mode: "note",
  device_id: "device",
  created_at: 1,
  updated_at: 1,
  deleted_at: null,
  tags: ["tag"],
  links: ["page-other"],
  attachment_ids: ["attachment"],
  kind: "note",
  revision: 0,
  format: "flow",
  sort_order: 1,
  folder: "folder",
  parent_id: null,
  is_favorite: true,
  study_items: [],
  presentation_data: { slides: [] },
  margins: { top: 10 },
  due_date: 123,
  priority: "high",
  completed: false,
  color: "#fff",
  assistant_blocks: [],
  creative_type: "world",
  character_data: { basic: { name: "World" }, sections: [] },
  novel_settings: {},
});
const attachment = {
  id: "attachment",
  kind: "file",
  name: "proof.txt",
  mime_type: "text/plain",
  size_bytes: 5,
  storage_key: "attachment",
  device_id: "device",
  created_at: 1,
  updated_at: 1,
  deleted_at: null,
};
async function apply(pg, operations) {
  return (await pg.query("select apply_workspace_operations($1) value", [JSON.stringify(operations)])).rows[0].value;
}
const sql = async (pg, q, args = []) => (await pg.query(q, args)).rows;
async function actor(pg, id) {
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function setup() {
  const pg = new PGlite();
  await workspaceDatabase(pg);
  await pg.query("insert into auth.users values($1),($2)", [A, B]);
  await actor(pg, A);
  return pg;
}

// SQL-backed transport: authorization is performed by PostgreSQL, not this fixture.
function client(pg) {
  return {
    rpc: async (_, { operations }) => {
      try {
        return { data: await apply(pg, operations) };
      } catch (e) {
        return { error: { message: e.message, code: e.code } };
      }
    },
    from(table) {
      const filters = [],
        args = [];
      let cols = "*";
      const q = {
        select(c) {
          cols = c;
          return q;
        },
        eq(k, v) {
          args.push(v);
          filters.push(`"${k}"=$${args.length}`);
          return q;
        },
        gt(k, v) {
          args.push(v);
          filters.push(`"${k}">$${args.length}`);
          return q;
        },
        order() {
          return q;
        },
        limit() {
          return q;
        },
        abortSignal() {
          return q;
        },
        async maybeSingle() {
          const r = await q;
          return { data: r.data?.[0] ?? null, error: r.error };
        },
        then(resolve) {
          return pg.query(`select ${cols} from "${table}" where ${filters.join(" and ")} order by id`, args).then(
            (r) => resolve({ data: r.rows }),
            (e) => resolve({ error: { message: e.message, code: e.code } }),
          );
        },
      };
      return q;
    },
  };
}
async function device() {
  const a = new IndexedDBAdapter();
  await a.init();
  a.setWorkspaceOwner(A);
  return a;
}

test("real workspace migration preserves existing rows, old receipts, complete Page fields, binary operations, tombstones and RLS", async () => {
  const pg = await setup();
  try {
    await pg.exec("set role authenticated");
    const initial = [
      op("attachments", "attachment", "save", 0, attachment),
      { ...op("attachments", "attachment", "binary", 1), data: btoa("proof") },
      op("pages", "page", "save", 0, page("page")),
    ];
    await apply(pg, initial);
    const doomed = op("pages", "doomed", "save", 0, page("doomed"));
    await apply(pg, [doomed]);
    await apply(pg, [op("pages", "doomed", "hard_delete", 1)]);
    const before = await sql(pg, "select row_to_json(t) v from pages t order by id"),
      beforeAttachments = await sql(pg, "select row_to_json(t) v from attachments t order by id"),
      beforeBinaries = await sql(pg, "select * from binaries"),
      beforeTombs = await sql(pg, "select * from workspace_tombstones");
    await pg.exec("reset role");
    await pg.exec(migration);
    await pg.exec("set role authenticated");
    assert.deepEqual(await sql(pg, "select row_to_json(t) v from pages t order by id"), before);
    assert.deepEqual(await sql(pg, "select row_to_json(t) v from attachments t order by id"), beforeAttachments);
    assert.deepEqual(await sql(pg, "select * from binaries"), beforeBinaries);
    assert.deepEqual(await sql(pg, "select * from workspace_tombstones"), beforeTombs);
    const receipts = await apply(pg, initial);
    assert.deepEqual(
      receipts.map((r) => r.revision),
      [2, 2, 1],
    );
    assert.deepEqual((await sql(pg, "select row_to_json(t) v from pages t where id='page'"))[0].v, before[0].v);
    await assert.rejects(
      apply(pg, [{ ...initial[0], value: { ...attachment, name: "tampered" } }]),
      /payload conflict/,
    );
    assert.equal((await apply(pg, [doomed]))[0].hard_deleted, true);
    await assert.rejects(apply(pg, [op("pages", "doomed", "save", 0, page("doomed"))]), /permanently deleted/);
    const saved = await apply(pg, [op("pages", "page", "save", 1, { ...page("page"), title: "legacy updated" })]);
    assert.equal(saved[0].row.character_data.basic.name, "World");
    await apply(pg, [op("pages", "page", "soft_delete", 2)]);
    await assert.rejects(apply(pg, [op("pages", "page", "save", 3, page("page"))]), /explicit restore/);
    await apply(pg, [op("pages", "page", "restore", 3)]);
    assert.equal((await sql(pg, "select deleted_at from pages"))[0].deleted_at, null);
    const binary = { ...op("attachments", "attachment", "binary", 2), data: btoa("next!") };
    await apply(pg, [binary]);
    await apply(pg, [binary]);
    assert.equal((await sql(pg, "select data from binaries"))[0].data, btoa("next!"));
    await assert.rejects(
      apply(pg, [
        { ...op("attachments", "attachment", "binary", 3), data: btoa("wrong") },
        op("pages", "page", "save", 999, page("page")),
      ]),
      /revision conflict/,
    );
    assert.equal((await sql(pg, "select data from binaries"))[0].data, btoa("next!"));
    await apply(pg, [op("attachments", "attachment", "soft_delete", 3)]);
    await assert.rejects(
      apply(pg, [{ ...op("attachments", "attachment", "binary", 4), data: "bad" }]),
      /live attachment/,
    );
    await apply(pg, [op("attachments", "attachment", "restore", 4)]);
    await apply(pg, [op("attachments", "attachment", "hard_delete", 5)]);
    assert.equal((await sql(pg, "select * from binaries")).length, 0);
    assert.equal((await apply(pg, [binary]))[0].hard_deleted, true);
    for (const table of [
      "pages",
      "attachments",
      "binaries",
      "workspace_tombstones",
      "life_lists",
      "life_categories",
      "life_items",
    ]) {
      await assert.rejects(pg.exec("delete from " + table), /permission denied/);
    }
    await assert.rejects(pg.query("select validate_life_workspace($1)", [A]), /permission denied/);
    await actor(pg, B);
    for (const table of [
      "pages",
      "attachments",
      "binaries",
      "workspace_tombstones",
      "life_lists",
      "life_categories",
      "life_items",
    ])
      assert.equal((await sql(pg, "select * from " + table)).length, 0);
    await assert.rejects(apply(pg, [op("pages", "page", "save", 0, page("page"))]), /duplicate|unique|conflict/i);
    await pg.exec("reset role;set role anon");
    await assert.rejects(apply(pg, [initial[0]]), /permission denied/);
  } finally {
    await pg.close();
  }
});

test("new frontend before migration: missing life tables do not prevent legacy page/attachment sync and pending life intents recover after migration", async () => {
  await deleteDB("nexus");
  const pg = await setup(),
    a = await device();
  try {
    await pg.exec("set role authenticated");
    await apply(pg, [
      op("attachments", "attachment", "save", 0, attachment),
      { ...op("attachments", "attachment", "binary", 1), data: btoa("proof") },
    ]);
    const net = client(pg),
      local = a.getWorkspacePersistence();
    await a.createPage({ title: "offline legacy edit", kind: "note" });
    const { lifeBase } = require("../src/features/life/lists.ts");
    const l = { ...lifeBase(A, "Offline list"), fields: [], schema_version: 1 };
    await a.getLifeRepository().save("life_lists", l);
    await pullWorkspace(net, local, A);
    assert.equal(await (await a.readBinary("attachment")).text(), "proof");
    await assert.rejects(flushWorkspace(net, local, A), /Invalid workspace operation/);
    assert.equal((await sql(pg, "select * from pages")).length, 1);
    assert.equal((await a.getLifeRepository().read()).life_lists.length, 1);
    assert.equal((await local.pending(A)).length, 1);
    await pg.exec("reset role");
    await pg.exec(migration);
    await pg.exec("set role authenticated");
    await flushWorkspace(net, local, A);
    assert.equal((await local.pending(A)).length, 0);
    assert.equal((await sql(pg, "select * from life_lists")).length, 1);
    await pg.exec("reset role;revoke select on life_lists from authenticated;set role authenticated");
    await assert.rejects(pullWorkspace(net, local, A), /permission denied/);
    await pg.exec("reset role;grant select on life_lists to authenticated;set role authenticated");
    await pullWorkspace(net, local, A);
  } finally {
    await a.close();
    await deleteDB("nexus");
    await pg.close();
  }
});

test("mixed legacy/life RPC is atomic; typed references, offline conflicts, schema, RLS and old-client tombstone allowlist remain valid", async () => {
  const pg = await setup();
  try {
    await pg.exec(migration);
    await pg.exec("set role authenticated");
    const base = { title: "List", created_at: 1, sort_order: 0, deleted_at: null };
    const l = { ...base, id: "list", schema_version: 1, fields: [{ id: "file", name: "File", type: "attachment" }] },
      c = { ...base, id: "root", list_id: "list", parent_id: null },
      child = { ...base, id: "child", list_id: "list", parent_id: "root" },
      item = {
        ...base,
        id: "item",
        list_id: "list",
        category_id: "child",
        schema_version: 1,
        values: { file: ["attachment"] },
        attachment_ids: ["attachment"],
      };
    const batch = [
      op("attachments", "attachment", "save", 0, attachment),
      { ...op("attachments", "attachment", "binary", 1), data: btoa("proof") },
      op("life_lists", "list", "save", 0, l),
      op("life_categories", "root", "save", 0, c),
      op("life_categories", "child", "save", 0, child),
      op("life_items", "item", "save", 0, item),
      op("pages", "mixed", "save", 0, page("mixed")),
    ];
    await apply(pg, batch);
    await apply(pg, batch);
    assert.equal((await sql(pg, "select count(*)::integer n from life_items"))[0].n, 1);
    await assert.rejects(
      apply(pg, [
        op("pages", "mixed", "save", 1, { ...page("mixed"), title: "rolled back" }),
        op("life_categories", "root", "save", 1, { ...c, parent_id: "child" }),
      ]),
      /cycle/,
    );
    assert.equal((await sql(pg, "select title from pages"))[0].title, "Page");
    await assert.rejects(apply(pg, [op("attachments", "attachment", "hard_delete", 2)]), /Attachment is deleted/);
    assert.equal((await sql(pg, "select data from binaries"))[0].data, btoa("proof"));
    await actor(pg, B);
    await apply(pg, [op("attachments", "foreign-file", "save", 0, { ...attachment, id: "foreign-file" })]);
    for (const table of ["life_lists", "life_categories", "life_items", "pages"])
      assert.equal((await sql(pg, "select * from " + table)).length, 0);
    await assert.rejects(
      apply(pg, [op("life_items", "foreign-item", "save", 0, { ...item, id: "foreign-item" })]),
      /schema/,
    );
    await actor(pg, A);
    await assert.rejects(
      apply(pg, [
        op("life_items", "item", "save", 1, {
          ...item,
          values: { file: ["foreign-file"] },
          attachment_ids: ["foreign-file"],
        }),
      ]),
      /another account/,
    );
    await apply(pg, [op("life_items", "item", "save", 1, { ...item, title: "Device A edit" })]);
    await assert.rejects(
      apply(pg, [op("life_items", "item", "save", 1, { ...item, title: "Offline old edit" })]),
      /revision conflict/,
    );
    assert.equal((await sql(pg, "select title from life_items"))[0].title, "Device A edit");
    await apply(pg, [
      op("life_lists", "list", "save", 1, {
        ...l,
        schema_version: 2,
        fields: [...l.fields, { id: "note", name: "Note", type: "text" }],
      }),
    ]);
    await assert.rejects(apply(pg, [op("life_items", "item", "save", 2, item)]), /schema changed/);
    await apply(pg, [
      op("life_items", "item", "soft_delete", 2),
      op("life_categories", "child", "soft_delete", 1),
      op("life_categories", "root", "soft_delete", 1),
      op("life_lists", "list", "soft_delete", 2),
    ]);
    await assert.rejects(apply(pg, [op("life_lists", "list", "hard_delete", 3)]), /Unsupported/);
    assert.ok(
      (await sql(pg, "select * from workspace_tombstones")).every((r) =>
        ["pages", "attachments"].includes(r.entity_type),
      ),
    );
    await assert.rejects(
      apply(pg, [op("life_items", "item", "save", 3, { ...item, schema_version: 2 })]),
      /explicit restore/,
    );
  } finally {
    await pg.close();
  }
});

test("failed migration rolls back all new tables, publication changes and RPC replacement without touching legacy data", async () => {
  const pg = await setup();
  try {
    await apply(pg, [op("pages", "before-failure", "save", 0, page("before-failure"))]);
    const functionBefore = (
      await sql(pg, "select prosrc from pg_proc where oid='apply_workspace_operations(jsonb)'::regprocedure")
    )[0].prosrc;
    const tablesBefore = await sql(
      pg,
      "select tablename from pg_publication_tables where pubname='supabase_realtime' order by tablename",
    );
    await assert.rejects(pg.exec(migration.replace(/commit;\s*$/i, "select 1/0; commit;")), /division by zero/);
    await pg.exec("rollback");
    assert.equal(
      (await sql(pg, "select prosrc from pg_proc where oid='apply_workspace_operations(jsonb)'::regprocedure"))[0]
        .prosrc,
      functionBefore,
    );
    assert.equal((await sql(pg, "select to_regclass('life_lists')::text v"))[0].v, null);
    assert.equal((await sql(pg, "select to_regprocedure('validate_life_workspace(uuid)')::text v"))[0].v, null);
    assert.deepEqual(
      await sql(pg, "select tablename from pg_publication_tables where pubname='supabase_realtime' order by tablename"),
      tablesBefore,
    );
    assert.equal((await sql(pg, "select title from pages"))[0].title, "Page");
    await apply(pg, [op("pages", "before-failure", "save", 1, { ...page("before-failure"), title: "recovered" })]);
    assert.equal((await sql(pg, "select title from pages"))[0].title, "recovered");
  } finally {
    await pg.close();
  }
});
