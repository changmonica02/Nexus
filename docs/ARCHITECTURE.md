# Nexus — 技術架構與資料契約

> 更新：2026-10-30；程式核對基準 main `27aa143`。本文只描述目前架構、有效資料契約、限制與建議。產品行為見 [SPEC](SPEC.md)，決策紀錄見 [HISTORY](HISTORY.md)，最新進度見 [HANDOFF](HANDOFF.md)。

## 1. 模組與資料來源


| 層 | 主要來源 | 責任 |
| --- | --- | --- |
| 路由／工作區 | [WorkspaceRoot](../src/components/WorkspaceRoot.tsx)、[NexusApp](../src/components/NexusApp.tsx) | 路由與工作區生命週期、頁面及編輯狀態整合 |
| 筆記編輯 | [EditorPane](../src/components/EditorPane.tsx)、TiptapEditor | 編輯 JSON、觸發保存、顯示保存狀態與開啟輸出 |
| 輸出投影 | [NoteExportPreview](../src/components/NoteExportPreview.tsx)、[noteExportLayout](../src/lib/noteExportLayout.ts)、[noteTablePagination](../src/lib/noteTablePagination.ts) | 從 DOM 副本準備資源、測量與分頁，不回寫編輯 JSON |
| 儲存介面 | [StorageAdapter](../src/infrastructure/storage/StorageAdapter.ts) | Page、附件／Blob、帳號工作區、備份與 Repository 介面 |
| 工作區交易 | [workspacePersistence](../src/infrastructure/sync/workspacePersistence.ts) | 本機 records 與不可變 upload intents 同交易；remote merge 不重新 enqueue |
| 同步協調 | [syncEngine](../src/infrastructure/sync/syncEngine.ts)、workspaceSync | push／pull、Realtime、背景節流、重試與狀態 |
| 學習領域 | [StudyRepository](../src/features/study/StudyRepository.ts)、[studySync](../src/features/study/studySync.ts) | 私人字卡、學習事件、領域衝突與增量同步 |
| 地圖領域 | [worldMapRepository](../src/features/worldMap/worldMapRepository.ts)、[offlineCore](../src/features/worldMap/offlineCore.ts) | 地圖原生專案驗證、世界觀條目／配置、隔離工具快取 |


Page 是共用容器；編輯結構以 `content_json` 及領域資料為準，`content_text` 是搜尋／預覽衍生資料。附件 metadata 與 Blob 分離，顯示用投影不取代穩定 ID。

### 資料模型與本機儲存

| 類型 | 正式資料位置與界線 |
| --- | --- |
| 筆記／文檔 | Page 的 `content_json`；筆記排版在 `lessonLayout`、全寬在 `noteAppearance` |
| PDF 研究筆記 | Note Page 引用 Attachment，不新增 PDF 專用 kind，不把 binary 塞進正文 |
| 字卡集 | Page 保存集合殼；StudyRepository 保存 cards／states／events／settings／sessions |
| 簡報 | Page 的 `presentation_data`，Slide／Block 與一般正文分離 |
| 隨手記／待辦 | `pages` 的 `quick_note`／`todo`；顏色、到期、優先度與完成狀態沿用 Page |
| 角色卡／世界觀／私人模板 | `creative` Page 的 `character_data`；以 `creative_type` 與 `isTemplate` 區分 |
| 小說 | 作品 Page 的 `novel_settings`；章節為 `novel_chapter`，使用 `parent_id`／`sort_order` |
| 網頁／計數／抽選 | 對應 kind，資料放 `content_json`；頁面附屬說明放 `assistant_blocks` |

Page 共用 ID、標題、時間、revision、device、軟刪除、標籤、資料夾、關聯、附件引用、排序與父子關係；詳細型別以 [types.ts](../src/lib/types.ts) 為準。

[IndexedDBAdapter](../src/infrastructure/storage/IndexedDBAdapter.ts) 使用 `nexus`，DB_VERSION=8，BACKUP_SCHEMA_VERSION=3。主要 stores 為 pages／attachments／binaries／settings、study_cards／states／events／settings／sessions／outbox／sync_meta，以及 workspace_outbox／sync_meta。既有裝置的相容 stores 不因功能退場自動刪除；實際 upgrade 清單以 Adapter 為準。Page／Attachment 的 `workspace_owner_id` 是本機邊界，不當成可任意指定的雲端授權。

