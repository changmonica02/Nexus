const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {stripTypeScriptTypes}=require('node:module'),{MessageChannel}=require('node:worker_threads');
let MapCoreClient,readPublicMapAsset,assetBroker;
before(async()=>{
  const load=async path=>{
    const source=fs.readFileSync(path,'utf8');
    const js=stripTypeScriptTypes?stripTypeScriptTypes(source,{mode:'transform'}):require('typescript').transpileModule(source,{compilerOptions:{module:99,target:9}}).outputText;
    return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
  };
  ({MapCoreClient}=await load('src/features/worldMap/coreClient.ts'));
  ({readPublicMapAsset,assetBroker}=await load('src/features/worldMap/offlineCore.ts'));
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

test('online opaque-frame broker forwards only heightmap PNGs and authenticates parent replies',async()=>{
 const previous={window:global.window,parent:global.parent},messages=[],network=[];let receive;
 global.parent={postMessage:data=>messages.push(data)};
 global.window={addEventListener:(type,fn)=>{if(type==='message')receive=fn;},fetch:async input=>{network.push(input);return new Response('direct');}};
 try{
  assetBroker('preview-session','https://nexus.invalid/world-map/core/',true);
  const response=window.fetch('./heightmaps/world.png');assert.equal(messages.length,1);assert.equal(messages[0].url,'https://nexus.invalid/world-map/core/heightmaps/world.png');
  receive({source:{},data:{type:'nexus-map-asset-result',session:'preview-session',id:1,blob:new Blob(['wrong source'])}});
  receive({source:parent,data:{type:'nexus-map-asset-result',session:'other-session',id:1,blob:new Blob(['wrong session'])}});
  receive({source:parent,data:{type:'nexus-map-asset-result',session:'preview-session',id:1,blob:new Blob(['PNG'],{type:'image/png'})}});
  const result=await response;assert.equal(await result.text(),'PNG');assert.equal(result.headers.get('content-type'),'image/png');
  for(const input of ['/api/account','./private.json','https://outside.invalid/world-map/core/heightmaps/world.png','./heightmaps/%2e%2e%2fprivate.png','data:image/png;base64,AAAA'])assert.equal(await (await window.fetch(input)).text(),'direct');
  assert.equal(messages.length,1);assert.equal(network.length,5);
 }finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete global[key];else global[key]=value;}}
});

test('online heightmap fallback omits credentials, rejects queries/other assets and needs no tool cache',async()=>{
 const previous={location:global.location,caches:global.caches,fetch:global.fetch,navigator:Object.getOwnPropertyDescriptor(global,'navigator')};let requests=[];
 global.location={origin:'https://nexus.test'};global.caches={keys:async()=>{throw Error('storage unavailable');}};Object.defineProperty(global,'navigator',{configurable:true,value:{onLine:true}});
 global.fetch=async(url,options)=>{requests.push({url,options});return new Response('PNG',{headers:{'content-type':'image/png'}});};
 try{
  assert.equal(await (await readPublicMapAsset('/world-map/core/heightmaps/world.png')).text(),'PNG');assert.deepEqual(requests,[{url:'https://nexus.test/world-map/core/heightmaps/world.png',options:{credentials:'omit',mode:'same-origin'}}]);
  for(const path of ['/world-map/core/heightmaps/world.png?private=1','/world-map/core/heightmaps/%2e%2e%2fprivate.png','/api/account','/world-map/core/private.json'])await assert.rejects(readPublicMapAsset(path));
  Object.defineProperty(global,'navigator',{configurable:true,value:{onLine:false}});await assert.rejects(readPublicMapAsset('/world-map/core/heightmaps/world.png'));assert.equal(requests.length,1);
 }finally{for(const key of ['location','caches','fetch']){if(previous[key]===undefined)delete global[key];else global[key]=previous[key];}if(previous.navigator)Object.defineProperty(global,'navigator',previous.navigator);else delete global.navigator;}
});
