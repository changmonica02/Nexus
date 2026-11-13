require('./loadStudy.cjs');require('fake-indexeddb/auto');
const test=require('node:test'),assert=require('node:assert/strict');
const {database,migrate,sql,id,draft,owner}=require('./fixtures/retirementDatabase.cjs');
const {mapDictionaryDraft}=require('../src/features/dictionary/draftPipeline.ts');
test('IPA physical retirement preserves old Review approval, stable identity and unknown-field validation',async()=>{
 const pg=await database();try{
  const d=draft(10);d.pronunciations=[{id:id(20),sense_id:null,ipa:'/a/',sort_order:0}];const legacy=mapDictionaryDraft(d);legacy.pronunciations[0].locale='en';legacy.pronunciations[0].note='legacy note';await sql(pg,'select apply_dictionary_drafts($1,false,true) v',[JSON.stringify([legacy])]);await sql(pg,'select publish_dictionary_entry($1,true) v',[id(10)]);
  const base=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[id(10)]),candidate=mapDictionaryDraft({...d,senses:d.senses.map(s=>({...s,gloss_zh_tw:'changed'}))});candidate.pronunciations[0].locale='old';candidate.pronunciations[0].note='retired';
  const review=await sql(pg,'select create_dictionary_edit_review($1,$2,$3) v',[id(10),JSON.stringify(base),JSON.stringify(candidate)]);
  await migrate(pg,'ipa');
  assert.equal(await sql(pg,"select count(*)::int v from information_schema.columns where table_name='dictionary_pronunciations' and column_name in('locale','note')"),0);
  await pg.exec('reset role');const record=await sql(pg,'select dictionary_exchange_record($1) v',[id(10)]);assert.equal('locale' in record.reviews[0].base_snapshot.detail.pronunciations[0],false);assert.equal('note' in record.reviews[0].candidate.pronunciations[0],false);await pg.exec('set role authenticated');
  await assert.rejects(sql(pg,'select approve_dictionary_review($1,$2,true) v',[review.id,review.revision+1]),/revision|conflict/i);
  await pg.exec("begin;reset role;update dictionary_pronunciations set ipa='/changed/' where id='"+id(20)+"';set role authenticated");
  await assert.rejects(sql(pg,'select approve_dictionary_review($1,$2,true) v',[review.id,review.revision]),/snapshot|stale|changed/i);await pg.exec('rollback;set role authenticated');
  await sql(pg,'select approve_dictionary_review($1,$2,true) v',[review.id,review.revision]);
  const published=await sql(pg,'select get_published_dictionary_entry($1) v',[id(10)]);assert.equal(published.pronunciations[0].id,id(20));assert.equal(published.pronunciations[0].ipa,'/a/');assert.equal('locale' in published.pronunciations[0],false);assert.equal('note' in published.pronunciations[0],false);
  const imported=mapDictionaryDraft(draft(30));imported.pronunciations=[{id:id(31),entry_id:id(30),sense_id:null,ipa:'/b/',sort_order:0,locale:'legacy',note:'ignored'}];
  await sql(pg,'select apply_dictionary_drafts($1,false,true) v',[JSON.stringify([imported])]);const saved=await sql(pg,'select get_dictionary_entry($1) v',[id(30)]);assert.equal(saved.pronunciations[0].ipa,'/b/');assert.equal('locale' in saved.pronunciations[0],false);
  const invalid=mapDictionaryDraft(draft(40));invalid.pronunciations=[{id:id(41),entry_id:id(40),sense_id:null,ipa:'/c/',sort_order:0,unknown:true}];await assert.rejects(sql(pg,'select apply_dictionary_drafts($1,false,true) v',[JSON.stringify([invalid])]),/Unknown|unknown|unsupported|invalid/i);
 }finally{await pg.close();}
});
test('official linked downloads and page retirement preserve new study rows, source IDs and workspace writes',async()=>{
 const pg=await database();try{
  const d=draft(10);await sql(pg,'select apply_dictionary_drafts($1,false,true) v',[JSON.stringify([mapDictionaryDraft(d)])]);await sql(pg,'select publish_dictionary_entry($1,true) v',[id(10)]);
  await pg.exec('reset role');await pg.query("insert into official_study_pack_entries values('gsat-1-2',$1,1,0)",[id(10)]);await pg.exec('set role authenticated');
  const oldDeck=await sql(pg,"select download_official_study_pack('gsat-1-2') v");const before=await sql(pg,'select payload v from study_cards limit 1');
  await pg.exec('reset role');await pg.query("insert into official_study_pack_entries values('gsat-3-4',$1,3,0),('gsat-5-6',$1,5,0)",[id(10)]);await pg.exec('set role authenticated');
  const editedDeck=await sql(pg,"select download_official_study_pack('gsat-3-4') v");const edited=await sql(pg,"select payload v from study_cards where payload->>'deck_id'=$1",[editedDeck]);await sql(pg,'select apply_study_operation($1) v',[JSON.stringify({kind:'card',value:{...edited,front:'private content',content_revision:2,updated_at:edited.updated_at+1}})]);
  const statesBefore=await sql(pg,'select jsonb_agg(payload order by id) v from study_card_states');

  await migrate(pg,'official');const linked=await sql(pg,'select payload v from study_cards where id=$1',[before.id]);assert.equal(linked.official_custom,false);assert.equal(linked.content_revision,before.content_revision);assert.equal(linked.updated_at,before.updated_at);assert.equal(linked.id,before.id);
  assert.equal((await sql(pg,'select get_published_study_content($1::uuid[]) v',[[id(10)]])).length,1);
  await pg.exec('begin');await sql(pg,'select apply_study_operation($1) v',[JSON.stringify({kind:'card',value:{...before,front:'offline private',content_revision:2,updated_at:before.updated_at+1}})]);const late=await sql(pg,'select payload v from study_cards where id=$1',[before.id]);assert.equal(late.front,'offline private');assert.equal(late.official_custom,true);await pg.exec('rollback');
  assert.equal(await sql(pg,"select has_function_privilege('anon','get_published_study_content(uuid[])','execute') v"),false);
  await assert.rejects(sql(pg,'select get_published_study_content($1::uuid[]) v',[Array(201).fill(id(10))]),/At most 200/);
  assert.equal((await sql(pg,"select payload v from study_cards where payload->>'deck_id'=$1",[editedDeck])).official_custom,undefined);
  const base=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[id(10)]),candidate=mapDictionaryDraft({...d,headword:'published-new',senses:d.senses.map(row=>({...row,gloss_zh_tw:'新中文'}))});const review=await sql(pg,'select create_dictionary_edit_review($1,$2,$3) v',[id(10),JSON.stringify(base),JSON.stringify(candidate)]);
  assert.equal((await sql(pg,'select get_published_study_content($1::uuid[]) v',[[id(10)]]))[0].front,d.headword);
  await sql(pg,'select approve_dictionary_review($1,$2,true) v',[review.id,review.revision]);assert.equal((await sql(pg,'select get_published_study_content($1::uuid[]) v',[[id(10)]]))[0].front,'published-new');
  assert.deepEqual(await sql(pg,'select jsonb_agg(payload order by id) v from study_card_states'),statesBefore);
  const current=await sql(pg,'select payload v from study_cards where id=$1',[before.id]);await sql(pg,'select apply_study_operation($1) v',[JSON.stringify({kind:'card',value:{...current,dictionary_entry_id:null,content_revision:current.content_revision+1,updated_at:current.updated_at+1}})]);const unlinked=await sql(pg,'select payload v from study_cards where id=$1',[before.id]);assert.equal(unlinked.front,'published-new');assert.equal(unlinked.official_custom,true);assert.equal(unlinked.official_source_entry_id,id(10));

  await migrate(pg,'page');const freshDeck=await sql(pg,"select download_official_study_pack('gsat-5-6') v");assert.equal((await sql(pg,"select payload v from study_cards where payload->>'deck_id'=$1",[freshDeck])).official_custom,false);assert.equal(await sql(pg,"select count(*)::int v from information_schema.columns where table_name='pages' and column_name='study_items'"),0);
  assert.equal(await sql(pg,"select download_official_study_pack('gsat-1-2') v"),oldDeck);assert.equal(await sql(pg,'select count(*)::int v from study_cards'),3);assert.equal(await sql(pg,'select count(*)::int v from study_card_states'),3);
  const op={id:id(100),entity_type:'pages',entity_id:'new-deck',kind:'save',expected_revision:0,value:{id:'new-deck',title:'new',kind:'study_set',device_id:'test',content_json:{},study_items:[{front:'discard'}]}};await sql(pg,'select apply_workspace_operations($1) v',[JSON.stringify([op])]);assert.equal(await sql(pg,"select kind v from pages where id='new-deck'"),'study_set');
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(900001)]);assert.equal(await sql(pg,'select count(*)::int v from study_cards'),0);
 }finally{await pg.close();}
});

