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
function drawing(){return {land:[ring],coast:[[ring[0],ring[1]]],landPercent:32,relief:[{color:'#a2ba81',rings:[ring]}],contours:[{height:1700,lines:[[ring[0],ring[2]]]}],plates:[{id:0,areaPercent:100,color:'#aaa',rings:[ring]}],plateBoundaries:[],climate:{rings:[ring],ocean:[0],koppen:[1],codes:['Af'],arrows:[],months:Array.from({length:12},()=>({temperature:[200],precipitation:[100],sst:[200],sstAnomaly:[0]}))},natural:{pack:{cells:1,rings:[ring],gridParents:new Uint32Array([0]),detail:1},ecosystems:{surface:[0],seabed:[0],catalog:[['T1','Forest','森林','#123456']]},rivers:[{id:'river-1',name:'測試河',catchmentAreaKm2:40000,lengthKm:300,parentId:null,lines:[[ring[0],ring[2]]],monthly:Array(12).fill(20)}],lakes:[{id:'lake-1',name:'測試湖',rings:[ring],months:Array.from({length:12},()=>({dry:false}))}]}};}
let pauseLoad=false,finishLoad,heightFixture=false;
class FakeWorker{
 constructor(){this.closed=false;}
 postMessage(message){requests.push(structuredClone(message));queueMicrotask(()=>{if(this.closed)return;let p=structuredClone(message.project??project(message.settings));
  if(message.action==='editHeight'){p.environmentTerrain??=structuredClone(p.terrain);p.terrain.heights[0]++;p.terrain.revision++;p.terrain.checksum=checksum(p.terrain.heights);}
  if(message.action==='recalculateNature')delete p.environmentTerrain;
  if(message.action==='editNatural')Object.assign(p.naturalGeography.rivers.find(r=>r.id===message.patch.id),message.patch);
  const d=drawing();if(heightFixture)d.scalarMesh={points:Array.from({length:36002},(_,i)=>i?[ -1,0,0 ]:[1,0,0]),neighbors:Array.from({length:36002},(_,i)=>i?[0]:[1]),triangles:[],heights:p.terrain.heights};
  const complete=()=>{if(!this.closed)this.onmessage?.({data:{id:message.id,project:message.action==='preview'?null:p,drawing:message.action==='preview'?{land:d.land,coast:d.coast,landPercent:32}:d}});};
  if(message.action==='load'&&message.previewFirst&&pauseLoad){
   this.onmessage?.({data:{id:message.id,previewDrawing:{land:d.land,coast:d.coast,landPercent:32}}});
   this.onmessage?.({data:{id:message.id,progress:{stage:'climate',fraction:.7}}});
   finishLoad=complete;
  }else complete();
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
test('height session accumulates strokes, undoes locally and derives once on save and exit',async(t)=>{
 heightFixture=true;t.after(()=>{heightFixture=false;});
 const p=project(),map={id:'map-test',world_id:'world-test',title:'測試世界',revision:1},saved=[];
 const repo={stageDraft:async()=> 'draft',clearDraft:async()=>{},save:async(w,id,revision,blob)=>{saved.push(JSON.parse(await blob.text()));return {map:{...map,revision:revision+1},world:{character_data:{world_maps:[map]}}};}};
 await render(React.createElement(components.GlobalWorldMapEditor,{map,blob:new Blob([JSON.stringify(p)]),repository:repo,beforeSave:async()=>{},onSaved:async()=>{},onClose(){}}));
 await click('工具');await change(host.querySelector('select[aria-label="高度模式"]'),'free');
 const requestCount=requests.length,form=host.querySelector('aside form');
 for(let i=0;i<2;i++)await act(async()=>{form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await delay(10);});
 assert.equal(saved.length,0);assert.equal(requests.length,requestCount,'no Worker work between strokes');assert.equal(host.querySelector('[aria-busy="true"]'),null);assert.ok(button('儲存並退出'));
 await click('復原');await click('重做');assert.equal(requests.length,requestCount);assert.equal(saved.length,0);
 await click('儲存並退出');assert.equal(saved.length,1);assert.equal(saved[0].terrain.heights[0],34);assert.equal(saved[0].environmentTerrain,undefined);assert.equal(requests.slice(requestCount).filter(r=>r.action==='recalculateNature').length,1);assert.ok(button('開始繪製'));
});
test('failed final height save retains local heights and allows retry without another derivation',async(t)=>{
 heightFixture=true;t.after(()=>{heightFixture=false;});let fail=true;const p=project(),saved=[],map={id:'height-failure',world_id:'w',title:'高度',revision:1};
 const repo={stageDraft:async()=> 'draft',clearDraft:async()=>{},save:async(w,id,revision,blob)=>{if(fail)throw Error('disk full');saved.push(JSON.parse(await blob.text()));return {map:{...map,revision:revision+1},world:{}};}};
 await render(React.createElement(components.GlobalWorldMapEditor,{map,blob:new Blob([JSON.stringify(p)]),repository:repo,beforeSave:async()=>{},onSaved:async()=>{},onClose(){}}));await click('工具');const before=requests.length;
 await act(async()=>{host.querySelector('aside form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await delay(10);});await click('儲存並退出');assert.equal(saved.length,0);assert.equal(button('開始繪製'),undefined);assert.ok(button('儲存並退出'));fail=false;await click('儲存並退出');assert.equal(saved[0].terrain.heights[0],32);assert.equal(requests.slice(before).filter(r=>r.action==='recalculateNature').length,1);
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
 await click('工具');await click('開始繪製');assert.equal(host.querySelector('aside'),null);assert.ok(button('儲存並退出'));assert.equal(host.querySelector('canvas').style.cursor,'crosshair');
 await click('儲存並退出');assert.equal(host.querySelector('canvas').style.cursor,'grab');window.innerWidth=1024;
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
 await assert.rejects(()=>repo.create(created.world.id,'額外地表',new Blob([JSON.stringify(p)])),/one surface/);
 await assert.rejects(()=>repo.setPresentation(created.world.id,created.map.id,1,'surface',created.map.id),/cannot be nested/);
 components.rememberGeneratedMap(created.map.id,{project:p,drawing:drawing()});
 const beforeOpen=requests.length;
 assert.equal((await storage.listPages()).length,1);assert.equal((await storage.listAttachments()).length,1);
 const batches=await storage.db.getAll('workspace_outbox');assert.equal(batches.length,1);assert.equal(batches[0].operations.length,3);
 function WorldHost(){const [open,setOpen]=React.useState(true);return open?React.createElement(components.WorldMapManager,{world:created.world,storage,beforeSave:async()=>{},onSaved:async()=>{},onBack:()=>setOpen(false)}):React.createElement('p',null,'世界觀清單');}
 await render(React.createElement(WorldHost));
 await act(async()=>{await delay(50);});assert.ok(!requests.slice(beforeOpen).some(r=>r.action==='load'));assert.equal(host.querySelectorAll('[data-global-map-canvas]').length,1);assert.ok(button('工具'));
 await click('儲存並返回');assert.equal(host.querySelector('[data-global-map-canvas]'),null);assert.ok(host.textContent.includes('世界觀清單'));
 const beforeReopen=requests.length;
 await render(React.createElement(WorldHost));
 await act(async()=>{await delay(50);});
 assert.ok(requests.slice(beforeReopen).some(r=>r.action==='load'&&r.previewFirst));
 assert.ok(button('工具'));
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
 await click('＋');await click('＋');await click('＋');await click('＋');
 await act(async()=>{await delay(40);});
 const zoomPreview=operations.filter(o=>o.kind==='drawImage');
 assert.ok(zoomPreview.length>0&&zoomPreview.every(o=>tileImages.has(o.args[0])));
 // Keep panning beyond the original zoom timeout. Detailed tiles must
 // not be generated until the second gesture also settles.
 await act(async()=>{
  canvas.dispatchEvent(new window.PointerEvent('pointerdown',{bubbles:true,pointerId:2,button:0,clientX:400,clientY:200}));
  canvas.dispatchEvent(new window.PointerEvent('pointermove',{bubbles:true,pointerId:2,clientX:425,clientY:200}));
  await delay(170);
 });
 assert.ok(operations.filter(o=>o.kind==='drawImage').every(o=>tileImages.has(o.args[0])));
 await act(async()=>{
  canvas.dispatchEvent(new window.PointerEvent('pointerup',{bubbles:true,pointerId:2,clientX:425,clientY:200}));
  await delay(45);
 });
 assert.ok(operations.some(o=>o.kind==='drawImage'&&!tileImages.has(o.args[0])));
});

test('map panels float beside the icon rail without remounting the canvas',async()=>{
 const map={id:'map-test',world_id:'world-test',title:'測試世界',revision:1};
 await render(React.createElement(components.GlobalWorldMapEditor,{map,blob:new Blob([JSON.stringify(project())]),repository:{},beforeSave:async()=>{},onSaved:async()=>{},onClose(){}}));
 const canvas=host.querySelector('canvas');
 const menu=host.querySelector('nav[aria-label="地圖選單"]');
 for(const item of menu.querySelectorAll('button')){
  assert.ok(item.querySelector('svg[aria-hidden="true"]'));
  assert.ok(item.querySelector('span'));
  assert.equal(item.classList.contains('border'),false);
 }
 for(const name of ['工具','顯示']){
  await click(name);
  const panel=host.querySelector('#global-map-side-panel');
  assert.ok(panel.classList.contains('absolute'));
  assert.ok(!panel.classList.contains('sm:static'));
  assert.equal(host.querySelector('canvas'),canvas);
 }
 await click('顯示');
 assert.equal(host.querySelector('#global-map-side-panel'),null);
 assert.equal(host.querySelector('canvas'),canvas);
});

test('height editing paints source cells and previews a stroke before committing it',async()=>{
 const d=drawing();
 d.surface={land:[ring],coast:d.coast,inverse:false,shorelines:[[...ring,ring[0]]]};
 d.scalarMesh={points:[[1,0,0]],triangles:[],heights:[3],neighbors:[[]],cellRings:[ring],oceanMask:new Uint8Array([0])};
 const strokes=[];
 await render(React.createElement(components.GlobalMapCanvas,{drawing:d,editingHeight:{tool:'raise',radius:5,strength:10,mode:'preserve',target:'land'},onStroke:points=>strokes.push(points)}));
 const canvas=host.querySelector('canvas');
 assert.equal(canvas.dataset.heightEditing,'true');
 operations.length=0;
 await act(async()=>{
  canvas.dispatchEvent(new window.PointerEvent('pointerdown',{bubbles:true,pointerId:2,button:0,clientX:400,clientY:200}));
  await delay(20);
 });
 assert.ok(operations.some(o=>o.kind==='stroke'&&o.color==='rgba(21,58,65,.65)'));
 assert.equal(strokes.length,0);
 await act(async()=>{
  canvas.dispatchEvent(new window.PointerEvent('pointerup',{bubbles:true,pointerId:2,clientX:400,clientY:200}));
  await delay(10);
 });
 assert.equal(strokes.length,1);
 assert.equal(d.scalarMesh.heights[0],3);
});

test('a slow map load shows its coast and phase before the full editor is ready',async()=>{
 const map={id:'slow-map',world_id:'world-test',title:'測試世界',revision:1};
 pauseLoad=true;
 try{
  await render(React.createElement(components.GlobalWorldMapEditor,{map,blob:new Blob([JSON.stringify(project())]),repository:{},beforeSave:async()=>{},onSaved:async()=>{},onClose(){}}));
  const canvas=host.querySelector('canvas');
  assert.ok(canvas);
  assert.ok(host.textContent.includes('計算十二個月氣候'));
  assert.equal(button('儲存並返回').disabled,false);
  assert.equal(button('工具'),undefined);
  await act(async()=>{finishLoad();await delay(10);});
  assert.equal(host.querySelector('canvas'),canvas);
  assert.ok(button('工具'));
 }finally{pauseLoad=false;finishLoad=undefined;}
});

test('overview replaces map hints, shows pending society data and dismisses More actions outside',async()=>{
 const map={id:'overview',world_id:'world-test',title:'總覽測試',revision:1};
 await render(React.createElement(components.GlobalWorldMapEditor,{map,blob:new Blob([JSON.stringify(project())]),repository:{},beforeSave:async()=>{},onSaved:async()=>{},onClose(){}}));
 assert.ok(!host.textContent.includes('拖曳平移'));assert.ok(!host.textContent.includes('陸地面積比例'));
 await act(async()=>{host.querySelector('button[aria-label="詳細資訊"]').click();await delay(5);});
 const dialog=host.querySelector('dialog[aria-label="詳細資訊"]');assert.ok(dialog.open);assert.ok(dialog.textContent.includes('24 小時'));assert.ok(dialog.textContent.includes('尚未推演'));assert.ok(dialog.textContent.includes('32.000%'));
 await act(async()=>{dialog.querySelector('button[aria-label="關閉"]').click();await delay(5);});assert.equal(host.querySelector('dialog'),null);
 const more=host.querySelector('summary[aria-label="更多操作"]').parentElement;more.open=true;
 await act(async()=>{host.querySelector('canvas').dispatchEvent(new window.PointerEvent('pointerdown',{bubbles:true,button:0,pointerId:1}));await delay(5);});assert.equal(more.open,false);
 await click('顯示');await click('氣候');const legend=host.querySelector('section[aria-label="圖例"]');assert.ok(legend.textContent.includes('熱帶雨林氣候'));assert.ok(!legend.textContent.includes('Af'));
});

test('river editor only moves existing points and places regeneration last',async()=>{
 const p=project(),r={id:'river-1',name:'測試河',notes:'',geometry:[[-10,-10],[0,0],[10,10]],parentId:null,sourceLakeId:null,mouthLakeId:null};p.naturalGeography.rivers=[r];
 const map={id:'vector',world_id:'world-test',title:'河道編輯',revision:1},saved=[];
 const repo={stageDraft:async()=> 'vector-draft',clearDraft:async()=>{},save:async(w,id,revision,blob)=>{saved.push(JSON.parse(await blob.text()));return {map:{...map,revision:revision+1},world:{character_data:{world_maps:[map]}}};}};
 await render(React.createElement(components.GlobalWorldMapEditor,{map,blob:new Blob([JSON.stringify(p)]),repository:repo,beforeSave:async()=>{},onSaved:async()=>{},onClose(){}}));
 await click('工具');await click('河流');await change(host.querySelector('select[aria-label="選擇河流或湖泊"]'),'river-1');
 const canvas=host.querySelector('canvas');canvas.getBoundingClientRect=()=>({left:0,top:0,width:800,height:400});
 let svg=host.querySelector('svg[aria-label="河流向量編輯"]');assert.ok(svg);const before=svg.querySelectorAll('circle').length;
 await act(async()=>{svg.querySelector('line').dispatchEvent(new window.PointerEvent('pointerdown',{bubbles:true,clientX:390,clientY:210,pointerId:20}));await delay(5);});assert.equal(svg.querySelectorAll('circle').length,before);assert.equal(button('取消修改'),undefined);assert.equal(host.querySelector('textarea[aria-label="自然地理座標"]'),null);assert.ok(!host.textContent.includes('關聯與月別衍生資料'));const buttons=[...host.querySelectorAll('aside button')];assert.equal(buttons.at(-1).textContent,'重新生成河網');
 const circle=svg.querySelectorAll('circle')[1];circle.setPointerCapture=()=>{};
 await act(async()=>{circle.dispatchEvent(new window.PointerEvent('pointerdown',{bubbles:true,pointerId:21}));circle.dispatchEvent(new window.PointerEvent('pointermove',{bubbles:true,pointerId:21,clientX:405,clientY:190}));circle.dispatchEvent(new window.PointerEvent('pointerup',{bubbles:true,pointerId:21}));await delay(5);});assert.ok(button('套用河道並儲存'));assert.equal(saved.length,0);
 await click('套用河道並儲存');const request=requests.findLast(r=>r.action==='editNatural');assert.equal(request.patch.id,'river-1');assert.notDeepEqual(request.patch.geometry,r.geometry);assert.equal(saved.length,1);assert.deepEqual(saved[0].naturalGeography.rivers[0].geometry,request.patch.geometry);
 svg=host.querySelector('svg[aria-label="河流向量編輯"]');
 await act(async()=>{svg.querySelectorAll('circle')[1].dispatchEvent(new window.MouseEvent('dblclick',{bubbles:true}));await delay(5);});assert.equal(svg.querySelectorAll('circle').length,before);
 await act(async()=>{svg.querySelectorAll('circle')[1].dispatchEvent(new window.KeyboardEvent('keydown',{bubbles:true,key:'Delete'}));await delay(5);});assert.equal(svg.querySelectorAll('circle').length,before);
});
test('human tools appear below tools and expose four editable layers',async()=>{
 const p=project(),map={id:'map-human',world_id:'world-human',title:'人文測試',revision:1};
 await render(React.createElement(components.GlobalWorldMapEditor,{map,blob:new Blob([JSON.stringify(p)]),repository:{},beforeSave:async()=>{},onSaved:async()=>{},onClose(){}}));
 assert.deepEqual([...host.querySelector('nav').querySelectorAll('button')].map(b=>b.textContent),['工具','人文','顯示']);await click('人文');
 for(const label of ['文化','國家','省份','道路'])assert.ok(button(label));
 assert.ok(host.querySelector('select[aria-label="人文操作"]'));assert.ok(button('生成並取代本層'));await click('道路');assert.equal(button('生成並取代本層'),undefined);assert.ok(host.querySelector('select[aria-label="人文操作"]').textContent.includes('起終點'));await click('文化');assert.ok(button('重新推演領域'));
});
test('human edits save through the map repository and undo restores the snapshot',async()=>{
 const p=project(),map={id:'map-human-save',world_id:'world-human',title:'人文儲存',revision:1},saved=[];
 p.humanGeography={version:1,cultures:[],states:[{id:1,name:'測試國',center:0,parent:0,color:'#abcdef'}],provinces:[],culture:[],state:Array(36002).fill(0),province:[],roads:[]};p.humanGeography.state[0]=1;
 const repo={stageDraft:async()=> 'human-draft',clearDraft:async()=>{},save:async(w,id,revision,blob)=>{saved.push(JSON.parse(await blob.text()));return {map:{...map,revision:revision+1},world:{character_data:{world_maps:[map]}}};}};
 await render(React.createElement(components.GlobalWorldMapEditor,{map,blob:new Blob([JSON.stringify(p)]),repository:repo,beforeSave:async()=>{},onSaved:async()=>{},onClose(){}}));await click('顯示');assert.equal(button('政治').disabled,false);await click('人文');assert.ok(button('測試國'));await click('刪除');await click('儲存');assert.equal(saved.at(-1).humanGeography.states.length,0);await click('復原');assert.equal(saved.at(-1).humanGeography.states[0].name,'測試國');assert.equal(saved.at(-1).humanGeography.state[0],1);
});
test('recovered height draft completes its deferred environment pass before saving',async(t)=>{
 heightFixture=true;t.after(()=>{heightFixture=false;});const p=project();p.environmentTerrain=structuredClone(p.terrain);p.terrain.heights[0]=33;p.terrain.revision=1;p.terrain.checksum=checksum(p.terrain.heights);const saved=[],map={id:'recovered',world_id:'w',title:'恢復高度草稿',revision:1};
 const repo={stageDraft:async()=> 'draft',clearDraft:async()=>{},save:async(w,id,revision,blob)=>{saved.push(JSON.parse(await blob.text()));return {map:{...map,revision:revision+1},world:{}};}};const before=requests.length;
 await render(React.createElement(components.GlobalWorldMapEditor,{map,blob:new Blob([JSON.stringify(p)]),draftToken:'draft',repository:repo,beforeSave:async()=>{},onSaved:async()=>{},onClose(){}}));assert.ok(button('儲存並退出'));await click('儲存並退出');assert.equal(saved[0].terrain.heights[0],33);assert.equal(saved[0].environmentTerrain,undefined);assert.equal(requests.slice(before).filter(r=>r.action==='recalculateNature').length,1);
});
