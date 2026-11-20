const {test,before,after}=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const {build}=require('esbuild'),React=require('react'),{act}=React;
let window,createRoot,components,root,host;
const operations=[],requests=[];
const ring=[[-10,-10],[10,-10],[10,10],[-10,10]];
const checksum=heights=>components.heightChecksum(heights);
function project(settings={seed:42,landPercent:32,continentCores:8,gridCells:36002}){
 const heights=Array(36002).fill(-20);heights[0]=30;
 return {format:'nexus-global-map',version:1,geologyVersion:4,climateVersion:2,packSettings:{version:1,detail:1},naturalGeography:{version:1,rivers:[],lakes:[],overlays:[]},settings,terrain:{format:'nexus-spherical-grid-prototype',version:2,frequency:60,cells:36002,heightScaleMetres:100,seaLevel:0,oceanSeed:1,revision:0,heights,checksum:checksum(heights)}};
}
function drawing(){return {land:[ring],coast:[[ring[0],ring[1]]],landPercent:32,relief:[{color:'#a2ba81',rings:[ring]}],contours:[{height:1700,lines:[[ring[0],ring[2]]]}],plates:[{id:0,areaPercent:100,color:'#aaa',rings:[ring]}],plateBoundaries:[],climate:{rings:[ring],ocean:[0],koppen:[1],codes:['Af'],arrows:[],months:Array.from({length:12},()=>({temperature:[200],precipitation:[100],sst:[200],sstAnomaly:[0]}))},natural:{pack:{cells:1,rings:[ring],gridParents:new Uint32Array([0]),detail:1},ecosystems:{surface:[0],seabed:[0],catalog:[['T1','Forest','森林','#123456']]},rivers:[{id:'river-1',name:'測試河',lines:[[ring[0],ring[2]]],monthly:Array(12).fill(20)}],lakes:[{id:'lake-1',name:'測試湖',rings:[ring],months:Array.from({length:12},()=>({dry:false}))}]}};}
class FakeWorker{
 constructor(){this.closed=false;}
 postMessage(message){requests.push(structuredClone(message));queueMicrotask(()=>{if(this.closed)return;let p=structuredClone(message.project??project(message.settings));
  if(message.action==='editHeight'){p.environmentTerrain??=structuredClone(p.terrain);p.terrain.heights[0]++;p.terrain.revision++;p.terrain.checksum=checksum(p.terrain.heights);}
  if(message.action==='recalculateNature')delete p.environmentTerrain;
  const d=drawing();this.onmessage?.({data:{id:message.id,project:message.action==='preview'?null:p,drawing:message.action==='preview'?{land:d.land,coast:d.coast,landPercent:32}:d}});
 });}
 terminate(){this.closed=true;}
}
before(async()=>{
 const {Window}=await import('happy-dom');window=new Window({url:'http://localhost/'});
 require('fake-indexeddb/auto');
 for(const key of ['window','document','navigator','HTMLElement','HTMLInputElement','HTMLCanvasElement','Element','Node','MouseEvent','Event','KeyboardEvent','MutationObserver'])Object.defineProperty(globalThis,key,{value:key==='window'?window:window[key],configurable:true,writable:true});
 globalThis.Path2D=class{rect(){}moveTo(){}lineTo(){}closePath(){}};
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.Worker=FakeWorker;globalThis.devicePixelRatio=1;
 globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 window.HTMLCanvasElement.prototype.setPointerCapture=function(){};
 window.HTMLCanvasElement.prototype.getContext=function(){let target={measureText:()=>({width:20})};return new Proxy(target,{get:(o,k)=>k in o?o[k]:(...args)=>{if(['fill','stroke','fillRect','fillText','clip','drawImage'].includes(k))operations.push({kind:k,color:k==='stroke'?o.strokeStyle:o.fillStyle,args,canvas:this});}});};
 ({createRoot}=require('react-dom/client'));
 const out=path.resolve('.cache/global-map-workspace-ui.cjs');
 await build({entryPoints:['tests/fixtures/globalMapWorkspace.jsx'],outfile:out,bundle:true,platform:'node',format:'cjs',jsx:'automatic',packages:'external',plugins:[{name:'test-boundaries',setup(b){
  b.onLoad({filter:/globalMapClient\.ts$/},args=>({contents:fs.readFileSync(args.path,'utf8').replace("new URL('../../../.cache/global-map-worker.js',import.meta.url)","'/worker.js'"),loader:'ts',resolveDir:path.dirname(args.path)}));
  b.onLoad({filter:/\/(CreationTemplateLibrary|CharacterTemplateManager|PageCollection|TiptapEditor)\.tsx$/},()=>({contents:'export default function UnrelatedPanel(){return null}',loader:'jsx'}));
 }}]});components=require(out);
});
after(async()=>{if(root)await act(async()=>root.unmount());await window.happyDOM.abort();});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function render(element){if(root)await act(async()=>root.unmount());document.body.innerHTML='<div id="root"></div>';host=document.getElementById('root');root=createRoot(host);await act(async()=>{root.render(React.createElement(components.LanguageProvider,{initialLanguage:'zh-TW'},element));await delay(10);});}
const button=text=>[...host.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
async function click(text){const b=button(text);assert.ok(b,'Missing button '+text);assert.equal(b.disabled,false,text+' is disabled');await act(async()=>{b.click();await delay(5);});}
async function change(el,value){await act(async()=>{el.value=value;el.dispatchEvent(new window.Event('change',{bubbles:true}));await delay(5);});}
test('creation follows world → actions → map types → generator; cancellation never creates a world',async()=>{
 let creates=0;
 await render(React.createElement(components.CreativeView,{pages:[],templates:[],onCreateCharacter(){},onCreateWorld(){throw Error('Legacy empty world must not be created');},onCreateWorldMap:async()=>{creates++;},onSelectPage(){},onCreateTemplate(){},onRenameTemplate(){},onDownloadTemplate:async()=>{}}));
 await click('＋ 建立');await click('世界觀');assert.ok(button('新建地圖'));assert.ok(host.querySelector('input[type=file]'));
 await click('新建地圖');assert.equal(button('新建六角地圖').disabled,true);await click('新建星球地圖');
 await act(async()=>{await delay(250);});assert.ok(host.querySelector('dialog[aria-label="地圖生成器"]'));
 assert.equal(host.querySelector('input[placeholder="輸入地圖名稱"]').value,'');assert.equal(button('生成').disabled,true);
 await act(async()=>{host.querySelector('button[aria-label="關閉視窗"]').click();await delay(5);});assert.equal(creates,0);assert.ok(button('新建星球地圖'));
});
test('editor groups display controls, independently toggles water, renders palettes and contours, and edits month',async()=>{
 const p=project(),map={id:'map-test',world_id:'world-test',title:'測試世界',revision:1};
 await render(React.createElement(components.GlobalWorldMapEditor,{map,blob:new Blob([JSON.stringify(p)]),repository:{},beforeSave:async()=>{},onSaved:async()=>{},onClose(){}}));
 await click('顯示');assert.deepEqual([...host.querySelectorAll('aside h3')].map(h=>h.textContent),['顯示方式','疊加圖層','地圖風格']);assert.equal(button('政治').disabled,true);assert.equal(button('文化').disabled,true);
 const sw=name=>[...host.querySelectorAll('[role=switch]')].find(b=>document.getElementById(b.getAttribute('aria-labelledby')).textContent===name);
 assert.equal(sw('河流').getAttribute('aria-checked'),'true');assert.equal(sw('湖泊').getAttribute('aria-checked'),'true');
 operations.length=0;await act(async()=>{sw('河流').click();await delay(5);});assert.equal(sw('河流').getAttribute('aria-checked'),'false');assert.equal(sw('湖泊').getAttribute('aria-checked'),'true');assert.equal(operations.some(o=>o.kind==='fill'&&o.color==='#316e8e'),false);assert.ok(operations.some(o=>o.kind==='fill'&&o.color==='#5794ae'));
 operations.length=0;await click('藍圖');assert.ok(operations.some(o=>o.kind==='fillRect'&&o.color==='#102f53'));
 operations.length=0;await click('等高線');assert.ok(operations.some(o=>o.kind==='stroke'&&o.color==='#d3e9ff'));
 const month=host.querySelector('select[aria-label="月份"]');await change(month,'6');assert.equal(month.value,'6');assert.ok([...host.querySelectorAll('summary')].some(s=>s.textContent.includes('7 月')));
 assert.equal(sw('道路').disabled,true);
});
test('height tools support free mode, coordinate application, undo/redo and saved snapshots',async()=>{
 const p=project(),map={id:'map-test',world_id:'world-test',title:'測試世界',revision:1},saved=[];
 const repo={stageDraft:async()=> 'draft',clearDraft:async()=>{},save:async(worldId,id,revision,blob)=>{saved.push(JSON.parse(await blob.text()));return {map:{...map,revision:revision+1},world:{character_data:{world_maps:[{...map,revision:revision+1}]}}};}};
 await render(React.createElement(components.GlobalWorldMapEditor,{map,blob:new Blob([JSON.stringify(p)]),repository:repo,beforeSave:async()=>{},onSaved:async()=>{},onClose(){}}));
 await click('工具');assert.ok(host.querySelector('select[aria-label="高度筆刷"]'));await change(host.querySelector('select[aria-label="高度模式"]'),'free');assert.equal(host.querySelector('select[aria-label="編輯範圍"]').disabled,true);
 const form=host.querySelector('aside form');await act(async()=>{form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await delay(30);});
 assert.equal(saved.length,1);assert.equal(saved[0].terrain.heights[0],31);assert.ok(saved[0].environmentTerrain);assert.ok(host.textContent.includes('氣候、水文與生態仍為上次計算結果'));
 await click('復原');assert.equal(saved.at(-1).terrain.heights[0],30);await click('重做');assert.equal(saved.at(-1).terrain.heights[0],31);
 const paint=requests.findLast(r=>r.action==='editHeight');assert.equal(paint.brush.mode,'free');assert.equal(paint.brush.longitude,0);
 await click('海岸線');await click('使用自由高度工具');assert.equal(host.querySelector('select[aria-label="高度模式"]').value,'free');assert.equal(button('停止繪製，切換平移').getAttribute('aria-pressed'),'true');
 const canvas=host.querySelector('canvas'),count=saved.length;
 await act(async()=>{canvas.dispatchEvent(new window.PointerEvent('pointerdown',{bubbles:true,pointerId:9,button:0,clientX:400,clientY:200}));canvas.dispatchEvent(new window.PointerEvent('pointermove',{bubbles:true,pointerId:9,clientX:440,clientY:200}));await delay(5);});assert.equal(saved.length,count);
 await act(async()=>{canvas.dispatchEvent(new window.PointerEvent('pointerup',{bubbles:true,pointerId:9,clientX:440,clientY:200}));await delay(30);});assert.equal(saved.length,count+1);assert.ok(requests.findLast(r=>r.action==='editHeight').stroke.points.length>=2);
});

test('readonly preview exposes display but never terrain tools',async()=>{
 const map={id:'read-map',world_id:'world-test',title:'唯讀地圖',revision:1};
 await render(React.createElement(components.GlobalWorldMapEditor,{map,blob:new Blob([JSON.stringify(project())]),repository:{},editing:false,beforeSave:async()=>{},onSaved:async()=>{},onClose(){}}));
 assert.equal(button('工具'),undefined);await click('預覽');await click('顯示');assert.ok(button('地形'));assert.equal(button('工具'),undefined);assert.equal(button('復原'),undefined);
});
test('mobile painting collapses the tool panel while preserving an accessible stop control',async()=>{
 window.innerWidth=390;
 const map={id:'mobile-map',world_id:'world-test',title:'手機地圖',revision:1};
 await render(React.createElement(components.GlobalWorldMapEditor,{map,blob:new Blob([JSON.stringify(project())]),repository:{},beforeSave:async()=>{},onSaved:async()=>{},onClose(){}}));
 await click('工具');await click('開始繪製');assert.equal(host.querySelector('aside'),null);assert.ok(button('停止繪製'));assert.equal(host.querySelector('canvas').style.cursor,'crosshair');
 await click('停止繪製');assert.equal(host.querySelector('canvas').style.cursor,'grab');window.innerWidth=1024;
});
test('named generator confirms exactly once and returns a validated native Nexus snapshot',async()=>{
 const created=[];
 await render(React.createElement(components.CreativeView,{pages:[],templates:[],onCreateCharacter(){},onCreateWorld(){throw Error('Unexpected empty world');},onCreateWorldMap:async(name,blob,generated)=>{created.push({name,project:JSON.parse(await blob.text()),generated});},onSelectPage(){},onCreateTemplate(){},onRenameTemplate(){},onDownloadTemplate:async()=>{}}));
 await click('＋ 建立');await click('世界觀');await click('新建地圖');await click('新建星球地圖');await act(async()=>{await delay(250);});
 const input=host.querySelector('input[placeholder="輸入地圖名稱"]');
 await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,'我的新世界');input.dispatchEvent(new window.Event('input',{bubbles:true}));await delay(5);});
 await click('生成');assert.equal(created.length,1);assert.equal(created[0].name,'我的新世界');assert.equal(created[0].project.format,'nexus-global-map');assert.deepEqual(created[0].generated.project,created[0].project);assert.equal(host.querySelector('dialog[aria-label="地圖生成器"]'),null);
});

