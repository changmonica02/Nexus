import React from 'react';
import {createRoot} from 'react-dom/client';
import {IndexedDBAdapter} from '../../src/infrastructure/storage/IndexedDBAdapter';
import {LanguageProvider} from '../../src/lib/LanguageContext';
import StudySetView from '../../src/features/study/components/StudySetView';
import {syncStudy} from '../../src/features/study/studySync';

const owner='11111111-1111-4111-8111-111111111111';
window.studyClearClient={auth:{getUser:async()=>({data:{user:{id:owner}},error:null})},rpc:async(name,args={})=>{
  const response=await fetch('/rpc',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,args})});return response.json();
}};
const storage=new IndexedDBAdapter();await storage.init();storage.setWorkspaceOwner(owner);
const page=await storage.createPage({kind:'study_set',title:'清除測試'});
await fetch('/register',{method:'POST',body:JSON.stringify({id:page.id})});
const repo=storage.getStudyRepository();await repo.ensureDeck(page);await repo.addCards(page.id,[{front:'one',back:'一'},{front:'two',back:'二'}]);await repo.configure(page.id,{direction_confirmed:true});
const at=Date.now()-120000,session=await repo.startSession(page.id,'scheduled',at),data=await repo.presentScheduled(session.id,at),card=data.snapshot.cards.find(c=>c.id===data.session.queue[0]),state=data.snapshot.states.find(s=>s.id===card.id);
await repo.rateSession({sessionId:session.id,cardId:card.id,revision:data.session.revision,contentRevision:card.content_revision,expectedHead:state.head,rating:3,actionId:crypto.randomUUID(),now:at});
await syncStudy(repo,window.studyClearClient,owner);
window.clearFixture={repo,page,storage,oldSession:session.id};
createRoot(document.getElementById('root')).render(<LanguageProvider initialLanguage={new URLSearchParams(location.search).get('lang')??'zh-TW'}><StudySetView page={page} repository={repo} managementOnly onTitleChange={()=>{}} onBackToInterface={()=>{}}/></LanguageProvider>);
