# 核心概念與緊湊編輯器部署

Migration：supabase/migrations/20261017010000_dictionary_core_concept.sql。

## 資料契約

沿用 dictionary_learning_notes，不建立第二條字典寫入管線。現行 kind 固定 core_concept；舊 learning_decomposition／mnemonic_scenario 只留在交換相容轉換與不可變歷史。

同一 Entry＋Sense 的舊列依「口訣、記憶故事、各類 UUID」排序，以兩個換行完整串接，不 trim、不去除重複文字（原文可能有意重複）。不同 Sense 及 sense_id=null 分開。沿用第一列 ID，原始各列、source_id、revision、時間及函式定義保存至 dictionary_core_backup；合併後來源可由備份對照追溯。既有已是核心概念的多筆內容不任意再次壓成一筆。

遷移提升舊附屬列 revision；active Review 候選／baseline 轉換並增加 Review revision。raw_candidate、operation receipt、Audit、Published 歷史不改寫。常駐匯入工作有受影響內容時標記 stale，保留原始資料及其他決策後重新比對。

合併退場的 ID 記於 dictionary_core_aliases，只有管理員可 SELECT，app 無寫入權限；既有 guard 拒絕以舊 ID 再新增內容。此表不保存正文、不形成公開詞條，防止部分舊 JSON 重建重複內容。移除新的核心概念後，退場 ID 仍不可自動復活。

## 安全與回復

- 不停用任何 RLS／trigger／Published guard。使用版本化 schema 轉換，非管理員寫入、人工發布、CAS 及 Review 保護不變。
- 同一交易中加鎖、先備份，再合併、驗證剩餘內容及 10 組未涉及資料（Entry／Sense／歷史詞源／關聯／讀音／詞形／例詞／舊提示／metadata／Published history）指紋。非預期差異立即 rollback。
- migration_state 完成標記防止重跑串接文字；第二次執行不重做。
- commit 前失敗：整體回滾，隔離測試已實際驗證。commit 後若有問題，先保留當前輸入並停用舊版詞源寫入；用受限原始／遷移後影像核對，再作帶 revision 檢查的前向修復，不能盲目覆蓋後續工作。備份及 alias 不自動清除。
- 沒有重設 Entry／Sense、字卡連結、FSRS 或官方學習集。不將 relation_hint／source_forms 轉為核心概念。舊提示退出一般編輯／閱讀，但仍保留歷史及交換資料，不清空資料表。

## 正式順序

1. 核對實際 schema／ledger、guard 與 normalizer 的完整基準、目前筆數及安全 advisors。正式資料可能繼續增加，不寫死測試筆數。
2. 隔離 PostgreSQL／瀏覽器、typecheck／lint／build 與 PR Preview 通過後，協調前後端更新；短暫停止自己的字典編輯，備份未儲存輸入。
3. 套用本 SQL，再唯讀確認 core_concept 數量／原文／來源對照、10 組指紋、Review／匯入工作數量、RLS／ACL／alias 防重與 ledger。
4. 合併相應前端並確認 Vercel Production。舊分頁刷新、舊 Review 重載；舊工作重新比對。舊前端的舊 kind 寫入會明確失敗，不會直接覆蓋新格式。
5. CSV 新欄位 core_concept，舊 mnemonic_story 可讀；AI 新 core_concept，舊 story／learning_decomposition 僅讀取相容；JSON Bundle／Exchange 支援 core_concept 與舊格式轉換。過期 revision／合併退場 ID 必須重新匯出／比對，不繞過衝突保護。

## 驗證

隔離測試不是 Supabase staging，也不代表真實 Safari。自動化覆蓋合併順序、不同義項、重跑／回滾、來源、舊版本拒絕、人工發布、管理員 RLS、舊 ID 重建阻擋、交換相容，以及三種類型 × 桌面／平板／手機的操作與寬度。正式帳號／iPad Safari 驗收留 Issue #60。

## 正式狀態

目前 SQL 已準備及隔離驗證，尚未正式套用。正式 ledger／資料驗證與 PR 結果完成後更新。