備份匯出／匯入走 StorageAdapter 與實際 schema 校驗；涵蓋頁面、附件、學習資料及地圖 canonical／recovery。匯入遵守帳號、版本與引用檢查，交易失敗完整中止；不能把舊版「完全覆蓋」描述直接套到所有現行備份流程。裝置偏好另依 settings／localStorage 保存，不保證全部同步。

## 2. 筆記編輯與輸出


### 已確認產品方向與實際編輯

筆記僅提供 flow 編輯，不再提供分頁／流動模式選擇。A4、方向、邊界、頁首頁尾、頁碼及分頁調整屬輸出。這項決策只針對 Note，不自動改寫 Document 或 Presentation 的產品契約。

`creationOptions.notes` 只有 `note_flow`；全部項目使用 `note`。EditorPane 實際以 `effectiveFormat = "flow"`、`isPaged = false` 呈現；新舊 Note 不因此清除既有 format／pageBreak／未知 metadata。逐篇全寬寫於 `noteAppearance.fullWidth`，與輸出紙張尺寸分離。相容層退場前須驗證舊資料往返。

**規格已記錄、仍待處理的落差**：EditorPane 的 flow 常數也涵蓋 Document 呼叫路徑，10/29 SPEC F-DOCUMENT 已明示目前連續版面與原 A4 預設方向的差異。應先盤點實際操作與預期，不把本次「筆記僅流動」擴大成 Document 改版，也不直接恢復舊分頁程式。

### 已實作輸出流程

1. EditorPane 開啟 NoteExportPreview，傳入編輯 DOM、標題、頁首頁尾及保存 callback。
2. `copyExportBlock` 複製 DOM，移除編輯控制、展開副本摺疊、保留公式顯示；不操作原編輯器。
3. `waitForExportAssets` 等圖片／字型，具 timeout 與取消清理。它是資源就緒檢查，不能證明所有公式 glyph、圖片及頁面視覺正確。
4. NoteExportPreview 按紙張 content-box 測量；頂層舊 pageBreak 轉成副本分頁。安全表格由 splitExportTable 按 rowspan 相連群組延續，重複表頭並保留 span，caption 一次。
5. 不能安全切分的特殊表格／超高區塊保留並警告；長雙欄保持原比例。列印前 await 保存，保存失敗保留預覽供重試；輸出仍交由瀏覽器 `window.print()`。

輸出提供本次逐欄轉單欄、寬 code／URL 換行、表格及公式適配與直接重試。公式縮放下限為原尺寸 50%；過寬仍提示。未知欄位容器保留原布局，超高表頭不反覆重複。AbortSignal 及每 20 個頂層區塊讓步支援取消；單張巨表仍同步測量。

### 尚未完成

- 長段落、超高合併格與長雙欄未完整分割；目前放寬超高紙張並提示，瀏覽器仍可能另行分頁。不能宣稱所有預覽頁碼／PDF 一致。
- 預覽沒有手動新增／移動分頁入口；識別原有 pageBreak 不等於提供這項操作。保存分頁調整的規則仍待確認。
- Paged.js 只是歷史隔離研究，不是正式 runtime 依賴，也沒有證據支持直接替換即能解決全部案例。
- Safari／Firefox、真實 IME、裝置與大型文件峰值記憶體仍待驗證。測試來源見 tests/noteExport.browser.test.cjs、tests/noteTablePagination.browser.test.cjs、tests/notePagination.study.test.cjs。


## 3. 保存、同步與帳號邊界


```text
使用者編輯 → UI 保存協調 → StorageAdapter
  → WorkspacePersistence 本機交易（records + workspace_outbox）
  → SyncEngine 協調 workspaceSync push／pull
  → 遠端回覆／修訂合併 → 本機狀態與畫面

學習作答 → StudyRepository 的領域事件／pending
  → studySync 排序提交／ack → pull_study_changes cursor → mergeRemote
```

