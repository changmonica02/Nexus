import test from 'node:test';
import assert from 'node:assert/strict';
import {createGlobalGrid,GLOBAL_GRID_CELLS} from './global-config.mjs';
import {setHeight} from './grid.mjs';
import {openGlobalTerrain} from './terrain-edits.mjs';
import {applyComparedTerrainEdits} from './pack-update-comparison.mjs';

function prepared(){
 const g=createGlobalGrid();
 for(let i=0;i<g.points.length;i++)setHeight(g,i,g.points[i][0]<0?-20:20);
 const seed=g.heights.findIndex(x=>x<0);
 return openGlobalTerrain(g,seed);
}
function equivalent(a,b){
 assert.deepEqual(a.grid.heights,b.grid.heights);
 assert.deepEqual(a.geography.ocean,b.geography.ocean);
 assert.equal(a.geography.landAreaKm2,b.geography.landAreaKm2);
 assert.equal(a.geography.seaAreaKm2,b.geography.seaAreaKm2);
 assert.deepEqual(a.geography.gridCoastline,b.geography.gridCoastline);
 assert.deepEqual(a.geography.pack.points,b.geography.pack.points);
 assert.deepEqual(a.geography.pack.triangles,b.geography.pack.triangles);
 assert.deepEqual(a.geography.pack.neighbors,b.geography.pack.neighbors);
 assert.deepEqual(a.geography.pack.areas,b.geography.pack.areas);
 assert.deepEqual(a.geography.pack.sourceIds,b.geography.pack.sourceIds);
 assert.deepEqual(a.geography.pack.heights,b.geography.pack.heights);
 assert.equal(a.revision,b.revision);
}
test('36,002: enclosed depression becomes negative but remains dry, reuse equals full Pack',()=>{
 const a=prepared(),b=prepared();
 const grid=a.grid;
 assert.equal(grid.heights.length,GLOBAL_GRID_CELLS);
 const land=grid.heights.findIndex((h,i)=>h>0 && grid.neighbors[i].every(j=>grid.heights[j]>0));
 assert.ok(land>=0);
 const changes=[{id:land,height:-20}];
 const before=a.geography.pack;
 const x=applyComparedTerrainEdits(a,changes,{strategy:'selective'});
 const y=applyComparedTerrainEdits(b,changes,{strategy:'full'});
 assert.equal(x.mode,'reuse-pack-topology');
 assert.equal(y.mode,'full-pack-rebuild');
 assert.equal(a.geography.ocean[land],0);
 assert.strictEqual(a.geography.pack.points,before.points);
 equivalent(a,b);
});
test('36,002: actual coastal change forces full rebuild and equals reference',()=>{
 const a=prepared(),b=prepared();
 const grid=a.grid;
 const coast=grid.heights.findIndex((h,i)=>h>0 && grid.neighbors[i].some(j=>a.geography.ocean[j]));
 assert.ok(coast>=0);
 const x=applyComparedTerrainEdits(a,[{id:coast,height:-20}],{strategy:'selective'});
 const y=applyComparedTerrainEdits(b,[{id:coast,height:-20}],{strategy:'full'});
 assert.equal(x.mode,'full-pack-rebuild');
 assert.equal(y.mode,'full-pack-rebuild');
 equivalent(a,b);
});
test('36,002: land-to-land height edits reuse geometry and equal full rebuild',()=>{
 const a=prepared(),b=prepared();
 const cell=a.grid.heights.findIndex(h=>h>0);
 const x=applyComparedTerrainEdits(a,[{id:cell,height:80}],{strategy:'selective'});
 applyComparedTerrainEdits(b,[{id:cell,height:80}],{strategy:'full'});
 assert.equal(x.mode,'reuse-pack-topology');
 equivalent(a,b);
});
test('36,002: rejected edit is atomic and leaves original Pack untouched',()=>{
 const a=prepared(),current=a.geography,seed=a.oceanSeed,first=a.grid.heights.findIndex(h=>h>0),before=a.grid.heights[first];
 assert.throws(()=>applyComparedTerrainEdits(a,[{id:first,height:70},{id:seed,height:30}]),RangeError);
 assert.throws(()=>applyComparedTerrainEdits(a,[{id:first,height:70},{id:first,height:80}]));
 assert.throws(()=>applyComparedTerrainEdits(a,[{id:first,height:101}]),RangeError);
 assert.equal(a.grid.heights[first],before);
 assert.strictEqual(a.geography,current);
 assert.equal(a.revision,0);
});
