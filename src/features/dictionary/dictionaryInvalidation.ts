/** Invalidation only: never sends dictionary content or performs a write. */
const eventName = 'nexus-dictionary-invalidated';
const storageKey = 'nexus-dictionary-invalidation';
export function invalidateDictionary() {
  const id = crypto.randomUUID();
  window.dispatchEvent(new CustomEvent(eventName, {detail:id}));
  try { localStorage.setItem(storageKey, id); } catch { /* Focus/pageshow remain available. */ }
}
/** Coalesce publish/focus/pageshow signals; request ordering belongs to usePagedList. */
export function observeDictionaryInvalidation(refresh:()=>void) {
  let timer:ReturnType<typeof setTimeout>|undefined;
  const schedule=()=>{if(timer===undefined)timer=setTimeout(()=>{timer=undefined;refresh();},50);};
  const visible=()=>{if(document.visibilityState==='visible')schedule();};
  const stored=(event:StorageEvent)=>{if(event.key===storageKey&&event.newValue)schedule();};
  window.addEventListener(eventName,schedule);
  window.addEventListener('storage',stored);
  window.addEventListener('focus',schedule);
  window.addEventListener('pageshow',schedule);
  document.addEventListener('visibilitychange',visible);
  return ()=>{
    clearTimeout(timer);
    window.removeEventListener(eventName,schedule);
    window.removeEventListener('storage',stored);
    window.removeEventListener('focus',schedule);
    window.removeEventListener('pageshow',schedule);
    document.removeEventListener('visibilitychange',visible);
  };
}
