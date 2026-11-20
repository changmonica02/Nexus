# 地圖編輯器：現況、實作與後續順序

依據 main 的 `docs/地圖編輯器.md`；基準提交：5b59dcc。

## 現有程式

- `WorldMapCreator` / `GlobalMapParameters`：星球名稱、uint32 種子碼、25／32／45% 類型與陸地預覽。
- `globalMapWorker`：生成／載入球面高度、板塊、海底、12 個月氣候、Pack、水文與生態；運算不接觸儲存權限。
- `globalMapProject` / `worldMapRepository`：驗證、JSON 匯入匯出、草稿、衝突與版本管理。
- `GlobalMapCanvas`：等距圓柱投影、水平環繞、縮放、氣候與板塊等顯示；尚無 3D／二十面體展開。
- `terrain-edits.mjs`：原有高度批次修改與衍生網格同步，但原本未連到正式編輯器。
- `GlobalNaturalFeatures`：現有河湖名稱、備註、座標編輯；湖泊工具依最新需求不再擴充。

## 本次實作

將高度工具接上「Canvas → Client → Worker → 正式 Grid → 衍生資料 → 草稿與版本儲存」。

1. 保留模式可選陸地／海洋；高度分別限制在 0…100／−100…−1，維持海岸。
2. 自由模式可跨海平面；由既有核心重建必要海陸與 Pack 資料。海洋錨點被抬升時改選仍在水下的格子，無剩餘海洋時拒絕操作。
3. 強制／漸層抬升、強制／漸層降低、平滑、擾動、直線共七種筆刷。
4. 半徑用球面角距離，跨換日線與極區沿用相同距離規則；直線取短大圓弧，對蹠點因路徑不唯一而拒絕。
5. 點選套用；直線依序點起點與終點。每筆操作完成後自動儲存，忙碌、預覽及衝突狀態不能繪製。
6. 高度儲存在唯一正式 Grid；未引入可獨立修改的 Pack 高度。河湖穩定 ID 與基礎幾何沿用原資料。

高度修改後保留上次環境計算所用的地形快照，並明確顯示過期狀態；手動「重新計算自然環境」才更新月氣候、水文與生態。重新載入保留同一基準，不能以開啟地圖取代手動確認。大幅海岸修改可能讓既有河湖與新 Pack 不相容，此時重算會失敗並保留原結果，不刪除河道或回滾已儲存地形；後續仍需完善河道重新對齊。點選筆刷不是連續拖曳筆刷；尚無預覽游標及復原堆疊。

## 後續實作順序與驗收

| 順序 | 項目 | 驗收重點 |
| --- | --- | --- |
| 1 | 完善海岸修改後的河道重新對齊 | 環境計算已分離；補上 Pack 對齊衝突修復與可定位的錯誤提示，維持河道基礎幾何與 ID |
| 2 | 左側工具／顯示面板 | 顯示方式、疊加圖層、風格分區；河流與湖泊各自開關；未生成的政治文化資料不能假裝可用 |
| 3 | 筆刷互動完善 | 連續筆畫、覆蓋範圍游標、復原／重做；整筆交易與離頁草稿保護 |
| 4 | 海岸與河道圖上編輯 | 球面吸附、上下游拓撲、即時索引與穩定 ID；不以重新生成取代手動河道 |
| 5 | 球體與二十面體展開 | 共享同份 Grid、球面拾取、接縫一致；外部檢視仍只顯示圓柱投影 |
| 6 | 主世界／地底／天空與入口 | 空間各自資料、入口關聯、匯出與權限一致 |
| 7 | 局部解析度資料與幾何 LOD | 先決定細部高度儲存／編輯協定，再分塊顯示；不能把原 Grid 放大冒充細節 |

六角地圖維持停用；湖泊新工具、IUCN 第三層與特殊地形依原文件延後。

## 驗證命令

- `node --test experiments/spherical-grid/height-brush.test.mjs experiments/spherical-grid/terrain-edits.test.mjs`
- `node scripts/build-global-map.mjs && node --test tests/world-map/heightBrushWorker.test.cjs`
- `npm run test:world-map`
- `BROWSER_EXECUTABLE=/usr/bin/chromium npm run test:world-map:browser`
- `npx tsc --noEmit`
- `npx eslint src/components/GlobalMapCanvas.tsx src/components/GlobalWorldMapEditor.tsx src/features/worldMap/globalMapClient.ts src/features/worldMap/globalMapWorker.ts`

瀏覽器測試案例包含桌面／手機生成，以及正式 Worker 自由筆刷、JSON 重開與河湖身分保留；本次環境未能啟動瀏覽器。另以不依賴瀏覽器的正式打包 Worker 測試完成資料流程驗證。

## 本次檢查結果

- 型別檢查與本次修改的 ESLint 通過。
- 筆刷／地形核心 8 項測試通過。
- 既有世界地圖回歸 52 項測試通過。
- 瀏覽器測試無法執行：環境中的 Chromium 在啟動階段因 `socket() failed: Operation not permitted` 結束，尚不能宣稱桌面／手機互動驗證通過。

- 正式打包 Worker 整合測試通過：自由筆刷、環境基準保留、JSON 重開、手動重算及河湖身分保留。
- 加入環境基準格式後，再跑儲存與驗證相關的 42 項回歸測試，全部通過。

## 自有核心與 Azgaar 移除要求

筆刷正式實作位於 `src/features/worldMap/core/heightBrush.mjs`，由 Nexus 自行維護；七種球面筆刷不匯入 Azgaar、其產生的快取、DOM 或 iframe。不能把呼叫 Azgaar API 或把程式藏入包裝層當成完成內化。

整個星球生成目前仍有另一條依賴：`build-global-map.mjs` → `build-azgaar-command-tools.mjs` → `vendor/azgaar/src/generators/heightmap-generator.ts` → `.cache/azgaar-command-tools.mjs` → `azgaar-native-patch.mjs` → `natural-land.mjs`。因此目前不能刪除 vendor/azgaar。

後續須將模板指令執行器、模板資料與生成流程轉為 Nexus 正式核心，移除建置時原始碼擷取，再處理舊版原生地圖編輯器的 iframe／資源與檔案相容策略。保留衍生程式所需授權聲明；移除程式依賴與刪除授權聲明是不同事情。最終驗收須在沒有 vendor/azgaar 與舊快取的乾淨環境完成建置、生成、編輯、匯入、儲存與重開。

介面尚未完成項目包括：典籍建立選單的完整階層、世界觀建立與地圖建立的連續流程、左側工具／顯示、上方時間／更多操作及完整風格與疊加面板。現有世界觀地圖管理器中的地圖類型選擇，不能視為已完成典籍右上角建立流程。
