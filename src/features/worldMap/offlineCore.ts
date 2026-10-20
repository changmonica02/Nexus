// Cache public editor assets only. Private projects stay in StorageAdapter/IDB.
let preparing: Promise<void> | undefined;
export function prepareOfflineMapCore(): Promise<void> {
  if (!('serviceWorker' in navigator)) return Promise.resolve();
  if (preparing) return preparing;
  preparing=(async()=>{
    const registration=await navigator.serviceWorker.register('/world-map/offline.js',{scope:'/world-map/'});
    const worker=registration.installing??registration.waiting??registration.active;
    if(!worker || worker.state==='activated')return;
    await new Promise<void>((resolve,reject)=>{
      const timeout=setTimeout(()=>{worker.removeEventListener('statechange',changed);reject(Error('Offline tool preparation timed out'));},90000);
      const changed=()=>{
        if(worker.state==='activated'){clearTimeout(timeout);worker.removeEventListener('statechange',changed);resolve();}
        else if(worker.state==='redundant'){clearTimeout(timeout);worker.removeEventListener('statechange',changed);reject(Error('Offline tool cache is unavailable'));}
      };
      worker.addEventListener('statechange',changed);changed();
    });
  })().catch(error=>{preparing=undefined;throw error;});
  return preparing;
}
