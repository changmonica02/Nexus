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
    const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'Asia/Taipei',hasTouch:true}), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole('button',{name:'自訂',exact:true}).waitFor();
    for (const section of ['總覽', '日曆', '健康管理', '財務', '我的清單']) {
      await navigateLife(page, section);
      const title = page.locator('[data-workspace-header]').getByRole('heading', {level:1});
      assert.deepEqual(await title.locator('span').allTextContents(), ['生活', section]);
      assert.equal(await page.locator('#life-content').getByRole('heading', {name:section, exact:true}).count(), 0);
    }
    await navigateLife(page, '總覽');
    await page.evaluate(async()=>{
      const storage=window.lifeStorage,repo=storage.getLifeRepository(),now=Date.now(),today=new Date();today.setHours(0,0,0,0);
      const day=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
      const base={workspace_owner_id:storage.getWorkspaceOwner(),revision:0,created_at:now,updated_at:now,deleted_at:null,sort_order:0};
      await storage.createPage({kind:'todo',title:'當日報告',due_date:today.getTime()});
      await storage.createPage({kind:'todo',title:'未排定閱讀'});
      await storage.createPage({kind:'todo',title:'逾期作業',due_date:today.getTime()-86400000});
      await repo.saveSchedule({...base,id:'ux-event',title:'下午討論',starts_at:today.getTime()+14*3600000,ends_at:today.getTime()+15*3600000,all_day:false,category:'學業',notes:'準備筆記'});
      await repo.saveHabit({...base,id:'ux-habit',title:'每日閱讀',cadence:'daily',goal:1,started_on:day,quantities:{}});
      await repo.saveHealth({...base,id:'health:'+JSON.stringify(storage.getWorkspaceOwner()),kind:'privacy',data:{habits:true,share_goal:true}});
      await repo.saveHealth({...base,id:'ux-health-goal',kind:'goal',data:{title:'閱讀目標',metric:'custom',mode:'increase',date:day,until:day,baseline:0,target:10,current:0,habit:'ux-habit'}});
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
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'日檢視',exact:true}).tap();
    await page.locator('.life-timeline-slot').nth(12).tap();
    const touchEditor=page.getByRole('dialog',{name:'新增行程'});
    assert.match(await touchEditor.getByLabel('開始',{exact:true}).inputValue(),/T12:(00|15|30|45)$/);
    await touchEditor.getByRole('button',{name:'取消',exact:true}).tap();
    await page.getByRole('button',{name:'月檢視',exact:true}).tap();
    await page.setViewportSize({width:1440,height:1000});
    await page.getByRole('button',{name:'週檢視',exact:true}).click();
    await page.getByRole('button',{name:'展開詳情',exact:true}).click();
    await page.getByRole('button',{name:'收合生活側邊欄'}).click();
    await page.reload();
    await page.getByRole('button',{name:'展開生活側邊欄'}).waitFor();
    await navigateLife(page,'日曆');
    await page.locator('.life-timeline').waitFor();
    assert.equal(await page.locator('.life-timeline-day').count(),7);
    await details.waitFor();
    await page.getByRole('button',{name:'收合詳情',exact:true}).click();
    await page.getByRole('button',{name:'月檢視',exact:true}).click();
    for(const legacy of ['schedule','milestones','tasks','habits']){
      await page.evaluate(tab=>window.openLegacyLife(tab),legacy);
      await page.getByRole('region',{name:'日曆事項管理'}).waitFor();
      assert.equal(await page.getByRole('tab',{name:'日曆',exact:true}).getAttribute('aria-selected'),'true');
    }
    await page.getByRole('region',{name:'日曆事項管理'}).getByRole('button',{name:'閱讀目標',exact:true}).waitFor();
    await navigateLife(page,'任務');
    await page.getByRole('button',{name:'無期限',exact:true}).click();
    await page.getByText('未排定閱讀',{exact:true}).waitFor();
    await page.getByRole('button',{name:'已逾期',exact:true}).click();
    await page.getByRole('region',{name:'日曆事項管理'}).getByText('逾期作業',{exact:true}).waitFor();
    await page.getByRole('button',{name:'關閉管理',exact:true}).click();
    await page.getByRole('button',{name:'新增',exact:true}).click();
    await page.getByRole('button',{name:'新增行程',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'新增行程'});
    await dialog.getByLabel('名稱',{exact:true}).fill('新行程');
    await dialog.getByRole('button',{name:'儲存行程'}).click();
    await details.getByRole('button',{name:/新行程/}).waitFor();
    await page.getByRole('button',{name:'週檢視',exact:true}).click();
    assert.equal(await page.locator('.life-timeline-day').count(),7);
    assert.equal(await details.count(),0);
    await page.getByRole('button',{name:'日檢視',exact:true}).click();
    assert.equal(await page.locator('.life-timeline-day').count(),1);
    const slot=page.locator('.life-timeline-slot').nth(10);
    await slot.focus();
    await page.keyboard.press('Enter');
    const quick=page.getByRole('dialog',{name:'新增行程'});
    assert.match(await quick.getByLabel('開始',{exact:true}).inputValue(),/T10:00$/);
    await quick.getByRole('button',{name:'取消',exact:true}).click();
    const scheduled=page.locator('.life-timeline-event').filter({hasText:'下午討論'});
    await scheduled.scrollIntoViewIfNeeded();
    const handle=scheduled.locator('[data-move]');
    const bounds=await handle.boundingBox();
    await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
    await page.mouse.down();
    await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2+48,{steps:8});
    await page.mouse.up();
    await page.waitForFunction(async()=>{
      const records=await window.lifeStorage.getLifeRepository().readSchedule();
      return new Date(records.find(record=>record.id==='ux-event').starts_at).getHours()===15;
    });
    await page.getByRole('button',{name:'清單檢視',exact:true}).click();
    await page.locator('.life-calendar-list').waitFor();
    await page.getByText('篩選',{exact:true}).click();
    await page.getByLabel('重複類型').selectOption('once');
    assert.equal(await page.locator('.life-calendar-list section').count(),1);
    await page.getByLabel('重複類型').selectOption('all');
    await page.getByText('篩選',{exact:true}).click();
    assert.equal(await details.count(),0);
    await page.getByRole('button',{name:'月檢視',exact:true}).click();
    await details.waitFor();
    await navigateLife(page,'財務');
    await page.getByText('尚無交易。',{exact:true}).waitFor();
    for(const [label,type] of [['記錄支出','expense'],['記錄收入','income'],['帳戶轉帳','transfer']]){
      await page.getByRole('button',{name:'新增',exact:true}).click();
      await page.locator('[data-life-add-options]').getByRole('button',{name:label,exact:true}).click();
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
    await page.getByRole('button',{name:'新增',exact:true}).click();await page.getByRole('button',{name:'新增任務',exact:true}).click();
    await page.getByRole('dialog',{name:'新增任務'}).getByLabel('啟用習慣追蹤').click();
    const datedHabit=page.getByRole('dialog',{name:'新增任務'});
    assert.equal(await datedHabit.getByLabel('開始日期',{exact:true}).inputValue(),'2027-02-18');
    await datedHabit.getByLabel('啟用習慣追蹤').uncheck();
    await datedHabit.getByRole('button',{name:'取消',exact:true}).click();
    await page.getByRole('button',{name:'新增',exact:true}).click();
    await page.getByRole('button',{name:'新增任務',exact:true}).click();
    const planned=page.getByRole('dialog',{name:'新增任務'});
    await planned.getByLabel('名稱',{exact:true}).fill('週期閱讀');
    await planned.getByLabel('重複週期',{exact:true}).selectOption('fixed');
    await planned.getByLabel('重複次數',{exact:true}).fill('3');
    await planned.getByLabel('目標種類',{exact:true}).selectOption('duration');
    await planned.getByLabel('目標值',{exact:true}).fill('25');
    await planned.getByRole('button',{name:'儲存任務',exact:true}).click();
    await details.getByRole('button',{name:/週期閱讀/}).click();
    const instance=page.getByRole('dialog',{name:'週期任務'});
    await instance.getByLabel('實際完成量').fill('10');
    await instance.getByRole('button',{name:'儲存進度'}).click();
    await instance.getByText(/部分完成/).waitFor();
    await instance.getByRole('button',{name:'關閉',exact:true}).click();
    await page.getByLabel('日曆日期',{exact:true}).fill('2027-02-19');
    await details.getByRole('button',{name:/週期閱讀/}).click();
    await instance.getByText(/尚未完成/).waitFor();
    await instance.getByRole('button',{name:'跳過本次'}).click();
    await instance.getByText(/已跳過/).waitFor();
    await instance.getByRole('button',{name:'任務設定'}).click();
    await instance.getByLabel('套用範圍').selectOption('future');
    await instance.getByLabel('任務說明').fill('換一本書');
    await instance.getByRole('button',{name:'儲存任務'}).click();
    await instance.waitFor({state:'hidden'});
    await page.getByLabel('日曆日期',{exact:true}).fill('2027-02-18');
    await details.getByRole('button',{name:/週期閱讀.*部分完成/}).waitFor();
    await navigateLife(page,'財務');
    assert.equal(await page.getByLabel('統計月份',{exact:true}).inputValue(),'2026-03');
    assert.deepEqual(await page.evaluate(async()=>window.lifeStorage.getLifeRepository().readDashboard()),before);
    await navigateLife(page,'總覽');await page.getByRole('button',{name:'今天',exact:true}).click();
    if(process.env.LIFE_UX_SCREENSHOTS){await page.screenshot({path:path.join(process.env.LIFE_UX_SCREENSHOTS,`overview-${engine}.png`)});}
    for(const [width,height] of [[390,844],[820,1180],[1180,820],[1440,1000]]){
      await page.setViewportSize({width,height});
      for(const destination of ['總覽','日曆','財務']){
        await navigateLife(page,destination);
        await page.getByRole('button',{name:'新增',exact:true}).click();
        const bounds=await page.locator('[data-life-add-options]').boundingBox();
        assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=width,`${destination} add menu at ${width}`);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('[data-life-add-options]').count(),0);
      }
    }
    assert.deepEqual(errors,[]);
  } finally { await browser?.close(); await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true}); }
});
