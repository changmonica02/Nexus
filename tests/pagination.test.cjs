require('./loadStudy.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {parsePage,totalPages,validDataPage}=require('../src/components/pagination/model.ts');
const {searchRelations}=require('../src/features/dictionary/browseRelations.ts');
const migration=fs.readdirSync('supabase/migrations').find(f=>f.endsWith('_dictionary_pagination_totals.sql'));
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('page input rejects invalid values without clamping, valid integers and empty/data boundaries',()=>{
 assert.equal(totalPages(631,20),32);assert.equal(totalPages(0,20),0);assert.equal(totalPages(20,20),1);
 for(const s of ['',' ','0','-1','1.2','abc','NaN','Infinity','33','1e1','+2'])assert.equal(parsePage(s,32),null,s);
 assert.equal(parsePage(' 4 ',32),3);assert.equal(parsePage('32',32),31);assert.equal(parsePage('1',0),null);
 assert.equal(validDataPage(8,22,20),1);assert.equal(validDataPage(8,0,20),0);
});
test('reverse/variant total uses the same exact-count query and preserves all conditions before paging',async()=>{
 const calls=[];const q={select(...args){calls.push(['select',...args]);return q;},eq(...a){calls.push(['eq',...a]);return q;},ilike(...a){calls.push(['ilike',...a]);return q;},order(...a){calls.push(['order',...a]);return q;},range(...a){calls.push(['range',...a]);return {data:[],count:45};}};
 const result=await searchRelations({from:()=>q},'word','%_',2,{component:id(1),sense:id(2),variant:'v'});assert.equal(result.total,45);assert.equal(result.page,2);
 assert.ok(calls.some(c=>c[0]==='select'&&c[2].count==='exact'));assert.ok(calls.some(c=>c[1]==='relations.target_entry_id'));assert.ok(calls.some(c=>c[1]==='relations.target_sense_id'));assert.deepEqual(calls.at(-1),['range',40,60]);
});
test('isolated SQL: reliable totals match filtered pages, prefix senses, inflections, All, empty/out-of-range and roles',async()=>{
 const pg=new PGlite();try{
 await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,anon;`);
 const files=['20260922_study_fsrs.sql','20260930_public_dictionary.sql','20261001_dictionary_admin.sql','20261002_dictionary_reader.sql','20261004_dictionary_delete_draft_sense.sql','20261005_dictionary_grouping.sql','20261006_dictionary_prefix_sense_groups.sql','20261007_dictionary_ai_roundtrip.sql','20261010_dictionary_delete_drafts.sql','20261011_dictionary_delete_draft_content.sql','20261012_dictionary_retire_sources.sql','20261013_dictionary_draft_pipeline.sql','20261014_dictionary_revision_lifecycle.sql','20261017_dictionary_entry_identity.sql','20261018_dictionary_pronunciations.sql','20261019_dictionary_admin_bulk_publish.sql','20261020_dictionary_edit_inflections.sql','20261021_dictionary_composition_shared.sql'];
 for(const f of files)await pg.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 await pg.query('insert into auth.users values($1),($2)',[id(1),id(2)]);await pg.query('insert into dictionary_admins(user_id) values($1)',[id(1)]);await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
 const sql=async(q,a=[])=>(await pg.query(q,a)).rows[0]?.v;
 const acl=()=>sql("select jsonb_agg(jsonb_build_object('sig',p.oid::regprocedure::text,'auth',has_function_privilege('authenticated',p.oid,'EXECUTE'),'anon',has_function_privilege('anon',p.oid,'EXECUTE'),'definer',p.prosecdef) order by p.oid::regprocedure::text) v from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'search_%dictionary%'");const oldAcl=await acl();
 await pg.exec('reset role');await pg.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));await pg.exec('set role authenticated');assert.deepEqual(await acl(),oldAcl);
 for(let n=0;n<45;n++){
 const bundle={dictionary_entries:[{id:id(100+n*10),kind:'word',headword:'item'+String(n).padStart(2,'0')}],dictionary_senses:[{id:id(101+n*10),entry_id:id(100+n*10),part_of_speech:'verb',gloss_zh_tw:'共同中文'}]};await sql('select apply_dictionary_bundle($1,false,false) v',[JSON.stringify(bundle)]);await sql('select publish_dictionary_entry($1,true) v',[id(100+n*10)]);
 }
 // One indexed attached form and a same-spelling direct headword coexist; no extra form entry is created.
 await pg.exec('reset role');await pg.query("insert into dictionary_entries(id,kind,headword) values($1,'word','secret')",[id(700)]);await pg.query("insert into dictionary_senses(id,entry_id,part_of_speech,gloss_zh_tw) values($1,$2,'verb','私密')",[id(701),id(700)]);await pg.query("insert into dictionary_inflections(id,entry_id,form_kind,form) values($1,$2,'past','item00')",[id(702),id(700)]);await pg.exec('set role authenticated');
 let r=await sql("select search_published_dictionary('word','item',2) v");assert.equal(r.total,45);assert.equal(r.items.length,5);assert.equal(r.has_more,false);
 r=await sql("select search_published_dictionary('all','item',0) v");assert.equal(r.total,45);assert.equal(r.items.length,20);
 r=await sql("select search_dictionary_with_inflections('all','共同中文',1) v");assert.equal(r.total,45);assert.equal(r.items.length,20);assert.equal(r.has_more,true);
 r=await sql("select search_dictionary_with_inflections('word','item00',0) v");assert.equal(r.total,1,'draft form must not affect counts');
 r=await sql("select search_dictionary_with_inflections('word','none',0) v");assert.equal(r.total,0);assert.deepEqual(r.items,[]);
 r=await sql("select search_dictionary_with_inflections('word','item',500) v");assert.equal(r.total,45);assert.deepEqual(r.items,[]);
 r=await sql("select search_dictionary_relation_targets('共同中文',1) v");assert.equal(r.total,45);assert.equal(r.page,1);assert.equal(r.items.length,20);
 for(const [kind,n] of [['prefix',800],['root',900]]){await sql('select apply_dictionary_bundle($1,false,false) v',[JSON.stringify({dictionary_entries:[{id:id(n),kind,headword:kind}],dictionary_senses:[{id:id(n+1),entry_id:id(n),part_of_speech:null,gloss_zh_tw:'義一'},{id:id(n+2),entry_id:id(n),part_of_speech:null,gloss_zh_tw:'義二'}]})]);await sql('select publish_dictionary_entry($1,true) v',[id(n)]);}
 r=await sql("select search_prefix_dictionary('prefix',0,'__ungrouped__') v");assert.equal(r.total,2);assert.equal(r.items.length,2,'prefix pagination counts Sense rows');
 r=await sql("select search_grouped_dictionary('root','root',0,'__ungrouped__') v");assert.equal(r.total,1);assert.equal(r.items.length,1);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);r=await sql("select search_dictionary_relation_targets('',0) v");assert.equal(r.total,0);assert.deepEqual(r.items,[]);r=await sql("select search_published_dictionary('all','',0) v");assert.equal(r.total,47);await assert.rejects(sql("select publish_dictionary_entry($1,true) v",[id(700)]),/admin/);
 await pg.exec('reset role;set role anon');await assert.rejects(sql("select search_published_dictionary('word','',0) v"),/permission/);
 }finally{await pg.close();}
});
