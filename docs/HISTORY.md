# Nexus 重要變更與決策歷史

> 本檔整合 Changelog、Decision Log 與重大實作歷史。依事件日期記錄；日期未知時明確註明，**不要補造時間或宣稱 production 完成**。一般小改動留在 Git Commits。

## 2026-10-12 — 建立正式文件治理架構
- **變更：** 將文件角色統整為 `SPEC.md`、`ARCHITECTURE.md`、`HISTORY.md`、`HANDOFF.md`，配合根目錄 `README.md` 與 `AGENTS.md`。
- **原因：** 產品規格和技術設計分開維護，將重大變更、原因與決策合併，避免多份流水帳。
- **影響：** 文件治理；不更動運行時程式碼、資料庫、部署。
- **狀態：** 本次為文件架構初始化，舊交接紀錄尚待完整比對及遷移。

## 決策日期待從原始交接紀錄確認 — 公共字典與私人卡片分離
- **決策：** Nexus 以一套共享公共字典為知識來源，使用者私人單字卡只管理其擁有的學習資料，可關聯公共詞條。
- **原因：** 避免重複維護公共詞彙內容，分離共用知識與私人學習進度。
- **影響：** 權限、資料關聯、字典與 Study 操作。
- **注意：** 不將歷史 owner-scoped etymology 表解讀成新的私人百科需求。

## 2026-09-28 — 舊字源百科本機匯入驗收紀錄
- **來源：** `NEXUS_ETYMOLOGY_IMPLEMENTATION_REPORT.md`。
- **當時報告：** 舊資料包的本機 PGlite 解析、驗證與匯入測試完成。
- **界線：** 該報告明言未操作 production Supabase、未部署；舊模型亦不等於目前公共字典的正式產品需求。

## 維護格式
新重大事項依序補上：日期、變更／決策、原因、替代方案及取捨（如有）、影響範圍、驗證或部署狀態、Issue／PR／Commit 連結。


## 歷史日期待核對 — 帳號刪除安全設計及本機測試
- **原始文件：** `docs/account-deletion.md`；其內容已分流整合到 `SPEC.md`（使用者體驗）與 `ARCHITECTURE.md`（RPC、資料庫、離線快取、測試）。
- **決策：** 只允許登入使用者透過伺服器端 `auth.uid()` 刪除自己；使用確認文字和電子郵件驗證、交易式 cascade，失敗則回滾。
- **原因及限制：** 防止刪除他人資料、未過期 JWT 重建資料、前端洩漏高權限金鑰，並避免在網路不確定時錯誤回報成功。採 `NOT VALID` 相容既有孤兒列；不刪除 `owner=null` 共用舊資料，也不聲稱能抹除其他裝置離線副本。
- **測試：** `tests/accountDeletion.test.cjs` 的 PGlite / fake-indexeddb 本機測試；非線上部署證明。
- **當時狀態：** 原文件指明未套用正式 migration、未部署、未刪除真實使用者。現況仍待核驗。
- **文件治理：** 本次將該專項文件完整移入六份核心文件並移除其獨立副本；Git 歷史保留舊版本。


## 2026-10-12 — Canon／歷史交接資料遷移整理（第二輪）
- **來源：** 2026-10-11 的 `00-HANDOFF-STATUS-AND-AI-RULES`、`01-CANON-SPEC-AND-DECISIONS` 及 `02-PROJECT-LOG-DETAILED`（雲端原始交接檔），並參考現有 GitHub Issues 與 migration 列表。
- **目的：** 現行產品契約歸 `SPEC.md`，儲存／權限與技術契約歸 `ARCHITECTURE.md`，主要變更原因與否決方案歸本檔，任務狀態歸 `HANDOFF.md` 與 Issues。
- **權威提醒：** 原始歷史日誌包含大量被取代的舊 Canon、除錯與過去部署記錄；不能將全部歷史片段當成現在規格。此次轉移的是核對過的高價值契約摘要，**不是逐字搬移全部歷史原文**。原始交接檔仍應保留供稽核，不宣稱零資訊損失。
- **重大決策背景：** local-first、Page shell + kind-specific data，避免把衍生 `content_text` 誤當正文；登入與 owner 隔離，不採匿名私人工作區；個人字卡與唯一公共字典分開；資料庫 migration 僅以線上 ledger 證明已部署。
- **明確取消／降級：** 教師／學生版 PDF（D-204）不做；小說與角色／世界觀／地點間自動關聯（D-201）不做；完整 Canva／企業共編／一般 Audio Video 功能不是近期核心；Note Markdown 不承諾完全保真。
- **資料演進理由：** Quick Notes 與 Todo 統一 pages kind，減少 store 重複與同步遺漏；FSRS 事件保留可追溯歷史、避免把舊練習計數錯當記憶模型；公共字典用 Entry/Sense identity、草稿發布及審核式匯入防資料污染。
- **歷史證據：** 2026-09-28 字源 MVP 本機 PGlite 匯入記錄仍由 `NEXUS_ETYMOLOGY_IMPLEMENTATION_REPORT.md` 保存；該歷史報告不是目前公共字典的正式 schema 真相。
- **時間線概覽（原 02 日誌）：** 2026-06-20～06-27 初期規劃、Next.js/Tiptap/IndexedDB 基線；06-28～07-02 Note、Page、PDF、編輯區塊、Backup、Study、導覽改善；07-30～08 月份側欄、偏好、同步和簡報迭代；09 月帳號／RLS、小說、角色卡、講義、FSRS／Quiz；09-28 公共字典方向與舊來源整理；10-08 source/license 退休與資料母檔；10-11 identity／pronunciation／canonical CSV 與 Study reliability 收斂。
- **詳細逐次 debug／commit 級紀錄：** 暫保留原始 `02` 作歷史來源；GitHub 核心 `HISTORY.md` 僅收錄具有延續效力的決策／原因，避免用 15,000 行舊流水帳遮蔽現行規格。
