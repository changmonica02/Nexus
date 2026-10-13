require('./loadStudy.cjs');
require('fake-indexeddb/auto');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { openDB, deleteDB } = require('idb');
const { WorkspacePersistence, WORKSPACE_STORES } = require('../src/infrastructure/sync/workspacePersistence.ts');
const { pullWorkspace, flushWorkspace, readWorkspaceRows, remoteResult } = require('../src/infrastructure/sync/workspaceSync.ts');
const { IndexedDBAdapter } = require('../src/infrastructure/storage/IndexedDBAdapter.ts');
const { SyncEngine } = require('../src/infrastructure/sync/syncEngine.ts');

const owner = 'user-a';
const page = (id = 'page-a') => ({ id, title: id, content_json: {}, content_text: '', default_mode: 'note', kind: 'note', created_at: 1, updated_at: 1, deleted_at: null, revision: 1, device_id: 'device', workspace_owner_id: owner });
const attachment = (id = 'att-a') => ({ id, kind: 'file', name: id, mime_type: 'text/plain', storage_key: id, size_bytes: 4, created_at: 1, updated_at: 1, deleted_at: null, device_id: 'device', workspace_owner_id: owner });
async function device(t) {
  const name = crypto.randomUUID();
  let db = await openDB(name, 7, { upgrade(db) {
    for (const name of ['pages', 'attachments', 'binaries', ...WORKSPACE_STORES]) {
      const store = db.createObjectStore(name, { keyPath: 'id' });
      if (name === 'pages' || name === 'attachments') store.createIndex('by_updated', 'updated_at');
    }
    db.createObjectStore('settings', { keyPath: 'key' });
  } });
  t.after(async () => { db.close(); await deleteDB(name); });
  const adapter = new IndexedDBAdapter(); adapter.db = db; adapter.setWorkspaceOwner(owner);
  return { get db() { return db; }, adapter, local: new WorkspacePersistence(db), async reopen() {
    db.close(); db = await openDB(name, 7); adapter.db = db; return new WorkspacePersistence(db);
  } };
}

