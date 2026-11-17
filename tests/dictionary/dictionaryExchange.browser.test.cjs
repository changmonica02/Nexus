const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { build } = require("esbuild"),
  { chromium } = require("playwright");
const root = path.resolve(__dirname, "../..");
test(
  "desktop/tablet/mobile actual bulk UI: filtered complete export/retry, file preview, bounded pause/refresh/resume and publication token/report, English labels",
  { timeout: 120000 },
  async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus44-browser-"));
    await build({
      entryPoints: [path.join(root, "tests/fixtures/dictionaryExchange.jsx")],
      outfile: path.join(tmp, "fixture.js"),
      bundle: true,
      jsx: "automatic",
      platform: "browser",
      plugins: [
        {
          name: "isolated-services",
          setup(b) {
            b.onLoad(
              { filter: /infrastructure\/supabase\/client\.ts$/ },
              () => ({
                contents:
                  "export const getSupabase=()=>window.dictionaryClient;export const isSupabaseConfigured=()=>true;",
                loader: "js",
              }),
            );
            b.onResolve({ filter: /^next\/link$/ }, () => ({
              path: "link",
              namespace: "fixture",
            }));
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `import React from '${path.join(root, "node_modules/react/index.js")}';export default function Link({children,...props}){return React.createElement('a',props,children);}`,
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
      ]).process(
        fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8"),
        { from: path.join(root, "src/app/globals.css") },
      )
    ).css;
    const server = http.createServer((req, res) => {
      if (req.url === "/fixture.js")
        res.end(fs.readFileSync(path.join(tmp, "fixture.js")));
      else if (req.url === "/fixture.css") res.end(css);
      else
        res.end(
          '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>',
        );
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const url = "http://127.0.0.1:" + server.address().port,
      browser = await chromium.launch({
        executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
        args: ["--no-sandbox"],
      });
    const errors = [];
    try {
      // Full IndexedDB fault-injection and resume flow is a single desktop
      // contract; mobile entry points are checked separately below.
      for (const viewport of [{ width: 1280, height: 900 }]) {
        const context = await browser.newContext({
            viewport,
            acceptDownloads: true,
          }),
          page = await context.newPage();
        page.on("pageerror", (e) => {
          errors.push(e.message);
          console.error(e.message);
        });
        page.on("dialog", async dialog => {
          assert.equal(dialog.type(), "beforeunload", "only the native reload confirmation is expected");
          console.log("IMPORT_RELOAD_CONFIRMATION", { type: dialog.type(), viewport });
          await dialog.accept();
        });
        const reload = async () => {
          const previousDocument = await page.evaluate(() => performance.timeOrigin);
          await page.reload();
          assert.notEqual(await page.evaluate(() => performance.timeOrigin), previousDocument, "checkpoint recovery must load a fresh document");
        };
        const waitForProgress = async text => {
          await page.getByText(text, { exact: true }).waitFor().catch(async error => {
            console.error("IMPORT_CHECKPOINT_SCREEN", await page.locator("body").innerText());
            throw error;
          });
        };
        await page.goto(url);
        await page.getByLabel("搜尋單字或構詞", { exact: true }).fill("item1");
        await page
          .getByRole("button", { name: "匯出資料", exact: true })
          .click();
        await page.evaluate(() => (window.failExport = true));
        const startExport = page.getByRole("button", { name: "開始完整匯出", exact: true });
        await startExport.waitFor({state:"visible", timeout:10000}).catch(async error => {
          const diagnostics = await page.evaluate(() => ({
            url: location.href,
            dialogs: [...document.querySelectorAll("dialog")].map(d => ({
              open: d.open, title: d.querySelector("h2")?.textContent,
              text: d.innerText.slice(0, 1500),
              buttons: [...d.querySelectorAll("button")].map(b=>({label:b.textContent,disabled:b.disabled}))
            })),
            alerts: [...document.querySelectorAll('[role="alert"]')].map(e=>e.textContent),
            body: document.body.innerText.slice(0, 1500)
          }));
          console.error("DICTIONARY_EXPORT_DIALOG_DIAGNOSTICS",JSON.stringify(diagnostics));
          console.error("DICTIONARY_EXPORT_PAGE_ERRORS",errors);
          throw error;
        });
        await startExport.click();
        await page
          .getByRole("alert")
          .getByText(/fixture network failure/)
          .waitFor();
        const downloadPromise = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "恢復／重試已保存匯出", exact: true })
          .click();
        const downloaded = await downloadPromise;
        const doc = JSON.parse(
          fs.readFileSync(await downloaded.path(), "utf8"),
        );
        assert.equal(doc.schema_version, 2);
        assert.equal(doc.records.length, 3);
        assert.equal(doc.scope.query, "");
        await page.getByRole("checkbox",{name:"全部類型",exact:true}).uncheck();
        assert.equal(await page.getByRole("button",{name:"開始完整匯出",exact:true}).isDisabled(),true);
        await page.getByRole("checkbox",{name:"全部類型",exact:true}).check();
        const allPromise = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "開始完整匯出", exact: true })
          .click();
        const all = JSON.parse(
          fs.readFileSync(await (await allPromise).path(), "utf8"),
        );
        assert.equal(all.records.length, 3);
        assert.equal(all.scope.query, "");
        await page.getByRole("button", { name: "關閉", exact: true }).click();
        await page.getByLabel("搜尋單字或構詞", { exact: true }).fill("");
        await page
          .getByRole("button", { name: "匯入資料", exact: true })
          .click();
        const raw = await page.evaluate(() =>
          JSON.stringify(window.newDocument(52)),
        );
        await page.getByLabel("匯入檔案", { exact: true }).setInputFiles({
          name: "exchange.json",
          mimeType: "application/json",
          buffer: Buffer.from(raw),
        });
        await page
          .getByRole("button", { name: "產生匯入預覽", exact: true })
          .click();
        await page
          .getByText(
            "新增 52 · 修改 0 · 未變更 0 · 需審核 0 · 不合法 0 · 版本衝突 0",
            { exact: true },
          )
          .waitFor();
        // Real browser IndexedDB quota failure: no operation may reach the server.
        await page.evaluate(() => {
          const put = IDBObjectStore.prototype.put;
          IDBObjectStore.prototype.put = function (...args) {
            if (this.name === "items") {
              IDBObjectStore.prototype.put = put;
              throw new DOMException(
                "fixture quota exceeded",
                "QuotaExceededError",
              );
            }
            return put.apply(this, args);
          };
        });
        await page
          .getByRole("button", {
            name: "一次套用安全項目／恢復作業",
            exact: true,
          })
          .click();
        await page
          .getByRole("dialog", { name: "確認匯入" })
          .getByRole("button", { name: "確認匯入", exact: true })
          .click();
        await page
          .getByRole("alert")
          .filter({ hasText: "fixture quota exceeded" })
          .waitFor();
        assert.equal(
          await page.evaluate(
            () =>
              window.calls.filter(
                (c) => c.name === "apply_dictionary_import_batch",
              ).length,
          ),
          0,
        );
        await page
          .getByRole("button", {
            name: "一次套用安全項目／恢復作業",
            exact: true,
          })
          .click();
        await page.evaluate(()=>{window.holdImportBatch=true;});
        await page
          .getByRole("dialog", { name: "確認匯入" })
          .getByRole("button", { name: "確認匯入", exact: true })
          .click();
        await page.waitForFunction(() =>
          typeof window.finishImportBatch === "function",
        );
        await page
          .getByRole("button", { name: "停止未開始的批次", exact: true })
          .click();
        await page.evaluate(()=>window.finishImportBatch());
        await waitForProgress("總共 52 · 已完成 25 · 失敗 0 · 未處理 27");
        await reload();
        await page
          .getByRole("button", { name: "匯入資料", exact: true })
          .click();
        await waitForProgress("總共 52 · 已完成 25 · 失敗 0 · 未處理 27");
        // Server commits, then local receipt checkpoint fails: UI must retain durable progress.
        await page.evaluate(() => {
          const before = window.calls.filter(
            (c) => c.name === "apply_dictionary_import_batch",
          ).length;
          const put = IDBObjectStore.prototype.put;
          IDBObjectStore.prototype.put = function (...args) {
            if (
              this.name === "items" &&
              window.calls.filter(
                (c) => c.name === "apply_dictionary_import_batch",
              ).length > before
            ) {
              IDBObjectStore.prototype.put = put;
              throw new DOMException(
                "fixture receipt quota exceeded",
                "QuotaExceededError",
              );
            }
            return put.apply(this, args);
          };
        });
        await page
          .getByRole("button", {
            name: "一次套用安全項目／恢復作業",
            exact: true,
          })
          .click();
        await page
          .getByRole("alert")
          .filter({ hasText: "fixture receipt quota exceeded" })
          .waitFor();
        await waitForProgress("總共 52 · 已完成 25 · 失敗 0 · 未處理 27");
        // Wait for the failed operation to finish cleanup before simulating a reload.
        await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='一次套用安全項目／恢復作業'&&!b.disabled));
        const savedStatuses=await page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('nexus-dictionary-import-review',2);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('items'),rows=tx.objectStore('items').getAll();rows.onsuccess=()=>{resolve(rows.result.map(r=>r.item.status));db.close();};rows.onerror=()=>reject(rows.error);};}));
        assert.equal(savedStatuses.filter(s=>s==='applied').length,25,'receipt checkpoint failure must retain the last committed 25-item checkpoint');
        assert.equal(savedStatuses.filter(s=>s==='pending').length,27,'unconfirmed receipts remain pending for exact-operation replay');
        assert.equal(savedStatuses.filter(s=>s==='failed').length,0,'a local receipt failure must not persist unconfirmed statuses');
        const uncertain = await page.evaluate(() =>
          window.calls
            .filter((c) => c.name === "apply_dictionary_import_batch")
            .at(-1)
            .operations.map((op) => op.operation_id),
        );
        await reload();
        await page.evaluate(() => {
          window.importDialogLifecycle = [];
          const show = HTMLDialogElement.prototype.showModal, close = HTMLDialogElement.prototype.close;
          HTMLDialogElement.prototype.showModal = function(...args) {
            window.importDialogLifecycle.push({event: "showModal", title: this.textContent?.slice(0, 80)});
            return show.apply(this, args);
          };
          HTMLDialogElement.prototype.close = function(...args) {
            window.importDialogLifecycle.push({event: "close", title: this.textContent?.slice(0, 80)});
            return close.apply(this, args);
          };
          document.addEventListener("click", event => {
            const button = event.target.closest?.("button");
            if (button?.textContent?.trim() === "匯入資料")
              window.importDialogLifecycle.push({event: "button-click", url: location.href});
          }, true);
        });
        await page
          .getByRole("button", { name: "匯入資料", exact: true })
          .click();
        // Make the recovery UI boundary explicit: distinguish dialog dismissal
        // from an IndexedDB checkpoint that failed to hydrate.
        await page.getByRole("dialog", { name: "匯入資料", exact: true }).waitFor().catch(async error => {
          console.error("IMPORT_REOPEN_DIAGNOSTIC", {
            url: page.url(),
            lifecycle: await page.evaluate(() => window.importDialogLifecycle),
            errors,
            dialogs: await page.locator("dialog").evaluateAll(rows => rows.map(row => ({open: row.open, title: row.getAttribute("aria-labelledby"), text: row.innerText.slice(0, 300)}))),
            body: (await page.locator("body").innerText()).slice(0, 1200),
          });
          throw error;
        });
        await waitForProgress("總共 52 · 已完成 25 · 失敗 0 · 未處理 27");
        await page
          .getByRole("button", {
            name: "一次套用安全項目／恢復作業",
            exact: true,
          })
          .click();
        await page
          .getByText("總共 52 · 已完成 52 · 失敗 0 · 未處理 0", { exact: true })
          .waitFor();
        assert.equal(
          await page.getByRole("dialog", { name: "確認匯入" }).count(),
          0,
        );
        const batches = await page.evaluate(() =>
          window.calls
            .filter((c) => c.name === "apply_dictionary_import_batch")
            .map((c) => c.operations.map((op) => op.operation_id)),
        );
        assert.deepEqual(
          batches.at(-2),
          uncertain,
          "reload retries the exact committed operation UUIDs",
        );
        const reportPromise = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "下載作業結果清單", exact: true })
          .click();
        const report = JSON.parse(
          fs.readFileSync(await (await reportPromise).path(), "utf8"),
        );
        assert.equal(
          report.items.filter((i) => i.status === "applied").length,
          52,
        );
        assert.equal(new Set(report.items.map((i) => i.entry_id)).size, 52);
        await page.getByRole("button", { name: "關閉", exact: true }).click();
        // Filters can even hide every row; global publication is independent of them.
        await page
          .getByLabel("搜尋單字或構詞", { exact: true })
          .fill("no-visible-match");
        await page.getByRole("tab", { name: "構詞", exact: true }).click();await page.getByRole("button",{name:"篩選構詞分類",exact:true}).click();await page.getByRole("checkbox", { name: "字首", exact: true }).check();
        await page
          .getByRole("button", {
            name: "發布全部草稿",
            exact: true,
          })
          .click();
        await page
          .getByRole("button", { name: "確認批次發布", exact: true })
          .click();
        await page
          .getByRole("dialog", { name: "確認批次發布", exact: true })
          .getByRole("button", { name: "確認批次發布", exact: true })
          .click();
        await page.waitForFunction(() =>
          window.calls.some((c) => c.name === "publish_dictionary_bulk"),
        );
        await page
          .getByRole("button", { name: "停止未開始的批次", exact: true })
          .click();
        await page.getByText(/已發布 200 · 待處理 205/).waitFor();
        await reload();
        await page
          .getByRole("button", { name: "恢復已保存的批次發布", exact: true })
          .click();
        await page
          .getByRole("dialog", { name: "批次發布預覽" })
          .getByRole("button", { name: "恢復已保存的批次發布", exact: true })
          .click();
        await page.getByText(/已發布 405 · 待處理 0/).waitFor();
        const pubPromise = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "下載作業結果清單", exact: true })
          .click();
        const pub = JSON.parse(
          fs.readFileSync(await (await pubPromise).path(), "utf8"),
        );
        assert.equal(pub.items.length, 405);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        const publishCalls = await page.evaluate(() =>
          window.calls.filter((c) => c.name === "publish_dictionary_bulk"),
        );
        assert.ok(publishCalls.length);
        for (const call of publishCalls) {
          assert.deepEqual(call.kind_filters, []);
          assert.equal(call.query_text, "");
          assert.equal(call.content_verified, true);
        }
        await page.goto(url + "/?language=en");
        await page
          .getByRole("button", { name: "Export data", exact: true })
          .waitFor();
        await page
          .getByRole("button", {
            name: "Publish all drafts",
            exact: true,
          })
          .waitFor();
        // Single persisted Draft deletion: cancel/failure preserve dirty input; success reloads list.
        await page.goto(url + "/?entry=00000000-0000-4000-8000-000000000001"+(viewport.width<500?"&embedded":""));
        await page
          .getByRole("button", { name: "刪除詞條", exact: true })
          .waitFor();
        await page.getByLabel("英文字形 1", { exact: true }).fill("unsaved item1");
        await page
          .getByRole("button", { name: "刪除詞條", exact: true })
          .click();
        const deletion = page.getByRole("dialog", {
          name: "刪除詞條",
          exact: true,
        });
        await deletion.getByText(/item1.*內容/).waitFor();
        await deletion
          .getByRole("button", { name: "取消", exact: true })
          .click();
        assert.equal(
          await page.getByLabel("英文字形 1", { exact: true }).inputValue(),
          "unsaved item1",
        );
        assert.equal(
          await page.evaluate(
            () =>
              window.calls.filter((c) => c.name === "delete_dictionary_entry")
                .length,
          ),
          0,
        );
        await page.evaluate(() => (window.failDelete = true));
        await page
          .getByRole("button", { name: "刪除詞條", exact: true })
          .click();
        await deletion
          .getByRole("button", { name: "確認刪除", exact: true })
          .click();
        await page
          .getByRole("alert")
          .filter({ hasText: "刪除失敗，編輯內容已保留；請核對 RPC 錯誤碼後再重試。" })
          .waitFor();
        assert.equal(
          await page.getByLabel("英文字形 1", { exact: true }).inputValue(),
          "unsaved item1",
        );
        await page.evaluate(() => (window.failDelete = false));
        await page
          .getByRole("button", { name: "刪除詞條", exact: true })
          .click();
        await deletion
          .getByRole("button", { name: "確認刪除", exact: true })
          .click();
        await page.waitForURL(url + "/dictionary/admin?deleted=1");
        await page.getByRole("link", { name: /item2/ }).waitFor();
        assert.equal(
          await page.getByRole("link", { name: /item1/ }).count(),
          0,
        );
        assert.equal(
          await page.getByRole("dialog", { name: "離開編輯" }).count(),
          0,
        );
        await page.goto(url + "/?entry=00000000-0000-4000-8000-000000000003");
        await page.getByRole('button',{name:'儲存／重試',exact:true}).waitFor();
        assert.equal(await page.getByLabel('英文字形 1',{exact:true}).inputValue(),'item3');
        assert.equal(
          await page
            .getByRole("button", { name: "刪除詞條", exact: true })
            .count(),
          1,
        );
        await context.close();
      }
      // Mobile uses the same export/import components. Cover their distinct
      // entry points without repeating every desktop quota/reload fault.
      const mobileContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      const mobilePage = await mobileContext.newPage();
      mobilePage.on("pageerror", (e) => errors.push(e.message));
      await mobilePage.goto(url + "/?embedded");
      await mobilePage.getByRole("button", { name: "匯出資料", exact: true }).click();
      const mobileExport = mobilePage.getByRole("dialog", { name: "匯出資料", exact: true });
      await mobileExport.waitFor();
      await mobileExport.getByRole("button", { name: "開始完整匯出", exact: true }).waitFor();
      await mobileExport.getByRole("button", { name: "關閉", exact: true }).click();
      await mobileExport.waitFor({ state: "detached" });
      await mobilePage.getByRole("button", { name: "匯入資料", exact: true }).click();
      const mobileImport = mobilePage.getByRole("dialog", { name: "匯入資料", exact: true });
      await mobileImport.waitFor();
      await mobileImport.getByLabel("匯入檔案", { exact: true }).waitFor();
      assert.equal(
        await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      await mobileContext.close();
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      await new Promise((r) => server.close(r));
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  },
);
