require('fake-indexeddb/auto');require('./loadStudy.cjs');const test=require('node:test'),assert=require('node:assert/strict');
const {IndexedDBAdapter}=require('../src/infrastructure/storage/IndexedDBAdapter.ts');const {installCreationTemplate}=require('../src/features/creation/installTemplate.ts');
test('private template installation is durable, same-ID retry/update, owner-scoped and respects deletion tombstones',async()=>{
 const storage=new IndexedDBAdapter();await storage.init();storage.setWorkspaceOwner('owner');
 const data={page_id:'template-receipt-id',source_id:'post',version:1,title:'Template',kind:'character',author_name:'Author',license_snapshot:{allow_derivatives:false},structure:{isTemplate:true,basic:{name:'secret'},sections:[{id:'b',type:'group',title:'背景',contents:[]}],tabs:[]}};
 const one=await installCreationTemplate(storage,data,'owner');assert.equal(one.character_data.basic.name,'');assert.equal(one.character_data.resourceSource.postId,'post');
 await installCreationTemplate(storage,data,'owner');assert.equal((await storage.listPages()).length,1);
 await installCreationTemplate(storage,{...data,version:2,title:'Updated'},'owner');assert.equal((await storage.getPage(data.page_id)).character_data.resourceSource.version,2);
 const original=await storage.getPage(data.page_id);const {IDBObjectStore}=require('fake-indexeddb'),add=IDBObjectStore.prototype.add;
 IDBObjectStore.prototype.add=function(...args){if(this.name==='workspace_outbox')throw Error('injected write failure');return add.apply(this,args)};
 try{await assert.rejects(installCreationTemplate(storage,{...data,version:3},'owner'),/injected/)}finally{IDBObjectStore.prototype.add=add;}
 assert.deepEqual(await storage.getPage(data.page_id),original);
 storage.setWorkspaceOwner('other');assert.equal((await storage.listPages()).length,0);await assert.rejects(installCreationTemplate(storage,data,'owner'),/Account changed/);
 storage.setWorkspaceOwner('owner');await storage.deletePage(data.page_id);await assert.rejects(installCreationTemplate(storage,data,'owner'),/Restore|deleted/);
 await storage.close();
});
