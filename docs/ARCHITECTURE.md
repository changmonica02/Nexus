# Nexus — 技術架構與資料契約（完整 Canon 遷移版）

> 本文件記錄已確認技術契約與經實作驗證的架構；使用者核准的產品決策以 SPEC 為準。**#44 大量資料操作仍為待實作需求，資料交換格式及批次 RPC 的最終設計尚未核准。** 已存在的 migration 或程式碼不代表已在正式環境部署。舊交接原文已從工作樹移除，仍可在 Git 歷史追溯。


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
| 字卡／狀態／事件／設定／session | `study_cards`、`study_states`、`study_events`、`study_settings`、`study_sessions` | 備份 schema v2 的 `study` 欄位 | `study_*` 四表＋RPC `apply_study_operation`；本機 `study_outbox` | ⚠️ 遠端 migration 狀態未知 |
| 測驗答題與分數 | `quiz_attempts`、`quiz_states`、`quiz_outbox` | ⚠️ 是否進備份需 Q-0 核對 | `study_card_quiz_states`、`study_quiz_attempt_receipts`＋RPC `apply_study_quiz_operation` | ⚠️ 遠端 migration 狀態未知 |
| Quick Notes／Todos | 統一在 `pages` | 有（同 pages） | 有（同 pages） | 🟡 |

### 5.5 IndexedDB 結構【新增】

- 資料庫 `nexus`，`DB_VERSION = 6`（**舊文件寫 3／4 已過期**）。
- Stores：`pages`、`attachments`、`binaries`、`settings`、`study_cards`、`study_states`、`study_events`、`study_settings`、`study_sessions`、`study_outbox`、`quiz_attempts`、`quiz_states`、`quiz_outbox`。
- `pages` 與 `attachments` 使用本機欄位 `workspace_owner_id` 做帳號快取邊界（不上傳雲端）。
- 舊 DB 可能殘留 `quick_notes`／`todos` store：程式碼不再讀寫，未清理。
- v3→v4 新增字卡 stores、v5／v6 各版新增內容的對應，文件未記載；**以 source 的 `upgrade` 為準**。

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

### D. CSV 匯入／匯出（現行舊介面與待改進交換格式）

- **管理端匯入操作（現行基線，#44 可改善格式）**：管理字典 →「匯入」→浮動視窗 → 選擇受支援的交換檔案 → 解析／驗證 → 預覽（Safe、Review、Invalid）→ 確認寫入 Draft → 審核／發布。Word／Prefix／Root 均必須有可定義的 CSV 處理方式。
- **現有格式差異**：`dictionaryCSV.ts` 含 12 欄 Dictionary CSV v1 和 Word 舊五欄；`adminImport.ts`／DictionaryAdmin 仍含 Markdown／JSON／AI 相容路徑。Codex 必須先確認這些路徑是否被其他內部／migration／管理工具呼叫，再移除或封存不屬於管理 UI 的功能。
- **資料無損要求**：CSV 欄位契約需可完整表達產品要求的多 Sense、Entry／Sense 讀音、變體、詞源及構詞關係，或明確定義 CSV 對這些內容僅部分支援並由管理 UI 防止不完整匯出／覆寫。**在使用者核准完整 CSV schema 前，不得聲稱 CSV 可以全量無損 round-trip**。
- **匯出**：管理介面提供資料匯出；明確標示匯出範圍、選取項、草稿／正式內容範圍與資料完整性。若目前 CSV 無法無損保存完整詞條，需阻止誤導性的「完整備份」敘述並回報缺口；不得靜默丟失讀音或 Sense 關聯。
- **批次安全**：檔案大小／列數／編碼、錯誤列提示、同 Entry 多 Sense 群組、預覽後來源版本變化與重試冪等需有驗證及測試；運輸分批大小屬效能參數，不應固定成舊歷史 13 批方案。

### E. 前端互動、狀態及邊界

