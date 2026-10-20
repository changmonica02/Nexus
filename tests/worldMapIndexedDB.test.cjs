require('./loadStudy.cjs');
require('fake-indexeddb/auto');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { openDB, deleteDB } = require('idb');
const { IndexedDBAdapter } = require('../src/infrastructure/storage/IndexedDBAdapter.ts');
const { WORKSPACE_STORES } = require('../src/infrastructure/sync/workspacePersistence.ts');
const { STUDY_STORES } = require('../src/features/study/StudyRepository.ts');
const { WorldMapRepository } = require('../src/features/worldMap/worldMapRepository.ts');

const owner = 'map-owner';
const world = () => ({ id: 'world', title: 'World', kind: 'creative', creative_type: 'world',
  character_data: { basic: { name: 'World' }, sections: [] }, content_json: {}, content_text: '',
  default_mode: 'note', created_at: 1, updated_at: 1, deleted_at: null, revision: 1,
  device_id: 'device', workspace_owner_id: owner, attachment_ids: [] });
const project = label => new Blob([[
  '1.154.2|source|2026-10-20|seed|100|100|1', JSON.stringify({ seed: label }), '', '[]', '',
  '<svg id="map"><g id="viewbox"/></svg>', JSON.stringify({ points: [[0, 0]], spacing: 1 }), '1', '2', '3', '4', '5',
].join('\r\n')]);

async function device(t) {
  const name = crypto.randomUUID();
  let db = await openDB(name, 1, { upgrade(db) {
    for (const name of ['pages', 'attachments', 'binaries', ...WORKSPACE_STORES, ...STUDY_STORES]) {
      const store = db.createObjectStore(name, { keyPath: 'id' });
      if (name === 'pages' || name === 'attachments') store.createIndex('by_updated', 'updated_at');
    }
    db.createObjectStore('settings', { keyPath: 'key' });
  } });
  const adapter = new IndexedDBAdapter();
  adapter.db = db;
  adapter.setWorkspaceOwner(owner);
  t.after(async () => { db.close(); await deleteDB(name); });
  return { adapter, get db() { return db; }, async reopen() {
    db.close(); db = await openDB(name, 1); adapter.db = db;
  } };
}

test('IDB: project persists across reopening and unchanged save adds no binary intent', async t => {
  const d = await device(t);
  await d.adapter.savePage(world());
  const { map } = await new WorldMapRepository(d.adapter).create('world', 'Map', project('first'));
  const pending = await d.adapter.getWorkspacePersistence().pending(owner);
  assert.deepEqual(pending.at(-1).operations.map(op => [op.entity_type, op.kind]),
    [['attachments', 'save'], ['attachments', 'binary'], ['pages', 'save']]);
  assert.deepEqual(pending.at(-1).operations.filter(op => op.entity_type === 'attachments').map(op => op.expected_revision), [0, 1]);
  await d.reopen();
  const repo = new WorldMapRepository(d.adapter), loaded = await repo.read('world', map.id);
  assert.equal(await loaded.blob.text(), await project('first').text());
  const count = (await d.adapter.getWorkspacePersistence().pending(owner)).length;
  assert.equal((await repo.save('world', map.id, 1, loaded.blob)).changed, false);
  assert.equal((await d.adapter.getWorkspacePersistence().pending(owner)).length, count);
});

test('IDB: a competing world write rolls back the new attachment, binary and outbox batch', async t => {
  const d = await device(t);
  await d.adapter.savePage(world());
  const persistence = d.adapter.getWorkspacePersistence();
  d.adapter.getWorkspacePersistence = () => ({ async mutate(...args) {
    const current = await d.adapter.getPage('world');
    await persistence.mutate(owner, [{ type: 'pages', kind: 'save', value: { ...current, revision: current.revision + 1 } }]);
    return persistence.mutate(...args);
  } });
  await assert.rejects(new WorldMapRepository(d.adapter).create('world', 'Map', project('conflict')), /Revision conflict/);
  assert.equal(await d.db.count('attachments'), 0);
  assert.equal(await d.db.count('binaries'), 0);
  assert.equal((await persistence.pending(owner)).length, 2); // world creation + competing edit only
});

