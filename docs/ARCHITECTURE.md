# Nexus — 技術架構與資料契約（完整 Canon 遷移版）

## 2026-10-20 世界觀地圖儲存基礎（Refs #88；首批程式／契約測試，尚未接入產品）

- `src/features/worldMap/worldMapRepository.ts` 固定整合來源為 Azgaar `v1.154.2`，commit `b4a0dcb933586a57242508f558f775da16c35c64`；目前沒有複製或執行上游程式。上游 LICENSE 為 MIT，Copyright 2017–2024 Max Haniyeu；嵌入時仍須保留完整授權及第三方素材聲明。
- `CharacterProfileData.world_maps?: WorldMapRecord[]` 僅保存穩定 map ID、world_id、標題、版本、軟刪除及附件參照／SHA-256。既有世界觀沒有此欄位時視為空集合；不新增 Page kind、IndexedDB store、SQL、RPC 或 RLS。完整原生 .map 存於既有 file Attachment binary，不放 content_json。地圖屬於既有非模板、未刪除世界觀，所有 Repository 操作明確核對目前帳號及世界觀 owner。
- Repository 提供 create/list/read/save/rename/duplicate/remove/restore；**尚未掛載任何 UI，也沒有 Azgaar 編輯器或自動儲存計時器**。map revision 用於拒絕過期編輯 session；world revision 在 WorkspacePersistence 原子交易中再次比對。新附件 metadata、binary 與世界觀參照共用既有 outbox batch。呼叫端未來必須先 flush 世界觀待存內容，完成後採用回傳 Page，不能以舊 React snapshot 覆蓋地圖 metadata；這個工作區接線仍未實作。
- 每份變更專案使用獨立不可變附件，避免原生 binary 被過期 session 就地覆寫；相同原始 bytes 的 SHA-256 不排入任何寫入或傳輸意圖，改名／刪除／還原僅改世界觀 metadata，不觸碰 binary。舊附件及參照保守保留，不自動 GC；**大型專案連續保存的容量成本、壓縮／節流與安全回收仍待實測，不能宣稱雲端消耗驗收通過**。列表不讀 binary，重新開啟沿用 owner/revision 附件快取。
- `inspectMapProject` 僅結構驗證目前固定版本的 plain/base64/gzip 原生容器，並保留輸入 bytes；它不完整驗證上游地圖語意，也不是 SVG sanitizer。未知版本／格式拒絕寫入。完整 Azgaar 原生往返、非同步載入完成／失敗 handshake 與匯入隔離仍未實作；不可將此函式當成可安全同源嵌入匯入 SVG 的證明。
- M0 查證：上游為獨立 Vite 應用（Node >=24 建置），全域地圖狀態與 UI 應隔離於 iframe，避免改寫成 React 引擎。`Save.prepareMapData` 序列化設定、SVG 及完整地圖欄位；`Load.uploadMap` 使用 FileReader 且回傳 void，解析／重建另行非同步，不能以呼叫返回判定載入成功。上游原生 browser storage 的 `lastMap` 是單槽，不能當 Nexus 多地圖及帳號隔離的資料真相。實際 iframe origin／CSP／檔案隔離方式尚待驗證，未鎖定部署方案。
- 上游 Git tree 共 1,739 entries，blob 大小合計 67,067,340 bytes（來源快照，不是正式 bundle 或記憶體用量）。lockfile 的 runtime dependencies 含 MIT、ISC、BSD-3-Clause、Apache-2.0、Unlicense；字型、圖示及 public/libs 等素材仍須逐項核對。尚未引入上游套件、資產或付費服務。
- 驗證：`node tests/worldMap.test.cjs` 在 Node 24.19.0 通過 19 項合成資料／記憶體交易契約測試。`tests/worldMapIndexedDB.test.cjs` 新增 5 項既有 Adapter + fake-indexeddb 測試（重新開啟、交易回滾、owner、Trash／offline outbox、備份往返），本輪未能執行。未執行 TypeScript、build、現有完整回歸、瀏覽器、真實 Supabase 帳號／裝置驗收；M0 尚未全部完成，M1–M3 不列完成。

## 2026-10-19 共用工作區元件（Refs #85；已實作／本機驗證）

- `WorkspacePane` 統一主／次窗格類型分派，NexusApp 保留頁面專屬儲存、匯出與工具操作；`useAttachmentPreview` 共用本機 PDF 讀取，取消過期回應並回收各窗格 Object URL。
- `SaveStatus` 由實際 `savePage` 結果驅動；每頁 debounce／序列寫入仍獨立，較早完成的寫入不會把新修改標成已儲存。失敗保留待寫內容，重試與目前窗格 Ctrl/Cmd+S 走同一 flush。提示僅代表此裝置寫入，雲端同步另行呈現。
- `ModalDialog` 共用原生 dialog 焦點、Escape、busy 與背景關閉策略；`useAnchoredMenu` 共用選單位置、dialog 內 portal、視窗調整及鍵盤導航。編輯器選單保留文字選取。
- 工具總覽使用 `FeatureOverview`，保留各分頁儲存的排列偏好；學習存檔提示統一為 `AnswerSaveNotice`。
- 移除無入口的 creatableRegistry、useSidebarPreference、DailyStudySession／studyPractice；保留 SPEC 中的 inbox、歷史 quiz 相容模組、受測的 deleteDrafts、world 編輯與舊匯入 fallback。沒有資料遷移、RLS 或 RPC 變更。


## 2026-10-18 整筆詞條刪除與精簡編輯器（已實作／測試，SQL已套用）

- `deleteEntry.ts`先讀取管理快照、核對已載入revision，再確認後送出`delete_dictionary_entry(entry_uuid,expected_revision,expected_snapshot,operation_uuid)`。Editor以ref鎖住重送與原operation/snapshot，網路掉回覆可重試；baseline revision變更時換新操作。Published Review編輯使用canonical Entry身份，不能誤把Review revision當Published revision。
- 單一transaction使用既有全域寫入鎖＋Entry鎖，CAS、阻擋他筆構詞／active Review／legacy copy／官方manifest；只刪owned live children與`study_card_dictionary_links`。私人payload／state／event／source不寫入，失效ID讀不到公開內容，不授予編輯。成功快取失效與`?deleted=1`管理頁重查，dirty離開略過僅在成功後一次；失敗留原頁。
- 歷史表保留Entry ID和原PK／RLS／grants但不再限制對應live Entry必須存在；刪除時active Review封存為discarded（原candidate／base保留並稽核）。Audit `DELETE_ENTRY`＋既有owner operation receipt保護刪除重試，`guard_deleted_dictionary_identity`防舊匯入以原ID重建；其他未知FK一律完整回滾。
- 移除編輯器五個備份／差異／捨棄／重載操作、專屬state和構詞預載；`revisionLifecycle.ts`只保留共用create／snapshot／types，移除已無產品呼叫的diff formatter。一般Review／人工發布／多份既有Review安全選擇及dirty hook保留。
- Migration `20261018010000_dictionary_entry_deletion.sql` 已正式套用，ledger `20261018103636`。16表內容指紋一致；沒有正式詞條刪除或私人資料改寫。新RPC anon=false、empty search_path、admin驗權；advisors預期新增1個authenticated definer提示，其餘不變。部署／回復／管理員相依處理見`operations/DICTIONARY-ENTRY-DELETION.md`；前端PR交付紀錄及#60實機驗收分開追蹤。

## 2026-10-17 字典閱讀／構詞建立（已實作／測試；SQL 已套用）

- 公開 Article 以單一義項標題顯示完整中文，不再重複中文欄位／跳轉摘要；補充資料使用義項編號。Word 才顯示 POS，Core→History 順序、來源安全 URL 與原 Sense 錨點保留。Connections 的全詞條／多 Sense 反向查詢仍分開，單義項不重複入口；VariantLink 由父層單一 open key 管理，重按收合、切換互斥，取消舊回應。
- `firstSenseSummary` 依既有 Sense UUID 升序取第一筆；不拼接後續義項，空白明示。公開／分類及管理列表共用；卡片 line-clamp，管理狀態 icon 保留 title／aria-label。`dictionary_admin_first_senses` 每頁最多100 Entry、每 Entry lateral一筆，不受多義項 Data API row cap。缺 RPC 時有界逐 Entry fallback。
- `search_dictionary_relation_targets` 在伺服器完整 Published 候選集分層排名後分頁；變體只解析既有 nexus-variants-v1 或原始變體文字，不把條件文字當變體。保留 Child entry_id 索引，單字元／中文皆按字串查詢，穩定 tie-break，無前端截斷重排。
- `quick_create_dictionary_component` 使用既有 operation receipt、publication confirmation／publish、audit、published revisions。owner＋operation鎖／request比對、名稱鎖及 Prefix/Root 等價名稱唯一索引保護並行及重試。已有 Published 重用，Draft 不自動發布。無 POS 空義項為明確最小 Prefix/Root；原 Word parent guard＋非空 CHECK 不變。UI 嵌套原 DictionaryModal，不重掛主編輯器，明確人工確認／錯誤保留／已建立但未加關聯區分。
- Migration `20261017020000_dictionary_ranked_components.sql` 只新增函式／索引及擴充上述 CHECK，不重寫既有列；新舊 JSON／AI／Review 相容。舊 CSV 的中文／分類必填契約不放寬。權限、部署順序與保留新建內容的回復見 `operations/DICTIONARY-RANKED-COMPONENTS.md`；正式套用狀態另於交付核對，不能把隔離 PostgreSQL 當 Supabase staging 或 iPad Safari。
- 正式 SQL 已套用（ledger `20261017073742 dictionary_ranked_components`），13 張既有表的完整內容指紋／筆數前後相同；Entry 6,305／Sense 11,525／active Review 925／常駐項目28。所有新公開 RPC 的 anon execute=false，summary為 invoker，私有 variant helper不可由一般角色呼叫；新 quick definer RPC 明確檢查管理員及確認。Advisors 既有7 INFO／leaked-password警告不變；authenticated definer 提示43→44，新增為預期且已測試授權的 quick RPC。前端正式部署由對應 PR 最終 commit 核對，未替使用者建立或發布正式測試詞條。


