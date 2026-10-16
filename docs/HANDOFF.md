# Nexus — 當前交接（2026-10-16）

產品契約以最新 SPEC 為準；實作看 ARCHITECTURE。正式啟用與使用者驗收分開，人工驗收集中 #60。

## 第五輪交付（#34／#43／#62）

- A #69 已合併：Word 義項詞性／中文／刪除同列，保留空白 Sense、關聯與 Review／CAS。
- B #70 已合併：官方來源與可修改私人字典連結分離，更新只新增缺漏，保留私人內容、刪除意圖及 FSRS。**SQL 正式未套用**，capability 缺少保留舊功能。
- C #71 已合併：正式學習翻面＋展開字典後，僅管理員可開完整詞條編輯器，保護 Session、評分與未存內容，返回重讀 Published。
- D #72 已合併：角色卡預覽、五欄基本資料、區塊／組件、扳手耐久浮窗、尺寸與長按／鍵盤移動；保留舊內容、附件與分頁。
- E #73 已合併：純結構私人模板、獨立管理頁、結構自動儲存與獨立角色實例。
- F #74 已合併：獨立創作資源庫、owner 草稿、不可覆寫公開版本、來源許可快照、最新下載、檢舉／上下架。**SQL 正式未套用**，新資源庫安全停用；私人模板不受影響。
- G 同來源安全更新／快照還原已實作，驗證與合併狀態見本輪 PR。三方合併保護個人資料／覆寫，消失或不相容組件進「保留內容」；交易內來源／角色 CAS。無新 Migration。

## 待使用者另行授權的正式 SQL

1. `supabase/migrations/20261016030000_official_private_card_identity.sql`：官方來源 backfill／guard／下載去重。順序及相容說明 `docs/OFFICIAL-PRIVATE-CARD-MIGRATION.md`。
2. `supabase/migrations/20261016040000_creation_template_library.sql`：創作資源庫五表、RLS／RPC。相依、staging 驗證及非破壞回復 `docs/operations/CREATION-TEMPLATE-LIBRARY.md`。

本輪未執行正式 Migration／批次資料寫入、字典匯入／發布、官方集重建或 FSRS 重設。隔離 PostgreSQL／Chromium 不等於 Supabase staging／真實 Safari 驗收；正式 ledger、JWT／PostgREST／advisors 尚待授權後核對。

## 相容性與下一步

- 舊角色若缺來源 baseline／穩定節點對照，不安全猜配；保留原內容並提示，需要可查證對照才能補建。新角色已記錄可重現基準。
- 角色只手動套用目前同來源模板；下載新版不自動改角色。來源下架／刪除不刪私人副本。
- 真實 iPad Safari：字典 Word 同列、學習中管理員編輯返回、角色長按／尺寸／浮窗、自訂模板、同來源更新與還原。兩項 SQL 授權啟用後再驗收官方私人卡與公開資源庫。清單及最終 commit 由 #60／PR 追蹤。
- 既有字典常駐審核與四組官方集保留；原 28 筆僅歷史資訊，舊工作仍先備份原檔／Session JSON，不重新匯入已套用項目。
