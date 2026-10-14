# Nexus — 當前交接（2026-10-14）

產品契約看 SPEC；已完成技術看 ARCHITECTURE；本頁只記錄現況與下一步。HISTORY本輪未查看／修改。

## 已確認

- main基準 `8024ab2`：PR #54、#56已合併；PR #57仍為開發分支，未合併。合併main會觸發Vercel Production，不以Git合併或Preview推論正式Ready／人工驗收。
- 正式Supabase **唯讀核對**：#41／#42、分頁及#44 ledger存在；#44遠端為 `20261014040405 dictionary_bulk_exchange_20261013084116`，對應repo `20261013084116_dictionary_bulk_exchange.sql`。刪除／全域發布／報告RPC及authenticated／anon ACL已核對。本輪沒有正式Migration、資料刪除／寫入／發布或部署。
- #42已完成使用者實機驗收並結案。#49三項正式人工驗收已有回報，Issue仍開啟。#41核心直接編輯已驗收，舊Review不覆寫較新Published仍缺人工驗收證據。
- GitHub #47／#48已結案；PR #54已合併，沿用使用者不另做人工驗收的決定。本輪逐項程式／測試核對符合SPEC，沒有重寫學習流程或將新功能混入#57。

## 当前交付與待辦

| 工作 | 實際狀態 | 下一步 |
| --- | --- | --- |
| PR #57 管理字典 | 移除清單選取／全選／本頁發布／批次刪除；全域發布不受瀏覽條件影響；persisted Draft編輯頁安全單筆刪除已實作／測試 | 審查及另行批准合併；部署後最少確認：篩選／搜尋下全域預覽範圍不變，單筆刪除取消／成功返回刷新，Published無刪除入口 |
| #44 大量交換 | PR #56已合併，正式SQL ledger與函式已核實；Issue仍開啟 | 確認正式完整匯出／匯入、Published只進Review及手機恢復的最終驗收；完成後人工結案，不重播Migration |
| #41 Published編輯 | 既有權限／Review／衝突保護回歸通過 | 若要求完整人工驗收，補測舊Review遇較新Published；本輪未冒稱通過 |
| #49 分頁 | 使用者正式三項驗收已回報，Issue仍開啟 | 依管理流程人工結案 |

## 本輪驗證與限制

- 字典116/116＋學習35/35單元／整合，瀏覽器3/3，共154項；TypeScript／Production Build通過，ESLint 0 errors／467既有warnings。詳細範圍與初次fixture修正見PR #57／ARCHITECTURE；沒有刪除、跳過測試。
- 本次無新增Migration、權限或資料模型變更。普通使用者／Published／revision／外部關聯保護沿用既有RPC；Review及歷史保留。
- 字卡既有界線：各學習集設定；舊有效上限保留，未設定fallback50／新集每日新卡20；同裝置Session，兩台同時離線不能原子共享新卡額度。均已在SPEC說明，不擴充本次UI PR。
- #44作業仍只支援同裝置恢復；舊篩選發布作業不顯示為全域續作，原本機紀錄保留。
- 正式環境／實機验收未由本輪隔離測試取代。PR使用Refs，不自動關Issue；正式Migration、合併與部署需另行授權。不要重播歷史SQL或13份舊詞庫匯入。
