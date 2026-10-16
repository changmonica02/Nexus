// Shared isolated RPC fixture: never connects to Supabase.
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const detail=(n,word,kind='word',pos='verb',gloss=word)=>({entry:{id:id(n),headword:word,kind,status:'published',revision:1,published_at:'fixture',updated_at:'fixture'},senses:[{id:id(n+1),entry_id:id(n),part_of_speech:kind==='word'?pos:null,gloss_zh_tw:gloss,revision:1,updated_at:'fixture'}],relations:[],inflections:[],pronunciations:[],examples:[],lexical_annotations:[],etymologies:[],learning_notes:[]});
const targets=[detail(10,'go'),detail(20,'un-','prefix'),detail(30,'happy','word','adjective'),detail(40,'poly','word','noun')];targets[3].senses.push({...targets[3].senses[0],id:id(42),gloss_zh_tw:'另一個義項',part_of_speech:'verb'});
const initial={detail:structuredClone(targets[0]),grouping:null,sense_groups:{},metadata:null};
if(new URLSearchParams(location.search).has('etymology'))initial.detail.etymologies=[{id:id(80),entry_id:id(10),sense_id:null,body:'Synthetic etymology',data_source:'https://example.test/source',revision:1,updated_at:'fixture'}];
if(new URLSearchParams(location.search).has('multi'))initial.detail.senses.push({...initial.detail.senses[0],id:id(12),gloss_zh_tw:'另一義項',part_of_speech:'noun'});
if(new URLSearchParams(location.search).has('legacy'))initial.detail.relations=[{id:id(50),entry_id:id(10),sense_id:id(11),target_entry_id:id(30),target_sense_id:id(31),relation_kind:'historical_etymology',verification:'verified',verification_note:'old evidence',revision:1,updated_at:'fixture'}];
window.fixture=JSON.parse(localStorage.getItem('dictionary-fixture')||'null')||{snapshot:initial,reviews:[],history:[],writes:0};
const persist=()=>localStorage.setItem('dictionary-fixture',JSON.stringify(window.fixture));
window.pendingReview=new URLSearchParams(location.search).has('pending');window.failSave=false;window.failSearch=false;window.failPublish=false;window.searchCalls=0;
window.dictionaryClient={
 from(table){let filter=[];const query={select(){return query;},eq(k,v){filter.push([k,v]);return query;},in(){return query;},ilike(){return query;},order(){return query;},range(){return Promise.resolve({data:targets.map(t=>t.entry),count:targets.length});},maybeSingle(){return Promise.resolve({data:null});},then(resolve){let data=table==='dictionary_review_drafts'?window.fixture.reviews:table==='dictionary_published_revisions'?window.fixture.history:[];data=data.filter(r=>filter.every(([k,v])=>r[k]===v));return Promise.resolve({data}).then(resolve);}};return query;},
 async rpc(name,args){
 const contracts={save_dictionary_review:['candidate','expected_revision','review_uuid'],discard_dictionary_review:['expected_revision','review_uuid'],approve_dictionary_review:['content_verified','expected_revision','review_uuid']};
 if(contracts[name]&&JSON.stringify(Object.keys(args).sort())!==JSON.stringify(contracts[name]))return {error:{message:'RPC signature mismatch: '+name}};
 const f=window.fixture;
 if(name==='dictionary_import_review_capabilities')return {data:{version:1}};
 if(name==='get_dictionary_import_reviews')return {data:{total:window.pendingReview?1:0,items:window.pendingReview?[{id:id(250),pending_count:1,item:{status:'pending'}}]:[]}};
 if(name==='get_dictionary_ai_snapshot')return {data:structuredClone(f.snapshot)};
 if(name==='get_dictionary_entry')return {data:args.entry_uuid===id(10)?structuredClone(f.snapshot.detail):targets.find(t=>t.entry.id===args.entry_uuid)};
 if(name==='search_dictionary_relation_targets'){window.searchCalls++;if(window.failSearch)return {error:{message:'fixture search failure'}};const matches=targets.filter(t=>t.entry.headword.includes(args.query_text)||t.senses.some(s=>s.gloss_zh_tw.includes(args.query_text))).map(t=>({...t.entry,senses:t.senses}));return {data:{items:matches,has_more:args.query_text==='page'}};}
 if(name==='create_dictionary_edit_review'||name==='save_dictionary_review'){
  if(window.failSave)return {error:{message:'Review revision conflict (fixture)'}};
  let review=f.reviews.find(r=>r.id===args.review_uuid);
  if(name==='create_dictionary_edit_review'){if(f.reviews.some(r=>r.state==='active'))return {error:{message:'Active Review Draft already exists'}};review={id:id(100),entry_id:id(10),base_revision:f.snapshot.detail.entry.revision,base_snapshot:structuredClone(f.snapshot),revision:1,state:'active',source:'manual'};f.reviews.push(review);}
  else if(review.revision!==args.expected_revision)return {error:{message:'Review revision conflict'}};
  review.candidate=structuredClone(args.candidate);review.revision++;f.writes++;persist();return {data:structuredClone(review)};
 }
 if(name==='discard_dictionary_review'){const review=f.reviews.find(r=>r.id===args.review_uuid);if(!review||review.state!=='active'||review.revision!==args.expected_revision)return {error:{message:'Review revision conflict'}};review.state='discarded';review.revision++;f.writes++;persist();return {data:structuredClone(review)};}
 if(name==='approve_dictionary_review'){
  if(window.failPublish)return {error:{message:'Stale Review Draft (fixture)'}};
  const review=f.reviews.find(r=>r.id===args.review_uuid),c=review.candidate,b=c.bundle;f.history.push({entry_id:id(10),revision:f.snapshot.detail.entry.revision,snapshot:structuredClone(f.snapshot)});
  f.snapshot.detail={entry:{...f.snapshot.detail.entry,...b.dictionary_entries[0],revision:f.snapshot.detail.entry.revision+1,status:'published'},senses:b.dictionary_senses,relations:b.dictionary_relations,inflections:c.inflections,pronunciations:c.pronunciations,lexical_annotations:c.annotations,examples:c.examples,learning_notes:b.dictionary_learning_notes,etymologies:b.dictionary_etymologies};review.state='approved';persist();return {data:review};
 }
 return {error:{message:'Unexpected fixture RPC '+name}};
 }
};

export {id,targets};
