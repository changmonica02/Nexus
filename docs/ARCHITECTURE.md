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

### 生活工作區

`TodoView` 提供生活總覽、月曆及任務篩選，`PageCollection` 共用同一批 `kind: todo` Pages；內部 `calendar` 導覽識別與既有連結保留相容。`NexusApp` 只持有日期／月份／分頁／篩選／捲動等介面上下文，帳號切換時清除，任務編輯返回恢復上下文。學習首頁捷徑傳入選取的本地日期。

任務的 `due_date`／`completed` 保持 Page 欄位；`CreatePageInput` 允許建立時帶入，Adapter 在原 Page／outbox 交易一起保存，避免先建立無日期任務再補寫。完成、日期及內容編輯走 `patchPage`／既有 pending save，離開先 flush。新增標題使用現有 `useUnsavedDraft` 導覽／離開保護，任務編輯仍走原編輯器保存。日曆／任務沒有額外事件副本；備份與帳號隔離沿用 workspace 契約。行程數是當日有日期任務的投影，非獨立排班或事件來源。

自訂清單由 `features/life/LifeLists` 與 `LifeRepository` 提供。`life_lists` 保存欄位定義及 schema_version，`life_categories` 保存 parent_id，`life_items` 以固定 fieldId 保存 typed values、category_id 與 attachment_ids；三者獨立記錄／revision，不塞進 Page JSON。金額為十進位字串與幣別；圖片／附件只引用既有 Attachment，Blob 不放入項目。四種檢視共用項目；分類移動使用選擇操作。

`LifeItemViews` 按需載入 TanStack Table 9.3.1，僅註冊欄位篩選／排序／分組／展開與欄位順序／顯示功能；Table 的內部 store 不取代 Nexus 狀態或儲存。清單、卡片、表格與分類樹使用同一 row model，沿用 Pagination，每頁最多 50 列（含分組標題）。分類選取以 ID 包含子分類，展開／收合只改介面；分類與項目移動仍使用原編輯器及 workspace CAS。自訂欄位 column ID 加上 `field:` 前綴，避免與名稱／分類欄位碰撞；封存欄位不參與檢視，過期篩選／分組忽略、過期排序回到名稱。數字按數值排序，金額先按幣別再以十進位字串精確比較，不換匯或改寫原值。

檢視偏好沿用現有裝置端 collection 偏好模式，`useListViewPreferences` 以 `(owner,list ID)` 分區、版本化 localStorage，使用 storage／nexus-view-changed 通知。記住檢視、欄位顯隱／順序、搜尋、篩選、排序、分組、分類選取／收合及頁碼；儲存失敗保留可用的記憶體狀態。偏好不進 outbox、不當成備份／跨裝置同步內容；正式項目與附件仍走原備份 v4。表格容器獨立水平捲動，手機預設清單；沒有新增資料表／Migration、拖曳套件或虛擬捲動。

`WorkspacePersistence.mutate` 在原交易內校驗帳號、版本、欄位保值、分類與附件引用，並追加同一 outbox；本機 life revision 隨待傳操作前進。`apply_workspace_operations` 擴充三個實體，沿用 owner advisory lock、CAS 與 durable receipt，在整批提交前驗證分類循環、同帳號／同清單引用及附件。RLS 僅允許 owner SELECT，寫入只走驗權 RPC；life 不提供 hard purge，軟刪除保留重連保護。刪清單以單批軟刪項目、分類與清單，非空分類需先移走內容。

Migration `20261103155520_life_custom_lists.sql` 為新增表、索引與 RPC 擴充，依使用者確認已套用正式環境，本輪未重新套用或查寫正式資料。隔離 PostgreSQL 17.11 已執行實際 SQL，驗證既有 Page 全欄位、Attachment／binary、舊 receipt／tombstone、新舊混合交易、RLS 與 Migration 失敗整批回滾。初始三表的建表 DDL 未納入版本庫，測試依目前欄位契約重建，再套用實際帳號／創作／章節／workspace migrations；不是正式 schema dump，不能推論不存在正式 schema 漂移。舊 RPC 呼叫與硬刪除標記類型不變，life 不產生舊前端不認得的 hard-delete tombstone。

部署／回復契約：
- 核准後先確認正式備份／PITR 可用、既有 schema／RPC 前置條件，再以單一交易套用 Migration；驗證 owner SELECT、RPC 與 PostgREST 新表可見性／Realtime publication 後才發布前端。不可重複套用已成功的 Migration，或把 PR／隔離測試視為正式驗收。
- 若前端誤先發布，`pullWorkspace` 僅對新 life 表的缺表／schema-cache 缺表碼（42P01／PGRST205）保留本機副本並繼續舊同步；權限、網路及舊表錯誤不忽略。未獲支援的 life intents 保留並顯示同步失敗，資料庫就緒後原 ID 重試；不假稱本機保存已上雲。
- SQL 交易失敗會回滾新表、publication 與 RPC，舊資料／呼叫仍可使用。成功後若已有清單資料，保留新增表與新版 RPC，不執行刪表或回復舊 RPC；修復前端需保留 v9、備份 v4 及 life outbox 契約，優先向前修復。
- 原 v8 前端不能開啟已升級 v9 的 IndexedDB，不能直接作為同裝置回退版。升級遇舊頁籤阻擋時顯示復原提示，先於舊頁籤保存修改，再關閉並重新載入；延遲開啟的已放棄連線會關閉。遇較新 DB 版本亦顯示錯誤，不降版／刪庫。離線舊前端須恢復連線取得相容版本，禁止以清除網站資料修復。真實 Chromium 已驗證未同步 Page／附件／Blob／outbox 保留與重新載入復原。

備份 v4 包含三種清單記錄；舊備份不清除本機清單及其附件。匯入校驗整個結構與引用，在同一交易新增記錄與恢復 intents，附件先於項目補傳；遇到不同本機版本或刪除屏障即中止，不靜默覆蓋。本機副本與雲端已有不同版本時，仍由 CAS 阻擋，備份不是強制覆寫雲端的工具。

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

[IndexedDBAdapter](../src/infrastructure/storage/IndexedDBAdapter.ts) 使用 `nexus`，DB_VERSION=9，BACKUP_SCHEMA_VERSION=4。主要 stores 為 life_lists／life_categories／life_items、pages／attachments／binaries／settings、study_cards／states／events／settings／sessions／outbox／sync_meta，以及 workspace_outbox／sync_meta。既有裝置的相容 stores 不因功能退場自動刪除；實際 upgrade 清單以 Adapter 為準。Page／Attachment 的 `workspace_owner_id` 是本機邊界，不當成可任意指定的雲端授權。

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