- **進入字典**：字卡 →「字典」→公共字典；頂部「←返回字卡」「字典」「管理字典（僅管理員顯示）」。下方是搜尋框「查詢英文、中文」、「搜尋」、「篩選」，篩選浮層含 Word／Prefix／Root 三種，預設全選。
- **詳情頁**：返回實際來源並保留 query、filters、scroll、順序上下文；上一筆／下一筆依來源結果排序，手機和平板支援左右滑動；管理員右上角「編輯此詞條」直接進入同一詞條編輯器。
- **內容元件**：相同詞源的註釋由一個來源視覺容器承載，內部保留多段落／義項資訊；多詞源清楚分組。展示讀音、變體、種類、義項、口訣、記憶、詞源及構詞關聯。
- **管理頁**：工具列提供「新增」「匯入」「匯出」「刪除」「發布」「全選」；新增以 Word／Prefix／Root 下拉切換同一編輯面板；批次操作使用選取集與安全結果回饋。
- **分頁／搜尋**：搜尋字面與繁中義項，並根據三類勾選組合篩選；需確認原有 Reader 分頁、索引及約 7,000 筆規模的效能，不在前端整批載入所有詞條。
- **深連結與狀態**：詳細詞條若由書籤或公共 Entry 連結開啟且缺少來源清單，設計明確預設返回目的地（待產品核准）；編輯未保存時的返回提示、手勢閾值與控制項尺寸亦待核准。

### F. 實作先後與安全門檻

1. 先核對 migration ledger（20260930～20261018）、production 權限、既有 SQL/RPC、TypeScript model、Reader、Editor、Official Pack／Study link 與備份依賴；列出已符合、缺少、不一致與未驗證，不假設每一個 migration 已在遠端套用。
2. 再提交 CSV 無損性及刪除語意、返回深連結等未決設計，取得核准後調整 schema／RPC 與 service adapter。
3. 隨後整合 UI（入口、管理按鈕、搜尋與篩選、上一筆／下一筆、返回、右上直接編輯、按來源合併註釋）；管理頁目前以 CSV 為主要操作格式；後續依 #44 的無損交換規格決定。
4. 最後測試普通用戶與管理員、未授權直接 RPC、草稿隔離、匯入 Safe/Review/Invalid、發布、重複提交、CSV 匯出資料完整性、跨裝置字卡連結、窄螢幕與 7,000 筆搜尋；部署 SQL 與執行遠端寫入須另行取得批准。


## 文件更新界線（Issue／SPEC／技術實作）
- 已核准的產品行為在實作前由 `docs/SPEC.md` 記錄；此處不把 Issue 規劃自動當作現行技術實作。
- Codex 開發並驗證後，依最新程式碼／migration／測試補寫實際資料表、RPC、模組、效能限制及回復策略；必須區分 repo 已實作與正式 Supabase 已套用。
- #44 的大量資料匯入／匯出及自動續批需求，實作前以 SPEC 為準；本文件原本的「管理 UI 僅 CSV」敘述是舊決策，**已不再是新功能開發的限制**。可評估無損 CSV／JSON 等交換方案，但未選定前不宣稱已有完整 round-trip。


### G. #41／#42 相容實作（已實作；正式環境待驗證）

