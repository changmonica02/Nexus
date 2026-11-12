const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { build } = require("esbuild"),
  { chromium, webkit } = require("playwright");
const {
  client,
  draft,
  id,
  sql,
} = require("./fixtures/dictionaryTransferDatabase.cjs");
const {
  mapDictionaryDraft,
} = require("../src/features/dictionary/draftPipeline.ts");
const {database,client:catalogClient}=require("./fixtures/morphemeDatabase.cjs");
test(
  "real PostgreSQL API + transfer dialogs: frozen export, safe replacement, no-write analysis, mobile and OAuth URL",
  { timeout: 150000 },
  async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-persistent-")),
      root = path.resolve(__dirname, "..");
    let pg;
    await build({
      entryPoints: ["tests/fixtures/persistentImport.jsx"],
      outfile: path.join(tmp, "fixture.js"),
      bundle: true,
      format: "esm",
      jsx: "automatic",
      define: { "process.env": JSON.stringify({ NODE_ENV: "development" }) },
      plugins: [
        {
          name: "isolated-services",
          setup(b) {
            b.onResolve({ filter: /^next\/link$/ }, () => ({
              path: "link",
              namespace: "fixture",
            }));
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `import React from '${root}/node_modules/react/index.js';export default function Link({children,...props}){return React.createElement('a',props,children)}`,
              loader: "js",
              resolveDir: root,
            }));
            b.onLoad(
              { filter: /infrastructure\/supabase\/client\.ts$/ },
              () => ({
                contents:
                  "export const getSupabase=()=>window.dictionaryClient;export const isSupabaseConfigured=()=>true;",
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
    const server = http.createServer(async (req, res) => {
      if (req.url === "/rpc") {
        try {
          let raw = "";
          for await (const part of req) raw += part;
          const { name, args } = JSON.parse(raw);
          const result = await (name === "search_dictionary_catalog" ? catalogClient(pg) : client(pg)).rpc(name, args);
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(result));
        } catch (e) {
          res.end(JSON.stringify({ error: { message: e.message } }));
        }
      } else if (req.url === "/fixture.js") {
        res.setHeader("content-type", "text/javascript");
        res.end(fs.readFileSync(path.join(tmp, "fixture.js")));
      } else if (req.url === "/fixture.css") res.end(css);
      else
        res.end(
          '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>',
        );
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const engine =
      process.env.TRANSFER_BROWSER === "webkit" ? webkit : chromium;
    const browser = await engine.launch({
      executablePath:
        engine === webkit
          ? process.env.WEBKIT_EXECUTABLE
          : process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
      args: engine === chromium ? ["--no-sandbox"] : [],
    });
    const errors = [];
    try {
      pg = await database();
      const {
        buildImportSession,
      } = require("../src/features/dictionary/importReview.ts");
      const {
        stagePersistentSession,
      } = require("../src/features/dictionary/persistentImport.ts");
      const d = draft(4000);
      d.headword = "transfer";
      await sql(pg, "select apply_dictionary_drafts($1,false,true) v", [
        JSON.stringify([mapDictionaryDraft(d)]),
      ]);
      const old = structuredClone(d);
      old.senses.push({
        id: id(4003),
        part_of_speech: "noun",
        gloss_zh_tw: "舊候選",
      });
      old.senses[0].gloss_zh_tw = "未被取代的舊差異";
      const session = await buildImportSession(
        client(pg),
        id(900000),
        "json",
        [old],
        [],
        crypto.randomUUID(),
        { exchange: true },
      );
      const oldRow = (
        await stagePersistentSession(client(pg), session, "old.json")
      )[0];
      const base = "http://127.0.0.1:" + server.address().port;
      for (const width of [1280, 820, 320]) {
        const context = await browser.newContext({
            viewport: { width, height: 900 },
            acceptDownloads: true,
          }),
          page = await context.newPage();
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(base);
        await page
          .getByRole("button", { name: "匯出資料", exact: true })
          .click();
        await page
          .getByRole("checkbox", { name: "待審核", exact: true })
          .check();
        const dialog = page.getByRole("dialog", {
          name: "匯出資料",
          exact: true,
        });
        await dialog
          .getByRole("checkbox", { name: "全部類型", exact: true })
          .uncheck();
        assert.equal(
          await dialog
            .getByRole("button", { name: "開始完整匯出", exact: true })
            .isDisabled(),
          true,
        );
        await dialog
          .getByRole("checkbox", { name: "字根", exact: true })
          .check();
        await dialog.getByText(/字根.*待審核.*0 筆詞條/).waitFor();
        await dialog
          .getByRole("checkbox", { name: "全部類型", exact: true })
          .check();
        const download = page.waitForEvent("download");
        await dialog
          .getByRole("button", { name: "開始完整匯出", exact: true })
          .click();
        const document = JSON.parse(
          fs.readFileSync(await (await download).path(), "utf8"),
        );
        assert.equal(document.records.length, 1);
        assert.ok(document.records[0].import_reviews.length);
        assert.equal(document.scope.pending_only, true);
        await dialog
          .getByRole("checkbox", { name: "待審核", exact: true })
          .uncheck();
        const again = page.waitForEvent("download");
        await dialog
          .getByRole("button", { name: "下載完整 JSON", exact: true })
          .click();
        assert.deepEqual(
          JSON.parse(fs.readFileSync(await (await again).path(), "utf8")),
          document,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await dialog.getByRole("button", { name: "關閉", exact: true }).click();
        await page
          .getByRole("button", { name: "匯入資料", exact: true })
          .click();
        const input = page.getByRole("dialog", {
          name: "匯入資料",
          exact: true,
        });
        assert.equal(await input.locator("details[open]").count(), 0);
        // Supply explicit stable-ID candidate; do not edit or invent source identities.
        document.records[0].import_candidate = structuredClone(d);
        document.records[0].import_candidate.senses.push({
          id: id(4003),
          part_of_speech: "noun",
          gloss_zh_tw: "整理後獨立義項",
        });
        const raw = JSON.stringify(document);
        await input
          .getByLabel("匯入格式", { exact: true })
          .selectOption("json");
        await input.getByLabel("檔案內容（可貼上）", { exact: true }).fill(raw);
        const before = await sql(
          pg,
          "select count(*)::integer v from dictionary_import_review_items",
        );
        await input.getByRole("button", { name: "分析", exact: true }).click();
        const analysis = page.getByRole("dialog", {
          name: "匯入分析",
          exact: true,
        });
        await analysis.waitFor();
        assert.equal(
          await sql(
            pg,
            "select count(*)::integer v from dictionary_import_review_items",
          ),
          before,
        );
        assert.equal(await analysis.locator("details[open]").count(), 0);
        await analysis
          .getByRole("button", { name: "關閉", exact: true })
          .click();
        assert.equal(
          await input
            .getByLabel("檔案內容（可貼上）", { exact: true })
            .inputValue(),
          raw,
        );
        await input
          .getByRole("button", { name: "恢復匯入分析", exact: true })
          .click();
        await analysis
          .locator("summary")
          .filter({ hasText: "安全詞條（1）" })
          .click();
        await analysis.getByText("查看完整內容與差異", { exact: true }).click();
        assert.equal(
          await analysis.evaluate((el) => el.scrollWidth <= el.clientWidth),
          true,
        );
        if (width === 320) {
          await analysis
            .getByRole("button", { name: "匯入安全詞條", exact: true })
            .click();
          await page
            .getByRole("dialog")
            .last()
            .getByRole("button", { name: "匯入安全詞條", exact: true })
            .click();
          await analysis.getByText(/transfer · 已套用至 Draft/).waitFor();
          const source = await sql(
            pg,
            "select to_jsonb(r) v from dictionary_import_review_items r where id=$1",
            [oldRow.id],
          );
          assert.equal(source.pending_count, 1);
          assert.equal(
            source.item.issues.find((i) => i.target?.id === id(4003)).applied,
            true,
          );
          assert.equal(
            (await sql(pg, "select get_dictionary_entry($1) v", [d.entry_id]))
              .senses.length,
            2,
          );
          await analysis
            .getByRole("button", { name: "關閉", exact: true })
            .click();
          assert.equal(
            await input
              .getByLabel("檔案內容（可貼上）", { exact: true })
              .inputValue(),
            raw,
          );
        }
        await context.close();
      }
      const bulkContext = await browser.newContext({
          viewport: { width: 320, height: 900 },
        }),
        bulkPage = await bulkContext.newPage();
      bulkPage.on("pageerror", (e) => errors.push(e.message));
      await bulkPage.goto(base);
      await bulkPage
        .getByRole("button", { name: "匯入資料", exact: true })
        .click();
      const canonical = await sql(
        pg,
        "select get_dictionary_ai_snapshot($1) v",
        [d.entry_id],
      );
      const records = Array.from({ length: 1001 }, (_, n) => {
        const entryId = id(7000 + n),
          snapshot = structuredClone(canonical);
        snapshot.detail.entry = {
          ...snapshot.detail.entry,
          id: entryId,
          headword: "bulk-new-" + n,
          status: "draft",
          revision: 0,
          published_at: null,
          word_segments: null,
        };
        snapshot.detail.senses = [
          {
            id: id(17000 + n),
            entry_id: entryId,
            part_of_speech: "noun",
            gloss_zh_tw: "獨立詞條" + n,
            revision: 0,
            updated_at: snapshot.detail.entry.updated_at,
          },
        ];
        snapshot.metadata = null;
        return { snapshot, reviews: [], version: null };
      });
      await bulkPage
        .getByLabel("匯入格式", { exact: true })
        .selectOption("json");
      await bulkPage
        .getByLabel("檔案內容（可貼上）", { exact: true })
        .fill(
          JSON.stringify({
            format: "nexus-dictionary-exchange",
            schema_version: 1,
            exported_at: new Date().toISOString(),
            scope: { kinds: ["word"], statuses: [], query: "" },
            records,
          }),
        );
      const beforeBulk = await sql(
          pg,
          "select count(*)::integer v from dictionary_import_review_items",
        ),
        started = performance.now();
      await bulkPage.getByRole("button", { name: "分析", exact: true }).click();
      const bulkAnalysis = bulkPage.getByRole("dialog", {
        name: "匯入分析",
        exact: true,
      });
      await bulkAnalysis.waitFor();
      assert.equal(await bulkAnalysis.getByRole("listitem").count(), 0);
      await bulkAnalysis.getByText("安全詞條（1001）", { exact: true }).click();
      await bulkAnalysis.getByRole("listitem").first().waitFor();
      assert.equal(await bulkAnalysis.getByRole("listitem").count(), 25);
      assert.equal(await bulkAnalysis.locator("pre").count(), 0);
      assert.equal(
        await sql(
          pg,
          "select count(*)::integer v from dictionary_import_review_items",
        ),
        beforeBulk,
      );
      console.log(
        JSON.stringify({
          browser: process.env.TRANSFER_BROWSER || "chromium",
          entries: 1001,
          analysis_ms: Math.round(performance.now() - started),
          rendered: 25,
        }),
      );
      await bulkContext.close();
      const context = await browser.newContext(),
        page = await context.newPage();
      await page.goto(base + "/?account=1");
      await page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const r = indexedDB.open("oauth-account-safety", 1);
            r.onupgradeneeded = () => r.result.createObjectStore("pending");
            r.onsuccess = () => {
              const tx = r.result.transaction("pending", "readwrite");
              tx.objectStore("pending").put(
                { owner: "account-A", answer: "pending" },
                "A",
              );
              tx.objectStore("pending").put({ owner: "account-B" }, "B");
              tx.oncomplete = () => {
                r.result.close();
                resolve();
              };
              tx.onerror = reject;
            };
          }),
      );
      await page.getByRole("button", { name: /使用 Google 登入/ }).click();
      await page.waitForFunction(() => window.authRequests?.length === 1);
      const request = await page.evaluate(() => window.authRequests[0]);
      const oauth = new URL(request.url);
      assert.equal(oauth.searchParams.get("prompt"), "select_account");
      assert.equal(oauth.searchParams.get("provider"), "google");
      assert.equal(oauth.searchParams.get("redirect_to"), base);
      assert.equal(
        request.request.options.queryParams.prompt,
        "select_account",
      );
      await page.goto(base + "/?account=1&email=old@example.test");
      await page.getByRole("button", { name: "登出", exact: true }).click();
      assert.equal(await page.evaluate(() => window.signedOut), true);
      await page.goto(base + "/?account=1");
      await page.getByRole("button", { name: /使用 Google 登入/ }).click();
      await page.waitForFunction(() => window.authRequests?.length === 1);
      const pending = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const r = indexedDB.open("oauth-account-safety", 1);
            r.onsuccess = () => {
              const tx = r.result.transaction("pending");
              const all = tx.objectStore("pending").getAll();
              all.onsuccess = () => {
                r.result.close();
                resolve(all.result);
              };
            };
          }),
      );
      assert.deepEqual(pending, [
        { owner: "account-A", answer: "pending" },
        { owner: "account-B" },
      ]);
      await context.close();
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      await new Promise((r) => server.close(r));
      if (pg) await pg.close();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  },
);
