# Nexus — 當前狀態與下一步

產品見 [SPEC](SPEC.md)，技術契約見 [ARCHITECTURE](ARCHITECTURE.md)，決策見 [HISTORY](HISTORY.md)。

## 目前工作

- 生活新增「我的清單」：獨立清單／分類／項目、穩定欄位 ID、欄位封存與型別保護、一般分類移動、清單／卡片檢視與既有附件。沿用 workspace outbox／RPC、離線與帳號邊界；未加入表格套件或拖曳。
- 新 Migration `20261103155520_life_custom_lists.sql` 已在無網路隔離 PostgreSQL 17.11 執行並驗證舊資料／RPC／RLS／混合交易及故障回滾，未套用正式 Supabase。測試重建已知 workspace schema 契約，未讀取正式 schema；仍需人工比對正式 schema 漂移、API 曝露與 Realtime。發布先備份與資料庫、再前端；具體回復邊界見 ARCHITECTURE。
- IndexedDB v9／備份 v4；舊備份不清除清單或其附件，不同版本還原保守中止。升級阻擋／版本錯誤有復原提示，已驗證關閉舊頁籤並重新載入可保留未同步資料。v8 前端不能作為已升級裝置的直接回退版；保留 v9 與新版 RPC 向前修復，不清庫／降版。前端先更新時，缺少 life 表不再阻擋舊同步，清單待傳操作保留。

## 待驗收

- Safari／iPhone／iPad 的日期輸入、附件選取、軟鍵盤、安全區域與已安裝 PWA 仍需實機確認。
- 核准 Migration 後驗證正式 RLS／Realtime 設定、真實帳號跨裝置補傳及版本衝突。不得自行套用、合併或部署。