正式學習由 `StudySetView` 的單一頂欄顯示組名及 ScheduledStudySession 回報的 completed／實際 targets 長度；顯示不另算排程。字卡的翻面按鈕與語音／字典是兄弟互動元素，避免巢狀按鈕及鍵盤翻面落到評分；只於新題聚焦卡片。正反面切換保留同一發音元件，只有題目身份改變才重設一次自動播放。開始學習的同步使用者操作呼叫 `prepareStudySpeech` 初始化原生引擎；語音初始化補充短期 voices polling，自動播放讓出 WebKit cancel 的事件迴圈，手動播放留在使用者操作內。啟動等待延長且檢查引擎 speaking，不以缺少 onstart 取消實際播放；取消／中斷事件不冒充限制播放。真實 Safari／PWA 語音仍需實機驗收，不能保證瀏覽器允許自動發音。

學習首頁的兩個底部面板共用 ModalDialog 的背景關閉、Escape 與 returnFocusRef；日曆選取日期獨立於開關狀態保留，生活捷徑將日期帶入既有 LifeViewState 並以總覽開啟，不另存任務或影響 Session。

## 4. 附件、地圖與離線

### 附件版本快取

`pullWorkspace` 先處理 owner metadata／tombstones，binary 列表不預抓完整內容；快取身份為 `(owner, attachment ID, server revision)`。本機 Blob 及已驗證版本／大小一致時沿用，首次、版本改變、缺失或損壞才下載。metadata 改動可能提升 revision，允許保守重驗該附件。

下載後重新核對 revision／deleted_at，落盤交易再檢查 owner、tombstone 與待傳修改，避免覆蓋本機內容。IndexedDB 中 owner/id 專屬租約合併同源多分頁下載；租約 60 秒、網路下載 45 秒逾時，過期 token 不得覆蓋新租約。同帳號 auth refresh 沿用 SyncEngine。結構與大小檢查不代表密碼學內容驗證；下載 bytes／次數需實測，不能承諾固定省流比例。

### 世界觀地圖

固定 Azgaar 1.154.2 本地 fork，由 `scripts/build-world-map.mjs` 建置，整合層、隔離 iframe、Repository 與儲存同步分離。`inspectMapProject` 驗證版本／結構並計算 SHA，並非 SVG／HTML sanitizer；核心不取得 Nexus 帳號憑證或同源執行權限。

世界觀 WorldEntity 保存正式正文、穩定 ID／relations；地圖 placement 引用 entity ID，point／cells 幾何獨立，cells 帶 mesh 指紋，不能靠名稱或原生陣列索引連結。Page 級 CAS／outbox 交易維持新增條目及配置原子性，重試使用穩定 ID；移除配置／刪圖不連鎖刪正式條目。metadata 修改不重傳原生 binary；原生 `.map` 不包含 Nexus 正式條目，完整資料用工作區備份。

世界觀首頁沿用 CharacterBlockWorkspace 的一般區塊編排；group 區塊的可選 `worldMapView` 保存獨立 mapId、layer、overlays、views、detailsOpen 與等高線顯示設定，不保存地圖 binary 或正文副本。`worldMapBlocksVersion:1` 與穩定 legacy window ID 做惰性轉換，最後一個視窗刪除後不重新生成；原 sections、tabs、world_maps、world_entities 與附件保留。`WorldMapBlock` 合併預覽視角寫入並註冊既有離開保存屏障，`saveMapBlockView` 讀取最新 Page 後只修改指定區塊，仍走 Page CAS／workspace outbox。多個視窗引用同一正式專案；MessagePort ready 帶每份 iframe 文件的 documentId，預覽因區塊重排而重新載入時重建連線並載入正式專案；編輯期間意外重新載入則停用工具、保留既有本機 checkpoint。編輯工具須等 configure 與畫面切換穩定後啟用，區塊顯示設定的待保存內容也先經原保存屏障才寫地圖；已提交 attachment 變更重新載入其他預覽，編輯中的 working copy 不因預覽設定寫入重載。詳細資料依目前空間有效 placement 讀取正式條目正文，Tiptap 以不可編輯模式顯示，圖層可見性不篩掉正文。既有全世界觀分類清單保留未配置條目；完整編輯器展開自然地理／人文地理兩個相連分頁，地區、顯示方式與圖層控制屬於右側畫布工作區；路線、標籤及樣式沿用具名白名單指令開啟原生工具與既有確認／取消 checkpoint，不讓宿主直接操作 iframe DOM。WorldEntity 的可選 `fields` 以穩定欄位 ID 保存文字／數字／條目關聯，不另建實體表；舊紀錄缺少欄位仍有效。首頁詳細表單鎖定正式名稱，定位會沿用 placement ID、既有 MessagePort 及 MapView。正文保存檢查 Page revision 並保留目前 world_maps／world_entities，完整刪除條目須確認並拒絕尚被引用的條目。新空間 scope 使用 surface／underground／sky；舊 scope、parent_map_id 與附件不改寫，新主地表禁止重複建立，附屬空間刪除仍保留條目。

`WorldMapToolMenu` 僅呈現工具導覽與目前 Page 的正式條目，不保存另一份清單。人文分類依 country／administrative_area／culture／religion／原生 routes／settlement+site 分組；每頁25筆搜尋／配置篩選。新增先以穩定 ID 建立未配置正式條目，再由既有 point／RegionCommand 進入配置；取消配置不刪除已建立的條目。選取及配置完成以既有 configure／regionView 同步高亮；定位才傳送 focusPlacement 調整視角。明確的文化／宗教顯示模式優先於舊高亮的顯示備援，不以保留選取為由暗中換回另一類分布。路線不新增 WorldEntityType，沿用原生路線管理、確認與 checkpoint 取消；仍有路線暫存點位時，宿主確認須先完成／取消原生建立，避免誤將未完成線段視為已保存。

桌面工具側欄256／288px、手機底部可捲動面板；側欄收合只隱藏工具，右側 displayControls 與 canvas 共用 flex 工作區。ResizeObserver 沿用 contain／手動中心比例契約，工具分類切換不重新載入專案。地圖切換先經編輯／離開屏障，原生 working copy 保存後才切換；筆刷／點位未完成時不允許直接換空間。文化／宗教的 visible、distribution 與 cells 幾何在同次 saveRegion／Page CAS 中保存，appearance 指令只更新未提交預覽；取消復原既有配置，失敗與重試沿用原 outbox 和 revision，正式正文不重傳 binary。

內嵌編輯器 i18n 僅使用本機固定介面目錄，涵蓋動態面板、選項、說明及 aria／title 屬性；SVG、輸入內容、富文字與原生資料中的名稱／正文不翻譯。語言切換經 MessagePort configure 與保留原文還原，不重新載入 iframe，不使用外部翻譯服務。初始語言傳入隔離文件；新 feature／river／route 名稱與新預設 biome 名稱在產生名稱的路徑依語言設定，保留原 PRNG 消耗；已有名稱不改寫，不在 map:generated 上做批次改名（該事件亦用於載入）。原生類型識別仍為原格式，顯示標籤由固定目錄轉譯。第三方授權改由設定→關於 Nexus→第三方授權入口呈現，MIT 原文與 notices 檔案、來源連結完整保留。

