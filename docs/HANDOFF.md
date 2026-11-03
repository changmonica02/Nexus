# Nexus — 當前狀態與下一步

產品見 [SPEC](SPEC.md)，技術契約見 [ARCHITECTURE](ARCHITECTURE.md)，決策見 [HISTORY](HISTORY.md)。

## 目前工作

- 生活新增「我的清單」：獨立清單／分類／項目、穩定欄位 ID、欄位封存與型別保護、一般分類移動、清單／卡片檢視與既有附件。沿用 workspace outbox／RPC、離線與帳號邊界；未加入表格套件或拖曳。
- 新 Migration `20261103155520_life_custom_lists.sql` 僅供審查與本機測試，未套用正式 Supabase。發布順序必須先資料庫、再前端；禁止把 PR 或本機測試視為正式啟用。測試證據與未執行項目以交付 PR 為準。
- IndexedDB v9／備份 v4；舊備份不清除清單或其附件，不同版本還原保守中止。舊版頁籤需重新載入；舊前端不能開啟已升級的 IndexedDB。

## 待驗收

- Safari／iPhone／iPad 的日期輸入、附件選取、軟鍵盤、安全區域與已安裝 PWA 仍需實機確認。
- 核准 Migration 後驗證正式 RLS／Realtime 設定、真實帳號跨裝置補傳及版本衝突。不得自行套用、合併或部署。
