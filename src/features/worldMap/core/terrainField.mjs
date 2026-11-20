// A height unit is 100 m; a 0.01-unit step retains one metre of terrain relief.
export const quantizeHeight=value=>Math.round(value*100)/100||0;
export const isTerrainHeight=value=>Number.isFinite(value)&&value>=-100&&value<=100&&Math.fround(value)===Math.fround(quantizeHeight(value));
export function heightFieldChecksum(heights){
 const bytes=new DataView(new ArrayBuffer(4));let hash=2166136261;
 for(const value of heights){bytes.setFloat32(0,quantizeHeight(value),true);for(let i=0;i<4;i++)hash=Math.imul(hash^bytes.getUint8(i),16777619)>>>0;}
 return hash.toString(16).padStart(8,'0');
}
