// Standalone spherical Grid experiment. Does not import or modify Nexus runtime.
export const RADIUS_KM=6371;
const p=(1+Math.sqrt(5))/2;
const base=[[-1,p,0],[1,p,0],[-1,-p,0],[1,-p,0],[0,-1,p],[0,1,p],[0,-1,-p],[0,1,-p],[p,0,-1],[p,0,1],[-p,0,-1],[-p,0,1]];
const faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
const unit=a=>{const n=Math.hypot(...a);return a.map(x=>x/n)};
const V=base.map(unit),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const minus=(a,b)=>a.map((x,i)=>x-b[i]);
const triangleArea=(a,b,c)=>2*Math.atan2(Math.abs(dot(a,cross(b,c))),1+dot(a,b)+dot(b,c)+dot(c,a));
const key=(f,w)=>f.map((v,i)=>[v,w[i]]).filter(x=>x[1]).sort((a,b)=>a[0]-b[0]).map(x=>x.join(":")).join("|");
export function generate(frequency=60){
 if(!Number.isInteger(frequency)||frequency<1)throw Error("invalid frequency");
 const points=[],indices=new Map(),triangles=[];
 function add(f,w){const k=key(f,w);if(indices.has(k))return indices.get(k);
  const v=[0,0,0];for(let a=0;a<3;a++)for(let b=0;b<3;b++)v[b]+=V[f[a]][b]*w[a]/frequency;
  const id=points.length;points.push(unit(v));indices.set(k,id);return id;
 }
 for(const f of faces){const rows=[];
  for(let i=0;i<=frequency;i++){const row=[];for(let j=0;j<=frequency-i;j++)row.push(add(f,[frequency-i-j,i,j]));rows.push(row)}
  for(let i=0;i<frequency;i++)for(let j=0;j<frequency-i;j++){
   triangles.push([rows[i][j],rows[i+1][j],rows[i][j+1]]);
   if(j<frequency-i-1)triangles.push([rows[i+1][j],rows[i+1][j+1],rows[i][j+1]]);
  }
 }
 const neighbors=Array.from({length:points.length},()=>new Set()),incident=Array.from({length:points.length},()=>[]);
 for(let t=0;t<triangles.length;t++){let f=triangles[t],a=points[f[0]],b=points[f[1]],c=points[f[2]];
  if(dot(a,cross(minus(b,a),minus(c,a)))<0)f=triangles[t]=[f[0],f[2],f[1]];
  for(let i=0;i<3;i++){let u=f[i],v=f[(i+1)%3];neighbors[u].add(v);neighbors[v].add(u);incident[u].push(t)}
 }
 const centers=triangles.map(f=>{const [a,b,c]=f.map(i=>points[i]);let n=unit(cross(minus(b,a),minus(c,a)));return dot(n,a)>0?n:n.map(x=>-x)});
 const areas=new Float64Array(points.length);
 for(let i=0;i<points.length;i++){const a=points[i],x=unit(Math.abs(a[2])<.9?cross([0,0,1],a):cross([0,1,0],a)),y=cross(a,x);
  const around=incident[i].map(t=>centers[t]).sort((u,v)=>Math.atan2(dot(u,y),dot(u,x))-Math.atan2(dot(v,y),dot(v,x)));
  for(let j=0;j<around.length;j++)areas[i]+=triangleArea(a,around[j],around[(j+1)%around.length])*RADIUS_KM**2;
 }
 return {points,triangles,neighbors:neighbors.map(s=>[...s].sort((a,b)=>a-b)),areas,heights:new Int8Array(points.length)};
}
export function setHeight(g,id,value){
 if(!Number.isInteger(id)||id<0||id>=g.points.length)throw RangeError("invalid cell ID");
 if(!Number.isInteger(value)||value< -100||value>100)throw RangeError("height outside [-100,100]");
 g.heights[id]=value;
}
const distance=(a,b)=>RADIUS_KM*Math.acos(Math.max(-1,Math.min(1,dot(a,b))));
export function bench(frequency){
 const t=performance.now(),g=generate(frequency),ms=performance.now()-t;
 const n=g.points.length,edges=g.neighbors.reduce((s,v)=>s+v.length,0)/2;
 const count5=g.neighbors.filter(x=>x.length===5).length,count6=g.neighbors.filter(x=>x.length===6).length;
 const reciprocal=g.neighbors.every((ns,i)=>ns.every(j=>g.neighbors[j].includes(i)));
 const special=g.points.map((v,i)=>({v,i})).filter(({v})=>Math.abs(v[2])>.99||Math.abs(Math.atan2(v[1],v[0]))>3.10);
 const locality=special.every(({i})=>g.neighbors[i].every(j=>distance(g.points[i],g.points[j])<1000));
 const expected=4*Math.PI*RADIUS_KM**2,actual=g.areas.reduce((s,v)=>s+v,0);
 const min=Math.min(...g.areas),max=Math.max(...g.areas);
 setHeight(g,0,100);setHeight(g,1,-100);
 let rejected=false;try{setHeight(g,0,101)}catch(e){rejected=e instanceof RangeError}
 const pass=n===10*frequency**2+2&&g.triangles.length===20*frequency**2&&edges===3*n-6&&count5===12&&count6===n-12&&reciprocal&&locality&&rejected&&Math.abs(actual-expected)/expected<1e-9;
 return {frequency,cells:n,faces:g.triangles.length,edges,count5,count6,ms:+ms.toFixed(1),areaError:Math.abs(actual-expected)/expected,areaRatio:max/min,reciprocal,locality,specialCount:special.length,rejected,metres:[g.heights[0]*100,g.heights[1]*100],pass};
}
if(process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href)for(const f of [55,60,64])console.log(JSON.stringify(bench(f)));
