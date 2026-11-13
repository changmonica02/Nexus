# Nexus — 現況與下階段交接

> 更新：2026-11-13。這是**目前狀態**，不是逐次執行日誌；已完成的決策與過程收錄 [HISTORY](HISTORY.md)，產品要求見 [SPEC](SPEC.md)，資料契約與實作邊界見 [ARCHITECTURE](ARCHITECTURE.md)。舊的 Draft／未部署敘述不再作為本文件的現況依據。

## 已完成的本階段

- **四階段學習／字典整合**：#168～#172 已合併。學習 Session 的安全離開／恢復、忘記卡到期不搶畫面、私人隱藏，與公開字典的穩定 ID 列表、待審核口徑、刪除引用保護、統一構詞編輯、分類搜尋、變體及雙向單字關聯，沿用既有權限、CAS、草稿／Review 與人工發布。
- **字典搜尋效能**：#173 的 `20261112120627_dictionary_catalog_query_plan.sql` 已套用正式 Supabase；`search_dictionary_catalog` 按詞條 ID 匹配、計數、分頁後再彙整內容，不因效能優化改變公開／管理權限或範圍。
- **舊構詞退役與未決審核清理**：[#174](https://github.com/changmonica02/Nexus/pull/174) 已合併（`d83c3d3`）；`20261113035217_dictionary_legacy_morpheme_retired.sql` 和 `20261113035226_dictionary_review_cleanup.sql` 均已套用正式。管理員授權清理完成：3,796 筆 active Review、1,384 筆未決匯入項目已清；4 筆已完成匯入項目、正式詞條與學習資料保留。退役舊 grouping／轉換／待整理入口；新工作仍照正常 Review 流程，不應再次清除全部未決工作。
- **十大構詞語意分類**：[#175](https://github.com/changmonica02/Nexus/pull/175) 已合併（`f26fd37695260df410bdab167dcf6aabbc9134d7`）；`20261113061500_dictionary_semantic_ten_domains.sql` 已套用正式（ledger `20261113072536`）。十個大類、58 個小分類；「派生構詞」為無小分類的大類。已確認代碼改名直接採新語意；新舊不合的分類只清空失效大／小分類、不猜測其他值，保留概述、變體、關聯與識別。驗證函式不再允許舊 `cutting`、`flora_fauna`、`grammar_affixes/derivation` 等組合。
- **測試基準**：#175 對應 [GitHub Actions](https://github.com/changmonica02/Nexus/actions/runs/43380211710) 六項工作（study-b 重跑、interface-a、morpheme-contract、world-map、note、dictionary-c）最終全成功，Vercel 檢查成功。這證明該提交的自動化檢查通過，不等於 Android／iPad 或真實跨裝置人工驗收已完成。

## 正式資料與重要邊界

- 2026-11-13 #175 套用後唯讀核對：`dictionary_entries` 6,347、`dictionary_senses` 10,856、`study_cards` 10,155；當時 240 個構詞義項，無效分類 0 筆；`dictionary_guard` 觸發器正常啟用。這是**當時快照**，後續以現況重新查詢，不寫死為永遠固定的筆數。
- 公共字典只有一套；Word、Prefix、Root、Suffix 是現行識別與內容。構詞形式分類在 Entry，語意大／小分類、帶 UUID 的變體在 Sense；`NULL` 表示未分類。只有新版語意代碼可新寫入。Word 與構詞使用既有關聯，公開閱讀只顯示已發布內容。
- 草稿自動儲存與 CAS、人工 Review／核准及正式發布仍有區別；已發布內容不得由一般匯入直接覆寫。JSON 只忽略**明確已知**的退休欄位，未知欄位仍拒絕；CSV 不是包含所有變體與關聯的無損備份。舊字典分組表與舊草稿轉換 RPC 已退休，不要復活。
- PWA／IndexedDB／帳號同步與既有 Session 保護不因文件清理或構詞分類變動而重設；新的正式 Migration 一律先比對依賴與遠端 ledger，不要盲目推送所有本機待套用 SQL。

## 未完成的人工驗收（不要誤記為已完成）

- Android Chrome／安裝版 PWA、iPad Safari／PWA：構詞編輯與輸入法組字、字典面板拖曳、朗讀、離線冷啟動／重新連線、學習 Session 安全離開／私人隱藏與觸控操作。
- 真實帳號與跨裝置的同步、資料可見性及衝突情境；實際世界觀專案（大量條目、多地圖區塊、筆刷／路線、附件及跨裝置衝突）的人工驗收。
- 某些既有瀏覽器／CI 工作曾有偶發失敗並經重跑成功；**不可將重跑成功寫成已定位根因或已修復**。再次發生時使用當次日誌與環境診斷，不憑歷史猜測。
- 小型介面文案差異：`RelationTargetPicker` 的快速建立視窗實際提供字首／字根／字尾，但部分標題與提示仍稱「字首／字根」；這不影響正式分類、資料或權限，可待後續介面整理再修正。

## 下一輪開始前

先讀 `SPEC` 對應模組、`ARCHITECTURE` 的資料契約與本交接，再依 GitHub 的**最新**工作狀態確認需要實作的問題。避免重新啟動 #168～#175 已完成的舊部署、舊分類轉換、待整理 Review 或一次性清理流程；後續新需求另開獨立工作。此階段可以停止實作並休息；#168～#175 的本階段已完成部署沒有遺留待套用的指定 Migration。其他功能是否有新工作，仍以各自最新狀態判定。
