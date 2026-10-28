require('./loadStudy.cjs');require('fake-indexeddb/auto');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {openDB,deleteDB}=require('idb');
const {StudyRepository,STUDY_STORES}=require('../src/features/study/StudyRepository.ts');
const {emptyStudyState}=require('../src/features/study/studyFSRS.ts');
const {WorkspacePersistence,WORKSPACE_STORES}=require('../src/infrastructure/sync/workspacePersistence.ts');
const api=require('../src/features/study/officialPacks.ts');
const {OfficialPackCard}=require('../src/features/study/components/OfficialPackLibrary.tsx');
const {CardManageList}=require('../src/features/study/components/StudySetView.tsx');
const {LanguageProvider}=require('../src/lib/LanguageContext.tsx');
const owner='owner',pack='gsat-1-2';
const makeCard=(id,deck='deck')=>({id,deck_id:deck,owner_id:owner,front:'example',back:'示例',direction:'en-zh',sort_order:0,content_revision:1,created_at:1,updated_at:1,deleted_at:null,official_pack_id:pack,official_pack_version:1,dictionary_entry_id:`word-${id}`,official_level:1});
const settings=(id='deck')=>({id,owner_id:owner,new_limit:20,direction_confirmed:true,updated_at:1,schema:2,official_pack_id:pack,official_pack_version:1});
async function fixture(t){
  const name=crypto.randomUUID();const db=await openDB(name,1,{upgrade(db){for(const name of ['pages','attachments','binaries',...STUDY_STORES,...WORKSPACE_STORES]){const store=db.createObjectStore(name,{keyPath:'id'});if(['study_cards','study_states','study_events'].includes(name))store.createIndex('deck','deck_id');}}});
  t.after(async()=>{db.close();await deleteDB(name);});return {db,repo:new StudyRepository(db,()=>owner,'device'),local:new WorkspacePersistence(db)};
}
async function installLocal(repo,deck='deck'){
  const card=makeCard(`card-${deck}`,deck);await repo.mergeRemote({cards:[card],states:[emptyStudyState(card)],events:[],sessions:[],settings:[settings(deck)]});return card;
}
test('four official packs, exact levels, all requested download states and honest empty counts',()=>{
  assert.deepEqual(api.OFFICIAL_PACKS.map(p=>p.levels),['1–2','3–4','5–6','1–6']);
  for(const p of api.OFFICIAL_PACKS){
    const pack={...p,version:1,word_count:0,deck_id:null,installed_version:null};
    assert.equal(api.packAction(pack),'下載');assert.equal(api.packAction(pack,true),'下載中…');assert.equal(api.packAction(pack,false,true),'重試');
    assert.equal(api.packAction({...pack,deck_id:'deck',installed_version:1}),'開啟');assert.equal(api.packAction({...pack,version:2,deck_id:'deck',installed_version:1}),'更新');
    const html=renderToStaticMarkup(React.createElement(OfficialPackCard,{pack,busy:false,error:'',onDownload:()=>{}}));
    assert.ok(html.includes(p.name));assert.ok(html.includes('0 字'));assert.ok(html.includes('內容待匯入'));assert.ok(html.includes(`/study/official/${p.id}`));
  }
});
test('catalog/download/update/delete use scoped RPCs; failed download can retry safely with same pack',async()=>{
  const calls=[];let fail=true;
  const client={rpc:async(name,args)=>{calls.push({name,args});if(name==='download_official_study_pack'){if(fail){fail=false;return {error:{message:'connection lost'}};}return {data:'same-deck',error:null};}return {data:[],error:null};}};
  await api.listOfficialPacks(client);
  await assert.rejects(api.downloadOfficialPack(client,pack),/重試/);
  assert.equal(await api.downloadOfficialPack(client,pack),'same-deck');assert.equal(await api.downloadOfficialPack(client,pack),'same-deck');
  await api.deleteOfficialPack(client,'same-deck');
  assert.deepEqual(calls.at(-1),{name:'delete_official_study_pack',args:{deck_id:'same-deck'}});
  assert.deepEqual(calls[1].args,{pack_id:pack});
  assert.equal(api.packDeleteMessage('學測單字 1–2 級'),'刪除「學測單字 1–2 級」？\n\n這會移除此單字集與此單字集的學習進度。\n字典內容不會被刪除，你之後可以再次下載。');
});
test('official private text can be edited while source identity/import protection and daily learning remain unchanged',async t=>{
  const {repo}=await fixture(t),card=await installLocal(repo);
  await assert.rejects(repo.addCards('deck',[{front:'fake',back:'test'}]),/不可直接/);
  await repo.updateCard(card.id,{front:'changed',back:'私人義'});const edited=(await repo.readDeck('deck')).cards[0];assert.equal((await repo.readDeck('deck')).cards[0].front,'changed');await assert.rejects(repo.updateCard(card.id,{official_pack_id:'forged'}),/身份/);
  const session=await repo.startSession('deck','daily',1000);
  const {snapshot}=await repo.readSession(session.id);
  await repo.rateSession({sessionId:session.id,cardId:card.id,revision:session.revision,contentRevision:snapshot.cards[0].content_revision,expectedHead:snapshot.states[0].head,rating:4,actionId:'daily-easy',now:1100});
  const after=await repo.readDeck('deck',true);assert.equal(after.states[0].learned_at,1100);assert.equal(after.states[0].fsrs,null);
  assert.equal(after.events[0].kind,'introduce');assert.equal(after.events[0].source,'daily_learning');
  const review=await repo.startSession('deck','free',1200);
  await repo.rateSession({sessionId:review.id,cardId:card.id,revision:review.revision,contentRevision:edited.content_revision,expectedHead:after.states[0].head,rating:3,actionId:'review-good',now:1201});
  const reviewed=await repo.readDeck('deck',true);assert.ok(reviewed.states[0].fsrs);assert.equal(reviewed.events.filter(e=>e.kind==='review').length,1);
  assert.deepEqual(reviewed.cards[0],edited);
});
test('incremental remote install adds cards without changing existing progress or removing old entries',async t=>{
  const {repo,db}=await fixture(t),old=await installLocal(repo);
  const learned={...emptyStudyState(old),learned_at:123,fsrs:null};await db.put('study_states',learned);
  const added={...makeCard('added'),official_pack_version:2,official_level:2,sort_order:1};
  await repo.mergeRemote({cards:[added],states:[emptyStudyState(added)],events:[],settings:[{...settings(),official_pack_version:2,updated_at:2}]});
  const result=await repo.readDeck('deck');assert.equal(result.cards.length,2);assert.deepEqual(result.states.find(s=>s.id===old.id),learned);
  assert.equal(result.cards.find(c=>c.id==='added').official_level,2);assert.equal(result.cards.find(c=>c.id===old.id).official_pack_version,1);
});
test('confirmed deletion removes only that deck/card/session/history/outboxes; redownload starts new',async t=>{
  const {repo,db,local}=await fixture(t),old=await installLocal(repo);await installLocal(repo,'other-deck');
  await db.put('study_events',{id:'old-event',owner_id:owner,deck_id:'deck',card_id:old.id});
  await db.put('study_sessions',{id:'old-session',owner_id:owner,deck_id:'deck'});
  await db.put('study_outbox',{id:'pending-settings',owner_id:owner,kind:'settings',value:settings()});
  await db.put('study_outbox',{id:'pending-review',owner_id:owner,kind:'event',value:{id:'old-event',deck_id:'deck'}});
  await db.put('pages',{id:'deck',workspace_owner_id:owner,official_pack_id:pack});
  await local.merge(owner,[{entity_type:'pages',entity_id:'deck',revision:3,deleted_at:10,hard_deleted:true}]);
  await assert.rejects(repo.readDeck('deck'));assert.equal((await repo.pending()).length,0);
  assert.equal((await db.getAll('study_events')).length,0);assert.equal((await db.getAll('study_sessions')).length,0);
  assert.equal((await repo.readDeck('other-deck')).cards.length,1);
  // A remote response captured before deletion must not reinstall old progress.
  await repo.mergeRemote({cards:[old],states:[emptyStudyState(old)],events:[],settings:[settings()]});
  await assert.rejects(repo.readDeck('deck'));
  await installLocal(repo,'fresh-deck');const fresh=await repo.readDeck('fresh-deck');
  assert.notEqual(fresh.cards[0].id,old.id);assert.equal(fresh.states[0].head,null);assert.equal(fresh.states[0].fsrs,null);assert.equal(fresh.events.length,0);
});
test('official management list is read-only; all practice content remains visible',()=>{
  const html=renderToStaticMarkup(React.createElement(LanguageProvider,{initialLanguage:'zh-TW'},React.createElement(CardManageList,{studyItems:[makeCard('one')],readOnly:true,onAddCard:()=>{},onEditCard:()=>{},onDeleteCard:()=>{},onImportCsv:()=>{}})));
  assert.ok(html.includes('example'));assert.ok(html.includes('示例'));assert.ok(!html.includes('<button'));assert.ok(!html.includes('編輯單字'));
});
test('new official page does not migrate an empty local legacy deck over server contents',async t=>{
  const {repo}=await fixture(t);
  await assert.rejects(repo.ensureDeck({id:'deck',workspace_owner_id:owner,official_pack_id:pack,study_items:[]}),/同步官方/);
  assert.equal((await repo.pending()).length,0);
});
test('migration statically scopes installs/deletes and keeps manifests content-free, with no FSRS algorithm changes',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261009_official_study_packs.sql','utf8');
  const manifest=sql.slice(sql.indexOf('create table public.official_study_pack_entries'),sql.indexOf('create index official_pack_order'));
  assert.match(manifest,/level between 1 and 6/);assert.match(manifest,/dictionary_entry_id uuid/);assert.doesNotMatch(manifest,/front|back|headword|gloss/);
  assert.match(sql,/official_pack_one_download/);assert.match(sql,/official_card_identity/);assert.match(sql,/then continue; end if/);
  assert.match(sql,/e.kind='word' and e.status='published'/);assert.match(sql,/insert into public.study_card_dictionary_links/);
  assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/if deleted is not null then return/);
  assert.match(sql,/Official study set was deleted/);assert.match(sql,/Official cards are read-only/);
  assert.doesNotMatch(sql,/alter table public.dictionary_|delete from public.dictionary_|delete from public.official_study_packs|insert into public.official_study_pack_entries/);
  assert.doesNotMatch(sql,/create or replace function public.apply_study_operation/);
  assert.match(sql,/grant select on public.official_study_packs/);
});


