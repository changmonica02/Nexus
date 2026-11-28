# Nexus Life 健康管理重構

## 介面

- 總覽集中當日摘要、待記錄事項、近七日紀錄和趨勢。飲水容量保留快速記錄，詳細表單從「新增」開啟。
- 身體整合身體數據、相關目標及經期。飲食整合飲水、飲食、目標與常用食品及餐點。活動與休息整合運動與睡眠。照護分開呈現預定服用、實際紀錄、庫存與效期。
- 分析支援 7 日、30 日、90 日與一年，依既有原始紀錄呈現指標與每日數值。睡眠跨午夜以原有時間戳計算時長，並歸入起床日。
- 隱私、資料匯出、容量設定及日曆分享仍由齒輪進入。

## 資料與同步

- 新的運動安排開啟日曆的共用追蹤任務表單。舊運動計畫保留檢視、編輯及記錄實際運動的能力。
- 週期任務可直接開啟帶關聯的健康表單。關聯的飲水、體重及運動紀錄可按任務週期投影進度。以毫升、運動時間、距離或次數等相容的目標單位計算。完成既有手動紀錄或跳過的期數仍以手動狀態為準。新增、修改或刪除原始紀錄後會重算投影。
- 健康目標沿用原始資料重算。日曆在取得分享授權後顯示健康事項。開啟服用提醒會帶入所選日期和預定時段，使用者仍需儲存實際紀錄。
- 本階段沿用 `life_health_records` 與既有 RLS、備份和同步流程，沒有新增 migration。日曆及財務的遷移順序沿用主要 PR 說明。

## 目前範圍

- 已找回先前規格中的六個入口、四個分析期間及主要同步要求，前一份指令的逐項原文未完整取回。
- 健康進度適用於有執行時段的新版任務。舊版一般待辦仍使用既有完成操作。以完成時間推算下次日期的規則，仍以手動執行紀錄推進。
- 睡眠資料依使用者填寫的時間與品質呈現。紀錄未提供睡眠階段資料。

## 實作畫面

[電腦總覽](screenshots/Nexus-Health-desktop.png) · [手機深色總覽](screenshots/Nexus-Health-mobile.png)

## 健康管理介面完善

手機及直向平板透過固定頂欄選擇 Life 分頁。橫向平板及電腦沿用可收合側欄。健康六個入口共用可橫向捲動的單列導覽。

- 總覽新增日期前後移動、今天及本地日期顯示。飲水、飲食、活動、身體與睡眠各有情境快捷。設定可調整區塊及快捷顯示，健康事項列出時段、狀態及動作。
- 身體數據顯示最新量測日期並連到分析。飲食按餐別分組，食品選單支援搜尋與依最近同名紀錄帶入份量。複製餐點使用歷史營養快照。
- 飲水快捷寫入正式工作區記錄。復原新增會移除剛記錄的資料。復原已永久刪除的飲水會以新 ID 寫回原始內容，舊 ID 的刪除紀錄保留。
- 照護分為指定日、計畫與歷史。暫停、恢復及終止從當天生效。修改未來計畫時會在同一工作區交易結束舊計畫並新增後續計畫，已儲存的服用紀錄仍引用原計畫。
- 分析提供預設期間和自訂起訖、每日數值、健康目標管理與期末達成數。長期間圖表最多取樣 366 日，期間摘要仍採完整區間資料。眼前缺少的紀錄保留未知狀態。
- 顯示單位偏好套用於主要體重及運動距離摘要。記錄表單和分析指標使用固定儲存單位。睡眠依起床日統計，正確保留多段睡眠及午睡。
- 舊資料保留原 ID 和格式。新增的 `?health=` 直接入口接受原功能名稱 `cycle`、`foods`、`exercise`、`sleep`、`goal` 等別名。有關聯的健康資料仍使用原本的日曆與任務投影；預設限制跨模組顯示。

### 遷移與復原

