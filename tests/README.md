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
| 學習 | `tests/study/` | 32 |
| 世界地圖 | `tests/world-map/` | 12 |
| 筆記 | `tests/note/` | 6 |
| 創作 | `tests/creation/` | 11 |
| 生活 | `tests/life/` | 6 |
| 工作區 | `tests/workspace/` | 12 |
| 共用 | `tests/shared/` | 11 |
| 球面幾何實驗 | `experiments/spherical-grid/` | 13 |

合計 173 份已編目的正式／實驗測試。8 份效能基準仍位於球面幾何實驗目錄並依獨立清冊管理。

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

- `dictionarySenseExchange.test.cjs`：移除與 `dictionarySenseEditor.test.cjs` 重複的兩項 Draft 衍生義／例句映射 ID 斷言，保留 JSON 解析、驗證、版本拒絕與過時欄位拒絕。

## 字典管理、閱讀器與歷史升級測試精簡（2026-11-17）

- `dictionaryAdminUI.test.cjs`：將一般列表篩選案例整併至多條件篩選測試，補上搜尋無結果的斷言；刪除過時選取按鈕、舊說明文字、固定核取方塊數及 CSS 實作斷言。
- `dictionaryReader.test.cjs`：移除補充資料區塊固定先後順序的斷言，保留 IPA 排序、義項與共用資料、來源安全及公開資料隔離。
- `dictionaryVerificationRetirement.test.cjs`、`maintenanceCleanupRetirement.test.cjs`、`dictionaryInflectionsSQLRetirement.test.cjs`：核對真實 PostgreSQL 遷移、Review CAS、操作收據及 RLS 後保留；現階段不以名稱或時間舊為理由直接刪除。
- 字典測試檔案仍維持 70 份，已刪減獨立重複案例及易碎斷言；需要最新完整 CI 結果才能宣告實際執行通過。

## 非字典測試清理（2026-11-17）

- 完成瀏覽器測試分組後根目錄路徑修正：`tests/study/`、`tests/world-map/`、`tests/creation/`、`tests/life/`、`tests/workspace/`，避免 esbuild 錯找 `tests/node_modules`、`tests/.next/static`、`tests/study/fixtures`；不改實際功能程式。
- 現行 `SPEC.md` 明確規定唯一的三按鈕間隔排程；刪除只驗證舊 FSRS 作答演算法的 `tests/study/studyFSRS.test.cjs`，快速 CI 改以 `studyIntervals.test.cjs` 作為代表測試。同步更新完整 CI、測試清冊及快速測試選取器自測。
- `studyStyles.test.cjs` 不再對使用者已退役的 FSRS 排程選擇跑一套額外正式作答測試；舊四級事件／未完成 Session 的相容性驗證仍留存，避免刪除受支援的歷史資料保障。
- `round3UI.test.cjs` 刪除兩項已退役的字典顏色標籤／發布歷史畫面檢查；保留導覽網址安全、編輯內容保持及排序偏好。
- `post63UI.test.cjs` 移除固定圖示筆畫寬度、固定按鈕數量及 CSS 樣式的斷言，保留顯示資料與功能行為。
- 僅完成 JavaScript 語法與清冊靜態檢查後才能確定搬移修正合理；最新 GitHub CI 未通過前不宣稱完整驗證成功。

- `studySessionStability.test.cjs` 唯一的「已顯示題目不受新到期忘記卡搶占」案例完整併入 `studyIntervals.test.cjs`；已同步更新 CI 與清冊後移除原獨立檔案，沒有刪掉原始行為保障。

## CI 去重與效能測試分流（2026-11-17）

- 完整 PR CI 的 `studyIntervals.test.cjs` 只在 `study-regression` 執行；`study-b` 保留離開學習、可見性及資料庫保障。
- `additional-regression` 先查詢補充瀏覽器測試數量，無需瀏覽器時不再安裝 Chromium。
- `dictionaryExchangeScale.test.cjs`、`dictionaryPersistentScale.test.cjs` 與 `studyStartup.performance.test.cjs` 保留檔案，但不列入 PR 完整 CI；容量與失敗回復斷言未刪除。`dictionaryRankedComponents.test.cjs` 的一般功能、RLS 與交易安全斷言仍在 PR 執行，只有 6,301 筆壓力情境須設定 `NEXUS_PERFORMANCE=1` 才執行。
- 球面幾何 PR 測試與離線預覽照常執行，8 份球面效能基準不再隨 PR 自動執行；未修改 `experiments/spherical-grid/` 的實驗程式。
- 效能與大量資料測試集中至 `.github/workflows/performance-manual.yml`，使用 GitHub Actions 的 `workflow_dispatch` 手動選擇 `all`、`dictionary`、`study` 或 `spherical-grid`。
- `tests/tools/run-full-extras.mjs --audit` 的 `deferred` 列表會明確列出不作 PR 必要檢查的測試，以免補充執行器重新納入。這些測試**不是刪除**，需要大型資料的安全驗證仍可手動執行。

