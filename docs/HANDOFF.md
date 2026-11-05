# Nexus — 當前狀態與下一步

產品見 [SPEC](SPEC.md)，技術契約見 [ARCHITECTURE](ARCHITECTURE.md)。使用者於 2026-11-06 授權指定三份正式 Migration，已依序執行且驗證；HISTORY 11/05 紀錄已補齊。

## 本輪 #157：官方連動、IPA／Page 舊欄位退役、構詞義項介面

基線為 main `6fdedc1`，分支 `feat/official-linked-cards-schema-retirement`；PR #155 已合併（`452e233`），本輪不重做其功能。PR [#158](https://github.com/changmonica02/Nexus/pull/158) 已完成正式資料庫前置 Migration，等待程式合併及發布後實機驗收。

- 已實作官方卡共享已發布內容解析、既有公共快取與離線備援、明確改為私人自訂。新下載連動；舊卡嚴格驗證未修改才轉換，其餘保留私人文字。來源去重／刪除結果／可變字典連結維持。列表、搜尋、預覽、正常及無盡 Session 共用解析；發布不改學習身份／版本／排程，新作答只保存一次實際顯示文字。
- 已移除 IPA locale/note 的型別、AI／完整交換輸出、RPC 及快照相依；舊 JSON 僅忽略此二已知欄位，未知仍拒絕。舊 Review 可核准、實際 IPA／版本差異仍保護，不改 #156 審核架構。
- 構詞關聯預設共用詞條；勾選後才選特定義項。缺少／單一義項與既有關聯的載入、取消、保存皆保留 ID 與原資料。
- Page study_items 實體退役；移除 migrateStudyDeck 及 Page-only 轉換。ensureDeck 直接建現行設定，備份／同步忽略已知舊欄位而保留現行 Study 資料、有效 outbox 與其他 Page 內容。不清 IndexedDB，維持 v9／備份 v4。
- SPEC 與 ARCHITECTURE 已更新正式資料與相容規則；HISTORY 11/05 已依使用者要求加入當日成果，並區分 11/06 的正式資料庫套用日期。

### 183b84c 發布前審查修正

