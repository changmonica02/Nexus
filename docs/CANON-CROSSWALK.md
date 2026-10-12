# Nexus Canonical 規格逐項對照與程式碼證據

> 核對日期：2026-10-12。來源：`docs/archive/01-CANON-SPEC-AND-DECISIONS.md`（2026-10-11 Canon）、`00` 最新狀態、`02` 歷史、GitHub main 的路徑／指定檔案內容。**證據等級**：A = 已讀取實際原始碼或明確設定；B = 已確認原始碼／測試／migration 路徑存在，但未執行測試／完整程式審計；C = 只有 Canon／Issue 的產品計畫；E = 發現過時或矛盾，需要更正。A／B 均不代表 production 已部署。

| 原 Canon 規格 ID／段落 | 新文件對應 | GitHub main 可定位證據 | 結果 | 仍需驗證 |
| --- | --- | --- | --- | --- |
| §1 定位／登入／非共編 | SPEC §7；ARCH §7 | `src/infrastructure/sync/syncEngine.ts` | B | 需實際登入／匿名路由測試 |
| §2 五概念／Page Shell | SPEC §7；ARCH §7–8 | `src/lib/types.ts`、`src/infrastructure/storage/StorageAdapter.ts` | A | Page 模式的完整保存／還原 |
| §2 content_json 正文真相 | ARCH §7–8 | `src/lib/types.ts`、`src/infrastructure/storage/IndexedDBAdapter.ts` | B | 所有派生投影不得反向覆蓋 |
| §2 Storage／刪除 | SPEC §11；ARCH §7–8 | `src/infrastructure/storage/IndexedDBAdapter.ts`、`20261008_workspace_delete_protection.sql` | B | Trash、binary 跨裝置恢復 |
| F-NOTE | SPEC §7；ARCH §8 | `src/lib/types.ts`、`src/lib/lessonDocument.ts` | B | 富文字保真、匯出及頁邊距 |
| F-DOCUMENT | SPEC §7、§12 | `src/lib/types.ts`、`src/lib/markdown.ts` | B | Markdown roundtrip |
| F-PDF | SPEC §7、§12 | `src/lib/pdfNote.ts`、`src/app/` | B | 引文中繼資料、閱讀器與 attachment 關係 |
| F-STUDY / FSRS | SPEC §8；ARCH §7–8 | `src/features/study/studyFSRS.ts` | A | 實測評分與多裝置排程 |
| F-DICTIONARY 10-08／10-11 | SPEC §2–4、§9；ARCH §3 | `src/features/dictionary/entryIdentity.ts`、`importReview.ts` | A | 匯入 13 份母檔與正式 DB |
| Dictionary Draft／Published | SPEC §9；ARCH §3 | `src/features/dictionary/revisionLifecycle.ts`、`20261014_dictionary_revision_lifecycle.sql`、`tests/dictionaryLifecycle.test.cjs` | B | RLS、後端寫入、回復 |
| Dictionary IPA / Pronunciation | SPEC §9；ARCH §3 | `20261018_dictionary_pronunciations.sql`、`tests/dictionaryPronunciations.test.cjs` | B | production migration 與 UI 往返 |
| Dictionary Import Safe／Review | SPEC §4、§9；ARCH §3 | `src/features/dictionary/importReview.ts`、`importSessionStore.ts` | A | 跨設備 Review 延續和中斷重試 |
| F-SCORE | SPEC §10；ARCH §7 | `src/features/score/ScoreWorkspace.tsx`、`score.ts`、`notation.ts`、`tests/score.test.cjs` | A | 實際三種譜面編輯完整性 |
| F-PRESENTATION | SPEC §10；ARCH §7–8 | `src/lib/presentation.ts`、`src/lib/types.ts` | B | Snap／group／rotation resize |
| F-QUICKNOTE／F-TODO | SPEC §10；ARCH §8 | `src/lib/types.ts` | A | 兩者 pages kind 持久化及列表 |
| F-CALENDAR-PLANNED | SPEC §10 | `src/lib/types.ts`（現有 todo kind） | C | 新多分類模型尚未定案 |
| F-CREATIVE／F-CHARACTER／F-WORLD | SPEC §10；ARCH §8 | `src/lib/characterWorkspace.ts`、`tests/characterWorkspace.test.cjs` | B | 模板／參照、RLS |
| F-NOVEL | SPEC §10；ARCH §8 | `src/lib/novelChapters.ts`、`20260916_novel_chapters.sql`、`tests/novelChapters.test.cjs` | B | 章節離線、排序、同步 |
| F-UTILITY Web／Counter／Draw | SPEC §10；ARCH §8 | `src/lib/types.ts` 中 page kinds | A | 大小組模型／抽選配額未決 |
| F-EDITOR／F-LESSON／F-PAGEFORMAT | SPEC §7、§11；ARCH §8–9 | `src/lib/lessonDocument.ts`、`tests/lessonDocument.test.cjs` | B | A4 測量、選取、跨頁 |
| F-NAVIGATION | SPEC §7、§11；ARCH §9 | `src/lib/creatableRegistry.ts`、`src/lib/pullToRefresh.ts` | B | 手機浮層／來源返回 |
| F-PREFERENCES | SPEC §7；ARCH §8 | `src/lib/i18n.ts`、`src/lib/featurePreferences.ts` | B | 繁英與各瀏覽器驗證 |
| §5 Page types／mode data | ARCH §8 | `src/lib/types.ts` | A | schema／現有資料兼容 |
| §5 IndexedDB／Backup | ARCH §8 | `src/infrastructure/storage/IndexedDBAdapter.ts` | **E：版本已變** | 現行 DB_VERSION=8，BACKUP_SCHEMA_VERSION=3，舊 version=6 是歷史 |
| §6 UX／手機／右鍵／刷新 | SPEC §11；ARCH §9 | `src/lib/pullToRefresh.ts`、`tests/uiInteractions.test.cjs` | B | 實機輸入／右鍵／焦點 |
| §7 Import／Export Matrix | SPEC §12 | `src/lib/markdown.ts`、`src/lib/pdfNote.ts` | B | 真正匯出格式與品質測試 |
| §8 Owner Sync | ARCH §7–8 | `src/infrastructure/sync/syncEngine.ts` | A | owner 篩選程式存在；RLS 實環境另驗 |
| §8 Backup／B2 conflict | ARCH §8 | `src/infrastructure/sync/workspaceSync.ts`、`tests/workspaceSync.test.cjs` | B | B2 雙版本解衝突尚待驗證 |
| §9 Tests / QA | SPEC §13；ARCH §9 | `tests/` 內含字典、Quiz、Study、同步測試 | B | 未實際執行 CI / Node tests |
| §10 M0–M13／Task Matrix | HANDOFF、GitHub Issues | Nexus Issues | C | 追蹤任務不等於功能完成 |
| §11 決策索引 | HISTORY、封存原 Canon | `docs/archive/01-CANON-SPEC-AND-DECISIONS.md` | B | 重要被否決方案已摘要；逐條決策全文保留 |
| §12 需求缺口／未來模組 | SPEC §10、§13；HANDOFF | GitHub Issues | C | 需求尚未全部定案 |
| §13 Legacy Canon | HISTORY、docs/archive | 完整三份封存文件 | B | 不得覆蓋較新的 Canon |

