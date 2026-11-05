# Nexus — 當前狀態與下一步

產品見 [SPEC](SPEC.md)，技術契約見 [ARCHITECTURE](ARCHITECTURE.md)，決策見 [HISTORY](HISTORY.md)。

## 本輪待確認

世界觀地圖顯示窗沿用區塊與 Page／附件同步；新卡使用固定隨機抽樣，進行中 Session 不重抽。測試證據與尚未驗收項目以本輪 Draft PR 為準，未合併／未部署。

整組清除仍待使用者確認 Migration 方案，尚未提供可操作清除入口，也未新增或套用 Migration。現有單卡 generation 與事件聯集不能代表整組重置；建議以 owner／deck 的伺服器重置世代、穩定操作 ID 與既有鎖／outbox／增量 feed 完成原子重置，拒收舊世代 event／seed／resolution。字卡內容與設定不刪除；本機 Session、待同步事件及備份匯入必須遵守同一世代屏障，未核對伺服器世代的舊備份不可直接重新上傳正式進度。需先在隔離 SQL 測試驗證重試、舊客戶端、離線兩裝置與備份後，才可決定資料庫先行的發布順序；正式套用另需人工批准。

完整 `worldMapUI.browser.test.cjs` 的原生工具確認流程有間歇性逾時，相同環境下 main 也可重現；預設測試仍保留全部斷言。`MAP_SKIP_NATIVE_TRANSACTIONS=1` 可獨立驗證本輪區塊、人文正文、六次 SVG／PNG 匯出、共享更新與重新排序，不代表完整原生工具已驗收。Safari／iPad／Android 安裝版及既有離線工具快取的實機操作仍待確認。

## 目前工作

- 使用者確認清單資料基礎已合併且 Migration 已套用正式；本輪不重新套用、合併或部署。
- 我的清單新增 TanStack Table v9.3.1 表格與多層分類樹、欄位顯隱／順序、排序／篩選／分組。四種檢視共用原項目與編輯器；每帳號／清單的裝置偏好不寫 outbox。資料庫、同步、附件、IndexedDB v9 與備份 v4 契約不變；未加入拖曳或虛擬捲動。
- 以獨立 Draft PR 交付；相關模型、瀏覽器、資料回歸與 Build 證據以該 PR 為準，不能推論新介面已正式部署。

## 待驗收

- Safari／iPhone／iPad 實機表格水平捲動、分類樹、鍵盤／安全區域及安裝 PWA 操作。
- 真實帳號／跨裝置的既有同步與附件設定仍由正式驗收確認；純檢視偏好只保留本裝置，不新增同步機制。IndexedDB 升級／回復邊界維持 ARCHITECTURE 契約，不清庫、不降版。

三按鈕排程沿用既有 JSON 與 RPC，無資料庫 Migration。部署後需更新所有學習裝置：舊版無法驗證 `nexus-interval@1` 作答，應停止舊版學習並更新前端；不可刪除 IndexedDB 或重設進度來排除問題。回復舊前端不會撤銷新作答，需保留資料並重新提供可讀取新事件的前端；不可用舊引擎重算既有 due。
