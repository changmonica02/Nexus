const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { build } = require("esbuild"),
  { chromium } = require("playwright");
test(
  "actual Dashboard at 320/mobile/iPad portrait/landscape/desktop: compact controls, collapsed grouping, selection, search, sort persistence and English",
  { timeout: 120000 },
  async () => {
    const root = path.resolve(__dirname, ".."),
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-dashboard-"));
    await build({
      entryPoints: ["tests/fixtures/dashboard.jsx"],
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
      for (const width of [320, 390, 768, 820, 1180, 1440]) {
        const context = await browser.newContext({
            viewport: { width, height: 1000 },
            hasTouch: width < 1440,
          }),
          page = await context.newPage();
        page.on("pageerror", (e) => errors.push(e.message));
        const url = "http://127.0.0.1:" + server.address().port;
        await page.goto(url);
        const grouping = page.getByRole("combobox", { name: "分類方式" }),
          selection = page.getByRole("button", {
            name: "選取檔案",
            exact: true,
          });
        await grouping.waitFor();
        assert.equal(await grouping.inputValue(), "none");
        assert.equal(
          await page.getByText("快速建立", { exact: true }).count(),
          0,
        );
        assert.equal(
          await page
            .getByRole("button", { name: /新建|匯入 PDF|重新整理/ })
            .count(),
          0,
        );
        assert.equal(
          await page.getByText("最近編輯", { exact: true }).count(),
          1,
          "sort trigger is retained",
        );
        assert.equal(await page.locator("[data-dashboard-group]").count(), 0);
        assert.equal(
          await page.getByRole("button", { name: /^筆記A/ }).count(),
          1,
        );
        const a = await grouping.boundingBox(),
          b = await selection.boundingBox();
        assert.ok(
          Math.abs(a.y + a.height / 2 - b.y - b.height / 2) < 2,
          "left controls stay on same row",
        );
        assert.ok(b.x + b.width <= width, "selection is fully reachable");
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        if (width >= 768) {
          const sort = await page
            .getByRole("button", { name: "排序", exact: true })
            .boundingBox();
          assert.ok(
            Math.abs(sort.y + sort.height / 2 - a.y - a.height / 2) < 2,
            "wide toolbar is one row",
          );
        }
        await selection.click();
        await page
          .getByRole("checkbox", { name: "選取 筆記A", exact: true })
          .check();
        await grouping.selectOption("folder");
        assert.equal(
          await page.locator("[data-dashboard-group][open]").count(),
          0,
        );
        const alpha = page
          .locator("[data-dashboard-group]")
          .filter({
            has: page.locator("summary").filter({ hasText: "Alpha" }),
          });
        const beta = page
          .locator("[data-dashboard-group]")
          .filter({ has: page.locator("summary").filter({ hasText: "Beta" }) });
        await alpha.locator("summary").click();
        assert.equal(
          await alpha
            .getByRole("checkbox", { name: "選取 筆記A", exact: true })
            .isChecked(),
          true,
        );
        assert.equal(await beta.getAttribute("open"), null);
        await beta.locator("summary").click();
        assert.equal(await alpha.getAttribute("open"), "");
        await grouping.selectOption("feature");
        assert.equal(
          await page.locator("[data-dashboard-group][open]").count(),
          0,
        );
        const tools = page
          .locator("[data-dashboard-group]")
          .filter({ has: page.locator("summary").filter({ hasText: "工具" }) });
        await tools.locator("summary").click();
        assert.equal(await tools.getByRole("checkbox").count(), 2);
        await tools.locator("summary").click();
        await grouping.selectOption("none");
        await page.getByRole("textbox", { name: "搜尋項目" }).fill("筆記");
        assert.equal(await page.getByRole("checkbox").count(), 1);
        await page.getByRole("textbox", { name: "搜尋項目" }).fill("");
        assert.equal(await page.getByRole("checkbox").count(), 6);
        assert.equal(
          await page
            .getByRole("checkbox", { name: "選取 筆記A", exact: true })
            .isChecked(),
          true,
        );
        await page.getByRole("button", { name: "完成", exact: true }).click();
        await page
          .getByRole("button", { name: "卡片預覽", exact: true })
          .click();
        await page.getByRole("button", { name: "排序", exact: true }).click();
        const menu = page.getByRole("dialog", { name: "排序", exact: true });
        assert.equal(await menu.getByRole("menuitemradio").count(), 2);
        const recent = menu.getByRole("menuitemradio", { name: /最近編輯/ });
        await recent.click();
        assert.equal(await menu.isVisible(), true);
        await recent.click();
        assert.equal(await menu.isVisible(), true);
        await page.keyboard.press("Escape");
        await grouping.selectOption("feature");
        await page.reload();
        assert.equal(
          await page.getByRole("combobox", { name: "分類方式" }).inputValue(),
          "feature",
        );
        assert.equal(
          await page
            .getByRole("button", { name: "卡片預覽", exact: true })
            .getAttribute("aria-pressed"),
          "true",
        );
        assert.equal(
          await page.locator("[data-dashboard-group][open]").count(),
          0,
        );
        await page
          .getByRole("combobox", { name: "分類方式" })
          .selectOption("none");
        await page.getByRole("button", { name: "列表", exact: true }).click();
        await page
          .getByRole("button", { name: "更多操作 筆記A", exact: true })
          .click();
        await page.getByRole("menuitem", { name: "複製", exact: true }).click();
        await page.waitForFunction(() =>
          window.actions.some((x) => x[0] === "copy" && x[1] === "0"),
        );
        assert.equal(
          await page.evaluate(
            () => window.actions.filter((x) => x[0] === "open").length,
          ),
          0,
        );
        await page.goto(url + "/?en");
        await page.getByRole("combobox", { name: "Group items" }).waitFor();
        await page
          .getByRole("button", { name: "Select files", exact: true })
          .click();
        assert.equal(
          await page.getByRole("checkbox", { name: /Select / }).count(),
          6,
        );
        assert.doesNotMatch(
          await page.locator("body").innerText(),
          /dashboard\./,
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
