# Nexus — 當前交接（2026-10-16）

產品規格以 SPEC 為準；技術契約見 ARCHITECTURE，人工驗收集中 #60。

## 本輪字典修復

- 已實作學習字典詳情 Modal：僅 linked 卡翻面後提供入口，詳情／完整管理員編輯器保護原 Session、私人內容及評分；移除技術說明。
- 修正 save／discard Review 多傳發布專用 content_verified；不更改後端簽名，發布查證／RLS／CAS 保留，fake RPC 增加精確參數驗證。
- 移除舊 source_forms 編輯／AI／CSV／Draft 模型；共表 relation_hint、結構化詞形與 Stable ID 保留。舊交換檔明確報錯，舊本機 Session／原檔不清除。
- 新 SQL：`20261016050000_dictionary_retire_source_forms.sql`；隔離測試含回復／後續修改拒絕覆寫，操作順序與回復腳本見 `docs/operations/DICTIONARY-SOURCE-FORMS.md`。正式部署及最終測試結果待本輪結案更新，不可先視為已部署。

## 已核實的先前 Migration

正式 Nexus ledger 已存在 official_private_card_identity（20261016062703）及 creation_template_library（20261016062716），與使用者回報一致；本輪沒有重播。第五輪 #69～#75 均已合併，角色模板／官方卡功能仍待 #60 真實帳號驗收。

## 人工驗收

- 真實 iPad Safari／手機：學習翻面→詳情 Modal→管理員完整編輯→儲存／發布／未存關閉→詳情→原卡，不能多出評分或重開 Session；一般用戶／無連結卡無編輯入口。
- 測試詞條新草稿、既有／多份 Review、衝突／重載與人工發布；舊註釋消失，詞形與構詞提示仍可編輯。
- 原本常駐待審工作重讀／重新比對，保留未退場欄位的決策；不要重匯已完成的歷史工作。未配可靠 baseline 的舊角色仍保留資料並拒絕猜配。
