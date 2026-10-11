require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{PGlite}=require('@electric-sql/pglite');
const {parseDictionaryCSV,parseDictionaryCSVPreview,dictionaryCSVHeaders,exportDictionaryCSV,dictionaryCSVExample}=require('../src/features/dictionary/dictionaryCSV.ts');
const {mapDictionaryDraft,saveDictionaryDraft}=require('../src/features/dictionary/draftPipeline.ts');
const {classifyImport,buildImportSession,chooseIssue,applyBatchDecision,canBatchDecision,applyImportItems,sessionCounts,resolveImportItem}=require('../src/features/dictionary/importReview.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const csv=rows=>dictionaryCSVHeaders.join(',')+'\n'+rows.map(r=>dictionaryCSVHeaders.map(h=>'"'+String(r[h]??'').replaceAll('"','""')+'"').join(',')).join('\n');
const row=(n,more={})=>({kind:'word',entry_id:id(n),sense_id:id(n+1),headword:'word'+n,part_of_speech:'noun',gloss_zh_tw:'義'+n,...more});
const empty={snapshot:null,similar:[],identities:{}};
const snapshot=d=>({snapshot:{detail:{entry:{id:d.entry_id,kind:d.kind,headword:d.headword,status:'draft',revision:1},senses:d.senses.map(s=>({...s,entry_id:d.entry_id,revision:1})),relations:[],learning_notes:[],etymologies:[],examples:[],lexical_annotations:[]},grouping:null,sense_groups:{},metadata:null},similar:[],identities:{}});

test('CSV v1 is exactly 12 columns; explicit Entry/Sense identity survives rename, reorder, headword/gloss edits',async()=>{
 assert.equal(dictionaryCSVHeaders.length,12);assert.equal(dictionaryCSVExample.split('\n')[0].split(',').length,12);
 const a=row(10),b=row(20);const first=await parseDictionaryCSV(csv([a,b]));const renamedFile=await parseDictionaryCSV(csv([a,b]));assert.deepEqual(first.map(d=>[d.entry_id,d.senses[0].id]),renamedFile.map(d=>[d.entry_id,d.senses[0].id]));
 const reordered=await parseDictionaryCSV(csv([b,{...a,headword:'edited',gloss_zh_tw:'改義'}]));assert.equal(reordered[1].entry_id,first[0].entry_id);assert.equal(reordered[1].senses[0].id,first[0].senses[0].id);
 const again=await parseDictionaryCSV(exportDictionaryCSV(reordered));assert.deepEqual(again.map(d=>[d.entry_id,d.senses[0].id]),reordered.map(d=>[d.entry_id,d.senses[0].id]));
});
test('blank IDs are proposed once per Preview, not derived from CSV content or position',async()=>{
 const raw=csv([row(10,{entry_id:'',sense_id:''})]);const a=await parseDictionaryCSV(raw),b=await parseDictionaryCSV(raw);assert.notEqual(a[0].entry_id,b[0].entry_id);assert.notEqual(a[0].senses[0].id,b[0].senses[0].id);
 const stored=JSON.parse(JSON.stringify(a));assert.deepEqual(mapDictionaryDraft(stored[0]),mapDictionaryDraft(a[0]));
});
test('invalid rows remain Review without blocking safe rows',async()=>{
 const {drafts,issues}=await parseDictionaryCSVPreview(csv([row(10),row(20,{part_of_speech:''})]));
 const s=await buildImportSession({rpc:async()=>({data:[empty]})},id(1),'csv',drafts,issues);assert.equal(s.items.filter(i=>i.bucket==='safe').length,1);assert.equal(s.items.filter(i=>i.bucket==='review').length,1);assert.ok(s.items.find(i=>i.bucket==='review').issues.every(i=>i.allowedActions.join(',')==='skip,later'));
});
test('unchanged is safe; content, category, homographs, ID ownership and Published have specific actions',async()=>{
 const [d]=await parseDictionaryCSV(csv([row(10)])),c=snapshot(d);assert.equal(classifyImport(d,c).bucket,'safe');
 const changed=structuredClone(d);changed.senses[0].gloss_zh_tw='changed';const review=classifyImport(changed,c);const issue=review.issues.find(i=>i.field==='gloss_zh_tw');assert.deepEqual(issue.allowedActions,['incoming','new_sense','keep','later']);assert.throws(()=>chooseIssue(review,issue.id,'new_entry'),/不允許/);
 const keep=chooseIssue(review,issue.id,'keep');assert.equal(resolveImportItem(keep).effect,'unchanged');
 const newSense=chooseIssue(review,issue.id,'new_sense');assert.equal(resolveImportItem(newSense).draft.entry_id,d.entry_id);assert.notEqual(resolveImportItem(newSense).draft.senses[0].id,d.senses[0].id);
 c.snapshot.detail.entry.status='published';const pub=classifyImport(changed,c);assert.equal(pub.bucket,'review');assert.ok(pub.issues.every(i=>!i.allowedActions.includes('incoming')));
 const homograph=classifyImport(d,{...empty,similar:[{id:id(200),kind:'word',headword:d.headword,status:'draft',revision:1}]});assert.deepEqual(homograph.issues[0].allowedActions,['skip','later']);
 const collision=classifyImport(d,{...empty,identities:{dictionary_senses:[{id:d.senses[0].id,entry_id:id(300)}]}});assert.equal(collision.issues[0].type,'identity_owner');
});
test('batch decisions require same category, kind, missing-value precondition and action semantics',async()=>{
 const ds=await parseDictionaryCSV(csv([row(10,{kind:'prefix',part_of_speech:'',category:'作用與變化'}),row(20,{kind:'prefix',part_of_speech:'',category:'作用與變化'}),row(30,{kind:'prefix',part_of_speech:'',category:'數值、量與程度'})]));
 const items=ds.map(d=>{const c=snapshot(d);delete c.snapshot.detail.senses[0].category;return classifyImport(d,c);});
 const [a,b,c]=items.map(i=>i.issues[0]);assert.ok(canBatchDecision(a,b,'fill'));assert.equal(canBatchDecision(a,c,'fill'),false);assert.equal(canBatchDecision(a,b,'incoming'),false);
 const s={id:id(1),owner_id:id(2),source_type:'csv',preview_at:new Date().toISOString(),items};const decided=applyBatchDecision(s,items[0].id,a.id,'fill');assert.equal(decided.items[0].issues[0].selectedAction,'fill');assert.equal(decided.items[1].issues[0].selectedAction,'fill');assert.equal(decided.items[2].issues[0].selectedAction,null);assert.throws(()=>applyBatchDecision(s,items[0].id,a.id,'incoming'),/不允許/);
});

test('local PostgreSQL: partial apply, stable IDs, revision/status/identity/field stale guards, receipts, RLS and rollback',async()=>{
 const pg=new PGlite();try{
 await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,anon;`);
 for(const f of ['20260922_study_fsrs.sql','20260930_public_dictionary.sql','20261001_dictionary_admin.sql','20261002_dictionary_reader.sql','20261005_dictionary_grouping.sql','20261006_dictionary_prefix_sense_groups.sql','20261007_dictionary_ai_roundtrip.sql','20261010_dictionary_delete_drafts.sql','20261011_dictionary_delete_draft_content.sql','20261012_dictionary_retire_sources.sql','20261013_dictionary_draft_pipeline.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 await pg.query('insert into auth.users values($1),($2)',[id(1),id(2)]);await pg.query('insert into dictionary_admins(user_id) values($1)',[id(1)]);await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
 const client={rpc:async(name,args)=>{try{let q,values;if(name==='apply_dictionary_drafts'){q='select apply_dictionary_drafts($1,$2,$3) as data';values=[JSON.stringify(args.drafts),args.preview,args.allow_edits];}else if(name==='inspect_dictionary_import'){q='select inspect_dictionary_import($1) as data';values=[JSON.stringify(args.drafts)];}else if(name==='apply_dictionary_import_operation'){q='select apply_dictionary_import_operation($1) as data';values=[JSON.stringify(args.operation)];}else throw Error(name);return {data:(await pg.query(q,values)).rows[0].data};}catch(error){return {error};}}};
 const parse=rows=>parseDictionaryCSV(csv(rows));const preview=async rows=>buildImportSession(client,id(1),'csv',await parse(rows));let durable;
 const persist=async s=>{durable=structuredClone(s);};
 const blank=await preview([row(10,{entry_id:'',sense_id:'',example_words:'example',source_forms:'form',relation_hint:'hint'})]);const ids=[blank.items[0].draft.entry_id,blank.items[0].draft.senses[0].id];assert.equal((await pg.query('select count(*)::int n from dictionary_audit')).rows[0].n,0);
 const applied=await applyImportItems(client,blank,false,persist);assert.equal(applied.items[0].status,'applied');assert.equal((await pg.query('select id from dictionary_entries')).rows[0].id,ids[0]);assert.equal((await pg.query('select id from dictionary_senses')).rows[0].id,ids[1]);assert.equal((await pg.query('select count(*)::int n from dictionary_examples')).rows[0].n,1);assert.equal((await pg.query('select count(*)::int n from dictionary_lexical_annotations')).rows[0].n,2);assert.equal((await pg.query('select count(*)::int n from dictionary_relations')).rows[0].n,0);
 const stableRaw=exportDictionaryCSV([applied.items[0].appliedDraft]);const replay=await buildImportSession(client,id(1),'csv',await parseDictionaryCSV(stableRaw));assert.equal(replay.items[0].safeAction,'unchanged');assert.equal(replay.items[0].bucket,'safe');const before=(await pg.query('select count(*)::int n from dictionary_audit')).rows[0].n;await applyImportItems(client,replay,false,persist);assert.equal((await pg.query('select count(*)::int n from dictionary_audit')).rows[0].n,before);
 // Mixed safe + review: safe succeeds independently, review is retained in the same session.
 await saveDictionaryDraft(client,await parse([row(30)]));let mixed=await preview([row(30,{gloss_zh_tw:'changed'}),row(40)]);assert.equal(mixed.items.filter(i=>i.bucket==='review').length,1);mixed=await applyImportItems(client,mixed,false,persist);assert.equal(mixed.items.find(i=>i.draft.entry_id===id(40)).status,'applied');const rev=mixed.items.find(i=>i.bucket==='review');assert.equal(rev.status,'pending');mixed.items=mixed.items.map(i=>i===rev?chooseIssue(i,i.issues[0].id,'incoming'):i);mixed=await applyImportItems(client,mixed,true,persist);assert.equal((await pg.query('select gloss_zh_tw from dictionary_senses where id=$1',[id(31)])).rows[0].gloss_zh_tw,'changed');assert.equal(sessionCounts(mixed).affectedIDs.length,2);
 // Same ID inserted after preview must be stale, even if its content is identical.
 const absent=await preview([row(50)]);await saveDictionaryDraft(client,await parse([row(50)]));const staleInsert=await applyImportItems(client,absent,false,persist);assert.equal(staleInsert.items[0].status,'stale');
 // A new homograph candidate appearing after Preview is also stale.
 const candidate=await preview([row(60)]);await saveDictionaryDraft(client,await parse([row(70,{headword:'word60'})]));assert.equal((await applyImportItems(client,candidate,false,persist)).items[0].status,'stale');
 // Full content snapshot catches child changes even if parent revision did not change.
 const staleContent=await preview([row(50)]);await pg.query("update dictionary_senses set gloss_zh_tw='external' where id=$1",[id(51)]);assert.equal((await applyImportItems(client,staleContent,false,persist)).items[0].status,'stale');
 const staleRevision=await preview([row(40)]);await pg.query('update dictionary_entries set headword=headword where id=$1',[id(40)]);assert.equal((await applyImportItems(client,staleRevision,false,persist)).items[0].status,'stale');
 const stalePublish=await preview([row(40)]);await pg.query('select publish_dictionary_entry($1)',[id(40)]);assert.equal((await applyImportItems(client,stalePublish,false,persist)).items[0].status,'stale');const pub=await preview([row(40,{gloss_zh_tw:'overwrite'})]);assert.equal(pub.items[0].bucket,'review');assert.ok(pub.items[0].issues.some(i=>i.type==='published_change'));
 // Category fill uses the existing Prefix sense-level and Root entry-level persistence.
 for(const [n,kind,category]of [[100,'prefix','作用與變化'],[110,'root','時間、狀態、數量與邏輯']]){
  const [unclassified]=await parse([row(n,{kind,part_of_speech:'',category})]);if(kind==='prefix')delete unclassified.senses[0].category;else delete unclassified.grouping;await saveDictionaryDraft(client,[unclassified]);
  let filling=await preview([row(n,{kind,part_of_speech:'',category})]);const issue=filling.items[0].issues.find(i=>i.type==='category_missing');assert.ok(issue);filling.items[0]=chooseIssue(filling.items[0],issue.id,'fill');filling=await applyImportItems(client,filling,true,persist);assert.equal(filling.items[0].status,'applied');
  const actual=kind==='prefix'?(await pg.query('select primary_category from dictionary_sense_groups where sense_id=$1',[id(n+1)])).rows[0]:(await pg.query('select primary_category from dictionary_entry_groups where id=$1',[id(n)])).rows[0];assert.equal(actual.primary_category,category);
 }
 const partialStale=await preview([row(120),row(130)]);await saveDictionaryDraft(client,await parse([row(120)]));const partialResult=await applyImportItems(client,partialStale,false,persist);assert.equal(partialResult.items[0].status,'stale');assert.equal(partialResult.items[1].status,'applied');
 // Response lost: the local operation was persisted before the server committed.
 const lost=await preview([row(80)]);let first=true;const unreliable={rpc:async(name,args)=>{const response=await client.rpc(name,args);if(name==='apply_dictionary_import_operation'&&first){first=false;throw Error('response lost');}return response;}};
 const failed=await applyImportItems(unreliable,lost,false,persist);assert.equal(failed.items[0].status,'failed');const op=structuredClone(durable.items[0].operation);const retry=await applyImportItems(client,durable,false,persist);assert.equal(retry.items[0].status,'applied');assert.deepEqual(retry.items[0].operation,op);assert.equal((await pg.query('select count(*)::int n from dictionary_import_operations where operation_id=$1',[op.operation_id])).rows[0].n,1);await assert.rejects(pg.query('select apply_dictionary_import_operation($1)',[JSON.stringify({...op,effect:'unchanged'})]),/collision/);
 // A transaction failure cannot leave an entry, an audit record, or a success receipt.
 const invalid=await preview([row(90)]);const item=invalid.items[0];const operation={owner_id:id(1),session_id:invalid.id,operation_id:id(999),source_type:'csv',preview_at:invalid.preview_at,observed:item.observed,candidate:structuredClone(item.observed),expected_context:item.context,effect:'write'};operation.candidate.examples=[{id:id(998),entry_id:id(90),sense_id:id(997),body:'bad',sort_order:0}];const auditBefore=(await pg.query('select count(*)::int n from dictionary_audit')).rows[0].n;await assert.rejects(pg.query('select apply_dictionary_import_operation($1)',[JSON.stringify(operation)]),/foreign key/);assert.equal((await pg.query('select count(*)::int n from dictionary_entries where id=$1',[id(90)])).rows[0].n,0);assert.equal((await pg.query('select count(*)::int n from dictionary_audit')).rows[0].n,auditBefore);assert.equal((await pg.query('select count(*)::int n from dictionary_import_operations where operation_id=$1',[id(999)])).rows[0].n,0);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);assert.equal((await pg.query('select count(*)::int n from dictionary_import_operations')).rows[0].n,0);await assert.rejects(pg.query('select inspect_dictionary_import($1)',[JSON.stringify([item.observed])]),/admin/);await assert.rejects(pg.query('select apply_dictionary_import_operation($1)',[JSON.stringify(op)]),/admin/);assert.equal((await pg.query('select count(*)::int n from dictionary_examples')).rows[0].n,0);
 await pg.exec('reset role;set role anon');await assert.rejects(pg.query('select inspect_dictionary_import($1)',[JSON.stringify([])]),/permission/);
 }finally{await pg.close();}
});

test('IndexedDB preserves owner-scoped session, proposed IDs, decisions and pending retry request',async()=>{
 require('fake-indexeddb/auto');const {persistImportSession,loadImportSession}=require('../src/features/dictionary/importSessionStore.ts');
 const [d]=await parseDictionaryCSV(csv([row(200,{entry_id:'',sense_id:''})]));const item=classifyImport(d,empty);item.operation={owner_id:id(1),session_id:id(500),operation_id:id(501),source_type:'csv',preview_at:new Date().toISOString(),observed:mapDictionaryDraft(d),candidate:mapDictionaryDraft(d),expected_context:empty,effect:'write'};
 const session={id:id(500),owner_id:id(1),source_type:'csv',preview_at:new Date().toISOString(),items:[item]};await persistImportSession(session);assert.deepEqual(await loadImportSession(id(1)),session);assert.equal(await loadImportSession(id(2)),null);
});
