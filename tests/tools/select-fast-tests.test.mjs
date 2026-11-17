import test from 'node:test';
import assert from 'node:assert/strict';
import {selectFastTests} from './select-fast-tests.mjs';
test('dictionary edit stays within dictionary and tests atomic example writes',()=>{
 const plan=selectFastTests(['src/features/dictionary/DictionarySenseEditor.tsx']);
 assert.deepEqual(plan.groups,['dictionary']);
 assert.ok(plan.node.includes('tests/dictionary/dictionaryExamplesAtomicDraft.test.cjs'));
 assert.ok(!plan.groups.includes('world-map'));
});
test('map generation selects spherical land test',()=>{
 const plan=selectFastTests(['experiments/spherical-grid/land-generator.mjs']);
 assert.deepEqual(plan.groups,['world-map']);
 assert.ok(plan.node.includes('experiments/spherical-grid/land-generator.test.mjs'));
});
test('speech edits include browser and unit regression',()=>{
 const plan=selectFastTests(['src/features/study/StudySpeechPlayer.tsx']);
 assert.ok(plan.browser.includes('tests/study/studySpeech.browser.test.cjs'));
 assert.ok(plan.node.includes('tests/study/studySpeech.test.cjs'));
});
test('shared infrastructure and unknown paths expand conservatively',()=>{
 for(const file of ['src/infrastructure/storage/IndexedDBAdapter.ts','supabase/migrations/new.sql','src/lib/i18n.ts','unknown/feature.ts']){
  const plan=selectFastTests([file]);
  assert.equal(plan.expanded,true,file);
  assert.equal(plan.groups.length,8,file);
 }
});
test('explicit test changes are included once',()=>{
 const plan=selectFastTests(['tests/study/studyIntervals.test.cjs','tests/study/studyIntervals.test.cjs','docs/SPEC.md']);
 assert.equal(plan.node.filter(x=>x==='tests/study/studyIntervals.test.cjs').length,1);
 assert.deepEqual(plan.groups,['study']);
});
test('documentation-only changes select no test groups',()=>{
 const plan=selectFastTests(['docs/SPEC.md']);
 assert.deepEqual(plan.groups,[]);
});
test('empty changed-file input is an error',()=>{
 assert.throws(()=>selectFastTests([]),/No changed/);
 assert.throws(()=>selectFastTests(['']),/Invalid path/);
});
