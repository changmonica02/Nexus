const { test } = require('node:test');
const assert = require('node:assert/strict');
const { gzipSync } = require('node:zlib');

// Resolve the repository's shared block helpers through the existing TS test loader.
require('../loadStudy.cjs');
const {WorldMapRepository,inspectMapProject}=require('../../src/features/worldMap/worldMapRepository.ts');

function project(label = 'alpha') {
  return new Blob([[
    '1.154.2|File can be loaded in azgaar.github.io/Fantasy-Map-Generator|2026-10-20|seed|100|100|1',
    JSON.stringify({ seed: label }), '', '[]', '', '<svg id="map"><g id="viewbox"><text>' + label + '</text></g></svg>',
    JSON.stringify({ points: [[0, 0]], spacing: 1 }), '1', '2', '3', '4', '5',
  ].join('\r\n')], { type: 'application/octet-stream' });
}

function world(id = 'world-a', owner = 'owner-a') {
  return { id, title: id, kind: 'creative', creative_type: 'world', character_data: {
    basic: { name: id }, sections: [{ id: 'original', type: 'rich_text', title: 'History', richText: 'Keep me' }],
  }, content_json: { type: 'doc' }, content_text: 'Keep me', default_mode: 'note',
  created_at: 1, updated_at: 1, deleted_at: null, revision: 1, device_id: 'device', workspace_owner_id: owner, attachment_ids: [] };
}

// Atomic contract double, NOT an IndexedDB/Supabase integration test.
function fixture() {
  const state = { owner: 'owner-a', pages: new Map([['world-a', world()], ['world-b', world('world-b')]]),
    attachments: new Map(), binaries: new Map(), outbox: [], reads: 0, fail: false, beforeCommit: null, beforeBinary: null };
  const storage = {
    getWorkspaceOwner: () => state.owner,
    getDeviceId: async () => 'device',
    getPage: async id => structuredClone(state.pages.get(id) ?? null),
    getAttachment: async id => structuredClone(state.attachments.get(id) ?? null),
    readBinary: async id => { state.reads++; await state.beforeBinary?.(); return state.binaries.get(id) ?? null; },
    getWorkspacePersistence: () => ({ async mutate(owner, changes, guards) {
      await state.beforeCommit?.();
      if (state.fail) throw Error('Disk full');
      for (const guard of guards) {
        const p = state.pages.get(guard.id);
        if (!p || p.revision !== guard.revision || p.workspace_owner_id !== owner || p.deleted_at != null) throw Error('Revision conflict');
      }
      const pages = new Map(state.pages), attachments = new Map(state.attachments), binaries = new Map(state.binaries);
      for (const change of changes) {
        assert.equal(change.value.workspace_owner_id, owner);
        if (change.type === 'pages') pages.set(change.value.id, structuredClone(change.value));
        else if (change.kind === 'save') attachments.set(change.value.id, structuredClone(change.value));
        else { assert.equal(change.data, Buffer.from(await change.blob.arrayBuffer()).toString('base64')); binaries.set(change.value.id, change.blob); }
      }
      Object.assign(state, { pages, attachments, binaries });
      state.outbox.push(structuredClone(changes));
    } }),
  };
  return { state, storage, repo: new WorldMapRepository(storage) };
}

test('creates multiple maps under existing worlds without replacing world content', async () => {
  const { repo, state } = fixture();
  const before = structuredClone(state.pages.get('world-a'));
  const one = await repo.create('world-a', ' First '), two = await repo.create('world-a', 'Second');
  await repo.create('world-b', 'Elsewhere');
  assert.notEqual(one.map.id, two.map.id);
  assert.deepEqual((await repo.list('world-a')).map(m => m.title), ['First', 'Second']);
  assert.equal(two.map.world_id, 'world-a');
  assert.deepEqual(state.pages.get('world-a').character_data.sections, before.character_data.sections);
  assert.deepEqual(state.pages.get('world-a').content_json, before.content_json);
  assert.equal(state.binaries.size, 0);
});