// Contract double for network/lost-response tests, not a substitute for PostgreSQL
// migration execution (intentionally not performed by this test suite).
class Server {
  rows = { pages: new Map(), attachments: new Map(), binaries: new Map(), workspace_tombstones: new Map() };
  receipts = new Map(); calls = []; limit = 2; offline = false; loseResponse = false; binaryDeleteFails = false;
  from(table) {
    const server = this, filters = [], state = { limit: Infinity, cursor: null };
    const query = {
      select() { return this; }, eq(k, v) { filters.push([k, v]); return this; },
      order() { return this; }, limit(n) { state.limit = n; return this; }, gt(k, v) { state.cursor = [k, v]; return this; },
      async then(resolve, reject) {
        try {
          server.calls.push(`pull:${table}`);
          if (server.offline) return resolve({ data: null, error: { message: 'offline' } });
          const data = [...server.rows[table].values()].filter(row => filters.every(([k, v]) => row[k] === v)
            && (!state.cursor || String(row[state.cursor[0]]).localeCompare(state.cursor[1]) > 0)).sort((a, b) => a.id.localeCompare(b.id))
            .slice(0, Math.min(state.limit, server.limit));
          resolve({ data, error: null });
        } catch (e) { reject(e); }
      },
      async maybeSingle() { const { data, error } = await this; return { data: data?.[0] ?? null, error }; },
    };
    return query;
  }
  async rpc(name, { operations }) {
    assert.equal(name, 'apply_workspace_operations'); this.calls.push('rpc');
    if (this.offline) return { error: { message: 'offline' } };
    const rows = structuredClone(this.rows), receipts = structuredClone(this.receipts), results = [];
    try {
      for (const op of operations) {
        const key = `${op.entity_type}:${op.entity_id}`, receipt = receipts.get(op.id), table = rows[op.entity_type];
        let row = table.get(op.entity_id), tomb = rows.workspace_tombstones.get(key);
        if (receipt) {
          if (receipt.payload !== JSON.stringify(op)) throw Error('Operation ID payload conflict');
          results.push(tomb ? { ...tomb, hard_deleted: true } : { ...remoteResult(op.entity_type, row) }); continue;
        }
        if (tomb) throw Error('Workspace object permanently deleted');
        if (row && row.owner_id !== owner) throw Error('ownership');
        if ((row?.revision ?? 0) !== op.expected_revision) throw Error('Workspace revision conflict');
        if (!row && op.kind !== 'save') throw Error('Workspace object not found');
        const revision = (row?.revision ?? 0) + 1;
        let result;
        if (op.kind === 'hard_delete') {
          if (op.entity_type === 'attachments' && this.binaryDeleteFails) throw Error('binary delete failed');
          tomb = { id: key, owner_id: owner, entity_type: op.entity_type, entity_id: op.entity_id, revision, deleted_at: 100 };
          rows.workspace_tombstones.set(key, tomb); table.delete(op.entity_id);
          if (op.entity_type === 'attachments') rows.binaries.delete(op.entity_id);
          result = { ...tomb, hard_deleted: true };
        } else {
          if (op.kind === 'save') {
            if (row?.deleted_at != null || op.value.deleted_at != null) throw Error('explicit restore required');
            const { workspace_owner_id, ...value } = op.value;
            row = { ...value, owner_id: owner, revision, updated_at: 100 };
          } else {
            row = { ...row, revision, updated_at: 100, deleted_at: op.kind === 'restore' ? null : op.kind === 'soft_delete' ? 100 : row.deleted_at };
            if (op.kind === 'binary') {
              if (row.deleted_at != null) throw Error('attachment deleted');
              rows.binaries.set(row.id, { id: row.id, owner_id: owner, data: op.data });
            }
          }
          table.set(row.id, row); result = remoteResult(op.entity_type, row);
        }
        receipts.set(op.id, { payload: JSON.stringify(op) }); results.push(result);
      }
      this.rows = rows; this.receipts = receipts;
      if (this.loseResponse) { this.loseResponse = false; throw Error('response lost'); }
      return { data: results, error: null };
    } catch (error) { return { data: null, error: { message: error.message } }; }
  }
}
async function create(d, s, value = page(), type = 'pages') {
  await d.local.mutate(owner, [{ type, kind: 'save', value }]);
  await flushWorkspace(s, d.local, owner);
}

test('hard delete: stale offline device cannot resurrect a page; tombstone wins locally and blocks RPC', async t => {
  const a = await device(t), b = await device(t), s = new Server();
  await create(a, s); await pullWorkspace(s, b.local, owner);
  await a.adapter.permanentDeletePage('page-a'); await flushWorkspace(s, a.local, owner);
  await b.adapter.savePage({ ...page(), title: 'stale change' });
  await pullWorkspace(s, b.local, owner);
  assert.equal(await b.adapter.getPage('page-a'), null);
  await assert.rejects(flushWorkspace(s, b.local, owner), /permanently deleted/);
  assert.equal(s.rows.pages.size, 0); assert.equal((await b.local.pending(owner)).length, 1);
  await assert.rejects(b.adapter.savePage(page()), /永久刪除/);
});

test('soft delete rejects stale save, hides stale optimistic edits, explicit restore succeeds', async t => {
  const a = await device(t), b = await device(t), s = new Server();
  await create(a, s); await pullWorkspace(s, b.local, owner);
  await b.adapter.savePage({ ...page(), title: 'old' });
  await a.adapter.deletePage('page-a'); await flushWorkspace(s, a.local, owner);
  await pullWorkspace(s, b.local, owner);
  assert.ok((await b.adapter.getPage('page-a')).deleted_at);
  await assert.rejects(flushWorkspace(s, b.local, owner), /revision conflict/);
  await assert.rejects(b.adapter.savePage(page()), /還原/);
  await a.adapter.restorePage('page-a'); await flushWorkspace(s, a.local, owner);
  assert.equal(s.rows.pages.get('page-a').deleted_at, null);
  assert.equal(s.rows.pages.get('page-a').revision, 3);
});

