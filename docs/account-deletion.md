# 帳號刪除

入口：側欄帳號 → 刪除帳號 → 輸入「刪除帳號」→ 永久刪除。

## 啟用

需由管理者另行審核、套用 `supabase/migrations/20260929_account_deletion.sql`。
本次開發沒有套用任何正式環境 migration，沒有刪除真實帳號或部署。
依 migration 時序套用；新增的 Quiz / 百科 migration 應先於此 migration。
RPC 尚未安裝時，介面會提示功能尚未在伺服器啟用。

## 行為與權限

`delete_own_account(confirmation_email, confirmation_text)` 僅允許 authenticated 呼叫。
帳號 ID 取自已驗證 JWT 的 `auth.uid()`，不接受客戶端指定帳號 ID。
RPC 鎖定目前 auth.users 記錄，驗證電子郵件及確認字串，再刪除該使用者。
函式固定空 search_path；所有物件完整指定 schema。

新增 owner 外鍵連至 auth.users，使用 ON DELETE CASCADE，涵蓋筆記、附件、
二進位附件、Study、Quiz 與已安裝的字源百科資料。整次刪除屬於一個資料庫交易；
任何約束或觸發器錯誤皆回滾。既有 Supabase auth 關聯負責移除登入 session。
不修改已部署的舊 migration，不需要在前端放入 service-role 金鑰。

外鍵使用 NOT VALID 保留舊有孤兒資料，仍會檢查新增／更新資料，防止已刪除
使用者的未過期 JWT 重新建立 owner 資料。本功能不清理 owner=null 的共享舊資料。
現有附件使用 public.binaries，沒有呼叫 Supabase Storage API；若未來新增 bucket，
須另設物件清理流程。未知外鍵阻止刪除時會完整回滾，不強制繞過。

成功後本機登出，依 owner 清除 IndexedDB 記錄與附件二進位快取，再回到首頁。
其他帳號與一般偏好保留，不修改 IndexedDB version。其他装置的既有離線副本
不能遠端抹除；伺服器會拒絕已刪除 owner 的新寫入。
若連線中斷導致成功回覆遺失，介面要求重新登入確認，不宣稱已刪除或先清掉本機資料。

## 驗證

`node --test tests/accountDeletion.test.cjs` 使用本機 PGlite 與 fake-indexeddb，
驗證確認字串、匿名拒絕、他人帳號隔離、完整 cascade、失敗回滾、刪除後寫入拒絕，
以及僅清除該帳號本機快取。測試不連接 Supabase。
