# Nexus — 當前狀態與下一步

產品見 [SPEC](SPEC.md)，技術契約見 [ARCHITECTURE](ARCHITECTURE.md)。本輪不修改 HISTORY、不合併、不部署，也不寫入正式資料庫。

## 本輪 #157：官方連動、IPA／Page 舊欄位退役、構詞義項介面

基線為最新 main `6fdedc1`，分支 `feat/official-linked-cards-schema-retirement`。PR #155 已合併（`452e233`），本輪不重做其構詞／自動保存／相鄰導覽功能；獨立 Draft PR [#158](https://github.com/changmonica02/Nexus/pull/158)，首筆提交 `c70895b`；最新 checks 以該 PR 為準。

- 已實作官方卡共享已發布內容解析、既有公共快取與離線備援、明確改為私人自訂。新下載連動；舊卡嚴格驗證未修改才轉換，其餘保留私人文字。來源去重／刪除結果／可變字典連結維持。列表、搜尋、預覽、正常及無盡 Session 共用解析；發布不改學習身份／版本／排程，新作答只保存一次實際顯示文字。
- 已移除 IPA locale/note 的型別、AI／完整交換輸出、RPC 及快照相依；舊 JSON 僅忽略此二已知欄位，未知仍拒絕。舊 Review 可核准、實際 IPA／版本差異仍保護，不改 #156 審核架構。
- 構詞關聯預設共用詞條；勾選後才選特定義項。缺少／單一義項與既有關聯的載入、取消、保存皆保留 ID 與原資料。
- Page study_items 實體退役；移除 migrateStudyDeck 及 Page-only 轉換。ensureDeck 直接建現行設定，備份／同步忽略已知舊欄位而保留現行 Study 資料、有效 outbox 與其他 Page 內容。不清 IndexedDB，維持 v9／備份 v4。
- SPEC 補充最小實作細節；ARCHITECTURE 記錄解析優先序、帳號邊界、退役相容、鎖與發布／回復限制；HISTORY 未修改。

### 183b84c 發布前審查修正

- 根因一：IPA Migration 漏改 `search_dictionary_relation_targets()` 的 PL/pgSQL 發音搜尋，DROP 後會在呼叫時才失敗。現改為先精準替換舊欄位表達式為 p.ipa；其餘搜尋來源、rank、分頁／總數及管理員權限不變。
- 根因二：先前重寫 snapshot normalizer 遺漏正式版 `dictionary_without_verification()`／`dictionary_core_content()`。現依正式定義外包 IPA 清理，保留查證退役、詞源來源、核心概念、word_segments、關聯與詞形的完整相容；未知／真實內容與 revision 差異仍拒絕，不改 #156 架構。
- 正式唯讀核對 ledger 最後仍為 `20261105083358`；三個待刪欄均存在，資料基準與下節一致。函式／trigger 本體及 pg_depend 掃描沒有其他未處理的實體欄位相依；僅 locale CHECK 隨欄位移除，沒有 CASCADE。保留的 locale/note JSON 字串是已知舊交換相容，並非實體欄位存取。
- 發現隔離 fixture 原 workspace RPC 尚缺生活清單分支，已補載既有 Migration。現在相關 11 個正式函式與隔離基線除 CRLF 外逐字一致，以唯讀 hash fixture 固定；隔離 auth／資料仍為測試替身，未聲稱全庫 Schema／基礎設施完全一致。
- 新 5 項相容測試已通過：三份指定 Migration 依序、完整正規化／舊 Review 核准、真實來源／核心內容／版本衝突、構詞搜尋全部來源／排序／20 筆跨頁與權限、各交易失敗回滾（含未知 view 相依保留）。原 4 項 Migration 回歸也通過。本次 TypeScript、完整 Build 通過；範圍 ESLint 0 errors／21 既有 warnings。擴大回歸及本次遠端 checks 待收尾，最終結果以 PR #158 本輪交付註記為準；不沿用 183b84c 的綠燈作為本次證據。
- SPEC 產品需求未改，故不修改 SPEC；ARCHITECTURE 已補完整正規化與搜尋相依。HISTORY 未修改。所有正式操作限制保留，修正後仍維持 Draft，等待人工審查與另外的指定 Migration 授權。

### Migration／正式狀態

三份獨立交易依序：`20261105091439_official_card_linked_content.sql`、`20261105091518_dictionary_pronunciation_columns_retired.sql`、`20261105091519_page_study_items_retired.sql`。均只在隔離 PGlite PostgreSQL 執行，**未套用正式**。DROP 的舊 IPA 資料與經使用者授權捨棄的未轉換 Page-only 卡不可直接回滾；須有事前備份並向前修復。

正式唯讀預檢確認三個待刪欄仍存在，study_cards／study_card_states 各 10,155 筆、事件 84、設定 11、IPA 7 筆（locale 非 NULL 2 筆、note 0）；刪欄會捨棄這 2 筆 locale 值，保留 IPA 與識別；唯讀亦確認 Page 舊欄僅 2 筆非 NULL，全部 []；實際執行前仍須重查非空內容、卡／狀態／事件／設定筆數、RLS／ACL 及 RPC。Word segments 已以 `20261105083358` 登錄；舊 IPA 清空 Migration `20261105033000` 尚未登錄，repo 改為明確 superseded no-op，新刪欄位 Migration 亦能處理已執行舊觸發器的隔離環境。正式 ledger 與 repo 部分版本不同，不可直接 db push 所有 pending Migration。另行授權後指定套用，先資料庫、後前端。

