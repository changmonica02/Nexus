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
test("automation editor persists all four write actions and shows stored executions", { timeout: 60000 }, async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-automation-"));
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
    await page.waitForFunction(()=>!!window.lifeStorage);
    const {task,repeat}=await page.evaluate(async()=>{
      const storage=window.lifeStorage;
      const created=await storage.createPage({kind:"todo",title:"核對預算"});
      const recurring=await storage.createPage({kind:"todo",title:"週期待辦"});
      await storage.savePage({...recurring,task_repeat:"daily",due_date:Date.now()});
      const repo=storage.getLifeRepository(),now=Date.now();
      await repo.save("life_lists",{workspace_owner_id:storage.getWorkspaceOwner(),revision:0,created_at:now,updated_at:now,
        deleted_at:null,sort_order:0,schema_version:1,id:"linked-list",title:"採購清單",
        fields:[{id:"task-link",name:"相關待辦",type:"text",relation:"task",required:true}]});
      await window.reloadLifePages();
      return {task:created.id,repeat:recurring.id};
    });
    await page.getByText(/站內提醒 · /).click();
    const configure=async(title,action)=>{
      await page.getByRole("button",{name:"新增日期提醒規則"}).click();
      await page.getByLabel("提醒名稱").fill(title);
      await page.getByLabel("執行動作").selectOption(action);
    };
    const save=()=>page.getByRole("button",{name:"儲存規則"}).click();
    const saved=title=>page.getByText(new RegExp(title+" · .* 起每")).waitFor();
    await configure("建立採購待辦","task"); await save(); await saved("建立採購待辦");
    await configure("規劃書籍費用","estimate");
    await page.getByLabel("幣別").selectOption("USD");
    await page.getByLabel("預估金額").fill("12.50");
    await save(); await saved("規劃書籍費用");
    await configure("建立採購關聯","relation");
    await page.getByLabel("存入清單").selectOption("linked-list");
    await page.getByLabel("關聯欄位").selectOption("task-link");
    await page.getByLabel("關聯來源").selectOption(task);
    await save(); await saved("建立採購關聯");
    await configure("自動完成核對","update-task");
    await page.getByLabel("要更新的待辦").selectOption(task);
    await page.getByLabel("更新欄位").selectOption("completed");
    await page.getByLabel("新值").selectOption("true");
    await save(); await saved("自動完成核對");
    await page.waitForFunction(async task=>{
      const storage=window.lifeStorage,repo=storage.getLifeRepository();
      const pages=await storage.listPages(),finance=await repo.readFinance(),lists=await repo.read();
      return pages.some(row=>row.title==="建立採購待辦"&&row.kind==="todo")
        &&pages.some(row=>row.id===task&&row.completed)
        &&finance.some(row=>row.kind==="estimate"&&row.payload.amount==="1250")
        &&lists.life_items.some(row=>row.values["task-link"]===task)
        &&(await repo.readAutomationRuns()).filter(row=>!row.error).length===4;
    },task);
    await configure("重試完成狀態","update-task");
    await page.getByLabel("要更新的待辦").selectOption(repeat);
    await page.getByLabel("更新欄位").selectOption("completed");
    await page.getByLabel("新值").selectOption("false");
    await save(); await saved("重試完成狀態");
    await page.getByText("執行紀錄",{exact:true}).click();
    const failed=page.locator("li").filter({hasText:"重試完成狀態"}).filter({hasText:"週期待辦的完成狀態須手動更新"});
    await failed.getByRole("button",{name:"重試",exact:true}).waitFor();
    await page.getByText(/重試完成狀態 · .* 起每/).locator("..").getByRole("button",{name:"編輯規則"}).click();
    await page.getByLabel("要更新的待辦").selectOption(task);
    await save();
    await failed.getByRole("button",{name:"重試",exact:true}).click();
    await page.waitForFunction(async task=>(await window.lifeStorage.getPage(task)).completed===false,task);
    await page.getByText(/重試完成狀態 · 已儲存(?:，等待同步)? · 2 次嘗試/).waitFor();
    await page.reload();
    await page.getByText(/站內提醒 · /).click();
    await page.getByText("執行紀錄",{exact:true}).click();
    await page.getByText(/\d{4}-\d{2}-\d{2} · 自動完成核對 · 已儲存/).waitFor();
    assert.deepEqual(errors,[]);
  } finally {
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});
