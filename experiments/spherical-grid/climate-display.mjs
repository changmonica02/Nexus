import {KOPPEN_CODES} from './koppen-climate.mjs';
export const KOPPEN_COLORS=['#8ab8d0','#006b34','#32954a','#95ba4c','#efb554','#d7cf82','#d69d76','#cbbb9c','#e9e478','#bad46f','#98b97b','#83c7b2','#63ad96','#438d80','#b3d954','#75bd65','#3f966c','#dc9cba','#c487b0','#a773a5','#8a648d','#9da5df','#7f8bd0','#646fbd','#5057a5','#72b4df','#5797ce','#437cba','#315a9e','#b3b9b0','#f0f1ef'];
export const TEMPERATURE_COLORS=['#49357b','#536baf','#83b8d0','#c1dbd5','#ebdf9a','#efb46d','#da7754','#b83a49'];
export const RAIN_COLORS=['#d9cba7','#c7d5b2','#91bda7','#599f96','#348795','#246e9b','#324d8b','#613f7e'];
export const RAIN_LEVELS=[10,25,50,100,175,275,450];
export const TEMPERATURE_LEVELS=[-20,-5,5,15,22,28,35];
export function climateColor(layer,value){
 if(layer==='koppen')return KOPPEN_COLORS[value]??'#777';
 if(layer==='precipitation')return RAIN_COLORS[RAIN_LEVELS.filter(x=>value>=x).length];
 return TEMPERATURE_COLORS[TEMPERATURE_LEVELS.filter(x=>value>=x).length];
}
export function projectClimate(grid,model,rings){
 const project=p=>[Math.atan2(p[1],p[0])*180/Math.PI,Math.asin(Math.max(-1,Math.min(1,p[2])))*180/Math.PI];
 const arrows=[],downstream=new Map();
 for(const e of model.ocean.edges){const from=e.flux>0?e.i:e.j,to=e.flux>0?e.j:e.i,old=downstream.get(from);if(!old||Math.abs(e.flux)>old.flux)downstream.set(from,{to,flux:Math.abs(e.flux)});}
 for(let i=0;i<grid.points.length;i+=37){
  const p=grid.points[i],v=model.ocean.vectors[i],speed=Math.hypot(...v),next=downstream.get(i);if(!next||speed<.015||Math.abs(p[2])>.98||grid.heights[i]>=0)continue;
  const a=project(p),b=project(grid.points[next.to]);
  while(b[0]-a[0]>180)b[0]-=360;while(b[0]-a[0]<-180)b[0]+=360;
  arrows.push({cell:i,line:[a,b]});
 }
 return {version:1,rings,ocean:Uint8Array.from(grid.heights,h=>h<0?1:0),months:model.months.map(m=>({
  sstAnomaly:Int16Array.from(m.sstAnomaly,x=>Math.round(x*10)),temperature:Int16Array.from(m.temperature,x=>Math.round(x*10)),sst:Int16Array.from(m.sst,x=>Math.round(x*10)),precipitation:Uint16Array.from(m.precipitation,x=>Math.min(65535,Math.round(x)))})),
  koppen:model.koppen,arrows,codes:KOPPEN_CODES,diagnostics:{ocean:model.ocean.diagnostics,months:model.months.map(m=>m.diagnostics)}};
}

// Full names for presentation; compact codes remain stable model identifiers.
export function koppenName(code,zh=true){
 const simple={Ocean:['海洋','Ocean'],Af:['熱帶雨林氣候','Tropical rainforest'],Am:['熱帶季風氣候','Tropical monsoon'],Aw:['熱帶莽原氣候','Tropical savanna'],BWh:['熱沙漠氣候','Hot desert'],BWk:['寒冷沙漠氣候','Cold desert'],BSh:['熱帶半乾燥氣候','Hot semi-arid'],BSk:['寒冷半乾燥氣候','Cold semi-arid'],ET:['苔原氣候','Tundra'],EF:['冰原氣候','Ice cap']};
 if(simple[code])return simple[code][zh?0:1];
 const group=code[0]==='C'?(zh?'溫帶':'Temperate'):(zh?'冷帶':'Continental');
 const season={s:zh?'夏乾型':'dry summer',w:zh?'冬乾型':'dry winter',f:zh?'全年濕潤型':'no dry season'}[code[1]];
 const heat={a:zh?'炎夏':'hot summer',b:zh?'暖夏':'warm summer',c:zh?'涼夏':'cool summer',d:zh?'嚴冬':'severe winter'}[code[2]];
 return season&&heat?(zh?`${group}${season}氣候（${heat}）`:`${group}, ${season}, ${heat}`):code;
}
