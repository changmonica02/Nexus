import type {GlobalMapProject,GlobalMapSettings} from './globalMapProject';
import type {GlobalMapDrawing} from './globalMapGeometry';
export type GlobalMapResult={project:GlobalMapProject;drawing:GlobalMapDrawing};
export class GlobalMapClient {
 private sequence=0;
 private pending=new Map<number,{resolve:(v:GlobalMapResult)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
 private closed=false;
 constructor(private worker:Worker){
  worker.onmessage=event=>{const result=event.data,p=this.pending.get(result.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(result.id);if(result.error)p.reject(Error(result.error));else p.resolve(result);};
  worker.onerror=()=>this.fail(Error('Global map worker failed'));
 }
 private fail(error:Error){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();}
 request(action:'generate'|'load',value:GlobalMapSettings|GlobalMapProject):Promise<GlobalMapResult>{
  if(this.closed)return Promise.reject(Error('Global map editor closed'));
  return new Promise((resolve,reject)=>{const id=++this.sequence,timer=setTimeout(()=>{this.close();reject(Error('Global map operation timed out'));},120000);this.pending.set(id,{resolve,reject,timer});this.worker.postMessage({id,action,...(action==='generate'?{settings:value}:{project:value})});});
 }
 close(){this.closed=true;this.worker.terminate();this.fail(Error('Global map editor closed'));}
}
export function createGlobalMapClient(){return new GlobalMapClient(new Worker(new URL('../../../.cache/global-map-worker.js',import.meta.url)));}
