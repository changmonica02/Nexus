# Nexus — 十大構詞語意分類（2026-11-13，Draft／未套用正式 Migration）

- 依新決策將九大類改為十大類、58 小類；「派生構詞」為無小類的第十大類。編輯器與讀者／管理列表共用 `semanticDomains.ts`；無小類時編輯器停用小分類，列表不顯示該列。
- 保留已有資料的穩定代碼與義項 ID：`force` 顯示「作用」、`elements` 顯示「物質」、`quality` 顯示「特性」，`speech` 顯示「語言」、`sequence` 顯示「順序」。未自動改寫任何義項或重新猜測語意；舊代碼 `cutting`、`flora_fauna`、`grammar_affixes/derivation` 不再接受新寫入；分類值不合法時，Migration 只清空無效的大／小分類，不改寫其他義項內容。
- 新 Migration `20261113061500_dictionary_semantic_ten_domains.sql` 交易性清理不合新版分類的義項分類值並替換 `dictionary_valid_morpheme_sense`，保留變體 UUID／內容驗證，檢查現有構詞義項仍合法。不改 schema、正式發布狀態、Review、學習資料；需於前端依賴新版分類之前另行正式授權套用。
- 新增十大類／58 小類及舊代碼拒絕契約測試。未執行正式 Migration／合併；此 Draft PR 仍待 CI、完整回歸與人工審查。

---

# 舊構詞退役與待審核清理（2026-11-13，Draft PR #174）

