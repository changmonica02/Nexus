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

## Issue → SPEC → 實作 → 技術文件的必經流程
- 需求確定、進入實作前：先建立／更新 GitHub Issue（範圍、驗收、依賴、待決事項）；**產品功能及已核准的使用者操作必須同步寫入對應 SPEC 功能章節，並引用 Issue**。已取消的功能也應從有效產品規格退場。純工程任務、部署驗證與未定案的 Discovery 不必硬寫成新產品功能。
- **開發前核對**：Codex 應閱讀對應 Issue、SPEC 和現有程式碼，標明規格與實作差距；若重要行為／資料設計仍待核准，先提出選項，不得自行當成已定案。
- **開發與驗證**：依 SPEC 作為目標行為；測試需覆蓋 Issue 驗收及資料相容、安全、錯誤恢復。未經授權不得操作 production。不能將 main 的程式存在誤寫成已部署／已驗收。
- **實作完成時**：Codex 必須同步補充／校正 `docs/ARCHITECTURE.md` 的**實際**模組、schema／RPC、資料流、狀態與技術取捨，並明確區分設計中、已實作、測試通過、production 已套用／待驗證；只有實作時確實改變或新增的技術內容才應寫入，不可把未實作方案敘述成現況。
- **交付與關閉 Issue 前**：確認 Issue 與 SPEC 行為一致、ARCHITECTURE 與程式碼一致、相關測試及未執行測試已記錄；重要決策與原因歸 HISTORY，進度／阻塞歸 HANDOFF。**依使用者 2026-10-15 更新授權，功能開發 Issue 在程式、測試與交付完成後可結案；正式部署／真實帳號與裝置驗收項目集中保留於常駐 Issue #60。未套用 Migration 必須明示，不能宣稱功能已正式啟用。PR 描述使用 `Refs #N`，不得使用導致自動關閉的 `Closes/Fixes/Resolves #N`。** 未符合驗收不得僅因有 Commit 就關閉 Issue。
- 已有功能的問題修正亦應檢查是否影響產品規格或技術架構；若不影響，無須形式上改寫文件。

## GitHub main 與 Vercel Production 的部署邊界
- 目前 Nexus 的 GitHub `main` 已連接 Vercel Production：歷史 PR #46 合併後曾自動建立正式部署。**把任何 Commit（包含純 SPEC／文件）推送到 `main`，都應視為可能觸發正式部署**；若設定變動，須重新核對 Vercel Git 與最新部署記錄。
- 未獲使用者明確指定直接修改 main 時，新的產品決策或文件修訂先在**工作分支**修改並建立 PR。開發中的 Codex 分支獨立，避免覆蓋其他工作；依任務需要同步最新 main 並解決衝突。
- **PR 合併 = 同意可能觸發正式部署**。合併前檢查目標分支、測試與 Preview、SQL/RPC 相容性、產品決策、變更範圍及是否已獲使用者明確合併／上線授權。禁止把 GitHub 的 `mergeable` 誤認為可安全部署。
- PR 涉及 Supabase migration 時，先核對目前正式 schema、資料保護、回復方法、舊版前端相容性，並明確安排資料庫與前端發布順序。**僅建立 migration 檔、合併 PR 或 Vercel Preview Ready，均不等於正式 migration 已套用或正式環境已驗收。** 正式資料庫寫入與合併仍各自需要明確授權。
- 若僅編寫文件，應儘量以不影響 Production 為原則（PR + Preview）；是否合併文件 PR，仍按正式部署風險確認。遇到 Vercel 自動部署設定無法核實，應報告不確定性，不能擅自假定已停用。
- 功能開發 Issue 可依完成證據結案；未完成的正式啟用／人工驗收移交常駐 #60。PR 僅使用 `Refs #N`，不自動關閉常駐驗收 Issue。

## 文件維護
- 產品需求改變 → 更新 `docs/SPEC.md`。
- 技術設計改變 → 更新 `docs/ARCHITECTURE.md`，並標明「設計中／已實作／待驗證」。
- 重大設計決策、原因、替代方案、影響與對應 PR/Issue → 追加 `docs/HISTORY.md`；微小改動用 Commit 即可。
- 當前進度、阻塞、下一步 → 更新並精簡 `docs/HANDOFF.md`，不要把它當成永久追加的流水帳。
- 保持這些文件無敏感憑證；在 public repo 中不可寫入 token、密碼、私密資料。
- 不捏造驗收、部署或變更日期；文件內容若與原始碼衝突，標示待核對，而非自行宣布完成。


## 文件範圍與目前授權

- 專案文件僅維護 docs/SPEC.md、ARCHITECTURE.md、HISTORY.md、HANDOFF.md 四份；不新增封存、reference、追溯副本或歷史交接檔。
- 目前使用者明確要求直接在 main 修改；依此授權工作，仍先確認分支／未提交內容及變更範圍。main 推送可能觸發 Production，不推論授權包含 DB 寫入或資料刪除。
- 本輪清理不修改 SPEC／HISTORY。被否決或過期內容可移除，不要求在其他檔案保存副本；有效資料相容性與安全契約仍以程式／migration 核對。
- Windows PowerShell 使用 npm.cmd／npx.cmd；語系變更核對覆蓋，未執行的驗證明確記錄。
