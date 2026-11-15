import test from 'node:test';
import assert from 'node:assert/strict';
import {createGlobalGrid} from './global-config.mjs';
import {setHeight} from './grid.mjs';
import {oceanConnected,buildCoastalSamples} from './pack.mjs';
import {createCoastIndex,updateCoastIndex,coastSegments} from './coast-index.mjs';
const pointKey=p=>p.map(x=>x.toFixed(12)).join('/');
function normalize(segments){
 return segments.map(s=>({edge:[...s.gridEdge].sort((a,b)=>a-b).join(':'),
  first:pointKey(s.start),last:pointKey(s.end),arc:s.arcKm}))
  .sort((a,b)=>a.edge.localeCompare(b.edge));
}
test('Azgaar-style parent Grid coast: initial index matches full spherical coast',()=>{
 const g=createGlobalGrid();
 g.points.forEach(([x],i)=>setHeight(g,i,x<0?-20:20));
 const ocean=oceanConnected(g,g.heights.findIndex(h=>h<0));
 const full=buildCoastalSamples(g,ocean);
 const index=createCoastIndex(g,ocean);
 assert.deepEqual(normalize(coastSegments(index)),normalize(full.coast));
 assert.ok(Math.abs(index.landAreaKm2-full.landAreaKm2)<1e-5);
 const sources=full.samples.slice(g.points.length);
 for(let i=0;i<sources.length;i+=2){
  assert.equal(ocean[sources[i].sourceId],0,'first supplemental site must be inland');
  assert.equal(ocean[sources[i+1].sourceId],1,'second supplemental site must be seaward');
 }
});
test('one coastal edit updates only incident Grid edges and matches global coastal recomputation',()=>{
 const g=createGlobalGrid();
 g.points.forEach(([x],i)=>setHeight(g,i,x<0?-20:20));
 const seed=g.heights.findIndex(h=>h<0),ocean=oceanConnected(g,seed),base=createCoastIndex(g,ocean);
 const coast=g.heights.findIndex((h,i)=>h>0&&g.neighbors[i].some(j=>ocean[j]));
 setHeight(g,coast,-20);
 const newOcean=oceanConnected(g,seed),patch=updateCoastIndex(base,newOcean);
 const reference=buildCoastalSamples(g,newOcean);
 assert.equal(patch.changedCells,1);
 assert.ok(patch.touchedEdges<=6);
 assert.ok(patch.changedEdges>0);
 assert.deepEqual(normalize(coastSegments(patch.index)),normalize(reference.coast));
 assert.ok(Math.abs(patch.index.landAreaKm2-reference.landAreaKm2)<1e-5);
 assert.equal(base.ocean[coast],0);
 assert.equal(base.active.size,buildCoastalSamples(g,ocean).coast.length);
});
test('seam/pole and disconnected low basin: local coast agrees with full',()=>{
 const g=createGlobalGrid();
 for(let i=0;i<g.points.length;i++){
  const [x,y,z]=g.points[i],lon=Math.atan2(y,x);
  setHeight(g,i,Math.abs(lon)>2.6||z>.85?-20:20);
 }
 const seed=g.points.findIndex((p,i)=>g.heights[i]<0&&p[2]>.85);
 const ocean=oceanConnected(g,seed),base=createCoastIndex(g,ocean);
 const polar=g.points.findIndex((p,i)=>g.heights[i]>=0&&p[2]>.72&&g.neighbors[i].some(j=>ocean[j]));
 assert.ok(polar>=0);
 setHeight(g,polar,-20);
 const nextOcean=oceanConnected(g,seed),patch=updateCoastIndex(base,nextOcean);
 assert.deepEqual(normalize(coastSegments(patch.index)),normalize(buildCoastalSamples(g,nextOcean).coast));
 const inland=g.heights.findIndex((h,i)=>h>0&&g.neighbors[i].every(j=>g.heights[j]>0));
 assert.ok(inland>=0);
 setHeight(g,inland,-20);
 const stillOcean=oceanConnected(g,seed),again=updateCoastIndex(patch.index,stillOcean);
 assert.equal(again.changedCells,0);
 assert.equal(again.index,patch.index);
});
test('wide ocean reconnection triggers a large changed mask, local coast still matches global',()=>{
 const g=createGlobalGrid();
 g.heights.fill(20);
 // Two ocean basins separated by a single positive-height bridge.
 const left=g.points.findIndex(p=>p[0]<-.8);
 const right=g.points.findIndex(p=>p[0]>.8);
 for(let i=0;i<g.points.length;i++){
  const [x,y,z]=g.points[i];
  if(x<-.3||x>.3)setHeight(g,i,-20);
 }
 const seed=left;const ocean=oceanConnected(g,seed),base=createCoastIndex(g,ocean);
 // The two basins remain disconnected: the global mask is the source of truth.
 assert.equal(ocean[right],0);
 // Flood the intervening band, causing a basin-wide ocean membership change.
 for(let i=0;i<g.points.length;i++)if(g.points[i][0]>=-.3&&g.points[i][0]<=.3)setHeight(g,i,-20);
 const next=oceanConnected(g,seed),patch=updateCoastIndex(base,next);
 assert.ok(patch.changedCells>g.points.length/4);
 assert.deepEqual(normalize(coastSegments(patch.index)),normalize(buildCoastalSamples(g,next).coast));
 assert.ok(Math.abs(patch.index.landAreaKm2)<1e-4);
});
