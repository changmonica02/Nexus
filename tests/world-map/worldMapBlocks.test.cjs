require('../loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {placedWorldEntities}=require('../../src/lib/worldMapBlocks.ts');
test('details follow canonical placements, including invisible layers, never unplaced or removed entries',()=>{
 const entities=[{entityId:'a',content:{type:'doc'}},{entityId:'b'},{entityId:'c'}];
 const world={character_data:{world_entities:entities,world_maps:[{id:'m',deleted_at:null,placements:[{entityId:'a',deletedAt:null,visible:false},{entityId:'b',deletedAt:1}]}]}};
 assert.deepEqual(placedWorldEntities(world,'m'),[entities[0]]);assert.equal(placedWorldEntities(world,'missing').length,0);assert.equal(world.character_data.world_entities.length,3);
});
