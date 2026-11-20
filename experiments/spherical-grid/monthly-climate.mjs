/** @type {(progress: import('../../src/features/worldMap/globalMapProgress').GenerationProgress)=>void} */
const ignoreProgress=()=>{};
import {transportSeaSurfaceTemperature as transportSST,prepareSeaSurfaceTemperatureTransport} from '../../src/features/worldMap/core/oceanHeat.mjs';
export {transportSST};
// Monthly climatological equilibrium, not a sequence of daily weather states.
import {dot,clamp,km,sphericalField} from './geologic-fields.mjs';
import {generateSurfaceOcean,seasonalWind,tangent,localBasis} from '../../src/features/worldMap/core/surfaceOcean.mjs';
import {classifyKoppen,KOPPEN_CODES} from './koppen-climate.mjs';
export const CLIMATE_PARAMETERS=Object.freeze({version:2,axialTilt:23.44,lapseRate:6.5,moistureSweeps:180,transportStepDays:.16});
const DAYS=[31,28,31,30,31,30,31,31,30,31,30,31];
export function dailyInsolation(latitude,month,tilt=23.44){
 const lat=latitude*Math.PI/180,decl=tilt*Math.PI/180*Math.sin(2*Math.PI*(month-2.5)/12);
 const h=Math.acos(clamp(-Math.tan(lat)*Math.tan(decl)));
 return Math.max(0,1361/Math.PI*(h*Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.sin(h)));
}
export function climateContext(grid){
 const ocean=[];for(let i=0;i<grid.points.length;i++)if(grid.heights[i]<0)ocean.push(i);
 const sea=sphericalField(grid,ocean),latitude=Float64Array.from(grid.points,p=>Math.asin(clamp(p[2]))*180/Math.PI);
 const insolationMean=Float64Array.from(latitude,lat=>Array.from({length:12},(_,m)=>dailyInsolation(lat,m)).reduce((a,b)=>a+b,0)/12);
 // Precompute the fixed spherical geometry once for all twelve months.
 // Keep each cell's neighbour order so sums use the original rounding order.
 const offsets=new Uint32Array(grid.points.length+1);
 for(let i=0;i<grid.points.length;i++)offsets[i+1]=offsets[i]+grid.neighbors[i].length;
 const adjacent=new Uint32Array(offsets.at(-1)),distance=new Float64Array(adjacent.length),directions=new Float64Array(adjacent.length*3),edges=[];
 for(let i=0;i<grid.points.length;i++){
  const p=grid.points[i],neighbors=grid.neighbors[i];
  for(let k=0;k<neighbors.length;k++){
   const j=neighbors[k],edge=offsets[i]+k,d=km(p,grid.points[j]),ti=tangent(p,grid.points[j]);
   adjacent[edge]=j;distance[edge]=d;directions.set(ti,edge*3);
   if(j>i)edges.push({i,j,d,ti,tj:tangent(grid.points[j],p)});
  }
 }
 const bases=grid.points.map(localBasis);
 return {sea,latitude,insolationMean,edges,bases,offsets,adjacent,distance,directions};
}
function seaEquilibrium(context,month){
 return Float64Array.from(context.latitude,(lat,i)=>clamp(28-38*Math.sin(lat*Math.PI/180)**2+.014*(dailyInsolation(lat,month-2)-context.insolationMean[i]),-1.8,33));
}
export function monthlyAtmosphere(grid,context,sst,month){
 const n=grid.points.length,temp=new Float32Array(n),thermal=new Float32Array(n),eq=seaEquilibrium(context,month);
 for(let i=0;i<n;i++){
  if(grid.heights[i]<0){temp[i]=sst[i];continue;}
  const lat=context.latitude[i],continental=1-Math.exp(-context.sea.distance[i]/800),j=context.sea.nearest[i];
  const mean=28-45*Math.sin(lat*Math.PI/180)**2,solar=dailyInsolation(lat,month-1)-context.insolationMean[i];
  const local=mean+(.032+.04*continental)*solar;
  const maritime=(j>=0?sst[j]:eq[i]),blend=.65*Math.exp(-context.sea.distance[i]/600);
  const seaLevel=local*(1-blend)+maritime*blend;
  temp[i]=seaLevel-CLIMATE_PARAMETERS.lapseRate*Math.max(0,grid.heights[i])/10;
  thermal[i]=seaLevel-eq[i];
 }
 const {bases,offsets,adjacent,distance,directions}=context;
 const winds=grid.points.map((p,i)=>{
  const w=seasonalWind(p,month,bases[i]),gradient=[0,0,0],start=offsets[i],end=offsets[i+1];
  for(let edge=start;edge<end;edge++){
   const delta=(thermal[adjacent[edge]]-thermal[i])*210/distance[edge]/(end-start);
   for(let k=0;k<3;k++)gradient[k]+=directions[edge*3+k]*delta;
  }
  const magnitude=Math.hypot(...gradient),scale=magnitude>7?7/magnitude:1;
  return w.map((v,k)=>v+gradient[k]*scale);
 });
 return {temperature:temp,winds};
}
export function transportMoisture(grid,context,temperature,sst,winds,month,{sweeps=CLIMATE_PARAMETERS.moistureSweeps}={}){
 const n=grid.points.length,area=grid.areas,dt=CLIMATE_PARAMETERS.transportStepDays;
 const edgeCount=context.edges.length;
 const offsets=new Uint32Array(n+1),fromCell=new Uint32Array(edgeCount),toCell=new Uint32Array(edgeCount),rawWeight=new Float64Array(edgeCount);
 const outWeight=new Float64Array(n),lift=new Float64Array(n),lee=new Float64Array(n);
 for(let edge=0;edge<edgeCount;edge++){
  const e=context.edges[edge],velocity=.5*(dot(winds[e.i],e.ti)-dot(winds[e.j],e.tj));
  const from=velocity>=0?e.i:e.j,to=velocity>=0?e.j:e.i,weight=Math.abs(velocity)**3;
  fromCell[edge]=from;toCell[edge]=to;rawWeight[edge]=weight;offsets[from+1]++;outWeight[from]+=weight;
  const height=Math.max(0,grid.heights[to])-Math.max(0,grid.heights[from]);
  lift[to]+=Math.max(0,height)*Math.abs(velocity)/e.d;
  lee[to]+=Math.max(0,-height)*Math.abs(velocity)/e.d;
 }
 // Store outgoing edges contiguously in the original per-cell summation order.
 for(let i=1;i<=n;i++)offsets[i]+=offsets[i-1];
 const cursor=offsets.slice(0,n),targets=new Uint32Array(edgeCount),weights=new Float64Array(edgeCount);
 for(let edge=0;edge<edgeCount;edge++){
  const from=fromCell[edge],index=cursor[from]++;
  targets[index]=toCell[edge];weights[index]=rawWeight[edge]/(outWeight[from]||1);
 }
 let water=new Float64Array(n),next=new Float64Array(n);
 const rain=new Float64Array(n),evap=new Float64Array(n),fraction=new Float64Array(n),capacity=new Float64Array(n),movement=new Float64Array(n);
 const season=Math.cos(2*Math.PI*(month-6)/12),shift=8*season;
 for(let i=0;i<n;i++){
  capacity[i]=clamp(20*Math.exp(.055*temperature[i]),.2,90);movement[i]=outWeight[i]>0?Math.min(.72,.08*Math.hypot(...winds[i])):0;
  const lat=context.latitude[i],a=Math.abs(lat-shift),itcz=Math.exp(-(((lat-shift)/11)**2)),storm=Math.exp(-(((a-50)/14)**2)),dry=1-.88*Math.exp(-(((a-27)/8)**2));
  fraction[i]=clamp((.009+.07*itcz+.035*storm)*dry+.14*lift[i],.001,.78)*Math.exp(-Math.min(2,lee[i]*.7));
  // Ocean evaporation in mm/day; sea ice suppresses it. Land recycles part
  // of its own rain below, so dry inland cells cannot create unlimited water.
  evap[i]=grid.heights[i]<0?(sst[i]<=-1.5?.08:clamp(3.2*Math.exp(.035*(sst[i]-15))*(.8+Math.hypot(...winds[i])/16),.1,6))*dt:0;
 }
 let source=0,precip=0,storage=0,previous=0;
 const averages=new Float64Array(n),window=Math.min(45,Math.floor(sweeps/3));
 for(let step=0;step<sweeps;step++){
  if(step===sweeps-1)previous=water.reduce((s,v,i)=>s+v*area[i],0);source=0;precip=0;
  next.fill(0);
  for(let i=0;i<n;i++){
   const recycling=grid.heights[i]>=0?.25*rain[i]:0;if(step===sweeps-1)source+=(evap[i]+recycling)*area[i];
   const available=water[i]+evap[i]+recycling,loss=Math.max(available*fraction[i],available-capacity[i]);rain[i]=loss;if(step===sweeps-1)precip+=loss*area[i];
   const retained=available-loss,move=movement[i];
   next[i]+=retained*(1-move);
   const carried=retained*move;
   for(let edge=offsets[i];edge<offsets[i+1];edge++){
    const target=targets[edge];
    next[target]+=carried*weights[edge]*area[i]/area[target];
   }
  }
  const previousWater=water;water=next;next=previousWater;
  if(step>=sweeps-window)for(let i=0;i<n;i++)averages[i]+=rain[i]/window;
 }
 storage=water.reduce((s,v,i)=>s+v*area[i],0);
 const rainfall=Float32Array.from(averages,x=>x/dt*DAYS[month]);
 const total=area.reduce((s,a)=>s+a,0),meanDaily=rainfall.reduce((s,p,i)=>s+p*area[i],0)/total/DAYS[month];
 return {precipitation:rainfall,diagnostics:{meanDailyMm:meanDaily,relativeBudgetError:Math.abs(storage-previous-source+precip)/Math.max(1,source),storageChangeMmPerDay:(storage-previous)/total/dt,waterColumnMm:storage/total}};
}
export function generateMonthlyClimate(grid,{onProgress=ignoreProgress}={}){
 onProgress({stage:'ocean',fraction:.56});
 const context=climateContext(grid),ocean=generateSurfaceOcean(grid),months=[];
 const transportHeat=prepareSeaSurfaceTemperatureTransport(grid,ocean);
 for(let m=0;m<12;m++){
  onProgress({stage:'climate',fraction:.62+m/12*.25});
  const equilibrium=seaEquilibrium(context,m),sst=transportHeat(equilibrium),sstAnomaly=Float32Array.from(sst,(t,i)=>t-equilibrium[i]),atmosphere=monthlyAtmosphere(grid,context,sst,m);
  const moisture=transportMoisture(grid,context,atmosphere.temperature,sst,atmosphere.winds,m);
  months.push({sst,sstAnomaly,temperature:atmosphere.temperature,precipitation:moisture.precipitation,diagnostics:{...moisture.diagnostics,oceanHeat:sst.diagnostics}});
 }
 const koppen=new Uint8Array(grid.points.length);
 for(let i=0;i<koppen.length;i++)if(grid.heights[i]>=0)koppen[i]=KOPPEN_CODES.indexOf(classifyKoppen(months.map(m=>m.temperature[i]),months.map(m=>m.precipitation[i])));
 return {version:2,parameters:CLIMATE_PARAMETERS,units:{temperature:'°C',sst:'°C',precipitation:'mm/month'},months,ocean,koppen,context};
}
