#!/usr/bin/env node
// Test group inventory and selector; does not execute tests.
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const config=JSON.parse(readFileSync(path.join(root,'tests/config/test-groups.json'),'utf8'));
const groups=config.groups;
const tracked=Object.values(groups).flat();
function walk(directory,pattern){
 const found=[];
 for(const entry of readdirSync(path.join(root,directory),{withFileTypes:true})){
  const current=directory+'/'+entry.name;
  if(entry.isDirectory())found.push(...walk(current,pattern));
  else if(entry.isFile()&&pattern.test(entry.name))found.push(current);
 }
 return found;
}
function check(){
 const actual=[...walk('tests',/\.test\.cjs$/),...walk('experiments/spherical-grid',/\.test\.mjs$/)];
 const benchmarkActual=walk('experiments/spherical-grid',/benchmark\.mjs$/);
 const missing=actual.filter(p=>!tracked.includes(p)),stale=tracked.filter(p=>!actual.includes(p));
 const duplicate=tracked.filter((p,i)=>tracked.indexOf(p)!==i);
 const benchMissing=benchmarkActual.filter(p=>!config.benchmarks.includes(p));
 const benchStale=config.benchmarks.filter(p=>!benchmarkActual.includes(p));
 if(missing.length||stale.length||duplicate.length||benchMissing.length||benchStale.length){
  console.error(JSON.stringify({missing,stale,duplicate,benchMissing,benchStale},null,2));process.exitCode=1;
 }else console.log('Test groups valid: '+tracked.length+' tests, '+config.benchmarks.length+' benchmarks');
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==='--check')check();
else if(args.length===1&&args[0]==='--list')for(const [name,paths] of Object.entries(groups))console.log(name+': '+paths.length);
else if(args.length===2&&args[0]==='--group'){
 if(!Object.hasOwn(groups,args[1])){console.error('Unknown group: '+args[1]);process.exitCode=2;}
 else console.log(groups[args[1]].join('\n'));
}else if(args.length===1&&args[0]==='--benchmarks')console.log(config.benchmarks.join('\n'));
else {console.error('Usage: node tests/tools/test-groups.mjs --check | --list | --group <name> | --benchmarks');process.exitCode=2;}
