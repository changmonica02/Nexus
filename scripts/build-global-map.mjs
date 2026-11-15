// Build a self-contained classic Worker; Next emits this as a hashed public asset.
// Raw TypeScript worker URLs are not compiled by all Next bundlers.
import {build} from 'esbuild';
await build({entryPoints:['src/features/worldMap/globalMapWorker.ts'],outfile:'.cache/global-map-worker.js',bundle:true,platform:'browser',format:'iife',target:'es2022',minify:true,define:{'process.argv':'undefined'}});
