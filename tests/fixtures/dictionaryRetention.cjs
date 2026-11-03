// Complete the existing exchange fixture with the current retention contract.
const fs = require('node:fs');
async function applyDictionaryRetention(pg, { persistentInstalled = false } = {}) {
  await pg.exec('reset role');
  const files = [
    ...(!persistentInstalled ? ['20261015020759_dictionary_persistent_import_review.sql'] : []),
    '20261016050000_dictionary_retire_source_forms.sql',
    '20261017020000_dictionary_ranked_components.sql',
    '20261018010000_dictionary_entry_deletion.sql',
    '20261103021039_dictionary_current_content_only.sql',
  ];
  await pg.exec('create table if not exists official_study_pack_entries(pack_id text,dictionary_entry_id uuid references dictionary_entries(id));');
  for (const file of files) await pg.exec(fs.readFileSync('supabase/migrations/' + file, 'utf8'));
  await pg.exec('set role authenticated');
}
module.exports = { applyDictionaryRetention };
