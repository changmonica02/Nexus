require("../loadStudy.cjs");
require("fake-indexeddb/auto");
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { PGlite } = require("@electric-sql/pglite"),
  { openDB, deleteDB } = require("idb");
const { IndexedDBAdapter } = require("../../src/infrastructure/storage/IndexedDBAdapter.ts");
const { LIFE_SYNC_STORES } = require("../../src/features/life/syncRecords.ts");
const { initialConfig } = require("../../src/features/life/dashboard/model.ts");
const { LIFE_STORES, lifeBase } = require("../../src/features/life/lists.ts");
const { pullWorkspace, flushWorkspace } = require("../../src/infrastructure/sync/workspaceSync.ts");
const owner = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const migration = "20261103155520_life_custom_lists.sql";
async function setup(beforeAutomation, beforeTaskPlan) {
  const pg = new PGlite();
  await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;
create table pages(id text primary key,owner_id uuid,title text,content_json jsonb,content_text text,kind text,due_date bigint,completed boolean,priority text,format text,device_id text,tags jsonb,folder text,links jsonb,attachment_ids jsonb,primary_attachment_id text,parent_id text,revision bigint,created_at bigint,updated_at bigint,deleted_at bigint);
create table attachments(id text primary key,owner_id uuid,kind text,name text,mime_type text,size_bytes bigint,storage_key text,device_id text,created_at bigint,updated_at bigint,deleted_at bigint);
create table binaries(id text primary key,owner_id uuid,data text,updated_at bigint);
alter table pages enable row level security;alter table attachments enable row level security;alter table binaries enable row level security;
create policy pages_read on pages for select using(owner_id=auth.uid());create policy attachments_read on attachments for select using(owner_id=auth.uid());create policy binaries_read on binaries for select using(owner_id=auth.uid());grant select on pages,attachments,binaries to authenticated;`);
  await pg.exec(fs.readFileSync("supabase/migrations/20261008_workspace_delete_protection.sql", "utf8"));
  await pg.exec(fs.readFileSync("supabase/migrations/" + migration, "utf8"));
  await pg.exec(fs.readFileSync("supabase/migrations/20261126140000_life_time_foundation.sql", "utf8"));
  await pg.exec(fs.readFileSync("supabase/migrations/20261126150000_life_finance_periods.sql", "utf8"));
  await pg.exec(fs.readFileSync("supabase/migrations/20261126160000_life_health_core.sql", "utf8"));
  await pg.exec(fs.readFileSync("supabase/migrations/20261126170000_life_sensitive_health.sql", "utf8"));
  await pg.exec(fs.readFileSync("supabase/migrations/20261126171000_life_list_field_types.sql", "utf8"));
  await pg.exec(fs.readFileSync("supabase/migrations/20261126180000_life_list_configuration.sql", "utf8"));
  await pg.exec(fs.readFileSync("supabase/migrations/20261127000000_life_automation_schedule.sql", "utf8"));
  await pg.query("insert into auth.users values($1),($2)", [owner, other]);
  await beforeAutomation?.(pg);
  await pg.exec(fs.readFileSync("supabase/migrations/20261127020000_life_automation_task.sql", "utf8"));
  await pg.exec(fs.readFileSync("supabase/migrations/20261127030000_life_automation_runs.sql", "utf8"));
  await pg.exec(fs.readFileSync("supabase/migrations/20261127040000_life_automation_actions.sql", "utf8"));
  await beforeTaskPlan?.(pg);
  await pg.exec(fs.readFileSync("supabase/migrations/20261128010000_life_task_executions.sql", "utf8"));
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
        ...LIFE_SYNC_STORES,
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
            pg.query(`select to_jsonb(row_alias) as record from "${table}" row_alias where ${conditions.join(" and ")} order by id`, args).then(
              (r) => resolve({ data: r.rows.map(row => row.record) }),
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


test("mixed life sync preserves legacy configuration, revision conflicts, scheduled events and RLS", async () => {
  const pg = await setup(), a = await device(), b = await device();
  try {
    const server = client(pg), localA = a.getWorkspacePersistence(), localB = b.getWorkspacePersistence();
    const sync = async local => { await pullWorkspace(server, local, owner); await flushWorkspace(server, local, owner); };
    const config = initialConfig();
    config.boards[0].name = "我的生活";
    config.reminders = {lead:3,rules:[{id:"check",title:"檢查行程",start:"2026-11-26",interval:7,enabled:true}],
      status:{"reminder-example":{priority:3,handled:true}}};
    config.hiddenModules = ["lists"];
    await a.getLifeRepository().saveDashboard(config);
    assert.equal((await localA.pending(owner)).length, 0);
    await sync(localA);
    await sync(localB);
    assert.deepEqual(await b.getLifeRepository().readDashboard(), config);

    const event = {
      id: "appointment", workspace_owner_id: owner, revision: 0, created_at: 1, updated_at: 1, deleted_at: null,
      title: "討論", starts_at: 100000, ends_at: 200000, all_day: false, category: "工作", notes: "會議室",
    };
    await a.getLifeRepository().saveSchedule(event);
    assert.equal((await b.getLifeRepository().readSchedule()).length, 0);
    await sync(localA);
    await sync(localB);
    const [remote] = await b.getLifeRepository().readSchedule();
    assert.equal(remote.title, "討論");
    assert.equal(remote.notes, "會議室");
    await b.getLifeRepository().saveSchedule(remote, true);
    await sync(localB);
    await sync(localA);
    assert.deepEqual(await a.getLifeRepository().readSchedule(), []);

    const habit = {
      id: "reading", workspace_owner_id: owner, revision: 0, created_at: 1, updated_at: 1, deleted_at: null,
      title: "閱讀", cadence: "weekly", goal: 3, started_on: "2026-11-23", quantities: { "2026-11-24": 2 },
    };
    await a.getLifeRepository().saveHabit(habit);
    await sync(localA);
    await sync(localB);
    const [reading] = await b.getLifeRepository().readHabits();
    assert.deepEqual(reading.quantities, { "2026-11-24": 2 });
    await b.getLifeRepository().saveHabit({ ...reading, quantities: { ...reading.quantities, "2026-11-25": 1 } });
    await sync(localB);
    await sync(localA);
    assert.equal((await a.getLifeRepository().readHabits())[0].quantities["2026-11-25"], 1);

    await a.getLifeRepository().saveDashboard({ ...config, hiddenModules: [], boards: [{ ...config.boards[0], name: "裝置 A" }] });
    await b.getLifeRepository().saveDashboard({ ...config, hiddenModules: ["tasks"], boards: [{ ...config.boards[0], name: "裝置 B" }] });
    await sync(localA);
    await assert.rejects(sync(localB), /revision conflict/);
    assert.equal(await b.getLifeRepository().dashboardConflict(), true);
    assert.equal(await b.getLifeRepository().resolveDashboard(true), undefined);
    await sync(localB);
    await sync(localA);
    const resolved = await a.getLifeRepository().readDashboard();
    assert.deepEqual(resolved.hiddenModules, ["tasks"]);
    assert.deepEqual(resolved.boards.map(board => board.name), ["裝置 B", "裝置 A（復原）"]);
    const backup = await a.exportWorkspaceBackup();
    assert.equal(backup.life_habits[0].title, "閱讀");
    assert.deepEqual(backup.settings.find(item => item.key.includes("nexus-life-dashboard")).value, resolved);

    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
    await pg.exec("set role authenticated");
    assert.equal((await pg.query("select * from life_dashboard_configs")).rows.length, 0);
    assert.equal((await pg.query("select * from life_schedule_events")).rows.length, 0);
    assert.equal((await pg.query("select * from life_habits")).rows.length, 0);
    await assert.rejects(pg.query("delete from life_schedule_events"), /permission denied/);
  } finally { await a.close(); await b.close(); await pg.close(); }
});

test("finance records, timer history and subscription receipts sync with two device caches",async()=>{
  const {financeRow,financeRows}=require("../../src/features/life/finance/model.ts");
  const pg=await setup(),a=await device(),b=await device();
  const server=client(pg);
  const sync=async storage=>{
    const local=storage.getWorkspacePersistence();
    await pullWorkspace(server,local,owner);await flushWorkspace(server,local,owner);
  };
  try{
    const source=a.getLifeRepository();
    const common={title:"資料",notes:""};
    const account=financeRow(owner,"account",{...common,type:"bank",currency:"TWD",opening:"30000",icon:"",color:"#000000",archived:false,
      limit:"0",statementDay:1,paymentDay:5,due:""},"bank");
    await source.saveFinance(account);
    await source.saveFinance(financeRow(owner,"subscription",{...common,currency:"TWD",amount:"15000",cycle:"month",interval:1,anchorDay:31,
      next:"2026-01-31",account:"bank",category:"訂閱",state:"active",trial:"",url:"",icon:""},"sub"));
    const result={id:"timer-complete",ended_at:Date.now(),elapsed_ms:1000,mode:"stopwatch",task_id:null,study_session_id:null,
      workspace_owner_id:owner,revision:0,created_at:1,updated_at:1,deleted_at:null};
    await Promise.all([source.saveTimerResult(result),source.saveTimerResult(result)]);
    await sync(a);await sync(b);
    const target=b.getLifeRepository();
    assert.equal((await target.readTimerHistory()).length,1);
    assert.equal((await target.readFinance()).length,2);
    const row=financeRows(await target.readFinance(),"subscription")[0];
    await target.confirmSubscription(row,"2026-01-31");
    await sync(b);await sync(a);
    const rows=await source.readFinance();
    assert.equal(financeRows(rows,"subscription")[0].payload.next,"2026-02-28");
    assert.equal(financeRows(rows,"transaction")[0].payload.source,"sub|2026-01-31");
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
    await pg.exec("set role authenticated");
    assert.equal((await pg.query("select * from life_finance_records")).rows.length,0);
    assert.equal((await pg.query("select * from life_timer_results")).rows.length,0);
    await assert.rejects(pg.query("update life_finance_records set revision=1"),/permission denied/);
  }finally{await a.close();await b.close();await pg.close();}
});

test("health records sync between devices, isolate owners and delete without retaining the payload", async () => {
  const { makeHealth } = require("../../src/features/life/health/model.ts");
  const pg = await setup(), a = await device(), b = await device();
  const remote = client(pg);
  const sync = async storage => {
    const local = storage.getWorkspacePersistence();
    await pullWorkspace(remote, local, owner);
    await flushWorkspace(remote, local, owner);
  };
  try {
    const source = a.getLifeRepository(), target = b.getLifeRepository();
    await source.saveHealth(makeHealth(owner, "water", { date: "2026-11-26", time: "08:00", amount: 250 }));
    await sync(a);
    await sync(b);
    const [row] = await target.readHealth();
    assert.equal(row.data.amount, 250);
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
    await pg.exec("set role authenticated");
    assert.equal((await pg.query("select id from life_health_records")).rows.length, 0);
    await assert.rejects(pg.exec("delete from life_health_records"), /permission denied/);
    await pg.exec("reset role");
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
    await target.saveHealth(row, true);
    await sync(b);
    await sync(a);
    assert.deepEqual(await source.readHealth(), []);
    assert.equal((await pg.query("select id from life_health_records")).rows.length, 0);
  } finally {
    await a.close();
    await b.close();
    await pg.close();
  }
});

test("extended custom fields synchronize through the SQL validator", async () => {
  const pg=await setup(), a=await device(), b=await device(), remote=client(pg);
  try {
    const lists=a.getLifeRepository();
    const fields=[
      {id:"time",name:"時間",type:"time"},
      {id:"url",name:"網址",type:"url"},
      {id:"rating",name:"評分",type:"rating"},
      {id:"duration",name:"時長",type:"duration"},
      {id:"tags",name:"標籤",type:"multiselect",options:["假日","閱讀"]},
    ];
    const list={...lifeBase(owner,"日記"),fields,schema_version:1};
    const values={time:"09:30",url:"https://example.com",rating:4,duration:25.5,tags:["閱讀"]};
    await lists.save("life_lists",list);
    await lists.save("life_items",{...lifeBase(owner,"測試紀錄"),list_id:list.id,category_id:null,schema_version:1,values,attachment_ids:[]});
    await flushWorkspace(remote,a.getWorkspacePersistence(),owner);
    await pullWorkspace(remote,b.getWorkspacePersistence(),owner);
    assert.deepEqual((await b.getLifeRepository().read()).life_items[0].values,values);
  } finally {
    await a.close();
    await b.close();
    await pg.close();
  }
});

test("list configuration syncs and required fields protect new edits without rewriting old items", async () => {
  const pg=await setup(), a=await device(), b=await device(), remote=client(pg);
  try {
    const source=a.getLifeRepository();
    const row={...lifeBase(owner,"驗證清單"),schema_version:1,fields:[{id:"name",name:"名稱",type:"text",required:true}],
      configuration:{icon:"★",cover:"sage",statistics:[{id:"daily",title:"每日",field:"",start:"",end:"",group:"day",chart:"numbers"}]}};
    await source.save("life_lists",row);
    const item={...lifeBase(owner,"資料"),list_id:row.id,category_id:null,schema_version:1,values:{},attachment_ids:[]};
    await assert.rejects(source.save("life_items",item),/必要欄位/);
    await flushWorkspace(remote,a.getWorkspacePersistence(),owner);
    await assert.rejects(rpc(pg,"life_items",item),/Missing required list field/);
    await source.save("life_items",{...item,values:{name:"已填"}});
    await flushWorkspace(remote,a.getWorkspacePersistence(),owner);
    await pullWorkspace(remote,b.getWorkspacePersistence(),owner);
    const target=await b.getLifeRepository().read();
    assert.deepEqual(target.life_lists[0].configuration,row.configuration);
    assert.equal(target.life_items[0].values.name,"已填");
  } finally {
    await a.close();await b.close();await pg.close();
  }
});

test("type conversion copies compatible values and keeps archived source data across sync",async()=>{
  const pg=await setup(),a=await device(),b=await device(),remote=client(pg);
  try{
    const source=a.getLifeRepository();
    const row={...lifeBase(owner,"欄位轉換"),schema_version:1,fields:[{id:"cost",name:"金額",type:"text"}]};
    await source.save("life_lists",row);
    await source.save("life_items",{...lifeBase(owner,"記錄"),list_id:row.id,category_id:null,schema_version:1,values:{cost:"12.25"},attachment_ids:[]});
    const current=await source.read();
    await source.convertField(current.life_lists[0],"cost","number",current.life_items);
    await flushWorkspace(remote,a.getWorkspacePersistence(),owner);
    await pullWorkspace(remote,b.getWorkspacePersistence(),owner);
    const target=await b.getLifeRepository().read();
    const [old,replacement]=target.life_lists[0].fields;
    assert.equal(old.archived,true);
    assert.equal(replacement.type,"number");
    assert.equal(target.life_items[0].values.cost,"12.25");
    assert.equal(target.life_items[0].values[replacement.id],12.25);
  }finally{await a.close();await b.close();await pg.close();}
});

test("automation retries from two offline devices preserve one schedule and acknowledge both queues", async()=>{
  const pg=await setup(),a=await device(),b=await device();
  try{
    const occurrence={id:'["rule","example","2026-11-27"]',day:"2026-11-27",title:"整理物品",source:"自訂規則",priority:1};
    const remote=client(pg), localA=a.getWorkspacePersistence(),localB=b.getWorkspacePersistence();
    await assert.rejects(a.getLifeRepository().executeScheduleRule({...occurrence,title:""}));
    assert.ok((await a.getLifeRepository().readAutomationRuns())[0].error);
    await a.getLifeRepository().executeScheduleRule(occurrence);
    assert.equal((await a.getLifeRepository().readAutomationRuns())[0].error,undefined);
    await b.getLifeRepository().executeScheduleRule(occurrence);
    assert.equal((await b.getLifeRepository().readAutomationRuns())[0].id,occurrence.id);
    b.setWorkspaceOwner(other);
    assert.deepEqual(await b.getLifeRepository().readAutomationRuns(),[]);
    b.setWorkspaceOwner(owner);
    await flushWorkspace(remote,localA,owner);
    await flushWorkspace(remote,localB,owner);
    assert.equal((await localB.pending(owner)).length,0);
    const rows=await b.getLifeRepository().readSchedule();
    assert.equal(rows.length,1);
    assert.equal(rows[0].revision,1);
    assert.equal(rows[0].title,"整理物品");
    await b.getLifeRepository().saveSchedule(rows[0],true);
    await flushWorkspace(remote,localB,owner);
    await b.getLifeRepository().runScheduleAutomation(occurrence);
    assert.equal((await localB.pending(owner)).length,0);
    assert.deepEqual(await b.getLifeRepository().readSchedule(),[]);
  }finally{await a.close();await b.close();await pg.close();}
});

test("automation tasks synchronize once and stay deleted when an offline device retries", async()=>{
  const pg=await setup(),a=await device(),b=await device(),c=await device();
  try{
    const occurrence={id:"task-occurrence",day:"2026-11-27",title:"整理物品",source:"自訂規則",priority:1};
    const remote=client(pg);
    const repoA=a.getLifeRepository(),repoB=b.getLifeRepository(),repoC=c.getLifeRepository();
    const localA=a.getWorkspacePersistence(),localB=b.getWorkspacePersistence(),localC=c.getWorkspacePersistence();
    await Promise.all([repoA.executeTaskRule(occurrence),repoA.executeTaskRule(occurrence)]);
    assert.equal((await localA.pending(owner)).filter(batch=>batch.operations.some(op=>op.entity_type==="pages")).length,1);
    await repoB.executeTaskRule({...occurrence,title:"另一裝置"});
    await flushWorkspace(remote,localA,owner);
    await flushWorkspace(remote,localB,owner);
    assert.equal((await localB.pending(owner)).length,0);
    const task=(await b.listPages()).find(page=>page.kind==="todo");
    assert.equal(task.title,occurrence.title);
    await repoC.executeTaskRule(occurrence);
    await b.deletePage(task.id);
    await b.permanentDeletePage(task.id);
    await flushWorkspace(remote,localB,owner);
    await flushWorkspace(remote,localC,owner);
    assert.equal((await localC.pending(owner)).length,0);
    assert.equal(await c.getPage(task.id),null);
    await repoC.executeTaskRule(occurrence);
    assert.ok((await localC.pending(owner)).every(batch=>batch.operations.every(op=>op.entity_type==="life_automation_runs")));
  }finally{await a.close();await b.close();await c.close();await pg.close();}
});

test("automation estimates, relations, and task field updates reconcile across offline devices", async()=>{
  const pg=await setup(),a=await device(),b=await device();
  try{
    const remote=client(pg), localA=a.getWorkspacePersistence(),localB=b.getWorkspacePersistence();
    const repoA=a.getLifeRepository(),repoB=b.getLifeRepository();
    const occurrence={id:"automation-actions",day:"2026-11-27",title:"讀書設備",source:"自訂規則",priority:1};
    const base={id:"rule",title:"讀書設備",enabled:true,start:occurrence.day,interval:1};
    const task=await a.createPage({kind:"todo",title:"確認採購"});
    const list={...lifeBase(owner,"採購清單"),schema_version:1,fields:[{id:"linked",name:"待辦",type:"text",relation:"task",required:true}]};
    await repoA.save("life_lists",list);
    await flushWorkspace(remote,localA,owner);
    await pullWorkspace(remote,localB,owner);

    const estimate={...base,action:"estimate",currency:"USD",amount:"32.50"};
    const relation={...base,action:"relation",destinationList:list.id,relationField:"linked",relationId:task.id};
    const update={...base,action:"update-task",updateTask:task.id,updateField:"priority",updateValue:"high"};
    for(const repo of [repoA,repoB]){
      await repo.executeRule(occurrence,estimate);
      await repo.executeRule(occurrence,relation);
      await repo.executeRule(occurrence,update);
    }
    await flushWorkspace(remote,localA,owner);
    await flushWorkspace(remote,localB,owner);
    const finances=await repoB.readFinance();
    assert.equal(finances.length,1);
    assert.deepEqual(finances.map(row=>[row.kind,row.payload.amount,row.payload.currency]),[["estimate","3250","USD"]]);
    const { financeTotals }=require("../../src/features/life/finance/ledger.ts");
    assert.equal(financeTotals(finances,"2026-11-01","2026-11-30").expense,0n);
    const {life_items:items}=await repoB.read();
    assert.equal(items.length,1);
    assert.equal(items[0].values.linked,task.id);
    assert.equal((await b.getPage(task.id)).priority,"high");
    assert.equal((await b.getPage(task.id)).title,"確認採購");

    const complete={...update,updateField:"completed",updateValue:"true"};
    const attempt={...occurrence,id:"retry-action"};
    await assert.rejects(repoA.executeRule(attempt,{...complete,updateTask:"missing"}),/待辦不存在/);
    await flushWorkspace(remote,localA,owner);
    await pullWorkspace(remote,localB,owner);
    assert.match((await repoB.readAutomationRuns()).find(run=>run.id==="update-task:retry-action").error,/待辦不存在/);
    await repoB.executeRule(attempt,complete);
    await flushWorkspace(remote,localB,owner);
    await pullWorkspace(remote,localA,owner);
    assert.equal((await a.getPage(task.id)).completed,true);
    assert.equal((await repoA.readAutomationRuns()).find(run=>run.id==="update-task:retry-action").error,undefined);
    const collision={...occurrence,id:"conflicting-priority"};
    await repoA.executeRule(collision,{...update,updateValue:"low"});
    await repoB.executeRule(collision,{...update,updateValue:"medium"});
    await flushWorkspace(remote,localA,owner);
    await flushWorkspace(remote,localB,owner);
    assert.equal((await b.getPage(task.id)).priority,"low");
    assert.equal((await localB.pending(owner)).length,0);
    // Each device has a distinct attempt for this rule. Its successful result
    // takes precedence after a pull, but the rejected attempt remains recorded.
    await pullWorkspace(remote,localB,owner);
    const history=(await repoB.readAutomationRuns()).find(run=>run.id==="update-task:conflicting-priority");
    assert.equal(history.attempts,2);
    assert.match(history.previousError,/其他裝置更新/);
    const relationRace={...occurrence,id:"deleted-relation-source"};
    await repoB.executeRule(relationRace,relation);
    await a.deletePage(task.id);
    await flushWorkspace(remote,localA,owner);
    await flushWorkspace(remote,localB,owner);
    assert.equal((await localB.pending(owner)).length,0);
    assert.equal((await repoB.read()).life_items.length,1);
    const relationFailure=(await repoB.readAutomationRuns()).find(run=>run.id==="relation:deleted-relation-source");
    assert.match(relationFailure.error,/關聯來源已刪除/);
    await pullWorkspace(remote,localA,owner);
    assert.match((await repoA.readAutomationRuns()).find(run=>run.id==="relation:deleted-relation-source").error,/關聯來源已刪除/);

    // A real authenticated select is owner-scoped even without an explicit filter.
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
    await pg.exec("set role authenticated");
    assert.equal((await pg.query("select count(*)::int as n from public.life_automation_runs")).rows[0].n,0);
    await pg.exec("reset role");
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
    b.setWorkspaceOwner(other);
    await assert.rejects(repoB.readAutomationRuns(),/帳號已切換/);
    await pullWorkspace(remote,localB,other);
    assert.deepEqual(await b.getLifeRepository().readAutomationRuns(),[]);
  }finally{await a.close();await b.close();await pg.close();}
});

test("automation migrations preserve prior data and fold device-local legacy runs into the owner workspace", async()=>{
  const pg=await setup(pg=>pg.query("insert into pages(id,owner_id,title,kind,revision,created_at,updated_at) values('existing-todo',$1,'保留既有待辦','todo',1,100,100)",[owner]));
  const a=await device(),b=await device();
  try{
    const remote=client(pg),localA=a.getWorkspacePersistence(),localB=b.getWorkspacePersistence();
    const legacy={id:'["rule","legacy","2026-11-26"]',title:"既有執行",day:"2026-11-26",at:42};
    const key="life-automation-runs:"+JSON.stringify(owner);
    for(const device of [a,b]){
      await device.db.put("settings",{key,owner_id:owner,value:[legacy]});
      assert.equal((await device.getLifeRepository().readAutomationRuns())[0].id,legacy.id);
      assert.equal(await device.db.get("settings",key),undefined);
    }
    await flushWorkspace(remote,localA,owner);
    await flushWorkspace(remote,localB,owner);
    await pullWorkspace(remote,localB,owner);
    assert.equal((await b.getLifeRepository().readAutomationRuns())[0].attempts,1);
    assert.equal((await b.getPage("existing-todo")).title,"保留既有待辦");
    assert.equal((await pg.query("select count(*)::int as n from public.life_automation_runs")).rows[0].n,1);
  }finally{await a.close();await b.close();await pg.close();}
});

test("calendar repeat migration retains legacy tracking IDs, history and owner isolation", async () => {
  const pg = await setup(), a = await device(), b = await device();
  try {
    const server = client(pg);
    const repo = a.getLifeRepository();
    await repo.saveHabit({
      id: "legacy-reading", workspace_owner_id: owner, revision: 0, created_at: 1, updated_at: 1, deleted_at: null,
      title: "閱讀", cadence: "weekly", goal: 3, started_on: "2026-11-23", quantities: { "2026-11-24": 2 },
    });
    const syncA = a.getWorkspacePersistence(), syncB = b.getWorkspacePersistence();
    await flushWorkspace(server, syncA, owner);
    const before = (await pg.query("select * from life_habits where id='legacy-reading'")).rows;
    await pg.exec(fs.readFileSync("supabase/migrations/20261128000000_life_calendar_repeat_modes.sql", "utf8"));
    assert.deepEqual((await pg.query("select * from life_habits where id='legacy-reading'")).rows, before);
    const [legacy] = await repo.readHabits();
    await repo.saveHabit({ ...legacy, id: "monthly-reading", revision: 0, cadence: "monthly" });
    const task = await a.createPage({ kind: "todo", title: "完成後再安排", task_repeat: "after_completion", task_repeat_day: 3 });
    await flushWorkspace(server, syncA, owner);
    await pullWorkspace(server, syncB, owner);
    assert.equal((await b.getLifeRepository().readHabits()).find(row => row.id === "monthly-reading")?.cadence, "monthly");
    assert.equal((await b.getPage(task.id)).task_repeat, "after_completion");
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
    await pg.exec("set role authenticated");
    assert.equal((await pg.query("select id from life_habits")).rows.length, 0);
    assert.equal((await pg.query("select id from pages")).rows.length, 0);
  } finally {
    a.db.close();
    b.db.close();
    await pg.close();
  }
});

test("task execution migration is repeatable and preserves occurrence identity across devices", async () => {
  const pg=await setup(), a=await device(), b=await device();
  const { defaultTaskSettings, editTaskPlan, taskSlots }=require("../../src/features/life/taskPlan.ts");
  try {
    await pg.exec(fs.readFileSync("supabase/migrations/20261128010000_life_task_executions.sql","utf8"));
    const server=client(pg), localA=a.getWorkspacePersistence(),localB=b.getWorkspacePersistence();
    const settings=defaultTaskSettings(new Date(2026,10,27));
    settings.recurrence={mode:"fixed",rule:{frequency:"day",interval:1,weekdays:[],count:3,until:"",zone:settings.zone,exceptions:[],overrides:{}}};
    const task_plan=editTaskPlan({segments:[],excluded:[],overrides:{}},undefined,"all",settings);
    const page=await a.createPage({kind:"todo",title:"閱讀",task_plan});
    await flushWorkspace(server,localA,owner);
    await pullWorkspace(server,localB,owner);
    const remote=await b.getPage(page.id);
    assert.deepEqual(remote.task_plan,task_plan);
    const [first,second]=taskSlots(task_plan,[],"2026-11-27","2026-11-29");
    await a.getLifeRepository().saveTaskExecution(page,first,"complete",1);
    await b.getLifeRepository().saveTaskExecution(remote,first,"complete",1);
    await flushWorkspace(server,localA,owner);
    await flushWorkspace(server,localB,owner);
    await b.getLifeRepository().saveTaskExecution(remote,second,"skipped",0);
    await flushWorkspace(server,localB,owner);
    await pullWorkspace(server,localA,owner);
    const records=await a.getLifeRepository().readTaskExecutions();
    assert.equal(records.length,2);
    assert.deepEqual(taskSlots(task_plan,records,"2026-11-27","2026-11-29").map(row=>row.status),["complete","skipped","pending"]);
    const backup=await a.exportWorkspaceBackup();
    assert.equal(backup.life_task_executions.length,2);
    const restored=await device();
    try{
      await restored.importWorkspaceBackup(backup);
      assert.deepEqual((await restored.getLifeRepository().readTaskExecutions()).map(row=>row.id).sort(),records.map(row=>row.id).sort());
      assert.deepEqual((await restored.getPage(page.id)).task_plan,task_plan);
    }finally{restored.db.close();}
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
    await pg.exec("set role authenticated");
    assert.equal((await pg.query("select id from life_task_executions")).rows.length,0);
  } finally { a.db.close(); b.db.close(); await pg.close(); }
});

test("adopting a legacy habit keeps its ID, dated source and health link while importing independent periods",async()=>{
  const pg=await setup(),a=await device(),b=await device();
  try{
    const repo=a.getLifeRepository(),server=client(pg),local=a.getWorkspacePersistence();
    await repo.saveHabit({id:"habit-same-id",workspace_owner_id:owner,revision:0,created_at:1,updated_at:1,deleted_at:null,
      title:"閱讀",cadence:"weekly",goal:3,started_on:"2026-11-23",quantities:{"2026-11-23":1,"2026-11-24":2,"2026-11-30":1}});
    await repo.saveHealth({id:"reading-goal",workspace_owner_id:owner,revision:0,created_at:1,updated_at:1,deleted_at:null,
      kind:"goal",data:{title:"閱讀目標",metric:"custom",mode:"increase",date:"2026-11-23",until:"2026-12-31",
        baseline:0,target:6,current:1,habit:"habit-same-id"}});
    await flushWorkspace(server,local,owner);
    const [habit]=await repo.readHabits();
    const task=await repo.adoptHabit(habit);
    assert.equal(task.id,habit.id);
    assert.equal((await repo.adoptHabit(habit)).id,task.id);
    await flushWorkspace(server,local,owner);
    await pullWorkspace(server,b.getWorkspacePersistence(),owner);
    const cloud=b.getLifeRepository();
    assert.deepEqual((await cloud.readHabits())[0].quantities,habit.quantities);
    assert.equal((await cloud.readHealth())[0].data.habit,habit.id);
    assert.deepEqual((await cloud.readTaskExecutions()).map(row=>[row.day,row.status,row.amount,row.completed_at]).sort(),
      [["2026-11-23","complete",3,null],["2026-11-30","partial",1,null]]);
  }finally{a.db.close();b.db.close();await pg.close();}
});

test("empty execution schema can roll back to the prior sync function without affecting legacy schedules",async()=>{
  let before;
  const pg=await setup(undefined,async db=>{
    before=(await db.query("select pg_get_functiondef('public.apply_workspace_operations(jsonb)'::regprocedure) as definition")).rows[0].definition;
    await db.query("insert into public.life_habits(owner_id,id,revision,created_at,updated_at,title,cadence,goal,started_on,quantities) values($1,'prior',1,0,0,'閱讀','daily',1,'2026-11-27','{}')",[owner]);
  });
  try{
    assert.equal((await pg.query("select count(*)::int as count from public.life_task_executions")).rows[0].count,0);
    await pg.exec("begin;"+before+"; drop table public.life_task_executions; alter table public.pages drop column task_plan; commit;");
    assert.equal((await pg.query("select pg_get_functiondef('public.apply_workspace_operations(jsonb)'::regprocedure) as definition")).rows[0].definition,before);
    assert.equal((await pg.query("select title from public.life_habits where id='prior'")).rows[0].title,"閱讀");
  }finally{await pg.close();}
});
