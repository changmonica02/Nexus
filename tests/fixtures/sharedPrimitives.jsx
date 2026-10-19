import React, {useState, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import ModalDialog from '../../src/components/ModalDialog';
import ToolbarDropdown from '../../src/components/ToolbarDropdown';
import PageItemMenu from '../../src/components/PageItemMenu';
import {useAttachmentPreview} from '../../src/components/useAttachmentPreview';
import {LanguageProvider} from '../../src/lib/LanguageContext';
window.blobCreated=[];window.blobRevoked=[];
const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=blob=>{const url=create(blob);window.blobCreated.push(url);return url;};
URL.revokeObjectURL=url=>{window.blobRevoked.push(url);revoke(url);};
const a={id:'a',kind:'pdf'},b={id:'b',kind:'pdf'};
function Preview({attachment}){
  const storage=useRef({readBinary:async id=>id==='a'?new Promise(resolve=>{window.resolveA=()=>resolve(new Blob(['A']));}):new Blob(['B'])});
  const result=useAttachmentPreview(attachment,storage);
  return <output data-preview>{result.url??result.error??'empty'}</output>;
}
function App(){
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[attachment,setAttachment]=useState(a),[preview,setPreview]=useState(true);
  return <>
    <button onClick={()=>setOpen(true)}>Open dialog</button>
    <button onClick={()=>setAttachment(b)}>Next PDF</button><button onClick={()=>setPreview(false)}>Remove preview</button>
    {preview&&<Preview attachment={attachment}/>}
    {open&&<ModalDialog aria-label="Shared dialog" onDismiss={()=>setOpen(false)} dismissOnBackdrop busy={busy} style={{width:280,height:240,padding:20}}>
      <input aria-label="Dialog text"/><button onClick={()=>setBusy(!busy)}>{busy?'Unlock':'Lock'}</button>
      <ToolbarDropdown label="Toolbar menu" items={[{id:'one',label:'Action one',icon:'',onClick:()=>window.action='one'}]}/>
      <PageItemMenu title="Item menu" items={[{id:'disabled',label:'Disabled',disabled:true,onClick:()=>{}},{id:'two',label:'Action two',onClick:()=>window.action='two'}]}/>
      <button onClick={()=>setOpen(false)}>Close</button>
    </ModalDialog>}
  </>;
}
createRoot(document.getElementById('root')).render(<LanguageProvider initialLanguage="en"><App/></LanguageProvider>);
