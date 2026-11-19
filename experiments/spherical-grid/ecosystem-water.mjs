// Simplified monthly Thornthwaite PET + soil bucket, units mm/month.
// Method / limitations: https://doi.org/10.5194/essd-14-163-2022
export const MONTH_DAYS=[31,28,31,30,31,30,31,31,30,31,30,31];
export function potentialEvapotranspiration(temperature,latitude){
 const I=temperature.reduce((s,t)=>s+(Math.max(0,t)/5)**1.514,0),a=6.75e-7*I**3-7.71e-5*I**2+.01792*I+.49239;
 return temperature.map((t,m)=>{
  if(t<=0||!I)return 0;
  const decl=23.44*Math.PI/180*Math.sin(2*Math.PI*(m-2.5)/12),lat=latitude*Math.PI/180;
  const length=24/Math.PI*Math.acos(Math.max(-1,Math.min(1,-Math.tan(lat)*Math.tan(decl))));
  const normal=t<26.5?16*(10*t/I)**a:-415.85+32.24*t-.43*t*t;
  return Math.max(0,normal*length/12*MONTH_DAYS[m]/30);
 });
}
export function monthlyWaterBalance(temperature,precipitation,latitude){
 const pet=potentialEvapotranspiration(temperature,latitude),runoff=Array(12).fill(0),aet=Array(12).fill(0),soil=Array(12).fill(0),snow=Array(12).fill(0),storageChange=Array(12).fill(0),snowChange=Array(12).fill(0);let storage=75,snowpack=0;
 // Spin a periodic climatological bucket, retaining cold-season snowfall.
 for(let year=0;year<8;year++)for(let m=0;m<12;m++){
  const initialSoil=storage,initialSnow=snowpack;
  const p=precipitation[m],cold=temperature[m]<=0;if(cold)snowpack+=p;
  const melt=Math.min(snowpack,Math.max(0,temperature[m])*MONTH_DAYS[m]*2);snowpack-=melt;
  const water=(cold?0:p)+melt,quick=.12*water;storage+=water-quick;
  aet[m]=Math.min(storage,pet[m]);storage-=aet[m];runoff[m]=quick+Math.max(0,storage-150);storage=Math.min(150,storage);
  soil[m]=storage;snow[m]=snowpack;storageChange[m]=storage-initialSoil;snowChange[m]=snowpack-initialSnow;
 }
 return {pet,aet,runoff,soil,snow,storageChange,snowChange,annualDeficit:pet.reduce((s,x,m)=>s+Math.max(0,x-aet[m]),0),snowAccumulationMm:snowChange.reduce((s,x)=>s+x,0)};
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
 const hot=Math.max(...t),cold=Math.min(...t),annual=p.reduce((s,x)=>s+x,0),pet=water.pet.reduce((s,x)=>s+x,0),aridity=pet?annual/pet:Infinity;
 if(hot<10)return 'T6';if(wetland)return 'TF1';if(aridity<.5)return 'T5';
 const dry=water.pet.filter((x,m)=>x>p[m]*1.5).length;
 if(dry>=4&&aridity<.95)return hot>20&&cold>12?'T4':'T3';
 if(aridity<.8)return 'T4';return cold>15?'T1':'T2';
}
