const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { build } = require("esbuild"),
  { chromium } = require("playwright");
test(
  "same-source update actual UI: confirmation, source conflict, atomic failure/retry, retained content, restore and reload at three sizes",
  { timeout: 150000 },
  async () => {
    const root = path.resolve(__dirname, ".."),
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-character-blocks-"));
    await build({
      entryPoints: ["tests/fixtures/characterTemplateUpdate.jsx"],
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
        page.setDefaultTimeout(8000);
        page.on("pageerror", (e) => {
          errors.push(e.message);
          console.error(e.message);
        });
        const url = "http://127.0.0.1:" + server.address().port;
        await page.goto(url);
        await page.getByText("私人故事", { exact: true }).waitFor();
        const original = await page.evaluate(
          async () => await window.templateStorage.getPage("role"),
        );
        await page
          .getByRole("button", {
            name: "模板更新／還原 / Template updates",
            exact: true,
          })
          .click();
        const modal = page.getByRole("dialog", {
          name: "同來源模板更新 / Same-source update",
          exact: true,
        });
        await modal
          .getByText("來源 / Source: 來源模板", { exact: true })
          .waitFor();
        await page.evaluate(() => window.mutateSource());
        await modal
          .getByRole("button", {
            name: "確認套用新版 / Apply update",
            exact: true,
          })
          .click();
        await page
          .getByRole("dialog", { name: "確認操作", exact: true })
          .getByRole("button", { name: "確認", exact: true })
          .click();
        await modal
          .getByRole("alert")
          .filter({ hasText: "Revision conflict" })
          .waitFor();
        assert.deepEqual(
          await page.evaluate(
            async () => await window.templateStorage.getPage("role"),
          ),
          original,
        );
        await modal
          .getByRole("button", {
            name: "重新比對 / Compare again",
            exact: true,
          })
          .click();
        await modal
          .getByRole("button", {
            name: "確認套用新版 / Apply update",
            exact: true,
          })
          .waitFor();
        await page.evaluate(() => (window.failUpdate = true));
        await modal
          .getByRole("button", {
            name: "確認套用新版 / Apply update",
            exact: true,
          })
          .click();
        await page
          .getByRole("dialog", { name: "確認操作", exact: true })
          .getByRole("button", { name: "確認", exact: true })
          .click();
        await modal
          .getByRole("alert")
          .filter({ hasText: "injected update failure" })
          .waitFor();
        assert.deepEqual(
          await page.evaluate(
            async () => await window.templateStorage.getPage("role"),
          ),
          original,
        );
        await page.evaluate(() => (window.failUpdate = false));
        await modal
          .getByRole("button", {
            name: "確認套用新版 / Apply update",
            exact: true,
          })
          .click();
        await page
          .getByRole("dialog", { name: "確認操作", exact: true })
          .getByRole("button", { name: "確認", exact: true })
          .click();
        await modal.waitFor({ state: "detached" });
        await page
          .getByRole("heading", { name: "更新背景", exact: true })
          .waitFor();
        await page.getByText("私人故事", { exact: true }).waitFor();
        await page.getByText("不可丟失", { exact: true }).waitFor();
        await page
          .getByRole("heading", { name: "保留內容", exact: true })
          .waitFor();
        assert.equal(
          await page
            .getByRole("button", { name: "編輯組件 新空白", exact: true })
            .count(),
          1,
        );
        const updated = await page.evaluate(
          async () => await window.templateStorage.getPage("role"),
        );
        assert.equal(updated.character_data.templateUpdateSnapshots.length, 1);
        assert.deepEqual(updated.attachment_ids, ["private-photo"]);
        await page.reload();
        await page
          .getByRole("heading", { name: "更新背景", exact: true })
          .waitFor();
        await page
          .getByRole("button", {
            name: "模板更新／還原 / Template updates",
            exact: true,
          })
          .click();
        await modal
          .getByText("已是目前模板版本 / Up to date", { exact: true })
          .waitFor();
        await modal
          .getByRole("button", { name: "還原 / Restore", exact: true })
          .click();
        await page
          .getByRole("dialog", { name: "確認操作", exact: true })
          .getByRole("button", { name: "取消", exact: true })
          .click();
        assert.equal(await modal.isVisible(), true);
        await modal
          .getByRole("button", { name: "還原 / Restore", exact: true })
          .click();
        await page
          .getByRole("dialog", { name: "確認操作", exact: true })
          .getByRole("button", { name: "確認", exact: true })
          .click();
        await modal.waitFor({ state: "detached" });
        await page
          .getByRole("heading", { name: "背景", exact: true })
          .waitFor();
        await page.getByText("不可丟失", { exact: true }).waitFor();
        assert.equal(
          await page
            .getByRole("heading", { name: "保留內容", exact: true })
            .count(),
          0,
        );
        const restored = await page.evaluate(
          async () => await window.templateStorage.getPage("role"),
        );
        assert.deepEqual(
          restored.character_data.sections,
          original.character_data.sections,
        );
        assert.equal(restored.character_data.templateUpdateSnapshots.length, 2);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
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
