# Nexus — 當前狀態與下一步

產品見 [SPEC](SPEC.md)，技術契約見 [ARCHITECTURE](ARCHITECTURE.md)，決策見 [HISTORY](HISTORY.md)。

## PR #151：已實作，待審查／正式啟用

既有分支 `feat/world-blocks-study-reset` 已同步 main `f5e0600`。世界觀地圖區塊、固定隨機新卡與「複習紀錄」更名沿用本 PR 原有變更；本輪完成整組清除，不建立新 PR、不修改 HISTORY、不合併或手動部署。

清除採最後伺服器時間與穩定操作 ID，不使用整組世代。原始作答 ID／時間／評分／設定快照／原排程不改寫；每事件只附一份目前有效投影，原事件與投影分別驗證，清除後合法離線作答從清空狀態重算 due，事件及複習次數不重複。沿用 outbox、feed、單卡 generation、resolution CAS、IndexedDB v9 與備份 v4。管理頁「清除學習紀錄」及複習紀錄頂欄右側「清除紀錄」共用名稱確認／登入連線檢查，清除後重讀 Session、歷史、統計與當日新卡額度。正式事件、seed、legacy、resolution 與備份均受相同屏障保護；無法驗證的原始資料隔離保留待恢復，並提供提示及備份保存，不作為新排程。

驗證完成：
- `npx tsc --noEmit`、`npm run build -- --webpack` 通過。相關 ESLint 為 0 errors／29 warnings（包含既有 NexusApp 與 StudySetView warnings），未停用規則。
- 19 個資料／模型／同步回歸測試檔共 164 項通過：study*.test.cjs（排除 browser）、scheduledStudy、unifiedStudySync、officialStudyPacks、worldMapIndexedDB、lifeLists、workspaceSync。包含新增 12 項清除測試：清除前後離線作答、原快照重算與不重複計數、連續清除、雙裝置衝突／relearn、回覆遺失／本機提交失敗／重試、舊 Session、v1／v4／偽造屏障備份、legacy／官方直接 seed、權限／投影篡改及 Migration／交易失敗回滾。6,301 張卡隔離測試通過；本環境該次清除＋本機更新約 28 秒，單一清除 RPC／交易，非逐卡網路請求，不推定正式效能。
- `node tests/studyClear.browser.test.cjs`：真實 Chromium → 測試 HTTP RPC → 隔離 PostgreSQL → IndexedDB／畫面，驗證兩入口、名稱確認、鍵盤焦點、離線拒絕、遺失回覆原操作重試、繁中／English 及 1280／820／390／320px，並驗證查看字卡不出現第三入口。
- `node tests/unifiedStudy.browser.test.cjs`：既有正式學習、六間隔、舊批次轉換、快照、額度、無盡提前複習與英文回歸通過。

Migration `20261105032115_study_deck_clear.sql` **只在隔離 PGlite PostgreSQL 測試，未套用正式環境**。下一步先審查 SQL 與發布／回復契約；正式啟用需另行授權，先確認正式 schema／備份，再套用指定 Migration、驗證 RPC／權限，最後發布相容前端並更新所有學習裝置。main 連動 Production，現階段建議維持 Draft、不直接合併。不能以舊前端／舊 RPC 回退或清庫修復；正式 schema 漂移、真實帳號兩裝置及 Safari／iPad／Android PWA 仍待驗收。歷史 FSRS 完整重算仍由釘選 TypeScript 引擎驗證，SQL 檢查結構／前置狀態／計數，不聲稱有完整 FSRS SQL 引擎；正式三按鈕與歷史 fixed 另驗 SQL 公式／due。

原有完整 `worldMapUI.browser.test.cjs` 原生工具確認的間歇性逾時仍未解決，前輪相同環境 main 也可重現；本輪未重跑完整地圖原生／匯出瀏覽器測試，不將其列為通過。原生地圖、PWA 安裝及既有離線工具快取的實機驗收維持原待辦。

## 目前工作

- 使用者確認清單資料基礎已合併且 Migration 已套用正式；本輪不重新套用、合併或部署。
- 我的清單新增 TanStack Table v9.3.1 表格與多層分類樹、欄位顯隱／順序、排序／篩選／分組。四種檢視共用原項目與編輯器；每帳號／清單的裝置偏好不寫 outbox。資料庫、同步、附件、IndexedDB v9 與備份 v4 契約不變；未加入拖曳或虛擬捲動。
- 以獨立 Draft PR 交付；相關模型、瀏覽器、資料回歸與 Build 證據以該 PR 為準，不能推論新介面已正式部署。

## 待驗收

- Safari／iPhone／iPad 實機表格水平捲動、分類樹、鍵盤／安全區域及安裝 PWA 操作。
- 真實帳號／跨裝置的既有同步與附件設定仍由正式驗收確認；純檢視偏好只保留本裝置，不新增同步機制。IndexedDB 升級／回復邊界維持 ARCHITECTURE 契約，不清庫、不降版。

三按鈕排程沿用既有 JSON 與 RPC，無資料庫 Migration。部署後需更新所有學習裝置：舊版無法驗證 `nexus-interval@1` 作答，應停止舊版學習並更新前端；不可刪除 IndexedDB 或重設進度來排除問題。回復舊前端不會撤銷新作答，需保留資料並重新提供可讀取新事件的前端；不可用舊引擎重算既有 due。
