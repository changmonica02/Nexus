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
test("life finance workflows, recurring calendar and responsive screenshots", { timeout: 60000 }, async () => {
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
    const page = await browser.newPage({ viewport: { width: 360, height: 700 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await navigateLife(page, "財務");
    const tab = async name => {
      const parent = { 記帳: "收支", 訂閱: "收支", 帳戶: "資產", 資產負債: "資產", 投資: "資產", 預算: "規劃", 財務目標: "規劃" };
      const child = { 記帳: "交易紀錄", 訂閱: "週期交易", 帳戶: "資金帳戶", 資產負債: "其他資產與負債", 投資: "投資資產" };
      const nav = page.getByRole("navigation", { name: "財務功能" });
      const button = nav.getByRole("button", { name: parent[name] ?? name, exact: true });
      if (await button.getAttribute("aria-pressed") !== "true") await button.click();
      if (parent[name]) await page.getByRole("navigation", { name: parent[name] + "檢視" })
        .getByRole("button", { name: child[name] ?? name, exact: true }).click();
    };
    const enter = async (entry, fill) => {
      const direct = entry === "新增交易" || entry === "新增週期交易";
      await page.getByRole("button",{name:direct ? "＋ 新增" : "新增",exact:true}).first().click();
      if (!direct) await page.locator("[data-life-add-options]").getByRole("button",{name:entry,exact:true}).click();
      const dialog=page.getByRole("dialog",{name:entry,exact:true});
      await fill(dialog);
      await dialog.getByRole("button",{name:"儲存",exact:true}).click();
      await dialog.waitFor({state:"hidden",timeout:6000}).catch(async error=>{
        throw new Error(error.message+"\n"+await dialog.innerText());
      });
    };
    const choose = (dialog,label,value) => dialog.getByLabel(label,{exact:true}).selectOption(value);
    const fill = (dialog,label,value) => dialog.getByLabel(label,{exact:true}).fill(value);
    await tab("帳戶");
    await enter("新增帳戶",async dialog=>{
      await fill(dialog,"名稱","日常帳戶");
      await choose(dialog,"帳戶類型","bank");
      await fill(dialog,"期初餘額（負債請填負數）（TWD）","25000");
    });
    await enter("新增帳戶",async dialog=>{
      await fill(dialog,"名稱","生活信用卡");
      await choose(dialog,"帳戶類型","card");
      await fill(dialog,"信用額度（TWD）","40000");
    });
    await tab("記帳");
    await enter("新增交易", async dialog=>{
      await fill(dialog,"名稱","書籍與文具");
      await dialog.getByLabel("帳戶",{exact:true}).selectOption({label:"生活信用卡 (TWD)"});
      await fill(dialog,"金額（TWD）","850");
      await choose(dialog,"分類","學習");
    });
    await enter("新增交易", async dialog=>{
      await fill(dialog,"名稱","本月專案");
      await choose(dialog,"交易類型","income");
      await dialog.getByLabel("帳戶",{exact:true}).selectOption({label:"日常帳戶 (TWD)"});
      await fill(dialog,"金額（TWD）","12000");
    });
    await tab("預算");
    await enter("新增預算",async dialog=>{
      await fill(dialog,"名稱","月度生活預算");
      await fill(dialog,"預算金額（TWD）","6000");
    });
    await page.getByText(/剩餘.*5150/).waitFor();
    await tab("訂閱");
    await enter("新增週期交易",async dialog=>{
      await fill(dialog,"名稱","閱讀服務");
      await fill(dialog,"每期金額（TWD）","150");
      await dialog.getByLabel("入帳帳戶",{exact:true}).selectOption({label:"日常帳戶 (TWD)"});
      await choose(dialog,"分類","訂閱");
    });
    await tab("資產負債");
    await page.getByRole("button",{name:"新增",exact:true}).first().click();
    await page.locator("[data-life-add-options]").getByRole("button",{name:"新增其他資產",exact:true}).click();
    let dialog=page.getByRole("dialog",{name:"新增資產與負債"});
    await fill(dialog,"名稱","自行車");
    await fill(dialog,"估值（TWD）","4200");
    await dialog.getByRole("button",{name:"儲存",exact:true}).click();
    await dialog.waitFor({state:"hidden"});
    await tab("財務目標");
    await enter("新增財務目標",async dialog=>{
      await fill(dialog,"名稱","旅行基金");
      await fill(dialog,"目標金額（TWD）","40000");
    });
    await page.getByRole("button",{name:"記錄資金異動"}).click();
    dialog=page.getByRole("dialog",{name:"新增資金異動"});
    await fill(dialog,"增加或減少金額（TWD）","7500");
    await dialog.getByRole("button",{name:"儲存",exact:true}).click();
    await dialog.waitFor({state:"hidden"});
    await tab("投資");
    await enter("新增投資標的",async dialog=>{
      await fill(dialog,"名稱","示範指數 ETF");
      await choose(dialog,"類型","etf");
      await fill(dialog,"目前單價（手動估值）（TWD）","125");
    });
    await enter("新增投資交易",async dialog=>{
      await fill(dialog,"名稱","本月定期投入");
      await dialog.getByLabel("投資標的",{exact:true}).selectOption({label:"示範指數 ETF"});
      await fill(dialog,"成交數量（最多六位小數）","10");
      await fill(dialog,"成交單價（TWD）","100");
    });
    await page.getByText(/未實現 TWD 250/).waitFor();

    const out=process.env.FINANCE_SCREENSHOTS;
    if(out){
      fs.mkdirSync(out,{recursive:true});
      for(const [name,label,width,height,dark] of [
        ["overview-desktop","總覽",1440,1240,false],["analysis-desktop","分析",1440,1240,true],["transactions-tablet","記帳",820,1050,true],
        ["accounts-tablet-landscape","帳戶",1080,810,false],["budget-mobile","預算",390,900,false],
        ["subscriptions-mobile","訂閱",390,900,true],["assets-desktop","資產負債",1280,960,false],
        ["goals-tablet","財務目標",820,960,false],["investment-desktop","投資",1280,960,true],
      ]){
        await page.setViewportSize({width,height});
        await page.evaluate(dark=>document.documentElement.classList.toggle("dark",dark),dark);
        await tab(label);
        await page.locator("#life-content").evaluate(node=>{node.scrollTop=0;});
        assert.ok(await page.locator("#life-content").evaluate(node=>node.scrollWidth<=node.clientWidth));
        await page.screenshot({path:path.join(out,"Nexus-Finance-"+name+".png"),animations:"disabled"});
      }
    }
    await tab("總覽");
    await page.getByRole("button", { name: "隱藏金額" }).click();
    assert.equal(await page.getByText(/TWD [0-9]/).count(), 0);
    await tab("分析");
    assert.equal(await page.getByText(/TWD [0-9]/).count(), 0);
    await page.goBack();
    await page.getByRole("heading", { name: "近期交易" }).waitFor();
    await page.getByRole("button", { name: "顯示金額" }).click();
    await navigateLife(page, "日曆");
    await page.getByRole("button",{name:"日檢視",exact:true}).click();
    await page.locator(".life-all-day").getByRole("button",{name:/(預計扣款|待確認) · 閱讀服務/}).waitFor();
    await page.getByRole("button",{name:"週檢視",exact:true}).click();
    await page.locator(".life-all-day").getByRole("button",{name:/(預計扣款|待確認) · 閱讀服務/}).click();
    await page.getByRole("dialog",{name:"編輯週期交易",exact:true}).getByRole("button",{name:"取消",exact:true}).click();
    await tab("訂閱");
    await page.getByRole("button",{name:"確認入帳"}).click();
    await page.getByRole("dialog",{name:"確認入帳"}).getByRole("button",{name:"確認",exact:true}).click();
    await tab("記帳");
    await page.getByRole("button",{name:/閱讀服務/}).waitFor();
    await page.reload();
    await navigateLife(page, "財務");
    await tab("帳戶");
    await page.getByRole("button",{name:/日常帳戶/}).waitFor();
    await navigateLife(page, "日曆");
    await page.getByRole("button",{name:"新增",exact:true}).click();
    await page.getByRole("button",{name:"新增行程",exact:true}).click();
    dialog=page.getByRole("dialog",{name:"新增行程",exact:true});
    await fill(dialog,"名稱","每週回顧");
    await dialog.getByLabel("全天",{exact:true}).check();
    await choose(dialog,"頻率","week");
    await fill(dialog,"重複次數","3");
    await dialog.getByRole("button",{name:"儲存行程"}).click();
    await dialog.waitFor({state:"hidden"});
    await page.getByRole("button",{name:"週檢視",exact:true}).click();
    await page.getByRole("button",{name:"下一期間",exact:true}).click();
    await page.locator(".life-calendar-layout > div").getByRole("button",{name:/每週回顧/}).first().click();
    dialog=page.getByRole("dialog",{name:"編輯行程",exact:true});
    await choose(dialog,"套用範圍","single");
    await fill(dialog,"名稱","單次回顧");
    await dialog.getByRole("button",{name:"儲存行程"}).click();
    await page.locator(".life-all-day").getByRole("button",{name:/單次回顧/}).waitFor();

    await navigateLife(page, "計時工具");
    await page.getByRole("button",{name:"碼錶",exact:true}).click();
    await page.getByRole("button",{name:"開始",exact:true}).click();
    await page.reload();
    await navigateLife(page, "計時工具");
    await page.getByRole("button",{name:"暫停",exact:true}).click();
    await page.getByRole("button",{name:"儲存計時結果",exact:true}).click();
    await page.getByRole("heading",{name:"計時歷史"}).waitFor();
    assert.equal(await page.getByRole("button",{name:"儲存計時結果",exact:true}).count(),0);
    assert.deepEqual(errors,[]);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
