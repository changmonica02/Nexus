require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {database:base,sql,id,draft}=require('./fixtures/dictionaryTransferDatabase.cjs');
const {saveDictionaryDraft,mapDictionaryDraft,draftsFromBundle}=require('../src/features/dictionary/draftPipeline.ts');
const {createDictionaryReview}=require('../src/features/dictionary/revisionLifecycle.ts');
const {parseJSONBundle}=require('../src/features/dictionary/adminImport.ts');
const {client}=require('./fixtures/morphemeDatabase.cjs');
const migration='20261112012042_dictionary_morpheme_senses.sql';
async function database(){const pg=await base();await pg.exec('reset role');await pg.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));await pg.exec('set role authenticated');return pg;}
function morph(n,kind='root'){return {...draft(n),kind,headword:'morph-'+n,senses:[{id:id(n+1),part_of_speech:null,gloss_zh_tw:'概述',semantic_domain:'action',semantic_subdomain:'movement',variants:[{id:id(n+2),form:'m-',condition:'before a vowel'}]}]};}
test('morpheme drafts: suffix, reclassification with stable identity, exact variant order and clear, strict validation and old missing fields',async()=>{const pg=await database();try{
 const c=client(pg),d=morph(1200,'suffix');await saveDictionaryDraft(c,[d],false,true);
 const quick=()=>sql(pg,'select quick_create_dictionary_component($1,$2,$3,true) v',[id(1199),'suffix','-fixture']);const created=await quick();assert.equal(created.kind,'suffix');assert.deepEqual(await quick(),created);assert.equal((await sql(pg,'select get_published_dictionary_entry($1) v',[created.id])).entry.kind,'suffix');
 let snap=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[d.entry_id]);assert.equal(snap.detail.entry.kind,'suffix');assert.deepEqual(snap.detail.senses[0].variants,d.senses[0].variants);
 const bundle=mapDictionaryDraft({...d,revision:snap.detail.entry.revision,senses:[{...snap.detail.senses[0],variants:[...d.senses[0].variants,{id:id(1204),form:'m-',condition:'other'}]}]}).bundle;
 const next=draftsFromBundle(bundle)[0];next.kind='prefix';await saveDictionaryDraft(c,[next],false,true);
 snap=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[d.entry_id]);assert.equal(snap.detail.entry.id,d.entry_id);assert.equal(snap.detail.entry.kind,'prefix');assert.equal(snap.detail.senses[0].variants.length,2);
 const original=snap.detail.senses[0].variants;
 await sql(pg,'select apply_dictionary_bundle($1,false,true) v',[JSON.stringify({dictionary_senses:[{id:id(1201),entry_id:d.entry_id,revision:snap.detail.senses[0].revision,variants:[...original].reverse()}]})]);
 snap=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[d.entry_id]);assert.deepEqual(snap.detail.senses[0].variants,[...original].reverse());
 await sql(pg,'select apply_dictionary_bundle($1,false,true) v',[JSON.stringify({dictionary_senses:[{id:id(1201),entry_id:d.entry_id,revision:snap.detail.senses[0].revision,variants:[]}]})]);
 snap=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[d.entry_id]);assert.deepEqual(snap.detail.senses[0].variants,[]);
 const row=snap.detail.senses[0];await sql(pg,'select apply_dictionary_bundle($1,false,true) v',[JSON.stringify({dictionary_senses:[{id:row.id,entry_id:d.entry_id,revision:row.revision,gloss_zh_tw:'old file text'}]})]);
 snap=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[d.entry_id]);assert.deepEqual(snap.detail.senses[0].variants,[]);assert.equal(snap.detail.senses[0].semantic_domain,'action');
 await assert.rejects(sql(pg,'select apply_dictionary_bundle($1,false,true) v',[JSON.stringify({dictionary_senses:[{id:row.id,entry_id:d.entry_id,revision:snap.detail.senses[0].revision,semantic_subdomain:'time'}]})]),/dictionary_morpheme_sense_valid/);
 assert.throws(()=>parseJSONBundle(JSON.stringify({dictionary_senses:[{id:row.id,entry_id:d.entry_id,gloss_zh_tw:'x',variants:[{form:'missing ID'}]}]})),/invalidVariants/);
 }finally{await pg.close();}});
