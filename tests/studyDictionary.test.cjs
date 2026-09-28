require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {setCardDictionaryLink,readCardDictionaryLink}=require('../src/features/dictionary/cardDictionary.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('optional cloud links enforce ownership/published Word and leave Study content, FSRS and events untouched',async()=>{
  const pg=new PGlite();try{
    await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated,anon;`);
    for(const f of ['20260922_study_fsrs.sql','20260930_public_dictionary.sql','20261002_dictionary_reader.sql','20261003_study_dictionary_links.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
    await pg.query('insert into auth.users values($1),($2)',[id(1),id(2)]);await pg.query('insert into dictionary_admins(user_id) values($1)',[id(1)]);
    const card={id:'mine',owner_id:id(2),front:'own English',back:'自寫中文',deleted_at:null};
    await pg.query('insert into study_cards values($1,$2,$3)',[id(2),'mine',card]);
    await pg.query('insert into study_cards values($1,$2,$3)',[id(1),'same-id',{...card,id:'same-id',owner_id:id(1)}]);
    await pg.query('insert into study_cards values($1,$2,$3)',[id(2),'same-id',{...card,id:'same-id'}]);
    await pg.query('insert into study_cards values($1,$2,$3)',[id(2),'deleted',{...card,id:'deleted',deleted_at:123}]);
    await pg.query('insert into study_card_states values($1,$2,$3)',[id(2),'mine',{id:'mine',owner_id:id(2),fsrs:{due:123,difficulty:4},head:'unchanged'}]);
    await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
    await pg.query("insert into dictionary_sources(id,citation,license,raw_text) values($1,'fixture','test','raw')",[id(3)]);
    for(const [n,kind,published] of [[10,'word',true],[11,'word',false],[12,'root',true]]){
      await pg.query('insert into dictionary_entries(id,kind,headword,source_id) values($1,$2,$3,$4)',[id(n),kind,'test',id(3)]);
      await pg.query("insert into dictionary_senses(id,entry_id,part_of_speech,gloss_zh_tw,source_id) values($1,$2,'noun','測試',$3)",[id(n+100),id(n),id(3)]);
      if(published)await pg.query('select publish_dictionary_entry($1)',[id(n)]);
    }
    const client={rpc:async(_name,args)=>{try{await pg.query('select set_study_dictionary_link($1,$2)',[args.card_uuid,args.word_uuid]);return{error:null};}catch(e){return{error:e};}}};
    await assert.rejects(setCardDictionaryLink(client,'mine',id(10)),/未儲存/);
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);
    const before=(await pg.query('select payload from study_card_states')).rows;
    await assert.rejects(setCardDictionaryLink(client,'missing',id(10)),/未儲存/);
    await assert.rejects(setCardDictionaryLink(client,'deleted',id(10)),/未儲存/);
    await setCardDictionaryLink(client,'same-id',id(10));
    assert.equal((await pg.query("select owner_id from study_card_dictionary_links where card_id='same-id'")).rows[0].owner_id,id(2));
    await setCardDictionaryLink(client,'same-id',null);
    await assert.rejects(setCardDictionaryLink(client,'mine',id(11)),/未儲存/);
    await assert.rejects(setCardDictionaryLink(client,'mine',id(12)),/未儲存/);
    await setCardDictionaryLink(client,'mine',id(10));await setCardDictionaryLink(client,'mine',id(10));
    assert.equal((await pg.query('select * from study_card_dictionary_links')).rows.length,1);
    await setCardDictionaryLink(client,'mine',null);
    assert.equal((await pg.query('select * from study_card_dictionary_links')).rows.length,0);
    assert.deepEqual((await pg.query("select payload from study_cards where id='mine'")).rows[0].payload,card);
    assert.deepEqual((await pg.query('select payload from study_card_states')).rows,before);
    assert.equal((await pg.query('select * from study_review_events')).rows.length,0);
    await pg.exec('reset role;set role anon');await assert.rejects(setCardDictionaryLink(client,'mine',id(10)),/未儲存/);
  }finally{await pg.close();}
});
test('link reads are read-only and missing service produces recoverable error',async()=>{
  const make=(data,error)=>({from(table){
    assert.equal(table,'study_card_dictionary_links');
    return {select(){return {eq(key,value){
      assert.equal(key,'card_id');assert.equal(value,'card');
      return {maybeSingle:async()=>({data,error})};
    }};}};
  }});
  assert.equal(await readCardDictionaryLink(make({dictionary_entry_id:id(10)},null),'card'),id(10));
  assert.equal(await readCardDictionaryLink(make(null,null),'card'),null);
  await assert.rejects(readCardDictionaryLink(make(null,{message:'network'}),'card'),/仍可正常評分/);
});
const ts=require('typescript');require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
test('detail starts collapsed and answer status disappears after save, errors offer explicit retry',()=>{
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const Panel=require('../src/features/dictionary/CardDictionaryPanel.tsx').default;
  const {AnswerSaveNotice}=require('../src/features/study/components/DailyStudySession.tsx');
  const html=renderToStaticMarkup(React.createElement(Panel,{cardId:'card',front:'test'}));
  assert.ok(html.includes('aria-expanded="false"'));assert.ok(!html.includes('歷史詞源'));
  const render=props=>renderToStaticMarkup(React.createElement(AnswerSaveNotice,{onReload:()=>{},...props}));
  assert.equal(render({saving:false,error:''}),'');
  assert.ok(render({saving:true,error:''}).includes('正在儲存作答'));
  assert.ok(render({saving:false,error:'failed',onRetry:()=>{}}).includes('重試儲存同一作答'));
  const source=fs.readFileSync('src/features/study/components/DailyStudySession.tsx','utf8');
  assert.ok(source.indexOf('<CardDictionaryPanel')<source.indexOf('<AnswerSaveNotice'));
  assert.ok(source.includes('session!.answers'));
});
