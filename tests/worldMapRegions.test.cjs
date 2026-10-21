const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
let measureRegionArea;
before(async()=>{const source=fs.readFileSync('vendor/azgaar/src/components/nexus-region-geometry.ts','utf8');const strip=require('node:module').stripTypeScriptTypes;const js=strip?strip(source,{mode:'transform'}):require('typescript').transpileModule(source,{compilerOptions:{module:99,target:9}}).outputText;({measureRegionArea}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64')));});
const square=(x,size=2)=>[[x,0],[x+size,0],[x+size,size],[x,size]];
test('disconnected land footprints sum exact polygon area and exclude ocean/lakes',()=>{
 assert.deepEqual(measureRegionArea([{height:20,polygon:square(0)},{height:80,polygon:square(20,3)},{height:19,polygon:square(50,10)}]),{relative:13});
 assert.deepEqual(measureRegionArea([{height:30,polygon:[[0,0],[0,3],[4,0]]}]),{relative:6});
});
test('trusted planar km scale is squared; unknown scales and world projection never claim km²',()=>{
 const cells=[{height:30,polygon:square(0)}],scale={scope:'region',known:true,unit:'km',scale:3};
 assert.deepEqual(measureRegionArea(cells,scale),{relative:4,km2:36});
 for(const patch of [{known:false},{scope:'world'},{scope:'custom'},{unit:'mi'},{scale:0},{scale:Infinity},{scale:NaN}])assert.deepEqual(measureRegionArea(cells,{...scale,...patch}),{relative:4});
});
