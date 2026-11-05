require('./loadStudy.cjs');require('fake-indexeddb/auto');
const test=require('node:test'),assert=require('node:assert/strict');
const {resolveOfficialContent}=require('../src/features/study/officialContent.ts');const {fixture,grade}=require('./fixtures/studyStyleRepository.cjs');
const {withoutRetiredStudyItems}=require('../src/infrastructure/sync/workspacePersistence.ts');
test('published display is shared, bounded, cached offline, and cannot change private/custom/ambiguous cards or learning state',async()=>{
 const f=await fixture(1,'owner');const navigatorBefore=Object.getOwnPropertyDescriptor(global,'navigator');try{
  const raw=(await f.repo.readDeck('deck')).cards[0],linked={...raw,official_pack_id:'pack',official_source_entry_id:'word',dictionary_entry_id:'word',official_custom:false};await f.db.put('study_cards',linked);
  const before=await f.repo.exportData(),cards=[linked,{...linked,id:'private',official_pack_id:undefined},{...linked,id:'custom',official_custom:true},{...linked,id:'old',official_custom:undefined}];let calls=0;
  const client={rpc:async(name,args)=>{calls++;assert.equal(name,'get_published_study_content');assert.ok(args.entry_ids.length<=200);return {data:[{id:'word',kind:'word',status:'published',front:'updated',back:'正式'}]};}};
  const result=await resolveOfficialContent(cards,client);assert.equal(result[0].front,'updated');for(const card of result.slice(1))assert.equal(card.front,raw.front);assert.deepEqual(await f.repo.exportData(),before);
  Object.defineProperty(global,'navigator',{configurable:true,value:{onLine:false}});assert.equal((await resolveOfficialContent([linked],client))[0].back,'正式');assert.equal(calls,1);
  Object.defineProperty(global,'navigator',{configurable:true,value:{onLine:true}});assert.equal((await resolveOfficialContent([linked],{rpc:async()=>({data:[{id:'word',kind:'word',status:'draft',front:'LEAK',back:'draft'}]})}))[0].front,raw.front);
  const session=await f.repo.startSession('deck','scheduled'),presented=await f.repo.presentScheduled(session.id),state=presented.snapshot.states[0];await f.repo.rateSession({sessionId:session.id,cardId:linked.id,revision:presented.session.revision,contentRevision:linked.content_revision,expectedHead:state.head,rating:3,actionId:crypto.randomUUID(),now:Date.now(),displayContent:{front:'updated',back:'正式'}});
  const answered=await f.repo.exportData();assert.equal(answered.events.find(e=>e.kind==='review').question,'updated');assert.equal(answered.cards[0].content_revision,linked.content_revision);assert.equal(answered.cards[0].front,raw.front);
  await assert.rejects(f.repo.updateCard(linked.id,{front:'private edit'}),/customize/);const schedule=answered.states;await f.repo.updateCard(linked.id,{front:'updated',back:'正式',official_custom:true});assert.deepEqual((await f.repo.exportData()).states,schedule);
 }finally{if(navigatorBefore)Object.defineProperty(global,'navigator',navigatorBefore);else delete global.navigator;await f.close();}
});
test('Page-only legacy cards are discarded while modern deck data and pending operations survive ensureDeck',async()=>{
 const f=await fixture(2,'owner');try{const before=await f.repo.exportData(),pending=await f.repo.pending();await f.repo.ensureDeck({id:'deck',workspace_owner_id:'owner',study_items:[{id:'legacy',front:'discard',back:'舊'}]});assert.deepEqual(await f.repo.exportData(),before);assert.deepEqual(await f.repo.pending(),pending);
 await f.repo.ensureDeck({id:'new',workspace_owner_id:'owner',study_items:[{front:'discard'}]});assert.equal((await f.repo.readDeck('new')).cards.length,0);assert.equal((await f.repo.readDeck('new')).settings.direction_confirmed,true);
 assert.deepEqual(withoutRetiredStudyItems({id:'page',kind:'study_set',title:'kept',study_items:[1]}),{id:'page',kind:'study_set',title:'kept'});
 await assert.rejects(f.repo.ensureDeck({id:'other',workspace_owner_id:'foreign'}),/帳號/);
 }finally{await f.close();}
});

test('large official groups resolve through bounded batches and retain only the existing bounded public cache',async()=>{
 const {readPublicCacheBatch}=require('../src/features/dictionary/publicCache.ts');const count=6301,cards=Array.from({length:count},(_,n)=>({id:'card-'+n,deck_id:'deck',owner_id:'owner',front:'fallback',back:'原文',official_pack_id:'pack',official_source_entry_id:'word-'+n,dictionary_entry_id:'word-'+n,official_custom:false,content_revision:7}));let calls=0;
 const result=await resolveOfficialContent(cards,{rpc:async(name,args)=>{calls++;assert.ok(args.entry_ids.length<=200);return {data:args.entry_ids.map(id=>({id,kind:'word',status:'published',front:'current '+id,back:'正式'}))};}});
 assert.equal(calls,Math.ceil(count/200));assert.equal(result.length,count);assert.equal(result[6300].content_revision,7);assert.ok(result.every(c=>c.front.startsWith('current ')));assert.ok(cards.every(c=>c.front==='fallback'));
 assert.ok((await readPublicCacheBatch(cards.map(c=>'study-content:'+c.dictionary_entry_id))).size<=100);
});

test('metadata-only backfill preserves offline edits and adopts equal-version server preferences',async()=>{
 const f=await fixture(1,'owner');try{
 const raw=(await f.repo.readDeck('deck')).cards[0],old={...raw,official_pack_id:'pack',official_source_entry_id:'word',dictionary_entry_id:'word'};await f.db.put('study_cards',old);
 const remote={...old,official_custom:false},empty={cards:[remote],states:[],events:[],settings:[],sessions:[]};
 await f.repo.mergeRemote(empty);assert.deepEqual(await f.db.get('study_cards',old.id),remote);
 await f.db.put('study_cards',old);await f.repo.updateCard(old.id,{front:'offline private'});const edited=await f.db.get('study_cards',old.id),pending=await f.repo.pending();
 await f.repo.mergeRemote(empty);assert.deepEqual(await f.db.get('study_cards',old.id),edited);assert.deepEqual(await f.repo.pending(),pending);
 await f.repo.mergeRemote({...empty,cards:[{...edited,official_custom:true}]});assert.equal((await f.db.get('study_cards',old.id)).official_custom,true);
 }finally{await f.close();}
});