依主 PR 順序確認 `20261128000000_life_calendar_repeat_modes.sql`、`20261128010000_life_task_executions.sql`、`20261128020000_life_finance_recurring.sql` 已套用，再套用 `20261128030000_life_health_dose_slots.sql`。健康遷移只為新版寫入的預定時段新增局部唯一索引。既有重複紀錄保留，庫存與統計依原去重邏輯計算。需要復原遷移時，可移除 `life_health_managed_dose_slot` 索引，並保留已儲存資料及原 RLS。

### 瀏覽器截圖

| 畫面 | 實作截圖 |
| --- | --- |
| 健康總覽 | [手機深色](refinement/Nexus-Health-mobile.png) · [平板橫向](refinement/Nexus-Health-tablet-landscape.png) · [平板直向](refinement/Nexus-Health-tablet-portrait.png) · [電腦](refinement/Nexus-Health-desktop.png) |
| 身體、飲食 | [身體](refinement/Nexus-Health-body-mobile.png) · [飲食](refinement/Nexus-Health-food-mobile.png) |
| 活動、照護、分析 | [活動與休息](refinement/Nexus-Health-activity-mobile.png) · [照護](refinement/Nexus-Health-care-mobile.png) · [分析](refinement/Nexus-Health-analysis-mobile.png) |
| 重要操作 | [自訂飲水](refinement/Nexus-Health-water-editor-mobile.png) · [記錄服用](refinement/Nexus-Health-dose-editor-mobile.png) |

截圖使用測試工作區的合成資料。進階照護規則採既有月末日期推算，尚未提供每月第幾個星期幾或任意單次例外規則。用藥計畫的新舊時段與實際紀錄各自保留。活動資料未接入步數或睡眠階段裝置。

## 健康總覽與週期任務連動

健康總覽改為飲水、飲食、運動、睡眠及身體數據各自成卡。各卡從同一份原始紀錄讀取最新數值、適用目標及近七日趨勢。健康總覽的待辦區改由原本的日曆任務承接。照護與預定交易保留原本專屬流程。

飲水操作列包含手動新增、兩個初始為空的快捷及鉛筆。顯示單位、快捷、既有飲水紀錄與目標都能由鉛筆管理。原先逗號分隔的快捷設定和其他舊健康偏好仍保存在使用者資料。正式刪除後復原飲水維持既有做法，以新 ID 帶回原內容。

任務設定提供健康與財務連動。正式來源保留任務及期別關聯，任務按實際紀錄重算。睡眠用表單記錄真實時間。週期交易使用原本的確認流程，已入帳且符合任務期間的唯一交易可直接連結。快捷確認及累積型任務的重試維持各自的資料來源。

### 遷移

在前一輪 `20261128030000_life_health_dose_slots.sql` 後套用 `20261128040000_life_task_action_slots.sql`。這次只新增部分唯一索引，保護勾選型任務每個來源模組的期別寫入。累積型任務可有多筆紀錄。既有 RLS 和資料不變，復原時可移除這兩個索引。

### 本輪畫面

| 畫面 | 截圖 |
| --- | --- |
| 健康總覽 | [手機](cards/Nexus-Health-mobile.png) · [平板橫向](cards/Nexus-Health-tablet-landscape.png) · [電腦](cards/Nexus-Health-desktop.png) |
| 飲水快捷 | [未設定](cards/Nexus-Health-water-empty.png) · [兩個已設定](cards/Nexus-Health-water-configured.png) |
| 飲水操作 | [手動新增](cards/Nexus-Health-water-editor-mobile.png) · [鉛筆管理](cards/Nexus-Health-water-management.png) · [歷史編輯](cards/Nexus-Health-water-history.png) |
| 健康任務 | [連動設定](cards/Nexus-Health-task-health-settings.png) · [執行表單](cards/Nexus-Health-task-health-execution.png) |
| 財務任務 | [連動設定](cards/Nexus-Health-task-finance-settings.png) · [確認交易](cards/Nexus-Health-task-finance-execution.png) |
