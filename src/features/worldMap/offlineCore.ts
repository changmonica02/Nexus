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

export async function readPublicMapAsset(value:string):Promise<Blob> {
  const url=new URL(value,location.origin+'/world-map/core/');
  if(url.origin!==location.origin||!url.pathname.startsWith('/world-map/core/'))throw Error('Not a public map asset');
  url.hash='';
  // The broker can return only a pre-cached public file, never fetch an arbitrary
  // same-origin URL on behalf of imported content (including encoded traversal).
  for(const name of await caches.keys())if(name.startsWith('nexus-world-map-')){
    const response=await (await caches.open(name)).match(url.href,{ignoreSearch:true});
    if(response?.ok)return response.blob();
  }
  throw Error('Public map asset is not cached: '+url.pathname);
}

/** Public code/assets only, never a saved user project. Used for offline iframe navigation. */
export async function offlineMapDocument(session:string):Promise<string> {
  const base=location.origin+'/world-map/core/';
  const doc=new DOMParser().parseFromString(await (await readPublicMapAsset(base+'index.html')).text(),'text/html');
  const baseEl=doc.createElement('base');baseEl.href=base;doc.head.prepend(baseEl);
  const textSafe=(s:string)=>s.replace(/<\/script/gi,'<\\/script');
  for(const script of Array.from(doc.querySelectorAll<HTMLScriptElement>('script[src]'))){
    const code=await (await readPublicMapAsset(new URL(script.getAttribute('src')!,base).href)).text();
    script.removeAttribute('src');script.removeAttribute('crossorigin');script.textContent=textSafe(code);
  }
  const dataURL=async(url:string)=>{const blob=await readPublicMapAsset(url);return new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
  });};
  for(const link of Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel=stylesheet],link[rel=preload][as=style]'))){
    const url=new URL(link.getAttribute('href')!,base).href;
    let css=await (await readPublicMapAsset(url)).text();
    for(const match of [...css.matchAll(/url\(["']?([^\)"']+)["']?\)/g)]){
      if(/^(data:|blob:|#)/.test(match[1]))continue;
      const asset=new URL(match[1],url);
      if(asset.origin===location.origin)css=css.replace(match[0],`url("${await dataURL(asset.href)}")`);
    }
    const style=doc.createElement('style');style.textContent=css;link.replaceWith(style);
  }
  doc.querySelectorAll('link[rel=modulepreload],link[rel=manifest],link[rel=icon]').forEach(el=>el.remove());
  const bootstrap=doc.createElement('script');
  bootstrap.textContent=textSafe(`window.nexusSession=${JSON.stringify(session)};(${assetBroker.toString()})(${JSON.stringify(session)},${JSON.stringify(base)});`);
  doc.head.prepend(bootstrap);
  const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';
  policy.content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; style-src 'unsafe-inline'; img-src data: blob:; font-src data: blob:; connect-src data: blob:; frame-src 'none'; object-src 'none'";
  doc.head.prepend(policy);
  return '<!doctype html>'+doc.documentElement.outerHTML;
}

// This function is serialized into the opaque frame. It has no access to Nexus state.
function assetBroker(session:string,base:string) {
  let sequence=0;
  const pending=new Map<number,{resolve:(blob:Blob)=>void;reject:(e:Error)=>void}>();
  const publicURL=(value:string)=>{try{const u=new URL(value,base),b=new URL(base);return u.origin===b.origin&&u.pathname.startsWith(b.pathname)?u:null;}catch{return null;}};
  window.addEventListener('message',event=>{if(event.source!==parent||event.data?.type!=='nexus-map-asset-result'||event.data.session!==session)return;
    const p=pending.get(event.data.id);if(!p)return;pending.delete(event.data.id);
    if(event.data.blob instanceof Blob)p.resolve(event.data.blob);else p.reject(Error(String(event.data.error)));
  });
  const asset=(url:string)=>new Promise<Blob>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});parent.postMessage({type:'nexus-map-asset',session,id,url},'*');});
  const originalFetch=window.fetch.bind(window);
  window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
    const value=typeof input==='string'?input:input instanceof URL?input.href:input.url;
    const url=publicURL(value);if(!url)return originalFetch(input,init);
    return new Response(await asset(url.href));
  };
  const urls=new Map<string,Promise<string>>();
  const imageURL=(url:URL)=>{const key=url.href;if(!urls.has(key))urls.set(key,asset(key).then(blob=>URL.createObjectURL(blob)+url.hash));return urls.get(key)!;};
  const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src')!;
  Object.defineProperty(HTMLImageElement.prototype,'src',{get:descriptor.get,set(this:HTMLImageElement,value:string){const url=publicURL(value);if(!url)return descriptor.set!.call(this,value);void imageURL(url).then(src=>descriptor.set!.call(this,src)).catch(()=>this.dispatchEvent(new Event('error')));}});
  const update=(el:Element)=>{
    const attr=el.tagName.toLowerCase()==='img'?'src':'href',value=el.getAttribute(attr);
    if(!value)return;const url=publicURL(value);if(!url)return;
    void imageURL(url).then(src=>{if(el.getAttribute(attr)===value)el.setAttribute(attr,src);}).catch(()=>{});
  };
  new MutationObserver(records=>{for(const record of records){if(record.type==='attributes')update(record.target as Element);
    else for(const node of record.addedNodes)if(node instanceof Element){if(node.matches('img[src],image[href],use[href]'))update(node);node.querySelectorAll('img[src],image[href],use[href]').forEach(update);}}}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['src','href']});
}
