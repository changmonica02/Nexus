# 板塊驅動海底地形 — 第一版原型

參考 `修改文件` 分支 F-WORLD-MAP 規格，以及 MapRegionizer 的 [Tectonics Generation](https://github.com/Muhv16/MapRegionizer/blob/master/docs/tectonics.md) 與 [Elevation Generation](https://github.com/Muhv16/MapRegionizer/blob/master/docs/elevation.md)。

## 資料流程
1. 先從 Azgaar 模板生成、已確定海陸的 36,002 格球面 Grid 開始。
2. 由**海陸遮罩**算出穩定板塊分析種子，不依賴可修改的世界名稱、設定種子或海底高度。
3. 用現有 `analyzeSphericalPlates` 取得地殼、板塊領域和局部張裂／隱沒邊界。
4. 對海水格以真正的球面大圓距離估計到海岸、洋中脊及隱沒帶的最短距離，形成分區與深度。
5. `generatePlateSeafloor` 只回傳**候選** `Int8Array` 高度與獨立的分區標籤；`applyPlateSeafloor` 全量驗證後，才將合法的海底高度寫回原 Grid。
6. 新建星球時寫回海底高度後，再走原本的 `exportGlobalTerrainSnapshot`；**載入已存在世界時不重新雕刻**，而是讀取已儲存的完整高度。

## 海底地形分區
- **大陸棚** `shelf`：靠海岸約 250 km 的淺水帶。
- **大陸坡** `slope`：約 250–850 km，從淺水遞變到較深海床。
- **深海平原** `abyssalPlain`：遠離大陸的深海背景，以洋中脊距離作簡化地殼年齡代理值。
- **洋中脊** `midOceanRidge`：張裂且兩側為海洋型地殼的局部邊界，形成較淺的水下隆起。
- **海溝** `trench`：隱沒帶附近生成狹窄且較深的海底凹陷。
- 所有深度限制在 -1 到 -100（每高度單位約 100 公尺），**不使海底變陸地，也不改寫任何陸上格的高度**。

## 火山湖
火山口湖屬於陸上**獨立湖泊物件**，不是海底地形的一部分。現階段根據隱沒邊界附近的陸上高地、局部山頂推估 `volcanic-crater-lake-candidate`，只產生「未確認候選」的位置和 ID，**不直接建立湖泊、盆地、水面、河流出水口，也不寫入正式地圖存檔**。待湖泊模組提供穩定 ID、盆地、水位與合法性檢查後，再正式生成。

## 尚待驗證
- 真實地質中大陸棚、海溝、洋中脊的尺度差異明顯；本版的距離與深度參數是原型假設，需要視覺檢查與多種子分布驗證。
- 地殼年代與隱沒方向尚未模擬，洋中脊遠端深度僅以距離作代理。
- 海底火山與海山、背弧盆地、沉積厚度、海溝非對稱性尚未精細模擬。
- 現有板塊分類本身仍是程序式初版；地質歷史、造山帶、裂谷帶等後續資料需獨立加入。
- 本版只於新建地圖套用海底雕刻；既有地圖的「手動重新計算自然環境」流程尚未實作。
- 圖片輸出仍只在使用者明確要求「生成圖」時手動觸發。

## 驗證指令
```sh
node --test experiments/spherical-grid/plate-seafloor.test.mjs
npm run map:global
npm run test:world-map
```
