require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {database,migrate,sql,id,draft,owner}=require('./fixtures/retirementDatabase.cjs');
const baseline=require('./fixtures/retirementFunctionBaseline.cjs');
const {mapDictionaryDraft}=require('../src/features/dictionary/draftPipeline.ts');
const definition=(pg,name)=>sql(pg,'select pg_get_functiondef($1::regprocedure) v',[name]);
const normalize=(pg,value)=>sql(pg,'select dictionary_normalize_snapshot($1::jsonb) v',[value===null?null:JSON.stringify(value)]);
const search=(pg,q,page=0)=>sql(pg,'select search_dictionary_relation_targets($1,$2) v',[q,page]);
const save=async(pg,d)=>{await sql(pg,'select apply_dictionary_drafts($1,false,true) v',[JSON.stringify([mapDictionaryDraft(d)])]);await sql(pg,'select publish_dictionary_entry($1,true) v',[d.entry_id]);};

test('read-only production function baseline matches the isolated schema; ordered migrations change only intended normalizer/search logic',async()=>{
 const pg=await database();try{
  await pg.exec('reset role');
  for(const f of baseline){const actual=await definition(pg,f.identity);assert.equal(createHash('sha256').update(actual.replace(/\r\n/g,'\n')).digest('hex'),f.sha256,f.identity);}
  const normalizer=await definition(pg,'dictionary_normalize_snapshot(jsonb)'),finder=await definition(pg,'search_dictionary_relation_targets(text,integer)');
  const metadata=()=>pg.query("select proname,proacl::text,prosecdef,proconfig from pg_proc where oid in ('dictionary_normalize_snapshot(jsonb)'::regprocedure,'search_dictionary_relation_targets(text,integer)'::regprocedure) order by proname");const before=(await metadata()).rows;
  await migrate(pg,'official');await migrate(pg,'ipa');await migrate(pg,'page');await pg.exec('reset role');
  assert.equal(await definition(pg,'dictionary_normalize_snapshot(jsonb)'),normalizer.replace('select public.dictionary_core_content(', 'select public.dictionary_clean_ipa_snapshot(public.dictionary_core_content(').replace('end));','end)));'));
  assert.equal(await definition(pg,'search_dictionary_relation_targets(text,integer)'),finder.replace("p.ipa||' '||coalesce(p.locale,'')||' '||coalesce(p.note,'')",'p.ipa'));
  assert.deepEqual((await metadata()).rows,before);
  for(const f of baseline.filter(f=>/dictionary_(core_content|without_verification)\(/.test(f.identity)))assert.equal(createHash('sha256').update((await definition(pg,f.identity)).replace(/\r\n/g,'\n')).digest('hex'),f.sha256);
  assert.equal(await sql(pg,"select count(*)::int v from information_schema.columns where table_schema='public' and ((table_name='pages' and column_name='study_items') or (table_name='dictionary_pronunciations' and column_name in ('locale','note')))"),0);
  assert.deepEqual((await pg.query("select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and p.prosrc ~ '(p[.](locale|note)|new[.]study_items|old[.]study_items|set ipa[^;]*locale=|sense_id,locale,ipa)' ")).rows,[]);
 }finally{await pg.close();}
});

test('relation candidate search retains all published sources, rank, totals, pagination and admin bounds after physical IPA drop',async()=>{
 const pg=await database();try{
  const words=Array.from({length:25},(_,i)=>({...draft(100+i*10),headword:'pageword'+String(i).padStart(2,'0')}));
  const pre={...draft(500,'prefix'),headword:'pre-'},root={...draft(510,'root'),headword:'pre'},word={...draft(520),headword:'pre'},starts={...draft(530),headword:'prefixword'},variant={...draft(540,'root'),headword:'shift'},contains={...draft(550),headword:'xprex'},rich={...draft(560),headword:'richword'};
  rich.senses[0].gloss_zh_tw='中文針 pre';rich.etymologies=[{id:id(562),sense_id:null,body:'originneedle',data_source:'sourceneedle'}];rich.learning_notes=[{id:id(563),sense_id:null,kind:'core_concept',body:'coreneedle'}];rich.examples=[{id:id(564),sense_id:null,body:'exampleneedle',sort_order:0}];rich.inflections=[{id:id(565),sense_id:null,form_kind:'past',form:'formsneedle',sort_order:0}];rich.pronunciations=[{id:id(566),sense_id:null,ipa:'/soundneedle/',sort_order:0}];
  for(const d of [...words,pre,root,word,starts,variant,contains,rich])await save(pg,d);
  await sql(pg,'select apply_dictionary_drafts($1,false,true) v',[JSON.stringify([mapDictionaryDraft({...draft(570),headword:'unpublishedneedle'})])]);
  await pg.exec('reset role');await pg.query("insert into dictionary_entry_groups(id,variant_group) values($1,$2)",[variant.entry_id,JSON.stringify({format:'nexus-variants-v1',rows:[{variant:'pre',condition:''}]})]);await pg.query("insert into dictionary_entry_groups(id,tags) values($1,array['tagneedle'])",[rich.entry_id]);await pg.query("update dictionary_pronunciations set locale='localeonlyneedle',note='noteonlyneedle' where id=$1",[id(566)]);await pg.exec('set role authenticated');
  const queries=['pre','pre-','entry','中文針','originneedle','sourceneedle','coreneedle','exampleneedle','formsneedle','tagneedle','soundneedle','pageword','unpublishedneedle',''];
  const before=new Map();for(const q of queries)for(const p of [0,1,2])before.set(JSON.stringify([q,p]),await search(pg,q,p));
  assert.equal((await search(pg,'pageword')).total,25);assert.equal((await search(pg,'pageword')).items.length,20);assert.equal((await search(pg,'pageword',1)).items.length,5);assert.equal((await search(pg,'pageword',2)).items.length,0);
  assert.deepEqual((await search(pg,'pre')).items.map(x=>x.id),[root,word,pre,starts,variant,contains,rich].map(x=>x.entry_id));
  for(const q of queries.slice(3,11))assert.deepEqual((await search(pg,q)).items.map(x=>x.id),[rich.entry_id]);assert.equal((await search(pg,'unpublishedneedle')).total,0);
  assert.equal((await search(pg,'localeonlyneedle')).total,1);
  await migrate(pg,'official');await migrate(pg,'ipa');await migrate(pg,'page');
  for(const [key,value] of before){const [q,p]=JSON.parse(key);assert.deepEqual(await search(pg,q,p),value,key);}
  for(const q of ['localeonlyneedle','noteonlyneedle'])assert.equal((await search(pg,q)).total,0);
  for(const [q,p] of [[null,0],['x'.repeat(121),0],['',-1],['',100001],['',null]])await assert.rejects(search(pg,q,p),/Invalid relation search/);
  await pg.exec('reset role');assert.equal(await sql(pg,"select has_function_privilege('anon','search_dictionary_relation_targets(text,integer)','execute') v"),false);await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(900001)]);await assert.rejects(search(pg,''),/Dictionary admin required/);
 }finally{await pg.close();}
});

