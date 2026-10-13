# Nexus — 當前交接（2026-10-13）

> 只記錄**當前事實、待辦、阻礙及下一步**。產品需求看 `docs/SPEC.md`，已實作技術及資料契約看 `docs/ARCHITECTURE.md`，歷程及決策看 `docs/HISTORY.md`，開發規則看 `AGENTS.md`，任務細節及驗收清單以 GitHub Issues 為準。歷次報告、舊任務目錄及已退場方案不在此重述；需要溯源時查 Git 歷史。

## 已完成／已確認

- **main基準**：PR #46、#50、#51、#52、#54 已合併；#54僅核實Git合併，不由此推論獨立正式Ready／驗收；#52 merge commit `3d4bfaa9914a8603a123cba5f9d78ce19835a406`。GitHub 合併分支自動刪除已由使用者啟用。
- **正式 Supabase**：已套用 `20261020_dictionary_edit_inflections.sql`、`20261021_dictionary_composition_shared.sql`、`20261013064759_dictionary_pagination_totals.sql`。最後一項遠端 ledger 為 `20261013072108 dictionary_pagination_totals_20261013`；搜尋 RPC 具有 `total`。套用後唯讀查得 6,301 Entries／6,305 Senses／4 Review Drafts（動態數字，非固定規格）。
- **#42** 已完成使用者正式環境驗收並結案。#41 原有 Published 直接編輯、儲存 Review Draft、同頁發布等核心流程曾由使用者驗收。
- **#49** 使用者回報正式網站以下三項人工驗收通過：總頁數呈現、點擊頁碼以 Enter／手機完成跳轉、無效輸入留在原頁且保留搜尋／篩選。Codex 本輪相關測試 100/100、TypeScript 與 Build 通過、ESLint 0 errors／468 warnings。
- **證據界線**：#52 GitHub Commit 的 Vercel check 為 success，使用者亦回報正式網站功能已測；Vercel API 尚無法獨立查閱 Production Ready（連線 403）。不要把 Preview 或單一 CI check 當作獨立正式部署證據。

## 尚未完成／需追蹤

| Issue | 目前狀態 | 下一步 |
| --- | --- | --- |
| [#41](https://github.com/changmonica02/Nexus/issues/41) Published 編輯 | 權限、Review Draft、版本衝突及 Published 保護的自動測試通過；**舊 Review Draft 不覆寫較新 Published 尚未人工驗證** | 依使用者決定暫保留自動測試證據，若要完整人工驗收再補做；不得誤記為通過 |
| [#49](https://github.com/changmonica02/Nexus/issues/49) 共用分頁 | 新版已合併，三項正式人工驗收已回報通過，Issue 仍開啟 | 核對 Issue 驗收範圍後決定結案；不要把 #41 的待驗項混作 #49 未完成 |
| [#47](https://github.com/changmonica02/Nexus/issues/47) 學習 Session | PR #54 完成統一學習／正式排程／無盡練習，相關自動測試通過；使用者決定本次不另做人工驗收 | 合併 #54 後以本次測試證據結案；Session 本機保存，跨裝置不接續相同進度 |
| [#48](https://github.com/changmonica02/Nexus/issues/48) 偏好設定 | PR #54 完成功能化分類與各學習集同步設定；相關自動測試通過；使用者決定本次不另做人工驗收 | 與 #47 同步合併、結案 |
| [#44](https://github.com/changmonica02/Nexus/issues/44) 大量匯入／匯出 | #44 已開發完整JSON交換、批次匯入／發布與本機恢復；111項自動case通過，**未部署／正式驗收** | 審查整合PR；先批准本次SQL、再批准合併／部署，正式驗收後人工結案 |

## 開發與部署注意事項

- 一人使用、單一正式 Supabase、資料現為測試資料；優先精簡開發流程，維持必要的權限、版本安全與 Schema 相容檢查。
- 新需求先對照 Issue／SPEC。Codex 從最新 `main` 建分支，完成實作、測試後更新 ARCHITECTURE／必要進度文件，使用 PR；**合併至 main 會觸發 Vercel 正式部署**。
- #47／#48 交付測試：單元／整合93/93、桌面／平板／手機瀏覽器1/1，TypeScript／Build 通過，ESLint 0 errors／467既有 warnings；依使用者決定本次略過人工驗收，正式部署仍由 PR 合併後的 Vercel 進行。
- #47／#48 不需 Migration；正式四表／RLS／RPC 已唯讀核對，隔離 SQL 測試通過。兩台同時離線的新卡配額仍受既有同步邊界限制，勿宣稱全域原子配額；Session 進度僅本機保存。
- #44待批准SQL：`20261013084116_dictionary_bulk_exchange.sql`（依賴現有#41/#42及四參數批次發布）。唯讀schema／ledger已核對；不重播歷史Migration。TypeScript／Build通過，ESLint 0 errors／467既有 warnings。最低正式確認：完整匯出原樣比對、Published修改只進Review、手機暫停／刷新恢復及確認發布。
- 新增正式 Supabase Migration 先核對既有遠端 ledger 及依賴，取得使用者授權後才套用；涉及前端依賴時依序先 SQL、後部署。
- Issue 須按實際正式環境驗收狀況人工結案；PR 請使用 `Refs #...`，不要以 `Closes/Fixes` 自動關閉。
- 不要依照舊 HANDOFF 快照重新執行 13 份詞庫匯入或歷史 migration；後續以正式資料庫現況及最新 Issue 為準。