test('ordinary save cannot remove deleted_at even with current revision', async t => {
  const d = await device(t), s = new Server(); await create(d, s);
  await d.adapter.deletePage('page-a'); await flushWorkspace(s, d.local, owner);
  const result = await s.rpc('apply_workspace_operations', { operations: [{ id: crypto.randomUUID(), kind: 'save', entity_type: 'pages', entity_id: 'page-a', expected_revision: 2, value: page() }] });
  assert.match(result.error.message, /restore/); assert.ok(s.rows.pages.get('page-a').deleted_at);
});

test('persistent outbox survives repository reload and retries with the same operation ID', async t => {
  const d = await device(t), s = new Server();
  await d.adapter.savePage(page()); const original = await d.local.pending(owner);
  s.offline = true; await assert.rejects(flushWorkspace(s, d.local, owner), /offline/);
  const reloaded = await d.reopen();
  assert.equal((await reloaded.pending(owner))[0].operations[0].id, original[0].operations[0].id);
  s.offline = false; await flushWorkspace(s, reloaded, owner);
  assert.equal((await reloaded.pending(owner)).length, 0); assert.equal(s.rows.pages.size, 1);
});

test('server commit + lost response is idempotent and same ID with changed payload is rejected', async t => {
  const d = await device(t), s = new Server(); await d.adapter.savePage(page());
  const batch = (await d.local.pending(owner))[0]; s.loseResponse = true;
  await assert.rejects(flushWorkspace(s, d.local, owner), /response lost/);
  assert.equal(s.rows.pages.get('page-a').revision, 1);
  await flushWorkspace(s, d.local, owner);
  assert.equal(s.rows.pages.get('page-a').revision, 1); assert.equal(s.receipts.size, 1);
  const collision = structuredClone(batch.operations); collision[0].value.title = 'changed';
  assert.match((await s.rpc('apply_workspace_operations', { operations: collision })).error.message, /payload conflict/);
});

test('Realtime DELETE uses payload.old and authoritative tombstone; local data disappears without enqueue', async t => {
  const a = await device(t), b = await device(t), s = new Server();
  await create(a, s); await pullWorkspace(s, b.local, owner);
  await a.adapter.permanentDeletePage('page-a'); await flushWorkspace(s, a.local, owner);
  const engine = new SyncEngine(s, b.adapter, 'other', owner); t.after(() => engine.destroy());
  await engine.handleRemoteChange('pages', { eventType: 'DELETE', new: {}, old: { id: 'page-a' } });
  assert.equal(await b.adapter.getPage('page-a'), null); assert.equal((await b.local.pending(owner)).length, 0);
});

test('keyset paging handles API cap; missing cloud cache never becomes implicit upload', async t => {
  const d = await device(t), s = new Server();
  for (let i = 0; i < 7; i++) s.rows.pages.set(`p${i}`, { ...page(`p${i}`), owner_id: owner });
  await d.db.put('pages', page('legacy-local-only'));
  const rows = await readWorkspaceRows(s, 'pages', owner); assert.equal(rows.length, 7);
  await pullWorkspace(s, d.local, owner); await flushWorkspace(s, d.local, owner);
  assert.equal((await d.adapter.listPages()).length, 8);
  assert.equal((await d.local.pending(owner)).length, 0); assert.equal(s.calls.includes('rpc'), false);
  // An explicit edit of old cache does not pretend to be a new entity either.
  await d.adapter.savePage({ ...page('legacy-local-only'), title: 'edited' });
  await assert.rejects(flushWorkspace(s, d.local, owner), /revision conflict/);
});

test('all tombstone pages are consumed before outbox, not only the API first page', async t => {
  const d = await device(t), s = new Server();
  for (let i = 0; i < 6; i++) {
    await d.db.put('pages', page(`p${i}`));
    s.rows.workspace_tombstones.set(`pages:p${i}`, { id: `pages:p${i}`, owner_id: owner, entity_type: 'pages', entity_id: `p${i}`, revision: 2, deleted_at: 20 });
  }
  await pullWorkspace(s, d.local, owner);
  assert.equal((await d.adapter.listPages()).length, 0);
  assert.equal(s.calls[0], 'pull:workspace_tombstones');
});

