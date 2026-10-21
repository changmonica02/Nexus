const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const { gzipSync } = require('node:zlib');

// Native TS transform on recent Node; use the project's existing TypeScript on older Node.
let WorldMapRepository, inspectMapProject;
before(async () => {
  const source = fs.readFileSync('src/features/worldMap/worldMapRepository.ts', 'utf8');
  const js = stripTypeScriptTypes ? stripTypeScriptTypes(source, { mode: 'transform' }) : (() => {
    const ts = require('typescript');
    return ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  })();
  ({ WorldMapRepository, inspectMapProject } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64')));
});

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


test('settlement creation and placement are one atomic canonical write, idempotent after lost acknowledgement', async () => {
 const {repo,state,storage}=fixture(),{map}=await repo.create('world-a','Natural',project());
 const input={entityId:'town_one',name:'  Harbor  ',summary:'Canonical',content:{type:'doc',content:[{type:'paragraph'}]}},point={placementId:'place_one',mapId:map.id,x:20,y:30};
 const before=state.outbox.length;
 await repo.createSettlement('world-a',input,point);
 const saved=state.pages.get('world-a');
 assert.equal(saved.character_data.world_entities[0].name,'Harbor');
 assert.equal(saved.character_data.world_maps[0].placements[0].entityId,'town_one');
 assert.deepEqual(state.outbox.at(-1).map(op=>[op.type,op.kind]),[['pages','save']]);
 assert.equal(state.binaries.size,1);
 await new WorldMapRepository(storage).createSettlement('world-a',input,point);
 assert.equal(state.outbox.length,before+1);
 await assert.rejects(repo.createSettlement('world-a',{...input,name:'Other'},point),{code:'conflict'});
 assert.equal(saved.character_data.world_maps[0].revision,map.revision);
});

test('unplaced town, multi-map references, rename, move and marker removal never duplicate or delete the body',async()=>{
 const {repo,state}=fixture(),one=(await repo.create('world-a','One')).map,two=(await repo.create('world-a','Two')).map;
 await repo.createSettlement('world-a',{entityId:'town_one',name:'Old',content:{type:'doc',content:[]}});
 assert.equal(state.pages.get('world-a').character_data.world_maps[0].placements,undefined);
 await repo.placeEntity('world-a','town_one',{placementId:'p_one',mapId:one.id,x:12,y:34});
 await repo.placeEntity('world-a','town_one',{placementId:'p_two',mapId:two.id,x:56,y:78});
 await repo.updateEntity('world-a','town_one',1,{name:'New'});
 const page=state.pages.get('world-a'),body=structuredClone(page.character_data.world_entities[0]);
 const {projectWorldPlacements}=await importRepo();
 assert.equal(projectWorldPlacements(page,one.id)[0].name,'New');
 assert.equal(projectWorldPlacements(page,two.id)[0].name,'New');
 await repo.movePlacement('world-a',one.id,'p_one',1,{x:22,y:44});
 assert.deepEqual(state.pages.get('world-a').character_data.world_entities[0],body);
 await repo.removePlacement('world-a',one.id,'p_one',2);
 await repo.removePlacement('world-a',one.id,'p_one',2);
 assert.equal(projectWorldPlacements(state.pages.get('world-a'),one.id).length,0);
 await repo.remove('world-a',two.id,two.revision);
 assert.deepEqual(state.pages.get('world-a').character_data.world_entities,[body]);
 await assert.rejects(repo.placeEntity('world-a','town_one',{placementId:'p_one',mapId:one.id,x:22,y:44}),{code:'conflict'});
});

async function importRepo(){
 const source=fs.readFileSync('src/features/worldMap/worldMapRepository.ts','utf8');
 const js=stripTypeScriptTypes?stripTypeScriptTypes(source,{mode:'transform'}):require('typescript').transpileModule(source,{compilerOptions:{module:99,target:9}}).outputText;
 return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
}

test('failed atomic writes and explicit retries leave no half-created entries or orphan references',async()=>{
 const {repo,state}=fixture(),{map}=await repo.create('world-a','Map');
 const input={entityId:'town_one',name:'One'},point={placementId:'p_one',mapId:map.id,x:1,y:2};
 state.fail=true;
 await assert.rejects(repo.createSettlement('world-a',input,point),/Disk full/);
 assert.equal(state.pages.get('world-a').character_data.world_entities,undefined);
 assert.equal(state.pages.get('world-a').character_data.world_maps[0].placements,undefined);
 state.fail=false;
 await repo.createSettlement('world-a',input,point);
 await repo.createSettlement('world-a',input,point);
 assert.equal((await repo.listEntities('world-a')).length,1);
});

test('foreign accounts/worlds, invalid coordinates and stale entity/placement revisions cannot modify data',async()=>{
 const {repo,state}=fixture(),one=(await repo.create('world-a','One')).map,two=(await repo.create('world-b','Two')).map;
 await repo.createSettlement('world-a',{entityId:'town_one',name:'One'});
 const before=state.outbox.length;
 await assert.rejects(repo.placeEntity('world-b','town_one',{placementId:'p_one',mapId:two.id,x:1,y:1}),{code:'entity'});
 await assert.rejects(repo.placeEntity('world-a','town_one',{placementId:'p_one',mapId:two.id,x:1,y:1}),{code:'map'});
 for(const x of [NaN,Infinity,-1])await assert.rejects(repo.placeEntity('world-a','town_one',{placementId:'p_one',mapId:one.id,x,y:1}),{code:'entity'});
 assert.equal(state.outbox.length,before);
 await repo.placeEntity('world-a','town_one',{placementId:'p_one',mapId:one.id,x:1,y:1});
 await assert.rejects(repo.movePlacement('world-a',one.id,'p_one',4,{x:2,y:2}),{code:'conflict'});
 await assert.rejects(repo.updateEntity('world-a','town_one',4,{name:'No'}),{code:'conflict'});
 state.owner='other';
 await assert.rejects(repo.listEntities('world-a'),{code:'owner'});
 await assert.rejects(repo.createSettlement('world-a',{entityId:'town_two',name:'No'}),{code:'owner'});
});

test('map duplicate shares the canonical entity; world duplicate remaps entities, relations and placements',async()=>{
 const {repo,state}=fixture(),{map}=await repo.create('world-a','Map');
 await repo.createSettlement('world-a',{entityId:'town_one',name:'One'},{placementId:'p_one',mapId:map.id,x:1,y:1});
 const {map:copy}=await repo.duplicate('world-a',map.id,map.revision,'Copy');
 assert.notEqual(copy.placements[0].placementId,'p_one');assert.equal(copy.placements[0].mapId,copy.id);assert.equal(copy.placements[0].entityId,'town_one');
 const {cloneWorldReferences,validateWorldEntities}=await importRepo();
 const data=cloneWorldReferences(state.pages.get('world-a').character_data,'new-world');
 assert.equal(data.world_entities.length,1);assert.notEqual(data.world_entities[0].entityId,'town_one');
 assert.equal(data.world_maps[0].placements[0].entityId,data.world_entities[0].entityId);
 assert.equal(data.world_maps[1].placements[0].entityId,data.world_entities[0].entityId);
 assert.equal(data.world_maps[1].placements[0].mapId,data.world_maps[1].id);
 validateWorldEntities({id:'new-world',character_data:data});
});

test('entity metadata survives later native project saves without causing binary transfers on rename or move',async()=>{
 const {repo,state}=fixture(),{map}=await repo.create('world-a','Map',project('before'));
 await repo.createSettlement('world-a',{entityId:'town_one',name:'One'},{placementId:'p_one',mapId:map.id,x:1,y:1});
 await repo.updateEntity('world-a','town_one',1,{name:'Renamed'});
 await repo.movePlacement('world-a',map.id,'p_one',1,{x:2,y:3});
 assert.equal(state.binaries.size,1);
 const result=await repo.save('world-a',map.id,map.revision,project('after'));
 assert.equal(result.world.character_data.world_entities[0].name,'Renamed');
 assert.equal(result.world.character_data.world_maps[0].placements[0].geometry.x,2);
 assert.equal(state.binaries.size,2);
});


const cellGeometry=(cells)=>({type:'cells',meshId:'a'.repeat(64),cellCount:100,cells});
test('political entities share the canonical body and validate typed, same-world, acyclic parent references',async()=>{
 const {repo,state}=fixture();
 await repo.createEntity('world-a',{entityId:'country_a',type:'country',name:'Country',subtype:'Custom federation',content:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'History'}]}]}});
 await repo.createEntity('world-a',{entityId:'admin_a',type:'administrative_area',name:'Province',relations:[{type:'parent',entityId:'country_a'}]});
 await repo.createEntity('world-a',{entityId:'admin_b',type:'administrative_area',name:'District',relations:[{type:'parent',entityId:'admin_a'}]});
 await repo.createSettlement('world-a',{entityId:'town_a',name:'Town',relations:[{type:'parent',entityId:'admin_b'}]});
 await repo.updateEntity('world-a','country_a',1,{relations:[{type:'capital',entityId:'town_a'}]});
 const count=state.outbox.length;
 await assert.rejects(repo.updateEntity('world-a','admin_a',1,{relations:[{type:'parent',entityId:'admin_b'}]}),/Cyclic/);
 await assert.rejects(repo.updateEntity('world-a','admin_a',1,{relations:[{type:'parent',entityId:'town_a'}]}),/Incompatible/);
 await assert.rejects(repo.updateEntity('world-a','country_a',2,{relations:[{type:'capital',entityId:'admin_a'}]}),/Incompatible/);
 await assert.rejects(repo.createEntity('world-b',{entityId:'foreign',type:'administrative_area',name:'Bad',relations:[{type:'parent',entityId:'country_a'}]}),/relation/);
 assert.equal(state.outbox.length,count);
 assert.equal((await repo.listEntities('world-a')).find(e=>e.entityId==='town_a').relations[0].entityId,'admin_b');
});