test('native project bytes, metadata and world reference persist in one outbox batch', async () => {
  const { repo, state } = fixture(), blob = project();
  const { map } = await repo.create('world-a', 'Map', blob);
  assert.equal(state.outbox.length, 1);
  assert.deepEqual(state.outbox[0].map(c => [c.type, c.kind]), [['attachments', 'save'], ['attachments', 'binary'], ['pages', 'save']]);
  assert.ok(state.pages.get('world-a').attachment_ids.includes(map.attachment_id));
  assert.equal(await (await repo.read('world-a', map.id)).blob.text(), await blob.text());
});

test('unchanged project does not enqueue metadata or binary, including after reopening the repository', async () => {
  const { repo, state, storage } = fixture(), blob = project();
  const { map } = await repo.create('world-a', 'Map', blob);
  const reopened = new WorldMapRepository(storage);
  const result = await reopened.save('world-a', map.id, map.revision, blob);
  assert.equal(result.changed, false);
  assert.equal(result.map.attachment_id, map.attachment_id);
  assert.equal(state.outbox.length, 1);
  assert.equal(state.reads, 0);
});

test('changed project uses an independent immutable binary and preserves the old source', async () => {
  const { repo, state } = fixture();
  const { map } = await repo.create('world-a', 'Map', project('old'));
  const saved = await repo.save('world-a', map.id, map.revision, project('new'));
  assert.equal(saved.changed, true);
  assert.equal(saved.map.revision, map.revision + 1);
  assert.notEqual(saved.map.attachment_id, map.attachment_id);
  assert.equal(await state.binaries.get(map.attachment_id).text(), await project('old').text());
  assert.equal(await (await repo.read('world-a', map.id)).blob.text(), await project('new').text());
});

test('rename, soft deletion and restoration are metadata-only and preserve original bytes', async () => {
  const { repo, state } = fixture();
  const { map } = await repo.create('world-a', 'Map', project());
  await repo.rename('world-a', map.id, 1, 'Renamed');
  await repo.remove('world-a', map.id, 2);
  assert.deepEqual(await repo.list('world-a'), []);
  assert.equal((await repo.list('world-a', true))[0].title, 'Renamed');
  await assert.rejects(repo.read('world-a', map.id), { code: 'map' });
  await repo.restore('world-a', map.id, 3);
  assert.equal((await repo.read('world-a', map.id)).map.attachment_id, map.attachment_id);
  assert.equal(state.binaries.size, 1);
  assert.ok(state.outbox.slice(1).every(batch => batch.length === 1 && batch[0].type === 'pages'));
});

test('duplicates have independent map and attachment identities', async () => {
  const { repo } = fixture();
  const { map } = await repo.create('world-a', 'Map', project());
  const copy = await repo.duplicate('world-a', map.id, 1, 'Copy');
  assert.notEqual(copy.map.id, map.id);
  assert.notEqual(copy.map.attachment_id, map.attachment_id);
  await repo.save('world-a', copy.map.id, 1, project('copy edit'));
  assert.equal(await (await repo.read('world-a', map.id)).blob.text(), await project().text());
});

test('empty maps can be duplicated before an editor generates their first project', async () => {
  const { repo, state } = fixture();
  const { map } = await repo.create('world-a', 'Empty');
  const copy = await repo.duplicate('world-a', map.id, 1, 'Copy');
  assert.equal(copy.map.attachment_id, null);
  assert.equal(state.binaries.size, 0);
});

test('a stale editor cannot overwrite, rename, delete or duplicate a newer revision', async () => {
  const { repo, state } = fixture();
  const { map } = await repo.create('world-a', 'Map', project());
  await repo.rename('world-a', map.id, 1, 'Changed');
  for (const attempt of [() => repo.save('world-a', map.id, 1, project('stale')),
    () => repo.rename('world-a', map.id, 1, 'stale'), () => repo.remove('world-a', map.id, 1),
    () => repo.duplicate('world-a', map.id, 1, 'stale')]) await assert.rejects(attempt(), { code: 'conflict' });
  assert.equal(state.outbox.length, 2);
});

