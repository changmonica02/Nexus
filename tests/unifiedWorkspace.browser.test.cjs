const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { build } = require("esbuild"),
  { chromium } = require("playwright");
const root = path.resolve(__dirname, "..").replaceAll('\\', '/');
async function until(page, predicate, arg) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await page.evaluate(predicate, arg)) return;
    await page.waitForTimeout(25);
  }
  throw Error("Timed out waiting for persisted workspace state");
}

test(
  process.env.NEXUS_SAVE_ONLY ? "actual workspace: slow/failed saves, retry, newer edits and split-pane isolation" : process.env.NEXUS_SYNC_ONLY ? "actual workspace auth: token refresh and dictionary navigation reuse sync engine at four sizes" : "actual shared workspace: overlay/focus/footer at four sizes, settings, tools, Web navigation, collection menus and dictionary union/pagination",
  { timeout: 180000 },
  async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-ui-"));
    await build({
      entryPoints: ["tests/fixtures/unifiedWorkspace.jsx"],
      outfile: path.join(tmp, "fixture.js"),
      bundle: true,
      format: "esm",
      loader: { ".woff2": "dataurl", ".woff": "dataurl", ".ttf": "dataurl" },
      jsx: "automatic",
      define: { "process.env.NODE_ENV": '"test"' },
      plugins: [
        {
          name: "isolated-services",
          setup(b) {
            if(process.env.NEXUS_DECK_MANAGEMENT)b.onLoad({filter:/fixtures[\\/]unifiedWorkspace\.jsx$/},args=>{
              let text=fs.readFileSync(args.path,'utf8');
              text=text.replace('window.fixtureStorage = storage;',`const repo=storage.getStudyRepository();
              let other=(await storage.listPages()).find(p=>p.title==='Other study');
              if(!other){other=await storage.createPage({kind:'study_set',title:'Other study'});await repo.ensureDeck(other);await repo.addCards(other.id,[{front:'other',back:'其他'}]);}
              const primary=(await storage.listPages()).find(p=>p.title==='Sample study_set');
              if(!(await repo.listStyles()).some(s=>s.id==='study-style:shared-fixture')){const current=await repo.styleForDeck(primary.id);const shared={...current.style,id:'study-style:shared-fixture',name:'Legacy shared',new_limit:2,review_limit:2,study_mode:'endless'};await repo.saveStyle(shared);await repo.assignStyle(primary.id,shared.id);await repo.assignStyle(other.id,shared.id);}
              window.mainDeckId=primary.id;window.otherDeckId=other.id;
              window.switchFixtureAccount=next=>{storage.setWorkspaceOwner(next);session.user=next?{id:next,email:next+'@example.invalid'}:null;for(const cb of window.authListeners)cb(next?'SIGNED_IN':'SIGNED_OUT',next?session:null);};
              window.fixtureStorage = storage;`);
              return {contents:text,loader:'jsx'};
            });
            if (process.env.NEXUS_NAV_PERF) {
              b.onLoad({filter:/components[\\/]NexusApp\.tsx$/}, async args => {
                let text=process.env.NEXUS_PERF_BASELINE?require('node:child_process').execFileSync('git',['show','c776a1b:src/components/NexusApp.tsx'],{encoding:'utf8'}):fs.readFileSync(args.path,'utf8');
                text=text.replace('const flushSave = useCallback(async (pageToSave: Page) => {','const flushSave = useCallback(async (pageToSave: Page) => { const __start=performance.now();try {');
                text=text.replace('}, [storageRef]);\n  const commitCharacterData','} finally { window.navMetrics.flush.push(performance.now()-__start); } }, [storageRef]);\n  const commitCharacterData');
                return {contents:text,loader:'tsx'};
              });
              if(process.env.NEXUS_PERF_BASELINE)b.onLoad({filter:/[\\/]src[\\/].*\.(ts|tsx)$/},args=>{
                const file=path.relative(root,args.path).replaceAll('\\','/');
                if(!['src/components/HomeScreen.tsx','src/components/Sidebar.tsx','src/components/SettingsDialog.tsx','src/features/study/StudyRepository.ts','src/features/study/scheduledStudy.ts','src/features/study/components/StudySetView.tsx','src/features/study/components/StudyHomeOverview.tsx','src/features/study/components/StudyPreferences.tsx','src/lib/i18n.ts'].includes(file))return null;
                return {contents:require('node:child_process').execFileSync('git',['show','c776a1b:'+file],{encoding:'utf8'}),loader:file.endsWith('tsx')?'tsx':'ts'};
              });
              b.onLoad({filter:/fixtures[\\/]unifiedWorkspace\.jsx$/}, async args => {
                let text=fs.readFileSync(args.path,'utf8');
                text=text.replace('const originalSave = IndexedDBAdapter.prototype.savePage;',`window.navMetrics={flush:[],reads:[],renders:[]};
                const proto=Object.getPrototypeOf(storage.getStudyRepository());
                for(const name of ['ensureDeck','readDeck','readScheduledDeck']){const original=proto[name];proto[name]=async function(...args){const start=performance.now();try{return await original.apply(this,args);}finally{window.navMetrics.reads.push({name,ms:performance.now()-start});}};}
                const originalSave = IndexedDBAdapter.prototype.savePage;`);
                text=text.replace('<>\n    <WorkspaceRoot>','<React.Profiler id="workspace" onRender={(id,phase,duration)=>window.navMetrics.renders.push({phase,ms:duration})}>\n    <WorkspaceRoot>').replace('</>,','</React.Profiler>,');
                return {contents:text,loader:'jsx'};
              });
            }
            b.onLoad(
              { filter: /infrastructure[\\/]supabase[\\/]client\.ts$/ },
              () => ({
                contents:
                  "export const getSupabase=()=>window.dictionaryClient;export const isSupabaseConfigured=()=>true;",
                loader: "js",
              }),
            );
            b.onLoad(
              { filter: /infrastructure[\\/]sync[\\/]syncEngine\.ts$/ },
              () => ({
                contents:
                  "export class SyncEngine { constructor(){window.engineCount=(window.engineCount||0)+1;}subscribe(){}setOnRemoteChange(cb){window.remoteRefresh=cb;}async fullSync(){}startRealtime(){}destroy(){}pushPage(){}pushPages(){}pushPermanentDeletePage(){}pushPermanentDeleteAttachment(){} }",
                loader: "js",
              }),
            );
            b.onResolve({ filter: /^next\/link$/ }, () => ({
              path: "link",
              namespace: "mock",
            }));
            b.onLoad({ filter: /link/, namespace: "mock" }, () => ({
              contents: `import React from '${root}/node_modules/react/index.js';export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}`,
              loader: "jsx",
              resolveDir: root,
            }));
            b.onResolve({ filter: /^next\/navigation$/ }, () => ({
              path: "navigation",
              namespace: "mock",
            }));
            b.onLoad({ filter: /navigation/, namespace: "mock" }, () => ({
              contents: `import {useSyncExternalStore} from '${root}/node_modules/react/index.js';const subscribe=cb=>{window.addEventListener('fixture-nav',cb);return()=>window.removeEventListener('fixture-nav',cb)};const go=href=>{history.pushState(null,'',href);window.dispatchEvent(new Event('fixture-nav'));};export function usePathname(){return useSyncExternalStore(subscribe,()=>location.pathname)}export const useRouter=()=>({push:go,replace:go});export const useSearchParams=()=>new URLSearchParams(location.search);`,
              loader: "js",
              resolveDir: root,
            }));
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
          '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>',
        );
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    const errors = [];
    try {
      for (const [width, height] of [
        [1440, 900],
        [820, 1180],
        [1180, 820],
        [process.env.NEXUS_DECK_MANAGEMENT?320:390, 844],
      ]) {
        const context = await browser.newContext({
            viewport: { width, height },
            hasTouch: width !== 1440,
          }),
          page = await context.newPage();
        page.setDefaultTimeout(10000);
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        if(process.env.NEXUS_DECK_MANAGEMENT){
          const toggle=page.getByLabel('切換首頁',{exact:true});await toggle.waitFor();await toggle.selectOption('learning');
          await page.getByRole('button',{name:'開始學習',exact:true}).waitFor();
          const start=await page.getByRole('button',{name:'開始學習',exact:true}).boundingBox();assert.ok(start.width>start.height*2);
          await page.getByRole('button',{name:'切換學習組',exact:true}).click();const sheet=page.getByRole('dialog',{name:'切換學習組',exact:true});
          const bounds=await sheet.boundingBox();assert.ok(Math.abs(bounds.y+bounds.height-height)<3,'sheet attaches to bottom');
          await sheet.getByRole('radio',{name:'Sample study_set',exact:true}).check();await sheet.getByRole('radio',{name:'Other study',exact:true}).check();await sheet.getByRole('radio',{name:'Other study',exact:true}).check();assert.equal(await sheet.getByRole('radio',{checked:true}).count(),1);
          await sheet.getByRole('radio',{name:'Sample study_set',exact:true}).check();
          const before=await page.evaluate(async()=>({other:await window.fixtureStorage.getStudyRepository().styleForDeck(window.otherDeckId),data:await window.fixtureStorage.getStudyRepository().exportData()}));
          await sheet.getByRole('button',{name:'管理 Sample study_set',exact:true}).click();const management=page.locator('[data-study-management]');await management.getByLabel('每日新卡上限',{exact:true}).waitFor();
          assert.equal(await management.getAttribute('data-study-management'),await page.evaluate(()=>window.mainDeckId));assert.equal(await management.getByRole('table',{name:'單字列表'}).count(),0);await management.getByRole('button',{name:/^查看字卡/}).click();await management.getByRole('table',{name:'單字列表'}).waitFor();await management.getByRole('button',{name:'返回學習組設定',exact:true}).click();await management.getByLabel('每日新卡上限',{exact:true}).waitFor();
          await management.getByLabel('每日新卡上限',{exact:true}).fill('7');await management.getByLabel('每日新卡上限',{exact:true}).press('Enter');
          await page.waitForFunction(async()=> (await window.fixtureStorage.getStudyRepository().styleForDeck(window.mainDeckId)).style.new_limit===7);
          const after=await page.evaluate(async()=>({other:await window.fixtureStorage.getStudyRepository().styleForDeck(window.otherDeckId),data:await window.fixtureStorage.getStudyRepository().exportData()}));assert.deepEqual(after.other,before.other);for(const key of ['cards','states','events','sessions'])assert.deepEqual(after.data[key],before.data[key],key);
          if(width===1440){
            await page.evaluate(()=>{const proto=Object.getPrototypeOf(window.fixtureStorage.getStudyRepository());window.restoreSettingsSave=proto.saveDeckStyle;proto.saveDeckStyle=async()=>{throw Error('Settings disk failure');};});
            await management.getByLabel('每日新卡上限',{exact:true}).fill('8');await management.getByLabel('每日新卡上限',{exact:true}).press('Enter');await management.getByRole('alert').getByText(/Settings disk failure/).waitFor();
            await page.getByRole('button',{name:'Nexus',exact:true}).first().click();assert.equal(await management.isVisible(),true);assert.equal(await management.getByLabel('每日新卡上限',{exact:true}).inputValue(),'8');
            await page.evaluate(()=>{Object.getPrototypeOf(window.fixtureStorage.getStudyRepository()).saveDeckStyle=window.restoreSettingsSave;});
            await management.getByLabel('每日新卡上限',{exact:true}).fill('9');await management.getByLabel('每日新卡上限',{exact:true}).press('Enter');await page.waitForFunction(async()=> (await window.fixtureStorage.getStudyRepository().styleForDeck(window.mainDeckId)).style.new_limit===9);
            const notice=page.locator('[role=alert].fixed');if(await notice.count())await notice.click();
          }
          await management.getByRole('button',{name:'返回學習組選擇',exact:true}).click();await sheet.getByRole('radio',{name:'Sample study_set',exact:true}).waitFor();assert.equal(await sheet.getByRole('radio',{name:'Sample study_set',exact:true}).isChecked(),true);await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'切換學習組',exact:true}).evaluate(el=>document.activeElement===el),true);
          await page.getByRole('button',{name:'日曆與待辦',exact:true}).click();const calendar=page.getByRole('dialog',{name:'日曆與待辦',exact:true});await calendar.getByRole('button',{name:'Sample todo',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.keyboard.press('Escape');
          await page.getByRole('button',{name:'功能總覽',exact:true}).click();await page.getByRole('button',{name:'字卡',exact:true}).click();await page.getByRole('heading',{name:'我的學習集',exact:true}).waitFor();
          await page.getByLabel('搜尋項目',{exact:true}).fill('Sample');await page.getByRole('button',{name:'更多操作 Sample study_set',exact:true}).click();await page.getByRole('menuitem',{name:'管理學習組',exact:true}).click();await management.getByLabel('每日新卡上限',{exact:true}).waitFor();assert.equal(await management.getByLabel('每日新卡上限',{exact:true}).inputValue(),width===1440?'9':'7');
          await management.getByRole('button',{name:'返回學習集',exact:true}).click();assert.equal(await page.getByLabel('搜尋項目',{exact:true}).inputValue(),'Sample');assert.equal(await management.count(),0);
          await page.reload();await toggle.waitFor();assert.equal(await toggle.inputValue(),'learning');await page.getByRole('button',{name:'切換學習組',exact:true}).click();assert.equal(await sheet.getByRole('radio',{name:'Sample study_set',exact:true}).isChecked(),true);await page.keyboard.press('Escape');
          await page.keyboard.press('Control+k');await page.locator('input[placeholder]').filter({visible:true}).last().fill('Sample note');await page.getByText('Sample note',{exact:true}).last().click();await page.locator('.ProseMirror').first().waitFor();
          if(!await page.getByRole('button',{name:'首頁',exact:true}).isVisible())await page.getByRole('button',{name:'開啟導覽',exact:true}).click();
          assert.equal(await page.getByText(/本次預計安排.*張字卡/).count(),0);
          const home=page.getByRole('button',{name:'首頁',exact:true});await home.click();await page.waitForTimeout(350);assert.equal(await page.locator('.ProseMirror').first().isVisible(),true);
          await home.dblclick();await page.getByRole('button',{name:'開始學習',exact:true}).waitFor();
          await page.getByRole('button',{name:'開啟導覽',exact:true}).click();const reopen=page.getByRole('button',{name:'首頁',exact:true});await reopen.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'開始學習',exact:true}).waitFor();
          if(width===320){await page.getByRole('button',{name:'開啟導覽',exact:true}).click();const touchHome=page.getByRole('button',{name:'首頁',exact:true});await touchHome.dispatchEvent('pointerdown',{pointerType:'touch',clientX:30,clientY:80});await page.waitForTimeout(650);await page.getByRole('dialog',{name:'開啟導覽',exact:true}).waitFor({state:'hidden'});assert.equal(await page.getByRole('dialog',{name:'開啟導覽',exact:true}).count(),0);}
          await context.setOffline(true);await page.getByRole('button',{name:'切換學習組',exact:true}).click();await sheet.getByRole('button',{name:'管理 Sample study_set',exact:true}).click();await management.getByLabel('排程方法',{exact:true}).waitFor();await management.getByLabel('單次複習上限',{exact:true}).fill('3');await management.getByLabel('單次複習上限',{exact:true}).press('Enter');await page.waitForFunction(async()=> (await window.fixtureStorage.getStudyRepository().styleForDeck(window.mainDeckId)).style.review_limit===3);await management.getByRole('button',{name:'返回學習組選擇',exact:true}).click();await page.keyboard.press('Escape');await context.setOffline(false);
          if(width===1440){
            await page.getByRole('button',{name:'切換學習組',exact:true}).click();await sheet.getByRole('button',{name:'新增學習組',exact:false}).click();await management.getByLabel('每日新卡上限',{exact:true}).waitFor();
            assert.equal(await management.getByLabel('每日新卡上限',{exact:true}).inputValue(),'20');assert.equal(await management.getByLabel('單次複習上限',{exact:true}).inputValue(),'100');
            const otherOwner='00000000-0000-4000-8000-000000000002';await page.evaluate(owner=>window.switchFixtureAccount(owner),otherOwner);await page.waitForFunction(owner=>window.fixtureStorage.getWorkspaceOwner()===owner,otherOwner);assert.equal(await management.count(),0);await page.waitForFunction(()=>!document.body.innerText.includes('Sample study_set'));assert.equal(await toggle.inputValue(),'classic');
            await page.evaluate(()=>window.switchFixtureAccount('00000000-0000-4000-8000-000000000001'));await page.waitForFunction(()=>window.fixtureStorage.getWorkspaceOwner()==='00000000-0000-4000-8000-000000000001');assert.equal(await toggle.inputValue(),'learning');
          }
          await page.screenshot({path:'/tmp/nexus132-home-'+width+'.png',fullPage:true});
          assert.deepEqual(errors,[]);await context.close();continue;
        }
        if (process.env.NEXUS_NAV_PERF) {
          if(width!==1440){await context.close();continue;}
          const samples=[];
          async function visit(title,ready){
            await page.keyboard.press('Control+k');await page.locator('input[placeholder]').filter({visible:true}).last().fill(title);
            const item=page.getByText(title,{exact:true}).last();await item.waitFor();
            const started=await page.evaluate(()=>performance.now());await item.click();await ready();
            return await page.evaluate(start=>performance.now()-start,started);
          }
          await page.locator('main').waitFor();
          for(let i=0;i<8;i++){
            const before=await page.evaluate(()=>({writes:window.saveAttempts.length,reads:window.navMetrics.reads.length,flush:window.navMetrics.flush.length,renders:window.navMetrics.renders.length}));
            const note=await visit('Sample note',()=>page.locator('.ProseMirror').first().waitFor());
            const study=await visit('Sample study_set',()=>page.getByRole('table',{name:'單字列表',exact:true}).waitFor());
            const web=await visit('Sample web',()=>page.waitForFunction(()=>[...document.querySelectorAll('input')].some(n=>n.value==='Sample web')));
            const stats=await page.evaluate(b=>({writes:window.saveAttempts.length-b.writes,reads:window.navMetrics.reads.slice(b.reads),flush:window.navMetrics.flush.slice(b.flush),renders:window.navMetrics.renders.slice(b.renders)}),before);
            if(i>1)samples.push({note,study,web,...stats});
          }
          console.log('NAV_PERF '+JSON.stringify(samples));assert.deepEqual(errors,[]);await context.close();continue;
        }
        const opener = page.getByRole("button", {
          name: "開啟導覽",
          exact: true,
        });
        await opener.waitFor();
        await page.waitForFunction(() => window.authListeners?.size > 0);
        const engines = await page.evaluate(() => window.engineCount);
        await page.evaluate(() => { window.refreshAuth(); window.refreshAuth(); });
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(() => window.engineCount), engines, 'same-account token refresh reuses sync engine');
        if (process.env.NEXUS_CURSOR_ONLY) {
          await opener.click();
          await page.getByRole('dialog',{name:'開啟導覽',exact:true}).getByText('Sample note',{exact:true}).click();
          const editor=page.locator('.ProseMirror').first();
          await editor.click(); await page.keyboard.press('Control+End');
          await page.keyboard.insertText('中文 English');
          // Fire the real remote-refresh callback while the new text is only
          // in the debounce queue; IndexedDB still contains the old snapshot.
          await page.evaluate(()=>window.remoteRefresh());
          await page.keyboard.press('Space'); await page.keyboard.insertText('tail');
          assert.match(await editor.innerText(),/中文 English tail$/);
          await page.locator('[data-save-status=saved]').waitFor();
          assert.ok(await page.evaluate(async()=> (await window.fixtureStorage.listPages()).some(p=>p.content_text?.includes('中文 English tail'))));
          await context.close(); continue;
        }
        if (process.env.NEXUS_SAVE_ONLY) {
          await opener.click();
          const drawer = page.getByRole('dialog', {name:'開啟導覽',exact:true});
          await drawer.getByText('Sample note',{exact:true}).click();
          const pane = page.locator('[data-workspace-pane]');
          const titleInput = pane.locator('input[type=text]').first();
          await titleInput.waitFor();
          await page.evaluate(() => { window.saveBehavior='hold'; window.saveAttempts=[]; });
          await titleInput.fill('Delayed note');
          await titleInput.press('Control+s');
          await page.waitForFunction(() => window.releaseSave);
          await page.waitForTimeout(1000);
          assert.equal(await pane.locator('[data-save-status]').getAttribute('data-save-status'),'saving');
          await page.evaluate(() => { window.saveBehavior='fail'; window.releaseSave(); });
          await pane.locator('[data-save-status=error]').waitFor();
          assert.equal(await titleInput.inputValue(),'Delayed note');
          assert.equal(await page.evaluate(async()=> (await window.fixtureStorage.listPages()).some(p=>p.title==='Delayed note')),false);
          await page.evaluate(() => {window.saveBehavior='normal';});
          await pane.getByRole('button',{name:'重試儲存',exact:true}).click();
          await pane.locator('[data-save-status=saved]').waitFor();
          assert.equal(await page.evaluate(async()=> (await window.fixtureStorage.listPages()).some(p=>p.title==='Delayed note')),true);
          await page.evaluate(() => { window.saveBehavior='hold'; window.releaseSave=null; });
          await titleInput.fill('Older write'); await titleInput.press('Control+s');
          await page.waitForFunction(() => window.releaseSave);
          await titleInput.fill('Newest write');
          await page.evaluate(() => {window.saveBehavior='normal';window.releaseSave();});
          await pane.locator('[data-save-status=saved]').waitFor();
          assert.equal(await page.evaluate(async()=> (await window.fixtureStorage.listPages()).some(p=>p.title==='Newest write')),true);
          if(width===1440){
            await page.getByRole('button',{name:'開啟導覽',exact:true}).click();
            await page.locator('[data-note-sidebar="docked"]').getByText('A note',{exact:true}).click({modifiers:['Control']});
            await page.waitForFunction(()=>document.querySelectorAll('[data-workspace-pane]').length===2);
            const panes=page.locator('[data-workspace-pane]');
            await panes.nth(0).locator('input[type=text]').first().fill('Left note');
            await panes.nth(0).locator('input[type=text]').first().press('Control+s');
            await panes.nth(0).locator('[data-save-status=saved]').waitFor();
            assert.equal(await panes.nth(1).locator('input[type=text]').first().inputValue(),'Newest write');
            await panes.nth(1).locator('input[type=text]').first().fill('Right note');
            await panes.nth(1).locator('input[type=text]').first().press('Control+s');
            await panes.nth(1).locator('[data-save-status=saved]').waitFor();
            const saved=await page.evaluate(async()=> (await window.fixtureStorage.listPages()).filter(p=>['Left note','Right note'].includes(p.title)).map(p=>p.kind).sort());
            assert.deepEqual(saved,['note','note']);
          }
          await context.close(); continue;
        }
        if (process.env.NEXUS_SYNC_ONLY) {
          await page.evaluate(() => { history.pushState(null, '', '/dictionary'); window.dispatchEvent(new Event('fixture-nav')); });
          await page.getByRole('heading', { name: '字典管理', exact: true }).waitFor();
          assert.equal(await page.evaluate(() => window.engineCount), engines, 'dictionary navigation keeps existing workspace engine');
          await context.close();
          continue;
        }
        if (width === 1440) {
          await page.evaluate(() => {
            localStorage.setItem(
              "nexus-dashboard-view:sort",
              JSON.stringify({ sort: "custom", ascending: false }),
            );
            window.dispatchEvent(new Event("nexus-view-changed"));
          });
          await page.getByRole("button", { name: "排序", exact: true }).click();
          const manualMenu = page.getByRole("dialog", {
            name: "排序",
            exact: true,
          });
          await manualMenu
            .getByRole("menuitemradio", {
              name: "自訂順序 · 遞增",
              exact: true,
            })
            .click();
          assert.equal(await manualMenu.isVisible(), true);
          await manualMenu
            .getByRole("menuitemradio", {
              name: "自訂順序 · 遞減",
              exact: true,
            })
            .click();
          await manualMenu
            .getByRole("menuitemradio", { name: "最近編輯", exact: true })
            .click();
          await page.keyboard.press("Escape");
          assert.equal(
            await page.evaluate(
              () =>
                JSON.parse(localStorage.getItem("nexus-dashboard-view:sort"))
                  .version,
            ),
            2,
          );
        }
        const mainWidth = await page
          .locator("main")
          .first()
          .evaluate((e) => e.getBoundingClientRect().width);
        await opener.click();
        const drawer = page.getByRole("dialog", {
          name: "開啟導覽",
          exact: true,
        });
        await drawer.waitFor();
        assert.equal(
          await drawer
            .getByRole("button", { name: "關閉導覽", exact: true })
            .count(),
          1,
        );
        assert.equal(
          await drawer.getByRole("button", { name: "×", exact: true }).count(),
          0,
        );
        assert.equal(
          await drawer
            .locator("aside")
            .evaluate((e) => getComputedStyle(e).borderRadius),
          "0px",
        );

        assert.equal(
          await page
            .locator("main")
            .first()
            .evaluate((e) => e.getBoundingClientRect().width),
          mainWidth,
        );
        assert.equal(
          await drawer
            .getByRole("button", { name: /^開啟 (筆記|字卡|創作)$/ })
            .count(),
          0,
        );
        const beforeTrash = await page.locator("main").first().textContent();
        const trashNav = drawer.getByRole("button", {
          name: "垃圾桶",
          exact: true,
        });
        await trashNav.click();
        await drawer.getByText("Trash restore", { exact: true }).waitFor();
        assert.equal(
          await page.locator("main").first().textContent(),
          beforeTrash,
        );
        await trashNav.dblclick();
        await page.waitForURL("**/trash?from=*");
        await page
          .getByRole("heading", { name: "垃圾桶", exact: true })
          .waitFor();
        const restoreRow = page
          .locator("li")
          .filter({ hasText: "Trash restore" });
        await restoreRow
          .getByRole("button", { name: "復原", exact: true })
          .click();
        await until(page, async () =>
          (await window.fixtureStorage.listPages()).some(
            (p) => p.title === "Trash restore" && !p.deleted_at,
          ),
        );
        await restoreRow.waitFor({state:"detached"});
        const permanent = page.locator("li").filter({hasText:"Trash permanent"}).getByRole("button", {
          name: "永久刪除",
          exact: true,
        });
        await permanent.click();
        await page
          .getByRole("dialog", { name: "永久刪除", exact: true })
          .getByRole("button", { name: "取消", exact: true })
          .click();
        assert.equal(
          await page
            .locator("li")
            .filter({ hasText: "Trash permanent" })
            .count(),
          1,
        );
        await permanent.click();
        await page
          .getByRole("dialog", { name: "永久刪除", exact: true })
          .getByRole("button", { name: "永久刪除", exact: true })
          .click();
        await until(page, async () =>
          (
            await window.fixtureStorage.listPages({ includeDeleted: true })
          ).every((p) => p.title !== "Trash permanent"),
        );
        await page.reload();
        await page.getByText("垃圾桶是空的。", { exact: true }).waitFor();
        await page.getByRole("button", { name: "← 返回", exact: true }).click();
        await page.waitForURL("**/");
        await opener.click();
        await drawer.waitFor();
        await drawer.getByTitle("新建", { exact: true }).click();
        await page.getByRole("dialog", { name: "建立", exact: true }).waitFor();
        await page.keyboard.press("Escape");
        await drawer.waitFor();
        assert.equal(
          await page.getByRole("dialog", { name: "建立", exact: true }).count(),
          0,
        );
        const settings = drawer.getByRole("button", {
          name: "偏好設定",
          exact: true,
        }); // localized existing preference title
        const search = drawer.locator('input[type="text"]').first();
        await search.fill("Sample");
        await page.mouse.click(width - 4, height - 4);
        await drawer.waitFor({ state: "hidden" });
        await opener.click();
        assert.equal(await search.inputValue(), "Sample");
        await search.fill("");
        const preference = drawer.getByRole("button", {
          name: "偏好設定",
          exact: true,
        });
        await preference.click();
        await page.getByRole("button", { name: "設定", exact: true }).click();
        const dialog = page.getByRole("dialog", { name: "設定", exact: true });
        await dialog.waitFor();
        assert.equal(
          await dialog
            .getByRole("button", { name: "功能與導覽", exact: true })
            .count(),
          0,
        );
        const details = dialog
          .locator("details")
          .filter({ has: page.locator("summary", { hasText: "功能總覽" }) });
        assert.equal(await details.getAttribute("open"), null);
        await details.locator("summary").click();
        await details
          .getByRole("checkbox", { name: "網頁", exact: true })
          .uncheck();
        await dialog.getByRole("button", { name: "關閉設定" }).click();
        await drawer
          .getByRole("button", { name: "功能總覽", exact: true })
          .click();
        assert.equal(
          await drawer
            .getByRole("button", { name: "網頁", exact: true })
            .count(),
          0,
        );
        const toolsNav = drawer.getByRole("button", {
          name: "工具",
          exact: true,
        });
        if (width !== 1440) {
          await page.evaluate(() => {
            window.toolOpenEvents = 0;
            window.addEventListener(
              "nexus-open-tools",
              () => window.toolOpenEvents++,
            );
          });
          const handle = await toolsNav.elementHandle();
          await handle.dispatchEvent("pointerdown", {
            pointerType: "touch",
            clientX: 10,
            clientY: 10,
          });
          await page
            .getByRole("heading", { name: "工具", exact: true })
            .waitFor();
          await handle.dispatchEvent("contextmenu");
          assert.equal(await page.evaluate(() => window.toolOpenEvents), 1);
        } else await toolsNav.dblclick();
        await page
          .getByRole("heading", { name: "工具", exact: true })
          .waitFor();
        const launcher = page.getByRole("button", {
          name: "功能總覽",
          exact: true,
        });
        await launcher.click();
        const launcherPanel = page.getByRole("dialog", {
          name: "功能總覽",
          exact: true,
        });
        await launcherPanel.waitFor();
        assert.equal(
          await launcherPanel
            .getByRole("button", { name: "計數", exact: true })
            .count(),
          0,
        );
        assert.equal(
          await launcherPanel
            .getByRole("button", { name: "抽選", exact: true })
            .count(),
          0,
        );
        await launcherPanel
          .getByRole("button", { name: "功能總覽", exact: true })
          .click();
        await launcherPanel.waitFor({ state: "hidden" });
        await launcher.click();
        await page.mouse.click(6, height - 6);
        await launcherPanel.waitFor({ state: "hidden" });
        await launcher.click();
        await page.keyboard.press("Escape");
        await launcherPanel.waitFor({ state: "hidden" });

        await page.getByRole("button", { name: "計數", exact: true }).click();
        await page.getByRole("button", { name: /^Sample counter/ }).waitFor();
        await page.getByRole("button", { name: "抽選", exact: true }).click();
        await page.getByRole("button", { name: /^Sample draw/ }).click();
        assert.equal(await page.locator("[data-workspace-header]").count(), 0);
        await page.getByRole("button", { name: "← 返回", exact: true }).click();
        await page
          .getByRole("heading", { name: "工具", exact: true })
          .waitFor();
        assert.equal(
          await page
            .getByRole("button", { name: "抽選", exact: true })
            .getAttribute("aria-pressed"),
          "true",
        );
        await opener.click();
        await page.keyboard.press("Escape");
        await drawer.waitFor({ state: "hidden" });
        assert.equal(
          await opener.evaluate((e) => document.activeElement === e),
          true,
        );
        await page
          .getByRole("button", { name: "功能總覽", exact: true })
          .click();
        await page.getByRole("button", { name: "網頁", exact: true }).click();
        await page
          .getByRole("heading", { name: "網頁", exact: true })
          .waitFor();
        await page.getByRole("button", { name: /^Sample web/ }).click();
        const title = page.locator("input").filter({ visible: true }).first();
        await title.fill("Saved web");
        await opener.click();
        const features = drawer.getByRole("button", {
          name: "功能總覽",
          exact: true,
        });
        if ((await features.getAttribute("aria-expanded")) === "false")
          await features.click();
        const allItems = drawer.getByRole("button", {
          name: "所有項目",
          exact: true,
        });
        await allItems.click();
        await page.waitForTimeout(330);
        assert.equal(await page.locator("[data-workspace-header]").count(), 0);
        await allItems.dblclick();
        await page
          .getByRole("heading", { name: "歡迎回來 🙌", exact: true })
          .waitFor();
        assert.equal(
          await page.getByText("沒有選擇頁面", { exact: true }).count(),
          0,
        );
        await opener.click();
        await drawer
          .getByRole("button", { name: "筆記", exact: true })
          .dblclick();
        await page
          .getByRole("heading", { name: "筆記", exact: true })
          .waitFor();
        assert.equal(
          await page.evaluate(
            async () =>
              (await window.fixtureStorage.listPages()).find(
                (p) => p.kind === "web",
              ).title,
          ),
          "Saved web",
        );

        await page.getByRole("button", { name: "列表", exact: true }).click();
        await page.getByRole("button", { name: "排序", exact: true }).click();
        const sortPanel = page.getByRole("dialog", {
          name: "排序",
          exact: true,
        });
        assert.equal(await sortPanel.getByRole("menuitemradio").count(), 5);
        await sortPanel
          .getByRole("menuitemradio", { name: "名稱", exact: true })
          .click();
        assert.equal(await sortPanel.isVisible(), true);
        assert.equal(
          await sortPanel
            .getByRole("menuitemradio", { name: "名稱 · 遞增", exact: true })
            .getAttribute("aria-checked"),
          "true",
        );
        const rows = page.locator('[data-collection-row="list"]');
        assert.equal(await rows.count(), 4);
        const titles = ["A note", "Z note", "😀 Custom note", "Sample note"];
        const actual = await rows.evaluateAll((es) =>
          es.map((e) => e.querySelector("span.truncate")?.textContent),
        );
        assert.deepEqual(
          actual,
          titles.sort((a, b) => a.localeCompare(b)),
        );
        await sortPanel
          .getByRole("menuitemradio", { name: "名稱 · 遞增", exact: true })
          .click();
        assert.equal(await sortPanel.isVisible(), true);
        assert.deepEqual(
          await rows.evaluateAll((es) =>
            es.map((e) => e.querySelector("span.truncate")?.textContent),
          ),
          [...actual].reverse(),
        );
        await page.keyboard.press("Escape");
        await page.reload();
        await opener.waitFor();
        await opener.click();
        const reloadedFeatures = drawer.getByRole("button", {
          name: "功能總覽",
          exact: true,
        });
        if ((await reloadedFeatures.getAttribute("aria-expanded")) === "false")
          await reloadedFeatures.click();
        await drawer
          .getByRole("button", { name: "筆記", exact: true })
          .press("Enter");
        await page.locator('[data-collection-row="list"]').first().waitFor();
        assert.deepEqual(
          await rows.evaluateAll((es) =>
            es.map((e) => e.querySelector("span.truncate")?.textContent),
          ),
          [...actual].reverse(),
        );
        await page.getByRole("button", { name: "排序", exact: true }).click();
        assert.equal(
          await sortPanel
            .getByRole("menuitemradio", { name: "名稱 · 遞減", exact: true })
            .getAttribute("aria-checked"),
          "true",
        );
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Escape");
        assert.equal(
          await page
            .getByRole("button", { name: "排序", exact: true })
            .evaluate((e) => e === document.activeElement),
          true,
        );
        assert.equal(
          await rows.first().evaluate((e) => getComputedStyle(e).borderWidth),
          "0px",
        );
        assert.equal(
          await rows.first().evaluate((e) => getComputedStyle(e).borderRadius),
          "0px",
        );
        assert.equal(await rows.first().locator(".line-clamp-3").count(), 0);
        assert.equal(
          await page.evaluate(
            () =>
              JSON.parse(localStorage.getItem("nexus-notes-view:sort"))
                .ascending,
          ),
          false,
        );
        await page
          .getByRole("button", { name: "卡片預覽", exact: true })
          .click();
        assert.ok(
          (await page
            .locator('[data-collection-row="cards"] [data-feature-icon="note"]')
            .count()) > 0,
        );
        assert.ok(
          (await page.locator("main").textContent()).includes("😀 Custom note"),
        );
        const more = page.getByRole("button", {
          name: "更多操作 Sample note",
          exact: true,
        });
        await more.click();
        assert.equal(
          await page
            .getByRole("menuitem", { name: "重新命名", exact: false })
            .count(),
          1,
        );
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Escape");
        assert.equal(
          await more.evaluate((e) => document.activeElement === e),
          true,
        );
        await more.click();
        await page
          .getByRole("menuitem", { name: "重新命名", exact: true })
          .click();
        await page
          .getByRole("textbox", { name: "名稱", exact: true })
          .fill("Renamed note");
        await page.getByRole("button", { name: "儲存", exact: true }).click();
        await page
          .getByRole("button", { name: "更多操作 Renamed note", exact: true })
          .waitFor();
        if (width === 1440) {
          const sourceId = await page.evaluate(
            async () =>
              (await window.fixtureStorage.listPages()).find(
                (p) => p.title === "Renamed note",
              ).id,
          );
          await page.getByRole("button", { name: /^Renamed note/ }).click();
          const back = page.getByRole("button", {
            name: "回到功能介面",
            exact: true,
          });
          await back.waitFor();
          assert.equal(
            await page.locator("[data-workspace-header]").count(),
            0,
          );
          assert.ok(
            await back.evaluate(
              (e) =>
                e.previousElementSibling?.getAttribute("aria-label") ===
                "開啟導覽",
            ),
          );
          const noteNav = page.locator('[data-note-sidebar="docked"]');
          await noteNav.waitFor();
          const sidebarWidth = await noteNav.evaluate(el => Math.round(el.getBoundingClientRect().width));
          const sidebarDivider = noteNav.getByRole('separator', {name:'調整筆記側邊欄寬度'});
          await sidebarDivider.press('ArrowRight');
          assert.equal(await noteNav.evaluate(el => Math.round(el.getBoundingClientRect().width)), sidebarWidth + 10);
          assert.equal(await page.evaluate(() => localStorage.getItem('nexus:noteSidebarWidth')), String(sidebarWidth + 10));
          await noteNav
            .getByRole("button", { name: "垃圾桶", exact: true })
            .click();
          await page.waitForTimeout(330);
          assert.equal(
            await page.locator("[data-workspace-header]").count(),
            0,
          );
          assert.equal(await back.isVisible(), true);
          await noteNav.getByRole("button", { name: "垃圾桶", exact: true }).click();
          const features = noteNav.getByRole('button',{name:'功能總覽',exact:true});
          if(await features.getAttribute('aria-expanded')==='false') await features.click();
          await noteNav.getByRole('button',{name:'筆記',exact:true}).press('Enter');
          await page
            .getByRole("button", { name: "＋ 建立筆記", exact: true })
            .click();
          await page.locator('[data-workspace-pane]').waitFor();
          assert.equal(await page.evaluate(async id => (await window.fixtureStorage.getPage(id))?.format, await page.locator('[data-workspace-pane]').getAttribute('data-workspace-pane')), 'flow');
          await page.getByRole('button',{name:'回到功能介面',exact:true}).click();
          await page
            .getByRole("button", { name: "更多操作 Renamed note", exact: true })
            .click();
          await page
            .getByRole("menuitem", { name: "複製", exact: true })
            .click();
          await until(page, async () =>
            (await window.fixtureStorage.listPages()).some(
              (p) => p.title === "Renamed note copy",
            ),
          );
          const copy = await page.evaluate(async () =>
            (await window.fixtureStorage.listPages()).find(
              (p) => p.title === "Renamed note copy",
            ),
          );
          assert.notEqual(copy.id, sourceId);
          await opener.click();
          const navFeatures = page.locator('nav[aria-label="功能導覽"] button[aria-expanded]');
          if(await navFeatures.getAttribute('aria-expanded')==='false') await navFeatures.click();
          await page
            .getByRole("button", { name: "筆記", exact: true })
            .press("Enter");
          await page
            .getByRole("button", {
              name: "更多操作 Renamed note copy",
              exact: true,
            })
            .click();
          await page
            .getByRole("menuitem", { name: "刪除", exact: true })
            .click();
          await page
            .getByRole("dialog", { name: "刪除", exact: true })
            .getByRole("button", { name: "取消", exact: true })
            .click();
          assert.equal(
            await page.evaluate(
              async (id) =>
                (await window.fixtureStorage.getPage(id)).deleted_at,
              copy.id,
            ),
            null,
          );
          await page
            .getByRole("button", {
              name: "更多操作 Renamed note copy",
              exact: true,
            })
            .click();
          await page
            .getByRole("menuitem", { name: "刪除", exact: true })
            .click();
          await page
            .getByRole("dialog", { name: "刪除", exact: true })
            .getByRole("button", { name: "刪除", exact: true })
            .click();
          await until(
            page,
            async (id) =>
              !!(await window.fixtureStorage.getPage(id)).deleted_at,
            copy.id,
          );
          assert.equal(
            await page.evaluate(
              async (id) =>
                (await window.fixtureStorage.getPage(id)).deleted_at,
              sourceId,
            ),
            null,
          );
          await opener.click();
          if(await navFeatures.getAttribute('aria-expanded')==='false') await navFeatures.click();
          await page
            .getByRole("button", { name: "字卡", exact: true })
            .press("Enter");
          await page
            .getByRole("button", {
              name: "更多操作 Sample study_set",
              exact: true,
            })
            .waitFor();
          const original = await page.evaluate(async () => {
            const p = (await window.fixtureStorage.listPages()).find(
              (p) => p.kind === "study_set",
            );
            return {
              page: p,
              snapshot: await window.fixtureStorage
                .getStudyRepository()
                .readDeck(p.id, true),
            };
          });
          await page
            .getByRole("button", {
              name: "更多操作 Sample study_set",
              exact: true,
            })
            .click();
          await page
            .getByRole("menuitem", { name: "複製", exact: true })
            .click();
          await until(page, async () => {
            const p = (await window.fixtureStorage.listPages()).find(
              (p) => p.title === "Sample study_set copy",
            );
            if (!p) return false;
            try {
              return (
                (
                  await window.fixtureStorage
                    .getStudyRepository()
                    .readDeck(p.id)
                ).cards.length === 1
              );
            } catch {
              return false;
            }
          });
          const duplicate = await page.evaluate(async () => {
            const p = (await window.fixtureStorage.listPages()).find(
              (p) => p.title === "Sample study_set copy",
            );
            return {
              page: p,
              snapshot: await window.fixtureStorage
                .getStudyRepository()
                .readDeck(p.id, true),
            };
          });
          assert.ok(original.snapshot.events.length > 0);
          assert.notEqual(duplicate.page.id, original.page.id);
          assert.notEqual(
            duplicate.snapshot.cards[0].id,
            original.snapshot.cards[0].id,
          );
          assert.equal(duplicate.snapshot.events.length, 0);
          assert.equal(duplicate.snapshot.states[0].head, null);
          assert.equal(
            duplicate.snapshot.cards[0].front,
            original.snapshot.cards[0].front,
          );
          assert.equal(
            duplicate.snapshot.cards[0].dictionary_entry_id,
            original.snapshot.cards[0].dictionary_entry_id,
          );
          const unchanged = await page.evaluate(
            async (id) =>
              window.fixtureStorage.getStudyRepository().readDeck(id, true),
            original.page.id,
          );
          assert.deepEqual(unchanged.events, original.snapshot.events);
          assert.deepEqual(unchanged.states, original.snapshot.states);
          await opener.click();
          await drawer
            .getByRole("button", { name: "創作", exact: true })
            .press("Enter");
          assert.equal(
            await page
              .getByRole("button", {
                name: "更多操作 Explicit novel",
                exact: true,
              })
              .count(),
            0,
          );
          assert.equal(
            await page
              .getByRole("button", {
                name: "更多操作 Sample novel",
                exact: true,
              })
              .count(),
            0,
          );
          assert.equal(
            await page
              .getByRole("button", {
                name: "更多操作 Sample character",
                exact: true,
              })
              .count(),
            1,
          );
          assert.equal(
            await page
              .getByRole("button", { name: "世界觀", exact: true })
              .count(),
            0,
          );
          await page
            .getByRole("button", { name: "＋ 建立", exact: true })
            .click();
          await page
            .getByRole("button", { name: "世界觀", exact: true })
            .waitFor();
          assert.equal(
            await page
              .getByRole("dialog", { name: "建立", exact: true })
              .getByRole("button", { name: "取消", exact: true })
              .count(),
            0,
          );
          await page.keyboard.press("Escape");
          const countBefore = await page.evaluate(
            async () => (await window.fixtureStorage.listPages()).length,
          );
          await page
            .getByRole("button", { name: "＋ 建立", exact: true })
            .click();
          await page.mouse.click(2, 2);
          assert.equal(
            await page
              .getByRole("dialog", { name: "建立", exact: true })
              .count(),
            0,
          );
          assert.equal(
            await page.evaluate(
              async () => (await window.fixtureStorage.listPages()).length,
            ),
            countBefore,
          );
          const worldTemplateId=await page.evaluate(async()=>{
            const template=await window.fixtureStorage.createPage({kind:"creative",title:"World template",format:"flow"});
            await window.fixtureStorage.savePage({...template,creative_type:"world",character_data:{isTemplate:true,blocks_version:1,basic:{name:"Do not copy"},sections:[{id:"world-block",type:"group",title:"地理",contents:[]}],tabs:[]}});return template.id;
          });
          await page.reload();await opener.waitFor();await opener.click();
          const expand=drawer.getByRole("button",{name:"功能總覽",exact:true});if(await expand.getAttribute("aria-expanded")==="false")await expand.click();
          await drawer.getByRole("button",{name:"創作",exact:true}).press("Enter");
          await page.getByRole("button",{name:"＋ 建立",exact:true}).click();await page.getByRole("button",{name:"世界觀",exact:true}).click();
          await page.getByRole("dialog",{name:"世界觀模板 / World templates",exact:true}).getByRole("button",{name:"World template",exact:true}).click();
          await until(page,async sourceId=>(await window.fixtureStorage.listPages()).some(p=>p.creative_type==="world"&&!p.character_data?.isTemplate&&p.character_data?.templateSourceId===sourceId),worldTemplateId);
          const createdWorld=await page.evaluate(async sourceId=>(await window.fixtureStorage.listPages()).find(p=>p.character_data?.templateSourceId===sourceId),worldTemplateId);
          assert.equal(createdWorld.character_data.basic.name,"新世界觀");assert.notEqual(createdWorld.character_data.sections[0].id,"world-block");
          await opener.click();await drawer.getByRole("button",{name:"創作",exact:true}).press("Enter");
          await page.getByRole("button",{name:"＋ 建立",exact:true}).click();await page.getByRole("button",{name:"角色卡",exact:true}).click();
          assert.equal(await page.getByRole("dialog").getByRole("button",{name:"World template",exact:true}).count(),0,"world templates never appear in the character picker");await page.keyboard.press("Escape");
          await opener.click();
          await drawer
            .getByRole("button", { name: "小說", exact: true })
            .press("Enter");
          assert.equal(
            await page
              .getByRole("button", {
                name: "更多操作 Explicit novel",
                exact: true,
              })
              .count(),
            1,
          );
          assert.equal(
            await page
              .getByRole("button", {
                name: "更多操作 Sample novel",
                exact: true,
              })
              .count(),
            1,
          );
          assert.equal(
            await page
              .getByRole("button", {
                name: "更多操作 Sample character",
                exact: true,
              })
              .count(),
            0,
          );
        }
        await page.evaluate(
          () => (window.fixtureMountToken = "same-workspace"),
        );
        await opener.click();
        await drawer
          .getByRole("button", { name: "字典", exact: true })
          .press("Enter");
        await page
          .getByRole("heading", { name: "字典管理", exact: true })
          .waitFor();
        assert.equal(
          await page.evaluate(() => window.fixtureMountToken),
          "same-workspace",
        );
        await page.goto(
          `http://127.0.0.1:${server.address().port}/dictionary/admin`,
        );
        await page
          .getByRole("checkbox", { name: "🔴 待審核", exact: true })
          .waitFor();
        const navs = page.getByRole("navigation", { name: "管理詞條分頁" });
        assert.equal(await navs.count(), 2);
        await navs.first().getByRole("button", { name: "下一頁" }).click();
        await navs
          .last()
          .getByRole("button", { name: "編輯第 2 頁", exact: true })
          .waitFor();
        await page
          .getByRole("checkbox", { name: "🔴 待審核", exact: true })
          .check();
        await page
          .getByRole("checkbox", { name: "🟢 新發布", exact: true })
          .check();
        await page.waitForFunction(
          () =>
            document.querySelectorAll("[data-dictionary-list] li").length ===
            100,
        );
        await navs.last().getByRole("button", { name: "下一頁" }).click();
        await page.waitForFunction(
          () =>
            document.querySelectorAll("[data-dictionary-list] li").length ===
            61,
        );
        assert.equal(
          await page
            .locator("[data-dictionary-list]")
            .evaluate(
              (el) =>
                getComputedStyle(el).gridTemplateColumns.split(" ").length,
            ),
          width >= 1180 ? 3 : width >= 820 ? 2 : 1,
        );
        const filter = page.locator("[data-dictionary-filters]");
        assert.ok(
          await filter.evaluate(
            (e) =>
              e.previousElementSibling.tagName === "INPUT" &&
              e.nextElementSibling.tagName === "NAV",
          ),
        );
        if (width >= 820) {
          const boxes = await filter
            .locator("fieldset")
            .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().top));
          assert.ok(Math.abs(boxes[0] - boxes[1]) < 3);
        }
        assert.ok(await page.locator('[data-dictionary-list]').getByRole('img', {name:'🔴 待審核',exact:true}).count());
        await navs
          .first()
          .getByRole("button", { name: "編輯第 2 頁", exact: true })
          .click();
        await navs.first().getByRole("textbox").fill("1");
        await navs.first().getByRole("textbox").press("Enter");
        await navs
          .last()
          .getByRole("button", { name: "編輯第 1 頁", exact: true })
          .waitFor();
        await page
          .getByRole("textbox", { name: "搜尋管理詞條", exact: true })
          .fill("entry 000");
        await page.waitForFunction(
          () =>
            document.querySelectorAll("[data-dictionary-list] li").length === 7,
        );
        assert.equal(
          await page
            .getByRole("checkbox", { name: "🔴 待審核", exact: true })
            .isChecked(),
          true,
        );
        assert.ok(
          (await page.evaluate(() => window.rpcCalls)).every(
            (c) =>
              ![
                "publish_dictionary_bulk",
                "apply_dictionary_drafts",
                "stage_dictionary_import_reviews",
              ].includes(c.name),
          ),
        );

        if (width === 390) {
          await opener.click();
          await drawer
            .getByRole("button", { name: "帳號與同步", exact: true })
            .waitFor();
          await drawer
            .getByRole("button", { name: "偏好設定", exact: true })
            .click();
          await page.getByRole("button", { name: "設定", exact: true }).click();
          const settingsDialog = page.getByRole("dialog", {
            name: "設定",
            exact: true,
          });
          await settingsDialog
            .getByRole("combobox", { name: "語言", exact: true })
            .selectOption("en");
          await page
            .getByRole("button", { name: "Close settings", exact: true })
            .click();
          await page.keyboard.press("Escape");
          await page
            .getByRole("checkbox", {
              name: "🔴 Pending review",
              exact: true,
            })
            .waitFor();
          await page
            .getByRole("button", {
              name: "Open unreviewed entries",
              exact: true,
            })
            .waitFor();
          await page
            .getByRole("button", { name: "Open navigation", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Account and sync", exact: true })
            .waitFor();
          await page.keyboard.press("Escape");
        }
        await context.close();
      }
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      await new Promise((r) => server.close(r));
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  },
);
