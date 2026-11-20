import type {GlobalMapDrawing} from './globalMapGeometry';
export type MapDisplayMode='terrain'|'heightmap'|'contours'|'temperature'|'precipitation'|'ecosystems'|'koppen'|'political'|'culture'|'sst'|'seabedEcosystems';
export type MapStyle='terrain'|'antique'|'modern'|'nautical'|'blueprint'|'night';
export type MapOverlay='borders'|'currents'|'rivers'|'lakes'|'plates'|'provinces'|'names'|'towns'|'roads'|'geology'|'pack';
export type GlobalMapDisplay={mode:MapDisplayMode;style:MapStyle;month:number;overlays:Record<MapOverlay,boolean>};
export const newMapDisplay=():GlobalMapDisplay=>({mode:'terrain',style:'terrain',month:0,overlays:{borders:false,currents:false,rivers:true,lakes:true,plates:false,provinces:false,names:false,towns:false,roads:false,geology:false,pack:false}});
export const displayModes:[MapDisplayMode,string,string][]=[['terrain','地形','Terrain'],['heightmap','高度圖','Elevation'],['contours','等高線','Contours'],['temperature','溫度','Temperature'],['precipitation','降雨','Precipitation'],['ecosystems','生態','Ecosystems'],['koppen','氣候','Climate'],['political','政治','Political'],['culture','文化','Culture']];
export const mapStyles:[MapStyle,string,string][]=[['terrain','地形','Terrain'],['antique','古典','Antique'],['modern','現代','Modern'],['nautical','航海','Nautical'],['blueprint','藍圖','Blueprint'],['night','夜間','Night']];
export const mapOverlays:[MapOverlay,string,string][]=[['borders','邊界','Borders'],['currents','洋流','Currents'],['rivers','河流','Rivers'],['lakes','湖泊','Lakes'],['plates','板塊','Plates'],['provinces','省分','Provinces'],['names','地名','Names'],['towns','城鎮','Towns'],['roads','道路','Roads']];
export function modeAvailable(mode:MapDisplayMode,drawing:GlobalMapDrawing){
 if(mode==='political'||mode==='culture')return false;
 if(mode==='terrain')return true;
 if(mode==='heightmap')return !!drawing.scalarMesh?.heights;
 if(mode==='contours')return !!drawing.contours;
 if(mode==='ecosystems'||mode==='seabedEcosystems')return !!drawing.natural;
 return !!drawing.climate;
}
export function overlayAvailable(overlay:MapOverlay,drawing:GlobalMapDrawing){
 if(['borders','provinces','towns','roads'].includes(overlay))return false;
 if(overlay==='currents')return !!drawing.climate;
 if(overlay==='plates')return !!drawing.plates;
 if(overlay==='geology')return !!drawing.geology;
 return !!drawing.natural;
}
// Style palettes change terrain/cartography only; scientific layer legends keep their colors.
export const mapPalettes:Record<MapStyle,{ocean:string;land:string;line:string;ink:string;relief?:string[]}>={
 terrain:{ocean:'#b1d3df',land:'#a2ba81',line:'#547457',ink:'#193d49'},
 antique:{ocean:'#bcc8b7',land:'#e2cf9f',line:'#756145',ink:'#4f3825',relief:['#7f9d99','#91aaa0','#a1b6a6','#b1c2ae','#c0cbb4','#ced3bc','#dfd0a7','#d7bd8d','#c5a275','#ad865f','#947057','#ece1c8']},
 modern:{ocean:'#b9dce9',land:'#e6eedc',line:'#71877b',ink:'#314a57',relief:['#568da8','#72a5bb','#8cb9cb','#a6cfdd','#bddfe7','#d1e9ed','#dce8cb','#d0dabb','#cbd0b7','#c8c4b8','#bcb8b1','#f6f5f0']},
 nautical:{ocean:'#a6cfe2',land:'#f2e2ae',line:'#5f756e',ink:'#264f64',relief:['#679cbb','#7dabc5','#94bdcf','#acd0db','#c5e0e5','#e0eef0','#f2e2ae','#efdfac','#e8d7a6','#dfcea0','#d7c396','#f6eccc']},
 blueprint:{ocean:'#102f53',land:'#315c83',line:'#d3e9ff',ink:'#eff7ff',relief:['#102f53','#14385e','#194168','#204b73','#275580','#2e608b','#345f87','#3d6c94','#497ba3','#5b8fb5','#79a4c5','#c4ddf0']},
 night:{ocean:'#101c2e',land:'#344030',line:'#779789',ink:'#c0d4dc',relief:['#0c1524','#101c2e','#16263a','#1c3044','#233b4f','#29495b','#344030','#3e4b37','#4c5840','#62654f','#7e7f6e','#bec6c2']},
};

// Grid heights are in hundreds of meters. Dedicated elevation colors remain
// independent of the cartographic style selected for the terrain layer.
export const elevationLevels=[.7,1.5,2.5,4,6,8,11,15,20,26,33,42,52];
export const elevationColors=['#61aa96','#72b69a','#85c29b','#9acd9e','#b4d89f','#cde3a6','#e4e9ac','#f1e8a3','#f9d688','#f5b572','#e89060','#d76a52','#ae474c','#77334d'];
export const depthLevels=[-52,-36,-22,-12,-5,-1.8];
export const depthColors=['#223e5f','#304f70','#3d6483','#50809a','#669aab','#82b1bb','#a8cace'];
