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
  sql,
  id,
} = require("./fixtures/persistentImportDatabase.cjs");
test(
  "actual SQL draft publication: new and reopened Word/Prefix/Root, dirty/cancel/error/stale protection, success refresh and Review lifecycle",
  { timeout: 180000 },
  async () => {
    const root = path.resolve(__dirname, ".."),
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-draft-publish-")),
      pg = await database();
    let browser, server;
    try {
      await build({
        entryPoints: ["tests/fixtures/dictionaryDraftPublish.jsx"],
        outfile: path.join(tmp, "fixture.js"),
        bundle: true,
        format: "esm",
        jsx: "automatic",
        define: { "process.env": JSON.stringify({ NODE_ENV: "development" }) },
        plugins: [
          {
            name: "isolated",
            setup(b) {
              b.onLoad(
                { filter: /infrastructure\/supabase\/client\.ts$/ },
                () => ({
                  contents:
                    "export const getSupabase=()=>window.dictionaryClient;",
                  loader: "js",
                }),
              );
              b.onResolve({ filter: /^next\/link$/ }, () => ({
                path: "link",
                namespace: "fixture",
              }));
              b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
                contents: `import React from '${root}/node_modules/react/index.js';export default function Link(props){return React.createElement('a',props)}`,
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
      const calls = [];
      server = http.createServer(async (req, res) => {
        try {
          if (req.url === "/rpc" || req.url === "/table") {
            let raw = "";
            for await (const part of req) raw += part;
            const body = JSON.parse(raw);
            let result;
            if (req.url === "/table") {
              assert.ok(
                [
                  "dictionary_entry_groups",
                  "dictionary_sense_groups",
                  "dictionary_ai_metadata",
                  "dictionary_review_drafts",
                ].includes(body.table),
              );
              const rows = (await pg.query(`select * from ${body.table}`)).rows;
              result = {
                data: rows.filter((r) =>
                  body.filters.every(([k, values]) => values.includes(r[k])),
                ),
              };
            } else {
              calls.push(body);
              const fields = {
                get_dictionary_entry: ["entry_uuid"],
                get_dictionary_ai_snapshot: ["entry_uuid"],
                apply_dictionary_drafts: ["drafts", "preview", "allow_edits"],
                delete_dictionary_draft_sense: [
                  "entry_uuid",
                  "sense_uuid",
                  "expected_entry_revision",
                  "expected_sense_revision",
                ],
                publish_dictionary_entry: ["entry_uuid", "content_verified"],
              };
              const keys = fields[body.name];
              if (keys) {
                assert.deepEqual(
                  Object.keys(body.args).sort(),
                  [...keys].sort(),
                );
                result = {
                  data: await sql(
                    pg,
                    `select ${body.name}(${keys.map((_, i) => "$" + (i + 1)).join(",")}) v`,
                    keys.map((k) =>
                      typeof body.args[k] === "object"
                        ? JSON.stringify(body.args[k])
                        : body.args[k],
                    ),
                  ),
                };
              } else result = await client(pg).rpc(body.name, body.args);
            }
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify(result));
          } else if (req.url === "/fixture.js") {
            res.setHeader("content-type", "text/javascript");
            res.end(fs.readFileSync(path.join(tmp, "fixture.js")));
          } else if (req.url === "/fixture.css") {
            res.setHeader("content-type", "text/css");
            res.end(css);
          } else
            res.end(
              '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>',
            );
        } catch (e) {
          res.end(JSON.stringify({ error: { message: e.message } }));
        }
      });
      await new Promise((r) => server.listen(0, "127.0.0.1", r));
      browser = await chromium.launch({
        executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
        args: ["--no-sandbox"],
      });
      const errors = [];
      for (const width of [1280, 820, 390])
        for (const kind of ["prefix", "word", "root"]) {
          const context = await browser.newContext({
              viewport: { width, height: 1000 },
            }),
            page = await context.newPage();
          page.setDefaultTimeout(10000);
          page.on("pageerror", (e) => errors.push(e.message));
          await page.goto(
            "http://127.0.0.1:" + server.address().port + "/?kind=" + kind,
          );
          const publish = page.getByRole("button", {
              name: "發布",
              exact: true,
            }),
            save = page.getByRole("button", { name: "儲存", exact: true });
          await publish.waitFor().catch(async (e) => {
            throw Error(
              JSON.stringify({
                errors,
                body: await page.locator("body").innerText(),
              }) +
                " " +
                e.message,
            );
          });
          assert.equal(await publish.isDisabled(), true);
          const label = { prefix: "字首", root: "字根", word: "單字" }[kind],
            headword =
              kind === "prefix"
                ? width === 1280
                  ? "ab-"
                  : "ab-" + width
                : kind + "-" + width;
          await page.getByLabel(label, { exact: true }).fill(headword);
          await page.getByLabel("中文意思", { exact: true }).fill("測試義項");
          await page
            .getByRole("button", {
              name: kind === "word" ? "＋新增義項" : "＋新增中文義項",
              exact: true,
            })
            .click();
          await page
            .getByLabel("中文意思", { exact: true })
            .nth(1)
            .fill("即將刪除");
          await save.click();
          await page.waitForURL(/entry=/);
          const entry = new URL(page.url()).searchParams.get("entry");
          await publish.waitFor({ state: "visible" });
          await page.waitForFunction(
            () =>
              !Array.from(document.querySelectorAll("button")).find(
                (b) => b.textContent === "發布",
              )?.disabled,
          );
          const retainedGloss = await page
            .getByLabel("中文意思", { exact: true })
            .first()
            .inputValue();
          // Immediate child deletion advances the editor baseline revision without remounting the parent.
          await page
            .getByRole("button", { name: "刪除義項 2", exact: true })
            .click();
          await page
            .getByRole("dialog")
            .getByRole("button", { name: "確認", exact: true })
            .click();
          await page
            .getByRole("alert")
            .filter({ hasText: "義項已刪除" })
            .waitFor();
          await page.getByLabel("中文意思", { exact: true }).fill("尚未儲存");
          const count = calls.filter(
            (x) => x.name === "publish_dictionary_entry",
          ).length;
          await publish.click();
          await page
            .getByRole("alert")
            .filter({ hasText: "請先儲存" })
            .waitFor();
          assert.equal(
            calls.filter((x) => x.name === "publish_dictionary_entry").length,
            count,
          );
          await page
            .getByLabel("中文意思", { exact: true })
            .fill(retainedGloss);
          await publish.click();
          await page
            .getByRole("dialog", { name: "發布詞條", exact: true })
            .getByRole("button", { name: "取消", exact: true })
            .click();
          assert.equal(
            (await sql(pg, "select get_dictionary_entry($1) v", [entry])).entry
              .status,
            "draft",
          );
          assert.equal(
            calls.filter((x) => x.name === "publish_dictionary_entry").length,
            count,
          );
          await page.reload();
          await publish.waitFor();
          await page.evaluate(() => (window.failPublish = true));
          await publish.click();
          await page
            .getByRole("dialog", { name: "發布詞條", exact: true })
            .getByRole("button", { name: "發布", exact: true })
            .click();
          await page
            .getByRole("alert")
            .filter({ hasText: "publication denied" })
            .waitFor();
          assert.equal(
            await page.getByLabel("中文意思", { exact: true }).inputValue(),
            retainedGloss,
          );
          assert.equal(
            (await sql(pg, "select get_dictionary_entry($1) v", [entry])).entry
              .status,
            "draft",
          );
          // A competing saved edit must fail preflight, preserving the editor and never issuing publish.
          await page.evaluate(() => (window.failPublish = false));
          await pg.exec("reset role");
          await pg.query(
            "update dictionary_entries set revision=revision+1 where id=$1",
            [entry],
          );
          await pg.exec("set role authenticated");
          await publish.click();
          await page
            .getByRole("dialog", { name: "發布詞條", exact: true })
            .getByRole("button", { name: "發布", exact: true })
            .click();
          await page
            .getByRole("alert")
            .filter({ hasText: "草稿版本已變更" })
            .waitFor();
          assert.equal(
            calls.filter((x) => x.name === "publish_dictionary_entry").length,
            count,
          );
          await page.reload();
          await publish.waitFor();
          await publish.click();
          await page
            .getByRole("dialog", { name: "發布詞條", exact: true })
            .getByRole("button", { name: "發布", exact: true })
            .click();
          await page
            .getByRole("button", { name: "重新載入版本與草稿", exact: true })
            .waitFor();
          const published = await sql(pg, "select get_dictionary_entry($1) v", [
            entry,
          ]);
          assert.equal(published.entry.status, "published");
          assert.equal(published.entry.id, entry);
          assert.equal(published.senses[0].gloss_zh_tw, retainedGloss);
          assert.equal(
            calls.filter((x) => x.name === "publish_dictionary_entry").length,
            count + 1,
          );
          assert.equal(
            calls.findLast((x) => x.name === "publish_dictionary_entry").args
              .content_verified,
            true,
          );
          assert.equal(
            await page.locator("input").first().inputValue(),
            headword,
          );
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
          await context.close();
        }
      // A legacy copied Review is deliberately not a standalone publishable Entry.
      await pg.exec("reset role");
      const source = await sql(
        pg,
        "select id::text v from dictionary_entries where status='published' limit 1",
      );
      await pg.query(
        "insert into dictionary_entries(id,kind,headword) values($1,'prefix','legacy-')",
        [id(980000)],
      );
      await pg.query(
        "insert into dictionary_senses(id,entry_id,gloss_zh_tw) values($1,$2,'保留舊稿')",
        [id(980001), id(980000)],
      );
      await pg.query(
        "insert into dictionary_ai_metadata(entry_id,published_entry_id) values($1,$2)",
        [id(980000), source],
      );
      await pg.exec("set role authenticated");
      const legacy = await browser.newPage({
        viewport: { width: 390, height: 844 },
      });
      await legacy.goto(
        "http://127.0.0.1:" + server.address().port + "/?entry=" + id(980000),
      );
      await legacy
        .getByText("這是舊版複製型審核草稿", { exact: false })
        .waitFor();
      assert.equal(
        await legacy.getByRole("button", { name: "發布", exact: true }).count(),
        0,
      );
      await legacy.close();
      assert.deepEqual(errors, []);
    } finally {
      await browser?.close();
      if (server) await new Promise((r) => server.close(r));
      await pg.close();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  },
);
