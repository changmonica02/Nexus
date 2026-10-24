# Nexus — 當前交接（2026-10-21）

## 筆記審計與輸出第一批（Refs #105；PR #106，驗證中，未合併／部署）

- 最新基準 main `23450f9`；已核對自由筆記程式存在。下方 #87「本機未推送」屬歷史交接紀錄，不當作目前 main 的實作缺失或正式部署證據。
- 獨立分支 `feat/note-export-audit-20261024`。完整問題矩陣／開源 MIT 來源／A-B-C 分頁比較及後續路線圖見 docs/NOTE-EDITOR-AUDIT.md；本批僅修只讀匯出資源就緒、overflow 警告、math/fold 副本、print 工作區佔位及儲存失敗恢復，無新依賴／格式／儲存變更。
- Red reproduction：CI 40071347820 在尚未載入圖片前 print enabled 的斷言失敗。helper 五項本機測試通過；最新完整 CI 進行中，尚不宣稱整批完成。
- 未完成：長段落／rowspan 表格／長雙欄真正分割、手動匯出分頁調整是否保存、舊 paged Note 專用輸出無損過渡、Markdown 損失警告／無損方案、複雜表格矩陣、長文效能基準、Paged.js 可執行比較原型。不得當作本批完成或核准新規則。
- 人工保留：真實中文 IME、Safari／Android／iOS、正式帳號／跨裝置／大文件；合成 composition、隔離 Chromium 或 PGlite 不取代它們。


## 筆記本機整合（Refs #87；未推送／未部署）

- `backup/note-freeform-20261021` 與原 `feat/note-freeform` 均指向 `4edbe28`；`integrate/note-freeform` 自最新 `origin/main` `b1840cb` 依序 cherry-pick 四筆筆記更新。僅 `ARCHITECTURE`／`HISTORY` 的同位置新增段落需人工整合，兩方內容均保留；沒有修改本機 `main` 或遠端。
- 整合另含地圖核心 Vite PostCSS 隔離、非 Hook viewport 別名及地圖瀏覽器測試可選本機瀏覽器、處理多筆合法警告的定位；用於通過本機既有全專案 Lint／Build，不涉及地圖資料模型。TypeScript、全專案 ESLint（`--quiet`）、正式建置、筆記／附件／工作區瀏覽器、工作區同步 27 項與世界觀單元／IndexedDB／區域／語系／完整 Chromium 瀏覽器測試已通過，地圖頁面錯誤為零；未用正式帳號／附件。
- PR 前補驗：筆記瀏覽器新增快速英文與空白、連續刪改、合成 composition 事件後續輸入及重新掛載保存內容；工作區保存失敗／重試、較新寫入、雙窗隔離與遠端更新碰上待保存輸入均通過。桌面筆記側欄已固定，修正舊保存測試對浮動 dialog 的定位。真實中文輸入法、Safari／實機、正式帳號、長雙欄跨頁與舊 paged Note 無損過渡仍待人工驗收／後續實作，不以合成事件宣稱真實 IME 已驗收。

## V2-3（Refs #102；PR #103 已合併 main `b1840cb`；以下為交付紀錄，正式部署／實機驗收未在本輪核實）

