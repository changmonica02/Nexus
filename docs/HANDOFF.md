## PWA 新頁面啟動舊 Worker（2026-11-19；Refs #210）

- 確認使用者與正式站同一主機，排除固定舊預覽部署。真實 Chromium 定向回歸已重現原 SW 在 reload 後把新 Worker 請求回退至舊 fragment；失敗證據：https://github.com/changmonica02/Nexus/actions/runs/44454962880 。
- 修正分支 `fix/pwa-worker-bootstrap-20261119`：直接內容雜湊 classic Worker、SW 的 Worker 回應 URL 中立化、新建結果版本檢查、生成失敗停用舊候選。原已儲存快照／私人資料／快取版本不變。
- 2 項 client 版本測試通過；正向瀏覽器與 PWA 回歸、正式 Next 建置正在驗證。尚未合併／部署修正，不能要求使用者刷新即宣稱完成。

## 自然生成合併前整合（2026-11-19；Refs #209；PR #200）

- 已對照 planet 的地形 → 氣候 → 水系順序，確認 Nexus 另於水系後推導 GET2；保留使用者已接受的輪廓與山脈，不重寫生成器或載入時重抽。
- 將最新 main 的 #201 與 CI 調整整合至功能分支，無衝突；補登 10 份新測試，修正獨立球面 CI 的套件／原生 Azgaar 測試前置步驟。
- 擴充 Chromium 桌面／行動尺寸流程：生成保存、JSON 重開、改河名、Pack 切換、再次重開，檢查 ID／名稱／幾何與地形保留。170 項球面測試、52 項地圖整合、正式建置及相關 ESLint 已通過；本機 Chromium 仍因 socket 權限無法啟動，瀏覽器結果以本次遠端 CI 為準，不能宣稱已人工驗收。
- 遠端球面 170 項、Worker 與 Chromium 桌面／行動生命週期已通過。完整 CI 發現工作區 PWA 測試預設連接埠與共用 fixture 32142 不一致，已統一 NEXUS_PWA_URL；此為測試設定修正，未更動 PWA 功能。
- 完整回歸重跑仍有兩組字典於 EC2 Ubuntu 鏡像下載 libflite 時超過 8 分鐘。Playwright 安裝將 EC2 區域站改用 Ubuntu 主套件站，涵蓋 runner 的 apt-mirrors.txt、傳統 sources.list 與 deb822 ubuntu.sources；Azure／security 站不改動，保留既有 Ubuntu 簽章信任與安全更新來源；重新確認 CI，不略過功能測試。
- 尚未合併 main 或部署；PR 已轉為可審查；本次遠端完整 CI 與後續結果記錄於 PR #200／Issue #209。

## 球面 Pack、河湖與 IUCN 潛在生態（2026-11-19；Refs #208；Draft PR #200）

- 同分支 `feat/azgaar-spherical-templates-20261118`。參考 Azgaar Pack／river／lakes／biomes；獨立球面 Delaunay／Voronoi，保留完整 Grid 氣候與高程權威。標準／細緻海岸可切換重建，來源與集水面積維持 Grid 對應。
- 以坡度、輔助填窪路由、月雨量與蒸散／融雪生成主支流及湖泊。保存自然基礎：專案內穩定 ID、名稱、幾何、關聯、湖底／水位／世界座標盆緣；月流量、枯水、湖收支及生態為衍生。Pack 重建不重抽實體，乾旱不刪河道。
- 完整編輯器自然地理面板可改名稱／備註、河道座標、湖盆岸界／湖底、水位；拒絕越盆水位與循環路由，沿既有草稿／CAS 保存。舊圖可明確建立自然地理，載入不自動改寫。仍無筆刷／完整水力或氣候湖泊雙向耦合。
- IUCN GET 第二層是唯一主要潛在生態，Azgaar 13 類只參考。F1 是河道線形棲地，不取代整個陸格；M1／M2／M3 分開，S1 無地下證據不推測。奇幻覆蓋獨立、不改自然基準。屬程序估計，非完整實地判定。
- seed 42 範例 23,526／36,350 Pack 格、698 條主支流、64 湖，離線 Pack／河湖／生態／乾旱保留圖已產生並檢視。10 項自然專項、24 項氣候及 52 項地圖整合通過；最終完整 build（含 TypeScript）、相關 ESLint 與 diff check 通過。未合併、未部署；實際瀏覽器操作及外觀仍待驗收，既有 socket 限制仍在。

