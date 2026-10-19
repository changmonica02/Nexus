# 附件同步快取 — Refs #84

2026-10-19：本機實作與隔離驗證；未部署、未寫正式資料庫、未下載正式 PDF。無新增 migration，沿用既有 `20261008_workspace_delete_protection.sql` 的 revision／CAS／tombstone 契約。

## 可比較量測

`tests/workspaceSync.test.cjs` 使用六份各 64 KiB 的合成 PDF payload，連續完整同步六次。舊路徑透過原 `select('*')` 分頁讀取；新路徑執行實際 metadata-first pull。統計附件 Base64 欄位 bytes，不含 metadata／JSON／HTTP headers，也不是壓縮後的 Supabase 計費數字。

| 情境 | 完整附件下載次數 | Base64 bytes |
| --- | ---: | ---: |
| 修復前，六次同步 | 36 | 3,145,824 |
| 修復後，首次＋五次後續同步 | 6 | 524,304 |
| 修復後，五次後續同步 | **0** | **0** |

此案例合計減少 83.33%；穩定版本的後續附件內容傳輸減少 100%。新裝置仍下載全部所需附件，更新一份僅重抓該份。舊無版本快取會保守驗證一次，不承諾升級後第一次就零下載。

## 驗證

2026-10-19 #85 後續回歸：已更新工作區 fixture 的字典摘要 RPC mock 及過時狀態 checkbox 定位，完整 unifiedWorkspace 四種寬度通過；下方舊失敗描述保留作先前測試紀錄。

- 32 項 Node／IndexedDB／PGlite：工作區27、學習同步3、帳號刪除與本機清理2，均通過。涵蓋首次、新裝置、未變更、單一更新、軟／永久刪除、離線重試、丟失回應、帳號切換、late response、pending edit、lease crash recovery、背景節流及備份／學習契約。帳號刪除 fixture 修正為其歷史 migration 的欄位，沒有更動正式 SQL。
- 真實 Edge 同源雙分頁／真實 IndexedDB：併發首次只下載1次，後續五輪0次，更新只下載1次；離線可讀、重連、不同帳號／登出不可讀，刪除後不可讀。僅本機 HTTP 合成資料。
- 工作區介面聚焦模式 `NEXUS_SYNC_ONLY=1`：以實際 NexusApp、模擬引擎驗證同帳號 TOKEN_REFRESHED 與字典導航不重建引擎；附件零下載另由實際引擎／雙分頁測試驗證。
- TypeScript 與 production build 通過；修改的 production 檔案 ESLint 0 errors／48 warnings。完整舊 unifiedWorkspace UI suite 在字典管理的舊「🔴 待審核」checkbox 等待逾時，不能宣稱整套 UI suite 通過；本次不擴大修改字典管理。
- 未執行真實 Supabase 跨裝置、Safari 或 production 負載測試；不將隔離測試當作正式上線驗收。

重跑：`node --test tests/workspaceSync.test.cjs tests/studySync.test.cjs tests/unifiedStudySync.test.cjs tests/studyStyleSync.test.cjs tests/accountDeletion.test.cjs`。瀏覽器設定 `BROWSER_EXECUTABLE` 為 Edge／Chromium，執行 `tests/attachmentSync.browser.test.cjs`；工作區 auth 聚焦測試另設 `NEXUS_SYNC_ONLY=1` 後執行 `tests/unifiedWorkspace.browser.test.cjs`。

## 發布與觀察

1. 正式發布前確認 binary 寫入仍走 `apply_workspace_operations` 並原子遞增附件 revision；不支援管理工具繞過 RPC 直接改 binary 而不更新 revision。既有 RLS／owner scope 不變。無需 SQL 更新，不重播 migration。
2. 部署後請已開啟的舊分頁重新載入；舊版程式仍可能完整下載。首次版本驗證會有一次必要流量，之後觀察 `binaries?select=id,owner_id,data` 完整內容請求，未變更使用情境應為0；`select=id,owner_id` metadata 請求仍屬正常。
3. 比較同一時段 Egress 每小時增量、完整內容請求次數／bytes、attachment 更新數、活躍裝置數；累積月用量不會因修復倒退。額外觀察下載逾時、同步錯誤、pending outbox 是否持續累積及快取修復次數。不要在 log 記錄 Base64、私人檔名或 token。
4. 人工以少量測試附件驗證兩裝置更新／刪除、切換帳號、斷線恢復與 Safari；不需大量下載真實 PDF。正式驗收留 #60。
5. 若需回復，回退前端 commit 即可；新可選 IDB 欄位不妨礙舊版讀取，無資料清除／DB rollback。回退會恢復原本高流量行為，應持續觀察。

## 字典次要優化評估（未實作）

`DictionaryBrowser` 的一般列表與 GroupPage 目前各對列表項目呼叫 `readPublishedEntry`，`flashcardLinks.searchCandidates` 也有同樣 N+1 模式。建議搜尋／分類 RPC 直接回傳已發布條目的 ID、headword、kind、排序後第一義項的詞性／釋義摘要與 inflection match；20 筆列表可由1＋20請求降為1請求。點開詳情或確認加入字卡時再抓完整 published detail，不能用摘要取代義項驗證／字卡內容。以 query、filter、page 及發布版本做快取／進行中請求合併，保留 published-only 與管理權限邊界。此項需要獨立 SQL／契約測試與發布安排，未併入附件修復。
