# 球面板塊分析原型（F-WORLD-MAP）

設計參考：MapRegionizer [Tectonics Generation](https://github.com/Muhv16/MapRegionizer/blob/master/docs/tectonics.md) 與 [Generation Pipeline](https://github.com/Muhv16/MapRegionizer/blob/master/docs/generation-pipeline.md)。本程式獨立撰寫，不匯入 .NET 或其平面拓樸程式碼。

## 已接通（第一版）

- 固定 36,002 格球面 Grid，每格分配一個主板塊 ID，預設由地形校驗碼衍生種子，生成 6–12 個主板塊。
- `TectonicHistory` 的初步穩定陸核和洋中脊候選線索，**僅作為低權重參考**，不強制把山脈當活動邊界。
- `CrustFields` 的大陸地殼、海洋地殼、大陸棚及部分增生地塊分類；大陸棚使用既有格網的鄰接距離。
- `PlateDomains` 的球面種子選取與受地殼差異約束的優先權洪水填充。跨越海岸的代價為軟限制，板塊可以同時包含陸地與海洋。
- `TectonicBoundaries` 依兩側板塊的角速度差，逐條局部邊界推算匯聚、張裂、轉形或低活動，初步細分碰撞／隱沒、洋中脊／裂谷等模式。
- 邊界沿著相鄰格子的 Voronoi 共邊繪製，不使用海岸線充當板塊邊界；跨國際換日線的線段經度差維持不超過 180°。
- 在 `GlobalMapCanvas` 新增「板塊邊界」勾選圖層，預設不開啟；顯示橘紅色邊界線，底下原有地形不變。
- Worker 在生成或載入時從**正式高度快照校驗碼**推導板塊；只輸出顯示資料，不改變 `nexus-global-map` v1 檔案結構、Grid 高度或既有世界觀資料。

## 原型界線，尚未完成

- `TectonicHistory` 尚未重建完整張裂、縫合線、熱點、海溝與火山弧歷史。
- `CrustFields` 尚未形成完整年代、沉積、弧、裂谷及主動／被動陸緣資料。
- 板塊生成目前只有 6–12 個主板塊，尚無受約束的微板塊生成與清理。
- `TectonicBoundaries` 目前對每條格網共邊計算局部機制，尚未把相似相鄰線段整理成穩定的地質段落 ID，也沒有依地殼年代推斷隱沒方向。
- `OrogenProvinces`、`RiftProvinces`、`TectonicFeatures`、海底地形修整仍未實作；未執行板塊對既有海底高度的寫入。
- 板塊結果目前為由高度重新計算的衍生資料，尚未提供板塊專屬的編輯、固定、正式儲存或單獨重算按鈕。若日後支援人工修改板塊，需要獨立的版本化附加資料。
- 線段依真實球面共邊產生，但地質模型是**程序式的地理假設**，不是精確地球物理模擬，仍需要視覺及地質品質驗收。

## 驗證

```sh
node --test experiments/spherical-grid/tectonic-plates.test.mjs
npm run map:global
npm run test:world-map
```

**預覽圖依使用者要求僅手動生成**，此功能不觸發 Azgaar 地形 PNG 預覽工作流程。
