const { navigateLife } = require("./navigation.cjs");
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { build } = require("esbuild"),
  { [process.env.LIFE_BROWSER ?? "chromium"]: chromium } = require("playwright");
const root = path.resolve(__dirname, "../..");
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
    const browser = process.env.LIFE_BROWSER === "webkit" ? null : await chromium.launch({
        executablePath: process.env.LIFE_BROWSER === "webkit" ? undefined : process.env.BROWSER_EXECUTABLE,
        args: process.env.LIFE_BROWSER === "webkit" ? [] : ["--no-sandbox"],
      }),
      errors = [];
    let context;
    try {
      // WebKit's ephemeral data store cannot persist IndexedDB Blobs. Use an
      // isolated persistent profile to exercise actual file storage and reload.
      context = process.env.LIFE_BROWSER === "webkit"
        ? await chromium.launchPersistentContext(path.join(tmp, "profile"), { viewport: { width: 320, height: 640 } })
        : await browser.newContext({ viewport: { width: 320, height: 640 } });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      const open = async () => {
        await navigateLife(page, "我的清單");
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
      await page.waitForFunction(() => [...document.querySelectorAll('dialog input[type="file"]')].every(input => !input.disabled));
      await dialog()
        .getByLabel("照片：上傳", { exact: true })
        .setInputFiles({
          name: "photo.png",
          mimeType: "image/png",
          buffer: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFElEQVR4nGN0a0phwAaYsIoOWgkA7vIBPLLAqOwAAAAASUVORK5CYII=",
            "base64",
          ),
        });
      await page.waitForFunction(async () =>
        (await window.lifeStorage.listAttachments()).some((a) => a.name === "photo.png"),
      );
      await page.waitForFunction(() => [...document.querySelectorAll('dialog input[type="file"]')].every(input => !input.disabled));
      await save();
      await page.getByRole("heading", { name: "Blue polish", exact: true }).waitFor();
      await page.getByText("123.45 TWD", { exact: true }).waitFor();
      const before = await page.evaluate(async () => window.lifeStorage.getLifeRepository().read());
      assert.equal(before.life_items.length, 1);
      assert.equal(before.life_items[0].attachment_ids.length, 2);
      await page.locator('img[alt="photo.png"]').evaluate(image=>image.parentElement.scrollIntoView({block:"center"}));
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
      for (const width of [320, 1280]) {
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
      const screenshot = async (name) => {
        if (!process.env.LIFE_LIST_SCREENSHOTS) return;
        fs.mkdirSync(process.env.LIFE_LIST_SCREENSHOTS,{recursive:true});
        await page.screenshot({path:path.join(process.env.LIFE_LIST_SCREENSHOTS,name+".png"),fullPage:true});
      };
      await screenshot("01-home");
      await page.getByRole("button", { name: "新增清單", exact: true }).click();
      await screenshot("02-templates");
      await dialog().getByRole("combobox", {name:"生活紀錄模板"}).selectOption("消耗品管理");
      await save();
      await page.getByRole("button", { name: "消耗品管理", exact: true }).click();
      await page.getByRole("button", {name:"新增欄位",exact:true}).click();
      await screenshot("03-fields");
      await dialog().getByRole("button",{name:"取消",exact:true}).click();
      await page.getByRole("button", {name:"新增項目",exact:true}).click();
      await name().fill("保濕乳液");
      await save();
      await screenshot("04-list");
      await page.getByRole("button",{name:"表格",exact:true}).click();
      await screenshot("05-table");
      await page.getByRole("button",{name:"卡片",exact:true}).click();
      await screenshot("06-gallery");
      await page.getByRole("button",{name:"看板",exact:true}).click();
      await screenshot("07-board");
      await page.getByRole("button",{name:"庫存詳情",exact:true}).click();
      const detail=page.getByRole("complementary",{name:"物品詳細資料"});
      await detail.getByRole("button",{name:"新增庫存",exact:true}).click();
      await detail.getByLabel("容器數").fill("3");
      await detail.getByLabel("每個容器容量").fill("200");
      await detail.getByLabel("計量單位").fill("mL");
      const utcDay=new Date().toISOString().slice(0,10);
      await detail.getByLabel("保存期限").fill(utcDay);
      await detail.getByRole("button",{name:"確認入庫"}).click();
      await detail.getByText("600 mL",{exact:true}).waitFor();
      await screenshot("08-stock-containers");
      await detail.getByRole("button",{name:"開封",exact:true}).first().click();
      await detail.getByRole("button",{name:"紀錄用量",exact:true}).click();
      await screenshot("09-use");
      await detail.getByRole("spinbutton",{name:"用量",exact:true}).fill("120");
      await detail.getByRole("button",{name:"儲存異動",exact:true}).click();
      await detail.getByText("480 mL",{exact:true}).waitFor();
      await detail.getByText("消耗與異動紀錄").click();
      await detail.getByText(/已使用 120 mL/).waitFor();
      await screenshot("10-history");
      await detail.getByRole("button",{name:"復原末筆異動",exact:true}).click();
      await detail.getByText("600 mL",{exact:true}).waitFor();
      await page.getByRole("button",{name:"返回我的清單",exact:true}).click();
      await page.getByRole("button",{name:/保濕乳液.*到期/}).first().waitFor();
      await screenshot("11-attention");
      await page.getByRole("button",{name:"存放位置",exact:true}).click();
      const positions=page.getByRole("dialog",{name:"共用存放位置"});
      await positions.getByRole("button",{name:"新增位置"}).click();
      await positions.getByRole("textbox",{name:"位置名稱"}).fill("浴室");
      await positions.getByRole("button",{name:"儲存",exact:true}).click();
      await positions.getByText(/浴室/).waitFor();
      await screenshot("12-positions");
      await positions.getByRole("button",{name:"關閉",exact:true}).click();
      await page.getByRole("button",{name:/保濕乳液.*到期/}).first().click();
      await detail.getByRole("heading",{name:"保濕乳液"}).waitFor();
      for (const [width,height] of [[390,844],[768,1024],[1024,768],[1440,900]]) {
        await page.setViewportSize({width,height});
        for(const dark of [false,true]){
          await page.evaluate(dark=>document.documentElement.classList.toggle("dark",dark),dark);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
          if(width===390&&dark)await screenshot("13-phone-dark");
          if(width===1024&&!dark)await screenshot("14-tablet-landscape");
          if(width===1440&&!dark)await screenshot("15-item-details");
        }
      }
      assert.deepEqual(errors, []);
      await context.close();
    } finally {
      await context?.close();
      await browser?.close();
      await new Promise((r) => server.close(r));
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  },
);
