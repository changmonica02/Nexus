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
test("health records persist and calendar sharing is opt-in", { timeout: 60000 }, async () => {
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
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await navigateLife(page, "健康管理");
    const nav = name => page.getByRole("navigation",{name:"健康功能"}).getByRole("button",{name,exact:true}).click();
    const enter = async (name, fill) => {
      const direct=page.getByRole("button",{name,exact:true});
      if(!await direct.count())await page.getByRole("button",{name:"新增",exact:true}).click();
      await direct.click();
      const dialog = page.getByRole("dialog",{name,exact:true});
      await fill(dialog);
      await dialog.getByRole("button",{name:"儲存",exact:true}).click();
      await dialog.waitFor({state:"hidden",timeout:5000}).catch(async error=>{
        throw new Error(error.message+"\n"+await dialog.innerText());
      });
    };
    await enter("新增身體數據",async dialog=>{
      await dialog.getByLabel("身高（cm）").fill("170");
      await dialog.getByLabel("體重（kg）").fill("65");
    });
    await enter("新增飲水",async dialog=>dialog.getByLabel("容量（ml）").fill("500"));
    await enter("新增睡眠",async()=>{});
    await nav("活動與休息");
    await page.getByRole("button",{name:"新增",exact:true}).click();
    await page.getByRole("button",{name:"安排運動任務",exact:true}).click();
    await page.getByRole("dialog",{name:"新增任務",exact:true}).getByRole("button",{name:"取消",exact:true}).click();
    await page.evaluate(async()=>{
      const date = new Date();
      const day = [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
      const now = Date.now(), owner = window.lifeStorage.getWorkspaceOwner();
      await window.lifeStorage.getLifeRepository().saveHealth({id:"legacy-walk",kind:"plan",workspace_owner_id:owner,
        revision:0,created_at:now,updated_at:now,deleted_at:null,data:{title:"傍晚散步",date:day,time:"18:00",minutes:30}});
    });
    await page.reload();
    await navigateLife(page, "健康管理");
    await page.getByText("65 kg",{exact:true}).waitFor();
    await page.getByText("500 mL",{exact:true}).first().waitFor();
    await page.getByText("8 小時",{exact:true}).first().waitFor();
    const date = page.getByLabel("紀錄日期");
    const original = await date.inputValue();
    await page.getByRole("button",{name:"前一天",exact:true}).click();
    assert.notEqual(await date.inputValue(),original);
    await page.getByRole("button",{name:"今天",exact:true}).click();
    assert.equal(await date.inputValue(),original);
    const screenshots=process.env.NEXUS_HEALTH_SCREENSHOTS;
    const shot=async name=>{
      if(!screenshots)return;
      fs.mkdirSync(screenshots,{recursive:true});
      await page.screenshot({path:path.join(screenshots,`Nexus-Health-${name}.png`)});
    };
    assert.equal(await page.getByText("＋自訂",{exact:true}).count(),2);
    assert.equal(await page.getByRole("heading",{name:"健康事項",exact:true}).count(),0);
    assert.equal(await page.getByRole("heading",{name:"當日健康摘要",exact:true}).count(),0);
    await shot("water-empty");
    for(const [slot,amount] of [[1,250],[2,600]]){
      await page.getByRole("button",{name:"設定飲水快捷 "+slot,exact:true}).click();
      const shortcut=page.getByRole("dialog",{name:"飲水快捷容量",exact:true});
      await shortcut.getByRole("spinbutton").fill(String(amount));
      await shortcut.getByRole("button",{name:"儲存",exact:true}).click();
      await shortcut.waitFor({state:"hidden"});
    }
    await page.getByRole("button",{name:"記錄 250 mL",exact:true}).click();
    await page.getByText("750 mL",{exact:true}).waitFor();
    await page.getByRole("button",{name:"復原",exact:true}).click();
    await page.getByRole("button",{name:"復原",exact:true}).waitFor({state:"hidden"});
    await page.getByText("500 mL",{exact:true}).first().waitFor();
    await page.reload();
    await navigateLife(page,"健康管理");
    await page.getByRole("button",{name:"記錄 600 mL",exact:true}).waitFor();
    await shot("water-configured");
    await page.getByRole("button",{name:"管理飲水",exact:true}).click();
    const manager=page.getByRole("dialog",{name:"飲水管理",exact:true});
    await manager.waitFor();
    await shot("water-management");
    await manager.getByRole("button",{name:"飲水",exact:true}).click();
    const historical=page.getByRole("dialog",{name:"編輯飲水",exact:true});
    await historical.waitFor();
    await shot("water-history");
    await historical.getByLabel("容量（ml）").fill("550");
    await historical.getByRole("button",{name:"儲存",exact:true}).click();
    await manager.getByText(/550 mL/).waitFor();
    await manager.getByRole("button",{name:/修改快捷 2/}).click();
    const clear=page.getByRole("dialog",{name:"飲水快捷容量",exact:true});
    await clear.getByRole("spinbutton").fill("");
    await clear.getByRole("button",{name:"儲存",exact:true}).click();
    await manager.getByRole("button",{name:"關閉",exact:true}).click();
    await page.getByRole("button",{name:"設定飲水快捷 2",exact:true}).waitFor();
    assert.deepEqual(await page.getByRole("navigation",{name:"健康功能"}).getByRole("button").allTextContents(),
      ["總覽","身體","飲食","活動與休息","照護","分析"]);
    await nav("分析");
    await page.getByRole("combobox",{name:"統計期間"}).selectOption("90");
    await page.getByLabel("趨勢指標").selectOption("sleep");
    await page.getByText("檢視每日數值",{exact:true}).click();
    assert.equal(await page.getByText(/ · 8$/).count(),1);
    await page.getByRole("combobox",{name:"統計期間"}).selectOption("0");
    await page.getByLabel("開始日期",{exact:true}).fill(original);
    await page.getByLabel("結束日期",{exact:true}).fill(original);
    await page.getByText("8 小時",{exact:true}).first().waitFor();
    await nav("飲食");
    await enter("新增常用食品",async dialog=>{
      await dialog.getByLabel("名稱",{exact:true}).fill("燕麥豆漿");
      await dialog.getByLabel("熱量（kcal）",{exact:true}).fill("120");
    });
    await enter("新增飲食",async dialog=>{
      await dialog.getByLabel("名稱",{exact:true}).fill("今日早餐");
      await dialog.getByLabel("常用食品",{exact:true}).selectOption({label:"燕麥豆漿"});
      await dialog.getByRole("button",{name:"加入食品",exact:true}).click();
    });
    await page.getByRole("button",{name:"複製餐點",exact:true}).click();
    const copied=page.getByRole("dialog",{name:"新增飲食",exact:true});
    await copied.getByText(/燕麥豆漿/).first().waitFor();
    await copied.getByRole("button",{name:"取消",exact:true}).click();
    await nav("照護");
    await enter("新增用藥項目",async dialog=>{
      await dialog.getByLabel("名稱",{exact:true}).fill("測試照護計畫");
      await dialog.getByLabel("單位",{exact:true}).fill("份");
      await dialog.getByLabel(/預定時間/).fill("08:00,20:00");
    });
    await page.getByRole("button",{name:"照護計畫",exact:true}).click();
    await page.getByRole("button",{name:"暫停計畫",exact:true}).click();
    await page.getByRole("button",{name:"確認",exact:true}).click();
    await page.getByRole("button",{name:"恢復計畫",exact:true}).click();
    await page.getByRole("button",{name:"確認",exact:true}).click();
    await page.getByRole("button",{name:"暫停計畫",exact:true}).waitFor();
    await page.getByRole("button",{name:"所選日照護",exact:true}).click();
    await nav("總覽");
    if(screenshots){
      fs.mkdirSync(screenshots,{recursive:true});
      for(const [label,width,height,theme] of [["desktop",1280,900,"light"],["tablet-portrait",820,1100,"light"],["tablet-landscape",1180,820,"light"],["mobile",390,844,"dark"]]){
        await page.setViewportSize({width,height});
        const header = page.locator("[data-workspace-header]");
        for(const color of [theme==="dark"?"light":"dark",theme]){
          await page.emulateMedia({colorScheme:color});
          await page.evaluate(dark=>document.documentElement.classList.toggle("dark",dark),color==="dark");
          if(width<960){
            assert.equal(await page.locator(".life-navigation").isVisible(),false);
            await header.getByRole("button",{name:"切換生活分頁"}).click();
            await header.getByRole("tab",{name:"健康管理"}).click();
          }
          assert.equal(await header.getByRole("heading",{level:1}).innerText().then(value=>value.replace(/\s/g,"")),"生活健康管理");
          assert.ok(await page.locator("#life-content").evaluate(node=>node.scrollWidth<=node.clientWidth));
        }
        await page.screenshot({path:path.join(screenshots,`Nexus-Health-${label}.png`)});
      }
      for(const [label,section] of [["body","身體"],["food","飲食"],["activity","活動與休息"],["care","照護"],["analysis","分析"]]){
        await nav(section);
        if(section==="分析")await page.getByRole("combobox",{name:"統計期間"}).selectOption("7");
        await page.locator("#life-content").evaluate(node=>{node.scrollTop=0;});
        await page.screenshot({path:path.join(screenshots,`Nexus-Health-${label}-mobile.png`)});
      }
      await nav("照護");
      await page.getByRole("button",{name:"新增服用紀錄",exact:true}).first().click();
      const dose=page.getByRole("dialog",{name:"新增服用紀錄",exact:true});
      await dose.waitFor();
      await page.screenshot({path:path.join(screenshots,"Nexus-Health-dose-editor-mobile.png")});
      await dose.getByRole("button",{name:"取消",exact:true}).click();
      await nav("飲食");
      await page.getByRole("button",{name:"新增飲水",exact:true}).click();
      const waterDialog=page.getByRole("dialog",{name:"新增飲水",exact:true});
      await waterDialog.waitFor();
      await page.screenshot({path:path.join(screenshots,"Nexus-Health-water-editor-mobile.png")});
      await waterDialog.getByRole("button",{name:"取消",exact:true}).click();
      await page.setViewportSize({width:1280,height:900});
    }
    await navigateLife(page, "日曆");
    assert.equal(await page.getByText(/傍晚散步/).count(),0);
    await navigateLife(page, "健康管理");
    await page.getByRole("button",{name:"隱私與資料",exact:true}).click();
    await page.getByRole("checkbox",{name:"在行事曆顯示運動"}).click();
    await page.getByRole("checkbox",{name:"在行事曆顯示運動",checked:true}).waitFor();
    await navigateLife(page, "日曆");
    await page.locator(".life-month").getByRole("button",{name:/運動計畫 · 傍晚散步/}).waitFor();
    await page.getByRole("button",{name:"新增",exact:true}).click();
    await page.getByRole("button",{name:"新增任務",exact:true}).click();
    const task = page.getByRole("dialog",{name:"新增任務",exact:true});
    await task.getByLabel("名稱",{exact:true}).fill("運動測試任務");
    await task.getByLabel("重複週期",{exact:true}).selectOption("fixed");
    await task.getByLabel("目標種類",{exact:true}).selectOption("duration");
    await task.getByLabel("目標值",{exact:true}).fill("25");
    await task.getByLabel("連動模組").selectOption("health");
    await task.getByLabel("執行動作").selectOption("exercise");
    await task.getByLabel("預設運動分鐘").fill("30");
    await shot("task-health-settings");
    await task.getByRole("button",{name:"儲存任務",exact:true}).click();
    const taskItem = page.getByRole("complementary",{name:"日期詳情"}).getByRole("button",{name:/運動測試任務/});
    await taskItem.click();
    const occurrence = page.getByRole("dialog",{name:"週期任務",exact:true});
    await occurrence.getByRole("button",{name:"記錄運動",exact:true}).click();
    const workout = page.getByRole("dialog",{name:"新增運動紀錄",exact:true});
    await workout.getByLabel("名稱",{exact:true}).fill("測試連動");
    await shot("task-health-execution");
    await workout.getByRole("button",{name:"儲存",exact:true}).click();
    await workout.waitFor({state:"hidden"});
    await occurrence.getByText(/30 \/ 25/).waitFor();
    await occurrence.getByText("進度來自已連動的正式紀錄。",{exact:true}).waitFor();
    await page.evaluate(async()=>{
      const repo = window.lifeStorage.getLifeRepository();
      const row = (await repo.readHealth()).find(row=>row.kind==="exercise"&&row.data.title==="測試連動");
      await repo.saveHealth(row,true);
    });
    await occurrence.getByText(/0 \/ 25/).waitFor();
    await occurrence.getByRole("button",{name:"關閉",exact:true}).click();
    await page.evaluate(async()=>{
      const owner=window.lifeStorage.getWorkspaceOwner(), now=Date.now();
      await window.lifeStorage.getLifeRepository().saveFinance({id:"task-account",kind:"account",workspace_owner_id:owner,created_at:now,
        updated_at:now,revision:0,deleted_at:null,payload:{title:"測試帳戶",notes:"",currency:"TWD",type:"bank",opening:"0",color:"#000000",
        icon:"",archived:false,limit:"0",statementDay:1,paymentDay:5,due:""}});
    });
    await page.getByRole("button",{name:"新增",exact:true}).click();
    await page.getByRole("button",{name:"新增任務",exact:true}).click();
    await task.getByLabel("名稱",{exact:true}).fill("測試交易任務");
    await task.getByLabel("重複週期",{exact:true}).selectOption("fixed");
    await task.getByLabel("連動模組").selectOption("finance");
    await task.getByLabel("執行方式").selectOption("quick");
    await task.getByLabel("帳戶（含幣別）").selectOption("task-account");
    await task.getByLabel("預設金額").fill("99");
    await shot("task-finance-settings");
    await task.getByRole("button",{name:"儲存任務",exact:true}).click();
    await page.getByRole("complementary",{name:"日期詳情"}).getByRole("button",{name:/測試交易任務/}).click();
    await occurrence.getByRole("button",{name:"記錄支出",exact:true}).click();
    const financeAction=page.getByRole("dialog",{name:"記錄支出",exact:true});
    await financeAction.getByRole("button",{name:"繼續確認",exact:true}).click();
    await shot("task-finance-execution");
    await page.getByRole("button",{name:"確認",exact:true}).click();
    await occurrence.getByText(/1 \/ 1/).waitFor();
    assert.equal(await page.evaluate(async()=> (await window.lifeStorage.getLifeRepository().readFinance())
      .filter(row=>row.kind==="transaction"&&row.payload.taskOccurrence).length),1);

    assert.deepEqual(errors,[]);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});
