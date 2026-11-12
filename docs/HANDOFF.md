# Nexus — 學習／構詞整合交接（2026-11-12，待正式授權）

追蹤 #167；main基準 `350882c`。A／B／C／D維持 Draft #168／#169／#170／#171，整合 Draft #172。沒有合併GitHub PR、部署、操作正式資料或修改HISTORY。

- 程式完成：沿用A的學習設定／講稿範圍／2B字典面板、B的Session安全離開／忘記卡不搶畫面／私人隱藏、C的穩定ID列表／待審計數與官方引用刪除保護，完成D統一Prefix／Root／Suffix編輯、每義項九大類／42小類、具ID有序變體／條件、概述／獨立詞源、雙向Word關聯、四行搜尋分類分頁及無損待整理草稿。
- D沿用DraftAutosaveQueue、Review／CAS、人工發布、既有relation／公開快取／JSON；不新增字典、同步或關聯表。原ID改形式分類，不改Word身分。合法同字形、同分類但不同ID保留；快速建立遇多個符合ID拒絕猜測。字尾使用同一構詞選擇器與原管理員確認流程。
- 相容：新增欄位缺省／null不抹除舊值，明確variants:[]才清空；分類null可清除。快照完整保留查證／詞源／概念／IPA／word_segments規則及真正內容、排序與版本衝突。舊匯出fingerprint不因新增null假過期，完整JSON／AI JSON保留新欄位及舊原文；CSV仍為既有有限欄位格式，不是完整備份。
- 正式唯讀重核24張字典／審核／官方表、5張學習依賴、85個函式與原備份一致。entries6,347、構詞184／義項250、學習卡及狀態各10,155、事件2,567、設定15；正式操作前重新盤點，不能視為永久基準。正式ledger最後20261107005039，與Git檔名不同，禁止db push全部pending。
- 私人完整備份29表72,281列及SHA256／逐主鍵雜湊／還原已驗證，不入Git／CI／外部分享；只是字典及必要學習依賴，非完整Supabase／Auth備份。B→C→D在無網路PostgreSQL17完整副本依序套用及轉換，所有原列雜湊不變：184構詞中174份待整理Review建立、10份既有Review保留、54筆變體列可歸屬、1組歸屬不明原文保留；重送不重複，沒有自動發布。
- 新Migration：B `20261111143124_study_card_visibility.sql`、C `20261111145758_dictionary_pending_identity.sql`、D `20261112012042_dictionary_morpheme_senses.sql`。全部正式未套用。D只增nullable義項欄位、suffix、驗證與搜尋／轉換RPC，不自動改資料。轉換操作仍須另行正式資料授權，管理員整理後人工發布。
- 發布順序：先C相容前端避免舊red入口誤導；B守衛／D契約先於依賴前端，逐項授權並依B→C→D驗證，不一次推全部Migration。舊前端不能完整管理suffix或解析新義項JSON，切換期停用舊版匯入／分類編輯。DDL失敗全交易回滾；新資料寫入後不能盲目刪新欄位／恢復構詞唯一索引，須保留資料另定人工回復。
- 本機通過：D的PGlite與原生PostgreSQL各8項RPC／RLS／回滾／舊Review／JSON相容測試；整合43項構詞／排程／同步回歸、14項C缺陷、19項editor UI、7項reader/admin、3項身分、完整交換與常駐匯入回歸。TypeScript、Production Build通過，相關ESLint 0 errors（D23／整合25 warnings）。
- 瀏覽器通過：Chromium／WebKit實際SQL構詞編輯、重開、精確變體刪除與雙向草稿關聯，1280／820／390／320及中英文；2B面板、IDB隱藏／恢復／Session離開、IME／多行／失敗重試、批次匯出／匯入、地圖保存重開與多區塊。production PWA冷離線重開、離線編輯／作答、重連衝突與帳號隔離通過，沒有清空IndexedDB。
- 6,300卡合成本機基準：新Session204.58ms／恢復138.91ms；各一次cards與states讀取，共12,600列，ID／額度／事件不變。不是Android／iPad實機耗時。開始學習瀏覽器測試另涵蓋線上／離線／重連／待傳／遠端變更／官方內容。
- 遠端程式提交驗證：D `f9d5f80` 的 Actions **43173791931** 三工作成功；整合 `8358622` 的 Actions **43173859836** 六工作成功；兩者Vercel成功。A `90f467b`、B `7f4141f`及C `80f1199`亦各自核對Actions／Vercel成功（C run43167852813）。本次交接更新只改文件，前述SHA為已驗證程式基準。
- CI實際修正：PG readiness改確認最終TCP服務，避免初始化暫存Unix服務；舊測試接入新搜尋RPC、義項變體及紅色active Review口徑；批次停止以可控在途RPC取代220ms競速；視角測試先初始化lazy iframe，再等本次持久化並確認另一區塊不變。未略過測試、弱化驗證或提高逾時。
- 原生工具確認曾有一次CI未關閉；本機原樣／診斷重跑共三次通過，最終兩份CI亦通過，但**尚不能宣稱該偶發根因修復**。保留點擊／宿主錯誤／工具狀態診斷，若重現再依證據處理。Chromium本機外部字型受代理CA影響，以正常TLS驗證的公開字型轉送完成測試，未放寬部署或sandbox。
- 仍待驗收：Android／iPad實機的學習返回／隱藏／離線重連／字典拖曳與IME、構詞編輯及正式帳號跨裝置；1組舊變體人工歸屬、舊分類人工整理。新義項若未發布，不能成為正式Word FK目標；多個Word Review須從原編輯器選擇，不任選草稿。a仍受gsat-1-2／gsat-all正式引用保護，未強制解除。

可進行人工合併前審查；正式Migration／轉換與裝置驗收未完成，維持Draft，不建議直接合併或部署。

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