## 已找到的具體差異
1. **舊 IndexedDB 版本號失效**：`src/infrastructure/storage/IndexedDBAdapter.ts` 現為 DB_VERSION **8**、BACKUP_SCHEMA_VERSION **3**，不是舊 Canon 描述的 DB_VERSION 6。
2. `src/features/study/studyFSRS.ts` 明列 `ts-fsrs@5.4.2/FSRS-6`、`request_retention: 0.90`、learning/relearning 10m；以上可直接確認，但 fuzz、題庫 UI、正式多裝置仍需查驗。
3. `src/features/dictionary/entryIdentity.ts` 使用 `kind + lowercase(trim ASCII spaces)` 組合鍵；要確認 Unicode 空白與 PostgreSQL `btrim` 一致，避免客戶端／資料庫差異。
4. `src/features/dictionary/importReview.ts` 已有 Safe／Review 的匯入分類、修訂選項及操作會話結構，但不能僅憑此宣稱各 UI 路徑完全無誤。
5. `src/features/score/ScoreWorkspace.tsx` 已有作品列表與編輯元件，故「尚未開發」為過時描述；三種 notation adapter 的能力仍需逐項測試。

## 尚未執行的驗證
- 本次只讀取 GitHub `main` 的樹狀結構及代表性檔案；**未執行 npm test、typecheck、build 或 lint**，也未取得 Vercel deploy SHA 或 production Supabase migration ledger。
- 未對每一頁操作、每一 RPC / RLS 完成行為測試；本矩陣提供逐項追溯入口，不是 production 驗收單。
- GitHub `main` 不是本地尚未 push 的 Codex 工作目錄；尚未提交的本地變更不在本次驗證範圍。