- PublishedWorkspace 讀取完整 Published snapshot 與 active reviews，立即提供可編輯表單。未修改不建草稿；單筆 active review 直接續編，多筆要求明選。首次儲存用 `create_dictionary_edit_review` 在同一鎖／交易中檢查 active review、建立並儲存完整 candidate；後續以 `save_dictionary_review` 核對 revision。發布只呼叫既有人工核准 RPC。版本錯誤保留輸入，提供編輯備份及受離開保護的重新載入。
- `useUnsavedDraft` 對站內連結、編輯區的版本操作及瀏覽器 history navigation 提供儲存／放棄／繼續編輯；原生 beforeunload 保護重新整理／離站。對話框使用 native dialog 並還原觸發控件焦點。公開閱讀端返回仍沿用原來源 URL。
- 新增 `dictionary_inflections(id,entry_id,sense_id?,form_kind,form,sort_order,revision,updated_at)`。它是 Entry 附屬記錄，沒有公開 Entry 身分；同 Entry／Sense／類型／正規化詞形防重，相同拼寫可屬不同類型或不同 Sense。詞性對應與 Sense 所屬關係由 TypeScript、FK 和伺服器驗證；直接資料表寫入未授權。此版只儲存人工指定的形式，不做規則猜測。
- 詞形納入 canonical DraftInput、Review candidate、Published snapshot／diff、JSON Bundle、AI JSON roundtrip、Safe／Review import 與稽核。Editor 的完整草稿儲存可在同一 revision 交易移除被刪去的附屬詞形／關聯；部分匯入的省略仍保留舊資料與構詞順序：一般 `mapDictionaryDraft` 不傳 `component_order`，完整 Editor save／Review save 才明確傳入排序。舊 Review snapshot 缺少新欄位時以空陣列正規化比對，關聯陣列比較以穩定 ID 正規化；歷史原文不回填、不重寫。
- `dictionary_relations` 保留所有 ID／目標 Sense FK，來源 `sense_id` 支援 null（詞條共用）；構詞模型不含關聯種類／查證狀態／查證說明。舊 SQL 欄位只供無損相容與歷史保留。擴充 Word 成分並拒絕自身連結。排序**沿用既有 `dictionary_ai_metadata.component_order`**，不建立平行排序模型。選取器只列已發布候選，DB 仍允許既有批次匯入暫時指向 Draft 成分；發布前必須先發布所有目標，維持舊批次安全機制。
- 舊 `source_forms` 原文繼續保存在 lexical annotations，編輯器僅移至收合相容區塊，不轉換為詞形。CSV v1 沒有詞形欄位，含詞形的 CSV 匯出明確拒絕；完整交換使用 JSON Bundle／AI JSON。本次不自行變更既有 CSV schema，後續完整大量交換依 #44 規劃。
- `search_dictionary_with_inflections` 合併 headword／中文義項及**索引可確認的 exact 詞形**，結果帶 `inflection_matches`，保留原形與同形詞；Reader 標示匹配原因，詞形以文字而非新 Entry 連結顯示。反向構詞改用直接來源 Entry FK embed，涵蓋詞條共用及指定義項；分類篩選仍用原查詢。
- 新 Migration：`supabase/migrations/20261020_dictionary_edit_inflections.sql`，依賴既有字典 migrations 至 20261019。只有新表／索引／RLS／trigger 及 RPC replacement，無既存資料清除或 backfill。本次只在隔離 PGlite 執行；**正式 Supabase 未執行**。部署前先核對遠端 ledger、備份並在 staging 套用／驗證；需要手動執行此檔案且須另外授權。若回退應保留新表與附屬資料，停用新 UI／RPC；不能以刪表當作回滾。
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

Supabase connector 已可讀取正式 Nexus 的 schema：PostgreSQL 17.6、20261020 功能表與舊發布 signatures 已存在，RLS 啟用；來源 Sense 尚不可空，20261021 的新 FK／查證 overload／capability 尚未套用。構詞當次查詢為 0 列。遠端 ledger 只記錄 `dictionary_edit_inflections_20261020`，較早 schema 缺完整重播紀錄；隔離 staging 的建立須核對基底與依賴，不能視分支初始化為完整 schema 的保證。沒有正式 DDL／資料寫入／ledger 修補。

目前帳號只列一個正式專案且無開發分支，尚無遠端 staging 驗證結果。`supabase/tests/20261021_composition_staging_verify.sql` 是套用後的唯讀 catalog／權限檢查，不執行 Migration，也不替代真實 Auth JWT、PostgREST FK embed／RPC overload／cache 或帳號／UI 驗收。main 的正式部署規則已隨 `650d0a2` 同步至 PR 功能分支，PR 不合併，正式環境不部署。


## #49 共用資料列表分頁與 #41 收尾（已開發；本輪尚未部署）

