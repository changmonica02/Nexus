import React from 'react';import {createRoot} from 'react-dom/client';
import {DictionaryWorkspace} from '../../src/features/dictionary/DictionaryAdmin';
import ConfirmDialogHost from '../../src/components/ConfirmDialog';
import {LanguageProvider} from '../../src/lib/LanguageContext';
window.dictionaryClient={auth:{getUser:async()=>({data:{user:{id:'00000000-0000-4000-8000-000000900000'}}})},rpc:async(name,args={})=>(await fetch('/rpc',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,args})})).json()};
createRoot(document.getElementById('root')).render(<LanguageProvider initialLanguage={new URLSearchParams(location.search).get('en')?'en':'zh-TW'}><DictionaryWorkspace/><ConfirmDialogHost/></LanguageProvider>);
