# Nexus 字源百科 MVP 實作驗收報告

更新日期：2026-09-28。此版取代前次「缺少第八批」的阻塞結論。

## 本輪結果

已讀取實際第八批原始資料，完成 Markdown/YAML 解析、資料驗證、完整原文保存、本機交易式冪等匯入與 dry-run。既有百科 UI 與 migration 未重寫，沒有操作 production Supabase，也沒有部署。

成功完成本機完整匯入與重複匯入；**不表示 production 已有資料，也不表示字根詞源已全部核對**。

## 原始檔案結構

`data/etymology/batch-08/` 共 150 份 Markdown：

- `prefixes/`：79 份（72 個一般字首、7 個構詞形式）。
- `roots/`：14 份正式字根條目。
- `words/`：39 份單字條目，包括 rent 的兩個獨立 ID。
- `review/`：16 份審核／完整字根原稿／原始筆記。
- 根目錄 README 與 INDEX：2 份。

原稿未修改。測試逐一比較 150 份 source 的 UTF-8 bytes 與原始檔，以及 SHA-256；全部一致。未結構化的 review/raw 與字根逐字完整紀錄沒有自動拆成詞根，也沒有刪減。

## 本輪實際修改清單

| 檔案 | 修改目的 |
| --- | --- |
| `scripts/etymology/parser.mjs`（新增） | YAML frontmatter、H2 正文、原文保存、狀態與關聯驗證、逐檔審核報告 |
| `scripts/etymology/store.mjs`（新增） | 沿用既有 migration 初始化本機庫；整批交易、重複跳過、內容衝突拒絕 |
| `scripts/import-etymology.mjs` | 從前置檢查升級為可執行的 dry-run／本機匯入 CLI，加入路徑限制與單程序鎖 |
| `package.json`、`package-lock.json` | 將既有鎖定版本 js-yaml@4.3.0 明列為直接 devDependency；未升級其他套件 |
| `.gitignore` | 排除 `.local/etymology/` 本機資料庫與鎖檔 |
| `tests/etymologyImport.test.cjs`（新增） | 完整資料解析、原稿完整性、錯誤案例、冪等性、回滾、CLI 邊界測試 |
| `tests/etymology.test.cjs` | 更新原先前置檢查測試，驗證缺件阻塞與未結構化原文保存 |
| `tests/etymologyUI.test.cjs` | 增加真實匯入資料的所有條目／單字頁渲染測試，保留原測試 |
| `data/etymology/README.md` | 本機使用指令與審核界線 |
| `data/etymology/batch-08-dry-run.json` | 實際 dry-run 結果與逐檔報告 |
| `data/etymology/batch-08-import.json`（新增） | 實際首次本機匯入結果 |
| `data/etymology/batch-08-repeat.json`（新增） | 實際重複本機匯入結果 |
| `NEXUS_ETYMOLOGY_IMPLEMENTATION_REPORT.md` | 本報告 |

原始 `data/etymology/batch-08/**` 是使用者新增的輸入，不是工程師生成的資料。工作目錄中前一輪百科頁面、字卡列表／編輯器等未提交修改均保留，不算本輪重做的功能。

## 沿用資料結構

沒有新增或修改 migration；沿用 `supabase/migrations/20260928_etymology_catalog.sql` 的八表：

| 表 | 本批資料列數 |
| --- | ---: |
| etymology_sources | 150 |
| etymology_entries | 93 |
| etymology_senses | 82 |
| etymology_categories | 10 |
| etymology_entry_categories | 68 |
| etymology_words | 39 |
| etymology_word_senses | 42 |
| etymology_claims | 237 |
| **合計** | **721** |

沿用 owner_id 複合主鍵、外鍵、RLS 與唯讀 `get_etymology_catalog()` RPC。未改動學習卡、FSRS、Quiz、登入、同步、IndexedDB 或 production baseline。

## 解析與映射規則