> 本文件記錄已確認技術契約與經實作驗證的架構；使用者核准的產品決策以 SPEC 為準。**#44 已由 PR #56 合併 main；2026-10-14 唯讀核實正式 Migration ledger／RPC 已存在。PR #57 管理 UI／單筆刪除與 PR #61 常駐審核均已合併；正式部署／人工驗收狀態不由 Git 合併或 Migration 推定。** 已存在的 migration 或程式碼不代表已在正式環境部署。舊交接原文已從工作樹移除，仍可在 Git 歷史追溯。


## 2026-10-17：緊湊編輯器與核心概念（PR #79，已實作／驗證，SQL 正式已套用）

- Word／Prefix／Root 沿用 DictionaryEditor 與 PublishedWorkspace；EditorSection 新增 action slot，標題旁新增不觸發收合。AutoTextarea 依內容與寬度重新量測，清理 ResizeObserver，不縮小文字。
- 基本資訊短欄位雙欄、變體緊湊列；義項以穩定 ID 的列顯示，單筆無重複序號。Word 詞性／中文並排，Prefix 分類仍為 Sense 資料、Root 分類仍為 Entry grouping，沒有搬移資料。
- 讀音依 sort_order＋ID 初始化；新增安排在最大值之後，多筆移動時依新順序重編 sort_order，既有 Draft／Review extension 原子保存。單筆無移動、UI 無手填數字，公開閱讀沿用同一順序。
- learning_notes 的現行 kind 統一 core_concept；同 Entry＋Sense 舊內容經穩定排序串接，保留代表 ID 與完整原始來源備份，不混不同義項。核心概念在歷史詞源之前，編輯／閱讀／AI／CSV／JSON 一致；閱讀補充資料先按種類排序再標示義項歸屬，保留 Sense 錨點，讀音跨義項仍用全詞條 sort_order，避免共用核心概念被個別義項詞源擠到下方；舊型別只在交換相容 adapter 與不可變歷史保留。
- 增量 SQL 20261017010000_dictionary_core_concept.sql 含 private backup、10 組完整性指紋、monotonic revision、重跑標記及 dictionary_core_aliases（管理員唯讀＋既有 guard 拒絕重建退場 ID）。不增加可公開寫入的 RPC，不停用原 RLS／guard／人工發布。已完成歷史／receipt 不改寫，受影響常駐工作 stale 後重比。
- 待解析構詞提示不再提供一般編輯／閱讀入口，原始資料及交換／歷史相容保留，沒有轉入核心概念。部署／回復與正式套用狀態見 operations/DICTIONARY-CORE-CONCEPT.md。

## 2026-10-16：逐筆內容審核狀態退場（PR #78，程式／隔離測試完成、SQL 正式已套用）

- DictionaryEtymology／閱讀／編輯／AI／CSV／Markdown／JSON 交換不再含 verification；詞源來源改用 data_source。舊字源入口同樣改為內容種類與來源，不依狀態決定顯示分類；集中版權說明不再要求審核標示。
- 20261016060000_dictionary_retire_verification_state.sql 實體移除 dictionary_sources、dictionary_relations、dictionary_etymologies.verification，詞源 verification_note 改名 data_source。未刪來源、內文、ID、結構化詞形、Sense、關聯、公開版本或學習紀錄。若歷史私人字源表存在，一併退場同欄位。
- 沿用現有 get_published_dictionary_entry／apply_dictionary_bundle／dictionary_normalize_snapshot，沒有新公開寫入 API。既有 ACL、RLS、管理員驗證、Published 保護及人工發布 content_verified 保留。新增 cleaner 為不可由應用角色執行的 invoker。
- active Review 的候選／baseline 移除舊欄位並遞增 revision，舊頁面必須重載；已完成歷史、Audit、operation receipt、raw_candidate 原樣保留。常駐匯入工作保留 ID／決策／operation，只移除專屬 verification 的差異，來源欄位決策移轉至 data_source；受影響項重算 pending_count、標記 stale 後重新比對，不重新套用既有成功內容。
- 遷移先鎖定及建立非公開 dictionary_verification_backup 回復資料，受限 schema 無 anon／authenticated 存取權；交易內逐列比較剩餘欄位，非預期變更立即回滾。這是移除內容狀態欄位，不是刪除 Draft／Review Draft／匯入疑義工作流程。部署、舊檔處理與回復界線見 docs/operations/DICTIONARY-VERIFICATION-RETIREMENT.md。

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

### 附件版本快取與同步合併（2026-10-19，Refs #84；本機已實作，待部署）

- `pullWorkspace` 仍先處理 tombstone／owner metadata；binaries 列表僅取 `id,owner_id`。`apply_workspace_operations` 的 binary 寫入會原子增加 attachment revision，因此以 `(owner,id,attachment revision)` 判斷快取；不依賴檔名、下載時間或 binaries.updated_at。不新增 SQL、索引或 RLS 變更。
- IndexedDB binaries 加入可選 `owner_id,server_revision,verified_size`；舊紀錄保留，第一次同步重新驗證一次，無需升級 DB version。只有缺失／版本不同／Blob 或大小不符時下載內容；下載後再讀 attachment revision／deleted_at，落盤交易再次檢查 owner、版本、tombstone、pending outbox。既有本機修改不被覆蓋；失敗保留快取與 outbox，可重試。附件 metadata 修改也會增加版本，保守地重新驗證該單一檔案。
- `workspace_sync_meta` 保存 owner/id 專屬 60 秒下載租約；IndexedDB readwrite 交易讓同源多分頁互斥。網路下載 45 秒逾時，租約過期可接手，舊 token 不能覆蓋新租約；其他分頁下次同步讀共用快取。此機制只合併檔案下載，各分頁仍可讀 metadata。Blob 的結構／大小檢查不是密碼學內容校驗。
- `IndexedDBAdapter.getAttachment/readBinary` 加強 owner 篩選與已知過期版本的讀取保護。登出／帳號切換立即清空舊帳號 UI，晚到的同步及登出讀取不得套用至新帳號。同帳號 auth refresh 沿用 SyncEngine。
- 同分頁 fullSync 共用進行中的 Promise；同步中的變更合併為一次後續同步，保留持久 outbox。前景週期仍 60 秒；背景週期降至 5 分鐘，事件合併延遲 5 秒；恢復前景重新確認。沒有停用離線／跨裝置同步。
- 量測、限制、發布／回復與監控見 `operations/ATTACHMENT-SYNC-CACHE.md`。正式帳號與 Safari 驗收尚未執行。
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
- **已退場的 Quiz 相容性**：產品不再掛載 Quiz UI、建立 QuizRepository 或從 SyncEngine／syncStudy 上傳與重試 Quiz。`legacyQuiz.ts` 僅供 IndexedDB 保留 store 名稱；原始歷史、離線決策與佇列不變。`quizPersistence`／`quizSync`／題目工具僅保留為未被產品引用的歷史恢復契約及安全回歸測試；沒有自動恢復／上傳入口。歷史 RPC、收據、RLS、migration 及帳號刪除依賴保留。
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

## 字典管理權限與 UI 的責任分離（2026-10-12）
- UI 的管理入口只對已有管理權限的使用者顯示；登入工作階段已能確認身分，不設重複的管理員確認步驟。
- **入口可見性不是授權控制**。字典新增、修改、發布、匯入等受保護操作仍需在後端依經核實的 Auth UUID／管理員角色逐次驗權；直接發出 API/RPC 請求的普通使用者必須被拒絕。
- 規劃 RLS／RPC／API 權限設計與雙帳號測試時以此作硬性安全前提，避免只靠前端按鈕顯示條件保護公共資料。

## F-STUDY 四選一測驗取消後的技術退場邊界（2026-10-12）
- 新的產品目標不包含 Study 四選一測驗。本文前述 Quiz stores、RPC、migration、測試路徑僅用於記錄現有／歷史資料結構及退場盤點，**不表示新規格仍要求 Quiz 功能**。
- 保留相容性與資料安全：任何移除 Quiz 資料表、RPC、IndexedDB stores 或修改既有 migration，均需先核對實際部署與資料量、備份／還原、同步與帳號刪除依賴，再取得獨立批准；不得讓退場影響 FSRS 學習歷史。
- 筆記編輯器的題目與選項為獨立的通用內容工具，與被取消的 Study 測驗分開。

