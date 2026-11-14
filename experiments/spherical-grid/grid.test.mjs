import test from "node:test";
import assert from "node:assert/strict";
import {generate,setHeight,bench} from "./grid.mjs";
for(const frequency of [55,60,64]){
 test("spherical topology and surface area at frequency "+frequency,()=>{
  const result=bench(frequency);
  assert.equal(result.pass,true,JSON.stringify(result));
  assert.equal(result.cells,10*frequency*frequency+2);
  assert.equal(result.count5,12);
  assert.equal(result.reciprocal,true);
  assert.equal(result.locality,true);
  assert.ok(result.areaError<1e-9);
 });
}
test("IDs, height limits and integer units are separate from geometry",()=>{
 const g=generate(2);const before=g.points.map(p=>p.slice());
 setHeight(g,0,100);setHeight(g,1,-100);
 assert.equal(g.heights[0]*100,10000);assert.equal(g.heights[1]*100,-10000);
 for(const h of [-101,101,0.5,NaN])assert.throws(()=>setHeight(g,0,h),RangeError);
 assert.throws(()=>setHeight(g,-1,0),RangeError);
 assert.deepEqual(g.points,before);
});
