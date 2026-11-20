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