test('normalization adds only IPA retirement while retaining verification, etymology, legacy core, segments, relation and inflection contracts',async()=>{
 const pg=await database();try{
  await pg.exec('reset role');
  const legacy={detail:{entry:{id:id(1),revision:7,word_segments:null,verification:'verified'},pronunciations:[{id:id(2),ipa:'/a/',locale:'en',note:'old',revision:2}],relations:[{id:id(3),sense_id:null,target_sense_id:id(4),relation_kind:'old',verification:'verified',verification_note:'old',revision:3}],etymologies:[{id:id(5),entry_id:id(1),sense_id:null,body:'history',verification:'verified',verification_note:'source',revision:4}],learning_notes:[{id:id(6),entry_id:id(1),sense_id:null,kind:'learning_decomposition',body:'image',revision:2},{id:id(7),entry_id:id(1),sense_id:null,kind:'mnemonic_scenario',body:'story',revision:2},{id:id(8),entry_id:id(1),sense_id:id(9),kind:'mnemonic_scenario',body:'other sense',revision:4}]},operation:{verification:'must remain raw'},unknown:'must remain'};
  const expected=await normalize(pg,legacy);for(const p of expected.detail.pronunciations){delete p.locale;delete p.note;}
  assert.equal(expected.detail.etymologies[0].data_source,'source');assert.equal(expected.detail.learning_notes.length,2);assert.equal(expected.detail.learning_notes[0].id,id(6));assert.equal(expected.detail.learning_notes[0].kind,'core_concept');assert.equal(expected.detail.learning_notes[0].revision,3);
  await migrate(pg,'ipa');await pg.exec('reset role');assert.deepEqual(await normalize(pg,legacy),expected);assert.deepEqual(await normalize(pg,expected),expected);assert.equal(await normalize(pg,null),null);
  const copy=()=>structuredClone(expected),equivalent=copy();equivalent.detail.entry.word_segments=null;equivalent.detail.inflections=[];assert.deepEqual(await normalize(pg,equivalent),expected);
  for(const change of [v=>v.detail.pronunciations[0].ipa='/changed/',v=>v.detail.etymologies[0].data_source='changed source',v=>v.detail.learning_notes[0].body='changed core',v=>v.detail.entry.revision++,v=>v.detail.entry.word_segments=[],v=>v.detail.relations[0].target_sense_id=id(99),v=>v.detail.inflections=[{id:id(10),form:'changed',form_kind:'past'}],v=>v.unknown='changed']){const v=copy();change(v);assert.notDeepEqual(await normalize(pg,v),expected);}
  const conflict=structuredClone(legacy);conflict.detail.etymologies[0].data_source='different source';await assert.rejects(normalize(pg,conflict),/Conflicting etymology source/);
 }finally{await pg.close();}
});

