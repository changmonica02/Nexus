# Nexus — 階段 D 構詞契約與資料保護準備（未完成）

追蹤 #167；分支 `feat/morpheme-system-stage-d`，基於 main `350882c`。A／B／C 分別維持 Draft #168／#169／#170；本分支不包含它們的程式，整合時需處理重疊修改。不合併、不部署、不寫正式資料庫、不修改 HISTORY。

- 已實作九大語意分類／42小類固定代碼、義項層級變體契約與穩定識別驗證、只刪指定變體、缺省／null 與明確空陣列的區分、唯讀舊變體歸屬檢查。契約尚未接入編輯 UI／RPC／JSON，也未新增 Schema 或 Migration。閱讀 D4 已另行完成：共用構詞方格改用精確目標義項已發布概述，移除目標詞源額外查詢；Word 自身歷史詞源保留。
- 唯讀備份29表共72,281列，壓縮恢復檔含逐檔 SHA256 清單；不在 Git 或外部分享。隔離 PostgreSQL17 已還原全部資料，逐主鍵完整列雜湊一致、約束全部有效、管理員／公開 RPC 與非管理員拒絕及跨帳號 RLS 通過。備份僅字典及必要學習依賴，不是完整 Supabase／Auth 備份；正式操作前重新備份。
- 盤點184個構詞／250義項；31筆舊變體中30筆可明確對應單義項，1筆多義項歸屬不明；10個構詞已有 active Review，不可覆蓋。所有舊分類保留待整理，不猜測九大類對應。檢查函式只產生判定，沒有寫草稿或變更正式資料。
- 隔離基準差異：舊 fixture 的兩個官方包 CHECK 缺 `gsat-all`，依正式讀取定義補齊；fixture 另缺既有 `set_study_dictionary_link`，補原定義及 ACL。未向正式環境套用任何修補。
- C 實際資料副本驗證：原管理待審1,369、完整待審匯出5,166，套用 C 查詢修正後兩者5,166；29個非官方清單 Word 的刪除均成功並立即檢查延遲約束後回滾。使用者已提供 a 與官方清單引用錯誤；正式唯讀確認 a 被 gsat-1-2／gsat-all 使用，C1 根因已定位為既有依賴保護，不能以強制刪除處理。
- 本分支契約4項測試、既有 reader3項、TypeScript、修改範圍 ESLint、Production Turbopack Build通過；D4 Chromium／WebKit 各16個尺寸與情境（1280／820／390／320，正常／長文字／無連結／英文）通過，驗證內嵌探索、目標義項精確對應、概述空狀態、無額外目標 RPC、連續拼寫與底線布局。尚未執行 D 完整編輯 UI／PWA／資料轉換驗收，不能沿用 A／B／C 結果宣稱 D 通過。SPEC 已含確認的產品決策，本次不重寫。
- 遠端：C `f2ca34d` Actions 43055260609 為 cancelled；A／B 最新工作亦受 runner DNS 依賴安裝失敗阻擋，未宣稱 CI 通過。D 22d43b4 契約 CI 工作通過，Vercel成功，完整 note／world-map 尚在執行；runner DNS 恢復後已重新啟動 A／B 的原失敗工作，最終結果仍待核對。Android／iPad 未實機驗收。
- 下一步：在既有資料模型中完成 suffix、義項分類／變體保存與往返、保留 CAS 的快照契約及可重入待整理草稿轉換，再完成共用導覽、閱讀／編輯與雙向單字關聯。C1 證據缺口已解除，但正式轉換仍須獨立授權；D 未完成，不建議合併本階段。

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
