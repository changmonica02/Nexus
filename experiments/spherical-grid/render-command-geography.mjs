// Developer comparison against archived source revisions. Each version runs
// its own generation pipeline; masks are sampled from authoritative Grid cells.
// node scripts/build-azgaar-command-tools.mjs first.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
await import('../../scripts/build-azgaar-command-tools.mjs');
const {createNaturalPlanet}=await import('./natural-planet.mjs');
import {geographyDiagnostics} from './geography-diagnostics.mjs';
const args=process.argv.slice(2),options={out:'.cache/command-geography.json',seeds:[42,1729]};
for(let i=0;i<args.length;i+=2){const key=args[i].slice(2),value=args[i+1];if(!value)throw Error('Missing '+key);options[key]=key==='seeds'?value.split(',').map(Number):value;}
if(!options.reference||!options.previous)throw Error('Supply --reference and --previous paths to archived experiments/spherical-grid directories');
const reference=await import(pathToFileURL(resolve(options.reference,'natural-planet.mjs')).href);
const previous=await import(pathToFileURL(resolve(options.previous,'natural-planet.mjs')).href);
const versions=[['original',reference.createNaturalPlanet],['previous',previous.createNaturalPlanet],['candidate',createNaturalPlanet]],cases=[];
let points;
for(const seed of options.seeds)for(const landPercent of [25,32,45])for(const [version,generate] of versions){
 const start=performance.now(),result=generate({seed,landPercent,continentCores:8}),grid=result.grid;
 points??=grid.points;
 const diagnostics=geographyDiagnostics(grid),mask=Array.from(grid.heights,h=>h>=0?1:0);
 cases.push({seed,landPercent,version,diagnostics,mask});
 console.log(JSON.stringify({seed,landPercent,version,land:diagnostics.landPercent,
  majorLandmasses:diagnostics.majorLandmasses,largestLand:diagnostics.largestLandPercent,
  emptySectors:diagnostics.emptySectors,denseSectors:diagnostics.denseSectors,densityDeviation:diagnostics.densityDeviation,
  elapsedMs:Math.round(performance.now()-start)}));
}
const destination=resolve(options.out);await mkdir(resolve(destination,'..'),{recursive:true});
await writeFile(destination,JSON.stringify({format:'nexus-command-geography-evidence',points,cases}));