test('a concurrent world edit fails the atomic world guard without orphaning attachments', async () => {
  const { repo, state } = fixture();
  state.beforeCommit = () => { state.pages.get('world-a').revision++; };
  await assert.rejects(repo.create('world-a', 'Map', project()), /Revision conflict/);
  assert.equal(state.attachments.size, 0);
  assert.equal(state.binaries.size, 0);
  assert.equal(state.outbox.length, 0);
});

test('local write failure leaves the source map intact for explicit retry', async () => {
  const { repo, state } = fixture();
  const { map } = await repo.create('world-a', 'Map', project());
  state.fail = true;
  await assert.rejects(repo.save('world-a', map.id, 1, project('retry')), /Disk full/);
  assert.equal(state.outbox.length, 1);
  state.fail = false;
  assert.equal((await repo.save('world-a', map.id, 1, project('retry'))).changed, true);
});

test('signed-out and switched-account sessions are denied', async () => {
  const { repo, state, storage } = fixture();
  state.owner = null;
  assert.throws(() => new WorldMapRepository(storage), { code: 'owner' });
  await assert.rejects(repo.list('world-a'), { code: 'owner' });
  state.owner = 'owner-b';
  await assert.rejects(repo.create('world-a', 'Map'), { code: 'owner' });
  await assert.rejects(new WorldMapRepository(storage).list('world-a'), { code: 'owner' });
  assert.equal(state.outbox.length, 0);
});

test('switching accounts while reading binary never returns private bytes', async () => {
  const { repo, state } = fixture();
  const { map } = await repo.create('world-a', 'Map', project());
  state.beforeBinary = () => { state.owner = 'owner-b'; };
  await assert.rejects(repo.read('world-a', map.id), { code: 'owner' });
});

test('world, character, template and map membership boundaries are enforced', async () => {
  for (const patch of [{ creative_type: 'character' }, { kind: 'note' }, { deleted_at: 2 },
    { character_data: { basic: { name: 'template' }, sections: [], isTemplate: true } }]) {
    const { repo, state } = fixture();
    Object.assign(state.pages.get('world-a'), patch);
    await assert.rejects(repo.create('world-a', 'Map'), { code: 'world' });
    assert.equal(state.outbox.length, 0);
  }
  const { repo } = fixture();
  const { map } = await repo.create('world-a', 'Map');
  await assert.rejects(repo.read('world-b', map.id), { code: 'map' });
});

test('malformed existing membership is not silently repaired or overwritten', async () => {
  const { repo, state } = fixture();
  const { map } = await repo.create('world-a', 'Map');
  state.pages.get('world-a').character_data.world_maps[0].world_id = 'world-b';
  await assert.rejects(repo.rename('world-a', map.id, 1, 'Rename'), { code: 'map' });
  assert.equal(state.outbox.length, 1);
});

test('missing, deleted and corrupt binaries block reads instead of generating replacement maps', async () => {
  for (const damage of ['missing', 'deleted', 'corrupt', 'wrong-owner', 'missing-reference']) {
    const { repo, state } = fixture();
    const { map } = await repo.create('world-a', 'Map', project());
    if (damage === 'missing') state.binaries.delete(map.attachment_id);
    if (damage === 'deleted') state.attachments.get(map.attachment_id).deleted_at = 2;
    if (damage === 'wrong-owner') state.attachments.get(map.attachment_id).workspace_owner_id = 'owner-b';
    if (damage === 'corrupt') state.binaries.set(map.attachment_id, project('different'));
    if (damage === 'missing-reference') state.pages.get('world-a').attachment_ids = [];
    await assert.rejects(repo.read('world-a', map.id));
    assert.equal(state.outbox.length, 1);
  }
});

test('deletion during async reading cannot reopen a removed map', async () => {
  const { repo, state } = fixture();
  const { map } = await repo.create('world-a', 'Map', project());
  state.beforeBinary = () => { state.pages.get('world-a').character_data.world_maps[0].deleted_at = 2; };
  await assert.rejects(repo.read('world-a', map.id), { code: 'map' });
});

