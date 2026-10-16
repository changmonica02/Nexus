require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=require('./fixtures/dictionaryExchangeDatabase.cjs');
const migration='supabase/migrations/20261016030000_official_private_card_identity.sql';
test('isolated real official RPC/guards: legacy backfill, private edits/unlink, atomic link validation, source dedup/tombstone, old clients and owner RLS',async()=>{
 const pg=await base.database();try{
 await pg.exec(`reset role;create table pages(id text primary key,owner_id uuid,title text,kind text,content_json jsonb default '{}',study_items jsonb default '[]',deleted_at bigint,revision bigint default 1,updated_at bigint default 1);create table workspace_tombstones(owner_id uuid,entity_type text,entity_id text);`);
 // Isolated workspace transport adapter only: the official download and card operations below are real migrations/RPCs.
 await pg.exec(`create function apply_workspace_operations(operations jsonb) returns jsonb language plpgsql as $$declare x jsonb;begin for x in select * from jsonb_array_elements(operations) loop insert into public.pages(id,owner_id,title,kind) values(x->>'entity_id',auth.uid(),x->'value'->>'title','study_set');end loop;return '[]'::jsonb;end$$;`);
 for(const f of ['20261009_official_study_packs.sql','20261015_official_private_card_edit.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 const actor=base.owner,word=base.id(101),other=base.id(102),bad=base.id(103);
 await pg.query("insert into dictionary_entries(id,kind,headword,status,published_at) values($1,'word','apple','draft',null),($2,'word','book','draft',null),($3,'word','draft','draft',null)",[word,other,bad]);
 await pg.query("insert into dictionary_senses(entry_id,part_of_speech,gloss_zh_tw) values($1,'noun','蘋果'),($2,'noun','書')",[word,other]);
 for(const query of ['apple','book']){const preview=(await pg.query("select preview_dictionary_bulk_publish('{}',$1) v",[query])).rows[0].v;await pg.query("select publish_dictionary_bulk('{}',$1,$2,true)",[query,preview.signature]);}
 await pg.query("insert into official_study_pack_entries values('gsat-1-2',$1,1,0),('gsat-3-4',$1,3,0)",[word]);
 await pg.exec('set role authenticated');
 const scalar=async(sql,args=[])=> (await pg.query(sql,args)).rows[0].v;
 const deck=await scalar("select download_official_study_pack('gsat-1-2') v");
 let card=await scalar('select payload v from study_cards where payload->>\'deck_id\'=$1',[deck]);const original=structuredClone(card);
 assert.equal(card.official_source_entry_id,undefined);
 await pg.exec('reset role');await pg.exec(fs.readFileSync(migration,'utf8'));await pg.exec('set role authenticated');
 card=await scalar('select payload v from study_cards where id=$1',[card.id]);assert.equal(card.official_source_entry_id,word);assert.deepEqual({...card,official_source_entry_id:undefined},{...original,official_source_entry_id:undefined});
 const states=await scalar("select jsonb_agg(payload) v from study_card_states"),events=await scalar("select jsonb_agg(payload) v from study_review_events");
 const update=async(value)=>scalar('select apply_study_operation($1::jsonb) v',[JSON.stringify({kind:'card',value})]);
 let privateCard={...card,front:'my apple',back:'我的背面',dictionary_entry_id:null,updated_at:card.updated_at+1000,content_revision:2};await update(privateCard);
 assert.equal(await scalar('select count(*)::int v from study_card_dictionary_links where card_id=$1',[card.id]),0);
 await pg.query('select download_official_study_pack($1)',['gsat-1-2']);assert.equal(await scalar('select count(*)::int v from study_cards where payload->>\'deck_id\'=$1',[deck]),1);assert.deepEqual(await scalar('select payload v from study_cards where id=$1',[card.id]),privateCard);
 await assert.rejects(update({...privateCard,official_source_entry_id:other,updated_at:privateCard.updated_at+1}),/immutable/);
 for(const patch of [{id:'forged'},{deck_id:'other-deck'},{official_pack_id:'gsat-3-4'},{owner_id:base.id(900001)}])await assert.rejects(update({...privateCard,...patch,updated_at:privateCard.updated_at+1}));
 await assert.rejects(update({...privateCard,dictionary_entry_id:bad,updated_at:privateCard.updated_at+1}),/published word/);assert.deepEqual(await scalar('select payload v from study_cards where id=$1',[card.id]),privateCard,'invalid link rolls card operation back');
 privateCard={...privateCard,dictionary_entry_id:other,updated_at:privateCard.updated_at+2};await update(privateCard);assert.equal(await scalar('select dictionary_entry_id v from study_card_dictionary_links where card_id=$1',[card.id]),other);
 // An old device omits the new metadata; source is filled from the stored identity, not current link.
 const legacy={...privateCard,back:'older device new edit',updated_at:privateCard.updated_at+1};delete legacy.official_source_entry_id;await update(legacy);assert.equal((await scalar('select payload v from study_cards where id=$1',[card.id])).official_source_entry_id,word);
 privateCard={...legacy,official_source_entry_id:word,deleted_at:123,updated_at:legacy.updated_at+1};await update(privateCard);await pg.query('select download_official_study_pack($1)',['gsat-1-2']);assert.equal(await scalar('select count(*)::int v from study_cards where payload->>\'deck_id\'=$1',[deck]),1);await assert.rejects(update({...privateCard,deleted_at:null,updated_at:privateCard.updated_at+1}),/resurrected/);
 assert.deepEqual(await scalar('select jsonb_agg(payload) v from study_card_states'),states);assert.deepEqual(await scalar('select jsonb_agg(payload) v from study_review_events'),events);
 const deck2=await scalar("select download_official_study_pack('gsat-3-4') v");assert.notEqual(deck2,deck);assert.equal(await scalar('select count(*)::int v from study_cards'),2);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[base.id(900001)]);assert.equal(await scalar('select count(*)::int v from study_cards'),0);await assert.rejects(update(privateCard),/owner/);
 await assert.rejects(pg.query('update study_cards set payload=payload'),/permission/);await pg.exec('set role anon');await assert.rejects(pg.query('select official_private_card_capabilities()'),/permission/);
 }finally{await pg.close();}
});
