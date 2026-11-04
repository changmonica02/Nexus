# Nexus — 當前狀態與下一步

產品見 [SPEC](SPEC.md)，技術契約見 [ARCHITECTURE](ARCHITECTURE.md)，決策見 [HISTORY](HISTORY.md)。

## 目前工作

- 使用者確認清單資料基礎已合併且 Migration 已套用正式；本輪不重新套用、合併或部署。
- 我的清單新增 TanStack Table v9.3.1 表格與多層分類樹、欄位顯隱／順序、排序／篩選／分組。四種檢視共用原項目與編輯器；每帳號／清單的裝置偏好不寫 outbox。資料庫、同步、附件、IndexedDB v9 與備份 v4 契約不變；未加入拖曳或虛擬捲動。
- 以獨立 Draft PR 交付；相關模型、瀏覽器、資料回歸與 Build 證據以該 PR 為準，不能推論新介面已正式部署。

## 待驗收

- Safari／iPhone／iPad 實機表格水平捲動、分類樹、鍵盤／安全區域及安裝 PWA 操作。
- 真實帳號／跨裝置的既有同步與附件設定仍由正式驗收確認；純檢視偏好只保留本裝置，不新增同步機制。IndexedDB 升級／回復邊界維持 ARCHITECTURE 契約，不清庫、不降版。

三按鈕排程沿用既有 JSON 與 RPC，無資料庫 Migration。部署後需更新所有學習裝置：舊版無法驗證 `nexus-interval@1` 作答，應停止舊版學習並更新前端；不可刪除 IndexedDB 或重設進度來排除問題。回復舊前端不會撤銷新作答，需保留資料並重新提供可讀取新事件的前端；不可用舊引擎重算既有 due。