## 2026-10-12 歷史交接逐節遷移驗收台帳

這份台帳以舊資料的 **Markdown 二級章節（##）** 為最小追蹤單位，涵蓋 00 的 15 節、01 的 16 節、02 的 208 節，共 **239 節**。表中「已整理」指**有功能／決策去向**，不表示原始文字逐字複製、所有程式已驗收或所有子段都已人工語義審核。對於早期 debug、貼碼、交接副本，保留 archive 原文，未以其覆蓋新規格。來源：`docs/archive/` 三份原始檔。

| 來源章節 | 原標題 | 新位置／處置 | 選擇理由 |
|---|---|---|---|
| 00 §1 | A. 本次整合說明（第一次閱讀請先看）【新增】 | `HISTORY.md / AGENTS.md` | 文檔治理說明及當時快照，較新規則優先 |
| 00 §2 | 0. 目前任務環節：正在進行與將要進行【修改】 | `HANDOFF.md` | 歷史交接原節保留，舊狀態須重核 |
| 00 §3 | 1. 交接包怎麼讀 | `HISTORY.md / AGENTS.md` | 文檔治理說明及當時快照，較新規則優先 |
| 00 §4 | 2. 目前進度：MVP 容器摘要【修改】 | `HANDOFF.md` | 歷史交接原節保留，舊狀態須重核 |
| 00 §5 | 3. 任務執行規則 | `AGENTS.md` | 協作／安全規則已移入 |
| 00 §6 | 4. 檔案結構（依 2026-09-25 程式碼快照重建）【修改】 | `HISTORY.md / AGENTS.md` | 文檔治理說明及當時快照，較新規則優先 |
| 00 §7 | 5. 使用者偏好與規則【修改】 | `AGENTS.md` | 協作／安全規則已移入 |
| 00 §8 | 6. 絕對不要做【修改】 | `AGENTS.md` | 協作／安全規則已移入 |
| 00 §9 | 7. 最短交接文字【修改】 | `HISTORY.md / AGENTS.md` | 文檔治理說明及當時快照，較新規則優先 |
| 00 §10 | 8. 最終一句話【修改】 | `HISTORY.md / AGENTS.md` | 文檔治理說明及當時快照，較新規則優先 |
| 00 §11 | 9. 已知風險、待驗收與測試現況【新增，取代舊 §9】 | `HANDOFF.md` | 歷史交接原節保留，舊狀態須重核 |
| 00 §12 | 10. 任務定義、MVP 大綱與完整任務目錄【修改】 | `HANDOFF.md` | 歷史交接原節保留，舊狀態須重核 |
| 00 §13 | 11. 使用者已提出但尚未被回答／決策的事項【新增】 | `HANDOFF.md` | 歷史交接原節保留，舊狀態須重核 |
| 00 §14 | 12. 環境、部署與 Supabase migration ledger【新增；併入舊 §11／§12 的環境資訊】 | `HANDOFF.md` | 歷史交接原節保留，舊狀態須重核 |
| 00 §15 | 13. 2026-09-28 後續對話增量交接【新增；若與前述舊快照衝突，以本節的已確認新決策為準】 | `HANDOFF.md` | 歷史交接原節保留，舊狀態須重核 |
| 01 §1 | 讀者導覽：規格成熟度、權威與範圍 | `AGENTS.md / HISTORY.md` | 來源／權威／舊版閱讀規則 |
| 01 §2 | 整合說明（歷史來源） | `AGENTS.md / HISTORY.md` | 來源／權威／舊版閱讀規則 |
| 01 §3 | 0. 本文件的角色與閱讀規則 | `AGENTS.md / HISTORY.md` | 來源／權威／舊版閱讀規則 |
| 01 §4 | 1. 產品定位、使用者約束與明確邊界 | `SPEC.md` | Canon 相關章節遷入 |
| 01 §5 | 2. 不可推翻的架構原則 | `ARCHITECTURE.md` | 技術契約原節遷入 |
| 01 §6 | 3. 功能總覽與狀態矩陣【修改】 | `SPEC.md` | Canon 相關章節遷入 |
| 01 §7 | 4. 功能規格卡 | `SPEC.md` | Canon 相關章節遷入 |
| 01 §8 | 5. 現行資料模型與儲存契約 | `ARCHITECTURE.md` | 技術契約原節遷入 |
| 01 §9 | 6. UI、互動與設計契約 | `SPEC.md` | Canon 相關章節遷入 |
| 01 §10 | 7. Import / Export / Interoperability Matrix | `SPEC.md` | Canon 相關章節遷入 |
| 01 §11 | 8. 資料安全、Backup、Sync 與恢復 | `ARCHITECTURE.md` | 技術契約原節遷入 |
| 01 §12 | 9. 品質、驗證與相容性規格 | `ARCHITECTURE.md` | 技術契約原節遷入 |
| 01 §13 | 10. 與 00 任務規劃的關係 | `HANDOFF.md / CANON-CROSSWALK.md` | 工作對照需再核對最新 Issues |
| 01 §14 | 11. 決策索引與舊 Canon 對照【修改】 | `HISTORY.md` | 決策索引原節遷入 |
| 01 §15 | 12. 已知需求缺口與未來功能清單【修改】 | `SPEC.md` | Canon 相關章節遷入 |
| 01 §16 | 13. Legacy Canon 保留規則 | `AGENTS.md / HISTORY.md` | 來源／權威／舊版閱讀規則 |
| 02 §1 | READ FIRST｜02 歷史閱讀索引（2026-09-28） | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §2 | 0. 本文件解讀規則 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §3 | 2026-07-31 — Supabase 雲端同步 + UI 改善（側邊欄拖拽、格式選擇、字樣、色票、學習集測驗） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §4 | 2026-07-30 — 深度審核：00/01/02/99 四份交接文件的整理、完善、問題分析與建議 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §5 | 2026-07-30 — Track H～M：Preferences/i18n、Sidebar UX、Drag Handle、Resizable Layout、Document kind、N | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §6 | 2026-07-30 — Track G：Navigation & Overview（Command Palette + Dashboard / Home v0）完成 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §7 | 2026-07-02 — Editor Blocks Foundation：LaTeX 改版為 Obsidian 風格原地編輯公式，取代官方 $$/$$$ prompt 版本 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §8 | 2026-07-02 — Editor Blocks Foundation：LaTeX / Block Math 完成（三批全數完成），補齊 Table Import 遺漏 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §9 | 2026-07-02 — Editor Blocks Foundation：Callout 完成（含已知未解問題），建立 jsdom 真實 Editor 排查方法 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §10 | 2026-07-02 — Editor Blocks Foundation：Table 完成，package.json 部署排查案例 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §11 | 2026-07-02 — Track C：Study Set / Flashcard v0 完成，並完成 NexusApp.tsx 拆檔 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §12 | 2026-07-02 — NexusApp.tsx 拆檔：2301 行 → 864 行 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §13 | 2026-07-02 — Track A2：Bulk Select 完成，協作模式改為工作區直接維護代碼 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §14 | 2026-07-02 — Track E：Workspace Backup / Export package v0 完成 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §15 | 2026-07-02 — Track A（Editor Blocks Foundation 第一批）：Link / TaskList / TaskItem 完成 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §16 | 2026-07-02 — r15 Deep Review：文件矛盾、架構語意與近期 tracks 修正 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §17 | 2026-07-02 — vNext Architecture Discussion：Creatables / Views / Tools / Website 弱聯動定案 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §18 | 2026-06-29 — Basic Notes Foundation Step 10.1：Markdown v0.1 link syntax / task list 補強完成 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §19 | 2026-06-29 — Basic Notes Foundation Step 10：Markdown import / export v0 完成 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §20 | 2026-06-29 — Basic Notes Foundation Step 9：Editor formatting toolbar 完成 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §21 | 2026-06-29 — Basic Notes Foundation Step 8：Permanent Delete / Duplicate Page 完成 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §22 | 2026-06-29 — Basic Notes Foundation Step 7：Trash / Restore UI 完成與 NexusApp 整檔替換 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §23 | 2026-06-29 — MVP-2 Step 5 / Step 6：PDF viewer layout polish 與錯誤狀態完成 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §24 | 2026-06-29 — MVP-2 Step 3 / Step 4 / Step 4-C：PDF import flow 與 PDF viewer 最小版完成 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §25 | 2026-06-28 — 對話壓縮續接資訊完整編入與 Step 2 狀態修正 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §26 | 2026-06-28 — MVP-2 Step 2：Attachment data layer patch 進行中（StorageAdapter / IndexedDBAdapter） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §27 | 2026-06-28 — MVP-2 規格審查、調整定稿與決策補強 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §28 | 2026-06-28 — MVP-1 Step 6：Backlinks（雙向連結實作與 MVP-1 完工） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §29 | 2026-06-28 — MVP-1 Step 5：Lightweight Folders（輕量資料夾分組實作與字體放大） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §30 | 2026-06-28 — MVP-1 Step 4：Tags First（標籤組織系統實作與並發修復） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §31 | 2026-06-28 — MVP-1 Step 3：Sidebar Polish（側邊欄精修） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §32 | 2026-06-28 — MVP-0 健康檢查、Code Verify 收斂修復 與 MVP-1 Search v0 實作 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §33 | 類型 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §34 | 背景 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §35 | 決策 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §36 | 理由 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §37 | 處理的問題 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §38 | 結果 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §39 | 0. 最新狀態摘要 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §40 | 類型 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §41 | 背景 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §42 | 執行的動作 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §43 | 最新技術事實 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §44 | 實作檔案 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §45 | 問題：JSON.stringify 大小寫錯誤 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §46 | 問題：頁面刪除 / soft delete UI | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §47 | 目標 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §48 | 執行：確認 dev server | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §49 | 結果 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §50 | 新手問題：dev server 佔用 terminal | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §51 | 新手問題：新 terminal 不在專案目錄 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §52 | 檔案內容檢查 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §53 | 決策：移除 Google Font 與 Vercel 預設頁 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §54 | 目標 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §55 | 建立檔案 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §56 | types.ts | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §57 | StorageAdapter.ts | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §58 | 安裝 idb | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §59 | 安裝 nanoid | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §60 | 問題：IndexedDBAdapter import 錯誤 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §61 | 建立 NexusApp client component | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §62 | 問題：components / lib 建錯位置 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §63 | 安裝 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §64 | 建立 TiptapEditor | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §65 | 問題：Markdown shortcut 樣式不明顯 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §66 | 問題：多 lockfile 導致 Turbopack root 誤判 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §67 | 問題：PowerShell rmdir 語法不適用 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §68 | 問題：兩個 dev server 同時存在 / port 3000 佔用 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §69 | 確認編輯器 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §70 | Node 初次檢查失敗 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §71 | npm PowerShell execution policy | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §72 | 確認版本 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §73 | 建立 Projects 資料夾 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §74 | 建立 Next.js 專案 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §75 | 0. 這份日誌怎麼使用 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §76 | 1. 日誌類型區分 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §77 | 2. 目前最新狀態摘要 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §78 | 2026-06-27 晚間 — MVP-0 完工後更新：content_json 持久化、頁面刪除與交接文件再整理 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §79 | 2026-06-27 — Next.js dev server 確認與 MVP-0 第一輪實作 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §80 | 2026-06-27 — 文件交接包檢查與重整 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §81 | 2026-06-27 — 生成最終交接包 `nexus-handoff-final/` | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §82 | 2026-06-27 — 新增本工作進度日誌 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §83 | 2026-06-27 — 確認編輯器 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §84 | 2026-06-27 — Node.js 初次檢查失敗 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §85 | 2026-06-27 — npm PowerShell 執行政策問題 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §86 | 2026-06-27 — 確認 Node / npm / Git 版本 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §87 | 2026-06-27 — 建立 Projects 資料夾 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §88 | 2026-06-27 — 建立 Next.js 專案 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §89 | 2026-06-20 ~ 2026-06-21 — 產品與架構規劃 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §90 | 2026-06-21 — 開工前規格補完 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §91 | YYYY-MM-DD — 標題 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §92 | 2026-06-27 — 修正 final package active docs 內部權威順序衝突 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §93 | 從 00 文件移入的詳細行動與結果記錄 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §94 | 1A. 2026-06-28 對話壓縮後續接狀態（必讀更新） | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §95 | 1U. 2026-07-30 Track H～M：Preferences/i18n、Sidebar UX、Drag Handle、Resizable Layout、Document kind | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §96 | 6. 下一個 AI 第一輪要做什麼 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §97 | 7. 必做 verify checklist | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §98 | 8. MVP-1 完工紀錄與後續方向 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §99 | 12. 2026-07-30 本輪深度審核：四份交接文件的整理、完善、問題分析與建議 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §100 | 1V. 2026-07-31 Supabase 雲端同步 + UI 改善（最新） | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §101 | 1W. 2026-07-31 使用者決策確認（下一個 AI 必讀） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §102 | 從 99 文件移入的 Active docs changelog（r0~r18） | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §103 | 2026-08-01 — Phase 1: 任務4+5+1+3 完成（單一+下拉扁平、MD為文檔、A4分頁引擎、雙開） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §104 | 2026-08-01 — 任務1邏輯修正：流動原本不改，檔案下拉在工具列最左 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §105 | 2026-08-01 — 任務3釐清：工具列右邊分頁按鈕指左右雙開分頁 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §106 | 2026-08-01 — Phase 2: 簡報 Hybrid 獨立 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §107 | 2026-08-01 — 簡報直觀化重構（Gamma/Canva風格） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §108 | 2026-08-01 — 5點回饋修正 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §109 | 2026-08-01 — 分析 Canva 製作形式 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §110 | 2026-08-01 — 王題修正：主題切換文字變灰、分頁新增頁、再分析PPT/Canva/Gamma | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §111 | 2026-08-01 — 8點追加需求 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §112 | 2026-08-01 — 5點回饋之圖表分區與子頁恢復（嚴禁刪減） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §113 | 2026-08-01 — 代碼分析與優化（不刪功能） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §114 | 2026-08-01 — 最終文檔統整 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §115 | 2026-08-01 — 工具列置頂覆蓋、排版同格、真正分頁、夜間適配、表格右鍵、側邊欄回退等全面修復 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §116 | 2026-08-01 — 深度審核與最佳化：文件重排、死檔清理、夜間適配持久化、表格平均提示、分頁精確度等 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §117 | 2026-08-02 — 01 歷史決策轉移與三檔交接整合 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §118 | 2026-08-02 — 00 任務目錄去重與 Task ID 正規化 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §119 | 2026-08-23 — 代碼審計 + Bug 修復 15 項 + 簡報功能重大改造 + drag 深度調試 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §120 | 2026-08-23（第二輪）— 簡報 UI 改造 + 圖表編輯器 + 創作類別 + 側邊欄分類 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §121 | 0. 本文件如何使用 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §122 | 1. 一句話定位 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §123 | 2. 使用者背景與產品約束 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §124 | 3. 三大原則 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §125 | 4. 五概念模型 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §126 | 5. MVP 路線 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §127 | 6. 技術棧 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §128 | 7. 實作檔案結構 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §129 | 8. 儲存核心 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §130 | 8A. 協作模式：工作區直接維護代碼（取代 patch 說明文件模式） | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §131 | 8B. 部署排查案例：package.json 層級異動的交付規則 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §132 | 9. Editor / Tiptap Canon | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §133 | 10. UI / Design System Canon | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §134 | 11. Windows / PowerShell / Debug Canon | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §135 | 12. Tasks / Events / Tags / Folders 邊界 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §136 | 13. 決策 D-01～D-43 | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §137 | 14. vNext Architecture & Feature Decisions（2026-07-02 最新產品 / 架構共識） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §138 | 15. 決策 D-70～D-106（vNext Architecture + r15 Deep Review） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §139 | 15.1 決策 D-107～D-108（Track A：Link / TaskList / TaskItem） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §140 | 15.2 決策 D-109～D-110（Track E：Workspace Backup / Export package v0） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §141 | 15.3 決策 D-111（Track A2：Bulk Select）與 D-112（協作模式：工作區直接維護代碼） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §142 | 15.4 決策 D-113（Track C：Study Set kind 欄位）與 D-114（NexusApp.tsx 拆檔） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §143 | 15.5 決策 D-115（Table block）與 D-116（package.json 交付規則） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §144 | 15.6 決策 D-117（Callout isolating 修正）與 D-118（jsdom 真實 Editor 驗證方法） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §145 | 15.7 決策 D-119（updateBlockMath/deleteBlockMath 必須傳 pos）、D-120（Table import 補齊）、D-121（模糊回報需先確認現象） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §146 | 15.8 決策 D-122（transaction 位置計算須用 tr.doc）、D-123（插入空節點 + selectNode 取代 window.prompt） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §147 | 15.9 決策 D-124（Track G：Command Palette）與 D-125（Track G：Dashboard / Home v0 提前落地） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §148 | 15.10 決策 D-126（Import 選單維持獨立於「新增」入口）與 D-128（重新命名採原地輸入框互動） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §149 | 15.11 決策 D-130（PageItemMenu 選單邊界防呆）與 D-131（工具列「插入內容」統整為單一下拉選單） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §150 | 15.12 決策 D-132（Notion 風格 Drag Handle：NodeRange 依賴順序）與 D-133（帳號系統範圍維持既有原則） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §151 | 15.13 決策 D-135（ResizablePanel 抽出為獨立容器）與 D-136（收合觸發點回歸標頭列，取代浮動邊緣按鈕） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §152 | 15.14 決策 D-138（Sidebar 底部留白說明性註解）與 D-139（ResizablePanel 新增 bottomInset prop） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §153 | 15.15 決策 D-140～D-146（Track L/M：Document kind、新建入口收斂、Note 富文字排版分級、匯出範圍分級、帳號設定移入 Sidebar、拖曳把手觸發範圍 | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §154 | 15.16 決策 D-147～D-156（Supabase 雲端同步 + UI 改善） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §155 | 15.17 決策 D-157~D-172（本次 5任務+8點+簡報直觀+圖表分區+優化） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §156 | 15.18 決策 D-173~D-185（工具列置頂、排版同格、真正分頁、夜間適配、表格右鍵、空白頁刪除等） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §157 | 15.19 決策 D-186～D-197（2026-08-23 代碼審計 + Bug 修復 + 簡報功能改造 + 創作類別） | `HISTORY.md` | 決策登記原節已按開發時間補錄 |
| 02 §158 | 16. 可優化但不阻塞 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §159 | 17. 最終一句話 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §160 | 2026-09-14 帳號、同步與小說收尾日誌 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §161 | 2026-09-13 產品與工程更新日誌 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §162 | 2026-09-28 — 交接檔整合：09-16～09-25 工作紀錄與舊文件搬移 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §163 | 2026-09-16 — 小說獨立章節、角色卡與世界觀、多項介面修正 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §164 | 2026-09-19～09-20 — 新增選單、下拉刷新、右鍵操作與講義排版 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §165 | 2026-09-21 — 偏好與帳號入口重整 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §166 | 2026-09-22 ～ 2026-09-25 — FSRS 每日練習與測驗持久化（程式碼推導；無對話紀錄） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §167 | 附錄 A：舊 00（2026-09-14 版）全文【搬移，未改動】 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §168 | 0. 目前任務環節：正在進行與將要進行 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §169 | 1. 交接包怎麼讀 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §170 | 2. 目前進度：MVP 容器摘要 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §171 | 3. 任務執行規則 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §172 | 4. 檔案結構（更新至 2026-08-01 最新） | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §173 | 5. 使用者偏好與規則 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §174 | 6. 絕對不要做 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §175 | 7. 最短交接文字（更新） | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §176 | 8. 最終一句話 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §177 | 9. 最終深度審核（2026-08-01 更換對話串前零遺漏定版） | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §178 | 10. 任務定義、MVP 大綱與完整任務目錄 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §179 | 11. 2026-09-13 交接更新 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §180 | 12. 2026-09-14 交接更新（優先閱讀） | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §181 | 附錄 B：舊 01（2026-09-14 版）被替換段落原文【搬移，未改動】 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §182 | 3. 功能總覽與狀態矩陣 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §183 | 11. 決策索引與舊 Canon 對照 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §184 | 12. 已知需求缺口與未來功能清單 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §185 | 2026-09-28 — 後續對話增量補記：字卡收尾、目錄重構與製譜規劃 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §186 | 2026-09-28 — 字源百科本機匯入回報、CEEC 資料整理暫停與公共字典管理需求確認 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §187 | 2026-09-28 — Git Windows 保留檔名修復、VS Code 儲存衝突、FSRS 測試與 UI 補充（增量記錄） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §188 | 2026-09-28 — 雙路徑學習模組盤點、清理及指定測試／build 驗證（最新增量） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §189 | 2026-09-28 — 三份交接文件主章節一致性整合（本次增量） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §190 | 2026-09-28 文件治理｜主文件去重與集中決策進度（僅記錄歷史） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §191 | 2026-09-28 來源增量存檔｜原 00 §13～§16（保持原文；非現行指令） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §192 | 13. 2026-09-28 後續對話增量交接【新增；若與前述舊快照衝突，以本節的已確認新決策為準】 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §193 | 14. 2026-09-28 最新增量：字典管理系統成為目前優先規劃（新對話先讀） | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §194 | 15. 2026-09-28 本輪交接補記：Git 修復、學習測試與儲存提示（最新狀態） | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §195 | 16. 2026-09-28 最新補記：學習雙路徑已釐清並完成本機驗證（優先於 §15.2、§15.4 舊待辦） | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §196 | 2026-09-28 來源增量存檔｜原 01 §14～§20（保持原文；非現行契約） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §197 | 14. 2026-09-13 現行功能與帳號規格【部分被 §15 修訂，已標註】 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §198 | 15. 2026-09-16 ～ 2026-09-25 現行功能與決策【新增】 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §199 | 16. 2026-09-28 後續決策補充（現行；取代 §4 F-STUDY 中相衝突的舊描述） | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §200 | 17. 2026-09-28 新確認決策：全站共用字典／管理者／字卡底部資訊（最新有效） | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §201 | 18. 2026-09-28 本輪規格補充：儲存提示、字源檔名及學習模組一致性 | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §202 | 19. 2026-09-28 最新有效契約：正式學習模組單一路徑與底部布局 B（取代 §18 待確認項） | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §203 | 20. 2026-09-28 產品規格／任務對照與未決邊界（本次整合） | `HISTORY.md / archive` | 附屬解題／原始交接段落；同事件合併，不當作新決策 |
| 02 §204 | 2026-09-28 來源快照存檔｜原 00 §4（2026-09-25 檔案樹；非現行目錄） | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §205 | 4. 檔案結構（依 2026-09-25 程式碼快照重建）【修改】 | `HISTORY.md / archive` | 早期規格副本、進度快照或操作紀錄；有效契約依 01 與新文件，細節保持封存 |
| 02 §206 | 2026-09-28 後續增量｜公共字典與個人字卡產品模型澄清 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §207 | 2026-10-08 — 公共字典 source/license 退休、Draft 清空與正式 Word／Prefix／Root 母檔封裝 | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |
| 02 §208 | 2026-10-11 — Dictionary identity／pronunciation／Study reliability 收斂與 final canonical master | `HISTORY.md` | 依日期整理該事件的背景、處理／結果；省略重複操作與貼碼 |

### 審核結果與保留界線
- **來源保存完整**：00／01／02 原文各有一份位元組大小核對一致的 GitHub 封存；未刪除來源。
- **規格轉移**：01 已定的主要產品及技術章節已搬入 SPEC／ARCHITECTURE；00 最新交接區段搬入 HANDOFF；02 有日期的大事件與 D 決策登記搬入 HISTORY。
- **非逐字複製**：02 內部的技術命令、修 Bug 操作流水帳、舊規格副本、長篇環境快照與重複章節仍主要依賴 archive。這是有意去重，**不能說四份新文件包含舊檔的全部字句**。
- **待使用者裁定**：無法證實過時與否、未實際在 main／production 驗證的決策，不升級成 Approved／Deployed。
