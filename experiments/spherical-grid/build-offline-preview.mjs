// Produce a standalone HTML preview that works when opened as file:// in Edge.
// Usage: node experiments/spherical-grid/build-offline-preview.mjs <bundle-js> <output-html>
import {readFile,writeFile} from 'node:fs/promises';
const [bundlePath,outputPath]=process.argv.slice(2);
if(!bundlePath||!outputPath)throw Error('Provide bundled JS and HTML output paths');
const original=await readFile(new URL('./preview.html',import.meta.url),'utf8');
const bundle=await readFile(bundlePath,'utf8');
// Keep script source inline; external scripts and module imports may fail under file://.
const marker=/<script src="\.\/preview\.js"[^>]*><\/script>/;
if(!marker.test(original))throw Error('Preview script tag missing');
const safe=bundle.replace(/<\/script/gi,'<\\/script');
const html=original.replace(marker,()=>'<script>\n'+safe+'\n</script>');
if(/<script src="\.\/preview\.js"/.test(html)||/<script type="module"/.test(html))throw Error('Unresolved browser module dependency');
await writeFile(outputPath,html,'utf8');
console.log('Created standalone offline preview:',outputPath);
