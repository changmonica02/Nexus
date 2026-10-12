# Nexus — AI 開發協作規則

## 文件權威與閱讀順序
1. 閱讀 `README.md` 取得專案入口。
2. 依任務閱讀 `docs/SPEC.md`（應有的產品行為）與 `docs/ARCHITECTURE.md`（技術結構與限制）。
3. 需要了解決策原因時閱讀 `docs/HISTORY.md`；接續工作前閱讀 `docs/HANDOFF.md`。
4. GitHub Issues / PR 追蹤任務；**Issue 並不自動取代正式規格**。實際程式碼、測試、SQL migration 是「已實作狀態」的驗證依據。

## 實作規範
- 在改動前檢查程式碼、migration、測試與規格是否一致；不確定時明列差異，不得臆測已部署。
- 不得因 UI 隱藏而省略伺服器端與資料庫權限驗證；維持使用者資料隔離。
- 不任意刪除、重建或覆寫既有正式資料；涉及 schema、Entry / Sense ID、資料遷移、權限與同步時，先評估相容性、回滾及備份。
- 不把歷史的 owner-scoped etymology 資料模型誤認為現行產品要求的私人百科。
- 優先採用小型、可驗證的修改；回報執行了哪些測試、哪些沒有執行。
- 未經明確授權，不執行 production 資料刪除、migration、正式資料匯入或部署。

## 文件維護
- 產品需求改變 → 更新 `docs/SPEC.md`。
- 技術設計改變 → 更新 `docs/ARCHITECTURE.md`，並標明「設計中／已實作／待驗證」。
- 重大設計決策、原因、替代方案、影響與對應 PR/Issue → 追加 `docs/HISTORY.md`；微小改動用 Commit 即可。
- 當前進度、阻塞、下一步 → 更新並精簡 `docs/HANDOFF.md`，不要把它當成永久追加的流水帳。
- 保持這些文件無敏感憑證；在 public repo 中不可寫入 token、密碼、私密資料。
- 不捏造驗收、部署或變更日期；文件內容若與原始碼衝突，標示待核對，而非自行宣布完成。


## 歷史封存與遷移完整性
- `docs/archive/00-HANDOFF-STATUS-AND-AI-RULES.md`、`01-CANON-SPEC-AND-DECISIONS.md`、`02-PROJECT-LOG-DETAILED.md` 是舊交接檔的**只讀歷史快照**；平常不再修改，也不比新規格更具權威。
- 開發中遇到現行規格缺漏、爭議、歷史相容性問題或未解釋的決策理由時，應按關鍵字查閱相關封存段落、Issues 與實際程式碼，先報告差異，再修訂核心文件；**不得直接照搬過時指令**。
- `SPEC.md` 與 `ARCHITECTURE.md` 優先作為現行目標契約；`HISTORY.md` 提供決策原因；`HANDOFF.md` 只保存最新狀態。功能已否決或仍待 Discovery 的項目不可默默升級成已確認需求。
