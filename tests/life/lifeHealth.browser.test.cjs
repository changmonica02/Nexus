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
    await page.getByText("500 ml",{exact:true}).waitFor();
    await page.getByText("8 小時",{exact:true}).waitFor();
    assert.deepEqual(await page.getByRole("navigation",{name:"健康功能"}).getByRole("button").allTextContents(),
      ["總覽","身體","飲食","活動與休息","照護","分析"]);
    await nav("分析");
    await page.getByRole("combobox",{name:"統計期間"}).selectOption("90");
    await page.getByLabel("趨勢指標").selectOption("sleep");
    await page.getByText("檢視每日數值",{exact:true}).click();
    assert.equal(await page.getByText(/ · 8$/).count(),1);
    await nav("總覽");
    const screenshots=process.env.NEXUS_HEALTH_SCREENSHOTS;
    if(screenshots){
      fs.mkdirSync(screenshots,{recursive:true});
      for(const [label,width,height,theme] of [["desktop",1280,900,"light"],["tablet",820,1100,"light"],["mobile",390,844,"dark"]]){
        await page.setViewportSize({width,height});
        await page.emulateMedia({colorScheme:theme});
        await page.evaluate(dark=>document.documentElement.classList.toggle("dark",dark),theme==="dark");
        await page.screenshot({path:path.join(screenshots,`Nexus-Health-${label}.png`)});
      }
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
    await task.getByRole("button",{name:"儲存任務",exact:true}).click();
    const taskItem = page.getByRole("complementary",{name:"日期詳情"}).getByRole("button",{name:/運動測試任務/});
    await taskItem.click();
    const occurrence = page.getByRole("dialog",{name:"週期任務",exact:true});
    await occurrence.getByText("記錄健康資料",{exact:true}).click();
    await occurrence.getByRole("button",{name:"記錄運動",exact:true}).click();
    const workout = page.getByRole("dialog",{name:"新增運動紀錄",exact:true});
    await workout.getByLabel("名稱",{exact:true}).fill("測試連動");
    await workout.getByRole("button",{name:"儲存",exact:true}).click();
    await workout.waitFor({state:"hidden"});
    await navigateLife(page,"日曆");
    await taskItem.click();
    await occurrence.getByText(/30 \/ 25/).waitFor();
    await occurrence.getByText("進度來自已關聯的健康紀錄。",{exact:true}).waitFor();
    await page.evaluate(async()=>{
      const repo = window.lifeStorage.getLifeRepository();
      const row = (await repo.readHealth()).find(row=>row.kind==="exercise"&&row.data.title==="測試連動");
      await repo.saveHealth(row,true);
    });
    await occurrence.getByText(/0 \/ 25/).waitFor();
    assert.deepEqual(errors,[]);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});