test('invalid and unknown project versions never enqueue a change', async () => {
  const { repo, state } = fixture();
  for (const blob of [new Blob([]), new Blob(['garbage']), new Blob([(await project().text()).replace('1.154.2|', '9.0.0|')])]) {
    await assert.rejects(repo.create('world-a', 'Map', blob), { code: 'project' });
  }
  assert.equal(state.outbox.length, 0);
});

test('native plain, base64 and gzip files validate without rewriting their bytes', async () => {
  const text = await project().text();
  const blobs = [project(), new Blob([Buffer.from(encodeURIComponent(text)).toString('base64')]), new Blob([gzipSync(text)])];
  for (const blob of blobs) {
    const before = Buffer.from(await blob.arrayBuffer());
    const info = await inspectMapProject(blob);
    assert.equal(info.size, before.length);
    assert.equal(info.sha256.length, 64);
    assert.deepEqual(Buffer.from(await blob.arrayBuffer()), before);
  }
});

test('blank titles fail without writes, and metadata listings do not read any binary', async () => {
  const { repo, state } = fixture();
  await assert.rejects(repo.create('world-a', ' '), { code: 'map' });
  await repo.create('world-a', 'Map', project());
  const list = await repo.list('world-a');
  list[0].title = 'Mutated caller copy';
  assert.equal((await repo.list('world-a'))[0].title, 'Map');
  assert.equal(state.reads, 0);
  assert.equal(state.outbox.length, 1);
});

test('older Nexus metadata remains readable while unknown metadata versions are never overwritten', async () => {
  const {repo,state}=fixture();const {map}=await repo.create('world-a','Map');
  assert.equal(map.metadata_version,1);
  const record=state.pages.get('world-a').character_data.world_maps[0];delete record.metadata_version;
  assert.equal((await repo.list('world-a'))[0].id,map.id);
  record.metadata_version=2;
  await assert.rejects(repo.rename('world-a',map.id,1,'Overwrite'),{code:'map'});
  assert.equal(state.outbox.length,1);
});


test('scope and same-world detail links are metadata-only, extensible and preserve legacy content', async()=>{
 const {repo,state}=fixture();const first=await repo.create('world-a','Atlas',project());const second=await repo.create('world-a','Detail',project('town'));
 const count=state.attachments.size;
 const saved=await repo.setPresentation('world-a',second.map.id,1,'town',first.map.id);
 const detail=saved.character_data.world_maps.find(m=>m.id===second.map.id);
 assert.equal(detail.scope,'town');assert.equal(detail.parent_map_id,first.map.id);assert.equal(state.attachments.size,count);
 assert.equal(saved.character_data.sections[0].richText,'Keep me');
 await assert.rejects(repo.setPresentation('world-a',first.map.id,1,'world',second.map.id),{code:'map'});
 await assert.rejects(repo.setPresentation('world-a',second.map.id,1,'region',null),{code:'conflict'});
 const other=await repo.create('world-b','Other');
 await assert.rejects(repo.setPresentation('world-a',second.map.id,2,'town',other.map.id),{code:'map'});
 await repo.setPresentation('world-a',second.map.id,2,'district',first.map.id);
 assert.equal((await repo.list('world-a')).find(m=>m.id===second.map.id).scope,'district');
 state.owner='owner-b';await assert.rejects(repo.setPresentation('world-a',second.map.id,3,'town',null),{code:'owner'});
});