test('region save supports detached territories, metadata-only edits, explicit atomic reassignment, removal and retries',async()=>{
 const {repo,state,storage}=fixture(),{map}=await repo.create('world-a','Political',project('preserve'));
 await repo.createEntity('world-a',{entityId:'country_a',type:'country',name:'A',summary:'Keep official text'});
 await repo.createEntity('world-a',{entityId:'country_b',type:'country',name:'B'});
 await repo.saveRegion('world-a',map.id,'country_a','region_a',0,cellGeometry([1,2,30,31]));
 const body=structuredClone(state.pages.get('world-a').character_data.world_entities),count=state.outbox.length;
 await new WorldMapRepository(storage).saveRegion('world-a',map.id,'country_a','region_a',0,cellGeometry([1,2,30,31]));
 assert.equal(state.outbox.length,count,'lost acknowledgement retry adds no write');
 await assert.rejects(repo.saveRegion('world-a',map.id,'country_b','region_b',0,cellGeometry([2,3])),/overlap/);
 assert.equal(state.outbox.length,count);
 await repo.saveRegion('world-a',map.id,'country_b','region_b',0,cellGeometry([2,3]),true);
 const page=state.pages.get('world-a');assert.deepEqual(page.character_data.world_maps[0].placements.find(p=>p.placementId==='region_a').geometry.cells,[1,30,31]);
 assert.deepEqual(page.character_data.world_entities,body);assert.equal(page.character_data.world_maps[0].revision,map.revision);assert.equal(state.binaries.size,1);
 assert.deepEqual(state.outbox.at(-1).map(op=>[op.type,op.kind]),[['pages','save']]);
 await assert.rejects(repo.saveRegion('world-a',map.id,'country_a','region_a',1,cellGeometry([4])),{code:'conflict'});
 await repo.removePlacement('world-a',map.id,'region_b',1);
 await assert.rejects(repo.saveRegion('world-a',map.id,'country_b','region_b',2,cellGeometry([2,3])),{code:'conflict'});
 assert.deepEqual(state.pages.get('world-a').character_data.world_entities,body);
});

