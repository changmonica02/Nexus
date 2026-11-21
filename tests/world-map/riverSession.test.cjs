const {test}=require('node:test'),assert=require('node:assert/strict'),{buildSync}=require('esbuild'),Module=require('node:module');
const m=new Module(__filename+'.session',module);m._compile(buildSync({entryPoints:['src/features/worldMap/riverSession.ts'],bundle:true,write:false,platform:'node',format:'cjs'}).outputFiles[0].text,__filename+'.session');
const {patchSessionRiver,deleteSessionRiver,addSessionRiver}=m.exports;
const river=(id,geometry,parentId=null)=>({id,name:id,notes:'',geometry,parentId,sourceLakeId:null,mouthLakeId:null});
function fixture(){return {version:1,rivers:[river('main',[[0,0],[1,1],[2,2]]),river('tributary',[[-1,1],[1,1]],'main')],lakes:[{id:'lake',inletIds:['main'],outletId:'main'}],overlays:[]};}
test('multiple point edits preserve previous moves and update the shared tributary endpoint',()=>{
 const base=fixture(),before=JSON.stringify(base);let next=patchSessionRiver(base,{id:'main',geometry:[[0,.1],[1,1],[2,2]]});next=patchSessionRiver(next,{id:'main',geometry:[[0,.1],[1,1.2],[2,2]]});assert.deepEqual(next.rivers[0].geometry,[[0,.1],[1,1.2],[2,2]]);assert.deepEqual(next.rivers[1].geometry.at(-1),[1,1.2]);assert.equal(JSON.stringify(base),before);
});
test('deleting one river keeps tributaries and removes its lake references',()=>{
 const next=deleteSessionRiver(fixture(),'main');assert.equal(next.rivers.length,1);assert.equal(next.rivers[0].parentId,null);assert.deepEqual(next.lakes[0].inletIds,[]);assert.equal(next.lakes[0].outletId,null);
});
test('new river has its own identity and can connect to a selected downstream river',()=>{
 const base=fixture(),next=addSessionRiver(base,'new',[[-2,0],[1,1.1]],'main');assert.equal(base.rivers.length,2);assert.equal(next.rivers.length,3);assert.equal(next.rivers[2].parentId,'main');assert.deepEqual(next.rivers[2].geometry.at(-1),[1,1]);assert.notEqual(next.rivers[2].id,next.rivers[0].id);
});
test('malformed additions and non-finite control points never mutate the original',()=>{
 const base=fixture(),before=JSON.stringify(base);assert.throws(()=>addSessionRiver(base,'main',[[0,0],[1,1]]));assert.throws(()=>addSessionRiver(base,'new',[[0,0]]));assert.throws(()=>patchSessionRiver(base,{id:'main',geometry:[[0,0],[NaN,1]]}));assert.equal(JSON.stringify(base),before);
});
test('renaming and notes can accumulate independently on different rivers',()=>{
 let next=patchSessionRiver(fixture(),{id:'main',name:'青河'});next=patchSessionRiver(next,{id:'tributary',notes:'北方支流'});assert.equal(next.rivers[0].name,'青河');assert.equal(next.rivers[1].notes,'北方支流');
});