### 驗證與剩餘工作

- 已通過新隔離 SQL 四項：舊草稿核准、舊交換欄位、未知欄拒絕、官方保守轉換與發布／解除、下載去重、權限／帳號隔離、獨立交易失敗回滾、刪欄後現行 cards／states／events／settings 完全保留。官方純模型包含 6,301 卡分批解析與有界快取、離線、私人卡、一次作答與排程不變；新增相同時間 metadata 合併／待傳私人修改保護。
- Chromium 官方連動流程通過：1280／820／390px，發布重讀、離線快取、私人自訂、重新載入、正常與無盡 Session、作答事件及版本穩定。構詞編輯器中英文／多尺寸及勾選取消保存回歸通過。
- 本機擴大 51 個字典／學習／同步非瀏覽器測試檔：50 個整批通過（含 6,300 筆完整交換與 6,301 卡清除），既有 VariantEditor 測試直接呼叫 Hook 的錯誤修正為 React render 後單獨 5 項通過；另 3 個官方身份／PWA cache／scheduledStudy 檔通過。新版隔離 SQL 四項與官方模型四項再跑通過。
- TypeScript、完整 Webpack production Build 通過，範圍 ESLint 0 errors／43 warnings。Chromium 編輯器、官方連動、既有官方私人卡與 PWA 殼層通過；production build 的隔離 PWA Data／Dictionary 流程通過（離線編輯／作答／PDF／重連／衝突／帳號隔離）。測試的 autosave 等待競態以等待真正保存狀態／明確失敗場景修正，不停用產品保存或安全驗證。
- 程式提交 `71a405c` 的 [GitHub Actions 42032937046](https://github.com/changmonica02/Nexus/actions/runs/42032937046) 全部成功（含本輪 SQL／官方卡／編輯器、舊清除與同步、筆記／地圖、TypeScript、ESLint、Build）；Vercel checks 成功。後續僅補隔離 SQL 舊 IPA RPC insert／未知欄位斷言（本機四項再跑成功）及本交接資料；該提交的最終狀態以 PR #158 checks 為準。
- 待實機：Safari／iPad、Android 安裝 PWA、真實帳號雙裝置更新與離線私人修改交錯。Chromium 觸控 viewport 不等於實機。受保護部署不建立分享連結或改權限，正式審核 #156 仍獨立待查。
- 183b84c 後的兩項發布阻擋已依上節修正；仍須本次最終回歸／CI 與人工審查。維持 Draft；正式 Migration 必須另獲授權，因 main 可能自動發布，不建議在指定資料庫 Migration 就緒前直接合併。實機驗收與 #156 仍按上列限制保留。

## 已合併工作與正式狀態

- PR #151、#152、#153 已合併，以使用者最新交接及 main 為準，不重新實作。#151 squash `9f5cbaee` 的 GitHub Production deployment `7566581489` 狀態為 success（2026-11-05 06:06:57 UTC）。這是部署狀態，不能代替真實帳號／裝置功能驗收。
- 整組清除沿用最後伺服器時間與原事件有效投影，不使用整組重置世代。使用者已接受裝置時間誤差。使用者確認 study clear Migration 已正式套用；本輪唯讀 migration 紀錄也可見名稱 `study_deck_clear_20261105032115`，實際登錄版本 `20261105060444`。本輪沒有重新套用。
- `20261105033000_dictionary_ipa_only.sql` 尚未正式登錄，本輪已由指定實體刪欄位方案取代（見上），未代為套用。
- `/dictionary/admin/reviews` 的正式版本網址轉向 Vercel 保護登入。Vercel 連線的 team scope 回傳 403；受保護頁面讀取工具又因可能建立臨時分享連結遭自動審查拒絕，沒有繞過或改動存取設定。因此正式登入後審核操作及資料顯示未驗證，未修改審核資料。
- 詞形選單僅檢查／回報：`inflections.ts` 可辨識獨立 n./v./adj./adv.，但 `adj./n.` 等複合標記無法依各詞性提供完整合法類型；正式資料確有這類標記。本輪沒有修改選單或詞性驗證，需另行授權修正。

## 待驗收／合併前條件

- 審查新 SQL／資料相容與發布順序，另行授權正式 Migration 與合併；新功能尚未正式啟用。
- Safari／iPad、Android 安裝 PWA、虛擬鍵盤完成／中英文輸入法及真實跨裝置同步／清除仍待實機驗收。Chromium 觸控 viewport 不等於實機 Safari／Android。
- 受保護 Production 審核頁需有已授權的存取方式後再驗證；若工具會建立臨時分享連結，須另獲明確授權，不調低部署保護。
- 世界觀／地圖／內建範本全站語系與既有地圖原生工具的實機待辦沿用 #60，未因本輪字典測試而宣稱完成。已儲存的使用者內容不自動翻譯。
