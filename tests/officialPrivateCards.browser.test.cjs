const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {build}=require('esbuild'),{chromium}=require('playwright');
test('official private card editor: unlink/relink, private text, unchanged FSRS, reload, deletion confirmation and pre-migration fallback',{timeout:120000},async()=>{
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
 await page.goto(url);await page.getByRole('row',{name:/編輯單字 apple/}).waitFor();const original=await page.evaluate(async()=>({states:await window.studyDb.getAll('study_states'),events:await window.studyDb.getAll('study_events')}));
 await page.getByRole('row',{name:/編輯單字 apple/}).click();await page.getByRole('button',{name:'解除連結',exact:true}).click();await page.getByLabel('英文',{exact:true}).fill('private apple');await page.getByLabel('中文',{exact:true}).fill('我的蘋果');await page.getByRole('button',{name:'儲存',exact:true}).click();await page.getByRole('button',{name:'保留排程',exact:true}).click();await page.getByRole('row',{name:/編輯單字 private apple/}).waitFor();
 assert.deepEqual(await page.evaluate(async()=>({states:await window.studyDb.getAll('study_states'),events:await window.studyDb.getAll('study_events')})),original);assert.equal(await page.evaluate(()=>localStorage.getItem('fixture-link')),null);
 await page.reload();await page.getByRole('row',{name:/編輯單字 private apple/}).click();await page.getByLabel('手動搜尋字典連結').fill('book');await page.getByRole('button',{name:'搜尋',exact:true}).click();await page.getByRole('button',{name:'確認連結此詞條',exact:true}).click();await page.getByRole('button',{name:'儲存',exact:true}).click();await page.getByRole('row',{name:/編輯單字 private apple/}).waitFor();
 const card=await page.evaluate(async()=> (await window.studyDb.getAll('study_cards'))[0]);assert.equal(card.official_source_entry_id,'00000000-0000-4000-8000-000000000010');assert.equal(card.dictionary_entry_id,'00000000-0000-4000-8000-000000000020');assert.equal(card.back,'我的蘋果');
 await page.getByRole('button',{name:/刪除.*private apple/}).click();await page.getByRole('dialog').getByRole('button',{name:'取消',exact:true}).click();assert.equal(await page.getByRole('row',{name:/編輯單字 private apple/}).count(),1);
 await page.goto(url+'/?legacy');await page.getByRole('row',{name:/編輯單字 private apple/}).click();await page.getByText(/字典連結與單卡刪除需啟用/).waitFor();assert.equal(await page.getByRole('button',{name:'解除連結'}).count(),0);await context.close();}assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});}
});