## 表層洋流與逐月氣候（2026-11-19；Refs #207；Draft PR #200）

- 決定先在完整固定 Grid 做氣候：Azgaar Pack 的深海刪點／海岸加密及 cells.g 對應，留待後續水文／人文衍生網格；後續 #208 已建立球面 Pack。
- 年平均風驅表層流含科氏偏轉、海陸阻隔與壓力投影；沿洋流輸送 SST，再影響岸溫、蒸發及 12 月風向／水氣／降水。月均溫 °C、降水 mm/month；有熱慣性、飽和量、地形雨／雨影與季節風帶，柯本由全年月資料推導。
- 預覽新增月份、洋流／SST／溫度／降水／柯本圖層與分類色彩圖例。新快照 climateVersion 1 從保存高度重建衍生氣候，無標記舊圖不自動加氣候；快取比較完整高度，不寫地形。
- 24 項氣候專項通過，含半球季節、極夜、洋流海域／深度獨立性、海溫影響、雨影、水氣收支、自然出現季節型與分類門檻。最終完整 build（含 TypeScript）、52 項地圖整合、相關 ESLint 與 diff check 通過；快照驗證涵蓋 climateVersion、無標記舊圖、未知版本拒絕及保存地形重開一致性。
- 種子 42 範例全球降水約 2.8 mm/day；量級及數值守恆通過不等於區域觀測校準。固定參數／簡化水氣柱及有限迭代限制見 ARCHITECTURE。未合併、未部署；瀏覽器操作仍受既有 socket 限制，外觀／真實裝置待驗收。

## 適量出水島鏈（2026-11-19；Refs #206；Draft PR #200）

- 使用者接受 v3 板塊，授權適量生成島鏈。同分支 `feat/azgaar-spherical-templates-20261118`；原海陸生成器／陸地高程保留，只增加少量離岸出水格及海底火山基座。
- 隱沒上覆側火山弧／熱點軌跡選址，每世界最多 4 鏈、每鏈 2～5 島，新增面積上限 0.12 個百分點；限制岸距、島距、板塊及海溝／洋脊，不強制湊滿。預覽顯示實際陸地比例。
- 新快照 geologyVersion 4 保存 islandGenesis；重開用暫存新增前海陸推導原板塊，再附加保存島鏈，不再生成。v3／v2／legacy 維持相容。
- 種子 42／1729 各新增 4 鏈 9 島、約 0.027 個百分點，前後圖與火山基座格網放大圖已檢視。完整 build、TypeScript、相關 ESLint 與 diff check 通過；24 項地質／島鏈、52 項地圖、30 項自然地形測試通過，含新增面積、間距、原陸地保留、重開一致性與無適合來源不硬湊島鏈；外觀及實際瀏覽器操作待驗收，既有 socket 限制仍在。未合併、未部署。

## 大陸輪廓與疏密修正（2026-11-18；Refs #204；Draft PR #200）

- 使用者拒絕 #203 的輪廓與疏密，不能再以該輪高程統計宣稱品質已驗收。
- 原分支 `feat/azgaar-spherical-templates-20261118`：v3 改成直接提取固定 Azgaar fork 的工具核心；補上小數次數、Uint8 截斷與不規則格網語意。移除六份模板／逐塊配額／方形衰減／全域重排，改為配置特性與大陸群先行、側向洋盆留白、群內聚合、群間通道、單一全球尺度及沿實際海岸配置島群。
- 重建需要 `scripts/build-azgaar-command-tools.mjs`；`prebuild`／`predev` 的 global Worker build 與自然地形測試已接入。開發產圖入口也會先重建。新增 Delaunator 5.0.1 與其 robust-predicates 依賴。
- 比較來源：原始整合版 `8f50458`、使用者回報退步版 `bfc2edc`、本輪候選版。用種子 42／1729 的三種類型比較權威 Grid 海陸遮罩及 48 個等面積密度區；沒有以海拔色階代替輪廓評估。
- 驗證：30 項指令／配置／自然地形、19 項既有模板／海底／細節、52 項地圖測試通過；完整 build、TypeScript、相關 ESLint 與 diff check 通過。六組設定 × 三版本的遮罩／密度圖已產生並檢視，其海岸輪廓後續已獲使用者接受。未部署、未合併 main；實際桌面／手機操作仍受既有 Chromium socket 啟動限制待驗收。
- 保留 25／32／45% 與既有快照／預覽／確認／資料隔離。舊快照高度不重算；核心數不是最終連通大陸數。固定格網折線與未接通河湖／氣候等限制仍在。