test('confirmed detail creation commits the project and parent relationship atomically', async () => {
  const {repo,state}=fixture(),parent=await repo.create('world-a','Parent');
  const before=state.outbox.length;
  const detail=await repo.create('world-a','Detail',project('natural'),{scope:'region',parentId:parent.map.id});
  assert.equal(state.outbox.length,before+1);
  assert.equal(detail.map.parent_map_id,parent.map.id);assert.equal(detail.map.scope,'region');
  assert.equal(detail.map.revision,1);assert.ok(detail.map.attachment_id);
  const worldWrite=state.outbox.at(-1).find(c=>c.type==='pages');
  assert.equal(worldWrite.value.character_data.world_maps.find(m=>m.id===detail.map.id).parent_map_id,parent.map.id);
});
test('invalid or foreign detail parents cannot leave a map or binary behind', async () => {
  const {repo,state}=fixture(),foreign=await repo.create('world-b','Foreign');
  const before={writes:state.outbox.length,binaries:state.binaries.size,maps:(await repo.list('world-a')).length};
  await assert.rejects(repo.create('world-a','Detail',project(),{scope:'region',parentId:foreign.map.id}));
  await assert.rejects(repo.create('world-a','Detail',project(),{scope:'INVALID',parentId:foreign.map.id}));
  assert.equal(state.outbox.length,before.writes);assert.equal(state.binaries.size,before.binaries);assert.equal((await repo.list('world-a')).length,before.maps);
});


test('historical world entity references remain valid when cloning',async()=>{
 const {repo,state}=fixture(),{map}=await repo.create('world-a','Map');
 const world=state.pages.get('world-a');world.character_data.world_entities=[{schemaVersion:1,entityId:'town_one',worldId:'world-a',type:'settlement',name:'One',aliases:[],relations:[],createdAt:1,updatedAt:1,revision:1}];
 world.character_data.world_maps[0].placements=[{schemaVersion:1,placementId:'p_one',mapId:map.id,entityId:'town_one',geometry:{type:'point',x:1,y:1},visible:true,createdAt:1,updatedAt:1,revision:1,deletedAt:null}];
 const {cloneWorldReferences,validateWorldEntities}=await importRepo();validateWorldEntities(world);
 const data=cloneWorldReferences(world.character_data,'new-world');assert.notEqual(data.world_entities[0].entityId,'town_one');assert.equal(data.world_maps[0].placements[0].entityId,data.world_entities[0].entityId);validateWorldEntities({id:'new-world',character_data:data});
});

async function globalProject(seed=42) {
 const {createLandLayout}=await import('../../experiments/spherical-grid/land-generator.mjs');
 const {exportGlobalTerrainSnapshot}=await import('../../experiments/spherical-grid/snapshot.mjs');
 const {globalMapBlob}=require('../../src/features/worldMap/globalMapProject.ts');
 const d=createLandLayout({seed,landPercent:32,continentCores:8});
 return globalMapBlob({format:'nexus-global-map',version:1,settings:d.settings,terrain:exportGlobalTerrainSnapshot({grid:d.grid,oceanSeed:d.oceanSeed,revision:0})});
}
test('global map uses engine metadata and original snapshot through existing atomic repository',async()=>{
 const {repo,state}=fixture(),blob=await globalProject();
 const original=structuredClone(state.pages.get('world-a'));
 const {map}=await repo.createSpace('world-a','Global','surface',blob);
 assert.equal(map.engine,'nexus-global');assert.equal(map.engine_version,'1');
 assert.deepEqual(state.outbox.at(-1).map(c=>c.kind),['save','binary','save']);
 const loaded=await repo.read('world-a',map.id);
 assert.equal(await loaded.blob.text(),await blob.text());
 assert.deepEqual(state.pages.get('world-a').character_data.sections,original.character_data.sections);
 assert.equal((await repo.save('world-a',map.id,1,loaded.blob)).changed,false);
 await assert.rejects(repo.save('world-a',map.id,1,project()),{code:'project'});
 assert.equal((await repo.read('world-a',map.id)).map.revision,1);
});
test('global replacement preserves committed map on disk failure, stale revisions and corrupt snapshots',async()=>{
 const {repo,state}=fixture(),old=await globalProject(1),next=await globalProject(2);
 const {map}=await repo.createSpace('world-a','Global','surface',old),before=state.outbox.length;
 state.fail=true;await assert.rejects(repo.save('world-a',map.id,1,next),/Disk full/);state.fail=false;
 assert.equal(state.outbox.length,before);assert.equal(await (await repo.read('world-a',map.id)).blob.text(),await old.text());
 const committed=await repo.save('world-a',map.id,1,next);assert.equal(committed.map.revision,2);
 await assert.rejects(repo.save('world-a',map.id,1,old),{code:'conflict'});
 const bad=JSON.parse(await next.text());bad.terrain.heights[0]=101;
 await assert.rejects(repo.save('world-a',map.id,2,new Blob([JSON.stringify(bad)])),{code:'project'});
 assert.equal(await (await repo.read('world-a',map.id)).blob.text(),await next.text());
 state.owner='different';await assert.rejects(repo.read('world-a',map.id),{code:'owner'});
});
test('global snapshot validation rejects altered contract and detects engine/metadata mismatch',async()=>{
 const {repo,state}=fixture(),blob=await globalProject();const value=JSON.parse(await blob.text());
 for(const change of [p=>p.version=2,p=>p.settings.seed=-1,p=>p.terrain.heights.pop(),p=>p.terrain.checksum='00000000',p=>p.terrain.oceanSeed=-1,p=>p.terrain.revision=-1]){
  const bad=structuredClone(value);change(bad);await assert.rejects(inspectMapProject(new Blob([JSON.stringify(bad)])),{code:'project'});
 }
 const {map}=await repo.createSpace('world-a','Global','surface',blob);
 state.pages.get('world-a').character_data.world_maps[0].engine='azgaar';
 state.pages.get('world-a').character_data.world_maps[0].engine_version='1.154.2';
 await assert.rejects(repo.read('world-a',map.id),{code:'project'});
});


