#!/usr/bin/env node
// Run test files not already invoked by the migrated legacy suites.
// Every main-inventory test is either in the baseline or selected here.
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const inv=JSON.parse(readFileSync(path.join(root,'tests/config/test-groups.json'),'utf8'));
const old=['note-editor.yml','global-map-editor.yml','spherical-grid-prototype.yml']
 .map(n=>readFileSync(path.join(root,'.github/workflows',n),'utf8')).join('\n');
const explicit=new Set([...old.matchAll(/(?:tests|experiments\/spherical-grid)\/[\w./-]+(?:\.test\.cjs|\.test\.mjs)/g)].map(m=>m[0]));
// Expand the two wildcard/script suites in the baseline.
for(const p of inv.groups['world-map'])if(p.startsWith('experiments/spherical-grid/')&&p.endsWith('.test.mjs'))explicit.add(p);
for(const n of ['worldMap.test.cjs','worldMapCore.test.cjs','worldMapIndexedDB.test.cjs'])explicit.add('tests/world-map/'+n);
const deferred=new Set(); // No non-gating research tests remain in inventory.
export function coverage(){
 const all=Object.values(inv.groups).flat();
 const extra=all.filter(p=>!explicit.has(p)&&!deferred.has(p));
 const missing=all.filter(p=>!explicit.has(p)&&!extra.includes(p)&&!deferred.has(p));
 if(missing.length)throw Error('Uncovered tests: '+missing.join(', '));
 return {all,explicit:[...explicit].filter(p=>all.includes(p)),extra,deferred:[...deferred]};
}
const args=process.argv.slice(2),c=coverage();
if(args.length===1&&args[0]==='--audit'){
 console.log(JSON.stringify({total:c.all.length,legacy:c.explicit.length,additional:c.extra.length,deferred:c.deferred},null,2));
}else if(args.length===4&&args[0]==='--group'&&args[2]==='--mode'){
 const group=args[1],mode=args[3];
 if(!Object.hasOwn(inv.groups,group)||!['node','browser'].includes(mode))throw Error('Invalid group/mode');
 const selected=c.extra.filter(p=>inv.groups[group].includes(p)&&
  (mode==='browser'?p.includes('.browser.'):!p.includes('.browser.')));
 for(const p of selected){
  console.log('FULL EXTRA TEST:',p);
  const result=spawnSync(process.execPath,[p],{cwd:root,env:process.env,stdio:'inherit',timeout:660000});
  if(result.status!==0){console.error('FAILED:',p,result.error?.message||result.signal||result.status);process.exitCode=1;}
 }
 console.log('Completed additional',group,mode,selected.length);
}else throw Error('Usage: node tests/tools/run-full-extras.mjs --audit | --group <name> --mode node|browser');
