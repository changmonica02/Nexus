import type {GlobalMapResult} from './globalMapClient';
import type {GlobalMapProject} from './globalMapProject';

// Only the immediate editor opening can reuse a generated drawing. Loading
// from storage still validates the project and matches its committed contents.
let pending:{mapId:string;result:GlobalMapResult;timer:ReturnType<typeof setTimeout>}|undefined;

export function rememberGeneratedMap(mapId:string,result:GlobalMapResult){
 if(pending)clearTimeout(pending.timer);
 pending={mapId,result,timer:setTimeout(()=>{pending=undefined;},60_000)};
}

export function takeGeneratedMap(mapId:string,project:GlobalMapProject){
 const entry=pending;
 if(!entry||entry.mapId!==mapId)return undefined;
 clearTimeout(entry.timer);
 pending=undefined;
 return JSON.stringify(entry.result.project)===JSON.stringify(project)?entry.result:undefined;
}
