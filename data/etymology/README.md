# 字源百科第八批匯入

原始資料位於 `batch-08/`，匯入器只讀取，不改寫任何原稿。

```powershell
# 預設 dry-run：記憶體中的 PGlite 執行交易驗證後回滾
node scripts/import-etymology.mjs --dry-run --report data/etymology/batch-08-dry-run.json

# 僅允許專案 .local/etymology/ 下的本機 PGlite；不接受 Supabase URL 或密鑰
node scripts/import-etymology.mjs --apply-local --local-db .local/etymology/batch08-import --owner 11111111-1111-4111-8111-111111111111 --report data/etymology/batch-08-import.json

# 重跑相同來源；沿用同一 DB 與 owner
node scripts/import-etymology.mjs --apply-local --local-db .local/etymology/batch08-import --owner 11111111-1111-4111-8111-111111111111 --report data/etymology/batch-08-repeat.json
```

範例 owner 是本機測試 UUID，不是真實帳號。首次成功匯入 150 份文件、721 筆資料；重跑跳過 150 份文件、721 筆資料。報告以文件為 imported/skipped/failed 計數單位，`rows` 另列資料列數。所有 150 份來源仍有審核提醒，不代表全部內容未查證或匯入失敗。

相同 ID + 完全相同內容會跳過；相同 ID + 不同內容會整批拒絕並回滾。這不是資料修訂覆寫工具。若要匯入修訂版，須先審查差異，另行設計更新流程。

未結構化字根筆記、INDEX、README 與 review 原文僅保存為 source，不捏造條目／義項。示意例詞與條件變體不自動建立正式單字／詞源關聯。原始狀態與未映射欄位保留於 source metadata，原始 Markdown 保留全文與 SHA-256。

本機 DB 有相鄰的 `.import-lock`，避免兩個 CLI 同時開啟 PGlite。若程序異常終止留下鎖，先確認沒有匯入程序運作，再人工處理鎖檔；工具不自動刪除他人的鎖。

本機匯入不會讓 production 網站出現資料；目前前端仍讀既有 Supabase RPC。本輪透過同一 migration/RPC 在本機測試庫取得資料，交給既有前端元件做渲染驗證。詳見根目錄 `NEXUS_ETYMOLOGY_IMPLEMENTATION_REPORT.md`。
