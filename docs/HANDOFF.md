# Nexus — 當前交接（2026-10-16）

產品契約以最新SPEC為準；實際元件、資料契約與Migration ledger看ARCHITECTURE。

## 本輪：第四輪 UI（#34／#45）

- Quiz：已移除產品掛載、Repository factory、正式同步串接及背景重試／計數；保留舊三個 store、佇列、歷史 RPC／migration 與離線安全測試。不做資料刪除或正式 SQL。首頁尚待本輪後續 PR。
- Quiz PR：77/77 單元／整合、1/1 正式學習瀏覽器組通過；TypeScript／Build 通過，ESLint 0 errors／459 既有 warnings。真實 iPad／Safari 的舊 Quiz 提示消失與正式學習操作仍由 #60 人工驗收。

- 字典：批次發布／恢復、返回／焦點與跨分頁後重取完整管理清單、精確分頁及審核統計，保留條件與 active Review Draft；無 Migration／正式資料操作。38/38 相關單元／整合、3/3 瀏覽器組（含刷新／跨分頁專用組）及 TypeScript／Build 通過；ESLint 0 errors／459 既有 warnings。

## 前輪：PR #65 已合併（#34）

- 基準main `2bfe520`，分支`feat/round3-ui-refinements`。已實作字典篩選順序／新狀態簡稱、五區收合與詞形編輯列、最新版本／草稿、審核入口簡化、Sidebar點擊／長按與獨立`/trash`、單項切換方向且保持開啟的共用排序。
- 保留原Bundle／Stable ID／Published／Review Draft／常駐決策、原owner私人資料與tombstone。無Migration或正式資料操作；字典批次發布僅沿用原人工確認流程，不在本輪執行。
- 119/119相關單元／整合及6/6隔離瀏覽器組通過，最終UI補強另重跑34項UI回歸與四尺寸工作區組通過。TypeScript／Build通過，ESLint 0 errors／464既有warnings；Preview／合併狀態見本輪PR。真實iPad／Safari／帳號驗收仍在#60。
- 角色卡組件、#62模板、工具進階與字典內容修正不在本輪範圍；#34保留其他未完成項。

## 字典常駐審核與舊工作

- PR #61已合併；使用者回報`20261015020759_dictionary_persistent_import_review.sql`已正式套用。本輪沒有另查正式ledger或執行SQL，不將人工回報誤寫為工具驗證。
- 原28筆僅為歷史資訊，不推定正式剩餘數量。先在原裝置備份原檔及Import Session JSON，從「先前本機匯入工作」轉移未完成項；沿用operation／Entry／Review ID與已選決策。已applied／unchanged／skipped不重做，待回覆操作仍以原UUID核對。
- 本機原項目及封存保留到確認遷移完整；不足以安全轉換的項目留待人工重新比對。本輪沒有讀取或遷移原裝置工作。

## 下一步

- 本輪PR通過檢查及Vercel Preview後依授權合併；自動部署與實機驗收分開記錄。
- 使用者在#60驗收桌面、iPad直橫向、手機的共用側欄／焦點與底部入口、隱藏恢復／工具／Web導航、建立與項目操作、字典三色及雙分頁。不要用真實字典大量作業驗證純UI。
