require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {database,migrate,sql,id,draft,owner}=require('./fixtures/retirementDatabase.cjs');
const {mapDictionaryDraft}=require('../src/features/dictionary/draftPipeline.ts');
const migration=fs.readFileSync('supabase/migrations/20261111143124_study_card_visibility.sql','utf8');
async function apply(pg){await pg.exec('reset role');try{await pg.exec(migration);}catch(e){await pg.exec('rollback');throw e;}await pg.exec('set role authenticated');}
test('visibility shares official card RPC/feed, protects old-device writes, preserves IDs/state/clear barriers and RLS',{timeout:120000},async()=>{
 const pg=await database();try{
  await sql(pg,'select apply_dictionary_drafts($1,false,true) v',[JSON.stringify([mapDictionaryDraft(draft(10))])]);await sql(pg,'select publish_dictionary_entry($1,true) v',[id(10)]);
  await pg.exec('reset role');await pg.query("insert into official_study_pack_entries values('gsat-1-2',$1,1,0)",[id(10)]);await pg.exec('set role authenticated');
  const deck=await sql(pg,"select download_official_study_pack('gsat-1-2') v");await migrate(pg,'official');await apply(pg);
  const card=await sql(pg,'select payload v from study_cards limit 1'),states=await sql(pg,'select jsonb_agg(payload order by id) v from study_card_states');
  const send=async value=>sql(pg,'select apply_study_operation($1) v',[JSON.stringify({owner_id:owner,kind:'card',value})]);
  const read=()=>sql(pg,'select payload v from study_cards where id=$1',[card.id]);
  await send({...card,hidden:true,hidden_changed_at:20,updated_at:card.updated_at+1});const hidden=await read();assert.equal(hidden.hidden,true);assert.equal(hidden.content_revision,card.content_revision);assert.equal(hidden.official_custom,false);
  await send({...card,updated_at:card.updated_at+2});assert.equal((await read()).hidden,true,'old client omits preference');
  await send({...card,hidden:false,hidden_changed_at:10,updated_at:card.updated_at+3});assert.equal((await read()).hidden,true,'newer content does not reverse hide');
  await send({...card,hidden:false,hidden_changed_at:21,updated_at:card.updated_at});const restored=await read();assert.equal(restored.hidden,false);assert.equal(restored.updated_at,card.updated_at+4);assert.equal(restored.front,card.front);
  await send({...card,hidden:true,hidden_changed_at:21,updated_at:card.updated_at+5});assert.equal((await read()).hidden,true,'hide wins concurrent timestamp tie');
  const before=await read();for(const invalid of [{hidden:true},{hidden:'yes',hidden_changed_at:30},{hidden:false,hidden_changed_at:-1}])await assert.rejects(send({...card,...invalid,updated_at:card.updated_at+10}),/Invalid study visibility/);assert.deepEqual(await read(),before);
  await sql(pg,"select download_official_study_pack('gsat-1-2') v");assert.equal((await read()).hidden,true,'official package update retains preference');
  assert.deepEqual(await sql(pg,'select jsonb_agg(payload order by id) v from study_card_states'),states);assert.equal(await sql(pg,'select count(*)::int v from study_review_events'),0);
  const feed=await sql(pg,'select pull_study_changes(0) v');assert.equal(feed.filter(row=>row.entity==='study_cards'&&row.id===card.id).at(-1).payload.hidden,true);
  assert.equal(await sql(pg,"select has_function_privilege('authenticated','study_merge_card_visibility(jsonb,jsonb)','execute') v"),false);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(900001)]);await assert.rejects(send({...card,hidden:false,hidden_changed_at:40,updated_at:card.updated_at+20}),/owner|Owner|mismatch/);assert.equal(await sql(pg,'select count(*)::int v from study_cards'),0);await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);assert.deepEqual(await read(),before);
  // A missing installed contract must roll back the whole migration, not weaken a guard.
  await pg.exec('reset role');const definition=await sql(pg,"select pg_get_functiondef('guard_official_study_content()'::regprocedure) v");await pg.exec("create or replace function guard_official_study_content() returns trigger language plpgsql as $$begin return new;end$$;");
  await assert.rejects(apply(pg),/Unexpected study operation contract|Unexpected official card guard contract/);await pg.exec(definition);await pg.exec('set role authenticated');assert.deepEqual(await read(),before);
  await sql(pg,'select clear_study_deck($1,$2,0) v',[deck,'visibility-clear']);assert.equal((await read()).hidden,true,'clearing progress preserves private hiding');assert.equal((await read()).id,card.id);assert.equal(await sql(pg,'select count(*)::int v from study_review_events'),0);
 }finally{await pg.close();}
});