test('pagination follows database collation for mixed-case IDs', async () => {
  const s = new Server(); s.limit = 1;
  const ids = ['page_A', 'page_a', 'page_Z', 'page_z'];
  for (const id of ids) s.rows.pages.set(id, { ...page(id), owner_id: owner });
  assert.deepEqual(new Set((await readWorkspaceRows(s, 'pages', owner)).map(row => row.id)), new Set(ids));
});

test('attachment metadata + binary deletion roll back together and retry after reload', async t => {
  const a = await device(t), b = await device(t), s = new Server();
  await create(a, s, attachment(), 'attachments'); await a.adapter.attachBinary('att-a', new Blob(['data']));
  await flushWorkspace(s, a.local, owner); await pullWorkspace(s, b.local, owner);
  assert.equal(await (await b.adapter.readBinary('att-a')).text(), 'data');
  assert.equal((await b.adapter.readBinary('att-a')).type, 'text/plain');
  await a.adapter.permanentDeleteAttachment('att-a'); s.binaryDeleteFails = true;
  await assert.rejects(flushWorkspace(s, a.local, owner), /binary delete failed/);
  assert.equal(s.rows.attachments.size, 1); assert.equal(s.rows.binaries.size, 1); assert.equal(s.rows.workspace_tombstones.size, 0);
  s.binaryDeleteFails = false; await flushWorkspace(s, new WorkspacePersistence(a.db), owner);
  assert.equal(s.rows.attachments.size, 0); assert.equal(s.rows.binaries.size, 0);
  await pullWorkspace(s, b.local, owner);
  assert.equal(await b.adapter.getAttachment('att-a'), null); assert.equal(await b.adapter.readBinary('att-a'), null);
  await assert.rejects(b.adapter.saveAttachment(attachment()), /永久刪除/);
});

test('attachment soft delete cannot be undone by save; explicit restore queues separately', async t => {
  const d = await device(t), s = new Server(); await create(d, s, attachment(), 'attachments');
  await d.adapter.deleteAttachment('att-a'); await assert.rejects(d.adapter.saveAttachment(attachment()), /還原/);
  await flushWorkspace(s, d.local, owner); await d.adapter.restoreAttachment('att-a'); await flushWorkspace(s, d.local, owner);
  assert.equal(s.rows.attachments.get('att-a').deleted_at, null); assert.equal(s.rows.attachments.get('att-a').revision, 3);
});

test('queued create/save/delete/restore are causal, remote acknowledgments do not overwrite later local work', async t => {
  const d = await device(t), s = new Server();
  await d.adapter.savePage(page()); await d.adapter.savePage({ ...page(), title: 'second' });
  await d.adapter.deletePage('page-a'); await d.adapter.restorePage('page-a');
  assert.deepEqual((await d.local.pending(owner)).flatMap(b => b.operations.map(op => op.expected_revision)), [0, 1, 2, 3]);
  await flushWorkspace(s, d.local, owner);
  assert.equal(s.rows.pages.get('page-a').revision, 4); assert.equal((await d.adapter.getPage('page-a')).title, 'second');
  assert.equal((await d.adapter.getPage('page-a')).deleted_at, null);
});

test('batch failure rolls back all server changes and leaves immutable upload batch intact', async t => {
  const d = await device(t), s = new Server(); await create(d, s);
  await d.adapter.savePages([page('new-chapter'), { ...page(), title: 'new title' }]);
  s.rows.pages.get('page-a').revision++;
  await assert.rejects(flushWorkspace(s, d.local, owner), /conflict/);
  assert.equal(s.rows.pages.get('page-a').title, 'page-a'); assert.equal(s.rows.pages.has('new-chapter'), false);
  assert.equal((await d.local.pending(owner))[0].operations.length, 2);
});