## 正式建置與環境共用（2026-11-17）

- `ci-full.yml` 新增 `production-fixture-build`，使用固定的合成 Supabase PWA 環境變數執行一次 `npm run build`，再以短期 GitHub Actions artifact 交付 `.next/`、`public/world-map/core/` 與 `public/world-map/offline.js`；隱藏的 `.next` 目錄須明確包含。
- `workspace-regression` 及 `additional-regression` 的字典、世界地圖、工作區群組下載此產物，不再各自執行相同設定的正式建置。額外測試只在需要瀏覽器時安裝 Chromium。
- `world-map` 仍保留附有 `NODE_ENV=production`／`NPM_CONFIG_OMIT=dev` 的獨立正式建置，`global-editor` 仍獨立驗證 Worker 產物；未將不同條件的檢查視為等價。
- 共用建置引入 `needs: production-fixture-build`：依賴此產物的群組會等候上游建置成功，無法視為減少了每個工作需各自安裝 npm 相依套件的成本。實際速度與可用性應以 GitHub Actions 結果驗證。

## 低價值斷言及已停止支援的歷史測試清理（2026-11-17）

- 第一輪：`shared/round3UI.test.cjs` 移除僅比對 `useCollectionPreferences.ts` 程式碼文字的斷言，保留排序方向及安全返回網址驗證。
- 第一輪：`shared/post63UI.test.cjs` 移除固定下拉選單形式的整項呈現測試及部分裝飾屬性斷言；保留時間計算、內容類型與使用者文字顯示。
- 第一輪：`dictionary/dictionaryAdminUI.test.cjs` 移除針對固定實作寫法的正規表示式斷言，保留 Word 欄位可編輯及主要資料操作測試。
- 第二輪：移除 `study/studyQuizRetirement.test.cjs` 與 `shared/pageDefaultModeRetirement.test.cjs` 兩份舊升級路徑專項測試，並從完整 CI 及分組清冊刪除其引用；對應的正式遷移檔案並未刪除。
- 第二輪：`study/studyStyles.test.cjs` 移除舊四級作答事件及未完成 FSRS 場次升級的兩項案例，保留現行三按鈕間隔排程、額度、備份與重試測試。
- 第二輪：`world-map/worldMapBlocks.test.cjs` 移除歷史區塊轉換案例，保留目前地圖實體定位及可見性驗證；`workspace/workspaceDeployment.test.cjs` 移除「新介面搭配尚未更新的舊資料庫」案例，保留現行交易原子性、權限及升級失敗回復。
- **政策範圍**：不再以每次 PR CI 驗證已停止支援的舊用戶端／舊版直接升級路徑，但現行資料安全、同步隔離、原子寫入及必要 SQL 遷移防護仍為必要測試；不等於保證舊用戶端與歷史資料已能安全升級。
- 本輪分組清冊由 164 減至 **162** 份；更早的 `173` 份統計是歷史截面，不代表現況。GitHub Actions 完整通過與否應以本輪提交後的工作結果為準。

## 跨模組第三輪：減少重複完整瀏覽器旅程（2026-11-17）

- 字典：`dictionaryExchange.browser.test.cjs` 的完整匯入／匯出回歸由三組尺寸縮減至桌面與手機；`studyDictionaryPanel.browser.test.cjs` 的獨立公開閱讀頁面重複流程也縮減至桌面與手機，主要學習面板流程仍涵蓋桌面、平板與 320px 手機。
- 學習：`unifiedStudy.browser.test.cjs` 的完整學習流程改用桌面與手機；`studyReading.browser.test.cjs` 由四組尺寸去掉重疊的 390px 手機，但仍保留桌面、平板及 320px 手機，保留語音錯誤及會話不變性情境。
- 創作：`characterTemplates.browser.test.cjs` 與 `creationTemplateLibrary.browser.test.cjs` 的全流程僅於桌面與手機各跑一次；平板仍由 `characterTemplateUpdate.browser.test.cjs` 的專項檢查涵蓋。
- 生活：`lifeViews.browser.test.cjs` 的四種視圖切換與溢出測試由三組尺寸縮減為桌面與手機；`lifeLists.browser.test.cjs` 的平板版面檢查保留。
- 世界地圖：`worldMap.browser.test.cjs`、`worldMapUI.browser.test.cjs`、`globalMapEditor.browser.test.cjs` 分別保障原生專案寫入、地圖編輯介面和全球地圖離線／重連；無等效取代之前不整檔合併或移除。
- **範圍與限制**：本輪減少 7 個重複的瀏覽器尺寸／操作組合，但未刪除測試檔案，也未減少功能／資料安全斷言。每份仍由原 CI 路徑執行；最終通過與實際耗時仍以 GitHub Actions 為準。
