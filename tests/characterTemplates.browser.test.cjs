const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { build } = require("esbuild"),
  { chromium } = require("playwright");
test(
  "private template structure editing autosaves without personal content at desktop/tablet/mobile",
  { timeout: 150000 },
  async () => {
    const root = path.resolve(__dirname, ".."),
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-character-blocks-"));
    await build({
      entryPoints: ["tests/fixtures/characterBlocks.jsx"],
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
        await page.goto(url + "?template");
        await page
          .getByRole("button", { name: "編輯組件 故事", exact: true })
          .click();
        const modal = page.getByRole("dialog", {
          name: "編輯組件",
          exact: true,
        });
        assert.equal(
          await modal
            .getByRole("textbox", { name: "故事 內容", exact: true })
            .count(),
          0,
        );
        await modal
          .getByRole("textbox", { name: "組件名稱", exact: true })
          .fill("故事結構");
        await page.waitForTimeout(900);
        assert.equal(
          await modal.isVisible(),
          true,
          "autosave leaves editing open",
        );
        const saved = await page.evaluate(
          async () =>
            (await window.characterStorage.getPage("character")).character_data,
        );
        assert.equal(saved.isTemplate, true);
        assert.ok(!JSON.stringify(saved).includes("Alice"));
        assert.ok(!JSON.stringify(saved).includes("原故事"));
        assert.ok(!JSON.stringify(saved).includes("不得遺失"));
        assert.equal(
          saved.sections
            .flatMap((b) => b.contents || [])
            .find((c) => c.id === "story").title,
          "故事結構",
        );
        await page.keyboard.press("Escape");
        await modal.waitFor({ state: "detached" });
        await page
          .getByRole("button", { name: "編輯組件 分數", exact: true })
          .click();
        await modal
          .getByRole("textbox", { name: "欄位名稱 1", exact: true })
          .fill("意志");
        await page.waitForTimeout(900);
        assert.equal(
          (await modal.getByRole("spinbutton").count()) <= 2,
          true,
          "no personal numeric values editor",
        );
        await page.evaluate(() => (window.failSave = true));
        await modal
          .getByRole("textbox", { name: "欄位名稱 1", exact: true })
          .fill("新意志");
        await modal.getByRole("alert").waitFor();
        assert.equal(await modal.isVisible(), true);
        await page.evaluate(() => (window.failSave = false));
        await modal
          .getByRole("button", { name: "儲存並返回", exact: true })
          .click();
        await modal.waitFor({ state: "detached" });
        await page.reload();
        await page
          .getByRole("button", { name: "編輯組件 故事結構", exact: true })
          .waitFor();
        await page.goto(url + "?manager");
        await page.getByRole("heading", { name: "私人角色卡模板" }).waitFor();
        await page
          .getByRole("button", { name: "私人模板", exact: true })
          .click();
        const preview = page.getByRole("dialog", { name: "預覽 私人模板" });
        await preview.waitFor();
        assert.equal(
          await preview.getByText("Alice", { exact: true }).count(),
          0,
        );
        await page.keyboard.press("Escape");
        await preview.waitFor({ state: "detached" });
        await page
          .getByRole("button", { name: "使用模板建立角色", exact: true })
          .click();
        assert.equal(
          await page.evaluate(() => window.instances[0].basic.name),
          "",
        );
        await page
          .getByRole("button", { name: "模板操作 私人模板", exact: true })
          .click();
        await page.getByRole("menuitem", { name: "複製", exact: true }).click();
        await page
          .getByRole("button", { name: "私人模板 copy", exact: true })
          .waitFor();
        assert.equal(
          await page
            .getByRole("button", { name: "使用模板建立角色", exact: true })
            .count(),
          2,
        );
        await page.getByRole("button",{name:"模板操作 私人模板 copy",exact:true}).click();
        await page.getByRole("menuitem",{name:"重新命名",exact:true}).click();
        const rename=page.getByRole("dialog",{name:"模板名稱",exact:true});
        await rename.getByRole("textbox").fill("獨立副本");await rename.getByRole("button",{name:"確認",exact:true}).click();
        await page.getByRole("button",{name:"獨立副本",exact:true}).waitFor();
        await page.getByRole("button",{name:"模板操作 獨立副本",exact:true}).click();
        await page.getByRole("menuitem",{name:"刪除",exact:true}).click();
        await page.getByRole("dialog").getByRole("button",{name:"取消",exact:true}).click();
        await page.getByRole("button",{name:"獨立副本",exact:true}).waitFor();
        await page.getByRole("button",{name:"模板操作 獨立副本",exact:true}).click();
        await page.getByRole("menuitem",{name:"刪除",exact:true}).click();
        await page.getByRole("dialog").getByRole("button",{name:"確認",exact:true}).click();
        await page.getByRole("button",{name:"獨立副本",exact:true}).waitFor({state:"detached"});
        assert.equal(await page.getByRole("button",{name:"私人模板",exact:true}).count(),1);
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
