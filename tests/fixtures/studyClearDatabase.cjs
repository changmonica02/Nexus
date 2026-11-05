const fs=require('node:fs');
exports.installStudyClear=async pg=>{
 await pg.exec(`create table if not exists auth.users(id uuid primary key);
 create table if not exists public.pages(id text primary key,owner_id uuid,kind text,deleted_at bigint);`);
 await pg.exec(fs.readFileSync('supabase/migrations/20261105032115_study_deck_clear.sql','utf8'));
};
exports.clearTimes=async pg=>({data:(await pg.query('select get_study_clear_times() result')).rows[0].result,error:null});
