# Nexus — 階段 C：字典缺陷重現與修正

追蹤 #167；分支 `fix/dictionary-defects-stage-c`，基於 main `350882c`。A 見 Draft #168，B 見 Draft #169；本分支不重做 A／B。維持 Draft，不合併、不部署、不寫正式 DB、不修改 HISTORY。

- C1：正式唯讀核對 RPC、外鍵與 triggers；隔離最新 Schema 下含構詞格、IPA、active Review 的獨立 Word 刪除成功，官方清單引用則正確拒絕並回滾。尚缺使用者實際失敗詞條／RPC 錯誤，不能宣稱原問題已修復；只補上已知引用、版本、權限及未知結果的精確雙語提示，保留 message／code／details／hint 診斷，不修改刪除／審核保護。
- C2：確認 Prefix 分類按 sense 回傳，UI 卻重複顯示完整摘要；修正前雙義項為兩列，修正後以正式 entry ID 先分組再分頁，保留義項定位。不同正式類型的同字形 ID 不合併，刪除一個不影響另一個。
- C3：確認管理 red 只含匯入審核，完整 pending 匯出另含 active 編輯 Review。單一編輯 Review 在原管理為0、匯出為1的失敗已重現；現在兩者按真正工作與 entry ID 統一，普通草稿不算待審核；匯入與編輯來源仍導向各自既有頁面，不刪工作紀錄。
- 正式唯讀基準（2026-11-11，非寫入）：published Word 6,163／Prefix77／Root107；義項10,866、關聯145、詞源102、IPA152、active editor Review3,802、匯入待處理 entry1,369、官方清單 entry6,134、私人正式字典連結6,135。同類型同字形未見重複正式 entry。不同工作可能對應同一 entry，禁止把上述計數直接相加當待審核詞條總數。
- 正式資料完整副本的追加隔離驗證：29表72,281列逐主鍵完整列雜湊一致、所有約束有效、RPC／跨帳號 RLS 通過。套用 C 查詢後，管理與完整 pending 匯出皆為5,166個唯一詞條（原管理1,369）；29個非官方清單 Word 刪除均成功並在強制延遲約束檢查後回滾，原資料不變。這不是使用者特定 C1 失敗已解決的證據。
- 隔離 fixture 差異：兩個官方包 CHECK 未包含正式既有 gsat-all，以及缺少既有 set_study_dictionary_link 定義；副本依正式唯讀定義／原 ACL 補齊，未放寬約束或修改正式 Schema。私人恢復備份不提交 Git。
- Migration `20261111145758_dictionary_pending_identity.sql`：只修查詢／計數，無資料改寫；正式尚未套用，須另行授權。相容前端可先、DB查詢後；B payload Migration 的發布順序另依 B PR，不可 db push 全部 pending。
- 已通過 PGlite 重現／修正及 PostgreSQL 17 真實 RPC／RLS；不同義項、跨頁、同字形不同類型、缺少正式 entry 的候選、失敗待恢復、範圍計數、重入與回滾；Chromium／WebKit 實際 SQL 刪除、取消、失敗及未存內容保護通過。六項隔離資料庫測試、六組既有字典／安全匯入回歸通過；TypeScript、ESLint（0 errors／3既有 warnings）、Production Turbopack Build通過。f2ca34d 遠端 Actions 43055260609 為 cancelled，Vercel成功；文件更新後仍須核對最終 HEAD，Android／iPad 未實機驗收。
- 阻擋：C1 實際失敗仍待證據。D 可以先設計，不能在此問題尚未查明時對正式字典作合併轉換；本輪從未執行正式轉換。Android／iPad、正式問題詞條及真實使用者資料仍待人工驗收。

以下為 main 原交接背景，最新狀態以上述記錄及 PR checks 為準。

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