- 根因一：IPA Migration 漏改 `search_dictionary_relation_targets()` 的 PL/pgSQL 發音搜尋，DROP 後會在呼叫時才失敗。現改為先精準替換舊欄位表達式為 p.ipa；其餘搜尋來源、rank、分頁／總數及管理員權限不變。
- 根因二：先前重寫 snapshot normalizer 遺漏正式版 `dictionary_without_verification()`／`dictionary_core_content()`。現依正式定義外包 IPA 清理，保留查證退役、詞源來源、核心概念、word_segments、關聯與詞形的完整相容；未知／真實內容與 revision 差異仍拒絕，不改 #156 架構。
- 先前的唯讀檢查確認三個待刪欄及相依；2026-11-06 正式執行後再次驗證欄位已不存在，字卡、狀態、事件及 IPA 數量維持不變。原本 `locale` CHECK 隨欄位移除，沒有 CASCADE。
- 發現隔離 fixture 原 workspace RPC 尚缺生活清單分支，已補載既有 Migration。現在相關 11 個正式函式與隔離基線除 CRLF 外逐字一致，以唯讀 hash fixture 固定。另補正式既有 service_role 函式 EXECUTE／default grant，11 個函式 ACL 也完全對齊並驗證 Migration 保留；沒有正式權限變更。隔離 auth／資料仍為測試替身，未聲稱全庫 Schema／基礎設施完全一致。
- 新 5 項相容測試已通過：三份指定 Migration 依序、完整正規化／舊 Review 核准、真實來源／核心內容／版本衝突、構詞搜尋全部來源／排序／20 筆跨頁與權限、各交易失敗回滾（含未知 view 相依保留）。原 4 項 Migration 回歸也通過。本次 19 個相關回歸檔全通過（含 6,301 卡清除／同步、生活清單、字典／交換／構詞）；正式發布與官方卡 Chromium 回歸、TypeScript、完整 Build 通過；範圍 ESLint 0 errors／21 既有 warnings。程式提交 `610252e` 的 [GitHub Actions 42061834916](https://github.com/changmonica02/Nexus/actions/runs/42061834916) 與 Vercel 全部成功；後續只補 service_role ACL fixture／斷言（本機 9 項 SQL 再跑通過）及交接，最終結果以 PR #158 本輪交付註記為準，不沿用 183b84c 綠燈作為本次證據。
- SPEC 需求未再變動；ARCHITECTURE 保留搜尋、正規化與交換相容技術契約；HISTORY 已更新。正式 Migration 已獲使用者授權執行，實機與跨裝置仍待驗收。

### Migration／正式狀態

三份獨立交易已依序正式套用並在 Supabase ledger 登錄：`20261105163818`（`official_card_linked_content_20261105091439`）、`20261105163846`（`dictionary_pronunciation_columns_retired_20261105091518`）、`20261105163922`（`page_study_items_retired_20261105091519`）。事後查核新版字卡 10,155、狀態 10,155、事件 84、設定 11、IPA 7 筆均保留；`locale`、`note`、`study_items` 已不存在。原 2 筆 `locale` 舊值被實體刪除。備份／PITR 可用復原點未能透過目前工具查證，不能宣稱可直接還原已刪內容。

正式套用前的唯讀基準：字卡／狀態各 10,155、事件 84、設定 11、IPA 7；原 `locale` 非 NULL 2 筆、`note` 0 筆；Page 舊欄 2 筆 []。正式套用後數量不變，三個欄位均已移除，官方內容 RPC 存在、authenticated 有權執行而 anon 無權執行，工作區／官方包 Page RPC 已清除 `study_items` 相依。舊 IPA 清空 Migration `20261105033000` 尚未登錄，由本輪實體刪欄方案取代；不得再對正式資料庫盲目執行全部 pending migrations。

### 驗證與剩餘工作

- 已通過新隔離 SQL 四項：舊草稿核准、舊交換欄位、未知欄拒絕、官方保守轉換與發布／解除、下載去重、權限／帳號隔離、獨立交易失敗回滾、刪欄後現行 cards／states／events／settings 完全保留。官方純模型包含 6,301 卡分批解析與有界快取、離線、私人卡、一次作答與排程不變；新增相同時間 metadata 合併／待傳私人修改保護。
- Chromium 官方連動流程通過：1280／820／390px，發布重讀、離線快取、私人自訂、重新載入、正常與無盡 Session、作答事件及版本穩定。構詞編輯器中英文／多尺寸及勾選取消保存回歸通過。
- 本機擴大 51 個字典／學習／同步非瀏覽器測試檔：50 個整批通過（含 6,300 筆完整交換與 6,301 卡清除），既有 VariantEditor 測試直接呼叫 Hook 的錯誤修正為 React render 後單獨 5 項通過；另 3 個官方身份／PWA cache／scheduledStudy 檔通過。新版隔離 SQL 四項與官方模型四項再跑通過。
- TypeScript、完整 Webpack production Build 通過，範圍 ESLint 0 errors／43 warnings。Chromium 編輯器、官方連動、既有官方私人卡與 PWA 殼層通過；production build 的隔離 PWA Data／Dictionary 流程通過（離線編輯／作答／PDF／重連／衝突／帳號隔離）。測試的 autosave 等待競態以等待真正保存狀態／明確失敗場景修正，不停用產品保存或安全驗證。
- 程式提交 `71a405c` 的 [GitHub Actions 42032937046](https://github.com/changmonica02/Nexus/actions/runs/42032937046) 全部成功（含本輪 SQL／官方卡／編輯器、舊清除與同步、筆記／地圖、TypeScript、ESLint、Build）；Vercel checks 成功。後續僅補隔離 SQL 舊 IPA RPC insert／未知欄位斷言（本機四項再跑成功）及本交接資料；該提交的最終狀態以 PR #158 checks 為準。
- 待實機：Safari／iPad、Android 安裝 PWA、真實帳號雙裝置更新與離線私人修改交錯。Chromium 觸控 viewport 不等於實機。受保護部署不建立分享連結或改權限，正式審核 #156 仍獨立待查。
- 兩項發布前阻擋已修正；正式 Migration 於 2026-11-06 依使用者授權套用成功且事後核對通過。接下來驗證 PR #158 合併後的建置、正式前端與真實裝置；Safari／Android、雙裝置離線交錯與 #156 均未宣稱完成。

## 已合併工作與正式狀態

- PR #151、#152、#153 已合併，以使用者最新交接及 main 為準，不重新實作。#151 squash `9f5cbaee` 的 GitHub Production deployment `7566581489` 狀態為 success（2026-11-05 06:06:57 UTC）。這是部署狀態，不能代替真實帳號／裝置功能驗收。
- 整組清除沿用最後伺服器時間與原事件有效投影，不使用整組重置世代。使用者已接受裝置時間誤差。使用者確認 study clear Migration 已正式套用；本輪唯讀 migration 紀錄也可見名稱 `study_deck_clear_20261105032115`，實際登錄版本 `20261105060444`。本輪沒有重新套用。
- `20261105033000_dictionary_ipa_only.sql` 尚未正式登錄，本輪已由指定實體刪欄位方案取代（見上），未代為套用。
- `/dictionary/admin/reviews` 的正式版本網址轉向 Vercel 保護登入。Vercel 連線的 team scope 回傳 403；受保護頁面讀取工具又因可能建立臨時分享連結遭自動審查拒絕，沒有繞過或改動存取設定。因此正式登入後審核操作及資料顯示未驗證，未修改審核資料。
- 詞形選單僅檢查／回報：`inflections.ts` 可辨識獨立 n./v./adj./adv.，但 `adj./n.` 等複合標記無法依各詞性提供完整合法類型；正式資料確有這類標記。本輪沒有修改選單或詞性驗證，需另行授權修正。

## 待驗收／合併前條件

- 正式 Migration 已套用；後續仍須確認 PR #158 合併結果、Vercel Production 部署狀態，以及真實帳號／裝置操作。
- Safari／iPad、Android 安裝 PWA、虛擬鍵盤完成／中英文輸入法及真實跨裝置同步／清除仍待實機驗收。Chromium 觸控 viewport 不等於實機 Safari／Android。
- 受保護 Production 審核頁需有已授權的存取方式後再驗證；若工具會建立臨時分享連結，須另獲明確授權，不調低部署保護。
- 世界觀／地圖／內建範本全站語系與既有地圖原生工具的實機待辦沿用 #60，未因本輪字典測試而宣稱完成。已儲存的使用者內容不自動翻譯。
