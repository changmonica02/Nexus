const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { build } = require("esbuild"),
  { chromium } = require("playwright");
const {
  database,
  client,
  draft,
  id,
  sql,
} = require("./fixtures/persistentImportDatabase.cjs");
const {
  mapDictionaryDraft,
} = require("../src/features/dictionary/draftPipeline.ts");
test(
  "real SQL + actual admin/import/review components: desktop/tablet/mobile, file summary, safe partial Review, cross-device saved decision, apply, color and English",
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
          const result = await client(pg).rpc(name, args);
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
    const browser = await chromium.launch({
      executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    const errors = [];
    try {
      for (const width of [1280, 820, 390]) {
        pg = await database();
        const d = draft(100);
        d.headword = "throw";
        d.inflections = [
          {
            id: id(102),
            sense_id: id(101),
            form_kind: "past",
            form: "threw",
            sort_order: 0,
          },
        ];
        await sql(pg, "select apply_dictionary_drafts($1,false,true) v", [
          JSON.stringify([mapDictionaryDraft(d)]),
        ]);
        await sql(pg, "select publish_dictionary_entry($1,true) v", [
          d.entry_id,
        ]);
        const exported = await sql(
          pg,
          "select export_dictionary_exchange_page('{}','{}','',null,null) v",
        );
        const record = exported.records[0];
        record.snapshot.detail.senses.push({
          id: id(103),
          entry_id: d.entry_id,
          part_of_speech: "noun",
          gloss_zh_tw: "投擲動作",
          revision: 1,
          updated_at: record.snapshot.detail.entry.updated_at,
        });
        record.snapshot.detail.inflections.push({
          id: id(104),
          entry_id: d.entry_id,
          sense_id: id(101),
          form_kind: "past",
          form: "throwed",
          sort_order: 1,
          revision: 1,
          updated_at: record.snapshot.detail.entry.updated_at,
        });
        const raw = JSON.stringify({
          format: "nexus-dictionary-exchange",
          schema_version: 1,
          exported_at: new Date().toISOString(),
          scope: { kinds: [], statuses: [], query: "" },
          records: [record],
        });
        const first = await browser.newContext({
            viewport: { width, height: 900 },
          }),
          page = await first.newPage();
        page.on("pageerror", (e) => errors.push(e.message));
        const base = "http://127.0.0.1:" + server.address().port;
        await page.goto(base);
        await page.getByRole("link", { name: /throw.*新發布/ }).waitFor();
      assert.equal(await page.locator("ul").first().evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(" ").length),width>=1280?3:width>=768?2:1);
        await page
          .getByRole("button", { name: "匯入資料", exact: true })
          .click();
        await page
          .getByLabel("匯入檔案", { exact: true })
          .setInputFiles({
            name: "throw.json",
            mimeType: "application/json",
            buffer: Buffer.from(raw),
          });
        await page
          .getByRole("button", { name: "解析匯入摘要", exact: true })
          .click();
        await page
          .getByRole("button", { name: "確認自動匯入", exact: true })
          .waitFor();
        await page
          .getByRole("button", { name: "確認自動匯入", exact: true })
          .click();
        await page
          .getByRole("dialog")
          .last()
          .getByRole("button", { name: "確認自動匯入", exact: true })
          .click();
        try {
          await page
            .getByText("已處理 1 / 1", { exact: false })
            .waitFor({ timeout: 7000 });
        } catch (e) {
          console.error(
            "PERSISTENT_UI",
            await page.locator("body").innerText(),
            JSON.stringify(
              (
                await pg.query(
                  "select item,result from dictionary_import_review_items",
                )
              ).rows,
            ),
          );
          throw e;
        }
        assert.equal(
          (await pg.query("select * from dictionary_senses")).rows.length,
          1,
        );
        assert.equal(
          (
            await pg.query(
              "select candidate from dictionary_review_drafts where state='active'",
            )
          ).rows[0].candidate.bundle.dictionary_senses.length,
          2,
        );
        await first.close();
        const second = await browser.newContext({
            viewport: { width, height: 900 },
            isMobile: width === 390,
            hasTouch: width <= 820,
          }),
          other = await second.newPage();
        other.on("pageerror", (e) => errors.push(e.message));
        await other.goto(base + "/?review=all");
        await other.getByText("throwed", { exact: false }).first().waitFor();
        await other
          .getByLabel("處理操作 inflections", { exact: true })
          .selectOption("keep");
        await other.getByText("已決策，尚未套用", { exact: true }).waitFor();
        await other.reload();
        await other.getByText("已決策，尚未套用", { exact: true }).waitFor();
        await other
          .getByRole("button", { name: "套用已決策項目", exact: true })
          .click();
        await other
          .getByRole("dialog")
          .last()
          .getByRole("button", { name: "套用已決策項目", exact: true })
          .click();
        await other
          .getByRole("heading", { name: "匯入待審核 · 0", exact: true })
          .waitFor();
        assert.equal(
          await other.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await other.goto(base + "/?en=1");
        await other
          .getByRole("link", { name: /throw.*Draft exists/ })
          .waitFor();
        await second.close();
        await pg.close();
        pg = null;
      }
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      await new Promise((r) => server.close(r));
      if (pg) await pg.close();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  },
);
