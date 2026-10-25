import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import EditorPane from '../../src/components/EditorPane';
import {LanguageProvider} from '../../src/lib/LanguageContext';
const text=(type,id,value,attrs={})=>({type,attrs:{id,...attrs},content:[{type:'text',text:value}]});
const legacy={id:'legacy',kind:'note',title:'Legacy note',format:'paged',content_text:'Legacy heading\nBefore\nAfter',content_json:{type:'doc',legacyMarker:{keep:true},lessonLayout:{header:'Original header'},content:[text('heading','heading','Legacy heading',{level:1}),text('paragraph','before','Before'),{type:'pageBreak',attrs:{id:'manual-break'}},text('paragraph','after','After')]}};
let paginationStorage;
function Demo(){
 const [page,setPage]=useState(legacy);
 const [mountRevision,setMountRevision]=useState(0);
 window.currentNote=page;
 window.persistPaginationNote=async()=>{const {IndexedDBAdapter}=await import('../../src/infrastructure/storage/IndexedDBAdapter');paginationStorage=new IndexedDBAdapter();await paginationStorage.init();paginationStorage.setWorkspaceOwner('note-pagination-owner');await paginationStorage.savePage({...page,created_at:1,updated_at:2,deleted_at:null,revision:1,device_id:await paginationStorage.getDeviceId(),workspace_owner_id:'note-pagination-owner',attachment_ids:[]});return (await paginationStorage.getPage(page.id)).content_json;};
 window.readPaginationNote=async()=> (await paginationStorage.getPage('pagination-note')).content_json;
 window.reopenPaginationNote=async()=>{const {IndexedDBAdapter}=await import('../../src/infrastructure/storage/IndexedDBAdapter');const fresh=new IndexedDBAdapter();await fresh.init();fresh.setWorkspaceOwner('note-pagination-owner');const saved=await fresh.getPage('pagination-note');setPage(saved);setMountRevision(n=>n+1);return saved.content_json;};
 window.loadPaginationNote=json=>setPage({...legacy,id:"pagination-note",format:"flow",content_json:json});
 window.loadNote=(id)=>setPage(id==='legacy'?structuredClone(legacy):{...legacy,id,title:'Other note',format:'flow',content_json:{type:'doc',content:[{type:'paragraph'}]}});
 window.reopenCurrentNote=()=>setMountRevision(n=>n+1);
 return <div style={{height:'100vh',display:'flex'}}><EditorPane key={`${page.id}-${mountRevision}`} page={page} attachment={null} pdfUrl={null} pdfLoadError={null} onTitleChange={title=>setPage(p=>({...p,title}))} onTagsChange={()=>{}} onContentChange={({json,text})=>setPage(p=>({...p,content_json:json,content_text:text}))}/></div>;
}
createRoot(document.getElementById('root')).render(<LanguageProvider initialLanguage="zh-TW"><Demo/></LanguageProvider>);