原生 canonical 專案使用 immutable 附件／SHA 與 revision，另有本機 recovery checkpoint；10 秒 recovery 不進 outbox，60 秒或明確保存提交 canonical。失敗保留草稿，不以本機成功冒充雲端成功；未實作安全 GC，不能任意清掉舊附件。自然地理與文明配置分離；手繪資料保留、網格變更與再生成限制依 SPEC，不能在同步時重新生成地理。

`offlineCore` 註冊 `/world-map/offline.js`，scope 為 `/world-map/`；只快取公開工具。opaque iframe 的離線文件由工具快取組裝，broker 不代理私人 API 或任意網路，私人專案保存在既有 owner 儲存。線上 opaque iframe 的 heightmap／內建圖像亦沿用同一 broker：固定 core 子路徑、無 query／credentials、檢查圖像 MIME；不代理 API／任意網址。原生圖像匯出改走 fetch 而非 XHR，讓 WebKit 依既有 broker 讀取材質，不放寬 CSP。預覽單指捲動沿實際可捲動祖先傳遞，非捲動的區塊容器不吞掉手勢，編輯／全螢幕仍隔離背景捲動。

### 主程式 PWA（待實作）

目前沒有主 Manifest／全站離線外殼。IndexedDB 有資料不等於斷網能重新啟動網站。主 SW 應快取明確版本化的公開資源，與地圖 scope 分離；Auth/API、私人資料與附件 Blob 仍走現有帳號隔離儲存。重用 outbox／同步；Session 恢復、切帳號、未快取路由提示及更新不遺失待存內容須驗證。

## 5. 學習、字典與創作契約

### 學習排程

`StudyRepository` 與 `studySync` 為私人字卡／事件來源。正式複習依 `scheduledStudy`／`studyFSRS` 使用唯一三按鈕間隔排程；Session 凍結有效樣式快照，樣式變更作用於之後的 Session。introduce 事件在實際呈現新卡時扣當日額度，不能因預選或重開重複扣額度。新批次以 partial Fisher–Yates 從全部合資格未引入卡抽樣，再沿既有額度／批次順序限制組成目標；複習排序不控制新卡，恢復未完成 Session 不重新抽樣。

正式學習僅使用三按鈕間隔排程。學習組樣式以 `interval_version: 1`、`intervals.general/forgotten` 各三個秒數保存，沿用既有樣式 JSON、IndexedDB 與同步 RPC。新作答事件使用 `nexus-interval@1`，目前排程沿用 `fixed` 狀態容器；舊 FSRS 記憶、due 與四級作答事實保留，歷史引擎只供重播驗證。舊未完成批次保留 ID、已退出卡片及額度，原快照留於 `legacy_settings_snapshot`，恢復時凍結新間隔；讀取不重寫卡片到期時間。忘記留在批次等待到期，模糊／記得退出，批次不追加不同卡片。

目前排程 state 與保留的 FSRS 記憶分開，不偽造歷史或在讀取時改寫 due。作答帶 method、style snapshot 與必要 transition；事件 predecessor 順序、generation 與伺服器收據保障重試。兩裝置事件衝突保留歷史並要求明確解決，不能靜默推測合併。sessions 僅本機，其他領域資料依 Study 增量 cursor 同步。已退場 Quiz 不掛載 UI、不啟動同步；既有資料／SQL 的相容處理由現行 Adapter 與 migration 管理。

#### 整組清除與有效排程投影（PR #151 已合併；正式 Migration 已套用）

`study_deck_clears` 只保存目前 owner／deck 的伺服器 `cleared_at`、最後操作 ID 與該操作預期的前次時間。前次時間只用於同 ID 碰撞／重試比對，不建立清除歷史、世代或版本列表。`clear_study_deck` 先驗證目前帳號、未刪除的 study_set Page 與設定，再依原順序取得 workspace／study-sync 帳號鎖，以單一交易更新屏障、刪除指定組事件／舊決策並清空該組 state。字卡、排序、字典連結、官方來源、設定及其他組保留。相同最後操作重試不再清除；預期時間過期則回傳目前結果，不執行新清除。伺服器時間以毫秒保存，同毫秒連續清除亦嚴格前進。

`StudyEvent` 的原始欄位（包含未知欄位）與 ID 不變；只增加可選 `projection`，保存目前 `cleared_at`、有效 parent／before／after／log 及必要的 method_transition。`originalEvent` 只移除此投影以完整比對原始事實；`effectiveEvent` 僅覆蓋白名單內的排程轉換，不允許投影改寫時間／評分／卡片等識別。每事件只有一份目前投影，state.head 與歷史計數仍使用原事件 ID，不產生重播作答或額外對照表。

`projectStudyEvent` 使用原事件引擎與快照，從不讀取 legacy.item 的空白狀態或已驗證前置有效狀態重算。`reliableEvent` 保留原轉換驗證，並另外重建／驗證投影；Repository 在套用 feed 時再核對權威清除時間、同帳號／同組／同卡與實際前置事件／決策證明。只有 projection 內自稱的 cleared_at 不構成授權。事件 parent 拓撲序保留；兩裝置競爭分支仍標記衝突，既有單卡 reset／受控 relearn 決策可排除舊單卡分支，不採整組 generation。resolution 僅選有效 after／受控 checkpoint，沿用 event／state sequence CAS；feed 同時提供有效前置狀態所需的決策證明，支援裝置跳過多次更新後重連。

每輪 `studySync` 在任何學習上傳前呼叫 `get_study_clear_times`。`applyClearTimes` 在原 v9 Study stores 的單一 IndexedDB 交易保存權威時間、失效該組 Session／舊決策、移除清除前事件及 outbox、按依賴順序重建合法晚事件並更新同一 outbox。圖遍歷與 pending 事件排序採 Map／queue，重複還原 intents 仍按原事件順序送出並逐個 ack；所有學習寫入由原 RPC 路徑處理。原操作 ID 在本機 study_sync_meta 先行保存，網路回覆／本機提交不明時重試原清除操作，延遲回覆不能降低本機已知清除時間。完成本機交易後發出既有 nexus-study-changed，讓 Session、歷史、首頁統計與每日新卡額度重讀；已失效的正式 Session 需重新開始。

`apply_study_operation` 在既有鎖內重新驗證卡片實際所屬組、帳號與清除時間；清除後只接受晚於屏障且帶目前投影的事件。發生時間必須為整數毫秒，不接受超過伺服器目前時間 24 小時的未來事件；這是異常值檢查，不是精確校時。seed 一律轉成無 legacy 進度的空白 state；card 不可跨組移動；舊 resolution 不能恢復原 after。投影先通過原事件結構檢查，再驗證目前有效轉換、canonical predecessor／決策證明與清除時間，同一 ID 原始內容不同仍報 collision，同一清除時間的不同投影也不靜默取代。正式三按鈕間隔與歷史 fixed 轉換在 SQL 另核對排程公式／due；歷史 FSRS 仍由固定版本 TypeScript 引擎驗證完整計算，SQL 保留結構驗證並增加前置狀態／計數檢查，**不宣稱 SQL 已實作完整 FSRS 公式**。官方更新 SQL 直接插入的新 state 亦經 guard trigger 清空過期 seed。

