const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module');
let waitForExportAssets;
before(async()=>({waitForExportAssets}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(fs.readFileSync('src/lib/noteExportLayout.ts','utf8'),{mode:'transform'})).toString('base64'))));
class ImageStub extends EventTarget{
 complete=false;naturalWidth=0;listeners=0;
 addEventListener(...args){this.listeners++;super.addEventListener(...args);}
 removeEventListener(...args){this.listeners--;super.removeEventListener(...args);}
}
const root=(images=[],fonts)=>({querySelectorAll:()=>images,ownerDocument:{fonts}});
test('loaded images and fonts settle without changes outside the copy',async()=>{const image=new ImageStub();image.complete=true;image.naturalWidth=600;assert.equal(await waitForExportAssets(root([image],{ready:Promise.resolve()}),new AbortController().signal,100),true);assert.equal(image.loading,'eager');});
test('pending image and fonts must both finish',async()=>{let resolveFont;const font=new Promise(r=>resolveFont=r),image=new ImageStub(),controller=new AbortController();let settled=false;const ready=waitForExportAssets(root([image],{ready:font}),controller.signal,200).then(v=>{settled=true;return v;});resolveFont();await Promise.resolve();assert.equal(settled,false);image.naturalWidth=600;image.dispatchEvent(new Event('load'));assert.equal(await ready,true);assert.equal(image.listeners,0);});
test('broken images report failure without rejecting or leaking listeners',async()=>{const image=new ImageStub(),ready=waitForExportAssets(root([image]),new AbortController().signal,100);image.dispatchEvent(new Event('error'));assert.equal(await ready,false);assert.equal(image.listeners,0);});
test('unresolved resources time out with warning and detach handlers',async()=>{const image=new ImageStub();assert.equal(await waitForExportAssets(root([image],{ready:new Promise(()=>{})}),new AbortController().signal,10),false);assert.equal(image.listeners,0);});
test('closing a pending preview aborts its listeners and late load is ignored',async()=>{const image=new ImageStub(),controller=new AbortController(),ready=waitForExportAssets(root([image]),controller.signal,100);controller.abort();assert.equal(await ready,false);assert.equal(image.listeners,0);image.dispatchEvent(new Event('load'));});
