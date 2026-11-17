const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { build } = require("esbuild"),
  { chromium } = require("playwright");
test(
  "character blocks actual UI: preview, legacy preservation, durable modal failure/retry, move/resize, basic five fields, tabs and reload at desktop/tablet/mobile",
  { timeout: 150000 },
  async () => {
    const root = path.resolve(__dirname, ".."),
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-character-blocks-"));
    await build({
      entryPoints: ["tests/fixtures/characterBlocks.jsx"],
      outfile: path.join(tmp, "fixture.js"),
      bundle: true,
      loader: { ".woff": "dataurl", ".woff2": "dataurl", ".ttf": "dataurl" },
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
        page.on("pageerror", (e) => {
          errors.push(e.message);
          console.error(e.message);
        });
        const url = "http://127.0.0.1:" + server.address().port;
        await page.goto(url);
        await page
          .getByRole("button", { name: "編輯組件 故事", exact: true })
          .waitFor();
        assert.equal(
          await page
            .getByRole("button", { name: /編輯表單|檢視表單|兩欄檢視/ })
            .count(),
          0,
        );
        assert.equal(
          await page.getByText("原故事", { exact: true }).isVisible(),
          true,
        );
        assert.equal(await page.locator("[data-character-basic]").count(), 1);
        assert.equal(
          await page.locator("[data-character-basic] input").count(),
          0,
        );
        await page
          .getByRole("button", { name: "編輯組件 故事", exact: true })
          .click();
        const modal = page.getByRole("dialog", {
          name: "編輯組件",
          exact: true,
        });
        await modal
          .getByRole("textbox", { name: "故事 內容", exact: true })
          .fill("修改後的故事");
        await page.evaluate(() => (window.failSave = true));
        await modal
          .getByRole("button", { name: "儲存並返回", exact: true })
          .click();
        await modal
          .getByRole("alert")
          .filter({ hasText: "fixture storage failed" })
          .waitFor();
        assert.equal(await modal.isVisible(), true);
        assert.equal(
          await page.evaluate(
            async () =>
              (await window.characterStorage.getPage("character"))
                .character_data.sections[0].richText,
          ),
          "原故事",
        );
        await page.evaluate(() => (window.failSave = false));
        await modal
          .getByRole("button", { name: "儲存並返回", exact: true })
          .click();
        await modal.waitFor({ state: "detached" });
        await page.getByText("修改後的故事", { exact: true }).waitFor();
        const saved = await page.evaluate(
          async () => await window.characterStorage.getPage("character"),
        );
        assert.equal(
          saved.character_data.legacyCharacterSnapshot.sections[0].richText,
          "原故事",
        );
        assert.deepEqual(saved.attachment_ids, ["old-photo"]);
        await page
          .getByRole("button", { name: "編輯組件 故事", exact: true })
          .click();
        await modal.getByLabel("移動至區塊").selectOption("group-empty");
        await modal.getByLabel("組件寬度", { exact: true }).fill("8");
        await modal.getByLabel("組件高度", { exact: true }).fill("260");
        await modal
          .getByRole("button", { name: "儲存並返回", exact: true })
          .click();
        await modal.waitFor({ state: "detached" });
        const block = page.locator('[data-character-block="group-empty"]');
        assert.equal(
          await block.locator('[data-character-component="story"]').count(),
          1,
        );
        assert.equal(
          await page
            .locator(
              '[data-character-block="block:story"] [data-character-component]',
            )
            .count(),
          0,
          "empty source remains",
        );
        const font = await block
          .locator('[data-character-component="story"]')
          .evaluate((e) => getComputedStyle(e).fontSize);
        await page
          .getByRole("button", { name: "調整尺寸 故事", exact: true })
          .scrollIntoViewIfNeeded();
        const handle = await page
          .getByRole("button", { name: "調整尺寸 故事", exact: true })
          .boundingBox();
        await page.mouse.move(
          handle.x + handle.width / 2,
          handle.y + handle.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(
          handle.x + handle.width / 2 + 45,
          handle.y + handle.height / 2 + 40,
          { steps: 4 },
        );
        await page.mouse.up();
        await page.waitForTimeout(100);
        assert.equal(
          await block
            .locator('[data-character-component="story"]')
            .evaluate((e) => getComputedStyle(e).fontSize),
          font,
        );
        if (width >= 820) {
          const source = page.locator('[data-character-component="story"]');
          const target = page.locator('[data-character-block="group-other"] > header');
          await target.scrollIntoViewIfNeeded();
          const a = await source.boundingBox(), b = await target.boundingBox();
          await source.dispatchEvent("pointerdown", {pointerId: 77, pointerType: "touch", button: 0, clientX:a.x+20,clientY:a.y+20});
          await page.waitForTimeout(340);
          await page.evaluate(({x,y}) => window.dispatchEvent(new PointerEvent("pointermove", {pointerId:77,pointerType:"touch",clientX:x,clientY:y,bubbles:true})), {x:b.x+30,y:b.y+b.height/2});
          await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointerup", {pointerId:77,pointerType:"touch",bubbles:true})));
          await page.locator('[data-character-block="group-other"] [data-character-component="story"]').waitFor();
          await page.getByRole("button", {name:"編輯組件 故事",exact:true}).waitFor();
          await page.waitForFunction(() => !document.querySelector('[aria-label="刪除區塊 能力"]').disabled);
          const heading = page.locator('[data-character-block="group-other"] > header');
          await heading.dispatchEvent("pointerdown", {pointerId:78,pointerType:"touch",button:0,clientX:10,clientY:10});
          await page.waitForTimeout(340);
          assert.equal(await page.locator('[data-character-component]:visible').count(),0,"block sorting collapses all component bodies");
          await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointercancel", {pointerId:78,bubbles:true})));
          await page.getByText("修改後的故事", {exact:true}).waitFor();
        }
        await page
          .getByRole("button", { name: "編輯角色基本資料", exact: true })
          .click();
        const basic = page.getByRole("dialog", {
          name: "編輯角色基本資料",
          exact: true,
        });
        assert.equal(await basic.getByRole("textbox").count(), 5);
        await basic.getByLabel("種族", { exact: true }).fill("精靈");
        await page.keyboard.press("Escape");
        await basic.waitFor({ state: "detached" });
        await page.getByText("精靈", { exact: true }).waitFor();
        await page
          .getByRole("button", { name: "舊補充頁", exact: true })
          .click();
        await page.getByText("保留分頁內容", { exact: true }).waitFor();
        await page.getByRole("button", { name: "基本頁", exact: true }).click();
        await page.reload();
        await page.getByText("修改後的故事", { exact: true }).waitFor();
        assert.equal(
          await page.locator('[data-character-component="story"]').count(),
          1,
        );
        assert.equal(await page.locator("[data-character-basic]").count(), 1);
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