test('morpheme snapshot aliases preserve old Review approvals, real conflicts and published isolation',async()=>{const pg=await base();try{
 const c=client(pg),d={...draft(1300),kind:'prefix',headword:'old-',senses:[{id:id(1301),part_of_speech:null,gloss_zh_tw:'old overview'}]};await saveDictionaryDraft(c,[d],false,true);await sql(pg,'select publish_dictionary_entry($1,true) v',[d.entry_id]);
 const before=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[d.entry_id]);const review=await createDictionaryReview(c,before);
 const oldExport=await c.rpc('export_dictionary_exchange_page',{kind_filters:['prefix'],status_filters:[],query_text:'',after_id:null,expected_scope:null,pending_only:false,preview_only:false});assert.ifError(oldExport.error);
 await pg.exec('reset role');await pg.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));await pg.exec('set role authenticated');
 const resumed=await c.rpc('export_dictionary_exchange_page',{kind_filters:['prefix'],status_filters:[],query_text:'',after_id:null,expected_scope:oldExport.data.scope_version,pending_only:false,preview_only:false});assert.ifError(resumed.error);assert.equal(resumed.data.records[0].version,oldExport.data.records[0].version);
 await pg.exec('reset role');assert.equal(await sql(pg,'select dictionary_normalize_snapshot($1)=dictionary_normalize_snapshot(get_dictionary_ai_snapshot($2)) v',[JSON.stringify(before),d.entry_id]),true);await pg.exec('set role authenticated');
 const candidate=structuredClone(review.candidate);candidate.bundle.dictionary_senses[0].semantic_domain='nature';candidate.bundle.dictionary_senses[0].semantic_subdomain='geography';candidate.bundle.dictionary_senses[0].variants=[{id:id(1302),form:'o-',condition:''}];candidate.bundle.dictionary_entries[0].kind='suffix';
 const saved=await sql(pg,'select save_dictionary_review($1,$2,$3) v',[review.id,review.revision,JSON.stringify(candidate)]);
 const visible=await sql(pg,'select get_published_dictionary_entry($1) v',[d.entry_id]);assert.equal(visible.entry.kind,'prefix');assert.equal(visible.senses[0].semantic_domain,null);
 await assert.rejects(sql(pg,'select save_dictionary_review($1,$2,$3) v',[review.id,review.revision,JSON.stringify(candidate)]),/Revision|revision|changed/);
 await sql(pg,'select approve_dictionary_review($1,$2,true) v',[review.id,saved.revision]);
 const after=await sql(pg,'select get_published_dictionary_entry($1) v',[d.entry_id]);assert.equal(after.entry.kind,'suffix');assert.equal(after.senses[0].semantic_domain,'nature');assert.deepEqual(after.senses[0].variants,candidate.bundle.dictionary_senses[0].variants);
 await pg.exec('reset role');const normalized=await sql(pg,"select dictionary_normalize_snapshot($1) <> dictionary_normalize_snapshot(jsonb_set($1,'{detail,senses,0,variants}','[]')) v",[JSON.stringify(await sql(pg,'select get_dictionary_ai_snapshot($1) v',[d.entry_id]))]);assert.equal(normalized,true);
 }finally{await pg.close();}});
