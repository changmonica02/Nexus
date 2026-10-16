# Nexus — 當前交接（2026-10-16）

產品規格以 SPEC 為準；技術契約見 ARCHITECTURE，人工驗收集中 #60。

## 本輪：完整移除內容審核狀態

- 已實作：閱讀／編輯／AI／JSON／CSV／Markdown／舊字源入口不含逐筆 verification；詞源來源改為 data_source，集中資料來源說明一併校正。
- SQL 20261016060000_dictionary_retire_verification_state.sql 已具備受限備份、來源／Stable ID 完整性比對、active Review 與常駐工作 revision 遷移、交易回滾與權限測試；**正式已套用**（ledger 20261016150215 dictionary_retire_verification_state）。public verification=0；來源／詞源／關聯剩餘欄位逐列差異=0，Entry 6,304／Sense 11,524／詞源 68／active Review 925／匯入工作 28 保留；2 份 Review revision 前進，常駐工作無需改寫。原 RLS／ACL 保留、備份／cleaner 無 app 權限，security advisor 與前一致。部署／回復／舊檔說明見 operations/DICTIONARY-VERIFICATION-RETIREMENT.md。
- 驗證：129/129 字典／字源單元整合、49/49 學習與同步、5/5 隔離瀏覽器組（桌面／平板／手機尺寸）；新增來源衝突拒絕／舊決策移轉測試亦通過。TypeScript／Production Build 通過，ESLint 0 errors／456 既有 warnings。PR #78，Preview／Checks 已通過；最終合併與 Vercel Production 狀態由 PR／交付回報記錄。實機 Safari 保留 #60。今天實作整理已置 HISTORY 頂部。

## 新增修復：一般 Draft 發布按鈕（Refs #34）

- 已補 Word／Prefix／Root 的共用單筆發布入口；初次未儲存停用、dirty 先儲存、人工查證、伺服器版本前置比對、失敗保留／提示、成功重讀 Published 與清單失效。
- 舊版複製型 Review 保持禁止直接發布，正常 Review 發布流程不變。無 Migration、正式字典發布或資料修改。
- 驗證：23/23 相關單元／整合、2/2 隔離瀏覽器組（新草稿 3 類型 × 3 尺寸、刪除義項後發布、取消／錯誤／舊版本／舊 Review 保護及既有編輯器回歸）、TypeScript／Production Build 通過，ESLint 0 errors／456 既有 warnings。Preview／PR 合併狀態由修復 PR 記錄；真實 iPad Safari 請用既有 ab- 草稿驗收，留 #60 O 節。

## 本輪字典修復

- 已實作學習字典詳情 Modal：僅 linked 卡翻面後提供入口，詳情／完整管理員編輯器保護原 Session、私人內容及評分；移除技術說明。
- 修正 save／discard Review 多傳發布專用 content_verified；不更改後端簽名，發布查證／RLS／CAS 保留，fake RPC 增加精確參數驗證。
- 移除舊 source_forms 編輯／AI／CSV／Draft 模型；共表 relation_hint、結構化詞形與 Stable ID 保留。舊交換檔明確報錯，舊本機 Session／原檔不清除。
- 新 SQL：`20261016050000_dictionary_retire_source_forms.sql`；隔離測試含回復／後續修改拒絕覆寫，操作順序與回復腳本見 `docs/operations/DICTIONARY-SOURCE-FORMS.md`。**正式已套用**：ledger `20261016072304 dictionary_retire_source_forms`。舊註釋 6,199→0；Entry 6,301／Sense 11,518／詞形 7,135／有效提示 67／active Review 927／常駐工作 28 均保留，13 組指紋交易內驗證通過。一般用戶／匿名者無備份存取權，一次性 cleaner 已移除。

## 已核實的先前 Migration

正式 Nexus ledger 已存在 official_private_card_identity（20261016062703）及 creation_template_library（20261016062716），與使用者回報一致；本輪沒有重播。第五輪 #69～#75 均已合併，角色模板／官方卡功能仍待 #60 真實帳號驗收。

## 驗證與 PR

- PR #76：本輪程式、Migration／回復腳本及文件。Preview／最終合併狀態由 PR 檢查與結案回報核對。
- 字典 28 個單元／整合測試檔完整跑過；25 檔初次通過，3 檔舊 CSV／註釋 fixture 依新規格更新後重跑通過。最終聚焦契約 13/13、Identity／Lifecycle 4/4、學習／同步 29/29。6,300 交換與 6,301 常駐恢復規模測試通過。
- 5/5 隔離 Chromium 組：字典編輯器（含多 Review／儲存／捨棄取消）、學習詳情、分頁、常駐審核、完整交換。桌面／平板／手機尺寸不是實機 Safari／正式帳號驗收。
- TypeScript／Production Build 通過；ESLint 0 errors／456 既有 warnings。正式 security advisors 前後相同：7 INFO、43 既有 SECURITY DEFINER 提醒、1 既有密碼保護提醒，無本輪新增。
- 正式 SQL 初次 Connector requestState 過期；先核對 ledger／schema 未改變才重試，第二次成功，不重播已成功操作。沒有正式字典匯入／發布、私人字卡／學習事件或官方集重建。

## 人工驗收

- 真實 iPad Safari／手機：學習翻面→詳情 Modal→管理員完整編輯→儲存／發布／未存關閉→詳情→原卡，不能多出評分或重開 Session；一般用戶／無連結卡無編輯入口。
- 測試詞條新草稿、既有／多份 Review、衝突／重載與人工發布；舊註釋消失，詞形與構詞提示仍可編輯。
- 原本常駐待審工作重讀／重新比對，保留未退場欄位的決策；不要重匯已完成的歷史工作。未配可靠 baseline 的舊角色仍保留資料並拒絕猜配。
