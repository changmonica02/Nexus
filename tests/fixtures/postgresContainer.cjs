// Execute the same migration assertions on a disposable, labelled local PostgreSQL.
// This adapter never accepts a host URL, a credential, or a production database.
const {execFile}=require('node:child_process');
const {randomUUID}=require('node:crypto');
const container=process.env.NEXUS_TEST_POSTGRES_CONTAINER;
if(!/^nexus46-[a-z0-9-]+$/.test(container||''))throw Error('Only nexus46 disposable containers are accepted');
const env={...process.env};
for(const name of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[name];
async function docker(args,input){
 // execFile has no stdin option; write to the explicitly selected local process.
 let child;
 const promise=new Promise((resolve,reject)=>{child=execFile('docker',['--host=unix:///var/run/docker.sock',...args],{env,maxBuffer:8*1024*1024},(error,stdout,stderr)=>{if(error)reject(new Error(stderr||error.message));else resolve(stdout);});});
 if(input!==undefined)child.stdin.end(input);
 return promise;
}
const literal=value=>Array.isArray(value)?(value.length?'ARRAY['+value.map(literal).join(',')+']':"'{}'"):value===null||value===undefined?'NULL':typeof value==='number'?String(value):typeof value==='boolean'?String(value):"'"+String(value).replaceAll("'","''")+"'";
class PGlite {
 constructor(){this.database='nexus46_'+randomUUID().replaceAll('-','');this.role=null;this.jwt=null;this.ready=this.initialize();}
 async initialize(){
  const guard=(await docker(['inspect','--format','{{index .Config.Labels "nexus.test"}} {{.HostConfig.NetworkMode}}',container])).trim();
  if(guard!=='pr46-local none')throw Error('Refusing a database without the local isolation label / network=none');
  await this.psql('postgres',`CREATE DATABASE ${this.database};`);
 }
 async psql(database,sql){return docker(['exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',database],sql);}
 prefix(){return `${this.role?`SET ROLE ${this.role};`:''}${this.jwt!==null?`SET request.jwt.claim.sub = ${literal(this.jwt)};`:''}`;}
 async exec(sql){
  await this.ready;const output=await this.psql(this.database,this.prefix()+sql);
  for(const match of sql.matchAll(/\b(reset role|set role (authenticated|anon))\b/gi))this.role=match[2]?.toLowerCase()??null;
  return output;
 }
 async query(sql,values=[]){
  await this.ready;
  if(sql.includes("set_config('request.jwt.claim.sub'"))this.jwt=values[0];
  const statement=sql.replace(/\$(\d+)/g,(_,n)=>literal(values[Number(n)-1]));
  if(/^\s*select\b/i.test(statement)){
   const output=await this.psql(this.database,this.prefix()+`SELECT coalesce(json_agg(result),'[]'::json)::text FROM (${statement}) result;`);
   return {rows:JSON.parse(output.trim())};
  }
  await this.psql(this.database,this.prefix()+statement);return {rows:[]};
 }
 async close(){await this.ready;await this.psql('postgres',`DROP DATABASE ${this.database}; DROP ROLE authenticated; DROP ROLE anon;`);}
}
module.exports={PGlite};