test('shared catalog: stable homographs, sense-specific variant search, categories, paging, Review isolation and non-admin limits',async()=>{const pg=await database();try{
 const c=client(pg),a=morph(1400),b=morph(1500,'prefix'),sameKind=morph(1550);b.headword=a.headword;sameKind.headword=a.headword;a.senses.push({id:id(1405),part_of_speech:null,gloss_zh_tw:'另一義項',semantic_domain:'nature',semantic_subdomain:'geography',variants:[{id:id(1406),form:'alternate',condition:'other sense'}]});
 for(const d of [a,b,sameKind]){await saveDictionaryDraft(c,[d],false,true);await sql(pg,'select publish_dictionary_entry($1,true) v',[d.entry_id]);}
 let r=await sql(pg,"select search_dictionary_catalog('morpheme','alternate',null,null,array['prefix','root','suffix'],'{}',0,false) v");assert.equal(r.total,1);assert.equal(r.items[0].id,a.entry_id);assert.deepEqual(r.items[0].matched_sense_ids,[id(1405)]);assert.equal(r.items[0].variants.length,2);
 r=await sql(pg,"select search_dictionary_catalog('morpheme','', 'nature','geography',array['prefix','root','suffix'],'{}',0,false) v");assert.equal(r.total,1);
 r=await sql(pg,"select search_dictionary_catalog('morpheme','',null,null,array['prefix','root','suffix'],'{}',0,false) v");assert.equal(r.total,3);assert.equal(new Set(r.items.map(e=>e.id)).size,3);await assert.rejects(sql(pg,'select quick_create_dictionary_component($1,$2,$3,true) v',[id(1599),'root',a.headword]),/Ambiguous component identity/);
 const base=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[a.entry_id]);const active=await createDictionaryReview(c,base);
 const pending=await sql(pg,"select search_dictionary_catalog('all','',null,null,array['prefix','root','suffix'],array['red'],0,true) v");assert.equal(pending.total,1);assert.equal(pending.stats.red,1);
 const edited=structuredClone(active.candidate);edited.bundle.dictionary_entries[0].kind='suffix';edited.bundle.dictionary_entries[0].headword='renamed-review';await sql(pg,'select save_dictionary_review($1,$2,$3) v',[active.id,active.revision,JSON.stringify(edited)]);
 const selected=await sql(pg,"select search_dictionary_catalog('morpheme','renamed-review',null,null,array['suffix'],array['red'],0,true) v");assert.equal(selected.total,1);
 const exported=await c.rpc('export_dictionary_exchange_page',{kind_filters:['suffix'],status_filters:[],query_text:'renamed-review',after_id:null,expected_scope:null,pending_only:true,preview_only:false});assert.ifError(exported.error);assert.equal(exported.data.total,selected.total,'pending export and admin use the same current Review kind/headword');assert.equal(exported.data.records[0].snapshot.detail.entry.kind,'root','full export retains the published identity');assert.equal(exported.data.records[0].reviews[0].candidate.bundle.dictionary_entries[0].kind,'suffix');
 await createDictionaryReview(c,base);const ambiguous=await c.rpc('export_dictionary_exchange_page',{kind_filters:['root'],status_filters:[],query_text:'',after_id:null,expected_scope:null,pending_only:true,preview_only:true});assert.ifError(ambiguous.error);const catalog=await sql(pg,"select search_dictionary_catalog('morpheme','',null,null,array['root'],array['red'],0,true) v");assert.equal(ambiguous.data.total,catalog.total);assert.equal(catalog.total,1,'multiple Reviews retain the canonical filter identity without guessing');

 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(900001)]);
 await assert.rejects(sql(pg,"select search_dictionary_catalog('all','',null,null,array['prefix','root','suffix'],'{}',0,true) v"),/admin required/);
 const publicResult=await sql(pg,"select search_dictionary_catalog('all','',null,null,array['prefix','root','suffix'],'{}',0,false) v");assert.equal(publicResult.total,3);assert.equal(publicResult.stats,null);assert.ok(publicResult.items.every(r=>r.editor_pending_count===0&&r.import_pending_count===0));
 }finally{await pg.close();}});
