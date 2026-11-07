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
- 本機完整新介面測試：Chromium 約151秒、WebKit約227秒（與其他回歸並行），包含1,000筆清單／25筆DOM、授權入口、實際原生路線新增／保存／取消、未完成路線保護、三尺寸與明暗主題、雙語自然工具／湖泊子編輯器、生成名稱與既有名稱保留。WebKit 使用隔離持久設定檔驗證真正 IDB Blob；其暫存情境連獨立 Blob probe 也會失敗，沒有以替換儲存或略過驗證使測試通過。
- TypeScript、修改範圍 ESLint（0 errors／9 warnings）與本機 Webpack Build 通過；PWA 最後一輪約38秒。首提交 `25d185d` 的 Vercel 成功，Actions [42330471683](https://github.com/changmonica02/Nexus/actions/runs/42330471683) 的舊有功能回歸、隔離 PostgreSQL、資料／IDB／i18n、TypeScript、Build 全部成功，但完整地圖瀏覽器回歸讀到原地圖區塊的另一張預覽（1280≠1600），失敗。已獨立驗證附件正確保存1600，並改為明確選擇目標地圖、活躍 iframe、等待真實區域回覆；維持原幾何／SHA／資料保留斷言。亦補獨立筆刷模式無障礙名稱、樣式控制標示及顯示模式優先於舊高亮。
- 完整舊地圖／區域／文化／宗教瀏覽器回歸本機通過（約134秒，6,692格、額外50個分布，無瀏覽器程式錯誤），含衝突、觸控、SVG／PNG、備份、異網格保護。修正 resize 不再於下一影格重播過期視角，避免覆蓋剛開始的雙指手勢；測試等待實際載入／手勢完成而非讀取過渡狀態。第二輪 Actions [42349952940](https://github.com/changmonica02/Nexus/actions/runs/42349952940) 前置檢查全過，但分布圖像下載逾時；最終修正版 CI 尚待確認，不以本機通過取代遠端結果、不建議在紅燈時合併。完整最終結果須核對 [PR checks](https://github.com/changmonica02/Nexus/pull/166/checks) 與交付註記的 head／run；舊失敗或被取消的 run 不能列成功。截圖由 CI `world-map-workspace-evidence` artifact 分瀏覽器保存；本機 test-results，不提交大量二進位。

## 正式與實機待驗收

- Android Chrome／安裝 PWA 與 iPad Safari／PWA：44px 觸控、虛擬鍵盤、安全區、雙指縮放與平移、筆刷／側欄、全螢幕、離線冷開啟及保存恢復。桌面 WebKit 不替代 iPad 實機結論。
- 真實既有世界觀／多地圖區塊與大量條目、特殊宗教關聯、原生路線建立／取消／保存及跨裝置 Page 衝突仍需人工驗收；失敗保留既有草稿，不以重試覆蓋遠端版本。
- #164 的 `20261106032651_dictionary_exchange_safe_replacement.sql` 是否已正式套用，本輪未查證；舊交接為未套用。既有正式 ledger 名稱可能不同，不可 db push 全部 pending。任何正式 Migration 仍需獨立人工授權。本輪不改匯入／審核、OAuth、Android 語音或學習排程。
