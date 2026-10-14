# Nexus — 技術架構與資料契約（完整 Canon 遷移版）

> 本文件記錄已確認技術契約與經實作驗證的架構；使用者核准的產品決策以 SPEC 為準。**#44 已由 PR #56 合併 main；2026-10-14 唯讀核實正式 Migration ledger／RPC 已存在。PR #57 的管理 UI／單筆刪除已在分支實作與測試，尚未合併；正式部署／人工驗收狀態不由 Git 合併或 Migration 推定。** 已存在的 migration 或程式碼不代表已在正式環境部署。舊交接原文已從工作樹移除，仍可在 Git 歷史追溯。


## 一、不可推翻的架構與權限原則

## 2. 不可推翻的架構原則

### 2.1 五概念模型

```
Page           — 可連結的內容外殼
Block          — Page 正文內的內容原子
Property       — 結構化 metadata
Workspace View — 看一批資料的系統視圖
Page Mode      — 看單一 Page 的方式
```

### 2.2 資料真相與衍生資料

```
pages.content_json = 正文唯一真相（Tiptap JSON）
content_text       = 搜尋、預覽、排序、摘要等衍生資料
attachments/binary = 正文外的資源，透過 StorageAdapter 關聯
```

`content_text`、search index、links、outline、tasks/events projection 都可重建，不能取代 `content_json`。

### 2.3 Storage 與刪除

- UI／Editor 只經由 `StorageAdapter` 存取資料。
- 一般 Page 刪除採 soft delete；Trash 提供 restore。
- 永久刪除只在 Trash 內觸發；第一版不自動清除可能共用的 attachment／binary。
- Backup、Sync、version history 必須尊重資料真相與 soft-delete 語意。

### 2.4 Creatable 與弱聯動

所有主要內容可共用 Page shell，但可保有 mode-specific data。高層生成物（Document、Presentation、Website、Study Set）可以記錄來源，**不要求來源變更後自動覆蓋生成物**。

---

## 二、資料類型、表與本地儲存契約

## 5. 現行資料模型與儲存契約

> **重要：** 以下是功能層需要維持的資料契約。精確 TypeScript union、欄位與 store migration 必須以 workspace source 的 `Q-0` 核對為準；舊 Canon 曾存在 DB_VERSION 2 與 3、PageKind 範圍不同的快照。

### 5.1 共用 Page Shell

所有主要 Page 至少須具備：

```
id, title, content_json, content_text,
created_at, updated_at, deleted_at,
revision, device_id,
tags, folder, links,
attachment_ids, primary_attachment_id,
kind, format, is_favorite,
sort_order, parent/subpage relationship（若目前 source 有使用）
```

### 5.2 Kind 與 mode-specific data【修改】

| 類型 | 真相位置 | 說明 |
| --- | --- | --- |
| Note | Page + `content_json` | rich editor 主體；講義設定在 `content_json.lessonLayout` |
| Document | Page + `content_json` | plain editor／Markdown workflow |
| PDF Research Note | Note Page + Attachment | 不是獨立 pdf_research kind |
| Study Set | Page（學習集殼）+ 獨立 `study_cards`／`study_states`／`study_events`／`study_settings` | 舊 `Page.study_items` 保留為遷移來源（D-215、D-216） |
| Presentation | Page + `presentation_data` | Slide／Block 資料不塞進一般正文邏輯 |
| Quick Note | `pages`，`kind: "quick_note"`（`color`） | 獨立 store 已廢棄（D-186） |
| Todo | `pages`，`kind: "todo"`（`due_date`、`priority`、`completed`） | 獨立 store 已廢棄（D-186） |
| 角色卡／世界觀 | `pages`，`kind: "creative"`，`creative_type: character／world`，`character_data` | 含 `tabs`、`world_id`、`templateId` |
| 角色卡模板 | `pages`，`kind: "creative"`，`character_data.isTemplate = true` | 帳號擁有，隨備份與同步；不出現在一般清單 |
| 小說作品 | `pages`，`kind: "creative"`（非角色類），`novel_settings` | 封面為附件 |
| 小說章節 | `pages`，`kind: "novel_chapter"`，`parent_id`、`sort_order` | 一般清單過濾 |
| 網頁／計數／抽選 | `pages`，`kind: web／counter／draw`，資料在 `content_json`（`links`、`intro`／`counters`／`draws`） | D-218 |
| 頁面附屬說明 | `Page.assistant_blocks` | 屬於該頁，不獨立開啟 |

### 5.3 Attachment / Asset

```
Attachment metadata 與 binary payload 分離。
PDF、未來 image insert 等資源走 Attachment / Asset abstraction。
Page / Presentation / Canvas / Website 應引用資源，不直接把 blob 塞入 content_json。
```

### 5.4 IndexedDB、Backup 與 Sync coverage【修改】

| Record 類別 | Local store | Backup | Sync | 現行狀態 |
| --- | --- | --- | --- | --- |
| Pages（含各 kind、章節、模板） | `pages` | 有 | `pages` 表（owner_id RLS） | 🟡 需 Q-0／Q-9 核對遠端欄位與 `kind` 約束 |
| Attachments／binaries | `attachments`／`binaries` | 有 | 有 | 🟡 binaries 本機未按帳號分區（D-200） |
| Settings（語言、夜間適配） | `settings` | 依 backup settings 策略 | 本機偏好，不同步 | 🟡 |
| 功能排序、最近使用 | **localStorage** | 否 | 否 | 裝置本機偏好 |
| 字卡／狀態／事件／設定／session | `study_cards`、`study_states`、`study_events`、`study_settings`、`study_sessions` | 備份 schema v3 的 `study`（含 sessions） | `study_*` 四表＋RPC `apply_study_operation`；本機 `study_outbox`，sessions 僅本機 | 2026-10-13 唯讀核對正式四表／RLS／RPC；#47／#48 前端待部署 |
| 測驗答題與分數 | `quiz_attempts`、`quiz_states`、`quiz_outbox` | ⚠️ 是否進備份需 Q-0 核對 | `study_card_quiz_states`、`study_quiz_attempt_receipts`＋RPC `apply_study_quiz_operation` | ⚠️ 遠端 migration 狀態未知 |
| Quick Notes／Todos | 統一在 `pages` | 有（同 pages） | 有（同 pages） | 🟡 |

### 5.5 IndexedDB 結構【新增】

- 資料庫 `nexus`，`DB_VERSION = 8`、`BACKUP_SCHEMA_VERSION = 3`（本輪不升版）。
- Stores：`pages`、`attachments`、`binaries`、`settings`、`study_cards`、`study_states`、`study_events`、`study_settings`、`study_sessions`、`study_outbox`、`study_sync_meta`、`workspace_outbox`、`workspace_sync_meta`、`quiz_attempts`、`quiz_states`、`quiz_outbox`。
- `pages` 與 `attachments` 使用本機欄位 `workspace_owner_id` 做帳號快取邊界（不上傳雲端）。
- 舊 DB 可能殘留 `quick_notes`／`todos` store：程式碼不再讀寫，未清理。
- v7 workspace 持久化與 v8 Study 索引已有程式與測試；更早版本的遷移仍以 source `upgrade` 為準。

### 5.6 內嵌於 content_json／JSON 欄位的資料契約【新增】

| 資料 | 位置 | 說明 |
| --- | --- | --- |
| 講義設定 | `Note.content_json.lessonLayout` | 樣式、字級、行距、標題比例、頁首頁尾、頁碼 |
| 教學節點 | `content_json` 內 `lessonBlock`／`answerSpace`／`lessonToc` | Tiptap schema 已通過 JSON 往返測試 |
| 網頁 | `content_json.{intro, links[]}` | — |
| 計數 | `content_json.counters[]` | `{id,name,value,group?}` |
| 抽選 | `content_json.draws[]` | `{id,label,tags[]}` |
| 角色卡 | `character_data` | 見 F-CHARACTER |
| 小說設定 | `novel_settings` | 見 F-NOVEL |

