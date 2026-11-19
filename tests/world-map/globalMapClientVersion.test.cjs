const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module');
const {transformSync}=require('esbuild');
const m=new Module(__filename+'.client',module);m._compile(transformSync(fs.readFileSync('src/features/worldMap/globalMapClient.ts','utf8'),{loader:'ts',format:'cjs',define:{'import.meta.url':'"file:///global-map-client.js"'}}).code,__filename+'.client');
const {GlobalMapClient}=m.exports;
function setup(){const worker={postMessage(v){this.sent=v},terminate(){this.terminated=true}},client=new GlobalMapClient(worker);return{worker,client,reply:r=>worker.onmessage({data:{id:worker.sent.id,...r}})};}
test('new generation rejects stale Worker results instead of displaying an old coastline',async()=>{
 for(const missing of ['geologyVersion','climateVersion','packSettings','naturalGeography']){
  const {worker,client,reply}=setup();
  const project={geologyVersion:4,climateVersion:1,packSettings:{version:1},naturalGeography:{version:1}};delete project[missing];
  const promise=client.request('generate',{});reply({project,drawing:{relief:[],climate:{},natural:{}}});
  await assert.rejects(promise,/generator version mismatch/);client.close();assert.ok(worker.terminated);
 }
});
test('current generation is accepted and loading legacy snapshots stays compatible',async()=>{
 const {client,reply}=setup();
 const current={project:{geologyVersion:4,climateVersion:1,packSettings:{version:1},naturalGeography:{version:1}},drawing:{relief:[],climate:{},natural:{}}};
 let pending=client.request('generate',{});reply(current);assert.equal((await pending).project,current.project);
 const legacy={project:{version:1},drawing:{land:[]}};pending=client.request('load',{});reply(legacy);assert.equal((await pending).project,legacy.project);client.close();
});
