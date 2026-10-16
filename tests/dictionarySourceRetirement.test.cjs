require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{PGlite}=require('@electric-sql/pglite');
const {parseDictionaryImport}=require('../src/features/dictionary/adminImport.ts');
const {parseAI,toAI,planAI,submitAI,readAI}=require('../src/features/dictionary/aiDictionary.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const migration='20261012_dictionary_retire_sources.sql';
const csv=`entry_id,sense_id,headword,part_of_speech,gloss_zh_tw\n${id(40)},${id(41)},apple,noun,蘋果`;
test('five-column CSV, Markdown own attribution, JSON and AI reject retired fields and need no source records',async()=>{
 const bundle=await parseDictionaryImport(csv,'csv');assert.equal(bundle.dictionary_sources,undefined);assert.deepEqual(bundle.dictionary_entries,[{id:id(40),kind:'word',headword:'apple'}]);
 await assert.rejects(parseDictionaryImport(csv.replace('gloss_zh_tw','gloss_zh_tw,citation,license').replace('蘋果','蘋果,old,old'),'csv'),/已淘汰/);
 const md=`---\nid: ${id(42)}\nentry_id: ${id(40)}\nkind: historical_etymology\ndata_source: 書籍第 1 頁\n---\n歷史正文`;
 const parsed=await parseDictionaryImport(md,'md');assert.equal(parsed.dictionary_etymologies[0].data_source,'書籍第 1 頁');assert.equal(parsed.dictionary_sources,undefined);
 await assert.rejects(parseDictionaryImport(md.replace('data_source:', 'citation:'),'md'),/已淘汰/);
 assert.deepEqual(await parseDictionaryImport(JSON.stringify(bundle),'json'),bundle);
 for(const value of [{dictionary_sources:[]},{dictionary_entries:[{...bundle.dictionary_entries[0],source_id:id(3)}]}])await assert.rejects(parseDictionaryImport(JSON.stringify(value),'json'),/已淘汰/);
 assert.throws(()=>parseAI(JSON.stringify({format:'nexus-dictionary-ai',version:1,entries:[{type:'word',headword:'a',sources:[]}]})),/已淘汰/);
});
test('migration preserves all legacy rows/audit; source-free RPCs, AI reviews, Reader isolation, deletions and rollback work',async()=>{
 const pg=new PGlite();try{
 await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,anon;`);
 for(const f of ['20260922_study_fsrs.sql','20260930_public_dictionary.sql','20261001_dictionary_admin.sql','20261002_dictionary_reader.sql','20261005_dictionary_grouping.sql','20261006_dictionary_prefix_sense_groups.sql','20261007_dictionary_ai_roundtrip.sql','20261010_dictionary_delete_drafts.sql','20261011_dictionary_delete_draft_content.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 await pg.query('insert into auth.users values($1),($2)',[id(1),id(2)]);await pg.query('insert into dictionary_admins(user_id) values($1)',[id(1)]);await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
 await pg.query("insert into dictionary_sources(id,citation,license,raw_text) values($1,'legacy citation','legacy license','legacy raw')",[id(3)]);
 for(const [n,kind]of [[10,'root'],[20,'word'],[30,'prefix']]){await pg.query('insert into dictionary_entries(id,kind,headword,source_id) values($1,$2,$3,$4)',[id(n),kind,'head'+n,id(3)]);await pg.query("insert into dictionary_senses(id,entry_id,part_of_speech,gloss_zh_tw,source_id) values($1,$2,'noun','義項',$3)",[id(n+1),id(n),id(3)]);}
 await pg.query("insert into dictionary_relations(entry_id,sense_id,target_entry_id,target_sense_id,relation_kind,source_id) values($1,$2,$3,$4,'learning_decomposition',$5)",[id(20),id(21),id(10),id(11),id(3)]);
 await pg.query("insert into dictionary_etymologies(id,entry_id,body,verification_note,source_id) values($1,$2,'歷史','資料來源原文',$3)",[id(22),id(20),id(3)]);
 await pg.query("insert into dictionary_learning_notes(entry_id,kind,body,source_id) values($1,'mnemonic_scenario','故事',$2)",[id(20),id(3)]);
 await pg.query('select publish_dictionary_entry($1)',[id(10)]);await pg.query('select publish_dictionary_entry($1)',[id(20)]);
 await pg.exec('reset role');await pg.query('insert into dictionary_ai_metadata(entry_id,source_ids) values($1,$2)',[id(30),[id(3)]]);
 const tables=['dictionary_sources','dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_audit','dictionary_ai_metadata'];
 const before={};for(const t of tables)before[t]=(await pg.query(`select * from ${t} order by ${t==='dictionary_ai_metadata'?'entry_id':'id'}`)).rows;
 await pg.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));
 for(const t of tables)assert.deepEqual((await pg.query(`select * from ${t} order by ${t==='dictionary_ai_metadata'?'entry_id':'id'}`)).rows,before[t],t);
 await pg.exec('reset role');await pg.exec(fs.readFileSync('supabase/migrations/20261013_dictionary_draft_pipeline.sql','utf8'));await pg.exec(fs.readFileSync('supabase/migrations/20261014_dictionary_revision_lifecycle.sql','utf8'));
 for(const f of ['20261017_dictionary_entry_identity.sql', '20261018_dictionary_pronunciations.sql', '20261019_dictionary_admin_bulk_publish.sql', '20261020_dictionary_edit_inflections.sql', '20261021_dictionary_composition_shared.sql', '20261016060000_dictionary_retire_verification_state.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));await pg.exec('set role authenticated');
 const client={rpc:async(name,args)=>{try{let result;if(name==='get_dictionary_ai_snapshot')result=await pg.query('select get_dictionary_ai_snapshot($1) as data',[args.entry_uuid]);else if(name==='create_dictionary_review')result=await pg.query('select create_dictionary_review($1,$2,$3,$4,$5) as data',[args.entry_uuid,JSON.stringify(args.expected_snapshot),JSON.stringify(args.patch),args.source_type,args.preview]);else if(name==='apply_dictionary_drafts')result=await pg.query('select apply_dictionary_drafts($1,$2,$3) as data',[JSON.stringify(args.drafts),args.preview,args.allow_edits]);else result=await pg.query('select apply_dictionary_ai_change($1,$2,$3,$4,$5,$6,$7,$8) as data',[args.entry_uuid,args.expected_snapshot,args.bundle,args.group_data,args.sense_groups,args.component_order,args.origin_ids,args.preview]);return {data:result.rows[0].data,error:null};}catch(error){return {error};}}};
 const bundle=await parseDictionaryImport(csv,'csv');const apply=(b,preview=false)=>pg.query('select apply_dictionary_bundle($1,$2,true) as result',[b,preview]);
 await apply(bundle,true);assert.equal((await pg.query('select * from dictionary_entries where id=$1',[id(40)])).rows.length,0);await apply(bundle);assert.equal((await apply(bundle)).rows[0].result.skipped,2);
 await assert.rejects(apply({dictionary_sources:[]}),/retired/);await assert.rejects(apply({dictionary_entries:[{...bundle.dictionary_entries[0],source_id:id(3)}]}),/Unexpected field/);
 await assert.rejects(pg.query("insert into dictionary_sources(citation,license,raw_text) values('x','x','x')"),/permission/);
 const snapshot=await readAI(client,id(20));assert.ok(!JSON.stringify(snapshot).includes('source_id'));assert.equal(snapshot.detail.etymologies[0].data_source,'資料來源原文');
 const targets=new Map([[id(10),await readAI(client,id(10))]]);const exported=toAI(snapshot,targets);assert.ok(!/source_id|citation|license|"sources"/.test(JSON.stringify(exported)));assert.equal(exported.etymology[0].data_source,'資料來源原文');
 let n=100;const plan=planAI({...exported,headword:'new draft'},snapshot,targets,()=>id(n++));await submitAI(client,plan,true);assert.equal((await pg.query('select * from dictionary_review_drafts')).rows.length,0);const created=await submitAI(client,plan,false);
 assert.equal(created.state,'active');assert.equal((await pg.query('select headword from dictionary_entries where id=$1',[id(20)])).rows[0].headword,'head20');
 const draft=await readAI(client,id(40));const stale=planAI({...toAI(draft,new Map()),headword:'edit'},draft,new Map());await pg.query("update dictionary_entries set headword='other' where id=$1",[id(40)]);await assert.rejects(submitAI(client,stale,false),/Revision conflict/);
 for(const type of ['root','prefix']){const input=parseAI(JSON.stringify({format:'nexus-dictionary-ai',version:1,entries:[{type,headword:type,meanings:[{zh_tw:'意思'}]}]})).entries[0];await submitAI(client,planAI(input,null,new Map(),()=>id(n++)),false);}
 await pg.query('select discard_dictionary_review($1,$2)',[created.id,created.revision]);assert.equal((await pg.query('select * from dictionary_entries where id=$1',[plan.target_id])).rows.length,1);
 assert.equal((await pg.query('select * from dictionary_sources')).rows.length,1);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);
 const pub=(await pg.query('select get_published_dictionary_entry($1) as data',[id(20)])).rows[0].data;assert.ok(!/source_id|citation|license|"sources"/.test(JSON.stringify(pub)));assert.equal(pub.etymologies[0].data_source,'資料來源原文');assert.equal((await pg.query('select get_published_dictionary_entry($1) as data',[id(40)])).rows[0].data,null);
 await assert.rejects(apply(bundle),/admin/);await assert.rejects(pg.query('select delete_dictionary_drafts($1)',[JSON.stringify([{id:id(30),revision:1}])]),/admin/);
 await pg.exec('reset role;set role anon');await assert.rejects(pg.query('select get_published_dictionary_entry($1)',[id(20)]),/permission/);
 }finally{await pg.close();}
});