test('independent migration failure rolls back columns, helpers and data; known old JSON metadata is ignored but unknown fields reject',async()=>{
 const pg=await database();try{
  await pg.exec('reset role');const normalizer=await sql(pg,"select pg_get_functiondef('dictionary_normalize_snapshot(jsonb)'::regprocedure) v");const reader=await sql(pg,"select pg_get_functiondef('get_published_dictionary_entry(uuid)'::regprocedure) v");await pg.exec(reader.replace('sense_id,locale,ipa,note,sort_order','sense_id,locale,ipa, note,sort_order'));
  await assert.rejects(migrate(pg,'ipa'),/Unexpected published pronunciation/);await pg.exec('rollback');assert.equal(await sql(pg,"select count(*)::int v from information_schema.columns where table_name='dictionary_pronunciations' and column_name in('locale','note')"),2);assert.equal(await sql(pg,"select pg_get_functiondef('dictionary_normalize_snapshot(jsonb)'::regprocedure) v"),normalizer);assert.equal(await sql(pg,"select count(*)::int v from pg_proc where proname='dictionary_clean_ipa_rows'"),0);
  await pg.exec(reader);await migrate(pg,'ipa');
  const {parseJSONBundle}=require('../src/features/dictionary/adminImport.ts'),{parseAI}=require('../src/features/dictionary/aiDictionary.ts');const bundle={dictionary_pronunciations:[{id:id(20),entry_id:id(10),ipa:'/a/',locale:{discard:true},note:42}]};const parsed=parseJSONBundle(JSON.stringify(bundle));assert.equal('locale' in parsed.dictionary_pronunciations[0],false);assert.equal('note' in parsed.dictionary_pronunciations[0],false);assert.throws(()=>parseJSONBundle(JSON.stringify({dictionary_pronunciations:[{...bundle.dictionary_pronunciations[0],unknown:true}]})),/不允許欄位/);
  const ai={format:'nexus-dictionary-ai',version:1,entries:[{type:'word',headword:'a',pronunciations:[{ipa:'/a/',locale:42,note:{discard:true}}]}]};assert.equal('locale' in parseAI(JSON.stringify(ai)).entries[0].pronunciations[0],false);ai.entries[0].pronunciations[0].unknown=true;assert.throws(()=>parseAI(JSON.stringify(ai)),/不允許欄位/);
 }finally{await pg.close();}
});