## 字典 Entry／Sense 與匯入資料契約（由 SPEC 分流；2026-10-12）

> 以下描述已規劃的技術資料模型與匯入保護，**不是產品 UI 規格，也不代表已核實目前部署狀態**。使用者目前確認的管理頁匯入視窗只接受 CSV；歷史 JSON／AI 等處理途徑是否仍需要保留，必須以程式碼、API 與後續產品決策核對。

- 同一 `kind + lower(btrim(headword))` 對應一個 Entry；多個詞性、釋義、詞源或語義以多個 Sense 表達；stable Entry／Sense IDs 維持引用完整性。
- POS／gloss 與適用於個別語義的 etymology、example、learning content、pronunciation 歸屬 Sense；Entry 共用內容另行表達，避免跨 Sense 覆寫。
- Sense-aware pronunciation 原候選欄位：`id, entry_id, sense_id nullable, locale nullable, ipa, note nullable, sort_order`，另含 revision／updated_at；`sense_id` 必須屬相同 Entry。實際 migration 與 schema 仍須查證。
- 匯入階段先預覽及驗證，區分 Safe／Review／Invalid；Apply 重新確認 snapshot／revision／狀態／權限；保留稽核收據及冪等性；批次切分不能拆散同一 Entry 的 Sense。
- Word CSV runtime 曾採五欄：`entry_id,sense_id,headword,part_of_speech,gloss_zh_tw`。Canonical master CSV v1 曾採十二欄：`kind,entry_id,sense_id,headword,part_of_speech,gloss_zh_tw,category,etymology,example_words,source_forms,relation_hint,mnemonic_story`。二者用途不同，**最終匯入 UI 格式與轉換流程仍須核定**。
- `relation_hint` 為候選關聯；`source_forms` 字形註解已退場，詳見下方本輪遷移契約；`levels` 供 Official Study Pack manifest 使用，與字典內容分類分離。
- Inflection／Derivation 應具不同語義；如何建立欄位或關聯模型，待產品規格確認。

## F-DICTIONARY｜正式目標架構與資料契約（2026-10-12）

> **適用邊界**：此節包含部分歷史技術目標；現行實作必須以最新 main 驗證，與 #44 不一致的 CSV-only 敘述以 SPEC 新決策為準。此節是 Codex 應對照現有程式碼實現的架構目標。既有資料庫 migrations 已存在（20260930～20261018）；本節不等於實際 production schema 已經逐項驗證，也不授權立即執行 SQL、刪表或批次匯入。產品畫面及文案以 `SPEC.md` 的 `F-DICTIONARY — 字典` 為唯一依據。

### A. 系統邊界與分層

- **Public Dictionary**：全站單一公共資料域，包含 Word／Prefix／Root。一般登入使用者透過 Reader 僅取得已發布內容；管理員可建立 Draft、編輯、匯入、預覽、審查、發布與刪除。字典資料不以使用者 owner_id 建立私人複本。
- **Private Study**：個人字卡及其 FSRS 狀態、學習事件、設定、學習集均由使用者持有；卡片透過穩定 Entry ID 指向字典。字典更新只能影響字典詳情的顯示，不可自動覆寫私人卡片文字或排程。
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
| 官方學習包 manifest | pack、published Word Entry ID、順序／級別 | 學測 1–2、3–4、5–6 級；下載建立用戶私人 Study Set，不建立第二份字典 |

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
- **現有格式差異**：`dictionaryCSV.ts` 現行為移除 source_forms 後的 11 欄 Dictionary CSV 和 Word 舊五欄；`adminImport.ts`／DictionaryAdmin 仍含 Markdown／JSON／AI 相容路徑。Codex 必須先確認這些路徑是否被其他內部／migration／管理工具呼叫，再移除或封存不屬於管理 UI 的功能。
- **資料無損要求**：CSV 欄位契約需可完整表達產品要求的多 Sense、Entry／Sense 讀音、變體、詞源及構詞關係，或明確定義 CSV 對這些內容僅部分支援並由管理 UI 防止不完整匯出／覆寫。**在使用者核准完整 CSV schema 前，不得聲稱 CSV 可以全量無損 round-trip**。
- **匯出**：管理介面提供資料匯出；明確標示全部／篩選範圍、草稿／正式內容範圍與資料完整性。若目前 CSV 無法無損保存完整詞條，需阻止誤導性的「完整備份」敘述並回報缺口；不得靜默丟失讀音或 Sense 關聯。
- **批次安全**：檔案大小／列數／編碼、錯誤列提示、同 Entry 多 Sense 群組、預覽後來源版本變化與重試冪等需有驗證及測試；運輸分批大小屬效能參數，不應固定成舊歷史 13 批方案。

### E. 前端互動、狀態及邊界

- **進入字典**：字卡 →「字典」→字典；頂部「←返回字卡」「字典」「管理字典（僅管理員顯示）」。下方是搜尋框「查詢英文、中文」、「搜尋」、「篩選」，篩選浮層含 Word／Prefix／Root 三種，預設全選。
- **詳情頁**：返回實際來源並保留 query、filters、scroll、順序上下文；上一筆／下一筆依來源結果排序，手機和平板支援左右滑動；管理員右上角「編輯此詞條」直接進入同一詞條編輯器。
- **內容元件**：相同詞源的註釋由一個來源視覺容器承載，內部保留多段落／義項資訊；多詞源清楚分組。展示讀音、變體、種類、義項、口訣、記憶、詞源及構詞關聯。
- **管理頁**：工具列提供「新增」「匯入資料」「匯出資料」「發布全部草稿」；新增以 Word／Prefix／Root 下拉切換同一編輯面板。清單不再提供項目核取／全選／本頁選取發布／批次刪除；類型篩選保留，原Draft／Published篩選由紅／黃／綠工作狀態多選取代。單筆刪除移至已儲存 Draft 編輯頁，詳見 PR #57 章節。
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
- `dictionary_relations` 保留所有 ID／目標 Sense FK，來源 `sense_id` 支援 null（詞條共用）；構詞模型不含關聯種類／查證狀態／查證說明。舊關聯種類／說明只供無損相容與歷史保留；逐筆 verification 狀態已由本輪增量 Migration 移除。擴充 Word 成分並拒絕自身連結。排序**沿用既有 `dictionary_ai_metadata.component_order`**，不建立平行排序模型。選取器只列已發布候選，DB 仍允許既有批次匯入暫時指向 Draft 成分；發布前必須先發布所有目標，維持舊批次安全機制。
- 舊 `source_forms` 已從有效模型及編輯器移除，不轉換為詞形；資料庫以本輪安全退場 Migration 清理，備份與不可變歷史不提供產品編輯入口。CSV v1 沒有詞形欄位，含詞形的 CSV 匯出明確拒絕；完整交換使用 #44 JSON Exchange v1，JSON Bundle／AI JSON 亦保持原流程；現行 CSV 移除 source_forms 欄，舊格式明確拒絕，不靜默丟棄。
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
- 套用：字典搜尋（含構詞反查／變體）、Prefix 義項分類、Root 分類、管理詞條清單、構詞候選 dialog、字卡編輯的手動字典連結、評分背面字典候選、批次字卡連結建議。A4 筆記、簡報及角色卡內容頁模型不變。
- 管理清單及反向／變體查詢使用既有 Supabase select 的 exact count，在相同篩選、排序及 range 取回可信 root Entry 數。新版管理工作狀態透過既有RPC取數；雙色聯集的相容查詢見下方UI一致性章節。PR #57 已移除管理清單選取；搜尋／分頁保留，發布使用全域範圍。批次建議以本地合乎條件字卡及 RLS 隔離的現有雲端連結 ID 建立確定 dataset，最多每批查 200 個 ID，再以每頁 10 筆並行載入建議；total 為實際未連結卡片數，不把已跳過卡片算進頁數。
- 新 SQL `20261013064759_dictionary_pagination_totals.sql` 由 CLI 產生，僅更新五個既有搜尋 RPC 的回應 `total`（構詞候選另補 page）；既有 predicate、Published／管理員限制、函式簽章及 ACL 保留。使用同一 matches CTE 計算完整 count 與頁面，Prefix 分類計 Sense 列、其餘計 Entry。classic `search_published_dictionary` 加入 all，字卡 All 搜尋改為單一全域排序分頁，不再把三種 kind 的獨立頁拼成一頁。舊客戶端可忽略新增 key。
- **套用依賴**：正式 DB 需先具備字典 migrations 至 20261021，SQL 有前置 guard；當次開發未套用正式Migration，其後已核實遠端ledger `20261013072108 dictionary_pagination_totals_20261013`，現不需重播。倉庫舊migration使用8碼歷史日期，不能將CLI timestamp與舊檔名排序視為可靠重播順序；函式 owner／ACL、schema cache、結果 totals／普通使用者隔離一併核對。無新表、無資料清除、無寫入／發布權限變更。
- #41 核心流程沿用 PR #46／#51，沒有另建發布流程。使用者本輪回報兩 PR 已正式部署且核心操作已實機驗收；本輪技術核對另涵蓋 admin／普通角色、Draft／Review／Published 隔離、查證確認、stale base／revision、重新開啟與失敗恢復。普通角色的自動化測試不是正式第二帳號實機測試；依單人測試階段的精簡標準記錄為「等待正式部署與最終驗收」，不自動關閉 Issue。

