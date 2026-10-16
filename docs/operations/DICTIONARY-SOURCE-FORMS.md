# 舊字形註釋退場操作

本輪使用者已授權具備完整驗證、資料保護與回復方案的正式變更。唯一新檔案是 `supabase/migrations/20261016050000_dictionary_retire_source_forms.sql`。不要重播已套用的 `official_private_card_identity`／`creation_template_library`，以正式 ledger 名稱與 schema 為準。

## 順序與安全邊界

1. 閱讀正式 RPC 簽名、種類／筆數、active Review／待審工作與 RLS／函式 ACL；不下載使用者內容至公開文件。
2. 用現有實際 migration stack 在隔離 PostgreSQL 驗證新 SQL、回復成功／拒絕覆寫、非管理員權限、發布確認、CAS、Stable ID 與結構化詞形保留。PGlite 是隔離 PostgreSQL，不是 Supabase staging／JWT／Safari 驗收。
3. 以原子交易先備份再清理，既有 dictionary advisory lock＋表鎖；5 秒 lock timeout、120 秒 statement timeout，失敗整筆 rollback。備份 schema 非 API exposed，PUBLIC／anon／authenticated 無存取權，沒有應用讀寫入口。
4. 活躍 Review 的 candidate／base_snapshot 僅剔除退場種類、revision 遞增；既有真實衝突不消失。受影響常駐匯入移除退場差異但保留其他決策，標 stale 強制重新比對；不重播 receipts／operation IDs。舊瀏覽器 pending 請求會由 CAS／CHECK 阻擋，必須保留原檔並重讀。
5. 比較遷移前後 13 組 live／history／receipt 的 row count＋逐列 hash 摘要；包括全部 Entry／Sense／inflections／relations／讀音／補充資料、Published 歷史、import receipts 及仍有效 relation_hint。任何非預期變更中止交易。
6. 正式執行成功後核對 ledger、舊種類=0、有效提示／Entry／Sense／Review／待審 ID 數、原函式 ACL；notify pgrst 由 SQL 發出。不進行正式儲存／發布測試，以免改變使用者內容；登入真實帳號測試由 #60 追蹤。
7. 資料庫先部署，再合併前端。舊前端可讀少了 source_forms 的內容；新版不再輸出該欄，舊 CSV／AI／JSON 檔明確報錯，需原檔備份並重新匯出／比對，絕不自動推導詞形。字典詳情 Modal／RPC 修復不需要新函式。

## 回復

`DICTIONARY-SOURCE-FORMS-ROLLBACK.sql` 使用非 API 的 `dictionary_retirement_backup`。若部署後任何既有 Review／import 已改變或刪除，整筆拒絕，避免覆寫後續工作；需操作員個別比對，不能強制移除 guard。無後續變更時還原資料與舊 CHECK、仍遞增 revision，避免舊請求復活。回復前端需回退到對應版本，備份表及 audit 不自動刪除。

備份僅供災難復原，不是隱藏產品欄位／變體替代功能。正式驗收後由操作員安排外部備份／保留期限及清除 schema；本輪不刪除不可變歷史、Audit、原始檔與舊本機工作。

實際部署結果與 ledger 版本看 HANDOFF；檔案存在、Preview 成功不代表正式 SQL 已套用。

## 本輪正式結果（2026-10-16）

ledger `20261016072304 dictionary_retire_source_forms` 已成功。舊種類 6199→0、13 組指紋檢查通過；Entry 6301、Sense 11518、inflections 7135、relation_hint 67、active Review 927、常駐工作 28 保留。回復副本 source_forms 6199／Review 927，PUBLIC／anon／authenticated 不可存取，一次性 cleaner 已移除。沒有重播先前兩份 SQL，沒有發布／匯入字典或改私人學習紀錄。

Security advisors 與變更前一致（無新增）：[7 個 RLS 無直接 policy INFO](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)、[43 個 authenticated SECURITY DEFINER 提醒](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)、[既有洩漏密碼保護未啟用](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)。不為消除通用提醒而解除現有 owner／admin RPC 契約或擅自改 Auth 設定。