> 注意：`web`／`counter`／`draw` 的 `content_text` 目前被寫成整份 JSON 字串（`UtilityView` 內 `content_text: JSON.stringify(...)`）。這與「`content_text` 是可讀衍生資料、用於搜尋預覽」的原則不完全一致，可能污染搜尋與預覽；列為 `Q-0` 核對項。

---

## 三、資料安全、備份、雲端同步及恢復

## 8. 資料安全、Backup、Sync 與恢復

### 8.1 Local-first 與 Backup

- 本機 IndexedDB 是第一層可用資料來源。
- Backup v0 使用 JSON + binary base64，import 為完全覆蓋且需二次確認。
- `schema_version`、atomic IndexedDB transaction、reload 是既定安全要求。

### 8.2 帳號 Workspace Sync【取代舊「Shared Workspace Sync」】

- 舊 B1（無登入、共享 workspace、RLS allow all）已被 D-198／D-203 取代：**登入必須制，資料按 owner_id 隔離**。
- **頁面同步**：`SyncEngine` 取得登入 user_id 後才啟動；pages／attachments／binaries 的查詢、Realtime、upsert、delete 皆帶 owner 篩選；本機資料亦再次篩選 user_id（防禦性）。`pages` 推送欄位含 `kind`、`study_items`、`presentation_data`、`sort_order`、`parent_id`、`due_date`、`creative_type`、`character_data`、`novel_settings`、`assistant_blocks`、`margins` 等。
- **字卡同步**：`syncStudy` 走 Supabase RPC，事件先按前序送出，以事件 ID 去重；雲端確認後才移除本機 outbox；遺失回應可安全重送；舊裝置首次遷移寫入為 insert-only，不能覆蓋新版內容。伺服端權限：用戶端只可讀自己的資料列，寫入只能透過 `security definer` RPC，且禁止直接刪除事件。
- **測驗同步**：`apply_study_quiz_operation` 以 advisory lock 與事件收據保證冪等；離線作答須經使用者決定（上傳／捨棄／稍後）才會進 outbox（D-217）。
- **同步競態**：只允許最新一次 `startAccountSync` 更新 UI；登出與 React Strict Mode cleanup 使舊 token 失效。
- **B2 未完成**：頁面層級 last-write-wins **不可作正式行為**（字卡層已有事件鏈式衝突偵測，頁面沒有）。

### 8.3 B2 必要規格方向

```
revision conflict detection
保留兩個版本而非靜默覆寫
手動解決 UI
版本歷史快照
offline / reconnect / delete / attachment / backup import 行為
```

個別資料結構、retention、版本比較 UX 在 MVP-4 開工前需另行確認。

---

## 四、品質驗證、相容與移轉條件

## 9. 品質、驗證與相容性規格

### 9.1 最低驗證層級

| 層級 | 用途 |
| --- | --- |
| TypeScript | `tsc --noEmit`，型別與介面基本安全 |
| Build | Next production build，避免 compile-only 誤判 |
| jsdom / 真實 Editor | 複雜 ProseMirror／NodeView／transaction 行為 |
| Playwright | 互動、版面、列印、選單、拖曳等瀏覽器驗證 |
| 真實瀏覽器／使用者驗收 | 最終 UX、focus、IME、selection、部署差異 |

### 9.2 驗收規則

- 不可將「文件寫完成」或「build 通過」直接標示為使用者驗證完成。
- 重要資料任務應含 reload、backup restore、sync／offline、migration 回歸。
- 每個未來工作包需在 00 寫入任務 ID、開始狀態、驗證證據與剩餘依賴。

### 9.3 自動化測試檔【新增】

`tests/`：`characterWorkspace`、`novelChapters`、`pullToRefresh`、`lessonDocument`、`studyFSRS`、`studyPractice`、`studyRepository`、`studySessions`、`studySync`（在隔離 PGlite 實際執行 PostgreSQL migration）、`quizPersistence`、`quizQuestions`（皆 `.test.cjs`）；驗證說明：`creative-workspace.md`、`lesson-workspace.md`、`study-workspace.md`、`workspace-interactions.md`。指令：`node --test tests/*.test.cjs`。

---

## 五、實際程式碼核對與原 Canon 修正（2026-10-12）
- `src/infrastructure/storage/IndexedDBAdapter.ts`：`DB_VERSION = 8`、`BACKUP_SCHEMA_VERSION = 3`，舊 Canon 的 v6 僅是歷史。
- `src/features/study/studyFSRS.ts`：FSRS-6、`request_retention = 0.90`、learning / relearning 10m。
- `src/features/dictionary/entryIdentity.ts`：`kind:lowercase(trim(headword))`；對 SQL `btrim` 的實際一致性須測試。
- `src/features/dictionary/importReview.ts`：Safe/Review、衝突操作與 session 流程的程式結構已存在。
- `src/features/score/ScoreWorkspace.tsx`：製譜工作區已有程式碼，不宜描述為完全未開始。
- `src/infrastructure/sync/syncEngine.ts`：owner-scoped Realtime 篩選存在；RLS 和正式資料庫仍需另外驗證。
- 帳號刪除 RPC / owner 外鍵 / NOT VALID / IndexedDB 清除技術細節先前已搬至舊版 ARCHITECTURE；本輪保留如下：

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

## 六、技術查證依據
- 正式 SQL schema 以 `supabase/migrations/` 與 production migration ledger 交叉核對；僅有 migration 不代表已套用。
- 技術驗收需對照現行 SPEC、已存在的 migration、測試及正式環境，未實際核對者不得宣稱通過。

## 公共字典管理權限與 UI 的責任分離（2026-10-12）
- UI 的管理入口只對已有管理權限的使用者顯示；登入工作階段已能確認身分，不設重複的管理員確認步驟。
- **入口可見性不是授權控制**。公共字典新增、修改、發布、匯入等受保護操作仍需在後端依經核實的 Auth UUID／管理員角色逐次驗權；直接發出 API/RPC 請求的普通使用者必須被拒絕。
- 規劃 RLS／RPC／API 權限設計與雙帳號測試時以此作硬性安全前提，避免只靠前端按鈕顯示條件保護公共資料。

## F-STUDY 四選一測驗取消後的技術退場邊界（2026-10-12）
- 新的產品目標不包含 Study 四選一測驗。本文前述 Quiz stores、RPC、migration、測試路徑僅用於記錄現有／歷史資料結構及退場盤點，**不表示新規格仍要求 Quiz 功能**。
- 保留相容性與資料安全：任何移除 Quiz 資料表、RPC、IndexedDB stores 或修改既有 migration，均需先核對實際部署與資料量、備份／還原、同步與帳號刪除依賴，再取得獨立批准；不得讓退場影響 FSRS 學習歷史。
- 筆記編輯器的題目與選項為獨立的通用內容工具，與被取消的 Study 測驗分開。

## 公共字典 Entry／Sense 與匯入資料契約（由 SPEC 分流；2026-10-12）

> 以下描述已規劃的技術資料模型與匯入保護，**不是產品 UI 規格，也不代表已核實目前部署狀態**。使用者目前確認的管理頁匯入視窗只接受 CSV；歷史 JSON／AI 等處理途徑是否仍需要保留，必須以程式碼、API 與後續產品決策核對。

