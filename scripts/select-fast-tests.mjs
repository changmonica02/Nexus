#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const inventory=JSON.parse(readFileSync(path.join(root,'config/test-groups.json'),'utf8'));
const groups=inventory.groups;
const owners=new Map(Object.entries(groups).flatMap(([g,files])=>files.map(f=>[f,g])));
const smoke={
 dictionary:['tests/dictionaryExamplesAtomicDraft.test.cjs','tests/dictionarySenseEditor.test.cjs'],
 study:['tests/studyFSRS.test.cjs','tests/studySync.test.cjs','tests/studySpeech.test.cjs'],
 'world-map':['experiments/spherical-grid/land-generator.test.mjs','tests/globalMap.test.cjs','tests/worldMap.test.cjs'],
 note:['tests/note/noteExportLayout.test.cjs','tests/note/lessonDocument.test.cjs'],
 creation:['tests/creation/characterBlocks.test.cjs','tests/creation/characterTemplateUpdate.test.cjs'],
 life:['tests/life/lifeViews.test.cjs','tests/life/todoCalendar.test.cjs'],
 workspace:['tests/workspaceSync.test.cjs','tests/workspaceDeployment.test.cjs'],
 shared:['tests/shared/confirmDialog.test.cjs','tests/shared/uiInteractions.test.cjs']
};
export function selectFastTests(paths){
 if(!Array.isArray(paths)||!paths.length)throw Error('No changed paths: cannot safely skip tests');
 const affected=new Set(),selected=new Set(),reasons=[];
 let expanded=false;
 for(const raw of paths){
  if(typeof raw!=='string'||!raw||raw.includes('\0'))throw Error('Invalid path');
  const p=raw.replaceAll('\\','/'),add=(...g)=>g.forEach(x=>affected.add(x));
  if(p.startsWith('docs/')||/^(?:README|HISTORY|SPEC|HANDOFF|ARCHITECTURE)\.md$/.test(p))continue;
  if(owners.has(p)){add(owners.get(p));selected.add(p);}
  else if(p.startsWith('tests/')){expanded=true;reasons.push(p);}
  else if(p.startsWith('experiments/spherical-grid/')||p.startsWith('src/features/worldMap/')||p.startsWith('integrations/azgaar/')||p.startsWith('vendor/azgaar/')||p.startsWith('public/world-map/'))add('world-map');
  else if(p.startsWith('src/features/dictionary/'))add('dictionary');
  else if(p.startsWith('src/features/study/'))add('study');
  else if(p.startsWith('src/features/creation/')||p.startsWith('src/features/score/'))add('creation');
  else if(p.startsWith('src/features/life/'))add('life');
  else if(p.startsWith('src/features/note/'))add('note');
  else if(p.startsWith('src/components/')){
   if(/Map|WorldEntity/i.test(p))add('world-map');
   else if(/Dictionary|Morpheme|WordSegment/i.test(p))add('dictionary');
   else if(/Study|Learning|Speech|Flashcard/i.test(p))add('study');
   else if(/Note|Document|EditorPane/i.test(p))add('note');
   else if(/Character|Creation|Novel|Score/i.test(p))add('creation');
   else if(/Life|Todo|Calendar/i.test(p))add('life');
   else {expanded=true;reasons.push('Shared component: '+p);}
  }
  else if(p.startsWith('scripts/')&&/map|world/i.test(p))add('world-map');
  else if(p.startsWith('src/')||p.startsWith('supabase/')||p.startsWith('scripts/')||p.startsWith('config/')||p.startsWith('.github/')||p.startsWith('package')||/^(?:next|eslint|tsconfig)/.test(p)){expanded=true;reasons.push('Shared or build path: '+p);}
  else {expanded=true;reasons.push('Unknown path: '+p);}
  if(/(?:dictionary.*(?:example|sense|derivat)|supabase\/migrations\/.*(?:dictionary|sense|example))/i.test(p))selected.add('tests/dictionaryExamplesAtomicDraft.test.cjs');
  if(/(?:speech|tts)/i.test(p)){add('study');selected.add('tests/studySpeech.test.cjs');selected.add('tests/studySpeech.browser.test.cjs');}
  if(/(?:sync|storage|IndexedDB)/i.test(p)){add('workspace','study','world-map');selected.add('tests/workspaceSync.test.cjs');selected.add('tests/worldMapIndexedDB.test.cjs');}
  if(/noteExport|noteTablePagination/i.test(p)){add('note');selected.add('tests/note/noteExportLayout.test.cjs');}
 }
 if(expanded)Object.keys(groups).forEach(g=>affected.add(g));
 for(const g of affected)for(const file of smoke[g]||[])selected.add(file);
 for(const file of selected)if(!owners.has(file))throw Error('Test missing from inventory: '+file);
 const files=[...selected].sort();
 return {groups:[...affected].sort(),node:files.filter(f=>!f.includes('.browser.')),browser:files.filter(f=>f.includes('.browser.')),expanded,reasons};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const i=process.argv.indexOf('--changed-file');
 if(i<0||!process.argv[i+1])throw Error('Expected --changed-file <path>');
 const changed=readFileSync(process.argv[i+1],'utf8').split('\0').filter(Boolean);
 const plan=selectFastTests(changed);
 writeFileSync(path.join(root,'.fast-plan.json'),JSON.stringify(plan,null,2)+'\n');
 console.log(JSON.stringify(plan,null,2));
}
