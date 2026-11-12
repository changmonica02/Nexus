require('../loadStudy.cjs');
const base=require('./dictionaryTransferDatabase.cjs'),fs=require('node:fs');
const migration='20261112012042_dictionary_morpheme_senses.sql';
async function database(){const pg=await base.database();await pg.exec('reset role');await pg.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));await pg.exec('set role authenticated');return pg;}
const identifier=value=>{if(!/^[a-z_]+$/.test(value))throw Error('Invalid test identifier');return '"'+value+'"';};
function client(pg){return {rpc:async(name,args={})=>{try{identifier(name);const entries=Object.entries(args);const v=await base.sql(pg,`select public.${name}(${entries.map(([key],i)=>`${identifier(key)}=>$${i+1}`).join(',')}) v`,entries.map(([key,v])=>v!==null&&typeof v==='object'&&(!Array.isArray(v)||['drafts','operations','proposals'].includes(key))?JSON.stringify(v):v));return {data:v,error:null};}catch(error){return {error:{message:error.message,code:error.code}};}},from(table){return query(pg,{table,columns:'*',filters:[],orders:[],limit:100});}};}
function query(pg,plan){
 const api={select(columns){plan.columns=columns;return api;},eq(key,value){plan.filters.push({key,value,op:'eq'});return api;},in(key,value){plan.filters.push({key,value,op:'in'});return api;},contains(key,value){plan.filters.push({key,value,op:'contains'});return api;},ilike(key,value){plan.filters.push({key,value,op:'ilike'});return api;},order(key,options={}){plan.orders.push({key,ascending:options.ascending!==false});return api;},limit(n){plan.limit=n;return api;},range(a,b){plan.offset=a;plan.limit=b-a+1;return api;},maybeSingle(){plan.single=true;return executeQuery(pg,plan);},then(resolve,reject){return executeQuery(pg,plan).then(resolve,reject);}};return api;
}
async function executeQuery(pg,plan){try{
 if(!/^dictionary_[a-z_]+$/.test(plan.table))throw Error('Only isolated dictionary fixture queries allowed');
 const fields=plan.columns==='*'?'*':plan.columns.split(',').map(identifier).join(','),values=[];
 const where=plan.filters.map(f=>{const col=identifier(f.key);if(f.op==='in')return `${col} in (${f.value.map(v=>{values.push(v);return '$'+values.length;}).join(',')||'null'})`;values.push(f.op==='contains'?JSON.stringify(f.value):f.value);return `${col} ${f.op==='contains'?'@>':f.op==='ilike'?'ilike':'='} $${values.length}${f.op==='contains'?'::jsonb':''}`;}).join(' and ');
 const ordering=plan.orders.map(o=>identifier(o.key)+(o.ascending?' asc':' desc')).join(',');
 if(!Number.isSafeInteger(plan.limit)||plan.limit<0||plan.limit>200)throw Error('Unbounded fixture query');
 const {rows}=await pg.query(`select ${fields} from public.${identifier(plan.table)}${where?' where '+where:''}${ordering?' order by '+ordering:''} limit ${plan.limit} offset ${Math.max(0,plan.offset??0)}`,values);
 return {data:plan.single?rows[0]??null:rows,error:null,count:rows.length};
 }catch(error){return {error:{message:error.message,code:error.code},data:null};}}
module.exports={...base,database,client,executeQuery,migration};
