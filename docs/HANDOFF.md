# Nexus — 當前交接（2026-10-19）

## 2026-10-20 世界觀地圖首批（Refs #88；尚未接入產品）

- 工作分支 `feat/world-map-storage-20261020` 由地圖 SPEC 分支 `ef002c8` 建立，未合併 main、未部署、無 migration。使用者授權直接修改 GitHub 分支；環境 Git clone 仍因 proxy:8080 無法連線而失敗。
- 已新增世界觀地圖 metadata 與 StorageAdapter Repository：多地圖、新增／命名／複製／軟刪除還原、原生專案 immutable 附件、單批原子寫入、owner／revision／SHA-256 檢查及相同 bytes 不重排傳輸。**這些是尚未接入 UI 的資料層能力，不能稱為使用者可用功能。**
- M0 部分查證：固定來源 Azgaar v1.154.2（b4a0dcb），MIT；原生 prepareMapData／uploadMap 與單槽 lastMap 已核對。上游套件／素材未複製；第三方素材授權、完整 build、體積／記憶體量測、原生 .map 實際往返仍未完成。
- 通過：Node 24.19.0 執行 `node tests/worldMap.test.cjs`，19/19 契約測試（合成檔案與記憶體替身）。已寫 5 項 `tests/worldMapIndexedDB.test.cjs`，尚未執行。TypeScript／build／整合回歸／瀏覽器／真實帳號／Safari 均未執行；不能以本輪測試代替。
- 下一批：先取得可驗證的上游建置，驗證 iframe 安全隔離與非同步載入成功／失敗 handshake，再接世界觀入口及既有 flush/adopt Page 流程。不得直接同源執行未隔離的匯入 SVG，或在附件缺失時以新圖覆寫。immutable 舊附件暫不 GC，連續大圖保存容量與節流策略仍需實測。M1 編輯器、M2 UI／工作區接線、M3 原生／圖片匯出及完整備份同步安全驗收全部未完成；地標連結保持 M4。

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
