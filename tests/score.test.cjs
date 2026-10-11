require('./loadStudy.cjs');
require('fake-indexeddb/auto');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../src/features/score/score.ts');
const {notationAdapters}=require('../src/features/score/notation.ts');
const {IndexedDBAdapter}=require('../src/infrastructure/storage/IndexedDBAdapter.ts');
for(const type of core.notationTypes)test(`${type}: shared model, metadata round-trip and adapter`,()=>{
 const s=core.createScore('曲名',type,123);
 const changed=core.updateMetadata(s,{tempo:90,timeSignature:{beats:3,beatUnit:4},keySignature:'D minor'});
 assert.deepEqual(core.readScore(JSON.parse(JSON.stringify(changed))),changed);
 assert.equal(changed.metadata.createdAt,123);
 assert.equal(notationAdapters[type].renderModel(changed).length,1);
 assert.equal(s.metadata.tempo,120);
});
test('measure, note/rest, all durations, deletion and notation switching preserve events',()=>{
 let s=core.createScore(),m=s.tracks[0].measures[0].id;
 s=core.addMeasure(s,s.tracks[0].id);assert.equal(s.tracks[0].measures.length,2);
 s=core.addEvent(s,m,'note','quarter',notationAdapters.numbered.defaultTone);
 s=core.addEvent(s,m,'rest','half',notationAdapters.staff.defaultTone);
 const note=s.tracks[0].measures[0].events[0].id;
 for(const d of core.durations){s=core.setDuration(s,m,note,d);assert.equal(s.tracks[0].measures[0].events[0].duration,d);}
 const events=structuredClone(s.tracks);
 for(const notationType of core.notationTypes){s=core.updateMetadata(s,{notationType});assert.deepEqual(s.tracks,events);assert.equal(notationAdapters[notationType].renderModel(s)[0].measures[0].events.length,2);}
 s=core.deleteEvent(s,m,note);assert.equal(s.tracks[0].measures[0].events[0].type,'rest');
 s=core.deleteEvent(s,m,s.tracks[0].measures[0].events[0].id);assert.equal(s.tracks[0].measures[0].events.length,0);
});
test('reject invalid score while leaving unrelated page data intact',()=>{
 const old={type:'doc',content:[{type:'paragraph'}]};assert.equal(core.readScore(old),null);assert.equal(old.content.length,1);
 assert.throws(()=>core.updateMetadata(core.createScore(),{tempo:0}));
});
test('real IndexedDB Page storage survives reopen and preserves existing notes',async()=>{
 let a=new IndexedDBAdapter();await a.init();
 const old=await a.createPage({kind:'note',title:'existing'});
 const p=await a.createPage({kind:'score'});assert.equal(p.title,p.content_json.metadata.title);
 let s=core.addEvent(p.content_json,p.content_json.tracks[0].measures[0].id,'note','eighth',notationAdapters.guitar.defaultTone);
 s=core.updateMetadata(s,{notationType:'guitar',title:'saved',tempo:88});
 await a.savePage({...p,title:s.metadata.title,content_json:s});await a.close();
 a=new IndexedDBAdapter();await a.init();
 try{assert.deepEqual((await a.getPage(p.id)).content_json,s);assert.deepEqual(await a.getPage(old.id),old);}finally{await a.close();}
});
test('tools remain direct destinations and score is independent',()=>{
 const {TOOL_FEATURES}=require('../src/lib/featurePreferences.ts');
 const {creationOptions}=require('../src/lib/creationOptions.ts');
 assert.deepEqual(TOOL_FEATURES,['counter','draw']);assert.equal(creationOptions.score[0].type,'score');
 for(const kind of TOOL_FEATURES)assert.equal(creationOptions[kind][0].type,kind);
 const sidebar=fs.readFileSync('src/components/Sidebar.tsx','utf8');
 assert.match(sidebar,/工具/);assert.match(sidebar,/TOOL_FEATURES\.includes/);
});
test('workspace and overview expose accessible controls and responsive layout',()=>{
 const ts=require('typescript');require.extensions['.tsx']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const {default:Editor,ScoreOverview}=require('../src/features/score/ScoreWorkspace.tsx');
 const s=core.createScore('測試');const page={id:'p',title:'測試',content_json:s,updated_at:1};
 const html=renderToStaticMarkup(React.createElement(Editor,{page,onChange(){},async onSave(){},async onBack(){}}));
 for(const label of ['新增小節','休止符','音符','儲存','返回','拍號單位','新增時值'])assert.ok(html.includes(label),label);
 assert.ok(html.includes('flex-wrap'));assert.ok(html.includes('overflow-y-auto'));
 const empty=renderToStaticMarkup(React.createElement(ScoreOverview,{pages:[],onCreate(){},onOpen(){}}));assert.ok(empty.includes('尚無樂譜'));
 const listing=renderToStaticMarkup(React.createElement(ScoreOverview,{pages:[page],onCreate(){},onOpen(){}}));assert.ok(listing.includes('120'));assert.ok(listing.includes('簡譜'));
});