test('confirmed world uses real IndexedDB persistence and opens one editor in the existing manager',async()=>{
 const storage=new components.IndexedDBAdapter();await storage.init();storage.setWorkspaceOwner('workspace-ui-owner');
 const p=project(),repo=new components.WorldMapRepository(storage),created=await repo.createWorldWithMap('完整建立流程',new Blob([JSON.stringify(p)]));
 components.rememberGeneratedMap(created.map.id,{project:p,drawing:drawing()});
 const beforeOpen=requests.length;
 assert.equal((await storage.listPages()).length,1);assert.equal((await storage.listAttachments()).length,1);
 const batches=await storage.db.getAll('workspace_outbox');assert.equal(batches.length,1);assert.equal(batches[0].operations.length,3);
 let opened=0;
 function WorldHost(){const [initial,setInitial]=React.useState(true);return React.createElement(components.WorldMapManager,{world:created.world,worldContent:React.createElement('p',null,'世界觀內容'),storage,beforeSave:async()=>{},onSaved:async()=>{},initialEditing:initial,onInitialEditOpened:()=>{opened++;setInitial(false);}});}
 await render(React.createElement(WorldHost));
 await act(async()=>{await delay(50);});assert.equal(opened,1);assert.ok(!requests.slice(beforeOpen).some(r=>r.action==='load'));assert.equal(host.querySelectorAll('[data-global-map-canvas]').length,1);assert.ok(button('工具'));
 await click('儲存並返回');assert.equal(host.querySelector('[data-global-map-canvas]'),null);assert.ok(host.textContent.includes('世界觀內容'));
 await act(async()=>root.unmount());root=null;storage.db.close();
});