- 本輪交付驗證：字典＋分頁 100/100（無 skip）、TypeScript／Production Build 通過、ESLint 0 errors／468 warnings；桌面 1280×900 與手機 390×844 隔離 Chromium 驗證 7 個實際元件場景（分類共用 Prefix／Root 元件）、頁碼／條件／焦點／連續請求／錯誤重試／資料縮減。PGlite 測試新 SQL 的總筆數／頁面條件一致、普通角色隔離及函式 ACL 保持不變；正式 DB 僅唯讀核對 #41 已部署權限，沒有正式 Migration／帳號寫入。


## F-STUDY 字卡樣式與雙排程（#47；2026-10-14）

**程式已實作、隔離測試通過；以 main `861a39e` 的 F-STUDY SPEC 為準。新版正式帳號／實機驗收尚未執行。舊 PR #54／#58 的已取代行為不作現行契約。**

### 設定、樣式與相容移轉

- `studyStyles.ts` 定義完整 `StudyStyle`：模式、排程方法、100 張單次名額、20 張每日新卡、200 張暫停門檻、出卡／複習排序、New／Relearning／Review 各四個固定間隔（正整數秒，最多十年）。自訂樣式完整替換、不逐欄混入預設。
- 沿用 `study_settings`／Supabase `study_deck_settings`：以 `record_type=style`、`study-style:*` ID、完整 `style` JSON 儲存共享樣式；學習集 row 帶 `style_id`／`style_version`。這些 text IDs 沒有 deck FK，原 owner-scoped settings RPC 支援，無新表／RPC／RLS。預設 seed `updated_at=0, initial=true`，不覆蓋另一裝置已編輯的預設；正常編輯沿用單調 timestamp 與原 LWW 設定同步。
- Repository `listStyles/saveStyle/styleForDeck/assignStyle` 使用既有嚴格 IndexedDB 交易及 outbox。舊已儲存數量／排序／模式完整保留成穩定 ID 的移轉樣式，顯示 `style_migration_notice`；包含無法分辨是否明確自訂的舊 50，均不默默改為 100。無舊覆寫值才使用新預設；選回預設樣式是明確操作。
- `StudyPreferences` 在現有偏好分類提供共用樣式名稱／建立／編輯、學習集指定、全部排程設定與秒／分／時／天輸入；新增按鈕在最下方。更改共用樣式影響後續所有指定集的新 Session，不直接修改卡片。

### 排程與正式事件

- `scheduledStudy.ts` 依有效樣式選卡，先插入到期 Learning／Relearning，再套用新舊排序；全部不同 target 合計不超過單次上限。每日額度以當地日界的 introduce distinct IDs＋已引入 state 計算；`presentScheduled` 才在同交易建立 introduce，不因預選扣額度。到期舊卡達門檻即停止引入；低於門檻恢復但仍受當日額度約束。
- 無盡只在正常候選不足時以最近 due 的尚未到期已學卡補位，第一次提前作答正常寫 review／due；不修改未選卡、不重複補同一卡。低可回想率排序僅計算具有 FSRS 記憶的卡，這組先依機率排序；無記憶組穩定依 due／ID 排序。
- `studyFSRS.ts` 沿用 ts-fsrs 5.4.2／FSRS-6；新增 `nexus-fixed@1`，每次固定作答保存獨立 `fixed` state、真實 `FixedReviewLog`（method/rating/review/due/interval/state before-after）、固定參數與原始 before/after。不能用 null log（既有 SQL review 契約拒絕），也不偽造 FSRS log。Review Again 使用 Review 間隔並進 Relearning；下一次才用 Relearning 間隔。Learning 使用 New 的間隔組。
- 每次新正式 review 帶 `scheduling_method`、`style_snapshot`；方法切換帶 `method_transition`。固定狀態與 FSRS 記憶分開，固定作答不更新穩定度／難度。回切 FSRS 有原記憶時用原狀態及實際時間，無記憶時於下一真實回答初始化；不估算歷史，不因選樣式就重設卡或 due。
- `fixed.generation` 必須等於 state.generation 才生效：既有雲端 relearn RPC 保留未知 JSON 欄位，但新 generation 使過去固定狀態失效，舊值仍可追查。`studyReliability.ts` 按事件快照可重現驗證固定／FSRS 結果；無新增欄位的舊 FSRS 事件仍按原內容重播。

### Session、同步與復原

- 新 `StudySession.settings_snapshot` 深拷貝完整有效樣式；刷新／重開／樣式改動仍用凍結規則。舊 Session 無快照時保留已知原 FSRS、名額及模式，凍結可讀舊設定並設 `compatibility_notice`，不套用剛選的新固定方法。
- `refreshScheduled` 只依真實 due 決定 ready/waiting/blocked；短步跨午夜仍等到期及完成必要作答。target 只占一次名額，重複 Again 不增加。Session／event／state／outbox 同交易；相同 action ID 重試不重複評分。完成畫面僅祝賀與返回導覽，沒有開始／下一批／額外練習續接。
- 現行衝突不再按舊 latest／conservative 偏好自動選排程；UI 僅明確「保留歷史並重新學習」或稍後。保留原 guarded resolution RPC／版本 CAS。可靠 reset 事件／已驗證 resolution 可證明新 generation；其舊 generation 分支保留歷史但不再競爭目前排程，同 generation 分岔仍阻擋正式作答。不根據裝置時鐘或未證實的 generation 猜測合併。
- IndexedDB DB_VERSION=8、workspace backup schema=3 不變；catalogue、固定狀態、事件及 Session 快照走原 JSON 序列化。匯入備份先驗證完整樣式、身份及 assignment 參照，失敗在任何寫入前拒絕；原 v3 備份無新欄位仍相容。舊 practice／Quiz stores、API、資料與原 Migration 只保留相容，不新增使用入口。
- 正式 Supabase 僅唯讀查驗既有 RPC 定義；隔離 PGlite 實際執行原 `20260922_study_fsrs.sql`＋`20261016_study_reliability.sql`，驗證完整 style JSON、固定／FSRS 事件、掉回覆冪等重試、雙裝置樣式／記憶與固定 fork／relearn、owner／anon 隔離。**本次無新增或待執行 Migration，未寫入正式資料。**
- 界線：Session ID／queue／快照依既有架構保存本裝置，第二台透過事件／state 重建學習，不宣稱取得同一 Session。兩台同時完全離線的每日新卡額度不能原子共享；同步保留全部引入事實，線上開始先拉取已知用量。裝置時區依 SPEC 當地日界。
- 發布後所有舊裝置／分頁先重新整理再作答；舊客戶端無法理解固定事件，不能以舊可靠性檢查繼續操作。建議先匯出 workspace 備份；回退前端不會刪歷史，但回退舊版本不能安全繼續處理新固定排程資料。

### 驗證

相關學習／FSRS／固定／樣式／官方包／字典連結／Quiz 相容／Workspace Sync 單元整合與真正元件 Chromium 測試，以及 TypeScript、ESLint、Production Build，本輪 126/126；瀏覽器 1/1；TypeScript／Production Build 通過，ESLint 0 errors／467 既有 warnings。重跑命令見本次 PR。瀏覽器覆蓋桌面1280、平板820、手機390及 zh-TW／en；沒有替代真實帳號／裝置驗收。

## #44 字典完整交換與批次作業（2026-10-13）

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

字卡核對是 PR #57 當時的實作記錄；其舊學習規則已由上方 F-STUDY 字卡樣式與雙排程段落取代，不作現行契約。

正式Supabase本輪只SELECT核對：delete RPC及全域preview／四參數publish／report已存在、空search_path、authenticated可execute而anon不可；舊三參數publish對authenticated已撤權。delete內含admin／revision／Published／參照guard；report核對actor。沒有正式刪除／發布／Migration。

PR #57 本輪驗證：字典單元／整合116/116、既有排程／Session／離線同步核對35/35，瀏覽器3/3（字典全域發布／單筆刪除／恢復：桌面／平板／手機；Published直接編輯及離開保護：桌面／手機；字卡設定保存／Again等待／Good畢業／無盡隔離：桌面／平板／手機），合計154項；TypeScript／Production Build通過，ESLint 0 errors／467既有warnings。初次舊編輯器瀏覽器fixture缺Playwright預設binary，指定系統Chromium後完整通過；新加language hook的舊單元hook fixture補上useContext模擬，所有斷言保留。未重跑#44的6300筆效能（本轮未改SQL／分批算法），未宣稱正式帳號／實機驗收。


## #16 安全自動部分匯入與常駐審核（2026-10-15）

**已實作／隔離驗證；正式 SQL 未套用。此段取代 #44 舊「整筆完成決策才套用、只本機待審」的實作界線；完整交換格式與人工發布契約不變。**

