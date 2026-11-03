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
  "life workspace: multiple lists, typed fields, nested categories, attachments, preserved field IDs, offline reload and responsive views",
  { timeout: 120000 },
  async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-life-lists-"));
    await build({
      entryPoints: ["tests/fixtures/lifeLists.jsx"],
      outfile: path.join(tmp, "fixture.js"),
      format: "esm",
      bundle: true,
      jsx: "automatic",
      define: { "process.env": JSON.stringify({ NODE_ENV: "development" }) },
    });
    const css = (
      await require("postcss")([require("@tailwindcss/postcss")({ base: root })]).process(
        fs.readFileSync("src/app/globals.css", "utf8"),
        {
          from: path.join(root, "src/app/globals.css"),
        },
      )
    ).css;
    const server = http.createServer((req, res) => {
      if (req.url === "/fixture.js") {
        res.setHeader("content-type", "application/javascript");
        res.end(fs.readFileSync(path.join(tmp, "fixture.js")));
      } else if (req.url === "/fixture.css") res.end(css);
      else
        res.end(
          '<html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script type="module" src="/fixture.js"></script></html>',
        );
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const browser = await chromium.launch({
        executablePath: process.env.BROWSER_EXECUTABLE,
        args: ["--no-sandbox"],
      }),
      errors = [];
    try {
      const context = await browser.newContext({
          viewport: { width: 320, height: 640 },
        }),
        page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      const open = async () => {
        await page.getByRole("tab", { name: "我的清單", exact: true }).click();
      };
      const dialog = () => page.getByRole("dialog", { name: "清單編輯" });
      const name = () => dialog().getByRole("textbox", { name: "名稱", exact: true });
      const save = async () => {
        await dialog().getByRole("button", { name: "儲存", exact: true }).click();
        await dialog().waitFor({ state: "hidden" });
      };
      await open();
      await page.getByRole("button", { name: "新增清單", exact: true }).click();
      await name().fill("保養品");
      await save();
      await page.getByRole("button", { name: "保養品", exact: true }).click();
      await page.getByRole("button", { name: "新增分類", exact: true }).click();
      await name().fill("化妝品");
      await save();
      await page.getByRole("button", { name: "新增分類", exact: true }).click();
      await name().fill("指甲油");
      const parent = await page.evaluate(
        async () => (await window.lifeStorage.getLifeRepository().read()).life_categories[0].id,
      );
      await dialog().getByRole("combobox", { name: "移至分類" }).selectOption(parent);
      await save();
      await page.getByText("管理分類與欄位", { exact: true }).click();
      await page.getByText("化妝品 → 指甲油", { exact: true }).first().waitFor();
      const types = [
        ["品牌", "text"],
        ["說明", "longtext"],
        ["數量", "number"],
        ["價格", "money"],
        ["日期", "date"],
        ["狀態", "select"],
        ["已購買", "checkbox"],
        ["照片", "image"],
        ["收據", "attachment"],
      ];
      for (const [title, type] of types) {
        await page.getByRole("button", { name: "新增欄位", exact: true }).click();
        await name().fill(title);
        await dialog().getByRole("combobox", { name: "型別", exact: true }).selectOption(type);
        if (type === "select") await dialog().getByRole("textbox", { name: "選項（每行一項）" }).fill("想買\n已買");
        await save();
      }
      await page.getByRole("button", { name: "新增項目", exact: true }).click();
      await name().fill("Blue polish");
      await dialog().getByRole("textbox", { name: "品牌", exact: true }).fill("品牌 A");
      await dialog().getByRole("textbox", { name: "說明", exact: true }).fill("離線長文字");
      await dialog().getByRole("spinbutton", { name: "數量", exact: true }).fill("2.5");
      await dialog().getByRole("textbox", { name: "價格金額" }).fill("123.45");
      await dialog().getByLabel("日期", { exact: true }).fill("2026-11-03");
      await dialog().getByRole("combobox", { name: "狀態", exact: true }).selectOption("想買");
      await dialog().getByRole("checkbox", { name: "已購買", exact: true }).check();
      await dialog()
        .getByLabel("收據：上傳", { exact: true })
        .setInputFiles({
          name: "receipt.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("offline receipt"),
        });
      await page.waitForFunction(async () =>
        (await window.lifeStorage.listAttachments()).some((a) => a.name === "receipt.txt"),
      );
      await dialog()
        .getByLabel("照片：上傳", { exact: true })
        .setInputFiles({
          name: "photo.png",
          mimeType: "image/png",
          buffer: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            "base64",
          ),
        });
      await save();
      await page.getByRole("heading", { name: "Blue polish", exact: true }).waitFor();
      await page.getByText("123.45 TWD", { exact: true }).waitFor();
      const before = await page.evaluate(async () => window.lifeStorage.getLifeRepository().read());
      assert.equal(before.life_items.length, 1);
      assert.equal(before.life_items[0].attachment_ids.length, 2);
      await page.getByRole("img", { name: "photo.png", exact: true }).waitFor();
      await page.waitForFunction(() => {
        const image = document.querySelector('img[alt="photo.png"]');
        return image?.complete && image.naturalWidth > 0;
      });
      await page.getByRole("button", { name: "設定欄位", exact: true }).first().click();
      await name().fill("廠牌");
      await save();
      assert.equal(
        (await page.evaluate(async () => window.lifeStorage.getLifeRepository().read())).life_lists[0].fields[0].id,
        before.life_lists[0].fields[0].id,
      );
      await page.getByText("廠牌：", { exact: true }).waitFor();
      await page.getByRole("button", { name: "設定欄位", exact: true }).first().click();
      await dialog().getByRole("combobox", { name: "型別", exact: true }).selectOption("number");
      await dialog().getByRole("button", { name: "儲存", exact: true }).click();
      await dialog().getByRole("alert").waitFor();
      await dialog().getByRole("combobox", { name: "型別", exact: true }).selectOption("text");
      await save();
      // Adding fields must not make existing items uneditable.
      await page.getByRole("button", { name: "新增欄位", exact: true }).click();
      await name().fill("新增備註");
      await save();
      await page.getByRole("button", { name: "編輯項目", exact: true }).click();
      await name().fill("unsaved");
      await dialog().getByRole("button", { name: "取消", exact: true }).click();
      await page.getByRole("button", { name: "捨棄並離開", exact: true }).click();
      await dialog().waitFor({ state: "hidden" });
      await page.getByRole("heading", { name: "Blue polish", exact: true }).waitFor();
      for (const width of [320, 820, 1280]) {
        await page.setViewportSize({ width, height: 740 });
        await page.getByRole("button", { name: "卡片", exact: true }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.getByRole("button", { name: "清單", exact: true }).click();
      }
      await context.setOffline(true);
      await page.getByRole("button", { name: "編輯項目", exact: true }).click();
      await name().fill("Offline polish");
      await save();
      await context.setOffline(false);
      await page.reload();
      await open();
      await page.getByRole("button", { name: "保養品", exact: true }).click();
      await page.getByRole("heading", { name: "Offline polish", exact: true }).waitFor();
      await page.getByRole("button", { name: "返回我的清單", exact: true }).click();
      await page.getByRole("button", { name: "新增清單", exact: true }).click();
      await name().fill("收藏");
      await save();
      let extra = page.locator("article").filter({ has: page.getByRole("button", { name: "收藏", exact: true }) });
      await extra.getByRole("button", { name: "重新命名", exact: true }).click();
      await name().fill("願望清單");
      await save();
      extra = page.locator("article").filter({ has: page.getByRole("button", { name: "願望清單", exact: true }) });
      await extra.getByRole("button", { name: "刪除", exact: true }).click();
      await page.getByRole("button", { name: "確認", exact: true }).click();
      await page.getByRole("button", { name: "願望清單", exact: true }).waitFor({ state: "hidden" });
      assert.equal(
        (await page.evaluate(async () => window.lifeStorage.getLifeRepository().read())).life_lists.filter(
          (l) => l.deleted_at == null,
        ).length,
        1,
      );
      await page.evaluate(() => window.switchLifeOwner());
      await open();
      assert.equal(await page.getByRole("button", { name: "保養品", exact: true }).count(), 0);
      await page.evaluate(() => window.switchLifeOwner());
      await open();
      await page.getByRole("button", { name: "保養品", exact: true }).waitFor();
      assert.deepEqual(errors, []);
      await context.close();
    } finally {
      await browser.close();
      await new Promise((r) => server.close(r));
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  },
);
