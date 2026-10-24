import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LanguageProvider,useLanguage} from '../../src/lib/LanguageContext';
import NoteExportPreview from '../../src/components/NoteExportPreview';
function Fixture(){
 const {setLanguage}=useLanguage();window.setExportLanguage=setLanguage;
 const [source,setSource]=useState(null),[open,setOpen]=useState(false);
 window.showExport=html=>{const host=document.createElement('article');host.className='ProseMirror nexus-tiptap-editor';host.innerHTML=html;document.getElementById('source').replaceChildren(host);setSource(host);setOpen(true);};
 window.failExportSave=false;window.printCount=0;window.print=()=>{window.printCount++;};
 return <><main style={{height:1600}}><h1>Workspace must not print</h1><div id="source"/></main>{open&&<NoteExportPreview source={source} title="Synthetic note" header="Header" footer="Footer" pageNumbers onClose={()=>setOpen(false)} onSave={async()=>{if(window.failExportSave)throw Error('Synthetic save failure');}}/>}</>;
}
createRoot(document.getElementById('root')).render(<LanguageProvider initialLanguage="zh-TW"><Fixture/></LanguageProvider>);
