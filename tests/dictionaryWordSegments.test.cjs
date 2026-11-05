require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {database,sql,id,draft,owner}=require('./fixtures/dictionaryExchangeDatabase.cjs');
const {applyDictionaryRetention}=require('./fixtures/dictionaryRetention.cjs');
const {mapDictionaryDraft,validateDictionaryDraft,draftsFromBundle}=require('../src/features/dictionary/draftPipeline.ts');
const {validateWordSegments,legacyWordSegments,wordSpelling}=require('../src/features/dictionary/wordSegments.ts');
const {DraftAutosaveQueue,draftRevisions}=require('../src/features/dictionary/draftAutosave.ts');
const migration='supabase/migrations/20261105065440_dictionary_word_segments.sql';
const segments=()=>['ab','ort','ion'].map((text,i)=>({id:id(100+i),text,hint:['分離','出生','名詞'][i],relation_id:null}));
test('segments concatenate without normalization, stable legacy singleton, optional canonical link and validation',()=>{
 assert.equal(wordSpelling(segments()),'abortion');assert.equal(validateWordSegments(segments(),'abortion','word',[]),null);
 assert.deepEqual(legacyWordSegments(id(1),'original'),[{id:id(1),text:'original',hint:'',relation_id:null}]);
 for(const [value,word,kind] of [[[],'','word'],[segments(),'other','word'],[segments(),'abortion','prefix'],[[{...segments()[0],extra:true}],'ab','word'],[[segments()[0],segments()[0]],'abab','word']])assert.ok(validateWordSegments(value,word,kind));
 const linked=segments();linked[0].relation_id=id(999);assert.equal(validateWordSegments(linked,'abortion','word',[]),'segments.missingLink');
 const d={...draft(10),headword:'abortion',word_segments:segments()};assert.deepEqual(draftsFromBundle(mapDictionaryDraft(d).bundle)[0].word_segments,segments());assert.deepEqual(validateDictionaryDraft([d]),[]);
});
test('autosave serializes whole snapshots; late acknowledgements do not replace newer text; IME, invalid, failure and retry',async()=>{
 let value={text:'first',revision:0},baseline={text:'',revision:0},release,active=0,max=0,calls=0;
 const states=[],q=new DraftAutosaveQueue({read:()=>value,dirty:()=>JSON.stringify(value)!==JSON.stringify(baseline),valid:v=>!!v.text.trim(),save:async sent=>{active++;max=Math.max(max,active);calls++;if(calls===1)await new Promise(r=>release=r);active--;return {...sent,revision:calls};},checkpoint:(_sent,ack)=>{value={...value,revision:ack.revision};baseline=ack;},status:s=>states.push(s)});
 const first=q.flush();await new Promise(r=>setImmediate(r));value={...value,text:'newer'};const second=q.flush();assert.equal(first,second);release();assert.equal(await first,true);assert.equal(max,1);assert.equal(calls,2);assert.equal(baseline.text,'newer');
 q.composing=true;value={...value,text:'組字'};assert.equal(await q.flush(),false);assert.equal(calls,2);q.composing=false;assert.equal(await q.flush(),true);
 value={...value,text:''};assert.equal(await q.flush(),false);assert.equal(calls,3);
 let fail=true;const failed=new DraftAutosaveQueue({read:()=>value,dirty:()=>true,valid:()=>true,save:async v=>{if(fail){fail=false;throw Error('offline');}return v;},checkpoint:()=>{},status:s=>states.push(s)});assert.equal(await failed.flush(),false);await failed.flush();assert.ok(states.includes('failed'));
 assert.deepEqual(draftRevisions({rows:[{id:'id',text:'new'}]},{rows:[{id:'id',text:'old',revision:4}]}),{rows:[{id:'id',text:'new',revision:4}]});
});
test('real isolated SQL: additive storage, draft/review/publish, old clients, link integrity, preview rollback, IDs and RLS',{timeout:60000},async()=>{
 const pg=await database();try{
  await applyDictionaryRetention(pg);await pg.exec('reset role');await pg.exec(fs.readFileSync(migration,'utf8'));await pg.exec('set role authenticated');
  const target=draft(20,'root');await sql(pg,'select apply_dictionary_drafts($1,false,true) v',[JSON.stringify([mapDictionaryDraft(target)])]);await sql(pg,'select publish_dictionary_entry($1,true) v',[id(20)]);
  const d={...draft(10),headword:'abortion',word_segments:segments()};d.word_segments[0].relation_id=id(30);d.relations=[{id:id(30),sense_id:null,target_entry_id:id(20),target_sense_id:id(21)}];
  await sql(pg,'select apply_dictionary_drafts($1,true,true) v',[JSON.stringify([mapDictionaryDraft(d)])]);assert.equal(await sql(pg,'select get_dictionary_entry($1) v',[id(10)]),null);
  await sql(pg,'select apply_dictionary_drafts($1,false,true) v',[JSON.stringify([mapDictionaryDraft(d)])]);let stored=await sql(pg,'select get_dictionary_entry($1) v',[id(10)]);assert.deepEqual(stored.entry.word_segments,d.word_segments);
  const missing=mapDictionaryDraft({...d,revision:stored.entry.revision,word_segments:d.word_segments.map(s=>({...s,relation_id:id(999)}))});
  await assert.rejects(()=>sql(pg,'select apply_dictionary_drafts($1,true,true) v',[JSON.stringify([missing])]),/segment relation/);
  assert.deepEqual((await sql(pg,'select get_dictionary_entry($1) v',[id(10)])).entry.word_segments,d.word_segments);
  // Deleting a referenced canonical relation alone must roll back, including via legacy SQL.
  await assert.rejects(()=>pg.query('delete from dictionary_relations where id=$1',[id(30)]),/permission denied/);
  await pg.exec('reset role');await assert.rejects(()=>pg.query('delete from dictionary_relations where id=$1',[id(30)]),/segment relation/);await pg.exec('set role authenticated');
  assert.equal(await sql(pg,'select count(*)::int v from dictionary_relations where id=$1',[id(30)]),1);

  const old={bundle:{dictionary_entries:[{id:id(10),kind:'word',headword:'abortion',revision:stored.entry.revision}],dictionary_senses:[]},examples:[],annotations:[]};
  await sql(pg,'select apply_dictionary_drafts($1,false,true) v',[JSON.stringify([old])]);assert.deepEqual((await sql(pg,'select get_dictionary_entry($1) v',[id(10)])).entry.word_segments,d.word_segments);
  old.bundle.dictionary_entries[0].headword='old-client-rename';old.bundle.dictionary_entries[0].revision=(await sql(pg,'select get_dictionary_entry($1) v',[id(10)])).entry.revision;
  await assert.rejects(()=>sql(pg,'select apply_dictionary_drafts($1,false,true) v',[JSON.stringify([old])]),/word_segments_valid/);
  await sql(pg,'select publish_dictionary_entry($1,true) v',[id(10)]);const base=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[id(10)]);
  const {toAI,parseAI,planAI}=require('../src/features/dictionary/aiDictionary.ts'),{draftFromExchange}=require('../src/features/dictionary/dictionaryExchange.ts');
  const targets=new Map([[id(20),await sql(pg,'select get_dictionary_ai_snapshot($1) v',[id(20)])]]);
  const ai=parseAI(JSON.stringify({format:'nexus-dictionary-ai',version:1,entries:[toAI(base,targets)]})).entries[0];
  assert.deepEqual(planAI(ai,base,targets).bundle.dictionary_entries[0].word_segments,d.word_segments);
  assert.deepEqual(draftFromExchange({snapshot:base,reviews:[],version:null}).word_segments,d.word_segments);
  const oldExchange=structuredClone(base);delete oldExchange.detail.entry.word_segments;assert.equal(draftFromExchange({snapshot:oldExchange,reviews:[],version:null}).word_segments,undefined);

  const candidate=mapDictionaryDraft({...d,word_segments:d.word_segments.map(s=>({...s,hint:s.hint+'改'}))});
  const review=await sql(pg,'select create_dictionary_edit_review($1,$2,$3) v',[id(10),JSON.stringify(base),JSON.stringify(candidate)]);
  assert.deepEqual((await sql(pg,'select get_published_dictionary_entry($1) v',[id(10)])).entry.word_segments,d.word_segments);
  await sql(pg,'select approve_dictionary_review($1,$2,true) v',[review.id,review.revision]);assert.equal((await sql(pg,'select get_published_dictionary_entry($1) v',[id(10)])).entry.word_segments[0].hint,'分離改');
  assert.equal(await sql(pg,'select count(*)::int v from dictionary_entries'),2);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(900001)]);await assert.rejects(()=>sql(pg,'select apply_dictionary_drafts($1,false,true) v',[JSON.stringify([candidate])]),/admin/);
  assert.equal((await sql(pg,'select get_published_dictionary_entry($1) v',[id(10)])).entry.id,id(10));
 }finally{await pg.close();}
});

