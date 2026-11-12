# Nexus — A／B／C／D 接續實作（2026-11-12）

追蹤 #167；main 基準 `350882c`，Draft #168／#169／#170／#171。本輪未操作正式資料、Migration、合併或部署，HISTORY 未改。

- #171 已接入完整構詞編輯、形式改類、義項分類／變體／概述／詞源、反向單字連結及四行共用導覽、搜尋與分類分頁；沿用既有 Review／CAS／JSON／公開快取。新增 Migration `20261112012042_dictionary_morpheme_senses.sql`，只建立契約，不自動轉換或發布。
- 舊資料安全：缺省／null 新欄位兼容，明確 [] 保持清除；舊完整儲存不抹除新版變體，真正內容／版本衝突仍拒絕。完整交換與 AI JSON 保留新欄位、既有 ID、舊分類／原文。舊匯出工作 fingerprint 不因新增 null 假失效。
- 最新正式唯讀核對：24張字典／審核／官方表、5張學習依賴、85個函式與備份一致。entries6,347／morphemes184／morpheme senses250；10個構詞 active Review 保留。學習卡10,155、狀態10,155、事件2,567、設定15。本次數字只作核對基準，正式前重查。
- 完整私人備份29表72,281列及 SHA256／逐主鍵雜湊／還原已驗證，不在 Git 或外部分享，非完整 Supabase／Auth 備份。最終 D Migration 在原生 PostgreSQL 的完整副本重驗：174份待整理 Review、10份既有 Review保留、54筆可歸屬變體列、1組歸屬不明原文保留；全部原始列未變，重送結果一致、無重複 Review／收據，非管理員拒絕。
- 已通過：D PGlite 八項 Migration／RPC／相容／回滾測試；Chromium／WebKit 真實 SQL 編輯、保存、重開、排序／刪除精確變體、Word雙向草稿連結，1280／820／390／320與中英文；完整匯出 bulk UI、分頁、發布／恢復刷新及共用 workspace 瀏覽器回歸。19項 editor UI、9項 AI JSON 回歸通過。TypeScript、ESLint（0 errors，23 warnings）、Production Build、原生 PostgreSQL八項測試通過；最終新 HEAD CI仍待重驗。原生回滾測試修正測試注入函式的跨連線生命週期，沒有改動正式驗證或提高逾時。
- C `cca0555` 修正實際 CI bulk 測試仍期待原始 SQL 錯誤；保留草稿、失敗重試檢查，不略過測試。a 仍因 gsat-1-2／gsat-all 正式引用被正確阻擋，不能解除保護。A 90f467b、B 7f4141f、D舊c53193b的 Actions／Vercel已核對成功，新D提交仍須重驗。
- 整合 Draft #172 已建立；A／B／C／D 共用元件與六個CI工作已合併，整合 TypeScript、Production Build、ESLint（0 errors／25 warnings）、19項editor UI、7項reader/admin、3項身分、六組學習Session／隱藏／清除／同步回歸與真實SQL刪除（含suffix）通過。B→C→D依序在完整資料副本驗證通過，原72,281列逐主鍵雜湊保持一致。
- CI新失敗已定位：D原生PG readiness讀到初始化暫存Unix服務，改驗最終127.0.0.1 TCP服務；舊editor瀏覽器測試仍尋找entry層級變體，改測義項內新增／刪除／重開保存，保留原本髒資料與發布保護。未提高逾時或略過測試。
- 整合 Chromium／WebKit四組瀏覽器回歸通過：真實SQL刪除（含suffix）、完整構詞編輯、2B學習內字典、IndexedDB隱藏／恢復／Session離開。production PWA兩組通過，包含冷離線重開、離線作答／編輯、重連衝突與帳號隔離。6,300卡本機基準新Session204.58ms／恢復138.91ms，各一次cards/states完整讀取（共12,600列），ID／額度／事件不變；這是合成環境，非實機耗時。
- 完整JSON交換3項與常駐匯入12項回歸通過；新HEAD TypeScript與Build通過，ESLint 0 errors／25 warnings。
- 未完成：最新遠端 CI／Vercel核對及Android／iPad實機；Android／iPad實機。原地圖曾出現一次 reorder 保存競態，後續 HEAD 通過不等於根因已修復，若重現必須依日誌排查，不提高逾時掩蓋。
- 正式 ledger 最後為 `20261107005039`（safe replacement），版本與 Git 檔名不同。B／C／D 皆未正式套用。C相容前端先行，B守衛及D契約先於各自依賴前端；逐項授權並依 B→C→D 隔離驗證結果執行，不能一次 db push。草稿轉換另需正式資料操作授權及人工發布；新資料寫入後不可盲目反向刪欄／恢復唯一索引。

