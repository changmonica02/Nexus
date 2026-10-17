require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {database,sql,id}=require('./fixtures/dictionaryExchangeDatabase.cjs');
const migration=fs.readFileSync('supabase/migrations/20261017020000_dictionary_ranked_components.sql','utf8');
const quick=(pg,n,name,kind='prefix',verified=true)=>sql(pg,'select quick_create_dictionary_component($1,$2,$3,$4) v',[id(n),kind,name,verified]);
const search=(pg,q,p=0)=>sql(pg,'select search_dictionary_relation_targets($1,$2) v',[q,p]);
async function seed(pg,n,name,kind='word',gloss='target content',variant){
 await pg.query('insert into dictionary_entries(id,kind,headword) values($1,$2,$3)',[id(n),kind,name]);
 await pg.query('insert into dictionary_senses(id,entry_id,part_of_speech,gloss_zh_tw) values($1,$2,$3,$4)',[id(n+1),id(n),kind==='word'?'noun':null,gloss]);
 if(variant){await pg.exec('reset role');await pg.query("insert into dictionary_entry_groups(id,variant_group) values($1,$2)",[id(n),JSON.stringify({format:'nexus-variants-v1',rows:[{variant,condition:'condition is not a searchable variant'}]})]);await pg.exec('set role authenticated');}
 await pg.query('select publish_dictionary_entry($1,true)',[id(n)]);
}
test('full server ranking before pagination: exact/hyphen, prefix, variant, substring, details, CJK and stable pages',async()=>{
 const pg=await database();try{
 await pg.exec('reset role');await pg.exec(migration);await pg.exec('set role authenticated');
 // Enough alphabetically earlier full-text hits to bury genuine name matches in the old first page.
 for(let n=100;n<350;n+=10)await seed(pg,n,'aaa'+n,'word','org 中文');
 await seed(pg,400,'org-','prefix','組織');await seed(pg,410,'organic');await seed(pg,420,'xorgy');await seed(pg,430,'z-','root','其他','org');
 const first=await search(pg,' ORG ');assert.equal(first.total,29);assert.equal(first.items[0].id,id(400));assert.equal(first.items[1].id,id(410));assert.equal(first.items[2].id,id(430));assert.equal(first.items[3].id,id(420));assert.equal(first.items.length,20);assert.equal(first.has_more,true);
 assert.equal((await search(pg,'-ORG')).items[0].id,id(400));
 const second=await search(pg,'org',1);assert.equal(second.items.length,9);assert.equal(new Set([...first.items,...second.items].map(x=>x.id)).size,29);assert.deepEqual(await search(pg,'org'),first);
 assert.equal((await search(pg,'中文')).total,25);assert.equal((await search(pg,'%')).total,0);assert.equal((await search(pg,'condition')).total,0);
 await assert.rejects(search(pg,'x'.repeat(121)),/Invalid/);await assert.rejects(search(pg,'org',-1),/Invalid/);
 await pg.query('insert into dictionary_entries(id,kind,headword) values($1,$2,$3)',[id(500),'prefix','org-draft']);assert.ok(!(await search(pg,'org')).items.some(x=>x.id===id(500)));
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(900001)]);await assert.rejects(search(pg,'org'),/admin/);
 }finally{await pg.close();}
});
test('quick component: minimal Prefix/Root, canonical reuse, lost-response retry, audit/history, Word unchanged, RLS and atomic failure',async()=>{
 const pg=await database();try{
 await pg.exec('reset role');await pg.exec(migration);await pg.exec('set role authenticated');
 const a=await quick(pg,1000,'ab-');assert.equal(a.kind,'prefix');assert.equal(a.senses.length,1);assert.equal(a.senses[0].gloss_zh_tw,'');
 const again=await quick(pg,1000,' ab- '),equivalent=await quick(pg,1001,'-AB');assert.equal(again.id,a.id);assert.equal(equivalent.id,a.id);
 const root=await quick(pg,1002,'org','root');assert.equal(root.kind,'root');assert.notEqual(root.id,a.id);
 const snapshot=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[a.id]);
 const {validateDictionaryDraft,draftsFromBundle,mapDictionaryDraft}=require('../src/features/dictionary/draftPipeline.ts');
 const bundle={dictionary_entries:[{id:a.id,kind:'prefix',headword:a.headword,revision:snapshot.detail.entry.revision}],dictionary_senses:snapshot.detail.senses.map(({updated_at,...r})=>r)};
 const {parseJSONBundle}=require('../src/features/dictionary/adminImport.ts');assert.deepEqual(parseJSONBundle(JSON.stringify(bundle)),bundle);assert.deepEqual(validateDictionaryDraft(draftsFromBundle(bundle)),[]);
 const {draftFromExchange}=require('../src/features/dictionary/dictionaryExchange.ts');assert.equal(draftFromExchange({snapshot,reviews:[],version:null}).senses[0].gloss_zh_tw,'');
 const {toAI,parseAI}=require('../src/features/dictionary/aiDictionary.ts');const ai=toAI(snapshot);assert.ok(parseAI(JSON.stringify({format:'nexus-dictionary-ai',version:1,entries:[ai]})));

 assert.equal(await sql(pg,"select count(*)::int v from dictionary_published_revisions where entry_id=$1",[a.id]),1);
 assert.equal(await sql(pg,"select count(*)::int v from dictionary_audit where record_id=$1 and operation='PUBLISH_VERIFIED'",[a.id]),1);
 const candidate=draftsFromBundle({...bundle,dictionary_senses:bundle.dictionary_senses.map(s=>({...s,gloss_zh_tw:'補充中文'}))})[0];
 const review=await sql(pg,'select create_dictionary_edit_review($1,$2::jsonb,$3::jsonb) v',[a.id,JSON.stringify(snapshot),JSON.stringify(mapDictionaryDraft(candidate))]);
 assert.equal((await sql(pg,'select get_published_dictionary_entry($1) v',[a.id])).senses[0].gloss_zh_tw,'');
 await sql(pg,'select approve_dictionary_review($1,$2,true) v',[review.id,review.revision]);
 assert.equal((await sql(pg,'select get_published_dictionary_entry($1) v',[a.id])).senses[0].id,a.senses[0].id);assert.equal((await sql(pg,'select get_published_dictionary_entry($1) v',[a.id])).senses[0].gloss_zh_tw,'補充中文');

 assert.equal(await sql(pg,"select count(*)::int v from dictionary_entries where kind='prefix' and dictionary_component_key(headword)='ab'"),1);
 const concurrent=await Promise.all([quick(pg,1010,'concurrent-','root'),quick(pg,1011,'-CONCURRENT','root')]);assert.equal(concurrent[0].id,concurrent[1].id);assert.equal(await sql(pg,"select count(*)::int v from dictionary_entries where kind='root' and dictionary_component_key(headword)='concurrent'"),1);
 await assert.rejects(quick(pg,1000,'different'),/Operation ID/);await assert.rejects(quick(pg,1003,'word','word'),/Invalid/);await assert.rejects(quick(pg,1003,'--'),/Invalid/);await assert.rejects(quick(pg,1003,'no','prefix',false),/confirmation/);
 await pg.query("insert into dictionary_entries(id,kind,headword) values($1,'root','draft-')",[id(2000)]);await assert.rejects(quick(pg,1004,'DRAFT','root'),/draft exists/);
 await assert.rejects(pg.query("insert into dictionary_entries(kind,headword) values('prefix','-AB-')"),/unique/);
 // All original Word invariants still run.
 await pg.query("insert into dictionary_entries(id,kind,headword) values($1,'word','no-sense')",[id(2010)]);await assert.rejects(pg.query('select publish_dictionary_entry($1,true)',[id(2010)]),/sense/);
 await assert.rejects(pg.query("insert into dictionary_senses(entry_id,part_of_speech,gloss_zh_tw) values($1,null,'')",[id(2010)]),/part of speech/);
 await assert.rejects(pg.query('select dictionary_admin_first_senses($1::uuid[])',[Array.from({length:101},()=>a.id)]),/Invalid/);
 const summaries=await sql(pg,'select dictionary_admin_first_senses($1::uuid[]) v',[[a.id,root.id]]);assert.equal(summaries.length,2);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(900001)]);
 for(const f of [()=>quick(pg,1005,'forbidden'),()=>sql(pg,'select dictionary_admin_first_senses($1::uuid[]) v',[[a.id]])])await assert.rejects(f(),/admin/);
 assert.equal(await sql(pg,"select count(*)::int v from dictionary_import_operations"),0);
 assert.ok(await sql(pg,'select get_published_dictionary_entry($1) v',[a.id]));
 await pg.exec('reset role;set role anon');await assert.rejects(quick(pg,1006,'anon'),/permission/);
 }finally{await pg.close();}
});
test('first-Sense summary is stable, compact, kind-aware and does not substitute a later gloss',()=>{
 const {firstSenseSummary}=require('../src/features/dictionary/flashcardLinks.ts');
 const senses=[{id:id(12),part_of_speech:'v.',gloss_zh_tw:'later'},{id:id(11),part_of_speech:'n.',gloss_zh_tw:'first'}];const before=structuredClone(senses);
 assert.equal(firstSenseSummary({entry:{kind:'word'},senses}),'(n.) first');assert.deepEqual(senses,before);
 assert.equal(firstSenseSummary({entry:{kind:'prefix'},senses}),'first');senses[1].gloss_zh_tw='';assert.equal(firstSenseSummary({entry:{kind:'word'},senses}),'(n.) 尚無中文意思');
});

