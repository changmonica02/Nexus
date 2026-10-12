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
- 帳號隔離相關 migration：`20260913_account_isolation.sql`；帳號刪除方案詳見本檔下方的技術規則及 `20260929_account_deletion.sql`。
- 離線快取、同步、刪除及多裝置一致性的實際狀態，應以測試與環境配置驗證，不能只憑文件宣稱。

## 5. 部署與操作邊界
- GitHub 提供程式與文件版本管理；若 Vercel 與 GitHub 正式分支相連，push 可觸發部署，需在 Vercel 實際設定確認。
- PR／純文件修改不代表 production 已部署。部署成功、migration 已套用、正式資料已匯入是三種不同的事。
- 絕不將 Supabase service-role key 或其他憑證提交進公開儲存庫。

## 6. 待補齊的設計
完整資料表清單、API 契約、模組依賴圖、離線同步衝突規則、環境變數索引（僅名稱，不含值）與部署拓撲，須依現行原始碼及正式環境資訊補齊。


### 帳號刪除：原專項文件完整技術規則（移入本檔）
> 原始來源：`docs/account-deletion.md`（已移入本檔）；原始文件描述的是當時設計與本機驗證，**不得推論正式環境已啟用**。

**部署／啟用前提**
- 由管理者審核後依時序套用 `supabase/migrations/20260929_account_deletion.sql`；新增的 Quiz／字源百科 migration 應先於此 migration。
- 舊報告明確表示該次開發未套用 production migration、未刪除真實帳號、未部署；目前 production 是否啟用須另行驗證。
- `delete_own_account` RPC 尚未安裝時 UI 應提示伺服器尚未啟用；不得靠用戶端模擬成功。

**認證與刪除交易**
- RPC `delete_own_account(confirmation_email, confirmation_text)` 只允許 `authenticated` 呼叫。
- 帳號 ID 只由已驗證 JWT 的 `auth.uid()` 取得，禁止傳入客戶端指定 owner ID。
- RPC 鎖定當前 `auth.users` 列，驗證電子郵件及確認字串後刪除該使用者。
- 函式固定空 `search_path`、使用 schema-qualified 物件；不可在前端配置 service-role key。
- owner 外鍵連接 `auth.users` 並採 `ON DELETE CASCADE`，涵蓋筆記、附件、二進位附件、Study、Quiz 和**已安裝**的舊字源百科資料。
- 整體操作為一個資料庫交易；任一外鍵、constraint 或 trigger 失敗必須完整回滾，不繞過未知外鍵。由既有 Supabase Auth 關聯處理登入 session 的移除。

**相容性、共享資料與離線限制**
- 新增 owner 外鍵採 `NOT VALID` 保留既有孤兒資料，同時約束新增／修改操作，以避免刪除帳號後未過期 JWT 再建立 owner 資料。
- 此流程不清理 `owner = null` 的共用舊資料，也不修改已部署的舊 migration。
- 目前附件存放於 `public.binaries`，沒有呼叫 Supabase Storage API；將來若引入 Storage bucket，必須另設實體物件清理流程。
- 成功後，應依 owner 清除 IndexedDB 紀錄和附件二進位快取、登出並返回首頁；其他帳號與一般偏好不受影響，不修改 IndexedDB version。
- 其他裝置上的既有離線副本無法遠端抹除，但伺服器會拒絕被刪除 owner 的新寫入。
- 如網路中斷且成功回覆遺失，須要求使用者重新登入確認結果，不能先清掉本機資料或宣稱成功。

**驗證證據與界線**
- 本機測試命令：`node --test tests/accountDeletion.test.cjs`。
- 該測試使用本機 PGlite 及 `fake-indexeddb`，涵蓋確認字串、匿名拒絕、他人隔離、完整 cascade、失敗回滾、刪除後寫入拒絕及只清除目前 owner 本地快取。
- 測試不連 Supabase；通過本機測試不等於正式系統已安裝或驗收。


## 7. 由 Canonical Spec 移入的跨模組資料契約
- Nexus 基本模型為 Page／Block／Property／Workspace View／Page Mode；`pages.content_json` 是 TipTap JSON 正文唯一真相，`content_text`、search index、outline、links、tasks/events projection 為可重建衍生資料，**不可**反向覆寫正文真相。
- 內容統一由 `StorageAdapter` 讀寫，擴充以 kind + mode-specific 欄位保留資料語義；附件／binary 獨立保存，以 storage key 關聯。復原、備份、同步和刪除須保留 soft-delete 與關聯完整性。
- 同步以帳號為邊界，`SyncEngine` 僅在登入後執行；pages、attachments、binaries 的查詢／更新／Realtime 應帶 owner 篩選，本機再驗 owner；切換帳號或登出必須取消舊同步 token，避免跨帳號 UI 洩漏。
- 學習資料需分 Deck/Page 與獨立 `study_cards`、`study_states`、append-only `study_events`、`study_settings`；舊 `Page.study_items` 是遷移來源，不能直接刪除或覆寫。字卡寫入由 RPC、事件 ID、outbox／receipt 保護冪等，不允許直接刪除歷史事件。
- Quiz 經 `apply_study_quiz_operation` 與 operation receipts 防止重送重複計分；離線答題需經使用者確認才上傳。雙裝置衝突要保留事件，不得以簡單 last-write-wins 蓋過正式學習歷史；頁面同步的 B2 conflict／version history 仍未完成。
- `quick_note` 和 `todo` 都是 pages kind；不要復活已廢棄的獨立 stores。Novel 設定／角色區塊與講義 `content_json.lessonLayout` 等是 kind-specific contract，變動前先核對 `src/lib/types.ts` 和 migration。
- Presentation block 保存相對座標 `x/y/w/h`、`rotation`、z-index；Chart options 與實際 renderer 尚可能有落差；須驗證 reload、縮放、旋轉、匯出與同步。
- 製譜統一核心、簡譜／五線譜／吉他譜 adapters 為待驗證／規劃，不應假定某種文字語法已穩定。PDF workspace 對 annotation、page anchor、asset/reference 的 schema 仍需 Discovery。
- 注意來源層級：舊 2026-09-25 快照與交接報告只反映當時狀態；以當前 repo + schema + test 為實作證據，正式產品行為以最近確認的 SPEC 為目標。