WorkspacePersistence 以 owner、entity、revision 驗證 guard，阻擋跨 owner 與 hard-delete 復活；保存與待傳操作同交易。merge 不產生第二次本機寫入意圖。CAS 衝突不等於自動語義合併，Page 級修改仍可能衝突。

SyncEngine 已有工作區排程合併（前景 300ms、背景 5000ms）與背景週期限制（5 分鐘內可略過），回前景補查；Realtime 按 owner 篩選。studySync 另外保護同 Repository 的進行中同步，按事件 predecessor 順序提交、以事件身份安全重試，使用伺服器 sequence 分頁讀取。這些領域流程不是可任意合併的同一套事件模型。

「已儲存本機」「待同步」「已同步」「失敗」須分開。connected 僅代表連線／協調狀態，不能直接當每筆資料已獲伺服器確認。RLS、RPC 權限、正式 migration ledger 必須另外核實；前端 owner filter 不取代伺服器權限。


## 4. 附件、地圖與離線

### 附件版本快取

`pullWorkspace` 先處理 owner metadata／tombstones，binary 列表不預抓完整內容；快取身份為 `(owner, attachment ID, server revision)`。本機 Blob 及已驗證版本／大小一致時沿用，首次、版本改變、缺失或損壞才下載。metadata 改動可能提升 revision，允許保守重驗該附件。

下載後重新核對 revision／deleted_at，落盤交易再檢查 owner、tombstone 與待傳修改，避免覆蓋本機內容。IndexedDB 中 owner/id 專屬租約合併同源多分頁下載；租約 60 秒、網路下載 45 秒逾時，過期 token 不得覆蓋新租約。同帳號 auth refresh 沿用 SyncEngine。結構與大小檢查不代表密碼學內容驗證；下載 bytes／次數需實測，不能承諾固定省流比例。

### 世界觀地圖

固定 Azgaar 1.154.2 本地 fork，由 `scripts/build-world-map.mjs` 建置，整合層、隔離 iframe、Repository 與儲存同步分離。`inspectMapProject` 驗證版本／結構並計算 SHA，並非 SVG／HTML sanitizer；核心不取得 Nexus 帳號憑證或同源執行權限。

世界觀 WorldEntity 保存正式正文、穩定 ID／relations；地圖 placement 引用 entity ID，point／cells 幾何獨立，cells 帶 mesh 指紋，不能靠名稱或原生陣列索引連結。Page 級 CAS／outbox 交易維持新增條目及配置原子性，重試使用穩定 ID；移除配置／刪圖不連鎖刪正式條目。metadata 修改不重傳原生 binary；原生 `.map` 不包含 Nexus 正式條目，完整資料用工作區備份。

原生 canonical 專案使用 immutable 附件／SHA 與 revision，另有本機 recovery checkpoint；10 秒 recovery 不進 outbox，60 秒或明確保存提交 canonical。失敗保留草稿，不以本機成功冒充雲端成功；未實作安全 GC，不能任意清掉舊附件。自然地理與文明配置分離；手繪資料保留、網格變更與再生成限制依 SPEC，不能在同步時重新生成地理。

`offlineCore` 註冊 `/world-map/offline.js`，scope 為 `/world-map/`；只快取公開工具。opaque iframe 的離線文件由工具快取組裝，broker 不代理私人 API 或任意網路，私人專案保存在既有 owner 儲存。

### 主程式 PWA（待實作）

目前沒有主 Manifest／全站離線外殼。IndexedDB 有資料不等於斷網能重新啟動網站。主 SW 應快取明確版本化的公開資源，與地圖 scope 分離；Auth/API、私人資料與附件 Blob 仍走現有帳號隔離儲存。重用 outbox／同步；Session 恢復、切帳號、未快取路由提示及更新不遺失待存內容須驗證。

## 5. 學習、字典與創作契約

### 學習排程

