# Nexus — 當前交接（2026-10-16）

產品契約以 SPEC 為準，技術契約看 ARCHITECTURE；真實裝置驗收集中 #60。

## 第五輪開發（#34／#43／#62）

- PR A #69 已合併：Word 詞性／中文／刪除移入各 Sense 緊湊列，保留空白義項、ID 與原安全流程，無 Migration；驗證與交付狀態見 PR。
- PR B 已實作官方來源／私人連結分離，增量 SQL `20261016030000_official_private_card_identity.sql` 未套用正式環境；capability 缺少時保留既有功能。隔離驗證與交付狀態見 PR。
- 接續順序： 學習中管理員字典浮窗 → 角色卡區塊／組件 → 私人模板 → 投稿資源庫 → 同來源模板安全更新。未開發項不得視為已完成。
- 正式 Supabase Migration／資料寫入未授權；新能力須以 capability 安全隔離，SQL 先隔離驗證、待授權套用。

## 前輪 UI（#34／#45）

- PR #66 已合併：Quiz UI、Repository factory 及背景同步／重試退場，保留舊歷史、離線佇列、stores、恢復契約及 SQL migrations。77/77 單元／整合、正式學習瀏覽器組通過；TypeScript／Build 通過，ESLint 0 errors／459 既有 warnings。
- PR #67 已合併：發布／恢復／返回／焦點／跨分頁重新取得完整字典管理清單、精確分頁及統計。保留搜尋、篩選與 active Review Draft。38/38 單元／整合、3/3 瀏覽器組及 TypeScript／Build 通過，ESLint 0 errors／459 既有 warnings。
- 首頁分支已實作緊湊同排工具列、不分類預設、資料夾／功能獨立收合、搜尋及原選取／排序／選單；37/37 單元／整合、2/2 瀏覽器組通過（含六尺寸首頁與四尺寸完整工作區）；TypeScript／Build 通過。Preview／合併結果見本輪 PR。其他功能建立入口保留。
- 無新增 Migration、正式資料庫讀寫、字典匯入／發布或官方集重建。既有正式字典與四組官方集資料不變；部署成功與使用者實機驗收分開記錄。

## 常駐審核與既有待辦

- PR #61 的常駐審核 Migration 已由使用者回報正式套用；本輪沒有另查正式 ledger。原 28 筆只是歷史資訊，不推定目前剩餘數量。
- 舊匯入工作仍先在原裝置備份原檔及 Import Session JSON，再由「先前本機匯入工作」轉移未完成項；保留 operation／Entry／Review ID、已選決策及本機封存。已 applied／unchanged／skipped 不重做，不足以安全轉換者人工重新比對。
- 真實 iPad Safari：首頁各尺寸分類／選取／排序、正式學習無 Quiz 提示、字典發布後清單與 Review Draft 狀態；四組官方集下載驗收仍在 #60。
- #34 其他未完成項、#27 拼寫、角色卡重構、#62、工具進階、PDF 新設計不在本輪。