test('legacy Review snapshots approve after ordered migrations, while actual source/core changes and stale review revisions still reject',async()=>{
 const pg=await database();try{
  const d=draft(100);d.etymologies=[{id:id(102),sense_id:null,body:'history',data_source:'source'}];d.learning_notes=[{id:id(103),sense_id:null,kind:'core_concept',body:'core'}];d.pronunciations=[{id:id(104),sense_id:null,ipa:'/a/',sort_order:0}];await save(pg,d);
  const current=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[d.entry_id]),old=structuredClone(current);delete old.detail.entry.word_segments;old.detail.entry.verification='verified';old.detail.etymologies[0].verification_note=old.detail.etymologies[0].data_source;delete old.detail.etymologies[0].data_source;old.detail.etymologies[0].verification='verified';old.detail.learning_notes[0].kind='learning_decomposition';old.detail.learning_notes[0].revision--;old.detail.pronunciations[0].locale='legacy';old.detail.pronunciations[0].note=null;
  const candidate=mapDictionaryDraft({...d,senses:d.senses.map(s=>({...s,gloss_zh_tw:'new meaning'}))}),review=await sql(pg,'select create_dictionary_edit_review($1,$2,$3) v',[d.entry_id,JSON.stringify(current),JSON.stringify(candidate)]);
  // Reproduce the stored pre-retirement representation without changing RPC validation.
  await pg.exec('reset role');await pg.query('update dictionary_review_drafts set base_snapshot=$1 where id=$2',[JSON.stringify(old),review.id]);const stored=await sql(pg,'select to_jsonb(r) v from dictionary_review_drafts r where id=$1',[review.id]);await pg.exec('set role authenticated');
  await migrate(pg,'official');await migrate(pg,'ipa');await migrate(pg,'page');await pg.exec('reset role');assert.deepEqual(await sql(pg,'select to_jsonb(r) v from dictionary_review_drafts r where id=$1',[review.id]),stored);await pg.exec('set role authenticated');
  await assert.rejects(sql(pg,'select approve_dictionary_review($1,$2,true) v',[review.id,stored.revision+1]),/revision|conflict/i);
  // Historical base snapshots must not hide a genuine source/core difference.
  for(const change of [v=>v.detail.etymologies[0].verification_note='changed',v=>v.detail.learning_notes[0].body='changed']){
   const different=structuredClone(old);change(different);await pg.exec('begin;reset role');await pg.query('update dictionary_review_drafts set base_snapshot=$1 where id=$2',[JSON.stringify(different),review.id]);const revision=await sql(pg,'select revision v from dictionary_review_drafts where id=$1',[review.id]);await pg.exec('set role authenticated');
   await assert.rejects(sql(pg,'select approve_dictionary_review($1,$2,true) v',[review.id,revision]),/Stale/);await pg.exec('rollback;set role authenticated');
  }
  await sql(pg,'select approve_dictionary_review($1,$2,true) v',[review.id,stored.revision]);const published=await sql(pg,'select get_published_dictionary_entry($1) v',[d.entry_id]);assert.equal(published.senses[0].gloss_zh_tw,'new meaning');assert.equal(published.etymologies[0].data_source,'source');assert.equal(published.learning_notes[0].body,'core');assert.equal(published.pronunciations[0].id,id(104));
 }finally{await pg.close();}
});