test('migration refuses legacy identity collisions atomically, without changing content or old validation',async()=>{
 const pg=await database();try{
 await seed(pg,6000,'collision-','prefix');await seed(pg,6010,'-collision','prefix');await pg.exec('reset role');
 await assert.rejects(pg.exec(migration),/unique/);await pg.exec('rollback');
 assert.equal(await sql(pg,"select count(*)::int v from dictionary_entries"),2);assert.equal(await sql(pg,"select to_regprocedure('public.quick_create_dictionary_component(uuid,text,text,boolean)') v"),null);
 const check=await sql(pg,"select pg_get_constraintdef(oid) v from pg_constraint where conname='dictionary_senses_gloss_zh_tw_check'");assert.ok(!check.includes('part_of_speech'));
 }finally{await pg.close();}
});
test('6301 full candidates ranked and paginated without truncated alphabetic results',async()=>{
 const pg=await database();try{
 await pg.exec('reset role');await pg.exec(migration);
 await pg.query("insert into dictionary_entries(id,kind,headword) select md5('scale-entry-'||n)::uuid,'word',case when n=6301 then 'zzorg' else 'aaa'||lpad(n::text,5,'0') end from generate_series(1,6301) n");
 await pg.query("insert into dictionary_senses(id,entry_id,part_of_speech,gloss_zh_tw) select md5('scale-sense-'||id::text)::uuid,id,'noun','zzorg details' from dictionary_entries");
 await pg.exec('set role authenticated');
 await pg.exec("do $$ declare r record;begin for r in select id from dictionary_entries loop perform publish_dictionary_entry(r.id,true);end loop;end $$;");
 const start=performance.now(),result=await search(pg,'zzorg');const elapsed=performance.now()-start;
 assert.equal(result.total,6301);assert.equal(result.items[0].headword,'zzorg');assert.equal(result.items.length,20);assert.equal((await search(pg,'zzorg',315)).items.length,1);
 console.log('6301 candidates / page20 full ranked search: '+elapsed.toFixed(1)+' ms ('+(process.env.NEXUS_TEST_POSTGRES_CONTAINER?'isolated PostgreSQL15':'PGlite PostgreSQL')+')');
 }finally{await pg.close();}
});
test('failed receipt rolls back created Entry/Sense/publication/history/audit together',async()=>{
 const pg=await database();try{
 await pg.exec('reset role');await pg.exec(migration);
 await pg.exec("alter table dictionary_import_operations add constraint test_receipt_failure check(source_type<>'quick_component') not valid;set role authenticated");
 await assert.rejects(quick(pg,7000,'rollback-'),/test_receipt_failure/);
 for(const table of ['dictionary_entries','dictionary_senses','dictionary_published_revisions','dictionary_import_operations','dictionary_audit'])assert.equal(await sql(pg,'select count(*)::int v from '+table),0,table);
 }finally{await pg.close();}
});
test('reader renders every meaning exactly once for Word/Prefix/Root; no duplicate jump/Chinese headings',()=>{
 const fs=require('node:fs'),ts=require('typescript');require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');const {DictionaryArticle}=require('../src/features/dictionary/DictionaryBrowser.tsx');
 for(const kind of ['word','prefix','root'])for(const count of [1,2]){
 const data={entry:{id:id(10),kind,headword:'test'},senses:[{id:id(11),part_of_speech:'noun',gloss_zh_tw:'唯一中文甲'},{id:id(12),part_of_speech:'verb',gloss_zh_tw:'唯一中文乙'}].slice(0,count),relations:[],related:[],learning_notes:[{id:id(21),sense_id:id(11),kind:'core_concept',body:'core text'}],etymologies:[{id:id(22),sense_id:null,body:'history text',data_source:'https://example.test/source'}]};
 const html=renderToStaticMarkup(React.createElement(DictionaryArticle,{data}));for(const sense of data.senses)assert.equal(html.split(sense.gloss_zh_tw).length-1,1);assert.ok(!html.includes('切換義項'));assert.ok(!html.includes('>中文義<'));assert.ok(html.indexOf('核心概念')<html.indexOf('歷史詞源'));assert.ok(html.includes('href="https://example.test/source"'));if(kind!=='word')assert.ok(!html.includes('(noun)'));
 }
});
