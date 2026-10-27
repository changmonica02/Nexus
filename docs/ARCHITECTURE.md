# Nexus — 技術架構與資料契約（完整 Canon 遷移版）

## 唯讀表格延續與分頁研究（2026-10-25；Refs #107；第二批 CI 通過、待審查）

- PR #106 經重新核對 head／main／完整 CI 後，合併為 main `2bb1a01`。本批在獨立分支，只改輸出，不執行直接部署；不可將本節當正式裝置或帳號驗收。
- noteTablePagination.tableRowGroups 對每列 rowspan 區間取傳遞閉包，產生完整、無重複、排序的半開列群組；rowspan=0 保守涵蓋剩餘 row group。colspan 不重寫。任何跨越未結束 rowspan 的邊界都不可切。
- splitExportTable 只接受頂層 table 或單純 TableKit tableWrapper。副本的顯式 thead 或連續全 th 前列轉成 readonly thead；每個延續片段重複表頭，caption 只在第一段，colgroup／比例／cells／data-id 保留。不是變更正式 table schema。
- 以已完成資源等待的 content-box 作離屏測量，逐列群組附加；超出當頁則整組移至下一段。單群組超高時不截斷、不修改 rowspan，保留並回報 table/overflow 警告。tfoot、多 tbody、巢狀 table、嵌套 pageBreak 或不明 wrapper 不猜測拆分，原樣回傳警告。
- 測量 shell 只建立一次空表格骨架，再逐頁複製骨架／表頭，避免每頁深複製完整 N 列造成 N×頁數的暫存配置。新列副本以已載入圖片比例保留測量尺寸。仍有來源與輸出 DOM，未虛擬化、未證明極大文件峰值記憶體。
- NoteExportPreview 把頂層舊 pageBreak 映射為副本的新紙張邊界，原節點／ID 不改、不另存永久分頁；巢狀分頁保留但警告。長 multiColumn 保持原 ratio／DOM，不轉單欄；超高仍由瀏覽器延續並提示閱讀順序待檢查。保存期間停用版面設定，避免改設定時列印尚未準備的副本。
- A/B/C 研究在 tests/notePagination.study.test.cjs：A 為原生 @page／break／thead；B 在 .cache/note-pagination-study 安裝固定 MIT pagedjs@0.4.3（官方 v0.4.3 package），只在合成研究頁使用 Previewer；C 是真實 NoteExportPreview。正式 package.json／lock／runtime 不加入 Paged.js。CI 僅加入 Poppler/CJK 字型等驗證工具。比較 JSON／PDF／截圖及 Paged.js license 隨 artifact 留存。
- 超高表頭不可反覆複製，偵測後完整保留一次並警告。程式／測試 `cef87ef6cab82f22617e48b9f4cfad175ffc294f` 的 [CI 40164243583](https://github.com/changmonica02/Nexus/actions/runs/40164243583) 全部通過：96 項單元／契約（12 note、27 workspace、57 map），6 組 Chromium suites（含 12 次 A/B/C 實際 render）、TypeScript、限定 ESLint、production build（含 map prebuild）。指令及環境見 .github/workflows/note-editor.yml；PDF／print PNG／PDF 點陣圖／comparison.json／MIT 聲明保留在 note-export-evidence artifact。沒有移除既有回歸測試。正式帳號、Safari／Firefox、Android／iOS 實機、真實 IME、極大文件峰值記憶體未驗收。
- 不變：正式 Tiptap JSON、StableBlockId、原始欄比、fold 狀態、附件、owner、Page/outbox／同步、備份和 DB。沒有 Migration。實測結果、限制及尚未核准行為見 NOTE-EDITOR-AUDIT／HANDOFF。


## 筆記匯出安全第一批（2026-10-24；Refs #105；PR #106，CI 通過、待審查）

- 基準 main `23450f9` 已含 #87 自由筆記程式；以下是窄範圍輸出改良，非重建編輯器。詳細審計／開源比較／問題矩陣見 NOTE-EDITOR-AUDIT.md。
- NoteExportPreview 沿用只讀 DOM clone＋頂層 A4 測量；新增 noteExportLayout.copyExportBlock 移除副本編輯控制、開啟副本 fold、恢復已確認 math-preview，不執行 Tiptap commands 或寫 JSON。
- waitForExportAssets 對 attached 副本等待 image load 及 document.fonts.ready；最多 8 秒，失敗／超時有警告；取消 effect abort 清除 timer／listeners，late completion 不寫狀態。print 在 ready 前停用，儲存／print 例外轉可重試提示，不再冒出未處理 Promise。
- 內容超出目前可排範圍、超高 paper/header 或超寬區塊顯示保守警告；不靜默決定拆分長雙欄／合併表格順序。保留 auto-height 的相容顯示並明示實際 PDF 頁數可能較多，尚不是完整 fragmentation engine。
- CSS 只限 nexus-export：等比圖片限制、基本 heading break／widows/orphans／thead 與 print wrapper overflow；print 時只有 body 的預覽 portal 保留布局，避免原工作區 visibility:hidden 佔位。其他模組列印契約不變。預覽 UI 接既有 en/zh-TW 與 fallback。
- 無 schema、DB/IDB migration、附件、Page/outbox、owner 或 sync 變更；無新增依賴。Paged.js 只研究、不安裝。正式帳號／真實 IME／Safari／實機／大文件仍需人工或後續量測；實際 CI `40071963719`：6＋27 單元／契約、四組 Chromium、TS／lint／production build 通過；PDF 一般單紙頁數／方向與副本保護已驗證，複雜多頁 fragmentation 尚未完成。完整證據及限制見 HANDOFF／審計文件。


## 2026-10-21 筆記本機整合（Refs #87；未推送／部署）

- `integrate/note-freeform` 以 `origin/main` `b1840cb` 為底，依序整合四筆筆記提交；保留最新世界觀地圖與原有同步、附件契約。筆記變更沿用下方四批既有 Tiptap／Page JSON 實作，沒有 schema 或權限變更。
- 隔離地圖核心的 Vite PostCSS 設定，避免讀取上層 Next／Tailwind 專用配置；bridge 將非 React Hook 的 viewport 啟用函式改用別名，僅校正 Lint 辨識；地圖編輯及資料模型未改。世界觀瀏覽器測試可選用 `BROWSER_EXECUTABLE` 指向本機 Edge。

## V2-3 文化／宗教分布（2026-10-21；Refs #102；PR #103 已合併 main `b1840cb`，正式部署／實機驗收未在本輪核實）

- 基於 PR #101 合併 main `826926f`，沿用世界觀 Page JSON 的正式 WorldEntity／placements、單 Page CAS/outbox 及既有備份驗證；無 SQL、RPC、RLS、IndexedDB schema 或付費依賴變動。
- 文化／宗教沿用通用表單及 Tiptap。cultureSettings 可選 language/customs 自由文字；relations 的 distribution:* 多值 stable ID 引用驗證世界觀、目標型別、重複與自身引用。country／region／culture／site／branch／group 分別指向既有對應類型；group 為相關文化群體，尚無獨立族群模型，不假裝等同文化。舊自訂 relations 保留。
- cells 配置新增 culture/religion 支援。國家互斥／確認移轉仍只處理 country；文化／宗教無所有權或 parent 領土約束。可選 distribution 存 color/opacity 及預留 primary/secondary、influence（使用者分類／相對影響，非人口比例）；修改幾何保留顯示設定。舊資料無新增欄位仍有效，point 不變。
- 分布查詢不攔截 Nexus 城鎮標記／點位放置，雙擊會取消延遲單擊查詢，單純查詢不標記 native dirty；顯示設定在 await 前擷取輸入，只有 durable 保存成功才更新受控值。
- coreClient／nexus-bridge 只傳投影及視圖，無正式正文或帳號憑證。NexusRegions 共用原 cell brush、mesh SHA、逐筆 history、候選及手勢防護。正式 membership 索引含所有文化／宗教；按 view 決定可見色塊，點擊可查全部（含暫隱條目），選取後高亮範圍。每組重疊 cell 色彩等權混合，非繪製順序覆蓋；不同群組仍可因混色近似，圖例／高亮／完整查詢是識別來源。
- 比較：多層透明疊畫會受順序影響；斜紋在小螢幕高重疊較雜；逐 cell 全部查詢精確但需互動；選取高亮易讀但無法同時比較全部。採混色＋高亮＋查詢的低依賴組合，不引入圖形套件或新引擎。
- confirmed membership 在 configure 時更新；path 以 cells 陣列身分快取，換 mesh 清除；分布 SVG 快取在視圖／選取／配置／候選開始或取消時失效。pointer move 用 rAF 合併衍生重繪，不逐次重算正式分布；仍沿用全格網中心掃描筆刷，大地圖需實機評估。候選不寫 Page，確認才保存；新條目與首個分布同交易，穩定 ID 重試、revision／tombstone 保護不變。
- PNG/SVG 使用已確認及目前顯示偏好；native Save 克隆會移除同一 nexus-regions 衍生圖層，正式資料以工作區備份保存。原生 cultures/religions 保持引擎讀取，不自動正式化；自然地理、原生文明與正式分布互不重算。
- 程式／測試 `2ad6cf54c13de2ba99f555e5e0a70257c461656c` 的 [CI 39531024382](https://github.com/changmonica02/Nexus/actions/runs/39531024382) 通過：144 項單元／契約（36 repository、4 port、13 Adapter/fake-IDB、2 area、2 i18n、39 相關工作區／角色／study、48 native），核心及 Nexus TypeScript／production omit-dev build，相關 ESLint 0 errors／33 既有 warnings；兩組實際 Chromium（地圖／角色）成功，地圖 pageerror=[]。
- 正式帳號、多裝置衝突、Safari／Android／iOS 實機與大型圖不視為已驗收。Page 級同步不自動合併同時分布編輯，沿用既有衝突處理。


## V2-2B 國家／行政區與人工區域（2026-10-21；Refs #100；PR #101 已合併 main `826926f`；以下為交付紀錄）

**基準與盤點**：PR #99 已合併 main `cc6ae3d`。延用 `WorldEntity` 正式內容、`WorldMapPlacement` 穩定 ID／revision／tombstone、世界觀 Page JSON、Repository、單 Page CAS/outbox、IndexedDBAdapter 備份 v3 與 immutable native 附件。未新增 DB／IDB store、SQL／RPC／RLS、服務或套件。原生 states/provinces 使用 pack.cells 的索引及原生文明陣列、native isoline 渲染與單位換算；它們不具備 Nexus 正式 entity 身分。本批不轉換／覆寫舊文明陣列，既有地圖仍走原載入。

**幾何取捨**：原生 packed Voronoi cell 歸屬可重用 2D 網格、陸海判定與原生座標，鄰接 cell 共用邊，支援不連續領土／飛地及水域孔洞；儲存排序唯一整數陣列較小，筆刷無須新增布林幾何套件。獨立 Polygon/MultiPolygon 可以提供網格外精細邊界，但需處理自交、裁切、湖洞、相鄰共界、布林差集與投影，超出此批最小相容範圍，保留未來覆蓋／爭議模型。這批 **不支援任意向量頂點拖曳**，精度受原地圖網格限制。

**實際模型**：point 不變；`WorldRegionGeometry={type:cells,meshId,cellCount,cells}`，meshId 為 packed cell→vertex 索引與頂點座標的 SHA-256，與高度／文明／正文／尺度分離。每個 entity 每圖最多一個 active 區域，區域可含多塊分離地。換網格後 fingerprint 不符會保留原配置並提示無法疊加，不盲目用舊索引；本批不重投影或重建拓撲。relative 面積、km² 及 SVG 路徑均是衍生值，不額外存正式面積或另一份正文。

**結構化關聯**：仍用原 relations[]：parent（行政區／城鎮→country/administrative_area）、capital（country→settlement）、center（administrative_area→settlement）、culture/religion（country→對應正式類型）。保留既有其他自訂關係；上述保留關係為單值、同世界觀、類型相容，parent 另驗證循環。subtype 為自由文字。WorldEntityPanel／Form 只擴充既有列表及表單、沿用 Tiptap，沒有另建資料庫或富文字編輯器；文化／宗教只提供既有正式條目的可選引用，不新增該類型 UI。

**候選／交易**：`nexus-regions.ts` 專責讀取 pack 幾何、原生座標繪製、筆畫 history 與衍生統計。Manager 管候選、新條目草案、關聯、二次確認及 Repository，Editor 管私有 port／同一 iframe／視圖。候選在記憶體中，確認前不寫 Page；取消清除候選，離開提示，既有 flush 在候選未確認時阻擋換頁。單次 pointer stroke 一筆 undo，最多 50 筆；redo 清楚區分。小畫筆包含命中的陸地 cell，避免高縮放時因只測 cell 中心而無法繪製；取消還原原生 touch-action，取消候選不受原生 heightmap 模式的保存鎖阻擋。普通瀏覽不攔手勢，明確繪製時接管單指／滑鼠；多指暫停並還原未完成筆畫，讓既有 D3 處理縮放。已確認區域才屬於可重開／離線／備份的正式資料；未確認候選不是 crash-recovery 草稿。

Repository.saveRegion 在既有世界觀 CAS 交易一起新增正式條目（若有）、配置及 outbox。相同 placement ID／幾何重試不重複建立；已刪身分不得復活。國家同圖同 mesh 不重疊；候選列出重疊國家，明確二次確認後同交易從舊國家移除重疊 cells，空配置留 tombstone。沒有領土／戰爭／外交歷史。行政區越界或缺上級範圍、城鎮位置與正式 parent 不符只警告，不改正文／隸屬；native grid 不相容時不拿新 point cell 誤判舊範圍。條目改名只重畫名稱，疆界保存不讀寫 native attachment、不改 native map revision；後續 native 保存仍讀最新 Page 並受 CAS 保護。

**面積**：`nexus-region-geometry.ts` 對實際 cell polygon 用 shoelace 計算，排除 h<20 水域後加總，飛地自然相加；渲染使用 cell fill 與共享邊消去，內部共邊不重畫國界。只有 scope=region/town、V2-1 scaleKnown=true、distance.unit=km 且 scale 有效時才以 scale² 換算，UI 明示「估算平面陸地面積」。世界 scope／未知或不支援尺度只顯示相對面積與未校準提示，**不是球面測地面積**。不以 cell 格數或畫布 px 冒充 km²。舊專案僅有原生距離設定、但沒有明確 scaleKnown 的，不假設該尺度已校準。

**輸出／相容**：`#nexus-regions` 是衍生 SVG 圖層，與 point 的 `#nexus-placements` 分離，並保留原生城鎮／標籤及 Nexus 點位的點選優先權。private port 只傳投影與候選幾何，不傳正文／憑證；名稱用 textContent。PNG/SVG 用已確認配置（不把未確認候選當成正式輸出）；Save.prepareMapData 只在 clone 移除兩個 overlay。完整 Nexus 備份仍包含 Page 正式條目及配置，還原前驗證引用／關係循環／國家重疊；舊 point／舊 native／備份容器不遷移。World 複製依既有 helper 重建所有 entity/map/placement 與關係 IDs，map 複製仍引用同一世界觀 entity。舊版前端不保證可編輯新增 cells，但不得覆寫不認得的配置。

**驗證**：程式／測試 `e9b4ed57edde493dd237fe2a3f94dbccdb67095c` 的 [CI 39523479994](https://github.com/changmonica02/Nexus/actions/runs/39523479994) 成功：140 項單元／契約、地圖與角色兩組實際 Chromium，地圖 pageerror=[]；核心／Nexus TypeScript、production/omit=dev build 及相關 lint（0 errors／33 warnings）。包含雙入口國家／行政區、Tiptap 正文與正式引用、取消零殘留、逐筆 undo/redo、飛地、衍生面積、重疊二次確認原子移轉、失敗保留候選並重試、疆界不改 native digest／正文或附件、admin 越界警告、世界尺度不顯示 km²、真實 IDB 備份／重開指紋、手機單指與離線保存，以及全部既有自然／舊文明／point／視圖回歸。最後僅更新文件，未再修改程式。真實帳號跨裝置／Supabase 衝突／重新登入、Safari／iOS／Android 與大型圖效能仍留 #60，隔離 IDB／Chromium 不等於正式驗收。沿用 Page 級同步衝突，不新增 field 級自動合併。


## 地圖 V2-2A：正式城鎮與配置（2026-10-20；Refs #98；PR #99，已合併 main `cc6ae3d`，以下為交付紀錄）

**盤點與責任邊界**：PR #97 已合併，基準 main `65653d0`。世界觀是 `Page(kind=creative,creative_type=world)`，原 basic/sections/tabs 是自由內容，沒有可直接重用的正式城鎮集合；角色仍是獨立 Page，以原 `character_data.world_id` 歸屬世界觀。本批不猜測／搬移舊段落、不把舊 Azgaar burgs 自動轉成新條目，也不重建世界觀管理器。沿用現有 Page JSON／StorageAdapter／IndexedDBAdapter／WorkspacePersistence／同步及備份 v3，不新增 store、資料表、RPC、RLS、依賴或 migration。

**正式資料**：`CharacterProfileData.world_entities?` 是唯一現行正文來源，每筆 `WorldEntity` 有 schemaVersion=1、entityId、worldId、保留類型、name、aliases、可選 subtype/summary/Tiptap content、relations、時間及 revision。本批只有 settlement 的建立與編輯 UI。ID 使用 UUID，名稱不做關聯鍵。`WorldMapRecord.placements?` 只放 placementId/mapId/entityId、point geometry（原生圖座標，非螢幕像素）、visible、可選 label/icon、時間、獨立 revision、deletedAt。線／區域、樣式設定 UI 及永久刪除條目未實作。缺欄位的舊世界觀／地圖不遷移；不支援的版本或損壞／跨世界觀引用拒絕寫入，不靜默修復。

**交易與重試**：擴充既有 WorldMapRepository；createSettlement 可在同一份世界觀 Page CAS／outbox batch 寫入 entity 與 placement，沒有跨兩資料表的部分提交。管理器先建未配置條目、稍後 placeEntity 也只更新該 Page。呼叫端保留 entityId/placementId 作為穩定操作身分，建立的相同重試直接回傳目前 Page、不增加 outbox；同 ID 不同內容衝突。失敗交易不留下半筆條目，owner 在 async 前後檢查；跨帳號／世界觀引用拒絕。movePlacement 只改座標，removePlacement 留 tombstone 且不刪 entity，舊 placement 操作不得復活標記。metadata 操作不改 native map revision、不讀寫附件，後續 native save 讀最新 Page 再經 CAS 保留條目／配置；並行異動衝突時保留來源，讓使用者重試，不自動合併覆蓋。

**介面與核心**：WorldEntityPanel／WorldEntityForm 是最小列表及表單，詳細內容沿用 TiptapEditor。WorldMapManager 管理建立／選擇／表單／移動意圖；WorldMapEditor 透過私有 MessagePort 傳送投影後的名稱／座標／顯示設定，不傳條目正文或帳號憑證。bridge 在 `#viewbox` 疊加 `#nexus-placements`，文字使用 textContent；點選經 inverse screen CTM 轉原生座標，驗證邊界，不用名稱查找；捕捉點選及標記事件避免觸發原生筆刷、dirty 或重新生成。活躍 heightmap customization 時不允許啟動放置。一般地圖瀏覽、原有文明資料與自然編輯器仍沿用原路徑。切語系／更新 marker 不重建 iframe 或重設 camera。

**備份／複製／輸出**：Page JSON 自然包含正式條目及配置，IndexedDBAdapter 在匯出及還原寫入前驗證完整引用；二進位 SHA／owner／草稿驗證沿用既有流程。地圖複製重建 placement/map ID、仍引用同世界觀 entity；世界觀複製經 cloneWorldReferences 重建 entity/map/placement IDs 與 relations，原 immutable binary 可共用。snapshotCharacterTemplate 原白名單不包含 live maps/entities。PNG／SVG 保留衍生標記；Save.prepareMapData 只在 clone 移除標記，原生 .map 不複製正式條目。工作區備份才是包含條目／配置的完整 Nexus 備份，UI 有明示。原生專案載入／Quick Load 不修改 canonical entities，重畫投影後再顯示。

**驗證邊界**：程式／測試 `d29d5e5` 的 CI [39437559252](https://github.com/changmonica02/Nexus/actions/runs/39437559252) 通過：133 項單元／契約、地圖與角色兩組實際 Chromium、核心／Nexus TypeScript、production/omit=dev build；相關 ESLint 0 errors／32 warnings。地圖 pageerror=[]；涵蓋 Tiptap 正文、取消／失敗重試、雙入口建立／改名、移動不改正文、移除保留條目、多圖同一 entityId、SVG 標籤及原生快照排除投影、真實 IDB 備份／cold reload、舊文明／自然地理／離線／草稿與 CDP 觸控回歸。這是隔離帳號／測試資料，不等於 Supabase 正式帳號或真實裝置驗收。未合併／部署、未寫正式資料庫；真實帳號跨裝置雲端失敗／重登入、Safari／手機實機及大型資料仍須 #60 人工驗收。既有 page 級同步衝突契約未改為 entity 級自動合併；同步成功只能由實際工作區狀態表示。


## 地圖 V2-0／V2-1 第一批（2026-10-20；Refs #96；PR #97，已合併 main `65653d0`；下列為首批交付紀錄）

**分支整合**：`feat/world-map-natural-v2-20261020` 保留 PR #95 全部地圖瀏覽器／contain fit／觸控成果，再以雙親整合提交帶入 main `6cdf489` 唯一新增的 V2 SPEC。未改寫 #95 原分支，沒有 main 寫入。以下為本批實際程式；完整 V2-1 仍部分完成。

**V2-0 依賴盤點**：固定 fork 仍為 v1.154.2/b4a0dcb，MIT／第三方原檔不刪。`heightmap-templates.ts` 14 個非空程序腳本；`precreated-heightmaps.ts` 23 個 ID 均有 public/heightmaps PNG。自然 pipeline 的必要序列為 grid → heightmap → grid features/depression/near-sea lakes → coordinates → temperature/precipitation → clear/regraph/pack features/ruler → rivers → biomes → feature groups → ice。`Population.rankCells` 及 goods/cultures/burgs/states/routes/religions/provinces/economy/military/markers/zones/journeys 不屬於自然生成。依賴仍沿用 Alea（PRNG）、D3／Delaunator（格網及 2D）、lineclip／polylabel（幾何）、Zod（設定驗證）、Quill（原生註記）；public jQuery 等檔案沿用原第三方 notices。driver.js、Three 與 Electron 相關套件雖有退場入口，本批未冒險變更 lockfile／共享程式。PR #95 基線 vendor 1,338 files／25,176,697 bytes，其中 src 9,280,163 bytes、public 15,490,096 bytes、23 高度 PNG 1,218,425 bytes；非瀏覽器記憶體或下載量。CI 39420685227 的完整公開核心 22,744,317 bytes，9,954 grid／5,743 packed cells 的自然專案 1,040,640 bytes，Chromium heap 單次 sample 47,400,000 bytes（不是峰值／純地圖獨佔用量）；未驗收大型地圖／手機資源上限。建立視窗暫時有第二個隔離核心，用完即釋放；預覽僅保留當前 blob URL，不把 37 張預覽同時常駐或同步。河流原命名依文化索引；新圖使用自然物件編號，手動新增河流遇空文化時亦不建立文化。文明產生器保留，舊專案載入不經新圖初始化。Options.randomize 的自然分支跳過文明設定及隨機紀元／地圖故事命名，不保存捏造的人文歷史。

`NaturalGenerationPipeline` 以明確 ID 白名單重用 canonical steps，在 rivers 前初始化零值 typed arrays 與空集合。cultures/states/religions 的索引 0 是原生 unassigned sentinel，burgs/provinces 保留零槽；**不是隨機文明條目**。pop/s/good/market 等置零，routes/economy/markers/zones/relief/labels/journeys 空，避免保存與舊工具缺欄位。完整 GenerationPipeline 未刪；內嵌啟動／RPC 新圖使用自然路徑，原生載入直接重建原內容。預覽／資料不是靠隱藏文明圖層假裝自然地圖。

**建立及 preview 責任邊界**：`WorldMapCreator` 為一次性隔離核心容器，沒有 Repository／地圖 ID／自動保存入口。名稱、37 來源、低解析度高度預覽、seed、畫布尺寸、格網數、赤道氣溫／降水倍率及選填實際寬度；進階欄位收合；新建格網目前限制 1,000–30,000，preview 最多 5,000；既有更大型專案不因此拒絕載入，但未作大型資源驗收。catalog／heightmap-preview RPC 共用 fork 的來源與演算法；preview 建立獨立 grid、最多 5,000 cells，finally 釋放 HeightmapGenerator retained graph 並恢復 PRNG，不替換既有 grid/pack/options。只於確認後生成完整自然圖並 snapshot；成功後 Manager 才提交原 Repository。取消及生成失敗沒有新地圖。預製影像經 fetch → 核心自己的 blob URL 取樣，支援既有離線資源 broker 並避免 opaque sandbox canvas taint。選填寬度設定原生 distance unit/scale；未設定的自然圖不顯示未校準比例尺，不把畫布 px／內部高度值當 km／公尺。

**相容及儲存契約**：沒有新 DB／IDB store／RPC／RLS／付費依賴。world_maps 的 ID/world/owner/revision/attachment SHA 及備份 v3 契約不變；完整 native project bytes 仍存 immutable 附件，非 PNG。僅在 options.map 加入可選、版本化 `nexus: {version:1,naturalOnly,scaleKnown?,stale:[hydrology|climate|biomes]}` 擴充；舊檔缺值可讀，不自動遷移原附件，未知欄位仍依既有 strict schema 拒絕。新內容不承諾回退至舊版核心／對外 Azgaar .map 互通。`Repository.create` 可選採用既有 scope/parent metadata，先驗證同 world 的有效 parent，再與專案／世界觀／outbox 同一原子 commit，避免詳細圖建立分兩次寫入。其餘 SHA dedup、owner/CAS、10 秒 local draft／60 秒 canonical、自動保存／flush／同步／備份流程沿用。

**檢視與工具**：`nexus-natural.ts` 管理自然／contours／temperature／precipitation／biomes 及既有 political/cultural/religions 的 2D 呈現，獨立河流／湖泊／邊界／標籤／城鎮／道路等 overlay。configure RPC 不 generate、不寫 options.map 或 styles，不切換編輯目標；Editor 沿用同一 iframe 與相機／手勢。等高線重用既有高度網格、平滑與 Delaunay renderer；線距及主要線標籤僅 renderer-local override，標籤為相對高度值。自然工具搬移原 DOM 按鈕分群，原 dispatcher／brush／undo/redo 保留；其他舊工具收合。特殊區域先沿用原生 zones 的 cell list／note 等表示，不新增世界觀條目或魔法模擬。

**安全限制（不得當作已完成）**：Nexus 高度編輯只開 Keep；所有原筆刷／rescaler 的 history 匯合點鎖定原海陸分類，退出後更新高度並保存 stale 標記，不重算水文／氣候／生態或文明。海岸設定及 features／lake 既有屬性可編輯，但跨海陸拓撲重建暫不開放。氣候設定預設關閉 auto-apply，明確套用只更新 temperature/precipitation，保留手繪 rivers/biomes 並標記待更新。UI 顯示待檢查與缺少安全局部重算的限制；不宣稱單物件鎖定。Biomes Restore 同樣阻擋，修改生態屬性不自動重算人口。原 Regenerate 命令／search／hotkey／prompt 在內嵌路徑阻擋；沒有混入普通編輯的全圖重算。含備份、候選預覽、二次確認、失敗還原的完整再生成管理流程尚未實作，故保持不可用。3D／地球主入口、heightmap 3D、搜尋命令及語音設定／polling 停用；View3d lazy module、舊 preference schema 與 WorldConfigurator 的 D3 氣候小球等共享依賴保留，未宣稱刪除全部 bundle／所有物件朗讀入口。

V2-2 建議先確認 WorldEntity 穩定 ID 與既有創作內容承載，再加 map placement 引用的可選 adapter；不要依名稱關聯、複製正文，亦不要讓同步內容觸發地理重建。本批沒有提前實作 WorldEntity／Placement 或新的儲存系統。驗證狀態與未執行項目見 HANDOFF／PR #97。



## 行動優先世界觀瀏覽器（Refs #94；已實作，測試進度見 HANDOFF）

WorldMapManager 保留同一 repository／opened document，預設僅顯示精簡導覽、醒目選圖、可橫滑範圍／圖層、地圖與詳細圖資訊；管理採共用 ModalDialog（行動底部／桌面右側），各圖更多操作及獨立軟刪除復原收合區，並將 parent 與重載移入管理。建立／關聯詳細圖僅調用既有 create／setPresentation，所有 scope／parent／revision／owner 檢查沿用原流程；未變更資料格式。詳細資訊經 previewFooter slot 放在地圖與簡短狀態之間，無第二個地圖渲染器。

canvas 新增只存在記憶體的 contain presentation 開關，僅 Nexus bridge 啟用。fit floor 使用 viewport 與原生 graph 長寬的較小比例，原 D3 translate constraint 讓留白置中；不把此 floor 寫入 Options／原生專案。resize 保留地圖中心與 scale，原本為 fit 時重新 fit；Nexus 預覽／編輯兩模式皆使用此顯示適配，獨立核心未啟用時原行為保留。bridge configure 的 fit／resize／freePan 都是暫時 presentation RPC，不是新的儲存資料。

Editor 用 ResizeObserver／visualViewport 處理容器／全螢幕尺寸，預覽高度依實際 canvas 起點、世界觀容器及可用 viewport 計算，扣除上方導覽／控制高度而不是只套用固定 vh；configure 只在模式變更或真正 resize 時適配，語系／圖層／同步提示不再 dispatch resize。同圖載入／編輯往返擷取即時 view，獨立 preview camera 不被編輯器手勢覆寫；首次建立後返回預覽重新 fit，後續返回保留進入編輯前的瀏覽鏡頭。切圖不套用舊的 cached view 並回頁首，明確重設置中顯示整圖。浮動工具附著 canvas，手機隱藏加減、保留全螢幕／重設／扳手；全螢幕／fallback 鎖定底頁捲動並保留鍵盤焦點。

D3 本身處理雙指縮放／平移，filter 在一般預覽拒絕單指拖圖；bridge capture 的單指垂直 touchmove 經 private MessagePort 傳有限 scroll delta 到最近的世界觀捲動容器，避免 opaque iframe 吃掉頁面捲動。雙指後餘下一指不立即切成捲頁，全部放開再開始；全螢幕 freePan 讓原 D3 接受單指，且父層拒絕 scroll RPC。預覽 SVG 黑色背景由 scoped CSS 取消，留白繼承 Nexus 主題；扳手避開原比例尺，fullscreen fallback 也鎖定 body 捲動。預覽雙擊只呼叫 D3 point zoom，不開編輯工具；編輯模式保留原生操作。

本機狀態為既有儲存結果／草稿狀態的短標籤；雲端依傳入 SyncState 的 error／syncing／offline／pendingPushes／connected 顯示，idle 不當成已同步，connected 只稱已連線。沒有新增傳輸、DB 或登入流程。


## 內嵌核心 UI 清理（Refs #92；已實作，驗證見 HANDOFF）

固定 fork 直接移除 About／AppInfo、tour、desktop offer 原始 UI 模組及 registry／入口；shell 不再初始化首次導覽、原生拖入載入或獨立 beforeunload。versioning 保留原生版本解析與相容 API，取消首次公告／更新通知計時器；loading seam 保留給生成與高度圖工具，只設定 aria-busy，移除啟動畫面與漸隱。必要的即時操作提示與錯誤提示保留。

Save／Load／New Map、Dropbox／URL／browser-storage 選單與獨立快捷鍵退場；Ctrl/Cmd+S 由原 Nexus bridge capture handler 觸發父層儲存。Nexus 原生專案、PNG／SVG、匯入、多圖、重載、草稿／離線／備份流程不變，底層 save/load/export 與種子／地形生成 API 保留；原生 load-error dialog 依賴的 pickMapFile 僅於使用時建立暫時 input，取消或選檔後移除，不再初始化常駐原版匯入入口。Advanced export 僅保留額外 JPEG／tiles／GIS／JSON 與相關輸出設定，不重複 SVG／PNG。

原 Google Translate 控制與事件／callback 移除，保留 UI 透過既有 Nexus 語系 adapter 與字典／英文 fallback；不翻譯專案資料。外層 WorldMapEditor 提供第三方授權 disclosure，連結固定來源、完整 MIT 及 build 產生的 THIRD-PARTY-NOTICES.txt；該檔收錄原公共素材與 runtime dependencies 的授權文字，也進入既有公開工具離線快取。原 LICENSE、著作權及素材聲明不刪。不改資料模型或正式 DB。

## 世界觀地圖首頁改版（2026-10-20，Refs #90；分支已實作／自動化與隔離驗證通過；正式／實機待驗證）

世界觀路由只渲染 WorldMapManager，不再渲染 CharacterContentEditor；角色／模板路由不變，舊 basic/sections/tabs 不刪除。world_maps 可選 scope（缺值 world，可擴充）與 parent_map_id；Repository 沿用 owner/revision/atomic outbox 更新並拒絕跨世界觀、自指與循環；複製整個世界觀時重建 parent IDs。無 DB schema 變更。詳細圖仍為獨立原生專案，未提供城鎮街道建築生成。

WorldMapEditor 同一 iframe／MessagePort 在嵌入唯讀與全畫面編輯切換；configure 指令處理預覽、語系、原生 Layers/zoom，不因圖層或語系重建核心。唯讀核心隱藏編輯 UI、攔截編輯點擊／鍵盤且不回報 dirty；父層也拒絕預覽 persist/save，預覽不啟動寫入。修改保存／recovery／離線沿用原流程；切換地圖／明確重載以同一核心的 load/generate 換原生專案，舊非同步讀取取消提交；核心連線與 document effect 分離。document ID/blob identity guard 在 React 切圖到 effect 執行間也拒絕舊內容儲存，不能僅依 ready boolean。視圖按 map ID 存於頁面記憶體；進出編輯前以 view RPC 讀即時原生視圖，再改版面，返回不重載；此 JSON 是暫時瀏覽參數，不是新的專案儲存格式。預覽 iframe 絕對定位於有界 viewport，避免遮住詳細圖導覽。

worldMapTranslations 併入既有 i18n；核心 nexus-i18n.ts 由 esbuild 使用同一字典並以 private port 收到語系，MutationObserver 只翻譯介面文字與提示屬性。SVG／input／textarea／contenteditable／動態資料選項排除，核心提供當前 pack/options/notes 的唯讀資料來源，以保護與 UI 同名的使用者內容；rich-text 只於不掛入 DOM 的 inert template 擷取文字，不渲染或啟動資源。自訂預設的 option 不翻譯；SVG 變更不觸發全介面掃描。未知字串留英文。首批 452 條涵蓋主工具列、選單、圖層、設定、常見提示／錯誤，非全量逐字翻譯。Google Translate 已於 #92 清理移除，改跟 Nexus 語系。useWorkspaceDialog 僅新增可選 labels，世界觀傳入 i18n，其餘呼叫維持原預設。


## 2026-10-20 Nexus 世界觀地圖核心與整合（Refs #88；已接線，驗證結果見 HANDOFF）

- 依 SPEC `64c8e0e`：Azgaar 是可獨立發展的來源起點。原始碼實際保存於 `vendor/azgaar`（來源 v1.154.2 / b4a0dcb933586a57242508f558f775da16c35c64），日後可直接修改其中的工具、圖層、UI、演算法；不追蹤上游升級。已有 source marker 時 prepare 不下載／覆蓋 fork，沒有 marker 的非空目錄則拒絕覆寫。
- **責任邊界**：vendor 僅掌管地圖生成／編輯與原生格式；`integrations/azgaar` 是薄層容器 adapter；`WorldMapManager/WorldMapEditor` 掌管世界觀入口、操作及狀態；`WorldMapRepository` 經既有 StorageAdapter／WorkspacePersistence 管理帳號、資料及 outbox。不向核心傳送 Supabase token、不新增資料庫結構或付費服務。
- 世界觀原畫面上方的「地圖」區沿用原生 dialog 提供多地圖新增、命名、複製、軟刪除／還原、匯入與完整編輯。模板／角色不顯示地圖入口。世界觀複製時重新配置 map ID/world_id，原生 immutable binary 可共享同一已保存快照；後續儲存各自建立新附件。Nexus metadata_version=1 與 engine_version 分開；第一批無 metadata_version 的資料視為 1，未知版本拒絕覆寫。
- 保存前先 flush 原世界觀待存內容，成功後立即採用回傳 Page／附件清單；不另外重排相同 binary 的上傳。工作區全量 flush 與備份會先呼叫開啟中地圖的 flusher。編輯器採 modal，返回／Escape 等待真正保存；失敗保留編輯器及原專案，提供原生 .map 匯出，瀏覽器離開時若有未存修改會提示。
- 原生 `.map` 是內容真相。原 Save/Load、圖層及主要工具保留；Nexus save 和原生 browser-storage save 都對接既有 Repository。原 `Load.uploadMap` 的 void/FileReader 流程另提供可 await 的成功／錯誤邊界；原生 UI 匯入也經該邊界，載入失敗時禁用保存，避免將部分重建狀態覆蓋原檔。Nexus 提供 .map／SVG／PNG 匯出，原引擎其他匯出入口保持在核心。
- **本機與同步分離**：10 秒檢查點僅把有修改的原生快照保存於既有 workspace_sync_meta 的 owner/world/map 專屬 draft key，不建立 outbox；60 秒或明確保存／返回才提交 canonical 專案。相同 bytes 不排入傳輸；map revision 與 world transaction guard 防過期 session。draft 清除需 token 相符；有衝突的舊草稿保留供匯出或明確捨棄，不能被新 checkpoint 靜默覆寫。儲存時讀取／序列化仍可能隨大型專案耗時，尚未完成真實裝置效能驗收。
- **容器隔離**：sandbox 不授予 allow-same-origin；MessagePort 僅由符合 frame window、opaque origin 與隨機 session 的握手建立。fake-indexeddb 與記憶體 Storage 僅供核心原有偏好／工具在 opaque origin 運作，不是 Nexus 私人資料來源；核心單槽 lastMap 不承擔多圖／跨帳號保存。原核心的 Service Worker 與自動保存由 Nexus 接管，成功保存後把該快照記入容器的 session-only lastMap 供原生 Quick Load 使用；原獨立程式的 serverless 檢查只對嵌入模式放行。
- **離線公開資源**：固定源碼本機建置為單一 executable core，來源仍維持模組化。`/world-map/offline.js` 只預存公開工具，絕不快取私人專案或 API。opaque iframe 無法直接依賴一般 Service Worker 導覽快取；離線時由 Nexus 從自己的公開 cache 組合 srcdoc，並以 session 驗證的 broker 提供已快取公開圖片／fetch 資源。broker 不代理任意網路請求或私人路徑。未先備妥工具或瀏覽器移除快取時必須上線重新準備；並未新增整個 Nexus app shell 的離線啟動能力。
- **備份安全**：沿用 schema v3，新增可選 world_map_drafts base64 區段；舊備份仍可缺少該欄位。匯出只含目前 owner，缺失的原生 map binary 會阻擋不完整備份。匯入前核對 owner、世界觀歸屬及原生 binary SHA-256；不同帳號備份拒絕寫入。既有其他帳號 cache 與本機 pending/tombstone 保留，現有 recovery draft 優先於匯入版本；沒有更動正式 Supabase。
- **建置／授權**：Node >=24，使用既有 esbuild/fake-indexeddb；npm run dev/build 的 pre-step 從本地 fork 建置，不使用第三方線上編輯網站。prepare 僅供首次來源取得，正式 fork 已在分支。保留原 MIT/LICENSE、原始 public/libs/SVG 素材聲明；產物另含上游 runtime dependency 與 fake-indexeddb 的 license／notice。建置快取與 public/world-map 產物不提交，不觸及既有筆記或字卡編輯器。
- **工具驗證（程式 43246e4）**：GitHub Actions [39371050349](https://github.com/changmonica02/Nexus/actions/runs/39371050349) 通過 20 項資料契約、4 項真實 MessageChannel／公開資源 broker、10 項 Adapter + fake-indexeddb、39 項既有 workspace／角色／字卡同步回歸；上游核心 tsc/Vite 與 Nexus TypeScript/build 通過；修改地圖邊界 ESLint 0 errors／3 refs warnings。隔離 Chromium 的實際世界觀元件 → 原生城鎮編輯 → 保存／Quick Load／關閉重開 → 保存失敗及 reload 草稿復原 → 離線修改及重開 → .map 重新匯入並編輯 → PNG/SVG → native 無效檔案拒絕 → 多圖／複製／刪除還原完整流程通過，pageerror 為 0。這不等於正式 Supabase、完整 Nexus 真實登入、跨裝置或 Safari 驗收。
- **已知界線**：原外部 Watabou 內嵌預覽／雲端助手等遠端工具受隔離政策限制，並非 Nexus 必要服務；未快取的外部字型在離線時可能使用 fallback，原字型名稱及原生資料保留。舊 immutable 附件仍保守保留，沒有自動 GC；長期容量、原生 import 的跨版本轉換及新 Nexus 地圖格式均未提前實作。地標連結保持 M4。真實帳號、跨裝置衝突、Safari／Windows 等驗收須與隔離 Chromium 測試分開。

## 2026-10-20 世界觀地圖首批儲存基礎（歷史狀態；目前整合見上節）

- `src/features/worldMap/worldMapRepository.ts` 固定整合來源為 Azgaar `v1.154.2`，commit `b4a0dcb933586a57242508f558f775da16c35c64`；目前沒有複製或執行上游程式。上游 LICENSE 為 MIT，Copyright 2017–2024 Max Haniyeu；嵌入時仍須保留完整授權及第三方素材聲明。
- `CharacterProfileData.world_maps?: WorldMapRecord[]` 僅保存穩定 map ID、world_id、標題、版本、軟刪除及附件參照／SHA-256。既有世界觀沒有此欄位時視為空集合；不新增 Page kind、IndexedDB store、SQL、RPC 或 RLS。完整原生 .map 存於既有 file Attachment binary，不放 content_json。地圖屬於既有非模板、未刪除世界觀，所有 Repository 操作明確核對目前帳號及世界觀 owner。
- Repository 提供 create/list/read/save/rename/duplicate/remove/restore；**尚未掛載任何 UI，也沒有 Azgaar 編輯器或自動儲存計時器**。map revision 用於拒絕過期編輯 session；world revision 在 WorkspacePersistence 原子交易中再次比對。新附件 metadata、binary 與世界觀參照共用既有 outbox batch。呼叫端未來必須先 flush 世界觀待存內容，完成後採用回傳 Page，不能以舊 React snapshot 覆蓋地圖 metadata；這個工作區接線仍未實作。
- 每份變更專案使用獨立不可變附件，避免原生 binary 被過期 session 就地覆寫；相同原始 bytes 的 SHA-256 不排入任何寫入或傳輸意圖，改名／刪除／還原僅改世界觀 metadata，不觸碰 binary。舊附件及參照保守保留，不自動 GC；**大型專案連續保存的容量成本、壓縮／節流與安全回收仍待實測，不能宣稱雲端消耗驗收通過**。列表不讀 binary，重新開啟沿用 owner/revision 附件快取。
- `inspectMapProject` 僅結構驗證目前固定版本的 plain/base64/gzip 原生容器，並保留輸入 bytes；它不完整驗證上游地圖語意，也不是 SVG sanitizer。未知版本／格式拒絕寫入。完整 Azgaar 原生往返、非同步載入完成／失敗 handshake 與匯入隔離仍未實作；不可將此函式當成可安全同源嵌入匯入 SVG 的證明。
- M0 查證：上游為獨立 Vite 應用（Node >=24 建置），全域地圖狀態與 UI 應隔離於 iframe，避免改寫成 React 引擎。`Save.prepareMapData` 序列化設定、SVG 及完整地圖欄位；`Load.uploadMap` 使用 FileReader 且回傳 void，解析／重建另行非同步，不能以呼叫返回判定載入成功。上游原生 browser storage 的 `lastMap` 是單槽，不能當 Nexus 多地圖及帳號隔離的資料真相。實際 iframe origin／CSP／檔案隔離方式尚待驗證，未鎖定部署方案。
- 上游 Git tree 共 1,739 entries，blob 大小合計 67,067,340 bytes（來源快照，不是正式 bundle 或記憶體用量）。lockfile 的 runtime dependencies 含 MIT、ISC、BSD-3-Clause、Apache-2.0、Unlicense；字型、圖示及 public/libs 等素材仍須逐項核對。尚未引入上游套件、資產或付費服務。
- 驗證：`node tests/worldMap.test.cjs` 在 Node 24.19.0 通過 19 項合成資料／記憶體交易契約測試。`tests/worldMapIndexedDB.test.cjs` 新增 5 項既有 Adapter + fake-indexeddb 測試（重新開啟、交易回滾、owner、Trash／offline outbox、備份往返），本輪未能執行。未執行 TypeScript、build、現有完整回歸、瀏覽器、真實 Supabase 帳號／裝置驗收；M0 尚未全部完成，M1–M3 不列完成。

## 2026-10-19 筆記改版第四批（Refs #87；本機實作，未部署）

- 把手拖至另一個頂層區塊的右側中段，會在單次 ProseMirror transaction 建立局部雙欄：目標區塊留左欄、拖入區塊進右欄；原節點內容與 ID 保留，undo 可恢復原順序。上／下邊緣仍用於一般排序。拖曳期間於有效側邊落點顯示提示；舊手動分頁節點及既有雙欄不作此轉換。

## 2026-10-19 筆記改版第三批（Refs #87；本機實作，未部署）

- rich editor 的同頁把手拖曳會依穩定區塊 ID 定位來源；跨左右欄沿用既有欄間移動命令，頂層區塊移入指定欄位則在單次 transaction 內搬移原節點並保留 undo。欄位分隔線與把手的層級分開，避免遮擋操作；不改資料模型或同步介面。

## 2026-10-19 筆記改版第二批（Refs #87；本機實作，未部署）

- `TiptapEditor` 沿用既有 rich schema；`MultiColumn` 以所選頂層區塊局部包覆，NodeView 儲存 20–80 欄寬比例，移入／移出與攤平操作保留子區塊；`FoldBlock` 儲存嵌套內容與展開狀態。把手與斜線選單修改原 Tiptap transaction，頂層區塊拖曳落點以穩定 ID 搬移同一節點並隔開 undo 群組；繼續使用既有 `content_json` 自動儲存／同步，無 migration。
- `FloatingSidebar` 在桌面 Note 編輯頁變成共用 Sidebar 的 docked 呈現，寬度與開合只存本機 localStorage；手機與其他功能維持原浮層。`NoteExportPreview` 複製已渲染 DOM，於副本展開摺疊並依 A4 可用高度分頁；PDF 列印從預覽輸出，不改 Note JSON。舊 paged Note 保持原呈現／匯出，待無損過渡規則確認。

## 2026-10-19 筆記改版第一批（Refs #87；本機實作，未部署）

- 同步讀取開始時保留 pending 快照，回填時優先採目前 pending，再採讀取開始時 pending。避免遠端通知以較舊 IndexedDB 內容覆蓋 800ms debounce／寫入中的本機修改，引發 Tiptap setContent 與游標跳動；未改同步頻率、附件下載或權限。
- EditorPane 對 Note 採單一 flow 編輯器，保留儲存的 format／pageBreak 節點；不自動轉換或刪除舊分頁資料。新建 Note 不再詢問流動／分頁。Document 原有 flow 契約不變。
- `content_json.noteAppearance.fullWidth` 為逐篇外觀設定，沿用原有 JSON 儲存與同步，不新增 schema；編輯回傳保留根層 metadata。標題靠左，原有可收合講義目錄沿用。
- Math NodeView 隔離原文輸入事件、空內容退出時刪除節點、按鈕防止 blur 提前提交，公式提交／刪除具有獨立 undo 邊界；美元輸入辨識跳脫、code 與 IME，不屏蔽空白。公式及原有教學節點資料模型不變。
- 本段是第一批當時狀態；後續區塊選單／斜線指令、雙欄調寬、桌面側欄及輸出預覽已見上方批次。長雙欄跨頁等未決規則維持待確認。

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


---

# 歷史專項文件整併（2026-10-27）

以下保留原始專項文件內容與出處，作為技術／產品紀錄；若與本文件較新、已確認的規格衝突，以較新的決策為準。舊實作步驟與 SQL 不應未經重新審計直接執行。


## 原始文件：`docs/NOTE-EDITOR-AUDIT.md`

# 筆記編輯器審計與漸進路線圖

2026-10-24；Refs #105。產品／程式基準 main `23450f92ec7a12e46c48d18582b630a4bc4a158d`。這是程式盤點與驗證計畫，不表示正式帳號／裝置或全部功能已驗收。第一批驗證結果見 HANDOFF 與 PR。

## 2026-10-25 第二批：真實 A/B/C 比較與表格延續（Refs #107；PR #108）

第一批 #106 已合併 `2bb1a01`；本批從該 main 另開分支。標準 corpus 與實際研究入口為 `tests/fixtures/notePaginationCases.cjs`／`tests/notePagination.study.test.cjs`。Paged.js 固定官方 v0.4.3 package（MIT），只在 CI cache prefix 安裝，不加入正式依賴；license 與比較 JSON、12 組 PDF／print 截圖留存。不是未經實測的推薦。

### 檢查範圍與判讀

- 四類共用輸入：125 列長表、跨列／跨欄及高儲存格的複雜表、跨三頁以上的 38:62 局部雙欄（70 左段／15 右段）、中英長文／KaTeX／圖片／超寬 code／fold／nested／legacy break。另有真實 EditorPane 的 110 列 Tiptap JSON／StableBlockId／未知 metadata 保存與重開，以及圖片無尺寸、caption、Tiptap tbody 頭列與巢狀 break 專項。
- 字型共用 sans-serif/CJK，研究 CSS 12px/1.4；C 保留 Nexus 紙張／header/footer 與內容盒（預留 10mm），A/B 使用原生 @page margin boxes。因此頁數與耗時是此 fixture 設定下的實測，不可當一般引擎排名。
- PDF 以 pdftotext 驗證唯一 ASCII body markers 的缺少／重複，DOM 驗證 row IDs、rowspan／colspan、KaTeX／圖片及 source immutability；頁數與 preview count／頁首尾分開記錄。markers 不驗證所有中文字、公式 glyph、圖片畫素或完整閱讀語意；截圖／PDF 必須搭配檢視。
- baseline CI 40162658785：原生 CSS table 5 頁／5 headers；Paged.js 預覽和 PDF 都 5 頁但只 1 header；舊 Nexus C 是 1 preview／5 PDF 頁。12 case 的標記未遺失／重複，不代表複雜視覺排版已正確。紅測試確認舊 C 缺少真實表格預覽延續。

### 九項方案比較（有實測的部分與限制分列）

| 面向 | A 原生 CSS | B 隔離 Paged.js 0.4.3 | C 唯讀 DOM＋原生 print |
| --- | --- | --- | --- |
| 表格跨頁 | 實測 thead 可重複，screen 無實體頁；需瀏覽器 fragmentation | 有實體頁；本 prototype headers 不逐頁重複，需額外 handler／測試 | 本批新增安全列群組／重複頭列，超高 rowspan／未知結構保留警告 |
| 雙欄跨頁 | Grid 有實際多頁輸出；順序仍需產品定案 | 可生成多頁，但不能據此宣稱混合欄完整語意 | 保留 ratio／DOM；長欄 1 preview 對多 PDF 頁時明示，不攤平 |
| 內容完整性 | corpus markers 可抽取；並非 glyph／像素保證 | corpus markers 可抽取；需再查 span／視覺續接 | 對 C assertions：markers、row ID 唯一、span signatures、來源不變；無法安全切分不丟棄 |
| preview/PDF | 無獨立分頁 preview，直接 print 真實排版 | 實體 preview count 可比 PDF，但 headers／內容仍需驗證 | 安全長表格要求 preview=PDF；特殊高列／長欄仍可能不同，警告 |
| LaTeX | 共用 KaTeX/fonts，過寬仍需處理 | 同 source KaTeX，SVG/MathML 需配合個別檢查 | 正式 NodeView 已確認 preview，無編輯卡；字型就緒與過寬警告沿用 |
| 效能／記憶體 | 記錄 render latency／heap sample，無自製頁面 DOM | 額外解析／頁面 DOM 與 library bytes，測量非 peak | O(rows) 群組＋有限頁面測量；空 skeleton 避免 N×頁數完整表 clone，仍不是大文件 peak 壓測 |
| 複雜度 | 最低，但無預覽頁與 browser 差異 | 高，CSS parser/chunker hooks 加維護成本 | 限定 table subset；不自製完整行分割或瀏覽器 engine |
| 依賴／授權 | 瀏覽器已有，零 package | MIT；0.4.3 官方 tag，測試 prefix only；未選 beta 或商業服務 | 正式 runtime 新依賴 0，沿用 DOM APIs |
| 資料相容 | 純輸出，不寫 JSON | 僅研究 DOM，不接儲存 | JSON／ID／欄比／fold／附件／metadata／CAS 全不改；舊 root break 只映射輸出邊界 |

### 已選範圍及未完成

採 C 安全表格＋A print 的最小組合。表頭重複是可識別的 readonly continuation，不重複正文列；caption 只一次。rowspan 的連通群組不拆，tfoot／多 tbody／nested table／nested pageBreak／特殊 wrapper 都保留警告。原文、欄比與來源順序不改。長欄最終閱讀順序、超高 cell 中途拆分、任意段落行切分／寡行、所有 PDF glyph、跨 browser、真實大文件 peak／GC 尚未解決。本批不採用 Paged.js runtime；研究原型的 headers／複雜內容需額外 work，不是授權或付費阻擋。

程式／測試 `cef87ef6cab82f22617e48b9f4cfad175ffc294f` 的 [CI 40164243583](https://github.com/changmonica02/Nexus/actions/runs/40164243583) 全部通過：96 項單元／契約（12 note、27 workspace、57 map），6 組 Chromium suites（含 12 次 A/B/C 實際 render）、TypeScript、限定 ESLint、production build（含 map prebuild）。指令及環境見 .github/workflows/note-editor.yml；PDF／print PNG／PDF 點陣圖／comparison.json／MIT 聲明保留在 note-export-evidence artifact。沒有移除既有回歸測試。正式帳號、Safari／Firefox、Android／iOS 實機、真實 IME、極大文件峰值記憶體未驗收。

| 案例 | A PDF／預覽 | B PDF／預覽 | C PDF／預覽 |
| --- | --- | --- | --- |
| longTable | 5／無 | 5／5 | 5／5 |
| merged | 4／無 | 2／2 | 5／3 |
| columns | 4／無 | 4／4 | 4／1 |
| mixed | 3／無 | 3／3 | 4／4 |

本輪 12 次 render 的 body markers 缺少／重複、重複 row ID、span 變更均為 0。C 的安全長表有 5 個重複表頭；超高合併列仍為 3 preview／5 PDF、長雙欄 1／4，兩者確實出現警告，不冒充完整解決。六張實際 PDF 首頁點陣圖已檢視：C 長表邊界／表頭及雙欄保留，B 原型雙欄右欄未在首頁原位置呈現；首圖檢查不代表所有頁面已人工驗收。Flex 變體尚未實跑。

Chromium 151.0.7922.34／Linux 單次樣本：長表 A/B/C render 49/156/63ms、DOM 節點 658/3018/2069、heap sample 3.70/6.45/6.60MB。全 corpus A 30–55ms、B 112–156ms、C 53–113ms。啟用 precise-memory-info，但只是完成時取樣，不是峰值／GC 基準；C 含 React 應用，不能據此宣稱引擎記憶體排名。Paged.js 0.4.3 dist 920798 bytes／gzip 161393 bytes，僅研究安裝；最新 upstream beta 未採用。不得把「PDF 文字 markers 正常」升級成完整視覺驗收。



## 架構與產品核對

- Note 在 EditorPane 使用單一 TiptapEditor 連續編輯（目前 `isPaged=false`，不把保留的 PaginatedEditorView 分支誤認仍在日常使用），保留舊 `format=paged`／pageBreak 與未知根 metadata；Document、其他模組不屬本批。main 已有 #87 的自由筆記實作，HANDOFF 原「本機未推送」是歷史進度，不可再當目前缺失。
- Tiptap 3.27.1／ProseMirror JSON 是正式內容。StableBlockId 透過 appendTransaction 修補缺失及重複 ID；局部 multiColumn、column、foldBlock、inlineMath／blockMath 均沿用既有 schema。多欄比例、把手／Shift 多選／斜線、側欄與單篇全寬已有程式與 browser fixture，這次不重做。
- onUpdate 傳 JSON／文字／block 游標錨點；prop 同步以 schema 正規化 JSON 比較後才 setContent，並避開 composing。既有 pending edit 保護已修過同步快照覆蓋游標；目前未重現新 P0，不停用空白／正常快捷格式。setContent 的舊字串錨點與全文序列化仍值得後續量測。
- TableKit 已提供 resizable tables；現有選單呼叫 addRow/Column、mergeCells、splitCell、header 及 CellSelection/TableMap。不能因為選單存在就宣稱 Excel／HTML／複雜 rowspan paste、Tab 導覽及跨頁已全部驗收。
- 數學 input plugin 避開 composition／code／跳脫美元；node view 保留原始 LaTeX、可編輯／刪除／history。原生 IME、錯誤原文與超長公式仍需針對性矩陣；不把合成 composition 當實際中文輸入法。
- Markdown 是自製 parser／serializer，與 Tiptap schema 並非完全等價；沒有 remark AST 作中介，也沒有完整 GFM／專屬節點無損協議。
- NoteExportPreview 是 React portal，從已渲染 source 複製唯讀 DOM，按頂層區塊測量 A4。摺疊在副本展開，不寫正式 JSON。現有超高塊改 auto height，沒有真正分割長段落／跨頁表格或長雙欄。
- EditorPane 的 onContentChange 保留根 metadata；既有 WorkspacePersistence 在 owner 範圍同交易寫 Page/outbox，revision guard、pending merge、tombstone 防覆寫；附件 metadata/binary 分離與租約快取。此批不改以上路徑、不遷移或刪除資料。真實遠端 JWT／RLS／多裝置仍未由靜態盤點證明。

## 開源研究與採用界線

以下官方 repository／README 於 2026-10-24 讀取；GitHub pushed_at 只表示近期活動，不等同品質保證。沒有複製第三方原始碼或新增套件。

| 來源／授權／觀察 | 可借鑑、可用程式與 Nexus 邊界 | 體積與風險 |
| --- | --- | --- |
| [Paged.js](https://github.com/pagedjs/pagedjs)，MIT，最近 push 2026-10-23 | Previewer 的非自動 preview、beforePreview／afterPageLayout hooks、資源完成後量測可借鑑；MIT 程式可採用但須保留聲明。不可直接全站載入 auto polyfill，不能讓它重排可編輯 DOM。 | 新增 CSS parser／chunker／fragmentation 執行成本；尚未對 Nexus fixture 量測 gzip bundle，不能拿 repository 大小當 bundle。屬中高風險原型，這批不安裝。 |
| [ProseMirror Tables](https://github.com/ProseMirror/prosemirror-tables)，MIT，最近 push 2026-06-18 | 現有 TableKit 已重用其 TableMap／CellSelection／tableEditing invariants。依官方建議注意 plugin 排序，維持每列寬度一致與儲存格不重疊。後續補 merged-cell paste／Tab／undo 測試，避免自造另一套格網。 | 已在依賴圖中，維持單一 PM 版本；不用再安裝第二份。桌面選取與手機工具可用性需實測。 |
| [Milkdown](https://github.com/Milkdown/milkdown)，MIT，最近 push 2026-10-23 | PM＋remark 的 plugin-driven AST 分層、Markdown fixture round-trip 可借鑑。程式可依法採用，但更換 editor/schema 會破壞 Nexus 自訂節點，故不替換。數學仍需 Nexus 的原地編輯與歷史契約。 | 另一套編輯框架／插件與 parser 成本高，bundle 未量測；無需為借鑑模式引入整套。 |
| [remark](https://github.com/remarkjs/remark)，MIT，最近 push 2026-09-27；[remark-gfm](https://github.com/remarkjs/remark-gfm)，MIT，最近 push 2025-02-10 | AST parse/stringify、escaped pipe、autolink／footnote／tasklist／table 標準 fixture 可借鑑。GFM 不等於 HTML renderer，不支援 Nexus 合併格／欄寬／雙欄／fold 原樣表示。數學另需 math extension，不是 GFM 自帶。 | ESM-only GFM 插件，需 unified/micromark/mdast 等依賴；離線 import/export 可 lazy load 的候選，但需先比較測量，不直接加入。 |
| [Tiptap](https://github.com/ueberdosis/tiptap)／[ProseMirror](https://github.com/ProseMirror)，核心 MIT，Tiptap 最近 push 2026-10-23 | 既有 transaction mapping、Selection／history、composition guards、NodeView.ignoreMutation 是直接沿用的 API。以 transaction 的新 doc 定位，不靠 React 重建或關閉快捷鍵掩蓋。 | 現有依賴優先；不升級版本或增加另一份 PM。Tiptap README 明示 Pro Extensions 需訂閱，Cloud／Pro 轉換、AI 等不是此批免費方案。 |

本批自行實作的是 Nexus 唯讀副本的資源就緒、取消／清理、溢位警告與 CSS 輸出隔離，不是另一個編輯或分頁引擎。授權評估不代表所有同品牌套件都同授權；未來採用需固定版本／檢查該套件 license、transitive deps 與 bundle。

## 問題清單（依影響 × 機率，兼顧修改風險）

分類：**B** 程式已能確認的缺陷；**R** 需瀏覽器重現／根因仍是假設；**F** 功能缺口；**D** 技術債；**Q** 未核准決策。以下列出十項必要欄位，未執行的回歸不得視為通過。

| 順序／ID | 類別 | 影響／發生機率 | 修改風險與處理 |
| --- | --- | --- | --- |
| C02 | R | 極高／新根因尚未重現 | 中；沿用既有 P0 保護，真實 IME 優先驗證 |
| S01 | R | 極高／故障情境常見 | 高；保存契約不改，每批回歸 |
| E01 | R→已有紅測試 | 高／慢速媒體常見 | 低；本批等待副本資源 |
| E02 | B | 高／長文與大表格常見 | 低至中；本批警告，完整拆分另議 |
| E03 | R | 高／依列印容器 | 低；局部 print CSS＋PDF 頁數驗證 |
| E04 | R | 中高／公式展開時 | 低；副本防護與來源不變測試 |
| M01 | B | 高／有專屬節點時必然 | 中；先能力警告，無損格式需比較 |
| T01 | F | 中高／複雜貼上未量測 | 中；先補 TableMap 互動矩陣 |
| C01 | D | 中高／大文件未量測 | 中；基準後才優化 |
| P01 | F/Q | 高／超過一頁區塊時必然 | 高；A/B/C 原型，未決規則不定案 |

### E01｜預覽先於資源就緒量測 — B（紅測試確認）／P1，第一批
1. 名稱：圖片／字型載入競態。2. 影響：頁數、換頁與實際列印不一致。3. 重現：慢速載入高圖片／延遲字型後立即開預覽，等待資源後檢查 paper 高度。4. 根因：useLayoutEffect 同步一次量測，沒有 fonts.ready、image load/decode 或取消。5. 參考：Paged.js beforePreview／PM 不動原 doc 原則。6. 最小修正：只在副本等待有限資源就緒，超時／失敗顯示真實警告，關閉與換設定清理。7. 回歸：延遲 PNG、失敗圖片、關閉／重新開啟、快速換方向；檢查原 DOM／JSON 不變。8. 新依賴：否。9. 格式：不變。10. 優先：P1，低風險。

### E02｜超高／超寬內容無警告 — B／P1，第一批
1. 名稱：A4 紙張 silently auto-height。2. 影響：預覽紙張數可能不等於 PDF 頁數，內容可能裁切而無提示。3. 重現：單一 2000px pre／長表格／超寬公式，開匯出。4. 根因：oversized 分支把 body.height 改 auto，沒有 warning；table wrapper、pre、math 的局部 overflow 仍存在。5. 參考：CSS fragmentation 的 break、orphans/widows；Paged.js overflow hooks。6. 最小修正：在副本偵測超出可用寬高／未能分割內容，明示預覽區塊數與實際頁數可能不同；可安全的圖片等比約束與 print overflow 修正，不自行定案雙欄閱讀順序。7. 回歸：大圖片／長段落／rowspan 表格／pre／math／columns，預覽與 print-media 截圖及 PDF，文字與來源完整。8. 新依賴：否。9. 格式：不變。10. 優先：P1，低至中風險；完整拆分另批。

### E03｜列印 portal 受不可見應用布局干擾 — R／P1，第一批
1. 名稱：visibility:hidden 不移除佔位。2. 影響：多印空白或意外縮放。3. 重現：前置 1600px 工作區，開獨立 portal，產生 PDF 比對 preview 紙張數與 page boxes。4. 根因假設：全域 print visibility 隱藏但保留 app 的尺寸，portal 又 position:static。5. 參考：原生 @page／named page。6. 最小修正：僅在 body:has(export-preview) 下移除其他 body 直接子元素列印布局，重設 portal 邊界，不動編輯器。7. 回歸：一頁／兩頁、直橫式 PDF 媒體框、前置工作區不留白。8. 新依賴：否。9. 格式：不變。10. 優先：P1，窄範圍 CSS。

### E04｜正在編輯的公式副本可能輸出輸入卡 — R／P1，第一批驗證
1. 名稱：NodeView 即時編輯 UI 被複製。2. 影響：公式遺漏或印出按鈕。3. 重現：公式原文展開時從匯出流程取副本；檢查隱藏 math-preview 與 textarea。4. 根因：cloneNode 複製 display:none 與可編輯卡，並不根據 LaTeX 正式狀態重建。5. 參考：PM NodeView 與 KaTeX。6. 最小修正候選：副本只保留已確認 preview、移除編輯控制；未確認原文不偷偷提交。7. 回歸：inline/block、錯誤原文、fold 內公式、刪除復原及 source 不變。8. 新依賴：否。9. 格式：不變。10. 優先：P1，若實際入口先 blur 已消除此狀態，仍維持副本防護測試，不捏造已發生資料遺失。

### M01｜Markdown 無損能力未告知 — B／P1，下一批獨立
1. 名稱：專屬節點／merged table 變成扁平文字。2. 影響：以 Markdown 當備份會失去欄比、收合、span 或公式。3. 重現：pageToMarkdown 輸入 fold/multiColumn、含 blockMath 與 colspan 表格再 createMarkdownContent；一般 Note 純文字貼上不會自動走此 Markdown parser，GFM table paste 亦需專用測試，不將 Document 匯入支援視為 Note 已有完整貼上。4. 根因：default getTextFromNode／tableToMarkdown 未表達 schema 專屬 attrs；GFM 本來不能表示 rowspan。5. 參考：remark-gfm AST 與 HTML fallback，須先選明確交換策略。6. 最小修正候選：輸出能力檢查／警告、保留 JSON 備份；HTML/sidecar 封裝先原型比較，不直接定案。7. 回歸：表格 pipe／code ticks／多欄／fold／數學 round-trip fixture。8. 新依賴：警告不需；parser 另評估。9. 格式：警告不改，無損交換方案待核准。10. 優先：P1，獨立分支，避免改共用 Document parser。

### T01｜複雜表格互動矩陣不足 — F／P2
1. 名稱：表格 paste／selection／鍵盤驗證缺口。2. 影響：Excel 合併格、Tab、欄寬可能有未發現問題。3. 重現：貼 HTML rowspan/colspan、跨格選取後 merge/split／undo；最後一格 Tab。4. 根因假設：未見專用不變條件 fixture，不代表 TableKit 已壞。5. 參考：PM Tables tableEditing／CellSelection／TableMap。6. 最小方案：先測，不重寫指令；另檢查「完整顯示」目前只改 DOM 而未持久化。7. 回歸：TableMap width／不重疊、撤銷、冷重開及手機選單。8. 新依賴：否。9. 格式：維持現有 attrs。10. 優先：P2，測出根因再修。

### C01｜全文序列化／Stable ID 全掃描 — D／P2
1. 名稱：長文交易成本。2. 影響：大文件輸入延遲。3. 重現：500／5000／10000 blocks，同步快照、空白、拖曳與 undo；記錄 transaction→paint percentile／JSON 成本。4. 假設：onUpdate 全文 getJSON/getText，prop effect stringify，StableBlockId 每次 docChanged descendants。5. 參考：PM StepMap changed ranges 與 plugin state。6. 最小方案：量測後再局部掃描／revision 比較；必須保護 duplicate IDs、selection/history，不先重構。7. 回歸：Enter／paste／duplicate／undo ID 不變及多窗格。8. 新依賴：否。9. 格式：不變。10. 優先：P2，中風險，這批不宣稱效能瓶頸已確認。

### C02｜IME／外來同步 selection — R／P0 若重現
1. 名稱：組字與非同步更新。2. 影響：游標跳回或待保存輸入被覆蓋。3. 重現：快打中英、空白、composition、同步 snapshot、失敗重試與冷重開。4. 現況：main 已有 pending 保護、composition guard、schema 正規化比較；未重現新的同根 Bug。5. 參考：PM composition 與 transaction.selection/map。6. 最小方案：先補真實裝置矩陣，不停用空白／input rules；只有具體根因才改。7. 回歸：既有 note＋unifiedWorkspace failure/race tests 與真實 IME。8. 新依賴：否。9. 格式：不變。10. 優先：安全保留 P0 驗證，真實輸入法未驗收。

### P01｜完整分頁與跨頁內容 — F／Q／P2
1. 名稱：長段落／表格／雙欄缺少可靠分割。2. 影響：preview/PDF 不完全一致。3. 重現：一個超過三頁的段落／rowspan table／雙欄。4. 根因：目前頂層 greedy block pagination。5. 參考：CSS fragmentation／Paged.js chunker。6. 方案：先用共用測試文件比較三種輸出；保留未知雙欄順序、手動分頁調整保存決策。7. 回歸：逐頁文本、MediaBox／頁數、邊界截圖、字型與跨頁表頭。8. 新依賴：C 方案不需；Paged.js 原型另經評估。9. 格式：任何方案均不得永久 pageBreak。10. 優先：P2，中高風險設計原型，未安裝 Paged.js。

### S01｜舊分頁／附件／離線資料安全矩陣 — R／P1 持續
1. 名稱：相容與故障恢復驗收。2. 影響：一旦退化會遺失正式筆記或附件。3. 重現：paged Note、pageBreak、未知 metadata、離線輸入、quota／同步失敗、換帳號與備份復原。4. 現況：owner／CAS/outbox／binary lease 已存在；不能把靜態閱讀當正式帳號驗收。5. 參考：現有 repository tests，無需改用其他編輯器儲存。6. 方案：本批輸出只讀 DOM、儲存／附件模組零修改，跑既有整合回歸。7. 回歸：noteEditor、attachmentSync、unifiedWorkspace、workspaceSync；真實帳號另人工。8. 新依賴：否。9. 格式：不變。10. 優先：每批必跑保護線。

## 分頁方案比較與路線圖

| 方案 | 優點 | 限制／決策 | 本次採用 |
| --- | --- | --- | --- |
| A 原生 @media print／@page／break | 零依賴，瀏覽器處理一般文字和表格 fragmentation | 瀏覽器差異、固定 header/footer、rowspan／雙欄閱讀順序不能保證；不能宣稱 screen 頁數完全相同 | 保留；修正輸出範圍隔離與基本 break／圖片約束，異常明示 |
| B Paged.js | hooks、CSS paged media、可建立可見實體頁 | chunker 與 CSS 重寫／雙欄、表格、字型交互成本高；需鎖版和對照 prototype，不能直接套編輯器 | 不新增依賴，不宣稱已完成 Paged.js 原型比較 |
| C 獨立唯讀 DOM 測量 | 已有基礎，零 schema 改動，易保護 source | 頂層 greedy 不足以完整分割；需等待資源、警告不支持情形 | 第一批最低成本：資源就緒＋誠實警告＋print 隔離，不冒充完整分頁引擎 |

第一批：E01–E03 的重現／最小修正與 E04 防護，獨立 PR；先提交紅測試，修正後跑完整要求。第二批：M01 損失警告與 T01 表格不變條件測試，另開分支，不改共享格式。第三批：C01 長文基準，再選可證實改善的局部方案。第四批：P01 同一多頁 fixture 的 A/B/C 原型與截圖、PDF 對照，未決產品規則保留選項。每批保留實際結果、手動驗收與未完成清單。

## 鍵盤與預覽體驗另案（E05，UX／R，P2）

1. 問題：預覽目前只有 role=dialog，缺少 native modal 的 Escape／焦點圈與回復。2. 影響：鍵盤使用者可能 Tab 到背景內容。3. 重現計畫：開預覽持續 Tab／Shift+Tab／Escape，記錄 activeElement。4. 根因假設：portal div 沒有 focus management。5. 參考：Nexus 既有 ModalDialog 與 ARIA modal pattern。6. 最小方案：先做焦點回歸，再評估沿用 ModalDialog，避免影響 print portal 選擇器。7. 測試：開啟／關閉／列印失敗的焦點還原及手機鍵盤。8. 新依賴：否。9. 資料格式：不變。10. P2，與本批資源準備無關，不冒充已修。

## 驗證界線

目前盤點不等於每個 Bug 已完成瀏覽器重現。新的實際失敗／修正／CI 結果補於本文件和 HANDOFF。正式帳號、真實中文 IME、Safari、Android／iOS 及大型文件效能須人工／後續量測；不以 Chromium 或單一 PDF 檔頭通過取代上述驗收。


2026-10-24 初始證據：baseline reproduction commit `75534a6` 的 [CI 40071347820](https://github.com/changmonica02/Nexus/actions/runs/40071347820) 在延遲圖片前列印按鈕仍 enabled 的斷言失敗，確認 E01。資源完成／等待／失敗／超時／取消五項 helper 單元測試已在本機 Node 通過；最終整合結果待 CI 紀錄。

## 第一批實際交付與證據

程式／測試 `f697bd596fa1cb8614348b8a69f71e59104d3548` 的 [CI 40071963719](https://github.com/changmonica02/Nexus/actions/runs/40071963719) 通過：6 項匯出 helper＋27 項 workspaceSync 單元／契約；4 組實際 Chromium（noteExport、noteEditor、attachmentSync、unifiedWorkspace）；TypeScript、限定 ESLint（0 errors／0 warnings）、production build（含既有 map prebuild）。無刪除／略過回歸案例。

- 已修 E01；E02 提供誠實溢位／資源警告並維持來源，沒有實作完整長區塊拆分。E03 窄範圍 print 隔離以一張紙正好一 PDF 頁及直／橫 MediaBox 驗證；E04 以副本公式編輯卡移除／已確認 preview 可見驗證，不宣稱真實入口已發生公式資料遺失。
- 實際 fixture 包含延遲／失敗圖片、長篇中英混排、60-row table、rowspan／colspan、超高 pre、寬 columns、fold、math card 及 legacy break marker。檢查 source DOM 不變、尾端文字保留、warnings、不同方向 PDF 頁數／紙張框與儲存失敗重試；既有真實 EditorPane fixture 再驗證舊 JSON／pageBreak／metadata、公式／多欄／拖曳／history／合成 composition／重掛載。附件真實 IndexedDB 雙分頁、離線與帳號隔離回歸通過。
- CI 的 `note-export-evidence` artifact 留存 multi-page.png/pdf、preview.png、print.png、portrait.pdf、landscape.pdf，全部是合成資料。人工檢視日誌的 paper 預覽與 print 截圖：正文與頁首定位一致，screen 存在工具列遮蓋區，print 移除工具列並顯示頁尾；這不是自動逐像素相等或跨瀏覽器品質保證。
- 只在一般單紙 fixture 斷言 preview=PDF 一頁；多頁特殊區塊只確認產生多頁、來源／尾文仍在 DOM 且有警告，**沒有驗證每頁 PDF 的全部 glyph／文字或複雜表頭重複**。不能把本批說成所有表格／雙欄／長公式已達完整印刷排版。
- 仍未做：M01 損失警告／無損格式原型、T01 完整表格互動矩陣、C01 5000/10000-block 效能、E05 鍵盤 modal、P01 Paged.js 可執行原型及未決跨頁規則。沒有新增 runtime dependency、schema／同步／儲存／附件修改或 Migration。


## 原始文件：`docs/OFFICIAL-PRIVATE-CARD-MIGRATION.md`

# 官方私人卡片身份相容更新（2026-10-16）

> 2026-10-16 已唯讀核實正式 Nexus ledger：`20261016062703 official_private_card_identity`，與使用者回報一致；下方為操作／相容說明，不再代表此 SQL 待套用。本輪不重播。


SQL：`supabase/migrations/20261016030000_official_private_card_identity.sql`。**未套用正式環境，需另行授權**。

## 依賴及資料保護

先核對正式 ledger／schema 已具備 Study、字典、字典連結、Workspace、20261009 官方集及 20261015 私人文字編輯契約；不要按歷史檔名盲目重播。先備份 study_cards、links、states、events、downloads 及官方來源映射，記錄各表筆數。

目前來源受舊 immutable guard 保護，來源為 payload.dictionary_entry_id；增量 SQL 在同一交易只補 official_source_entry_id，不更動文字、時間、FSRS、事件或 ID。來源缺漏時整體失敗，不猜 ID。先建立來源唯一索引，再移除使用可變字典連結的舊唯一索引；索引衝突將整體回滾，不刪重複資料。

更新 guard 僅允許私人 Front／Back、目前連結、soft-delete 及既有技術 revision 欄位變更，來源、owner、card／deck／pack 保護保留。下載去重包含已刪卡；來源離開新版 manifest 後也不重建。舊客戶端漏送新身份時由已儲存身份補回。單卡操作與連結變更同交易，無效 Published Word 連結令卡片更新一併回滾。原 RLS 與操作 RPC 權限不放寬。

## 套用順序

1. 前端可先部署：capability 不存在／離線時維持舊文字編輯，不開放新連結與單卡刪除控制。
2. 取得獨立批准、備份後，核對來源缺漏、來源重複與新函式依賴，再只套用此 SQL。
3. 驗證 authenticated 的 official_private_card_capabilities.version=1，刷新 PostgREST schema cache；核對筆數、來源與原排程／事件一致。用明確指定測試卡驗證修改／解除、更新不重複與 owner 隔離。
4. 重新整理前端後才顯示完整官方私人編輯能力。不要為驗證重新匯入字典／重建官方集。

## 回滾

交易失敗會完整回滾，勿留下半套欄位／索引／函式。前端回退可直接停用新入口；SQL 向舊客戶端相容，不應回套舊 guard 或舊去重索引（使用者可能已解除／重連）。若必須回退 DB，需另案先保留來源及私人修改，逐筆比對／備份後另行批准；不可清除新來源身份或重置資料。隔離 PGlite 測試不等於正式 staging／真實帳號驗收。


## 原始文件：`docs/operations/ATTACHMENT-SYNC-CACHE.md`

# 附件同步快取 — Refs #84

2026-10-19：本機實作與隔離驗證；未部署、未寫正式資料庫、未下載正式 PDF。無新增 migration，沿用既有 `20261008_workspace_delete_protection.sql` 的 revision／CAS／tombstone 契約。

## 可比較量測

`tests/workspaceSync.test.cjs` 使用六份各 64 KiB 的合成 PDF payload，連續完整同步六次。舊路徑透過原 `select('*')` 分頁讀取；新路徑執行實際 metadata-first pull。統計附件 Base64 欄位 bytes，不含 metadata／JSON／HTTP headers，也不是壓縮後的 Supabase 計費數字。

| 情境 | 完整附件下載次數 | Base64 bytes |
| --- | ---: | ---: |
| 修復前，六次同步 | 36 | 3,145,824 |
| 修復後，首次＋五次後續同步 | 6 | 524,304 |
| 修復後，五次後續同步 | **0** | **0** |

此案例合計減少 83.33%；穩定版本的後續附件內容傳輸減少 100%。新裝置仍下載全部所需附件，更新一份僅重抓該份。舊無版本快取會保守驗證一次，不承諾升級後第一次就零下載。

## 驗證

2026-10-19 #85 後續回歸：已更新工作區 fixture 的字典摘要 RPC mock 及過時狀態 checkbox 定位，完整 unifiedWorkspace 四種寬度通過；下方舊失敗描述保留作先前測試紀錄。

- 32 項 Node／IndexedDB／PGlite：工作區27、學習同步3、帳號刪除與本機清理2，均通過。涵蓋首次、新裝置、未變更、單一更新、軟／永久刪除、離線重試、丟失回應、帳號切換、late response、pending edit、lease crash recovery、背景節流及備份／學習契約。帳號刪除 fixture 修正為其歷史 migration 的欄位，沒有更動正式 SQL。
- 真實 Edge 同源雙分頁／真實 IndexedDB：併發首次只下載1次，後續五輪0次，更新只下載1次；離線可讀、重連、不同帳號／登出不可讀，刪除後不可讀。僅本機 HTTP 合成資料。
- 工作區介面聚焦模式 `NEXUS_SYNC_ONLY=1`：以實際 NexusApp、模擬引擎驗證同帳號 TOKEN_REFRESHED 與字典導航不重建引擎；附件零下載另由實際引擎／雙分頁測試驗證。
- TypeScript 與 production build 通過；修改的 production 檔案 ESLint 0 errors／48 warnings。完整舊 unifiedWorkspace UI suite 在字典管理的舊「🔴 待審核」checkbox 等待逾時，不能宣稱整套 UI suite 通過；本次不擴大修改字典管理。
- 未執行真實 Supabase 跨裝置、Safari 或 production 負載測試；不將隔離測試當作正式上線驗收。

重跑：`node --test tests/workspaceSync.test.cjs tests/studySync.test.cjs tests/unifiedStudySync.test.cjs tests/studyStyleSync.test.cjs tests/accountDeletion.test.cjs`。瀏覽器設定 `BROWSER_EXECUTABLE` 為 Edge／Chromium，執行 `tests/attachmentSync.browser.test.cjs`；工作區 auth 聚焦測試另設 `NEXUS_SYNC_ONLY=1` 後執行 `tests/unifiedWorkspace.browser.test.cjs`。

## 發布與觀察

1. 正式發布前確認 binary 寫入仍走 `apply_workspace_operations` 並原子遞增附件 revision；不支援管理工具繞過 RPC 直接改 binary 而不更新 revision。既有 RLS／owner scope 不變。無需 SQL 更新，不重播 migration。
2. 部署後請已開啟的舊分頁重新載入；舊版程式仍可能完整下載。首次版本驗證會有一次必要流量，之後觀察 `binaries?select=id,owner_id,data` 完整內容請求，未變更使用情境應為0；`select=id,owner_id` metadata 請求仍屬正常。
3. 比較同一時段 Egress 每小時增量、完整內容請求次數／bytes、attachment 更新數、活躍裝置數；累積月用量不會因修復倒退。額外觀察下載逾時、同步錯誤、pending outbox 是否持續累積及快取修復次數。不要在 log 記錄 Base64、私人檔名或 token。
4. 人工以少量測試附件驗證兩裝置更新／刪除、切換帳號、斷線恢復與 Safari；不需大量下載真實 PDF。正式驗收留 #60。
5. 若需回復，回退前端 commit 即可；新可選 IDB 欄位不妨礙舊版讀取，無資料清除／DB rollback。回退會恢復原本高流量行為，應持續觀察。

## 字典次要優化評估（未實作）

`DictionaryBrowser` 的一般列表與 GroupPage 目前各對列表項目呼叫 `readPublishedEntry`，`flashcardLinks.searchCandidates` 也有同樣 N+1 模式。建議搜尋／分類 RPC 直接回傳已發布條目的 ID、headword、kind、排序後第一義項的詞性／釋義摘要與 inflection match；20 筆列表可由1＋20請求降為1請求。點開詳情或確認加入字卡時再抓完整 published detail，不能用摘要取代義項驗證／字卡內容。以 query、filter、page 及發布版本做快取／進行中請求合併，保留 published-only 與管理權限邊界。此項需要獨立 SQL／契約測試與發布安排，未併入附件修復。


## 原始文件：`docs/operations/DICTIONARY-CORE-CONCEPT.md`

# 核心概念與緊湊編輯器部署

Migration：supabase/migrations/20261017010000_dictionary_core_concept.sql。

## 資料契約

沿用 dictionary_learning_notes，不建立第二條字典寫入管線。現行 kind 固定 core_concept；舊 learning_decomposition／mnemonic_scenario 只留在交換相容轉換與不可變歷史。

同一 Entry＋Sense 的舊列依「口訣、記憶故事、各類 UUID」排序，以兩個換行完整串接，不 trim、不去除重複文字（原文可能有意重複）。不同 Sense 及 sense_id=null 分開。沿用第一列 ID，原始各列、source_id、revision、時間及函式定義保存至 dictionary_core_backup；合併後來源可由備份對照追溯。既有已是核心概念的多筆內容不任意再次壓成一筆。

遷移提升舊附屬列 revision；active Review 候選／baseline 轉換並增加 Review revision。raw_candidate、operation receipt、Audit、Published 歷史不改寫。常駐匯入工作有受影響內容時標記 stale，保留原始資料及其他決策後重新比對。

合併退場的 ID 記於 dictionary_core_aliases，只有管理員可 SELECT，app 無寫入權限；既有 guard 拒絕以舊 ID 再新增內容。此表不保存正文、不形成公開詞條，防止部分舊 JSON 重建重複內容。移除新的核心概念後，退場 ID 仍不可自動復活。

## 安全與回復

- 不停用任何 RLS／trigger／Published guard。使用版本化 schema 轉換，非管理員寫入、人工發布、CAS 及 Review 保護不變。
- 同一交易中加鎖、先備份，再合併、驗證剩餘內容及 10 組未涉及資料（Entry／Sense／歷史詞源／關聯／讀音／詞形／例詞／舊提示／metadata／Published history）指紋。非預期差異立即 rollback。
- migration_state 完成標記防止重跑串接文字；第二次執行會在變更前明確回報已完成並停止，不重做。
- commit 前失敗：整體回滾，隔離測試已實際驗證。commit 後若有問題，先保留當前輸入並停用舊版詞源寫入；用受限原始／遷移後影像核對，再作帶 revision 檢查的前向修復，不能盲目覆蓋後續工作。備份及 alias 不自動清除。
- 沒有重設 Entry／Sense、字卡連結、FSRS 或官方學習集。不將 relation_hint／source_forms 轉為核心概念。舊提示退出一般編輯／閱讀，但仍保留歷史及交換資料，不清空資料表。

## 正式順序

1. 核對實際 schema／ledger、guard 與 normalizer 的完整基準、目前筆數及安全 advisors。正式資料可能繼續增加，不寫死測試筆數。
2. 隔離 PostgreSQL／瀏覽器、typecheck／lint／build 與 PR Preview 通過後，協調前後端更新；短暫停止自己的字典編輯，備份未儲存輸入。
3. 套用本 SQL，再唯讀確認 core_concept 數量／原文／來源對照、10 組指紋、Review／匯入工作數量、RLS／ACL／alias 防重與 ledger。
4. 合併相應前端並確認 Vercel Production。舊分頁刷新、舊 Review 重載；舊工作重新比對。舊前端的舊 kind 寫入會明確失敗，不會直接覆蓋新格式。
5. CSV 新欄位 core_concept，舊 mnemonic_story 可讀；AI 新 core_concept，舊 story／learning_decomposition 僅讀取相容；JSON Bundle／Exchange 支援 core_concept 與舊格式轉換。過期 revision／合併退場 ID 必須重新匯出／比對，不繞過衝突保護。

## 驗證

隔離測試不是 Supabase staging，也不代表真實 Safari。自動化覆蓋合併順序、不同義項、重跑／回滾、來源、舊版本拒絕、人工發布、管理員 RLS、舊 ID 重建阻擋、交換相容，以及三種類型 × 桌面／平板／手機的操作與寬度。正式帳號／iPad Safari 驗收留 Issue #60。

## 正式狀態

已正式套用，ledger 20261017054409 dictionary_core_concept（PR #79）。52 筆原始列均保留在受限備份，正式 52 筆為 core_concept、舊類型為 0，與 merged_notes 逐列差異 0；當下沒有同 Entry＋Sense 雙類型組，因此正式沒有刪除合併列，alias=0。Entry 6,305／Sense 11,525／active Review 925／常駐工作 28 保留；12 份 Review 版本前進。10 組未涉及資料指紋驗證通過。alias RLS 為管理員 SELECT，app 無 INSERT／DELETE；備份／helper 無 app 權限。Security advisors 與前一致，沒有新增。\n\n前兩次 Connector requestState 過期後均先核實 ledger／schema 未改變，再改用可直接審查的靜態 SQL 提交成功；未重播已套用 Migration。重跑已完成 SQL 會先明確拒絕並回滾，不再串接文字。前端 Preview 已通過，合併／Production 部署以 PR #79 最終狀態為準。


## 原始文件：`docs/operations/DICTIONARY-ENTRY-DELETION.md`

# 整筆詞條刪除（2026-10-18）

Migration：`20261018010000_dictionary_entry_deletion.sql`。依賴現行 dictionary revision lifecycle／bulk exchange receipt／official packs。CLI在此環境嘗試建立migration時因唯讀使用者設定目錄失敗；SQL已版本化並以隔離資料庫驗證。

## 資料契約

- 僅新RPC `delete_dictionary_entry(uuid,bigint,jsonb,uuid)` 能處理單一已存在Draft／Published；前後端仍驗證管理員。既有Draft-only RPC不變，沒有開放一般角色直接DELETE。
- RPC在transaction內取得既有全域寫入鎖和Entry row lock，比較revision與完整snapshot。先檢查其他Entry的構詞、其他active Review candidate、舊複製Review、official manifest；有引用即拒絕，不重寫其他詞條、官方manifest或任意刪除引用。
- 私人卡僅刪除`study_card_dictionary_links`參照列；不更新／刪除`study_cards.payload`、state、event、official_source身份或同步進度。舊／離線卡payload可能仍保存原ID，公開讀取回null，詳情明示無可用公開內容且無管理員編輯操作，使用者可重新連結其他合法詞條。不將字典刪除冒充私人卡修改或學習事件。
- 專屬live children按相依順序刪除。保留Published歷史／Review所有列／Audit／既有備份；移除兩個history→live Entry的限制FK，保留非空stable Entry ID、PK、內容、管理員RLS與原grants。該ID在live Entry刪除後仍是歷史身份。active Review標為discarded並保留原candidate及base，避免誤恢復待發布內容。
- `DELETE_ENTRY`稽核是原ID退場標記；trigger防止舊匯入重新插入同ID。既有owner-scoped operation receipt提供相同request／operation重試；掉回覆後仍回原結果，其他request不得重用UUID。未知FK或receipt寫入失敗，連link unlink與Audit也完整回滾。

## 介面

既有主操作區紅色「刪除詞條」，明確名稱／種類／永久性確認；取消無寫入、busy防雙送。只在已儲存詞條顯示，包含Published的Review編輯；刪除用canonical Published身份而非Review revision。成功使字典快取失效，離開dirty保護只在確定成功後略過一次，返回管理頁`?deleted=1`顯示成功並重新查詢。失敗保留輸入，資料狀態不冒稱成功。

移除五項備份／草稿管理UI、差異formatter、專用構詞目標預載及reload handler；保留Review儲存／核准／CAS與必要多份Review選擇，避免默默覆蓋。dirty hook獨立於備份功能，仍可儲存／放棄／繼續。

## 上線／回復

1. 核對正式ledger、FK與RLS，保存原FK定義及相關表指紋；確認history仍只對管理員可讀。
2. 隔離SQL／UI測試通過後，先套用此增量SQL，再發布前端。不需重播舊migration，不執行正式測試詞條刪除。
3. Migration本身不刪／更新資料。核對前後內容指紋、RPC ACL／search_path／advisors及版本，再合併部署。
4. 回復可先撤銷新RPC authenticated執行權並回復前端，不刪歷史、receipt、Audit或退場ID保護。若已有歷史對應的live Entry被刪，不能為恢復FK而刪掉歷史／重新建立Entry；保留FK拆離即可。只有確認沒有孤立歷史ID時才可用新的版本化migration加回原FK。

管理員遇到其他構詞／Review／官方manifest阻擋時，須先透過相應管理流程處理引用；不得以停用FK、直接SQL級聯或批次刪私人卡替代。正式環境不由自動化測試替使用者刪除任何詞條。

## 正式驗證

2026-10-18透過migration工具成功套用，ledger `20261018103636 dictionary_entry_deletion`。首次connector requestState失效後先核對ledger/RPC皆不存在、兩個FK仍在，再重試成功，未繞過migration工具。16張相關字典／歷史／私人卡／state／event／官方manifest表內容及筆數指紋全相同；沒有正式詞條刪除。history RLS仍啟用、anon execute=false、authenticated需函式內admin驗權。Advisors 7 INFO及既有密碼保護提示不變，authenticated definer44→45為預期新刪除RPC。


## 原始文件：`docs/operations/DICTIONARY-RANKED-COMPONENTS.md`

# 字典閱讀／構詞搜尋與最小詞條（2026-10-17）

## 依賴與相容性

Migration：`20261017020000_dictionary_ranked_components.sql`，依賴已套用 core_concept、composition_shared、bulk_exchange／既有 receipts；不要依檔名重播歷史 SQL。Supabase CLI 在此環境寫入唯讀 `/home/agent/.supabase` 失敗，因此建立版本化 SQL 並以隔離 PostgreSQL 驗證。

- 不刪列、不更換 Entry/Sense ID、不修改既有內容、Published/Review/CAS、個人卡或 FSRS。新增 RPC、純正規化 helper、等價名稱唯一索引；沿用現有表格／RLS。
- 名稱 key：大小寫、前後空白／連字號（含常見 Unicode 連字號）正規化；內部連字號仍保留。索引按 Prefix／Root 類型分開；既有等價衝突使整個 transaction 失敗，不猜測合併。
- 最小 Sense 定義：中文義空白、詞性 null，僅 Prefix／Root；原 parent-kind trigger 禁止 Word null POS，CHECK 仍禁止 Word 空義。未增加隱藏的查證／待補完狀態。編輯補充內容仍走 Review→人工核准。
- JSON Bundle／完整 Exchange／AI 保留真實空白 Sense 及穩定 ID。舊 CSV 仍遵守其必填中文義／分類契約；最小詞條使用完整 JSON 交換，不能用不完整 CSV 冒充無損格式。

## RPC 與權限

`search_dictionary_relation_targets(text,integer)`：管理員限定，完整 Published 候選排序後才 LIMIT 20；名稱完全／前綴、變體完全／前綴、名稱包含、中文義／詞源／核心／例句／讀音／詞形／分類內容。相同級以長度、類型、字母、UUID 固定排序。不從過期 Review／退場提示取候選。6k 規模不採多語 tokenizer，保留現有 child entry_id 索引；不以客戶端 LIMIT 後重排。

`dictionary_admin_first_senses(uuid[])`：security invoker、管理員檢查、最多100個 Entry，以 lateral LIMIT 1 取得 UUID 升序首義項，避免 Data API row cap。新前端對尚未有 RPC 的舊資料庫可退回有界逐 Entry 讀取；一般瀏覽／單筆編輯不依賴新 RPC。

`quick_create_dictionary_component(uuid,text,text,boolean)`：管理員、明確人工確認、僅 Prefix／Root；鎖定 operation 及名稱，資料庫唯一索引同時保護一般編輯器。相同 Published 重用（多 Sense 仍由使用者選擇）；既有 Draft 明確阻擋，不擅自發布。新建→穩定空白 Sense→既有 publish RPC→歷史→既有 operation receipt，全部同 transaction；任何失敗完整回滾。相同 owner/operation 重試必須相同 request，回傳目前 Published 內容，不能以舊 receipt 誤報成功。

前端新建確認只發布新成分，不儲存或發布主詞條。取消不寫入，網路錯誤可同 operation 重試；已存在／自身／重複 Sense 不能被誤加。新增成功但無法選入時明示已建立／未加入，不宣稱整體成功。新 RPC 未部署則 RPC 明確報錯、保留輸入，不建立無效關聯。

## 發布順序與檢查

1. 讀取正式 ledger、constraint／RPC、正規化名稱衝突及資料指紋；儲存舊搜尋函式定義與 CHECK。
2. 隔離 PostgreSQL 測試排名／6,301筆／RLS／雙交易並行／冪等／最小詞條往返、Review補充及失敗回滾；非正式 Supabase staging／真實 iPad 驗收。
3. 透過 Supabase migration 工具套用 SQL（lock timeout 5s；statement timeout 90s），核對 ledger、權限／advisors、既有13表指紋未變，再合併前端。不得以 execute_sql 直接 DDL 繞過 migration。
4. 確認 Vercel Preview 與 main Production 的對應 commit。正式不替使用者新建或發布測試詞條；實機建立／發布由 #60 驗收。

## 回復

純前端可回復上一版。DB 變更無原資料改寫；可先停用新快速建立 UI、撤銷新 quick RPC 的 authenticated 執行權限，保留所有新建詞條、Sense、receipt、歷史。搜尋函式可還原部署前定義，新增 summary RPC 可保留給舊前端使用。

只有確認沒有空白義項時，才能還原原 `CHECK(length(btrim(gloss_zh_tw))>0)`；否則保留相容 CHECK，或由管理員逐筆補內容後再恢復。不得為回復而刪除合法最小詞條或填入捏造中文義。新唯一索引／helper 如需移除，先確認函式依賴；保留既有 kind+headword 唯一索引。回復也須版本化 migration，不修改已套用檔。

## 正式套用紀錄

2026-10-17 透過 migration 工具成功套用，ledger `20261017073742 dictionary_ranked_components`。部署前後13張表內容及筆數指紋完全相同；未建立／發布正式測試詞條。Entry6,305／Sense11,525／active Review925／常駐項目28保留。RPC ACL、CHECK、唯一索引已核對；advisors 7 INFO及既有密碼保護提示不變，authenticated definer43→44，新增quick RPC為必要且有管理員／確認防護的預期公開接口。前端 PR #80；真實帳號／iPad Safari 仍待 #60。


## 原始文件：`docs/operations/DICTIONARY-SOURCE-FORMS.md`

# 舊字形註釋退場操作

本輪使用者已授權具備完整驗證、資料保護與回復方案的正式變更。唯一新檔案是 `supabase/migrations/20261016050000_dictionary_retire_source_forms.sql`。不要重播已套用的 `official_private_card_identity`／`creation_template_library`，以正式 ledger 名稱與 schema 為準。

## 順序與安全邊界

1. 閱讀正式 RPC 簽名、種類／筆數、active Review／待審工作與 RLS／函式 ACL；不下載使用者內容至公開文件。
2. 用現有實際 migration stack 在隔離 PostgreSQL 驗證新 SQL、回復成功／拒絕覆寫、非管理員權限、發布確認、CAS、Stable ID 與結構化詞形保留。PGlite 是隔離 PostgreSQL，不是 Supabase staging／JWT／Safari 驗收。
3. 以原子交易先備份再清理，既有 dictionary advisory lock＋表鎖；5 秒 lock timeout、120 秒 statement timeout，失敗整筆 rollback。備份 schema 非 API exposed，PUBLIC／anon／authenticated 無存取權，沒有應用讀寫入口。
4. 活躍 Review 的 candidate／base_snapshot 僅剔除退場種類、revision 遞增；既有真實衝突不消失。受影響常駐匯入移除退場差異但保留其他決策，標 stale 強制重新比對；不重播 receipts／operation IDs。舊瀏覽器 pending 請求會由 CAS／CHECK 阻擋，必須保留原檔並重讀。
5. 比較遷移前後 13 組 live／history／receipt 的 row count＋逐列 hash 摘要；包括全部 Entry／Sense／inflections／relations／讀音／補充資料、Published 歷史、import receipts 及仍有效 relation_hint。任何非預期變更中止交易。
6. 正式執行成功後核對 ledger、舊種類=0、有效提示／Entry／Sense／Review／待審 ID 數、原函式 ACL；notify pgrst 由 SQL 發出。不進行正式儲存／發布測試，以免改變使用者內容；登入真實帳號測試由 #60 追蹤。
7. 資料庫先部署，再合併前端。舊前端可讀少了 source_forms 的內容；新版不再輸出該欄，舊 CSV／AI／JSON 檔明確報錯，需原檔備份並重新匯出／比對，絕不自動推導詞形。字典詳情 Modal／RPC 修復不需要新函式。

## 回復

`DICTIONARY-SOURCE-FORMS-ROLLBACK.sql` 使用非 API 的 `dictionary_retirement_backup`。若部署後任何既有 Review／import 已改變或刪除，整筆拒絕，避免覆寫後續工作；需操作員個別比對，不能強制移除 guard。無後續變更時還原資料與舊 CHECK、仍遞增 revision，避免舊請求復活。回復前端需回退到對應版本，備份表及 audit 不自動刪除。

備份僅供災難復原，不是隱藏產品欄位／變體替代功能。正式驗收後由操作員安排外部備份／保留期限及清除 schema；本輪不刪除不可變歷史、Audit、原始檔與舊本機工作。

實際部署結果與 ledger 版本看 HANDOFF；檔案存在、Preview 成功不代表正式 SQL 已套用。

## 本輪正式結果（2026-10-16）

ledger `20261016072304 dictionary_retire_source_forms` 已成功。舊種類 6199→0、13 組指紋檢查通過；Entry 6301、Sense 11518、inflections 7135、relation_hint 67、active Review 927、常駐工作 28 保留。回復副本 source_forms 6199／Review 927，PUBLIC／anon／authenticated 不可存取，一次性 cleaner 已移除。沒有重播先前兩份 SQL，沒有發布／匯入字典或改私人學習紀錄。

Security advisors 與變更前一致（無新增）：[7 個 RLS 無直接 policy INFO](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)、[43 個 authenticated SECURITY DEFINER 提醒](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)、[既有洩漏密碼保護未啟用](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)。不為消除通用提醒而解除現有 owner／admin RPC 契約或擅自改 Auth 設定。


## 原始文件：`docs/operations/DICTIONARY-SOURCE-FORMS-ROLLBACK.sql`

**歷史回滾 SQL，僅供審計；執行前必須重新驗證正式資料與授權。**

```sql
-- Operator-only rollback. Abort rather than overwrite work created after deployment.
-- Run in one transaction; never expose the backup schema to PostgREST.
begin;
select pg_advisory_xact_lock(710,1);
lock table public.dictionary_lexical_annotations,public.dictionary_review_drafts,public.dictionary_import_review_items in share row exclusive mode;
do $$begin
 if exists(select 1 from dictionary_retirement_backup.review_drafts_after b left join public.dictionary_review_drafts r using(id) where to_jsonb(r) is distinct from to_jsonb(b))
 or exists(select 1 from dictionary_retirement_backup.import_review_items_after b left join public.dictionary_import_review_items r using(id) where to_jsonb(r) is distinct from to_jsonb(b))
 or exists(select 1 from dictionary_retirement_backup.source_forms b join public.dictionary_lexical_annotations r using(id))
 then raise exception 'Post-retirement work exists; restore requires manual reconciliation, nothing changed';end if;
end$$;
alter table public.dictionary_lexical_annotations drop constraint dictionary_lexical_annotations_kind_check;
alter table public.dictionary_lexical_annotations add constraint dictionary_lexical_annotations_kind_check check(kind in ('source_forms','relation_hint'));
insert into public.dictionary_lexical_annotations select * from dictionary_retirement_backup.source_forms;
-- Revisions remain monotonic, invalidating both pre-migration and post-migration stale clients.
update public.dictionary_review_drafts r set candidate=b.candidate,base_snapshot=b.base_snapshot,revision=r.revision+1,updated_at=now()
 from dictionary_retirement_backup.review_drafts b where r.id=b.id;
update public.dictionary_import_review_items r set item=b.item,pending_count=b.pending_count,revision=r.revision+1,updated_at=now()
 from dictionary_retirement_backup.import_review_items b where r.id=b.id;
notify pgrst,'reload schema';
commit;
```


## 原始文件：`docs/operations/DICTIONARY-VERIFICATION-RETIREMENT.md`

# 字典內容審核狀態退場：操作與回復

## 範圍

移除每段內容的 verification，保留詞源與來源。這不會清空常駐匯入工作，也不會繞過 Review Draft、版本歷史、人工發布或權限檢查。

Migration：supabase/migrations/20261016060000_dictionary_retire_verification_state.sql。依賴既有 revision lifecycle、composition shared 及現行字典 Schema。正式執行前以 ledger／實際函式核對；不要依檔名排序重播已套用 Migration。

## 部署順序與相容性

1. 確認最新 main、前後端差異、測試及回復資料可用。唯讀取得當下 Entry／Sense／詞源／active Review／匯入工作數量；不要把歷史筆數寫成遷移前提。
2. 協調前端更新窗口；暫停自己的編輯操作。舊前端仍送 verification／verification_note 的詞源寫入會被新 SQL 明確拒絕，不會靜默丟資料。舊檔／本機 Session 不清除；先下載備份。
3. 套用單一增量 Migration。5 秒取鎖、120 秒 statement 上限；SQL 在同一交易內建立 private backup、移除欄位、遷移 active 工作、逐列檢查後才 commit，並通知 PostgREST schema reload。
4. 唯讀確認 public 無 verification 欄位、來源仍在、數量／Stable ID／內容比較通過、原 ACL／RLS 保留、備份無 app 存取。通過後發布相應前端，刷新舊分頁。
5. active Review revision 已變時重載；常駐工作僅移除已退場狀態欄位的差異，來源差異／選擇轉為 data_source，重算 pending_count；按「重新比對」後核對保留的決策，不重匯已成功項目。匯入工作、原始候選及操作憑證不刪除。

## 舊交換檔／本機作業

新匯出只含 data_source。舊檔仍含 verification／verification_note 時明確報錯，不能靜默捨棄來源。保留原檔，在副本移除 verification，將每個詞源 verification_note 的來源文字搬到 data_source；若兩欄同時有不同內容，先人工確認，不能覆蓋。Entry／Sense／附屬 ID 與版本不可更改。完成後重新預覽／比對，舊 baseline 不得強制套用。

資料庫中已完成歷史、Audit、operation receipt、raw_candidate 保留原樣，屬不可覆寫歷史而非現行內容狀態欄位。舊作業若缺可靠基準，保留原資料並重新比對，不猜測／重做已套用內容。

## 備份與回復界線

dictionary_verification_backup 保存受影響完整原始列、active Review／常駐工作遷移前後影像及被替換函式原定義。schema 不公開，PUBLIC／anon／authenticated 無存取權，勿改為前端可讀。

- commit 前任一錯誤：整個交易 rollback，欄位、來源、工作及函式恢復；隔離測試已實際驗證。
- commit 後：優先修復前端／RPC 映射，來源與內文仍完整；可由操作員唯讀備份核對來源及原狀態。不可把舊備份覆蓋到已產生新修改的 Review／工作，不可直接回退舊前端後繼續儲存。
- 如確需復原已退場欄位，另做經測試的前向修復 Migration，先核對遷移後影像與目前 revision／新增資料，再恢復 metadata；不得停用 RLS／Published guards／觸發器以便強制覆寫。本次不提供會覆蓋後續使用者工作的盲目還原 SQL。備份保留，不自動清除。

## 驗證證據

測試覆蓋實體欄位退場、來源／ID／內容保存、交易回滾、active Review CAS、人工發布、非管理員拒絕、private backup／cleaner 存取拒絕、常駐決策／operation／原始候選保留及舊私人字源表相容性。隔離 Chromium 覆蓋桌面／平板／手機尺寸；實際 iPad Safari 與正式帳號仍由使用者驗收（Issue #60）。

## 2026-10-16 正式執行結果

ledger 20261016150215 dictionary_retire_verification_state，一次套用成功。public verification 欄位 3→0；來源／關聯／詞源對 private backup 扣除目標欄位後逐列差異均為 0。Entry 6,304、Sense 11,524、詞源 68、active Review 925、常駐工作 28 保留，沒有遺失 Review／工作 ID。2 份 active Review 遷移並遞增版本，常駐工作沒有需修改的舊欄位（0 份）。RLS／3 個既有函式 ACL 與 definer 屬性維持原狀；app 無 backup schema／cleaner 權限。Security advisors 與套用前相同（7 INFO、43 既有 SECURITY DEFINER 提醒、1 既有密碼保護提醒），未新增問題。沒有字典內容匯入／發布、私人卡片或學習資料寫入。前端部署由 PR #78 追蹤。


## 原始文件：`docs/operations/WORKSPACE-COMPONENTS.md`

# 工作區元件整理（Refs #85）

## 變更

統一主／次窗格分派、PDF 預覽、原生對話框、選單位置及鍵盤操作、總覽框架與學習存檔提示。筆記成功提示改為實際本機寫入成功，失敗可重試；不同窗格及較新修改各自維持待寫狀態。

移除確認未接入的 creatableRegistry、useSidebarPreference、DailyStudySession 與 studyPractice。保留尚在 SPEC 的 inbox、quiz 歷史相容、deleteDrafts、world 分支及匯入 fallback，避免以「未被目前入口引用」推論資料或需求可刪除。

## 驗證

- Node 全套最終重跑 352／352 通過（0 失敗）；初次兩項舊原始碼定位斷言已修正，避免誤判 native confirm 的參數也已改名。
- TypeScript 與正式 build 通過；修改 production 檔案 ESLint 0 errors／37 warnings（包括選單 layout effect 設定 portal 的提示）。
- Edge 本機隔離測試通過：完整工作區四種寬度；儲存慢寫／失敗重試／較新修改／雙窗格；共用 dialog／menu／PDF 晚到回應；附件同源雙分頁；字典管理編輯發布；角色模板與模板更新；完整學習、偏好、FSRS／固定排程、英文流程。
- 測試使用合成 fixture 與本機 IndexedDB，未下載正式附件。附件前後流量對照見 `ATTACHMENT-SYNC-CACHE.md`。

## 發布與回復

無 SQL migration、RLS、資料清除或權限變更。部署後重載舊分頁；觀察本機儲存錯誤、同步錯誤、outbox 累積及未變更附件完整內容下載次數（應為 0）。真實帳號／跨裝置及 iPad Safari 驗收保留 #60。

如需回復，回退前端版本即可，不刪本機或雲端資料。若一併退回附件修復前版本，重複流量問題會恢復。