- 同一 `kind + lower(btrim(headword))` 對應一個 Entry；多個詞性、釋義、詞源或語義以多個 Sense 表達；stable Entry／Sense IDs 維持引用完整性。
- POS／gloss 與適用於個別語義的 etymology、example、learning content、pronunciation 歸屬 Sense；Entry 共用內容另行表達，避免跨 Sense 覆寫。
- Sense-aware pronunciation 原候選欄位：`id, entry_id, sense_id nullable, locale nullable, ipa, note nullable, sort_order`，另含 revision／updated_at；`sense_id` 必須屬相同 Entry。實際 migration 與 schema 仍須查證。
- 匯入階段先預覽及驗證，區分 Safe／Review／Invalid；Apply 重新確認 snapshot／revision／狀態／權限；保留稽核收據及冪等性；批次切分不能拆散同一 Entry 的 Sense。
- Word CSV runtime 曾採五欄：`entry_id,sense_id,headword,part_of_speech,gloss_zh_tw`。Canonical master CSV v1 曾採十二欄：`kind,entry_id,sense_id,headword,part_of_speech,gloss_zh_tw,category,etymology,example_words,source_forms,relation_hint,mnemonic_story`。二者用途不同，**最終匯入 UI 格式與轉換流程仍須核定**。
- `relation_hint` 為候選關聯，`source_forms` 為字形註解；`levels` 供 Official Study Pack manifest 使用，與公共字典內容分類分離。
- Inflection／Derivation 應具不同語義；如何建立欄位或關聯模型，待產品規格確認。

## F-DICTIONARY｜正式目標架構與資料契約（2026-10-12）

> **適用邊界**：此節包含部分歷史技術目標；現行實作必須以最新 main 驗證，與 #44 不一致的 CSV-only 敘述以 SPEC 新決策為準。此節是 Codex 應對照現有程式碼實現的架構目標。既有資料庫 migrations 已存在（20260930～20261018）；本節不等於實際 production schema 已經逐項驗證，也不授權立即執行 SQL、刪表或批次匯入。產品畫面及文案以 `SPEC.md` 的 `F-DICTIONARY — 字典` 為唯一依據。

### A. 系統邊界與分層

- **Public Dictionary**：全站單一公共資料域，包含 Word／Prefix／Root。一般登入使用者透過 Reader 僅取得已發布內容；管理員可建立 Draft、編輯、匯入、預覽、審查、發布與刪除。字典資料不以使用者 owner_id 建立私人複本。
- **Private Study**：個人字卡及其 FSRS 狀態、學習事件、設定、學習集均由使用者持有；卡片透過穩定 Entry ID 指向公共字典。字典更新只能影響字典詳情的顯示，不可自動覆寫私人卡片文字或排程。
- **前端呈現**：DictionaryBrowser 負責公共清單、搜尋、篩選、詳情及來源上下文；DictionaryAdmin 負責管理清單及批次操作；DictionaryEditor／相關編輯模型供管理頁和詳情頁右上角「編輯此詞條」共用，避免兩套存檔實作。
- **資料服務**：Reader RPC／query 層、Draft／Revision／Publish 層、CSV import/export adapter、Study entry link adapter 各自有明確契約。畫面只呼叫服務層，不自行直接更新受保護資料表。

### B. 核心資料模型（邏輯關係；實際名稱以 migration 核對）

| 實體 | 主要欄位／關係 | 必要約束 |
| --- | --- | --- |
| `dictionary_admins` | `user_id`（指向 Auth UUID） | 管理權限由已核實的 Auth 使用者身分授予 |
| `dictionary_entries` | `id`, `kind`, `headword`, `status`, `revision`, 發布時間 | kind = word／prefix／root；同 kind 的 normalized headword 唯一；Entry ID 穩定 |
| `dictionary_senses` | `id`, `entry_id`, POS, `gloss_zh_tw`, sort_order／revision | 一 Entry 對多 Sense；Sense ID 穩定且僅隸屬一 Entry |
| `dictionary_pronunciations` | `id`, `entry_id`, `sense_id?`, `ipa`, `locale?`, `note?`, `sort_order` | sense_id 為空表示 Entry 共用；若有值則須屬同 Entry |
| 詞源／構詞／學習註釋 | Entry ID；適用時帶 Sense ID；關聯目標 Entry／Sense ID | 各義項的來源、構詞、口訣和記憶資料彼此隔離；相同詞源內容可按來源分組呈現 |
| Draft／Revision／Publication | Entry ID、修訂版本、內容快照、發布狀態 | 編輯正式詞條先建立 Draft／revision；審查後主動發布；舊版本完整保護 |
| `dictionary_audit`／操作收據 | actor、action、target、版本、操作時間／冪等標記 | 新增、編輯、匯入、刪除與發布可追溯；只由受保護服務寫入 |
| 私人字卡詞條關聯 | user／card ID、public `entry_id` | FK／存取權與刪除語意先核對現有 `study_*`；不改寫私人排程 |
| 官方學習包 manifest | pack、published Word Entry ID、順序／級別 | 學測 1–2、3–4、5–6 級；下載建立用戶私人 Study Set，不建立第二份公共字典 |

**Entry identity**：`kind + lower(btrim(headword))` 相同即同一 Entry，並以 Sense 區分詞性、釋義、不同詞源與語義；匯入新詞／編輯既有詞時先解析既有 Entry 與 Sense，對無法確定的對應給 Review，不能自動破壞不同義項的資料。

**資料完整性**：使用受保護 RPC 或等效交易完成多表異動；套用時重新檢查權限、版本、Entry／Sense 關聯與衝突。支援可安全重試及具來源的操作稽核。變體、分類及構詞關聯如已有專表／JSON 欄位，先核對現況再決定保留或遷移，避免另建平行資料模型。

### C. 權限、發布及刪除

- **Client UI**：字典管理入口及詞條詳情的「編輯此詞條」僅管理員可見。使用現有登入狀態即可操作，無第二次確認管理員身分的互動。
- **Backend / RLS**：所有草稿讀寫、CSV 匯入、發布、刪除、編輯及稽核寫入，依 auth.uid() 與 dictionary_admins 等可信資料在伺服器逐次驗權；隱藏按鈕不視為權限保護。匿名與一般使用者必須無法直接修改公共資料。
- **Reader**：只返回已發布快照及符合讀者資格的相關 Sense、讀音、詞源、構詞關係；禁止從 Reader洩漏 Draft、審查意見、未發布修訂或管理員專用記錄。
- **變更與發布**：已發布 Entry 的新修改進入 Draft／review，管理員確認才切換 Published；批次匯入也走相同生命週期，避免匯入即公開。
- **刪除**：區分未發布草稿清除與已發布詞條處置；已發布詞條若存在私人字卡連結／官方包引用，必須先有引用完整性策略（限制刪除、退役或保留可查引用等）。**具體刪除語意尚待核准，不得任意 hard delete**。

### D. CSV 相容匯入／匯出（完整交換見 #44）

- **CSV 相容匯入操作**：管理字典 →「匯入」→浮動視窗 → 選擇受支援的交換檔案 → 解析／驗證 → 預覽（Safe、Review、Invalid）→ 確認寫入 Draft → 審核／發布。Word／Prefix／Root 均必須有可定義的 CSV 處理方式。
- **現有格式差異**：`dictionaryCSV.ts` 含 12 欄 Dictionary CSV v1 和 Word 舊五欄；`adminImport.ts`／DictionaryAdmin 仍含 Markdown／JSON／AI 相容路徑。Codex 必須先確認這些路徑是否被其他內部／migration／管理工具呼叫，再移除或封存不屬於管理 UI 的功能。
- **資料無損要求**：CSV 欄位契約需可完整表達產品要求的多 Sense、Entry／Sense 讀音、變體、詞源及構詞關係，或明確定義 CSV 對這些內容僅部分支援並由管理 UI 防止不完整匯出／覆寫。**在使用者核准完整 CSV schema 前，不得聲稱 CSV 可以全量無損 round-trip**。
- **匯出**：管理介面提供資料匯出；明確標示全部／篩選範圍、草稿／正式內容範圍與資料完整性。若目前 CSV 無法無損保存完整詞條，需阻止誤導性的「完整備份」敘述並回報缺口；不得靜默丟失讀音或 Sense 關聯。
- **批次安全**：檔案大小／列數／編碼、錯誤列提示、同 Entry 多 Sense 群組、預覽後來源版本變化與重試冪等需有驗證及測試；運輸分批大小屬效能參數，不應固定成舊歷史 13 批方案。