目前維持 Draft，尚不建議合併。

以下保留 main 交接背景；本輪狀態以上述紀錄為準。

# Nexus — 當前狀態與下一步

本輪追蹤 #165；分支 `feat/world-map-workspace-tools`，基於 main `56cb937`（#158、#160、#162、#164 已合併）。Draft PR [#166](https://github.com/changmonica02/Nexus/pull/166)，首筆程式提交 `25d185d`；最終 head／checks 見 PR；不修改 HISTORY、不合併、不正式部署、不操作正式 DB 或存取保護。

## 本輪實作

- 地圖完整編輯器：256／288px 桌面側欄與手機底部面板；自然地理／人文地理相連雙分頁。人文六類依2／3／置中1格排列，第二級原位返回、搜尋、配置篩選、25筆分頁、正式條目選取／定位／高亮、新增、名稱與詳細資料、解除配置及具影響確認的刪除。
- 新增正式條目先保存為未配置；其後才放置點位或編輯區域，取消繪圖不刪除已建立的條目。地標保留 settlement／site，政治體沿用 country；路線仍由原生管理器保存，不新增 route WorldEntityType。文化／宗教的範圍、顏色、透明度與可見性作為同一份未提交編輯，確認才走 saveRegion／Page CAS，取消不留下部分樣式。
- 地區／顯示方式／圖層位於右側畫布上方，共用首頁解析，側欄收合一起伸縮；不因工具分類切換重新載入 iframe。點位／筆刷與原生工具未完成時保留離開屏障，切換空間先保存 working copy；既有 contain／手動視角與 ResizeObserver 沿用。
- 自然地理分類整合高度、海岸、湖泊、河流、氣候、生態、標籤、樣式及進階原生工具。固定 i18n 目錄補動態類型／提示、大小寫及計數；語言由 MessagePort 更新。新地理命名只在真正生成／新增名稱路徑處理，不監聽 map:generated 批次改名（載入也會發出該事件）；保留原 PRNG 消耗及已有名稱。第三方授權移到設定→關於 Nexus，保留 MIT 原文、來源與 notices 檔案。

## 資料與能力邊界

無 Schema 或 Migration；穩定 entity／map／placement ID、附件 SHA、原生格式、Page CAS、owner、workspace outbox 與離線 checkpoint 不變。正式正文與地理配置仍分離，多個地圖區塊共用資料。分布 appearance／focus 僅擴充既有白名單指令的設定，不開放宿主任意控制 iframe DOM；sandbox 未放寬。

區域筆刷具 draw／erase、大小、面積、undo／redo、重疊確認與取消。國界互斥仍需明確確認轉移；文化／宗教可跨國重疊。特殊宗教語意只保存現有正式 relations／可用分布，不新增無法持久化設定。原生工具全部有 checkpoint 確認／取消；宿主 undo／redo 僅提供原生高度工具確實具備的歷史，其餘沿用工具自身可用操作，不提供假全域歷史。原生路線不另存 React／正式路線資料庫。

## 驗證狀態

