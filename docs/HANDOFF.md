# Nexus — 當前交接（2026-10-18）

產品看SPEC、技術看ARCHITECTURE、歷史最新置頂；真實裝置驗收集中#60。

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
