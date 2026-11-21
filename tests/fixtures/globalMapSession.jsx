import React from 'react';
import {createRoot} from 'react-dom/client';
import {LanguageProvider} from '../../src/lib/LanguageContext';
import GlobalWorldMapEditor from '../../src/components/GlobalWorldMapEditor';
window.mapQA={actions:[],progress:0,saves:0,drafts:0};
const NativeWorker=window.Worker;
window.Worker=class extends NativeWorker{
 constructor(...args){super(...args);this.addEventListener('message',({data})=>{if(data.progress)window.mapQA.progress++;if(data.drawing)window.mapQA.drawing=data.drawing;});}
 postMessage(data,...args){window.mapQA.actions.push(data.action);super.postMessage(data,...args);}
};
fetch('/project.json').then(r=>r.json()).then(project=>{
 const map={id:'session-map',world_id:'session-world',title:'地圖編輯驗證',revision:1};
 const repository={stageDraft:async(w,id,rev,blob)=>{window.mapQA.drafts++;window.mapQA.draft=JSON.parse(await blob.text());return 'qa-draft';},clearDraft:async()=>{},save:async(w,id,rev,blob)=>{window.mapQA.saved=JSON.parse(await blob.text());window.mapQA.saves++;return {map:{...map,revision:rev+1},world:{}};}};
 createRoot(document.getElementById('root')).render(<LanguageProvider initialLanguage="zh-TW"><GlobalWorldMapEditor map={map} blob={new Blob([JSON.stringify(project)])} repository={repository} beforeSave={async()=>{}} onSaved={async()=>{}} onClose={()=>{}}/></LanguageProvider>);
});
