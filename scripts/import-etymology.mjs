import {writeFile, mkdir, lstat, open, unlink} from 'node:fs/promises';
import {resolve, relative, sep, dirname} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
import {readBatch,compileBatch} from './etymology/parser.mjs';
import {initializeLocalDatabase,importCatalog} from './etymology/store.mjs';

export async function inspectBatch(directory) {
  try { return compileBatch(await readBatch(directory)); }
  catch(error) { return {catalog:null,report:{mode:'dry-run',status:'blocked',imported:0,skipped:0,failed:0,pending_review:0,
    record_counts_available:false,database_writes:0,files:[],errors:[{path:directory,code:error.code==='ENOENT'?'BATCH08_MISSING':error.code||'INPUT_READ_FAILED',message:error.message}],review:[],counts:{}}}; }
}

async function localPath(value,create) {
  const root=resolve(fileURLToPath(new URL('..',import.meta.url)),'.local','etymology');
  const target=resolve(value);
  if(!target.startsWith(root+sep))throw new Error('本機 DB 必須位於專案 .local/etymology/ 的子目錄；禁止 URL、遠端 DB 與其他路徑。');
  // Do not follow a symlink/junction out of the allowed local directory.
  for(let current=target;;current=dirname(current)) {
    const entry=await lstat(current).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
    if(entry?.isSymbolicLink())throw new Error('DB 路徑不得包含 symbolic link / junction');
    if(current===dirname(current))break;
  }
  if(create)await mkdir(target,{recursive:true});
  else await lstat(target);
  return target;
}

export async function main(args) {
  let input='data/etymology/batch-08',output,dbPath,owner,apply=false,explicitDry=false;
  for(let i=0;i<args.length;i++) {
    const arg=args[i];
    if(arg==='--dry-run'){explicitDry=true;continue;}
    if(arg==='--apply-local'){apply=true;continue;}
    if(['--input','--report','--local-db','--owner'].includes(arg)&&args[i+1]&&!args[i+1].startsWith('--')) {
      const value=args[++i];
      if(arg==='--input')input=value;else if(arg==='--report')output=value;else if(arg==='--local-db')dbPath=value;else owner=value;
    }else throw new Error(`不支援參數 ${arg}。只允許 dry-run 或 --apply-local；不支援遠端 Supabase。`);
  }
  if(apply&&(explicitDry||!dbPath||!owner))throw new Error('--apply-local 必須指定 --local-db、--owner，且不得與 --dry-run 並用');
  if(output) {
    const rel=relative(resolve(input),resolve(output));
    if(!rel||resolve(output).startsWith(resolve(input)+sep))throw new Error('報告不可寫入原始資料包');
  }
  const compiled=await inspectBatch(input),report=compiled.report;
  report.mode=apply?'apply-local':'dry-run';
  if(report.status==='valid') {
    let pg,lock,lockPath;
    try {
      const target=dbPath?await localPath(dbPath,apply):undefined;
      if(target) {
        lockPath=target+'.import-lock';
        lock=await open(lockPath,'wx'); // PGlite file storage must not be opened by concurrent import processes.
      }
      pg=new PGlite(target);
      await initializeLocalDatabase(pg);
      const result=await importCatalog(pg,compiled,owner||'00000000-0000-4000-8000-000000000001',{dryRun:!apply});
      report.imported=apply?result.files_inserted:0;report.skipped=result.files_skipped;
      report.would_import=apply?0:result.files_inserted;report.database_writes=result.database_writes;
      report.rows={inserted:apply?result.inserted:0,would_insert:apply?0:result.inserted,skipped:result.skipped};
      report.status=apply?'imported':'valid';
    }catch(error) {
      report.status='failed';report.database_writes=0;report.imported=0;report.failed=1;
      report.errors.push({path:'batch',code:error.code||'TRANSACTION_FAILED',message:error.message});
      report.transaction_rolled_back=true;
    }finally{
      try{if(pg)await pg.close();}
      finally{if(lock){await lock.close();await unlink(lockPath);}}
    }
  }
  const json=JSON.stringify(report,null,2)+'\n';
  if(output)await writeFile(resolve(output),json);
  process.stdout.write(json);
  return ['valid','imported'].includes(report.status)?0:2;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(code=>{process.exitCode=code;}).catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=2;});
}
