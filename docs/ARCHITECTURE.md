# Nexus — 技術架構與資料契約

> 2026-10-30 再編；Refs #118。靜態核對基準：main `ad18e083aa72d82b4fce2e266d8a011ab5126358`。本輪只改文件。
> 產品目標以 [SPEC](SPEC.md) 為準；進度見 [HANDOFF](HANDOFF.md)，決策見 [HISTORY](HISTORY.md)。
> 原 ARCHITECTURE 全文保存在 [詳細契約與歷史參考](ARCHITECTURE-REFERENCE-20261030.md)，包含表／RPC、migration ledger、字典與創作等完整細節。此次移位不取消那些相容性與安全契約；其中逐批「待部署／已套用」文字是當時紀錄，不能作現時正式環境證據。本文與原文衝突時先依本次已核對範圍及最新 SPEC 判讀，其他部分須回到原碼核實。

## 1. 核對範圍與狀態

| 範圍 | 本輪依據 | 可以確認／不能推定 |
| --- | --- | --- |
| 筆記建立與編輯 | creationOptions、EditorPane | 新入口為單一筆記；畫面採 flow。舊資料格式仍需相容 |
| 筆記輸出 | NoteExportPreview、noteExportLayout、noteTablePagination | 唯讀副本與安全表格延續存在；完整 fragmentation 未完成 |
| 工作區保存／同步 | StorageAdapter、WorkspacePersistence、SyncEngine | 本機交易、outbox、revision／owner 保護存在；非正式 RLS／跨裝置驗收 |
| 學習同步 | studySync | 事件順序、冪等重試、增量 cursor 及同步合併存在；不等於實機驗收 |
| 地圖 | worldMapRepository、offlineCore | 固定核心版本、結構檢查、owner 邊界及專用 SW 存在；未重驗全部地圖工具 |
| PWA | app/layout、檔案樹、offlineCore | 主 Manifest／全站離線外殼尚未加入；地圖快取不能代表全站離線 |
| 交付狀態 | GitHub PR #108 | 2026-10-25 已合併，merge commit `9a5659d`；本輪未核對正式部署 |

本輪未執行 build、自動化、瀏覽器或正式 DB 檢查。歷史 CI 證據仍屬原提交；沒有原對話工作目錄，無法確認其未提交內容。

## 2. 模組邊界與資料真相

| 層 | 主要來源 | 責任 |
| --- | --- | --- |
| 路由／工作區 | [WorkspaceRoot](../src/components/WorkspaceRoot.tsx)、[NexusApp](../src/components/NexusApp.tsx) | 路由與工作區生命週期、頁面及編輯狀態整合 |
| 筆記編輯 | [EditorPane](../src/components/EditorPane.tsx)、TiptapEditor | 編輯 JSON、觸發保存、顯示保存狀態與開啟輸出 |
| 輸出投影 | [NoteExportPreview](../src/components/NoteExportPreview.tsx)、[noteExportLayout](../src/lib/noteExportLayout.ts)、[noteTablePagination](../src/lib/noteTablePagination.ts) | 從 DOM 副本準備資源、測量與分頁，不回寫編輯 JSON |
| 儲存介面 | [StorageAdapter](../src/infrastructure/storage/StorageAdapter.ts) | Page、附件／Blob、帳號工作區、備份與 Repository 介面 |
| 工作區交易 | [workspacePersistence](../src/infrastructure/sync/workspacePersistence.ts) | 本機 records 與不可變 upload intents 同交易；remote merge 不重新 enqueue |
| 同步協調 | [syncEngine](../src/infrastructure/sync/syncEngine.ts)、workspaceSync | push／pull、Realtime、背景節流、重試與狀態 |
| 學習領域 | [StudyRepository](../src/features/study/StudyRepository.ts)、[studySync](../src/features/study/studySync.ts) | 私人字卡、學習事件、領域衝突與增量同步 |
| 地圖領域 | [worldMapRepository](../src/features/worldMap/worldMapRepository.ts)、[offlineCore](../src/features/worldMap/offlineCore.ts) | 地圖原生專案驗證、世界觀條目／配置、隔離工具快取 |

Page 是共用容器；不同功能的資料契約仍各自成立。編輯結構以正式 JSON／領域資料為準，`content_text` 為衍生用途。附件 metadata 與 Blob 分離。地圖原生專案、Nexus 正式條目及配置須按各自來源處理，不能以顯示投影或名稱取代穩定 ID。詳細欄位、IDB stores、備份格式與 SQL ledger 沿用參考文件，不在此重新發明 schema。

