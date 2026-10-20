import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LanguageProvider} from '../../src/lib/LanguageContext';
import {IndexedDBAdapter} from '../../src/infrastructure/storage/IndexedDBAdapter';
import WorldMapManager from '../../src/components/WorldMapManager';
const storage=new IndexedDBAdapter();await storage.init();storage.setWorkspaceOwner('map-browser-owner');
let world=await storage.getPage('world-browser');
if(!world){world={id:'world-browser',title:'Test World',kind:'creative',creative_type:'world',character_data:{basic:{name:'Test World'},sections:[]},content_json:{},content_text:'',default_mode:'note',created_at:1,updated_at:1,revision:1,deleted_at:null,device_id:'test-device',workspace_owner_id:'map-browser-owner',attachment_ids:[]};await storage.savePage(world);}
function Fixture(){const [page,setPage]=useState(world);return <LanguageProvider initialLanguage="en"><WorldMapManager world={page} storage={storage} beforeSave={async()=>{}} onSaved={async next=>{setPage(next);}}/></LanguageProvider>;}
window.mapStorage=storage;
const persistence=storage.getWorkspacePersistence.bind(storage);
storage.getWorkspacePersistence=()=>new Proxy(persistence(),{get(target,key){if(key==='mutate')return(...args)=>{if(window.failMapSave)throw Error('Simulated local save failure');return target.mutate(...args);};return Reflect.get(target,key);}});
createRoot(document.getElementById('root')).render(<Fixture/>);