- `importSource.ts` 重用 Exchange／CSV／Markdown 解析與有界 inspect；舊格式單 Entry 無法映射時保留原 bundle，其他有效 Entry 不受阻擋。未知欄位／無法映射的原始候選常駐保存，要求修正原檔，不能以空白 placeholder 當成成功轉換。新增 `strictIdentity` 不影響舊 API；新流程不將明確外來 Entry ID 自動路由至另一同形詞條。
- `persistentImport.ts` 重用 classify／map／resolve／validate：以現在 Published 及唯一 active Review 的完整候選作比較。只接受可驗證的新增／補值；同 ID 內容差異、重複 Sense／詞形、未明共用範圍等留待決策，不能將 new_content 一律當安全。詞形依類型／詞性／Sense scope／同槽既有資料判斷，不自動推導或聲稱語義已外部查證。
- `partialImportPlan` 把未決欄位投影為保留現有，暫緩的 Sense 與依賴子項一起保留；只回報真正包含在候選或明確保留的 handled issue IDs。初次自動套用只處理未選擇且安全的內容；保存的 keep／later 不會被自動恢復覆蓋。手動「套用已決策項目」只接受完整決策，不把未決差異視為同意。硬性 identity／版本／無效結構不提供強制接受。
- 新增單一 `dictionary_import_review_items`，保存既有 ImportItem＋不可變原候選、來源檔名／時間／舊 Session/item/operation ID、Entry 目標、版本、差異／決策／applied flag、結果及 actor。proposal_key 對去除技術 revision／行號、正規化 proposed IDs 的候選雜湊，重匯同來源不複製工作項；保留實際 Entry／Sense／內容 ID，不用該雜湊取代 Stable ID。不是另一套字典或 Import Batch ID。
- 全部寫入只走 admin RPC；表僅 authenticated SELECT＋is_dictionary_admin RLS，無直接 DML 權限，anon 無 execute。沿用 `dictionary_audit` trigger 記錄 before／after／actor，沒有另建平行發布、audit 或 receipt 管線。entry_id 為 text 且沒有 Entry FK，允許保存尚未建立或非法目標的阻擋紀錄，避免為了保存紅色工作而編造公開 Entry。
- 每批最多25項：`stage_dictionary_import_reviews` 冪等保存；`decide_dictionary_import_review` CAS 保存選擇（不寫字典）；`save_dictionary_import_review` CAS 重新比對且禁止捏造決策／已套用旗標；`apply_dictionary_import_reviews` 鎖定、重新驗證完整 Published／子項／metadata／active Review 版本與 ID owner，再委派原 apply_dictionary_import_operation 或 save_dictionary_review。active Review 只 overlay 增量且核對 base snapshot，保留 Review ID 與人工核准；無直接 Published 寫入。
- 套用 operation UUID 由常駐 item ID＋預期 revision 穩定產生，與原 receipts 同交易提交；掉回覆精確重試不新增 Sense／Review。人工 new_sense 的新 Sense／子項 UUID 在決策時一次分配保存，不在重試時重生。單筆失敗 subtransaction 回滾字典與 receipt，不阻擋其他合法項；失敗／版本變動記錄為紅色阻擋，需要重新比對。舊不適用決策保留 previousDecision，不能以舊 incoming 繞過新硬阻擋。
- `list_dictionary_admin_work` 依唯一目標 Entry 聚合三色優先 red > yellow > green，紅色差異另計；包含未能建立 Entry 的阻擋提案。狀態統計依相同種類／底層狀態／literal 搜尋範圍，工作顏色再篩選，100筆分頁。同步 main `b90b53c` 的清單規格，桌面3／平板2／手機1欄，不改查詢、排序或每頁筆數。Published 有 active Review 為黃；有任何未決／失敗為紅；公開閱讀仍讀原 Published。`get_dictionary_import_reviews` 50筆分頁，管理員跨裝置讀取同一份決策與 CAS revision。
- `PersistentImportReview` 一次摘要／確認後自動保存及套用，進度、暫停、恢復、結果下載；`PersistentReviewPanel` 提供來源／現有與候選／原因／相依資訊、決策／已套用區別、重新比對、套用獨立決策及整個已保存範圍的安全續作。真實 Next/React 元件、IndexedDB、SQL 已用隔離 Chromium 驗證，zh-TW／en 不改 Exchange schema_version 1。
- 沿用本機 dictionary job DB v2／原 item stores：新預覽先嚴格持久化，保存失敗不送新 RPC；舊 Session 的 metadata 另以既有 job store 封存，原 item rows 不刪除，可選取／下載／重新載入。沒有新 IndexedDB store 或清除舊作業。新 Session 未開始項仍可從同裝置恢復，已 stage 的未決／未處理資料可跨裝置續作。
- 舊作業轉移不重新執行 applied／unchanged／skipped；未確認回覆的 operation 沿用原 UUID 精確重試 receipt，保留 Review ID、原選擇與原始檔。結構不足時保留 raw_candidate、封存或下載原 Session JSON 再匯入核對，不推測已完成數量。不把使用者背景中的 6,301／6,273／28 寫成程式常數或正式 DB 事實。

### Migration ledger 與啟用順序

| 檔案 | 依賴 | 本輪狀態 |
| --- | --- | --- |
| `20261015020759_dictionary_persistent_import_review.sql` | 現有 draft pipeline／revision lifecycle／identity／pronunciations／inflections／composition shared，以及 `20261013084116_dictionary_bulk_exchange.sql` 的 inspect／exchange version | CLI產生增量檔；新增一表、索引、RLS、audit trigger、7個管理API＋1個內部pending helper；隔離測試通過；**使用者於2026-10-15回報已正式套用；本輪UI開發未另查正式ledger或執行SQL** |

前端以 `dictionary_import_review_capabilities` 版本1偵測；只有 PostgreSQL missing function／PostgREST PGRST202 才安全退回原匯入及管理清單，不將權限或網路錯誤偽裝成未啟用。正式唯讀核對依賴 RPC／ACL 已存在而 capability 未存在。可先發布相容前端，正式授權後一次套用本增量 SQL、確認 API schema cache 與版本回傳後功能自動啟用；不重播歷史 SQL，不變更 Supabase／Vercel 設定。回退前端不得清理新表／audit／receipt，也不要用舊 UI 重跑新常駐作業。

### 驗證與界線

相關回歸133/133；最後依賴群組修正核心12/12（與回歸重疊）；瀏覽器3/3（新常駐審核、原大量交換及Published編輯，桌面／平板／手機適用範圍依各測試）。TypeScript／Production Build通過、ESLint 0 errors／467既有warnings，詳見本輪PR。新增具體 throw／shoot／do、部分義項與詞形、Stable ID、版本、Review 保護、決策 CAS、跨瀏覽器、舊 operation／本機封存測試。6,301筆實際 PGlite preview/stage/apply 加掉回覆／fresh-client 續作：最終獨立執行67.7秒（preview＋stage 13.7秒）；與Build／回歸並行的另一輪約140.5秒（preview＋stage 50.5秒）；沒有刪除或跳過測試。PGlite 不是遠端 staging／正式 Auth JWT 測試，真實操作與 SQL 授權見常駐 #60。

一般 Schema／POS／Stable ID 檢查不能證明語義查證；仍須人工發布。所有已 stage 記錄可跨裝置審核，尚未 stage 的原始檔／Session 沿用本機保存或使用者備份檔，不宣稱檔案本身跨裝置。舊必要資料不足或硬衝突只保留並提示，沒有自動破壞性資料修復。


## 全站UI一致性：共用工作區、導覽與列表（#34／#32，2026-10-15）

本輪已實作，實機驗收留#60；合併與預覽結果記錄於PR。沒有新增或執行Migration，也未對正式字典匯入、發布或批次寫入。