`StudyRepository` 與 `studySync` 為私人字卡／事件來源。正式複習依 `scheduledStudy`／`studyFSRS` 使用固定排程或 ts-fsrs；Session 凍結有效樣式快照，樣式變更作用於之後的 Session。introduce 事件在實際呈現新卡時扣當日額度，不能因預選或重開重複扣額度。

固定 state 與 FSRS 記憶分開，方法切換保留真實事件／due，不偽造 FSRS 歷史。作答帶 method、style snapshot 與必要 transition；事件 predecessor 順序、generation 與伺服器收據保障重試。兩裝置事件衝突保留歷史並要求明確解決，不能靜默推測合併。sessions 僅本機，其他領域資料依 Study 增量 cursor 同步。已退場 Quiz 不掛載 UI、不啟動同步；既有資料／SQL 的相容處理由現行 Adapter 與 migration 管理。

官方包來源身份與私人字卡目前的字典連結分開；解除連結不改來源去重身份。更新只補缺卡，不覆寫私人字面／學習狀態，不復活使用者已刪除的來源卡。

### 公共字典

字典是獨立公共領域，Entry／Sense 使用穩定 ID；Published、Draft／Review、構詞及附屬內容有各自 revision／身份。Published 供讀取，管理員 UI 共用既有字典工作區；真正授權與 CAS 仍由伺服器 RPC 執行。草稿保存不等於公開發布，清單狀態在批次完成後重新讀取伺服器。

字典交換由既有 export／preview／apply 管線處理。分頁匯出維持 scope version 一致，範圍變動要求重取；匯入先保存 operation UUID，再以原 RPC／receipt 重試，Published 修改產生 Review。checkpoint 與逐項狀態保存於獨立 `nexus-dictionary-import-review`；網路回覆遺失不換 UUID 重送。批次作業部分失敗保留結果，不能以新 preview 蓋掉尚待恢復的 operation。批次發布沿用 token／scope／人工確認，不繞過 Review 核准。

`delete_dictionary_entry` 在交易內驗證管理員、revision、完整 snapshot 及其他構詞／Review／官方 manifest 引用；有相依即拒絕。私人卡僅解除 join，不刪 payload／state／events／來源身份；Published 歷史及 Audit 保留，收據與退場標記阻擋舊 ID 被重建。未知外鍵／收據失敗完整回滾。核心概念沿用 `dictionary_learning_notes`；退場 ID／alias 與相容匯入 guard 防止舊資料重建重複內容。

管理介面入口見 DictionaryAdmin／DictionaryWorkspace；查詢、交換、刪除實作位於 [dictionary](../src/features/dictionary)。詳細 SQL 以 [migrations](../supabase/migrations) 為準，單一 migration 檔存在不代表遠端已套用。

### 角色卡與模板

角色區塊的標準化／移動／尺寸由 characterBlocks 處理，保持未知 metadata、內容與附件。私人模板仍為 owner Page；結構白名單清除個人值／相簿／附件，實例產生新 ID 並保留穩定 template node 對應。

[creation](../src/features/creation) 處理資源庫 capability、投稿／草稿／immutable versions／下載 receipt。公開來源許可由伺服器重驗；缺 capability 或離線時停用新資源庫讀寫，既有私人模板仍可使用。下載以 receipt 固定 Page ID，owner／tombstone／交易失敗不得產生第二份或復活已刪內容。公開與私人資料授權各自驗證，privileged 實作維持非 exposed schema。

模板更新採同來源 baseline／stable node ID 三方比較，由使用者確認，既有角色不自動跟隨。個人內容及覆寫保留；不相容或被上游刪除的內容移入 retainedContent，不靜默丟棄。套用前建立非遞迴 snapshot，附件引用保留聯集；角色與來源的 revision guards 與 pages＋outbox 同交易，衝突要求重新比對。

## 6. 帳號、權限與刪除

登入後才選取 owner 工作區；登出／切換立即移除舊 owner UI，晚到結果不能套用至新帳號。匿名舊資料遷移須明確授權。前端 filter 與隱藏按鈕不代替 RLS／RPC 驗權。

