import {openDB} from 'idb';
import type {ImportSession} from './importReview';
/** Independent admin-only local workspace; does not change Study's IndexedDB schema. */
const database=()=>openDB('nexus-dictionary-import-review',1,{upgrade(db){db.createObjectStore('sessions',{keyPath:'owner_id'});}});
export async function loadImportSession(owner:string):Promise<ImportSession|null>{const db=await database();try{return await db.get('sessions',owner)??null;}finally{db.close();}}
export async function persistImportSession(session:ImportSession):Promise<void>{const db=await database();try{await db.put('sessions',session);}finally{db.close();}}
