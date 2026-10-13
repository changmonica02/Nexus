import {openDB} from 'idb';
import type {ImportItem,ImportSession} from './importReview';
/** Owner-partitioned local admin checkpoints. Item writes keep 6,300-row resumes bounded. */
export const dictionaryJobDatabase=()=>openDB('nexus-dictionary-import-review',2,{upgrade(db){
 if(!db.objectStoreNames.contains('sessions'))db.createObjectStore('sessions',{keyPath:'owner_id'});
 const items=db.createObjectStore('items',{keyPath:'key'});items.createIndex('session','session_key');
 db.createObjectStore('jobs',{keyPath:'key'});
 const pages=db.createObjectStore('export_pages',{keyPath:'key'});pages.createIndex('job','job_id');
}});
export async function loadImportSession(owner:string):Promise<ImportSession|null>{
 const db=await dictionaryJobDatabase();try{const saved=await db.get('sessions',owner);if(!saved)return null;
 // v1 sessions survive upgrade without changing operation UUIDs or historical progress.
 if(Array.isArray(saved.items))return saved;
 const rows=await db.getAllFromIndex('items','session',JSON.stringify([owner,saved.id]));
 if(saved.item_count!==undefined&&saved.item_count!==rows.length)throw Error('Import checkpoint is incomplete; do not start a replacement import');
 const {item_count,...metadata}=saved;void item_count;
 return {...metadata,items:rows.sort((a,b)=>a.order-b.order).map(r=>r.item)};
 }finally{db.close();}
}
export async function persistImportSession(session:ImportSession,changed?:ImportItem[]):Promise<void>{
 const db=await dictionaryJobDatabase();try{const tx=db.transaction(['sessions','items'],'readwrite',{durability:'strict'});
 // Observe transaction rejection immediately, including failures before tx.done is awaited.
 const done=tx.done;void done.catch(()=>{});
 try{
 const previous=await tx.objectStore('sessions').get(session.owner_id);
 const {items,...metadata}=session;await tx.objectStore('sessions').put({...metadata,item_count:items.length});
 const order=new Map(items.map((item,index)=>[item.id,index]));
 for(const item of !previous||previous.id!==session.id||Array.isArray(previous.items)?items:changed??items)await tx.objectStore('items').put({key:JSON.stringify([session.owner_id,session.id,item.id]),session_key:JSON.stringify([session.owner_id,session.id]),order:order.get(item.id),item});
 await done;
 }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
 }finally{db.close();}
}
export async function loadDictionaryJob<T>(owner:string,type:string):Promise<T|null>{const db=await dictionaryJobDatabase();try{return (await db.get('jobs',JSON.stringify([owner,type])))?.value??null;}finally{db.close();}}
export async function saveDictionaryJob(owner:string,type:string,value:unknown){const db=await dictionaryJobDatabase();try{await db.put('jobs',{key:JSON.stringify([owner,type]),value});}finally{db.close();}}
