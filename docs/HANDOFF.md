# Nexus — 當前交接（2026-10-20）


## 內嵌地圖原版 UI 清理（Refs #92；PR #93）

分支 `feat/world-map-embedded-ui-20261020` 以尚未合併的首頁 PR #91 為基礎；PR #93 目標是該首頁分支，未合併或正式部署。程式 `f2109ee`；[CI 39390319230](https://github.com/changmonica02/Nexus/actions/runs/39390319230) 的 TypeScript（核心／Nexus／語系 adapter）、production build、相關 ESLint、37 項地圖／IDB／port／i18n／入口清理、39 項相關回歸、原生 map-commands／hotkeys 兩檔與地圖／角色兩組 Chromium 均通過。

移除原版 About／AppInfo、Tour、Desktop App、社群／宣傳／捐款、首次版本公告與啟動動畫，以及相關 registry、初始化、事件與 CSS。Nexus 管理新地圖、儲存、.map 匯入匯出、PNG／SVG、重載／草稿；原版重複入口、F1／F2／F6／F9、Dropbox／URL、獨立 browser-storage、分享連結、Google Translate 與無效 startup/autosave 設定退場。Ctrl/Cmd+S 沿用 Nexus bridge，Ctrl+C 保留正常複製。地圖工具、圖層、樣式、生成設定、必要提示／錯誤與進階 JPEG／tiles／GIS／JSON 保留；原生 load-error picker 依賴僅在使用時建立，不常駐初始化。

Nexus 編輯器提供第三方授權資訊，連結固定來源、MIT 與彙整完整 dependency／公共素材授權文字的 THIRD-PARTY-NOTICES.txt；原 LICENSE、著作權與第三方原檔保留。語系沿用 Nexus 字典與英文 fallback，未知長篇／動態訊息仍可能英文；不翻譯使用者地名或專案內容。沒有資料結構／migration／正式 DB／付費依賴變更。測試是隔離帳號資料及真實 Chromium，正式帳號跨裝置、Safari／實機與大型地圖仍屬 #60 人工驗收，不能視為已正式驗收。

## 世界觀地圖首頁（Refs #90；工作分支 feat/world-map-home-20261020）

已實作地圖優先首頁、同一核心切圖／預覽／扳手編輯、多圖與 scope/parent metadata、原生政治／地形／溫度／降水／生態圖層、縮放／拖曳／全螢幕。瀏覽狀態按圖保留，變更版面前讀取即時視圖；載入文件 ID/blob guard 禁止切圖期間儲存上一張內容。舊世界觀與角色資料不刪；無 migration／正式 DB 操作，本輪不合併或部署正式環境。

