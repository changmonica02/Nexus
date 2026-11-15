// Run against the packaged HTML, not the source module or an HTTP server.
// NODE_PATH may point to an isolated Playwright installation in CI.
const assert = require('node:assert/strict');
const {readFile} = require('node:fs/promises');
const {resolve, join} = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

(async () => {
 const html = resolve(process.argv[2]);
 const browser = await chromium.launch({headless:true});
 try {
  const context = await browser.newContext({acceptDownloads:true});
  const requests = [], errors = [];
  await context.route(/^https?:/, route => {requests.push(route.request().url());return route.abort();});
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const ready = () => page.waitForFunction(() =>
   document.querySelector('#status').textContent.includes('已產生草稿'), null, {timeout:30000});
  const image = () => page.locator('#map').evaluate(canvas => {
   const bytes=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
   let land=0,sea=0,hash=2166136261;
   for(let i=0;i<bytes.length;i+=4){
    if((bytes[i]===162&&bytes[i+1]===186&&bytes[i+2]===129)||
       (bytes[i]===155&&bytes[i+1]===182&&bytes[i+2]===139))land++;
    if(bytes[i]===177&&bytes[i+1]===211&&bytes[i+2]===223)sea++;
    hash=Math.imul(hash^bytes[i],16777619)>>>0;
   }
   return {land,sea,hash};
  });
  await page.goto(pathToFileURL(html).href);
  await ready();
  const first=await image();
  assert.ok(first.land>10000 && first.sea>10000,'Packaged preview must draw both land and sea');
  await page.click('#generate');await ready();
  assert.deepEqual(await image(),first,'Same seed must reproduce the drawing');
  await page.fill('#seed','42');
  await page.selectOption('#land','45');
  await page.locator('#cores').fill('6');
  await page.click('#generate');await ready();
  assert.notEqual((await image()).hash,first.hash,'Changed settings must change the drawing');
  assert.ok(Math.abs(parseFloat(await page.locator('#measured').textContent())-45)<.01);
  await page.click('#confirm');
  await page.waitForFunction(()=>!document.querySelector('#export').disabled,null,{timeout:30000});
  const downloading=page.waitForEvent('download');
  await page.click('#export');
  const download=await downloading;
  assert.equal(download.suggestedFilename(),'nexus-land-42.json');
  assert.equal(await download.failure(),null);
  const confirmed=JSON.parse(await readFile(await download.path(),'utf8'));
  const {reopenConfirmedLandLayout}=await import('./land-generator.mjs');
  const reopened=reopenConfirmedLandLayout(confirmed);
  assert.equal(reopened.state.grid.heights.length,36002);
  assert.equal(reopened.settings.seed,42);
  assert.equal(reopened.settings.landPercent,45);
  assert.equal(reopened.settings.continentCores,6);
  await page.click('#random');await ready();
  assert.equal(await page.locator('#export').isDisabled(),true,'New draft must require confirmation');
  await page.reload();await ready();
  assert.deepEqual(await image(),first,'Local file must reopen without cached modules');
  await page.screenshot({path:join(resolve(html,'..'),'preview.png'),fullPage:true});
  assert.deepEqual(errors,[],'No uncaught browser errors');
  assert.deepEqual(requests,[],'Standalone preview must not request network resources');
  console.log('PASS: file:// drawing, seed, settings, confirmation, download, snapshot restore and reload');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