## Android Chrome／PWA 手動發音失敗（Issue #195，2026-11-16）

- 使用者在正式版 `49cc70f` 回報點喇叭無聲，提示播放失敗／未啟動。原 en-US 清單備援仍存在；本輪重現「已列出英文 voice 卻 synthesis-failed，後續沒有語言備援」的程式缺口，尚無實機 error code。
- 分支 `fix/android-speech-recovery-20261116` 加入一次啟動前語言備援，保留手動／自動、語速、跨卡取消、實際錯誤及所有學習資料。修正前新案例失敗，修正後10項單元與獨立 TypeScript 檢查通過。
- 本機瀏覽器受 Unix socket 限制，Chromium／WebKit 由最新提交 CI 驗證；合併及部署證據以 PR #196 為準，Android 實機仍待驗收。後續須於使用者裝置確認手動、下一張自動、切卡取消與最終失敗提示。

## PR #193 發布驗證（2026-11-15）

- 工作分支 `fix/study-back-inline-extensions-20261115` 已整合 main `237a77f`（#194），保留新全球地圖與舊 Azgaar 分流。六區塊與四個固定欄位、衍生義一對一例句、Exchange v2-only、待審提案去重及 Android TTS 備援以本 PR 為準。
- 正式 singleton、衍生義一對一例句及 NOT NULL 遷移均已套用；ledger 對照見 ARCHITECTURE。本輪僅唯讀核對，沒有重新套用 SQL 或刪除資料。
- 發布門檻：最新 HEAD 的六組 Note editor audit 全通過，才合併；正式部署須另外確認 Vercel 的實際 main SHA 與 READY。不得拿舊提交的通過結果取代新版驗證；完整結果以 PR／Actions／Vercel 的對應 SHA 為準。
- Android 實機發聲、iPad 與真實帳號跨裝置驗收仍保留於 #60；瀏覽器模擬不等於實機完成。

## B 階段交付（2026-11-15，PR #186）

- Word 衍生意思、雙語例句、整詞記憶法／歷史詞源／公共筆記、閱讀與學習背面、Exchange v2 及獨立 Inflections 退役已實作；外部 v1 匯入依 #193 退役，資料庫歷史原文／收據保留。
- 測試提交 `b842951` 的 GitHub Actions run `43681067158`：除使用者明確排除的世界地圖外，note、study-b、interface-a、dictionary-c、morpheme-contract 五組全部成功。包含 Chromium／WebKit、原生 PostgreSQL、完整 B2 草稿→發布→Review→核准→刪除、TypeScript、lint 與正式模式建置。
- 正式 Supabase 已於 2026-11-15 套用整批 B2 SQL，ledger `20261115054149`／`dictionary_b_phase_word_content_and_inflections_retirement_20261114`。涵蓋本機十份 `20261114135000` 至 `20261114231000` B2 Migration；此 ledger 為合併交易，不可因本機檔名版本不同就重新套用。交易內比對既有 dictionary／study 資料雜湊，異常則整批回復。
- 套用後：詞條 6,351、義項 10,857、字卡 10,155、FSRS 狀態 10,155、作答事件 2,800；以上完整資料雜湊與套用前一致。新衍生意思／公共筆記表存在，獨立詞形表已移除，public SQL 函式對舊表的殘留引用 0。這是套用當時的快照。
- PR #186 已合併 main（`29902c9`）；正式部署狀態需另行核對。真實裝置人工驗收與世界地圖問題仍分開追蹤，不視為本次已驗收。

## 新版全球地圖合併前整合（2026-11-15；Refs #191）

