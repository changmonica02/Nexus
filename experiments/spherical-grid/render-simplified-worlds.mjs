// Render SIX genuine Grid-based bathymetry PNGs. No image generation model.
// Usage: node experiments/spherical-grid/render-simplified-worlds.mjs --out artifacts/stage3a
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createAzgaarSphericalLandLayout} from './azgaar-spherical-land-legacy.mjs';
import {generatePlateSeafloor,applyPlateSeafloor,tectonicSeedFromLandMask,SEAFLOOR} from './plate-seafloor.mjs';
import {drawTerrain,encodePng} from './actual-terrain-raster.mjs';
import {analyzeSphericalPlates} from './tectonic-plates.mjs';

const args=process.argv.slice(2);
let out='artifacts/stage3a',width=1200,height=600;
for(let i=0;i<args.length;i++){
 const k=args[i],v=args[++i];
 if(v===undefined)throw Error('Missing argument value for '+k);
 if(k==='--out')out=v;
 else if(k==='--width')width=Number(v);
 else if(k==='--height')height=Number(v);
 else throw Error('Unsupported argument '+k);
}
if(!Number.isInteger(width)||width<240||width>2400||
   !Number.isInteger(height)||height<120||height>1200)throw RangeError('Invalid image dimensions');
await mkdir(out,{recursive:true});
const statistics=[];
for(const worldType of ['ocean','earthlike','land']){
 for(const seed of [1729,42]){
  const time=performance.now();
  // The original clustered Azgaar terrain path underlies the earlier natural maps.
  // Preserve seabed and plate calculations; only restore their terrain input.
  const landPercent={ocean:25,earthlike:32,land:45}[worldType];
  const r=createAzgaarSphericalLandLayout({seed,landPercent,continentCores:8});
  const tectonicSeed=tectonicSeedFromLandMask(r.grid);
  const tectonics=analyzeSphericalPlates(r.grid,{seed:tectonicSeed});
  const seafloor=generatePlateSeafloor(r.grid,{seed:tectonicSeed,tectonics});
  applyPlateSeafloor(r.grid,seafloor);
  const pixels=drawTerrain(r.grid,seafloor.zones,tectonics.boundaries,width,height);
  const png=encodePng(width,height,pixels);
  const filename=worldType+'-seed-'+seed+'.png';
  await writeFile(join(out,filename),png);
  const byZone={};
  for(const [name,id] of Object.entries(SEAFLOOR)){
   byZone[name]=seafloor.zones.filter(x=>x===id).length;
  }
  const entry={worldType,seed,file:filename,landPercent:Number(r.measuredLandPercent.toFixed(3)),
   continents:r.acceptedContinents,templates:r.templatePlacements.length,
   plateCount:tectonics.plateCount,plateSegments:tectonics.boundaries.length,
   seamounts:seafloor.submarineVolcanoes.length,zones:byZone,
   bytes:png.length,elapsedMs:Math.round(performance.now()-time)};
  console.log(JSON.stringify(entry));
  statistics.push(entry);
 }
}
await writeFile(join(out,'manifest.json'),JSON.stringify({generator:'Nexus restored clustered Azgaar terrain with plate seafloor and true plate boundaries',statistics},null,2));