- `WorkspaceRoot` 在根layout維持同一個`NexusApp`；首頁／study route為空route marker，字典／官方單字集作為既有工作區的外部內容。從外部功能回私人功能沿用已載入的編輯器與私人工作區；字典公開閱讀不被私人登入門檻攔截，未登入不讀私人頁面。`/study`直達及返回以共用study導覽事件開啟學習集。
- 所有路徑共用一個`FloatingSidebar`與一份`Sidebar`。原生modal dialog覆蓋主區、不占版寬；關閉仍保留子元件／檔案清單狀態，Esc／遮罩／關閉鈕收合並回復入口焦點。頂部、中間可捲動區與底部帳號／偏好共用，使用dvh、安全區及短視窗導覽高度限制。右側輔助頁沿用原模型。偏好與項目選單portal掛在所屬dialog，避免落到原生modal的不可互動背景。
- 一般設定整合功能排序及預設收合的顯示勾選；`nexus-hidden-features`僅為裝置本機偏好，只影響側欄，首頁launcher與資料不變。保留舊排序key；讀取舊counter／draw次序時去重對應tools，頂層工具開啟`ToolsOverview`，內部切換既有counter／draw清單；功能項目雙擊、長按／右鍵或鍵盤Enter可開啟；單擊僅篩選，不再有獨立箭頭鈕。
- Web不能切換的根因為部分功能handler未清除utilityMode；所有目標功能先清除其他overview旗標。共用導覽先`flushAllSaves`，包含非目前頁與輔助頁的pending／in-flight寫入；失敗留在目前介面，字典另沿用`navigateDictionary`離開保護。
- `PageCollection`提供卡片／列表、排序、摘要與`CollectionItemMenu`。`PageItemMenu`沿用並加鍵盤移動、焦點回復及正確portal。筆記、文檔、簡報、小說、創作、網頁、計數、抽選、私人學習集及製譜共用列表；Dashboard共用模式／排序控制；隨手記／日曆事項及官方學習集清單也接入`PageCollection`，保留顏色、完成控制與官方專屬操作。官方學習集保留官方資訊／重新同步／刪除，避免不適用的複製。創作只在主建立鈕後選世界觀／角色卡，再沿用原模板；未實作角色組件重構或#62。
- 重新命名透過原`flushSave`即時確認落盤，保留Page ID；失敗不關閉改名對話框。刪除先確認後沿用soft-delete／官方權限與回收桶；複製沿用工作區內容複製：新Page／章節／Study Card ID，私人學習集只複製front／back／dictionary_entry_id與方向確認，不帶FSRS狀態、事件、Session或官方身分。隨手記保留顏色，日曆副本保留日期／優先級並清除完成狀態。單一筆記建立視窗沿用流動／手動分頁初始化，改用原生dialog支援Esc與焦點。
- 管理字典使用container query：內容容器<560px一欄、560–899px二欄、>=900px三欄。建立／匯入／匯出左側，未審核詞條／全域發布右側；上下`Pagination`共用同一`usePagedList`，搜尋／篩選重置並校正頁數。移除額外總數行與舊單選工作狀態。保留紅色待審數、每列三色與匯出進度總數。
- `listAdminWork`沿用正式單色RPC；零色或三色不限、單色直接查詢。雙色以每次100筆讀取同條件的伺服器排序stream前綴，收集到目標offset+pageSize後停止，total為原scope兩色stats之和；不是篩選當頁，也不在JS重新排序。頁間total／stats改變時要求重試。最差可能讀完整scope（6,301筆最多64次有界請求）；這是避免UI改動要求正式RPC／Migration的相容取捨。既有`usePagedList`最後請求優先、載入／錯誤／重試機制保持。
- Published／Draft／Review Draft、常駐審核、Stable ID與人工批准資料契約不變；「發布全部草稿」仍固定全字典scope，不受任何管理清單條件影響。匯出依原kind／status／query交換契約，工作狀態並未加入交換RPC；確認面板需明示這項範圍，避免與工作佇列篩選混淆。


### PR #63 後續 UI 修正（2026-10-15，#34／#32）

- `WorkspaceNavigationProvider`／`SidebarToggle`把同一側欄入口注入原有編輯器標題列（返回鍵左側）；內頁不再插入額外全站頂欄，功能首頁保留首頁導覽。`FloatingSidebar`是無框、無圓角、無陰影的單層平面，只保留Sidebar左上無框關閉鍵；原生dialog維持遮罩、Esc與焦點還原。
- `FloatingPanel`以原生modal共用功能總覽與純類型選擇；功能總覽在固定位置保留同一四宮格關閉入口。modal top layer避免背景可操作，點空白遮罩或Esc關閉並回復焦點。純選擇無取消鈕；改名等有輸入表單不以遮罩直接丟棄輸入，原有確認／儲存機制保留。
- `ToolsOverview`是真正頂層工具首頁，僅在內部選counter／draw並使用原PageCollection與建立流程；`NexusApp.toolKind`保留編輯後返回的子功能。資料kind／ID、既有直達連結不改。`activatePage`依目標重設utilityMode，避免跨功能跳轉殘留Web模式。
- `CollectionControls`整合列表／卡片圖示及同一排序選單中的升降冪；`useCollectionPreferences`沿用原localStorage view key、兼容icons／list／details，新增同key的`:sort`設定，無法儲存時本次記憶體仍可操作。這是裝置顯示偏好，不改動帳號或同步資料契約。
- `PageCollection`列表為無框水平列、右側共用時間及獨立選單，不渲染摘要；卡片繼續多欄、摘要與外框。官方專屬動作由extraMenuItems注入，不開放一般複製；隨手記顏色與日曆完成控制亦透過小型插槽保留。
- `EditedTime`／`formatEditedTime`共用當地日曆日判斷，三天內相對時間、超過三天YYYY/MM/DD；使用local date components避免DST及UTC邊界，未來時間超過一分鐘顯示日期。共用單一分鐘timer更新，SSR先顯示中性佔位再hydration套用瀏覽器當地時區，不產生每列獨立timer。
- `FeatureIcon`集中Lucide單色線條圖示與`featureForPage`對應，可由中央替換SVG；只替換系統預設功能圖示，標題／內容中的使用者Emoji及照片不改。明確creative_type優先於舊character_data欄位；缺type的歷史角色與小說沿原相容判斷，創作／小說清單互斥，不搬移或改寫記錄。
- 本輪只改前端、顯示偏好與回歸測試，沒有Migration、RPC或正式資料寫入。工具進階規則、角色卡組件改版與#62仍不在範圍；隔離瀏覽器不等於真實iPad／正式帳號驗收，留常駐#60。

驗證：保留原109項範圍並新增5項時間／分類／圖示／控制測試，共114/114通過；原6組隔離Chromium回歸全數通過，工作區新增測試後再獨立重跑通過（1440×900、820×1180、1180×820、390×844）。TypeScript／Production Build通過；ESLint 0 errors／464既有warnings。真實Safari、正式登入同步及裝置觸控仍由#60人工確認。


### PR #64 後第三輪 UI（2026-10-15，#34）

- 管理清單維持原`listAdminWork`、紅＞黃＞綠、精確統計與上下同步分頁；DOM順序改為搜尋、同列可換行類型／狀態、上分頁、列表、下分頁。僅翻譯標籤改為「狀態／待審核／有草稿／新發布」；綠色沒有新增日期判斷，3／2／1容器欄數及全域發布scope不變。
- `EditorSection`以原生details共用基本資訊／義項／詞形／構詞／補充資料五區，收合不卸載輸入。詞形使用響應式grid表格式編輯列：sm以上類型／詞形／Sense／44px刪除，窄版標籤堆疊。Stable ID／sort_order、來源、例詞、讀音、歷史詞源、記憶內容及舊註釋仍沿原Bundle與驗證管線；新增與刪除控制縮小視覺但維持可點擊區、確認與既有RPC。sticky操作列保留dirty、先存後發布、人工批准及衝突保護。
- `PublishedWorkspace`只顯示日常最新版本／草稿；有active Review才顯示切換，最新預覽取Published base snapshot，草稿編輯器在切換時僅hidden、保持掛載及離開保護。一般編輯頁不再查詢或呈現Published版本歷史；歷史資料表、Audit、revision與RPC完全保留。多份舊active Review仍須明確選擇，不自動合併；選單立即快照review ID，離開確認後才使用該ID切換，避免Safari受控欄位還原選取值；stale提示、備份、重新載入、捨棄草稿及人工查證確認不變。
- `PersistentReviewPanel.compact`只供一般詞條頁：零工作不渲染，有未決／阻擋工作只顯示提示及管理審核連結，錯誤可重試。完整決策仍在原管理入口／同一常駐RPC，不因切換或隱藏面板刪除決策。
- `SidebarNavigationButton`將單擊篩選延遲300ms，雙擊取消單擊；Enter、600ms長按／contextmenu可開啟，移動超過10px取消長按。長按與contextmenu去重，首頁仍即時單擊。所有項目雙擊開Home；工具也改回單擊只篩選。垃圾桶快看只變側欄資料，不清除主區模式、不插入頂欄。
- `/trash`是受既有工作區登入門檻保護的route marker；`WorkspaceRoot`保持同一NexusApp，`TrashPage`使用原trashPages／restore／permanentDelete及Workspace Tombstone，沒有第二個資料模型。URL保存本地from路徑／query／hash，`trashReturn`拒絕外站、反斜線、控制字元及循環返回；直接開啟／刷新會重新讀原本機owner資料。復原不跳出清單，永久刪除須確認，失敗保留項目並可重試；原章節／附件清理與同步語意保留。
- `CollectionControls`由native select改為共用modal menu，每個方法唯一menuitemradio，選中勾號與方向圖示／無障礙方向名稱。選取或重點選只呼叫onSort、保持浮窗，外側／Esc／觸發鈕才關閉；方向鍵／Home／End管理焦點，關閉回原入口。新方法預設日期／內容長度遞減，名稱／類型／due／自訂遞增。舊自訂排序未曾提供方向且固定按sort_order正序；讀舊無version偏好時解讀為遞增以保持原顯示，首次操作寫version2。其他方法原方向不變，且不重寫Page或sort_order。
- 本輪沒有SQL／RPC／RLS／備份或同步格式變更，無Migration與正式資料操作。Chromium尺寸／本機SQL測試不等於真實iPad Safari或正式帳號人工驗收，留#60。

