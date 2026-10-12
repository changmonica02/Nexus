# Nexus 最新交接狀態

最後檢視：2026-10-12（GitHub `main` 儲存庫可見內容）。

## 已確認
- `main` 是預設分支；儲存庫含 Next.js 應用程式、`src/`、`tests/`、`scripts/`、`data/` 及 Supabase migration。
- 專案目前已有字典、etymology、study 路由及多份字典修訂／匯入相關 migration。
- 本次工作建立文件架構及基本索引，**未修改正式資料庫，也未驗證線上部署**。
- 舊字源驗收報告 `NEXUS_ETYMOLOGY_IMPLEMENTATION_REPORT.md` 仍保留；帳號刪除專項內容已整合到核心文件。

## 尚未確認
- 本地未推送的程式碼／交接檔內容，以及最新完整 Canonical Spec 是否都已進入 GitHub。
- 各 migration 是否真的在 production 套用、線上資料與字典匯入狀態。
- GitHub Issues 的完成情況和程式碼之間的逐項對照。
- 六份核心文件中的正式規格與架構，仍需由原始交接檔完整核對，避免僅憑部分歷史資訊補造。

## 建議下一步
1. 取得三份既有交接文件的完整最新版，逐段核對並遷移有效要求；已廢棄決策歸入 `HISTORY.md`。
2. 驗證目前 GitHub 程式碼、migration、實際資料庫、Issues 與部署狀態，補齊 `ARCHITECTURE.md` 與本檔。
3. 選擇一個小型 Issue 試行新的 Codex 文件更新規則，確認沒有規格漂移。

## 工作交接規則
本檔保持短小、僅保留**現況和下一步**；過期項目移除，不在此累積每日歷史。正式產品規格看 `SPEC.md`，技術設計看 `ARCHITECTURE.md`，重大歷史看 `HISTORY.md`。


## 帳號刪除遷移備註
- 原 `docs/account-deletion.md` 的產品流程、安全及資料庫約束、離線限制與本機測試已分別整理進 `SPEC.md`、`ARCHITECTURE.md`、`HISTORY.md`，原獨立文件不再維護。
- **仍待驗證：** `20260929_account_deletion.sql` 是否已套用正式 Supabase；不要把舊文件的本機測試當成正式部署驗收。