備份仍為 v4、IndexedDB 仍為 v9，不增加 stores。匯出與原資料同交易讀取清除／待恢復 metadata；備份的 clears 僅為資訊，不可當成權威。登入帳號匯入任何 study_set（包括含 v1 Page-only legacy 欄位的備份；該欄位已退役且忽略）前先登入／連線核對並同步雲端 Study 事實與決策證明，再於原工作區匯入交易內重建有效排程、失效舊 Session。尚無權威清除時間的投影不能匯入；清除後合法原事件按原 ID 聯集，舊事件與 legacy 進度不能回復。缺少可信時間／無法驗證的事件留在 owner-scoped study_sync_meta recovery，排除正式排程與上傳，介面／同步狀態提供提示；v4 可選 recovery_events 保留待恢復原始資料，延後提示不阻擋其餘合法資料或合法備份內容。

Migration `20261105032115_study_deck_clear.sql` 開發時在隔離 PGlite PostgreSQL 驗證；使用者已確認正式套用，本輪唯讀記錄可見對應名稱（登錄版本 `20261105060444`）。新增表 RLS、RPC／內部函式 ACL、跨帳號與交易失敗回滾均有測試；本輪沒有正式資料庫寫入。清除、重播、雙裝置、連續清除、遺失回覆、舊 Session／v1／v4 備份、legacy／seed／resolution、6,301 張與 Chromium 中英文／多尺寸入口測試見 `studyClear.test.cjs`、`studyClear.browser.test.cjs`；完整交付結果見 HANDOFF／PR，不將隔離測試視為正式驗收。

發布／回復界線：獲授權後先核對正式 schema 與備份／PITR，單一交易套用指定 Migration，再發布前端並更新所有學習裝置。舊前端不理解投影，在清除後會被伺服器拒絕過期學習寫入；保留本機 outbox 並更新至相容版本，不清庫／降版。Migration 未就緒時新版學習同步在屏障核對處失敗並保留待傳資料，普通本機離線學習仍可用。成功清除後不可回退舊 RPC 或刪除屏障來「恢復」舊進度，應保留資料向前修復。正式套用、實際 schema 漂移、Safari／iPad／Android PWA 與真實帳號跨裝置仍待獨立授權／驗收。

官方包來源身份與私人字卡目前的字典連結分開；解除連結不改來源去重身份。更新只補缺卡，不覆寫私人字面／學習狀態，不復活使用者已刪除的來源卡。

### 2026-11-11 介面整理（#167／階段 A）

`CardDictionaryPanel` 的公開讀取完成時，只在搜尋框未被使用者聚焦時移動至標題，避免延遲回應中斷輸入／組字；提交直接讀取目前表單 query 值，不以較早 render 的 state 代表使用者輸入。原有請求生命週期、已發布快取、歷史及帳號清理不變。

`StudyPreferences` 保留原 saveDeckStyle／串行 flush 與 Session 快照規則，管理頁僅移除清除入口及冗餘提示；模式說明由原 ModalDialog 提供焦點、Escape 與觸控。清除仍只由複習紀錄頂欄開啟原 ClearStudyHistoryDialog，RPC、冪等及失敗恢復未變。

`NexusApp` 以目前實際編輯頁的 note（含缺省舊 note）／presentation 白名單控制 RightPanel 及其 ResizablePanel／手機開關掛載；首頁、管理面板、外部字典、世界觀、學習與其他 kind 都不預留側欄。既有 assistant_blocks 不改寫、不刪除，未掛載時沒有講稿操作或專屬保存回呼。

學習內 `CardDictionaryPanel` 沿用原 history marker、30筆內部瀏覽／捲動紀錄、已發布查詢快取及 owner/admin 驗權。首列返回／拖曳把手／叉叉，第二列搜尋／放大鏡，詳細內容在捲動區、鉛筆在內容右上。拖曳只從把手開始，使用 pointer capture；向下至少80px且垂直位移較大才關閉，短／水平／取消拖曳復原，不從內文接管捲動。把手支援鍵盤啟動；有管理員編輯 Modal 時停用，仍走原未儲存保護。開啟期間仍由原 Session editing guard 停用評分，不新增作答。EditorSection 的基本資料／概念／義項使用固定展開模式，其他有意義的區塊仍沿用原 details，欄位不重新掛載、草稿 queue/CAS 未變。

### 公共字典

字典獨立 Reader 與正式學習閱讀面板僅讀取已發布詞條與必要管理員驗權，不掛載私人字卡建立／計數／跳轉元件，也不為顯示這些操作查詢私人字卡；私人字卡管理及既有連結流程維持原資料來源。

字典是獨立公共領域，Entry／Sense 使用穩定 ID；Published、Draft／Review、構詞及附屬內容有各自 revision／身份。Published 供讀取，管理員 UI 共用既有字典工作區；真正授權與 CAS 仍由伺服器 RPC 執行。草稿保存不等於公開發布，清單狀態在批次完成後重新讀取伺服器。

字典交換由既有 export／preview／apply 管線處理。分頁匯出維持 scope version 一致，範圍變動要求重取；匯入先保存 operation UUID，再以原 RPC／receipt 重試，Published 修改產生 Review。checkpoint 與逐項狀態保存於獨立 `nexus-dictionary-import-review`；網路回覆遺失不換 UUID 重送。批次作業部分失敗保留結果，不能以新 preview 蓋掉尚待恢復的 operation。批次發布沿用 token／scope／人工確認，不繞過 Review 核准。

`delete_dictionary_entry` 在交易內驗證管理員、revision、完整 snapshot 及其他構詞／Review／官方 manifest 引用；有相依即拒絕。私人卡僅解除 join，不刪 payload／state／events／來源身份；Published 歷史及 Audit 保留，收據與退場標記阻擋舊 ID 被重建。未知外鍵／收據失敗完整回滾。核心概念沿用 `dictionary_learning_notes`；退場 ID／alias 與相容匯入 guard 防止舊資料重建重複內容。

#### 完整交換與安全取代（#163）

完整 `nexus-dictionary-exchange` v1 保持正式 snapshot／editor reviews／版本分離；新增 `entry_id`、完整常駐 `import_reviews`（含原始候選、來源、固定 ID、revision 與不透明 fingerprint），單一來源時另提供可整理的 `import_candidate`。未建立 Entry 的常駐候選使用明確 `snapshot:null`，不假造正式版本；多來源不猜選候選，須提供合法且保留穩定 ID 的明確候選。既有 v1 檔仍可匯入；缺少欄位不刪內容，未知欄位、失去識別或版本的檔案不能安全取代。舊 AI JSON 仍維持原人工 Diff 路徑，沒有完整交換來源證明就不自動清理。