### E. 前端互動、狀態及邊界

- **進入字典**：字卡 →「字典」→公共字典；頂部「←返回字卡」「字典」「管理字典（僅管理員顯示）」。下方是搜尋框「查詢英文、中文」、「搜尋」、「篩選」，篩選浮層含 Word／Prefix／Root 三種，預設全選。
- **詳情頁**：返回實際來源並保留 query、filters、scroll、順序上下文；上一筆／下一筆依來源結果排序，手機和平板支援左右滑動；管理員右上角「編輯此詞條」直接進入同一詞條編輯器。
- **內容元件**：相同詞源的註釋由一個來源視覺容器承載，內部保留多段落／義項資訊；多詞源清楚分組。展示讀音、變體、種類、義項、口訣、記憶、詞源及構詞關聯。
- **管理頁**：工具列提供「新增」「匯入資料」「匯出資料」「發布全部草稿」；新增以 Word／Prefix／Root 下拉切換同一編輯面板。清單不再提供核取／全選／本頁選取發布／批次刪除；類型與狀態的篩選核取保留。單筆刪除移至已儲存 Draft 編輯頁，詳見 PR #57 章節。
- **分頁／搜尋**：搜尋字面與繁中義項，並根據三類勾選組合篩選；需確認原有 Reader 分頁、索引及約 7,000 筆規模的效能，不在前端整批載入所有詞條。
- **深連結與狀態**：詳細詞條若由書籤或公共 Entry 連結開啟且缺少來源清單，現行介面提供預設返回目的地；編輯未儲存時使用 useUnsavedDraft 的儲存／放棄／繼續編輯與原生 unload 保護。

### F. 實作先後與安全門檻

1. 先核對 migration ledger（20260930～20261018）、production 權限、既有 SQL/RPC、TypeScript model、Reader、Editor、Official Pack／Study link 與備份依賴；列出已符合、缺少、不一致與未驗證，不假設每一個 migration 已在遠端套用。
2. 再提交 CSV 無損性及刪除語意、返回深連結等未決設計，取得核准後調整 schema／RPC 與 service adapter。
3. 隨後整合 UI（入口、管理按鈕、搜尋與篩選、上一筆／下一筆、返回、右上直接編輯、按來源合併註釋）；管理頁完整交換使用 #44 JSON，CSV／Markdown／AI Diff 保持相容。
4. 最後測試普通用戶與管理員、未授權直接 RPC、草稿隔離、匯入 Safe/Review/Invalid、發布、重複提交、CSV 匯出資料完整性、跨裝置字卡連結、窄螢幕與 7,000 筆搜尋；部署 SQL 與執行遠端寫入須另行取得批准。


## 文件更新界線（Issue／SPEC／技術實作）
- 已核准的產品行為在實作前由 `docs/SPEC.md` 記錄；此處不把 Issue 規劃自動當作現行技術實作。
- Codex 開發並驗證後，依最新程式碼／migration／測試補寫實際資料表、RPC、模組、效能限制及回復策略；必須區分 repo 已實作與正式 Supabase 已套用。
- #44 現行完整交換已採用 JSON Exchange v1，schema、往返及恢復契約見後段；CSV 為相容格式，不能標示為完整資料庫備份。


### G. #41／#42 相容實作（已實作；正式環境待驗證）

- PublishedWorkspace 讀取完整 Published snapshot 與 active reviews，立即提供可編輯表單。未修改不建草稿；單筆 active review 直接續編，多筆要求明選。首次儲存用 `create_dictionary_edit_review` 在同一鎖／交易中檢查 active review、建立並儲存完整 candidate；後續以 `save_dictionary_review` 核對 revision。發布只呼叫既有人工核准 RPC。版本錯誤保留輸入，提供編輯備份及受離開保護的重新載入。
- `useUnsavedDraft` 對站內連結、編輯區的版本操作及瀏覽器 history navigation 提供儲存／放棄／繼續編輯；原生 beforeunload 保護重新整理／離站。對話框使用 native dialog 並還原觸發控件焦點。公開閱讀端返回仍沿用原來源 URL。
- 新增 `dictionary_inflections(id,entry_id,sense_id?,form_kind,form,sort_order,revision,updated_at)`。它是 Entry 附屬記錄，沒有公開 Entry 身分；同 Entry／Sense／類型／正規化詞形防重，相同拼寫可屬不同類型或不同 Sense。詞性對應與 Sense 所屬關係由 TypeScript、FK 和伺服器驗證；直接資料表寫入未授權。此版只儲存人工指定的形式，不做規則猜測。
- 詞形納入 canonical DraftInput、Review candidate、Published snapshot／diff、JSON Bundle、AI JSON roundtrip、Safe／Review import 與稽核。Editor 的完整草稿儲存可在同一 revision 交易移除被刪去的附屬詞形／關聯；部分匯入的省略仍保留舊資料與構詞順序：一般 `mapDictionaryDraft` 不傳 `component_order`，完整 Editor save／Review save 才明確傳入排序。舊 Review snapshot 缺少新欄位時以空陣列正規化比對，關聯陣列比較以穩定 ID 正規化；歷史原文不回填、不重寫。
- `dictionary_relations` 保留所有 ID／目標 Sense FK，來源 `sense_id` 支援 null（詞條共用）；構詞模型不含關聯種類／查證狀態／查證說明。舊 SQL 欄位只供無損相容與歷史保留。擴充 Word 成分並拒絕自身連結。排序**沿用既有 `dictionary_ai_metadata.component_order`**，不建立平行排序模型。選取器只列已發布候選，DB 仍允許既有批次匯入暫時指向 Draft 成分；發布前必須先發布所有目標，維持舊批次安全機制。
- 舊 `source_forms` 原文繼續保存在 lexical annotations，編輯器僅移至收合相容區塊，不轉換為詞形。CSV v1 沒有詞形欄位，含詞形的 CSV 匯出明確拒絕；完整交換使用 #44 JSON Exchange v1，JSON Bundle／AI JSON 亦保持原流程；CSV schema 不變。
- `search_dictionary_with_inflections` 合併 headword／中文義項及**索引可確認的 exact 詞形**，結果帶 `inflection_matches`，保留原形與同形詞；Reader 標示匹配原因，詞形以文字而非新 Entry 連結顯示。反向構詞改用直接來源 Entry FK embed，涵蓋詞條共用及指定義項；分類篩選仍用原查詢。
- 新 Migration：`supabase/migrations/20261020_dictionary_edit_inflections.sql`，依賴既有字典 migrations 至 20261019。只有新表／索引／RLS／trigger 及 RPC replacement，無既存資料清除或 backfill。PR #46開發當時只在隔離PGlite執行；其後已由正式ledger `20261013041717 dictionary_edit_inflections_20261020` 核實套用，現不可當成待執行SQL重播。若回退應保留新表與附屬資料，停用新 UI／RPC；不能以刪表當作回滾。
- 自動化：`tests/dictionaryEditInflections.test.cjs` 驗證升級舊 review、ID／Sense／詞形 roundtrip、衝突、隔離、發布／歷史與權限；`tests/dictionaryEditor.browser.test.cjs` 以模擬 RPC 和 Chromium 驗證桌面／390px 手機的編輯、焦點、返回及保存／發布。瀏覽器測試需 `npx playwright install chromium` 或設定 `BROWSER_EXECUTABLE`；所有 fixture 僅在臨時 HTTP server 運作，無正式資料服務。