- `src/components/pagination/model.ts` 集中 ceil 總頁數、整數頁碼驗證及資料變動時有效頁邊界；輸入驗證回傳 null 拒絕，不偷偷 clamp。內部及既有 URL／RPC 保持 zero-based，UI 顯示 one-based，空集合 0／0。
- `Pagination.tsx` 為上一頁／中央原位頁碼／下一頁。text input＋numeric inputMode／done hint，Enter 提交、Esc 取消、失焦取消，焦點選取／還原；沒有額外確認按鈕或巢狀 form。以 Nexus Tailwind／theme tokens 排版。使用現有 LanguageContext／i18n；獨立字典路由無 provider 時沿用繁中預設。舊服務尚未提供 total 時只保留原導航，不捏造總頁數或開啟跳轉。
- `usePagedList` 用查詢 key／page／retry 的請求識別管理最後成功資料，effect cleanup 忽略過期回應；載入／失敗不把確認頁數與資料混配。錯誤可重試，快速再跳頁允許最後請求勝出。搜尋／篩選不共用錯誤的舊結果；資料縮減讓頁面越界時依新 total 轉最後有效頁。
- 套用：公共字典搜尋（含構詞反查／變體）、Prefix 義項分類、Root 分類、管理詞條清單、構詞候選 dialog、字卡編輯的手動字典連結、評分背面字典候選、批次字卡連結建議。A4 筆記、簡報及角色卡內容頁模型不變。
- 管理清單及反向／變體查詢使用既有 Supabase select 的 exact count，在相同篩選、排序及 range 取回可信 root Entry 數；不做客戶端全字典掃描。管理選取仍僅本頁，翻頁／篩選／refresh 清除選取。批次建議以本地合乎條件字卡及 RLS 隔離的現有雲端連結 ID 建立確定 dataset，最多每批查 200 個 ID，再以每頁 10 筆並行載入建議；total 為實際未連結卡片數，不把已跳過卡片算進頁數。
- 新 SQL `20261013064759_dictionary_pagination_totals.sql` 由 CLI 產生，僅更新五個既有搜尋 RPC 的回應 `total`（構詞候選另補 page）；既有 predicate、Published／管理員限制、函式簽章及 ACL 保留。使用同一 matches CTE 計算完整 count 與頁面，Prefix 分類計 Sense 列、其餘計 Entry。classic `search_published_dictionary` 加入 all，字卡 All 搜尋改為單一全域排序分頁，不再把三種 kind 的獨立頁拼成一頁。舊客戶端可忽略新增 key。
- **套用依賴**：正式 DB 需先具備字典 migrations 至 20261021，SQL 有前置 guard；本輪沒有套用正式 Migration。倉庫舊 migration 使用 8 碼歷史日期，不能將新 CLI timestamp 與那些檔名排序當作已核對的重播順序；本檔需在既有已部署 schema 上手動依核准流程套用。先 SQL（old UI 相容）再合併／發布新 UI；函式 owner／ACL、schema cache、結果 totals／普通使用者隔離一併核對。無新表、無資料清除、無寫入／發布權限變更。
- #41 核心流程沿用 PR #46／#51，沒有另建發布流程。使用者本輪回報兩 PR 已正式部署且核心操作已實機驗收；本輪技術核對另涵蓋 admin／普通角色、Draft／Review／Published 隔離、查證確認、stale base／revision、重新開啟與失敗恢復。普通角色的自動化測試不是正式第二帳號實機測試；依單人測試階段的精簡標準記錄為「等待正式部署與最終驗收」，不自動關閉 Issue。

- 本輪交付驗證：字典＋分頁 100/100（無 skip）、TypeScript／Production Build 通過、ESLint 0 errors／468 warnings；桌面 1280×900 與手機 390×844 隔離 Chromium 驗證 7 個實際元件場景（分類共用 Prefix／Root 元件）、頁碼／條件／焦點／連續請求／錯誤重試／資料縮減。PGlite 測試新 SQL 的總筆數／頁面條件一致、普通角色隔離及函式 ACL 保持不變；正式 DB 僅唯讀核對 #41 已部署權限，沒有正式 Migration／帳號寫入。
