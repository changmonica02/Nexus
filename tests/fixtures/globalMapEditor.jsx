import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LanguageProvider} from '../../src/lib/LanguageContext';
import WorldMapCreator from '../../src/components/WorldMapCreator';
import WorldMapEditor from '../../src/components/WorldMapEditor';
import {IndexedDBAdapter} from '../../src/infrastructure/storage/IndexedDBAdapter';
import {WorldMapRepository} from '../../src/features/worldMap/worldMapRepository';
const owner='global-browser-owner',storage=new IndexedDBAdapter();
await storage.init();storage.setWorkspaceOwner(owner);
let world=await storage.getPage('global-browser-world');
if(!world){world={id:'global-browser-world',title:'World',kind:'creative',creative_type:'world',character_data:{basic:{name:'World'},sections:[{id:'story',type:'rich_text',title:'Story',richText:'Keep this story'}]},content_json:{type:'doc'},content_text:'Keep this story',default_mode:'note',created_at:1,updated_at:1,deleted_at:null,revision:1,device_id:'device',workspace_owner_id:owner,attachment_ids:[]};await storage.savePage(world);}
const repo=new WorldMapRepository(storage),save=repo.save.bind(repo),createSpace=repo.createSpace.bind(repo);
repo.createSpace=async(...args)=>{try{return await createSpace(...args);}catch(e){console.error('GLOBAL_CREATE_ERROR',e.message);throw e;}};
repo.save=async(...args)=>{if(window.failSave)throw Error('Disk full');return save(...args);};
window.testGlobal={storage,repo,async snapshot(){for(let attempt=0;attempt<4;attempt++){const w=await storage.getPage(world.id),m=w.character_data.world_maps?.[0];try{return m?JSON.parse(await (await repo.read(world.id,m.id)).blob.text()):null;}catch(error){if(error.code!=='conflict')throw error;}}throw Error('Snapshot changed repeatedly during verification');},async stale(){const w=await storage.getPage(world.id),m=w.character_data.world_maps[0];await repo.rename(w.id,m.id,m.revision,'Other device');},async draft(){const w=await storage.getPage(world.id),m=w.character_data.world_maps[0];return repo.readDraft(w.id,m.id);}};
function App(){
 const [creating,setCreating]=useState(false),[opened,setOpened]=useState(),[editing,setEditing]=useState(true),[epoch,setEpoch]=useState(0);
 useEffect(()=>{let live=true;void repo.list(world.id).then(async maps=>{if(maps[0]){const saved=await repo.read(world.id,maps[0].id),draft=await repo.readDraft(world.id,maps[0].id);if(live)setOpened(draft&&draft.base_revision===saved.map.revision?{...saved,blob:draft.blob,draftToken:draft.token}:{...saved,draftConflict:draft?{token:draft.token,blob:draft.blob}:undefined});}});return()=>{live=false;};},[epoch]);
 return <LanguageProvider initialLanguage={new URLSearchParams(location.search).has('en')?'en':'zh-TW'}>
 <button onClick={()=>setCreating(true)}>New map</button><button onClick={()=>{setOpened(undefined);setEpoch(n=>n+1);setEditing(true);}}>Reopen</button>
 {creating&&<WorldMapCreator initialName="Global" onCancel={()=>setCreating(false)} onCreate={async(name,blob)=>{const result=await repo.createSpace(world.id,name,'surface',blob);setCreating(false);setOpened({map:result.map,blob});setEditing(true);}}/>}
 {opened&&<WorldMapEditor {...opened} repository={repo} editing={editing} beforeSave={async()=>{}} onSaved={async w=>{world=w;setOpened(old=>({...old,map:w.character_data.world_maps.find(m=>m.id===old.map.id)}));}} onClose={()=>setEditing(false)} onEdit={()=>setEditing(true)}/>}
 </LanguageProvider>;
}
createRoot(document.getElementById('root')).render(<App/>);