test('adjacent edit retains list context across page boundaries and direct edits use stable same-kind keyset',async()=>{
 const {adminContext,adminListHref,adminNeighbours}=require('../src/features/dictionary/adminNavigation.ts');
 const context={kinds:['word'],statuses:['published'],work:['green'],query:'ab',page:1};
 assert.deepEqual(adminContext(adminListHref(context)),context);
 for(const invalid of ['/dictionary/admin?entry=x','/dictionary/admin?new=word','https://evil.test/dictionary/admin?q=x','/dictionary/admin?page=Infinity','/dictionary/admin?page=-1'])assert.equal(adminContext(invalid),null);
 const rows=Array.from({length:205},(_,i)=>({id:id(i+1),kind:'word',headword:'ab'+String(i).padStart(3,'0')})),calls=[];
 const client={rpc:async(name,args)=>{calls.push(args);return {data:{items:rows.slice(args.page_number*100,(args.page_number+1)*100),total:rows.length,stats:{red:0,yellow:0,green:205}}};}};
 let result=await adminNeighbours(client,rows[100],adminListHref(context));assert.match(result.previous,/entry=00000000-0000-4000-8000-000000000100/);assert.equal(adminContext(new URL(result.previous,'https://x.test').searchParams.get('from')).page,0);assert.equal(calls[0].query_text,'ab');assert.deepEqual(calls[0].kind_filters,['word']);assert.equal(calls[0].work_filter,'green');
 result=await adminNeighbours(client,rows[199],adminListHref(context));assert.equal(adminContext(new URL(result.next,'https://x.test').searchParams.get('from')).page,2);
 await assert.rejects(adminNeighbours(client,{...rows[100],id:id(999)},adminListHref(context)),/listChanged/);
 const queries=[];const direct={from:()=>{const chain={select:()=>chain,eq:(k,v)=>{queries.push([k,v]);return chain;},or:v=>{queries.push(v);return chain;},order:()=>chain,limit:async()=>({data:[]})};return chain;}};
 assert.deepEqual(await adminNeighbours(direct,rows[0],null),{previous:null,next:null});assert.deepEqual(queries.filter(Array.isArray),[['kind','word'],['kind','word']]);assert.ok(queries.some(q=>typeof q==='string'&&q.includes('headword.gt.')));
});

test('migration source drift fails atomically without cleanup or losing original RPC',async()=>{
 const pg=await database();try{await applyDictionaryRetention(pg);await pg.exec('reset role');
 const definition=await sql(pg,"select pg_get_functiondef('public.apply_dictionary_drafts(jsonb,boolean,boolean)'::regprocedure) v");
 await pg.exec(definition.replace("if preview then raise exception using errcode='ZX713',detail=total::text;end if;","if preview then raise exception using errcode='ZX713',detail=(total)::text;end if;"));
 await assert.rejects(pg.exec(fs.readFileSync(migration,'utf8')),/Unexpected draft preview/);await pg.exec('rollback');
 assert.equal(await sql(pg,"select count(*)::int v from information_schema.columns where table_name='dictionary_entries' and column_name='word_segments'"),0);
 assert.equal(await sql(pg,"select pg_get_functiondef('public.apply_dictionary_drafts(jsonb,boolean,boolean)'::regprocedure) v"),definition.replace("if preview then raise exception using errcode='ZX713',detail=total::text;end if;","if preview then raise exception using errcode='ZX713',detail=(total)::text;end if;"));
 }finally{await pg.close();}
});
