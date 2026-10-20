// One-time import of a pinned source fork. After import, builds use only our copy.
import { cp, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const root = process.cwd(), target = path.join(root, 'vendor/azgaar');
const commit = 'b4a0dcb933586a57242508f558f775da16c35c64';
try { await access(path.join(target, 'NEXUS-SOURCE.json')); console.log('Using the Nexus-owned Azgaar fork'); process.exit(0); } catch {}
const checkout = path.join(root, '.cache/azgaar-source');
await mkdir(checkout, { recursive: true });
const git = (...args) => execFileSync('git', ['-C', checkout, ...args], { stdio: 'inherit' });
git('init');
git('fetch', '--depth=1', 'https://github.com/Azgaar/Fantasy-Map-Generator.git', commit);
git('checkout', '--detach', 'FETCH_HEAD');
if (execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== commit) throw Error('Unexpected upstream source');
await mkdir(target, { recursive: true });
for (const name of ['src', 'public', 'scripts', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'LICENSE', 'README.md']) {
  await cp(path.join(checkout, name), path.join(target, name), { recursive: true });
}
const pkg = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'));
await writeFile(path.join(target, 'NEXUS-SOURCE.json'), JSON.stringify({ repository: 'https://github.com/Azgaar/Fantasy-Map-Generator', commit, version: pkg.version,
  note: 'Nexus-owned source fork. Edit this source independently; no upstream update compatibility is required.' }, null, 2) + '\n');
console.log('Imported fixed source. Retain LICENSE, source notices, public/libs and asset attribution.');
