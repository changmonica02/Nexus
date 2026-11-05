require('./loadStudy.cjs');require('fake-indexeddb/auto');
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,grade}=require('./fixtures/studyStyleRepository.cjs');
const {studyComposition}=require('../src/features/dictionary/studyComposition.ts');
const {defaultStudyStyle,validateStudyStyle}=require('../src/features/study/studyStyles.ts');
const {readPublishedEntry}=require('../src/features/dictionary/reader.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const detail=()=>({entry:{id:id(1),status:'published',kind:'word',headword:'preview'},senses:[{id:id(2)}],relations:[{sense_id:id(2),target_entry_id:id(3),target_sense_id:id(4)},{sense_id:null,target_entry_id:id(5),target_sense_id:id(6)}],related:[{id:id(3),sense_id:id(4),headword:'pre-',gloss_zh_tw:'預先'},{id:id(5),sense_id:id(6),headword:'view',gloss_zh_tw:'觀看'}],learning_notes:[{kind:'core_concept',sense_id:null,body:'預先觀看。第二句不必顯示。'}]});
test('composition uses explicit display segments, optional links, legacy singleton and stored concept',()=>{
 const d=detail();d.entry.word_segments=[{id:id(100),text:'pre',hint:'預先',relation_id:null},{id:id(101),text:'view',hint:'觀看',relation_id:null}];
 assert.deepEqual(studyComposition(d,'preview','預覽'),{parts:[{name:'pre',meaning:'預先'},{name:'view',meaning:'觀看'}],concept:'預先觀看。'});
 assert.deepEqual(studyComposition({...d,relations:[],related:[]},'preview','預覽').parts,studyComposition(d,'preview','預覽').parts);
 for(const bad of [null,{...d,entry:{...d.entry,status:'draft'}},{...d,entry:{...d.entry,word_segments:[]}}])assert.equal(studyComposition(bad,'preview','預覽'),null);
 assert.equal(studyComposition(d,'private edited prompt','預覽'),null);
 assert.equal(studyComposition(d,'preview','預先觀看。').concept,null);
 delete d.entry.word_segments;assert.deepEqual(studyComposition(d,'preview','預覽').parts,[{name:'preview',meaning:''}]);
});
test('per-deck speech settings persist offline without touching frozen sessions, progress, FSRS or another account/deck',async()=>{
 const f=await fixture(2,'owner-a');try{
  const legacy={...defaultStudyStyle(f.owner),id:'study-style:legacy-reading'};delete legacy.auto_speech;delete legacy.speech_rate;validateStudyStyle(legacy);await f.repo.saveStyle(legacy);await f.repo.assignStyle('deck',legacy.id);
  await f.repo.ensureDeck({id:'other',workspace_owner_id:f.owner,study_items:[]});const other=await f.repo.styleForDeck('other');
  const now=Date.now(),session=await f.repo.startSession('deck','scheduled',now);await grade(f.repo,session.id,3,now);
  const before=await f.repo.exportData();await f.repo.saveDeckStyle('deck',{auto_speech:false,speech_rate:1.2});
  assert.equal((await f.repo.styleForDeck('deck')).style.auto_speech,false);assert.equal((await f.repo.styleForDeck('deck')).style.speech_rate,1.2);
  const {StudyRepository}=require('../src/features/study/StudyRepository.ts');const reloaded=new StudyRepository(f.db,()=>f.owner,'reload');assert.equal((await reloaded.styleForDeck('deck')).style.speech_rate,1.2);
  const after=await f.repo.exportData();for(const key of ['cards','states','events','sessions'])assert.deepEqual(after[key],before[key],key);
  assert.deepEqual(await f.repo.styleForDeck('other'),other);assert.ok((await f.repo.pending()).length);
  for(const speech_rate of [0,NaN,3])await assert.rejects(f.repo.saveDeckStyle('deck',{speech_rate}));
  const foreign=new StudyRepository(f.db,()=> 'owner-b','foreign');await assert.rejects(foreign.saveDeckStyle('deck',{auto_speech:true}),/帳號/);
 }finally{await f.close();}
});
test('concurrent public detail reads share a request; next online read still checks publication',async()=>{
 let calls=0,release;const client={rpc:async()=>{calls++;await new Promise(resolve=>release=resolve);return {data:detail(),error:null};}};
 const first=readPublishedEntry(client,id(1)),second=readPublishedEntry(client,id(1));await new Promise(r=>setImmediate(r));assert.equal(calls,1);release();assert.deepEqual(await first,await second);
 client.rpc=async()=>{calls++;return {data:null,error:null};};assert.equal(await readPublishedEntry(client,id(1)),null);assert.equal(calls,2);
 client.rpc=async()=>({data:null,error:{message:'unavailable'}});await assert.rejects(readPublishedEntry(client,id(1)));
});

test('post-commit revalidation waits for an older in-flight detail before caching current published content',async()=>{
 let calls=0,release;
 const old=detail(),updated={...detail(),entry:{...detail().entry,headword:'updated published word'}};
 const client={rpc:async()=>{calls++;if(calls===1){await new Promise(resolve=>release=resolve);return{data:old,error:null};}return{data:updated,error:null};}};
 const before=readPublishedEntry(client,id(1)),after=readPublishedEntry(client,id(1),true);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);release();
 assert.deepEqual(await before,old);assert.deepEqual(await after,updated);assert.equal(calls,2);
 const {readPublicCache}=require('../src/features/dictionary/publicCache.ts');assert.deepEqual(await readPublicCache('entry:'+id(1)),updated);
});