test('new country and territory commit atomically; invalid geometry, cancellation and failed writes leave no half-entity',async()=>{
 const {repo,state}=fixture(),{map}=await repo.create('world-a','Map');
 const entity={schemaVersion:1,entityId:'country_new',worldId:'world-a',type:'country',name:'New',aliases:[],relations:[],createdAt:1,updatedAt:1,revision:1};
 const before=state.outbox.length;
 for(const cells of [[2,1],[1,1],[-1],[100]])await assert.rejects(repo.saveRegion('world-a',map.id,entity.entityId,'new_region',0,cellGeometry(cells),false,entity),/Invalid/);
 assert.equal(state.outbox.length,before);
 state.fail=true;await assert.rejects(repo.saveRegion('world-a',map.id,entity.entityId,'new_region',0,cellGeometry([1,20]),false,entity),/Disk full/);
 assert.equal(state.pages.get('world-a').character_data.world_entities,undefined);
 state.fail=false;await repo.saveRegion('world-a',map.id,entity.entityId,'new_region',0,cellGeometry([1,20]),false,entity);
 await repo.saveRegion('world-a',map.id,entity.entityId,'new_region',0,cellGeometry([1,20]),false,entity);
 assert.equal((await repo.listEntities('world-a')).length,1);
 await assert.rejects(repo.movePlacement('world-a',map.id,'new_region',1,{x:1,y:1}),/not a point/);
});

