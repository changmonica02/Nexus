// PNG rasterizer for actual generated spherical Grid output (not AI-generated).
import {deflateSync} from 'node:zlib';
import {SEAFLOOR} from './plate-seafloor.mjs';

function rgba(height,zone){
 if(height<0){
  if(zone===SEAFLOOR.seamount)return [73,155,170];
  if(zone===SEAFLOOR.midOceanRidge)return [52,112,158];
  if(zone===SEAFLOOR.trench)return [17,35,78];
  if(height<=-75)return [22,49,89];
  if(height<=-45)return [34,77,117];
  if(height<=-22)return [45,109,148];
  if(height<=-7)return [70,144,172];
  return [105,184,194];
 }
 if(height<10)return [173,194,119];
 if(height<30)return [117,156,93];
 if(height<55)return [145,127,89];
 if(height<75)return [169,152,128];
 return [222,218,203];
}
function line(pixels,width,height,x0,y0,x1,y1,red=226,green=91,blue=47){
 // Thin one-pixel dual-mesh lines; longitude unwrap is handled by caller.
 const steps=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)*1.5));
 for(let k=0;k<=steps;k++){
  const t=k/steps,x=Math.round(x0+(x1-x0)*t),y=Math.round(y0+(y1-y0)*t);
  if(y<0||y>=height)continue;
  const wrapped=((x%width)+width)%width,at=4*(y*width+wrapped);
  pixels[at]=red;pixels[at+1]=green;pixels[at+2]=blue;
 }
}
export function drawTerrain(grid,zones,boundaries,width,height){
 const pixels=Buffer.alloc(width*height*4);
 for(let i=0;i<pixels.length;i+=4){pixels[i]=28;pixels[i+1]=77;pixels[i+2]=125;pixels[i+3]=255;}
 const points=grid.points.map(v=>[(Math.atan2(v[1],v[0])/Math.PI+1)*width/2,
  (.5-Math.asin(Math.max(-1,Math.min(1,v[2])))/Math.PI)*height]);
 for(const ids of grid.triangles){
  const xs=ids.map(i=>points[i][0]),ys=ids.map(i=>points[i][1]);
  // Unwrap longitude along each face before drawing periodic copies.
  for(let k=1;k<3;k++){
   while(xs[k]-xs[0]>width/2)xs[k]-=width;
   while(xs[k]-xs[0]<-width/2)xs[k]+=width;
  }
  const mean=(grid.heights[ids[0]]+grid.heights[ids[1]]+grid.heights[ids[2]])/3;
  const zone=ids.map(i=>zones[i]).sort((a,b)=>a-b)[1];
  const rgb=rgba(mean,zone),x1=xs[0],y1=ys[0],x2=xs[1],y2=ys[1],x3=xs[2],y3=ys[2];
  const det=(y2-y3)*(x1-x3)+(x3-x2)*(y1-y3);
  if(Math.abs(det)<1e-8)continue;
  for(const offset of [-width,0,width]){
   const left=Math.max(0,Math.floor(Math.min(x1,x2,x3)+offset)),right=Math.min(width-1,Math.ceil(Math.max(x1,x2,x3)+offset));
   const top=Math.max(0,Math.floor(Math.min(y1,y2,y3))),bottom=Math.min(height-1,Math.ceil(Math.max(y1,y2,y3)));
   if(left>right||top>bottom)continue;
   for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
    const px=x+.5-offset,py=y+.5;
    const a=((y2-y3)*(px-x3)+(x3-x2)*(py-y3))/det;
    const b=((y3-y1)*(px-x3)+(x1-x3)*(py-y3))/det;
    const c=1-a-b;
    if(a< -1e-7||b< -1e-7||c< -1e-7)continue;
    const index=4*(y*width+x);
    pixels[index]=rgb[0];pixels[index+1]=rgb[1];pixels[index+2]=rgb[2];
   }
  }
 }
 // Draw real Voronoi shared-edge plate boundaries after terrain fill.
 for(const boundary of boundaries){
  const a=boundary.start,b=boundary.end;
  const toPixel=p=>[(Math.atan2(p[1],p[0])/Math.PI+1)*width/2,
   (.5-Math.asin(Math.max(-1,Math.min(1,p[2])))/Math.PI)*height];
  const [x0,y0]=toPixel(a),[rawX,y1]=toPixel(b);let x1=rawX;
  while(x1-x0>width/2)x1-=width;
  while(x1-x0< -width/2)x1+=width;
  line(pixels,width,height,x0,y0,x1,y1);
 }
 // Thin neutral coordinate grid every 30 degrees, atop the terrain.
 for(let lon=-150;lon<=150;lon+=30){
  const x=Math.round((lon+180)/360*width);
  for(let y=0;y<height;y++){const p=4*(y*width+x);for(let k=0;k<3;k++)pixels[p+k]=Math.round(pixels[p+k]*.92+255*.08);}
 }
 for(let lat=-60;lat<=60;lat+=30){
  const y=Math.round((90-lat)/180*height);
  for(let x=0;x<width;x++){const p=4*(y*width+x);for(let k=0;k<3;k++)pixels[p+k]=Math.round(pixels[p+k]*.92+255*.08);}
 }
 return pixels;
}
const crcTable=Uint32Array.from({length:256},(_,n)=>{
 let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;
});
function chunk(type,data){
 const length=Buffer.alloc(4),bytes=Buffer.from(type),crcBuffer=Buffer.alloc(4);
 length.writeUInt32BE(data.length);
 let crc=0xffffffff;
 for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);
 for(const byte of data)crc=crcTable[(crc^byte)&255]^(crc>>>8);
 crcBuffer.writeUInt32BE((crc^0xffffffff)>>>0);
 return Buffer.concat([length,bytes,data,crcBuffer]);
}
export function encodePng(width,height,pixels){
 const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 const rows=Buffer.alloc(height*(1+width*4));
 for(let y=0;y<height;y++)pixels.copy(rows,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
 return Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR',header),chunk('IDAT',deflateSync(rows,{level:6})),chunk('IEND',Buffer.alloc(0))
 ]);
}
