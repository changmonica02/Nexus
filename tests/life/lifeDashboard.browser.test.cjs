const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { build } = require("esbuild"),
  { chromium } = require("playwright");
const root = path.resolve(__dirname, "../..");
test("life overview edits, persists and restores real-data cards across viewport sizes and accounts", { timeout: 60000 }, async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-life-overview-"));
  const script = path.join(tmp, "fixture.js");
  await build({
    entryPoints: ["tests/fixtures/lifeLists.jsx"],
    outfile: script,
    bundle: true,
    format: "esm",
    jsx: "automatic",
    define: { "process.env": JSON.stringify({ NODE_ENV: "development" }) },
  });
  const cssPath = path.join(root, "src/app/globals.css");
  const { css } = await require("postcss")([require("@tailwindcss/postcss")({ base: root })])
    .process(fs.readFileSync(cssPath, "utf8"), { from: cssPath });
  const server = http.createServer((req, res) => {
    if (req.url === "/fixture.js") {
      res.setHeader("content-type", "application/javascript");
      res.end(fs.readFileSync(script));
    } else if (req.url === "/fixture.css") {
      res.setHeader("content-type", "text/css");
      res.end(css);
    } else {
      res.setHeader("content-type", "text/html");
      res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script type="module" src="/fixture.js"></script>');
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ["--no-sandbox"] });
    const page = await browser.newPage({ viewport: { width: 360, height: 700 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole("button", { name: "自訂", exact: true }).waitFor({ timeout: 6000 }).catch(async error => {
      throw new Error(`${error.message}\n${await page.locator("body").innerText()}\n${errors.join("\n")}`);
    });
    await page.evaluate(async () => {
      const storage = window.lifeStorage;
      await storage.createPage({ kind: "todo", title: "繳交報告", due_date: Date.now() });
      const repo = storage.getLifeRepository();
      const base = { workspace_owner_id: storage.getWorkspaceOwner(), revision: 0,
        created_at: Date.now(), updated_at: Date.now(), deleted_at: null, sort_order: 0, schema_version: 1 };
      await repo.save("life_lists", { ...base, id: "study-list", title: "閱讀清單", fields: [] });
      await repo.save("life_items", { ...base, id: "study-item", title: "閱讀第一章", list_id: "study-list",
        category_id: null, values: {}, attachment_ids: [] });
      await window.reloadLifePages();
    });
    const calendar = page.locator("article").filter({ has: page.getByRole("heading", { name: "月曆事項" }) });
    await calendar.getByRole("button", { name: /繳交報告/ }).waitFor();
    const edit = () => page.getByRole("button", { name: "自訂", exact: true }).click();
    const save = () => page.getByRole("button", { name: "儲存配置", exact: true }).click();
    await edit();
    assert.ok(await page.locator("#life-content").evaluate(node => node.scrollWidth <= node.clientWidth));
    await page.getByLabel("起始模板").selectOption("study");
    await page.getByRole("button", { name: "建立配置", exact: true }).click();
    await page.getByLabel("配置名稱").fill("課程與交件");
    await page.getByRole("button", { name: "設為預設" }).click();
    const cards = page.locator("form ol > li");
    await cards.nth(1).getByRole("button", { name: "上移" }).click();
    await cards.first().getByLabel("卡片標題").fill("接下來的行程");
    await cards.first().getByLabel("尺寸").selectOption("large");
    await cards.first().getByLabel("統計期間").selectOption("month");
    await cards.nth(2).getByLabel("資料來源").locator("option", { hasText: "閱讀清單" }).waitFor({ state: "attached" });
    await cards.nth(2).getByLabel("資料來源").selectOption("study-list");
    await page.getByLabel("卡片類型").selectOption("tasks");
    await page.getByRole("button", { name: "新增卡片", exact: true }).click();
    await cards.last().getByLabel("隱藏卡片").check();
    await save();
    const first = page.locator("article").first();
    await first.getByRole("heading", { name: "接下來的行程" }).waitFor();
    assert.equal(await first.getAttribute("data-size"), "large");
    await first.getByRole("checkbox", { name: "完成任務 繳交報告" }).check();
    assert.equal(await page.locator("article").count(), 3);
    await page.locator("article").filter({ has: page.getByRole("heading", { name: "自訂清單" }) }).getByText("閱讀第一章").waitFor();
    await page.reload();
    await first.getByRole("heading", { name: "接下來的行程" }).waitFor();
    assert.equal(await page.getByLabel("使用中的儀表板").locator("option:checked").textContent(), "課程與交件");
    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({ width, height: 750 });
      for (const dark of [false, true]) {
        await page.evaluate(dark => document.documentElement.classList.toggle("dark", dark), dark);
        assert.ok(await page.locator("#life-content").evaluate(node => node.scrollWidth <= node.clientWidth));
        await first.getByRole("heading", { name: "接下來的行程" }).waitFor();
      }
    }
    await edit();
    await page.getByRole("checkbox", { name: "任務", exact: true }).uncheck();
    await save();
    await page.getByRole("tab", { name: "任務", exact: true }).waitFor({ state: "hidden" });
    await page.getByRole("heading", { name: "接下來的行程" }).waitFor({ state: "hidden" });
    await edit();
    await page.getByRole("checkbox", { name: "任務", exact: true }).check();
    await save();
    await first.getByRole("heading", { name: "接下來的行程" }).waitFor();
    await page.evaluate(() => window.switchLifeOwner());
    await page.getByRole("heading", { name: "月曆事項" }).waitFor();
    assert.equal(await page.getByLabel("使用中的儀表板").locator("option").count(), 1);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