test('administrative and town geography warnings never rewrite formal relationships or text',async()=>{
 const {repo,state}=fixture(),{map}=await repo.create('world-a','Map');
 await repo.createEntity('world-a',{entityId:'c',type:'country',name:'Country'});
 await repo.createEntity('world-a',{entityId:'a',type:'administrative_area',name:'Admin',relations:[{type:'parent',entityId:'c'}]});
 await repo.createSettlement('world-a',{entityId:'t',name:'Town',relations:[{type:'parent',entityId:'a'}]},{placementId:'pt',mapId:map.id,x:10,y:20});
 await repo.saveRegion('world-a',map.id,'c','pc',0,cellGeometry([1,2]));
 await repo.saveRegion('world-a',map.id,'a','pa',0,cellGeometry([2,3]));
 const page=state.pages.get('world-a'),{worldRegionWarnings}=await importRepo();
 assert.deepEqual(worldRegionWarnings(page,map.id,[{placementId:'pt',cell:1}]).map(w=>w.key),['townOutside','outsideParent']);
 assert.equal(page.character_data.world_entities.find(e=>e.entityId==='t').relations[0].entityId,'a');
});


test('culture/religion distributions overlap each other and countries without ownership transfer or body duplication',async()=>{
 const {repo,state}=fixture(),{map}=await repo.create('world-a','Mixed',project());
 await repo.createEntity('world-a',{entityId:'country',type:'country',name:'Country'});
 await repo.saveRegion('world-a',map.id,'country','politics',0,cellGeometry([1,2,3]));
 for(const type of ['culture','religion'])for(let i=0;i<3;i++){
  const id=type+i;await repo.createEntity('world-a',{entityId:id,type,name:id,content:{type:'doc',content:[{type:'paragraph'}]},...(type==='culture'?{cultureSettings:{language:'Shared language',customs:'Free customs'}}:{})});
  await repo.saveRegion('world-a',map.id,id,'p'+id,0,cellGeometry([1,2,40]),true);
 }
 const before=structuredClone(state.pages.get('world-a').character_data);
 await repo.saveRegion('world-a',map.id,'culture0','pculture0',1,cellGeometry([2,70]));
 const after=state.pages.get('world-a').character_data;
 assert.deepEqual(after.world_entities,before.world_entities);
 for(const p of before.world_maps[0].placements.filter(p=>p.entityId!=='culture0'))assert.deepEqual(after.world_maps[0].placements.find(x=>x.placementId===p.placementId),p);
 const {map:two}=await repo.create('world-a','Other');await repo.saveRegion('world-a',two.id,'culture0','otherp',0,cellGeometry([8]));
 assert.equal((await repo.listEntities('world-a')).filter(e=>e.entityId==='culture0').length,1);
 const {projectWorldRegions}=await importRepo();await repo.updateEntity('world-a','culture0',1,{name:'Renamed'});
 assert.equal(projectWorldRegions(state.pages.get('world-a'),map.id).find(p=>p.entityId==='culture0').name,'Renamed');
 await repo.setDistribution('world-a',map.id,'pculture0',2,{visible:false,distribution:{color:'#ff2288',opacity:0.6,category:'secondary',influence:0.2}});
 await repo.saveRegion('world-a',map.id,'culture0','pculture0',3,cellGeometry([2,71]));
 assert.equal(projectWorldRegions(state.pages.get('world-a'),map.id).find(p=>p.entityId==='culture0').distribution.opacity,0.6);
 await repo.removePlacement('world-a',map.id,'pculture0',4);assert.ok((await repo.listEntities('world-a')).some(e=>e.entityId==='culture0'));
 assert.equal(state.binaries.size,1);
});

