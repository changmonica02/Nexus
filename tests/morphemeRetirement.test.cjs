require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {database:before}=require('./fixtures/morphemeDatabase.cjs');
const {database,retire,sql,id,draft,client,owner,migrations}=require('./fixtures/morphemeRetirementDatabase.cjs');
const {saveDictionaryDraft,mapDictionaryDraft}=require('../src/features/dictionary/draftPipeline.ts');
const {createDictionaryReview}=require('../src/features/dictionary/revisionLifecycle.ts');
const {parseAI,toAI}=require('../src/features/dictionary/aiDictionary.ts');
const {draftFromExchange}=require('../src/features/dictionary/dictionaryExchange.ts');
const root=n=>({...draft(n),kind:'root',headword:'retirement-'+n,senses:[{id:id(n+1),part_of_speech:null,gloss_zh_tw:'current overview',semantic_domain:null,semantic_subdomain:null,variants:[{id:id(n+2),form:'modern-variant',condition:'current condition'}]}]});
const snapshot=(pg,entry)=>sql(pg,'select get_dictionary_ai_snapshot($1) v',[entry]);
const counts=pg=>sql(pg,"select jsonb_build_object('entries',(select md5(jsonb_agg(to_jsonb(t) order by id)::text) from dictionary_entries t),'senses',(select md5(jsonb_agg(to_jsonb(t) order by id)::text) from dictionary_senses t),'relations',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id),'[]')::text) from dictionary_relations t)) v");
const manifest=pg=>sql(pg,'select preview_dictionary_review_cleanup() v');
const clear=(pg,m,op=id(850001))=>sql(pg,'select clear_dictionary_pending_reviews($1,$2) v',[JSON.stringify(m),op]);
const source=()=>({type:'json',session_id:crypto.randomUUID(),preview_at:new Date().toISOString()});
async function stage(pg,entry,status='pending',s=source()){
 const proposal={key:crypto.randomUUID(),source:s,item:{draft:{...root(840000),entry_id:entry},status,issues:status==='unchanged'?[]:[{id:'fixture-issue',applied:false,allowedActions:['keep','review','later']} ]}};
 const result=await sql(pg,'select stage_dictionary_import_reviews($1) v',[JSON.stringify([proposal])]);return {proposal,row:result[0]};
}
test('retirement preserves published IDs/current variants/empty categories, drops legacy schema and searches only current forms',async()=>{
 const pg=await before();try{const d=root(810000);await saveDictionaryDraft(client(pg),[d],false,true);
 await pg.exec('reset role');await pg.query('insert into dictionary_entry_groups(id,primary_category,tags,variant_group) values($1,$2,$3,$4)',[d.entry_id,'空間、位置與環境',[],JSON.stringify({format:'nexus-variants-v1',rows:[{variant:'retired-variant',condition:'old'}]})]);await pg.exec('set role authenticated');
 await sql(pg,'select publish_dictionary_entry($1,true) v',[d.entry_id]);const baseline=await counts(pg);await retire(pg);assert.deepEqual(await counts(pg),baseline);
 const s=await snapshot(pg,d.entry_id);assert.equal('grouping'in s,false);assert.equal('sense_groups'in s,false);assert.deepEqual(s.detail.senses[0].variants,d.senses[0].variants);assert.equal(s.detail.senses[0].semantic_domain,null);
 assert.equal(await sql(pg,"select to_regclass('public.dictionary_entry_groups')::text v"),null);
 assert.equal(await sql(pg,"select to_regprocedure('public.prepare_dictionary_morpheme_draft(uuid,jsonb,uuid)')::text v"),null);
 const query=q=>sql(pg,'select search_dictionary_catalog(query_text=>$1) v',[q]);assert.equal((await query('retired-variant')).total,0);assert.equal((await query('modern-variant')).items[0].id,d.entry_id);
 assert.equal((await sql(pg,'select search_dictionary_relation_targets($1,0) v',['modern-variant'])).items[0].id,d.entry_id);
 const refs=await sql(pg,"select count(*) v from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and pg_get_functiondef(p.oid) ~ 'dictionary_entry_groups|dictionary_sense_groups'");assert.equal(Number(refs),0);
 }finally{await pg.close();}
});
test('new and legacy JSON roundtrip ignores retired fields, retains strict validation, current semantics and Review CAS',async()=>{
 const pg=await database();try{const d=root(820000);await saveDictionaryDraft(client(pg),[d],false,true);await sql(pg,'select publish_dictionary_entry($1,true) v',[d.entry_id]);const s=await snapshot(pg,d.entry_id);
 const old={...s,grouping:{primary_category:'old',variant_group:'retired'},sense_groups:{[id(820001)]:'old'}};
 const review=await createDictionaryReview(client(pg),old);assert.equal(review.state,'active');assert.equal('group_data'in review.candidate,false);
 const page=await client(pg).rpc('export_dictionary_exchange_page',{kind_filters:['root'],status_filters:[],query_text:'',after_id:null,expected_scope:null,pending_only:false,preview_only:false});assert.ifError(page.error);const exported=page.data.records[0];const loaded=draftFromExchange(exported);assert.deepEqual(loaded.senses[0].variants,d.senses[0].variants);assert.equal(JSON.stringify(exported).includes('primary_category'),false);
 const parsed=parseAI(JSON.stringify({format:'nexus-dictionary-ai',version:1,entries:[{...toAI(s,new Map()),grouping:{variant_group:'must not return'}}]}));assert.equal('grouping'in parsed.entries[0],false);
 assert.throws(()=>parseAI(JSON.stringify({format:'nexus-dictionary-ai',version:1,entries:[{...toAI(s,new Map()),unknown_field:true}]})),/不允許/);
 await assert.rejects(sql(pg,'select approve_dictionary_review($1,$2,true) v',[review.id,review.revision+1]),/revision conflict/i);
 await sql(pg,'select approve_dictionary_review($1,$2,true) v',[review.id,review.revision]);assert.equal((await snapshot(pg,d.entry_id)).detail.entry.status,'published');
 }finally{await pg.close();}
});
test('cleanup atomically clears only manifest pending IDs, preserves normal drafts/completed work, zero counts and idempotent receipts',async()=>{
 const pg=await database();try{const published=root(830000),normal=draft(831000);await saveDictionaryDraft(client(pg),[published,normal],false,true);await sql(pg,'select publish_dictionary_entry($1,true) v',[published.entry_id]);
 await createDictionaryReview(client(pg),await snapshot(pg,published.entry_id));const pending=await stage(pg,published.entry_id),stale=await stage(pg,published.entry_id,'stale'),failed=await stage(pg,published.entry_id,'failed'),completed=await stage(pg,published.entry_id,'unchanged');
 const baseline=await counts(pg),m=await manifest(pg);assert.equal(m.reviews.length,1);assert.equal(m.imports.length,3);const result=await clear(pg,m);assert.equal(result.reviews_cleared,1);assert.equal(result.imports_cleared,3);assert.deepEqual(await clear(pg,m),result);assert.deepEqual(await counts(pg),baseline);
 assert.equal(Number(await sql(pg,'select count(*) v from dictionary_import_review_items where id=$1',[completed.row.id])),1);
 assert.equal((await snapshot(pg,normal.entry_id)).detail.entry.status,'draft');assert.deepEqual(await manifest(pg),{imports:[],reviews:[]});
 const catalog=await sql(pg,"select search_dictionary_catalog(admin_mode=>true,work_filters=>array['red']) v");assert.equal(catalog.total,0);assert.equal(catalog.stats.red,0);
 const exp=await client(pg).rpc('export_dictionary_exchange_page',{kind_filters:['word','prefix','root','suffix'],status_filters:[],query_text:'',after_id:null,expected_scope:null,pending_only:true,preview_only:true});assert.ifError(exp.error);assert.equal(exp.data.total,0);
 await assert.rejects(sql(pg,'select stage_dictionary_import_reviews($1) v',[JSON.stringify([pending.proposal])]),/舊匯入預覽/);
 await stage(pg,published.entry_id);assert.equal((await manifest(pg)).imports.length,1);assert.deepEqual(await clear(pg,m),result);assert.equal((await manifest(pg)).imports.length,1);
 }finally{await pg.close();}
});
test('cleanup rejects stale manifest, changed revisions, non-admins and operation collisions without deleting any work',async()=>{
 const pg=await database();try{const d=root(840000);await saveDictionaryDraft(client(pg),[d],false,true);await sql(pg,'select publish_dictionary_entry($1,true) v',[d.entry_id]);await createDictionaryReview(client(pg),await snapshot(pg,d.entry_id));const m=await manifest(pg);await stage(pg,d.entry_id);
 await assert.rejects(clear(pg,m),/Pending reviews changed/);assert.equal((await manifest(pg)).reviews.length,1);
 const changed=await manifest(pg);await sql(pg,'select decide_dictionary_import_review($1,$2,$3,$4) v',[changed.imports[0].id,changed.imports[0].revision,'fixture-issue','keep']);await assert.rejects(clear(pg,changed),/Pending reviews changed/);
 const fresh=await manifest(pg);await pg.exec('set role anon');await assert.rejects(manifest(pg),/permission denied/);await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(900001)]);await assert.rejects(clear(pg,fresh),/admin required/);await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 await clear(pg,fresh);await assert.rejects(clear(pg,m),/identity conflict/);
 }finally{await pg.close();}
});
test('cleanup failure rolls back deletions and receipt; schema DDL also rolls back on unexpected dependencies',async()=>{
 const pg=await database();try{const d=root(850000);await saveDictionaryDraft(client(pg),[d],false,true);await sql(pg,'select publish_dictionary_entry($1,true) v',[d.entry_id]);await createDictionaryReview(client(pg),await snapshot(pg,d.entry_id));const m=await manifest(pg);
 await pg.exec("reset role;create function public.reject_cleanup_receipt() returns trigger language plpgsql as $$begin if new.request->>'maintenance'='review_cleanup' then raise exception 'isolated receipt failure';end if;return new;end$$;create trigger test_receipt before insert on dictionary_import_operations for each row execute function reject_cleanup_receipt();set role authenticated;");
 await assert.rejects(clear(pg,m),/isolated receipt failure/);assert.deepEqual(await manifest(pg),m);
 }finally{await pg.close();}
 const old=await before();try{await old.exec('reset role;create view legacy_dependency as select primary_category from dictionary_entry_groups;');await assert.rejects(old.exec(fs.readFileSync('supabase/migrations/'+migrations[0],'utf8')),/depend/);await old.exec('rollback');assert.ok(await sql(old,"select to_regclass('public.dictionary_entry_groups')::text v"));}finally{await old.close();}
});