匯出 RPC 保留原五參數，新增七參數 overload 與 capability：類型必須非空，全部／真正進行中審核可組合，管理清單搜尋／分頁不限制匯出。pending 為未處理差異／失敗待恢復的常駐來源或 active editor Review，不是所有 Draft；依穩定 Entry 去重。preview-only 先取得筆數與固定 scope version，每批至多100筆，範圍包含 canonical 與候選版本，任一變更要求重啟。既有 owner 分區 IndexedDB jobs／export_pages 原子 checkpoint 繼續使用；暫停可恢復，重新下載只讀原完成工作，不再查伺服器。

第一層保留檔案／貼上內容，JSON 文字區有高度上限；分析只解析、查詢與保存本機 checkpoint。第二層原生 dialog 提供分類說明、每詞條計數、三個預設收合區塊，每頁25筆且展開才繪製細節。`classifyPersistent`／`partialImportPlan` 仍為既有判定與欄位安全套用來源；獨立新增／空白補充屬安全，修改、取代、歸屬不明或混合內容屬待審核，結構、身分、版本或參照阻擋屬不通過。全筆安全才能使用「匯入安全詞條」；「匯入全部」也只對爭議部分建立／更新原常駐審核，不自動接受或發布。排除只略過本次作業。原 local operation、archive 與常駐來源保留，帳號分區不變。來源 proof 已確認且有效內容相同的待審核提案，沿用來源原 proposal key；僅重排具固定 ID 的義項／子資料不產生重複常駐列，構詞順序與實際內容差異仍保留。

`20261106032651_dictionary_exchange_safe_replacement.sql` 不新增資料表，也不改人工核准架構。`apply_dictionary_safe_import_reviews` 在原 advisory lock／CAS／receipt 管線中，獨立驗證候選確為新增而非覆寫，並以相同 Entry、來源 ID、revision、完整 fingerprint 與確切 issue target 證明取代。先鎖來源，再呼叫原 apply RPC；只有實際草稿寫入成功，才將確實涵蓋的舊 issues 標為 applied 並重算 pending_count。保留原來源與收據供追溯，不按拼寫刪除、不清不相關項目、不建立歷史版本。清理失敗的子交易回滾草稿、Review、收據與清理；未變更、失敗、過期或仍有爭議不清理。操作身分沿用 row ID＋revision 的既有冪等收據；結果不明仍先查正式常駐狀態，不換 operation 猜測重送。

匯出用的 `import_review_refs` 僅為清理來源證明；不加入一般人工決策的 UI 内容等價比較（同一列的決策本就改變其 fingerprint），實際 core context／scope／revision／內容驗證及 safe-transfer RPC 的嚴格證明仍保留。新 RPC 僅 authenticated 且 admin 可執行，內部 helpers 對 PUBLIC／anon／authenticated／service_role 撤權、固定空 search_path。Migration 在 Word segments／IPA／Page 退役與現有常駐審核之後；需另行授權後先 DB 再前端，capability 未就緒禁止新匯出與安全寫入，仍保留分析和原工作。沒有資料刪欄或回填；回退 UI 不撤除已確認的收據或恢復已取代差異，優先向前修復。

Google 登入仍為 `AccountButton` 的同一 Supabase OAuth，僅加入 `queryParams.prompt=select_account`、保留 origin redirect。帳號切換仍由既有 Auth／owner 邊界處理，登入選擇本身不清 IndexedDB 或未同步資料；瀏覽器測試驗證實際 SDK URL，Google 是否顯示選擇畫面仍須裝置驗收。

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

次級頁面共用 `WorkspaceNavigation.PageHeader`，沿用 SidebarToggle、來源返回 callback／Next Link 與既有功能總覽。SidebarToggle 在 layout effect 登記／解除頁首，工作區外殼於子頁自有導覽時讓出泛用 Nexus 頁首；專業編輯器保留原工具列。創作總覽在資源庫／模板管理開啟時保持掛載，保留集合查詢與捲動。側欄與首頁共用 dashboardGroups、同一 collection/grouping 裝置偏好及 sort_order；分組不改寫資料，子項目排序使用同一 comparator。側欄排序方向與三選一分類集中於既有 ⇅ 選單，沿用 useAnchoredMenu／useMenuDismiss 的定位、鍵盤與關閉行為，沒有獨立分類下拉列或第二套偏好。資料夾仍為 Page.folder，選單重用既有分類寫入，不引入資料夾表。登出入口透過既有未儲存導覽防護與 flushAllSaves，再呼叫原 auth.signOut；帳號切換清理與 owner-scoped outbox 不變。


### 字典構詞與逐欄草稿（#154／已合併 PR #155）

- `dictionary_entries.word_segments` 是 nullable JSONB 的有序展示資料：`id/text/hint/relation_id`。拼寫直接串接，正式連結引用原 `dictionary_relations.id`，不新增另一套詞條或私人權威資料。省略／null 的舊 Word 在編輯器以原 headword 建立單格；讀取不回填資料，第一次有效保存才寫入。保留 Entry/Sense、詞形、既有關聯與字卡連結。
- `20261105065440_dictionary_word_segments.sql` 為加法 Migration，不清理 IPA 或回填舊資料。CHECK 驗證字形、順序、唯一段 ID 與拼寫；延遲約束驗證正式關聯同屬詞條，預覽於回滾前也驗證。擴充既有 bundle 白名單與 published reader，保留原驗權／RLS／CAS／審核契約；偵測 RPC 原始碼漂移即整筆回滾。開發時在隔離 PostgreSQL 驗證；本輪唯讀正式 ledger 已確認 Word segments 以版本 `20261105083358` 登錄。
- PR #155 相容修正：只在 `dictionary_normalize_snapshot` 比對時移除 `detail.entry.word_segments:null`，與缺少欄位等價；不改寫已存 base snapshot／candidate、不移除其他 null，非空分段與順序仍比對。既有 revision／base snapshot／權限與 FK 驗證保留。完整編輯器子陣列省略保留、null 拒絕、[] 明確刪除；被分段引用的正式 relation 不能單獨刪除。bundle 的分段跳過判斷改用精確 JSONB 相等，避免 `@>` 把空陣列／不同順序誤當無變更。
- 舊交換／待決匯入的 raw snapshot 版本指紋可能因 schema 新增欄位而失效，沿用原 stale／重新預覽契約，保留原檔、草稿與決策資料，不自動重設版本。隔離測試覆蓋 Migration 前三種詞條 Review、舊交換再預覽與真實內容變更仍阻擋。
- 完整 JSON 與 AI JSON 沿用原格式、可選欄位與原匯入疑義審核；舊檔省略構詞欄位保留既有值。舊客戶端若嘗試只更名已具分段的 Word，因拼寫不一致而拒絕，避免靜默破壞。回復前端時保留新欄位，不能 drop 欄位或清庫。
- `DraftAutosaveQueue` 序列化整份有效候選，180ms 合併欄位完成事件；IME 暫停，textarea Enter 保留換行。回覆僅更新所送快照基線及技術 revision，不覆寫後續輸入。正常草稿沿用 `apply_dictionary_drafts`、已發布詞條沿用 review RPC，自動保存不觸發嵌入編輯器的結束回呼；未知回覆只有在重讀的整份候選相符時才能確認成功。失敗／無效內容保留手動重試與未儲存離開保護，不自動發布。
- `adminNavigation` 在 URL 保存原管理清單搜尋、類型／狀態／工作篩選及頁碼，跨頁讀取原排序。無上下文採同類型 `headword,id` keyset 順序；找不到原項目則提示清單改變，不猜測跳轉。切換前等待佇列與有效保存。
- `studyComposition` 只讀已發布的明示字形與提示，不從正式詞條名稱（例如 `ab-`）猜展示字形（`ab`）。背面 inline spans 寬度由英文決定，中文絕對定位並依實際英文寬度換行；不改動 FSRS、due、Session、事件、備份或 IndexedDB v9。
- PR #151 的正式套用狀態依使用者確認及本輪唯讀 migration 記錄核對更新；其清除機制未重新實作。IPA cleanup `20261105033000_dictionary_ipa_only.sql` 本輪唯讀核對仍未列入正式紀錄，未代為套用。Production 部署與真實裝置驗收另列 HANDOFF。