test('distribution references/settings reject wrong world, wrong types and invalid backup values',async()=>{
 const {repo,state}=fixture(),{map}=await repo.create('world-a','Map');
 await repo.createEntity('world-a',{entityId:'c',type:'country',name:'Country'});
 await repo.createEntity('world-a',{entityId:'culture',type:'culture',name:'Culture',relations:[{type:'distribution:country',entityId:'c'}]});
 await repo.createEntity('world-a',{entityId:'faith',type:'religion',name:'Faith',relations:[{type:'distribution:culture',entityId:'culture'}]});
 const count=state.outbox.length;
 await assert.rejects(repo.updateEntity('world-a','culture',1,{relations:[{type:'distribution:country',entityId:'faith'}]}),/Incompatible/);
 await assert.rejects(repo.createEntity('world-b',{entityId:'bad',type:'culture',name:'Bad',relations:[{type:'distribution:country',entityId:'c'}]}),/relation/);
 assert.equal(state.outbox.length,count);
 await repo.saveRegion('world-a',map.id,'culture','p',0,cellGeometry([1]));
 for(const d of [{opacity:NaN},{opacity:1.1},{color:'url(attack)'},{category:'demographic'},{influence:-1}])await assert.rejects(repo.setDistribution('world-a',map.id,'p',1,{visible:true,distribution:d}),/Invalid distribution/);
 const {validateWorldEntities}=await importRepo(),bad=structuredClone(state.pages.get('world-a'));bad.character_data.world_entities.find(e=>e.entityId==='culture').cultureSettings={language:2};assert.throws(()=>validateWorldEntities(bad),/Invalid/);
});

test('new distribution is atomic on failed writes, idempotent after lost ack, and tombstones reject stale retry',async()=>{
 const {repo,state,storage}=fixture(),{map}=await repo.create('world-a','Map');
 const entity={schemaVersion:1,entityId:'faith',worldId:'world-a',type:'religion',name:'Faith',aliases:[],relations:[],createdAt:1,updatedAt:1,revision:1};
 state.fail=true;await assert.rejects(repo.saveRegion('world-a',map.id,'faith','p',0,cellGeometry([1]),false,entity),/Disk full/);
 assert.equal((await repo.listEntities('world-a')).length,0);
 state.fail=false;await repo.saveRegion('world-a',map.id,'faith','p',0,cellGeometry([1]),false,entity);const count=state.outbox.length;
 await new WorldMapRepository(storage).saveRegion('world-a',map.id,'faith','p',0,cellGeometry([1]),false,entity);assert.equal(state.outbox.length,count);
 await repo.removePlacement('world-a',map.id,'p',1);await assert.rejects(repo.saveRegion('world-a',map.id,'faith','p',2,cellGeometry([1]),false,entity),{code:'conflict'});
 state.owner='foreign';await assert.rejects(repo.saveRegion('world-a',map.id,'faith','p2',0,cellGeometry([1])),{code:'owner'});
});
