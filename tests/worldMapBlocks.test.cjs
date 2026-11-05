require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {withWorldMapBlocks,newWorldMapBlock,placedWorldEntities}=require('../src/lib/worldMapBlocks.ts');
test('legacy conversion retains prose, entities and projects with one stable display block',()=>{
 const source={basic:{name:'world'},sections:[{id:'body',type:'rich_text',title:'History',richText:'Original chronicle'}],world_maps:[{id:'surface'}],world_entities:[{entityId:'one'}]};
 const before=structuredClone(source),data=withWorldMapBlocks(source,'world');
 assert.deepEqual(source,before);assert.deepEqual(withWorldMapBlocks(data,'world'),data);assert.equal(data.legacyCharacterSnapshot.world_entities,undefined);assert.equal(data.legacyCharacterSnapshot.world_maps,undefined);
 assert.equal(data.sections.filter(b=>b.worldMapView).length,1);assert.deepEqual(data.world_maps,source.world_maps);assert.deepEqual(data.world_entities,source.world_entities);
 assert.ok(JSON.stringify(data.sections).includes('Original chronicle'));
 const copy=newWorldMapBlock('copy',data.sections[0].worldMapView);copy.worldMapView.overlays.push('labels');assert.equal(data.sections[0].worldMapView.overlays.includes('labels'),false);
});
test('details follow canonical placements, including invisible layers, never unplaced or removed entries',()=>{
 const entities=[{entityId:'a',content:{type:'doc'}},{entityId:'b'},{entityId:'c'}];
 const world={character_data:{world_entities:entities,world_maps:[{id:'m',deleted_at:null,placements:[{entityId:'a',deletedAt:null,visible:false},{entityId:'b',deletedAt:1}]}]}};
 assert.deepEqual(placedWorldEntities(world,'m'),[entities[0]]);assert.equal(placedWorldEntities(world,'missing').length,0);assert.equal(world.character_data.world_entities.length,3);
});