- 已通過 repository／core／IndexedDB、區域與 i18n 回歸，包含分布樣式與幾何同次提交、失敗回滾、CAS、重試不新增 outbox、正文／附件保持、冷開啟與備份。
- Chromium 原生工具交易、圖像／原生匯出、三尺寸布局、明暗主題、六類開啟返回、多地圖區塊與共用專案回歸已通過一輪；實際檢視桌面／320px／深色及繁中海岸截圖。新增繁中預製地圖驗證 features／rivers／biomes 名稱，並驗證語言切換保留既有名稱。
- Chromium PWA 實際離線開啟、地標／地形編輯、保存、重新開啟與重連保留 outbox 已通過一輪。公開材質離線未快取警告仍可能出現，不影響已保存專案；未放寬 CSP。
- 本機最後完整新介面測試：Chromium 約61秒、WebKit約169秒（各環境與並行負載不同，不作效能比較），包含1,000筆清單／25筆DOM、授權入口、實際原生路線新增／保存／取消、未完成路線保護、三尺寸與明暗主題、雙語自然工具／湖泊子編輯器、生成名稱與既有名稱保留。WebKit 使用隔離持久設定檔驗證真正 IDB Blob；其暫存情境連獨立 Blob probe 也會失敗，沒有以替換儲存或略過驗證使測試通過。
- TypeScript、修改範圍 ESLint（0 errors／9既有 warnings）、本機 Webpack與Turbopack Production Build通過。完整舊地圖回歸本機約134秒；相同Turbopack產物約185秒，含國界衝突、行政關聯、觸控、分布、SVG／PNG、備份及異網格保護。
- 最終程式提交 `405276b` 的 [Actions 42353453682](https://github.com/changmonica02/Nexus/actions/runs/42353453682) 兩份工作成功：地圖原生／分布183秒、Chromium62秒、WebKit134秒、PWA10秒；既有筆記／字典／學習／同步、隔離PostgreSQL、資料／IDB／i18n、TypeScript、ESLint與Build皆成功。Vercel成功。此後本提交僅更新交接文件；文件提交自身狀態仍以 [PR checks](https://github.com/changmonica02/Nexus/pull/166/checks) 為準。
- 早期CI失敗保留：`25d185d` 測試讀到原地圖區塊的另一張預覽（1280≠1600），附件獨立核對仍為1600；後續已明確選擇目標及活躍iframe、等待真正載入／筆刷／分布模式完成。`2bcb51f`與`57fec73`分布SVG下載逾時，本機曾通過；補模式套用與布局等待、點擊／網路／截圖診斷後，最終遠端完整下載及內容斷言通過，不將早期失敗列成功。`405276b`既有字典批次測試首次等待52／25／0／27暫停中間狀態逾時，原樣重試成功，未改字典程式／斷言／逾時。原始run與attempt仍可查證。
- resize不再於下一影格重播過期視角，避免覆蓋新雙指手勢。地圖四項瀏覽器檢查在同workflow獨立工作並行；個別失敗不略過其他地圖項目，任何失敗仍使job失敗。[桌面／820px／320px／明暗／第二級／繁中原生工具截圖artifact](https://github.com/changmonica02/Nexus/actions/runs/42353453682/artifacts/13566536957)分瀏覽器保存，本機test-results不提交大量二進位。技術檢查可進人工合併前審查，維持Draft，先完成下列實機與真實資料驗收。


## 正式與實機待驗收

- Android Chrome／安裝 PWA 與 iPad Safari／PWA：44px 觸控、虛擬鍵盤、安全區、雙指縮放與平移、筆刷／側欄、全螢幕、離線冷開啟及保存恢復。桌面 WebKit 不替代 iPad 實機結論。
- 真實既有世界觀／多地圖區塊與大量條目、特殊宗教關聯、原生路線建立／取消／保存及跨裝置 Page 衝突仍需人工驗收；失敗保留既有草稿，不以重試覆蓋遠端版本。
- #164 的 `20261106032651_dictionary_exchange_safe_replacement.sql` 是否已正式套用，本輪未查證；舊交接為未套用。既有正式 ledger 名稱可能不同，不可 db push 全部 pending。任何正式 Migration 仍需獨立人工授權。本輪不改匯入／審核、OAuth、Android 語音或學習排程。
