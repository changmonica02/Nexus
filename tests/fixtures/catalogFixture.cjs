// UI-only catalog responses. Storage, permissions, CAS and SQL are tested by morphemeDatabase.
module.exports=function catalogFixture(entries,args={}){
 let rows=entries.filter(e=>args.admin_mode||e.status==='published').filter(e=>args.scope==='word'?e.kind==='word':args.scope==='morpheme'?(args.kind_filters??[]).includes(e.kind):true).filter(e=>!args.query_text||[e.headword,e.summary??'',...(e.variants??[]).map(v=>v.form)].some(v=>v.toLowerCase().includes(args.query_text.toLowerCase()))).filter(e=>!args.domain||e.semantic_domain===args.domain).filter(e=>!args.subdomain||e.semantic_subdomain===args.subdomain);
 const stats={red:0,yellow:0,green:0};rows=rows.map(e=>({...e,summary:e.summary??'',variants:e.variants??[],work_status:e.work_status??(e.status==='draft'?'yellow':'green')}));for(const r of rows)stats[r.work_status]++;
 if(args.work_filters?.length)rows=rows.filter(e=>args.work_filters.includes(e.work_status));const size=args.admin_mode?100:20,page=args.page_number??0;
 return {data:{items:rows.slice(page*size,(page+1)*size),total:rows.length,has_more:(page+1)*size<rows.length,page,stats:args.admin_mode?stats:null}};
};