#### #46 合併前驗證補充（已實作／隔離測試通過，Supabase staging 未驗證）

- 部分匯入的排序相容回歸測試可重現原候選以空排序覆蓋 metadata；只在完整編輯器存檔附帶 `component_order` 後，既有 Review overlay 保留原順序。Migration SQL 無新增改寫，正式 DB 未操作。
- 同一 `dictionaryEditInflections.test.cjs` 可用 PGlite 或 `NEXUS_TEST_POSTGRES_CONTAINER` 指定的本機 PostgreSQL 執行。`postgresContainer.cjs` 只接受 `nexus46-*` 名稱、`nexus.test=pr46-local` 標籤且 `network=none` 的本機 Docker；固定 local Unix socket、不接受外部 DB URL，測試資料庫隨測試建立／清除。驗證 PostgreSQL 15.19 的舊 snapshot 相容、第一次儲存 race（兩個真實連線僅一個 active review）、草稿／Published 隔離、FK／詞性／多義项、RLS／helper execute 權限及刪除稽核。
- Docker 測試使用獨立 tmpfs、無 host port；bootstrap `auth.users`／`auth.uid()` 是 fixture。此結果不等同 Supabase Auth、PostgREST schema cache、真實使用者 JWT 或遠端 staging migration ledger 驗證；正式套用前仍須以獨立 Supabase staging、實際角色／帳號及代表性資料驗收。
- ESLint TypeScript 設定只適用 TypeScript 檔，React override 適用 Next.js 插件支援的 source extensions，避免掃描 CommonJS fixtures 時找不到插件。未降低應用程式規則嚴重程度；`eslintConfig.test.cjs` 確認條件式 Hook 仍報 error。全站既有 warnings 保留揭露。


#### #42 正式驗收修正（程式已實作；遠端部署待驗證）

- `DictionaryRelation` 現行欄位為 ID／Entry ID、可空來源 Sense ID、目標 Entry／Sense ID、revision／updated_at；順序沿用 `dictionary_ai_metadata.component_order`。`compositionRow` 在 Editor、canonical Draft、Review snapshot／diff 和 AI 邊界移除三個退場屬性，省略來源 Sense 視為 null。JSON／AI 接受舊交換檔作相容輸入，但新模型／AI 匯出與公開 RPC 不再輸出或依賴三欄。歷史詞源自己的查證欄位不屬本次撤除範圍。
- 單義項新關聯預設共用且不渲染來源義項控制；多義項管理員預設「不分義項／詞條共用」，可指定 Sense。既有明確 Sense 不重綁；Reader 只按資料呈現，沒有管理控制。**目標** `target_sense_id` 仍必填，保留既有 composite FK；單義項目標自動採其 ID，多義項目標需選定，避免歧義。
- 新增 `20261021_dictionary_composition_shared.sql`（依賴至 20261020）：開放來源 Sense null，增加 `dictionary_relations_source_entry_fkey` 以維持共用列的來源 Entry 存在性；來源 composite FK、目標 FK、原 RLS 保留。反向搜尋直接 embed 該 Entry FK，仍於伺服器過濾、排序、分頁。新增 scope trigger 以來源 Entry／可空 Sense／目標 ID 防新重複，不以舊 relation_kind 區分。既有同 scope 的歷史有效列不合併、不刪除；不改綁的更新保留 ID，前端以既有 revision 識別相容列，DB 仍驗證新建與改綁。
- 三個 legacy SQL 欄位及既有約束暫留，無 DROP COLUMN／回填或正式資料清除；新建 SQL 列使用相容預設，但這些值沒有查證或種類的產品語義。`apply_dictionary_bundle` 與 Review materialization 忽略傳入 legacy 屬性，既有列的值保留；admin／public RPC 投影移除三欄。快照比較僅在記憶體正規化忽略退場屬性，既有 Published revision／Review base 原文不改寫；舊 active Review 可繼續操作。
- 查證門檻放在**人工發布契約**：`publish_dictionary_entry`、`approve_dictionary_review`、`publish_dictionary_bulk` 新 overload 要求 `content_verified=true`，UI 的人工確認明示內容／構詞依據已完成查證。舊可公開呼叫的 signatures 撤銷 authenticated／anon／PUBLIC execute，僅作受保護內部實作；缺少或 false 確認不可發布。新增私有 RLS 表 `dictionary_publication_confirmation` 保存交易／actor capability，trigger 阻擋直接 Draft→Published；舊 Review 驗證仍用既有 approval capability，避免 preview 即發布或破壞 Review lifecycle。成功發布同交易寫 `dictionary_audit.operation=PUBLISH_VERIFIED`；批次紀錄對應 preview session 及本批數量。此為管理員的查證聲明及稽核，不能自動證明語言學真實性，也不回填宣稱所有舊 Published 已查證。
- 部署需先備份、核對 ledger／函式 owner／RLS、在獨立 Supabase staging 套用 20261021，再驗證 PostgREST overload 與新 FK embed、真實 JWT／管理員及普通帳號。SQL 包含 `NOTIFY pgrst,'reload schema'`，仍需實測 schema cache。新版前端依賴新 schema／RPC；Migration 會阻止舊前端發布，應安排協調上線窗口。回退保留相容欄位、新表、資料與歷史，必要時暫停管理發布等待修正，不以刪表或降低發布門檻回滾。
- 隔離測試覆蓋舊 active Review／版本原文、legacy 值與重複列保留、共用／指定來源 Sense、目標 FK、新重複拒絕、人工查證確認、直接寫入拒絕、批次發布與權限。最終全專案 230/230、TypeScript／Production Build 通過、ESLint 0 errors／473 既有 warnings；新增構詞測試 PGlite 2/2、本機 PostgreSQL 15.19 2/2。PGlite 及本機 PostgreSQL（Auth fixture）結果不是遠端 Supabase／PostgREST／正式帳號驗收；桌面及手機 Chromium 亦為隔離 RPC 測試，正式裝置驗收仍需另行完成。


#### PR #51 同步後遠端核對（2026-10-13；僅唯讀）

以下為當次套用20261021之前的歷史盤點，不能當作目前未套用狀態；其後已套用20261021／分頁／#44 ledger，最新狀態見 HANDOFF。當時 Supabase connector 讀取的 schema：PostgreSQL 17.6、20261020 功能表與舊發布 signatures 已存在，RLS 啟用；來源 Sense 尚不可空，20261021 的新 FK／查證 overload／capability 尚未套用。構詞當次查詢為 0 列。遠端 ledger 只記錄 `dictionary_edit_inflections_20261020`，較早 schema 缺完整重播紀錄；隔離 staging 的建立須核對基底與依賴，不能視分支初始化為完整 schema 的保證。沒有正式 DDL／資料寫入／ledger 修補。

目前帳號只列一個正式專案且無開發分支，尚無遠端 staging 驗證結果。`supabase/tests/20261021_composition_staging_verify.sql` 是套用後的唯讀 catalog／權限檢查，不執行 Migration，也不替代真實 Auth JWT、PostgREST FK embed／RPC overload／cache 或帳號／UI 驗收。main 的正式部署規則已隨 `650d0a2` 同步至 PR 功能分支，PR 不合併，正式環境不部署。


## #49 共用資料列表分頁與 #41 收尾（已合併；驗收界線見 HANDOFF）