筆記匯出瀏覽器回歸等待既有列印按鈕啟用，確認 `NoteExportPreview` 已完成資產準備與分頁，再驗證正文、頁首頁尾、版面及 PDF；視窗可見／頁面殼層存在不代表準備完成。此次未改匯出產品邏輯，保留原內容與來源不變斷言。

### 緊湊構詞與 Session 開啟（#161）

`WordSegmentsEditor` 保留原有有序 `word_segments` 與 relation ID／Sense 契約；單行字形、提示與 44px 刪除操作同列，至少一格，新增只附加，移除排序控制。原生 details 收合正式連結，已連結時沿用 `RelationTargetPicker` 顯示正式名稱與狀態；更換保留 relation ID 及適用義項，解除段落引用不刪既有正式關聯。欄位仍由原編輯器完整候選／IME／序列化 autosave／CAS 保護，收合不卸載輸入。基本資料、概念、義項、詞形、歷史詞源及其餘區塊只重排呈現，不觸發初始化寫入。使用者名稱為「概念」，`core_concept`／RPC／交換識別不變。

`DictionaryArticle` 是獨立閱讀與學習內面板共用來源。有效 Word 分段以依序排列的兩欄小方格呈現，窄於 360px 改單欄；已由方格呈現的關聯不再重複縱排，未對應段落的正式關聯及反向探索保留。`readPublishedTargets` 先按正式 Entry ID 去重、最多四個 worker，沿用 `readPublishedEntry` 的 in-flight 去重及原公共離線快取，不另建資料庫；離開後停止尚未排入的請求並忽略晚回覆。只有回傳身份一致且 published 的目標可提供詞源，並限制共用／被連結義項；目前完整 Word 的詞源仍位於自己的歷史詞源區域。概念位於構詞下方，缺少內容不建立占位。

`StudyCompositionSummary` 只在翻面後讀原公開詞條，且正式拼寫相符才標註。段落寬度由實際字形決定，中文絕對定位且可換行；底線左右各內縮 1px，不插入英文字元／空格。概念完整使用已發布原文，不截句或生成，置於提示右側且可換行；不再另發一次摘要元件讀取。英文為 24／30px，小於中文 30／48px。不依賴 IPA，不改語音控制、作答或排程。

`ScheduledStudySession` 線上仍先 `auth.getUser` → 原 single-flight `syncStudy`（包括每輪 clear times、outbox、feed 與衝突核對），成功且畫面仍掛載才 `openScheduledSession`。本機一次嚴格 readwrite 交易讀取 settings／cards／states，以同一 snapshot 呼叫原建立／恢復演算法並正式呈現首卡；原 introduce、每日額度及 CAS 完全保留，整筆失敗回滾。後續載入使用 `readPresentedSession` 在同一交易 reconcile＋present 一次，practice 不產生正式 introduce；原 startSession／readSession／presentScheduled API 保留供既有呼叫。沒有跨交易快照快取，也不以過期本機資料略過雲端清除核對。

`StudySetView` 開始前只等待設定 flush，不再重讀全組；同步 ref 阻止快速重複開始。管理畫面離開後不為 Session 事件重載管理清單或解析全組官方內容；事件改以既有 styleForDeck 只讀取當前設定，讓閱讀偏好即時生效，排程仍用 Session 凍結快照；原官方解析器接收仍有效的請求檢查，停止後續未送出的批次並忽略晚回覆，返回管理時重新讀取。正式 Session 的官方解析仍只對當前卡片，沿用可信公開備援及原內容更新事件。載入提示區分本機恢復／帳號確認／雲端進度與待同步變更；同步失敗仍阻止正式呈現與作答。IndexedDB v9、備份 v4、帳號邊界、原清除投影與事件去重不變，沒有 Migration。

測量程式位於 `studyStartup.performance.test.cjs`（fake-indexeddb、原四讀流程 vs 單交易）與 `studyStartup.browser.test.cjs`（實際 StudySetView 按鈕、IndexedDB v9、受控 RPC）。後者輸出首卡、DB 開啟、各 repository 階段、全組讀取筆數、auth／RPC 耗時；BASELINE 模式從指定目錄讀取 main 基準的三個來源檔，沒有產品內平行實作。測試 RPC 每次受控延遲 5ms，不能當作正式 Supabase 或原生 PWA 效能；數值與未完成實機驗收見 HANDOFF。

### 官方連動與欄位退役（#157）

官方來源仍是私人 `study_cards.payload` 的 `official_pack_id`／`official_source_entry_id`；目前連結獨立存於 `dictionary_entry_id`。只有來源完整、有正式連結且 `official_custom === false` 的卡採連動解析；true 或缺少狀態維持私人文字。新下載 false；舊卡只在 revision=1、created_at=updated_at、未刪除、來源與目前連結一致、有效下載且字面完全符合已發布詞條時回填 false。回填按 owner 取得既有 workspace advisory lock，只改標記，不改時間、內容版本或排程；客戶端相同時間／版本僅接受其他內容完全一致的狀態補充，離線私人修改仍依原 LWW／outbox 同步。舊客戶端寫入有內容修改時伺服器保守轉成自訂，不能反向解除已確認自訂。