驗證：119/119相關單元／整合（保留前輪114項，新增5項本輪契約），6/6隔離Chromium組通過。最後自訂順序無障礙修正後重跑34項UI回歸與工作區四尺寸組通過；TypeScript／Production Build通過、ESLint 0 errors／464既有warnings。垃圾桶／詞條／排序的真實iPad Safari與正式帳號驗收仍留#60，沒有執行正式SQL或字典資料操作。

### 2026-10-16 字典發布後的管理清單重新驗證

- `dictionaryInvalidation` 只發出無內容的失效通知：同頁 CustomEvent、其他分頁 storage、focus／pageshow／visibilitychange 合併為一次重新取數。localStorage 不可用時仍支援本頁與頁面生命週期。
- `DictionaryBulkPublish` 的正常／恢復工作共用 finally 通知；即使部分發布後暫停、網路錯誤或本機 checkpoint 失敗也重新讀取，不假設整批未寫入。原批次進度、確認與結果報告不變。
- 管理頁沿用 `usePagedList.retry` 與 `listAdminWork`，整體重取詞條、三色、精確總數、統計。保留搜尋／篩選／頁碼；僅總數縮減時 clamp。舊請求 cleanup 不可覆蓋新回應；active Review Draft 仍由伺服器決定黃色，沒有前端強制轉綠。無 SQL／RPC／schema 變更。

### 2026-10-16 首頁整列工具列與顯示分組

- Dashboard 不再掛載 NewPageDialog／首頁 PDF 入口／獨立最近編輯刷新。其他 FeatureOverview 的建立視窗、匯入與附件不變；共用 CollectionControls 的單項方向切換、保持浮窗及 version 2 排序偏好不變。
- 左側分類 select 與選取按鈕使用不可拆行的 flex 控制群；右側檢視／排序整組依可用寬度換行。容器使用響應式 padding，320px 起無水平溢出。
- `dashboardGroups` 純函式從既有頂層、未刪除頁面建立 none／folder／feature 顯示群組，搜尋標題與文字並沿用置頂及原排序。創作／小說沿用 isNovelPage，計數／抽選歸 tools，不改實體 kind／folder／Stable ID。單一 renderItems 保留列表／卡片及項目選單。
- `useDashboardGrouping` 使用 device-local `nexus-dashboard-grouping`，無設定或無效值預設 none；useSyncExternalStore 提供 SSR 與 storage 相容，儲存失敗時保留當次操作。原資料夾欄位不遷移、不重寫；原 view／sort 儲存鍵不變。folder／feature 使用各自原生 details，預設全收合，獨立操作；切換分類保留選取集合。
- 自動化涵蓋 320／390／768／820／1180／1440px Chromium、英繁語系、分類與選取同排、展開／排序／持久化及原工作區回歸。此為隔離測試，非實體 iPad Safari 驗收。

### 2026-10-16 Word Sense 編輯列

- `DictionaryEditor` 將 Word 的 `part_of_speech` 與 `gloss_zh_tw` 在各穩定 Sense ID 的編輯列顯示，基本資訊只留 Entry。640px 起詞性／中文／刪除並排，窄版在同列內換行；沿用 Field、EditorSection、原 addSense／removeSense 與 PublishedWorkspace。
- 無資料遷移或過濾空義項；prepareEditorBundle 仍只清理既有非交換 metadata，不改 Sense ID 或內容。Prefix／Root、關聯依賴、CAS／Review／發布 RPC 不變。

### 2026-10-16 官方私人卡片身份分離（已實作，正式 SQL 待授權）

- 增量 Migration `20261016030000_official_private_card_identity.sql` 將不可變 `official_source_entry_id` 與可移除／重連的 `dictionary_entry_id` 分離；來源唯一索引與原下載 RPC 去重涵蓋 soft-deleted 卡片。來源身份／owner／card／deck／pack guard 保留；卡片連結由 after-update trigger 原子維護並沿用 Published Word 驗證。新 capability 只允許 authenticated。未改 RLS 或正式資料。
- 舊身份受原 guard 保護，SQL 交易補 metadata，不修改 timestamps／內容／排程；來源不明則中止。舊裝置未送新欄位時由已存身份補回，不採新連結推測。StudyRepository 在較新離線私有內容仍待同步時可只接收來源 metadata，不以舊遠端文字覆蓋。
- StudySetView 以 capability 防止在舊後端啟用官方連結與單卡刪除；舊文字編輯仍可用。StudyCardEditor 沿原 picker／儲存與排程保留選擇；單卡刪除有確認且只 soft-delete。官方直接新增／匯入與整包刪除保護不變。部署／回滾見 `docs/OFFICIAL-PRIVATE-CARD-MIGRATION.md`；SQL 隔離測試使用真實 Study／Dictionary／Official RPC，僅 Workspace 建頁 transport 為 fixture，非正式 staging。

### 2026-10-16 正式學習中的管理員字典浮窗

- `useDictionaryAdminAccess` 抽出原 DictionaryAdmin 的 auth generation／owner／RPC 管理權限檢查，管理頁與 CardDictionaryPanel 共用。字卡翻面後且面板展開、有有效連結與 Published detail 才顯示編輯入口；一般使用者與未連結卡不顯示。所有實際寫入仍由原字典 RPC 驗權／CAS，無新權限或 SQL。
- 完整 DictionaryWorkspace 按需 lazy 載入於 DictionaryModal，保留 PR A 詞性／中文列、PublishedWorkspace、Review Draft、儲存／人工發布及原 useUnsavedDraft。關閉／Esc／遮罩走 navigateDictionary，失敗或取消保留編輯。浮窗專用 onCommitted 在成功儲存／發布後返回原卡，管理頁未傳回呼時仍留在原編輯器；關閉後只重讀 published detail，不把草稿或公開更新寫入私人 Front／Back。
- ScheduledStudySession 以穩定編輯回呼同步鎖住 mark 與評分按鈕、暫停 study-changed／到期 timer 的背景讀取；原 Session／卡／翻面與 panel 展開保留。沒有新增評分／intro／FSRS 事件。native dialog 管理焦點與背景不可操作。

### 2026-10-16｜角色卡區塊工作區（第五輪 D，已實作）

- `CharacterBlockWorkspace` 是角色卡預設預覽；沿用 `CharacterContentEditor` 的既有組件欄位渲染，世界觀維持原流程。扳手開啟共用 FloatingPanel，遮罩／Escape／儲存均等待 durable commit；失敗保留視窗及輸入。基本資料固定頂部五欄，可刪除／重新加入，不可拖曳縮放。
- `characterBlocks` 提供純函式正規化、移動、排序、尺寸與 ID 驗證。舊頂層組件包成區塊，巢狀區塊展平且保留原始 `legacyCharacterSnapshot`；舊基本資料額外欄位移至可見「原基本資料」，原值及附件 metadata 不刪除。正規化在實際儲存前不寫入。
- 現有 `pages.character_data` JSON 增量加入 `blocks_version`、`basicBlock`、組件 `size`；無 Migration。12／8／4 格限制最多三／二／一欄，不改文字大小；長按跨區塊移動、區塊排序暫時隱藏內容，另有鍵盤可達的移動／尺寸控制。空白區塊保留。
- NexusApp 透過既有 WorkspacePersistence 的 page＋outbox 原子交易提交，保留最新附件及 pending edits；交易失敗不宣告成功。已驗證 IndexedDB 寫入中止、重試、備份及 owner 同步相容。自動化瀏覽器不代表真實 iPad Safari 驗收。私人模板與資源庫仍由後續 E–G 完成。

### 2026-10-16｜私人角色卡模板（第五輪 E，已實作）

- 沿用 owner-scoped creative pages 的 `character_data.isTemplate`，模板管理為創作內獨立全頁工作區，支援結構預覽、改名、複製、軟刪除及建立角色；未新增平行模板 store 或資料表。新模板由既有角色的更多選單產生。
- `snapshotCharacterTemplate` 改為結構白名單，僅保留節點名稱／ID／類型、欄位定義、順序與尺寸；清空所有內容值及相簿／附件，不傳播 `example`、`basicExamples`、legacy snapshot、來源或個人資料。既有來源角色不修改；舊模板在使用／複製／編輯時套用安全邊界，無批次清除。
- `instantiateCharacterTemplate` 產生新區塊／組件／分頁 ID，保留 `template_node_id` 對應及 `templateBinding.sourceId/baseline`（純結構），供後續同來源更新；不同實例互不共用可寫物件。模板與新角色的 attachment_ids 為空。
- 模板沿用區塊移動／尺寸／新增刪除，`CharacterTemplateStructureEditor` 只暴露結構名稱與欄位，不提供角色內容輸入。650ms debounce 自動儲存使用既有 Workspace 原子交易；失敗停止自動重試、保留輸入並可手動重試，遮罩關閉仍等待成功。無 Migration，公開資源庫及安全更新尚在後續 F／G。

### 2026-10-16｜創作模板資源庫（第五輪 F，已實作／正式 SQL 待授權）

