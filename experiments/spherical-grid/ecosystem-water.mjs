import {km} from './geologic-fields.mjs';
// Simplified monthly Thornthwaite PET + soil bucket, units mm/month.
// Method / limitations: https://doi.org/10.5194/essd-14-163-2022
export const MONTH_DAYS=[31,28,31,30,31,30,31,31,30,31,30,31];
export function potentialEvapotranspiration(temperature,latitude){
 const I=temperature.reduce((s,t)=>s+(Math.max(0,t)/5)**1.514,0),a=6.75e-7*I**3-7.71e-5*I**2+.01792*I+.49239;
 return temperature.map((t,m)=>{
  if(t<=0||!I)return 0;
  const decl=23.44*Math.PI/180*Math.sin(2*Math.PI*(m-2.5)/12),lat=latitude*Math.PI/180;
  const length=24/Math.PI*Math.acos(Math.max(-1,Math.min(1,-Math.tan(lat)*Math.tan(decl))));
  const normal=t<26.5?16*(10*t/I)**a:-415.85+32.24*Math.min(t,38)-.43*Math.min(t,38)**2+Math.max(0,t-38)*6;
  return Math.max(0,normal*length/12*MONTH_DAYS[m]/30);
 });
}
export function monthlyWaterBalance(temperature,precipitation,latitude,{capacityMm=150}={}){
 const capacity=Math.max(60,Math.min(240,capacityMm));
 const pet=potentialEvapotranspiration(temperature,latitude),runoff=Array(12).fill(0),aet=Array(12).fill(0),soil=Array(12).fill(0),snow=Array(12).fill(0),storageChange=Array(12).fill(0),snowChange=Array(12).fill(0);let storage=capacity/2,snowpack=0;
 // Spin a periodic climatological bucket, retaining cold-season snowfall.
 for(let year=0;year<8;year++)for(let m=0;m<12;m++){
  const initialSoil=storage,initialSnow=snowpack;
  const p=precipitation[m],cold=temperature[m]<=0;if(cold)snowpack+=p;
  const melt=Math.min(snowpack,Math.max(0,temperature[m])*MONTH_DAYS[m]*2);snowpack-=melt;
  const water=(cold?0:p)+melt,quick=.12*water;storage+=water-quick;
  aet[m]=Math.min(storage,pet[m]);storage-=aet[m];runoff[m]=quick+Math.max(0,storage-capacity);storage=Math.min(capacity,storage);
  soil[m]=storage;snow[m]=snowpack;storageChange[m]=storage-initialSoil;snowChange[m]=snowpack-initialSnow;
 }
 return {capacityMm:capacity,pet,aet,runoff,soil,snow,storageChange,snowChange,annualDeficit:pet.reduce((s,x,m)=>s+Math.max(0,x-aet[m]),0),snowAccumulationMm:snowChange.reduce((s,x)=>s+x,0)};
}
// This is a Level-2 potential-ecosystem model, not a surveyed GET assignment.
// Azgaar's 13 classes inform climate / river moisture concepts only, not IDs.
export const ECOSYSTEMS=[
 ['T1','Tropical-subtropical forests','熱帶與亞熱帶森林','#268447'],['T2','Temperate-boreal forests and woodlands','溫帶與寒帶森林及疏林','#508356'],
 ['T3','Shrublands and shrubby woodlands','灌叢與灌木疏林','#b1a66c'],['T4','Savannas and grasslands','莽原與草原','#b8c47d'],['T5','Deserts and semi-deserts','沙漠與半沙漠','#dcc18d'],['T6','Polar-alpine','極地與高山生態','#c5cccf'],
 ['F1','Rivers and streams','河流與溪流','#278ec2'],['F2','Lakes','湖泊','#4e9ec3'],['M1','Marine shelf','海洋大陸棚','#76bac8'],['M2','Pelagic ocean waters','遠洋水域','#376e9d'],['M3','Deep sea floors','深海海床','#264964'],['S1','Subterranean lithic','地下岩石生態系統','#8d7a8b'],['TF1','Palustrine wetlands','內陸沼澤濕地','#589e8a']
];
export function classifyPotentialEcosystem(t,p,water,{ocean=false,depth=0,lake=false,river=false,wetland=false}={}){
 if(ocean)return depth<=200?'M1':'M2';if(lake)return 'F2';if(river)return 'F1';
 const hot=Math.max(...t),cold=Math.min(...t),mean=t.reduce((s,x)=>s+x,0)/12,annual=p.reduce((s,x)=>s+x,0),pet=water.pet.reduce((s,x)=>s+x,0),aridity=pet>1?annual/pet:Infinity;
 // Growing-season moisture matters more than winter rain/snow: a wet winter
 // must not turn summer-dry lowlands into evergreen forest.
 const growing=t.map((x,m)=>x>5?m:-1).filter(m=>m>=0),warm=t.filter(x=>x>=10).length;
 const demand=growing.reduce((s,m)=>s+water.pet[m],0),supply=growing.reduce((s,m)=>s+p[m],0),growingRatio=demand>1?supply/demand:aridity;
 const dry=growing.filter(m=>water.pet[m]>p[m]*1.5).length;
 const deficit=Number.isFinite(water.annualDeficit)?water.annualDeficit/Math.max(1,pet):Math.max(0,1-aridity);
 if(hot<10)return 'T6';
 if(wetland)return 'TF1';
 // Include cold deserts even where low PET alone suggests abundant moisture.
 const seasonalThreshold=Math.max(100,20*mean+140);
 if(aridity<.35||annual<seasonalThreshold*.5||(aridity<.5&&deficit>.45))return 'T5';
 const tropical=cold>=18&&warm>=10;
 if(tropical){
  if(aridity>=.8&&growingRatio>=.75&&dry<=4&&annual>=1000)return 'T1';
  return aridity<.5&&annual<350?'T5':'T4';
 }
 if(dry>=3&&(growingRatio<.8||deficit>.3))return hot>20&&cold>12?'T4':'T3';
 if(aridity<.65||growingRatio<.65||annual<400)return 'T4';
 return 'T2';
}

