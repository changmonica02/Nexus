import React, {useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {LanguageProvider,useLanguage} from '../../src/lib/LanguageContext';
import {IndexedDBAdapter} from '../../src/infrastructure/storage/IndexedDBAdapter';
import CharacterProfileView from '../../src/components/CharacterProfileView';
const storage=new IndexedDBAdapter();await storage.init();storage.setWorkspaceOwner('map-browser-owner');
let world=await storage.getPage('world-browser');
if(!world){world={id:'world-browser',title:'Test World',kind:'creative',creative_type:'world',character_data:{basic:{name:'Test World',gender:'Legacy gender',age:'999',role:'Legacy role'},sections:[]},content_json:{},content_text:'',default_mode:'note',created_at:1,updated_at:1,revision:1,deleted_at:null,device_id:'test-device',workspace_owner_id:'map-browser-owner',attachment_ids:[]};await storage.savePage(world);}
function LanguageSwitch(){const {setLanguage}=useLanguage();return <div><button onClick={()=>setLanguage('zh-TW')}>繁體中文</button><button onClick={()=>setLanguage('en')}>English</button></div>;}
function Fixture(){const [page,setPage]=useState(world),[cloud,setCloud]=useState({status:'idle',error:null,pendingPushes:0});useEffect(()=>{window.setMapCloud=setCloud;window.setMapTitle=title=>setPage(old=>({...old,title}));return()=>{delete window.setMapCloud;delete window.setMapTitle;};},[]);return <LanguageProvider initialLanguage="en"><LanguageSwitch/><CharacterProfileView page={page} onTitleChange={()=>{}} onUpdateCharacterData={()=>{}} worldMapStorage={storage} worldMapCloudState={cloud} beforeWorldMapSave={async()=>{}} onWorldMapSaved={async next=>{setPage(next);}}/></LanguageProvider>;}
window.mapStorage=storage;
const persistence=storage.getWorkspacePersistence.bind(storage);
storage.getWorkspacePersistence=()=>new Proxy(persistence(),{get(target,key){if(key==='mutate')return(...args)=>{if(window.failMapSave)throw Error('Simulated local save failure');return target.mutate(...args);};return Reflect.get(target,key);}});
createRoot(document.getElementById('root')).render(<Fixture/>);


