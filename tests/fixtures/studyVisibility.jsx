import React from 'react';import {createRoot} from 'react-dom/client';
import {IndexedDBAdapter} from '../../src/infrastructure/storage/IndexedDBAdapter';
import StudySetView from '../../src/features/study/components/StudySetView';import {LanguageProvider} from '../../src/lib/LanguageContext';
Math.random=()=>0;
const storage=new IndexedDBAdapter();await storage.init();storage.setWorkspaceOwner('visibility-owner');
const repo=storage.getStudyRepository(),page=await storage.createPage({title:'Visibility',kind:'study_set'});
await repo.ensureDeck(page);await repo.addCards(page.id,[{front:'first',back:'第一'},{front:'second',back:'第二'},{front:'third',back:'第三'}]);await repo.configure(page.id,{direction_confirmed:true});await repo.saveDeckStyle(page.id,{auto_speech:false});
window.visibilityStorage=storage;window.dictionaryClient={auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getUser:async()=>({data:{user:{id:"visibility-owner"}},error:null})},rpc:async(name)=>({data:name==="get_study_clear_times"||name==="pull_study_changes"?[]:null,error:null})};
window.visibilityRepo=repo;window.visibilityDeck=page.id;
function App(){const[closed,setClosed]=React.useState(false);return <LanguageProvider initialLanguage="zh-TW">{closed?<p>Home</p>:<StudySetView page={page} repository={repo} initialMode="scheduled" backLabel="回首頁" onBackToInterface={()=>setClosed(true)} onTitleChange={()=>{}}/>}</LanguageProvider>;}
createRoot(document.getElementById('root')).render(<App/>);