test('Page retirement preserves real synchronized reviews/due/settings and rollback does not undo independent IPA retirement',async()=>{
 const pg=await database(),{fixture,grade}=require('./fixtures/studyStyleRepository.cjs'),f=await fixture(1,owner);try{
  const op={id:id(200),entity_type:'pages',entity_id:'deck',kind:'save',expected_revision:0,value:{id:'deck',kind:'study_set',device_id:'test',title:'Kept title',content_json:{},study_items:[{front:'discard old Page-only'}]}};await sql(pg,'select apply_workspace_operations($1) v',[JSON.stringify([op])]);
  const session=await f.repo.startSession('deck','scheduled');await grade(f.repo,session.id,3,Date.now());
  const {orderStudyOperations}=require('../src/features/study/studySync.ts');for(const operation of orderStudyOperations(await f.repo.pending()))await sql(pg,'select apply_study_operation($1) v',[JSON.stringify(operation)]);
  const snapshot=async()=>{const result={};for(const table of ['study_cards','study_card_states','study_review_events','study_deck_settings'])result[table]=(await pg.query('select * from '+table+' order by id')).rows;return result;};const before=await snapshot();assert.ok(before.study_review_events.length>=2);
  await migrate(pg,'official');await migrate(pg,'ipa');
  await pg.exec('reset role');const original=await sql(pg,"select pg_get_functiondef('apply_workspace_operations(jsonb)'::regprocedure) v");await pg.exec(original.replace("'study_items',",''));await assert.rejects(migrate(pg,'page'),/Unexpected workspace schema/);await pg.exec('rollback');assert.equal(await sql(pg,"select count(*)::int v from information_schema.columns where table_name='pages' and column_name='study_items'"),1);assert.equal(await sql(pg,"select count(*)::int v from information_schema.columns where table_name='dictionary_pronunciations' and column_name='locale'"),0);
  await pg.exec(original);await migrate(pg,'page');assert.deepEqual(await snapshot(),before);assert.equal(await sql(pg,"select title v from pages where id='deck'"),'Kept title');
 }finally{await f.close();await pg.close();}
});


test('retired owner-scoped etymology UI redirects to the current dictionary without retaining an RPC client',()=>{
 const fs=require('node:fs');
 const route=fs.readFileSync('src/app/etymology/[[...path]]/page.tsx','utf8');
 assert.match(route,/redirect\(['"]\/dictionary['"]\)/);
 assert.doesNotMatch(route,/get_etymology_catalog|EtymologyBrowser/);
 assert.equal(fs.existsSync('src/features/etymology/catalog.ts'),false);
 assert.equal(fs.existsSync('src/features/etymology/EtymologyBrowser.tsx'),false);
 // Historical migrations and account deletion regression remain intact.
 assert.equal(fs.existsSync('supabase/migrations/20260928_etymology_catalog.sql'),true);
 assert.equal(fs.existsSync('tests/accountDeletion.test.cjs'),true);
});
