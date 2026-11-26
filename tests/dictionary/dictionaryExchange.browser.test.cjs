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
  "desktop exchange checkpoint, safe import and bulk publication; mobile import/export entry points",
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
    let activePage;
    try {
      // Full IndexedDB fault-injection and resume flow is a single desktop
      // contract; mobile entry points are checked separately below.
      for (const viewport of [{ width: 1280, height: 900 }]) {
        const context = await browser.newContext({
            viewport,
            acceptDownloads: true,
          }),
          page = await context.newPage();
        activePage = page;
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
        const raw = await page.evaluate(() => JSON.stringify(window.newDocument(52)));
        const upload = (name, buffer) =>
          page.getByLabel("匯入檔案", { exact: true }).setInputFiles({
            name,
            mimeType: "application/json",
            buffer: Buffer.from(buffer),
          });
        const analyze = page.getByRole("button", { name: "分析", exact: true });
        const analysis = page.getByRole("dialog", { name: "匯入分析", exact: true });
        const safe = analysis.getByRole("button", { name: "匯入安全詞條", exact: true });
        const importSafe = async () => {
          await safe.click();
          await page.getByRole("dialog", { name: "匯入安全詞條", exact: true })
            .getByRole("button", { name: "匯入安全詞條", exact: true }).click();
        };
        await upload("exchange.json", raw);
        await analyze.waitFor();
        // A preview that cannot be checkpointed must never stage or apply proposals.
        await page.evaluate(() => {
          const put = IDBObjectStore.prototype.put;
          IDBObjectStore.prototype.put = function (...args) {
            if (this.name === "items") {
              IDBObjectStore.prototype.put = put;
              throw new DOMException("fixture quota exceeded", "QuotaExceededError");
            }
            return put.apply(this, args);
          };
        });
        await analyze.click();
        const uncertain = "請求結果尚未確認。請保留草稿，先查詢正式狀態再重試。";
        await page.getByRole("alert").filter({
          hasText: "無法在此裝置儲存匯入進度，請保留來源檔案並重試。",
        }).waitFor();
        assert.deepEqual(await page.evaluate(() => window.fixtureState().imports), []);
        await analyze.click();
        await analysis.getByText(/新增詞條 52.*安全詞條 52/).waitFor();
        const probeCalls = await page.evaluate(() => window.calls.map(({ name }) => name));
        assert.ok(probeCalls.includes("dictionary_import_review_capabilities"));
        assert.ok(probeCalls.includes("inspect_dictionary_exchange"));
        await page.evaluate(() => { window.holdImportBatch = true; });
        await importSafe();
        await page.waitForFunction(() => typeof window.finishImportBatch === "function");
        await analysis.getByRole("button", { name: "停止未開始的批次", exact: true }).click();
        await page.evaluate(() => window.finishImportBatch());
        await analysis.getByText(/成功 25 ·/).waitFor();
        await analysis.getByRole("button", { name: "關閉", exact: true }).click();
        await page.getByRole("button", { name: "關閉", exact: true }).click();
        await reload();
        await page.getByRole("button", { name: "匯入資料", exact: true }).click();
        await page.getByRole("button", { name: "恢復匯入分析", exact: true }).click();
        assert.equal(await page.evaluate(() => window.fixtureState().records.length), 28);

        // Commit the first resumed batch, then lose its reply. Read the same rows
        // before applying the final two entries.
        await page.evaluate(() => { window.loseResponse = true; });
        await importSafe();
        await analysis.getByRole("alert").filter({ hasText: uncertain }).waitFor();
        await importSafe();
        await analysis.getByText(/成功 27 ·/).waitFor();
        const reportPromise = page.waitForEvent("download");
        await analysis.getByRole("button", { name: "下載作業結果清單", exact: true }).click();
        const report = JSON.parse(fs.readFileSync(await (await reportPromise).path(), "utf8"));
        assert.equal(report.format, "nexus-persistent-import-results");
        assert.equal(report.records.filter((r) => r.result?.status === "applied").length, 27);
        const saved = await page.evaluate(() => ({
          ...window.fixtureState(),
          reads: window.reviewReads,
          batches: window.calls.filter(({ name }) => name === "apply_dictionary_safe_import_reviews")
            .map(({ operations }) => operations.length),
        }));
        assert.equal(saved.reads, 25);
        assert.deepEqual(saved.batches, [25, 2]);
        assert.equal(saved.imports.length, 52);
        assert.equal(new Set(saved.imports.map((r) => r.entry_id)).size, 52);
        assert.ok(saved.imports.every((r) => r.revision === 2 && r.item.status === "applied"));
        assert.equal(saved.records.length, 55);
        for (const { snapshot: { detail } } of JSON.parse(raw).records) {
          const actual = saved.records.find((r) => r.snapshot.detail.entry.id === detail.entry.id).snapshot.detail;
          assert.equal(actual.entry.headword, detail.entry.headword);
          assert.equal(actual.senses[0].gloss_zh_tw, detail.senses[0].gloss_zh_tw);
        }

        await analysis.getByRole("button", { name: "關閉", exact: true }).click();
        const importedIDs = new Set(saved.imports.map((r) => r.entry_id));
        await upload("repeat.json", JSON.stringify({
          ...JSON.parse(raw),
          records: saved.records.filter((r) => importedIDs.has(r.snapshot.detail.entry.id)),
        }));
        await analyze.click();
        await analysis.getByText(/未變更 52/).waitFor();
        await analysis.getByRole("button", { name: "關閉", exact: true }).click();
        await page.getByText("保留的本機匯入封存", { exact: true }).click();
        assert.equal(await page.getByLabel("保留的本機匯入封存", { exact: true })
          .locator("option").filter({ hasText: "exchange.json" }).count(), 1);
        await page.getByRole("button", { name: "關閉", exact: true }).click();
        const modified = structuredClone(doc.records.find((r) => r.snapshot.detail.entry.headword === "item2"));
        modified.snapshot.detail.senses[0].gloss_zh_tw = "待審核的新義項";
        await page.getByRole("button", { name: "匯入資料", exact: true }).click();
        await upload("review.json", JSON.stringify({ ...doc, records: [modified] }));
        await analyze.click();
        const importAll = analysis.getByRole("button", { name: "匯入全部", exact: true });
        await importAll.click();
        await page.getByRole("dialog", { name: "匯入全部", exact: true })
          .getByRole("button", { name: "匯入全部", exact: true }).click();
        await analysis.getByText(/待審核 1 ·/).waitFor();
        await analysis.getByRole("link", { name: "開啟未審核詞條", exact: true }).click();
        const review = page.getByRole("article").filter({ has: page.getByRole("heading", { name: /^item2 ·/ }) });
        const decision = review.getByLabel("處理操作 gloss_zh_tw", { exact: true });
        await decision.selectOption("keep");
        await review.getByText("已決策，尚未套用", { exact: true }).waitFor();
        await reload();
        await decision.waitFor();
        assert.equal(await decision.inputValue(), "keep");
        await review.getByRole("button", { name: "套用已決策項目", exact: true }).click();
        await page.getByRole("dialog", { name: "套用已決策項目", exact: true })
          .getByRole("button", { name: "套用已決策項目", exact: true }).click();
        await page.getByText("保留現有／拒絕", { exact: true }).waitFor();
        await review.waitFor({ state: "detached" });
        const decided = await page.evaluate(() => {
          const state = window.fixtureState();
          return {
            checked: window.calls.some(({ name }) => name === "save_dictionary_import_review"),
            keep: state.imports.find((row) => row.source.name === "review.json"),
            gloss: state.records.find((r) => r.snapshot.detail.entry.headword === "item2")
              .snapshot.detail.senses[0].gloss_zh_tw,
          };
        });
        assert.equal(decided.checked, true);
        assert.equal(decided.keep.pending_count, 0);
        assert.equal(decided.gloss, "中文2");
        await page.goto(url);
        // Filters can even hide every row; global publication is independent of them.
        await page
          .getByLabel("搜尋單字或構詞", { exact: true })
          .fill("no-visible-match");
        await page.getByRole("tab", { name: "構詞", exact: true }).click();
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
        await page.getByLabel("搜尋單字或構詞", { exact: true }).fill("item2");
        await page.getByRole("link", { name: /\bitem2\b/ }).waitFor();
        assert.equal(
          await page.getByRole("link", { name: /\bitem1\b/ }).count(),
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
      activePage = mobilePage;
      mobilePage.on("pageerror", (e) => errors.push(e.message));
      await mobilePage.goto(url + "/?embedded");
      await mobilePage.getByRole("button", { name: "匯出資料", exact: true }).click();
      const mobileExport = mobilePage.getByRole("dialog", { name: "匯出資料", exact: true });
      await mobileExport.waitFor({ timeout: 10000 }).catch(async error => {
        const diagnostics = await mobilePage.evaluate(() => ({
          url: location.href,
          buttons: [...document.querySelectorAll('button')].filter(b => /匯出|匯入/.test(b.textContent ?? '')).map(b => ({ text: b.textContent?.trim(), disabled: b.disabled })),
          dialogs: [...document.querySelectorAll('dialog')].map(d => ({
            open: d.open, title: d.querySelector('h2')?.textContent, visible: !!d.getClientRects().length,
          })),
          alerts: [...document.querySelectorAll('[role="alert"]')].map(e => e.textContent),
        }));
        console.error('MOBILE_EXCHANGE_EXPORT_DIAGNOSTICS', JSON.stringify(diagnostics));
        throw error;
      });
      await mobileExport.getByRole("button", { name: "開始完整匯出", exact: true }).waitFor();
      await mobileExport.getByRole("button", { name: "關閉", exact: true }).click();
      await mobileExport.waitFor({ state: "detached" });
      await mobilePage.getByRole("button", { name: "匯入資料", exact: true }).click();
      const mobileImport = mobilePage.getByRole("dialog", { name: "匯入資料", exact: true });
      await mobileImport.waitFor();
      await mobileImport.getByLabel("匯入檔案", { exact: true }).waitFor();
      await mobileImport.getByRole("button", { name: "分析", exact: true }).waitFor();
      assert.equal(
        await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      await mobileContext.close();
      assert.deepEqual(errors, []);
    } catch (error) {
      if (activePage && !activePage.isClosed()) {
        console.error("DICTIONARY_EXCHANGE_SCREEN", (await activePage.locator("body").innerText()).slice(0, 4000));
      }
      throw error;
    } finally {
      await browser.close();
      await new Promise((r) => server.close(r));
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  },
);