/** Terrain proxy, not a soil survey. Heights are metres; distances are km. */
export function terrainWaterCapacity(pack,i){
 const h=pack.heights[i],neighbors=pack.neighbors[i].filter(j=>pack.heights[j]>=0);
 if(!neighbors.length)return {capacityMm:150,slope:0,relativeHeightM:0};
 const slope=Math.max(...neighbors.map(j=>Math.abs(h-pack.heights[j])/Math.max(1,km(pack.points[i],pack.points[j])*1000)));
 const relativeHeightM=h-neighbors.reduce((s,j)=>s+pack.heights[j],0)/neighbors.length;
 const capacityMm=Math.max(60,Math.min(240,180-2200*slope-Math.max(0,relativeHeightM)*.07+Math.min(60,Math.max(0,-relativeHeightM)*.12)));
 return {capacityMm,slope,relativeHeightM};
}
// Climate-estimated habitat descriptions, deliberately distinct from official
// GET Level 3 identifiers: fire, soils, species and land use are not observed.
export const HABITATS=[
 ['rainforest','Tropical rainforests','熱帶雨林','#19743b','T1'],
 ['seasonal-forest','Tropical seasonal forests','熱帶季雨林','#52933c','T1'],
 ['montane-forest','Moist subtropical montane forests','濕潤亞熱帶山地森林','#397d67','T1'],
 ['boreal','Boreal and cold montane forests','寒帶與寒冷山地針葉林','#486f61','T2'],
 ['temperate-rainforest','Cool temperate rainforests','冷溫帶雨林','#327e6c','T2'],
 ['deciduous','Temperate broadleaf forests','溫帶落葉闊葉林','#669653','T2'],
 ['evergreen','Warm temperate evergreen forests','暖溫帶常綠闊葉林','#42894c','T2'],
 ['dry-shrub','Warm dry shrublands','暖地乾燥灌叢','#a49a58','T3'],
 ['seasonal-shrub','Seasonally dry temperate shrublands','溫帶季節乾燥灌叢','#aca373','T3'],
 ['woodland','Seasonal open woodlands','季節性疏林','#94a766','T4'],
 ['savanna','Tropical savannas','熱帶莽原','#bdbe6b','T4'],
 ['steppe','Dry temperate steppes','溫帶乾燥草原','#b8b38a','T4'],
 ['grassland','Subhumid grasslands','半濕潤草原','#a9bd79','T4'],
 ['hot-desert','Hot deserts','熱沙漠','#dcc18d','T5'],
 ['cold-desert','Cold deserts','寒冷沙漠','#c9bc9e','T5'],
 ['semi-desert','Semi-deserts','半沙漠','#c6be8a','T5'],
 ['tundra','Polar tundra','極地苔原','#a5b9a8','T6'],
 ['alpine','Alpine tundra and meadows','高山苔原與草甸','#9aaf9b','T6'],
 ['snow-ice','Persistent snow and ice','持續積雪與冰原','#e6ecec','T6'],
 ['wetland','Water-supported wetlands','河湖補水與沼澤濕地','#589e8a','TF1'],
 ['lake','Lakes','湖泊','#4e9ec3','F2'],
 ['shelf','Marine shelf','海洋大陸棚','#76bac8','M1'],
 ['ocean','Pelagic ocean waters','遠洋水域','#376e9d','M2'],
 ['deep-floor','Deep sea floors','深海海床','#264964','M3'],
];
export function classifyPotentialHabitat(t,p,water,options={}){
 const biome=classifyPotentialEcosystem(t,p,water,options),hot=Math.max(...t),cold=Math.min(...t),mean=t.reduce((s,x)=>s+x,0)/12,annual=p.reduce((s,x)=>s+x,0),pet=water.pet.reduce((s,x)=>s+x,0),aridity=annual/Math.max(1,pet),dry=t.filter((x,m)=>x>5&&water.pet[m]>p[m]*1.5).length;
 const elevation=options.elevation??0;
 if(biome==='M1')return 'shelf';if(biome==='M2')return 'ocean';if(biome==='F2')return 'lake';if(biome==='TF1')return 'wetland';
 if(biome==='T6')return hot<0||mean<0&&water.snow?.every(x=>x>50)?'snow-ice':elevation>=1500?'alpine':'tundra';
 if(biome==='T5')return aridity>=.2&&annual>=100?'semi-desert':mean<12?'cold-desert':'hot-desert';
 if(biome==='T1')return elevation>=800?'montane-forest':Math.min(...p)>=60&&dry<=2?'rainforest':'seasonal-forest';
 if(biome==='T2'){
  if(cold< -3||mean<7)return 'boreal';
  if(annual>=1400&&aridity>1.2&&dry<=1&&hot<24)return 'temperate-rainforest';
  if(cold>=8&&hot>=22)return 'evergreen';return 'deciduous';
 }
 if(biome==='T3')return cold>=12?'dry-shrub':'seasonal-shrub';
 if(cold>=15)return 'savanna';if(aridity>=.7&&dry>=3)return 'woodland';return aridity<.65?'steppe':'grassland';
}
