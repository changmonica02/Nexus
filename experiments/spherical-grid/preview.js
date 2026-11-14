// Interactive, isolated browser preview; the grid and generator come from the tested prototype.
import {createLandLayout,confirmLandLayout} from './land-generator.mjs';
const $=id=>document.getElementById(id);
const cv=$('map'),ctx=cv.getContext('2d');
let draft=null,confirmed=null,busy=false;
const W=1200,H=600;
const color={land:'#a2ba81',sea:'#b1d3df',stroke:'#788f74'};
function paint(grid) {
 const {points,triangles,heights}=grid;
 ctx.fillStyle=color.sea;ctx.fillRect(0,0,W,H);
 // Draw spherical cell faces; wrap each triangle independently at the date line.
 // Background stays ocean to avoid interpolation artefacts across the seam.
 const projected=points.map(p=>[(Math.atan2(p[1],p[0])/Math.PI+1)*W/2,
   (1-Math.asin(Math.max(-1,Math.min(1,p[2])))/Math.PI-.5)*H]);
 for(const face of triangles) {
  const ids=face;
  const a=projected[ids[0]],b=projected[ids[1]],c=projected[ids[2]];
  const xs=[a[0],b[0],c[0]],ys=[a[1],b[1],c[1]];
  // Place the vertices in one periodic longitude frame.
  for(let k=1;k<3;k++) {
   while(xs[k]-xs[0]>W/2)xs[k]-=W;
   while(xs[k]-xs[0]<-W/2)xs[k]+=W;
  }
  const lands=ids.map(id=>heights[id]>=0);
  // Different cell signs meet at approximate mid-triangle borders. This is a
  // thematic land-mask preview, not the authoritative Voronoi coast geometry.
  const count=lands.filter(Boolean).length;
  if(count===0)continue;
  ctx.fillStyle=count===3?color.land:'#9bb68b';
  for(const shift of [-W,0,W]){
   ctx.beginPath();ctx.moveTo(xs[0]+shift,ys[0]);ctx.lineTo(xs[1]+shift,ys[1]);
   ctx.lineTo(xs[2]+shift,ys[2]);ctx.closePath();ctx.fill();
  }
 }
 ctx.strokeStyle='rgba(36,75,90,.16)';ctx.lineWidth=1;
 for(let lon=-180;lon<=180;lon+=30){const x=(lon+180)/360*W;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
 for(let lat=-60;lat<=60;lat+=30){const y=(90-lat)/180*H;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
}
function setStatus(message){$('status').textContent=message;}
function setButtons(isBusy){busy=isBusy;$('generate').disabled=isBusy;$('confirm').disabled=isBusy||!draft||!!confirmed;$('export').disabled=isBusy||!confirmed;}
async function run(){
 if(busy)return;confirmed=null;draft=null;setButtons(true);setStatus('正在產生球面海陸…');
 // Yield so the loading text can render; no backend calls.
 await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
 try{
  const seed=Number($('seed').value),landPercent=Number($('land').value),
        continentCores=Number($('cores').value);
  draft=createLandLayout({seed,landPercent,continentCores});
  paint(draft.grid);
  $('measured').textContent=draft.measuredLandPercent.toFixed(3)+'%';
  $('details').textContent=`格數：${draft.grid.heights.length.toLocaleString('zh-TW')} ｜ 種子：${seed} ｜ 大陸核心：${continentCores}`;
  setStatus('已產生草稿。可以重新生成，或確認此海陸布局。');
 }catch(error){setStatus('生成失敗：'+error.message);}
 finally{setButtons(false);}
}
$('generate').addEventListener('click',run);
$('random').addEventListener('click',()=>{$('seed').value=Math.floor(Math.random()*4294967296);run();});
$('confirm').addEventListener('click',async()=>{
 if(!draft||busy||confirmed)return;setButtons(true);setStatus('正在建立版本化快照…');
 await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
 try{confirmed=confirmLandLayout(draft);setStatus('已確認海陸布局。可以匯出 JSON 快照。');}
 catch(error){setStatus('確認失敗：'+error.message);}
 finally{setButtons(false);}
});
$('export').addEventListener('click',()=>{
 if(!confirmed)return;
 const blob=new Blob([JSON.stringify(confirmed)],{type:'application/json'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=`nexus-land-${confirmed.settings.seed}.json`;link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
});
$('cores').addEventListener('input',()=>{$('coresText').textContent=$('cores').value});
$('status').dataset.ready='1';
setStatus('請選擇參數後產生全球海陸。');
run();