- `src/components/pagination/model.ts` 集中 ceil 總頁數、整數頁碼驗證及資料變動時有效頁邊界；輸入驗證回傳 null 拒絕，不偷偷 clamp。內部及既有 URL／RPC 保持 zero-based，UI 顯示 one-based，空集合 0／0。
- `Pagination.tsx` 為上一頁／中央原位頁碼／下一頁。text input＋numeric inputMode／done hint，Enter 提交、Esc 取消、失焦取消，焦點選取／還原；沒有額外確認按鈕或巢狀 form。以 Nexus Tailwind／theme tokens 排版。使用現有 LanguageContext／i18n；獨立字典路由無 provider 時沿用繁中預設。舊服務尚未提供 total 時只保留原導航，不捏造總頁數或開啟跳轉。
- `usePagedList` 用查詢 key／page／retry 的請求識別管理最後成功資料，effect cleanup 忽略過期回應；載入／失敗不把確認頁數與資料混配。錯誤可重試，快速再跳頁允許最後請求勝出。搜尋／篩選不共用錯誤的舊結果；資料縮減讓頁面越界時依新 total 轉最後有效頁。
- 套用：公共字典搜尋（含構詞反查／變體）、Prefix 義項分類、Root 分類、管理詞條清單、構詞候選 dialog、字卡編輯的手動字典連結、評分背面字典候選、批次字卡連結建議。A4 筆記、簡報及角色卡內容頁模型不變。
- 管理清單及反向／變體查詢使用既有 Supabase select 的 exact count，在相同篩選、排序及 range 取回可信 root Entry 數；不做客戶端全字典掃描。PR #57 已移除管理清單選取；搜尋／分頁保留，發布使用全域範圍。批次建議以本地合乎條件字卡及 RLS 隔離的現有雲端連結 ID 建立確定 dataset，最多每批查 200 個 ID，再以每頁 10 筆並行載入建議；total 為實際未連結卡片數，不把已跳過卡片算進頁數。
- 新 SQL `20261013064759_dictionary_pagination_totals.sql` 由 CLI 產生，僅更新五個既有搜尋 RPC 的回應 `total`（構詞候選另補 page）；既有 predicate、Published／管理員限制、函式簽章及 ACL 保留。使用同一 matches CTE 計算完整 count 與頁面，Prefix 分類計 Sense 列、其餘計 Entry。classic `search_published_dictionary` 加入 all，字卡 All 搜尋改為單一全域排序分頁，不再把三種 kind 的獨立頁拼成一頁。舊客戶端可忽略新增 key。
- **套用依賴**：正式 DB 需先具備字典 migrations 至 20261021，SQL 有前置 guard；當次開發未套用正式Migration，其後已核實遠端ledger `20261013072108 dictionary_pagination_totals_20261013`，現不需重播。倉庫舊migration使用8碼歷史日期，不能將CLI timestamp與舊檔名排序視為可靠重播順序；函式 owner／ACL、schema cache、結果 totals／普通使用者隔離一併核對。無新表、無資料清除、無寫入／發布權限變更。
- #41 核心流程沿用 PR #46／#51，沒有另建發布流程。使用者本輪回報兩 PR 已正式部署且核心操作已實機驗收；本輪技術核對另涵蓋 admin／普通角色、Draft／Review／Published 隔離、查證確認、stale base／revision、重新開啟與失敗恢復。普通角色的自動化測試不是正式第二帳號實機測試；依單人測試階段的精簡標準記錄為「等待正式部署與最終驗收」，不自動關閉 Issue。

- 本輪交付驗證：字典＋分頁 100/100（無 skip）、TypeScript／Production Build 通過、ESLint 0 errors／468 warnings；桌面 1280×900 與手機 390×844 隔離 Chromium 驗證 7 個實際元件場景（分類共用 Prefix／Root 元件）、頁碼／條件／焦點／連續請求／錯誤重試／資料縮減。PGlite 測試新 SQL 的總筆數／頁面條件一致、普通角色隔離及函式 ACL 保持不變；正式 DB 僅唯讀核對 #41 已部署權限，沒有正式 Migration／帳號寫入。


## #47／#48 統一排程 Session 與功能化偏好（2026-10-13）

**PR #54 已合併；本次核對實作／本機測試通過。GitHub #47／#48 已結案，沿用使用者不另做人工驗收的決定；不以此宣稱本次獨立查證 Production Ready。**

- `scheduledStudy.ts` 為可測試的選卡／可用性資料流。`planScheduled` 使用各集 `review_limit ?? 50`、每日 introduction distinct ID＋state 作新卡額度；新卡優先／混合／複習優先及最早 due／低 FSRS retrievability／隨機排序。New＋跨日 Learning／Relearning＋Review 才計批次名額；當日已開始短間隔用 `last_review`／`due` 當地日界判斷，優先到期插入且不再扣名額。未選入的卡不寫 state，也不提前拿未到期卡補位。
- `StudySession.mode = scheduled` 增量保存在既有 `study_sessions`，每 target 保留 generation、`counts_toward_limit`、完成標記，批次凍結 quota_limit／study_mode。`refreshScheduled` 以真正 due 建立 ready／waiting／blocked 狀態，保留未完成批次與不同卡名額；刪除／重設 generation 排除失效目標，排程衝突則阻擋完成並引導返回處理。跨日仍未到期的 learning 留給後續批次，不提前評分。
- `StudyRepository.presentScheduled` 在交易中確認新卡呈現，建立 `kind=introduce, source=scheduled`；純選卡不扣每日額度。`rateSession` 對 scheduled 的**每次真實作答**建立 `kind=review, source=scheduled`，原參數／engine／完整 before、after、log／parent 保留。Session、state、事件及 outbox 原子寫入，action ID 可安全重試；不捏造 Again／補造舊歷史、不覆寫 FSRS due。學會判斷依 Review／Relearning 或既有 learned_at，取消 Easy-only gate。
- 舊 daily／free／batch Session 及事件保持原文與相容讀取，不能以新規格重新解釋舊日學 introduce；新正式 review 的 state transition 維持既有引擎語義，不新增會讓舊可靠性驗證器失配的排程欄位。舊元件不再是使用入口；取消的 Quiz 入口移除，但 Quiz stores／歷史／同步相容程式未刪除。
- `startPractice` 只能由已完成且選無盡的正式批次進入。獨立 `mode=practice` Session 保存本機 queue／answers／revision，`ratePractice` **只寫 Session**，不寫 StudyState、StudyEvent 或 outbox；可停止、再次進入及恢復，空集合明確呈現。仍保存在 v3 backup 中，既有 owner／generation 與備份衝突保護沿用；不把額外練習同步成正式評分。
- `ScheduledStudySession` 翻面／正式間隔預覽、名額／進度、剩餘到期卡、短步等待與額外練習用同一入口。等待到期／當地換日才重新查詢；不每秒掃描整個正常學習集。每張題目／head 變更才清除翻面，錯誤留題並提供相同作答重試／重載；按鈕有焦點管理及 zh-TW／en 翻譯。字典詳情仍放在評分後，儲存提示放在詳情後。線上開始先沿用 `syncStudy` 同步每日 introduction 與 state；離線仍保留本機批次及 outbox。
- `StudyPreferencesProvider` 傳遞目前帳號 Repository／學習集清單；SettingsDialog 字卡與學習分類選集後使用同一 `study_settings`。增量可選 JSON 欄位 `study_mode`、`card_order`、`review_order`；數量仍為 `review_limit`／`new_limit`，保留既有有效值。Repository 驗證選項及整數範圍、原 settings outbox／LWW 更新同步；一般主題／語言、功能排序及備份入口保留，沒有新增空的筆記／簡報設定分類。
- **資料庫**：無新 Migration、表／RPC／RLS／權限變更。2026-10-13 唯讀核對 Nexus 正式四表為 JSON payload、review kind 原允許 review／introduce／reset，RLS SELECT 為 owner_id=auth.uid()；外層 apply_study_operation 固定空 search_path、有 owner 同步鎖，authenticated 可執行、anon 與內部函式不可直接執行。隔離 PGlite 用原 20260922／20261016 SQL 驗證增量 settings、正式事件、掉回覆重試、owner／匿名拒絕與跨裝置額度；正式環境未寫入／未做 JWT 實機驗收。
- **限制**：正式 Session／額外練習進度仍採既有本機 Session，不新增雲端 Session 表。另一裝置經同步後根據正式事件／due 延續學習，不會複習尚未再到期卡，但不會取得另一台相同 Session ID／練習 queue。兩台同時離線無法原子共享新卡額度；合併保留全部事實，線上開始先同步已知用量。不同裝置時區沿用裝置當地日界，不自行新增帳號時區契約。切換新版前先更新／重新整理舊分頁，避免舊 UI 繼續舊規則。