`delete_own_account` 從已驗證 JWT 取得 auth.uid，驗證確認內容後以一個交易執行帳號及 owner 外鍵 cascade；共享資料按其正式關係處理，不以客戶端指定 owner 刪除。成功後只清目前 owner 的本機內容／Blob，再登出；掉回覆時保留本機，重新認證確認結果。其他裝置的離線副本不能遠端抹除，伺服器仍須拒絕已刪 owner 寫入。現有附件是 binaries 表，不可假定 Supabase Storage bucket 清理已實作。

RPC／constraint／RLS／授權與遠端 ledger 必須另核對；未知相依以失敗回滾處理。新增 migration 採增量及非破壞回復，不能把文件清理當成刪 schema／歷史資料的授權。

## 7. 改善建議（尚未實作）


| 優先 | 建議與理由 | 最小驗證／採用條件 |
| --- | --- | --- |
| P0 | 先釐清 Note／Document 的格式邊界，再清理死分支；flow 常數不應默默定義其他產品行為 | 新舊 Note、Document、Presentation 開啟／保存／重開，JSON／ID／未知 metadata 不變 |
| P1 | 分頁增加獨立、可取消的 layout job 與 block splitter 介面，先抽現有表格策略，再補文字；讓 React 面板處理控制與狀態 | 設定連續切換取消舊 job；單欄長段落、rowspan、圖片／公式內容無缺失重複；逐頁 PDF 比對 |
| P1 | 將長雙欄順序及手動分頁保存作產品待決項，確認後再新增策略 | 同一 corpus 比較逐欄／逐頁閱讀，不以強制攤平取代決策 |
| P1 | PWA 先交付外殼，再接本機資料／更新。重用既有同步，不新增 PWA outbox | 線上準備→斷網關閉重開、缺少路由提示、SW 更新不刪 IDB、地圖 scope 不受影響 |
| P2 | 量測 outbox 長度及 transaction 耗時後再優化。mutate 目前 getAll 佇列，並對每項 change 篩選排序；大 backlog 可能增加交易耗時 | 固定 100／1k／10k pending 比較；可先在交易內建 owner/entity 索引 Map，保留排序、expected revision、原子與重試語意；DB index 變更另評估 |
| P2 | 保留 workspace／study 領域邏輯，只逐步共用連線、觸發協調及觀測介面 | pending、衝突、遠端刪除、切帳號、掉回覆重試不退化；先記錄重複請求而非假設存在 |
| P2 | NexusApp 逐步抽出保存與帳號／同步生命週期服務，避免 UI 組裝同時掌管全部副作用 | 一次只搬一項責任；雙窗、待保存輸入遇遠端更新、失敗重試維持原行為 |
| P2 | 大文件分頁優先分批量測、取消與資源釋放，再評估新引擎 | 峰值 heap、layout 耗時、取消後 DOM／listener 回收；Worker 無法直接量測 DOM，不能只搬計算就宣稱解決 |

目前較合理的是維持現有 Next.js／Tiptap／IndexedDB／Supabase 與隔離地圖核心，以小步收斂責任及量測瓶頸。尚無本輪證據支持重寫編輯器、引入 CRDT、自建第二套同步或全面改用 Paged.js。若要採用，另開 discovery 比較資料相容、長文件、維護成本與授權，再核准實作。


## 8. 驗證與維護

- `.github/workflows/note-editor.yml` 以相關 PR／程式路徑及 main 觸發：note helper／表格、五組 Chromium、workspaceSync、map 契約、TypeScript、限定 ESLint 與 production build。PDF／截圖作該次測試 artifact，正式 runtime 不加入研究用 Paged.js。
- 修改保存／同步需覆蓋 owner、CAS、pending edits、遠端刪除、斷網／重連、掉回覆重試；修改輸出需驗證正文 markers、span、JSON／ID 不變與預覽／PDF，文字抽取不取代 glyph／圖片視覺檢查。
- 隔離 Chromium／IDB／SQL 測試與正式帳號、Safari／行動裝置驗收分開；部署 READY 也不代表完整產品驗收。真實裝置與跨裝置事項集中 #60。
- 技術契約隨程式維護於本文件，狀態放 HANDOFF；不再新增 archive、reference、追溯副本或逐批交付流水帳。
