import AccountButton from '../../src/components/AccountButton';import {createClient} from '@supabase/supabase-js';
import React from 'react';import {createRoot} from 'react-dom/client';
import {DictionaryWorkspace} from '../../src/features/dictionary/DictionaryAdmin';
import ConfirmDialogHost from '../../src/components/ConfirmDialog';
import {LanguageProvider} from '../../src/lib/LanguageContext';
window.dictionaryClient={auth:{getUser:async()=>({data:{user:{id:'00000000-0000-4000-8000-000000900000'}}})},rpc:async(name,args={})=>(await fetch('/rpc',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,args})})).json()};
const params=new URLSearchParams(location.search);
if(params.has('account')){
 window.authRequests=[];const sdk=createClient(location.origin,'public-test-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 window.dictionaryClient.auth.signInWithOAuth=async request=>{const response=await sdk.auth.signInWithOAuth({...request,options:{...request.options,skipBrowserRedirect:true}});window.authRequests.push({request,url:response.data.url});return response;};
 window.dictionaryClient.auth.signOut=async()=>{window.signedOut=true;return {error:null};};
}
createRoot(document.getElementById('root')).render(<LanguageProvider initialLanguage={new URLSearchParams(location.search).get('en')?'en':'zh-TW'}>{params.has('account')?<AccountButton required accountEmail={params.get('email')}/>:<DictionaryWorkspace/>}<ConfirmDialogHost/></LanguageProvider>);