- 工作分支 `integrate/global-map-main-20261115` 已整合最新 main `29902c9`（含 B 階段 #186），已建立直接對 main 的完整 [Draft #194](https://github.com/changmonica02/Nexus/pull/194)；#188／#189／#192 仍保留歷史實作與驗證，不需先把這些堆疊 PR 逐一合入 main。禁止自行合併、部署或操作正式資料庫。
- 新建地圖使用 36,002 格球面核心；已實作生成、候選預覽／取消／確認替換、平移縮放、Grid 海岸顯示、快照匯出、附件保存／離線重開與復原草稿。舊 Azgaar 原格式開啟與世界觀資料保留；人文、河湖、氣候與人工筆刷尚未接入。
- 原程式提交 `3077098` 曾通過 Global map editor integration #43683080389 及 Note editor audit #43683080293；後續同程式碼提交 `ee6c9e7` 的 #43701756125 在 WebKit 手機寬度、離線恢復後導向 `/?en` 等待 load 時逾時。不能把前次成功當成此問題已解決。
- 本輪把網路恢復與語系驗證分開：中斷測試伺服器所有連線驗證離線冷重開，以未快取的探測請求驗證重新連線，再依正式產品的 LanguageContext 切換語系，並保留原先的 `/?en` 重新導航，以 DOMContentLoaded 後的實際地圖可操作及快照正確作為驗收。沒有延長逾時、放寬快照或略過離線檢查。
- Next 的 Worker 先以 `npm run map:global` 封裝，再發布為雜湊 JS，由原 SW 的靜態資產快取承接；predev／prebuild 已接此步驟。沒有新增或重新套用 SQL。
- 合併審核以 #194 的最新提交與 CI 為準：核心／B 階段／Chromium／既有地圖及整體回歸，WebKit 從乾淨持久化設定檔連續跑兩次；完整結果與測試提交記於該 PR 驗證欄位。Edge／iPad 真人及真實跨裝置驗收仍分開保留。未經另行授權，不合併或部署。

## 全球海陸原型接續（2026-11-14；Refs #190）

- 工作分支 `prototype/global-land-generator-20261114`，Draft #189 建立於 Draft #188；#185 為規格 Draft。禁止自行合併、部署或修改正式資料。
- 提交 `4e3c2b1` 的 Actions #43603816403 已成功，含單一 HTML 封裝及上傳；不能據此宣稱 Edge 本機問題已解決。
- 本輪本機 58/58 幾何／生成／快照測試通過。新增封裝後 file:// Chromium 回歸流程；提交 `1f71e84` 的 [Actions #43607999501](https://github.com/changmonica02/Nexus/actions/runs/43607999501) 已通過 58 項核心測試、既有效能量測、海陸像素／種子／參數／確認／下載／快照匯入及重開驗證，產物含 index.html 與 preview.png。本機 Chromium 因環境 socket 限制無法啟動；Windows Edge 真人驗收仍待完成。
- 下一步先下載最新成功 CI 的 `nexus-global-land-preview`，解壓縮開啟 `index.html`，確認海陸繪圖、生成、確認及 JSON 匯出；再進行多種子外觀／連通性評估及高解析度資料架構比較，不重寫既有 Grid／Pack。

## 已完成的本階段

