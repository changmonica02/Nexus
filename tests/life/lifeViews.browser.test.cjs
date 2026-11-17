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
  "shared Table v9 views, stable fields, category tree, pagination, device preferences, offline editing and account isolation",
  { timeout: 120000 },
  async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-life-views-"));
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
          viewport: { width: 1280, height: 800 },
        }),
        page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);

      await page.waitForFunction(() => window.lifeStorage);
      await page.evaluate(async () => {
        const storage = window.lifeStorage,
          repo = storage.getLifeRepository(),
          owner = storage.getWorkspaceOwner();
        const base = (id, title) => ({
          id,
          title,
          workspace_owner_id: owner,
          revision: 0,
          created_at: 1,
          updated_at: 1,
          deleted_at: null,
          sort_order: 1,
        });
        const list = {
          ...base("view-list", "Inventory"),
          schema_version: 1,
          fields: [
            { id: "brand", name: "品牌", type: "select", options: ["A", "B"] },
            { id: "count", name: "數量", type: "number" },
            { id: "money", name: "價格", type: "money" },
            { id: "title", name: "備用名稱", type: "text" },
            { id: "old", name: "舊欄位", type: "text", archived: true },
          ],
        };
        await repo.save("life_lists", list);
        await repo.save("life_lists", { ...list, id: "other-list", title: "Other list" });
        for (const [id, title, parent] of [
          ["root", "化妝品", null],
          ["child", "指甲油", "root"],
          ["grand", "藍色", "child"],
          ["other", "工具", null],
        ])
          await repo.save("life_categories", { ...base(id, title), list_id: list.id, parent_id: parent });
        for (let i = 0; i < 64; i++)
          await repo.save("life_items", {
            ...base("item-" + i, "Item " + String(i).padStart(2, "0")),
            list_id: list.id,
            category_id: i < 20 ? "grand" : i < 40 ? "child" : "other",
            schema_version: 1,
            values: {
              brand: i % 2 ? "B" : "A",
              count: i,
              money: { amount: String(64 - i) + ".10", currency: "TWD" },
              title: "Extra " + i,
              old: "retained",
            },
            attachment_ids: [],
          });
      });
      const tab = () => page.getByRole("tab", { name: "我的清單", exact: true });
      await tab().click();
      await page.getByRole("button", { name: "Inventory", exact: true }).click();
      const before = await page.evaluate(async () => ({
        data: await window.lifeStorage.getLifeRepository().read(),
        pending: await window.lifeStorage.getWorkspacePersistence().pending(window.lifeStorage.getWorkspaceOwner()),
      }));
      const view = (name) => page.getByRole("group", { name: "清單檢視" }).getByRole("button", { name, exact: true });
      const rows = () => page.locator("[data-life-item]");
      const ids = () => rows().evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-life-item")));
      await view("清單").waitFor();
      assert.equal(await rows().count(), 50);
      await page.getByRole("button", { name: "下一頁", exact: true }).click();
      assert.equal(await rows().count(), 14);
      await view("表格").click();
      assert.equal(await rows().count(), 14);
      await page.getByRole("button", { name: "上一頁", exact: true }).click();
      await page.getByRole("combobox", { name: "排序欄位", exact: true }).selectOption("field:count");
      let sorted = await ids();
      assert.equal(sorted[0], "item-0");
      await page.getByRole("button", { name: "升冪", exact: true }).click();
      assert.equal((await ids())[0], "item-63");
      await page.getByRole("combobox", { name: "排序欄位", exact: true }).selectOption("field:money");
      await page.getByRole("button", { name: "降冪", exact: true }).click();
      assert.equal((await ids())[0], "item-63");
      await page.getByText("欄位顯示、順序與篩選", { exact: true }).click();
      assert.equal(await page.getByRole("checkbox", { name: "顯示：舊欄位", exact: true }).count(), 0);
      await page.getByRole("checkbox", { name: "顯示：數量", exact: true }).uncheck();
      assert.equal(await page.getByRole("columnheader", { name: /數量/ }).count(), 0);
      await page.getByRole("button", { name: "上移：價格", exact: true }).click();
      assert.deepEqual(
        await page
          .getByRole("columnheader")
          .allTextContents()
          .then((a) => a.map((s) => s.trim().replace(/[↑↓]/g, "").trim())),
        ["名稱", "分類", "品牌", "價格", "備用名稱", "操作"],
      );
      await page.getByRole("combobox", { name: "欄位篩選：品牌", exact: true }).selectOption("A");
      assert.equal(await rows().count(), 32);
      const filteredIds = await ids();
      for (const name of ["清單", "卡片", "分類樹", "表格"]) {
        await view(name).click();
        assert.deepEqual(await ids(), filteredIds);
      }
      await page.getByRole("combobox", { name: "分組欄位", exact: true }).selectOption("field:brand");
      assert.equal(await rows().count(), 32);
      await page.getByRole("button", { name: /A · 32 個項目/ }).waitFor();
      await page.getByRole("combobox", { name: "分組欄位", exact: true }).selectOption("");
      await page.getByRole("button", { name: "清除篩選", exact: true }).click();
      await page.getByRole("combobox", { name: "分組欄位", exact: true }).selectOption("field:brand");
      const groupedFirst = await ids();
      await page.getByRole("button", { name: "下一頁", exact: true }).click();
      const groupedSecond = await ids();
      assert.equal(new Set([...groupedFirst, ...groupedSecond]).size, 64);
      await page.getByRole("combobox", { name: "分組欄位", exact: true }).selectOption("");
      await view("分類樹").click();
      const tree = page.getByRole("navigation", { name: "分類樹", exact: true });
      await tree.getByRole("button", { name: "化妝品", exact: true }).click();
      assert.equal(await rows().count(), 40);
      await tree.getByRole("button", { name: "展開／收合：化妝品", exact: true }).click();
      assert.equal(await tree.getByRole("button", { name: "藍色", exact: true }).count(), 0);
      await tree.getByRole("button", { name: "全部展開", exact: true }).click();
      await tree.getByRole("button", { name: "藍色", exact: true }).click();
      assert.equal(await rows().count(), 20);
      await page.getByRole("searchbox", { name: "搜尋項目", exact: true }).fill("Item 00");
      assert.deepEqual(await ids(), ["item-0"]);
      const unchanged = await page.evaluate(async () => ({
        data: await window.lifeStorage.getLifeRepository().read(),
        pending: await window.lifeStorage.getWorkspacePersistence().pending(window.lifeStorage.getWorkspaceOwner()),
      }));
      assert.deepEqual(unchanged, before);
      // Reuse the original editor, then retain query, view and canonical item ID.
      await context.setOffline(true);
      await rows().getByRole("button", { name: "編輯項目", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "清單編輯", exact: true });
      await dialog.getByRole("combobox", { name: "移至分類", exact: true }).selectOption("other");
      await dialog.getByRole("button", { name: "儲存", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
      assert.equal(await rows().count(), 0);
      await context.setOffline(false);
      await page.reload();
      await tab().click();
      await page.getByRole("button", { name: "Inventory", exact: true }).click();
      assert.equal(await view("分類樹").getAttribute("aria-pressed"), "true");
      assert.equal(await page.getByRole("searchbox", { name: "搜尋項目", exact: true }).inputValue(), "Item 00");
      assert.equal(await page.getByRole("combobox", { name: "篩選分類", exact: true }).inputValue(), "grand");
      await page.getByText("欄位顯示、順序與篩選", { exact: true }).click();
      await page.getByRole("button", { name: "清除篩選", exact: true }).click();
      await view("表格").click();
      assert.equal(await page.getByRole("columnheader", { name: /數量/ }).count(), 0);
      for (const width of [320, 820, 1280]) {
        await page.setViewportSize({ width, height: 740 });
        for (const name of ["清單", "卡片", "表格", "分類樹"]) {
          await view(name).click();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
      }
      await view("表格").click();
      await page.getByRole("button", { name: "下一頁", exact: true }).click();
      const finalIds = await ids();
      await page.getByRole("button", { name: "返回我的清單", exact: true }).click();
      await page.getByRole("button", { name: "Other list", exact: true }).click();
      assert.equal(await view("清單").getAttribute("aria-pressed"), "true");
      await page.getByRole("button", { name: "返回我的清單", exact: true }).click();
      await page.getByRole("button", { name: "Inventory", exact: true }).click();
      assert.equal(await view("表格").getAttribute("aria-pressed"), "true");
      assert.deepEqual(await ids(), finalIds);
      const after = await page.evaluate(async () => ({
        data: await window.lifeStorage.getLifeRepository().read(),
        pending: await window.lifeStorage.getWorkspacePersistence().pending(window.lifeStorage.getWorkspaceOwner()),
      }));
      assert.equal(after.data.life_items.length, 64);
      assert.equal(after.data.life_items.find((i) => i.id === "item-0").category_id, "other");
      assert.equal(after.pending.length, before.pending.length + 1);
      await page.evaluate(() => window.switchLifeOwner());
      await tab().click();
      assert.equal(await page.getByRole("button", { name: "Inventory", exact: true }).count(), 0);
      await page.evaluate(() => window.switchLifeOwner());
      await tab().click();
      await page.getByRole("button", { name: "Inventory", exact: true }).click();
      assert.equal(await view("表格").getAttribute("aria-pressed"), "true");
      // Archived field preferences cannot silently trap the view in an empty filter/group/sort.
      await page.evaluate(() => {
        const key = "nexus-life-view:" + JSON.stringify([window.lifeStorage.getWorkspaceOwner(), "view-list"]);
        const p = JSON.parse(localStorage.getItem(key));
        p.sorting = [{ id: "field:old", desc: true }];
        p.filters = { "field:old": "never" };
        p.group = "field:old";
        localStorage.setItem(key, JSON.stringify(p));
        window.dispatchEvent(new Event("nexus-view-changed"));
      });
      assert.ok((await rows().count()) > 0);
      assert.equal(await page.getByRole("combobox", { name: "排序欄位", exact: true }).inputValue(), "title");
      await page.getByRole("button", { name: "升冪", exact: true }).click();
      assert.equal(
        await page.getByRole("columnheader", { name: "名稱 ↓", exact: true }).getAttribute("aria-sort"),
        "descending",
      );
      // Storage quota/permission failures must not freeze controls with old saved values.
      await page.evaluate(() => {
        window.originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = () => {
          throw new DOMException("full", "QuotaExceededError");
        };
      });
      await page.getByRole("searchbox", { name: "搜尋項目", exact: true }).fill("Item 63");
      assert.deepEqual(await ids(), ["item-63"]);
      await page.evaluate(() => {
        Storage.prototype.setItem = window.originalSetItem;
      });
      await page.getByRole("searchbox", { name: "搜尋項目", exact: true }).fill("");
      assert.deepEqual(errors, []);
      await context.close();
    } finally {
      await browser.close();
      await new Promise((r) => server.close(r));
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  },
);
