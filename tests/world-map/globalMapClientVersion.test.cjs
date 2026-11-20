const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module');
const {buildSync}=require('esbuild');
const m=new Module(__filename+'.client',module);m._compile(buildSync({entryPoints:['src/features/worldMap/globalMapClient.ts'],bundle:true,write:false,platform:'node',format:'cjs',define:{'import.meta.url':'"file:///global-map-client.js"'}}).outputFiles[0].text,__filename+'.client');
const {GlobalMapClient}=m.exports;
function setup(){const worker={postMessage(v){this.sent=v},terminate(){this.terminated=true}},client=new GlobalMapClient(worker);return{worker,client,reply:r=>worker.onmessage({data:{id:worker.sent.id,...r}})};}
test('new generation rejects stale Worker results instead of displaying an old coastline',async()=>{
 for(const missing of ['terrain','geologyVersion','climateVersion','packSettings','naturalGeography']){
  const {worker,client,reply}=setup();
  const project={terrain:{version:2},geologyVersion:4,climateVersion:2,packSettings:{version:1},naturalGeography:{version:1}};delete project[missing];
  const promise=client.request('generate',{});reply({project,drawing:{relief:[],climate:{},natural:{}}});
  await assert.rejects(promise,/generator version mismatch/);client.close();assert.ok(worker.terminated);
 }
});
test('current generation and saved maps use the current climate implementation',async()=>{
 const {client,reply}=setup();
 const current={project:{terrain:{version:2},geologyVersion:4,climateVersion:2,packSettings:{version:1},naturalGeography:{version:1}},drawing:{relief:[],climate:{},natural:{}}};
 let pending=client.request('generate',{});reply(current);assert.equal((await pending).project,current.project);
 pending=client.request('load',{});reply(current);assert.equal((await pending).project,current.project);client.close();
});
test('stage progress stays pending, remains local to the client and does not finish generation early',async()=>{
 const {client,worker,reply}=setup(),events=[];
 const promise=client.request('generate',{}, {onProgress:progress=>events.push(progress)});
 assert.equal(worker.sent.onProgress,undefined);reply({progress:{stage:'ocean',fraction:.56}});reply({progress:{stage:'climate',fraction:.75}});
 assert.equal(events.length,2);assert.equal(client.pending.size,1);
 reply({progress:{stage:'unknown',fraction:999}});assert.equal(events.length,2);
 const result={project:{terrain:{version:2},geologyVersion:4,climateVersion:2,packSettings:{version:1},naturalGeography:{version:1}},drawing:{relief:[],climate:{},natural:{}}};reply(result);assert.equal((await promise).project,result.project);client.close();
});
