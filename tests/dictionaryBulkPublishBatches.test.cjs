const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function database(){const pg=new PGlite();
 await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,anon;`);
 for(const f of ['20260922_study_fsrs.sql','20260930_public_dictionary.sql','20261001_dictionary_admin.sql','20261002_dictionary_reader.sql','20261004_dictionary_delete_draft_sense.sql','20261005_dictionary_grouping.sql','20261006_dictionary_prefix_sense_groups.sql','20261007_dictionary_ai_roundtrip.sql','20261010_dictionary_delete_drafts.sql','20261011_dictionary_delete_draft_content.sql','20261012_dictionary_retire_sources.sql','20261013_dictionary_draft_pipeline.sql','20261014_dictionary_revision_lifecycle.sql','20261017_dictionary_entry_identity.sql','20261018_dictionary_pronunciations.sql','20261019_dictionary_admin_bulk_publish.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 await pg.query('insert into auth.users values($1),($2)',[id(1),id(2)]);await pg.query('insert into dictionary_admins(user_id) values($1)',[id(1)]);await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);

 return pg;
}
const sql=async(pg,q,a=[])=>(await pg.query(q,a)).rows[0]?.v;
const preview=(pg,q)=>sql(pg,"select preview_dictionary_bulk_publish('{}',$1) v",[q]);
const publish=(pg,q,token)=>sql(pg,"select publish_dictionary_bulk('{}',$1,$2) v",[q,token]);
async function seed(pg,prefix,count,kind='word'){
 await pg.query("insert into dictionary_entries(id,kind,headword) select md5($1||n)::uuid,$3,$1||lpad(n::text,5,'0') from generate_series(1,$2::int) n",[prefix,count,kind]);
 await pg.query("insert into dictionary_senses(id,entry_id,part_of_speech,gloss_zh_tw) select md5('sense:'||id)::uuid,id,case when kind='word' then 'noun' else null end,'測試' from dictionary_entries where headword like $1",[prefix+'%']);
}
test('5001 actual drafts: analytical preview, max 200 attempts/transaction, continuation, stale child and new membership',async()=>{
 const pg=await database();try{
 await seed(pg,'scale-',5001);
 const audit=await sql(pg,'select count(*)::int v from dictionary_audit');
 const p=await preview(pg,'scale-');assert.equal(p.total,5001);assert.equal(p.ready,5001);assert.equal(p.attempted,0);assert.equal(p.batch_size,200);
 assert.equal(await sql(pg,'select count(*)::int v from dictionary_audit'),audit);assert.equal(await sql(pg,"select count(*)::int v from dictionary_entries where status='published'"),0);
 const a=await publish(pg,'scale-',p.signature);assert.equal(a.published,200);assert.equal(a.attempted,200);assert.equal(a.remaining,4801);assert.equal(a.continuation,true);assert.equal(a.signature,p.signature);
 const b=await publish(pg,'scale-',p.signature);assert.equal(b.published,200);assert.equal(b.published_total,400);assert.equal(b.remaining,4601);
 assert.equal(await sql(pg,"select count(*)::int v from dictionary_entries where status='published'"),400);
 // One pending child is changed without changing its parent's technical revision.
 const next=await sql(pg,"select (n->>'id')::uuid v from dictionary_bulk_publish_previews p cross join lateral jsonb_array_elements(p.plan) n where p.id=$1 and n->>'state'='pending' order by n->>'id' limit 1",[p.signature]).catch(()=>null);
 // Preview bookkeeping is private even to ordinary admin-role SQL, read via the test owner only.
 assert.equal(next,null);
 await pg.exec('reset role');const pending=await sql(pg,"select n->>'id' v from dictionary_bulk_publish_previews p cross join lateral jsonb_array_elements(p.plan) n where p.id=$1 and n->>'state'='pending' order by n->>'id' limit 1",[p.signature]);await pg.exec('set role authenticated');
 await pg.query("update dictionary_senses set gloss_zh_tw='修改後' where entry_id=$1",[pending]);
 await assert.rejects(publish(pg,'scale-',p.signature),/stale.*content/);assert.equal(await sql(pg,"select count(*)::int v from dictionary_entries where status='published'"),400);
 const fresh=await preview(pg,'scale-');await seed(pg,'scale-new-',1);await assert.rejects(publish(pg,'scale-',fresh.signature),/stale.*membership/);
 const source=fs.readFileSync('supabase/migrations/20261019_dictionary_admin_bulk_publish.sql','utf8');assert.ok(!source.includes('get_dictionary_ai_snapshot'));assert.ok(!source.includes("set status='published'"));
 }finally{await pg.close();}
});
test('dependency progresses across transactions; shared token finishes and retries do not republish',async()=>{
 const pg=await database();try{
 // Deterministic UUID order puts 200 roots in the first batch and their Word in the next.
 await pg.query("insert into dictionary_entries(id,kind,headword) select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'root','chain-root-'||n from generate_series(10,209) n");
 await pg.query("insert into dictionary_senses(id,entry_id,gloss_zh_tw) select md5('sense:'||id)::uuid,id,'根' from dictionary_entries");
 await pg.query("insert into dictionary_entries(id,kind,headword) values($1,'word','chain-word')",[id(900)]);
 await pg.query("insert into dictionary_senses(id,entry_id,part_of_speech,gloss_zh_tw) values($1,$2,'noun','詞')",[id(901),id(900)]);
 await pg.query("insert into dictionary_relations(id,entry_id,sense_id,target_entry_id,target_sense_id,relation_kind,verification) select $1,$2,$3,e.id,s.id,'learning_decomposition','pending' from dictionary_entries e join dictionary_senses s on s.entry_id=e.id where e.id=$4",[id(902),id(900),id(901),id(10)]);
 const p=await preview(pg,'chain-');assert.equal(p.ready,201);
 const a=await publish(pg,'chain-',p.signature);assert.equal(a.published,200);assert.equal(a.remaining,1);assert.equal(a.continuation,true);assert.equal(await sql(pg,'select status v from dictionary_entries where id=$1',[id(900)]),'draft');
 const b=await publish(pg,'chain-',p.signature);assert.equal(b.published,1);assert.equal(b.remaining,0);assert.equal(b.continuation,false);assert.equal(b.published_total,201);
 const audit=await sql(pg,'select count(*)::int v from dictionary_audit');const retry=await publish(pg,'chain-',p.signature);assert.equal(retry.published,0);assert.equal(retry.remaining,0);assert.equal(retry.no_progress,true);assert.equal(await sql(pg,'select count(*)::int v from dictionary_audit'),audit);
 }finally{await pg.close();}
});
test('execution guard failures become invalid, dependent work becomes blocked, no-progress stops, and scope/actor cannot change',async()=>{
 const pg=await database();try{
 await seed(pg,'reject-root-',1,'root');await seed(pg,'reject-word-',1);
 await pg.query("insert into dictionary_relations(id,entry_id,sense_id,target_entry_id,target_sense_id,relation_kind,verification) select $1,w.id,ws.id,r.id,rs.id,'learning_decomposition','pending' from dictionary_entries w join dictionary_senses ws on ws.entry_id=w.id cross join dictionary_entries r join dictionary_senses rs on rs.entry_id=r.id where w.kind='word' and r.kind='root'",[id(100)]);
 // Add an execution-time guard, never disable or replace the existing publication authority.
 await pg.exec(`reset role;create function test_reject_publish() returns trigger language plpgsql as $$begin if new.kind='root' and new.status='published' then raise exception 'extra publication validation';end if;return new;end$$;create trigger test_reject before update on dictionary_entries for each row execute function test_reject_publish();set role authenticated;`);
 const p=await preview(pg,'reject-');assert.equal(p.ready,2);assert.equal(p.invalid,0);
 await assert.rejects(publish(pg,'other-',p.signature),/filter changed/);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);await assert.rejects(publish(pg,'reject-',p.signature),/admin/);
 await pg.exec('reset role');await pg.query('insert into dictionary_admins(user_id) values($1)',[id(2)]);await pg.exec('set role authenticated');await assert.rejects(publish(pg,'reject-',p.signature),/stale/);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
 const audit=await sql(pg,'select count(*)::int v from dictionary_audit');const a=await publish(pg,'reject-',p.signature);assert.equal(a.published,0);assert.equal(a.invalid,1);assert.equal(a.blocked,1);assert.equal(a.remaining,0);assert.equal(a.continuation,false);assert.equal(a.attempted,1);assert.equal(await sql(pg,'select count(*)::int v from dictionary_audit'),audit);
 const retry=await publish(pg,'reject-',p.signature);assert.equal(retry.no_progress,true);assert.equal(retry.attempted,0);assert.equal(retry.continuation,false);
 // Expiration and client table writes are also rejected.
 await assert.rejects(pg.query('delete from dictionary_bulk_publish_previews'),/permission/);
 await pg.exec("reset role;update dictionary_bulk_publish_previews set expires_at=now()-interval '1 second';set role authenticated");await assert.rejects(publish(pg,'reject-',p.signature),/expired/);
 }finally{await pg.close();}
});

test('UI continuation uses one RPC per batch, stops on remaining=0/no-progress and preserves errors for retry',async()=>{
 require('./loadStudy.cjs');const ts=require('typescript');require.extensions['.tsx']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,f);
 const {continueDictionaryBulk}=require('../src/features/dictionary/DictionaryBulkPublish.tsx');
 const progress=[];let calls=0;await continueDictionaryBulk(async()=>{calls++;return {published:200,remaining:Math.max(0,5001-calls*200),continuation:calls<26,attempted:200};},r=>progress.push(r));assert.equal(calls,26);assert.equal(progress.length,26);
 calls=0;await continueDictionaryBulk(async()=>{calls++;return {remaining:2,continuation:true,no_progress:true,attempted:0};},()=>{});assert.equal(calls,1);
 await assert.rejects(continueDictionaryBulk(async()=>{throw Error('connection lost');},()=>{}),/connection lost/);
 await assert.rejects(continueDictionaryBulk(async()=>({remaining:1,continuation:true,attempted:0}),()=>{}),/沒有進展/);
});