`resolveOfficialContent` 共用於列表／搜尋／預覽、正常與無盡 Session。原卡為安全備援；既有 public cache 的 responses store 保存最後可信發布文字；線上透過 authenticated `get_published_study_content(uuid[])` 每批至多 200 筆取得 published Word／正式義項（沿用按義項 ID 的中文串接），更新同一有容量／期限限制的公共快取。未發布／不存在目標清除該快取並用原卡，不讀草稿；暫時網路失敗使用可信快取。發布、focus／pageshow 與 online 重新解析。公共資料可跨帳號快取，私人卡／事件／outbox 仍嚴格 owner-scoped。

解析只產生顯示投影，不寫 study card、content_revision、狀態、due、Session 或額度。作答仍產生一個原事件，保存當下實際顯示答案與原卡版本；不改原事件驗證或清除重建契約。「改為私人自訂」先解析並透過既有 updateCard／outbox 保存當前發布文字與 true；後續字典發布不覆寫。解除連結時伺服器亦保存可取得的已發布文字及自訂狀態，來源識別保留供去重。

IPA schema 僅保留 id、entry_id、sense_id、ipa、sort_order、revision／既有必要時間。RPC bundle／published reader／交換及型別移除 locale/note；舊 JSON 僅在 pronunciation 與已知審核快照路徑忽略這兩個欄位，其餘未知欄位仍拒絕。快照正規化以正式 `pg_get_functiondef` 為基礎，只在原 `dictionary_core_content(dictionary_without_verification(...))` 外加入 `dictionary_clean_ipa_snapshot`；不重建／取代舊正規化。保留查證欄位退役、詞源 verification_note→data_source（兩者真實衝突仍拒絕）、舊核心概念按 Entry＋Sense 合併與原 ID／revision 規則、word_segments 缺少/null 等價、詞形缺省 []、關聯舊欄剔除與 ID 排序。[] 與非空分段、真正 IPA／來源／核心內容／關聯／排序／revision 差異仍比對；未知內容不剔除，原 raw_candidate／operation 保護不變，歷史草稿不改寫。

IPA DROP 前另以唯一 SQL 錨點修正 `search_dictionary_relation_targets(text,integer)`：發音搜尋只讀 `p.ipa`。詞條／Word／Prefix／Root、中文、詞源與來源、核心概念、例句、變體、詞形、分類／標籤搜尋與既有 rank／20 筆分頁／總數完全保留；原管理員檢查、長度／頁碼上限、SECURITY DEFINER、search_path 與 EXECUTE ACL 不變。搜尋或正規化錨點漂移即回滾整份 IPA Migration，不以 CASCADE 刪除未知相依。

發布前測試 fixture 已補載正式生活清單版 workspace RPC；`retirementFunctionBaseline.cjs` 以正式 ledger `20261105083358` 唯讀擷取的 11 個相關函式定義 SHA-256（只正規化 CRLF）及 EXECUTE ACL 驗證 Migration 前基線，不包含正式資料／憑證。`retirementCompatibility.test.cjs` 驗證完整函式比對、三份依序、刪欄後多欄搜尋／排序／跨頁、舊快照／Review、真實內容及版本衝突、錨點漂移與未知 view 相依的交易回滾。fixture 亦模擬正式 service_role 的既有函式預設 grant，驗證 CREATE OR REPLACE 保留權限；不調整正式角色／grant。隔離 auth／樣本資料不是完整正式環境複本；正式套用前仍須重做函式／相依物件／資料筆數檢查。

`study_set` Page 只保存學習組身份與設定連結；`ensureDeck()` 直接建立現行 schema2 設定，字卡／狀態沿用 Study stores 與原 RPC。已刪除 `migrateStudyDeck()`／Page 字卡轉換及舊測試卡自動重設。已轉換的現行 legacy 事件／狀態仍保留原驗證與備份契約。新建／複製／官方下載／工作區同步不輸出 study_items，備份 v4 匯入／匯出與遠端 Page 合併忽略此已知欄位，其他有效內容保留；已排隊 workspace 操作不改寫其 receipt payload，伺服器忽略該舊欄位。IndexedDB 仍為 v9，不清庫、不變更帳號隔離／有效學習同步。

指定順序：既有 Study clear／官方來源身份／Word segments 先就緒，接著 `20261105091439_official_card_linked_content.sql` → `20261105091518_dictionary_pronunciation_columns_retired.sql` → `20261105091519_page_study_items_retired.sql`，各自獨立交易；SQL 原始碼錨點漂移即整筆失敗。第二、三項分別實體 DROP IPA 舊欄與 Page 舊欄，不更新現行 Study 資料。尚未正式執行的 `20261105033000_dictionary_ipa_only.sql` 明確改為 superseded no-op；若環境已執行舊版，第二項會先移除舊觸發器再刪欄，不重做資料清空。正式環境 ledger 的部分版本與 repo 檔名不同，不可直接 db push 補套所有 pending 檔案；須另行授權、核對 Schema／RPC／備份及指定版本後，先資料庫、後相容前端。DROP 的歷史 locale/note 與未轉換 Page-only 卡不可由 down migration 復原，必要時從事前備份還原至隔離環境並向前修復。舊裝置 Page-only 卡經使用者授權捨棄，其現行 study outbox／卡／狀態不受此授權影響。

### 字典核准診斷與英文語音相容（#156／#159）

獨立審核頁的「套用」走 `apply_dictionary_import_reviews`，只更新匯入決策／正式草稿或 Review，不等於發布；編輯器經人工確認才走三參數 `approve_dictionary_review`。前者仍逐項驗證原始 proposal、完整 context／exchange version、revision CAS、子資料身份與權限；後者沿用 Published base snapshot／revision、內容驗證及交易發布，成功時可移除已完成 Review。HTTP 200 不能代表每個匯入項目成功，必須檢查 result.status／request_conflict。

`applyDecidedImportRecord` 在手動套用前沿用 inspect → classify → save_dictionary_import_review（CAS）取得新上下文。`comparableImportPreview` 只決定 UI 是否必須再次確認：剔除已知 IPA 退役鍵、分段 null／缺省差異，並在完整 snapshot、identities、Reviews、targets 等比對下忽略舊的派生 exchange hash；保留實際欄位、陣列順序、Entry／Review revision／時間及 target version。這不是伺服器的授權比較，也不覆寫原版本；實際套用仍提交新完整 context／exchange fingerprint，通過原 RPC 所有驗證。真正上下文或決策變動只更新比對結果，不套用內容。決策僅依原 issue 規則在 existing／incoming 相同時保留。