- **四階段學習／字典整合**：#168～#172 已合併。學習 Session 的安全離開／恢復、忘記卡到期不搶畫面、私人隱藏，與公開字典的穩定 ID 列表、待審核口徑、刪除引用保護、統一構詞編輯、分類搜尋、變體及雙向單字關聯，沿用既有權限、CAS、草稿／Review 與人工發布。
- **字典搜尋效能**：#173 的 `20261112120627_dictionary_catalog_query_plan.sql` 已套用正式 Supabase；`search_dictionary_catalog` 按詞條 ID 匹配、計數、分頁後再彙整內容，不因效能優化改變公開／管理權限或範圍。
- **舊構詞退役與未決審核清理**：[#174](https://github.com/changmonica02/Nexus/pull/174) 已合併（`d83c3d3`）；`20261113035217_dictionary_legacy_morpheme_retired.sql` 和 `20261113035226_dictionary_review_cleanup.sql` 均已套用正式。管理員授權清理完成：3,796 筆 active Review、1,384 筆未決匯入項目已清；4 筆已完成匯入項目、正式詞條與學習資料保留。退役舊 grouping／轉換／待整理入口；新工作仍照正常 Review 流程，不應再次清除全部未決工作。
- **十大構詞語意分類**：[#175](https://github.com/changmonica02/Nexus/pull/175) 已合併（`f26fd37695260df410bdab167dcf6aabbc9134d7`）；`20261113061500_dictionary_semantic_ten_domains.sql` 已套用正式（ledger `20261113072536`）。十個大類、58 個小分類；「派生構詞」為無小分類的大類。已確認代碼改名直接採新語意；Migration **僅一次性**清空當時失效的大／小分類，不猜測其他值，保留概述、變體、關聯與識別；往後的新寫入若帶無效分類則**拒絕**，不自動清空。驗證函式不再允許舊 `cutting`、`flora_fauna`、`grammar_affixes/derivation` 等組合。
- **測試基準**：#175 對應 [GitHub Actions](https://github.com/changmonica02/Nexus/actions/runs/43380211710) 六項工作（study-b 重跑、interface-a、morpheme-contract、world-map、note、dictionary-c）最終全成功，Vercel 檢查成功。這證明該提交的自動化檢查通過，不等於 Android／iPad 或真實跨裝置人工驗收已完成。

## 正式資料與重要邊界

- 2026-11-13 #175 套用後唯讀核對：`dictionary_entries` 6,347、`dictionary_senses` 10,856、`study_cards` 10,155；當時 240 個構詞義項，無效分類 0 筆；`dictionary_guard` 觸發器正常啟用。這是**當時快照**，後續以現況重新查詢，不寫死為永遠固定的筆數。
- 公共字典只有一套；Word、Prefix、Root、Suffix 是現行識別與內容。構詞形式分類在 Entry，語意大／小分類、帶 UUID 的變體在 Sense；`NULL` 表示未分類。只有新版語意代碼可新寫入。Word 與構詞使用既有關聯，公開閱讀只顯示已發布內容。
- 草稿自動儲存與 CAS、人工 Review／核准及正式發布仍有區別；已發布內容不得由一般匯入直接覆寫。最新版匯入拒絕退休／未知欄位及舊版格式，完整交換採 v2 JSON；既有資料庫審核原文／收據保留。舊字典分組表與舊草稿轉換 RPC 已退休，不要復活。
- PWA／IndexedDB／帳號同步與既有 Session 保護不因文件清理或構詞分類變動而重設；新的正式 Migration 一律先比對依賴與遠端 ledger，不要盲目推送所有本機待套用 SQL。

## 文件與功能的實作界線

- **已核對的現行能力**：字典十大分類、有效 Prefix／Root／Suffix 快速建立、詞條身分與同形 ID、共用 catalog 查詢、主程式 PWA 的 Manifest／Service Worker、生活總覽／月曆／任務／自訂清單，以及基本製譜表單。這些是對應原始碼／SQL 的功能確認；不代表每項都已由真人裝置操作驗收。
- **SPEC 保留但尚未實作的產品方向**：生活的週／日／時間軸日曆、獨立記帳、日記、特殊日、排班、週期任務、任務看板等；世界觀地圖 V2 的部分進階自然地理／文明配置流程，也不能因既有地圖編輯器存在就推論全部完成。請依 SPEC 的分期／現況註記區分，不要在下一輪將規劃誤當現行系統缺陷或已交付成果。

## 未完成的人工驗收（不要誤記為已完成）

- Android Chrome／安裝版 PWA、iPad Safari／PWA：構詞編輯與輸入法組字、字典面板拖曳、朗讀、離線冷啟動／重新連線、學習 Session 安全離開／私人隱藏與觸控操作。
- 真實帳號與跨裝置的同步、資料可見性及衝突情境；實際世界觀專案（大量條目、多地圖區塊、筆刷／路線、附件及跨裝置衝突）的人工驗收。
- 某些既有瀏覽器／CI 工作曾有偶發失敗並經重跑成功；**不可將重跑成功寫成已定位根因或已修復**。再次發生時使用當次日誌與環境診斷，不憑歷史猜測。
- **字典列表仍有規格差距**：正式 `search_dictionary_catalog` 目前將全部義項概述串接成列表摘要；SPEC 要求只顯示第一個義項，Word 需顯示其詞性。這不是文件修改可以解決的事情，未來需要單獨調整 SQL／列表顯示並補測試；本階段 #175 的十大分類與資料驗證不受影響。
- 小型介面文案差異：`RelationTargetPicker` 的快速建立視窗實際提供字首／字根／字尾，但部分標題與提示仍稱「字首／字根」；這不影響正式分類、資料或權限，可待後續介面整理再修正。

## 下一輪開始前

先讀 `SPEC` 對應模組、`ARCHITECTURE` 的資料契約與本交接，再依 GitHub 的**最新**工作狀態確認需要實作的問題。避免重新啟動 #168～#175 已完成的舊部署、舊分類轉換、待整理 Review 或一次性清理流程；後續新需求另開獨立工作。此階段可以停止實作並休息；#168～#175 的本階段已完成部署沒有遺留待套用的指定 Migration。其他功能是否有新工作，仍以各自最新狀態判定。
