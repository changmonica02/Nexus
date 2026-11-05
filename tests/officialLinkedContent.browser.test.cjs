const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {build}=require('esbuild'),{chromium}=require('playwright');const {setNetwork,waitForAsync}=require('./pwaBrowser.cjs');
test('official linked display: publish/reconnect, offline cache, private customization and immutable scheduling',{timeout:120000},async()=>{
  const root = path.resolve(__dirname, ".."),
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-official-private-"));
    await build({
      entryPoints: ["tests/fixtures/officialPrivateCards.jsx"],
      outfile: path.join(tmp, "fixture.js"),
      bundle: true,
      format: "esm",
      jsx: "automatic",
      define: { "process.env": JSON.stringify({ NODE_ENV: "development" }) },
      plugins: [
        {
          name: "isolated",
          setup(b) {
            b.onResolve({ filter: /^next\/link$/ }, () => ({
              path: "link",
              namespace: "fixture",
            }));
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `import React from '${root}/node_modules/react/index.js';export default function Link(props){return React.createElement('a',props)}`,
              loader: "js",
              resolveDir: root,
            }));
            b.onLoad(
              { filter: /infrastructure\/supabase\/client\.ts$/ },
              () => ({
                contents: "export const getSupabase=()=>window.dictionaryClient;",
                loader: "js",
              }),
            );
          },
        },
      ],
    });
    const css = (
      await require("postcss")([
        require("@tailwindcss/postcss")({ base: root }),
      ]).process(fs.readFileSync("src/app/globals.css", "utf8"), {
        from: path.join(root, "src/app/globals.css"),
      })
    ).css;
    const server = http.createServer((req, res) => {
      if (req.url === "/fixture.js") {
        res.setHeader("content-type", "text/javascript");
        res.end(fs.readFileSync(path.join(tmp, "fixture.js")));
      } else if (req.url === "/fixture.css") res.end(css);
      else
        res.end(
          '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>',
        );
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
   const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});const errors=[];

 try{for(const width of [1280,820,390]){const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const url='http://127.0.0.1:'+server.address().port;
 await page.goto(url+'/?linked');await page.getByRole('row',{name:/編輯單字 published apple/}).waitFor().catch(async e=>{console.error(await page.locator('body').innerText(),errors,await page.evaluate(()=>window.calls));throw e;});const before=await page.evaluate(()=>window.studyRepo.exportData());
 await page.evaluate(()=>{window.publishedContent={front:'new published',back:'新正式答案'};window.dispatchEvent(new Event('online'));});await page.getByRole('row',{name:/編輯單字 new published/}).waitFor();assert.deepEqual(await page.evaluate(()=>window.studyRepo.exportData()),before);
 await setNetwork(page,true);await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.getByRole('row',{name:/編輯單字 new published/}).waitFor();assert.equal(await page.getByText('新正式答案',{exact:true}).count(),1);await setNetwork(page,false);
 await page.getByRole('row',{name:/編輯單字 new published/}).click();const customize=page.getByRole('dialog',{name:'改為私人自訂',exact:true});await customize.getByRole('button',{name:'改為私人自訂',exact:true}).click();await customize.waitFor({state:'hidden'});
 const custom=await page.evaluate(async()=>(await window.studyRepo.exportData()).cards[0]);assert.equal(custom.official_custom,true);assert.equal(custom.front,'new published');assert.equal(custom.official_source_entry_id,'00000000-0000-4000-8000-000000000010');
 await page.evaluate(()=>{window.publishedContent={front:'must not overwrite',back:'不得覆寫'};window.dispatchEvent(new Event('online'));});await page.getByRole('row',{name:/編輯單字 new published/}).waitFor();assert.equal(await page.getByRole('row',{name:/must not overwrite/}).count(),0);
 const after=await page.evaluate(()=>window.studyRepo.exportData());for(const key of ['states','events','sessions','settings'])assert.deepEqual(after[key],before[key],key);
 await page.reload();await page.getByRole('row',{name:/編輯單字 new published/}).waitFor();await context.close();
 }
 for(const endless of [false,true]){const context=await browser.newContext({viewport:{width:endless?390:1280,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/?linked&fresh'+(endless?'&endless':''));await page.getByRole('row',{name:/編輯單字 published apple/}).waitFor();await page.getByRole('button',{name:'開始學習',exact:true}).click();await page.getByRole('button',{name:'翻至答案',exact:true}).waitFor();await page.locator('[data-study-card] p[lang=en]').filter({hasText:'published apple'}).waitFor();await page.getByRole('button',{name:'翻至答案',exact:true}).click();await page.getByText('正式蘋果',{exact:true}).waitFor();const before=await page.evaluate(()=>window.studyRepo.exportData());
 await page.evaluate(()=>{window.publishedContent={front:'session update',back:'更新答案'};window.dispatchEvent(new Event('online'));});await page.locator('[data-study-card] p[lang=en]').filter({hasText:'session update'}).waitFor();await page.getByText('更新答案',{exact:true}).waitFor();assert.deepEqual(await page.evaluate(()=>window.studyRepo.exportData()),before);
 await page.getByRole('button',{name:/^記得/}).click();await waitForAsync(page,async()=> (await window.studyRepo.exportData()).events.some(e=>e.kind==='review'));const after=await page.evaluate(()=>window.studyRepo.exportData());assert.equal(after.events.filter(e=>e.kind==='review').length,1);assert.equal(after.events.find(e=>e.kind==='review').question,'session update');assert.equal(after.cards[0].content_revision,before.cards[0].content_revision);assert.equal(after.cards[0].id,before.cards[0].id);await context.close();
 }
 assert.deepEqual(errors,[]);}finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});}
});
