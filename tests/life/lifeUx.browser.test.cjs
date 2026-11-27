const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http');
const { build } = require('esbuild');
const { navigateLife } = require('./navigation.cjs');
const engine = process.env.LIFE_BROWSER ?? 'chromium';
test(`Life daily flows, persistent settings and responsive calendar (${engine})`, { timeout: 120000 }, async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'life-ux-'));
  await build({entryPoints:['tests/fixtures/lifeLists.jsx'],outfile:path.join(tmp,'app.js'),bundle:true,format:'esm',jsx:'automatic',define:{'process.env':JSON.stringify({NODE_ENV:'development'})}});
  const root = path.resolve(__dirname,'../..'), cssFile=path.join(root,'src/app/globals.css');
  const {css}=await require('postcss')([require('@tailwindcss/postcss')({base:root})]).process(fs.readFileSync(cssFile,'utf8'),{from:cssFile});
  const server=http.createServer((req,res)=>{
    if(req.url==='/app.js'){res.setHeader('content-type','application/javascript');res.end(fs.readFileSync(path.join(tmp,'app.js')));}
    else if(req.url==='/app.css'){res.setHeader('content-type','text/css');res.end(css);}
    else res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><div id="root"></div><script type="module" src="/app.js"></script>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await require('playwright')[engine].launch({executablePath:engine==='chromium'?process.env.BROWSER_EXECUTABLE:undefined,args:engine==='chromium'?['--no-sandbox']:[]});
    const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'Asia/Taipei'}), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole('button',{name:'自訂',exact:true}).waitFor();
    await page.evaluate(async()=>{
      const storage=window.lifeStorage,repo=storage.getLifeRepository(),now=Date.now(),today=new Date();today.setHours(0,0,0,0);
      const day=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
      const base={workspace_owner_id:storage.getWorkspaceOwner(),revision:0,created_at:now,updated_at:now,deleted_at:null,sort_order:0};
      await storage.createPage({kind:'todo',title:'當日報告',due_date:today.getTime()});
      await storage.createPage({kind:'todo',title:'未排定閱讀'});
      await storage.createPage({kind:'todo',title:'逾期作業',due_date:today.getTime()-86400000});
      await repo.saveSchedule({...base,id:'ux-event',title:'下午討論',starts_at:today.getTime()+14*3600000,ends_at:today.getTime()+15*3600000,all_day:false,category:'學業',notes:'準備筆記'});
      await repo.saveHabit({...base,id:'ux-habit',title:'每日閱讀',cadence:'daily',goal:1,started_on:day,quantities:{}});
      await window.reloadLifePages();
    });
    await page.getByRole('checkbox',{name:'完成任務 當日報告',exact:true}).first().check();
    await page.getByRole('button',{name:'打卡 每日閱讀',exact:true}).click();
    await page.getByRole('button',{name:'取消打卡 每日閱讀',exact:true}).waitFor();
    const before=await page.evaluate(async()=>window.lifeStorage.getLifeRepository().readDashboard());
    await navigateLife(page,'日曆');
    assert.deepEqual(await page.getByRole('tab').allTextContents(),['總覽','日曆','健康管理','財務','我的清單']);
    const details=page.getByRole('complementary',{name:'日期詳情'});
    await details.getByRole('button',{name:/下午討論/}).waitFor();
    await details.getByRole('checkbox',{name:/當日報告/}).uncheck();
    await details.getByRole('button',{name:'當日報告',exact:true}).click();
    const taskEditor=page.getByRole('dialog',{name:'編輯任務'});
    await taskEditor.getByLabel('名稱',{exact:true}).fill('當日報告修訂');
    await taskEditor.getByRole('button',{name:'儲存',exact:true}).click();
    await details.getByRole('button',{name:'當日報告修訂',exact:true}).waitFor();
    await details.getByRole('button',{name:'取消打卡 每日閱讀',exact:true}).click();
    await details.getByRole('button',{name:'打卡 每日閱讀',exact:true}).waitFor();
    for(const [name,width,height] of [['phone',390,844],['portrait',820,1180],['landscape',1180,820],['desktop',1440,1000]]) {
      await page.setViewportSize({width,height});
      for(const dark of [false,true]) {
        await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dark);
        await page.locator('#life-content').evaluate(node=>{node.scrollTop=0;});
        const geometry=await page.evaluate(()=>{
          const calendar=document.querySelector('.life-calendar-layout > div').getBoundingClientRect(),details=document.querySelector('.life-day-details').getBoundingClientRect(),scroller=document.getElementById('life-content');
          return {calendar:{x:calendar.x,y:calendar.y,right:calendar.right,bottom:calendar.bottom},details:{x:details.x,y:details.y},overflow:scroller.scrollWidth>scroller.clientWidth,headerBottom:document.querySelector('[data-workspace-header]').getBoundingClientRect().bottom,contentTop:scroller.getBoundingClientRect().top};
        });
        assert.equal(geometry.overflow,false,`${name} overflow`);
        assert.ok(geometry.contentTop>=geometry.headerBottom,`${name} header`);
        if(width>=960&&width>height)assert.ok(geometry.details.x>=geometry.calendar.right-1,`${name} side panel`);
        else assert.ok(geometry.details.y>=geometry.calendar.bottom-1,`${name} stacked panel`);
        if(process.env.LIFE_UX_SCREENSHOTS&&(!dark||name==='phone')){fs.mkdirSync(process.env.LIFE_UX_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.LIFE_UX_SCREENSHOTS,`calendar-${name}${dark?"-dark":""}-${engine}.png`)});if(name==='phone'){await details.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.LIFE_UX_SCREENSHOTS,`calendar-phone-details${dark?"-dark":""}-${engine}.png`)});}}
      }
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.getByRole('button',{name:'收合生活側邊欄'}).click();
    await page.reload();
    await page.getByRole('button',{name:'展開生活側邊欄'}).waitFor();
    for(const legacy of ['schedule','milestones','tasks','habits']){
      await page.evaluate(tab=>window.openLegacyLife(tab),legacy);
      await page.getByRole('region',{name:'日曆事項管理'}).waitFor();
      assert.equal(await page.getByRole('tab',{name:'日曆',exact:true}).getAttribute('aria-selected'),'true');
    }
    await navigateLife(page,'任務');
    await page.getByRole('button',{name:'無期限',exact:true}).click();
    await page.getByText('未排定閱讀',{exact:true}).waitFor();
    await page.getByRole('button',{name:'已逾期',exact:true}).click();
    await page.getByText('逾期作業',{exact:true}).waitFor();
    await page.getByRole('button',{name:'關閉管理',exact:true}).click();
    await page.getByRole('button',{name:'新增',exact:true}).click();
    await page.getByRole('button',{name:'新增行程',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'新增行程'});
    await dialog.getByLabel('名稱',{exact:true}).fill('新行程');
    await dialog.getByRole('button',{name:'儲存行程'}).click();
    await details.getByRole('button',{name:/新行程/}).waitFor();
    await navigateLife(page,'財務');
    await page.getByText('近六個月尚無收支紀錄，記下第一筆交易即可查看趨勢。',{exact:true}).waitFor();
    for(const [label,type] of [['記支出','expense'],['記收入','income'],['帳戶轉帳','transfer']]){
      await page.getByRole('button',{name:label,exact:true}).click();
      const editor=page.getByRole('dialog',{name:'新增交易'});
      assert.equal(await editor.getByLabel('交易類型',{exact:true}).inputValue(),type);
      await editor.getByRole('button',{name:'取消',exact:true}).click();
    }
    await page.getByLabel('統計月份',{exact:true}).fill('2026-03');
    await navigateLife(page,'日曆');await page.getByLabel('日曆日期',{exact:true}).fill('2027-02-18');
    await page.getByRole('button',{name:'新增',exact:true}).click();await page.getByRole('button',{name:'新增行程',exact:true}).click();
    const datedSchedule=page.getByRole('dialog',{name:'新增行程'});
    assert.ok((await datedSchedule.getByLabel('開始',{exact:true}).inputValue()).startsWith('2027-02-18'));
    await datedSchedule.getByRole('button',{name:'取消',exact:true}).click();
    await page.getByRole('button',{name:'新增',exact:true}).click();await page.getByRole('button',{name:'新增習慣',exact:true}).click();
    const datedHabit=page.getByRole('dialog',{name:'新增習慣'});
    assert.equal(await datedHabit.getByLabel('開始日期',{exact:true}).inputValue(),'2027-02-18');
    await datedHabit.getByRole('button',{name:'取消',exact:true}).click();
    await navigateLife(page,'財務');
    assert.equal(await page.getByLabel('統計月份',{exact:true}).inputValue(),'2026-03');
    assert.deepEqual(await page.evaluate(async()=>window.lifeStorage.getLifeRepository().readDashboard()),before);
    await navigateLife(page,'總覽');await page.getByRole('button',{name:'今天',exact:true}).click();
    if(process.env.LIFE_UX_SCREENSHOTS){await page.screenshot({path:path.join(process.env.LIFE_UX_SCREENSHOTS,`overview-${engine}.png`)});}
    assert.deepEqual(errors,[]);
  } finally { await browser?.close(); await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true}); }
});
