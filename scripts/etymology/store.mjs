import {readFile} from 'node:fs/promises';
import {TABLES} from './parser.mjs';

const keys={sources:['id'],entries:['id'],senses:['id'],categories:['id'],entry_categories:['entry_id','category_id'],
  words:['id'],word_senses:['word_id','sense_id','relation_kind'],claims:['id']};
const canonical=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(key=>[key,v[key]])):v);

export async function initializeLocalDatabase(pg) {
  const existing=await pg.query("select tablename from pg_tables where schemaname='public' and tablename like 'etymology_%'");
  if(existing.rows.length) {
    if(!TABLES.every(table=>existing.rows.some(row=>row.tablename===`etymology_${table}`)))throw new Error('本機百科 schema 不完整；停止，不覆蓋既有資料。');
    return;
  }
  await pg.exec(`create schema if not exists auth;
    do $$ begin
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
      if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
    end $$;
    create or replace function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to authenticated,anon;`);
  await pg.exec(await readFile(new URL('../../supabase/migrations/20260928_etymology_catalog.sql',import.meta.url),'utf8'));
}

/** Insert-only immutable import: identical retries skip; changed ID content is a collision, never silent overwrite.
 * The entire batch commits together. Supports PGlite only; CLI exposes no remote connection option.
 */
export async function importCatalog(pg,compiled,owner,{dryRun=false}={}) {
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner))throw new Error('需要有效 owner UUID');
  owner=owner.toLowerCase();
  if(compiled.report.status!=='valid')throw new Error('資料驗證失敗，整批拒絕寫入');
  const count={inserted:0,skipped:0,files_inserted:0,files_skipped:0};
  // Dry-run rolls back both successful staging and failures; constraints are exercised for every row.
  const rollback=Symbol('dry-run');
  try {
    await pg.transaction(async tx=>{
      for(const table of TABLES)for(const row of compiled.catalog[table]) {
        const record={...row,owner_id:owner};
        const columns=Object.keys(record);
        // Rows originate in compileBatch, but identifiers are still checked before composing SQL.
        if(columns.some(column=>!/^[a-z_][a-z0-9_]*$/.test(column)))throw new Error('Invalid column identifier');
        const inserted=await tx.query(`insert into etymology_${table} (${columns.join(',')}) values (${columns.map((_,i)=>`$${i+1}`).join(',')}) on conflict do nothing returning owner_id`,Object.values(record));
        if(inserted.rows.length) { count.inserted++;if(table==='sources')count.files_inserted++;continue; }
        const identity=['owner_id',...keys[table]];
        const result=await tx.query(`select * from etymology_${table} where ${identity.map((key,i)=>`${key}=$${i+1}`).join(' and ')}`,identity.map(key=>record[key]));
        if(!result.rows.length || columns.some(key=>canonical(result.rows[0][key])!==canonical(record[key]))) {
          const error=new Error(`ID_CONTENT_COLLISION ${table}: ${identity.map(key=>record[key]).join('/')}; 原始檔已改變或 ID 被占用，需要人工審核，不自動覆寫。`);
          error.code='ID_CONTENT_COLLISION';throw error;
        }
        count.skipped++;if(table==='sources')count.files_skipped++;
      }
      // Validate deferred references before returning counts or intentionally rolling back a dry-run.
      await tx.exec('set constraints all immediate');
      if(dryRun)throw rollback;
    });
  } catch(error) {if(error!==rollback)throw error;}
  return {...count,database_writes:dryRun?0:count.inserted};
}
