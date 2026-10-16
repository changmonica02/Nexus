# 創作模板資源庫：待授權資料庫啟用

> 2026-10-16 已唯讀核實正式 Nexus ledger：`20261016062716 creation_template_library`，與使用者回報一致；下方為操作／相容說明，不再代表此 SQL 待套用。本輪不重播。


## 狀態與相依

第五輪 F 提供增量 SQL `supabase/migrations/20261016040000_creation_template_library.sql`，**尚未在正式 Supabase 執行**。依賴已存在的 `auth.users`、`auth.uid()`、authenticated／anon 及 `public.is_dictionary_admin()`（沿用 Nexus 專案管理員名單，不採可由使用者修改的 metadata）。無需先套用官方私人字卡來源 Migration；兩項互不依賴。

前端先呼叫 `creation_template_capabilities()`，缺少函式、未登入或離線時，只顯示尚未啟用／無法連線，不啟動新讀寫；既有私人角色卡、模板、字典與學習功能不依賴新表。合併／Preview 不代表正式資料庫能力已啟用。

## 模型與權限

- `creation_templates`：穩定投稿 ID、作者／owner、角色卡或世界觀、官方標記、可見性、最新版本、下載數與來源授權快照。
- `creation_template_drafts`：僅 owner 可讀的結構草稿、單調遞增 revision。自動保存不修改公開版本。
- `creation_template_versions`：不可直接覆寫的發布版本；每個草稿 revision 最多發布一次。一般讀者可預覽公開來源歷史，下載 RPC 只接受當前最新版。
- `creation_template_downloads`：owner＋來源唯一的下載 receipt，固定私人 page ID。網路回覆遺失、重新整理或另一裝置重試不增加第二份副本／下載計數。新版本仍寫相同私人模板 ID，前端先明確確認；不更新既有角色卡。已刪私人模板不自動復活。
- `creation_template_reports`：具 operation ID 的檢舉；檢舉人及管理員可讀，只有管理員可處理。

五張表均啟用 RLS，只給 authenticated SELECT，無直接 INSERT／UPDATE／DELETE grants。`public.creation_template_mutate` 是 security invoker wrapper；具權限的實作放在**不得加入 Data API exposed schemas** 的 `nexus_private`，限定 authenticated 執行，固定空 search_path，逐項檢查 auth.uid、owner、admin、revision、來源授權與結構白名單。公開端不接受角色內容、個人數值、圖片、附件、examples 或未知欄位。資料與權限變更同一 SQL 交易。

作者第一次投稿確認後立即公開；新版仍須明確發布。來源改編預設禁止；首次發布重新檢查當前來源許可，保存作者／來源／許可快照。後續權限變更不追溯撤銷已合法發布的改編；新投稿重新驗證。作者可下架／重上架；管理員下架不能由作者重上架繞過。永久刪除需兩次 UI 確認及 RPC 來源 ID 確認，不修改他人的私人 pages 或角色資料。

## 已執行驗證的範圍

自動化使用隔離 PGlite PostgreSQL，載入既有真實字典 Migration／管理員函式及本次 SQL，使用 authenticated／anon／兩個 auth.uid 驗證；不是正式或遠端 Supabase staging。瀏覽器透過明示的本機測試 transport 呼叫同一真實 SQL RPC，私人副本使用真實 IndexedDB／Workspace 原子交易。Supabase Auth／PostgREST schema cache／正式 ledger／真實 JWT 與裝置尚待授權後核對。

本工作環境未提供正式 Supabase 連線與登入憑證。CLI 嘗試在唯讀 home 建立設定目錄而無法執行，未為此修改 home、正式設定或資料；未執行遠端 advisors。權限／函式 catalog 及 RLS 的隔離測試不能冒充遠端 advisors 或 staging 驗證。

## 正式套用順序（須另行授權）

1. 核對正式 ledger、相依管理員函式與角色；備份既有 pages／附件、私人模板及新資源庫表（若已存在）。確認 `nexus_private` 不在 exposed schemas，並以 Supabase advisors 核對權限。
2. 在獨立 Supabase staging 以同版本 Postgres、PostgREST／JWT 及兩個帳號套用 SQL，驗證 RLS、owner／admin、公開／私人隔離與 schema cache。既有隔離測試結果不能取代這一步。
3. 經使用者明確授權後，一次交易套用指定 SQL；不得以手動改表替代。重新整理 PostgREST schema cache（若需），確認 capability version 1 與 RPC 權限。
4. 使用已驗證的前端版本；真實帳號確認投稿、私人草稿、發布歷史、下載／重試、權限及來源更新提示。人工項目集中 #60。

## 回復

優先回復前端至前一已驗證版本，保留所有新增表及投稿／版本／下載 receipt。需要停用時，經授權撤回 capability 或 RPC 執行權限，使前端 fail closed。**不提供會刪除新使用者內容的 DROP／清空回滾**；修復以後續增量 Migration 進行。私人下載副本已獨立保存，不依賴來源存活。
