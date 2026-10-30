# Nexus — 當前交接（2026-10-30）

## 本輪：承接 10/29 分支後的文件再編（Refs #116、#118）

- 基準為遠端 main `88fcbe115da8fac84d75fdb77c14c0bceaf6d489`。原對話工作目錄不可見，無法執行該工作樹的 git status／確認未提交修改；未假設原任務完成。
- 已依使用者指示先合併 10/29 分支 PR #117，main `88fcbe1`。該 PR 只改 SPEC，Vercel status 與 Preview Comments 檢查成功；可能觸發正式部署，實際 Production 尚未核實。
- 使用者確認：筆記僅流動；已修正 F-HOME 舊「分頁／流動」選擇文字，補入 F-NOTE。舊內容相容與 Document／簡報契約保留。
- ARCHITECTURE 改為現行模組、資料流、限制及待實作改善；[原架構完整參考](ARCHITECTURE-REFERENCE-20261030.md) 保留詳細契約與原文。改善提案不是已實作功能。
- 舊交付進度完整保留於 [交接歷史參考](HANDOFF-REFERENCE-20261030.md)。其中「本機未推送／未合併」是原紀錄，不能用作今天的分支／部署證據。
- GitHub 已核實 [PR #108](https://github.com/changmonica02/Nexus/pull/108) 於 2026-10-25 合併（`9a5659d`）；修正舊交接的未合併印象。本輪未核實 Vercel Production／正式 DB。

## #110 整合與本輪交付

- PR #110 已合併 main `a3bf6bd`；修正提交 `11281b3` 的兩組 GitHub CI 與 Vercel Preview 成功。#119 依使用者授權檢查後合併，Production 需另看實際部署。

- 已解決與 10/29 main 的規格／歷史／CI 衝突；保留 readonly 逐欄降級、寬內容適配與預覽重試，不變更正式 JSON／附件／同步。
- TypeScript、限定 ESLint、production/omit-dev build、note／workspaceSync 與 map 契約、五組實際 Chromium 成功。500 列 21 preview／21 PDF；四尺寸工作區通過。沒有 migration；正式帳號／實機未驗收。
- 使用者已授權處理 #110 後合併 #119；此段取代下方先前「僅草稿、不合併」的狀態。正式部署應以實際狀態記錄。

## 下一步與待決

1. 先盤點 Document 的 flow 實作與 A4 規格差異。筆記只流動的決策不自動取消其他功能契約。
2. 筆記輸出已提供本次逐欄降級與寬內容適配，仍缺長內容完整 fragmentation、原並排長雙欄一致性與手動預覽分頁入口；長雙欄閱讀順序／分頁設定是否保存仍待確認。
3. PWA 已有產品契約，主 Manifest／全站離線外殼尚未實作；第一批先外殼，沿用既有帳號與同步。
4. 後續量測 outbox backlog／transaction 與大文件 layout／heap，再採用 ARCHITECTURE 的改善方案。不得將效能假設當實測結果。
5. #60 保留正式帳號、跨裝置／重登入、Safari／行動裝置、真實 IME 與大文件驗收；本輪不結案它們。

## 驗證與交付邊界

- 本輪是文件變更；以固定 SHA 靜態核對來源、GitHub PR 狀態及文件差異。詳細測試來源見 ARCHITECTURE。
- 未執行 build、單元／瀏覽器／實機測試；歷史 CI 不改寫為本輪通過。
- 文件工作分支與 PR #119 經本輪核對後依使用者授權合併；本輪已授權並完成的 main 合併僅 PR #117。後續不合併 main，不執行 migration、正式資料寫入或部署指令。工作分支可能由既有設定產生 Preview，未將 Preview 當正式驗收。
