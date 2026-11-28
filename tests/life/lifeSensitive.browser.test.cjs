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
test("sensitive health and list templates use the existing workspace", { timeout: 60000 }, async () => {
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
    browser = await chromium.launch({ executablePath: process.env.LIFE_BROWSER === "webkit" ? undefined : process.env.BROWSER_EXECUTABLE, args: process.env.LIFE_BROWSER === "webkit" ? [] : ["--no-sandbox"] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, timezoneId: "Asia/Taipei" });
    const errors = [];
    page.setDefaultTimeout(6500);
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await navigateLife(page, "健康管理");
    const nav = name => page.getByRole("navigation",{name:"健康功能"}).getByRole("button",{name,exact:true}).click();
    const enter = async (name, fill) => {
      if(name!=="新增服用紀錄")await page.getByRole("button",{name:"新增",exact:true}).click();
      await page.getByRole("button",{name,exact:true}).first().click();
      const dialog=page.getByRole("dialog",{name,exact:true});
      await fill(dialog);
      await dialog.getByRole("button",{name:"儲存",exact:true}).click();
      await dialog.waitFor({state:"hidden",timeout:5000});
    };
    const output=process.env.NEXUS_LIFE5_SCREENSHOTS;
    const shot=async(name,width,height,dark=false)=>{
      await page.setViewportSize({width,height});
      await page.evaluate(dark=>document.documentElement.classList.toggle("dark",dark),dark);
      if(output){
        fs.mkdirSync(output,{recursive:true});
        await page.screenshot({path:path.join(output,name+".png")});
      }
    };
    await nav("身體");
    await enter("新增經期紀錄",async dialog=>{
      await dialog.getByLabel("經期開始").fill("2026-11-23");
      await dialog.getByLabel("經期結束").fill("2026-11-26");
    });
    await page.getByText(/平均經期 4 天/).waitFor();
    await shot("Nexus-Life5-cycle-desktop",1280,900);
    await nav("照護");
    await enter("新增用藥項目",async dialog=>{
      await dialog.getByLabel("名稱",{exact:true}).fill("測試用保健食品");
      await dialog.getByLabel("單位",{exact:true}).fill("粒");
      await dialog.getByLabel("起始庫存").fill("10");
      await dialog.getByLabel(/預定時間/).fill("08:00, 20:00");
    });
    await enter("新增服用紀錄",async()=>{});
    await page.getByText("剩餘庫存 9 粒",{exact:true}).waitFor();
    await shot("Nexus-Life7-medication-mobile",390,844,true);
    await navigateLife(page, "我的清單");
    await page.getByRole("button",{name:"新增清單",exact:true}).click();
    const dialog=page.getByRole("dialog");
    await dialog.getByLabel("生活紀錄模板").selectOption("日記");
    await dialog.getByLabel("清單封面").selectOption("sage");
    await dialog.getByRole("button",{name:"儲存",exact:true}).click();
    await dialog.waitFor({state:"hidden"});
    await page.getByRole("button",{name:"日記",exact:true}).click();
    await page.getByText("日期檢視與統計",{exact:true}).click();
    await page.getByLabel("設定名稱").fill("每日紀錄");
    await page.getByRole("button",{name:"儲存統計設定"}).click();
    await page.getByRole("option",{name:"每日紀錄",exact:true}).waitFor({state:"attached"});
    await shot("Nexus-Life7-records-tablet",820,1100);
    await navigateLife(page, "總覽");
    await page.getByText(/站內提醒 · /).click();
    await page.getByRole("button",{name:"新增日期提醒規則"}).click();
    await page.getByLabel("提醒名稱").fill("確認生活物品");
    await page.getByRole("button",{name:"儲存規則"}).click();
    await page.getByText(/確認生活物品 · .* 起每/).waitFor();
    await page.getByRole("button",{name:"新增日期提醒規則"}).click();
    await page.getByLabel("提醒名稱").fill("自動安排整理");
    await page.getByLabel("執行動作").selectOption("schedule");
    await page.getByRole("button",{name:"儲存規則"}).click();
    await page.getByText("已建立的自動化行程",{exact:true}).click();
    await page.getByText(/\d{4}-\d{2}-\d{2} · 自動安排整理/).last().waitFor();
    await shot("Nexus-Life7-reminders-desktop",1280,900);
    assert.deepEqual(errors,[]);
  } finally {
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});
