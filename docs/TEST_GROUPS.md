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

若新增／刪除測試檔案，請同步更新清冊。這一步尚未加入 GitHub Actions。