## 3. 筆記：僅流動，輸出獨立

### 已確認產品方向與實際編輯

Refs #118：筆記僅提供 flow 編輯，不再提供分頁／流動模式選擇。A4、方向、邊界、頁首頁尾、頁碼及分頁調整屬輸出。這項決策只針對 Note，不自動改寫 Document 或 Presentation 的產品契約。

`creationOptions.notes` 只有 `note_flow`；全部項目使用 `note`。EditorPane 實際以 `effectiveFormat = "flow"`、`isPaged = false` 呈現；新舊 Note 不因此清除既有 format／pageBreak／未知 metadata。逐篇全寬寫於 `noteAppearance.fullWidth`，與輸出紙張尺寸分離。移除 legacy 型別、元件或資料欄位不是本輪工作。

**另有需釐清的落差**：EditorPane 的 flow 常數也涵蓋 Document 呼叫路徑，SPEC F-DOCUMENT 卻仍提 Document 預設 A4／現有版面契約。應先盤點實際操作與預期，不把本次「筆記僅流動」擴大成 Document 改版，也不直接恢復舊分頁程式。

### 已實作輸出流程

1. EditorPane 開啟 NoteExportPreview，傳入編輯 DOM、標題、頁首頁尾及保存 callback。
2. `copyExportBlock` 複製 DOM，移除編輯控制、展開副本摺疊、保留公式顯示；不操作原編輯器。
3. `waitForExportAssets` 等圖片／字型，具 timeout 與取消清理。它是資源就緒檢查，不能證明所有公式 glyph、圖片及頁面視覺正確。
4. NoteExportPreview 按紙張 content-box 測量；頂層舊 pageBreak 轉成副本分頁。安全表格由 splitExportTable 按 rowspan 相連群組延續，重複表頭並保留 span，caption 一次。
5. 不能安全切分的特殊表格／超高區塊保留並警告；長雙欄保持原比例。列印前 await 保存，保存失敗保留預覽供重試；輸出仍交由瀏覽器 `window.print()`。

### 尚未完成

- 長段落、超高合併格與長雙欄未完整分割；目前放寬超高紙張並提示，瀏覽器仍可能另行分頁。不能宣稱所有預覽頁碼／PDF 一致。
- 預覽沒有手動新增／移動分頁入口；識別原有 pageBreak 不等於提供這項操作。保存分頁調整的規則仍待確認。
- Paged.js 只是歷史隔離研究，不是正式 runtime 依賴，也沒有證據支持直接替換即能解決全部案例。
- Safari／Firefox、真實 IME、裝置與大型文件峰值記憶體仍待驗證。測試來源見 tests/noteExport.browser.test.cjs、tests/noteTablePagination.browser.test.cjs、tests/notePagination.study.test.cjs。

## 4. 保存、同步與帳號邊界

```text
使用者編輯 → UI 保存協調 → StorageAdapter
  → WorkspacePersistence 本機交易（records + workspace_outbox）
  → SyncEngine 協調 workspaceSync push／pull
  → 遠端回覆／修訂合併 → 本機狀態與畫面

學習作答 → StudyRepository 的領域事件／pending
  → studySync 排序提交／ack → pull_study_changes cursor → mergeRemote
```

WorkspacePersistence 以 owner、entity、revision 驗證 guard，阻擋跨 owner 與 hard-delete 復活；保存與待傳操作同交易。merge 不產生第二次本機寫入意圖。CAS 衝突不等於自動語義合併，Page 級修改仍可能衝突。

SyncEngine 已有工作區排程合併（前景 300ms、背景 5000ms）與背景週期限制（5 分鐘內可略過），回前景補查；Realtime 按 owner 篩選。studySync 另外保護同 Repository 的進行中同步，按事件 predecessor 順序提交、以事件身份安全重試，使用伺服器 sequence 分頁讀取。這些領域流程不是可任意合併的同一套事件模型。

「已儲存本機」「待同步」「已同步」「失敗」須分開。connected 僅代表連線／協調狀態，不能直接當每筆資料已獲伺服器確認。RLS、RPC 權限、正式 migration ledger 必須另外核實；前端 owner filter 不取代伺服器權限。

## 5. 附件、地圖與離線邊界

