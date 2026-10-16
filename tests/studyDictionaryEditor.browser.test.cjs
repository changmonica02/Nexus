const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {build}=require('esbuild'),{chromium}=require('playwright');
test('formal study dictionary editor: admin only after reveal/details, Review isolation, publish, guarded close and unchanged Session/private data',{timeout:150000},async()=>{
  const root = path.resolve(__dirname, ".."),
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-study-dictionary-"));
    await build({
      entryPoints: ["tests/fixtures/studyDictionaryEditor.jsx"],
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
 try{for(const [width,role] of [[1280,'admin'],[820,'admin'],[390,'admin'],[820,'official'],[820,'reader'],[390,'unlinked']]){
 const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const url='http://127.0.0.1:'+server.address().port;
 await page.goto(url+'/?'+role);await page.getByRole('button',{name:'開始學習',exact:true}).click();await page.getByRole('button',{name:'顯示答案',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'編輯詞條',exact:true}).count(),0);await page.getByRole('button',{name:'顯示答案',exact:true}).click();assert.equal(await page.getByRole('button',{name:'編輯詞條',exact:true}).count(),0);if(role==='unlinked'){assert.equal(await page.getByRole('button',{name:/字典詳情/}).count(),0);await context.close();continue;}await page.getByRole('button',{name:/字典詳情/}).click();await page.getByRole('dialog',{name:'字典詳情',exact:true}).waitFor();
 if(!['admin','official'].includes(role)){await page.waitForTimeout(500);assert.equal(await page.getByRole('button',{name:'編輯詞條',exact:true}).count(),0);await context.close();continue;}
 await page.getByRole('button',{name:'編輯詞條',exact:true}).waitFor();const before=await page.evaluate(async()=>({cards:await window.studyDb.getAll('study_cards'),states:await window.studyDb.getAll('study_states'),events:await window.studyDb.getAll('study_events'),sessions:await window.studyDb.getAll('study_sessions')}));
 await page.getByRole('button',{name:'編輯詞條',exact:true}).click();const modal=page.getByRole('dialog',{name:'編輯詞條',exact:true});await modal.getByLabel('詞性',{exact:true}).waitFor();await modal.getByLabel('中文意思',{exact:true}).fill('新版公開意思');await page.keyboard.press('1');await page.keyboard.press('Space');await page.keyboard.press('ArrowRight');await modal.getByRole('button',{name:'關閉',exact:true}).click();await page.getByRole('button',{name:'繼續編輯',exact:true}).click();assert.equal(await modal.isVisible(),true);assert.ok((await modal.getByLabel('中文意思',{exact:true}).inputValue()).startsWith('新版公開意思'));
 await modal.getByLabel('中文意思',{exact:true}).fill('新版公開意思');await modal.getByRole('button',{name:'儲存',exact:true}).click();await modal.waitFor({state:'detached'});await page.getByRole('button',{name:'編輯詞條',exact:true}).waitFor();assert.equal(await page.getByText('新版公開意思',{exact:true}).count(),0,'unpublished Review must not leak');
 await page.getByRole('button',{name:'編輯詞條',exact:true}).click();await modal.getByRole('button',{name:'發布',exact:true}).waitFor();await modal.getByRole('button',{name:'發布',exact:true}).click();await page.getByRole('dialog',{name:'核准發布新版本',exact:true}).getByRole('button',{name:'發布',exact:true}).click();await page.waitForFunction(()=>window.fixture.snapshot.detail.entry.revision===2);await modal.waitFor({state:'detached'});await page.getByText('新版公開意思',{exact:true}).waitFor({state:'attached'});assert.equal(await page.getByText('已依穩定詞條 ID 連結').count(),0);await page.getByRole('dialog',{name:'字典詳情',exact:true}).getByRole('button',{name:'關閉',exact:true}).click();assert.equal(await page.getByText('我的私人答案',{exact:true}).isVisible(),true);assert.equal(await page.getByRole('button',{name:/字典詳情/}).getAttribute('aria-expanded'),'false');await page.getByRole('button',{name:/字典詳情/}).click();await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'字典詳情',exact:true}).waitFor({state:'detached'});
 assert.deepEqual(await page.evaluate(async()=>({cards:await window.studyDb.getAll('study_cards'),states:await window.studyDb.getAll('study_states'),events:await window.studyDb.getAll('study_events'),sessions:await window.studyDb.getAll('study_sessions')})),before,'public editing cannot alter Session or private FSRS data');await context.close();
 }assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});}
});
