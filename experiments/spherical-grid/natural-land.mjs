// Command-faithful local terrain; clustered global composition. The only
// persisted surface is still the canonical spherical Grid.
import {createGlobalGrid} from './global-config.mjs';
import {executeNativeAzgaarPatch,sampleNativePatch} from './azgaar-native-patch.mjs';
import {templateRng} from './azgaar-template-engine.mjs';
import {valueNoise3} from './spherical-terrain-refinement.mjs';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=v=>{const n=Math.hypot(...v);return v.map(x=>x/n);};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=(a,b)=>Math.acos(clamp(dot(a,b),-1,1));
const integer=(r,a,b)=>a+Math.floor(r()*(b-a+1));
const pick=(r,a)=>a[Math.floor(r()*a.length)];
const randomPoint=r=>{const z=(r()-.5)*1.35,a=r()*Math.PI*2,t=Math.sqrt(1-z*z);return [t*Math.cos(a),t*Math.sin(a),z];};
function frame(center,rotation=0){
 const east=unit(cross(Math.abs(center[2])>.97?[0,1,0]:[0,0,1],center)),north=cross(center,east);
 return {center,east,north,cos:Math.cos(rotation),sin:Math.sin(rotation)};
}
function near(r,center,spread){
 const f=frame(center),a=r()*2*Math.PI,d=spread*Math.sqrt(r());
 return unit(center.map((v,k)=>v*Math.cos(d)+Math.sin(d)*(f.east[k]*Math.cos(a)+f.north[k]*Math.sin(a))));
}
export function planNaturalGeography(seed,{landPercent=32,continentCores=8}={}){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw RangeError('seed must be uint32');
 const r=templateRng(seed^0x811c9),primary=randomPoint(r);
 // Reserve an ocean sector to the SIDE of the old world. Reserving its
 // antipode forced every remote group into the same hemisphere.
 const turn=1.65,basin=near(r,unit([primary[0]*Math.cos(turn)-primary[1]*Math.sin(turn),primary[0]*Math.sin(turn)+primary[1]*Math.cos(turn),-primary[2]*.5]),.30);
 const structureCoin=templateRng(seed^0xfed915)();
 const structure=structureCoin<.20?'aggregated':structureCoin<.80?'balanced':'fragmented';
 const groupChoice=r(),groupCount=structure==='aggregated'?2:structure==='balanced'?3:(groupChoice<.5?3:4);
 const spread=structure==='aggregated'?[.30,.25]:structure==='balanced'?[.45,.40]:[.60,.40];
 const groups=[{id:0,center:primary,spread:spread[0]+r()*spread[1]}];
 for(let i=1;i<groupCount;i++){
  let best=null,score=-Infinity;
  for(let k=0;k<40;k++){
   const c=randomPoint(r),a=angle(c,basin),b=Math.min(...groups.map(g=>angle(c,g.center)));
   // Remote old/new-world group; leave a broad ocean sector empty.
   const quality=Math.min(a,1.2)*.6+Math.min(b,2.45);
   if(quality>score){score=quality;best=c;}
  }
  groups.push({id:i,center:best,spread:spread[0]*.8+r()*spread[1]});
 }
 const count=landPercent===25?integer(r,4,6):integer(r,Math.max(5,continentCores-2),Math.min(8,continentCores));
 const share=structure==='aggregated'?.65+.15*r():structure==='balanced'?.44+.14*r():.30+.12*r();
 const primaryCount=Math.min(count-groupCount+1,Math.max(2,Math.round(count*share)));
 const cores=[];
 for(let i=0;i<count;i++){
  const group=i<primaryCount?0:1+(i-primaryCount)%(groups.length-1),g=groups[group];
  let center;
  for(let attempt=0;attempt<40;attempt++){
   center=near(r,g.center,g.spread);
   if(Math.abs(center[2])<.866&&angle(center,basin)>.85&&cores.every(c=>angle(c.center,center)>.20))break;
  }
  const name=pick(r,['continents','continents','oldWorld','pangea','shattered']);
  cores.push({type:'continent',index:i,groupId:group,structure,name,seed:(r()*4294967296)>>>0,
   ...frame(center,r()*Math.PI*2),radius:(.44+r()*.22)*(i===0?1.25:1)});
 }
 return {groups,basin,primaryCount,cores,structure};
}
function project(points,map,item,scale,values){
 const radius=Math.min(1.6,item.radius*scale),extent=2*Math.sin(radius/2);
 const aspect=map.width/map.height,sx=extent*Math.sqrt(aspect),sy=extent/Math.sqrt(aspect);
 // No envelope is allowed to define the coast: outer native samples are sea.
 const cutoff=Math.cos(Math.min(2.7,radius*Math.sqrt(aspect+1/aspect)*1.25));
 for(let i=0;i<points.length;i++){
  const p=points[i],forward=dot(p,item.center);if(forward<cutoff)continue;
  const factor=Math.sqrt(2/(1+forward)),e=dot(p,item.east)*factor,n=dot(p,item.north)*factor;
  const x=(e*item.cos+n*item.sin)/sx,y=(n*item.cos-e*item.sin)/sy;
  if(Math.abs(x)>1||Math.abs(y)>1)continue;
  const value=sampleNativePatch(map,(x+1)/2,(y+1)/2)-20;
  if(value>values[i])values[i]=value;
 }
}
function compose(grid,points,patches,scale){
 const scores=new Float32Array(points.length);scores.fill(-30);
 const groups=new Map();
 for(const {map,item} of patches){
  if(item.type!=='continent')continue;
  if(!groups.has(item.groupId)){const field=new Float32Array(points.length);field.fill(-30);groups.set(item.groupId,field);}
  project(points,map,item,scale,groups.get(item.groupId));
 }
 const fields=[...groups.values()],owners=new Int8Array(points.length);
 for(let i=0;i<points.length;i++){
  let best=-30,second=-30;
  for(let k=0;k<fields.length;k++){const v=fields[k][i];if(v>best){second=best;best=v;owners[i]=k;}else if(v>second)second=v;}
  // As in grouped crust construction, neighbouring cores in one group may
  // merge. Different groups retain a meandering strait where their fields
  // compete, rather than joining automatically at a pole or narrow isthmus.
  if(second> -2){
   const t=clamp((best-second)/5,0,1),gate=1-t*t*(3-2*t);
   best-=(Math.max(0,best)+2.5)*gate;
  }
  scores[i]=best;
 }
 // At 36,002 cells a narrow continuous channel can fall BETWEEN samples.
 // Preserve one sea cell on each competing-group edge, on the lower side.
 // Aggregated worlds deliberately permit inter-group joining instead.
 const channel=new Uint8Array(points.length);
 if(patches[0].item.structure!=='aggregated')for(let i=0;i<scores.length;i++)if(scores[i]>=0){
  for(const j of grid.neighbors[i])if(scores[j]>=0&&owners[i]!==owners[j]&&
   (scores[i]<scores[j]||(scores[i]===scores[j]&&i<j))){channel[i]=1;break;}
 }
 for(const {map,item} of patches)if(item.type!=='continent')project(points,map,item,1,scores);
 for(let i=0;i<scores.length;i++)if(channel[i])scores[i]=Math.min(scores[i],-1);
 return scores;
}
function landArea(grid,scores){let area=0;for(let i=0;i<scores.length;i++)if(scores[i]>=0)area+=grid.areas[i];return area;}
function calibrate(grid,points,patches,target){
 let lo=.45,hi=3.2,best=null;
 for(let k=0;k<11;k++){
  const scale=(lo+hi)/2,scores=compose(grid,points,patches,scale),area=landArea(grid,scores);
  if(!best||Math.abs(area-target)<Math.abs(best.area-target))best={scale,scores,area};
  if(area<target)lo=scale;else hi=scale;
 }
 return best;
}
function nativeMap(item){
 let map;
 for(let trial=0;trial<5;trial++){
  map=executeNativeAzgaarPatch(item.name,(item.seed+Math.imul(trial,2654435761))>>>0);
  if(!map.touchesCanvas)break;
 }
 return map;
}
export function largestOceanSeed(grid){
 const seen=new Uint8Array(grid.heights.length);let largest=-1,seed=-1;
 for(let i=0;i<seen.length;i++){
  if(seen[i]||grid.heights[i]>=0)continue;
  const queue=[i];seen[i]=1;let area=0;
  for(let h=0;h<queue.length;h++){
   const c=queue[h];area+=grid.areas[c];
   for(const j of grid.neighbors[c])if(!seen[j]&&grid.heights[j]<0){seen[j]=1;queue.push(j);}
  }
  if(area>largest){largest=area;seed=i;}
 }
 if(seed<0)throw Error('Natural planet has no ocean');
 return seed;
}
function islandPlan(grid,mainScores,geography,seed){
 const r=templateRng(seed^0x31e14),coasts=[];
 for(let i=0;i<mainScores.length;i++)if(mainScores[i]<0&&grid.neighbors[i].some(j=>mainScores[j]>=0))coasts.push(i);
 const islands=[];
 for(let i=0,n=integer(r,9,14);i<n;i++){
  const coastal=r()<.8;
  let center;
  if(coastal&&coasts.length){
   let cell=pick(r,coasts);
   for(let step=0,n=integer(r,1,4);step<n;step++){
    const choices=grid.neighbors[cell].filter(j=>mainScores[j]<0);if(!choices.length)break;cell=pick(r,choices);
   }
   center=grid.points[cell];
  }else center=randomPoint(r);
  const type=i<5?'archipelago':'island';
  islands.push({type,index:i,name:type==='archipelago'?'archipelago':pick(r,['volcano','highIsland','lowIsland','peninsula']),
   seed:(r()*4294967296)>>>0,...frame(center,r()*Math.PI*2),radius:type==='archipelago'?.14+r()*.12:.055+r()*.10,
   placement:coastal?'continental-margin':'oceanic'});
 }
 return islands;
}
export function createNaturalLand({seed,landPercent=32,continentCores=8}={}){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw RangeError('seed must be uint32');
 if(![25,32,45].includes(landPercent))throw RangeError('landPercent must be 25, 32 or 45');
 if(!Number.isInteger(continentCores)||continentCores<6||continentCores>10)throw RangeError('continentCores must be 6..10');
 const grid=createGlobalGrid(),total=grid.areas.reduce((s,x)=>s+x,0),geography=planNaturalGeography(seed,{landPercent,continentCores});
 // Small, seamless coordinate detail only; native command geometry carries
 // the silhouette. A large world-space warp used to distort whole continents.
 const points=grid.points.map(p=>unit(p.map((x,k)=>x+.022*valueNoise3(p,11,seed^Math.imul(k+1,7919)))));
 const patches=geography.cores.map(item=>({item,map:nativeMap(item)}));
 const initial=calibrate(grid,points,patches,total*(landPercent-1)/100);
 for(const item of islandPlan(grid,initial.scores,geography,seed))patches.push({item,map:nativeMap(item)});
 const fitted=calibrate(grid,points,patches,total*landPercent/100),scores=fitted.scores;
 const rank=Array.from(grid.areas,(area,i)=>({i,area,value:scores[i]+valueNoise3(grid.points[i],17,seed)*.00001}));
 rank.sort((a,b)=>b.value-a.value||a.i-b.i);
 const target=total*landPercent/100;let selectedArea=0,count=0;
 while(count<rank.length&&selectedArea+rank[count].area/2<target){selectedArea+=rank[count].area;count++;}
 const boundary=(rank[count-1].value+rank[count].value)/2;
 if(boundary< -5)throw Error('Global template scale did not provide sufficient land');
 const selected=new Uint8Array(points.length),rawRelief=new Float32Array(points.length);
 for(let k=0;k<count;k++)selected[rank[k].i]=1;
 for(let i=0;i<points.length;i++){rawRelief[i]=Math.max(.05,scores[i]-boundary);grid.heights[i]=selected[i]?clamp(Math.round(rawRelief[i]),1,99):-20;}
 return {grid,oceanSeed:largestOceanSeed(grid),rawRelief,
  templatePlacements:patches.map(({item,map})=>({...item,seed:map.seed,radius:item.radius*(item.type==='continent'?fitted.scale:1),
   nativeWidth:map.width,nativeHeight:map.height,blobPower:map.blobPower,linePower:map.linePower})),
  geography,globalScale:fitted.scale,measuredLandPercent:100*selectedArea/total,tolerancePercent:100*Math.max(...grid.areas)/total,
  areaCorrectionLevel:boundary,acceptedContinents:geography.cores.length,
  settings:{seed,landPercent,continentCores,gridCells:36002}};
}
