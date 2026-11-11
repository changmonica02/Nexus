# Nexus — 階段 B：學習 Session 與私人字卡隱藏

本輪追蹤 #167；分支 `feat/study-session-hidden-cards`，基於 main `350882c`。A 階段另見 Draft PR #168；本分支不重做 A。維持 Draft，不合併、不部署、不操作正式 DB、不修改 HISTORY。C 的三項根因須先報告再修正；D 尚未轉換任何正式資料。

- 已實作：首頁啟動來源返回；右上離開確認與 durable Session 結束；保留忘記卡已作答、額度及 outbox，未作答不標完成，下次以最新設定新建 Session。
- 搶卡根因已有失敗重現：到期 refreshScheduled 把短間隔卡排到 queue[0]，正式評分前再次 reconcile 亦可能拒絕正在顯示題目的 CAS。現在保留實際呈現身份，計時器只處理等待；背景資料真正改變時保留畫面並要求重新載入，不跳過正式事件驗證。
- 私人隱藏：總覽左側眼睛與灰列、背面確認；依 owner／deck／card 隔離，排除新卡／到期／忘記／無盡及後續 queue，保留 due、歷史、字典連結及卡片識別。沿用原 payload、outbox、feed，缺省／舊偏好不能覆蓋新設定；官方更新與舊備份不撤銷隱藏。
- Migration：`20261111143124_study_card_visibility.sql`，只有 JSON 偏好合併與既有 RPC／官方 guard 修改。正式尚未套用；必須獨立人工授權後 DB 先、前端後，不可 db push 全部 pending。
- 隔離 PGlite 與真正 PostgreSQL 17（無網路暫用容器）通過原 RPC、RLS、官方更新、舊裝置、獨立時間合併、feed、錯誤回滾與權限測試。Chromium／WebKit 實際 IDB 操作及舊備份合併已通過；最後離線／備份 Chromium、WebKit 通過；10 組學習／同步／清除回歸通過。兩個瀏覽器皆通過 20／6,300 張新建、恢復、離線、重連、待傳、遠端、無盡、官方及偏好案例，完整讀卡／狀態仍各一次，不增加全組掃描。Production Turbopack Build、TypeScript、ESLint（0 errors／23既有 warnings）通過；本機 Production PWA 冷離線安裝／重開及正式作答／返回首頁／帳號隔離／衝突測試通過。最終 HEAD 遠端 CI／Vercel 待核對。
- 未完成驗收：Android／iPad 實機、真實跨裝置時鐘差與舊程式離線行為。舊離線程式不能知道尚未同步的隱藏設定，保留其合法作答；新程式仍先完成既有權威清除／同步核對再正式出題。未宣稱實機或正式資料通過。

以下為 main 原交接背景，最新進度以上述階段記錄及 PR checks 為準。

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
