require('./loadStudy.cjs');require('fake-indexeddb/auto');
const test=require('node:test'),assert=require('node:assert/strict');
const {IndexedDBAdapter}=require('../src/infrastructure/storage/IndexedDBAdapter.ts');
test('dated todo is created once with its existing Page fields and upload intent; backup and account boundaries remain intact',async()=>{
 const storage=new IndexedDBAdapter();await storage.init();storage.setWorkspaceOwner('life-owner');
 const page=await storage.createPage({kind:'todo',title:'dated task',due_date:0,completed:true});
 assert.equal((await storage.listPages()).length,1);assert.equal((await storage.getPage(page.id)).due_date,0);assert.equal(page.completed,true);
 const pending=await storage.getWorkspacePersistence().pending('life-owner');const op=pending.flatMap(batch=>batch.operations).find(op=>op.entity_id===page.id);assert.equal(op.value.due_date,0);assert.equal(op.value.completed,true);
 const backup=await storage.exportWorkspaceBackup();assert.equal(backup.pages[0].id,page.id);assert.equal(backup.pages[0].due_date,0);
 await storage.importWorkspaceBackup(backup);assert.equal((await storage.listPages()).length,1);
 storage.setWorkspaceOwner('another-owner');assert.equal((await storage.listPages()).length,0);await assert.rejects(storage.savePage({...page,title:'foreign overwrite'}));await assert.rejects(storage.importWorkspaceBackup(backup),/different account/);
 storage.setWorkspaceOwner('life-owner');assert.equal((await storage.getPage(page.id)).completed,true);storage.db.close();
});