test('shared shoreline paths clip land and sea; small tributaries appear only after zooming',async()=>{
 const d=drawing();d.surface={land:[ring],coast:d.coast,inverse:false,shorelines:[[...ring,ring[0]]]};d.natural.rivers[0].streamOrder=1;d.natural.rivers[0].catchmentAreaKm2=40000;d.natural.rivers[0].lengthKm=200;
 operations.length=0;await render(React.createElement(components.GlobalMapCanvas,{drawing:d}));
 assert.ok(operations.some(o=>o.kind==='fill'&&o.args[0] instanceof globalThis.Path2D&&o.args[1]==='evenodd'));
 assert.ok(operations.some(o=>o.kind==='clip'&&o.args[0] instanceof globalThis.Path2D));
 assert.ok(operations.filter(o=>o.kind==='stroke'&&o.color==='#b1d3df'&&o.args[0] instanceof globalThis.Path2D).length>=3);
 assert.equal(operations.some(o=>o.kind==='fill'&&o.color==='#316e8e'),false);
 operations.length=0;await click('＋');await click('＋');await act(async()=>{await delay(35);});assert.ok(operations.some(o=>o.kind==='fill'&&o.color==='#316e8e'));
});

test('panning a scalar base map reuses the same offscreen tiles',async()=>{
 const d=drawing();
 d.surface={land:[ring],coast:d.coast,inverse:false,shorelines:[[...ring,ring[0]]]};
 d.scalarMesh={points:[[1,0,0]],triangles:[],heights:[3]};
 operations.length=0;
 await render(React.createElement(components.GlobalMapCanvas,{drawing:d}));
 const canvas=host.querySelector('canvas');
 const tileImages=new Set(operations.filter(o=>o.kind==='drawImage').map(o=>o.args[0]));
 assert.ok(tileImages.size>0);
 operations.length=0;
 await act(async()=>{
  canvas.dispatchEvent(new window.PointerEvent('pointerdown',{bubbles:true,pointerId:1,button:0,clientX:400,clientY:200}));
  for(const clientX of [404,409,415])canvas.dispatchEvent(new window.PointerEvent('pointermove',{bubbles:true,pointerId:1,clientX,clientY:200}));
  canvas.dispatchEvent(new window.PointerEvent('pointerup',{bubbles:true,pointerId:1,clientX:415,clientY:200}));
  await delay(40);
 });
 const copies=operations.filter(o=>o.kind==='drawImage');
 assert.ok(copies.length>0);
 assert.ok(copies.every(o=>tileImages.has(o.args[0])));
 assert.equal(operations.filter(o=>o.kind==='fillRect'&&o.canvas===canvas).length,1);
 operations.length=0;
 await click('＋');
 await act(async()=>{await delay(40);});
 const zoomPreview=operations.filter(o=>o.kind==='drawImage');
 assert.ok(zoomPreview.length>0&&zoomPreview.every(o=>tileImages.has(o.args[0])));
 await act(async()=>{await delay(140);});
 assert.ok(operations.some(o=>o.kind==='drawImage'&&!tileImages.has(o.args[0])));
});
