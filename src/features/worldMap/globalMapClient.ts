import {isGenerationProgress,type GenerationProgress} from './globalMapProgress';
import type {GlobalMapProject,GlobalMapSettings,NaturalFeaturePatch} from './globalMapProject';
import type {GlobalMapDrawing} from './globalMapGeometry';
export type HeightBrush={longitude:number;latitude:number;radius:number;strength:number;tool:'raise'|'lower'|'raiseGradient'|'lowerGradient'|'smooth'|'noise'|'line';end?:[number,number];mode:'preserve'|'free';target:'land'|'ocean'};
export type HeightStroke={brush:Omit<HeightBrush,'longitude'|'latitude'>;points:[number,number][]};
export type GlobalMapResult={project:GlobalMapProject;drawing:GlobalMapDrawing};
export class GlobalMapClient {
 private sequence=0;
 private pending=new Map<number,{resolve:(v:GlobalMapResult)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>;generate:boolean;onProgress?:(progress:GenerationProgress)=>void}>();
 private closed=false;
 constructor(private worker:Worker){
  worker.onmessage=event=>{const result=event.data,p=this.pending.get(result.id);if(!p)return;if('progress' in result){if(isGenerationProgress(result.progress))p.onProgress?.(result.progress);return;}clearTimeout(p.timer);this.pending.delete(result.id);if(result.error)p.reject(Error(result.error));else if(p.generate&&!(result.project?.terrain?.version===2&&result.project?.geologyVersion===4&&result.project?.climateVersion===2&&result.project?.packSettings?.version===1&&result.project?.naturalGeography?.version===1&&result.drawing?.relief&&result.drawing?.climate&&result.drawing?.natural))p.reject(Error('Global map generator version mismatch'));else p.resolve(result);};
  worker.onerror=()=>this.fail(Error('Global map worker failed'));
 }
 private fail(error:Error){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();}
 request(action:'preview'|'generate'|'load'|'editNatural'|'rebuildPack'|'initializeNatural'|'editHeight'|'recalculateNature',value:GlobalMapSettings|GlobalMapProject,options:{patch?:NaturalFeaturePatch;brush?:HeightBrush;stroke?:HeightStroke;language?:string;onProgress?:(progress:GenerationProgress)=>void}={}):Promise<GlobalMapResult>{
  if(this.closed)return Promise.reject(Error('Global map editor closed'));
  const {onProgress,...payload}=options;
  return new Promise((resolve,reject)=>{const id=++this.sequence,timer=setTimeout(()=>{this.close();reject(Error('Global map operation timed out'));},120000);this.pending.set(id,{resolve,reject,timer,generate:action==='generate',onProgress});try{this.worker.postMessage({id,action,...payload,...(action==='generate'||action==='preview'?{settings:value}:{project:value})});}catch(error){clearTimeout(timer);this.pending.delete(id);reject(error);}});
 }
 close(){this.closed=true;this.worker.terminate();this.fail(Error('Global map editor closed'));}
}
// A function boundary is deliberate: Next follows local URL aliases and would
// otherwise turn this into a shared fragment bootstrap even with a URL variable.
function createClassicWorker(assetUrl:URL){return new Worker(assetUrl);}
export function createGlobalMapClient(){
 return new GlobalMapClient(createClassicWorker(new URL('../../../.cache/global-map-worker.js',import.meta.url)));
}
