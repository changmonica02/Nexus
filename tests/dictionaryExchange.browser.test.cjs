const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { build } = require("esbuild"),
  { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
test(
  "desktop/tablet/mobile actual bulk UI: filtered complete export/retry, file preview, bounded pause/refresh/resume and publication token/report, English labels",
  { timeout: 120000 },
  async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus44-browser-"));
    await build({
      entryPoints: [path.join(__dirname, "fixtures/dictionaryExchange.jsx")],
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
      for (const viewport of [
        { width: 1280, height: 900 },
        { width: 820, height: 1180 },
        { width: 390, height: 844 },
      ]) {
        const context = await browser.newContext({
            viewport,
            acceptDownloads: true,
          }),
          page = await context.newPage();
        page.on("pageerror", (e) => {
          errors.push(e.message);
          console.error(e.message);
        });
        await page.goto(url);
        await page.getByLabel("搜尋管理詞條", { exact: true }).fill("item1");
        await page
          .getByRole("button", { name: "匯出資料", exact: true })
          .click();
        await page.evaluate(() => (window.failExport = true));
        await page
          .getByRole("button", { name: "開始完整匯出", exact: true })
          .click();
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
        assert.equal(doc.schema_version, 1);
        assert.equal(doc.records.length, 1);
        assert.equal(doc.scope.query, "item1");
        await page.getByLabel("匯出範圍", { exact: true }).selectOption("all");
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
        await page.getByLabel("搜尋管理詞條", { exact: true }).fill("");
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
        await page.waitForFunction(() =>
          window.calls.some((c) => c.name === "apply_dictionary_import_batch"),
        );
        await page
          .getByRole("button", { name: "停止未開始的批次", exact: true })
          .click();
        await page
          .getByText("總共 52 · 已完成 25 · 失敗 0 · 未處理 27", {
            exact: true,
          })
          .waitFor();
        await page.reload();
        await page
          .getByRole("button", { name: "匯入資料", exact: true })
          .click();
        await page
          .getByText("總共 52 · 已完成 25 · 失敗 0 · 未處理 27", {
            exact: true,
          })
          .waitFor();
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
        await page
          .getByRole("button", {
            name: "批次發布：全部符合條件的草稿",
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
        await page.reload();
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
        await page.goto(url + "/?language=en");
        await page
          .getByRole("button", { name: "Export data", exact: true })
          .waitFor();
        await page
          .getByRole("button", {
            name: "Bulk publish all matching drafts",
            exact: true,
          })
          .waitFor();
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
