# Nexus Life 介面與流程改善

以 `85baca5`（PR #231 合併後的 main）為基準；不含 migration，不修改正式資料庫。

## 操作與資料相容性

- Life 一級入口為總覽、日曆、健康管理、財務、我的清單。桌面與平板橫向使用可收合側邊欄，直向使用展開選單；收合狀態儲存在裝置上。
- 生活標題併入 Nexus 全域頂端列，沿用原本固定列的內容預留高度。
- 行程、重要日期、任務、習慣的舊分頁狀態會轉至日曆的對應管理面板。日曆被隱藏但附屬功能仍啟用時，保留日曆入口以供管理。
- 日曆右側／下方詳情可以編輯行程、重要日期及任務、勾選完成與習慣打卡。任務編輯沿用 TaskDetails，完整內容仍可開啟原任務編輯器。跨日期管理沿用 SchedulePanel、MilestonesPanel、PageCollection 與 HabitsPanel。
- 新增行程、重要日期、習慣及任務均採選取日期。新增任務後留在生活頁面，沿用原有儲存、同步與權限處理。
- 財務統計月份與金額顯示狀態保留於 Life 的檢視狀態，獨立於日曆日期；計算、匯率、幣別及帳戶轉帳均沿用既有規則。
- 計時器移至工具，仍使用原有 owner 分區的狀態鍵、結果資料與學習紀錄。舊計時器卡片設定保留，Life 不再顯示或提供新增計時卡片。
- 不改寫既有儀表板設定。只有新建／明確恢復預設的日常配置新增習慣卡片；既有卡片順序、尺寸、內容、統計期間、模組隱藏與多配置仍由原設定控制。
- 沒有新增資料來源、外部服務、通知、金流或健康專屬功能。

## 自動化驗證

- `npx tsc --noEmit`
- `npx eslint`（專案原有警告仍保留，無錯誤）
- `npm run build`
- Life 非瀏覽器測試：44 項，涵蓋資料保留、同步、權限、工作區、規則與配置。
- Chromium 的 8 個 Life 瀏覽器測試檔，包括原有全部流程及新增 UX 回歸。
- `LIFE_BROWSER=webkit node --test --test-concurrency=1 tests/life/*.browser.test.cjs`
- WebKit 附件測試使用獨立持久性設定檔，驗證實際檔案儲存、圖片顯示、重新載入及帳號隔離；不使用無法儲存 IndexedDB Blob 的暫時性工作階段。
- 另驗證正式建置 PWA 的離線資料流程、學習首頁銜接及四尺寸實際 Nexus 工作區的 Life 操作。
- 新增 `lifeUx.browser.test.cjs`，驗證四種尺寸、淺／深色、無水平溢出、頂端列預留、詳情排列、直接任務編輯、習慣打卡、側邊欄狀態、舊入口、無期限／逾期任務、快速記帳及月份隔離。
- CI 清冊新增 UX 測試；完整 CI 明確執行 Chromium 與 WebKit UX 回歸及 WebKit 全部 Life 瀏覽器測試，並上傳截圖證據。

## 畫面證據

以下圖片由實際 Life 元件、IndexedDB 儲存層與模擬資料產生，不包含正式帳號資料。測試外殼提供 Nexus 頂端列，正式環境頂端列由 NexusApp 提供。

| 畫面 | 截圖 |
| --- | --- |
| 日曆／電腦 | [Chromium](screenshots/calendar-desktop-chromium.png) |
| 日曆／平板橫向 | [Chromium](screenshots/calendar-landscape-chromium.png) |
| 日曆／平板直向 | [Chromium](screenshots/calendar-portrait-chromium.png) |
| 日曆／手機 | [Chromium](screenshots/calendar-phone-chromium.png) |
| 日曆／手機日期詳情 | [Chromium](screenshots/calendar-phone-details-chromium.png) |
| 日曆／手機深色 | [Chromium](screenshots/calendar-phone-dark-chromium.png) |
| 總覽 | [Chromium](screenshots/overview-chromium.png) |
| 財務／電腦 | [Chromium](screenshots/Nexus-Finance-overview-desktop.png) |
| 財務／平板 | [Chromium](screenshots/Nexus-Finance-transactions-tablet.png) |
| 財務／手機 | [Chromium](screenshots/Nexus-Finance-budget-mobile.png) |

WebKit 的同尺寸畫面亦保留於 screenshots 目錄。完整 CI 結果以 PR 的最終提交檢查為準。本分支不會自動合併或進行正式部署。

## 週期任務與資料庫部署

1. 在測試資料庫備份工作區資料與 `apply_workspace_operations(jsonb)` 函式定義。
2. 確認已套用 `20261128000000_life_calendar_repeat_modes.sql`，再套用 `20261128010000_life_task_executions.sql`。
3. 先驗證兩個帳號的頁面與執行紀錄隔離，再部署前端。有待同步紀錄的裝置應先完成同步。
4. 從日曆中的既有習慣紀錄可選擇「轉換為追蹤任務」。轉換沿用原 ID，保留逐日原始資料及健康目標連結，並把現有進度依週期寫入執行紀錄。舊紀錄缺少實際完成時間時，欄位保持空白。既有未完成的待辦可在編輯器選擇「使用完整週期設定」，原本已完成的待辦保留原狀。

`pages.task_plan` 記錄各段規則及單次例外。`life_task_executions` 以擁有者、任務及週期識別碼保證唯一性，記錄預定時段、截止時間、完成時間、量化目標及狀態。日曆按檢視範圍展開週期，執行紀錄在有操作或匯入歷史時寫入。每週或每月的彈性任務在當日詳情顯示所屬週期，不排入時間軸。

統計以執行週期為單位。跳過與尚未到期的未完成週期不計入完成率。未到期但已完成的週期可計入。已到期的部分完成會影響完成率與連續完成次數。彈性任務至少用其實際週期為趨勢單位。

回復前先驗證新欄位及執行表有無資料。如果已有新版紀錄，應保留資料表、查詢權限及同步函式，並保留新版資料的備份。舊版畫面無法完整顯示新版週期及執行狀態。如果尚未寫入任何新版資料，可在交易內還原備份的同步函式、移除空的執行表與新欄位，再回退前端。舊資料表及原始習慣紀錄都保留。
