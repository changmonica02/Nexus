# Nexus 技術架構與資料結構

> 狀態：依 2026-10-12 儲存庫可見檔案建立的技術索引，非完整架構審計。**存在 migration 檔案不代表正式 Supabase 已執行**；實際部署與資料庫狀態必須另行核驗。

## 1. 技術基礎
- Web：Next.js 16、React 19、TypeScript（見 `package.json`）。
- UI / 編輯：Tailwind CSS、TipTap 等套件。
- 資料與身份：Supabase JS、SQL migrations（`supabase/migrations/`）。
- 學習演算法：`ts-fsrs`。
- 其他：程式碼可見 IndexedDB／離線相關依賴；各模組同步語意需依程式碼與測試核對。

## 2. 原始碼與資料庫位置
- `src/app/`：路由和頁面，包含 `dictionary/`、`etymology/`、`study/`。
- `src/lib/`：共用邏輯和工具。
- `src/` 其他目錄：元件及功能程式碼，依實際目錄追蹤。
- `supabase/migrations/`：逐次資料庫 schema / RLS / RPC 變更。
- `tests/`：自動化驗證；`scripts/`：工具與資料處理腳本。
- `data/`：受版本管理的資料與匯入素材；勿視為線上正式資料庫。

## 3. 字典與個人學習的架構約束
- 產品目標是單一共享公共字典 + 依使用者隔離的私人單字卡；舊的 owner-scoped etymology schema 可能仍因相容性或遷移而存在，**不是目標產品架構的依據**。
- Entry 與 Sense 分層；既定詞條身分規則為 `kind + trim/lower(headword)` 的唯一性，應以 `20261017_dictionary_entry_identity.sql` 與目前程式實作核對。
- 發音與 Sense 的設計可參考 `20261018_dictionary_pronunciations.sql`；不得僅據檔名認定已套用到正式環境。
- 相關遷移範圍包括 `20260930_public_dictionary.sql`、`20261001_dictionary_admin.sql`、`20261003_study_dictionary_links.sql`、`20261013_dictionary_draft_pipeline.sql`、`20261014_dictionary_revision_lifecycle.sql` 等。
- UI 只控制是否顯示操作；後端 RPC、RLS／權限策略必須防止未授權寫入。
- Schema 修改不得無計畫破壞正式資料、既有 Entry/Sense ID、外鍵連結或使用者學習紀錄。先評估 migration、回滾和測試。

## 4. 帳號與刪除資料
- 帳號隔離相關 migration：`20260913_account_isolation.sql`；帳號刪除方案見 `docs/account-deletion.md` 及 `20260929_account_deletion.sql`。
- 離線快取、同步、刪除及多裝置一致性的實際狀態，應以測試與環境配置驗證，不能只憑文件宣稱。

## 5. 部署與操作邊界
- GitHub 提供程式與文件版本管理；若 Vercel 與 GitHub 正式分支相連，push 可觸發部署，需在 Vercel 實際設定確認。
- PR／純文件修改不代表 production 已部署。部署成功、migration 已套用、正式資料已匯入是三種不同的事。
- 絕不將 Supabase service-role key 或其他憑證提交進公開儲存庫。

## 6. 待補齊的設計
完整資料表清單、API 契約、模組依賴圖、離線同步衝突規則、環境變數索引（僅名稱，不含值）與部署拓撲，須依現行原始碼及正式環境資訊補齊。
