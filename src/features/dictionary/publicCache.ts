/* Public, published dictionary responses only. Never cache admin or private data. */
const DATABASE = "nexus-public-dictionary";
const STORE = "responses";
const MAX_RECORDS = 100;
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
type RecordValue = { key: string; data: unknown; savedAt: number };
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transact<T>(mode: IDBTransactionMode, task: (store: IDBObjectStore, resolve:(v:T)=>void, reject:(error:unknown)=>void)=>void):Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve,reject)=>{
      const tx=db.transaction(STORE,mode);
      task(tx.objectStore(STORE),resolve,reject);
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
    });
  } finally { db.close(); }
}
export async function readPublicCache<T>(key:string):Promise<T|undefined> {
  if(typeof indexedDB==="undefined")return undefined;
  try {
    const row=await transact<RecordValue|undefined>("readonly",(store,resolve,reject)=>{
      const request=store.get(key);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    if(!row || Date.now()-row.savedAt>MAX_AGE)return undefined;
    return row.data as T;
  }catch{return undefined;}
}
export async function savePublicCache(key:string,data:unknown):Promise<void> {
  if(typeof indexedDB==="undefined" || data==null)return;
  try {
    await transact<void>("readwrite",(store,resolve,reject)=>{
      const request=store.getAll();
      request.onsuccess=()=>{
        const previous=request.result as RecordValue[];
        const expired=previous.filter(row=>Date.now()-row.savedAt>MAX_AGE);
        const remaining=previous.filter(row=>Date.now()-row.savedAt<=MAX_AGE && row.key!==key)
          .sort((a,b)=>a.savedAt-b.savedAt);
        const excess=Math.max(0,remaining.length+1-MAX_RECORDS);
        for(const row of [...expired,...remaining.slice(0,excess)])store.delete(row.key);
        store.put({key,data,savedAt:Date.now()} satisfies RecordValue);
      };
      request.onerror=()=>reject(request.error);
      store.transaction.oncomplete=()=>resolve();
    });
  }catch{/* Cache is optional: quota failures never block the dictionary. */}
}
export function offline():boolean {
  return typeof navigator!=="undefined" && navigator.onLine===false;
}