test('legacy conversion: current Reviews preserved, unique variants assigned only in drafts, ambiguous source retained, atomic replay and stale proof rejection',async()=>{const pg=await database();try{
 const c=client(pg);
 for(const n of [1600,1700,1800]){
  const d=morph(n);delete d.senses[0].variants;delete d.senses[0].semantic_domain;delete d.senses[0].semantic_subdomain;
  if(n===1700)d.senses.push({id:id(1703),part_of_speech:null,gloss_zh_tw:'ambiguous'});
  d.grouping={primary_category:'空間、位置與環境',tags:[],variant_group:JSON.stringify({format:'nexus-variants-v1',rows:[{variant:'legacy-form',condition:'original condition'}]})};
  await saveDictionaryDraft(c,[d],false,true);await sql(pg,'select publish_dictionary_entry($1,true) v',[d.entry_id]);
 }
 const protectedSnapshot=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[id(1800)]);const existing=await createDictionaryReview(c,protectedSnapshot);
 const before=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[id(1600)]);
 const convert=(entry,snapshot,operation)=>sql(pg,'select prepare_dictionary_morpheme_draft($1,$2,$3) v',[entry,JSON.stringify(snapshot),operation]);
 const result=await convert(id(1600),before,id(1699));assert.equal(result.status,'created');assert.equal(result.variants_assigned,1);
 assert.deepEqual(await convert(id(1600),before,id(1699)),result);assert.deepEqual(await sql(pg,'select get_dictionary_ai_snapshot($1) v',[id(1600)]),before);
 const review=await sql(pg,'select to_jsonb(r) v from dictionary_review_drafts r where id=$1',[result.review_id]);assert.equal(review.candidate.bundle.dictionary_senses[0].variants[0].form,'legacy-form');assert.equal(review.candidate.group_data.variant_group,before.grouping.variant_group);assert.equal(review.candidate.group_data.primary_category,before.grouping.primary_category);
 const ambiguous=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[id(1700)]),manual=await convert(id(1700),ambiguous,id(1799));assert.equal(manual.manual_reason,'ambiguous_sense');
 const untouched=await convert(id(1800),protectedSnapshot,id(1899));assert.equal(untouched.status,'existing_review');assert.deepEqual(await sql(pg,'select to_jsonb(r) v from dictionary_review_drafts r where id=$1',[existing.id]),existing);
 await assert.rejects(convert(id(1600),{...before,detail:{...before.detail,entry:{...before.detail.entry,revision:before.detail.entry.revision+1}}},id(1698)),/source changed/);
 await assert.rejects(convert(id(1700),ambiguous,id(1699)),/Operation ID reused/);
 const publicDetail=await sql(pg,'select get_published_dictionary_entry($1) v',[id(1600)]);assert.equal(publicDetail.senses[0].variants,null);assert.equal(publicDetail.entry.status,'published');
 }finally{await pg.close();}});
