const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { build } = require("esbuild"),
  { chromium } = require("playwright");
test(
  "creation library actual RPC flow: immediate submission, private draft, publish/history/latest download, durable retry and owner isolation at three sizes",
  { timeout: 150000 },
  async () => {
    const root = path.resolve(__dirname, ".."),
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-character-blocks-"));
    await build({
      entryPoints: ["tests/fixtures/creationTemplateLibrary.jsx"],
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
                contents: "export const getSupabase=()=>null;",
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
    const base = require("./fixtures/dictionaryExchangeDatabase.cjs");
    const pg = await base.database();
    await pg.exec("reset role");
    await pg.exec(
      fs.readFileSync(
        "supabase/migrations/20261016040000_creation_template_library.sql",
        "utf8",
      ),
    );
    await pg.exec("set role authenticated");
    let pending = Promise.resolve();
    const server = http.createServer((req, res) => {
      if (req.url === "/api") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          pending = pending
            .catch(() => {})
            .then(async () => {
              try {
                await pg.query(
                  "select set_config('request.jwt.claim.sub',$1,false)",
                  [req.headers["x-test-owner"]],
                );
                const { method, args } = JSON.parse(body);
                let data;
                const rows = async (q, a = []) => (await pg.query(q, a)).rows;
                if (method === "capabilities")
                  data = (
                    await rows("select creation_template_capabilities() v")
                  )[0].v;
                else if (method === "mutate")
                  data = (
                    await rows(
                      "select creation_template_mutate($1,$2::jsonb) v",
                      [args.action, JSON.stringify(args.input)],
                    )
                  )[0].v;
                else if (method === "list") {
                  const all = await rows(
                    "select * from creation_templates where kind=$1 and ($2='mine' and owner_id=auth.uid() or $2<>'mine' and visibility='published') and ($2<>'official' or official) and ($2<>'submitted' or not official) and title ilike $3 order by updated_at desc,id",
                    [args.kind, args.filter, "%" + (args.search || "") + "%"],
                  );
                  data = {
                    items: all.slice((args.page - 1) * 24, args.page * 24),
                    count: all.length,
                  };
                } else if (method === "post")
                  data = (
                    await rows("select * from creation_templates where id=$1", [
                      args.id,
                    ])
                  )[0];
                else if (method === "draft")
                  data =
                    (
                      await rows(
                        "select * from creation_template_drafts where template_id=$1",
                        [args.id],
                      )
                    )[0] ?? null;
                else if (method === "versions")
                  data = await rows(
                    "select * from creation_template_versions where template_id=$1 order by version desc limit 20 offset $2",
                    [args.id, ((args.page || 1) - 1) * 20],
                  );
                else if (method === "reports")
                  data = await rows(
                    "select * from creation_template_reports where not resolved",
                  );
                else throw Error("Unknown fixture request");
                res.setHeader("content-type", "application/json");
                res.end(JSON.stringify(data));
              } catch (e) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: e.message }));
              }
            });
        });
        return;
      }
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
    const browser = await chromium.launch({
      executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    const errors = [];
    try {
      for (const width of [1280, 820, 390]) {
        const context = await browser.newContext({
            viewport: { width, height: 1000 },
            hasTouch: width < 1000,
          }),
          page = await context.newPage();
        page.setDefaultTimeout(12000);
        page.on("pageerror", (e) => {
          errors.push(e.message);
          console.error(e.message);
        });
        const url = "http://127.0.0.1:" + server.address().port;
        await page.goto(url);
        await page
          .getByRole("heading", { name: "創作資源庫 / Creation library" })
          .waitFor();
        await page
          .getByRole("button", { name: "＋投稿模板 / Submit", exact: true })
          .click();
        await page
          .getByRole("textbox", {
            name: "投稿名稱 / Submission title",
            exact: true,
          })
          .fill("公共模板 " + width);
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "確認", exact: true })
          .click();
        await page
          .getByRole("textbox", { name: "作者名稱 / Author name", exact: true })
          .fill("Test Author");
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "確認", exact: true })
          .click();
        await page
          .getByRole("button", { name: "私人結構", exact: true })
          .click();
        await page
          .getByRole("dialog")
          .last()
          .getByRole("button", { name: "確認", exact: true })
          .click();
        const selected = page.getByRole("dialog", {
          name: "模板 公共模板 " + width,
          exact: true,
        });
        await selected.waitFor();
        await selected
          .getByRole("button", {
            name: "編輯私人草稿 / Edit draft",
            exact: true,
          })
          .click();
        await page
          .getByRole("button", { name: "編輯組件 故事", exact: true })
          .click();
        const editor = page.getByRole("dialog", {
          name: "編輯組件",
          exact: true,
        });
        await editor
          .getByRole("textbox", { name: "組件名稱", exact: true })
          .fill("新版故事");
        await page.waitForTimeout(900);
        await page.keyboard.press("Escape");
        await editor.waitFor({ state: "detached" });
        await page
          .getByRole("button", { name: "← 返回創作", exact: true })
          .click();
        await selected.waitFor();
        const post = await page.evaluate(
          async () =>
            (
              await window.libraryApi("list", {
                kind: "character",
                filter: "mine",
                page: 1,
              })
            ).items[0],
        );
        assert.equal(
          post.latest_version,
          1,
          "autosaving draft never publishes",
        );
        const oldVersion = await page.evaluate(
          async (id) => (await window.libraryApi("versions", { id }))[0],
          post.id,
        );
        assert.equal(
          oldVersion.structure.sections[0].contents[0].title,
          "故事",
        );
        assert.ok(!JSON.stringify(oldVersion).includes("PRIVATE STORY"));
        await selected
          .getByRole("button", {
            name: "發布新版 / Publish version",
            exact: true,
          })
          .click();
        await selected
          .getByRole("button", { name: "確認", exact: true })
          .click();
        await selected
          .getByText("v2 · 公共模板 " + width, { exact: true })
          .waitFor();
        await selected
          .getByRole("button", {
            name: "下載／更新最新版 / Download latest",
            exact: true,
          })
          .click();
        await selected
          .getByRole("button", { name: "確認", exact: true })
          .click();
        await page.waitForFunction(() => window.downloads.length === 1);
        const saved = await page.evaluate(
          async () => (await window.libraryStorage.listPages())[0],
        );
        assert.equal(saved.character_data.resourceSource.version, 2);
        assert.equal(
          saved.character_data.sections[0].contents[0].title,
          "新版故事",
        );
        await selected
          .getByRole("button", {
            name: "下載／更新最新版 / Download latest",
            exact: true,
          })
          .click();
        await selected
          .getByRole("button", { name: "確認", exact: true })
          .click();
        await page.waitForFunction(() => window.downloads.length === 2);
        assert.equal(
          await page.evaluate(
            async () => (await window.libraryStorage.listPages()).length,
          ),
          1,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await page.evaluate(() => (window.failDownload = true));
        await selected
          .getByRole("button", {
            name: "下載／更新最新版 / Download latest",
            exact: true,
          })
          .click();
        await selected
          .getByRole("button", { name: "確認", exact: true })
          .click();
        await selected
          .getByRole("alert")
          .filter({ hasText: "Local download failed" })
          .waitFor();
        assert.equal(
          await page.evaluate(
            async () => (await window.libraryStorage.listPages()).length,
          ),
          1,
        );
        await page.evaluate(() => (window.failDownload = false));
        await selected
          .getByRole("button", {
            name: "下載／更新最新版 / Download latest",
            exact: true,
          })
          .click();
        await selected
          .getByRole("button", { name: "確認", exact: true })
          .click();
        await page.waitForFunction(() => window.downloads.length === 3);
        const readerContext = await browser.newContext({
            viewport: { width, height: 1000 },
          }),
          reader = await readerContext.newPage();
        reader.setDefaultTimeout(12000);
        await reader.goto(url + "?reader");
        await reader
          .getByRole("button").filter({has:reader.getByText("公共模板 "+width,{exact:true})})
          .click();
        const readerModal = reader.getByRole("dialog", {
          name: "模板 公共模板 " + width,
          exact: true,
        });
        await readerModal.waitFor();
        assert.equal(
          await readerModal
            .getByRole("button", {
              name: "編輯私人草稿 / Edit draft",
              exact: true,
            })
            .count(),
          0,
        );
        assert.equal(
          await readerModal
            .getByRole("button", {
              name: "管理員下架 / Take down",
              exact: true,
            })
            .count(),
          0,
        );
        await readerModal
          .getByRole("button", {
            name: "下載／更新最新版 / Download latest",
            exact: true,
          })
          .click();
        await readerModal
          .getByRole("button", { name: "確認", exact: true })
          .click();
        await reader.waitForFunction(() => window.downloads.length === 1);
        const readerCopy = await reader.evaluate(
          async () => (await window.libraryStorage.listPages())[0],
        );
        assert.notEqual(readerCopy.id, saved.id);
        assert.notEqual(
          readerCopy.workspace_owner_id,
          saved.workspace_owner_id,
        );
        await reader.goto(url + "?no-cap");
        await reader.getByText(/尚未啟用或目前無法連線/).waitFor();
        assert.equal(
          await reader
            .getByRole("button", { name: "＋投稿模板 / Submit", exact: true })
            .count(),
          0,
        );
        await readerContext.close();
        await context.close();
      }
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      await pg.close();
      await new Promise((r) => server.close(r));
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  },
);
