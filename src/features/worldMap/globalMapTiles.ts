const TILE_PIXELS=512;
const GUTTER=2;
const CACHE_LIMIT=24;

/** Rasterize only the visible base tiles and reuse them across longitude copies. */
export function drawBaseTiles(
 ctx:CanvasRenderingContext2D,left:number,right:number,bottom:number,top:number,resolution:number,pixelRatio:number,
 cache:Map<string,HTMLCanvasElement>,paint:(ctx:CanvasRenderingContext2D,scale:number)=>void,ocean:string,
){
 if(left>=right||bottom>=top)return true;
 const span=TILE_PIXELS/resolution;
 const firstX=Math.floor((left+180)/span),lastX=Math.ceil((right+180)/span);
 const firstY=Math.floor((90-top)/span),lastY=Math.ceil((90-bottom)/span);
 // Very large viewports can exceed the bounded cache in one frame.
 if((lastX-firstX)*(lastY-firstY)>CACHE_LIMIT)return false;
 for(let row=firstY;row<lastY;row++)for(let column=firstX;column<lastX;column++){
  const key=`${resolution}:${pixelRatio}:${column}:${row}`;
  const west=-180+column*span,north=90-row*span;
  let tile=cache.get(key);
  if(!tile){
   tile=document.createElement('canvas');
   tile.width=tile.height=TILE_PIXELS+GUTTER*2;
   const tileContext=tile.getContext('2d');
   if(!tileContext)return false;
   tileContext.fillStyle=ocean;
   tileContext.fillRect(0,0,tile.width,tile.height);
   tileContext.setTransform(resolution,0,0,-resolution,GUTTER-west*resolution,GUTTER+north*resolution);
   paint(tileContext,resolution/pixelRatio);
  }else cache.delete(key);
  cache.set(key,tile);
  if(cache.size>CACHE_LIMIT)cache.delete(cache.keys().next().value!);
  ctx.save();
  ctx.translate(west,north);
  ctx.scale(1,-1);
  ctx.drawImage(tile,GUTTER,GUTTER,TILE_PIXELS,TILE_PIXELS,0,0,span,span);
  ctx.restore();
 }
 return true;
}