程式 `461f0ed`；[CI 39386733552](https://github.com/changmonica02/Nexus/actions/runs/39386733552) 通過：36 項地圖／IDB／port／i18n、39 項相關回歸、實際核心及既有角色 UI 兩組 Chromium；含保存／Quick Load、失敗草稿復原、離線重開、原生專案往返、PNG/SVG、多圖分類／詳細圖、唯讀無寫入、同一 iframe、全螢幕、縮放拖曳／編輯返回視圖、1440/820/390 無水平溢出、語系與使用者資料保護。Nexus／核心／語系 adapter TypeScript、production/omit=dev build 通過；相關 ESLint 0 errors／28 warnings。這是隔離資料與瀏覽器驗證，不代表正式帳號或實機驗收。

世界觀外層含確認／取消接既有 i18n；核心共用 452 個英文／繁中 UI 條目，包含主工具列、選單、圖層、設定與常見提示／錯誤。未收錄長篇說明／動態訊息回退英文；SVG、輸入、自訂預設及原生專案文字（含與 UI 同名的 rich-text）不翻譯。城鎮詳細圖為獨立專案，不提供街道建築生成。正式帳號／跨裝置與 Safari／實機、大型地圖仍留 #60。

## 2026-10-20 世界觀地圖編輯器（Refs #88；已實作／隔離驗證；正式整合進行中）

- **正式整合（PR #89）**：使用者已授權安全檢查後合併及一般正式部署；實際合併／部署證據以 PR #89 與 #60 為準。Preview 22b8696 的 TS2688 原因為 production 安裝環境省略 fork 的 devDependencies；核心 npm ci 改為明確 --include=dev，安裝快取標記升版避免沿用不完整依賴。CI build 使用 NODE_ENV=production／NPM_CONFIG_OMIT=dev 重現環境並驗證。此修正不變更資料契約或正式 DB。
- 分支 `feat/world-map-storage-20261020`，依最新 SPEC `64c8e0e`；本輪程式 `43246e4`。固定 Azgaar v1.154.2/b4a0dcb 原始碼已保存於 vendor/azgaar，可自主修改，不依賴第三方線上編輯網站、不追蹤上游升級；Nexus metadata_version 與 engine_version 分開。
- **M1／M2 已接線**：世界觀「地圖」區、多圖新增／命名／開啟／複製／刪除還原、完整隔離核心、本機保存及關閉重開、原生 .map 匯入／匯出、SVG／PNG；保留原主要圖層／工具及 Quick Load。核心、世界觀 UI、Repository／同步保持分離；沒有新增 schema、RPC、RLS、付費服務或正式資料操作。
- **M3 隔離驗證通過，正式／裝置驗收未完成**：10 秒本機 recovery checkpoint 不進 outbox；60 秒／明確保存才提交 canonical 專案；owner／revision／SHA、失敗保留、舊草稿衝突與 token 清除保護。公開工具快取支援已開工作區內離線重開；備份包含 canonical／recovery，按帳號匯出，跨帳號匯入拒絕且不清其他帳號 cache。工作區 flush／備份先保存開啟中的地圖，不另重送 binary。
- **自動化**：[CI 39371050349](https://github.com/changmonica02/Nexus/actions/runs/39371050349) 成功，20+4+10 項地圖／IDB／port 測試、39 項既有相關回歸，上游核心 tsc/Vite、Nexus TypeScript/build 通過；ESLint 0 errors／3 refs warnings。實際 fork + 世界觀元件的 Chromium 完整流程通過，含原生城鎮編輯、保存／Quick Load、失敗後 reload 草稿復原、離線修改／重開、完整專案往返後編輯、PNG/SVG、native 無效匯入不覆寫、多圖／複製／刪除還原；pageerror=0。這是隔離介面，不是正式帳號或實機。
- **主要檔案**：vendor/azgaar、integrations/azgaar、scripts/prepare-world-map.mjs／build-world-map.mjs、WorldMapManager／WorldMapEditor、coreClient／offlineCore／WorldMapRepository、NexusApp／CharacterProfileView、StorageAdapter 實作／WorkspacePersistence／types、地圖測試及分支限定 CI。Node >=24；npm run dev/build 會先從本地 fork 產生工具。生成產物忽略，不提交；首次 import 腳本遇到未標記非空 fork 會拒絕覆寫。Windows npm.cmd launcher 已處理，Windows 實機未驗證。
- **保留事項／#60**：正式同帳號跨裝置與真實同步失敗／重登入、Safari／平板／手機、Windows、大型地圖 heap／容量／雲端成本仍需驗收。既有 immutable 舊專案附件保守保留，未實作安全 GC；首版只接受固定 1.154.2 原生版本，不自動轉換其他版本。外部 Watabou／雲端助手受 sandbox 限制；未快取外部字型離線可能 fallback，離線圖片輸出未獨立驗證。未新增整個 Nexus app shell 的離線啟動。地標連結 M4 不做，Issue #88 保持開啟。原始功能交付時尚未合併／部署；本次整合結果見 PR #89／#60。未操作正式 DB。

產品看SPEC、技術看ARCHITECTURE、歷史最新置頂；真實裝置驗收集中#60。

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


