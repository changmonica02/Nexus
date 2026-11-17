# Nexus 自動化測試

- 權威清冊：`tests/config/test-groups.json`。每個測試檔案只指定一個主要負責群組，避免完整測試重複執行。目前正式測試已依功能分為 `tests/dictionary/`、`tests/study/`、`tests/world-map/`、`tests/note/`、`tests/creation/`、`tests/life/`、`tests/workspace/`、`tests/shared/`；共用測試資料保留於 `tests/fixtures/`，輔助程式存放於 `tests/helpers/`，執行工具存放於 `tests/tools/`。
- 群組：`dictionary`、`study`、`world-map`、`note`、`creation`、`life`、`workspace`、`shared`。
- `benchmarks` 為效能基準，獨立於一般迴歸測試。
- `shared` 的測試具有跨模組性質；後續快速 CI 應依修改檔案與相依關係選取，而不是所有變更一律跑完整 `shared`。
- 跨模組測試只有一個主要歸屬，但變更可能同時觸發多個群組，後續的 CI 選擇器需要做去重。
- 目前已完成測試實體分組及管理檔案集中整理；工作流程的實際執行結果仍需另行驗證。

唯讀操作：
```sh
node tests/tools/test-groups.mjs --list
node tests/tools/test-groups.mjs --group dictionary
node tests/tools/test-groups.mjs --benchmarks
```

清冊完整性核對（不執行測試）：
```sh
node tests/tools/test-groups.mjs --check
```

若新增／刪除測試檔案，請同步更新清冊。已加入 Draft PR 與 Ready for review 的工作流程；舊 `note-editor.yml` 與 `global-map-editor.yml` 已在本分支移除。球面實驗專項 CI 保留。

## Draft PR 快速驗證（試行）

- `.github/workflows/ci-fast.yml`：僅在 Draft PR 更新（或手動觸發）時執行；目前與既有工作流程並行，尚未取代舊 CI。
- `tests/tools/select-fast-tests.mjs`：讀取 PR 與目標分支間所有變動檔案，依模組歸屬與關鍵相依性選取少量必要的非瀏覽器測試；高風險語音修改另含瀏覽器測試。
- 未辨識、跨模組、資料庫、共用程式、相依套件與 CI 設定修改，保守擴大至所有群組的快速基礎驗證，不能自行略過。
- 目前是「快速基礎測試＋關鍵情境」而非完整群組測試。Ready for review 的完整 CI 已建立，但同環境重複測試整合及分支保護仍待完成。
- Draft PR 由快速 CI 選取必要測試，非 Draft PR 由完整 CI 驗證；`spherical-grid-prototype.yml` 僅在球面實驗相關變更時獨立觸發。
- 工作流程內的選擇器契約測試：`node --test tests/tools/select-fast-tests.test.mjs`。測試不需連接正式資料庫。
- CI 會建立暫存的 `.fast-changed` 與 `.fast-plan.json`；這兩個檔案僅是執行中的產物，不屬於專案保存資料。

完整 CI 仍必須處理所有正式測試（包含瀏覽器、資料庫、離線），不能將快速選擇的通過結果視為正式合併授權。

## Ready for review 完整驗證（試行）

- `.github/workflows/ci-full.yml` 監聽 `opened`、`ready_for_review`、`synchronize`、`reopened`，只對非 Draft PR 執行；也保留手動觸發入口。
- 整合既有 Note editor audit 六個工作與全球地圖整合工作，維持 PostgreSQL、Chromium、WebKit、離線及正式建置情境；球面幾何、離線預覽與 8 項效能基準仍交由獨立 `spherical-grid-prototype.yml` 執行。
- `tests/tools/run-full-extras.mjs` 比對測試清冊與既有工作流程，依主要群組補跑未被既有 CI 明確涵蓋的測試；按測試環境區分非瀏覽器與 Chromium 測試。
- 測試清冊已移除不屬於正式驗證的 A/B/C 分頁比較研究；正式測試的工作分配以 `tests/tools/run-full-extras.mjs --audit` 即時查核，不沿用過期數量。
- 8 個效能基準維持清冊記錄，但不列入每次完整 CI。
- 本分支已移除重複的 `note-editor.yml` 與 `global-map-editor.yml`；`ci-full.yml` 額外監聽 `main` 推送，保留合併後驗證；未修改主分支／分支保護。
- 這份完整 CI 是試行版本，尚未執行或驗證所有整合測試是否通過。既有 `worldMapUI.browser.test.cjs` 曾在 Chromium 等待資料狀態時失敗，不能因重組 CI 就忽略。
- 舊筆記與全球地圖工作流程已移除，但合併前仍須確認最新完整 CI 與任何既有分支保護要求；既有失敗案例不得因整合而略過。
- Ready 後有新提交會重新執行完整工作流程；合併時仍應以最新程式碼的實際檢查結果為準。

