/** Nexus-only geography boundary. It owns no world IDs, attachments or account state. */
import {heightmapTemplates} from '@/data/heightmap-templates';
import {precreatedHeightmaps} from '@/data/precreated-heightmaps';
import {drawHeights,drawHeightmapView as drawHeightmap} from '@/renderers/draw-heightmap';
import {HeightmapColorSchemes} from '@/renderers/heightmap-color-schemes';
import {Layers,type LayerId} from '@/components/layers';
export type NaturalConfig={template:string;seed:string;width:number;height:number;points:number;equator:number;precipitation:number;naturalOnly:true};
export function naturalCatalog(){
  return [...Object.entries(heightmapTemplates).map(([id,t])=>({id,name:t.name,kind:'procedural'})),...Object.entries(precreatedHeightmaps).map(([id,t])=>({id,name:t.name,kind:'precreated'}))];
}
export function naturalConfig(value:Partial<NaturalConfig>={}):NaturalConfig{
  const number=(v:unknown,fallback:number,min:number,max:number)=>{const n=v===undefined?fallback:Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error('Invalid geography settings');return n;};
  const template=value.template??'continents';
  if(!naturalCatalog().some(t=>t.id===template))throw Error('Unknown heightmap template');
  return {template,seed:String(value.seed??'Nexus').slice(0,128),width:number(value.width,1280,320,4096),height:number(value.height,800,240,4096),points:number(value.points,10000,1000,30000),equator:number(value.equator,25,-40,50),precipitation:number(value.precipitation,100,0,500),naturalOnly:true};
}
/** A separate grid, a restored PRNG, no options/grid/pack replacement and no repository writes. */
export async function previewNaturalHeightmap(value:Partial<NaturalConfig>):Promise<Blob>{
  const config=naturalConfig(value),random=Math.random;
  try{
    const graph=Grid.generate(config.seed,config.width,config.height,Math.min(config.points,5000));
    const shape={width:config.width,height:config.height,points:Math.min(config.points,5000)};
    const heights=config.template in heightmapTemplates?HeightmapGenerator.fromTemplate(graph,config.template,shape):await HeightmapGenerator.fromPrecreated(graph,config.template,shape);
    const url=drawHeights({heights,width:graph.cellsX,height:graph.cellsY,scheme:HeightmapColorSchemes.get('spectral'),renderOcean:true});
    return await (await fetch(url)).blob();
  }finally{HeightmapGenerator.clearData();Math.random=random;}
}
const views:Record<string,LayerId[]>={physical:['heightmap','ice'],contours:['heightmap'],temperature:['temperature'],precipitation:['precipitation'],biomes:['biomes'],political:['states'],cultural:['cultures'],religions:['religions']};
export function applyNaturalView(view:string,overlays:string[]=['lakes','rivers','scaleBar'],interval=5,labels=false):void{
  if(!(view in views))return;
  const allowed:LayerId[]=['lakes','rivers','borders','labels','burgIcons','routes','scaleBar','coordinates'];
  Layers.set([...views[view],...allowed.filter(id=>overlays.includes(id))]);
  // Override only renderer-local options, never styles or geography data.
  if(view==='contours')drawHeightmap({contourInterval:Math.max(1,Math.min(20,interval)),contourLabels:labels});
}
export function markGeographyStale():void{
  options.map.nexus={version:1,naturalOnly:options.map.nexus?.naturalOnly??false,stale:['hydrology','climate','biomes']};
}