附件版本 metadata-first、owner 快取與跨分頁下載合併的完整契約保留於參考文件與 SPEC F-PDF。本輪沒有重新量測下載次數；後續效能比較須記錄 metadata／binary 請求數與 bytes，不能沿用舊數字宣稱目前環境結果。

地圖使用固定 Azgaar 1.154.2 fork。inspectMapProject 做結構／版本與 SHA 檢查，明確不是 SVG／HTML sanitizer；匯入不能因此取得同源執行權限。offlineCore 註冊 `/world-map/offline.js`，scope 為 `/world-map/`，公開工具與私人專案分離。既有 canonical／recovery 與備份細節沿用參考文件，本輪未更動。

F-PWA 是已核准、待實作契約。主程式沒有 Manifest／應用外殼離線啟動；IndexedDB 有資料不代表斷網能重新載入網站。主 SW 應只處理明確版本化公開資源，私人資料仍走現有 owner 隔離儲存；Auth/API、附件 Blob 與地圖專用 scope 不納入主共享快取。離線 Session 恢復、帳號切換、更新時未保存內容仍需專門驗證。

## 6. 改善評估與建議順序（尚未實作）

| 優先 | 建議與理由 | 最小驗證／採用條件 |
| --- | --- | --- |
| P0 | 先釐清 Note／Document 的格式邊界，再清理死分支；flow 常數不應默默定義其他產品行為 | 新舊 Note、Document、Presentation 開啟／保存／重開，JSON／ID／未知 metadata 不變 |
| P1 | 分頁增加獨立、可取消的 layout job 與 block splitter 介面，先抽現有表格策略，再補文字；讓 React 面板處理控制與狀態 | 設定連續切換取消舊 job；單欄長段落、rowspan、圖片／公式內容無缺失重複；逐頁 PDF 比對 |
| P1 | 將長雙欄順序及手動分頁保存作產品待決項，確認後再新增策略 | 同一 corpus 比較逐欄／逐頁閱讀，不以強制攤平取代決策 |
| P1 | PWA 先交付外殼，再接本機資料／更新。重用既有同步，不新增 PWA outbox | 線上準備→斷網關閉重開、缺少路由提示、SW 更新不刪 IDB、地圖 scope 不受影響 |
| P2 | 量測 outbox 長度及 transaction 耗時後再優化。mutate 目前 getAll 佇列，並對每項 change 篩選排序；大 backlog 可能增加交易耗時 | 固定 100／1k／10k pending 比較；可先在交易內建 owner/entity 索引 Map，保留排序、expected revision、原子與重試語意；DB index 變更另評估 |
| P2 | 保留 workspace／study 領域邏輯，只逐步共用連線、觸發協調及觀測介面 | pending、衝突、遠端刪除、切帳號、掉回覆重試不退化；先記錄重複請求而非假設存在 |
| P2 | NexusApp 逐步抽出保存與帳號／同步生命週期服務，避免 UI 組裝同時掌管全部副作用 | 一次只搬一項責任；雙窗、待保存輸入遇遠端更新、失敗重試維持原行為 |
| P2 | 大文件分頁優先分批量測、取消與資源釋放，再評估新引擎 | 峰值 heap、layout 耗時、取消後 DOM／listener 回收；Worker 無法直接量測 DOM，不能只搬計算就宣稱解決 |

目前較合理的是維持現有 Next.js／Tiptap／IndexedDB／Supabase 與隔離地圖核心，以小步收斂責任及量測瓶頸。尚無本輪證據支持重寫編輯器、引入 CRDT、自建第二套同步或全面改用 Paged.js。若要採用，另開 discovery 比較資料相容、長文件、維護成本與授權，再核准實作。

## 7. 詳細契約與驗證入口

- [原架構完整參考](ARCHITECTURE-REFERENCE-20261030.md)：Page／附件／學習／字典／創作／地圖詳細契約、migration ledger 與歷史部署紀錄。查 SQL 時仍須比對 migrations 與實際環境；不要照抄歷史操作指令。
- [筆記審計與分頁研究整併內容](ARCHITECTURE-REFERENCE-20261030.md)：舊 NOTE-EDITOR-AUDIT 專項內容已整併；歷史比較與 corpus 數字屬當時研究。
- [SPEC](SPEC.md)：產品行為與待決範圍；[HANDOFF](HANDOFF.md)：當前狀態；[HISTORY](HISTORY.md)：原因。
- PR #108 合併只能證明程式已進 main。正式帳號、Safari／行動裝置、跨裝置與大文件驗收仍需 #60 證據。
