import React from 'react';import {createRoot} from 'react-dom/client';import {openDB} from 'idb';
import {id} from './dictionaryEditorService';import {StudyRepository,STUDY_STORES} from '../../src/features/study/StudyRepository';import StudySetView from '../../src/features/study/components/StudySetView';import {LanguageProvider} from '../../src/lib/LanguageContext';import ConfirmDialogHost from '../../src/components/ConfirmDialog';
const rpc=window.dictionaryClient.rpc,authCallbacks=[];
let currentUser={id:id(1)};
window.dictionaryClient.auth={
 getUser:async()=>({data:{user:currentUser}}),
 onAuthStateChange:cb=>{
  authCallbacks.push(cb);
  return {data:{subscription:{unsubscribe(){const i=authCallbacks.indexOf(cb);if(i>=0)authCallbacks.splice(i,1);}}}};
 }
};
window.signOut=()=>{currentUser=null;authCallbacks.slice().forEach(cb=>cb('SIGNED_OUT',null));};

window.dictionaryClient.rpc=async(name,args)=>{if(name==='official_private_card_capabilities')return {data:{version:1}};if(name==='is_dictionary_admin')return {data:!new URLSearchParams(location.search).has('reader')};if(['apply_study_operation','apply_study_resolution'].includes(name))return {data:true};if(name==='pull_study_changes')return {data:[]};if(name==='get_published_dictionary_entry')return {data:{...structuredClone(window.fixture.snapshot.detail),related:[]}};return rpc(name,args);};
const db=await openDB('study-dictionary-browser',1,{upgrade(db){for(const name of STUDY_STORES){const s=db.createObjectStore(name,{keyPath:'id'});if(['study_cards','study_states','study_events'].includes(name)){s.createIndex('deck','deck_id');if(name==='study_events')s.createIndex('deck_day',['deck_id','local_day']);}}}});
const repository=new StudyRepository(db,()=>id(1),'device'),page={id:'deck',workspace_owner_id:id(1),kind:'study_set',title:'Private',study_items:[]};await repository.ensureDeck(page);if(!(await repository.readDeck('deck')).cards.length)await repository.addCards('deck',[{front:'my go',back:'我的私人答案',...(new URLSearchParams(location.search).has('unlinked')?{}:{dictionary_entry_id:id(10)})}]);if(new URLSearchParams(location.search).has('official')){page.official_pack_id='gsat-1-2';for(const card of (await repository.readDeck('deck')).cards)await db.put('study_cards',{...card,official_pack_id:'gsat-1-2',official_source_entry_id:id(10)});await db.put('study_settings',{...await db.get('study_settings','deck'),official_pack_id:'gsat-1-2'});}window.studyDb=db;
createRoot(document.getElementById('root')).render(<LanguageProvider initialLanguage="zh-TW"><StudySetView page={page} repository={repository} onTitleChange={()=>{}}/><ConfirmDialogHost/></LanguageProvider>);
