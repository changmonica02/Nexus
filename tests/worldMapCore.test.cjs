const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {stripTypeScriptTypes}=require('node:module'),{MessageChannel}=require('node:worker_threads');
let MapCoreClient,readPublicMapAsset;
before(async()=>{
  const load=async path=>{
    const source=fs.readFileSync(path,'utf8');
    const js=stripTypeScriptTypes?stripTypeScriptTypes(source,{mode:'transform'}):require('typescript').transpileModule(source,{compilerOptions:{module:99,target:9}}).outputText;
    return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
  };
  ({MapCoreClient}=await load('src/features/worldMap/coreClient.ts'));
  ({readPublicMapAsset}=await load('src/features/worldMap/offlineCore.ts'));
});
test('core operations remain ordered over a real MessageChannel',async t=>{
  const {port1,port2}=new MessageChannel(),received=[];
  const client=new MapCoreClient(port1,()=>{});t.after(()=>{client.close();port2.close();});
  port2.onmessage=({data})=>{received.push(data.type);port2.postMessage({id:data.id,blob:new Blob([data.type])});};
  const one=client.request('snapshot'),two=client.request('png');
  assert.equal(await (await one).text(),'snapshot');assert.equal(await (await two).text(),'png');
  assert.deepEqual(received,['snapshot','png']);
});
test('unknown replies cannot complete a pending operation, and core errors remain failures',async t=>{
  const {port1,port2}=new MessageChannel(),events=[];
  const client=new MapCoreClient(port1,event=>events.push(event.type));t.after(()=>{client.close();port2.close();});
  port2.onmessage=({data})=>{port2.postMessage({id:data.id+100,blob:new Blob(['wrong'])});port2.postMessage({type:'dirty'});port2.postMessage({id:data.id,error:'Native load failed'});};
  await assert.rejects(client.request('load',new Blob(['native'])),/Native load failed/);assert.deepEqual(events,['dirty']);
});
test('closing rejects both active and queued operations without posting to a closed editor',async t=>{
  const {port1,port2}=new MessageChannel();let received=0;
  const client=new MapCoreClient(port1,()=>{});t.after(()=>{client.close();port2.close();});
  port2.onmessage=()=>{received++;client.close();};
  const results=await Promise.allSettled([client.request('snapshot'),client.request('png')]);
  assert.ok(results.every(result=>result.status==='rejected'));assert.equal(received,1);
});
test('asset broker reads only public map cache entries and never fetches private or uncached paths',async t=>{
  const previous={location:global.location,caches:global.caches,fetch:global.fetch};let network=0;
  global.location={origin:'https://nexus.test'};
  global.fetch=()=>{network++;throw Error('Unexpected network request');};
  global.caches={keys:async()=>['private-cache','nexus-world-map-fixed'],open:async name=>({match:async url=>name==='nexus-world-map-fixed'&&url==='https://nexus.test/world-map/core/main.js'?new Response('public code'):undefined})};
  t.after(()=>Object.assign(global,previous));
  assert.equal(await (await readPublicMapAsset('/world-map/core/main.js')).text(),'public code');
  for(const url of ['/api/account','https://external.test/world-map/core/main.js','/world-map/core/%2e%2e%2fapi/account','/world-map/core/unknown.js'])await assert.rejects(readPublicMapAsset(url));
  assert.equal(network,0);
});
