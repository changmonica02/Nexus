# 官方私人卡片身份相容更新（2026-10-16）

> 2026-10-16 已唯讀核實正式 Nexus ledger：`20261016062703 official_private_card_identity`，與使用者回報一致；下方為操作／相容說明，不再代表此 SQL 待套用。本輪不重播。


SQL：`supabase/migrations/20261016030000_official_private_card_identity.sql`。**未套用正式環境，需另行授權**。

## 依賴及資料保護

先核對正式 ledger／schema 已具備 Study、字典、字典連結、Workspace、20261009 官方集及 20261015 私人文字編輯契約；不要按歷史檔名盲目重播。先備份 study_cards、links、states、events、downloads 及官方來源映射，記錄各表筆數。

目前來源受舊 immutable guard 保護，來源為 payload.dictionary_entry_id；增量 SQL 在同一交易只補 official_source_entry_id，不更動文字、時間、FSRS、事件或 ID。來源缺漏時整體失敗，不猜 ID。先建立來源唯一索引，再移除使用可變字典連結的舊唯一索引；索引衝突將整體回滾，不刪重複資料。

更新 guard 僅允許私人 Front／Back、目前連結、soft-delete 及既有技術 revision 欄位變更，來源、owner、card／deck／pack 保護保留。下載去重包含已刪卡；來源離開新版 manifest 後也不重建。舊客戶端漏送新身份時由已儲存身份補回。單卡操作與連結變更同交易，無效 Published Word 連結令卡片更新一併回滾。原 RLS 與操作 RPC 權限不放寬。

## 套用順序

1. 前端可先部署：capability 不存在／離線時維持舊文字編輯，不開放新連結與單卡刪除控制。
2. 取得獨立批准、備份後，核對來源缺漏、來源重複與新函式依賴，再只套用此 SQL。
3. 驗證 authenticated 的 official_private_card_capabilities.version=1，刷新 PostgREST schema cache；核對筆數、來源與原排程／事件一致。用明確指定測試卡驗證修改／解除、更新不重複與 owner 隔離。
4. 重新整理前端後才顯示完整官方私人編輯能力。不要為驗證重新匯入字典／重建官方集。

## 回滾

交易失敗會完整回滾，勿留下半套欄位／索引／函式。前端回退可直接停用新入口；SQL 向舊客戶端相容，不應回套舊 guard 或舊去重索引（使用者可能已解除／重連）。若必須回退 DB，需另案先保留來源及私人修改，逐筆比對／備份後另行批准；不可清除新來源身份或重置資料。隔離 PGlite 測試不等於正式 staging／真實帳號驗收。