1. YAML 使用 js-yaml 的 JSON_SCHEMA，支援本批實際使用的引號、區塊／行內陣列、多層義項、CRLF、BOM。重複 mapping key、不支援 tag、未封閉 frontmatter、循環 alias、NUL 等拒絕。
2. entry/word/sense ID 直接沿用原稿；重複 ID 與重複明列關聯報錯。缺少必要欄位、未知 kind／查證狀態、不存在的義項 ID 均列出檔案與錯誤代碼，整批不寫入。
3. source/category/claim 因原稿未提供對應資料庫 ID，採路徑／分類標籤／條目 ID + 段落名稱的 SHA-256 決定性 ID；不是自行補造義項。
4. 25 份草稿字首沒有 senses 或穩定 sense ID，保留條目與原稿，不從正文自行補建義項。
5. 分類只取明列的 sense categories。定義只取 definitions 的 pos／meaning_zh，不補寫詞義。
6. `morpheme_sense_ids` 是唯一單字義項關聯來源。原稿未明列每條 edge 是歷史詞源還是學習聯想，因此 42 條先以 learning_decomposition + pending 保存，絕不由單字整體的查證狀態推導所有 edge 已查證。
7. `example_for_illustration` 不產生單字實體或關聯。字串形式的條件變體與 display_forms 保留，不從字母相似創建 variant_of。義項的變體與使用限制另以學習註記顯示。
8. 已有 H2 詞源說明／證據、學習拆解／核心概念、記憶故事分開保存為 claims。程式碼圍欄內的標題不解析；「舊版內容（留存供審計，不作為正式義項）」後的正文只保留原文，不重建現行義項或歷史說法。
9. 未能可靠結構化的正文、來源 URLs、未知欄位、舊內容，全部保留在 `sources.raw_markdown` 與 `metadata.frontmatter/body`，輸出審核提醒。來源文字沒有 HTML 執行或詞源事實補寫。

### 查證範圍

接受並保留原稿實際使用的七種狀態：
`prefix_meaning_reference_checked`、`sense_level_checked_not_word_exhaustive`、`sense_checked_example_requires_individual_word_audit`、`meaning_only`、`draft_meaning_only`、`etymology_checked_for_stated_claims`、`etymology_checked`。

只有明述歷史說法的原稿查證狀態及來源足夠時，才將該段／該義項 etymology_note 設為 verified；verification_note 記錄原始狀態及適用界線。僅有字首含義查證不等同所有詞源／例詞均已核對。未提供來源的段落保持未查證／待審核。

「完整記憶故事」與「原稿記憶說明」24 段一律 historical_scene + unverified，既有 UI 會標示「記憶情境」。不受單字頂層 etymology_checked 提升。

本批 claims 分布：40 段原稿範圍內已查證詞源、27 段未查證詞源、32 段待審核詞源、114 段待審核學習拆解／註記、24 段未查證記憶情境。這些是原始狀態映射，**不是本輪重新進行外部詞源查證的結果**。

## 冪等、交易與本機限制

- 使用一個 PGlite transaction 寫入整批 721 筆。先來源、條目、義項／分類，再單字關聯與 claims，並在結束前驗證 deferred constraints。
- 同一 owner、同一 ID、欄位完全相同：跳過；不更新時間或重複建立資料。
- 同一 ID 內容不同：`ID_CONTENT_COLLISION`，整批回滾；不靜默覆寫、不刪除既有內容。修訂版資料的更新／合併尚不在本輪授權範圍。
- dry-run 預設使用記憶體 PGlite，套用相同 migration，實際演練插入與外鍵，再刻意回滾；無持久化資料庫寫入。指定既有 local DB 也只演練後回滾。
- CLI 只接受 `.local/etymology/` 下的 PGlite 路徑，拒絕遠端 URL／其他位置／symlink 或 junction，不載入 Supabase credentials。
- 本機持久庫有相鄰 `.import-lock`，避免同時開啟檔案資料庫。已有鎖就拒絕，不自行解除他人的鎖；異常中斷的鎖需先確認程序停止後再人工處理。
- 報告不能寫進原始資料包。成功 exit 0；解析、驗證或匯入失敗 exit 2。JSON 包含逐檔狀態、錯誤代碼與審核項目。

