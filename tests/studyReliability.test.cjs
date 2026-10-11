require('./loadStudy.cjs');require('fake-indexeddb/auto');
const {openDB,deleteDB}=require('idb');
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),test=require('node:test'),assert=require('node:assert/strict');
const {StudyRepository,STUDY_STORES}=require('../src/features/study/StudyRepository.ts');
const {syncStudy}=require('../src/features/study/studySync.ts');
const {createStudyEvent,emptyStudyState}=require('../src/features/study/studyFSRS.ts');
const {chooseSchedule,reliableEvent}=require('../src/features/study/studyReliability.ts');
const owner='11111111-1111-4111-8111-111111111111',now=1800000000000;
let policy='latest';global.localStorage={getItem:()=>policy,setItem:(_k,v)=>policy=v};
test('existing-event migration backfill uses the real FK column; paginated pull, recorded candidate, relearn and retries retain history',async()=>{
 const pg=new PGlite();try{
  await pg.exec(`create schema auth;create role authenticated;create role anon;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;`);
  await pg.exec(fs.readFileSync('supabase/migrations/20260922_study_fsrs.sql','utf8'));
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  const column=(await pg.query("select data_type,is_nullable from information_schema.columns where table_schema='public' and table_name='study_review_events' and column_name='card_id'")).rows;
  assert.deepEqual(column,[{data_type:'text',is_nullable:'NO'}]);
  assert.ok((await pg.query("select pg_get_constraintdef(oid) definition from pg_constraint where conrelid='public.study_review_events'::regclass and contype='f'")).rows.some(r=>r.definition.includes('FOREIGN KEY (owner_id, card_id)')));
  const card={id:'existing-card',deck_id:'existing-deck',owner_id:owner,front:'word',back:'字',content_revision:1};
  let state=emptyStudyState(card);const events=[];
  for(let i=0;i<505;i++){const e=createStudyEvent(card,state,'review',now+i*86400000,'old-device','old-'+i,3);events.push(e);state=e.after;}
  const reset=createStudyEvent(card,state,'reset',now+506*86400000,'old-device','old-reset');events.push(reset);
  await pg.query('insert into study_cards values($1,$2,$3)',[owner,card.id,JSON.stringify(card)]);
  await pg.query('insert into study_card_states values($1,$2,$3)',[owner,card.id,JSON.stringify({...state,conflict:true})]);
  await pg.query("insert into study_review_events(owner_id,id,card_id,payload) select $1,value->>'id',value->>'card_id',value from jsonb_array_elements($2::jsonb)",[owner,JSON.stringify(events)]);
  await pg.exec(fs.readFileSync('supabase/migrations/20261016_study_reliability.sql','utf8'));
  const pull=async cursor=>(await pg.query('select pull_study_changes($1) result',[cursor])).rows[0].result;
  const first=await pull(0),second=await pull(first.at(-1).sequence);
  assert.equal(first.length,500);assert.equal(second.length,8);assert.deepEqual(await pull(second.at(-1).sequence),[]);
  const backfill=[...first,...second];assert.equal(new Set(backfill.map(r=>r.sequence)).size,508);
  assert.ok(backfill.every(r=>r.historical));assert.equal(backfill.filter(r=>r.entity==='study_review_events'&&r.card_id===card.id).length,506);
  const decision=async(id,choice,relearn=false)=>{
   const versions=(await pg.query("select max(sequence) filter(where entity='study_review_events') ev,max(sequence) filter(where entity='study_card_states') st from study_sync_changes where owner_id=$1 and card_id=$2",[owner,card.id])).rows[0];
   return {value:{id,owner_id:owner,card_id:card.id,event_version:Number(versions.ev),state_version:Number(versions.st),choice,relearn}};
  };
  const apply=async op=>(await pg.query('select apply_study_resolution($1) ok',[JSON.stringify(op)])).rows[0].ok;
  const candidate=await decision('select-recorded',events[0].after);
  assert.equal(await apply(candidate),true);assert.equal(await apply(candidate),true);
  let current=(await pg.query('select payload from study_card_states where id=$1',[card.id])).rows[0].payload;
  assert.deepEqual(current.fsrs,events[0].after.fsrs);assert.equal(current.head,events[0].id);
  // The new trigger and historical backfill use the same column.
  const live=createStudyEvent(card,current,'review',now+507*86400000,'new-device','live',2);
  const operation={kind:'event',value:live};
  for(let i=0;i<2;i++)await pg.query('select apply_study_operation($1)',[JSON.stringify(operation)]);
  assert.equal((await pg.query("select card_id from study_sync_changes where entity='study_review_events' and id='live'")).rows[0].card_id,card.id);
  await assert.rejects(()=>pg.query('select apply_study_operation($1)',[JSON.stringify({kind:'event',value:{...live,answer:'collision'}})]),/collision/);
  const relearn=await decision('relearn-existing',null,true);assert.equal(await apply(relearn),true);assert.equal(await apply(relearn),true);
  current=(await pg.query('select payload from study_card_states where id=$1',[card.id])).rows[0].payload;
  assert.equal(current.fsrs,null);assert.equal(current.generation,reset.after.generation+1);
  const stored=(await pg.query("select payload from study_review_events where id<>'live' order by id")).rows.map(r=>r.payload);
  assert.deepEqual(stored,events.toSorted((a,b)=>a.id.localeCompare(b.id)));
  assert.equal((await pg.query('select count(*)::int n from study_review_events')).rows[0].n,507);
  assert.equal((await pg.query('select count(*)::int n from study_state_decisions')).rows[0].n,2);
 }finally{await pg.close();}
});
async function fixture(){
 const pg=new PGlite(),dbs=[];
 await pg.exec(`create schema auth;create role authenticated;create role anon;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;`);
 for(const file of ['20260922_study_fsrs.sql','20261016_study_reliability.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 const stats={pulls:[],lose:null};
 const client={rpc:async(name,args)=>{
   try{
    const argument=name==='pull_study_changes'?args.after_sequence:JSON.stringify(args.operation);
    const data=(await pg.query(`select ${name}($1) as result`,[argument])).rows[0].result;
    if(name==='pull_study_changes')stats.pulls.push({cursor:argument,rows:data.length});
    if(stats.lose===name){stats.lose=null;return {error:{message:'response lost'}};}
    return {data,error:null};
   }catch(e){return {error:{message:e.message}};}
 }};
 const device=async label=>{const name=crypto.randomUUID(),db=await openDB(name,1,{upgrade(db){for(const name of STUDY_STORES){const s=db.createObjectStore(name,{keyPath:'id'});if(['study_cards','study_states','study_events'].includes(name))s.createIndex('deck','deck_id');if(name==='study_events')s.createIndex('deck_at',['deck_id','at']);}}});dbs.push([name,db]);return {db,repo:new StudyRepository(db,()=>owner,label)};};
 const a=await device('A');await a.repo.ensureDeck({id:'deck',workspace_owner_id:owner,study_items:[]});const [card]=await a.repo.addCards('deck',[{front:'word',back:'字'}]);
 const q=await a.repo.presentNext('deck',now);await syncStudy(a.repo,client,owner);
 const b=await device('B');await syncStudy(b.repo,client,owner);
 return {pg,client,stats,a,b,card,q,device,sync:d=>syncStudy(d.repo,client,owner),events:async()=>Number((await pg.query('select count(*) as n from study_review_events')).rows[0].n),close:async()=>{for(const [name,db] of dbs){db.close();await deleteDB(name);}await pg.close();policy='latest';}};
}
async function branch(f){
 const a=await f.a.repo.review(f.card.id,f.q.state.head,1,3,'A-review',now+1000);
 const b=await f.b.repo.review(f.card.id,f.q.state.head,1,1,'B-review',now-86400000); // Wrong clock, no ordering by at.
 await f.sync(f.a);await f.sync(f.b);return {a,b};
}
test('offline branches use server receipt fallback, preserve facts, and retry decisions after lost responses',async()=>{
 const f=await fixture();try{
  const a=await f.a.repo.review(f.card.id,f.q.state.head,1,3,'A-review',now+1000);
  const b=await f.b.repo.review(f.card.id,f.q.state.head,1,1,'B-review',now-86400000);
  await f.sync(f.a);f.stats.lose='apply_study_resolution';await assert.rejects(()=>f.sync(f.b),/response lost/);
  assert.equal((await f.b.repo.readDeck('deck')).states[0].conflict,true);
  await f.sync(f.b);const state=(await f.b.repo.readDeck('deck')).states[0];
  assert.equal(state.conflict,false);assert.deepEqual(state.fsrs,b.after.fsrs);assert.notDeepEqual(state.fsrs,a.after.fsrs);
  assert.equal(await f.events(),3);assert.equal((await f.pg.query('select count(*)::int n from study_state_decisions')).rows[0].n,1);
  const cursor=await f.b.repo.syncCursor();f.stats.pulls=[];await f.sync(f.b);
  assert.ok(f.stats.pulls.every(p=>p.cursor>=cursor&&p.rows===0));assert.equal(await f.events(),3);
 }finally{await f.close();}
});
test('ask persists ambiguity, device/cloud decisions and explicit relearn only change derived state',async()=>{
 policy='ask';const f=await fixture();try{
  const {a,b}=await branch(f);let state=(await f.b.repo.readDeck('deck')).states[0];
  assert.equal(state.conflict,true);assert.equal(state.ambiguity.device.head,b.id);assert.equal(state.ambiguity.cloud.head,a.id);
  const reopened=new StudyRepository(f.b.db,()=>owner,'B');assert.equal((await reopened.readDeck('deck')).states[0].ambiguity.candidates.length,2);
  await reopened.resolveSchedule(f.card.id,'cloud');await syncStudy(reopened,f.client,owner);
  state=(await reopened.readDeck('deck')).states[0];assert.equal(state.conflict,false);assert.deepEqual(state.fsrs,a.after.fsrs);assert.ok(state.resolution_id);assert.equal(await f.events(),3);
  await f.sync(f.a);assert.equal((await f.a.repo.readDeck('deck')).states[0].conflict,false);
  // A fresh explicit branch is ambiguous again; no automatic relearn.
  const stale=createStudyEvent(f.card,f.q.state,'review',now+5,'C','C-review',2);
  assert.equal((await f.client.rpc('apply_study_operation',{operation:{kind:'event',value:stale}})).error,null);
  await syncStudy(reopened,f.client,owner);state=(await reopened.readDeck('deck')).states[0];assert.equal(state.conflict,true);assert.notEqual(state.fsrs,null);
  await reopened.resolveSchedule(f.card.id,'relearn');await syncStudy(reopened,f.client,owner);
  state=(await reopened.readDeck('deck')).states[0];assert.equal(state.fsrs,null);assert.equal(state.learned_at,null);assert.equal(state.generation,1);assert.equal(await f.events(),4);
  await f.sync(f.a);assert.equal((await f.a.repo.readDeck('deck')).states[0].fsrs,null);
 }finally{await f.close();}
});
test('conservative selects a whole trusted state with earlier due; never mixes FSRS fields',async()=>{
 policy='conservative';const f=await fixture();try{
  const {a,b}=await branch(f),state=(await f.b.repo.readDeck('deck')).states[0];
  const expected=a.after.fsrs.due<b.after.fsrs.due?a.after:b.after;
  assert.deepEqual(state.fsrs,expected.fsrs);assert.equal(state.head,expected.head);assert.equal(state.conflict,false);
  assert.equal(chooseSchedule([{state:a.after,sequence:8,source:'device'},{state:b.after,sequence:9,source:'cloud'}],'ask'),null);
 }finally{await f.close();}
});
test('resolution CAS rejects stale choices, collisions and other owners without deleting facts',async()=>{
 policy='ask';const f=await fixture();try{
  await branch(f);await f.b.repo.resolveSchedule(f.card.id,'device');const op=(await f.b.repo.pending()).find(o=>o.kind==='resolution');
  const state=(await f.pg.query('select payload from study_card_states where id=$1',[f.card.id])).rows[0].payload;
  const next=createStudyEvent(f.card,{...state,conflict:false},'review',now+10000,'C','C-review',2);
  assert.equal((await f.client.rpc('apply_study_operation',{operation:{kind:'event',value:next}})).error,null);
  const result=await f.client.rpc('apply_study_resolution',{operation:op});assert.equal(result.data,false);
  assert.equal((await f.client.rpc('apply_study_resolution',{operation:op})).data,false);
  assert.match((await f.client.rpc('apply_study_resolution',{operation:{...op,value:{...op.value,relearn:true}}})).error.message,/collision/);
  assert.equal(await f.events(),4);
  await f.pg.exec('set role authenticated');await f.pg.query("select set_config('request.jwt.claim.sub',$1,false)",['22222222-2222-4222-8222-222222222222']);
  assert.deepEqual((await f.client.rpc('pull_study_changes',{after_sequence:0})).data,[]);
  assert.ok((await f.client.rpc('apply_study_resolution',{operation:op})).error);
  await assert.rejects(()=>f.pg.exec('delete from study_state_decisions'),/permission denied/);
 }finally{await f.close();}
});
test('parent chain wins over device clocks; normal reads and one-card reviews never load event collections',async()=>{
 const f=await fixture();try{
  const e=await f.a.repo.review(f.card.id,f.q.state.head,1,3,'one',now+1000);await f.sync(f.a);await f.sync(f.b);
  const second=await f.b.repo.review(f.card.id,e.id,1,2,'two',now+500);await f.sync(f.b);await f.sync(f.a);
  assert.equal((await f.a.repo.readDeck('deck')).states[0].head,second.id);assert.equal((await f.a.repo.readDeck('deck')).states[0].conflict,false);
  assert.equal(reliableEvent(second),true);
  // Instrument the native API: any full event getAll in the normal paths fails this test.
  const original=IDBObjectStore.prototype.getAll,originalIndex=IDBIndex.prototype.getAll;
  IDBObjectStore.prototype.getAll=function(...args){assert.notEqual(this.name,'study_events');return original.apply(this,args);};
  IDBIndex.prototype.getAll=function(...args){assert.notEqual(this.objectStore.name,'study_events');return originalIndex.apply(this,args);};
  try{
    assert.equal((await f.a.repo.readDeck('deck')).events.length,0);
    await f.a.repo.ensureDeck({id:'deck',workspace_owner_id:owner,study_items:[]});
    await f.a.repo.review(f.card.id,second.id,1,3,'three',now+2000);
    await f.sync(f.a);
  }finally{IDBObjectStore.prototype.getAll=original;IDBIndex.prototype.getAll=originalIndex;}
 }finally{await f.close();}
});
test('stable create request survives repository reload; separate requests may link the same dictionary entry',async()=>{
 const f=await fixture();try{
  const pairs=[{front:'word',back:'義',dictionary_entry_id:'same-entry'}];
  const a=await f.a.repo.addCards('deck',pairs,'create-intent');
  const reopened=new StudyRepository(f.a.db,()=>owner,'A');const b=await reopened.addCards('deck',pairs,'create-intent');assert.equal(a[0].id,b[0].id);
  await assert.rejects(()=>reopened.addCards('deck',[{front:'different',back:'義'}],'create-intent'),/不一致/);
  const c=await reopened.addCards('deck',pairs,'another-intent');assert.notEqual(a[0].id,c[0].id);
  await f.sync(f.a);await f.sync(f.a);assert.equal((await f.pg.query('select count(*)::int n from study_cards')).rows[0].n,3);
 }finally{await f.close();}
});
test('large unrelated history bootstraps by pages; later sync touches only changed card and commits cursor atomically',async()=>{
 const f=await fixture();try{
  const [bulk]=await f.a.repo.addCards('deck',[{front:'bulk',back:'歷史'}]);await f.sync(f.a);
  let state=emptyStudyState(bulk);const events=[];
  for(let i=0;i<620;i++){const e=createStudyEvent(bulk,state,'review',now+i*86400000,'history','bulk-'+i,3);events.push(e);state=e.after;}
  await f.pg.query(`insert into study_review_events(owner_id,id,card_id,payload) select $1,value->>'id',value->>'card_id',value from jsonb_array_elements($2::jsonb)`,[owner,JSON.stringify(events)]);
  await f.pg.query('update study_card_states set payload=$1 where owner_id=$2 and id=$3',[JSON.stringify(state),owner,bulk.id]);
  f.stats.pulls=[];await f.sync(f.b);assert.ok(f.stats.pulls.some(p=>p.rows===500));assert.equal((await f.b.repo.readDeck('deck',true)).events.length,621);
  await f.sync(f.a);await f.a.repo.review(f.card.id,f.q.state.head,1,3,'affected-only',now+1000);await f.sync(f.a);
  const original=IDBObjectStore.prototype.get,accessed=[];
  IDBObjectStore.prototype.get=function(key){if(this.name==='study_events')accessed.push(key);return original.call(this,key);};
  f.stats.pulls=[];try{await f.sync(f.b);}finally{IDBObjectStore.prototype.get=original;}
  assert.ok(f.stats.pulls.reduce((n,p)=>n+p.rows,0)<=2);assert.ok(!accessed.some(id=>String(id).startsWith('bulk-')));
  const cursor=await f.b.repo.syncCursor(),fact=(await f.b.repo.readDeck('deck',true)).events[0];
  await assert.rejects(()=>f.b.repo.mergeRemote({cards:[],states:[],settings:[],events:[{...fact,answer:'collision'}]},[{owner_id:owner,entity:'study_review_events',id:fact.id,card_id:fact.card_id,sequence:cursor+10,deleted:false,payload:fact}]),/不同內容/);
  assert.equal(await f.b.repo.syncCursor(),cursor);assert.equal((await f.b.repo.readHistory('deck',5)).length,5);
 }finally{await f.close();}
});
test('derived state is rebuilt from its event when damaged; receipt failure rolls back decision and cursor feed',async()=>{
 const f=await fixture();try{
  const e=await f.a.repo.review(f.card.id,f.q.state.head,1,3,'real',now+100);await f.sync(f.a);
  await f.pg.query("update study_card_states set payload=jsonb_set(payload,'{fsrs,due}','1') where id=$1",[f.card.id]);
  await f.sync(f.b);assert.equal((await f.b.repo.readDeck('deck')).states[0].fsrs.due,e.after.fsrs.due);
  policy='ask';const branch=createStudyEvent(f.card,f.q.state,'review',now+1,'C','branch',1);
  await f.client.rpc('apply_study_operation',{operation:{kind:'event',value:branch}});await f.sync(f.b);await f.b.repo.resolveSchedule(f.card.id,'cloud');
  const operation=(await f.b.repo.pending()).find(o=>o.kind==='resolution');
  const before=(await f.pg.query('select payload from study_card_states where id=$1',[f.card.id])).rows[0].payload;
  const cursor=(await f.pg.query('select max(sequence)::text n from study_sync_changes')).rows[0].n;
  await f.pg.exec(`create function reject_decision() returns trigger language plpgsql as $$begin raise exception 'receipt failure';end$$;create trigger reject_decision before insert on study_state_decisions for each row execute function reject_decision();`);
  assert.match((await f.client.rpc('apply_study_resolution',{operation})).error.message,/receipt failure/);
  assert.deepEqual((await f.pg.query('select payload from study_card_states where id=$1',[f.card.id])).rows[0].payload,before);
  assert.equal((await f.pg.query('select max(sequence)::text n from study_sync_changes')).rows[0].n,cursor);
  await f.pg.exec('drop trigger reject_decision on study_state_decisions');await f.sync(f.b);assert.equal(await f.events(),3);
 }finally{await f.close();}
});
test('v7 upgrades add only sync metadata and bounded history indexes, retaining previous events',async()=>{
 await deleteDB('nexus');const old=await openDB('nexus',7,{upgrade(db){for(const name of STUDY_STORES.filter(s=>s!=='study_sync_meta')){const store=db.createObjectStore(name,{keyPath:'id'});if(['study_cards','study_states','study_events'].includes(name))store.createIndex('deck','deck_id');}}});
 const original={id:'old-fact',deck_id:'deck',at:1,local_day:'2026-01-01',rating:3};await old.put('study_events',original);old.close();
 const {IndexedDBAdapter}=require('../src/infrastructure/storage/IndexedDBAdapter.ts'),adapter=new IndexedDBAdapter();let db;
 try{await adapter.init();db=await openDB('nexus');assert.equal(db.version,8);assert.ok(db.objectStoreNames.contains('study_sync_meta'));assert.deepEqual(await db.get('study_events','old-fact'),original);assert.ok(db.transaction('study_events').store.indexNames.contains('deck_at'));assert.ok(db.transaction('study_events').store.indexNames.contains('deck_day'));}
 finally{db?.close();await adapter.close();await deleteDB('nexus');}
});
test('single-card UI offers four choices; automatic repairs show pending sync instead of a false conflict',()=>{
 const ts=require('typescript');require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const Conflict=require('../src/features/study/components/ScheduleConflict.tsx').default;
 const card={id:'one',owner_id:owner,deck_id:'deck'},state=emptyStudyState(card);
 const ambiguity={device:state,cloud:state,candidates:[state],event_version:1,state_version:2};
 const render=pending=>renderToStaticMarkup(React.createElement(Conflict,{repository:{},label:'word',state:{...state,conflict:true,ambiguity:{...ambiguity,pending}}}));
 for(const label of ['採用此裝置','採用雲端','重新學習','稍後處理'])assert.ok(render(false).includes(label));
 assert.ok(render(true).includes('等待同步確認'));assert.ok(!render(true).includes('無法可靠判定'));
});
