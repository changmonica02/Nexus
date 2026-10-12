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


## 2026-10-12 交接來源核對摘要
- 已找到交接雲端資料：`00-HANDOFF-STATUS-AND-AI-RULES.md`（約 592 行）、`01-CANON-SPEC-AND-DECISIONS(6).md`（2026-10-11 版，約 909 行）、`02-PROJECT-LOG-DETAILED(6).md`（約 15,182 行）。後兩者也有歷史版本；以較新的 Canon 而非舊附錄作規格基線。
- 已將產品與資料契約的**關鍵章節摘要**轉移至 `SPEC.md`、`ARCHITECTURE.md`，重大歷史索引與否決決策至 `HISTORY.md`。這不等於逐字完整遷移；來源檔不能在全文逐條稽核完成前刪除。
- 39 個既有工作 Issues（及工程補充 Issue）可作任務追蹤；Issue 題目／草稿不可自動視為產品已定案或功能已完成。
- 請繼續執行**逐項追蹤矩陣**：原 Canon 各 F-* 模組／決策 → SPEC 章節、ARCHITECTURE 規則、對應 Issue；尤其 IMPORT/EXPORT 格式矩陣、各種 JSON 子欄位、細部觸控與同步狀態尚未逐條複製。
- 尚需核對 `main` 近期 commit、Vercel SHA、production Supabase ledger、正式 CSV 與測試數據，不可將檔名、過往回報或 Issue 自動判為部署完成。

## 歷史封存驗證（2026-10-12）
- 三份原始交接檔已複製到 `docs/archive/`，**不作現行規格權威**，僅用於原文稽核。GitHub 封存檔大小與來源檔相符：00 = 44,939 bytes；01 = 77,340 bytes；02 = 694,409 bytes。
- 常態只維護六份核心文件，歷史封存不再隨日常開發逐次修改。
- 已保留所有原始文字供追溯；新 SPEC／ARCHITECTURE 是重整與摘要，不代表每一個歷史細節都已轉成現行需求。正式合併前仍應核對重要矩陣、決策覆蓋與實作狀態。
