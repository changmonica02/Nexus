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
