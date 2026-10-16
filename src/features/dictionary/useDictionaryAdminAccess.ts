"use client";
import {useEffect,useRef,useState} from 'react';
import {getSupabase} from '../../infrastructure/supabase/client';
export function useDictionaryAdminAccess(enabled=true){
  const [access,setAccess]=useState<{owner:string;allowed:boolean}|null>(null),[error,setError]=useState('');
  const ownerRef=useRef<string|null>(null);
  useEffect(()=>{const client=getSupabase();if(!client||!enabled)return;let generation=0;let mounted=true;
    const check=async()=>{const run=++generation;setAccess(null);const {data:{user},error:authError}=await client.auth.getUser();if(!mounted||run!==generation)return;if(authError||!user){setError('請先從 Nexus 登入。');return;}const {data,error}=await client.rpc('is_dictionary_admin');if(!mounted||run!==generation)return;if(error){setError('無法確認管理權限，請確認 M7-9／M7-10 migration 已套用。');return;}setError('');ownerRef.current=user.id;setAccess({owner:user.id,allowed:data===true});};
    void check();const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{if(event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED'||(session?.user.id===ownerRef.current))return;generation++;ownerRef.current=null;setAccess(null);setTimeout(()=>{if(mounted)void check();},0);});return()=>{mounted=false;generation++;subscription.unsubscribe();};},[enabled]);
return {access:enabled?access:null,error};
}
