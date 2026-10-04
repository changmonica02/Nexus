require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {prefixCategories,primaryCategories,emptyGrouping,readSenseGroups,savePrefixDraft,saveGroupedDraft,searchGrouping}=require('../src/features/dictionary/grouping.ts');
const {DictionaryEditor}=require('../src/features/dictionary/DictionaryAdmin.tsx');
const {DictionaryGroups,GroupedResult}=require('../src/features/dictionary/DictionaryBrowser.tsx');
const detail={entry:{id:'prefix',headword:'sur-',kind:'prefix',source_id:'src',status:'draft',published_at:null,revision:2,updated_at:''},senses:[{id:'one',entry_id:'prefix',source_id:'src',part_of_speech:null,gloss_zh_tw:'上方',revision:1,updated_at:''},{id:'two',entry_id:'prefix',source_id:'src',part_of_speech:null,gloss_zh_tw:'過量',revision:1,updated_at:''}],relations:[],etymologies:[],learning_notes:[]};
test('prefix saves sense classification separately without changing Bundle or historical entry categories',async()=>{
 const bundle={dictionary_entries:[detail.entry],dictionary_senses:detail.senses};
 const before=structuredClone(bundle),calls=[];
 const client={rpc:async(name,args)=>{calls.push({name,args});return {error:null};}};
 await savePrefixDraft(client,bundle,{primary_category:primaryCategories[0],tags:['tag'],variant_group:'variants'},{one:prefixCategories[1],two:prefixCategories[2],removed:prefixCategories[0]});
 assert.equal(calls[0].name,'save_dictionary_prefix_draft');
 assert.deepEqual(calls[0].args.group_data,{tags:['tag'],variant_group:'variants'});
 assert.deepEqual(calls[0].args.sense_groups,[{sense_id:'one',primary_category:prefixCategories[1]},{sense_id:'two',primary_category:prefixCategories[2]}]);
 assert.deepEqual(bundle,before);assert.deepEqual(calls[0].args.bundle,before);
 await savePrefixDraft(client,bundle,emptyGrouping(),{});
 assert.ok(calls[1].args.sense_groups.every(s=>s.primary_category===null));
 await saveGroupedDraft(client,bundle,{...emptyGrouping(),primary_category:primaryCategories[0]});
 assert.equal(calls[2].name,'save_dictionary_grouped_draft');assert.equal(calls[2].args.group_data.primary_category,primaryCategories[0]);
 await assert.rejects(savePrefixDraft({rpc:async()=>({error:{message:'Revision conflict'}})},bundle,emptyGrouping(),{}),/Revision conflict/);
});
test('sense groups load by stable sense IDs, including empty/unclassified and error handling',async()=>{
 const client={from:table=>{assert.equal(table,'dictionary_sense_groups');return {select:fields=>{assert.equal(fields,'sense_id,primary_category');return {in:async(key,ids)=>{assert.equal(key,'sense_id');assert.deepEqual(ids,['one','two']);return {data:[{sense_id:'one',primary_category:prefixCategories[1]},{sense_id:'two',primary_category:null}],error:null};}};}};}};
 assert.deepEqual(await readSenseGroups(client,['one','two']),{one:prefixCategories[1],two:null});
 assert.deepEqual(await readSenseGroups({},[]),{});
 await assert.rejects(readSenseGroups({from:()=>({select:()=>({in:async()=>({error:{message:'missing table'}})})})},['one']),/migration/);
});
test('prefix editor renders independent per-meaning categories; root and word retain their own fields',()=>{
 const render=(kind,groups={})=>renderToStaticMarkup(React.createElement(DictionaryEditor,{detail:{...detail,entry:{...detail.entry,kind}},entries:[],senses:[],onSaved:async()=>{},initialGrouping:{...emptyGrouping(),primary_category:primaryCategories[0]},initialSenseGroups:groups}));
 const html=render('prefix',{one:prefixCategories[1],two:prefixCategories[2]});
 assert.equal((html.match(/aria-label="中文義項 [12] 的主要分類"/g)||[]).length,2);
 for(const category of [prefixCategories[1],prefixCategories[2]])assert.ok(html.includes(`selected="">${category}</option>`));
 assert.ok(html.indexOf('上方')<html.indexOf('中文義項 1 的主要分類'));
 assert.ok(!html.includes(primaryCategories[0]));assert.ok(!html.includes('Sense ID'));assert.ok(!html.includes('所屬義項'));
 assert.ok(html.includes('標籤'));assert.ok(html.includes('形態群／變體群'));
 const root=render('root');assert.ok(root.includes(primaryCategories[0]));assert.ok(!root.includes(prefixCategories[0]));
 const word=render('word');assert.ok(!word.includes('主要分類'));assert.ok(!word.includes('形態群／變體群'));
 const locked=renderToStaticMarkup(React.createElement(DictionaryEditor,{detail:{...detail,entry:{...detail.entry,status:'published'}},entries:[],senses:[],onSaved:async()=>{}}));assert.ok(locked.includes('<fieldset disabled'));
});
test('prefix and root browser use distinct categories and query contracts; prefix results carry meaning anchors',async()=>{
 const render=kind=>renderToStaticMarkup(React.createElement(DictionaryGroups,{kind,query:''}));
 for(const category of prefixCategories)assert.ok(render('prefix').includes(category));
 assert.ok(!render('prefix').includes(primaryCategories[0]));assert.ok(render('root').includes(primaryCategories[0]));
 const calls=[],page={items:[{id:'prefix',kind:'prefix',headword:'sur-',sense_id:'one',gloss_zh_tw:'上方'},{id:'prefix',kind:'prefix',headword:'sur-',sense_id:'two',gloss_zh_tw:'過量'}],has_more:true,page:2};
 const client={rpc:async(name,args)=>{calls.push({name,args});return {data:page,error:null};}};
 assert.deepEqual(await searchGrouping(client,'prefix','sur',2,prefixCategories[1]),page);
 assert.deepEqual(calls[0],{name:'search_prefix_dictionary',args:{query_text:'sur',page_number:2,primary_category_filter:prefixCategories[1]}});
 await searchGrouping(client,'root','cap',0,primaryCategories[0]);assert.equal(calls[1].name,'search_grouped_dictionary');assert.equal(calls[1].args.category,'root');
 for(const item of page.items){const html=renderToStaticMarkup(React.createElement(GroupedResult,{item}));assert.ok(html.includes(item.gloss_zh_tw));assert.ok(html.includes(`#sense-${item.sense_id}`));}
 await assert.rejects(searchGrouping({rpc:async()=>({error:{message:'offline'}})},'prefix','',0,'__ungrouped__'),/無法讀取/);
});
test('migration statically preserves old groups, gates writes and uses sense-based published pagination',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261006_dictionary_prefix_sense_groups.sql','utf8');
 assert.match(sql,/sense_id uuid primary key references public.dictionary_senses\(id\) on delete cascade/);
 assert.match(sql,/enable row level security/);assert.match(sql,/grant select on public.dictionary_sense_groups to authenticated/);
 assert.ok(!/grant (insert|update|delete|all)/i.test(sql));
 assert.match(sql,/if not public.is_dictionary_admin\(\) then/);
 assert.match(sql,/result:=public.save_dictionary_grouped_draft/);
 assert.match(sql,/id=sense_uuid and entry_id=entry_uuid for update/);
 assert.match(sql,/Duplicate sense ID/);assert.match(sql,/jsonb_build_object\('primary_category',legacy_category\)/);
 assert.ok(!/alter table public.dictionary_entry_groups|drop table|delete from|update public.dictionary_entries|create or replace function public.apply_dictionary_bundle/i.test(sql));
 assert.match(sql,/e.kind='prefix' and e.status='published'/);
 assert.match(sql,/g.sense_id=s.id/);assert.match(sql,/limit 21 offset page_number\*20/);
 assert.match(sql,/if category='prefix' then return public.search_prefix_dictionary/);
});