test('Word links use the original relation IDs and Review CAS in both directions; unlink retains all entries and senses',async()=>{const pg=await database();try{
 const c=client(pg),{editMorphemeWordLink,readMorphemeWordLinks}=require('../src/features/dictionary/morphemeLinks.ts');
 const target=morph(1900);target.senses.push({id:id(1905),part_of_speech:null,gloss_zh_tw:'other meaning'});await saveDictionaryDraft(c,[target],false,true);await sql(pg,'select publish_dictionary_entry($1,true) v',[target.entry_id]);
 const word=draft(2000);await saveDictionaryDraft(c,[word],false,true);await sql(pg,'select publish_dictionary_entry($1,true) v',[word.entry_id]);
 const originalRpc=c.rpc;c.rpc=async(name,args)=>{const result=await originalRpc(name,args);return name==='create_dictionary_edit_review'&&!result.error?{error:{message:'fixture lost response'}}:result;};
 await editMorphemeWordLink(c,word.entry_id,target.entry_id,id(1901),id(2100));await editMorphemeWordLink(c,word.entry_id,target.entry_id,id(1901),id(2100));
 let rows=(await readMorphemeWordLinks(c,target.entry_id,id(1901))).items;assert.equal(rows.length,1);assert.equal(rows[0].id,id(2100));assert.equal(rows[0].pending,true);
 const published=await sql(pg,'select get_published_dictionary_entry($1) v',[word.entry_id]);assert.equal(published.relations.length,0);
 await editMorphemeWordLink(c,word.entry_id,target.entry_id,id(1905),id(2101));
 await editMorphemeWordLink(c,word.entry_id,target.entry_id,id(1901),id(2100),true);
 assert.equal((await readMorphemeWordLinks(c,target.entry_id,id(1901))).items.length,0);assert.equal((await readMorphemeWordLinks(c,target.entry_id,id(1905))).items.length,1);
 const reviews=(await pg.query('select * from dictionary_review_drafts where entry_id=$1',[word.entry_id])).rows;assert.equal(reviews.length,1);
 await sql(pg,'select approve_dictionary_review($1,$2,true) v',[reviews[0].id,reviews[0].revision]);
 const after=await sql(pg,'select get_published_dictionary_entry($1) v',[word.entry_id]);assert.equal(after.relations[0].id,id(2101));assert.equal(after.relations[0].target_sense_id,id(1905));
 const targetAfter=await sql(pg,'select get_published_dictionary_entry($1) v',[target.entry_id]);assert.equal(targetAfter.senses.length,2);
 await editMorphemeWordLink(c,word.entry_id,target.entry_id,id(1905),id(2101),true);const removal=(await readMorphemeWordLinks(c,target.entry_id,id(1905))).items;assert.equal(removal.length,1);assert.equal(removal[0].removed,true);assert.equal((await sql(pg,'select get_published_dictionary_entry($1) v',[word.entry_id])).relations.length,1);
 }finally{await pg.close();}});
test('complete exchange and AI JSON retain morphology; old Review writes cannot erase variants; explicit clears and content conflicts remain real',async()=>{const pg=await database();try{
 const c=client(pg),d=morph(2200,'suffix');await saveDictionaryDraft(c,[d],false,true);await sql(pg,'select publish_dictionary_entry($1,true) v',[d.entry_id]);
 const exported=await c.rpc('export_dictionary_exchange_page',{kind_filters:['suffix'],status_filters:[],query_text:'',after_id:null,expected_scope:null,pending_only:false,preview_only:false});assert.ifError(exported.error);assert.equal(exported.data.records.length,1);
 const {parseExchange,draftFromExchange}=require('../src/features/dictionary/dictionaryExchange.ts'),document={format:'nexus-dictionary-exchange',schema_version:1,exported_at:new Date().toISOString(),scope:{kinds:['suffix'],statuses:[],query:''},records:exported.data.records};
 const restored=draftFromExchange(parseExchange(JSON.stringify(document)).records[0]);assert.deepEqual(restored.senses[0].variants,d.senses[0].variants);assert.equal(restored.senses[0].semantic_domain,'action');
 const {toAI,parseAI,planAI}=require('../src/features/dictionary/aiDictionary.ts'),snapshot=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[d.entry_id]),ai=toAI(snapshot,new Map());assert.deepEqual(parseAI(JSON.stringify({format:'nexus-dictionary-ai',version:1,entries:[ai]})).entries[0].meanings[0].variants,d.senses[0].variants);
 const review=await createDictionaryReview(c,snapshot),old=structuredClone(review.candidate);for(const k of ['semantic_domain','semantic_subdomain','variants'])delete old.bundle.dictionary_senses[0][k];old.bundle.dictionary_senses[0].gloss_zh_tw='old client edit';
 let saved=await sql(pg,'select save_dictionary_review($1,$2,$3) v',[review.id,review.revision,JSON.stringify(old)]);assert.deepEqual(saved.candidate.bundle.dictionary_senses[0].variants,d.senses[0].variants);assert.equal(saved.candidate.bundle.dictionary_senses[0].semantic_domain,'action');
 saved.candidate.bundle.dictionary_senses[0].variants=null;saved=await sql(pg,'select save_dictionary_review($1,$2,$3) v',[review.id,saved.revision,JSON.stringify(saved.candidate)]);assert.deepEqual(saved.candidate.bundle.dictionary_senses[0].variants,d.senses[0].variants);
 saved.candidate.bundle.dictionary_senses[0].variants=[];saved.candidate.bundle.dictionary_senses[0].semantic_domain=null;saved.candidate.bundle.dictionary_senses[0].semantic_subdomain=null;saved=await sql(pg,'select save_dictionary_review($1,$2,$3) v',[review.id,saved.revision,JSON.stringify(saved.candidate)]);assert.deepEqual(saved.candidate.bundle.dictionary_senses[0].variants,[]);assert.equal(saved.candidate.bundle.dictionary_senses[0].semantic_domain,null);
 await sql(pg,'select approve_dictionary_review($1,$2,true) v',[review.id,saved.revision]);assert.deepEqual((await sql(pg,'select get_published_dictionary_entry($1) v',[d.entry_id])).senses[0].variants,[]);
 const tampered=structuredClone(document);tampered.records[0].snapshot.detail.senses[0].unknown_field='must reject';assert.throws(()=>draftFromExchange(parseExchange(JSON.stringify(tampered)).records[0]),/unsupported field/);
 }finally{await pg.close();}});
