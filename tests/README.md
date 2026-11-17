# Nexus 自動化測試

此文件只說明目前如何執行與維護測試；測試歷史、精簡紀錄及合併報告不在此保存。

## 測試結構

- `tests/config/test-groups.json` 是正式測試清冊，每個測試檔案只歸屬一個群組。
- 測試按功能放在 `tests/dictionary/`、`tests/study/`、`tests/world-map/`、`tests/note/`、`tests/creation/`、`tests/life/`、`tests/workspace/`、`tests/shared/`。
- `tests/fixtures/` 為測試資料，`tests/helpers/` 為共用輔助程式，`tests/tools/` 為執行與清冊工具。
- `experiments/spherical-grid/` 的獨立測試及效能基準依其專用工作流程執行。

## 本機使用

請先安裝相依套件：

```sh
npm ci
```

查看分組、列出特定群組及檢查清冊：

```sh
node tests/tools/test-groups.mjs --list
node tests/tools/test-groups.mjs --group dictionary
node tests/tools/test-groups.mjs --benchmarks
node tests/tools/test-groups.mjs --check
```

執行單一測試：

```sh
node --test tests/dictionary/dictionaryAdminUI.test.cjs
```

執行既有 npm 測試指令：

```sh
npm run test:dictionary
npm run test:world-map
```

部分測試依賴 Chromium／WebKit、實際 PostgreSQL 或產生後的地圖資源；請依測試檔案與 CI 工作流程提供所需環境，不要把本機缺少測試環境視為功能錯誤。

## CI 與測試範圍

| 工作流程 | 用途 |
| --- | --- |
| `.github/workflows/ci-fast.yml` | Draft PR 的變更範圍快速檢查 |
| `.github/workflows/ci-full.yml` | 非 Draft PR、main 推送及手動觸發的完整回歸 |
| `.github/workflows/spherical-grid-prototype.yml` | 球面網格專用驗證 |
| `.github/workflows/performance-manual.yml` | 手動啟動大型資料與效能檢查 |

快速檢查依 `tests/tools/select-fast-tests.mjs` 選出需要執行的測試；完整回歸由工作流程明確執行主要測試，`tests/tools/run-full-extras.mjs` 補足其餘清冊項目。快速與完整流程都使用同一份測試檔案，不另外複製。

檢查快速測試選取規則及完整 CI 的補充涵蓋範圍：

```sh
node --test tests/tools/select-fast-tests.test.mjs
node tests/tools/run-full-extras.mjs --audit
```

查看指定群組的補充測試（此命令會實際執行）：

```sh
node tests/tools/run-full-extras.mjs --group dictionary --mode node
node tests/tools/run-full-extras.mjs --group dictionary --mode browser
```

效能與大量資料測試不屬於每次 PR 必要檢查；需要時到 GitHub Actions 手動執行 `Manual performance and large-dataset checks`。

## 維護原則

1. 新增、移動、刪除測試時，同步更新 `tests/config/test-groups.json`，再執行 `--check`。
2. 測試負責驗證現行產品契約、資料完整性、帳號權限與實際操作；避免對固定 CSS、介面排列及內部程式碼文字建立不必要的依賴。
3. 修改 CI 工作分配時，檢查 `run-full-extras.mjs --audit`，避免重複執行或漏跑必要測試。
4. 以最新提交的 GitHub Actions 實際結果判定是否通過；本機或舊提交的成功不代表最新 PR 已驗證。

產品行為以 `docs/SPEC.md` 為準，技術架構以 `docs/ARCHITECTURE.md` 為準。
