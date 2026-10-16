# 字典內容審核狀態退場：操作與回復

## 範圍

移除每段內容的 verification，保留詞源與來源。這不會清空常駐匯入工作，也不會繞過 Review Draft、版本歷史、人工發布或權限檢查。

Migration：supabase/migrations/20261016060000_dictionary_retire_verification_state.sql。依賴既有 revision lifecycle、composition shared 及現行字典 Schema。正式執行前以 ledger／實際函式核對；不要依檔名排序重播已套用 Migration。

## 部署順序與相容性

1. 確認最新 main、前後端差異、測試及回復資料可用。唯讀取得當下 Entry／Sense／詞源／active Review／匯入工作數量；不要把歷史筆數寫成遷移前提。
2. 協調前端更新窗口；暫停自己的編輯操作。舊前端仍送 verification／verification_note 的詞源寫入會被新 SQL 明確拒絕，不會靜默丟資料。舊檔／本機 Session 不清除；先下載備份。
3. 套用單一增量 Migration。5 秒取鎖、120 秒 statement 上限；SQL 在同一交易內建立 private backup、移除欄位、遷移 active 工作、逐列檢查後才 commit，並通知 PostgREST schema reload。
4. 唯讀確認 public 無 verification 欄位、來源仍在、數量／Stable ID／內容比較通過、原 ACL／RLS 保留、備份無 app 存取。通過後發布相應前端，刷新舊分頁。
5. active Review revision 已變時重載；常駐工作僅移除已退場狀態欄位的差異，來源差異／選擇轉為 data_source，重算 pending_count；按「重新比對」後核對保留的決策，不重匯已成功項目。匯入工作、原始候選及操作憑證不刪除。

## 舊交換檔／本機作業

新匯出只含 data_source。舊檔仍含 verification／verification_note 時明確報錯，不能靜默捨棄來源。保留原檔，在副本移除 verification，將每個詞源 verification_note 的來源文字搬到 data_source；若兩欄同時有不同內容，先人工確認，不能覆蓋。Entry／Sense／附屬 ID 與版本不可更改。完成後重新預覽／比對，舊 baseline 不得強制套用。

資料庫中已完成歷史、Audit、operation receipt、raw_candidate 保留原樣，屬不可覆寫歷史而非現行內容狀態欄位。舊作業若缺可靠基準，保留原資料並重新比對，不猜測／重做已套用內容。

## 備份與回復界線

dictionary_verification_backup 保存受影響完整原始列、active Review／常駐工作遷移前後影像及被替換函式原定義。schema 不公開，PUBLIC／anon／authenticated 無存取權，勿改為前端可讀。

- commit 前任一錯誤：整個交易 rollback，欄位、來源、工作及函式恢復；隔離測試已實際驗證。
- commit 後：優先修復前端／RPC 映射，來源與內文仍完整；可由操作員唯讀備份核對來源及原狀態。不可把舊備份覆蓋到已產生新修改的 Review／工作，不可直接回退舊前端後繼續儲存。
- 如確需復原已退場欄位，另做經測試的前向修復 Migration，先核對遷移後影像與目前 revision／新增資料，再恢復 metadata；不得停用 RLS／Published guards／觸發器以便強制覆寫。本次不提供會覆蓋後續使用者工作的盲目還原 SQL。備份保留，不自動清除。

## 驗證證據

測試覆蓋實體欄位退場、來源／ID／內容保存、交易回滾、active Review CAS、人工發布、非管理員拒絕、private backup／cleaner 存取拒絕、常駐決策／operation／原始候選保留及舊私人字源表相容性。隔離 Chromium 覆蓋桌面／平板／手機尺寸；實際 iPad Safari 與正式帳號仍由使用者驗收（Issue #60）。

## 2026-10-16 正式執行結果

ledger 20261016150215 dictionary_retire_verification_state，一次套用成功。public verification 欄位 3→0；來源／關聯／詞源對 private backup 扣除目標欄位後逐列差異均為 0。Entry 6,304、Sense 11,524、詞源 68、active Review 925、常駐工作 28 保留，沒有遺失 Review／工作 ID。2 份 active Review 遷移並遞增版本，常駐工作沒有需修改的舊欄位（0 份）。RLS／3 個既有函式 ACL 與 definer 屬性維持原狀；app 無 backup schema／cleaner 權限。Security advisors 與套用前相同（7 INFO、43 既有 SECURITY DEFINER 提醒、1 既有密碼保護提醒），未新增問題。沒有字典內容匯入／發布、私人卡片或學習資料寫入。前端部署由 PR #78 追蹤。