## 字典測試整理（第一輪，尚未刪除）

- 逐檔清冊：`tests/config/dictionary-test-audit.json`；按目前字典群組的 **70** 個測試分類，包含測試領域、處理方向及每個檔案的原因。
- 核心保留 **40**、整併候選 **15**、更新現行規格 **11**、退役候選 **4**。這是**審查優先順序，不是排除 CI 或批准刪除**。
- 保留的最低保障：字典新建／編輯與公開發布、Review 及版本 CAS、真實資料庫權限／RLS、原子寫入及回復、例句與衍生義的引用完整性、JSON 資料交換、跨裝置衝突重試、公開資料與個人字卡隔離、公開內容安全及 PWA 離線查詢。
- 更新現行規格時，特別注意**最新版使用者匯入只支援 JSON**。舊 CSV／Markdown 測試應按實際支援入口調整，但不得移除匯入拒絕危險欄位、身份及資料完整性檢查。
- 歷史退役測試並非一律多餘；首先確認可由目前受支援版本升級而來的路徑是否仍會執行相關遷移，再決定整併或移除。
- **整併或刪除前置條件**：逐項列出被移除的原斷言及負責的新測試、確認 PostgreSQL／瀏覽器／離線環境仍充分涵蓋、執行新測試成功，最後同步修改清冊與 CI；不能因舊測試失敗就刪除。
- 使用 `node tests/tools/test-groups.mjs --check` 可同時檢查字典審查清冊與正式測試分組沒有漏檔、重複或錯誤分類。

整理次序建議先更新 11 個舊規格測試，再比對 16 個整併候選的實際斷言，最後審查 4 個退役候選是否超出資料升級支援範圍。所有分類在確認替代測試前維持原 CI 執行。

## 已實際精簡的測試

- 移除 `dictionarySenseDraftRPC.test.cjs`：舊版 B2 helper 中允許無衍生義例句的情境已不符合現行必填關聯規格，當前原子寫入與父層 Draft RPC 迴歸由 `dictionaryExamplesAtomicDraft.test.cjs` 負責；更新 CI 及清冊後不再執行已退役檔案。

- `dictionaryIdentity.test.cjs`：移除兩項僅測舊 CSV 表格分組及同形構詞的重複單元測試；保留跨 JSON／AI／手動寫入的真實 PostgreSQL 身分一致性、發布保護與重複身分遷移拒絕。

- `dictionaryImportReview.test.cjs`：刪除舊 CSV 空白 Entry/Sense ID 每次預覽自動配置的單元測試，保留匯入審核、衝突、SQL 與回復測試；現行 JSON 身分驗證由 `currentImportBoundary.test.cjs` 負責。

- `dictionaryDraftPipeline.test.cjs`：移除舊 CSV 空白 Entry ID 合併同形文字與重複 Sense ID 的專項測試；現行 JSON 重複身分拒絕與同形構詞個別身分由 `currentImportBoundary.test.cjs` 覆蓋。


## 實體測試目錄（2026-11-17）

| 群組 | 路徑 | 測試數 |
| --- | --- | ---: |
| 字典 | `tests/dictionary/` | 70 |
| 學習 | `tests/study/` | 34 |
| 世界地圖 | `tests/world-map/` | 12 |
| 筆記 | `tests/note/` | 6 |
| 創作 | `tests/creation/` | 11 |
| 生活 | `tests/life/` | 6 |
| 工作區 | `tests/workspace/` | 12 |
| 共用 | `tests/shared/` | 11 |
| 球面幾何實驗 | `experiments/spherical-grid/` | 13 |

合計 175 份已編目的正式／實驗測試。8 份效能基準仍位於球面幾何實驗目錄並依獨立清冊管理。

- 快速測試從 `tests/config/test-groups.json` 依變更範圍選擇既有檔案，不另複製一份快速測試。
- 完整 CI 與舊工作流程的直接測試指令均改為新路徑。
- `tests/tools/test-groups.mjs --check` 遞迴檢查實體目錄與兩份清冊；最新完整 CI 通過前，不宣告執行驗證完成。

## 退役審核（2026-11-17）

