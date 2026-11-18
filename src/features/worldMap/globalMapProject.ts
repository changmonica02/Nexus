/** Pure-data contract. Validation never regenerates terrain from the seed. */
export const GLOBAL_MAP_ENGINE = 'nexus-global' as const;
export const GLOBAL_MAP_VERSION = '1';
export const GLOBAL_MAP_CELLS = 36002;
export type GlobalMapSettings = {seed:number;landPercent:25|32|45;continentCores:number;gridCells:36002};
export type IslandGenesis={version:1;cells:number[];chains:{id:string;kind:'volcanic-arc'|'hotspot';plateId:number;cells:number[];agesMa:number[]}[]};
export type GlobalMapProject = {
 format:'nexus-global-map';version:1;settings:GlobalMapSettings;geologyVersion?:2|3|4;islandGenesis?:IslandGenesis;
 terrain:{format:'nexus-spherical-grid-prototype';version:1;frequency:60;cells:36002;
 heightScaleMetres:100;seaLevel:0;oceanSeed:number;revision:number;heights:number[];checksum:string};
};
export function heightChecksum(heights:readonly number[]) {
 let hash=2166136261;
 for(const value of heights)hash=Math.imul(hash^(value+128),16777619)>>>0;
 return hash.toString(16).padStart(8,'0');
}
export function validateGlobalSettings(value:unknown):asserts value is GlobalMapSettings {
 const s=value as GlobalMapSettings;
 if(!s||!Number.isInteger(s.seed)||s.seed<0||s.seed>0xffffffff||![25,32,45].includes(s.landPercent)||
 !Number.isInteger(s.continentCores)||s.continentCores<6||s.continentCores>10||s.gridCells!==36002)throw Error('Invalid global map settings');
}
export function validateGlobalMapProject(value:unknown):asserts value is GlobalMapProject {
 const p=value as GlobalMapProject;
 if(!p||p.format!=='nexus-global-map'||p.version!==1||(p.geologyVersion!==undefined&&p.geologyVersion!==2&&p.geologyVersion!==3&&p.geologyVersion!==4))throw Error('Unsupported global map version');
 validateGlobalSettings(p.settings);
 const g=p.islandGenesis;
 if(g!==undefined){
  const validCell=(i:number)=>Number.isInteger(i)&&i>=0&&i<36002;
  if(p.geologyVersion!==4||!g||g.version!==1||!Array.isArray(g.cells)||!g.cells.length||g.cells.length>64||!g.cells.every(validCell)||new Set(g.cells).size!==g.cells.length||
   !Array.isArray(g.chains)||!g.chains.length||g.chains.length>4||!g.chains.every(c=>c&&typeof c.id==='string'&&c.id.length<100&&['volcanic-arc','hotspot'].includes(c.kind)&&Number.isInteger(c.plateId)&&c.plateId>=0&&c.plateId<12&&Array.isArray(c.cells)&&c.cells.length>=2&&c.cells.length<=5&&c.cells.every(i=>g.cells.includes(i))&&Array.isArray(c.agesMa)&&c.agesMa.length===c.cells.length&&c.agesMa.every(a=>Number.isFinite(a)&&a>=0&&a<=24)))throw Error('Invalid island genesis');
 }

 const t=p.terrain;
 if(!t||t.format!=='nexus-spherical-grid-prototype'||t.version!==1||t.frequency!==60||t.cells!==36002||t.heightScaleMetres!==100||t.seaLevel!==0||
 !Array.isArray(t.heights)||t.heights.length!==36002||!t.heights.every(h=>Number.isInteger(h)&&h>=-100&&h<=100)||
 !Number.isInteger(t.oceanSeed)||t.oceanSeed<0||t.oceanSeed>=36002||t.heights[t.oceanSeed]>=0||
 !Number.isSafeInteger(t.revision)||t.revision<0||t.checksum!==heightChecksum(t.heights))throw Error('Invalid global map terrain snapshot');
 if(g&&g.cells.some(i=>t.heights[i]<0))throw Error('Generated island is submerged');
}
export async function readGlobalMapProject(blob:Blob):Promise<GlobalMapProject> {
 if(blob.size>2_000_000)throw Error('Global map file is too large');
 const value:unknown=JSON.parse(await blob.text());validateGlobalMapProject(value);return value;
}
export function globalMapBlob(project:GlobalMapProject) {
 validateGlobalMapProject(project);
 return new Blob([JSON.stringify(project)],{type:'application/json'});
}