## 實際執行指令與結果

在 Nexus 專案根目錄執行：

```powershell
node scripts/import-etymology.mjs --dry-run --report data/etymology/batch-08-dry-run.json
node scripts/import-etymology.mjs --apply-local --local-db .local/etymology/batch08-import --owner 11111111-1111-4111-8111-111111111111 --report data/etymology/batch-08-import.json
node scripts/import-etymology.mjs --apply-local --local-db .local/etymology/batch08-import --owner 11111111-1111-4111-8111-111111111111 --report data/etymology/batch-08-repeat.json
```

owner UUID 僅用於本機測試；沒有操作任何 production 帳號。

| 執行 | 成功文件 | 跳過文件 | 失敗文件 | 待審核來源 | 寫入資料列 | exit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| dry-run | 0（預計 150） | 0 | 0 | 150 | 0（預計 721） | 0 |
| 首次本機匯入 | 150 | 0 | 0 | 150 | 721 | 0 |
| 相同資料重跑 | 0 | 150 | 0 | 150 | 0（跳過 721） | 0 |

審核數量以「來源文件」計，共 150 份、175 條提醒：18 份原始／審核文件完整保存、132 份結構化文件的來源範圍確認，以及其中 25 份沒有穩定義項的草稿。分類互有重疊，不可將 175 當成不同文件數。保守保留提醒不代表匯入失敗，也不代表每段資料都未查證；42 個關聯的待審核狀態另外保存於資料表。

## 測試與 build

- 完整 `node --test`：**83 passed / 0 failed**，包含原有 Study、Quiz 及 17 項字源相關測試。
- `tsc --noEmit --incremental false`：exit 0。
- 匯入 CLI/parser/store 限定 ESLint：exit 0。
- `npm run build`：exit 0；Next.js 編譯、型別檢查、頁面生成成功，百科 route 保留。
- `npm run lint`：exit 2；沿用既有 CJS lint 設定缺少 react-hooks plugin 的問題，沒有刪除測試或降低規則。
- `git diff --check`：通過。

測試包含全批原文與 hash、穩定義項、示意例詞不建關聯、變體不猜測、未知欄位保留、重複 ID／YAML key、缺少欄位、未知狀態、壞關聯、首次匯入、重跑、dry-run 零持久寫入、帳號隔離、衝突回滾、晚期 DB 失敗整批回滾、遠端路徑拒絕、原稿覆寫防護及鎖衝突。

前端未重寫。新增測試从真實 PGlite 匯入結果透過原 RPC 讀取 catalog，交給現有 React 元件渲染全部 93 條目與 39 單字詳細頁，驗證 propose 的記憶情境、root-pos 義項雙向連結、re 多義項等。這是實際資料的元件渲染測試，沒有連 production 或更改前端資料來源；本機資料庫不會自動顯示於 production 網站。

## 仍需人工審核的項目

1. 25 份沒有穩定義項 ID 的草稿，目前僅保留條目／來源。需資料編輯者補 ID 後才可結構化，工具不補造。
2. 原始字根長筆記、舊版內容與未結構化段落完整保留，仍需人工整理與詞源查證。
3. 42 條 morpheme_sense_ids 的歷史／教學關聯性質需要逐詞核對；不藉由單字頂層狀態直接升級。
4. 如果未來要覆寫修訂來源，需另行設計審核式更新流程；目前相同 ID 改內容會安全拒絕。
5. 正式 Supabase migration／正式匯入仍完全未執行，需要另行授權，不能把本機驗證當成已發布。

未建立 commit、未部署、未修改百科頁面、現有 migration、學習／FSRS／Quiz／登入／同步功能或 `nexus-codebase-current.md`。