**測試結果**：相關單元／整合 **93/93**；瀏覽器 **1/1**（桌面1280、平板820、手機390，zh-TW／en，真正元件／本機 IndexedDB）；TypeScript／Production Build 通過；全站 ESLint **0 errors／467 warnings**（main 原有468，沒有新增警告）。

**重跑指令**：`node --test --test-isolation=none tests/scheduledStudy.test.cjs tests/unifiedStudySync.test.cjs tests/studyFSRS.test.cjs tests/studyPractice.test.cjs tests/studyRepository.test.cjs tests/studySessions.test.cjs tests/studyReliability.test.cjs tests/studySync.test.cjs tests/studyCardManagement.test.cjs tests/officialStudyPacks.test.cjs tests/studyDictionary.test.cjs tests/workspaceSync.test.cjs`；瀏覽器 `node --test --test-isolation=none tests/unifiedStudy.browser.test.cjs` 使用真正 Repository／IndexedDB／React 元件與樣式，Supabase 僅隔離掉外部連線，不冒充真實帳號／正式驗收。Node 24 的 process isolation 顯示檔案級總數，本輪採 isolation=none 保留個別 case 的實際數量。


## #44 公共字典完整交換與批次作業（2026-10-13）

**已開發及隔離驗證；正式 Migration／部署未執行，HISTORY 依使用者要求不變更。**

### 交換契約與範圍

`dictionaryExchange.ts` 定義 `format: nexus-dictionary-exchange`、`schema_version: 1`、`exported_at`、`scope: {kinds, statuses, query}` 及 `records`。每筆包含 `version`（現況版本戳；新增為 null）、`snapshot: AISnapshot` 及 `reviews`（active Review 原文）。Snapshot 保留 Entry、Sense、pronunciations、inflections、relations、etymologies、learning_notes、examples、lexical_annotations、grouping、sense_groups、metadata；所有現行 ID、Entry／Sense scope、排序及文字原樣保留，不壓平多義項。完整 schema 僅接受現行 RPC 內容欄位，未知欄位／不合法內容明確列 Invalid。

- `revision`／timestamp／Published status／provenance 與 active Review 是版本參照資訊；不能以交換檔直接發布、重設技術版本或還原審核歷史。active Review 編修仍用現有編輯器；未變更重新匯入會保留其原文。新增版version=null的檔案重匯時，若提供內容已一致則為Unchanged，若同ID已有不同內容則為Conflict，不默認覆寫。
- 改內容保留 IDs／version；構詞使用 metadata.component_order。新 JSON record 使用穩定 UUID、version=null、metadata=null（或空provenance＋自己的component_order）、reviews=[]，或用既有 CSV preview 產生 proposed UUID。漏掉的詞條、子項目及 scope 之外資料不作刪除，省略構詞亦保留既有排序位置；交換不是資料庫／published revision history 或私人學習備份。
- 發音以實際 `ipa`／locale／note／scope 保存；正式模型尚無 KK／IPA system 欄位，本輪不猜測系統或轉寫。已退場 source_id／來源授權及構詞查證屬性不重新加入可編輯模型；舊 Review 原文留在 read-only reviews。

### 匯出／預覽／套用

- `DictionaryExchangeExport` 和 `exchangeExport.ts` 使用 `export_dictionary_exchange_page`，每次最多100個完整 Entry，以 UUID keyset 接續；全部或當前種類／狀態／literal 搜尋交集，和管理列表語義一致。scope_version 使用 private `dictionary_exchange_scope_version`：依固定表 allowlist，逐表將範圍內完整原始列排序、雜湊，再合併成 `content-v2:` 戳；涵蓋 Entry、8種附屬列、Entry／Sense grouping、AI metadata 與 active Review（含 candidate、revision、狀態加入／退出）。不依賴父 Entry revision；退場欄位亦保守涵蓋，可能要求額外重匯出。每頁以同一 statement MVCC 計算全範圍戳及頁面；任何涵蓋內容差異即停止重匯出，舊未完成 checkpoint 亦因戳版本不同拒絕續取。客戶端再核對回傳戳。沒有匯出寫入鎖，不限制編輯；最後一頁成功檢查是完成時點，完成後的新修改由匯入逐筆版本衝突處理，不宣稱跨請求交易快照。
- 匯出 checkpoint 及分頁內容分開保存在 owner-scoped IndexedDB，失敗／停止／重開可以繼續，同一份完整 JSON 一次下載，完成前不產生誤導性完整檔案。單一上傳檔上限64MiB，交換 schema 上限50,000 records；已驗證6,300筆。
- `DictionaryImportReview` 延用 CSV／legacy JSON／Markdown／AI 入口，JSON Exchange 自動辨識；`previewExchange` 複用 `buildImportSession`、分類、Diff、決策及 canonical Draft 映射。Exchange 保留明確 IDs，不自動轉向另一同形 Entry、不重寫匯入的分類標籤。Preview 每次25筆；完整版本一致且無歧義的修改可整批確認，Published 修改的 effect 仍是 Review。
- 預覽顯示 New／Modified／Unchanged／Review／Invalid／Version conflict，差異列表使用共用分頁（50項）。分類、標籤、variant、sense category 和 component_order 皆參與比較。active Review、ID挪用、同形歧義、未知欄位、關聯錯誤及過期 version 不自動套用。
- `applyImportItems` 準備既有 operation envelope，先持久化 UUID／candidate／observed／expected_context，再每批最多25筆呼叫新增 `apply_dictionary_import_batch`。**批次 RPC 每項委派原 apply_dictionary_import_operation**，保留 receipts、revision、人工 Review 及 SQL驗證；各項 subtransaction，單項失敗回滾其全部內容／audit，不汙染其他明確確認的有效項目。依檔案內構詞依賴排序；遇整批網路失敗停止未開始批次。
- Receipt 查詢先於版本戳／active Review檢查，掉回覆的已提交操作可精確重試，不再建立 Entry／Sense／Review；未提交的 Exchange 必須匹配最新 version。所有 batch 來源包含CSV亦阻擋已有 active Review 再建重複草稿。stale 重新比對只刷新技術 revisions，保留提案及差異，要求明確再確認；未確認失敗回覆不得棄掉原 operation。
- 已確認 scope（safe／reviewed）本機保存，刷新後點恢復不必再逐批確認；新預覽／改決策／rebase 使確認失效。結果 JSON 含成功／失敗／待審／未處理、Entry ID、operation UUID、effect 與 Review ID；建立Review後提供原詞條編輯器連結。

### 本機 checkpoint 與批次發布

獨立 `nexus-dictionary-import-review` IndexedDB 由v1升v2：保留舊 sessions、增加逐項 items、jobs、export_pages；Study `nexus` DB_VERSION=8 不變。v1 pending operation第一次遷移必須完整保存再轉成逐項寫入，防止只保存首批而遺失其他項目。Session metadata（含item_count）與25項變更同交易，避免每成功一筆重寫6,300項；第一次保存新session即使傳入changed亦保存全部items。quota／DataClone／transaction失敗均顯式abort並等待done rejection，防同步clone例外讓先前metadata部分提交；載入時核對item_count，缺項明確拒絕。每owner保留當前作業入口，跨裝置同一作業依#16，不宣稱本機進度是永久備份。