test('official unlink/relink/delete preserve stable source, original ID, events and scheduling; metadata-only pull cannot undo offline edits',async t=>{
 const {repo,db}=await fixture(t),card=await installLocal(repo);const before=await repo.exportData();
 await repo.updateCard(card.id,{front:'private',back:'我的答案',dictionary_entry_id:undefined});
 const unlinked=(await repo.readDeck('deck')).cards[0];assert.equal(unlinked.dictionary_entry_id,undefined);assert.equal(unlinked.official_source_entry_id,card.dictionary_entry_id);
 await repo.updateCard(card.id,{dictionary_entry_id:'other-published'});let changed=(await repo.readDeck('deck')).cards[0];assert.equal(changed.official_source_entry_id,card.dictionary_entry_id);assert.equal(changed.id,card.id);
 assert.deepEqual((await repo.exportData()).states,before.states);assert.deepEqual((await repo.exportData()).events,before.events);
 await repo.updateCard(card.id,{deleted_at:100});await assert.rejects(repo.updateCard(card.id,{deleted_at:null}),/恢復/);await assert.rejects(repo.updateCard(card.id,{deleted_at:undefined}),/恢復/);
 assert.equal((await db.get('study_cards',card.id)).official_source_entry_id,card.dictionary_entry_id);
 const second=await installLocal(repo,'other');await repo.updateCard(second.id,{front:'offline custom'});const local=await db.get('study_cards',second.id);assert.equal(local.official_source_entry_id,undefined);
 await repo.mergeRemote({cards:[{...second,official_source_entry_id:second.dictionary_entry_id}],states:[],events:[],settings:[]});
 const merged=await db.get('study_cards',second.id);assert.equal(merged.front,'offline custom');assert.equal(merged.official_source_entry_id,second.dictionary_entry_id);
 const {officialPrivateCardsAvailable}=api;assert.equal(await officialPrivateCardsAvailable({rpc:async()=>({error:{code:'42883'}})}),false);assert.equal(await officialPrivateCardsAvailable({rpc:async()=>({data:{version:1}})}),true);
});
