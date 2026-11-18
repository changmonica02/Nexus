// Build a self-contained classic Worker; Next emits this as a hashed public asset.
// Raw TypeScript worker URLs are not compiled by all Next bundlers.
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
await import('./build-azgaar-command-tools.mjs');
const notices=(await Promise.all(['experiments/spherical-grid/azgaar-template-LICENSE.txt','node_modules/delaunator/LICENSE','node_modules/robust-predicates/LICENSE'].map(p=>readFile(p,'utf8')))).join('\n\n');
await build({banner:{js:'/*! Third-party notices\n'+notices+'\n*/'},entryPoints:['src/features/worldMap/globalMapWorker.ts'],outfile:'.cache/global-map-worker.js',bundle:true,platform:'browser',format:'iife',target:'es2022',minify:true,define:{'process.argv':'undefined'}});
