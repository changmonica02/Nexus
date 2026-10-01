require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {searchDictionary,readPublishedEntry,sourceUrl}=require('../src/features/dictionary/reader.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('published reader: database pagination, literal case-insensitive search, kinds, draft/API isolation and source projection',async()=>{
  const pg=new PGlite();
  try{
    await pg.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated,anon;`);
    for(const f of ['20260922_study_fsrs.sql','20260930_public_dictionary.sql','20261002_dictionary_reader.sql'])await pg.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
    // Future management columns must not silently become part of the public RPC.
    for(const table of ['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_sources'])await pg.exec(`alter table ${table} add column internal_review_note text default 'SECRET FUTURE'`);
    await pg.query('insert into auth.users values($1),($2)',[id(1),id(2)]);await pg.query('insert into dictionary_admins(user_id) values($1)',[id(1)]);
    await pg.exec('set role authenticated');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
    await pg.query("insert into dictionary_sources(id,citation,license,raw_text,license_note) values($1,'test citation','test-only','SECRET RAW','SECRET NOTE')",[id(3)]);
    for(let i=10;i<35;i++){
      const kind=i===33?'prefix':i===34?'root':'word';
      await pg.query('insert into dictionary_entries(id,kind,headword,source_id) values($1,$2,$3,$4)',[id(i),kind,`Test${i}`,id(3)]);
      await pg.query("insert into dictionary_senses(id,entry_id,part_of_speech,gloss_zh_tw,source_id) values($1,$2,'noun','自建測試',$3)",[id(100+i),id(i),id(3)]);
      if(i!==32)await pg.query('select publish_dictionary_entry($1)',[id(i)]);
    }
    const client={rpc:async(name,args)=>{try{
      const result=name==='search_published_dictionary'?await pg.query('select search_published_dictionary($1,$2,$3) as data',[args.category,args.query_text,args.page_number]):await pg.query('select get_published_dictionary_entry($1) as data',[args.entry_uuid]);
      return{data:result.rows[0].data,error:null};
    }catch(e){return{data:null,error:{message:e.message}};}}};
    // Public routes intentionally hide drafts even for admins.
    assert.equal(await readPublishedEntry(client,id(32)),null);
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id(2)]);
    const p1=await searchDictionary(client,'word','',0),p2=await searchDictionary(client,'word','',1);
    assert.equal(p1.items.length,20);assert.equal(p1.has_more,true);assert.equal(p2.items.length,2);assert.equal(p2.has_more,false);
    assert.equal(new Set([...p1.items,...p2.items].map(e=>e.id)).size,22);
    assert.equal((await searchDictionary(client,'word','tEsT10')).items.length,1);
    assert.equal((await searchDictionary(client,'word','%')).items.length,0);
    assert.equal((await searchDictionary(client,'prefix','')).items[0].id,id(33));
    assert.equal((await searchDictionary(client,'root','')).items[0].id,id(34));
    assert.equal(await readPublishedEntry(client,id(32)),null);
    assert.equal((await pg.query('select get_dictionary_entry($1) as data',[id(32)])).rows[0].data,null);
    assert.equal((await pg.query('select * from dictionary_entries where id=$1',[id(32)])).rows.length,0);
    const detail=await readPublishedEntry(client,id(10));assert.equal(detail.senses.length,1);assert.equal(detail.sources[0].citation,'test citation');assert.equal(detail.sources[0].sha256.length,64);
    assert.deepEqual(Object.keys(detail.entry).sort(),['id','kind','headword','source_id','status','published_at'].sort());
    assert.deepEqual(Object.keys(detail.senses[0]).sort(),['id','entry_id','part_of_speech','gloss_zh_tw','source_id'].sort());
    assert.deepEqual(Object.keys(detail.sources[0]).sort(),['id','citation','source_url','license','sha256','verification'].sort());
    assert.ok(!JSON.stringify(detail).includes('SECRET'));assert.equal((await pg.query('select * from dictionary_sources')).rows.length,0);
    assert.equal(await readPublishedEntry(client,'invalid'),null);
    await assert.rejects(searchDictionary(client,'word','',-1),/無法讀取/);
    await assert.rejects(searchDictionary(client,'word','x'.repeat(121)),/無法讀取/);
    await pg.exec('reset role;set role anon');
    await assert.rejects(searchDictionary(client,'word',''),/無法讀取/);
    await assert.rejects(readPublishedEntry(client,id(10)),/無法讀取/);
  }finally{await pg.close();}
});
test('source links permit only http/https',()=>{assert.equal(sourceUrl('javascript:alert(1)'),null);assert.equal(sourceUrl('https://example.com'),'https://example.com/');assert.equal(sourceUrl(null),null);});

const ts=require('typescript');
require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
test('reader detail renders senses, related links, safe source attribution and separate memory labels',()=>{
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const {DictionaryArticle}=require('../src/features/dictionary/DictionaryBrowser.tsx');
  const data={entry:{id:id(10),headword:'Test',kind:'word',source_id:id(3)},senses:[{id:id(110),part_of_speech:'noun',gloss_zh_tw:'測試',source_id:id(3)}],relations:[{id:id(200),sense_id:id(110),target_sense_id:id(133),relation_kind:'learning_decomposition',verification:'pending',source_id:id(3)}],related:[{id:id(33),sense_id:id(133),headword:'pre-',gloss_zh_tw:'前'}],etymologies:[{id:id(201),sense_id:null,body:'Unverified claim',verification:'unverified',source_id:id(3)}],learning_notes:[{id:id(202),sense_id:null,body:'<script>fake</script>',kind:'mnemonic_scenario',source_id:id(3)}],sources:[{id:id(3),citation:'自建來源',license:'test-only',source_url:'javascript:alert(1)',sha256:'a'.repeat(64),verification:'unverified'}]};
  const html=renderToStaticMarkup(React.createElement(DictionaryArticle,{data}));
  for(const text of ['noun','測試','不是已確認的詞源事實','記憶情境','test-only',`/dictionary/${id(33)}?from=${encodeURIComponent(`/dictionary/${id(10)}`)}#sense-${id(133)}`])assert.ok(html.includes(text),text);
  assert.ok(!html.includes('<script>'));assert.ok(!html.includes('javascript:'));
});
