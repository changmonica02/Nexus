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

若新增／刪除測試檔案，請同步更新清冊。已加入獨立的 Draft PR 試行工作流程，但尚未停用舊 CI，尚未建立合併前完整 CI。

## Draft PR 快速驗證（試行）

- `.github/workflows/ci-fast.yml`：僅在 Draft PR 更新（或手動觸發）時執行；目前與既有工作流程並行，尚未取代舊 CI。
- `scripts/select-fast-tests.mjs`：讀取 PR 與目標分支間所有變動檔案，依模組歸屬與關鍵相依性選取少量必要的非瀏覽器測試；高風險語音修改另含瀏覽器測試。
- 未辨識、跨模組、資料庫、共用程式、相依套件與 CI 設定修改，保守擴大至所有群組的快速基礎驗證，不能自行略過。
- 目前是「快速基礎測試＋關鍵情境」而非完整群組測試。Ready for review 的完整 CI、同環境重複測試整合、分支保護，仍待下一階段建立及驗證。
- 目前保留原有三份工作流程，因此 Draft PR 期間仍可能有舊 CI 的完整測試負擔；完成安全切換後才會真正減少這部分重複執行。
- 工作流程內的選擇器契約測試：`node --test scripts/select-fast-tests.test.mjs`。測試不需連接正式資料庫。
- CI 會建立暫存的 `.fast-changed` 與 `.fast-plan.json`；這兩個檔案僅是執行中的產物，不屬於專案保存資料。

完整 CI 仍必須處理所有正式測試（包含瀏覽器、資料庫、離線），不能將快速選擇的通過結果視為正式合併授權。