test('local transaction abort never leaves partial cache/outbox changes and owners stay isolated', async t => {
  const d = await device(t);
  await assert.rejects(d.adapter.savePages([page(), { ...page('other'), workspace_owner_id: 'other-owner' }]), /ownership/);
  assert.equal(await d.adapter.getPage('page-a'), null); assert.equal((await d.local.pending(owner)).length, 0);
  await d.adapter.savePage(page()); assert.equal((await d.local.pending('other-owner')).length, 0);
});

test('late remote row cannot undo a persisted tombstone, including after repository reload', async t => {
  const d = await device(t);
  await d.local.merge(owner, [{ entity_type: 'pages', entity_id: 'page-a', revision: 3, deleted_at: 20, hard_deleted: true }]);
  const local = new WorkspacePersistence(d.db);
  await local.merge(owner, [remoteResult('pages', { ...page(), owner_id: owner, revision: 2 })]);
  assert.equal(await d.adapter.getPage('page-a'), null);
});

test('a clean device proposing a new object with a tombstoned ID is also rejected', async t => {
  const a = await device(t), fresh = await device(t), s = new Server();
  await create(a, s); await a.adapter.permanentDeletePage('page-a'); await flushWorkspace(s, a.local, owner);
  await fresh.adapter.savePage(page());
  assert.equal((await fresh.local.pending(owner))[0].operations[0].expected_revision, 0);
  await assert.rejects(flushWorkspace(s, fresh.local, owner), /permanently deleted/);
  assert.equal(s.rows.pages.size, 0);
});

test('sync engine pulls tombstones and remote data before sending explicit intents', async t => {
  const d = await device(t), s = new Server(); await d.adapter.savePage(page());
  const engine = new SyncEngine(s, d.adapter, 'device', owner);
  // Study is deliberately outside this pages/attachments test.
  engine.syncStudyNow = async () => {};
  t.after(() => engine.destroy()); await engine.fullSync();
  assert.equal(s.calls[0], 'pull:workspace_tombstones');
  assert.ok(s.calls.indexOf('pull:pages') < s.calls.indexOf('rpc'));
  assert.ok(s.calls.indexOf('pull:attachments') < s.calls.indexOf('rpc'));
  assert.equal((await d.local.pending(owner)).length, 0);
});

test('IndexedDB v6 upgrade retains legacy cache without inventing upload operations', async () => {
  await deleteDB('nexus');
  const old = await openDB('nexus', 6, { upgrade(db) {
    const pages = db.createObjectStore('pages', { keyPath: 'id' }); pages.createIndex('by_updated', 'updated_at');
  } });
  await old.put('pages', page()); old.close();
  const adapter = new IndexedDBAdapter();
  try {
    await adapter.init(); adapter.setWorkspaceOwner(owner);
    assert.equal(adapter.db.version, 8);
    assert.equal((await adapter.getPage('page-a')).title, 'page-a');
    assert.deepEqual(await adapter.getWorkspacePersistence().pending(owner), []);
  } finally { await adapter.close(); await deleteDB('nexus'); }
});

test('migration statically enforces owner-scoped RPC, receipts, revision and old-client DML barriers', () => {
  const sql = fs.readFileSync('supabase/migrations/20261008_workspace_delete_protection.sql', 'utf8');
  assert.match(sql, /revoke insert, update, delete, truncate on public\.pages, public\.attachments, public\.binaries/);
  assert.match(sql, /for insert to anon, authenticated with check \(false\)/);
  assert.match(sql, /if current_revision <> expected then raise exception/);
  assert.match(sql, /if tomb\.entity_id is not null then raise exception 'Workspace object permanently deleted'/);
  assert.match(sql, /previous\.fingerprint <> fingerprint/);
  assert.match(sql, /owner_id = auth\.uid\(\)/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /delete from public\.binaries where id = entity_id and owner_id = actor/);
  assert.doesNotMatch(sql, /delete from public\.workspace_tombstones|delete from public\.workspace_operation_receipts/);
  assert.doesNotMatch(sql, /study_review_events|study_card_states|dictionary_/);
});
