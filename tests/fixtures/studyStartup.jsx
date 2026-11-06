import React from 'react';import {createRoot} from 'react-dom/client';
import {IndexedDBAdapter} from '../../src/infrastructure/storage/IndexedDBAdapter';
import StudySetView from '../../src/features/study/components/StudySetView';import {LanguageProvider} from '../../src/lib/LanguageContext';
const params=new URLSearchParams(location.search),count=Number(params.get('count')??20),resumed=params.has('resume'),offline=params.has('offline');
Math.random=()=>0;
const owner='00000000-0000-4000-8000-000000000001',entry='00000000-0000-4000-8000-000000000010';
const metrics=window.metrics={reads:0,records:0,methods:{},calls:[],idbOpen:0,first:0};
const storage=new IndexedDBAdapter(),opened=performance.now();await storage.init();metrics.idbOpen=performance.now()-opened;storage.setWorkspaceOwner(owner);
const repo=storage.getStudyRepository(),page=await storage.createPage({title:'Startup benchmark',kind:'study_set'});
await repo.ensureDeck(page);await repo.addCards(page.id,Array.from({length:count},(_,i)=>({front:'word'+i,back:'字'+i,dictionary_entry_id:entry})));await repo.configure(page.id,{direction_confirmed:true});
await repo.saveDeckStyle(page.id,{auto_speech:false});
if(params.has('endless'))await repo.saveDeckStyle(page.id,{study_mode:'endless'});
let existing;if(resumed){existing=await repo.startSession(page.id,'scheduled');await repo.presentScheduled(existing.id);}
const seeded=await repo.pending(),seedTx=repo.db.transaction('study_outbox','readwrite');for(const op of seeded)await seedTx.store.delete(op.id);await seedTx.done;
if(params.has('pending')){const d=await repo.presentScheduled((existing??await repo.startSession(page.id,'scheduled')).id);const card=d.snapshot.cards.find(c=>c.id===d.session.queue[0]),state=d.snapshot.states.find(s=>s.id===card.id);await repo.rateSession({sessionId:d.session.id,cardId:card.id,revision:d.session.revision,contentRevision:card.content_revision,expectedHead:state.head,rating:3,actionId:crypto.randomUUID(),now:Date.now()});}
const remoteCard=(await repo.exportData()).cards[0];
if(params.has('official')){const cards=(await repo.exportData()).cards,tx=repo.db.transaction('study_cards','readwrite');for(const card of cards)await tx.store.put({...card,official_pack_id:'fixture',official_source_entry_id:entry,official_custom:false});await tx.done;}
const getAll=IDBIndex.prototype.getAll;IDBIndex.prototype.getAll=function(...args){const request=getAll.apply(this,args);if(['study_cards','study_states'].includes(this.objectStore.name)){metrics.reads++;request.addEventListener('success',()=>metrics.records+=request.result.length);}return request;};
for(const key of ['snapshotIn','reconciled','readScheduledDeck','startSession','openScheduledSession','readSession','presentScheduled','readPresentedSession']){const original=repo[key];if(!original)continue;repo[key]=async function(...args){const begin=performance.now();try{return await original.apply(this,args);}finally{const m=metrics.methods[key]??={calls:0,ms:0};m.calls++;m.ms+=performance.now()-begin;m.start=begin-metrics.begin;}};}
let sequence=0;
window.dictionaryClient={auth:{getUser:async()=>{const begin=performance.now();await new Promise(r=>setTimeout(r,params.has('cancel')?150:5));metrics.calls.push({name:'auth',ms:performance.now()-begin,start:begin-metrics.begin});return{data:{user:{id:owner}}};},onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async(name,args={})=>{
 const begin=performance.now();await new Promise(r=>setTimeout(r,5));metrics.calls.push({name,ms:performance.now()-begin,start:begin-metrics.begin});
 if(name==='get_study_clear_times')return{data:[]};
 if(name==='apply_study_operation')return{data:true};
 if(name==='pull_study_changes'){
  if(params.has('remote')&&sequence===0){sequence++;const card=remoteCard;return{data:[{sequence,owner_id:owner,entity:'study_cards',id:card.id,card_id:card.id,deleted:false,payload:{...card,front:'remote published-safe text',updated_at:card.updated_at+100}}]};}return{data:[]};
 }
 if(name==='get_published_study_content')return{data:[{id:entry,status:'published',kind:'word',front:'published word',back:'已發布答案'}]};
 return{data:null};
}};
if(offline)Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true});
window.startupRepo=repo;window.startupExisting=existing?.id;
function App(){const [open,setOpen]=React.useState(true);return <LanguageProvider initialLanguage="zh-TW"><button onClick={()=>setOpen(false)}>Close fixture</button>{open&&<StudySetView page={page} repository={repo} onTitleChange={()=>{}}/>}</LanguageProvider>;}
createRoot(document.getElementById('root')).render(<App/>);
window.measureStart=()=>{metrics.reads=0;metrics.records=0;metrics.methods={};metrics.calls=[];metrics.first=0;metrics.begin=performance.now();const watch=new MutationObserver(()=>{if(document.querySelector('[data-study-card]')){metrics.first=performance.now()-metrics.begin;watch.disconnect();}});watch.observe(document.getElementById('root'),{childList:true,subtree:true});};
