require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {listAdminEntries,searchRelationTargets,relationTargetSenses}=require('../src/features/dictionary/adminQueries.ts');
const {loadBrowsePage,readerNeighbours,browseContext,swipeDirection}=require('../src/features/dictionary/readerNavigation.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function mock(rows){const calls=[];return {calls,rpc:async(name,args)=>{assert.equal(name,'search_dictionary_with_inflections');calls.push(['rpc',name,args]);const data=rows.filter(r=>r.status==='published'&&(args.category==='all'||r.kind===args.category)&&r.headword.includes(args.query_text));return {data:{items:data.slice(args.page_number*20,args.page_number*20+20),has_more:data.length>args.page_number*20+20,page:args.page_number}};},from(table){calls.push(['from',table]);let data=[...rows],count=false;const q={select(s,opts){calls.push(['select',s,opts]);count=!!opts?.count;return q;},eq(k,v){calls.push(['eq',k,v]);data=data.filter(r=>r[k]===v);return q;},in(k,v){calls.push(['in',k,v]);data=data.filter(r=>v.includes(r[k]));return q;},ilike(k,v){calls.push(['ilike',k,v]);const term=v.replace(/^%|%$/g,'');data=data.filter(r=>r[k].toLowerCase().includes(term.toLowerCase()));return q;},order(k){calls.push(['order',k]);return q;},range(a,b){calls.push(['range',a,b]);return Promise.resolve({data:data.slice(a,b+1),count:count?data.length:null});},limit(n){calls.push(['limit',n]);return Promise.resolve({data:data.slice(0,n)});}};return q;}};}
test('Admin filters/search/order run before exact-count 100-row paging, including beyond 1000',async()=>{
 const rows=Array.from({length:1205},(_,i)=>({id:id(i),headword:`word${i}`,kind:'word',status:'draft'}));const c=mock(rows);
 const r=await listAdminEntries(c,{kinds:['word'],statuses:['draft'],query:'word',page:11});assert.equal(r.items.length,100);assert.equal(r.items[0].id,id(1100));assert.equal(r.total,1205);
 assert.deepEqual(c.calls.filter(c=>c[0]==='order'),[['order','headword'],['order','id']]);assert.deepEqual(c.calls.at(-1),['range',1100,1199]);assert.ok(!c.calls.some(c=>c[1]==='dictionary_senses'));
 assert.equal((await listAdminEntries(c,{kinds:['root'],statuses:[],query:'',page:0})).total,0);
});
test('Relation picker uses server Prefix/Root filtering limit 20; senses are entry-scoped',async()=>{
 const c=mock(Array.from({length:50},(_,i)=>({id:id(i),headword:'pre'+i,kind:i%2?'prefix':'word'})));assert.equal((await searchRelationTargets(c,'pre')).length,20);assert.deepEqual(c.calls.at(-1),['limit',20]);
 const senses=await relationTargetSenses({rpc:async(name,args)=>{assert.equal(name,'get_dictionary_entry');assert.equal(args.entry_uuid,id(1));return {data:{senses:[{id:id(2),entry_id:id(1)}]}};}},id(1));assert.equal(senses.length,1);
});
test('Previous/Next preserve search filters and cross page boundaries with bounded fetches',async()=>{
 const rows=Array.from({length:45},(_,i)=>({id:id(i),headword:'word'+i,kind:'word',status:'published'})),c=mock(rows);
 const from='/dictionary?kind=word&q=word&page=1';const n=await readerNeighbours(c,id(20),'word20',from);
 assert.equal(new URL(n.previous,'https://nexus.invalid').searchParams.get('from'),'/dictionary?kind=word&q=word&page=0');assert.ok(n.next.includes(id(21)));
 const end=await readerNeighbours(c,id(39),'word39',from);assert.equal(new URL(end.next,'https://nexus.invalid').searchParams.get('from'),'/dictionary?kind=word&q=word&page=2');
 assert.ok(c.calls.filter(x=>x[0]==='rpc').every(x=>x[1]==='search_dictionary_with_inflections'));
 assert.equal(browseContext('/dictionary/'+id(1)+'?from='+encodeURIComponent(from)),from);assert.equal(browseContext('https://evil.test/dictionary'),null);
 const groupCalls=[];const group={rpc:async(name,args)=>{groupCalls.push({name,args});return {data:{items:[{id:id(args.page_number),sense_id:id(args.page_number+100),headword:'p',kind:'prefix'}],has_more:true,page:args.page_number}};}};
 const g=await readerNeighbours(group,id(1),'p','/dictionary?kind=prefix&q=p&category=作用與變化&page=1',id(101));assert.ok(g.next.includes(id(2)));assert.equal(groupCalls[0].args.primary_category_filter,'作用與變化');
});
test('relation and variant browse filters remain server-side; swipe ignores edit/vertical/short/slow gestures',async()=>{
 const c=mock([]);await loadBrowsePage(c,'/dictionary?kind=word&component='+id(1)+'&sense='+id(2)+'&page=3');assert.ok(c.calls.some(x=>x[1]==='relations.target_entry_id'&&x[2]===id(1)));assert.ok(c.calls.some(x=>x[1]==='relations.target_sense_id'));
 await loadBrowsePage(c,'/dictionary?kind=root&variant=cept&page=2');assert.ok(c.calls.some(x=>x[1]==='grouping.variant_group'));
 assert.equal(swipeDirection(-100,10,300,false),'next');assert.equal(swipeDirection(100,10,300,false),'previous');for(const args of [[-100,10,300,true],[-50,0,300,false],[-100,90,300,false],[-100,0,800,false]])assert.equal(swipeDirection(...args),null);
});
const ts=require('typescript');require.extensions['.tsx']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,f);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
test('non-admin has no edit action; sense containers keep shared content separate without duplicate relations',()=>{
 const {DictionaryArticle,ReaderEditButton}=require('../src/features/dictionary/DictionaryBrowser.tsx');
 assert.equal(renderToStaticMarkup(React.createElement(ReaderEditButton,{admin:false,onClick(){}})),'');assert.ok(renderToStaticMarkup(React.createElement(ReaderEditButton,{admin:true,onClick(){}})).includes('編輯'));
 const d={entry:{id:id(1),kind:'word',headword:'read'},senses:[{id:id(2),gloss_zh_tw:'閱讀',part_of_speech:'verb'},{id:id(3),gloss_zh_tw:'讀物',part_of_speech:'noun'}],pronunciations:[{id:id(4),sense_id:id(2),ipa:'IPA',sort_order:0}],etymologies:[{id:id(5),sense_id:null,body:'SHARED HISTORY',verification:'pending'}],relations:[],learning_notes:[{id:id(6),sense_id:id(3),kind:'mnemonic_scenario',body:'STORY'}],related:[]};
 const html=renderToStaticMarkup(React.createElement(DictionaryArticle,{data:d,accordion:true}));assert.ok(html.indexOf('IPA')<html.indexOf('STORY'));assert.ok(html.indexOf('STORY')<html.indexOf('詞條共用'));assert.equal((html.match(/SHARED HISTORY/g)||[]).length,1);
});
test('select-all is page-only; editor uses shared draft/review flow and no table-wide senses load',()=>{
 const {toggleVisibleSelection}=require('../src/features/dictionary/DictionaryAdmin.tsx');const page=[{id:id(1)},{id:id(2)}];assert.deepEqual(toggleVisibleSelection(page,[]),[id(1),id(2)]);assert.deepEqual(toggleVisibleSelection(page,[id(1),id(2)]),[]);
 const admin=fs.readFileSync('src/features/dictionary/DictionaryAdmin.tsx','utf8'),reader=fs.readFileSync('src/features/dictionary/DictionaryBrowser.tsx','utf8');assert.ok(!admin.includes("from('dictionary_senses')"));assert.ok(admin.includes('listAdminEntries'));assert.ok(admin.includes('setSelected([]);setPage(p)'));assert.ok(admin.includes('if(entryId||newKind)return {items:[],total:0,page:0}'));
 for(const name of ['create_dictionary_edit_review','save_dictionary_review','approve_dictionary_review','saveDictionaryDraft'])assert.ok(admin.includes(name));assert.ok(reader.includes('entryId={id} embedded'));assert.ok(reader.includes('if(editing)return'));
});
test('local PostgreSQL bulk publication preflight rollback, multi-round dependencies, mixed invalid/blocked, stale and authorization',async()=>{
 const {PGlite}=require('@electric-sql/pglite'),pg=new PGlite();try{
 await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,anon;`);
 for(const f of ['20260922_study_fsrs.sql','20260930_public_dictionary.sql','20261001_dictionary_admin.sql','20261002_dictionary_reader.sql','20261004_dictionary_delete_draft_sense.sql','20261005_dictionary_grouping.sql','20261006_dictionary_prefix_sense_groups.sql','20261007_dictionary_ai_roundtrip.sql','20261010_dictionary_delete_drafts.sql','20261011_dictionary_delete_draft_content.sql','20261012_dictionary_retire_sources.sql','20261013_dictionary_draft_pipeline.sql','20261014_dictionary_revision_lifecycle.sql','20261017_dictionary_entry_identity.sql','20261018_dictionary_pronunciations.sql','20261019_dictionary_admin_bulk_publish.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 await pg.query('insert into auth.users values($1),($2)',[id(1),id(2)]);await pg.query('insert into dictionary_admins(user_id) values($1)',[id(1)]);await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
 const sql=async(q,a=[])=>(await pg.query(q,a)).rows[0]?.v;
 for(const [n,kind,word]of [[10,'word','batch-a'],[11,'prefix','batch-z'],[12,'word','batch-invalid'],[13,'word','batch-blocked'],[14,'root','outside']]){
 await pg.query('insert into dictionary_entries(id,kind,headword) values($1,$2,$3)',[id(n),kind,word]);if(n!==12)await pg.query('insert into dictionary_senses(id,entry_id,part_of_speech,gloss_zh_tw) values($1,$2,$3,$4)',[id(n+100),id(n),kind==='word'?'noun':null,'測試']);}
 for(const [n,source,target]of [[201,10,11],[202,13,14]])await pg.query("insert into dictionary_relations(id,entry_id,sense_id,target_entry_id,target_sense_id,relation_kind,verification) values($1,$2,$3,$4,$5,'learning_decomposition','pending')",[id(n),id(source),id(source+100),id(target),id(target+100)]);
 const audit=await sql('select count(*)::int v from dictionary_audit');const p=await sql("select preview_dictionary_bulk_publish('{}','batch') v");assert.deepEqual([p.total,p.ready,p.blocked,p.invalid],[4,2,1,1]);assert.equal(await sql('select count(*)::int v from dictionary_audit'),audit);assert.equal(await sql("select count(*)::int v from dictionary_entries where status='published'"),0);
 const wordOnly=await sql("select preview_dictionary_bulk_publish(array['word'],'batch') v");assert.deepEqual([wordOnly.ready,wordOnly.blocked,wordOnly.invalid],[0,2,1]);
 await pg.query("update dictionary_entries set headword='batch-z-edit' where id=$1",[id(11)]);await assert.rejects(pg.query("select publish_dictionary_bulk('{}','batch',$1)",[p.signature]),/stale/);
 const current=await sql("select preview_dictionary_bulk_publish('{}','batch') v");const done=await sql("select publish_dictionary_bulk('{}','batch',$1) v",[current.signature]);assert.equal(done.published,2);assert.equal((await sql('select get_published_dictionary_entry($1) v',[id(10)])).entry.id,id(10));assert.equal(await sql('select get_published_dictionary_entry($1) v',[id(13)]),null);
 // Existing Word -> Prefix/Root guards prohibit cycles. No trigger or constraint is disabled.
 await assert.rejects(pg.query("insert into dictionary_relations(id,entry_id,sense_id,target_entry_id,target_sense_id,relation_kind,verification) values($1,$2,$3,$4,$5,'learning_decomposition','pending')",[id(203),id(14),id(114),id(13),id(113)]),/Relations must connect/);
 const migration=fs.readFileSync('supabase/migrations/20261019_dictionary_admin_bulk_publish.sql','utf8');assert.ok(migration.includes('cardinality(eligible)=0'));assert.ok(migration.includes('attempted<batch_size'));
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);await assert.rejects(pg.query("select preview_dictionary_bulk_publish('{}','')"),/admin/);await assert.rejects(pg.query("select publish_dictionary_bulk('{}','',$1)",[current.signature]),/admin/);await assert.rejects(pg.query("select dictionary_bulk_publish_work('{}','',false,null)"),/permission/);
 }finally{await pg.close();}
});
