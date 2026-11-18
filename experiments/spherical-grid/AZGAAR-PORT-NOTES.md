# Azgaar 模板嫁接實驗（尚未完成正式驗收）

此分支的全球星球 Worker 已暫時改走 `createAzgaarSphericalLandLayout`。原本 `land-generator.mjs` 保留，以利比較與回退；不改變 `nexus-global-map` v1 快照結構、Grid 格子 ID 或正式資料庫。

## 已完成
- 依 Azgaar MIT 授權納入九種 SPEC 指定的模板指令腳本與原授權文字。
- 建立局部、可重現的 `Hill` / `Pit` / `Range` / `Trough` / `Strait` / `Smooth` / `Mask` / `Add` / `Multiply` / `Invert` 指令執行器；不修改全域 `Math.random`。
- 分別配置 6–8 個大陸、15–20 個島嶼、4–12 個群島候選，使用局部切平面投射到既有球面 Grid。
- 使用球面面積加權的海陸比例校準，保存非均一高度；使用最大連通海域選取 `oceanSeed`。
- 接到 `globalMapWorker.ts`，重用現有建立、預覽、確認、儲存、匯出及還原管線。
- 新增 `azgaar-template.test.mjs` 的模組測試。

## 分級重疊與高度融合實驗
- 比較的是局部模板投射到球面後，**真正高於海平面之候選格子面積**，而不是模板外框。
- 大陸候選重疊目標不超過 34%、島嶼 82%、群島 60%；候選被拒時以固定上限重抽位置與旋轉。
- 在抽樣空間不足的情況下，仍接受重疊率最低的有效候選以保留模板數量；**上述目標為軟限制，不保證全部符合**。每個接受候選記錄 `overlapRatio` 與 `attempts` 供品質評估，暫未儲存到正式地圖檔。
- 對正向地形使用最大值加上小幅、最高 12 個局部高度單位的融合項，不直接累加所有山體高度。
- 三組種子碼的開發期直接函式檢查約需 6～8 秒／張（非正式標準效能測試）。需要進一步優化局部格網取樣及候選重抽成本。

## 尚未完成／風險
- 局部指令為對 Azgaar 邏輯的第一版改寫，**不是逐行等價移植**；目前先在 64×64 局部格網執行，再投射球面，尚未使用球面鄰接直接執行 Range/Trough/Strait。
- 仍需視覺品質及負載測試，尤其跨經線、極區、陸塊重疊、狹長海峽與多次重刷種子。
- 陸地比例最後採面積分位數校準；可能影響海岸形狀，尚需改善。
- 目前不在模板重疊處主動累加負向切割效果；海峽仍依局部模板結果合成，須進一步驗證跨模板接縫。
- 超出目標重疊率的候選會留下可檢查紀錄，尚需依視覺與效能數據調整軟限制。
- 尚未加上地殼、板塊、洋流、逐月氣候、水文與生態系統；不代表 F-WORLD-MAP 全部完成。
- 為避免破壞既有資料，沒有調整儲存格式、版本或既有世界觀資料；未對正式站部署。
- 本次為可撤回的實驗分支，**切勿在尚未通過完整驗收前合併 main**。

## 測試
```sh
node --test experiments/spherical-grid/azgaar-template.test.mjs
node --test experiments/spherical-grid/land-generator.test.mjs
npm run map:global
npm run test:world-map
```

來源：Azgaar's Fantasy Map Generator，Copyright 2017–2024 Max Haniyeu (Azgaar)，MIT License。