test('IDB: foreign owners and stale sessions cannot modify or read projects', async t => {
  const d = await device(t);
  await d.adapter.savePage(world());
  const repo = new WorldMapRepository(d.adapter);
  const { map } = await repo.create('world', 'Map', project('private'));
  d.adapter.setWorkspaceOwner('other-owner');
  await assert.rejects(repo.read('world', map.id), { code: 'owner' });
  await assert.rejects(new WorldMapRepository(d.adapter).create('world', 'Foreign'), { code: 'owner' });
  assert.equal((await d.db.get('pages', 'world')).character_data.world_maps.length, 1);
});

test('IDB: world Trash restore and map soft restore retain project and pending offline intents', async t => {
  const d = await device(t);
  await d.adapter.savePage(world());
  const repo = new WorldMapRepository(d.adapter);
  const { map } = await repo.create('world', 'Map', project('offline'));
  await repo.remove('world', map.id, 1);
  await d.adapter.deletePage('world');
  await assert.rejects(repo.list('world'), { code: 'world' });
  await d.adapter.restorePage('world');
  await repo.restore('world', map.id, 2);
  await d.reopen();
  assert.equal(await (await repo.read('world', map.id)).blob.text(), await project('offline').text());
  assert.ok((await d.adapter.getWorkspacePersistence().pending(owner)).some(batch =>
    batch.operations.some(op => op.kind === 'binary')));
});

test('IDB: existing backup round-trip preserves map metadata and native project bytes', async t => {
  const source = await device(t), target = await device(t);
  await source.adapter.savePage(world());
  const { map } = await new WorldMapRepository(source.adapter).create('world', 'Map', project('backup'));
  const backup = await source.adapter.exportWorkspaceBackup();
  assert.equal(backup.pages[0].character_data.world_maps[0].attachment_id, map.attachment_id);
  assert.ok(backup.attachments.some(entry => entry.attachment.id === map.attachment_id && entry.binary_base64));
  await target.adapter.importWorkspaceBackup(backup);
  const restored = await new WorldMapRepository(target.adapter).read('world', map.id);
  assert.equal(await restored.blob.text(), await project('backup').text());
});

test('IDB: local recovery snapshots survive reopen without creating upload intents', async t => {
  const d = await device(t); await d.adapter.savePage(world());
  const repo = new WorldMapRepository(d.adapter), {map} = await repo.create('world','Draft',project('saved'));
  const before=(await d.adapter.getWorkspacePersistence().pending(owner)).length;
  const token=await repo.stageDraft('world',map.id,1,project('draft'));
  await d.reopen();
  const draft=await repo.readDraft('world',map.id);
  assert.equal(draft.token,token); assert.equal(draft.base_revision,1);
  assert.equal(await draft.blob.text(),await project('draft').text());
  assert.equal((await d.adapter.getWorkspacePersistence().pending(owner)).length,before);
  d.adapter.setWorkspaceOwner('other'); await assert.rejects(repo.readDraft('world',map.id),{code:'owner'});
});

test('IDB: clearing an older checkpoint never clears a newer recovery draft', async t => {
  const d = await device(t); await d.adapter.savePage(world());
  const repo = new WorldMapRepository(d.adapter), {map} = await repo.create('world','Draft',project('saved'));
  const first=await repo.stageDraft('world',map.id,1,project('first'));
  const second=await repo.stageDraft('world',map.id,1,project('second'));
  await repo.clearDraft('world',map.id,first);
  assert.equal((await repo.readDraft('world',map.id)).token,second);
  await repo.clearDraft('world',map.id,second);assert.equal(await repo.readDraft('world',map.id),null);
});

test('IDB: a conflicting recovery draft is retained until explicit discard', async t => {
  const d = await device(t); await d.adapter.savePage(world());
  const repo = new WorldMapRepository(d.adapter), {map} = await repo.create('world','Draft',project('saved'));
  const token=await repo.stageDraft('world',map.id,1,project('unsynchronized'));
  await repo.rename('world',map.id,1,'New revision');
  await assert.rejects(repo.stageDraft('world',map.id,2,project('overwrite')),/older recovery draft/);
  assert.equal((await repo.readDraft('world',map.id)).token,token);
});
