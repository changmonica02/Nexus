import { cp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { build } from 'esbuild';
const root = process.cwd(), source = path.join(root, 'vendor/azgaar'), work = path.join(root, '.cache/azgaar-build');
const run=(tool,args)=>execFileSync(process.platform==='win32'?tool+'.cmd':tool,args,{cwd:work,stdio:'inherit',shell:process.platform==='win32',env:{...process.env,ELECTRON_SKIP_BINARY_DOWNLOAD:'1'}});
await readFile(path.join(source, 'NEXUS-SOURCE.json')); // Missing fork is a build failure, never an online fallback.
await mkdir(work, { recursive: true });
for (const name of ['src', 'public', 'scripts', 'docs']) {
  await rm(path.join(work, name), { recursive: true, force: true });
  await cp(path.join(source, name), path.join(work, name), { recursive: true });
}
for (const name of ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts']) await cp(path.join(source, name), path.join(work, name));
const patch = async (file, before, after) => {
  const target = path.join(work, file), text = await readFile(target, 'utf8');
  if (!text.includes(before) || text.indexOf(before) !== text.lastIndexOf(before)) throw Error(`Fork adapter anchor changed: ${file}`);
  await writeFile(target, text.replace(before, after));
};
await patch('src/index.html', '<head>', '<head>\n<script src="./nexus-storage.js"></script><script src="./nexus-i18n.js"></script>');
await patch('src/main.ts', 'document.addEventListener("DOMContentLoaded", boot);', 'import "./nexus-bridge";\ndocument.addEventListener("DOMContentLoaded", boot);');
await patch('src/services/platform.ts', 'export function registerServiceWorker(): void {', 'export function registerServiceWorker(): void {\n  if (window.parent !== window) return;');
await patch('src/components/shell.ts', '  if (location.hostname) return false;', '  if (location.hostname || window.parent !== window) return false;');
// Native IDB coerces this legacy array to a string; the opaque-origin IDB shim does not.
await patch('public/libs/indexedDB.js', 'transaction.objectStore([STORE_NAME])', 'transaction.objectStore(STORE_NAME)');
await patch('src/components/lifecycle.ts', '  initiateAutosave();', '  if (window.parent === window) initiateAutosave();');
await patch('src/services/io/save.ts', 'async function writeToStorage(mapData: string, showTip = false): Promise<void> {', 'async function writeToStorage(mapData: string, showTip = false): Promise<void> {\n  if (window.nexusSaveProject) return window.nexusSaveProject(new Blob([mapData], {type: "application/octet-stream"}));');
await patch('src/services/io/load.ts', 'async function parseLoadedData(data: string[], mapVersion: string | null): Promise<void> {', 'async function parseLoadedData(data: string[], mapVersion: string | null, propagate = false): Promise<void> {');
await patch('src/services/io/load.ts', 'function uploadMap(file: Blob, callback?: () => void): void {', 'function uploadMap(file: Blob, callback?: () => void): void {\n if(window.nexusLoadProject){void window.nexusLoadProject(file).then(()=>callback?.()).catch(error=>tip(String(error),true,"error"));return;}');
// The last loader catch belongs to parseLoadedData. Surface failures to Nexus.
const loadFile = path.join(work, 'src/services/io/load.ts');
let loader = await readFile(loadFile, 'utf8');
const at = loader.lastIndexOf('  } catch (error) {');
if (at < 0) throw Error('Missing native loader error boundary');
loader = loader.slice(0, at) + loader.slice(at).replace('  } catch (error) {', '  } catch (error) {\n    if (propagate) throw error;');
loader += '\nexport async function loadNexusMap(blob: Blob): Promise<void> {\n const {mapData, mapVersion} = await parseLoadedResult(await blob.arrayBuffer());\n if (!mapData || mapVersion !== VERSION || mapData.length < 12 || !mapData[5]) throw Error("Invalid or unsupported map project");\n await parseLoadedData(mapData, mapVersion, true);\n}\n';
await writeFile(loadFile, loader);
await cp(path.join(root, 'integrations/azgaar/nexus-bridge.ts'), path.join(work, 'src/nexus-bridge.ts'));
await build({ entryPoints: [path.join(root, 'integrations/azgaar/storage-shim.mjs')], outfile: path.join(work, 'public/nexus-storage.js'), bundle: true, format: 'iife', platform: 'browser', minify: true });
await build({entryPoints:[path.join(root,'integrations/azgaar/nexus-i18n.ts')],outfile:path.join(work,'public/nexus-i18n.js'),bundle:true,format:'iife',platform:'browser',minify:true});
const lock = await readFile(path.join(work, 'package-lock.json'));
const hash = createHash('sha256').update('include-dev-v1\0').update(lock).digest('hex');
let installed = ''; try { installed = await readFile(path.join(work, '.nexus-installed'), 'utf8'); } catch {}
if (installed !== hash) {
  // Vercel inherits production/omit=dev; the fork needs Vite and TypeScript to build.
  run('npm',['ci','--include=dev','--ignore-scripts','--no-audit','--no-fund']);
  await writeFile(path.join(work, '.nexus-installed'), hash);
}
run('npx',['tsc','--noEmit']);
// A single executable core also works in an opaque offline document: no native
// module fetches can bypass Nexus's public-asset broker. The fork source stays modular.
await writeFile(path.join(work,'vite.config.ts'), `import {fileURLToPath,URL} from 'node:url';export default {root:'./src',publicDir:'../public',build:{outDir:'../dist',assetsDir:'.',emptyOutDir:true,rollupOptions:{output:{format:'iife',inlineDynamicImports:true}}},resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}}};`);
run('npx',['vite','build','--base=/world-map/core/']);
const output = path.join(root, 'public/world-map/core');
await rm(output, { recursive: true, force: true });
await cp(path.join(work, 'dist'), output, { recursive: true });
await cp(path.join(source, 'LICENSE'), path.join(output, 'AZGAAR-LICENSE.txt'));
await cp(path.join(source, 'NEXUS-SOURCE.json'), path.join(output, 'NEXUS-SOURCE.json'));
const packages = JSON.parse(lock.toString()).packages;
await writeFile(path.join(output, 'THIRD-PARTY-PACKAGES.json'), JSON.stringify(Object.entries(packages).filter(([name, p]) => name && !p.dev).map(([name, p]) => ({ name, version: p.version, license: p.license })), null, 2));
const shimPackage=JSON.parse(await readFile(path.join(root,'node_modules/fake-indexeddb/package.json'),'utf8'));
const shimNotice=path.join(output,'licenses/fake-indexeddb');await mkdir(shimNotice,{recursive:true});
await cp(path.join(root,'node_modules/fake-indexeddb/LICENSE'),path.join(shimNotice,'LICENSE'));
await writeFile(path.join(shimNotice,'PACKAGE.json'),JSON.stringify({name:shimPackage.name,version:shimPackage.version,license:shimPackage.license},null,2));
// Copy dependency licenses as well as preserving the original public asset notices.
for (const [name, pkg] of Object.entries(packages)) {
  if (!name || pkg.dev) continue;
  for (const file of await readdir(path.join(work, name))) if (/^(licen[sc]e|copying|notice)/i.test(file)) {
    const dest = path.join(output, 'licenses', name.replace(/^node_modules\//, ''));
    await mkdir(dest, { recursive: true }); await cp(path.join(work, name, file), path.join(dest, file), { recursive: true });
  }
}
console.log('Built Nexus map core from our local fixed source fork');
async function walk(dir) {
  const entries=[];
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const name=path.join(dir,entry.name);
    if(entry.isDirectory())entries.push(...await walk(name));else entries.push(name);
  }
  return entries;
}
const noticeFiles=(await walk(output)).filter(file=>/licen[sc]e|copying|notice/i.test(path.basename(file)));
const notices=[];
for(const file of noticeFiles.sort())notices.push('===== '+path.relative(output,file)+' =====\n'+await readFile(file,'utf8'));
await writeFile(path.join(output,'THIRD-PARTY-NOTICES.txt'),notices.join('\n\n'));
const files=await walk(output);
const urls=files.map(file=>'/world-map/core/'+path.relative(output,file).split(path.sep).map(encodeURIComponent).join('/'));
const fingerprint=createHash('sha256');
for(const file of files)fingerprint.update(await readFile(file));
const cache='nexus-world-map-'+fingerprint.digest('hex').slice(0,20);
await writeFile(path.join(root,'public/world-map/offline.js'), `// Public map tools only. Never cache Nexus API responses or user projects.
const CACHE=${JSON.stringify(cache)}, FILES=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);for(let i=0;i<FILES.length;i+=20)await cache.addAll(FILES.slice(i,i+20));await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('nexus-world-map-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith('/world-map/core/'))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const saved=await cache.match(event.request,{ignoreSearch:true});return saved||fetch(event.request);})());});
`);