- 基準 main `e06c631`，分支 `feat/retire-legacy-morpheme`，[Draft PR #174](https://github.com/changmonica02/Nexus/pull/174)。程式／SQL提交 `2734ce1`、`33e44e1`；後續測試修正與最終檢查以 PR HEAD 為準。新版發布內容為準；舊差異不恢復、舊分類不映射，分類可空。舊交接的「轉換／待整理」已退役。
- 已移除舊資料區塊、轉換入口、分組分類與變體讀取／搜尋／保存。新版每義項分類／變體、正式ID／關聯、完整bundle、autosave／IME／CAS／人工發布保留。JSON僅忽略已知退休欄位，不輸出舊分組，不猜測ID；其他未知欄位仍拒絕。舊CSV category忽略，缺少新欄位不清空現有分類。公開catalog更換既有快取請求鍵，舊離線變體搜尋不復活；不清空IDB或學習資料。
- Migration依序：`20261113035217_dictionary_legacy_morpheme_retired.sql`（依正式函式修訂相依、無CASCADE刪兩舊分組表／函式；未知非空tags或相依會中止）；`20261113035226_dictionary_review_cleanup.sql`（只安裝管理員preview／精確原子清理RPC及舊匯入預覽保護，Migration本身不清工作）。正式均未套用，正式清除0筆。
- 正式只讀備份期間有正常使用者新增／修改；採逐表原子快照，受影響表重抓，完整來源雜湊核對。最終私人相關備份29表72,272列：詞條6,347／義項10,856／正式關聯148，舊entry groups184／sense groups128；active Review3,796、未完成匯入1,384（另4筆unchanged保留），原操作收據34；cards／states各10,155、events2,572、settings17。這是備份時點，不是永久正式現況。私人備份含結構／94函式／ACL／RLS／逐主鍵C排序雜湊及SHA256封存，未上傳或分享；不是完整Supabase Auth／Storage備份。
- 無網路PostgreSQL17還原29表／72,272列，逐表來源雜湊、所有約束、公開讀取、管理RPC、非管理拒絕與owner RLS通過。正式與本機基礎Schema兩個官方包CHECK差異採實際正式定義，全部29表欄位一致、實際函式／ACL／RLS載入。完整副本依序套用兩Migration、清3,796 Review＋1,384匯入、保留4完成項目；24張有效內容／學習依賴表整列雜湊不變。清理交易ROLLBACK、同操作重送、兩審核表精確備份回復雜湊通過；退役的舊表原文保留私人備份，不還原至新版程式。
- 五組退役／清理測試在PGlite及原生PG17通過，含權限、真實CAS／內容差異、舊快照、精確manifest、失敗回滾及未知相依中止。交換／安全匯入／草稿／AI／閱讀／管理與11項公開快取回歸通過。Chromium／WebKit實際SQL構詞編輯閱讀通過（320／390／820／1280、雙語、保存／重開、正式連結）；其餘本次更新瀏覽器與遠端狀態見PR最新結果。TypeScript、修改範圍ESLint零錯誤、含地圖prebuild的Production Build通過。
- `33e44e1` Vercel成功，Actions43367015681學習B成功；C及構詞工作因ESLint仍列已刪檔案而失敗，介面A／note因舊瀏覽器fixture仍預期退休變體按鈕而失敗，已更新至新版義項變體並保留內容／權限／操作斷言。world-map仍在既有355行雙指縮放等待失敗，未改地圖／逾時，不能稱其根因已修復。完整CI未通過前維持Draft，不建議合併。
- 後續 `eb8866d` Actions43370214242的A／B／C／構詞／world-map五工作成功，note通過交換與原生交易後，發現AdminUI舊測試仍要求保存group_data；改驗證不輸出退休分組並完整保留正式ID／新版變體／義項修改。本機對應回歸與Chromium／WebKit交換、學習字典面板通過，最新測試修正提交須再確認完整CI。這次地圖通過不代表先前偶發根因已修復。
- 正式發布前須再盤點、重備份並取得獨立授權；停用舊版在途編輯／匯入，先退役Schema、維護RPC，再對固定ID／revision／整列雜湊manifest另授權清理，最後新版前端。任一新／變動工作整筆拒絕，不使用舊清單。既有owner收據與清除來源session保護舊預覽，三日期限後亦需重新分析，正常未來審核保留。
- 回復：正式亦須另授權；依私人備份精確補回指定工作並核對雜湊，不覆寫較新發布／草稿。舊結構／函式回復只能在維護窗口先重建相依與原ACL，需先在隔離副本再驗證，不能直接退回舊前端。尚待Android／iPad PWA離線／IME及真實跨裝置驗收；本輪未改學習同步或清空IDB。未修改HISTORY、合併、正式部署或正式資料。

---

# 字典 catalog 逾時修復（2026-11-12，驗證中）

- 基準 main `f490cbe`；分支 `fix/dictionary-catalog-timeout`。使用者確認 A／B／C／D 已合併且所需正式 Migration 已套用；下方舊交接的未合併／未套用描述不是目前狀態。
- 正式唯讀日誌定位共用 `search_dictionary_catalog` 內 SQL，57014；不是分頁 UI。列表、總數、管理三色統計共用同一 RPC，分類／搜尋為其中條件。
- 已先回報再修改：原 `matches` 分頁前逐詞條重掃完整 materialized 義項／變體。新版集合匹配、完整範圍計數、分頁後組裝內容；不提高 timeout、不改 ID、權限、Review 或 CAS。
- 新 `20261112120627_dictionary_catalog_query_plan.sql` 只交易替換函式；沒有資料更新／刪除／新表。正式未套用，須人工審查及另行授權；既有前端 RPC 契約相容。失敗交易回滾，回復採另授權替換舊函式，不回復資料。
- 隔離 PostgreSQL 九組新舊完整 RPC JSON 一致（一般／管理、搜尋、構詞、分類、紅色、草稿），另驗證 generic／custom 計畫。私人診斷及備份不入 Git。新增 6,300 詞條／12,600 義項合成回歸，保護分頁前掃描次數、重複呼叫與資料不變。
- Draft PR #173，程式提交 `0c81ea0`。PGlite／原生 PostgreSQL 各九項回歸通過，另原生補驗最新交易失敗回滾；閱讀／管理七項、字典缺陷六項、交換六項、構詞契約測試通過。TypeScript、相關 ESLint（0 errors）、Production Build、Chromium／WebKit 管理與公開字典實際畫面通過，包含草稿變體不洩漏與窄畫面。
- 隔離副本 EXPLAIN ANALYZE：一般列表 9,280.868 → 51.222ms；管理列表 10,324.947 → 2,236.930ms；不是正式耗時。管理候選估算與 JIT 仍有成本，沒有調整 timeout／JIT 設定。副本為既有私人備份，詞條／義項規模與本次唯讀盤點一致，待審資料已有變動，不能當作正式完整現況；九組 JSON 相等證明只針對此隔離副本。
- 正式唯讀 ledger 確認 B／C／D 分別登錄為 `20261112090122`／`20261112090153`／`20261112090218`，與 Git 檔名時間不同。禁止以 db push 套用所有 pending；本修復須單獨授權。
- Vercel 程式提交成功；GitHub Actions `43216570696` 的構詞、字典C、學習B、介面A成功。world-map失敗於 `tests/worldMap.browser.test.cjs:355` 雙指縮放倍率等待20秒，根因未確認，本輪未修改地圖／測試或提高逾時；同工作的中英地圖UI及離線PWA子測試成功。整合note工作仍執行中，完成後核對。完整CI尚未通過，維持Draft。不新增產品行為，SPEC 不改；正式尚未套用修復，不能宣稱已恢復。沒有修改正式資料、HISTORY、合併或部署。

---

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
- 最後隔離重現並修正：Review改形式分類／更名後，管理待審為1而相同匯出範圍為0。D Migration只讓匯出範圍沿用唯一active Review類型／名稱，多Review回正式身分；原正式快照、所有Review及scope版本驗證不改寫。修正後PGlite／原生PostgreSQL各8項、匯入／交換瀏覽器兩組、TypeScript及B→C→D完整副本重驗通過，原72,281列仍不變；此修正的新提交全套遠端檢查以PR最新HEAD為準。
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
