const {test}=require('node:test'),assert=require('node:assert/strict');
require('../loadStudy.cjs');
const {newMapDisplay,modeAvailable,overlayAvailable,mapStyles,mapPalettes}=require('../../src/features/worldMap/globalMapDisplay.ts');
const {createHeightContours}=require('../../src/features/worldMap/globalMapGeometry.ts');
test('display choices are independent and unavailable layers cannot claim data',()=>{
 const a=newMapDisplay(),b=newMapDisplay();a.overlays.rivers=false;assert.equal(b.overlays.rivers,true);assert.equal(a.overlays.lakes,true);
 for(const mode of ['political','culture','temperature','ecosystems','contours'])assert.equal(modeAvailable(mode,{}),false);
 for(const layer of ['borders','provinces','towns','roads'])assert.equal(overlayAvailable(layer,{natural:{},climate:{}}),false);
 assert.equal(modeAvailable('contours',{contours:[]}),true);assert.equal(overlayAvailable('currents',{climate:{}}),true);
 assert.equal(mapStyles.length,6);for(const [id] of mapStyles)assert.ok(mapPalettes[id].ocean);
});
const point=(lon,lat)=>{lon*=Math.PI/180;lat*=Math.PI/180;return [Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)];};
test('contours interpolate actual heights across the date line without editing the source grid',()=>{
 const grid={points:[point(179,-10),point(-179,-10),point(-179,10)],triangles:[[0,1,2]],heights:[-10,10,10]},snapshot=JSON.stringify(grid);
 const contours=createHeightContours(grid),sea=contours.find(b=>b.height===0);
 assert.equal(sea.lines.length,1);const [a,b]=sea.lines[0];assert.ok(Math.abs(a[0]-b[0])<2);assert.ok(a.every(Number.isFinite)&&b.every(Number.isFinite));
 assert.equal(JSON.stringify(grid),snapshot);assert.ok(contours.filter(c=>c.height>=1700).every(c=>!c.lines.length));
 assert.ok(createHeightContours({...grid,heights:[5,5,5]}).every(c=>!c.lines.length));
});

const {traceScalarBand}=require('../../src/features/worldMap/core/scalarBands.mjs');
const {insideProjectedRing}=require('../../src/features/worldMap/core/coastSurface.mjs');
const {buildRiverStrokes}=require('../../src/features/worldMap/core/riverDrawing.mjs');
test('a scalar band wraps across the date line and classifies both polar caps correctly',()=>{
 const mesh={
  points:[point(180,0),point(-90,0),point(0,0),point(90,0),point(0,90),point(0,-90)],
  triangles:[4,5].flatMap(p=>[0,1,2,3].map(i=>[p,i,(i+1)%4])),
 };
 const inside=(band,lon,lat)=>band.rings.reduce((state,ring)=>
  [-360,0,360].reduce((flag,shift)=>flag!==insideProjectedRing([lon+shift,lat],ring),state),band.inverse);
 const seam=traceScalarBand(mesh,[4,0,0,0,0,0],2);
 assert.equal(seam.rings.length,1);
 assert.equal(inside(seam,179,0),true);
 assert.equal(inside(seam,-179,0),true);
 assert.equal(inside(seam,0,0),false);
 const polar=traceScalarBand(mesh,[0,0,0,0,4,4],2);
 assert.equal(polar.rings.length,2);
 assert.equal(inside(polar,179,80),true);
 assert.equal(inside(polar,-179,-80),true);
 assert.equal(inside(polar,0,0),false);
 assert.deepEqual(traceScalarBand(mesh,[4,4,4,4,4,4],2),{rings:[],inverse:true});
});
test('rivers widen after a confluence and retain continuous seasonal reaches across the seam',()=>{
 const river={lines:[[[178,1],[179,1]],[[179,1],[-179,1]],[[-179,1],[-178,1]],[[-178,1],[-177,1]]],
  segmentFlows:[[2,200,0,0]],monthly:[200]};
 const reaches=buildRiverStrokes(river,0);
 const wet=reaches[1],dry=reaches[4];
 assert.deepEqual(wet.points,[[178,1],[179,1],[181,1]]);
 assert.ok(wet.widths[0]<wet.widths[1]&&wet.widths[1]<wet.widths[2]);
 assert.equal(dry.dry,true);
 assert.deepEqual(dry.points,[[181,1],[182,1],[183,1]]);
});

test('short high-flow rivers remain visually narrower than long rivers',()=>{
 const river={lines:[[[0,0],[1,0]],[[1,0],[2,0]]],monthly:[10000]};
 const short=buildRiverStrokes({...river,lengthKm:220},0)[0].widths;
 const main=buildRiverStrokes({...river,lengthKm:1600},0)[0].widths;
 assert.ok(short[0]<short.at(-1));
 assert.ok(short.at(-1)<=1.05&&main.at(-1)>short.at(-1));
});

test('river labels reveal smaller names later and use a smaller font',()=>{
 const {riverLabelStyle}=require('../../src/features/worldMap/core/riverDrawing.mjs');
 const main=riverLabelStyle({lengthKm:1600,catchmentAreaKm2:250000});
 const regional=riverLabelStyle({lengthKm:700,catchmentAreaKm2:110000});
 const tributary=riverLabelStyle({lengthKm:320,parentId:'main'});
 const creek=riverLabelStyle({lengthKm:100,parentId:'main'});
 assert.deepEqual([main,regional,tributary,creek].map(s=>s.minZoom),[1,1.8,3.5,6]);
 assert.deepEqual([main,regional,tributary,creek].map(s=>s.pixels),[14,12,11,10]);
});
