# Nexus 測試邏輯分組

- 權威清冊：`config/test-groups.json`。每個測試檔案只指定一個主要負責群組，避免完整測試重複執行。
- 群組：`dictionary`、`study`、`world-map`、`note`、`creation`、`life`、`workspace`、`shared`。
- `benchmarks` 為效能基準，獨立於一般迴歸測試。
- `shared` 的測試具有跨模組性質；後續快速 CI 應依修改檔案與相依關係選取，而不是所有變更一律跑完整 `shared`。
- 跨模組測試只有一個主要歸屬，但變更可能同時觸發多個群組，後續的 CI 選擇器需要做去重。
- 本次只建立測試分組與查核工具，不調整現有工作流程的觸發規則，也不聲稱這些測試都已通過。

唯讀操作：
```sh
node scripts/test-groups.mjs --list
node scripts/test-groups.mjs --group dictionary
node scripts/test-groups.mjs --benchmarks
```

清冊完整性核對（不執行測試）：
```sh
node scripts/test-groups.mjs --check
```

若新增／刪除測試檔案，請同步更新清冊。已加入 Draft PR 與 Ready for review 的試行工作流程；舊 CI 尚未停用。

## Draft PR 快速驗證（試行）

- `.github/workflows/ci-fast.yml`：僅在 Draft PR 更新（或手動觸發）時執行；目前與既有工作流程並行，尚未取代舊 CI。
- `scripts/select-fast-tests.mjs`：讀取 PR 與目標分支間所有變動檔案，依模組歸屬與關鍵相依性選取少量必要的非瀏覽器測試；高風險語音修改另含瀏覽器測試。
- 未辨識、跨模組、資料庫、共用程式、相依套件與 CI 設定修改，保守擴大至所有群組的快速基礎驗證，不能自行略過。
- 目前是「快速基礎測試＋關鍵情境」而非完整群組測試。Ready for review 的完整 CI 已建立，但同環境重複測試整合及分支保護仍待完成。
- 目前保留原有三份工作流程，因此 Draft PR 期間仍可能有舊 CI 的完整測試負擔；完成安全切換後才會真正減少這部分重複執行。
- 工作流程內的選擇器契約測試：`node --test scripts/select-fast-tests.test.mjs`。測試不需連接正式資料庫。
- CI 會建立暫存的 `.fast-changed` 與 `.fast-plan.json`；這兩個檔案僅是執行中的產物，不屬於專案保存資料。

完整 CI 仍必須處理所有正式測試（包含瀏覽器、資料庫、離線），不能將快速選擇的通過結果視為正式合併授權。

## Ready for review 完整驗證（試行）

- `.github/workflows/ci-full.yml` 監聽 `opened`、`ready_for_review`、`synchronize`、`reopened`，只對非 Draft PR 執行；也保留手動觸發入口。
- 合併既有 Note editor audit 六個工作、全球地圖整合工作、球面幾何與離線預覽工作，維持原有的 PostgreSQL、Chromium、WebKit、離線及正式建置情境。
- `scripts/run-full-extras.mjs` 比對測試清冊與既有工作流程，依主要群組補跑未被既有 CI 明確涵蓋的測試；按測試環境區分非瀏覽器與 Chromium 測試。
- 目前清冊 177 個測試：100 個由既有工作流程的直接呼叫、已知 npm 指令或球面實驗萬用字元涵蓋，另有 76 個由補充工作執行；`tests/notePagination.study.test.cjs` 屬分頁 A/B/C 比較實驗，列為非阻擋專項研究，不納入正式迴歸關卡。
- 8 個效能基準維持清冊記錄，但不列入每次完整 CI。
- 此階段保留三份舊工作流程、Draft 快速 CI 及正式部署設定，未修改主分支／分支保護。
- 這份完整 CI 是試行版本，尚未執行或驗證所有整合測試是否通過。既有 `worldMapUI.browser.test.cjs` 曾在 Chromium 等待資料狀態時失敗，不能因重組 CI 就忽略。
- 舊流程與新完整 CI 暫時會重複執行。必須先驗證新流程，再移除舊觸發和切換必填檢查。
- Ready 後有新提交會重新執行完整工作流程；合併時仍應以最新程式碼的實際檢查結果為準。

## 字典測試整理（第一輪，尚未刪除）

- 逐檔清冊：`config/dictionary-test-audit.json`；按目前字典群組的 **71** 個測試分類，包含測試領域、處理方向及每個檔案的原因。
- 核心保留 **40**、整併候選 **16**、更新現行規格 **11**、退役候選 **4**。這是**審查優先順序，不是排除 CI 或批准刪除**。
- 保留的最低保障：字典新建／編輯與公開發布、Review 及版本 CAS、真實資料庫權限／RLS、原子寫入及回復、例句與衍生義的引用完整性、JSON 資料交換、跨裝置衝突重試、公開資料與個人字卡隔離、公開內容安全及 PWA 離線查詢。
- 更新現行規格時，特別注意**最新版使用者匯入只支援 JSON**。舊 CSV／Markdown 測試應按實際支援入口調整，但不得移除匯入拒絕危險欄位、身份及資料完整性檢查。
- 歷史退役測試並非一律多餘；首先確認可由目前受支援版本升級而來的路徑是否仍會執行相關遷移，再決定整併或移除。
- **整併或刪除前置條件**：逐項列出被移除的原斷言及負責的新測試、確認 PostgreSQL／瀏覽器／離線環境仍充分涵蓋、執行新測試成功，最後同步修改清冊與 CI；不能因舊測試失敗就刪除。
- 使用 `node scripts/test-groups.mjs --check` 可同時檢查字典審查清冊與正式測試分組沒有漏檔、重複或錯誤分類。

整理次序建議先更新 11 個舊規格測試，再比對 16 個整併候選的實際斷言，最後審查 4 個退役候選是否超出資料升級支援範圍。所有分類在確認替代測試前維持原 CI 執行。