test('global validation rejects unsupported compressed bytes before mutation while native gzip remains readable',async()=>{
 const {repo,state}=fixture(),plain=await globalProject();
 const compressed=new Blob([gzipSync(Buffer.from(await plain.text()))]);
 await assert.rejects(inspectMapProject(compressed),{code:'project'});
 await assert.rejects(repo.createSpace('world-a','Unsupported','surface',compressed),{code:'project'});
 assert.equal(state.outbox.length,0);assert.equal(state.attachments.size,0);assert.equal(state.binaries.size,0);
 const {map}=await repo.createSpace('world-a','Readable','surface',plain);
 await assert.rejects(repo.save('world-a',map.id,1,compressed),{code:'project'});
 assert.equal(await (await repo.read('world-a',map.id)).blob.text(),await plain.text());
 const nativeCompressed=new Blob([gzipSync(Buffer.from(await project().text()))]);
 assert.equal((await inspectMapProject(nativeCompressed)).engine,'azgaar');
});

test('confirmed world creation commits its main map and binary together without an empty world',async()=>{
 const {state,repo}=fixture(),pages=state.pages.size,batches=state.outbox.length;
 const created=await repo.createWorldWithMap('  新星球  ',project('new-world'));
 assert.equal(state.pages.size,pages+1);assert.equal(state.outbox.length,batches+1);
 assert.equal(created.world.title,'新星球');assert.equal(created.world.revision,1);
 assert.equal(created.world.creative_type,'world');assert.equal(created.map.scope,'surface');
 assert.equal(created.world.character_data.world_maps[0].id,created.map.id);
 assert.ok(state.binaries.has(created.map.attachment_id));
 assert.deepEqual(state.outbox.at(-1).map(c=>[c.type,c.kind]),[['attachments','save'],['attachments','binary'],['pages','save']]);
});
test('failed or malformed confirmed world creation leaves no world, map or attachment behind',async()=>{
 const {state,repo}=fixture(),pages=state.pages.size;
 state.fail=true;await assert.rejects(repo.createWorldWithMap('失敗',project()));
 assert.equal(state.pages.size,pages);assert.equal(state.attachments.size,0);assert.equal(state.binaries.size,0);assert.equal(state.outbox.length,0);
 state.fail=false;await assert.rejects(repo.createWorldWithMap('錯誤檔案',new Blob(['bad'])));
 await assert.rejects(repo.createWorldWithMap(' ',project()));
 assert.equal(state.pages.size,pages);assert.equal(state.outbox.length,0);
});