- 已移除 `tests/note/notePagination.study.test.cjs`：A/B/C 分頁方案的歷史比較研究，原本便不屬正式 CI；目前正式筆記匯出、表格跨頁與列合併驗證由 `tests/note/noteExport.browser.test.cjs`、`tests/note/noteTablePagination.browser.test.cjs` 等負責。共用測試資料 `tests/fixtures/notePaginationCases.cjs` 仍由現行瀏覽器測試使用，故保留。
- 已同步調整分組清冊及完整 CI 補充執行器的研究例外規則。
- `Retirement` 類測試涉及舊資料庫版本升級、權限與操作收據，單憑檔名不能判定冗餘。缺乏等效斷言及完整 CI 驗證前，保留現有安全測試。
- `experiments/spherical-grid/` 及其 8 項效能基準依使用者要求保持原狀。

## CI 重複工作流程精簡（2026-11-17）

- `.github/workflows/note-editor.yml`、`.github/workflows/global-map-editor.yml` 已從自動化測試改良分支退役，相關必要驗證由 `.github/workflows/ci-full.yml` 承接。
- `ci-full.yml` 在非 Draft PR 與 `main` 推送執行；相同命令的第二次 Global Map WebKit 執行已移除，仍保留 Chromium 與 WebKit 跨瀏覽器驗證。
- `spherical-grid-prototype.yml` 獨立保留球面網格測試、離線預覽及 8 項效能基準；完整 CI 不再重複其幾何工作。
- 補充測試涵蓋率由現存 `ci-full.yml` 和 `spherical-grid-prototype.yml` 動態計算，不再引用已退役 YAML。
- 分支保護要求與現有 CI 失敗須在 PR 合併前另外查核；不因移除舊流程宣稱新 CI 全數通過。

## 字典測試第二輪精簡（2026-11-17）

- `dictionaryAdminUI.test.cjs`：移除固定 CSS、欄位欄寬、區塊順序及舊遷移檔文字等依賴實作方式的斷言，並刪除「空白分類提示」與「IPA 區塊排列」兩個重複測試；保留 JSON 匯入／預覽、內容隔離、公開資訊安全、權限、儲存及審核等行為測試。
- `dictionaryReaderAdmin.test.cjs`：刪除已退役的列表選取原始碼測試與純顯示順序檢查；保留管理分頁超過 1000 筆、伺服器端篩選、非管理員權限及 PostgreSQL 發布原子回復。
- 字典測試檔案數仍為 70；本輪是刪除低價值測試案例及斷言，而非將必要測試搬到未執行的清冊。
- 已確認修改後兩份 JavaScript 測試檔案可解析、字典審查清冊 JSON 可解析；尚未取得完整 CI 測試通過結果，後續以實際執行結果驗證。

## 字典匯入與 AI 測試精簡（2026-11-17）

- `dictionaryDraftPipeline.test.cjs`：移除與 `currentImportBoundary.test.cjs` 重複的公開 CSV 停用斷言，不再要求已退役的五欄 CSV 格式可接受；仍驗證內部 CSV 轉接器的欄位錯誤及 UUID 拒絕、JSON 義項／例句連動與 SQL 原子回復。
- `dictionaryAI.test.cjs`：移除匯出視窗選項的固定顯示文字檢查；保留預設 Draft、審核草稿保護與 AI 資料安全驗證。
- `dictionaryImportReview.test.cjs`：移除硬編碼 12 欄的畫面外觀／格式數量檢查，保留必要欄位存在、Entry／Sense 身分穩定、重排、審核、操作收據及資料庫回復。
- 本輪修改未刪除任何正式測試檔案。已檢查三份測試程式語法、JSON 清冊解析，以及 70 份字典檔案與 70 筆審查紀錄一致；仍需以 GitHub 完整 CI 結果確認實際執行。

## 字典資料交換與跨裝置測試精簡（2026-11-17）

- 比對 `dictionaryTransfer.test.cjs`、`dictionaryExchangeSafety.test.cjs`、`dictionaryPersistentImport.test.cjs` 後，確認交換提案身分／中斷續傳、IndexedDB 容量錯誤與收據保全、跨裝置 CAS 與部分成功批次等保護不互相替代，故未刪除交易核心測試。
- `dictionaryPersistent.browser.test.cjs`：移除依固定三／二／一欄 CSS 網格計算的版面斷言，保留實際匯入與審核操作。
- `dictionaryExchange.browser.test.cjs`：移除已退役發布核取方塊、舊批次選取按鈕及歷史提示文字不存在的檢查，保留完整匯出、收據恢復、離線續傳與真正的全域發布。
- 共刪除 5 項純舊介面／固定版面斷言；沒有刪除檔案或放寬原子交易、安全與資料完整性斷言。最新 CI 執行結果仍需檢查。