- 基準 main `826926f`，分支 `feat/world-map-distributions-v23-20261021`。新增文化／宗教通用條目表單、自由類型／摘要／Tiptap、文化語言／習俗及多值 stable ID 引用；共用既有格網筆刷、候選／擦除／history／取消／確認，同一 cell 多文化及多宗教，跨國界不移轉疆界。
- 文化／宗教檢視以等權混色、個別顏色／透明度／顯示、選取高亮、全部 cell 分布查詢呈現；只動衍生 SVG。舊文明／自然／城鎮／政治資料及 native binary 不因文字或分布編輯重傳。單 Page CAS/outbox／重試／tombstone／owner 與備份同契約，無 migration。
- 程式／測試 `2ad6cf54c13de2ba99f555e5e0a70257c461656c` 的 [CI 39531024382](https://github.com/changmonica02/Nexus/actions/runs/39531024382) 通過：144 項單元／契約（36 repository、4 port、13 Adapter/fake-IDB、2 area、2 i18n、39 相關工作區／角色／study、48 native），核心及 Nexus TypeScript／production omit-dev build，相關 ESLint 0 errors／33 既有 warnings；兩組實際 Chromium（地圖／角色）成功，地圖 pageerror=[]。
- Chromium 新增：管理器文化與地圖宗教／文化、跨兩國的三文化三宗教重疊、政治 placements 及 native digest／附件不變、圖例顯示／透明度實際保存、完整 cell 查詢（含隱藏條目）、改名衍生顯示、文化圖仍能點選新增城鎮、擦除／逐筆 undo/redo／取消、取消新宗教零殘留、PNG/SVG 有分布且 native snapshot 無衍生圖層、備份／冷重開保留正文與樣式、zh-TW/en、390 寬不溢出、異網格拒絕編輯。原有完整自然／舊文明／城鎮／國家／離線／手勢及角色回歸保留。
- 指令：`npm run test:world-map`、`node --test tests/worldMapRegions.test.cjs`、`node --test tests/worldMap.i18n.test.cjs`、四個相關工作區／角色／study 測試、核心語系 `npx tsc`、`NODE_ENV=production NPM_CONFIG_OMIT=dev npm run build`、七檔原生 `npx vitest run`、相關 `npx eslint`、`node tests/worldMap.browser.test.cjs`／`node tests/characterBlocks.browser.test.cjs`；完整參數見 workflow。
- 合成負載：6710 packed cells 的同一測試地圖，既有六個分布上額外新增 50 個重疊文化；隔離 Page CAS 準備後重載／呈現及 12 個閒置 rAF 共 3455ms，平均 15.14ms／最大 16.70ms。這不是全圖高密度筆刷壓測或實機效能保證。
- 限制：自由 Polygon、球面／重投影、文明生成／傳播／人口統計不做；僅預留主要／次要／相對影響設定，未提供比例 UI。相關文化群體不是獨立族群條目，族群詳情可寫於正文。候選仍是記憶體草案，需確認保存；既有 Page 級衝突保留。真實帳號／Safari／手機實機／大型重疊仍需 #60 人工驗收。


## V2-2B（Refs #100；PR #101 已合併 main `826926f`；以下為交付紀錄）

- 最新基準 main `cc6ae3d` 已包含 PR #99；獨立 `feat/world-map-regions-v22b-20261021`，不修改 #99 原分支或 main。
- 實作：既有正式 WorldEntity 新增國家／行政區 UI、自訂類型、首都／行政中心／文化／宗教／parent 引用；同世界觀／型別／單值／循環檢查。既有 point 不變，新增 mesh 指紋的 cells 區域；繪製候選、加／減筆刷、逐筆 undo/redo、取消、確認、二次確認移轉國家重疊；admin／town 幾何與正式隸屬不一致顯示警告而非改寫正文。面積由陸地 cell polygon 衍生，未知／世界尺度不報 km²，可信地區只報平面估算。
- 交易／同步／備份：沿用單世界觀 Page CAS/outbox，區域與新條目同交易；穩定 ID／相同重試去重、tombstone、防跨世界觀引用；metadata 編輯不重傳原生附件。新區域不寫原生 states/provinces，不重算地理。PNG/SVG 已確認 overlay 與完整工作區備份沿用，原生 .map 仍不含 Nexus 正式條目／配置。
- **驗證成功**：程式／測試 `e9b4ed57edde493dd237fe2a3f94dbccdb67095c`；[CI 39523479994](https://github.com/changmonica02/Nexus/actions/runs/39523479994)。140 項單元／契約（33 repo、4 port、12 real Adapter＋fake-IDB、2 polygon/area、2 i18n、39 workspace／character／study、48 native）；核心／Nexus TypeScript、production/omit=dev build；相關 ESLint 0 errors／33 warnings。兩組實際 Chromium（地圖／角色）通過，地圖 pageerror=[]。
- Chromium 新增覆蓋：管理器正式國家／行政區、首都／parent／行政中心、自訂政體與 Tiptap 正文、地圖新增取消零殘留、既有國家放置、連續筆畫一筆 undo／redo、飛地、已校準地區 km²、未確認零持久化、失敗保留候選重試、地圖直接新增正式國家＋確認移轉重疊、正文／native digest／附件不變、改名、取消編輯保留原幾何、admin 越界警告、世界 scope 無假 km²、真實 IDB 備份還原／cold reopen 指紋一致、390 寬手機單指繪製與離線確認保存、移除行政區配置但保留正式條目。既有全部自然筆刷／水文／生態／舊文明／point／.map／PNG／SVG／草稿／離線／fit／CDP 觸控／全螢幕／角色回歸保留，沒有刪除或略過案例。fixture 移除覆蓋正式 modal max-height 的舊樣式，使用正式可捲動版面。
- **命令**：`npm run test:world-map`、`node --test tests/worldMapRegions.test.cjs`、`node --test tests/worldMap.i18n.test.cjs`、相關 workspace／character／study 四檔 `node --test`；共享語系 `npx tsc`、`npm run build`、核心七檔 `npx vitest run`、限定檔案 `npx eslint`、`node tests/worldMap.browser.test.cjs`、`node tests/characterBlocks.browser.test.cjs`。完整參數見 `.github/workflows/world-map.yml`。SPEC 已隨功能提交更新，最後提交僅更新技術文件，沒有修改程式。
- 限制：cell 精度而非自由 Polygon；無球面面積／網格重投影／爭議覆蓋 UI、文明自動生成或拓撲重建。未確認候選只有記憶體＋離開防護，確認後才正式保存。Page 級同步不自動合併兩裝置疆界；真實帳號／重新登入／Safari／手機實機／大型圖仍留 #60。


## 地圖 V2-2A（Refs #98；PR #99；已合併 main `cc6ae3d`，以下為交付紀錄）

- main `65653d0` 已包含 PR #97；本次獨立分支 `feat/world-map-entities-v22a-20261020`，沒有覆蓋其他分支／main，沒有正式 DB 操作。
- 已接上：原世界觀 Page 的可選正式城鎮集合、點配置引用、單 Page CAS／outbox 原子新增與穩定 ID 重試；世界觀列表／未配置建立／Tiptap 基本編輯／選圖放置；地圖新增／既有放置／標記資訊／改名衍生更新／移動／移除。地圖刪除不刪條目；地圖與世界觀複製分別重建必要 IDs；備份驗證引用，原生保存不夾帶正式正文／標記投影。
- **驗證通過**：程式／測試 `d29d5e570272c7b273d14dc2358fe25133e16db8`；[CI 39437559252](https://github.com/changmonica02/Nexus/actions/runs/39437559252)。133 項單元／契約（29 repo、4 port、11 fake-IDB、2 i18n、39 workspace／character／study、48 native）；核心／Nexus TypeScript、production/omit=dev build、限定檔案 ESLint 0 errors／32 warnings。地圖與角色兩組實際 Chromium 成功，地圖 pageerror=[]。新流程包含：地圖取消不留條目、實際交易失敗重試零殘留、Tiptap 正文保存、兩入口新增／改名、未配置→選圖放置、移動正文不變、移除保留條目、兩張原生地圖引用同 entityId、真實 IDB 備份／cold reload／SHA／owner 拒絕、SVG 正式標籤與 native snapshot 不含投影、390/820/1440 表單與 zh-TW/en。沿用整組自然編輯、舊文明、.map／PNG／SVG、失敗草稿、離線、fit／縮放／平移／CDP 觸控／全螢幕及角色回歸。
- **指令**：`npm run test:world-map`；`node --test tests/worldMap.i18n.test.cjs`；`node --test tests/workspaceSync.test.cjs tests/characterWorkspace.test.cjs tests/characterBlocks.test.cjs tests/studySync.test.cjs`；語系 `npx tsc`、`npm run build`；固定核心七檔 `npx vitest run`、限定檔案 `npx eslint`，以及 `node tests/worldMap.browser.test.cjs`／`node tests/characterBlocks.browser.test.cjs`。完整參數見 `.github/workflows/world-map.yml`。最後只更新四份文件，不再修改程式。
- 未實作：國家／行政區／文化／宗教等完整 UI、線／區域配置、樣式編輯 UI、舊 burgs 自動連結、人口經濟模擬與 V2-1 拓撲重建；不擴大本批。後續 V2-2 可沿用 entityId／relations 與獨立 geometry，而不是將 pack 陣列索引或名稱當正式 ID。
- 保留事項：原生 .map 匯出只含地圖，正式條目／配置須工作區備份。現有 Page 級同步衝突不會自動合併兩裝置的 entity 修改；使用既有衝突／重試機制，不假報雲端成功。真實帳號跨裝置同步失敗／重登入、iOS／Android／Safari 與大型圖效能仍留 #60，禁止視為已驗收。


## 地圖 V2-0／V2-1 首批（Refs #96；PR #97）

- 分支 `feat/world-map-natural-v2-20261020` 承接 PR #95 `60728b8` 的完整瀏覽 UX，安全帶入 main `6cdf489` 的 V2 SPEC。開發當時未修改 #95 原分支或 main；PR #97 現已合併 main `65653d0`，以下保留首批交付驗證紀錄。
- **V2-0 已完成盤點；V2-1 部分完成、可獨立驗收**：37 個來源（14 程序／23 預製 PNG）、確認前隔離 preview／取消零持久化、自然-only pipeline、名稱／seed／畫布／格網／收合氣候／選填尺度、原生工具分群、相對高度等高線與氣溫／降水／生態等 2D view／overlay、保留舊文明顯示、手繪資料優先及 stale 標記。沒有建立隨機文明或紀元；原文明 generators 未刪。
- **已實作的安全限制**：Keep 高度編輯可抬升／降低／平滑及 undo/redo，鎖定海陸分類；海岸／湖泊保留原有屬性及樣式編輯，但海陸拓撲重建未完成。氣候明確套用只算溫度／降水，不重建手繪河流或生態；生態屬性修改不自動重算人口。安全局部重算、人工物件鎖定、完整再生成（含備份／候選／二次確認／rollback）**尚未完成，維持阻擋**。特殊區域僅沿用 zones 擴充入口，不做奇幻模擬。3D／地球主入口與語音設定／輪詢退場，共享 D3 氣候預覽及 legacy dependencies 保留。
- **相容**：原生專案新增可選 `options.map.nexus.version=1` 狀態，不遷移或刪除舊附件；舊檔缺欄位照常載入。metadata_version／map IDs／owner／world／CAS／immutable SHA、備份 v3、10 秒 local recovery／60 秒 canonical／同步及離線公開工具快取沿用。詳細圖專案及既有 parent/scope 同一原子 create commit；無 DB／IDB schema／RPC／RLS／付費服務變動。新內容不承諾舊核心降版或原版 .map 對外互通。
- **驗證**：程式 `b53ec81` 的 [CI 39420685227](https://github.com/changmonica02/Nexus/actions/runs/39420685227) 成功。126 項單元／契約回歸（37 Repository／port／真實 Adapter + fake-IDB、2 i18n、39 workspace／character／study、48 native pipeline／source／contour／command／zoom）；核心與 Nexus TypeScript、production/omit=dev build 成功；相關 ESLint 0 errors／29 warnings。兩組實際 Chromium（地圖、角色）成功；地圖 pageerror=[]。包含全部 37 來源 preview／取消零持久化、390/820/1440 建立 UI 及 zh-TW/en、自然無文明／無紀元、真實 IndexedDB 備份匯入還原與損壞／跨帳號拒絕、cold reload 後內容一致、實際高度 raise／undo／redo、河流編輯、生態拖曳、氣候保留人工水文／生態、8 views 的資料 digest 不變／等高線路徑、自然 PNG/SVG 不改資料、已校準預製詳細圖、舊文明／.map 往返、草稿失敗復原、離線修改重開、多圖／刪除還原，以及既有 fit／CDP 觸控／全螢幕／手機回歸。這是隔離帳號及 Chromium，不等於正式帳號或實機。執行指令以 `.github/workflows/world-map.yml` 為準：`npm run test:world-map`、i18n／workspace 等 `node --test`、`npm run build`、核心 `npx vitest run` 七檔、限定檔案 `npx eslint`、`node tests/worldMap.browser.test.cjs` 與 `node tests/characterBlocks.browser.test.cjs`。最後僅文件提交，未再改程式。
- **資源樣本**：該次實測完整公開核心 22,744,317 bytes；9,954 grid／5,743 packed cells 的自然專案 1,040,640 bytes；Chromium heap 單次 sample 47,400,000 bytes。 只是約 10k grid 的隔離 Chromium 單次 sample，不是 heap 峰值／手機上限或雲端成本驗收。建立視窗暫時載入第二個隔離核心，關閉即釋放；preview 最多 5k cells。
- **人工／後續**：真實帳號跨裝置、雲端重登入／失敗、Safari／實機觸控與大型圖資源仍留 #60；未驗收不得視為已完成。V2-2 先確立 WorldEntity stable ID／正文正式來源，再用可選 placement adapter 關聯，禁止名稱連結或同步時重畫地理。本批不做 V2-2–V2-5。完整依賴、資料流與未完成限制見 ARCHITECTURE 的 #96 段。



## 世界觀地圖瀏覽器 UX（Refs #94；PR #95）

本輪基準 main `d5d9b04`，確認沒有其他未合併地圖 PR；既有 PR #91／#93 已合併，該 main 的 GitHub Vercel 狀態為部署成功，正式帳號／實機未驗收仍留 #60。本輪分支 `feat/world-map-browser-ux-20261020`、PR #95 尚未合併／正式部署。

已實作預設精簡瀏覽、手機底部／桌機右側管理面板、每圖更多操作、詳細圖建立／關聯與原軟刪除復原。預覽等比 contain fit、fit floor、切圖重新適配回頁首、圖層／語系／同步更新不重設、獨立 preview camera 支援編輯往返。浮動工具含全螢幕／重設／扳手，手機不常駐加減，預覽依實際 viewport／導覽位置計算高度，留白沿用 Nexus 主題、工具避開比例尺。

一般預覽單指捲世界觀頁、原 D3 雙指縮放／平移；全螢幕單指拖圖並鎖定底頁，原生 API 不可用時用既有固定版面 fallback。雙擊與桌機滾輪／拖曳保留。本機狀態簡短顯示，雲端按實際 error／syncing／offline／pending／connected 呈現，不以 idle 或連線假報同步成功。既有資料、storage／owner／revision、原生專案／PNG／SVG、草稿／離線／備份與授權保留，無 schema、正式 DB 或依賴變更。

驗證：程式 `b1d9ce3`；[CI 39405736933](https://github.com/changmonica02/Nexus/actions/runs/39405736933) 全成功。37 項地圖／IDB／port／i18n、39 項相關回歸、36 項原生指令／鏡頭／fit（共 112）、地圖與角色兩組實際 Chromium 通過；含首次／切圖整圖、1600×400／400×1600 原生生成地圖、雙指放大縮小／平移、單指捲頁、原生全螢幕單指與 fallback／Escape／body 鎖定、手動視圖與同步／語系／長標題更新、管理／刪除還原／詳細圖建立與關聯、.map／PNG／SVG、離線與失敗草稿復原。390×844、820×1180、1440×1000 無水平溢出，手機工具未被可視高度裁切，兩張手機實際截圖已檢視。核心／Nexus／語系 adapter TypeScript、production build 通過；相關 lint 0 errors／28 warnings，瀏覽器 pageerror=[]。其後只更新技術文件。

仍需人工驗收：真實 Safari／iOS／Android、平板橫直向與瀏覽器工具列／安全區、正式帳號跨裝置同步失敗／重新登入、大型地圖效能／容量。Chromium CDP 觸控、實際核心與隔離 IDB 測試不是上述正式裝置驗收。舊核心未收錄動態文字仍英文 fallback；本輪新增文字皆共用 Nexus i18n，使用者名稱與專案文字不翻譯。

## 已交付基準：地圖首頁與原版 UI 清理（Refs #90、#92）

PR #91／#93 已合併至 main，交付及部署證據見 #60；首頁地圖優先／共享核心、scope／parent 可選欄位與首次 i18n、原版 About／Tour／Desktop／宣傳及重複 I/O 入口清理已納入本輪基準。原 [CI 39390319230](https://github.com/changmonica02/Nexus/actions/runs/39390319230) 的 97 項測試及地圖／角色 Chromium 通過；必要授權與第三方 notices 保留。本輪 UX 取代該版首頁排列，沿用其資料保護流程。

## 2026-10-20 世界觀地圖編輯器（Refs #88；已合併／隔離驗證，正式帳號驗收見 #60）

- **正式整合（PR #89）**：使用者已授權安全檢查後合併及一般正式部署；實際合併／部署證據以 PR #89 與 #60 為準。Preview 22b8696 的 TS2688 原因為 production 安裝環境省略 fork 的 devDependencies；核心 npm ci 改為明確 --include=dev，安裝快取標記升版避免沿用不完整依賴。CI build 使用 NODE_ENV=production／NPM_CONFIG_OMIT=dev 重現環境並驗證。此修正不變更資料契約或正式 DB。
- 分支 `feat/world-map-storage-20261020`，依最新 SPEC `64c8e0e`；本輪程式 `43246e4`。固定 Azgaar v1.154.2/b4a0dcb 原始碼已保存於 vendor/azgaar，可自主修改，不依賴第三方線上編輯網站、不追蹤上游升級；Nexus metadata_version 與 engine_version 分開。
- **M1／M2 已接線**：世界觀「地圖」區、多圖新增／命名／開啟／複製／刪除還原、完整隔離核心、本機保存及關閉重開、原生 .map 匯入／匯出、SVG／PNG；保留原主要圖層／工具及 Quick Load。核心、世界觀 UI、Repository／同步保持分離；沒有新增 schema、RPC、RLS、付費服務或正式資料操作。
- **M3 隔離驗證通過，正式／裝置驗收未完成**：10 秒本機 recovery checkpoint 不進 outbox；60 秒／明確保存才提交 canonical 專案；owner／revision／SHA、失敗保留、舊草稿衝突與 token 清除保護。公開工具快取支援已開工作區內離線重開；備份包含 canonical／recovery，按帳號匯出，跨帳號匯入拒絕且不清其他帳號 cache。工作區 flush／備份先保存開啟中的地圖，不另重送 binary。
- **自動化**：[CI 39371050349](https://github.com/changmonica02/Nexus/actions/runs/39371050349) 成功，20+4+10 項地圖／IDB／port 測試、39 項既有相關回歸，上游核心 tsc/Vite、Nexus TypeScript/build 通過；ESLint 0 errors／3 refs warnings。實際 fork + 世界觀元件的 Chromium 完整流程通過，含原生城鎮編輯、保存／Quick Load、失敗後 reload 草稿復原、離線修改／重開、完整專案往返後編輯、PNG/SVG、native 無效匯入不覆寫、多圖／複製／刪除還原；pageerror=0。這是隔離介面，不是正式帳號或實機。
- **主要檔案**：vendor/azgaar、integrations/azgaar、scripts/prepare-world-map.mjs／build-world-map.mjs、WorldMapManager／WorldMapEditor、coreClient／offlineCore／WorldMapRepository、NexusApp／CharacterProfileView、StorageAdapter 實作／WorkspacePersistence／types、地圖測試及分支限定 CI。Node >=24；npm run dev/build 會先從本地 fork 產生工具。生成產物忽略，不提交；首次 import 腳本遇到未標記非空 fork 會拒絕覆寫。Windows npm.cmd launcher 已處理，Windows 實機未驗證。
- **保留事項／#60**：正式同帳號跨裝置與真實同步失敗／重登入、Safari／平板／手機、Windows、大型地圖 heap／容量／雲端成本仍需驗收。既有 immutable 舊專案附件保守保留，未實作安全 GC；首版只接受固定 1.154.2 原生版本，不自動轉換其他版本。外部 Watabou／雲端助手受 sandbox 限制；未快取外部字型離線可能 fallback，離線圖片輸出未獨立驗證。未新增整個 Nexus app shell 的離線啟動。地標連結 M4 不做；#88 已交付，人工驗收集中 #60。原始功能交付時尚未合併／部署；本次整合結果見 PR #89／#60。未操作正式 DB。

產品看SPEC、技術看ARCHITECTURE、歷史最新置頂；真實裝置驗收集中#60。

## 筆記改版進度（#87，原 feat/note-freeform；整合分支見上方）

- 第一批已提交 `231e159`：P0 同步快照覆蓋 pending 修復；Note 連續編輯、保留舊分頁資料；新建不分模式；標題靠左、逐篇全寬及 metadata 保留；公式跳脫／空內容刪除／獨立 undo。
- 第二批本機：六點把手操作／Shift 多選／斜線指令；局部雙欄可建立、調寬、移入另一欄或移出；新增嵌套摺疊；桌面側欄記住開合與寬度；流動 Note 匯出使用唯讀 DOM 副本與 A4 分頁預覽，可調方向、邊界、頁首頁尾及頁碼。匯出時展開副本內摺疊，原筆記收合狀態不變。舊 paged Note 暫沿用既有匯出流程，未清除舊 pageBreak。
- 第三批本機：把手拖曳支援左右欄間移動，以及一般頂層區塊移入既有欄位；兩者皆保留原節點與復原。修正欄位分隔線遮擋把手點擊。
- 第四批本機：把手拖至另一頂層區塊右側中段可直接建立局部雙欄，附有效落點提示；上／下邊緣仍維持排序。正反來源順序與 undo 已由筆記瀏覽器 fixture 驗證；TypeScript、正式建置與四尺寸工作區整合亦通過。未用正式帳號／附件測試。
- 第三批驗證：筆記 fixture 桌面／手機、工作區四尺寸整合、TypeScript 與正式建置通過；未使用正式帳號或附件。首次建置在 sandbox 內無法建立 Turbopack CSS worker，於本機重跑成功。
- 本機筆記瀏覽器 fixture 1440／390 寬通過，涵蓋把手排序／復原、Shift 多選與刪除／復原、類型轉換、雙欄移入／移出、摺疊與 PDF 產生；完整工作區四種尺寸整合及同步 27 項回歸通過，含桌面側欄調寬與記憶。TypeScript、production build 通過。未執行正式帳號／實機 Safari 驗收。
- 仍待完成：所有類型轉換與附件內容的匯出回歸、長雙欄跨頁／超寬內容的預覽與 PDF 一致性、預覽手動分頁調整，以及舊 paged Note 無損過渡。跨頁順序／縮放／分頁保存依 SPEC 待決，不自行定案。
- 筆記改版尚未推送／PR／合併／部署，不執行 migration。#87 保持開啟，以下仍有待完成項目。

## 2026-10-19 最新交付準備（Refs #84、#85）

- `refactor/workspace-components` 包含附件修復與共用元件整理；使用者已明確授權測試通過後上傳／合併 main（可能觸發 Vercel）。本段記錄提交前狀態，合併及部署結果以 PR／Vercel 記錄為準。
- 統一窗格、PDF 預覽、dialog、menu、總覽與學習存檔提示；真實每頁本機寫入狀態取代假成功計時器。無 migration／RLS／資料刪除。
- 八組隔離瀏覽器驗證通過，包含完整工作區與學習流程、雙窗格延遲寫入／失敗重試、雙分頁附件。TypeScript／build 通過，修改 production 檔 ESLint 0 errors／37 warnings。詳見 `operations/WORKSPACE-COMPONENTS.md`。
- 下方 #84 舊 UI 測試阻塞已由 #85 更新 fixture 與舊 checkbox 斷言解決。#82 已透過 PR #83 合併；下方未部署文字為先前交接狀態，不作最新部署證據。
- 字典列表 N+1 僅評估，未混入本輪；真實帳號／Safari／跨裝置仍留 #60。

## 本輪：附件零重複下載（Refs #84）

- `fix/attachment-sync-cache`：版本 metadata-first、owner 快取、跨分頁租約、同帳號 auth reuse、同分頁同步合併與背景節流；未變更附件後續完整下載0次。無 migration／RLS 調整／正式資料操作，尚未合併或部署。
- 六份合成64KiB附件、六輪同步：36次／3,145,824 Base64 bytes → 6次／524,304 bytes；後五輪0次／0 bytes。舊版無版本快取先重驗一次。
- 32項核心回歸、TypeScript、build通過；Edge真實雙分頁通過。完整舊工作區UI suite在字典管理過時checkbox逾時，不列為通過。測試範圍與發布監控見 `operations/ATTACHMENT-SYNC-CACHE.md`。
- 字典N+1摘要RPC僅完成評估，未實作；正式帳號／Safari／跨裝置驗收留#60。

## 本輪：字典詳情連續閱讀（Refs #82）

- 本機分支 `fix/dictionary-detail-reading` 已完成段落展開、移除細卡片／共用標籤，管理員編輯按鈕移至固定頂部關閉旁。所有既有內容、適用義項與資料寫入流程保留。
- 自動化：21 項字典回歸、TypeScript、production build 通過；修改元件 ESLint 0 errors／3 項既有 warnings。
- 隔離介面：Edge Chromium 1280／820／390 寬、管理員／一般使用者／官方卡／未連結卡通過；涵蓋段落無框、預設展開、按鈕位置、無水平溢出、編輯／發布／關閉及私人卡／Session 不變。測試服務為本機 fixture，並非正式帳號操作。
- 未部署、無 migration；真實帳號與 iPad Safari 人工驗收仍待 #60。

## 本輪：整筆詞條刪除與編輯器精簡

- 已完成既有Word／Prefix／Root紅色刪除按鈕、永久性確認、busy／snapshot-CAS／重試收據、成功返回刷新、取消／失敗保留輸入。Published用canonical身份，新增未儲存不顯示。
- 其他構詞／他筆active或legacy Review／官方manifest引用時阻擋，管理員先處理相依；不刪其他Entry或私人字卡。私人卡只移除join連結，payload／FSRS／events不變。歷史／Review／Audit／既有備份保留，原ID禁止復活。
- 五個備份／差異／草稿捨棄／版本重載UI及專屬formatter／預載／handler已移除；共用匯入匯出、儲存、Review／人工發布／CAS及dirty離開提醒保留。
- SQL `20261018010000_dictionary_entry_deletion.sql` **正式已套用**（ledger`20261018103636`）。16表指紋相同；Entry6306／Sense11527／私人卡10155／學習事件82／常駐項目28保留，未執行正式詞條刪除。RLS不變，anon不可執行；新RPC為預期新增1項definer提示。
- 測試：字典136、聚焦3（PGlite及獨立PostgreSQL各自通過，有重疊）、學習／同步／官方31、五組隔離瀏覽器、TypeScript／Build通過；Lint0errors／456既有warnings。交付PR #81；合併／Vercel以該PR交付記錄核對；真實iPad Safari仍由#60驗收。
- 回復／部署與引用阻擋處理見operations/DICTIONARY-ENTRY-DELETION.md；不得為恢復FK刪歷史或重建已刪Entry。

## 既有保留事項

核心概念、ranking/minimal components、官方私人卡身份及創作模板SQL均已核實套用，不重播歷史SQL。字典既有常駐28項、本機匯入原檔／Session及私人學習保持原契約；不重匯、不批次發布。隔離PostgreSQL／Chromium不等同Supabase staging／真實Safari驗收。