匯出page與job同交易／同樣abort處理。匯入RPC前必須保存operation UUID，失敗不dispatch；RPC提交後checkpoint失敗停止續批，reload以仍pending的原UUID取receipt，不改寫revision。React僅顯示成功持久化的deep-cloned狀態，不讓後續mutations誤顯已保存；有pending／failed operation不可用新preview覆蓋恢復入口。

`DictionaryBulkPublish` 延用 `20261019_dictionary_admin_bulk_publish.sql` 的每批200／依賴圖／24小時actor token，並保留20261021的 `content_verified` overload。首次確認保存token、scope、查證聲明及結果後自動續批；可停未開始批次、失敗／重開恢復相同token。新草稿或內容使原token過期時重新預覽且重新確認；不使用發布循環規避原authority。PR #57 UI 僅提供「發布全部草稿」；preview／publish 固定 kind_filters=[]、query_text=空字串，完全不受清單搜尋／類型／狀態／分頁影響。舊篩選scope的checkpoint不顯示為全域恢復入口（保留原本機記錄）；全域token的確認／停止／刷新恢復／報告延用既有機制。新增唯讀 `dictionary_bulk_publish_report` 每頁200取得actor自己的完整plan結果；沒有直接table權限或Review自動核准。

### Migration 與驗證證據

PR #56 的增量 Migration 為 **`supabase/migrations/20261013084116_dictionary_bulk_exchange.sql`**，Supabase CLI產生；2026-10-14已唯讀核對正式ledger及相關RPC存在，本輪未套用或重播。新增6個函式：private dictionary_exchange_record／dictionary_exchange_scope_version、admin export_dictionary_exchange_page／inspect_dictionary_exchange／apply_dictionary_import_batch／dictionary_bulk_publish_report。全部空search_path、逐次admin驗證；對外僅authenticated execute，anon／PUBLIC撤銷，helper亦不可直接execute。報告核對actor_id；匯入核對auth.uid與operation owner。無新表、RLS改寫、資料重寫／刪除、正式發布或獨立管線。

正式唯讀核對了表欄位、既有RPC授權及ledger：20261013041717對應20261020、20261013060430對應20261021、20261013072108分頁；早期base由歷史手動套用，不在此ledger。#44 SQL現已由正式ledger `20261014040405 dictionary_bulk_exchange_20261013084116` 唯讀核實（非本輪套用）；PR #57不新增Migration，也不重播本檔。需核對既有#41/#42及#44函式服務後另行授權合併／Vercel發布。Repo歷史8位日期與實際ledger不同，不以盲目db reset／db push重播舊Migration。退回前端不需要刪掉新增RPC；未修改原endpoint，舊版仍可運作。

- 相關回歸113/113（包含本次SQL、完整ID／多義項／Word-Prefix-Root、Draft／Review／版本／receipt、v1升級、單項回滾、字卡連結／官方包及既有閱讀／編輯）；單獨大量SQL1/1；桌面1280／平板820／手機390瀏覽器1/1（實際元件／IndexedDB，外部服務隔離；含篩選／全部匯出、錯誤重試、檔案輸入、暫停／刷新恢復、RPC前與提交後IndexedDB quota失敗、畫面僅反映durable狀態、UUID replay、確認與報告下載、English）。總共115個case通過，沒有skip／cancel。
- TypeScript／Production Build通過；ESLint 0 errors／467 warnings，與main基準一致，無新警告。舊toolbar／匯入標籤斷言依新規格更新，未刪除／跳過檢查。
- 可重現大量測量：`node --test --test-isolation=none tests/dictionaryExchangeScale.test.cjs`，**隔離PGlite實際6,300 Word Draft＋各1 Sense**，JSON 4,194,868 bytes；seed 995ms；匯出63 requests／9,338ms；預覽252 requests／11,114ms；匯入含25項暫停與本機恢復、6,300 receipts，共252 requests／149,201ms；發布預覽527ms、全量32批／137,236ms、完整6,300項報告核對成功。這些不是正式Supabase網路／JWT／實機耗時，其他硬體及複雜詞條需以實測為準。
- 正式資料庫僅唯讀盤點。未執行本次Migration、未部署／合併、未關Issue。正式最少驗收：匯出再原樣預覽不變；改一筆Draft及一筆Published→Review且公開內容保持；手機中途停／刷新恢復與一次批次發布＋查證確認。

PR #56 審查修正另新增4個安全case：逐一變更13種JSON來源（含cursor前／後及Review建立／修改／退出）要求重匯出、JSON與Nexus並行修改衝突、quota／DataClone完整abort與receipt刷新恢復、ACL／actor／RLS及缺依賴拒絕。最初回歸揭露storage item_count外漏至Session API，修正為儲存層專用；原相容測試保留並通過。上述為隔離測試，未執行正式Migration／帳號驗收。

## PR #57 管理字典精簡與单筆草稿刪除（2026-10-14）

已實作／本機驗證，PR尚未合併／本輪未部署。`DictionaryWorkspace` 不再有選取狀態或全選 helper；`DictionaryBulkPublish` preview、publish 均固定全字典草稿範圍，原token及admin／content_verified／版本／構詞檢查不變。既有篩選scope作業不誤當全域續作，報告仍只讀actor自己的plan。

`DictionaryEditor` 僅對 persisted Draft（revision>0、非Published／Review candidate）提供刪除草稿；使用原 `deleteDictionaryDrafts` adapter＋`delete_dictionary_drafts` RPC，單一{id,revision}，revision取目前已保存baseline（包括先前子項刪除回傳的revision）。顯示原詞條名稱及永久刪除義項／構詞／全部內容、未儲存修改的危險確認；取消不呼叫RPC，權限／stale／Published／外部参照由既有RPC強制執行。失敗保留表單，成功才以useUnsavedDraft.leave解除離開保護並返回 `/dictionary/admin` 重新讀取清單，embedded編輯亦返回管理清單，不留在已刪除的Entry路由。未儲存的新建表單沒有資料可刪，不顯示此按鈕。不改既有Review／Published版本歷史或DB邏輯。

字卡核對對照SPEC與#47／#48：開始學習、scheduled／endless、review_limit未設定fallback50、新建settings.new_limit20、介紹事件distinct每日額度、短步到期優先且不重扣名額、三種出卡順序／Review排序、完成／剩餘到期／等待畫面、settings owner-scoped保存／同步均已有實作。本輪未發現需追加大型學習功能的差異，不修改學習程式。限制仍為同裝置Session、兩台同時離線非原子共享額度、各學習集設定／舊有效設定保留，與SPEC一致。

正式Supabase本輪只SELECT核對：delete RPC及全域preview／四參數publish／report已存在、空search_path、authenticated可execute而anon不可；舊三參數publish對authenticated已撤權。delete內含admin／revision／Published／參照guard；report核對actor。沒有正式刪除／發布／Migration。

PR #57 本輪驗證：字典單元／整合116/116、既有排程／Session／離線同步核對35/35，瀏覽器3/3（字典全域發布／單筆刪除／恢復：桌面／平板／手機；Published直接編輯及離開保護：桌面／手機；字卡設定保存／Again等待／Good畢業／無盡隔離：桌面／平板／手機），合計154項；TypeScript／Production Build通過，ESLint 0 errors／467既有warnings。初次舊編輯器瀏覽器fixture缺Playwright預設binary，指定系統Chromium後完整通過；新加language hook的舊單元hook fixture補上useContext模擬，所有斷言保留。未重跑#44的6300筆效能（本轮未改SQL／分批算法），未宣稱正式帳號／實機驗收。
