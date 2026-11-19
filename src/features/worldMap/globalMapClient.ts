import type {GlobalMapProject,GlobalMapSettings,NaturalFeaturePatch} from './globalMapProject';
import type {GlobalMapDrawing} from './globalMapGeometry';
export type GlobalMapResult={project:GlobalMapProject;drawing:GlobalMapDrawing};
export class GlobalMapClient {
 private sequence=0;
 private pending=new Map<number,{resolve:(v:GlobalMapResult)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>;generate:boolean}>();
 private closed=false;
 constructor(private worker:Worker){
  worker.onmessage=event=>{const result=event.data,p=this.pending.get(result.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(result.id);if(result.error)p.reject(Error(result.error));else if(p.generate&&!(result.project?.geologyVersion===4&&result.project?.climateVersion===1&&result.project?.packSettings?.version===1&&result.project?.naturalGeography?.version===1&&result.drawing?.relief&&result.drawing?.climate&&result.drawing?.natural))p.reject(Error('Global map generator version mismatch'));else p.resolve(result);};
  worker.onerror=()=>this.fail(Error('Global map worker failed'));
 }
 private fail(error:Error){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();}
 request(action:'generate'|'load'|'editNatural'|'rebuildPack'|'initializeNatural',value:GlobalMapSettings|GlobalMapProject,options:{patch?:NaturalFeaturePatch;language?:string}={}):Promise<GlobalMapResult>{
  if(this.closed)return Promise.reject(Error('Global map editor closed'));
  return new Promise((resolve,reject)=>{const id=++this.sequence,timer=setTimeout(()=>{this.close();reject(Error('Global map operation timed out'));},120000);this.pending.set(id,{resolve,reject,timer,generate:action==='generate'});this.worker.postMessage({id,action,...options,...(action==='generate'?{settings:value}:{project:value})});});
 }
 close(){this.closed=true;this.worker.terminate();this.fail(Error('Global map editor closed'));}
}
export function createGlobalMapClient(){
 // Resolve the standalone content-hashed asset before constructing Worker.
 // An inline new URL would make Next emit a shared #params bootstrap, which
 // legacy PWA caches can resolve using the previous request's fragment.
 const workerUrl=new URL('../../../.cache/global-map-worker.js',import.meta.url);
 return new GlobalMapClient(new Worker(workerUrl));
}