- `features/creation/templateLibrary` 封裝 owner／capability、精確總數 24 筆分頁與搜尋分類、20 筆版本頁及既有 Supabase client；`CreationTemplateLibrary` 提供獨立於學習集的角色卡／世界觀資源庫、投稿、私人草稿、明確發布、歷史預覽／衍生、檢舉及作者／管理員操作。固定連結使用 `/?creation-template=<穩定投稿 UUID>`，登入後進入同一資源庫。私人與公開預覽共用 `TemplateStructurePreview`。
- 新 Migration ledger：`20261016040000_creation_template_library.sql` **僅已編寫與隔離測試，正式未套用**。新增 creation_templates／drafts／versions／downloads／reports 五表及 RLS；public capability 和 invoker mutate wrapper，privileged mutate 留在 non-exposed `nexus_private`。無既有表／FSRS／字典內容修改。來源授權首次發布重查並凍結快照；immutable 版本、草稿 CAS、首次保存／發布重試及同 owner 下載 receipt 保護。
- `installCreationTemplate` 以 server receipt 固定 page ID 寫入既有 owner Workspace transaction；失敗整筆回滾，重試同 ID，檢查帳號、來源及 Tombstone。下載來源保存在既有 character_data JSON 的 `resourceSource`，不新增未同步的頂層 Page 欄位；私人修改／複製及實例保留來源追溯，公開 sanitizer 排除私人 metadata。共用樣式／字典／學習資料不修改。
- 私人模板 `TemplateResourceStatus` 只查詢可用更新，不自動套用；使用者在資源庫確認後更新同一私人模板。已建立角色仍保持原狀，安全套用屬後續 G。缺少 capability 或離線安全停用新資源庫，原私人管理仍可使用。完整部署、RLS 與非破壞回復說明見 `docs/operations/CREATION-TEMPLATE-LIBRARY.md`。

### 2026-10-16｜同來源角色卡模板更新（第五輪 G，已實作）

- `characterTemplateUpdate` 以 instance 的 `templateBinding.sourceId/baseline`、穩定 `template_node_id` 與當前私人來源模板做三方合併。僅接受目前綁定來源；沒有可靠 baseline、來源重複／保留 ID 或區塊／組件層級衝突時明確拒絕，不按名稱猜配。早期 lazy wrapper 僅接受由原 ID 可重現的包裹關係。
- 保留全部角色內容；名稱／尺寸／位置／順序只有未被個人覆寫才採上游變更。新節點建立空白且具新 instance ID；刪除／型別不相容的舊組件保留 ID 和內容，解除 active source mapping，移入根分頁底部 `retainedContent` 區塊，仍沿用扳手與拖曳。個人刪除不自動復活，個人新增及空白區塊保留。舊欄位沒有穩定 field ID，不靠位置猜測改名或覆寫已填值。
- 每次實際套用前將完整 character_data（含個人內容）與標題／附件 ID 建立 `templateUpdateSnapshots`；快照本體不再內嵌舊快照清單，避免遞迴成長。還原前再保留目前狀態，可再次恢復；附件引用保留聯集，不刪附件。全部欄位沿用現有 JSON／備份／Workspace 同步。
- `WorkspacePersistence.mutate` 增量接受交易內 revision guards；`savePageChecked` 在同一 IndexedDB pages＋outbox 交易核對角色與來源 owner／存活／revision，完整失敗回滾。沿用官方標題、Tombstone、既有 server operation receipt／revision 與跨裝置衝突機制，無新 RPC 或 Migration。離線操作只根據已快取來源，較新雲端內容仍依既有同步衝突處理，不假裝跨裝置鎖定。
- `CharacterTemplateUpdateControl` 提供比較摘要、明確確認、來源改變後重新比對、儲存失敗重試及快照還原。NexusApp 先 flush 相關 pending save 再比較／提交，避免覆寫未存內容；帳號切換後不將舊 owner 結果放入目前畫面或另一帳號同步器。
- 模板結構編輯可修改組件類型（保留穩定 ID）、欄位名稱、統計欄名及偏向端點，不提供個人值輸入；不相容類型變更由上述合併保留舊角色內容。
- 合併最新 main 的 F-CHARACTER 整理後，空白角色保留無區塊，明確 disabled 的基本資料不被舊 JSON 正規化重新打開。私人角色／世界觀模板分流，世界觀模板不強加角色五欄，下載世界觀模板可用於新建世界觀；原世界觀內容編輯流程保留。
- 測試補足來源／目標 CAS、交易中止、回復、stable IDs、個人覆寫、跨分頁移動、備份與第二裝置 merge。共用工作區 browser 的既有復原後 DOM 競態改成等待該列移除並鎖定目標永久刪除列，未移除安全斷言。真實 iPad Safari／正式帳號驗收仍在 #60。


## 2026-10-16｜字典詳情、Review RPC 與 source_forms 退場
- `CardDictionaryPanel` 以原生 `DictionaryModal` 顯示 Published，依卡片／連結 key 隔離生命週期，generation 拒絕離開後的舊讀取；無連結無入口。詳情開啟即透過原 `onEditingChange` 暫停正式學習 reload／評分，巢狀完整編輯器沿用離開保護，返回只刷新字典，不寫私人卡／FSRS。
- Refs #82（本機已實作／測試通過，正式待驗證）：`DictionaryArticle` 移除 accordion，所有閱讀段落直接展開且無卡片外框；`showConnections` 獨立控制既有頁面關聯導覽，學習 Modal 維持不顯示。共用資料保留原 scope 與順序，但不顯示管理用標籤；多義項內容仍標示義項歸屬。`DictionaryModal.headerActions` 提供固定頂部操作插槽，由 `CardDictionaryPanel` 依既有 access.allowed 與 detail 決定顯示編輯按鈕，關閉與編輯後刷新機制不變；無 schema／RPC 變更。
- 根因：`72b9a03` 將發布專用 `content_verified` 同時加入 save／discard；正式 RPC 分別只有 `(review_uuid,expected_revision,candidate)`／`(review_uuid,expected_revision)`，PostgREST 因命名參數組合不符而失敗。移除兩處多餘參數，approve／publish 查證參數、後端 dry-run 候選驗證、管理員檢查及 CAS 全保留。瀏覽器 fake RPC 現在核對精確參數集合。
- `20261016050000_dictionary_retire_source_forms.sql` 只刪除共享 `dictionary_lexical_annotations` 的 source_forms，保留 relation_hint 與共享 FK／索引，CHECK 收緊為 relation_hint。所有現有 SQL 函式均未硬編碼 source_forms；不需更改 RPC 簽名／授權。前端 Draft／AI／CSV 不再寫入舊欄，交換檔拒絕舊種類。
- 遷移以既有 advisory lock 加表鎖，在同一交易先建立非 exposed `dictionary_retirement_backup` 回復副本（應用角色無 schema／表權限），清理 active Review 的候選及基底並遞增 revision；受影響常駐匯入清理舊差異、保留其他決策並標 stale 要求重新比對。不可變 Published 歷史、Audit、operation receipts／來源原檔不重寫。一次性 JSON cleaner 提交前移除，非新增 API。
- 回復腳本 `docs/operations/DICTIONARY-SOURCE-FORMS-ROLLBACK.sql` 對部署後 Review／匯入變更做完整比對，存在新工作即整筆拒絕，不覆寫；恢復仍遞增 revision。回復副本僅供操作員災難復原，非隱藏功能欄位。正式驗收後可另行封存及清除備份 schema；本輪不自動清理。
- 正式部署狀態及測試實際結果見 HANDOFF。2026-10-16 已唯讀核實先前兩份 Migration 的正式 ledger 名稱 official_private_card_identity（20261016062703）、creation_template_library（20261016062716），不按 Git 檔名重播。

- 本輪正式 ledger：`20261016072304 dictionary_retire_source_forms`（Git SQL 檔時間戳不同）；已於 2026-10-16 成功套用並唯讀核對。舊種類 0、有效提示 67、Entry 6301／Sense 11518／詞形 7135／active Review 927／匯入工作 28 保留，13 組交易內指紋檢查通過。備份 schema 應用角色不可讀，cleaner 已移除，原 RPC／RLS 不變。沒有進行正式儲存／發布驗收；相關實機操作留 #60。

## 2026-10-16｜一般 Draft 單筆發布入口修復
- `DictionaryWorkspace` 的一般 Draft 分支補傳 `onPublish`／`canPublish`／`publicationBusy`；既有 `DictionaryEditor` 的共用 sticky 發布按鈕原先僅 PublishedWorkspace 有接 callback，故三種新草稿都缺入口。
- revision 0 僅顯示停用發布；儲存重讀後啟用，dirty 編輯先擋，人工確認後重讀伺服器 status／revision 做前置比對，再沿用 `publishDictionaryEntry`（content_verified=true）。前置比對不是新增資料庫原子 CAS；既有 RPC 的鎖、管理員、資料／構詞與發布檢查不變。
- 發布失敗保留表單並在 Draft 分支呈現錯誤；成功發送既有字典失效事件、重讀 Published，並通知 embedded 呼叫端。舊版複製型 Review 不提供直接發布，正常 Review 仍走 approve。無 Migration、正式字典寫入或新發布管線。
- 發布前置比對使用 `DictionaryEditor` 已儲存 baseline revision；立即刪除義項／內容後由既有刪除 RPC 更新 baseline，不能使用仍較舊的父層 detail revision。Review 發布回呼仍使用自身已選 Review revision，不以 Entry baseline 取代。
