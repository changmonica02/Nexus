# Nexus — 當前狀態與下一步

更新：2026-10-30。產品見 [SPEC](SPEC.md)，技術契約見 [ARCHITECTURE](ARCHITECTURE.md)，決策見 [HISTORY](HISTORY.md)。

## 目前狀態

- #110 匯出改善與 #119 文件整理已合併 main；筆記僅流動，逐欄降級／寬內容適配／重試只作用於輸出副本。
- #110 整合已通過 TypeScript、限定 ESLint、production build、單元／契約與五組 Chromium；500 列表格 preview／PDF 各 21 頁，四尺寸工作區通過。這不取代正式帳號／實機驗收。
- 專案文件只保留 SPEC、ARCHITECTURE、HISTORY、HANDOFF；技術與交接追溯檔已移除，必要現行契約歸 ARCHITECTURE。本次 SPEC／HISTORY 不變，只改文件與協作指引，未修改程式／DB。
- 使用者授權接下來直接在 main 修改；推送可能觸發 Vercel Production。部署狀態以實際 commit 查驗，不以舊交付紀錄推定。

## 下一步

1. 釐清 Document 目前 flow 與 A4 產品契約。
2. 補筆記長段落／超高合併格分頁、原並排雙欄一致性與手動分頁入口；雙欄閱讀順序及分頁設定保存仍待確認。
3. PWA 先做安裝與外殼，再整合本機資料／更新，重用帳號與同步。
4. 量測大文件 layout／heap、outbox backlog，再採用 ARCHITECTURE 的優化提案。
5. #60 保留正式帳號、跨裝置／重新登入、Safari／行動裝置、真實 IME 與大文件驗收。

本次文件清理僅檢查檔案範圍、連結、衝突標記及 SPEC／HISTORY 未變；不重跑程式測試，不把上一輪結果寫成本輪測試。
