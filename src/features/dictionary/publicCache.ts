/* Public, published dictionary responses only. Never cache admin or private data. */
const DATABASE = "nexus-public-dictionary";
const STORE = "responses";
const MAX_RECORDS = 100;
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
type RecordValue = { key: string; data: unknown; savedAt: number };
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked=false;
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "key" });
    request.onsuccess = () => {
      if(blocked){request.result.close();return;}
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {blocked=true;reject(new Error("Dictionary cache is blocked"));};
  });
}
async function transact<T>(mode: IDBTransactionMode, task: (store: IDBObjectStore, result:(v:T)=>void)=>void):Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve,reject)=>{
      const tx=db.transaction(STORE,mode);
      let result:T;
      tx.oncomplete=()=>resolve(result);
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
      task(tx.objectStore(STORE),value=>{result=value;});
    });
  } finally { db.close(); }
}
export async function readPublicCache<T>(key:string):Promise<T|undefined> {
  if(typeof indexedDB==="undefined")return undefined;
  try {
    const row=await transact<RecordValue|undefined>("readonly",(store,result)=>{
      const request=store.get(key);
      request.onsuccess=()=>result(request.result);
    });
    if(!row || Date.now()-row.savedAt>=MAX_AGE)return undefined;
    return row.data as T;
  }catch{return undefined;}
}
export async function savePublicCache(key:string,data:unknown):Promise<void> {
  if(typeof indexedDB==="undefined")return;
  try {
    await transact<void>("readwrite",store=>{
      const request=store.getAll();
      request.onsuccess=()=>{
        try {
          const previous=request.result as RecordValue[], now=Date.now();
          const entryId=key.startsWith('entry:')?key.slice(6):null;
          const old=previous.find(row=>row.key===key);
          // A successful null response is an observed unpublication/deletion.
          // Also discard cached lists/related details that still describe this entry.
          const changed=entryId && (data==null || (old && JSON.stringify(old.data)!==JSON.stringify(data)));
          const remaining=previous.filter(row=>{
            const value=row.data as {items?:{id:string}[];related?:{id:string}[]}|null;
            const stale=changed && (value?.items?.some(item=>item.id===entryId) || value?.related?.some(item=>item.id===entryId));
            if(now-row.savedAt>=MAX_AGE || row.key===key || stale){store.delete(row.key);return false;}
            return true;
          }).sort((a,b)=>a.savedAt-b.savedAt);
          const excess=Math.max(0,remaining.length+(data==null?0:1)-MAX_RECORDS);
          for(const row of remaining.slice(0,excess))store.delete(row.key);
          if(data!=null)store.put({key,data,savedAt:now} satisfies RecordValue);
        } catch { store.transaction.abort(); }
      };
    });
  }catch{/* Cache is optional: quota/serialization failures never block online reading. */}
}
export function offline():boolean {
  return typeof navigator!=="undefined" && navigator.onLine===false;
}

/** Bounded batch access for official-card display; same store, expiry and capacity. */
export async function readPublicCacheBatch(keys:string[]):Promise<Map<string,unknown>> {
 if(typeof indexedDB==='undefined')return new Map();
 try{return await transact<Map<string,unknown>>('readonly',(store,result)=>{const request=store.getAll();request.onsuccess=()=>{const wanted=new Set(keys);result(new Map((request.result as RecordValue[]).filter(row=>wanted.has(row.key)&&Date.now()-row.savedAt<MAX_AGE).map(row=>[row.key,row.data])));};});}catch{return new Map();}
}
export async function savePublicCacheBatch(entries:{key:string;data:unknown}[]):Promise<void>{
 if(typeof indexedDB==='undefined')return;
 try{await transact<void>('readwrite',store=>{const request=store.getAll();request.onsuccess=()=>{try{const now=Date.now(),replaced=new Set(entries.map(e=>e.key));const kept=(request.result as RecordValue[]).filter(row=>{if(replaced.has(row.key)||now-row.savedAt>=MAX_AGE){store.delete(row.key);return false;}return true;});const next=[...kept,...entries.filter(e=>e.data!=null).map(e=>({...e,savedAt:now}))].sort((a,b)=>a.savedAt-b.savedAt);for(const row of next.slice(0,Math.max(0,next.length-MAX_RECORDS)))store.delete(row.key);for(const row of next.slice(-MAX_RECORDS))store.put(row);}catch{store.transaction.abort();}};});}catch{/* Optional cache cannot block learning. */}
}
