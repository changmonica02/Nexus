const fs=require('node:fs'),base=require('./morphemeDatabase.cjs');
const migrations=['20261113035217_dictionary_legacy_morpheme_retired.sql','20261113035226_dictionary_review_cleanup.sql'];
async function retire(pg){await pg.exec('reset role');for(const name of migrations)await pg.exec(fs.readFileSync('supabase/migrations/'+name,'utf8'));await pg.exec('set role authenticated');}
async function database(){const pg=await base.database();await retire(pg);return pg;}
module.exports={...base,database,retire,migrations};
