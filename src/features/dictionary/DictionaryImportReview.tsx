'use client';
import {PersistentImportReview} from './PersistentImportReview';
import {persistentImportAvailable} from './persistentImport';
import {useEffect,useState} from 'react';
import {getSupabase} from '../../infrastructure/supabase/client';

export function DictionaryImportReview(props:Parameters<typeof PersistentImportReview>[0]){
 const [available,setAvailable]=useState<boolean|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;const client=getSupabase();if(client)void persistentImportAvailable(client).then(v=>{if(active)setAvailable(v);}).catch(e=>{if(active)setError(String(e));});return()=>{active=false;};},[]);
 if(error)return <p role="alert">{error}</p>;
 if(available===null)return <p role="status">…</p>;
 return available?<PersistentImportReview {...props}/>:<p role="alert">常駐匯入審核尚未部署，請聯絡管理員。</p>;
}