test('conversion failure rolls back its Review and receipt; non-admins cannot prepare or read protected conversion plans',async()=>{const pg=await database();try{
 const c=client(pg),d=morph(2400);await saveDictionaryDraft(c,[d],false,true);await sql(pg,'select publish_dictionary_entry($1,true) v',[d.entry_id]);const before=await sql(pg,'select get_dictionary_ai_snapshot($1) v',[d.entry_id]);
 await pg.exec("reset role;create function public.fixture_fail_conversion_receipt() returns trigger language plpgsql as $$begin if new.source_type='morpheme_conversion' then raise exception 'fixture conversion receipt failure';end if;return new;end$$;create trigger fixture_conversion_receipt before insert on dictionary_import_operations for each row execute function public.fixture_fail_conversion_receipt();set role authenticated;");
 await assert.rejects(sql(pg,'select prepare_dictionary_morpheme_draft($1,$2,$3) v',[d.entry_id,JSON.stringify(before),id(2499)]),/fixture conversion receipt failure/);
 assert.deepEqual(await sql(pg,'select get_dictionary_ai_snapshot($1) v',[d.entry_id]),before);assert.equal((await pg.query('select count(*)::int n from dictionary_review_drafts where entry_id=$1',[d.entry_id])).rows[0].n,0);assert.equal((await pg.query('select count(*)::int n from dictionary_import_operations where operation_id=$1',[id(2499)])).rows[0].n,0);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(900001)]);await assert.rejects(sql(pg,'select prepare_dictionary_morpheme_draft($1,$2,$3) v',[d.entry_id,JSON.stringify(before),id(2498)]),/admin required/);await assert.rejects(sql(pg,'select preview_dictionary_morpheme_conversion(0) v'),/admin required/);await assert.rejects(sql(pg,'select get_dictionary_morpheme_links($1,$2,0) v',[d.entry_id,id(2401)]),/admin required/);
 }finally{await pg.close();}});
test('unknown installed contract fails the whole schema transaction, preserving indexes, columns and RPC permissions',async()=>{const pg=await base();try{
 await pg.exec('reset role');const old=await sql(pg,"select pg_get_functiondef('dictionary_guard_change()'::regprocedure) v");await pg.exec(old.replace('Entry kind is immutable','Unknown installed guard contract'));
 await assert.rejects(pg.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8')),/Unexpected kind guard/);await pg.exec('rollback');
 assert.equal(await sql(pg,"select count(*)::int v from information_schema.columns where table_schema='public' and table_name='dictionary_senses' and column_name='variants'"),0);assert.equal(await sql(pg,"select to_regclass('public.dictionary_component_equivalent_name') is not null v"),true);assert.equal(await sql(pg,"select to_regprocedure('public.search_dictionary_catalog(text,text,text,text,text[],text[],integer,boolean,text[])') is null v"),true);
 }finally{await pg.close();}});
