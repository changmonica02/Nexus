// Reuse the MIT fork's command methods verbatim. Only remove TS syntax and
// inject local RNG / lookup helpers; no browser globals, source eval or global
// Math.random replacement is used at runtime.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {transform} from 'esbuild';
const source=await readFile('vendor/azgaar/src/generators/heightmap-generator.ts','utf8');
const start=source.indexOf('class HeightmapModule {'),end=source.indexOf('  /** heightmap template or precreated heightmap');
if(start<0||end<start)throw Error('Azgaar command source boundaries changed');
const tools=source.slice(start,end).replaceAll('Math.random()', 'random()')+'\n}\nreturn new HeightmapModule();';
const helpers=`
const Grid={findCell},window={ERROR:false};
const minmax=(v,a,b)=>Math.min(Math.max(v,a),b),lim=v=>minmax(v,0,100);
const P=p=>p>=1?true:p<=0?false:random()<p;
const rand=(min,max)=>{if(min===undefined&&max===undefined)return random();if(max===undefined){max=min;min=0;}return Math.floor(random()*(max-min+1))+min;};
const getNumberInRange=r=>{if(!Number.isNaN(+r))return ~~r + +P(+r-~~r);const sign=r[0]==='-'?-1:1;if(Number.isNaN(+r[0]))r=r.slice(1);const range=r.split('-');return rand(parseFloat(range[0])*sign,+parseFloat(range[1]));};
const d3Range=n=>Array.from({length:Math.ceil(n)},(_,i)=>i);
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const leastIndex=(a,compare)=>{if(!a.length)return undefined;let best=0;for(let i=1;i<a.length;i++)if(compare(a[i],a[best])<0)best=i;return best;};
`;
const {code}=await transform('export function createAzgaarCommandTools(random,findCell){'+helpers+tools+'\n}',{loader:'ts',format:'esm',target:'es2022'});
await mkdir('.cache',{recursive:true});
await writeFile('.cache/azgaar-command-tools.mjs','// Generated from vendor/azgaar MIT source; do not edit.\n'+code);