test('source drift and unknown column dependencies fail closed with independent transaction rollback',async()=>{
 const pg=await database();try{
  await pg.exec('reset role');const guard=await definition(pg,'guard_official_study_content()'),download=await definition(pg,'download_official_study_pack(text)');await pg.exec(download.replace("'official_level',item.level","'official_level', item.level"));await assert.rejects(migrate(pg,'official'),/Unexpected official download/);await pg.exec('rollback');assert.equal(await definition(pg,'guard_official_study_content()'),guard);assert.equal(await sql(pg,"select to_regprocedure('get_published_study_content(uuid[])')::text v"),null);await pg.exec(download);await migrate(pg,'official');
  await pg.exec('reset role');const original=await definition(pg,'dictionary_normalize_snapshot(jsonb)'),finder=await definition(pg,'search_dictionary_relation_targets(text,integer)');
  for(const [body,error] of [[original.replace('end));','end) );'),/Unexpected snapshot normalizer/],[finder.replace("coalesce(p.locale,'')","coalesce(p.locale, '')"),/Unexpected relation pronunciation search/]]){
   await pg.exec(body);await assert.rejects(migrate(pg,'ipa'),error);await pg.exec('rollback');assert.equal(await sql(pg,"select to_regprocedure('dictionary_clean_ipa_snapshot(jsonb)')::text v"),null);assert.equal(await sql(pg,"select count(*)::int v from information_schema.columns where table_name='dictionary_pronunciations' and column_name in ('locale','note')"),2);await pg.exec(original);await pg.exec(finder);
  }
  await pg.exec('create view retirement_dependency_probe as select locale from dictionary_pronunciations');await assert.rejects(migrate(pg,'ipa'),/other objects depend|depends on/);await pg.exec('rollback');assert.equal(await definition(pg,'dictionary_normalize_snapshot(jsonb)'),original);assert.equal(await sql(pg,"select to_regclass('retirement_dependency_probe')::text v"),'retirement_dependency_probe');assert.equal(await sql(pg,"select to_regprocedure('dictionary_clean_ipa_snapshot(jsonb)')::text v"),null);assert.ok(await sql(pg,"select to_regprocedure('get_published_study_content(uuid[])')::text v"));await pg.exec('drop view retirement_dependency_probe');
  await migrate(pg,'ipa');await pg.exec('reset role');const pageRpcs=['apply_workspace_operations(jsonb)','download_official_study_pack(text)','guard_official_study_page()'],pageDefinitions=await Promise.all(pageRpcs.map(name=>definition(pg,name)));
  await pg.exec('create view retirement_page_dependency_probe as select study_items from pages');await assert.rejects(migrate(pg,'page'),/other objects depend|depends on/);await pg.exec('rollback');for(let i=0;i<pageRpcs.length;i++)assert.equal(await definition(pg,pageRpcs[i]),pageDefinitions[i]);assert.equal(await sql(pg,"select count(*)::int v from information_schema.columns where table_name='dictionary_pronunciations' and column_name in ('locale','note')"),0);assert.equal(await sql(pg,"select to_regclass('retirement_page_dependency_probe')::text v"),'retirement_page_dependency_probe');await pg.exec('drop view retirement_page_dependency_probe');await migrate(pg,'page');
 }finally{await pg.close();}
});