`reviewApproval.ts` 保留錯誤 message／code／details／hint 與 RPC 名稱，分類權限、過期、內容、格式、網路／未知與刷新失敗；元件保留結構化錯誤 ref，普通 UI 只顯示本地化分類訊息，不輸出 SQL／私密欄位。同步 ref／controller 鎖防重複點擊；RPC 30 秒客戶端期限只釋放等待，不宣稱伺服器回滾，不中斷或重送原交易，晚到成功仍可被查核；已知核准成功後只允許重讀。未知核准先查 Review 與公開快照，Review 消失本身不證明發布。未知匯入先依既有表的 RLS 讀取項目 revision／result，再沿用原 receipts 與操作識別；僅保存記憶體中的 id／entry_id／revision，不另建權威表或同步。刷新失敗與交易失敗分開，保留草稿、決策及選取；決策更新、錯誤或待確認結果不以列表刷新移走原項目；重新讀取仍經既有未儲存導覽保護。

`StudySpeechPlayer` 是既有 Web Speech 的播放控制器，不讀寫學習資料或 IPA。開始學習仍以 `prepareStudySpeech` 在同步使用者操作內 getVoices／resume／靜音 priming；失敗可於下次開始重試。每次播放重新取得 voices，僅選 en-／en_ 語音，偏好本機與 en-US，不單憑 localService／navigator.onLine 宣告英文不可用。自動播放清單未就緒時聽 voiceschanged 並於 100／400／1000ms 重查、1800ms 截止；空清單可只設定 lang=en-US，不指定 voice。手動空清單立即請求同一備援以保留 activation；只有已知非英文清單時不選錯語音，提示重新檢查。清單事件不重複啟播已開始的備援。

播放由 onstart／onend／onerror 判定；not-allowed、language-unavailable、voice-unavailable 與一般失敗各有訊息，僅 language-unavailable 提示啟用／安裝英文。8 秒啟動檢查不會取消仍 speaking 的引擎，另有 15–90 秒有限完成期限；沒有無限重試。全域單一播放 ownership＋世代 token 只用於音訊生命週期，與學習單卡 generation 無關。新題、手動重播、背景、pagehide／離開或卸載會取消舊播放及 timers／listener；舊回呼不能污染新題，翻面不重播。WebKit 自動播放讓出 cancel 事件迴圈，手動播放留在 gesture 內。Chromium／WebKit 的模擬語音測試驗證控制邏輯，不能證明 Android／Safari 原生語音或實際發音語言已驗收。


### 學習 Session 穩定顯示與私人隱藏（2026-11-11，階段 B）

字卡沿用 `study_cards.payload`、原 card outbox、apply_study_operation 與同步 feed；可選 `hidden`／`hidden_changed_at` 必須成對出現，舊資料缺省代表可見。不變更 IndexedDB v9、備份 v4、卡片 ID 或 content_revision。偏好以 owner＋deck＋card ID 隔離，不依拼寫；時間戳獨立於內容 LWW，缺省或較舊偏好不能覆蓋較新的設定，同時間衝突隱藏優先，明確恢復產生較新時間。原官方來源 trigger 保留這兩個可變欄位；舊裝置內容編輯及官方包更新仍受來源身分、自訂狀態與刪除保護。未支援此功能的舊離線程式無法即時知道新隱藏設定；不因此刪除合法舊裝置作答。

隱藏只改私人偏好，保留內容、due、事件與歷史，不新增假作答。正式新卡、到期／短間隔、無盡提前候選與 Session 後續 queue 共用排除條件；已完成 target 的真實完成統計保留，未作答隱藏 target 不計完成。恢復使用原狀態重新取得候選資格。備份先走既有雲端清除核對，再於原還原交易合併偏好，舊檔缺少欄位不得撤銷較新設定。

Session 可選 `presented_card_id` 只記實際呈現身份，不代表作答、版本或額度。refreshScheduled 保留仍合法的當前題，短間隔到期只重排後續候選；正式評分通過原 CAS／head／內容版本驗證後解除呈現標記。計時器只在明確等待、無當前卡時重新取卡；背景更新只讀取／核對，有實際題目變更時保留畫面並阻止舊題評分，要求重新載入。

首頁啟動記錄來源，返回回首頁；右上離開先確認。結束前等待原啟動核對、讀取及實際作答保存，結果不明或失敗不丟棄 Session。`endSession` 在原 strict IDB 交易保存 `ended_at`、清空後續 queue，不偽造 completed_at、答案或事件；待同步 outbox 保留。下次以最新設定建立新 Session，原清除防復活、同步、固定間隔與 FSRS 不變。

Migration `20261111143124_study_card_visibility.sql` 只增加內部 JSON 合併函式並修補既有 card RPC／官方 guard，沒有新表、資料回填或學習資料重寫；保留原清除／投影驗證與權限。必須先人工授權資料庫 Migration，再發布支援新欄位的前端；舊 guard 會拒絕官方卡的新偏好鍵。交易遇到未知安裝契約即回滾。回退前端後保留資料庫偏好保護，不以刪欄位或重寫 payload 回復。
### 字典列表身分、待審核口徑與刪除診斷（2026-11-11，階段 C）

分類查詢仍依義項篩選，但 `search_prefix_dictionary` 先按正式 entry ID 分組再 20 筆分頁；保留首個符合的 sense_id 與 matched_sense_ids，不按拼寫合併，分類計數改為詞條數。返回／相鄰閱讀可辨識同列中的匹配義項。舊分類資料與既有正式 ID 不改寫；新構詞分類契約仍屬後續 D 階段。

`list_dictionary_admin_work` 與完整 JSON 匯出的真正待處理範圍同時包含原 dictionary_transfer_pending 匯入工作及 state=active 的編輯 Review，依 entry ID 去重；只有普通未發布草稿維持 yellow，不當成 pending。多項差異與多筆 Review 不增加詞條總數。row 的 import_pending_count／editor_pending_count 用於導向原有匯入審核頁或編輯器，不共用另一套核准流程；pending_count 為該詞條工作量，stats.red 為詞條數。缺少正式詞條的合法匯入候選仍可計入，失敗／過期工作保留，查詢不刪任何資料。

刪除仍透過原 delete_dictionary_entry 的管理員、快照／revision CAS、穩定 operation ID、保護引用與原子交易。新增錯誤物件保留 RPC message／code／details／hint；使用者只看分類後的雙語阻擋訊息，不顯示完整 SQL。官方來源、其他詞條、進行中審核與未知外鍵不放行。最新 Schema 的無引用 Word（含構詞格、IPA、Review）隔離刪除正常；使用者原本的失敗尚缺對應詞條與 RPC 證據，不視為已修復根因。

Migration `20261111145758_dictionary_pending_identity.sql` 只替換兩個查詢函式，保留既有權限／RLS、排序、搜尋限制；交易前核對已安裝依賴及回傳契約，無資料轉換、刪除或發布。新前端可讀舊／新 row 契約，可先發布相容前端，再於另行授權後套用資料庫查詢修正，避免舊前端把 editor-only red 列導向匯入審核。此順序與 B 的官方 payload guard 必須先套 DB 不同，不可把 pending Migration 一次推送。
