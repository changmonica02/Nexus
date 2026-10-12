# 02-PROJECT-LOG-DETAILED

> **增量更新導讀（2026-09-28）**：後續對話更新見 檔尾 2026-09-28 後續增量補記；遇到前文基於 2026-09-25 快照的舊狀態或舊規格衝突時，以新增節的最新已確認決策為準。歷史資訊保留，不表示已重新驗證當前 Git 或遠端環境。

# Nexus — PROJECT LOG DETAILED（專案詳細日誌）

> **2026-10-11 最新增量**：檔尾已追加 Dictionary identity／pronunciation／Study reliability／final canonical master 與拆分匯入紀錄；遇到舊狀態衝突時仍以 00／01 為準。

> **2026-09-28 更新**：本檔於檔尾追加「2026-09-28 整合」與 09-16～09-25 日誌，並以附錄 A／B 保留舊 00 全文與舊 01 被替換段落。既有歷史內容未改動。

*日期：2026-08-23* *狀態：🟢 最新三檔交接版 / 已整合原 01 未列入現行功能規格的歷史決策 archive / 已整合 2026-08-23 兩輪補充日誌（D-186～D-197）* *用途：以時間與行動為條目，詳細記錄 Nexus 專案過程、遇到的問題、原因、解決方式、結果、文件治理、決策演變。此文件是歷史日誌，不覆蓋 `00` / `01` 的最新狀態與既定事實。*

> **2026-08-23 整合註記**：原本散落的兩份補充日誌（`02-LOG-SUPPLEMENT-2026-08-23.md` 第一輪、`02-LOG-SUPPLEMENT-2026-08-23-v2.md` 第二輪）已整合進本檔。兩輪的日期條目併入下方日期日誌區（見 `## 2026-08-23` 兩則），其決策 D-186～D-197 正式寫入 Appendix A 的第 15.19 節，第 16、17 節已同步更新。


---


## READ FIRST｜02 歷史閱讀索引（2026-09-28）


> **2026-09-28 後續產品澄清（覆蓋歷史規格解讀，不改寫過去紀錄）**：使用者現已明確確認 Nexus 產品只有**一份由管理員維護、所有登入用戶可查閱的公共字典／百科**；個別用戶建立、編輯、擁有的是**自己的字卡**，字卡可連結公共百科作詳細資訊補充，不得讓百科覆寫個人內容或改寫其 FSRS 狀態。原日誌所稱「私人／私有字源百科」僅指**當時實作有 owner-scoped 的 `etymology_*` 舊資料表及本機匯入器**，不表示使用者要求每人一套私人百科。原 A5「私人原稿轉公共」僅保留為**是否需要將舊字源資料審核轉入唯一公共百科**的未決資料處置問題，不能擴寫為用戶私人百科或字卡投稿。現行規格以更新後 `01` F-STUDY／F-DICTIONARY 與 A5 為準；原歷史敘述照存。

此檔是保留完整歷史的日誌／存檔，**不具現行任務或契約的決策權**。請先讀 00 `START HERE` 及 01 §4／§11。下表可快速定位歷史，而不必每次重讀超長全文。

| 需要追溯 | 請查找 |
| --- | --- |
| Nexus 早期 Page／Editor／Sync 決策 | 本檔原日期日誌、`01 Legacy Canon Transfer` |
| 2026-09-13～09-25 功能／程式快照整合 | 既有增量與舊 00／01 轉入段落 |
| 全站字典與管理後台的已確認方向 | 本檔「2026-09-28 來源增量存檔」中的原 01 §17 |
| 已清理學習雙路徑、25 項指定測試及 UI B 方案 | 同一存檔原 00 §15～16、原 01 §18～19 |
| 本輪文件架構改善與最新決策紀錄 | 檔尾「2026-09-28 文件治理」 |
| 21 項問題、17 項集中議題的原始審核結論 | 同輪獨立 `Nexus_全面審核與集中決策清單_20260928.md`（供追溯，不替代 01 決策狀態） |

**舊紀錄中即使出現「最新」「已部署」「下一步」，仍是當時聲明，不代表今日直接驗證。** 特別注意 09-16 migration ledger 的矛盾仍待正式 Supabase 查證。

---

## 0. 本文件解讀規則

```
本文件是歷史紀錄，不是最新狀態權威。
如果本文件中的舊狀態與 00 / 01 衝突，以 00 / 01 為準。
被更改過的決策、過期狀態與錯誤路線仍會保留在此，因為它們是專案歷史的一部分。
```

日誌條目應盡量包含：

```
日期
類型
背景
行動
遇到的問題
原因
解決方式
結果
後續影響
```


---


## 2026-07-31 — Supabase 雲端同步 + UI 改善（側邊欄拖拽、格式選擇、字樣、色票、學習集測驗）

### 類型

```
新功能實作 / 雲端同步 / UI 改善 / 學習集改善
```

### 背景

```
使用者要求：
1. 實現多裝置即時同步（任何人打開同一網址即可共享資料）
2. 側邊欄項目隨時可拖拽（拉出/拉入子頁）
3. 子頁新建時可選擇類型
4. 側邊欄「+」按鈕新建筆記/文檔時應跳出格式選擇
5. 排序下拉新增「依照項目類型」勾選框
6. 工具列「字樣」改為與字型同樣式
7. 標題間距加大
8. 學習集新增 CSV 匯入和四選一測驗
9. 雙擊間隔縮小（減少誤觸）
```

### 行動

```
1. 建立 Supabase 專案（ekwljqtenrmrijlmscnv.supabase.co）
2. 建立 SQL schema（pages / attachments / binaries 表，無 user_id，RLS allow all，啟用 Realtime）
3. 建立 src/lib/supabase.ts（客戶端單例）
4. 建立 src/lib/syncEngine.ts（fullSync + pullChanges + push* + Realtime 訂閱）
5. 修改 NexusApp.tsx：初始化 SyncEngine，每次存檔 push 到雲端，遠端變更時 reload state
6. 修改 Sidebar.tsx：
   - 隨時拖拽（移除 sortMode === "custom" 條件）
   - 位置感知 drop zones（above/below/child，根據游標 Y 位置判斷）
   - 子頁類型選單（+ 按鈕彈出筆記/文檔/學習集選單）
   - 排序下拉新增「☐ 依照項目類型」勾選框
   - 自訂雙擊間隔 350ms（取代原生 onDoubleClick）
7. 修改 NexusApp.tsx：側邊欄「+」按鈕顯示 NewPageDialog 格式選擇
8. 修改 NewPageDialog.tsx：新增 initialKind prop
9. 修改 EditorPane.tsx：標題間距 pt-8 → pt-16
10. 修改 TiptapEditor.tsx：「字樣」改為 <select> 樣式
11. 建立 ColorPaletteButton.tsx（50 色 + 最近使用 + 自訂色）
12. 重寫 StudySetView.tsx：CSV/TSV 匯入 + 四選一測驗模式
13. 修改 i18n.ts：新增翻譯字串
```

### 遇到的問題

```
1. Supabase Realtime 訂閱的 payload 型別為 Record<string, unknown>，
   需要手動 cast 到 Page/Attachment 型別。
2. NewPageDialog 原本不支援預選類型，需要新增 initialKind prop。
3. 原生 onDoubleClick 間隔約 500ms，使用者反映誤觸頻繁。
4. 側邊欄「+」按鈕原本直接建立頁面，需要改為顯示格式選擇對話框。
```

### 解決方式

```
1. SyncEngine 中使用 `as unknown as Record<string, unknown>` 進行型別轉換。
2. NewPageDialog 新增 useEffect 監聽 initialKind，自動跳到 format 步驟。
3. 自訂雙擊偵測：lastClickTimeRef + lastClickIdRef，350ms 間隔。
4. NexusApp 新增 sidebarNewDialogKind state，handleCreateItem 改為設定 state。
```

### 結果

```
所有改動通過 tsc --noEmit + next build 驗證。
新增決策 D-147 到 D-156。
使用者可透過 Supabase URL 在任何裝置打開 Nexus，資料即時同步。
```

### 新增決策

```
D-147: Supabase 共享工作區同步（無登入，即時同步）
D-148: 環境變數管理 Supabase 連線
D-149: SyncEngine 架構
D-150: 側邊欄「+」按鈕顯示格式選擇對話框
D-151: 排序下拉新增「依照項目類型」勾選框
D-152: 隨時拖拽 + 位置感知 drop zones
D-153: 子頁類型選擇
D-154: 自訂雙擊間隔（350ms）
D-155: 工具列「字樣」改為 select 樣式
D-156: ColorPaletteButton 色票選色器
```


---


## 2026-07-30 — 深度審核：00/01/02/99 四份交接文件的整理、完善、問題分析與建議

### 類型

```
文件治理 / 深度審核（使用者九點需求第 9 點，明確排在程式碼改完之後執行）
```

### 背景

```
使用者在同一輪對話中提出九點需求，前八點是功能性需求（Track L/M 的
內容，見下方對應日誌條目），第九點要求「對現有四份交接文件進行一次
深度且完整的整理、完善、分析問題與提出建議，考量決策是否可優化、
是否有矛盾或遺漏內容，達成方案最佳化」。使用者已透過 ask_user 明確
選擇「等這輪程式碼改完之後再做」，因此在第 1~8 點全部完成並通過
tsc / build / Playwright 驗證後，才開始本次審核工作。
```

### 行動

```
1. 逐份重新閱讀 00 / 01 / 02 / 99 四份文件的章節結構與最新狀態摘要，
   確認彼此宣稱的「最新狀態」是否一致。
2. 用 grep 交叉比對「程式碼註解中實際引用的 Track 名稱與 D- 決策
   編號」與「01 文件正式記錄的決策清單」，找出兩者的落差——發現
   程式碼中已使用 D-126 到 D-146（跳過 D-127/D-129/D-134/D-137）
   共 17 個實際決策編號，但 01 文件的決策清單只記到 D-125，中間
   完全沒有對應記錄。
3. 重新啟動本機 dev server（Next.js + Turbopack，port 3202），安裝
   playwright-core 與 Chromium，實際重跑一次先前已宣稱完成的
   Track L/M 功能點的互動驗證，不是只讀文件內容就假設為真：
   - 拖曳把手左側觸發範圍
   - 新建對話框兩步驟流程
   - Note 富文字工具列（字體/字級/顏色/對齊/螢光筆）實際互動效果
   - Note vs Document 的匯出選單內容
   - PDF 列印預覽（emulateMedia）
   - Logo 跳轉首頁
   - Sidebar 底部設定選單
4. 過程中發現先前接手 AI 遺留的一個「尚未解決」的排查記錄（Note
   頁面工具列疑似沒有顯示富文字功能），重新用更精確的 Playwright
   選擇器驗證後，證實是先前的測試腳本本身用 :has-text("Note") 這種
   不分大小寫的子字串選擇器，誤比對到「文檔」選項描述文字裡的
   "like a notebook"，導致點錯按鈕、產生錯誤的「功能沒有生效」的
   結論；程式碼本身從一開始就運作正常，不需要修正程式碼，只需要
   修正對此問題的判斷記錄。
5. 用 Playwright 對 Sidebar 進行額外的探索性檢查（不只是驗證文件
   宣稱的項目，也主動檢查是否有文件沒提到的問題），發現
   ResizablePanel 呼叫 Sidebar 時的 bottomInset={64} 在 Track M
   刪除 BottomLeftPanel 後已經變成死代碼，在 Sidebar 底部造成約
   64px 的多餘空白，這是一個文件完全沒有記錄過的真實視覺缺陷。
6. 在 00 文件新增 1U 節，完整補記 Track H~M 的範圍、背景、canon
   內容與九點需求原文；新增第 12 節記錄本次審核的方法、發現的問題、
   決策健康度檢查與優化建議（R-1 至 R-4）。
7. 在 01 文件新增 15.10～15.15 節，正式記錄 D-126～D-146（含說明
   D-127/D-129/D-134/D-137 編號空缺、不強行回填的處理原則）；新增
   8.25～8.30 節記錄 Track H~M 的 canon 實作細節；更新 8.3 節 Page
   schema、8.4 節 StorageAdapter 介面反映實際欄位；更新第 1 節、
   第 16 節、第 17 節的最新狀態摘要與最終一句話。
8. 在 02 文件（本文件）新增本則日誌，以及下方 Track H~M 的回溯性
   實作日誌（誠實標註「本則為事後補記，非逐一即時交接」）。
9. 更新 99 文件的 active docs audit 表格（bytes / lines / sha256）
   與 changelog，新增 r16 條目記錄本次審核。
```

### 遇到的問題

```
1. 決策編號 D-126~D-146 長期未寫入 01 文件正式決策清單（詳見上方
   行動 2）。
2. ResizablePanel 的 bottomInset={64} 死代碼（詳見上方行動 5），
   是本次審核主動發現、先前完全沒有文件記錄過的問題。
3. 一則先前遺留的「尚未解決」排查記錄實際上是測試腳本的選擇器
   問題，不是程式碼問題（詳見上方行動 4）。
```

### 原因

```
問題 1 的根因：Track H~M 是在同一個工作階段中連續完成的，重心放在
  程式碼實作與驗證，沒有依照既有習慣在每個 track 完成後同步回補
  00/01 文件，直到使用者主動要求「深度審核」才被系統性發現。
問題 2 的根因：Track M 移除 BottomLeftPanel（獨立浮動橫欄）、改用
  內嵌在 Sidebar 內部的 AccountSettingsRow 取代時，只移除了
  BottomLeftPanel 這個元件本身與它的直接引用，沒有一併檢查所有
  「間接因為它而存在」的周邊程式碼（例如為了避開它的視覺遮擋而
  引入的 bottomInset prop 呼叫），這類「移除舊機制時只拔主幹、
  沒有拔乾淨所有旁支依賴」的情況值得記錄為未來重構時的檢查清單
  項目。
問題 3 的根因：:has-text() 在 Playwright 中預設是子字串、不分大小寫
  比對，當頁面上存在多個元素文字有子字串重疊時容易選錯元素，這是
  測試工具使用方式的問題，不是應用程式的問題。
```

### 解決方式

```
問題 1：已於 00 文件新增 1U 節、01 文件新增 15.10~15.15 節與 8.25~
  8.30 節完整補記，不修改程式碼本身（因為程式碼本身沒有問題，
  只是記錄缺失）。
問題 2：已在 00 文件第 12 節記錄為 R-1（建議優先修正的待辦事項），
  本輪明確不順手修正（避免在「文件審核」這個任務範圍內意外夾帶
  程式碼變更，保持任務邊界清晰，且修正前也應該依既有協作原則先
  用 ask_user 確認），留給使用者下一輪決定是否要修正。
問題 3：已在 00 文件 1U.9 節新增「排查方法論補充」，記錄這個
  Playwright 選擇器精確度的教訓，供未來寫類似測試時參考，避免
  重蹈覆轍浪費排查時間。
```

### 結果

```
00/01/02/99 四份文件的最新狀態、決策清單、檔案結構表已完全同步至
  程式碼實際內容，決策編號從 D-01 連續記錄到 D-146（含空缺編號的
  透明說明），沒有斷層。
發現並記錄了一項真實存在、但影響輕微的視覺缺陷（R-1），尚待下一輪
  修正；發現並澄清了一則先前的誤判記錄（Note 富文字工具列其實一直
  正常運作）。
本次審核沒有發現任何需要回滾或推翻的既有核心決策，Nexus 的核心
  架構原則（Page/Block 統一模型、content_json 真相、StorageAdapter、
  soft delete、local-first）維持健康。
```

### 後續影響

```
下一個接手的 AI 現在可以直接從 00 文件 1U 節與 01 文件 15.10~15.15
  節取得 Track H~M 的完整脈絡，不需要再重新爬梳程式碼註解才能拼湊
  出決策原因。
第 12 節記錄的 R-1 至 R-4 建議清單，是下一輪工作可以優先參考的
  待辦事項來源，其中 R-1（修正 bottomInset 死代碼）是風險最低、
  建議最優先處理的一項。
```


---


## 2026-07-30 — Track H～M：Preferences/i18n、Sidebar UX、Drag Handle、Resizable Layout、Document kind、Note 富文字排版與匯出分級完成（回溯性補記）

> ⚠️ **本則為事後補記，非逐一即時交接**：Track H 到 Track M 這六個

> track 是在 Track G（見下方日誌條目）完成後的同一個工作階段中連續

> 完成的，實作當下沒有逐一寫入本文件，直到使用者提出「九點需求」

> 第 9 點要求深度審核時才一次性回補。以下內容依程式碼實際狀態與

> 過程中的操作記錄重建，時間精確度不如「即時記錄」的日誌條目，

> 但內容經過與程式碼比對確認準確。

### 類型

```
新功能實作（六個小範圍 track 連續完成）/ 使用者提出「九點需求」並
逐一 ask_user 確認範圍 / tsc / build / Playwright 三層驗證
```

### 背景

```
使用者在 Track G 完成後的同一個工作階段中，陸續提出多輪需求：
  Track H：語言偏好應該持久化，且介面文字應支援中英雙語（新手
    使用者的可用性需求）。
  Track I：Sidebar 頁面清單需要「我的最愛」與「重新命名」功能。
  Track J：仿照 Notion 的段落拖曳排序（⠿ 拖曳把手）。
  Track K：Sidebar / RightPanel 應可拖曳調整寬度，並修正先前浮動
    收合箭頭按鈕「卡手」的問題。
  Track L/M：使用者一次提出「九點需求」（完整原文見 00 文件 1U.7
    節），涵蓋拖曳把手觸發範圍、Home 導覽邏輯、新建入口整合、
    格式選擇對話框、Note 匯出範圍、Note 富文字排版工具列、Document
    的定位與匯出、帳號設定位置、以及本則審核本身（第 9 點）。
每一輪都比照既有的低風險 track 節奏：不新增/不破壞核心資料模型、
  每次改動後 tsc + build 驗證，範圍有疑義時先用 ask_user 確認
  （尤其 Track L/M 因為牽涉資料模型變更，動工前已針對「記事本是否
  為獨立類型」「筆記排版升級後匯出範圍」「格式選擇器實作範圍」
  「深度審核時機」四個問題分別問清楚，見 00 文件 1U.7 節的確認
  記錄）。
```

### 行動

```
詳細的檔案異動、資料模型變更、canon 內容已完整記錄於：
  00-HANDOFF-STATUS-AND-AI-RULES.md 第 1U 節（1U.1～1U.9 子節）
  01-CANON-SPEC-AND-DECISIONS.md 第 8.25～8.30 節、第 15.10～15.15 節
  （D-126～D-146）
本則日誌不重複列出全部細節，只摘要六個 track 的一句話範圍：
  Track H：語言偏好持久化（IndexedDB settings store）+ 全站 i18n
    （English / 繁體中文）。
  Track I：Page.is_favorite 欄位 + Sidebar 我的最愛 / 原地重新命名。
  Track J：@tiptap/extension-drag-handle + node-range，Notion 風格
    段落拖曳把手。
  Track K：新增 ResizablePanel 共用容器，Sidebar / RightPanel 可
    拖曳調整寬度，收合觸發點回歸標頭列，修正 flex min-h-0 裁切 bug。
  Track L：PageKind 新增 "document"，PageFormat 型別，NewPageDialog
    兩步驟建立流程，新建入口收斂到 Home，Logo 跳轉首頁 + Home 為
    預設畫面。
  Track M：TiptapEditor variant="rich"|"plain" 分級（字體/字級/
    顏色/對齊/螢光筆），Note/Document 匯出範圍分歧（PDF+Nexus JSON
    vs Markdown），AccountSettingsRow 取代 BottomLeftPanel，拖曳
    把手左側觸發範圍擴大（CSS 負外距+對稱內距技巧）。
```

### 遇到的問題

```
1. Note 富文字排版套件選型：一度誤裝 @tiptap/extension-color 與
   @tiptap/extension-font-family，後來發現這兩個套件的功能已完全
   包含在 @tiptap/extension-text-style 匯出的 TextStyleKit 中（只是
   re-export），屬於多餘的重複依賴，已移除。
2. 拖曳把手左側觸發範圍問題排查：需要檢視
   node_modules/@tiptap/extension-drag-handle 的原始碼才找到根因
   （mousemove 偵測只綁定在編輯器內容元素本身，不含外層 padding
   區域）。
3. EditorPane.tsx 用 key 強制重新掛載 TiptapEditor 的機制，過程中
   一度被誤判為「沒有生效」（見上方深度審核日誌問題 3 的說明），
   後來證實是測試腳本選擇器不精確，機制本身運作正常。
```

### 原因

```
問題 1：屬於對 Tiptap 官方套件生態不夠熟悉導致的多餘操作，非設計
  錯誤；已透過查閱套件實際匯出內容（TextStyleKit 定義）確認正確
  用法。
問題 2：@tiptap/extension-drag-handle 的行為沒有在官方文件中明確
  說明「偵測範圍限定在內容元素本身」這個細節，需要直接讀套件原始碼
  才能確認。
問題 3：見上方深度審核日誌條目的原因分析（Playwright 選擇器精確度）。
```

### 解決方式

```
問題 1：npm uninstall 移除多餘套件，改用 TextStyleKit.configure()
  精確控制要啟用的子功能。
問題 2：改用 CSS 負外距 + 對稱內距技巧擴大可偵測範圍，不修改
  第三方套件原始碼。
問題 3：用更精確的 Playwright 選擇器（正則錨定開頭）重新驗證，
  確認功能本身正常，修正先前的誤判記錄。
```

### 結果

```
Track H~M 六項功能全數完成，通過 npx tsc --noEmit（零錯誤）與
  npx next build（Turbopack production build 成功），並用 Playwright
  headless Chromium 對 Track L/M 的關鍵互動邏輯（不只是元素是否存在，
  也包含點擊後 DOM 是否真的套用對應樣式）進行實測驗證，詳細驗證
  項目清單見 00 文件 1U.8 節。
package.json 新增三個 Tiptap 相關套件（@tiptap/extension-text-style、
  @tiptap/extension-text-align、@tiptap/extension-highlight），
  均為精確版本 3.27.1（--save-exact），package.json 的
  overrides 欄位維持鎖定 @tiptap/core 與 @tiptap/pm 版本一致，
  npm ls @tiptap/core 確認整棵依賴樹只有單一版本。
```

### 後續影響

```
資料模型新增欄位（PageKind 擴充、PageFormat、is_favorite、format）
  皆為 optional 且有明確缺省值，不影響既有 IndexedDB 中的舊資料，
  不需要 migration。
Note 與 Document 的匯出範圍從本次起正式分歧，下一個接手者若要新增
  更多頁面種類（例如未來的 Presentation），需要同步考慮該種類應該
  歸類到「rich 排版陣營」或「plain 文字陣營」，並更新對應的匯出
  邏輯分支。
本則工作完成後，直接觸發使用者要求的第 9 點深度審核（見上方日誌
  條目），形成本輪工作的完整收尾。
```


---


## 2026-07-30 — Track G：Navigation & Overview（Command Palette + Dashboard / Home v0）完成

### 類型

```
新對話串接手 / 新功能實作（低風險 UI polish，不新增資料模型）/ 使用者真實瀏覽器實機驗證通過
```

### 背景

```
使用者在新的對話串中提供最終交接包（00 / 01 / 02 / 99 四份文件）與最新版 NexusApp.tsx
等原始碼全文（透過聊天貼上，出現 D-56 早已記錄過的同類污染：HTML escape、
自動連結化 [Date.now](...) / [e.target](...) 等 artifacts），要求「繼續製作」。
經 ask_user 澄清任務範圍後，使用者確認要「把基本的筆記功能與主頁面做完」，
進一步收斂為兩項具體功能：Command Palette（快速命令面板）與 Dashboard / Home 首頁。
Dashboard / Home 先前在 1M/1N 節被列為「暫緩，待近期 tracks 告一段落後再評估」，
本次由使用者主動指名，且 Track A~F、Track A2 皆已完成，判斷時機已成熟。
```

### 行動

```
1. 依 D-56 既定原則，識別並清理聊天貼上造成的富文字污染（不是使用者本機 source
   code 的真實內容），還原為正確的 TypeScript / JSX 語法，重建整份 src/ 目錄
   於 Arena workspace 的 project/ 鏡像中（呼應 1N.3 節「工作區直接維護代碼」模式）。
2. 於乾淨重建版本上執行 npx tsc --noEmit 與 npx next build 驗證，確認清理後
   的程式碼與使用者原始版本行為完全一致（零型別錯誤、build 成功），
   再開始疊加本次新功能，避免「污染清理」與「新功能實作」兩件事的驗證結果混淆。
3. 新增 src/components/CommandPalette.tsx：Ctrl/Cmd+K 快速命令面板，
   Actions（固定常用動作）+ Pages（標題模糊比對）合併清單，上下鍵導覽 + Enter 執行。
4. 新增 src/components/Dashboard.tsx：Dashboard / Home v0，統計卡片
   （全部頁面 / 筆記 / PDF 研究 / Study Set）+ 最近編輯清單 + 快速建立入口，
   全部為前端即時計算，不新增後端聚合查詢或資料模型欄位。
5. 修改 src/components/NexusApp.tsx：新增 isHomeMode / isCommandPaletteOpen
   state、全域 keydown 監聽 Ctrl/Cmd+K、handleShowHome handler、
   commandPaletteActions 清單定義，並在既有的視圖切換與建立頁面流程中
   同步補上 setIsHomeMode(false)，避免從 Home 視圖觸發動作後停留在錯誤畫面。
6. 修改 src/components/Sidebar.tsx：新增「🏠 Home」導覽按鈕、搜尋框旁新增
   "⌘K" 小按鈕作為滑鼠使用者的視覺提示與備用開啟方式。
7. 執行 npx tsc --noEmit（零錯誤）、npx next build（Turbopack production
   build 成功）、npx next start 啟動 production server 並 curl 首頁確認
   HTTP 200 且正確渲染初始畫面。
8. 將更新後的完整 src/ 目錄與設定檔打包為 nexus-src-update.zip 提供使用者下載，
   並附上明確的覆蓋與測試步驟（覆蓋 src/、npm.cmd run dev、測試 Home 按鈕
   與 Ctrl+K 命令面板）。
```

### 遇到的問題

```
使用者第二次貼上原始碼時，內容與第一次完全相同（重複貼上同一份污染版本），
一度需要確認是否為誤貼、或使用者實際上想貼的是另一份已在 VS Code 修改過的版本。
```

### 原因

```
使用者操作疏失（不小心重複貼上），非邏輯或程式碼問題。
```

### 解決方式

```
依 D-121「使用者以模糊描述回報問題時，應先確認具體現象再排查」的既定原則類推，
面對「內容重複」的異常情況，先用 ask_user 確認使用者意圖（是否為誤貼、
是否有另一份要重新確認的版本），而非直接假設並自行決定如何處理，
確認為單純重複貼上後才繼續原定流程。
```

### 結果

```
Track G（Command Palette + Dashboard / Home v0）已完成，通過 tsc / build /
production server 三層驗證，並由使用者下載覆蓋回本機後於真實瀏覽器
（Windows + npm.cmd run dev）實機測試，回報「一切正常」。
package.json 全程未變動（本次未新增任何 npm 套件），因此不需要提醒使用者
重新 npm install，但仍在回覆中與文件中明確記錄「已檢查、確認未變動」。
```

### 後續影響

```
Dashboard / Home 從「r14 分類中判斷暫緩」轉為「v0 已落地」，示範了
「使用者優先順序判斷應優先於既定 track 規劃順序」的處理原則（見新增的 D-125）。
Command Palette 從第 16 節「可優化但不阻塞」的長期候選項，轉為已完成項目（D-124）。
下一步候選（Study Set 後續擴充 / Track D Research / Track F Creatable Registry）
維持不變，待使用者下次指示。
```

### 文件更新

```
00-HANDOFF-STATUS-AND-AI-RULES.md：更新第 0 節狀態列與「下一步是」清單，
  新增 1T 節（Track G 完整續接狀態），更新第 10 / 11 節最短交接文字與最終一句話。
01-CANON-SPEC-AND-DECISIONS.md：更新第 1 節 MVP-2 狀態描述，新增 8.24 節
  （Track G canon）、新增 15.9 節（D-124 / D-125），更新第 16 節表格新增
  Dashboard / Home 項目並更新 Command Palette 狀態，更新第 17 節最終一句話。
  Obsidian 風格公式編輯本身的狀態維持不變（仍為「已通過自動化驗證，
  待使用者於真實瀏覽器實機確認」），本次 Track G 的實機驗證範圍僅涵蓋
  Command Palette 與 Dashboard / Home，不涵蓋 LaTeX 原地編輯功能，
  不可混為一談（此區分本身即是 D-121 精神的延伸應用）。
02-PROJECT-LOG-DETAILED.md：新增本則日誌。
```


---


## 2026-07-02 — Editor Blocks Foundation：LaTeX 改版為 Obsidian 風格原地編輯公式，取代官方 $$/$$$ prompt 版本

### 類型

```
功能改版（既有功能重新設計）/ 接手另一個 AI 對話串的失敗嘗試 / 問題排查（崩潰根因分析）/ jsdom 深度驗證
```

### 背景

上一則日誌記錄的 LaTeX / Block Math 版本完成後，使用者事後提出更高的體驗要求：希望公式編輯體驗改為真正的 **Obsidian 風格「原地編輯」**——點擊公式直接展開成可編輯原始碼、離開自動收合渲染、方向鍵可穿越公式邊界、打字 `$...$` / `$$...$$` 直接即時轉換，不再跳出 `window.prompt()` 對話框。

使用者帶入了**另一個獨立的 AI 對話串**先前嘗試做這件事、卻連續崩潰兩次的完整對話紀錄，要求本次由此串接手重做，並要求「不要只是眼睛看過去，要真的用官方 API 與真實測試驗證」。

### 另一個 AI 對話串的失敗記錄（僅供借鏡，程式碼未被採用）

```
1. 第一版自訂 NodeView（<input>/<textarea> 覆蓋層 + selectNode()/deselectNode()）本身尚可運作。
2. 套用真正 Obsidian 的 $/$$ 慣例時，與官方預設的 $$/$$$ InputRule 互相打架：
   打 $$1$$ 被官方行內規則搶先誤判，只吃中間的 $1$，殘留 $(1)$ 亂碼。
3. 改寫自訂 InputRule，先遇到 TypeScript 型別錯誤（handler 回傳型別只能是
   void | null，不能回傳 Transaction），修正後邏輯仍不穩定（使用者回報「跟剛剛一樣的問題」）。
4. 放棄 InputRule，改用 handleTextInput 手動攔截 "$"，並疊加更多進階需求
   （方向鍵依方向決定游標落點、編輯模式視覺透明、Backspace 清空退化為純 $ 字元）。
5. 崩潰 1：Next.js 找不到 default export（懷疑是複製貼上截斷，非邏輯錯誤本身）。
6. 崩潰 2（真正的 ProseMirror 錯誤）："Selection passed to setSelection must
   point at the current document"。根本原因：同一個 transaction 內，先用
   tr.replaceWith(...) 換掉節點，之後卻用「舊的」state.doc（變更前的文件）
   去 resolve 新的游標位置，而非用替換後的 tr.doc，導致 resolve 出的位置
   已不屬於目前文件版本，setSelection 直接拋出例外，編輯器崩潰。
```

### 執行的動作（獨立重新設計，未照抄上述對話串程式碼）

```
1. 新增 src/lib/obsidianMathInput.ts：ObsidianMathInput（tiptap Extension），
   用 addProseMirrorPlugins() 掛一個 Plugin，透過 handleTextInput 只攔截 "$" 字元，
   區塊比對（$$...$$）排在行內比對（$...$）之前避免搶配；命中後於同一個
   transaction 內 tr.replaceWith(...)，接著一律用 tr.doc（而非 state.doc）
   resolve 節點後方位置，並用 TextSelection.near() 包裹（嚴格套用上方崩潰教訓）；
   新增「內容前後緊鄰空白視為非公式」防呆，避免金額文字（如 "$5 and $10"）誤判。
2. 新增 src/lib/obsidianMathNodeView.ts：createObsidianMathNodeView(isInline)
   工廠函式，回傳完整 NodeView 介面：selectNode() 依進入方向決定游標落點、
   點擊展開編輯、失焦/Enter 存檔收合、Escape 取消、方向鍵穿越邊界、
   內容清空後刪除節點；ignoreMutation() 一律回傳 true（沿用 Callout 開發期間
   建立的教訓）；update/delete 指令一律明確傳入 { pos }（沿用 D-119 教訓）。
3. 修改 src/components/TiptapEditor.tsx：
   a. BlockMath / InlineMath 改用 .extend({ addNodeView, addInputRules: () => [] })
      接上新 NodeView，停用官方預設 $$/$$$ 輸入規則。
   b. 新增 ObsidianMathInput 進 extensions 陣列。
   c. handleInsertBlockMath / handleInsertInlineMath 從 window.prompt() 改為
      insertContentAt(pos, { type, attrs: { latex: "" } }) + setNodeSelection(pos)，
      觸發 NodeView 的 selectNode() 自動進入編輯狀態，不再跳出視窗。
   d. 更新 Toolbar 按鈕 title 提示文字，反映新的 $ / $$ 語法。
4. 修改 src/lib/markdown.ts：inlineMath / blockMath 的 import/export 全面從
   官方 $$/$$$ 語法改為真正 Obsidian 的 $/$$ 語法，parseInlineMarkdown() 與
   createMarkdownContent() 同步更新比對邏輯與 token 掃描器列表，並套用與
   obsidianMathInput.ts 一致的「前後緊鄰空白視為非公式」防呆。
```

### 驗證

```
npx tsc --noEmit：零錯誤（修正過程中發現並修正一次型別錯誤：keydown 事件
  handler 的 event 參數在聯合型別 <input>/<textarea> 下無法直接存取 .key，
  改用 event: Event 搭配 keyboardEvent = event as KeyboardEvent 解決）。
npx next build（Turbopack production build）：成功。
一次性安裝 jsdom + tsx（用完即 npm uninstall 移除，package.json 全程未變動），
撰寫並執行兩份一次性測試檔（測試後已刪除）：
  scratch_test_math.ts（NodeView + handleTextInput 層級，13 項全數通過）：
    逐字輸入 "hello $x^2$ world" → 正確產生 inlineMath 節點且無殘留 $ 字元；
    逐字輸入 "$$E=mc^2$$" → 正確產生 blockMath 節點；
    逐字輸入貨幣文字 "It costs $5 today and $10 tomorrow" → 不誤判為公式；
    模擬真實 dispatchEvent 點擊已渲染公式 → 正確展開編輯框並顯示 "$x^2$"；
    修改後 blur → 正確呼叫 updateInlineMath；清空後 blur → 正確刪除節點；
    Escape → 內容還原不儲存；插入空白節點 + setNodeSelection → 正確觸發
    NodeView 的 selectNode()，驗證 Toolbar 新互動模式確實可行。
  scratch_test_markdown.ts（Markdown import/export 層級，17 項全數通過）：
    inline/block math 匯入正確；貨幣文字不誤判；export→reimport 往返不失真；
    Heading + Callout(多段落) + Table + TaskList + inlineMath + blockMath
    混合迴歸測試（沿用上一則日誌 8.22.2 建立的方法論）全數正確互不干擾。
補齊 jsdom 缺少的版面配置 API 假實作（elementFromPoint / getClientRects /
  getBoundingClientRect），否則 ProseMirror 內部滑鼠座標與捲動邏輯會直接丟例外。
```

### 誠實揭露：尚未做的驗證

```
尚未在真實瀏覽器（使用者的 VS Code + Windows 環境）中實際點擊、打字測試過。
jsdom 測試只能驗證邏輯層級行為正確，不能保證真實瀏覽器的 focus / selection /
輸入法（IME）等瀏覽器特有行為完全一致——Callout 圖示選單就是 jsdom 全過但真實
瀏覽器失敗的先例（D-118），不可假設本次一定沒有類似落差。此功能狀態應標示為
「已通過自動化驗證，待使用者真實瀏覽器確認」，不可標示為「已完成並驗證」。
```

### 文件更新

```
00-HANDOFF-STATUS-AND-AI-RULES.md 新增 1S 續接狀態（含 1S.1~1S.6 子節），
  並更新第 0 節狀態列新增一行。
01-CANON-SPEC-AND-DECISIONS.md 新增 8.23（Obsidian 風格 LaTeX canon，
  含 8.23.1/8.23.2/8.23.3 子節）、新增 15.8 節收錄 D-122 / D-123、
  更新第 16 節表格新增三個項目、更新第 17 節最終一句話。
02-PROJECT-LOG-DETAILED.md 新增本則日誌。
```

### 結果

```
Obsidian 風格公式編輯（原地編輯 + $/$$ 語法）已完成實作，並通過 tsc / build /
jsdom 三層自動化驗證（共 30 項測試全數通過）。
package.json 全程未變動（本次未新增任何 npm 套件，katex 與
@tiptap/extension-mathematics 皆為先前 LaTeX 功能已安裝好的既有套件），
因此本次不需要提醒使用者重新 npm install，但仍在文件中明確記錄「已檢查、
確認未變動」而非略過不提。
累積可重用排查教訓：transaction 內變更後的位置計算必須用 tr.doc 而非
state.doc（D-122，源自另一 AI 對話串的真實崩潰事故）；插入空節點 +
setNodeSelection 觸發 NodeView selectNode() 可取代 window.prompt() 作為
「插入後立即編輯」的標準互動模式（D-123）。
尚未經使用者於真實瀏覽器實機確認，狀態明確標示為「已通過自動化驗證，
待真實瀏覽器確認」，避免誤報為「已完成並驗證」。
```

### 後續建議

```
1. 請使用者在真實瀏覽器實際測試：打字即時轉換、點擊原地編輯、方向鍵穿越邊界、
   Toolbar 按鈕插入後自動進入編輯狀態、舊版 $$/$$$ 語法檔案重新匯入的行為
   （設計為不自動遷移，需人工調整，此邊界需明確告知使用者）。
2. 使用者確認真實瀏覽器行為正確後，才能將狀態升級為「已完成並由使用者驗證」。
3. 若真實瀏覽器測試發現問題，優先比對是否為 D-118 類型的「jsdom 過但瀏覽器
   沒過」落差，而非直接假設是同一類邏輯錯誤重新排查（呼應 D-121 精神）。
4. Callout 圖示選單在真實瀏覽器點擊無效的問題仍未解決，本次改動未觸碰該部分，
   狀態不變，使用者仍判斷為不急迫、可擱置。
```


---


## 2026-07-02 — Editor Blocks Foundation：LaTeX / Block Math 完成（三批全數完成），補齊 Table Import 遺漏

### 類型

```
功能實作 / 官方 extension 整合 / 問題排查（含補齊舊功能缺口）/ 部署排查
```

### 背景

Callout 完成後，依既定分批順序推進最後一批 LaTeX / Equation。動工前確認範圍：只做單獨段落公式（block equation），不做行內公式；使用者確認這不是架構限制，未來加行內公式屬低風險追加動作。使用者熟悉 LaTeX 語法，不需要額外符號快捷按鈕。

### 執行的動作

```
1. package.json 新增 @tiptap/extension-mathematics@3.27.1、katex@^0.16.11。
2. src/components/TiptapEditor.tsx：引入 BlockMath.configure({ katexOptions: { throwOnError: false } })；
   Toolbar 新增「∑ Math」按鈕（插入新公式）；BlockMath onClick(node, pos) 回呼處理編輯/刪除既有公式。
3. src/lib/markdown.ts：新增 blockMath 的 $$...$$ import/export。
```

### 排查記錄 1：updateBlockMath / deleteBlockMath 依賴選取狀態不可靠

```
用 jsdom + 真實 Editor 實例測試時發現：透過 setNodeSelection(pos) 再呼叫
updateBlockMath({ latex })（省略 pos），指令回傳 false、實際未更新。
根本原因：省略 pos 時指令改讀 editor.state.selection.$from.pos，但
setNodeSelection 產生的 NodeSelection 語意與此不一致。
修正：改用官方 onClick(node, pos) 回呼提供的 pos，明確傳入
updateBlockMath({ latex, pos }) / deleteBlockMath({ pos })。
用 jsdom 模擬真實瀏覽器 dispatchEvent 點擊測試，插入 → 更新 → 刪除完整流程皆正確。
```

### 排查記錄 2：意外發現並修正 Table 匯入功能先前從未實作

```
撰寫 LaTeX 的混合 block 迴歸測試（Callout + blockMath + taskList + table 一起
匯出再匯入）時，發現 table 類型 reimport 後消失，被當成純文字。
追查確認：Table block 完成時只實作了 tableToMarkdown()（匯出），
createMarkdownContent()（匯入）從未加入表格語法辨識邏輯。
修正：新增表格偵測邏輯，辨識標準 "| A | B |" + 分隔線格式，還原為
table / tableRow / tableHeader / tableCell 節點。不支援欄位對齊或 colspan/rowspan。
重新執行混合 block 迴歸測試，四種節點皆正確互相辨識、不互相干擾。
```

### 驗證

```
npx tsc --noEmit：零錯誤（多輪，含乾淨環境重新安裝後再測試）。
npx next build（Turbopack production build）：成功。
jsdom + 真實 Editor 測試：插入/編輯/刪除公式流程、Markdown round-trip（含多行 LaTeX）、
  混合 block 迴歸測試，全數通過。
```

### 部署排查：使用者重複發生 package.json 提醒被忽略

```
交付訊息已依 D-116 規則明確提醒需要更新 package.json 並重新 npm install。
使用者稍後回報「deleteBlockMath 出現跟剛剛一樣的問題」，助理一度誤判為功能邏輯問題，
投入 jsdom 深度測試排查（結果邏輯完全正確）。
進一步詢問具體現象後，使用者說明是「程式標紅」，確認為看漏了 package.json 提醒，
非功能邏輯問題。使用者重新 npm install 後確認恢復正常。
```

### 文件更新

```
00-HANDOFF-STATUS-AND-AI-RULES.md 新增 1R 續接狀態。
01-CANON-SPEC-AND-DECISIONS.md 新增 8.22（LaTeX canon，含 8.22.1/8.22.2/8.22.3 子節）、
  新增 D-119 / D-120 / D-121、16 節新增 InlineMath 項目、更新第 17 節最終一句話。
02-PROJECT-LOG-DETAILED.md 新增本則日誌。
```

### 結果

```
LaTeX / Block Math 完成並驗證通過。
Editor Blocks Foundation 三批（Table、Callout、LaTeX）至此全數完成。
過程中補齊 Table Markdown 匯入的舊缺口（原本只有單向匯出）。
累積可重用排查教訓：官方 extension 指令的 pos 參數依賴、混合 block 迴歸測試的重要性、
  使用者模糊回報問題時應先確認具體現象再排查方向。
```

### 後續建議

```
Editor Blocks Foundation 三批全數完成，下一步候選：
1. Track C 後續擴充：四選一測驗、拼寫模式、CSV / TSV 匯入
2. Track D — Research（PDF viewer polish / citation metadata / annotation later）
3. Track F — Creatable Registry / Create Center
4.（可延後）回頭排查 Callout 圖示選單在真實瀏覽器中點擊無效的問題
5.（可延後）評估加入 InlineMath（行內公式），為低風險追加動作
Image block 已依使用者要求擱置。
```


---


## 2026-07-02 — Editor Blocks Foundation：Callout 完成（含已知未解問題），建立 jsdom 真實 Editor 排查方法

### 類型

```
功能實作 / 自訂 Tiptap Node / 問題排查（部分未解決）/ 驗證方法升級
```

### 背景

Table 完成後，依既定分批順序推進 Callout。動工前確認範圍：variant（顏色類型）與 icon（圖示） 分開設定，比照 Notion 做法；5 種顏色類型（info/warning/success/danger/note）；圖示可挑選或移除。

### 執行的動作

```
1. 新增 src/lib/calloutExtension.ts：自訂 Tiptap Node，vanilla JS addNodeView()，
   含互動式圖示選單、顏色類型下拉選單、module augmentation 提供型別安全指令。
2. src/components/TiptapEditor.tsx：引入 Callout extension、Toolbar 按鈕、CSS。
3. src/lib/markdown.ts：新增 Callout import/export，採 "> [!TAG] icon" 語法。
```

### 驗證方法升級：純邏輯測試 + jsdom 真實 Editor 測試

```
1. 純邏輯層：直接呼叫 pageToMarkdown() / createMarkdownContent()，測試 export/import round-trip。
   此階段抓到一個真實 bug：Callout 內多段落 export 時未用空白引用行分隔，reimport 時被誤合併成一段。
   已修正 calloutToMarkdown() 用 "\n\n" 分隔不同 block，重新測試四項全過。
2. DOM 互動層：暫裝 jsdom + tsx（驗證完即移除，不寫入 package.json），
   建立真正的 @tiptap/core Editor 實例，模擬使用者點擊完整流程，檢查 ProseMirror 文件狀態。
```

npx tsc --noEmit 與 npx next build 皆通過後交付使用者測試。

### 使用者測試結果與問題排查

使用者回報：

```
1. 插入 Callout → 再點一次按鈕解開 → 失敗
2. 點圖示選單 → 失敗
3. 切換 5 種類型下拉選單 → 成功
4. Export MD 語法 → 成功
```

#### 問題 1（解開失敗）排查與修正 — 已解決

```
用 jsdom 建立真實 Editor 實例，直接呼叫 editor.commands.lift("callout")，
發現回傳 false。判斷是 Callout node 設定的 isolating: true 阻擋了 lift 指令
（isolating 會阻止一般編輯操作跨越節點邊界，連 lift 都被一併擋住）。
移除 isolating: true 後重新測試，lift 回傳 true 且正確恢復成一般段落。
使用者重新測試後回報「成功」。
```

#### 問題 2（圖示選單點擊無效）排查與修正嘗試 — 未解決

```
比對使用者回報「下拉選單有效、圖示按鈕無效」的不對稱線索，發現下拉選單
（variantSelect）已有 mousedown 事件保護，但圖示按鈕與選單內按鈕皆缺少同樣保護。
依 Tiptap 官方 TaskItem 節點原始碼的既有模式（mousedown 階段 preventDefault，
避免 ProseMirror 搶先把點擊當成內容選取處理），為 iconButton 與所有選單按鈕補上
mousedown 攔截。jsdom 測試中此修正後邏輯運作正確（選單開啟、選取圖示、更新 attrs
皆符合預期）。但使用者於真實瀏覽器環境重新測試後仍回報失敗。
```

使用者決策：

```
問題 2 判斷「問題不大」，同意先擱置、繼續推進其他 track，之後有空再回頭排查。
```

### 文件更新

```
00-HANDOFF-STATUS-AND-AI-RULES.md 新增 1Q 續接狀態，如實記錄已解決與未解決的問題。
01-CANON-SPEC-AND-DECISIONS.md 新增 8.21（Callout canon，含 8.21.1/8.21.2/8.21.3 子節）、
  新增 D-117 / D-118、16 節新增 Callout 已知問題列項、更新第 17 節最終一句話。
02-PROJECT-LOG-DETAILED.md 新增本則日誌。
```

### 結果

```
Callout 大部分功能完成並驗證通過（插入、切換類型、解開、Export MD 語法）。
圖示選單點擊在真實瀏覽器中仍無效，為已知未解問題，記錄在案，
下一個接手者不應假設此問題已解決。
建立 jsdom + 真實 Editor 實例的驗證方法，作為未來複雜自訂 Tiptap Node 的標準做法之一，
但同時記錄其限制：jsdom 測試通過不保證真實瀏覽器行為一致。
```

### 後續建議

```
下一步候選：
1. Editor Blocks Foundation — LaTeX / Equation（依既定分批順序，最後一批）
2. Track C 後續擴充：四選一測驗、拼寫模式、CSV / TSV 匯入
3. Track D — Research
4. Track F — Creatable Registry / Create Center
5.（可延後）回頭排查 Callout 圖示選單在真實瀏覽器中點擊無效的問題
Image block 已依使用者要求擱置。
```


---


## 2026-07-02 — Editor Blocks Foundation：Table 完成，package.json 部署排查案例

### 類型

```
功能實作 / 部署問題排查 / 交付規則補強
```

### 背景

拆檔完成並驗證後，使用者選擇下一步方向為「繼續 Editor Blocks（Image / Table / Callout / LaTeX）」。動工前先評估四種 block 的複雜度差異，並與使用者確認分批順序。使用者指示：Image 迫切性較低、先擱置；確認分批順序為 Table → Callout → LaTeX（LaTeX 最後）。

### 執行的動作

```
1. package.json 新增 @tiptap/extension-table@3.27.1。
2. src/components/TiptapEditor.tsx：
   - 引入 TableKit，設定 resizable: true。
   - Toolbar 新增「Table」按鈕（插入 3x3 含表頭表格）。
   - 新增條件渲染：游標在表格內時額外顯示 +Col/+Row/-Col/-Row/✕Table 五個按鈕。
   - 新增 table 相關 CSS（框線、表頭底色、resize handle 樣式）。
3. src/lib/markdown.ts：新增 tableToMarkdown()，支援 Export MD 時把表格轉成標準 Markdown 語法。
```

### 驗證

```
npx tsc --noEmit：零錯誤。
npx next build（Turbopack production build）：成功。
```

### 部署排查案例

使用者測試時回報 Table 相關指令（addColumnAfter / addRowAfter / deleteTable / deleteRow / deleteColumn / insertTable）在 VS Code 中全部標紅（TS 2339）。

排查過程：

```
1. 助理判斷為本機未安裝新套件，指引 npm.cmd install。
2. 使用者執行完全重新安裝（刪除 node_modules 與 package-lock.json 後 npm.cmd install），
   出現 E404：找不到 @types/extension-table。
3. 助理判斷這不是套件不存在，而是使用者本機 package.json 中該行被誤植為
   "@types/extension-table"（應為 "@tiptap/extension-table"），屬於貼上造成的
   命名空間污染，此對話中已多次出現類似情況。
4. 助理提供完整、確認正確的 package.json 內容供整份覆蓋，而非只指出錯誤那一行。
5. 使用者覆蓋後重新 npm.cmd install + npm.cmd run dev，確認恢復正常。
```

根本原因分析：

```
本次交付訊息只提到「工作區已是最新版本」，沒有明確強調這次也需要更新 package.json
並重新執行 npm install。package.json 位於專案根目錄，不屬於使用者慣常覆蓋的
src/ 資料夾範圍，容易被交付訊息的措辭忽略。
```

### 訂立規則（新增，記入 D-116）

```
1. 涉及 package.json 異動時，交付訊息必須明確、獨立提醒需要重新 npm.cmd install。
2. npm install 出現 404 錯誤時，優先排查套件名稱是否被貼上污染，而非預設套件不存在。
3. 遇到 package.json 層級錯誤，直接提供完整檔案內容整份覆蓋，降低使用者再次手動修改出錯風險。
```

### 文件更新

```
00-HANDOFF-STATUS-AND-AI-RULES.md 新增 1P 續接狀態。
01-CANON-SPEC-AND-DECISIONS.md 新增 8.20（Table canon）、8B（部署排查案例）、
  新增 D-115 / D-116、更新第 17 節最終一句話。
02-PROJECT-LOG-DETAILED.md 新增本則日誌。
```

### 結果

```
Table block 完成並驗證通過（含本機部署問題排查）。
訂立 package.json 交付規則，避免未來重複發生類似部署落差。
```

### 後續建議

```
下一步候選：
1. Editor Blocks Foundation — Callout（依既定分批順序，下一批）
2. Editor Blocks Foundation — LaTeX / Equation（最後一批）
3. Study Set 後續擴充：四選一測驗、拼寫模式、CSV / TSV 匯入
4. Track D — Research
5. Track F — Creatable Registry / Create Center
Image block 已依使用者要求擱置，待後續討論。
```


---


## 2026-07-02 — Track C：Study Set / Flashcard v0 完成，並完成 NexusApp.tsx 拆檔

### 類型

```
功能實作 / 新資料模型 / 檔案結構重構 / vNext tracks 執行
```

### 背景

Track A2 完成、協作模式改為工作區直接維護代碼後，使用者確認開始規劃 Track C。由於 Study Set 規模較大（需要新的資料模型），動工前先與使用者確認三個關鍵範圍問題：

```
1. v0 要先完成哪些練習模式？→ 使用者選擇：先只做翻頁字卡模式。
2. 複習進度追蹤要做到什麼程度？→ 使用者選擇：簡單的熟悉/不熟悉分類，不做完整 SRS。
3. CSV/TSV 匯入要和 v0 一起做嗎？→ 使用者選擇：v0 先手動建立，匯入後續再做。
```

進一步確認 Deck 開啟後的畫面型態，使用者選擇「專屬編輯/練習畫面」（不保留 Tiptap 編輯器），並詢問「這個後續可以改嗎」，助理確認可以，因為 UI 呈現方式與底層資料（study_items）分離，日後調整風險低。

最後確認翻頁練習的抽卡順序：優先練習「還不熟」的卡，並隨機排序；卡片欄位採用通用 Front / Back，不綁定特定語言。

### 執行的動作

```
1. src/lib/types.ts：新增 PageKind 型別（"note" | "study_set"）與 StudyItem 型別；
   Page 新增 kind? / study_items?；CreatePageInput 新增 kind?。
2. src/lib/IndexedDBAdapter.ts：createPage() 依 input.kind 決定 page.kind，
   study_set 類型自動初始化空的 study_items 陣列。
3. 新增 src/components/StudySetView.tsx：
   - CardManageList：卡片列表，支援新增 / 編輯 Front-Back / 刪除。
   - PracticeSession：翻頁練習，buildPracticeQueue() 實作加權抽卡邏輯
     （優先出 new/learning，mastered 以約 1:3 比例穿插）。
   - mastery 轉換邏輯：「已經會了」new→learning、learning→mastered（需連續兩次才轉 mastered）；
     「還不熟」一律轉 learning。
4. src/components/NexusApp.tsx：Sidebar 新增「🗂 New Study Set」入口；
   頁面列表 kind === "study_set" 項目加上 🗂 圖示；
   依 activePage.kind 判斷渲染 StudySetView 或一般 Editor。
```

### 架構債務順帶處理

```
r15（D-102）曾指出 default_mode 不應同時代表「頁面種類」與「顯示模式」，並建議中期新增 kind 欄位。
Track C 是第一個真正需要區分 Page 種類的功能，因此直接依 r15 建議的過渡策略新增 kind 欄位，
而不是繼續把新語意塞進 default_mode。kind 為 optional，向後相容既有資料。
```

### 驗證

```
npx tsc --noEmit：零錯誤。
npx next build（Turbopack production build）：成功，靜態頁面正確產出。
使用者下載測試：新建 Study Set、加卡片、練習流程、熟悉度分類邏輯，回報「正常」。
```

### 結果

```
Track C 完成並驗證通過。
新增 kind 欄位落地 r15 的 Page kind / default_view_mode 拆分方向，未推翻既有決策。
```


---


## 2026-07-02 — NexusApp.tsx 拆檔：2301 行 → 864 行

### 類型

```
檔案結構重構 / 維護性改善
```

### 背景

使用者於 Track C 驗證通過後主動提出：

```
沒有破壞任何行為

然後我們現在app的基本架構出來了 我覺得nexus可以可慮拆檔

然後你可以繼續下一步了
```

判斷此為合適時機：應用基本架構（Note / PDF Research / Study Set 三種 Page 類型）已跑穩， 且呼應既有決策 D-63（NexusApp.tsx 超過 1000 行後，優先拆純 UI component，暫緩拆 hooks）。

### 執行的動作

```
1. 拆出純函式模組（src/lib/，無 React 依賴）：
   blockId.ts、wikilinks.ts、pdfNote.ts、inbox.ts、markdown.ts、fileDownload.ts
2. 拆出純 UI 元件模組（src/components/）：
   Sidebar.tsx、EditorPane.tsx（原名 Editor，改名避免與 Tiptap Editor class 衝突）、RightPanel.tsx
3. NexusApp.tsx 保留 Root App 的 state 管理、所有 handler、資料存取邏輯，不拆 hooks。
4. 修正 JSX 中 <Editor /> 為 <EditorPane />，並在 NexusApp.tsx 補齊對新模組的 import。
```

### 驗證方式

```
從乾淨環境重新執行 npm install → npx tsc --noEmit（零錯誤）→ npx next build
（Turbopack production build 成功），執行兩輪確認結果一致。
手動逐一檢查每個拆出檔案的 import 是否皆有實際使用，確認無殘留無用 import。
```

### 使用者驗證結果

使用者下載整包 `src/` 覆蓋本機後完整回歸測試，回報：

```
沒有破壞任何行為
```

### 文件更新

```
00-HANDOFF-STATUS-AND-AI-RULES.md 新增 1O 續接狀態，記錄 Track C 完成與拆檔過程。
01-CANON-SPEC-AND-DECISIONS.md 新增 8.18（Study Set canon）、8.19（拆檔 canon）、
  新增 D-113 / D-114、更新第 17 節最終一句話。
02-PROJECT-LOG-DETAILED.md 新增本則與上則日誌。
```

### 結果

```
拆檔完成並驗證通過，未破壞任何既有行為。
NexusApp.tsx 從 2301 行降至 864 行，可維護性提升。
```

### 後續建議

```
下一步候選（尚未由使用者選定）：
1. Study Set 後續擴充：四選一測驗、拼寫模式、CSV / TSV 匯入
2. Track D — Research（PDF viewer polish / citation metadata / annotation later）
3. Track F — Creatable Registry / Create Center
4. 繼續 Editor Blocks Foundation（Image / Table / Callout / LaTeX）
Dashboard / Home 仍暫緩，待近期 tracks 告一段落後再評估。
```


---


## 2026-07-02 — Track A2：Bulk Select 完成，協作模式改為工作區直接維護代碼

### 類型

```
功能實作 / 協作模式重大調整 / vNext tracks 執行
```

### 背景

Track B（Quick Capture / Inbox v0）完成並驗證通過後，使用者提出兩個問題：

```
1. 首頁（Dashboard / Home）什麼時候會做？
2. 可否新增多選功能，同時選擇多個檔案刪除或復原？
```

針對問題 1，判斷 Dashboard / Home 屬於 r14 System Views 分類，尚未排入近期 vNext tracks A~F，建議待其他核心 creatable 更成熟後再評估，暫緩處理。

針對問題 2，判斷為低風險、高實用性、不需要新資料模型的 UI polish，命名為 Track A2，插隊在既定節奏中先做。實作前與使用者確認範圍：Notes 與 Trash 都要支援多選、採用「頂部 Select 模式按鈕」互動方式（而非常駐 checkbox）。

### 執行的動作

```
1. 局部 patch NexusApp.tsx：Sidebar 新增 isSelectMode / selectedIds 狀態、Select 切換按鈕、
   批次操作列（全選 checkbox + Restore/Delete 按鈕）、頁面項目 checkbox。
2. Root App 新增 handleBulkDeletePages / handleBulkRestorePages / handleBulkPermanentDeletePages
   三個 handler，透過迴圈呼叫既有單筆方法實作，不新增 StorageAdapter 介面方法。
3. 切換 Notes / Inbox / Trash 視圖時自動關閉多選模式並清空選取（useEffect 依賴視圖狀態）。
```

### 關鍵設計決策

```
批次 Restore 完成後停留在 Trash 視圖，不自動切回 Notes（一次復原多篇無法判斷該選中哪一篇）。
批次永久刪除需二次確認並顯示數量。
不新增資料模型，不新增 StorageAdapter 介面方法。
```

使用者測試後回報「符合預期」。

### 協作模式重大調整

使用者提出：

```
有辦法你直接在工作區建立代碼 每次更改都直接更新嗎
```

執行動作：

```
1. 使用者提供最新版 NexusApp.tsx（本機已依序套用 Track A、B、A2、E 四輪 patch 後的版本）。
2. 助理清理貼上造成的符號污染（&gt; / &lt; escape、[Date.now](...) 誤連結化等），
   還原為正確 TypeScript / JSX 語法，並同時把 Track A2 直接整合進這份版本（不再另外輸出 patch 說明）。
3. 在 Arena workspace 建立 project/ 目錄，寫入完整專案鏡像：
   package.json、tsconfig.json、postcss.config.mjs、src/app、src/components、src/lib。
4. 執行 npm install，執行 npx tsc --noEmit（零型別錯誤），執行 npx next build
   （Turbopack production build 成功，靜態頁面正確產出）。
5. 使用者提供本機實際的 layout.tsx / page.tsx / globals.css，助理據此更新鏡像使其完全對齊本機專案，
   並重新執行完整驗證流程（install + tsc + build），再次通過。
6. 使用者下載鏡像版本至本機測試，Track A2 回報「符合預期」。
```

新協作模式（取代先前的 patch 說明文件模式）：

```
之後功能異動，助理直接修改 project/ 目錄下的實際檔案；
交付前於 workspace 內實際執行編譯驗證；
使用者下載 project/src/ 內容覆蓋回本機對應位置；
助理仍無法直接讀寫使用者本機檔案系統，非全自動同步。
```

### 文件更新

```
00-HANDOFF-STATUS-AND-AI-RULES.md 新增 1N 續接狀態，記錄 Track A2 完成、使用者提問回覆、協作模式調整。
01-CANON-SPEC-AND-DECISIONS.md 新增 8.17 canon（Bulk Select）、新增 8A 節（協作模式）、
  新增 D-111 / D-112、更新第 17 節最終一句話。
02-PROJECT-LOG-DETAILED.md 新增本則日誌。
```

### 結果

```
Track A2 完成並驗證通過。
協作模式正式調整為工作區直接維護代碼，降低使用者手動比對貼上的出錯風險，並提高每次交付前的驗證可靠度。
未推翻任何既有產品 / 架構決策。
```

### 後續建議

```
下一步：Track C — Study Set / Flashcard v0（規模較大，需要新的資料模型：Deck / Card / StudyAttempt，
        動工前先與使用者確認範圍）
Dashboard / Home 暫緩，待近期 tracks 告一段落後再評估
之後所有 track 的程式碼異動，一律採用「工作區直接維護 + 編譯驗證 + 使用者下載覆蓋」模式
```


---


## 2026-07-02 — Track E：Workspace Backup / Export package v0 完成

### 類型

```
功能實作 / 資料安全 / vNext tracks 執行
```

### 背景

Track A（Link / TaskList / TaskItem）完成並驗證通過後，使用者指示「下一步維持順序節奏可以快點沒關係」，依 r15 建議與使用者確認的優先序（Backup → Capture → Study Set），推進 Track E — Workspace Backup / Export package v0。開始實作前，先向使用者確認兩個關鍵範圍問題：PDF binary 是否一併備份、Import 行為是否需要合併。使用者選擇「PDF binary 一併備份（base64）」與「Import 僅做完全覆蓋（v0 先做這個）」。

實作前依序取得並檢視：`src/lib/IndexedDBAdapter.ts`、`src/lib/StorageAdapter.ts`。

### 執行的動作

```
1. 整檔替換 types.ts：新增 WorkspaceBackup / WorkspaceBackupAttachmentEntry / WorkspaceBackupSettingEntry 型別。
2. 整檔替換 StorageAdapter.ts：新增 exportWorkspaceBackup? / importWorkspaceBackup? 兩個可選方法，比照 createAttachment 既有介面風格。
3. 整檔替換 IndexedDBAdapter.ts：
   - 新增 blobToBase64() / base64ToBlob() 輔助函式，使用瀏覽器原生 ArrayBuffer / Uint8Array / btoa / atob，不引入新套件。
   - 實作 exportWorkspaceBackup()：讀出 pages（含已軟刪除）、attachments（含 binary）、settings 全部內容。
   - 實作 importWorkspaceBackup()：檢查 schema_version 相容性，使用單一 IndexedDB transaction 清空並重寫 pages / attachments / binaries / settings 四個 store。
4. 局部 patch NexusApp.tsx：Sidebar 新增 Export Backup / Import Backup 按鈕；Root App 新增 handleExportBackup / handleImportBackupClick / handleImportBackupFile 三個 handler 與對應 hidden file input。
```

### 關鍵設計決策

```
Backup 檔案為單一 JSON，檔名 nexus-backup-YYYY-MM-DD-HHmm.json。
PDF / 圖片 binary 以 base64 一併打包進同一份 JSON，不使用另外的檔案或雲端儲存。
Import v0 僅支援完全覆蓋，不支援合併；合併邏輯延後評估。
Import 前二次確認，明確告知會覆蓋所有資料且無法復原。
清空與重寫四個 store 包在同一個 transaction 內，確保原子性。
Import 成功後自動 reload 頁面，避免 React state 與 IndexedDB 不同步。
```

### 使用者驗證結果

使用者完成測試後回報「一切正常」，測試涵蓋：

```
建立含 tags / folder / links 的筆記與 PDF research note，並刪除一篇筆記進 Trash
Export Backup 下載並確認內容合理
清空環境後 Import Backup，二次確認提示正確出現
確認後筆記、Trash 內容、PDF binary、active_page_id 皆正確還原
一般 regression（新建 / 刪除筆記、Import PDF、Import MD、Link / Task 編輯）仍正常
```

### 文件更新

```
00-HANDOFF-STATUS-AND-AI-RULES.md 新增 1L 續接狀態，記錄 Track E 完成與下一步 Track B。
01-CANON-SPEC-AND-DECISIONS.md 新增 8.16 canon、新增 D-109 / D-110、更新第 17 節最終一句話。
02-PROJECT-LOG-DETAILED.md 新增本則日誌。
```

### 結果

```
Track E 完成並驗證通過。
未推翻任何既有決策；content_json 仍是唯一真相，StorageAdapter 抽象維持一致風格（新方法設為可選）。
local-first 最大風險（資料遺失）現在有 v0 等級的保障能力。
```

### 後續建議

```
下一步：Track B — Quick Capture / Inbox v0
之後：Track C — Study Set / Flashcard v0
```


---


## 2026-07-02 — Track A（Editor Blocks Foundation 第一批）：Link / TaskList / TaskItem 完成

### 類型

```
功能實作 / Markdown v0.1 → v0.2 升級 / vNext tracks 執行
```

### 背景

r15 提出 vNext tracks（A~F）管理近期開發後，使用者要求「能先處理的小事項都可以直接先做」，並上傳 `types.ts`、`TiptapEditor.tsx`、`package.json`、`NexusApp.tsx` 供分析。經風險評估後，確認 Track A 中的 Link extension 與 TaskList / TaskItem extension 風險最低、範圍集中在 `TiptapEditor.tsx` 與 `NexusApp.tsx` 的 Markdown 轉換函式，適合作為下一步。

### 執行的動作

```
1. 查證 Tiptap v3.27.1 官方文件：確認 StarterKit v3 已內建 Link mark，但 TaskList / TaskItem 未內建，需另外安裝。
2. 安裝 @tiptap/extension-link、@tiptap/extension-task-list、@tiptap/extension-task-item（皆為 3.27.1，與現有套件版本對齊）。
3. 整檔替換 TiptapEditor.tsx：新增 Link / TaskList / TaskItem extension、Toolbar Link 按鈕與 ☑ Task 按鈕、對應 CSS。
4. 局部 patch NexusApp.tsx 的 5 個函式：parseInlineMarkdown、inlineNodesToMarkdown、新增 taskItemToMarkdownLine、nodeToMarkdown、createMarkdownContent，將 Markdown v0.1 的文字保留策略升級為 v0.2 真實節點策略。
5. 保留 v0.1 舊函式 listItemToMarkdown，確保向後相容，不破壞既有 IndexedDB 中的舊資料。
```

### 關鍵設計決策

```
StarterKit.configure({ link: false }) 關閉內建 Link，改用獨立設定的 Link extension，避免同名 extension 衝突。
Link 採 openOnClick: false + toolbar prompt() 設定連結，避免編輯時誤觸跳轉。
TaskItem 設定 nested: true。
Markdown v0.2 的 taskList / link 節點與 v0.1 的文字符號資料可並存，export 邏輯分別處理。
```

### 使用者驗證結果

使用者完成完整測試後回報「都通過」，並特別確認「可點擊但不跳轉」為預期行為（非 bug），因為 openOnClick 設為 false。

測試涵蓋：

```
Link 設定 / 修改 / 移除
Task list checkbox 勾選與刪除線樣式
Export MD（task 與 link 語法還原）
Import 含連結與 task 的 .md 檔
v0.1 舊資料（☐/☑ 文字符號）export 向後相容
一般 regression：新建/刪除筆記、tags、folder、backlinks、PDF import、Trash/Restore
```

### 文件更新

```
00-HANDOFF-STATUS-AND-AI-RULES.md 新增 1K 續接狀態，記錄 Track A 完成與下一步 Track E。
01-CANON-SPEC-AND-DECISIONS.md 新增 8.15 canon（取代 8.14 舊限制，8.14 保留作歷史）、新增 D-107 / D-108、更新第 17 節最終一句話。
02-PROJECT-LOG-DETAILED.md 新增本則日誌。
```

### 結果

```
Track A 第一批（Link + TaskList/TaskItem）完成並驗證通過。
未推翻任何既有決策；content_json 仍是唯一真相，StorageAdapter 抽象未受影響。
```

### 後續建議

使用者指示「下一步維持順序節奏可以快點沒關係」，依 r15 建議順序（使用者確認的優先序：Backup → Capture → Study Set）推進：

```
下一步：Track E — Workspace Backup / Export package v0
之後：Track B — Quick Capture / Inbox v0
之後：Track C — Study Set / Flashcard v0
```


---


## 2026-07-02 — r15 Deep Review：文件矛盾、架構語意與近期 tracks 修正

### 類型

```
文件稽核 / 架構最佳化 / 決策補強
```

### 背景

使用者在 r14 vNext 架構分類與大型功能邊界整理完成後，要求：

```
對現在所有檔案與資訊進行一次深度且完整的整理資訊、分析檔案問題與提出建議，考量是否有決策能被優化或不明智，或是有文件內容、資訊上的矛盾與遺漏，達成方案最佳化的結果
```

### 檢查範圍

檢查 Arena workspace 中目前可見：

```
00-HANDOFF-STATUS-AND-AI-RULES.md
01-CANON-SPEC-AND-DECISIONS.md
02-PROJECT-LOG-DETAILED.md
99-ZERO-LOSS-AUDIT-AND-SOURCE-ARCHIVE.md
README.md
NexusApp.tsx
TiptapEditor.tsx
StorageAdapter.ts
IndexedDBAdapter.ts
markdown-v0.1-test.md
```

### 發現的主要問題

```
1. README.md 過期，仍顯示 2026-06-29 與 r7 / r8 舊更新重點。
2. 00-HANDOFF 結尾有重複的「## 11. 最終一句話」。
3. 01-CANON 的 8.6 Soft delete 章節順序跑到 8.14 後面。
4. default_mode 舊語意是 UI 顯示偏好，但 r14 新語意中又被用作 Page / Creatable 種類，需拆分。
5. 舊 MVP-2 範圍以 PDF / research 為主，但 r14 後 Quick Capture / Inbox、Study Set、Backup、Editor Blocks 也進入近期重要範圍，需 re-baseline。
6. D-30 Stable Block ID 與 D-44 Page-level backlinks 暫緩策略需補清楚；Block ID 應列為近期底層修補。
7. IndexedDBAdapter 中 attachment.storage_key 與 binaries 實際 key 使用 attachment.id 有語意不一致，需要文件化。
```

### 決策補強

本次補入 D-102～D-106：

```
D-102 — Page kind 與 default view mode 必須拆分
D-103 — MVP-2 改以 vNext tracks 管理，避免無限膨脹
D-104 — Stable Block ID 是近期底層修補，不阻塞 Page-level backlinks
D-105 — IndexedDB v0 binary key 暫用 attachment.id，storage_key 保留給未來 adapter / migration
D-106 — Workspace Backup v0 應早於 Sync / Version History 完整化
```

### 結果

```
沒有推翻 r14 大方向。
確認 Nexus 目前方向正確。
將最重要的語意矛盾 default_mode 拆分為 Page kind / default_view_mode 的中期方向。
將近期開發改以 Editor Blocks、Capture & Inbox、Learning Core、Research、Safety Backup、Creatable Registry 等 tracks 管理。
```

### 後續建議

```
下一步開發仍需由使用者選擇。
最適合小步實作的候選：Link extension、TaskList / TaskItem、Workspace Backup v0、Quick Capture / Inbox v0、Study Set / Flashcard v0。
```


---


## 2026-07-02 — vNext Architecture Discussion：Creatables / Views / Tools / Website 弱聯動定案

### 類型

產品架構討論 / 大型功能邊界 / 未來重做風險控管 / 文件同步

### 背景

Markdown import / export v0.1 完成後，使用者要求暫停繼續 coding，先思考 Nexus 最終應該能建立 / 生成哪些大方向的東西。使用者明確表示：

```
繼續討論 但不只是簡報 我想在現在確定大部分的功能跟架構
因為我怕後續想要的大功能會影響架構需要重新變成或很麻煩 所以趁現在先處理完
```

使用者也說明：

```
筆記/文檔/QUIZ這些是確定的且分開的
網站/簡報/待辦清單 這些要考慮是否是以上的附屬或額外獨立
```

### 使用者關鍵需求整理

使用者確認：

```
Note（筆記）最重要，應追求最舒服、最多元、最完整的 native editor 體驗。
Note 可以不完整輸出成 Markdown，可為了最佳記筆記體驗犧牲一些 Markdown 相容。
Document（文檔）與 Note 分開，偏 Markdown source / preview / 普通閱讀 / 匯入匯出。
Study Set / Quiz（學習集 / 測驗 / 字卡）與 Note 分開，基本要有翻頁字卡、四選一、拼寫、CSV/TSV 匯入。
Presentation（簡報）保留，但早期應偏 Gamma-like，Canva-like 自由設計後期再說。
Website / Publish Project（網站 / 發布專案）需要討論，使用者原先想像接近 Wix / Linktree / 分享網站。
Quick Capture / Inbox（快速收集 / 收件匣）需要，而且其實前期就提過，可能被某次 AI 交接弱化 / 遺漏。
```

使用者確認完全需要：

```
Reading List / Library（閱讀清單 / 資料庫）
Template System（模板系統）
Import Center（匯入中心）
Export Center（匯出中心）
Dashboard / Home（儀表板 / 首頁）
Review Queue（複習佇列）
```

使用者分層確認：

```
後續需要：
- AI Assistant / AI Tutor（AI 助理 / AI 學習導師）
- Web Clipper（網頁剪藏）

近期需要但不是立刻：
- File / Asset Library（檔案 / 素材庫）
- Citation / Bibliography（引用 / 參考文獻）
- Sync / Backup / Version History（同步 / 備份 / 版本歷史）

與筆記功能一同完善：
- Annotation / Highlight System（標註 / 劃線系統）
- Database / Collection / Properties（資料庫 / 集合 / 屬性）
```

### 討論後定案的大分類

最後暫定分類：

```
Core Creatables（核心可建立項目）
1. Note（筆記）
2. Document（文檔）
3. Study Set（學習集 / 字卡組）
4. PDF Research Note（PDF 研究筆記）
5. Presentation（簡報）
6. Canvas（畫布）

Extended Creatables（延伸可建立項目）
1. Website / Publish Project（網站 / 發布專案）
2. Project / Study Plan（專案 / 學習計畫）
3. Library Item（資料庫項目 / 閱讀來源項目）
4. Reference Item（文獻 / 來源項目）
5. Link Page / Landing Page（連結頁 / 單頁網站）

System Views（系統視圖）
1. Dashboard / Home（儀表板 / 首頁）
2. Search（搜尋）
3. Graph（知識圖譜）
4. Tasks / Todo（任務 / 待辦）
5. Calendar（行事曆）
6. Review Queue（複習佇列）
7. Reading List / Library（閱讀清單 / 資料庫）
8. Asset Library（素材庫）
9. Inbox / Capture（收件匣 / 快速收集）

Tools（工具）
1. Create Center（建立中心）
2. Import Center（匯入中心）
3. Export Center（匯出中心）
4. Template System（模板系統）
5. AI Assistant / AI Tutor（AI 助理 / AI 學習導師）
6. Web Clipper（網頁剪藏）
7. Command Palette / Quick Actions（命令面板 / 快速操作）
8. Sync / Backup / Version History（同步 / 備份 / 版本歷史）
```

### 降級項目

使用者確認：

```
Learning Path / Curriculum（學習路線 / 課程路徑）
→ 不獨立；由 Todo / Project / Review Queue / Collection / Template 組合。

Course / Class Workspace（課程 / 班級工作區）
→ 必要性不高；不列為核心；未來可作 template / collection 用法。
```

助理建議且使用者基本同意的降級項目：

```
Full Wix-like website builder 不早期做滿。
Presentation 不早期做完整 Canva-like editor。
Canvas 不早期做完整白板 / 設計工具。
Database 不早期做完整 Notion clone。
AI 不作早期核心依賴。
Web Clipper 不早期做完整 browser extension。
Sync 先做 Backup，再做完整 sync。
Citation 先做 metadata，不做完整 Zotero clone。
Plugin 先做 internal extension points，不做 marketplace。
```

### Website / Publish Project 討論結果

使用者表示原先想像接近 Wix / Linktree / 可分享網站頁，並詢問如果現在想法不明確，後續完善是否會導致 APP 重做。

最終結論：

```
只要現在確定 Website / Publish Project 是獨立或弱聯動模組，不混進 Note / Document 核心資料模型，後續完善 Website 通常不會導致整個 App 重做。
```

Website 安全邊界：

```
Website / Publish Project 是 Extended Creatable。
它是高層級分享 / 發布模組。
Note / Document 可以分享成網頁。
Note 不變成完整網站編輯器。
Website 可以引用 Note / Document / Asset / Collection。
Website 可以有少量網站專屬內容，例如 homepage、footer、button、link cards。
Website 不要求和來源強同步。
Website layout / routes / theme / sections 不塞進 Note content_json。
```

Website 分階段：

```
Phase 0：Export HTML
Phase 1：Share Page（分享頁）
Phase 2：Link Page / Landing Page（連結頁 / 單頁網站）
Phase 3：Publish Site（多頁發布網站）
Phase 4：Visual Website Editor（視覺網站編輯器，後期才接近 Wix / Webflow）
```

### 高層級生成物弱聯動

使用者提醒：

```
高層級的生成物可以不需要太多的聯動
類似筆記/文檔/網站
```

因此正式修正：

```
Source Reference / Provenance（來源引用 / 生成來源追蹤）需要保留，但降級為 optional metadata。
高層級生成物可以記錄來源，但不要求自動同步。
```

聯動分層：

```
強聯動：backlinks / tags / search / graph / attachments / annotations / tasks / review queue
弱聯動：generated Document / Presentation / Website / Study Set
無聯動：手動建立的 Document / Presentation / Website / Study Set
```

### 結果

本次討論形成一組 vNext architecture decisions，已寫入：

```
00-HANDOFF-STATUS-AND-AI-RULES.md 的 1I 最新續接狀態
01-CANON-SPEC-AND-DECISIONS.md 的 vNext Architecture & Feature Decisions 與 D-70～D-101
02-PROJECT-LOG-DETAILED.md 本日誌
99-ZERO-LOSS-AUDIT-AND-SOURCE-ARCHIVE.md r14 audit
```

### 後續建議

完成架構邊界整理後，可回到功能實作。合理下一步候選：

```
1. 真正 Link extension
2. 真正 TaskItem / TaskList extension
3. Image block
4. Table block
5. Equation / LaTeX
6. Callout / Admonition block
7. Quick Capture / Inbox v0
8. Workspace Backup / Export package v0
9. Study Set / Flashcard v0 手動建立 + CSV / TSV 匯入
```

但本次討論的重點是避免未來重做，不代表下一步要立刻做所有大型功能。


---


## 2026-06-29 — Basic Notes Foundation Step 10.1：Markdown v0.1 link syntax / task list 補強完成

### 類型

Markdown import/export 補強 / link syntax / task list / 文件同步

### 背景

Markdown import / export v0 完成後，使用者選擇：

```
1. Markdown v0 補強：link syntax / task list
```

### 實作內容

在 `NexusApp.tsx` 的 Markdown helper 中補強：

```
parseInlineMarkdown 支援 [label](url)。
createMarkdownContent 支援 - [ ] / - [x]。
listItemToMarkdown 支援將 ☐ / ☑ 轉回 - [ ] / - [x]。
```

### 設計邊界

link syntax：

```
目前不啟用 @tiptap/extension-link。
Import 時保留 [label](url) 原始文字。
Export 時可保留原樣。
```

task list：

```
目前不啟用 @tiptap/extension-task-list / task-item。
Import 時 - [ ] 轉成 ☐，- [x] 轉成 ☑。
Export 時再轉回 Markdown task syntax。
```

### 測試

助理在工作區生成測試檔：

```
markdown-v0.1-test.md
```

使用者匯入後確認：

```
Bold / Italic / Inline code 真的有格式。
Link syntax 保留。
Task list 顯示 ☐ / ☑。
```

接著使用者測試 Export 並回報：

```
Export 也正常
```

### 結果

```
Basic Notes Foundation Step 10.1：Markdown import / export v0.1 ✅ 完成
```


---


## 2026-06-29 — Basic Notes Foundation Step 10：Markdown import / export v0 完成

### 類型

基本筆記功能補強 / Markdown import / Markdown export / v0 parser / 文件同步

### 背景

Editor formatting toolbar 完成後，助理提供下一步選項，使用者選擇：

```
C. Markdown import / export
```

### 實作內容

修改 `src/components/NexusApp.tsx`，新增 Markdown import / export v0。

新增 helper：

```
titleFromMarkdownFileName
getTextFromNode
escapeMarkdownText
inlineNodesToMarkdown
listItemToMarkdown
nodeToMarkdown
pageToMarkdown
textNode
parseInlineMarkdown
paragraphNode
listItemNode
createMarkdownContent
downloadTextFile
safeFileName
```

Sidebar 新增：

```
Import MD
Export MD
```

Root App 新增：

```
markdownInputRef
handleImportMarkdownClick
handleExportMarkdown
handleImportMarkdownFile
hidden markdown file input
```

### 支援範圍

Markdown v0 支援：

```
# heading
paragraph
- bullet list
1. ordered list
> quote
```

**bold** *italic* `inline code` --- horizontal rule

```

不保證完整支援：

```

table image nested list task list link syntax frontmatter footnote HTML block

```

### 問題與修正

使用者替換後回報：

```

.map((line) => `> ${line}`) line標紅

```

判斷：TypeScript 未推斷 line 型別。

修正：

```

.map((line: string) => `> ${line}`)

```

### 驗證結果

使用者最後回報：

```

這是 Markdown import / export v0，不是完整 Markdown parser。 測試成功

```

### 結果

```

Basic Notes Foundation Step 10：Markdown import / export v0 ✅ 完成

```

---

## 2026-06-29 — Basic Notes Foundation Step 9：Editor formatting toolbar 完成

### 類型

基本筆記功能補強 / Tiptap toolbar / editor CSS / 文件同步

### 背景

Basic Notes Foundation Step 8 完成後，下一步建議為 Editor formatting toolbar。使用者貼出 `src/components/TiptapEditor.tsx`。檢視後確認該檔案乾淨，使用：

```

@tiptap/core Editor StarterKit Placeholder Typography onChangeRef 防閉包雷 切換頁面時 setContent(content)

```

### 實作內容

生成完整 `TiptapEditor.tsx` 供使用者整檔替換。

新增：

```

ToolbarButton component toolbarState refreshToolbarState() onCreate / onSelectionUpdate / onTransaction / onUpdate 更新 toolbar active state

```

Toolbar 支援：

```

Bold Italic Inline Code H1 / H2 / H3 Bullet list Ordered list Quote Code block Clear formatting

```

### 問題與修正

使用者測試後回報：

```

按 `• List` `1. List` 格式會變但是前面沒有顯示點或數字 其他正常

```

判斷：

```

Tiptap 已正確產生 bulletList / orderedList，但 CSS reset 導致 ul / ol 沒有顯示 marker。

```

修正：在 `TiptapEditor.tsx` 補入 scoped style：

```

.nexus-tiptap-editor ul { list-style-type: disc; padding-left: 1.5rem; } .nexus-tiptap-editor ol { list-style-type: decimal; padding-left: 1.5rem; } .nexus-tiptap-editor li / li p margin .nexus-tiptap-editor blockquote .nexus-tiptap-editor pre / code .nexus-tiptap-editor h1 / h2 / h3

```

使用者再次替換後回報：

```

正常

```

### 結果

```

Basic Notes Foundation Step 9：Editor formatting toolbar ✅ 完成

```

### 後續建議

下一步可繼續基本筆記 polish：

```

Toolbar UX polish Page actions polish Editor empty state / placeholder polish Markdown import / export（若使用者需要）

```

---

## 2026-06-29 — Basic Notes Foundation Step 8：Permanent Delete / Duplicate Page 完成

### 類型

基本筆記功能補強 / permanent delete / duplicate page / StorageAdapter 擴充 / 文件同步

### 背景

在 Trash / Restore UI 完成後，使用者澄清拆檔不是必要，只是不了解一般檔案行數，並提出：

```

還有如果進垃圾桶後想完整刪除可以嗎 然後你乾脆把基本功能先做我直接測試

```

助理判斷：

```

拆檔不是現在必要功能。 1000 多行在原型階段正常。 使用者目前更需要基本功能補齊。

```

因此本次直接生成可替換檔案，補上 Trash permanent delete 與 Duplicate page。

### 實作內容

修改檔案：

```

src/components/NexusApp.tsx src/lib/StorageAdapter.ts src/lib/IndexedDBAdapter.ts

```

StorageAdapter：

```

新增 permanentDeletePage(id: ID): Promise<void>

```

IndexedDBAdapter：

```

實作 permanentDeletePage(id) 從 pages store delete page record 若 active_page_id 等於該 id，清除 active_page_id 第一版不刪 attachment / binary

```

NexusApp：

```

Sidebar props 新增 onPermanentDeletePage / onDuplicatePage Trash 模式 item 顯示 Restore / Delete Trash Delete 二次 confirm，提示不可復原 Notes 模式 item hover 顯示 Copy / delete 新增 handlePermanentDeletePage 新增 handleDuplicatePage Duplicate 複製 content_json / content_text / tags / folder / links / attachment_ids / primary_attachment_id Duplicate 建立新 page id，title 加 copy，並切換 active page

```

### 重要設計邊界

```

一般 Delete 仍是 soft delete。 永久 Delete 只在 Trash 裡提供。 Permanent delete 第一版只刪 page record。 不自動清 attachment / binary，避免誤刪可能共用的 PDF 附件。 Duplicate PDF research note 時共用同一個 attachment，不重複 binary。

```

### 使用者驗證

使用者替換並測試後回報：

```

正常

```

### 結果

```

Basic Notes Foundation Step 8：Permanent Delete / Duplicate Page ✅ 完成

```

### 後續建議

若繼續基本筆記功能，下一步建議：

```

Editor formatting toolbar

```

需要先取得 / 檢視：

```

src/components/TiptapEditor.tsx

```

---

## 2026-06-29 — Basic Notes Foundation Step 7：Trash / Restore UI 完成與 NexusApp 整檔替換

### 類型

基本筆記功能補強 / Trash / Restore / soft delete UI / 整檔替換 / 回歸測試 / 文件同步

### 背景

在 PDF import / viewer 相關 Step 3～6 完成後，使用者表示：

```

繼續 我有點想先完善基本的筆記功能還是你不建議

```

助理建議先暫停 PDF layout，回頭完善基本筆記功能，理由是 PDF 匯入 / 檢視已可用，但基本筆記功能若不夠穩，後續 annotation / citation / research workflow 都會建立在不夠安全的基礎上。

助理建議第一優先做 Trash / Restore UI，因為既有資料層已有 soft delete，但 UI 尚無回收站可還原。使用者確認：

```

可以

```

### 初始 patch 方向

原本提出逐段修改 `src/components/NexusApp.tsx`：

```

1.Sidebar props 新增 isTrashMode / onShowNotes / onShowTrash / onRestorePage。
2.Sidebar 新增 Notes / Trash 切換。
3.Trash 模式顯示 deleted pages。
4.Trash item 提供 Restore button。
5.Root App 新增 trashPages / isTrashMode state。
6.新增 loadTrashPages()。
7.新增 handleShowNotes / handleShowTrash / handleRestorePage。
8.handleDeletePage 後同步更新 trashPages。
9.<Sidebar /> 傳入 isTrashMode ? trashPages : pages。

```

### 使用者疲勞與整檔替換

使用者表示：

```

我現在有點累的還是你直接生成整個代碼我直接替換 然後我的 NexusApp.tsx 來到1000多行了 需要拆嗎 還是這樣很正常

```

助理判斷：

```

1000 多行在早期原型可接受，因為 Sidebar / Editor / RightPanel / App state / PDF / Trash 都在同一檔。 但已接近需要整理的程度。 建議先功能穩定，再安全拆檔。 拆檔順序應先拆純 UI component：Sidebar.tsx、RightPanel.tsx；不要立刻拆 hooks。

```

於是助理生成完整 `NexusApp.tsx` 供使用者整檔替換。

### 整檔內容

完整版本整合：

```

Search Tags Folders Backlinks / Outgoing links PDF Import PDF Preview Small / Medium / Large Hide / Show Open PDF pdfLoadError Trash / Restore UI

```

並清理：

```

PDF viewer 貼到 isEditingFolder 裡的錯誤位置。 React fragment 少 </> 的錯誤。 [page.id](http://page.id) 這類聊天渲染污染。

```

### 使用者驗證結果

使用者替換後回報：

```

正常 而且連垃圾功能之前被我刪除的檔案也在欸

```

助理判斷：這是正確且重要的結果，代表既有 delete 設計不是硬刪，而是 soft delete，過去被刪除的 pages 仍在 IndexedDB，只是 `deleted_at` 不為 null。

接著要求使用者做快速回歸測試：

```

1.新建一般筆記是否正常。
2.改 title 是否正常。
3.寫正文，刷新後是否還在。
4.tags 是否還能新增 / 刪除。
5.folder 是否還能設定。
6.backlinks 是否還能點。
7.Import PDF 是否還正常。
8.PDF viewer 的 Small / Medium / Large / Hide / Open 是否還正常。
9.Trash Restore 後刷新是否還存在。

```

使用者回報：

```

正常

```

### 結果

```

Basic Notes Foundation Step 7：Trash / Restore UI ✅ 完成

```

完成能力：

```

Notes / Trash 切換 Trash 顯示過去 soft-deleted pages 刪除後可進 Trash Restore 可還原 page Restore 後切回 Notes 並選中該 page 沒有永久刪除，維持資料安全 快速回歸測試通過

```

### 後續建議

下一步建議先做安全拆檔：

```

1.Sidebar.tsx
2.RightPanel.tsx

```

暫不建議立刻做：

```

大型 hooks 重構 PDF annotation / highlight SQLite / Drizzle Permanent delete

```

---

## 2026-06-29 — MVP-2 Step 5 / Step 6：PDF viewer layout polish 與錯誤狀態完成

### 類型

實作推進 / UI polish / error handling / PDF viewer / 使用者本機手動 patch / 文件同步

### 背景

在 Step 3 PDF import flow、Step 4 PDF viewer 最小版、Step 4-C Open 按鈕完成後，使用者要求繼續下一步。助理決定先做低風險但實用的 PDF research note layout polish，而不是 annotation / highlight。

### Step 5 實作內容

Step 5 目標：改善 PDF Preview 的閱讀體驗，但仍維持簡單架構。

實作內容：

```

1.在 Editor component 內新增 isPdfCollapsed state。
2.在 Editor component 內新增 pdfViewerHeight state，初始值 560。
3.PDF Preview header 新增 Small / Medium / Large 按鈕。
4.Small 設定 pdfViewerHeight = 420。
5.Medium 設定 pdfViewerHeight = 560。
6.Large 設定 pdfViewerHeight = 720。
7.PDF Preview header 新增 Hide / Show 按鈕。
8.Hide / Show 透過 setIsPdfCollapsed((prev) => !prev) 控制。
9.iframe className 改為 w-full bg-white，height 改由 inline style 控制。
10.收合時顯示 PDF preview hidden. Click Show to expand.

```

測試項目：

```

Small / Medium / Large 可切換高度。 Hide / Show 可收合展開。 Open 仍可新分頁開啟 PDF。 筆記編輯不受影響。

```

使用者回報：

```

正常

```

Step 5 結果：

```

MVP-2 Step 5：PDF research note layout polish 第一版 ✅ 完成

```

### Step 6 實作內容

Step 6 目標：避免 PDF binary 缺失或讀取失敗時畫面永遠停在 Loading。

實作內容：

```

1.Root App 新增 pdfLoadError state。
2.loadActivePdf() 開始時 setActivePdfUrl(null) 與 setPdfLoadError(null)。
3.activeAttachment.kind 不是 pdf 時 setPdfLoadError("This attachment is not a PDF.")。
4.storageRef.current 尚未 ready 時 setPdfLoadError("Storage is not ready.")。
5.readBinary(activeAttachment.id) 回傳 null 時 setPdfLoadError("PDF binary data was not found in local storage.")。
6.loadActivePdf().catch 時 setPdfLoadError("Failed to load PDF preview.")。
7.Editor props 新增 pdfLoadError。
8.<Editor /> 傳入 pdfLoadError={pdfLoadError}。
9.PDF Preview 內改為三態渲染：pdfUrl / pdfLoadError / loading。

```

### Step 6 遇到的問題與解法

使用者在替換 `{pdfUrl ? (` 區塊後回報「大報錯」，並貼出完整 `NexusApp.tsx` 片段。

檢查後確認主要問題：

```

{!isPdfCollapsed && ( <> ...

```

開了 React fragment，但在下一段 `{isPdfCollapsed && (` 前沒有關閉：

```

</> )}

```

修正指示：

```

在 {isPdfCollapsed && ( 前面補上 </> )}。

```

正確結構：

```

{!isPdfCollapsed && ( <> {pdfUrl ? (...) : pdfLoadError ? (...) : (...)} </> )}

{isPdfCollapsed && (...)}

```

另外檢查時也發現：

```

舊的 PDF banner / viewer 曾被貼到 isEditingFolder 的 <span> 內。

```

處理建議：刪除該錯誤位置的舊 viewer，只保留 title input 與 <TiptapEditor /> 中間的主 PDF Preview block。

使用者依指示處理後回報：

```

處理完了正常

```

Step 6 結果：

```

MVP-2 Step 6：PDF viewer 錯誤狀態與缺檔提示 ✅ 完成

```

### 後續建議

下一步建議：

```

MVP-2 Step 7：PDF research workspace layout evaluation

```

可評估：

```

左右分欄：左 PDF、右筆記。 sticky PDF viewer。 可調整分割比例。 是否保存 viewer layout preference。

```

仍不做：

```

annotation / highlight 複雜 PDF.js annotation layer citation parser SQLite / Drizzle 遷移

```

---

## 2026-06-29 — MVP-2 Step 3 / Step 4 / Step 4-C：PDF import flow 與 PDF viewer 最小版完成

### 類型

實作推進 / PDF import / attachment flow / PDF viewer / 使用者本機手動 patch / 文件同步

### 背景

使用者確認要繼續實作 Nexus，依交接文件目前主線直接進入 MVP-2 Step 3。依 D-57，實作前先要求使用者提供目前關鍵檔案內容：

```

src/components/NexusApp.tsx src/lib/types.ts src/lib/StorageAdapter.ts src/lib/IndexedDBAdapter.ts

```

使用者透過 PowerShell 印出並貼上。貼文中仍出現 `&lt;`、`=&gt;`、`[Date.now](http://Date.now)()` 等聊天渲染污染，但依先前澄清，VS Code 本機 source 為正常內容，因此不要求清理不存在於本機的污染。

### 檢視到的實際狀態

```

types.ts 已有 AttachmentKind / Attachment。 Page / CreatePageInput 已有 attachment_ids / primary_attachment_id。 StorageAdapter 已有 createAttachment? / listAttachments / getAttachment / saveAttachment / deleteAttachment / attachBinary / readBinary。 IndexedDBAdapter DB_VERSION = 2。 IndexedDBAdapter 已有 attachments store 與 binaries store。 IndexedDBAdapter 已實作 createAttachment / attachBinary / readBinary。 NexusApp.tsx 是 pages state、activePageId、storageRef、create/select/save flow 的集中點。

```

### Step 3 實作內容

在 `src/components/NexusApp.tsx` 提供手動 patch，使用者依指示修改。主要內容：

```

1.import type { Page, Attachment }。
2.新增 createClientBlockId()。
3.新增 titleFromPdfFileName()。
4.新增 createResearchNoteContent()。
5.Sidebar props 新增 onImportPdf。
6.Sidebar 搜尋區下方新增 Import PDF button。
7.Root App 新增 attachments state 與 pdfInputRef。
8.init 時 adapter.listAttachments() 並 setAttachments。
9.activePage 透過 primary_attachment_id 對應 activeAttachment。
10.新增 handleImportPdfClick() 觸發 hidden file input。
11.新增 handleImportPdfFile() 完成 PDF import flow。
12.JSX 新增 hidden file input。
13.<Sidebar /> 傳入 onImportPdf={handleImportPdfClick}。
14.<Editor /> 傳入 attachment={activeAttachment}。
15.Editor 顯示 PDF attachment banner。

```

Step 3 實際完成流程：

```

本地選 PDF → 檢查 file type / .pdf extension → storage.createAttachment({ kind: "pdf", name, mime_type, size_bytes }) → storage.attachBinary(attachment.id, file) → storage.createPage({ title, tags: ["research"], folder: "Research", attachment_ids: [attachment.id], primary_attachment_id: attachment.id }) → 初始化 research note content_json / content_text → storage.savePage(researchPage) → setAttachments / setPages → setActivePageId(researchPage.id) → storage.setActivePageId(researchPage.id)

```

### Step 3 遇到的問題與解法

問題：使用者在 `<Sidebar />` props 中看到 `handleCreatePage` 標紅。

處理：判斷可能是 `handleCreatePage` 被漏掉、放錯 scope 或括號壞掉，提供補回 function 的 patch。使用者回報「第2.解決」，表示補回 `handleCreatePage` 後標紅消失。

結果：使用者執行後回報「正常」。

### Step 3 驗證結果

使用者回報：

```

能顯示檔名跟PDF Notes Source PDF: 02_Enemy_Design_給人看的版本.pdf 這樣是對的嗎 沒有內容

```

判斷：這是 Step 3 正常結果，因為 Step 3 只做 PDF import flow，尚未做 PDF viewer。

### Step 4 實作內容

接著進入 MVP-2 Step 4：PDF viewer 最小版。仍只修改 `src/components/NexusApp.tsx`。主要內容：

```

1.Editor props 新增 pdfUrl: string | null。
2.Root App 新增 activePdfUrl state。
3.activeAttachment 後新增 useEffect。
4.useEffect 中透過 storageRef.current.readBinary(activeAttachment.id) 讀出 Blob。
5.URL.createObjectURL(blob) 建立 object URL。
6.cleanup 時 URL.revokeObjectURL(objectUrl)。
7.Editor 中新增 PDF Preview iframe。
8.<Editor /> 傳入 pdfUrl={activePdfUrl}。

```

Step 4 邊界：

```

不做 highlight。 不做 annotation。 不做 citation parser。 不做 LaTeX。 不引入複雜 PDF.js viewer。

```

### Step 4 遇到的問題與解法

問題：使用者回報程式沒有任何報錯，但網頁情況跟 Step 3 一樣，有刷新過。

排查：先要求確認是否看到 `PDF Preview` 或 `Loading PDF preview...`，並檢查三個關鍵字：

```

PDF Preview pdfUrl={activePdfUrl} const [activePdfUrl

```

使用者回報 1、2、3 點都沒問題，但網頁仍一樣。

判斷：PDF viewer JSX 可能貼到錯的位置，雖然程式存在，但不在實際顯示區域。

解法：要求將 PDF viewer JSX 直接放在 `Editor` 的 title input 與 `<TiptapEditor />` 中間。

結果：使用者回報：

```

加上那一大段後pdf正常檢視

```

結論：readBinary / blob URL / iframe 機制正常；問題是 JSX placement。後續若 PDF viewer 不顯示，應優先檢查 viewer JSX 是否位於實際 page render path。

### Step 4-C 實作內容

接著補低風險 viewer polish：

```

1.PDF Preview header 右側新增 Open 按鈕。
2.Open 按鈕 disabled={!pdfUrl}。
3.onClick 時 window.open(pdfUrl, "_blank", "noopener,noreferrer")。
4.iframe 新增 key={attachment.id}，切換不同 PDF 時更穩定重新載入。

```

使用者回報：

```

正常

```

### 最終結果

```

MVP-2 Step 3 PDF import flow：✅ 完成並由使用者回報正常 MVP-2 Step 4 PDF viewer 最小版：✅ 完成並由使用者回報 PDF 正常檢視 MVP-2 Step 4-C viewer polish：✅ 完成並由使用者回報正常

```

目前已具備：

```

本地 PDF 選檔 attachment metadata 建立 PDF binary 存入 IndexedDB binaries store 自動建立 research note page Page 與 attachment 關聯 active_page_id 持久化 PDF banner PDF Preview iframe Open in new tab

```

### 後續建議

下一步建議：

```

MVP-2 Step 5：PDF research note layout polish

```

建議方向：

```

改善 PDF viewer 與筆記區的閱讀 / 書寫布局。 可評估上下分割、左右分割、可收合 viewer、viewer 高度調整。 暫不做 annotation / highlight。 暫不做 citation parser。 暫不引入 SQLite / Drizzle。

```

---

## 2026-06-28 — 對話壓縮續接資訊完整編入與 Step 2 狀態修正

### 類型

文件同步 / 狀態修正 / 零遺漏保全 / MVP-2 續接

### 背景

在對話壓縮後，系統提供了一份「另一個語言模型已完成的思考摘要」，內容涵蓋 Nexus 目前所有關鍵狀態、使用者偏好、已完成事項、未完成事項與下一步。使用者隨後明確要求：

```

我對你的任務是將以下內容 完整且詳細的編入文檔裡 確保不要有任何資料的遺失

```

因此本次工作不是繼續寫程式，而是將壓縮後的續接資訊完整納入文件系統，並修正 `02-PROJECT-LOG-DETAILED.md` 中仍殘留的舊狀態。

### 使用者文件治理要求

使用者先前已選擇：

```

D 保守保留全部歷史痕跡

```

本次因此採用以下原則：

```

1.不刪除歷史日誌。
2.不讓舊錯誤判斷消失，而是保留並加註最新修正。
3.最新狀態寫入 00 / 01 作 current authority。
4.本文件 02 記錄「曾經怎麼判斷、後來如何修正」。
5.99 作為 archive / audit，補入本次更新紀錄與雜湊。

```

### 本次編入的核心續接資訊

#### 1. 當前主線

```

MVP-0：✅ 已完工 MVP-1：✅ 已完工 MVP-2：🟡 進行中 MVP-2 規格：✅ 已審查與定稿 MVP-2 Step 2：✅ attachment data layer 已完成 下一步：MVP-2 Step 3：PDF import flow patch

```

#### 2. Step 2 狀態修正

先前本文件有一段「MVP-2 Step 2：Attachment data layer patch 進行中」，其中寫到使用者貼回的 `StorageAdapter.ts` / `IndexedDBAdapter.ts` 內容有 HTML escape / 富文字污染，例如：

```

Promise&lt;void&gt; =&gt; [Date.now](http://date.now/)() [input.name](http://input.name/) [input.page](http://input.page/)_count

```

後續使用者已澄清：

```

你所說的污染我在VScode內部並不是這樣顯示 他是正常的可能是貼上吧 反正不用改

```

因此最新判斷改為：

```

聊天畫面中的 HTML escape / 富文字污染只是貼上或渲染問題。 不代表使用者 VS Code 本機 source code 異常。 不需要要求使用者清理本機檔案。 MVP-2 Step 2 可視為完成。 下一步直接進入 MVP-2 Step 3。

```

這不是刪除舊記錄；舊段落仍保留於下方作為歷史紀錄，但其狀態已被本段與 00 / 01 的 current authority 覆蓋。

#### 3. Step 2 data layer 完成狀態

目前已納入的 data layer 要點：

```

AttachmentKind = "pdf" | "image" | "file" Attachment interface 已定義 Page 已納入 attachment_ids / primary_attachment_id CreatePageInput 已納入 attachment_ids / primary_attachment_id StorageAdapter 已納入 attachment metadata APIs StorageAdapter 已納入 binary payload APIs IndexedDB DB_VERSION = 2 IndexedDB stores 已包含 pages / settings / attachments / binaries attachments store 有 by_updated / by_deleted / by_kind indexes createPage 已納入 attachment 關聯欄位 createAttachment helper 已納入目前實作 attachBinary / readBinary 已納入目前實作

```

#### 4. 下一步 Step 3 需要的檔案

因 Step 3 會碰到 UI / state flow，且必須對齊目前實作，下一個 AI 應先請使用者提供：

```

src/components/NexusApp.tsx src/lib/types.ts

```

可請使用者直接上傳，或用 PowerShell 印出：

```

cd C:\\Users\\user\\Projects\\nexus Get-Content .\\src\\components\\NexusApp.tsx -Raw Get-Content .\\src\\lib\\types.ts -Raw

```

#### 5. Step 3 目標

MVP-2 Step 3 要實作最小 PDF import flow：

```

local file select 建立 attachment metadata store binary payload in IndexedDB auto-create research note page link page to attachment via attachment_ids / primary_attachment_id switch to the new research note page persist active_page_id

```

第一版 UX：

```

本地選檔 → 建立 attachment metadata → 儲存 binary → 自動建立 research note page → 建立關聯 → 切換到新 research note page

```

#### 6. Step 3 邊界

```

PDF / attachment 不可變成平行產品模型。 Page 仍是內容主體。 Research metadata 優先走 Property 系統。 一 PDF 對一主研究筆記只是起步 UX，不是資料模型硬限制。 annotation / highlight 不列入 MVP-2 主完成條件。 LaTeX 仍以 structured equation node 為底層方向。 SQLite / Drizzle 不是目前阻塞項。

```

### 本次文件修改摘要

```

00-HANDOFF-STATUS-AND-AI-RULES：新增 1A 續接狀態，修正 MVP-2 Step 2/Step 3 狀態。 01-CANON-SPEC-AND-DECISIONS：修正 MVP-2 狀態，補 Step 3 PDF import flow 規格，補 D-56 / D-57。 02-PROJECT-LOG-DETAILED：新增本日誌，保留舊 Step 2 進行中段落但明確標示已被最新狀態覆蓋。 99-ZERO-LOSS-AUDIT-AND-SOURCE-ARCHIVE：補入本次文件同步稽核紀錄。

```

### 結果

```

對話壓縮摘要中的關鍵資訊已編入 active docs。 Step 2 狀態由「進行中 / 需清理污染」修正為「完成 / 污染僅為聊天貼上顯示問題」。 下一步明確收斂為 MVP-2 Step 3 PDF import flow patch。 執行 Step 3 前應先取得 NexusApp.tsx 與 types.ts。

```

### 後續

下一輪若使用者要繼續實作，請不要重新整理願景或回到 MVP-1。應直接請使用者上傳或貼出：

```

src/components/NexusApp.tsx src/lib/types.ts

```

然後產出符合目前程式結構的 Step 3 手動 patch。

---

## 2026-06-28 — MVP-2 Step 2：Attachment data layer patch 進行中（StorageAdapter / IndexedDBAdapter）


> 最新修正註記（2026-06-28）：本段保留為歷史紀錄。後續使用者已澄清，所謂 HTML escape / 富文字污染只出現在聊天貼上內容，不存在於 VS Code 本機 source code。因此本段中「Step 2 尚未完全完成、需清理污染」已過期；目前 current authority 是：MVP-2 Step 2 已完成，下一步是 Step 3 PDF import flow patch。

### 類型

實作推進 / data layer 擴充 / 文件同步

### 背景

在 MVP-2 規格定稿後，使用者選擇先從 data layer 下手，順序為 `types + StorageAdapter` 起步，並延伸到 `IndexedDBAdapter` 的 attachment / binary 基礎能力。由於 Arena 工作區內沒有實際專案 source code，採用「助理提供 patch、使用者手動修改、再貼回檢查」模式進行。

### 執行的動作

1. 助理先提出 `types.ts` 的 schema 擴充方向：
   - 新增 `AttachmentKind = "pdf" | "image" | "file"`
   - 新增 `Attachment` interface
   - `Page` / `CreatePageInput` 新增 `attachment_ids` 與 `primary_attachment_id`
2. 助理提出 `StorageAdapter.ts` 擴充：
   - `listAttachments`
   - `getAttachment`
   - `saveAttachment`
   - `deleteAttachment`
   - `attachBinary`
   - `readBinary`
   - 建議性 `createAttachment?()` helper
3. 助理提出 `IndexedDBAdapter.ts` 擴充：
   - `DB_VERSION` 由 `1` 升至 `2`
   - 拆分 `newPageId()` / `newBlockId()` / `newAttachmentId()`
   - `deviceId` 採 `dev_` 前綴
   - IndexedDB `upgrade()` 新增 `attachments` 與 `binaries` store
   - `createPage()` 納入 attachment 關聯欄位
   - 新增 attachment metadata CRUD 與 binary read/write 方法
   - 新增 `createAttachment()` helper
4. 使用者已手動完成大部分修改，並將最新 `StorageAdapter.ts` / `IndexedDBAdapter.ts` 貼回檢查。

### 目前檢查結果

1. 結構方向正確，以下項目已反映到使用者貼回版本：
   - `Attachment` import
   - `createAttachment?()` 介面
   - `DB_VERSION = 2`
   - `attachments` / `binaries` stores
   - `newPageId()` / `newBlockId()` / `newAttachmentId()`
   - `createPage()` 關聯 attachment 欄位
   - `listAttachments()` / `getAttachment()` / `saveAttachment()` / `deleteAttachment()`
   - `attachBinary()` / `readBinary()`
   - `createAttachment()` helper
2. 但使用者貼回內容仍有明顯的富文字 / HTML escape 污染，尚未能視為最終可編譯版本，例如：
   - `Promise&lt;void&gt;`
   - `=&gt;`
   - `[Date.now](http://Date.now)()`
   - `name: [input.name](http://input.name)`
   - `page_count: [input.page](http://input.page)_count`
3. 因此目前狀態應視為：
   - **MVP-2 Step 2 尚未完全完成**
   - **已完成結構性 patch，大致只剩語法污染清理與最終驗收**

### 結果

MVP-2 attachment data layer 已實際推進到幾乎完成的狀態，但仍需把貼上污染清回正常 TypeScript 原始碼，之後才能安全進入下一步 PDF import flow patch。

### 下一步

1. 使用者先清理 `StorageAdapter.ts` 與 `IndexedDBAdapter.ts` 中的 HTML escape / 富文字污染。
2. 助理再做一次 final verify。
3. 驗證通過後，直接進入 **MVP-2 Step 3：PDF import flow patch**。

---

## 2026-06-28 — MVP-2 規格審查、調整定稿與決策補強

### 類型

規格審查 / 決策收斂 / 文件更新準備

### 背景

在確認 MVP-1 已完成後，使用者選擇先為第二階段（MVP-2）建立正式規格，而不是直接跳入實作。初版草案經審查後，進一步收斂成較穩定的研究工作流規格。

### 執行的動作

1. 檢視初版 MVP-2 草案，確認其方向與 Nexus 核心場景（學習 / 研究）一致。
2. 保留以下主方向：
   - attachments 基礎能力
   - PDF 匯入與閱讀
   - research note 與 PDF 關聯
   - citation / paper metadata
   - LaTeX equation
3. 對草案進行 6 個重點審查：
   - `default_mode: "pdf"` 是否過早定案
   - PDF 與 research note 關係是否被誤寫成硬一對一
   - 研究 metadata 是否應直接塞入 Page 固定欄位
   - attachment metadata 與 binary payload 是否應分離
   - LaTeX 是否應採 equation node 而非純文字 hack
   - PDF 第一版是否需要完整 Page Mode 架構化重構
4. 使用者確認 4 項關鍵調整：
   - A 同意：research metadata 優先走 Property 系統
   - B 同意：UX 可先像一對一，但資料模型不寫死一對一
   - C 同意：annotation / highlight 不列入 MVP-2 主完成條件
   - D 同意：PDF 第一版先做與 Page 關聯的 viewer

### 收斂後的規格結論

1. MVP-2 正式範圍：
   - attachments 基礎能力
   - PDF 匯入
   - PDF 閱讀 viewer
   - research note 與 PDF 關聯
   - citation / paper metadata
   - LaTeX equation（inline + block）
2. 研究 metadata 優先走 Property 系統，不新增為大量 Page 固定欄位。
3. 一個 Page 可關聯 0~N 個 attachments；一個 attachment 也可被 0~N 個 pages 關聯。
4. 匯入 PDF 時，UX 可先自動建立一篇主研究筆記並設為 `primary_attachment_id`。
5. Attachment record 與 binary payload 分離，透過抽象 storage API 存取。
6. LaTeX 底層採結構化 equation node，`$...$` / `$$...$$` 僅作輸入捷徑。
7. Annotation / highlight 延後到後續子階段評估。

### 結果

MVP-2 規格完成審查與定稿，可正式納入 handoff / canon 文件，並作為接下來實作拆解的依據。

### 下一步

將 MVP-2 定稿規格納入 active docs，接著拆成具體實作任務，開始第二階段落地。

---

## 2026-06-28 — MVP-1 Step 6：Backlinks（雙向連結實作與 MVP-1 完工）

### 類型

功能實作 / 資料結構擴充 / MVP-1 里程碑收斂

### 背景

完成輕量資料夾系統後，實作 MVP-1 最後一塊拼圖：Wikilink 雙向連結與知識關聯面板。

### 執行的動作

1. `types.ts`：擴充 Page 介面的 `links?: string[]` 正向連結清單欄位。
2. `IndexedDBAdapter.ts`：建立筆記時賦予 `links: []` 預設值。
3. `NexusApp.tsx` 主程式升級：
   - 引入 `extractWikilinks` 正規解析工具（`/\[\[([^\]]+)\]\]/g`），在正文編輯存檔時自動擷取所有 Wikilink 標題。
   - 啟用右側資訊面板（Right Panel）：實作反向連結（Backlinks）全站比對清單，以及正向連結（Outgoing Links）清單。
   - 實作點擊關聯跳轉機制：若點擊的筆記已存在，即刻載入；若尚未建立，詢問後自動新建並跳轉。

### 結果

雙向連結關聯網解析與面板互動運作正常，MVP-1 規劃範疇全數實作完畢。

### 下一步

專案進入 MVP-2（學習/研究工具套件）或 MVP-3（時間管理整合）評估階段。後續使用者已拍板優先進入 MVP-2。

---

## 2026-06-28 — MVP-1 Step 5：Lightweight Folders（輕量資料夾分組實作與字體放大）

### 類型

功能實作 / 資料結構擴充 / UI 視覺規格升級

### 背景

完成標籤系統後，推進單層輕量資料夾歸屬與側邊欄自動歸類。

### 執行的動作

1. `types.ts`：擴充 Page 介面的 `folder?: string | null` 欄位與 `CreatePageInput`。
2. `IndexedDBAdapter.ts`:建立筆記時預設 `folder: null`。
3. `NexusApp.tsx` 主程式升級：
   - 全局字體放大:清單區與標題由 `text-xs` 升級至 `text-sm/base` (14~16px)。
   - 編輯器屬性列加入「📁 資料夾設定」區，支援 inline input 快速歸屬。
   - 側邊欄清單引入 `groupedPages` 與 `sortedFolderNames` 運算，自動將筆記依資料夾分類顯示（未分類固定排頂部）。

### 結果

資料夾分組導航與字體縮放符合規格，重整後歸屬持久化正常。

### 下一步

MVP-1 Step 6：Backlinks（雙向連結關聯解析與右側面板實作）。

---

## 2026-06-28 — MVP-1 Step 4：Tags First（標籤組織系統實作與並發修復）

### 類型

功能實作 / 資料結構擴充 / 並發 Bug 修復

### 背景

完成側邊欄精修後，依循 MVP-1 實作順序推進輕量標籤系統。

### 執行的動作

1. 擴充 `types.ts` 中 Page 介面的 `tags?: string[]` 欄位。
2. 更新 `IndexedDBAdapter.ts` 建立頁面時賦予 `tags: []` 初始值。
3. 升級 `NexusApp.tsx` 主程式：
   - 編輯器標題下方加入標籤輸入與 Chips 刪除區。
   - 側邊欄加入全域標籤過濾列，與搜尋字串執行交集過濾。
4. 修復刪除筆記後按 F5 復活的非同步連動 Bug（在刪除前清除防抖定時器並切斷 `activePageRef` 快取指標）。

### 結果

標籤系統 CRUD 與多條件篩選運作正常；軟刪除徹底阻斷快取回寫。

### 下一步

MVP-1 Step 5：Lightweight Folders（單層輕量資料夾組織系統）。

---

## 2026-06-28 — MVP-1 Step 3：Sidebar Polish（側邊欄精修）

### 類型

介面精修 / MVP-1 功能推進

### 背景

完成 Search v0 後，依循 MVP-1 實作順序推進側邊欄介面優化。

### 執行的動作

升級 `NexusApp.tsx` 中的 `Sidebar` 元件：

1. 頂部 Title bar 增加極簡視覺標記與按鈕縮放回饋。
2. 搜尋輸入框加入 focus ring 與一鍵清除（✕）按鈕。
3. 筆記清單項加入 Active Indicator（垂直藍色指示條）、hover 背景漸變，並優化刪除按鈕觸發邊界（stopPropagation）。

### 結果

側邊欄視覺與互動規格對齊 Calm Productivity 原則。

### 下一步

MVP-1 Step 4：Tags first（實作標籤系統資料模型與 UI）。

---

## 2026-06-28 — MVP-0 健康檢查、Code Verify 收斂修復 與 MVP-1 Search v0 實作

### 類型

健康檢查 / 代碼稽核 / Bug 修復 / MVP-1 功能實作 / 垂直切片驗證

### 背景

新 AI 接手 Nexus 專案後，依循 `00-HANDOFF-STATUS-AND-AI-RULES.md` 的首要指令，不重談願景、不重建專案，直接啟動 PowerShell 導航模式進行 Step 0 健康檢查與 Step 1 Code Verify。

### 執行的動作

1. 執行 `cd C:\Users\user\Projects\nexus` 與 `npm.cmd run dev` 確認 Next.js 16.2.9 伺服器與 `localhost:3000` 啟動正常。
2. 透過 `type` 指令逐一印出 `TiptapEditor.tsx` / `NexusApp.tsx` / `IndexedDBAdapter.ts` / `types.ts` 進行代碼稽核。
3. 確認底層 IndexedDB 軟刪除與 revision 機制健康。
4. 開立處方箋替換 `TiptapEditor.tsx` 與 `NexusApp.tsx`，收斂 MVP-0。
5. 在確認「重整保存成功」後，進一步實作 MVP-1 Step 2：Search v0 全域字串搜尋。

### 發現與解決的問題

#### 問題 1：前輪已實作功能殘留 3 個過渡期 Bug

- **現象**：純文字欄位被寫死為亂碼 `content_text: "撌脣摮?..."`；頁面切換仍用純文字 `<p>` 還原；刪除最後一頁觸發當機白屏。
- **原因**：前輪實作未完全對齊「`content_json` 為唯一真相」與 activePage 空值保護門檻。
- **解法**：在 `NexusApp.tsx` 存檔時解構出正確 text，空值時優雅提示，切換頁面改用 `editor.commands.setContent(content)` 樹狀載入。

#### 問題 2：輸入後重整網頁（F5）內容未保存

- **現象**：手動打字測試後按 F5 刷新，筆記變回原樣。
- **原因 A（React 閉包雷）**：`TiptapEditor` 在 mount 時綁定 `onUpdate`，打字時編輯器永遠只記住第一秒的舊 `onChange` 閉包，訊號未傳出。
- **原因 B（定時器攔截）**：800ms debounce 還在倒數，瀏覽器就被關閉。
- **解法**：引入 `useRef(onChange)` 動態指向最新閉包；在 `NexusApp.tsx` 註冊 `window.addEventListener("beforeunload", ...)` 緊急將半空中的資料寫入硬碟。

### 結果

- MVP-0 垂直切片驗證 100% 通過（能寫、能存、重開還在、軟刪除正常）。
- MVP-1 Search v0 運作正常（支援標題與正文即時記憶體過濾）。

### 下一步

MVP-1 Step 3：Sidebar polish（側邊欄視覺與互動精修）。

---

# 2026-06-28 — 最終交接文件結構定案

## 類型

```

文件治理 / 最終交接整理 / 決策補強 / 零遺漏封存

```

## 背景

使用者希望最終交接文件不要過度分散，而是整理成更適合交給下一個 AI 的結構。使用者提出三大主文件方向：

```

1.專案與目標概述、用戶的須知要求、對 AI 的限制、交接內容、任務進度確認等。
2.現對專案的詳細設定、規劃與決策（既定事實）。
3.專案日誌：以每次的行動為條項，詳細記錄過程、遇到的問題、解決、結果；之前被更改過的決策也記錄在此。

```

助理建議保留第 4 份 `99` 作為零遺漏 audit / source archive。使用者接受此建議。

## 決策

最終交接包定案為：

```

00-HANDOFF-STATUS-AND-AI-RULES.md 01-CANON-SPEC-AND-DECISIONS.md 02-PROJECT-LOG-DETAILED.md 99-ZERO-LOSS-AUDIT-AND-SOURCE-ARCHIVE.md

```

## 理由

```

00：負責最新狀態、AI 行為規則、使用者要求、任務進度、下一步。 01：負責目前專案設定、產品架構、技術規格、MVP 規劃與決策。 02：負責歷史過程、行動紀錄、問題與解法、決策演變。 99：負責零遺漏稽核與來源全文封存。

```

## 處理的問題

本次整理把前輪深度審視發現的問題處理進文件：

```

1.Archive 舊狀態可能誤導：在 00 / 01 / 99 中標明 archive 不覆蓋最新狀態。
2.「使用者回報完成」與「已驗證完成」混用：在 00 / 01 中建立狀態語意。
3.content_json 與 page delete UI 需 verify：在 00 中加入 verify checklist。
4.MVP-1 不應為 Search 提前遷移 SQLite：加入 D-39。
5.modules / active docs 不取代 source archive：加入 D-41。
6.Project Log 需保留最大詳細度：加入 D-42，且本文件保留 active log 與 archive 中更長的 Project Log 來源。
7.使用者最終選擇 3 active docs + 99 archive：加入 D-43，並記錄於本日誌。

```

## 結果

```

最終交接文件結構完成。 下一個 AI 可直接從 00-HANDOFF-STATUS-AND-AI-RULES.md 開始。 零遺漏保險由 99-ZERO-LOSS-AUDIT-AND-SOURCE-ARCHIVE.md 提供。

```

---

# Module 06 — Project Log Detailed Chronological（詳細時間線工作日誌）

> 整理者新增：本模組依使用者要求，優先保留「非常詳細」的實際歷史紀錄。  
> 第一段取自目前 active doc `03-PROJECT-LOG-DETAILED.md`。  
> 第二段取自 `ALL-SOURCES-FULL-ARCHIVE.md` 中更長的 `nexus-handoff-updated-2026-06-27/03-PROJECT-LOG.md` 來源區塊，用來保留更完整的動作、問題、解決方式、結果與文件治理過程。  
> 原文內容放在 `BEGIN SOURCE` / `END SOURCE` 標記之間；標記內文字逐字取自來源檔，未改寫。

**模組用途：** 保留完整實戰日誌，依時間順序詳細記錄動作、問題、原因、解決方式與結果。

---

<!-- BEGIN SOURCE: 03-PROJECT-LOG-DETAILED.md | FULL FILE -->

# Nexus — Project Log Detailed（完整實戰日誌整合版）

*最後更新：2026-06-27*  
*用途：記錄實際做過什麼、遇到什麼問題、如何解決。這不是產品規格；規格見 Canon / Tech Spec。*

---

## 0. 最新狀態摘要

```

MVP-0 已完工。 MVP-1 已啟動。 content_json 完整 JSON 儲存：使用者回報完成。 頁面刪除 / soft delete UI：使用者回報完成。 下一步：Search、Sidebar organization、Tags/Folders、Backlinks。

```

---

# 2026-06-27 晚間 — MVP-0 完工後更新：JSON 儲存、頁面刪除、文件重整

## 類型

```

實作補充 / 文件整併 / MVP-1 前置修正 / Bug 修復紀錄

```

## 背景

使用者在 MVP-0 第一輪完成後又做了一批補充實作與文件整理，並要求：

```

日誌須包含詳細過程：執行的動作、遇到的問題、解決方式等等。

```

## 執行的動作

```

更新 00-NEXUS-HANDOFF-START-HERE.md 為 MVP-0 完工版。 新增 / 提議 00-NEXUS-HANDOFF-MASTER.md 作總入口。 更新 03-PROJECT-LOG.md，強調今日 bug 修復。 更新 99-ZERO-LOSS-AUDIT.md，加入實作資產清單。 更新 01-NEXUS-CANON.md 摘要，標示 MVP-0 完工與 MVP-1 目標。 新增 / 提議 02-TECH-SPEC.md 作技術規格。 新增 / 提議 04-DECISION-LOG.md 作 D-35~D-38 決策記錄。

```

## 最新技術事實

```

專案路徑：C:\\Users\\user\\Projects\\nexus 實際結構：src/app Node：v24.18.0 npm：11.16.0 PowerShell：用 npm.cmd App Shell：三欄 layout 完成 儲存層：StorageAdapter + IndexedDB 完成 編輯器：Tiptap + Markdown shortcut 完成 Auto-save：800ms debounce 完成 content_json：使用者回報 JSON 完整儲存完成 Page delete：使用者回報頁面刪除完成

```

## 實作檔案

```

src/lib/types.ts src/lib/StorageAdapter.ts src/lib/IndexedDBAdapter.ts src/components/NexusApp.tsx src/components/TiptapEditor.tsx src/app/layout.tsx src/app/page.tsx src/app/globals.css

```

## 問題：JSON.stringify 大小寫錯誤

### 現象

```

Runtime Error：json.stringify 不是函數。

```

### 原因

JavaScript 內建 JSON 物件是大寫 `JSON`，不是小寫 `json`。

### 解決

錯誤：

```

json.stringify(value)

```

正確：

```

JSON.stringify(value)

```

### 結果

```

JSON 格式儲存報錯修復。 content_json 完整持久化被回報完成。

```

## 問題：頁面刪除 / soft delete UI

### 原本狀態

`IndexedDBAdapter` 已有 `deletePage(id)` soft delete 方法，但 UI 未必已接。

### 最新回報

使用者提供新版 handoff 指出：

```

MVP-1 核心功能（JSON 儲存、頁面刪除）已實作。

```

### 後續需 verify

```

刪除後 page 是否從 Sidebar 消失。 刪除 active page 後是否選下一頁或建立新頁。 是否保留 restorePage 能力。

```

---

# 2026-06-27 — Next.js dev server 確認與 MVP-0 第一輪實作

## 目標

```

確認 C:\\Users\\user\\Projects\\nexus 可啟動 確認 app/src 結構 進入 MVP-0：App Shell → StorageAdapter → Tiptap → Auto-save

```

## 執行：確認 dev server

使用者執行：

```

cd C:\\Users\\user\\Projects\\nexus dir npm.cmd run dev

```

回報：

```

.next node_modules public src package.json package-lock.json ...

▲ Next.js 16.2.9 (Turbopack)

- Local: http://localhost:3000

✓ Ready in 277ms

```

## 結果

```

Next.js 專案可正常啟動 ✅ src/ 目錄存在 ✅ localhost:3000 可開 ✅

```

原先「可能沒有 src」疑慮解除。實際結構：

```

src/app ├── favicon.ico ├── globals.css ├── layout.tsx └── page.tsx

```

---

## 新手問題：dev server 佔用 terminal

### 現象

使用者執行 `npm.cmd run dev` 後 terminal 停在 Ready / GET log，無法輸入新指令。

### 解釋

`npm.cmd run dev` 啟動 Next.js 開發伺服器，是持續運行的程式，不會自動結束。

### 解法

```

VS Code → Terminal → New Terminal

```

原 terminal 留著跑 dev server；新 terminal 用來輸入其他指令。

---

## 新手問題：新 terminal 不在專案目錄

### 現象

```

dir src

```

在 `PS C:\Users\user>` 執行，報錯：

```

找不到 C:\\Users\\user\\src

```

### 解法

```

cd C:\\Users\\user\\Projects\\nexus dir src

```

結果確認 `src/app` 存在。

---

## 檔案內容檢查

使用者執行：

```

type src\\app\\layout.tsx type src\\app\\globals.css type src\\app\\page.tsx

```

發現：

```

layout.tsx 使用 next/font/google Geist / Geist_Mono。 globals.css 是 Tailwind v4 預設。 page.tsx 是 create-next-app welcome page，有 Deploy Now / Documentation。

```

---

## 決策：移除 Google Font 與 Vercel 預設頁

### 原因

```

Google Font 外部依賴不符合 local-first 氣質。 Deploy Now / Documentation 是 Vercel/Next 預設推廣，不是 Nexus 功能。 MVP-0 要專注三欄 App Shell。

```

### 操作

```

layout.tsx 全部替換：移除 next/font/google，metadata 改 Nexus。 globals.css 全部替換：加入 Nexus design tokens、系統字體、scrollbar。 page.tsx 全部替換：三欄 App Shell。

```

### 新手疑問與回答

| 疑問 | 回答 |
| --- | --- |
| 為什麼全部刪除？ | 整份預設檔都要換，全部替換對新手最安全 |
| 能看即時結果嗎？ | 可以，Next dev server hot reload |
| VS Code 多視窗能關嗎？ | 可以，但若 server 在該視窗，關閉會停 server |
| 關電腦怎麼辦？ | dev server 關掉很正常，下次再 `npm.cmd run dev` |
| 受限模式是什麼？ | VS Code Workspace Trust；本機自建專案建議信任 |

### 結果

```

瀏覽器顯示三欄介面 ✅ Sidebar / Editor / Right Panel 成功 ✅

```

---

# StorageAdapter / IndexedDB 階段

## 目標

```

讓筆記真正存進 IndexedDB。 讓 UI/Editor 不直接依賴 IndexedDB，而依賴 StorageAdapter。

```

## 建立檔案

```

src/lib/types.ts src/lib/StorageAdapter.ts src/lib/IndexedDBAdapter.ts

```

## types.ts

包含：

```

ID BlockType Block Page PageQuery CreatePageInput

```

## StorageAdapter.ts

包含：

```

init getPage listPages savePage createPage deletePage restorePage getActivePageId setActivePageId getDeviceId close

```

## 安裝 idb

### 問題

使用者先在錯誤目錄執行：

```

PS C:\\Users\\user\\Projects> type package.json

```

報錯找不到 package.json。

### 解法

```

cd C:\\Users\\user\\Projects\\nexus type package.json

```

確認 dependencies 原本只有 Next/React，再安裝：

```

npm.cmd install idb

```

### 結果

```

added 1 package

```

npm audit moderate vulnerabilities / allow-scripts warning 暫不阻塞 MVP-0。

## 安裝 nanoid

原因：`IndexedDBAdapter.ts` 使用：

```

import { nanoid } from "nanoid"

```

操作：

```

npm.cmd install nanoid

```

---

## 問題：IndexedDBAdapter import 錯誤

### 錯誤 import

```

import type { ID, Page, PageQuery, CreatePageInput, StorageAdapter } from "./types";

```

### 現象

`StorageAdapter` 紅線。

### 原因

`StorageAdapter` 不在 `types.ts`，而在 `StorageAdapter.ts`。

### 正確 import

```

import { openDB, type IDBPDatabase } from "idb"; import { nanoid } from "nanoid"; import type { ID, Page, PageQuery, CreatePageInput } from "./types"; import type { StorageAdapter } from "./StorageAdapter";

```

### 結果

```

紅線消失 ✅

```

---

## 建立 NexusApp client component

建立：

```

src/components/NexusApp.tsx

```

內容：

```

"use client" Sidebar component Editor component RightPanel component NexusApp root component storageRef isReady pages activePageId activePage saveTimerRef initialize storage restore active page create first page scheduleSave debounce 800ms handleSelectPage handleCreatePage handleTitleChange

```

---

## 問題：components / lib 建錯位置

### 現象

`page.tsx`：

```

import NexusApp from "../components/NexusApp";

```

出現：

```

Cannot find module '../components/NexusApp'

```

### 排查

```

dir src dir src\\components

```

結果：

```

src 下只有 app src\\components 不存在

```

### 原因

使用者將 `components` / `lib` 建在：

```

src/app/components src/app/lib

```

### 解決

```

在 VS Code 中將 components 與 lib 拖到 src/ 根目錄。

```

正確：

```

src/components src/lib

```

### 結果

```

page.tsx import 紅線消失 瀏覽器正常

```

---

# Tiptap 階段

## 安裝

```

npm.cmd install @tiptap/core @tiptap/starter-kit @tiptap/extension-placeholder

```

### 問題：裝錯位置

使用者一度在 `C:\Users\user\Projects` 而不是 `nexus` 裝 package。

### 症狀

```

Build Error Module not found: Can't resolve '@tiptap/core'

```

### 解法

```

cd C:\\Users\\user\\Projects\\nexus npm.cmd install @tiptap/core @tiptap/starter-kit @tiptap/extension-placeholder

```

### 結果

瀏覽器正常。

---

## 建立 TiptapEditor

建立：

```

src/components/TiptapEditor.tsx

```

初版：

```

new Editor({ element, extensions: [StarterKit, Placeholder], content, onUpdate -> editor.getText() -> onChange(text) })

```

後續目標 / 最新回報：改為 `editor.getJSON()` + `editor.getText()`。

---

## 問題：Markdown shortcut 樣式不明顯

### 現象

```

# + 空白：# 消失，區塊變大，但內容看起來一樣。

```

### 原因

```

可能 input rule 已生效，但 CSS 不足。 缺 @tiptap/extension-typography。 缺 .ProseMirror h1/h2/h3 樣式。 .next 快取可能未更新。

```

### 解法 1：安裝 Typography

```

npm.cmd install @tiptap/extension-typography

```

加入：

```

import Typography from "@tiptap/extension-typography";

```

extensions：

```

StarterKit, Placeholder.configure({ placeholder: "Start writing here..." }), Typography,

```

### 解法 2：補 CSS

在 `globals.css` 補：

```

.ProseMirror .ProseMirror p .ProseMirror h1/h2/h3 .ProseMirror ul/ol/li .ProseMirror blockquote .ProseMirror code/pre placeholder pseudo element

```

### 解法 3：清快取

```

Remove-Item -Recurse -Force .next npm.cmd run dev

```

### 結果

```

# + 空白成功 ✅

```

---

# Windows / PowerShell / Next.js 穩定性問題

## 問題：多 lockfile 導致 Turbopack root 誤判

### 現象

```

Warning: Next.js inferred your workspace root, but it may not be correct. Detected multiple lockfiles: C:\\Users\\user\\Projects\\package-lock.json C:\\Users\\user\\Projects\\nexus\\package-lock.json

```

### 原因

曾在父層 `Projects` 執行 npm install，產生多餘 lockfile。

### 解法

```

del C:\\Users\\user\\Projects\\package-lock.json

```

後續可檢查父層是否仍有：

```

C:\\Users\\user\\Projects\\package.json C:\\Users\\user\\Projects\\node_modules

```

---

## 問題：PowerShell rmdir 語法不適用

### 錯誤

```

rmdir /s /q .next

```

### 錯誤訊息

```

Remove-Item : 找不到接受引數 '/q' 的位置參數

```

### 原因

這是 cmd.exe 語法，不是 PowerShell 語法。

### 正確

```

Remove-Item -Recurse -Force .next

```

---

## 問題：兩個 dev server 同時存在 / port 3000 佔用

### 現象

```

Port 3000 is in use by process 16528, using available port 3001 instead. Another next dev server is already running. Run taskkill /PID 16528 /F to stop it.

```

### 解法

```

taskkill /PID 16528 /F Remove-Item -Recurse -Force .next npm.cmd run dev

```

### 結果

```

Local: http://localhost:3000 ✓ Ready

```

---

# 2026-06-27 — 本機環境與專案建立（早期摘要）

## 確認編輯器

```

VS Code 已安裝。

```

## Node 初次檢查失敗

初期 Node 尚未可用或 PATH 未確認，後續已解決。

## npm PowerShell execution policy

PowerShell 可能擋 `npm.ps1`。規則：

```

用 npm.cmd / npx.cmd，不直接用 npm / npx。

```

## 確認版本

```

Node.js: v24.18.0 npm.cmd: 11.16.0 Git: 2.54.0.windows.1

```

## 建立 Projects 資料夾

```

C:\\Users\\user\\Projects

```

## 建立 Next.js 專案

```

C:\\Users\\user\\Projects\\nexus

```

create-next-app 成功。

---

# 2026-06-20 ~ 2026-06-21 — 規劃階段摘要

完成：

```

產品定位 使用者背景 MVP roadmap 五概念模型 儲存策略 StorageAdapter 決策 Editor spec Design system Beginner operation guide Decision log D-01~D-34

```

形成關鍵決策：

```

Everything is Page/Block content_json 唯一真相 StorageAdapter 抽象 MVP-0 IndexedDBAdapter Soft delete Stable block ID UI/Editor 不直接依賴 DB

```

---

# 目前下一步

```

1.Verify 最新 code：content_json / delete UI 是否確實完成。
2.若完成，開始 MVP-1 Search。
3.接著做 Sidebar organization、Tags/Folders、Backlinks。

```

---

# 一句話總結

> Nexus 已經從零進到 MVP-0 完工；過程中解決了 Windows PowerShell、Next.js/Turbopack、目錄位置、Tiptap、IndexedDB、cache、port、JSON 大小寫等問題。下一步不要重做基礎，而是 verify 現況後推進 MVP-1。

<!-- END SOURCE: 03-PROJECT-LOG-DETAILED.md | FULL FILE -->

---

<!-- BEGIN SOURCE: ALL-SOURCES-FULL-ARCHIVE.md | SOURCE 5 nexus-handoff-updated-2026-06-27/03-PROJECT-LOG.md -->

# SOURCE 5: `nexus-handoff-updated-2026-06-27/03-PROJECT-LOG.md`

- bytes: 41693
- lines: 2161
- sha256: `68432f413132fbc42a6c01f9c9c58d940af076e5748721aa3b9dbeafec8c3b8e`

```

# Nexus — Project Log（工作進度日誌）

*建立日期：2026-06-27* *狀態：🟢 持續更新文件* *用途：用時間順序記錄 Nexus 專案「實際做了什麼」，包含文件整理、決策更新、本機環境操作、專案建立、下一步。* *定位：這不是決策權威，也不是產品規格；它是工作歷程與進度追蹤。*


---


## 0. 這份日誌怎麼使用

每次完成一個實際步驟，就在本文件新增一筆。

建議記錄：

`​text 日期 分類 做了什麼 結果 發現的問題 下一步 `​``

不要把大型產品規格寫在這裡；規格請放在 canon / implementation 文件。 本文件只回答：

`​text 我們實際做過哪些事？ 現在做到哪裡？ 下一步是什麼？ `​``


---


## 1. 日誌類型區分

Nexus 目前有幾種「日誌 / 記錄」文件，請不要混淆：

| 文件 | 用途 | 是否是本文件 | | --- | --- | --- | | `03-DECISION-LOG.md` | 記錄為什麼做某個決策，D-01~D-34 | 否 | | `90-PROJECT-REVIEW-2026-06-21.md` | 某次深度審視與風險分析 | 否 | | `99-ZERO-LOSS-AUDIT.md` | 稽核整理是否有遺漏來源文字 | 否 | | `03-PROJECT-LOG.md` | 記錄實際做了什麼、做到哪裡 | 是 |


---


## 2. 目前最新狀態摘要

截至 2026-06-27 晚間最新：

`​``text VS Code 已安裝 Node.js v24.18.0 已確認 npm.cmd v11.16.0 已確認 Git 2.54.0.windows.1 已確認 C:\\Users\\user\\Projects 已建立 C:\\Users\\user\\Projects\\nexus Next.js 專案已建立 npm.cmd run dev 已成功 實際結構已確認為 src/app/ localhost:3000 可正常開啟 三欄 App Shell 已完成 StorageAdapter + IndexedDBAdapter 已建立 idb / nanoid 已安裝 Tiptap editor + Typography 已接入

# + 空白 Markdown heading shortcut 已成功

content_json 完整 JSON 儲存已被回報完成 頁面刪除 / soft delete UI 已被回報完成 MVP-0 已完工 MVP-1 已啟動 `​``

目前下一步：

`​``text MVP-1：

1.實作全域搜尋 Search
2.優化 Sidebar 視覺與互動
3.實作資料夾 Folders 或標籤 Tags
4.後續接雙向連結 Backlinks

`​``

仍需注意：

`​text content_text 仍應定位為搜尋衍生資料。 若 content_json 已完成，Tiptap 還原應使用 content_json，而不是 content_text。 遇到 module not found 先查 package 是否安裝在 C:\\Users\\user\\Projects\\nexus。 遇到樣式/模組快取問題先清 .next。 PowerShell 清資料夾用 Remove-Item -Recurse -Force，不用 rmdir /s /q。 `​``


---


# 2026-06-27

## 2026-06-27 晚間 — MVP-0 完工後更新：content_json 持久化、頁面刪除與交接文件再整理

### 類型

`​text 實作補充 / 文件整併 / MVP-1 前置修正 / Bug 修復紀錄 `​``

### 背景

使用者回報：在前一輪完成三欄 App Shell、IndexedDB、Tiptap 與 Markdown shortcut 後，又做了一批補充整理與實作，並要求：

`​text 日誌須包含詳細過程：執行的動作、遇到的問題、解決方式等等。 剛剛做了一些事，請也歸入檔案。 `​``

本段將使用者提供的新狀態整理為新的最新日誌。若此段與較早日誌衝突，以本段時間序較新者為準。

### 最新狀態總結

`​text MVP-0 已完工。 MVP-1 核心前置已啟動。 content_json 完整 JSON 儲存已被回報完成。 頁面刪除按鈕 / soft delete UI 已被回報完成。 TiptapEditor 已改為 JSON 格式保存。 仍需在後續搜尋功能中優化 content_text 衍生資料。 `​``

### 1. 入口文件更新

#### 執行的動作

使用者提供並要求併入新版入口內容：

`​text 00-NEXUS-HANDOFF-START-HERE.md 標題更新為 Nexus — Current Qualified Handoff (MVP-0 完工版) 最後更新：2026-06-27 晚間 狀態：MVP-0 實作完成 / 新對話第一優先閱讀 `​``

入口文件核心改動：

`​text 新 AI 不要重新詢問願景。 目前 MVP-0 本地筆記原型已完成實作。 下一步應準備進入 MVP-1。 先確認 MVP-0 能寫、能存、重開還在。 MVP-1 任務包含 Inbox、資料夾、標籤、搜尋、雙向連結。 `​``

#### 最新技術事實

`​text 專案路徑：C:\\Users\\user\\Projects\\nexus 實際結構：src/app 運行環境：Node v24.18.0 / npm 11.16.0 PowerShell：使用 npm.cmd App Shell：三欄 layout 完成（280px / 820px / 320px） 儲存層：StorageAdapter 串接 IndexedDB 完成 編輯器：Tiptap 區塊編輯器 + Markdown 快捷鍵完成 自動儲存：800ms debounce 完成 `​``

#### 實作檔案清單

`​text src/lib/types.ts src/lib/StorageAdapter.ts src/lib/IndexedDBAdapter.ts src/components/NexusApp.tsx src/components/TiptapEditor.tsx src/app/layout.tsx src/app/page.tsx src/app/globals.css `​``

### 2. MVP-0 構建與環境驗證回顧

#### 執行的動作

`​text 驗證 Next.js 16.2.9 成功啟動於 port 3000。 確認 localhost:3000 可開。 清理 create-next-app 預設畫面。 移除 Deploy Now / Documentation 等預設 Vercel 連結。 建立 Nexus 三欄式佈局。 `​``

#### 遇到的問題

`​text layout.tsx 原本使用 next/font/google 的 Geist 字體。 這與 local-first / 不依賴外部字體資源的方向不完全一致。 `​``

#### 解決方式

`​text 移除 Google Fonts 外部依賴。 改用系統字體 stack。 globals.css 改為 Nexus 極簡 design tokens。 `​``

#### 結果

`​text 三欄 layout 成功顯示。 Sidebar / Editor / Right Panel 結構成為 MVP-0 UI 基礎。 `​``

### 3. 儲存層與資料結構：IndexedDB

#### 執行的動作

`​text 定義 StorageAdapter 抽象介面。 保留未來遷移 SQLite / Drizzle 的可能性。 安裝 idb。 安裝 nanoid。 實作 IndexedDBAdapter.ts。 加入 revision 管理。 加入 soft delete 欄位 deleted_at。 加入 active_page_id 設定保存。 `​``

#### 遇到的問題：路徑與目錄錯誤

現象：

`​text components 與 lib 資料夾誤建在 src/app/ 內部。 page.tsx 使用 ../components/NexusApp 匯入時出現找不到模組。 VS Code 顯示紅色波浪線。 terminal 中 dir src\\components 顯示路徑不存在。 `​``

原因：

`​text Next.js App Router 的 src/app 是 route/app 專用資料夾。 共用元件與 lib 應放在 src/components 與 src/lib，而不是 src/app/components、src/app/lib。 `​``

解決方式：

`​text 在 VS Code 中將 components 與 lib 從 src/app/ 拖曳至 src/ 根目錄。 修正後 page.tsx 使用 ../components/NexusApp 可正常解析。 重啟開發伺服器。 `​``

結果：

`​text 紅線消失。 NexusApp 成功被 page.tsx 匯入。 三欄介面恢復正常。 `​``

### 4. Tiptap 編輯器整合

#### 執行的動作

`​text 安裝 @tiptap/core。 安裝 @tiptap/starter-kit。 安裝 @tiptap/extension-placeholder。 建立 src/components/TiptapEditor.tsx。 將原本 textarea 升級為 Tiptap 區塊編輯器。 在 NexusApp.tsx 中接入 TiptapEditor。 `​``

#### 遇到的問題：Markdown 快捷鍵與樣式失效

現象：

`​text 輸入 # 加空白時，# 會消失，但文字視覺上沒有明顯變大。 使用者感覺快捷鍵沒有正常生效。 `​``

原因整理：

`​text 原因 1：缺乏 @tiptap/extension-typography 擴充。 原因 2：globals.css 缺乏對 .ProseMirror 類名的 CSS 樣式定義。 原因 3：.next 快取導致新安裝的模組或樣式沒有被 bundler 正確辨識。 `​``

#### 解決方式

`​powershell npm.cmd install @tiptap/extension-typography `​``

並在 `TiptapEditor.tsx` 中加入：

`​ts import Typography from "@tiptap/extension-typography"; `​``

在 extensions 中加入：

`​ts Typography `​``

接著在 `globals.css` 補上：

`​text .ProseMirror .ProseMirror p .ProseMirror h1 .ProseMirror h2 .ProseMirror h3 .ProseMirror ul / ol / li .ProseMirror blockquote .ProseMirror code / pre placeholder pseudo element `​``

若快取導致仍不生效，使用 PowerShell 清理：

`​powershell Remove-Item -Recurse -Force .next npm.cmd run dev `​``

#### 結果

`​``text

# + 空白 Markdown heading shortcut 成功。

Tiptap 視覺樣式正常。 `​``

### 5. 系統穩定性維護：Windows PowerShell / dev server / 快取

#### 遇到的問題 1：port 3000 被占用

現象：

`​text Port 3000 is in use。 Next.js 改用 3001。 terminal 顯示另一個 next dev server 已經在跑。 `​``

解決方式：

`​powershell taskkill /PID [ID] /F npm.cmd run dev `​``

注意：如果 terminal 提示具體 PID，例如：

`​text Run taskkill /PID 16528 /F to stop it. `​``

就使用該 PID。

#### 遇到的問題 2：PowerShell 與 cmd 語法混用

錯誤做法：

`​powershell rmdir /s /q .next `​``

PowerShell 會報錯：

`​text 找不到接受引數 '/q' 的位置參數 `​``

正確做法：

`​powershell Remove-Item -Recurse -Force .next `​``

#### 遇到的問題 3：多 lockfile 導致 Turbopack root 推斷錯誤

現象：

`​text Next.js inferred your workspace root, but it may not be correct. Detected multiple lockfiles: C:\\Users\\user\\Projects\\package-lock.json C:\\Users\\user\\Projects\\nexus\\package-lock.json `​``

原因：

`​text 曾在 C:\\Users\\user\\Projects 執行 npm install，造成父層產生多餘 package-lock.json。 Turbopack 因多 lockfile 誤判 workspace root。 `​``

解決方式：

`​powershell del C:\\Users\\user\\Projects\\package-lock.json `​``

後續仍建議檢查父層是否殘留：

`​text C:\\Users\\user\\Projects\\package.json C:\\Users\\user\\Projects\\node_modules `​``

若存在且確認不是其他專案需要，應再清理。

### 6. MVP-1 前置：content_json 完整儲存

#### 執行的動作

使用者回報：MVP-1 核心功能已開始，並實作了 JSON 完整格式儲存。

重點更新：

`​text TiptapEditor.tsx 不再只依賴 content_text。 改為保存 Tiptap getJSON() 產出的物件樹。 NexusApp.tsx 存檔時應更新 content_json。 content_text 保留為搜尋用衍生字串。 `​``

#### 遇到的問題：JSON.stringify 大小寫錯誤

現象：

`​text Runtime Error：json.stringify 不是函數。 `​``

原因：

`​text JavaScript 內建物件是 JSON，不是 json。 大小寫敏感。 json.stringify 錯誤。 JSON.stringify 才正確。 `​``

解決方式：

`​ts JSON.stringify(value) `​``

而不是：

`​ts json.stringify(value) `​``

#### 結果

`​text JSON 格式儲存問題修復。 content_json 完整持久化被回報完成。 MVP-1 的第一個關鍵前置修正已完成。 `​``

### 7. MVP-1 前置：頁面刪除按鈕 / soft delete UI

#### 執行的動作

使用者提供的新總入口內容中回報：

`​text MVP-1 核心功能（JSON 儲存、頁面刪除）已實作。 `​``

因此本日誌將狀態更新為：

`​text IndexedDBAdapter 原本已有 deletePage(id) soft delete 方法。 目前 UI 層已回報加入頁面刪除能力。 刪除邏輯應維持 soft delete：設定 deleted_at，不直接移除資料。 `​``

#### 後續需確認

`​text 刪除後 Sidebar 是否立即移除該頁。 刪除 active page 後是否自動選擇下一頁或建立新頁。 是否有 restore UI；若沒有，仍可視為未完成的回收站功能。 `​``

### 8. 新增 / 更新文件架構

使用者提供新的整合文件方向：

`​text 00-NEXUS-HANDOFF-MASTER.md：總入口 01-NEXUS-CANON.md：產品與架構權威 02-TECH-SPEC.md：技術規格與資料模型 03-PROJECT-LOG.md：實戰進度日誌 04-DECISION-LOG.md：決策與理由 99-ZERO-LOSS-AUDIT.md：稽核與代碼清單 `​``

本次已將上述內容整理進更新包，並保留原交接文件。

### 9. 最新權威解讀

`​text 若只看狀態：讀 00-NEXUS-HANDOFF-MASTER.md 或 00-NEXUS-HANDOFF-START-HERE.md。 若要理解今天怎麼做到、踩過哪些坑：讀 03-PROJECT-LOG.md。 若要查資料模型 / StorageAdapter / Tiptap 配置：讀 02-TECH-SPEC.md。 若要理解為什麼堅持 TS/JS、Tauri、JSON 唯一真相：讀 04-DECISION-LOG.md。 `​``

### 10. 目前最新狀態

`​text MVP-0：✅ 完工 MVP-1：🟢 已啟動 JSON 完整儲存：✅ 回報完成 頁面刪除：✅ 回報完成 搜尋：尚未完成 資料夾 / 標籤：尚未完成 雙向連結：尚未完成 UI polish：待做 `​``

### 11. 遺留注意事項

`​``text

1.content_text 目前仍需在搜尋功能實作時優化。
2.若 content_json 已完成，之後應避免再用 content_text 還原 Tiptap 編輯器。
3.deletePage 是 soft delete；真正刪除與回收站 UI 尚可延後。
4.若再出現 module not found，先檢查是否在正確目錄安裝 package。
5.若再出現樣式不更新，先清 .next 快取並重啟。
6.若再出現 port 佔用，使用 taskkill /PID [ID] /F。

`​``

### 一句話總結

> 晚間更新後，Nexus 已從「MVP-0 第一輪可用」推進到「MVP-0 完工，MVP-1 前置啟動」：content_json 完整儲存與頁面刪除已被回報完成；下一步是全域搜尋、Sidebar 組織系統（資料夾/標籤）與雙向連結。


---


## 2026-06-27 — Next.js dev server 確認與 MVP-0 第一輪實作

### 類型

`​text 本機實作 / 新手操作引導 / MVP-0 原型建立 `​``

### 背景

使用者在交接後表示：

`​text 我準備好了。 下一步是引導你執行 cd / dir / npm.cmd run dev。 如果需求定義不完整，或有更好的執行方式，可以向我提問。 檔案多經其他 AI 修飾，許多定稿內容可再次更動，請依整體方案最佳化。 `​``

此段重要，代表後續 AI 可以在不背離核心願景的前提下主動提出更佳做法，而不是僵硬照舊文件執行。

### 目標

`​text 確認 C:\\Users\\user\\Projects\\nexus 可以啟動 確認實際 app/src 結構 進入 MVP-0：App Shell → StorageAdapter → Tiptap → Auto-save `​``

### 執行與回報：確認 Next.js 專案可跑

使用者執行：

`​powershell cd C:\\Users\\user\\Projects\\nexus dir npm.cmd run dev `​``

回報結果：

`​``text 目錄: C:\\Users\\user\\Projects\\nexus

.next node_modules public src .gitignore AGENTS.md CLAUDE.md eslint.config.mjs next-env.d.ts next.config.ts package-lock.json package.json postcss.config.mjs README.md tsconfig.json `​``

dev server：

`​``text

> nexus@0.1.0 dev

> next dev

▲ Next.js 16.2.9 (Turbopack)

- Local: http://localhost:3000
- Network: http://192.168.0.46:3000

✓ Ready in 277ms `​``

### 結果判斷

`​text Next.js 專案可正常啟動 ✅ 實際有 src/ 目錄 ✅ localhost:3000 可開 ✅ 進入 MVP-0 實作條件成立 ✅ `​``

原先文件中「可能沒有 src/」的疑慮已解除。實際結構後續確認為：

`​text src/app ├── favicon.ico ├── globals.css ├── layout.tsx └── page.tsx `​``

### 新手操作問題 1：dev server 佔用 terminal

使用者看到 terminal 停在：

`​text ✓ Ready in 277ms GET / 200 ... [browser] Image with src ... has either width or height modified... `​``

並詢問為何無法在同一串繼續打字。

處理方式：

`​text 說明 npm.cmd run dev 啟動的是持續運行的開發伺服器 該 terminal 會被 dev server 佔用 若要輸入其他指令，需開新 terminal 分頁 `​``

引導：

`​text VS Code → Terminal → New Terminal `​``

### 新手操作問題 2：新 terminal 工作目錄不在專案

使用者在新 terminal 執行：

`​powershell dir src `​``

但 terminal 位於：

`​text PS C:\\Users\\user> `​``

錯誤：

`​text 找不到 'C:\\Users\\user\\src' 路徑 `​``

解決方式：

`​powershell cd C:\\Users\\user\\Projects\\nexus dir src `​``

結果：

`​text src 下有 app 資料夾 `​``

### 檔案內容檢查

使用者執行：

`​powershell type src\\app\\layout.tsx type src\\app\\globals.css type src\\app\\page.tsx `​``

確認起始狀態：

`​text layout.tsx 使用 next/font/google 的 Geist / Geist_Mono metadata title 為 Create Next App globals.css 為 Tailwind v4 預設設定 page.tsx 為 create-next-app 預設 Vercel / Next.js welcome page `​``

### 實作決策：移除 Google Font 與 Vercel 預設頁

說明給使用者：

`​text Deploy Now / Documentation 是 create-next-app 預設推廣連結 不屬於 Nexus 功能 MVP-0 local-first 不需要 Vercel deployment 入口 保留會干擾極簡三欄 App Shell `​``

使用者選擇：

`​text 手動貼程式碼 問題三：是否備份原 page.tsx 沒有意見 `​``

### 修改 1：layout.tsx

操作：

`​text 刪除原 layout.tsx 全部內容 貼上簡化 RootLayout 移除 next/font/google metadata 改為 Nexus html lang 改為 zh-TW body 使用 h-full antialiased `​``

新手疑問：

`​text 為什麼要全部刪除？ 能否查看即時結果？ 原本開 terminal 的 VS Code 視窗是否可以刪？ terminal 是否會一直留著？關電腦怎麼辦？ `​``

回答摘要：

`​text 整份 layout 幾乎都要替換，全部刪除再貼對新手最安全 Next.js dev server 會 hot reload，可即時查看 多餘 VS Code 視窗可以關，但若 dev server 在該視窗啟動，關閉會停止 server 關電腦會停止 dev server；下次重新 npm.cmd run dev 即可 `​``

### 新手操作問題 3：VS Code Workspace Trust / 受限模式

使用者詢問「打開」與「以受限模式開啟」差別。

處理方式：

`​text 說明 VS Code Workspace Trust 受限模式會限制 terminal、task、debug、extension 因 nexus 是使用者自己建立的本機專案，建議選信任 `​``

### 修改 2：globals.css

操作：

`​text 刪除原 globals.css 保留 @import "tailwindcss" 新增 Nexus 極簡色彩 CSS variables 設定 body 系統字體、scrollbar、全域 box sizing `​``

### 修改 3：page.tsx App Shell

操作：

`​text 刪除 create-next-app 預設內容 建立三欄 layout Sidebar: 280px Editor: flex-1，內容最大寬 820px Right Panel: 320px placeholder `​``

結果：

`​text 瀏覽器 localhost:3000 顯示三欄介面 ✅ 使用者確認三欄介面存在 terminal 出現 Route / Static / Bundler / Turbopack 等訊息，判定為正常 Next.js 編譯訊息 `​``

### StorageAdapter 階段

目標：

`​text 讓筆記真正存入 IndexedDB 讓 UI/Editor 不直接依賴 IndexedDB，而依賴 StorageAdapter `​``

建立檔案：

`​text src/lib/types.ts src/lib/StorageAdapter.ts src/lib/IndexedDBAdapter.ts `​``

`types.ts` 內容包含：

`​text ID BlockType Block Page PageQuery CreatePageInput `​``

`StorageAdapter.ts` 內容包含：

`​text init getPage listPages savePage createPage deletePage restorePage getActivePageId setActivePageId getDeviceId close `​``

### 依賴安裝：idb

先檢查 `package.json`，使用者一開始在錯誤目錄：

`​text PS C:\\Users\\user\\Projects> type package.json 找不到 C:\\Users\\user\\Projects\\package.json `​``

解決：

`​powershell cd C:\\Users\\user\\Projects\\nexus type package.json `​``

發現 dependencies 只有：

`​json "next": "16.2.9", "react": "19.2.4", "react-dom": "19.2.4" `​``

安裝：

`​powershell npm.cmd install idb `​``

結果：

`​text added 1 package 2 moderate severity vulnerabilities（未處理，暫不阻塞 MVP-0） allow-scripts warning（暫不阻塞 MVP-0） `​``

說明：

`​text idb 是 IndexedDB 的 Promise API 封裝，讓瀏覽器本地資料庫更好操作 `​``

### 問題：IndexedDBAdapter import 錯誤

一開始提供的 `IndexedDBAdapter.ts` import 寫成：

`​ts import type { ID, Page, PageQuery, CreatePageInput, StorageAdapter } from "./types"; `​``

使用者回報 `StorageAdapter` 紅色波浪號。

原因：

`​text StorageAdapter 不在 types.ts 裡，而在 StorageAdapter.ts 裡 `​``

修正：

`​ts import { openDB, type IDBPDatabase } from "idb"; import { nanoid } from "nanoid"; import type { ID, Page, PageQuery, CreatePageInput } from "./types"; import type { StorageAdapter } from "./StorageAdapter"; `​``

結果：

`​text 紅線消失 ✅ `​``

### 依賴安裝：nanoid

因 `IndexedDBAdapter.ts` 使用：

`​ts import { nanoid } from "nanoid"; `​``

需要安裝：

`​powershell npm.cmd install nanoid `​``

使用者詢問「怎麼知道缺這個」。

回答：

`​text 因程式碼 import 了 nanoid，但原 package.json 沒有該 dependency TypeScript 紅線通常代表 module 找不到或型別錯誤 `​``

### 建立 NexusApp client component

為了使用 React hooks / IndexedDB / editor 狀態，建立 client component：

`​text src/components/NexusApp.tsx `​``

內容包含：

`​text "use client" Sidebar component Editor component RightPanel component NexusApp root component storageRef isReady pages activePageId activePage saveTimerRef initialize storage restore active page create first page scheduleSave debounce 800ms handleSelectPage handleCreatePage handleTitleChange `​``

### 問題：components/lib 建立在錯誤位置

使用者把 `lib/`、`components/` 建在：

`​text src/app/lib src/app/components `​``

因此 `src/app/page.tsx` 使用：

`​ts import NexusApp from "../components/NexusApp"; `​``

出現錯誤：

`​text Cannot find module '../components/NexusApp' or its corresponding type declarations. ts(2307) `​``

排查：

`​powershell dir src dir src\\components `​``

結果：

`​text src 下只有 app src\\components 不存在 `​``

解決方式：

`​text 使用者採用方案 A：將 src/app/lib 與 src/app/components 拖曳到 src/ 下 修正後結構為 src/lib 與 src/components page.tsx 紅線消失 `​``

### page.tsx 接入 NexusApp

修改：

`​``ts import NexusApp from "../components/NexusApp";

export default function Home() { return <NexusApp />; } `​``

結果：

`​text 瀏覽器正常 三欄介面正常運作 `​``

### Tiptap 階段

安裝：

`​powershell npm.cmd install @tiptap/core @tiptap/starter-kit @tiptap/extension-placeholder `​``

第一次使用者在 `C:\\Users\\user\\Projects` 執行，造成套件可能裝錯位置，後續又在正確目錄補裝。

建立：

`​text src/components/TiptapEditor.tsx `​``

內容包含：

`​text "use client" Editor from @tiptap/core StarterKit Placeholder editorRef onUpdate -> editor.getText() -> onChange(text) 切換 page 時 setContent `​``

修改 `NexusApp.tsx`：

`​text import TiptapEditor from "./TiptapEditor" Editor component 改用 <TiptapEditor content={page.content_text} onChange={onContentChange} /> 新增 handleContentChange <Editor /> 增加 onContentChange prop `​``

### 問題：Build Error 找不到 @tiptap/core

瀏覽器顯示：

`​text Build Error Module not found: Can't resolve '@tiptap/core' `​``

原因：

`​text Tiptap package 很可能安裝到 C:\\Users\\user\\Projects，而非 C:\\Users\\user\\Projects\\nexus `​``

解決：

`​powershell cd C:\\Users\\user\\Projects\\nexus npm.cmd install @tiptap/core @tiptap/starter-kit @tiptap/extension-placeholder `​``

結果：

`​text 瀏覽器正常 ✅ `​``

### 問題：Markdown shortcut # + 空白沒有明顯效果

使用者測試：

`​``text

# + 空白：# 會消失，區塊變大，但輸入內容看起來一樣

`​``

初步判斷：

`​``text

# 消失代表 input rule 可能已轉換

但缺少 CSS 或相關 extension 使視覺不明顯 `​``

安裝 typography：

`​powershell npm.cmd install @tiptap/extension-typography `​``

修改 `TiptapEditor.tsx`：

`​``ts import Typography from "@tiptap/extension-typography";

extensions: [ StarterKit, Placeholder.configure({ placeholder: "Start writing here..." }), Typography, ] `​``

補充 `globals.css` Tiptap 樣式：

`​text .ProseMirror .ProseMirror p .ProseMirror h1/h2/h3 .ProseMirror ul/ol/li .ProseMirror blockquote .ProseMirror code/pre placeholder pseudo element `​``

### 問題：Next.js root 被錯誤推斷 / 多 lockfile

重啟後 terminal 顯示：

`​text Warning: Next.js inferred your workspace root, but it may not be correct. Detected multiple lockfiles: C:\\Users\\user\\Projects\\package-lock.json C:\\Users\\user\\Projects\\nexus\\package-lock.json `​``

原因：

`​text 先前可能在 C:\\Users\\user\\Projects 執行 npm install，產生多餘 package-lock.json Next.js/Turbopack 因多 lockfile 誤判 workspace root `​``

解決：

`​powershell del C:\\Users\\user\\Projects\\package-lock.json `​``

### 問題：PowerShell rmdir 語法不適用

曾引導使用：

`​powershell rmdir /s /q .next `​``

PowerShell 回報：

`​text Remove-Item : 找不到接受引數 '/q' 的位置參數 `​``

原因：

`​text rmdir /s /q 是 cmd.exe 語法，不是 PowerShell 語法 `​``

正確 PowerShell 語法：

`​powershell Remove-Item -Recurse -Force .next `​``

### 問題：兩個 dev server 同時存在

terminal 顯示：

`​text Port 3000 is in use by process 16528, using available port 3001 instead. Another next dev server is already running. Run taskkill /PID 16528 /F to stop it. `​``

解決：

`​powershell taskkill /PID 16528 /F Remove-Item -Recurse -Force .next npm.cmd run dev `​``

最後 dev server 成功回到：

`​text Local: http://localhost:3000 ✓ Ready in 233ms `​``

### 最終測試結果

使用者刷新瀏覽器並測試：

`​``text

# + 空白

`​``

結果：

`​text 成功 ✅ `​``

### 目前 MVP-0 完成項目

`​``text Next.js dev server 成功 瀏覽器 localhost:3000 成功 實際結構 src/app 確認 layout.tsx 簡化並移除 Google Font globals.css 改為 Nexus 極簡全域樣式 page.tsx 接入 NexusApp 三欄 App Shell 完成 src/lib/types.ts 建立 src/lib/StorageAdapter.ts 建立 src/lib/IndexedDBAdapter.ts 建立 idb 安裝 nanoid 安裝 Sidebar page list 初版

- 新增 page 初版

IndexedDB 儲存初版 active_page_id 恢復初版 800ms debounce auto-save 初版 TiptapEditor 建立 Tiptap 套件安裝 Typography extension 安裝 Markdown heading shortcut 成功 `​``

### 目前已知技術債 / 待修正

`​``text

1.content_json 目前在 createPage 有初始 doc，但 Tiptap onUpdate 主要保存 content_text；尚未真正把 editor.getJSON() 存回 content_json。
2.Page 的唯一真相規格要求 content_json 是正文唯一真相；目前實作仍不完全符合 canon。
3.deletePage / restorePage 已在 adapter，但 UI 尚未接刪除/恢復按鈕。
4.TiptapEditor 目前以 content_text 組成 <p>${content}</p>，多段落/heading/list 的結構保存仍不完整。
5.先前錯誤安裝可能在 C:\\Users\\user\\Projects 產生 node_modules 或 package.json；已刪 package-lock.json，但後續應檢查是否有多餘 package.json/node_modules。
6.PowerShell 指令需避免使用 cmd 專用 rmdir /s /q；應用 Remove-Item -Recurse -Force。
7.npm audit 顯示 2 moderate vulnerabilities，暫不阻塞 MVP-0，但後續可評估。
8.npm allow-scripts warning 暫不阻塞，但後續若 sharp 或 resolver 行為異常再處理。

`​``

### 下一步建議

`​``text 不要立即進 PDF / Calendar / AI / Sync。 先做 MVP-0 收斂：

1.修正 TiptapEditor 讓 onChange 回傳 JSON + text
2.savePage 時同步保存 content_json 與 content_text
3.重開頁面時用 content_json 還原 editor，而非 content_text
4.建立簡單 manual QA checklist
5.檢查 C:\\Users\\user\\Projects 是否有誤建立的 package.json / node_modules

`​``

### 一句話總結

> 2026-06-27 已從「尚未確認 dev server」推進到「MVP-0 第一輪可用」：Nexus 現在能在本機啟動、顯示三欄介面、建立/編輯 page、透過 IndexedDB 保存，並已接入 Tiptap；下一步是修正 content_json 真相保存並收斂 MVP-0。


---


## 2026-06-27 — 文件交接包檢查與重整

### 類型

`​text 文件整理 / 交接修正 `​``

### 背景

使用者整理出一批最終 canon 文件，並詢問：

`​text 裡面資訊是否有被遺漏？ 最新進度是否有被記錄？ `​``

當時檢查的主要文件包括以下使用者整理檔名。注意：這是歷史工作記錄，不是目前 final package 的 active 文件結構：

`​text 00-NEXUS-HANDOFF-START-HERE.md 01-PRODUCT-ARCHITECTURE-ROADMAP-CANON.md 02-IMPLEMENTATION-CANON.md 03-DECISION-LOG.md 04-GLOSSARY.md 05-DESIGN-SYSTEM.md 06-BEGINNER-OPERATION-GUIDE.md 90-PROJECT-REVIEW-2026-06-21.md 99-ZERO-LOSS-AUDIT.md 00-AI-HANDOFF.md `​``

### 發現

確認：

`​text 產品、架構、資料模型、D-01~D-34、設計系統、實作規格等主體資訊大致有保留。 `​``

但發現重要紕漏：

`​``text

1.最新本機進度主要在 00-AI-HANDOFF.md，卻沒有被放在正式閱讀順序第一位。
2.00-NEXUS-HANDOFF-START-HERE.md 中仍保留舊狀態，例如「尚未開始寫程式碼」。
3.06-BEGINNER-OPERATION-GUIDE.md 沒完整反映 Next.js 專案已建立。
4.99-ZERO-LOSS-AUDIT.md 只稽核舊來源全文，沒有覆蓋最新本機進度。
5.90-PROJECT-REVIEW-2026-06-21.md 是歷史審視報告，其中某些 next step 已過期。

`​``

### 處理

產出新的合格交接文件：

`​text 00-NEXUS-CURRENT-HANDOFF-2026-06-27.md `​``

用途：

`​text 把最新進度提升到最上層 標示舊文件中的過期狀態 指定下一步為 cd / dir / npm.cmd run dev `​``

### 結果

完成初版修正，但後續使用者要求：

`​text 將所有文件都確認一次，將紕漏處理掉，重新生成最高效率文檔。 `​``


---


## 2026-06-27 — 生成最終交接包 `nexus-handoff-final/`

### 類型

`​text 文件整合 / 零遺漏交接包 `​``

### 目標

使用者要求：

`​text 將現有檔案進行結合 最終檔案數與分類方式由助理決定 以整合資訊為主要目的 資訊密度極高且確保零遺漏 建立能使其他 AI 閱讀的最高效率文檔 `​``

### 處理

建立新資料夾：

`​text nexus-handoff-final/ `​``

產出：

`​text nexus-handoff-final/README.md nexus-handoff-final/00-NEXUS-HANDOFF-START-HERE.md nexus-handoff-final/01-NEXUS-CANON.md nexus-handoff-final/02-SOURCE-ARCHIVE.md nexus-handoff-final/99-ZERO-LOSS-AUDIT.md nexus-handoff-final/design/ui-style-1-minimal.png `​``

### 每份文件用途

| 文件 | 用途 | | --- | --- | | `README.md` | 說明交接包閱讀順序與權威規則 | | `00-NEXUS-HANDOFF-START-HERE.md` | 新 AI 第一入口，含最新進度與下一步 | | `01-NEXUS-CANON.md` | 高密度產品 / 架構 / 實作 / 決策 canon | | `02-SOURCE-ARCHIVE.md` | 保留所有來源 Markdown 全文，防止資訊遺漏 | | `99-ZERO-LOSS-AUDIT.md` | 記錄行數、bytes、SHA-256、包含檢查 | | `design/ui-style-1-minimal.png` | UI 參考圖備份 |

### 稽核結果

`99-ZERO-LOSS-AUDIT.md` 顯示：

`​text Markdown files audited: 18 Overall result: ✅ PASS Image copied: ✅ PASS `​``

### 修正的紕漏

`​text 最新進度未置頂 ✅ 舊狀態誤導 ✅ 00-AI-HANDOFF 未納入入口 ✅ 99 audit 未覆蓋最新進度 ✅ 歷史文件與最新 canon 混雜 ✅ `​``

### 結果

目前最終交接包應以：

`​text nexus-handoff-final/ `​``

為準。


---


## 2026-06-27 — 新增本工作進度日誌

### 類型

`​text 文件治理 / 進度追蹤 `​``

### 背景

使用者詢問是否已有：

`​text 日誌這個內容 做了什麼事之類的詳細日誌 `​``

確認目前已有：

`​text 決策日誌 審視報告 零遺漏稽核 `​``

但缺少：

`​text 實際操作 / 工作進度日誌 `​``

### 決定

新增：

`​text nexus-handoff-final/03-PROJECT-LOG.md `​``

### 命名原因

`​text 03：放在 00 入口、01 canon、02 source archive 之後，作為交接包中的第三類主動維護文件。 PROJECT-LOG：表示這是專案工作日誌，記錄實際做了什麼。 不是 CHANGELOG：因為目前還沒有正式產品版本 release。 不是 DECISION-LOG：因為決策原因已由 03-DECISION-LOG / archive 保留。 `​``

### 結果

本文件建立，用於後續持續記錄實際進度。


---


# 2026-06-27 — 本機環境與專案建立

## 2026-06-27 — 確認編輯器

### 類型

`​text 本機環境 `​``

### 操作 / 回報

使用者表示已下載：

`​text Visual Studio Code `​``

### 說明

曾向使用者解釋：

`​text VS Code 是標準程式編輯器。 Cursor 類似內建 AI 的 VS Code。 使用 VS Code 完全可以繼續 Nexus 開發。 `​``

### 結果

`​text Visual Studio Code ✅ `​``


---


## 2026-06-27 — Node.js 初次檢查失敗

### 類型

`​text 本機環境 / 錯誤排查 `​``

### 操作

使用者在 PowerShell 執行：

`​powershell node -v `​``

### 結果

出現錯誤：

`​text 無法辨識 'node' 詞彙是否為 Cmdlet、函數、指令檔或可執行程式的名稱。 `​``

### 判斷

代表：

`​text Node.js 尚未安裝，或 PATH 尚未生效。 `​``

### 處理

引導使用者安裝 Node.js LTS，並重新開啟 VS Code / Terminal。


---


## 2026-06-27 — npm PowerShell 執行政策問題

### 類型

`​text 本機環境 / Windows PowerShell 問題 `​``

### 操作

使用者執行：

`​powershell npm -v `​``

### 錯誤

PowerShell 顯示：

`​text 因為這個系統上已停用指令碼執行，所以無法載入 C:\\Program Files\\nodejs\\npm.ps1 檔案。 `​``

### 判斷

代表：

`​text Node.js / npm 已安裝，但 PowerShell 擋住 npm.ps1。 `​``

### 處理

建議使用：

`​powershell npm.cmd npx.cmd `​``

取代：

`​powershell npm npx `​``

### 結果

使用者執行：

`​powershell npm.cmd `​``

成功顯示 npm usage，確認 npm 可執行。


---


## 2026-06-27 — 確認 Node / npm / Git 版本

### 類型

`​text 本機環境確認 `​``

### 操作

使用者執行：

`​powershell node -v npm.cmd -v git --version `​``

### 結果

`​text node -v       → v24.18.0 npm.cmd -v    → 11.16.0 git --version → git version 2.54.0.windows.1 `​``

### 判斷

基礎開發環境已完成：

`​text Node.js ✅ npm ✅ Git ✅ `​``


---


## 2026-06-27 — 建立 Projects 資料夾

### 類型

`​text 本機資料夾準備 `​``

### 操作

使用者執行：

`​powershell mkdir Projects cd Projects pwd `​``

### 結果

成功建立並進入：

`​text C:\\Users\\user\\Projects `​``

### 判斷

專案工作資料夾已準備完成。


---


## 2026-06-27 — 建立 Next.js 專案

### 類型

`​text 專案初始化 `​``

### 操作

使用者執行：

`​powershell npx.cmd create-next-app@latest nexus `​``

### 過程

create-next-app 顯示新版選項：

`​text Would you like to use the recommended Next.js defaults? `​``

曾建議選：

`​text No, customize settings `​``

理由：希望使用 `src/ directory`，符合原文件建議。

但使用者實際成功建立專案時，看起來使用了：

`​text Yes, use recommended defaults `​``

### 結果

使用者貼出成功訊息：

`​text Success! Created nexus at C:\\Users\\user\\Projects\\nexus `​``

安裝過程顯示：

`​``text Installing dependencies:

- next
- react
- react-dom

Installing devDependencies:

- @tailwindcss/postcss
- @types/node
- @types/react
- @types/react-dom
- eslint
- eslint-config-next
- tailwindcss
- typescript

`​``

### 警告

安裝過程出現：

`​text 2 moderate severity vulnerabilities npm warn allow-scripts New minor version of npm available `​``

### 判斷

這些警告暫時不阻塞。

明確建議：

`​text 不要執行 npm audit fix --force 暫時不需要更新 npm 先確認專案能跑 `​``

### 注意

因使用 recommended defaults，專案可能沒有 `src/ directory`。

目前不建議再重建，因為：

`​text 對新手而言，先確認專案能跑比目錄完美更重要。 `​``

### 下一步

`​powershell cd C:\\Users\\user\\Projects\\nexus dir npm.cmd run dev `​``


---


# 2026-06-21 以前 / 規劃階段摘要

## 2026-06-20 ~ 2026-06-21 — 產品與架構規劃

### 類型

`​text 產品規劃 / 架構決策 `​``

### 完成內容摘要

建立 Nexus 的核心方向：

`​text 個人化 local-first 跨平台 all-in-one digital workspace 核心場景：學習 / 研究 `​``

確認三大設計原則：

`​text Everything is a Page / Block Everything is Linkable Local-first, Cloud-optional `​``

確立五概念模型：

`​text Page Block Property Workspace View Page Mode `​``

確認 MVP 分期：

`​text MVP-0：本地筆記原型 MVP-1：個人筆記系統 MVP-2：學習 / 研究工具 MVP-3：時間管理整合 MVP-4：同步與打包 `​``


---


## 2026-06-21 — 開工前規格補完

### 類型

`​text 開工規格 `​``

### 完成文件

曾產出並整合：

`​text 07-DESIGN-SYSTEM.md 08-EDITOR-SPEC.md 09-STORAGE-ADAPTER-SPEC.md 10-INTERACTION-FLOWS.md `​``

### 形成決策

新增並確認 D-28~D-34：

`​text D-28 MVP-0 使用 IndexedDBAdapter D-29 預設 sans-serif，serif 作未來主題 D-30 block node 從 MVP-0 起穩定 ID D-31 title 獨立存在 pages.title D-32 soft delete D-33 UI / Editor 只能依賴 StorageAdapter D-34 MVP-0 嚴格限於能寫能存 `​``


---


# 後續更新模板

之後每完成一件事，請追加：

`​``md

## YYYY-MM-DD — 標題

### 類型

`​text 本機環境 / 實作 / 文件 / 錯誤排查 / 決策 / 測試 `​``

### 操作

做了什麼。

### 結果

成功或失敗。

### 問題

遇到什麼問題，若沒有可寫「無」。

### 下一步

下一個最小任務。 `​``


---


# 目前下一步

請執行：

`​powershell cd C:\\Users\\user\\Projects\\nexus dir npm.cmd run dev `​``

然後記錄：

`​text 專案目錄結構 npm.cmd run dev 結果 localhost 是否可開啟 `​``


---


# 一句話總結

> 本日誌記錄的是「實際做過什麼」。目前已完成環境準備、Next.js 專案建立、dev server 確認與 MVP-0 第一輪實作；下一步是收斂 MVP-0，特別是修正 `content_json` 作為正文唯一真相的保存流程。


---


## 2026-06-27 — 修正 final package active docs 內部權威順序衝突

### 類型

`​text 文件治理 / 錯誤修正 / 最終交接稽核 `​``

### 背景

使用者要求在刪除原對話前，助理最後徹底確認所有檔案與資訊的完整性、準確性與合理性。助理先前回覆稱 final package 已可安全轉移，但使用者進一步指出：

`​text 00-NEXUS-HANDOFF-START-HERE.md 中的「2.1 修正後的實際權威順序」 與目前 nexus-handoff-final/ 的既有文件結構產生衝突。 `​``

使用者因此明確表達對助理工作準確性的疑慮。

### 發現的問題

經重新檢查 active docs，確認使用者指出的問題成立。

原本 `nexus-handoff-final/00-NEXUS-HANDOFF-START-HERE.md` 中仍殘留舊權威順序，提到：

`​text 00-NEXUS-CURRENT-HANDOFF-2026-06-27.md 00-AI-HANDOFF.md 03-DECISION-LOG.md 04-GLOSSARY.md 05-DESIGN-SYSTEM.md 06-BEGINNER-OPERATION-GUIDE.md 90-PROJECT-REVIEW-2026-06-21.md `​``

但當時 final package 的實際 active docs 已經是：

`​text README.md 00-NEXUS-HANDOFF-START-HERE.md 01-NEXUS-CANON.md 02-SOURCE-ARCHIVE.md 03-PROJECT-LOG.md 04-FINAL-REVIEW-2026-06-27.md 99-ZERO-LOSS-AUDIT.md design/ui-style-1-minimal.png `​``

因此 `00` 文件內的權威順序會誤導新 AI，屬於實質文件治理錯誤，不是單純格式問題。

### 連帶發現

除了權威順序錯誤，也發現以下連帶問題：

`​``text

1.00 文件仍寫「完整決策歷史看 03-DECISION-LOG.md」，但 final package 沒有單獨的 03-DECISION-LOG.md。
2.04-FINAL-REVIEW-2026-06-27.md 中仍有「99 audit 會在本文件生成後更新」這類已過期語句。
3.03-PROJECT-LOG.md 中列出的舊檔名可能被誤解為 final package active docs。

`​``

### 修正動作

#### 1. 修正 `00-NEXUS-HANDOFF-START-HERE.md` 權威順序

將權威順序改為 final package 的實際結構：

`​``text

1.00-NEXUS-HANDOFF-START-HERE.md
2.01-NEXUS-CANON.md
3.03-PROJECT-LOG.md
4.04-FINAL-REVIEW-2026-06-27.md
5.99-ZERO-LOSS-AUDIT.md
6.02-SOURCE-ARCHIVE.md

`​``

並加註：

`​text 不要再使用舊 00-NEXUS-HANDOFF-START-HERE.md、 00-AI-HANDOFF.md 或舊 docs/reference 裡的閱讀順序。 `​``

#### 2. 修正決策歷史引用

將：

`​text 完整決策歷史看 03-DECISION-LOG.md `​``

修正為：

`​text 完整決策歷史已保留在 02-SOURCE-ARCHIVE.md 中的 decision log 來源全文； 日常只需看 01-NEXUS-CANON.md 的 D-01~D-34 摘要。 `​``

#### 3. 修正 `04-FINAL-REVIEW-2026-06-27.md` 過期語句

將「99 audit 會在本文件生成後更新」修正為：

`​text 99-ZERO-LOSS-AUDIT.md 已在本最終審視後重新生成 Markdown files audited: 23 Overall result: ✅ PASS `​``

#### 4. 修正 `03-PROJECT-LOG.md` 舊檔名語境

在列出舊檔名處補充說明：

`​text 當時檢查的主要文件包括以下使用者整理檔名。 注意：這是歷史工作記錄，不是目前 final package 的 active 文件結構。 `​``

#### 5. 重新生成 archive 與 audit

因 active docs 內容變動，重新生成：

`​text 02-SOURCE-ARCHIVE.md 99-ZERO-LOSS-AUDIT.md `​``

### 重新檢查結果

重新檢查 active docs 後：

`​text README.md 00-NEXUS-HANDOFF-START-HERE.md 01-NEXUS-CANON.md 03-PROJECT-LOG.md 04-FINAL-REVIEW-2026-06-27.md 99-ZERO-LOSS-AUDIT.md `​``

確認：

`​text active docs 之間的權威順序已一致 最新進度已一致 錯誤舊引用已修正 歷史引用已標示為歷史 archive 與 audit 已重新生成 `​``

最新 audit 結果：

`​text Markdown files audited: 23 Image asset audited: yes Overall result: ✅ PASS `​``

### 教訓 / 後續規則

這次錯誤的根本原因是：

`​text 生成新 final package 結構後，沒有同步檢查 active docs 內部的舊檔名與權威順序引用。 `​``

後續規則：

`​``text

1.每次調整文件結構後，必須搜尋 active docs 中所有舊檔名引用。
2.active docs 的權威順序必須與實際檔案結構一致。
3.archive 中可保留舊資訊，但 active docs 中不能未標註地保留舊權威順序。
4.audit PASS 只能代表來源保留，不等於語意權威順序正確；兩者都要檢查。
5.使用者指出的文件一致性問題需優先視為可能成立，而不是只做表面確認。

`​``

### 結果

此問題已修正，並已將本次資訊紕漏與修正過程記錄於本日誌。

目前 final package 仍以：

`​text nexus-handoff-final/ `​``

為準。

目前下一步已更新為：

`​text MVP-0 收斂與驗證：修正 content_json 保存、檢查檔案/依賴狀態、建立 manual QA checklist。 `​``

```

<!-- END SOURCE: ALL-SOURCES-FULL-ARCHIVE.md | SOURCE 5 nexus-handoff-updated-2026-06-27/03-PROJECT-LOG.md -->



---

## 從 00 文件移入的詳細行動與結果記錄

> 以下內容原為 00-HANDOFF-STATUS-AND-AI-RULES.md 的第 1A~1W 節及相關歷史段落，於 2026-07-31 重構時移入本文件。

## 1A. 2026-06-28 對話壓縮後續接狀態（必讀更新）

> 本節是 2026-06-28 對話壓縮後，依使用者要求「完整且詳細編入文檔、確保不要有任何資料遺失」新增的最新續接狀態。
> 本節不刪除下方歷史內容；若下方舊段落仍寫「先做 MVP-1 regression QA」或「MVP-2 Step 2 進行中」，以本節與第 0 節最新狀態為準。

### 1A.1 當前任務位置

```

目前主線：MVP-2：學習 / 研究工具 已完成確認：MVP-2 規格審查與定稿 已完成確認：MVP-2 Step 2：attachment data layer 下一個實作目標：MVP-2 Step 3：PDF import flow patch

```

MVP-2 Step 2 之所以視為完成，是因使用者已明確澄清：先前對話中看到的 `HTML escape / 富文字污染`（例如 `Promise&lt;void&gt;`、`=&gt;`、`[Date.now](http://date.now/)()`）只是聊天貼上 / 顯示造成的污染，**不是 VS Code 本機原始碼的實際內容**。

使用者原話核心：

```

你所說的污染我在VScode內部並不是這樣顯示 他是正常的可能是貼上吧 反正不用改

```

因此：

```

不要要求使用者清理不存在於 VS Code 的 HTML escape / 富文字污染。 不要把聊天畫面中的富文字 artifacts 當成本機 source code 錯誤。 除非使用者貼出 VS Code / TypeScript / terminal 的真實錯誤，否則 Step 2 可視為完成。

```

### 1A.2 下一步要先取得的檔案

MVP-2 Step 3 會碰到 `NexusApp.tsx` 的 UI / state flow，也需要對齊 `types.ts` 的實際型別，因此在產出精準 patch 前，下一個 AI 應先請使用者提供：

```

src/components/NexusApp.tsx src/lib/types.ts

```

建議向使用者要求二選一：

```

A. 直接上傳這兩個檔案 B. 用 PowerShell 印出後貼上

```

PowerShell 指令：

```

cd C:\\Users\\user\\Projects\\nexus Get-Content .\\src\\components\\NexusApp.tsx -Raw Get-Content .\\src\\lib\\types.ts -Raw

```

說明：

```

cd：切換到 Nexus 專案資料夾。 Get-Content ... -Raw：完整印出單一檔案內容，方便助理依現有程式給精準 patch。

```

### 1A.3 MVP-2 Step 3：PDF import flow patch 目標

Step 3 的最小可用流程必須實作：

```

1.local PDF file select
2.建立 attachment metadata
3.將 binary payload 寫入 IndexedDB
4.自動建立 research note page
5.page 與 attachment 建立關聯
6.設定 attachment_ids / primary_attachment_id
7.切換到新建立的 research note page
8.持久化 active_page_id

```

第一版 PDF 匯入 UX：

```

本地選檔 → 建立 attachment metadata → 儲存 binary → 自動建立 research note page → 建立關聯 → 切換到新 research note

```

實作時必須維持：

```

Page 仍是內容主體。 Attachment / PDF 不可成為平行產品模型。 content_json 仍是正文唯一真相。 content_text 仍只是搜尋 / 預覽 / 摘要衍生資料。 UI / Editor 只依賴 StorageAdapter，不直接操作 IndexedDB。 Annotation / highlight 不列入 Step 3 或 MVP-2 主完成條件。 SQLite + Drizzle 仍不因 PDF import 而提前啟動。

```

### 1A.4 使用者偏好的協作模式

使用者偏好：

```

助理提供精準 patch / 修改內容。 使用者手動修改本機 VS Code 專案。 若需要目前代碼，使用者可上傳或貼出。 有問題可以向使用者提出。 文件更新採 D：保守保留全部歷史痕跡。

```

使用者曾明確表示：

```

我能上傳目前代碼 我偏好你給我修改內容我手動改 如果你不需要目前代碼可以開始輸出 patch 有問題或一律可以向我提出 D 保守保留全部歷史痕跡

```

文件治理要求：

```

更新文件時要保留歷史痕跡。 不要刪除歷史。 清楚區分 current authority / historical record / archive。 若歷史日誌和最新狀態衝突，以 00 / 01 為準，02 / 99 保留為歷史與追溯。

```

### 1A.5 不要做的事（續接補充）

```

不要重啟產品願景討論。 不要要求使用者重建 Next.js 專案。 不要從 create-next-app 重新開始。 不要回頭重做 MVP-1。 不要 premature migrate SQLite / Drizzle。 不要把 content_text 當正文 source of truth。 不要把 PDF hard-code 成平行產品模型。 不要把 annotation / highlight 當 MVP-2 主完成條件。 不要因聊天貼文 artifacts 要求使用者修本機正常 source code。

```

---
### 1B. 2026-06-29 MVP-2 PDF import / viewer 實作續接狀態（最新）

> 本節是 2026-06-29 實作後依使用者要求「把目前的進度歸入檔案」新增的最新續接狀態。若本檔其他舊段落仍寫「下一步 Step 3」，以本節與第 0 節為準。

#### 1B.1 已完成實作

```

MVP-2 Step 3：PDF import flow patch ✅ MVP-2 Step 4：PDF viewer 最小版 ✅ MVP-2 Step 4-C：viewer polish（Open 按鈕 + iframe key）✅

```

已由使用者本機手動修改 `src/components/NexusApp.tsx` 並回報正常。

Step 3 已完成能力：

```

1.Sidebar 新增 Import PDF 入口
2.hidden file input 選取本機 PDF
3.透過 StorageAdapter.createAttachment() 建立 attachment metadata
4.透過 StorageAdapter.attachBinary() 將 PDF File / Blob 寫入 IndexedDB binaries store
5.自動建立 research note page
6.research note 寫入 attachment_ids / primary_attachment_id
7.content_json 初始化為 PDF Notes / Source PDF 模板
8.content_text 初始化為搜尋 / 預覽用文字
9.新頁加入 Research folder 與 research tag
10.切換 active page 並持久化 active_page_id

```

Step 4 已完成能力：

```

1.app state 新增 attachments 與 activePdfUrl
2.初始化時 listAttachments() 讀取 attachment metadata
3.active page 透過 primary_attachment_id 找出 activeAttachment
4.useEffect 依 activeAttachment 從 StorageAdapter.readBinary() 讀出 PDF Blob
5.URL.createObjectURL(blob) 建立 blob URL
6.Editor 接收 attachment / pdfUrl
7.在 title input 與 TiptapEditor 中間顯示 PDF Preview iframe
8.cleanup 時 URL.revokeObjectURL() 釋放 object URL

```

Step 4-C 已完成能力：

```

1.PDF Preview header 加入 Open 按鈕
2.Open 透過 window.open(pdfUrl, "_blank", "noopener,noreferrer") 以新分頁開啟 PDF
3.iframe 加入 key={attachment.id}，切換不同 PDF research note 時更穩定重新載入

```

#### 1B.2 重要排查紀錄

實作 Step 4 時曾出現：

```

程式沒有報錯，但畫面仍只顯示 PDF 檔名、PDF Notes、Source PDF，沒有看到 PDF viewer。

```

排查結果：

```

不是 readBinary() 失敗，也不是 blob URL 失敗。 原因是 PDF viewer JSX 雖然存在，但位置沒有放在實際顯示區域。 將 PDF viewer JSX 放到 title input 與 <TiptapEditor /> 中間後，PDF 正常檢視。

```

後續若 PDF viewer 不顯示，請優先檢查：

```

1.Editor props 是否含 attachment / pdfUrl
2.<Editor /> 是否傳入 attachment={activeAttachment} 與 pdfUrl={activePdfUrl}
3.PDF Preview JSX 是否位於 title input 與 <TiptapEditor /> 中間
4.activeAttachment 是否由 activePage.primary_attachment_id 正確找到
5.readBinary(activeAttachment.id) 是否讀到 Blob

```

#### 1B.3 下一步建議

下一步建議進入：

```

MVP-2 Step 5：PDF research note layout polish

```

目標：

```

讓 PDF viewer 與筆記區更像真正的研究閱讀工作區。 可以評估上下分割、左右分割、可收合 viewer、viewer 高度調整等低風險 UI polish。 仍不做 annotation / highlight。 仍不提前引入複雜 PDF.js annotation layer。 仍不遷移 SQLite / Drizzle。

```

---

### 1C. 2026-06-29 MVP-2 Step 5 / Step 6 實作續接狀態（最新）

> 本節延續 1B，是 Step 5 / Step 6 完成後依使用者要求持續歸檔的最新狀態。若其他舊段落仍寫下一步是 Step 5，以本節與第 0 節為準。

#### 1C.1 已完成實作

```

MVP-2 Step 5：PDF research note layout polish 第一版 ✅ MVP-2 Step 6：PDF viewer 錯誤狀態與缺檔提示 ✅

```

Step 5 已完成能力：

```

1.Editor 內新增 isPdfCollapsed state。
2.Editor 內新增 pdfViewerHeight state，預設 560。
3.PDF Preview header 新增 Small / Medium / Large 高度切換。
4.Small = 420px。
5.Medium = 560px。
6.Large = 720px。
7.PDF Preview header 新增 Hide / Show 收合展開。
8.保留 Open 按鈕。
9.iframe 高度改由 style={{ height: `${pdfViewerHeight}px` }} 控制。
10.仍維持 PDF 在上、筆記在下的簡單架構。

```

Step 6 已完成能力：

```

1.Root App 新增 pdfLoadError state。
2.loadActivePdf() 開始時清空 activePdfUrl 與 pdfLoadError。
3.activeAttachment 非 PDF 時顯示 This attachment is not a PDF.。
4.storageRef 尚未 ready 時顯示 Storage is not ready.。
5.readBinary() 讀不到 blob 時顯示 PDF binary data was not found in local storage.。
6.loadActivePdf catch 時顯示 Failed to load PDF preview.。
7.Editor props 新增 pdfLoadError。
8.<Editor /> 傳入 pdfLoadError={pdfLoadError}。
9.PDF Preview 區分三種狀態：pdfUrl 正常顯示 iframe；pdfLoadError 顯示 PDF preview unavailable；否則顯示 Loading PDF preview...。

```

#### 1C.2 重要排查紀錄

Step 6 實作時使用者遇到「大報錯」。檢查使用者貼出的 `NexusApp.tsx` 後確認主要原因是 PDF Preview JSX 中：

```

{!isPdfCollapsed && ( <> ...

```

開了 fragment，但在 `{isPdfCollapsed && (` 前少了：

```

</> )}

```

修正後該段應為：

```

{!isPdfCollapsed && ( <> {pdfUrl ? (...) : pdfLoadError ? (...) : (...)} </> )}

{isPdfCollapsed && (...)}

```

另外也發現舊的 PDF banner / viewer 曾被貼到 `isEditingFolder` 的 `<span>` 裡，屬於錯誤位置；建議刪除該舊段，只保留 title input 與 `<TiptapEditor />` 中間的主 PDF Preview block。

使用者依指示處理後回報：

```

處理完了正常

```

#### 1C.3 下一步建議

下一步建議進入：

```

MVP-2 Step 7：PDF research workspace layout evaluation

```

可評估但不急著做的方向：

```

1.是否改成左右分欄：左 PDF、右筆記。
2.是否讓 PDF viewer sticky。
3.是否讓 viewer / editor 分割比例可調整。
4.是否保存每篇 PDF note 的 viewer 偏好。

```

仍不要做：

```

annotation / highlight 複雜 PDF.js annotation layer citation parser SQLite / Drizzle 遷移

```

---

### 1D. 2026-06-29 Basic Notes Foundation Step 7：Trash / Restore UI 完成（最新）

> 本節是在 PDF import / viewer 基礎完成後，使用者提出想先完善基本筆記功能，並確認「可以」後實作的最新狀態。

#### 1D.1 已完成實作

```

Basic Notes Foundation Step 7：Trash / Restore UI ✅

```

已完成能力：

```

1.Sidebar 新增 Notes / Trash 切換。
2.Notes 模式顯示正常 pages。
3.Trash 模式透過 listPages({ includeDeleted: true }) 顯示 deleted_at !== null 的 pages。
4.Trash 模式 page item 不開啟頁面，只提供 Restore。
5.Restore 使用既有 StorageAdapter.restorePage(id)。
6.Restore 後從 trashPages 移除，加入 pages。
7.Restore 後切回 Notes，並選中還原頁面。
8.deletePage 後同步更新 trashPages，Trash UI 可即時看到刪除項。
9.不做永久刪除，避免資料風險。
10.不改資料模型。

```

使用者本機驗證結果：

```

正常 而且連垃圾功能之前被我刪除的檔案也在

```

此結果確認：

```

既有 soft delete 設計實際有效。 過去刪除的 pages 仍存在 IndexedDB，只是 deleted_at 不為 null。 Trash UI 接上後可列出歷史 soft-deleted pages。

```

#### 1D.2 整檔替換紀錄

由於 `NexusApp.tsx` 已超過 1000 行，使用者表示疲累並希望直接整檔替換。助理生成完整 `NexusApp.tsx`，整合：

```

Search Tags Folders Backlinks / Outgoing links PDF Import PDF Preview Small / Medium / Large Hide / Show Open PDF pdfLoadError Trash / Restore UI

```

並清理先前常見貼文污染 / JSX placement 問題：

```

PDF viewer 不應放在 isEditingFolder span 裡。 React fragment 必須正確關閉。 不要保留 [page.id](http://page.id) 這類聊天渲染污染。

```

使用者替換後回報正常，並完成快速回歸測試：

```

新建筆記 title 修改 正文保存 / refresh tags folder backlinks Import PDF PDF viewer controls Trash Restore refresh

```

結果：

```

正常

```

#### 1D.3 關於 NexusApp.tsx 超過 1000 行

判斷：

```

早期原型將 Sidebar / Editor / RightPanel / App state / PDF / Trash 放在同一檔，超過 1000 行是可以理解的。 但目前已接近應該拆檔的階段。

```

建議下一步：

```

先做安全拆檔，不立刻拆 hooks。 優先拆純 UI component：Sidebar.tsx、RightPanel.tsx。 之後再拆 EditorPane。 最後才評估 usePages / usePdfAttachment / useAutoSave hooks。

```

不建議下一步立刻做：

```

annotation / highlight PDF.js annotation layer SQLite / Drizzle 大型 hooks 重構

```

---

### 1E. 2026-06-29 Basic Notes Foundation Step 8：Permanent Delete / Duplicate Page 完成（最新）

> 本節是在 Trash / Restore UI 完成後，使用者詢問「如果進垃圾桶後想完整刪除可以嗎」並要求「乾脆把基本功能先做我直接測試」後新增的最新狀態。

#### 1E.1 已完成實作

```

Basic Notes Foundation Step 8：Permanent Delete / Duplicate Page ✅

```

已完成能力：

```

1.StorageAdapter 新增 permanentDeletePage(id)。
2.IndexedDBAdapter 實作 permanentDeletePage(id)。
3.permanentDeletePage 會真正刪除 pages store 中的 page record。
4.若永久刪除的是 active_page_id，會清除 settings.active_page_id。
5.Trash 模式 page item 顯示 Restore / Delete。
6.Trash 裡的 Delete 會二次 confirm，提示不可復原。
7.Permanent delete 第一版只刪 page record，不清 attachment / binary，避免誤刪可能被其他 page 共用的附件。
8.Notes 模式 page item hover 顯示 Copy / delete。
9.Duplicate page 會複製 title、content_json、content_text、tags、folder、links、attachment_ids、primary_attachment_id。
10.Duplicate page 的標題加上 copy，並切換到新 copy page。

```

使用者替換並測試後回報：

```

正常

```

#### 1E.2 目前對「拆檔」的判斷

使用者澄清，詢問 `NexusApp.tsx` 超過 1000 行只是不了解一般檔案行數，不代表現在一定要拆。

目前判斷：

```

拆檔不是必要功能。 1000 多行在原型階段可以接受。 拆檔是維護性工作，不應壓過使用者想先完善基本功能的需求。 若之後要拆，仍建議先拆 Sidebar / RightPanel 這類純 UI component，而不是先拆 hooks。

```

#### 1E.3 下一步建議

下一步若繼續基本筆記功能，建議優先：

```

Editor formatting toolbar

- Bold
- Italic
- Heading
- Bullet list
- Ordered list
- Quote
- Code

```

此步需要先檢視：

```

src/components/TiptapEditor.tsx

```

仍不建議立刻做：

```

大型拆檔 hooks 重構 PDF annotation / highlight SQLite / Drizzle

```

---

### 1F. 2026-06-29 Basic Notes Foundation Step 9：Editor formatting toolbar 完成（最新）

> 本節是在 Permanent Delete / Duplicate Page 完成後，為完善基本筆記功能而新增的最新狀態。

#### 1F.1 已完成實作

```

Basic Notes Foundation Step 9：Editor formatting toolbar ✅

```

修改檔案：

```

src/components/TiptapEditor.tsx

```

已完成能力：

```

1.Toolbar 新增 Bold。
2.Toolbar 新增 Italic。
3.Toolbar 新增 inline Code。
4.Toolbar 新增 H1 / H2 / H3。
5.Toolbar 新增 Bullet list。
6.Toolbar 新增 Ordered list。
7.Toolbar 新增 Quote。
8.Toolbar 新增 Code block。
9.Toolbar 新增 Clear formatting。
10.Toolbar button 會依 editor.isActive 顯示 active 狀態。
11.使用 onMouseDown preventDefault，避免按 toolbar 時 editor selection 遺失。
12.維持 onChangeRef 防閉包雷。

```

#### 1F.2 List marker CSS 修正

初次測試時使用者回報：

```

按 • List / 1. List 格式會變，但是前面沒有顯示點或數字，其他正常。

```

判斷：

```

Tiptap list 資料結構已正確產生，但 Tailwind reset / editor CSS 沒有明確設定 list-style-type。

```

修正：

```

.nexus-tiptap-editor ul { list-style-type: disc; padding-left: 1.5rem; } .nexus-tiptap-editor ol { list-style-type: decimal; padding-left: 1.5rem; } .nexus-tiptap-editor li / li p margin 修正 補 blockquote / pre / code / h1 / h2 / h3 基礎樣式

```

使用者替換後回報：

```

正常

```

#### 1F.3 下一步建議

下一步若繼續基本筆記 polish，可評估：

```

1.Toolbar UX polish：更漂亮的按鈕、分組、快捷鍵提示。
2.Page actions polish：rename / duplicate / delete 視覺更直覺。
3.Editor empty state / placeholder polish。
4.Export / import markdown（若使用者需要）。

```

仍不必急著做：

```

拆檔 hooks 重構 PDF annotation / highlight SQLite / Drizzle

```

---

### 1G. 2026-06-29 Basic Notes Foundation Step 10：Markdown import / export v0 完成（最新）

> 本節是在 Editor formatting toolbar 完成後，使用者選擇 `C. Markdown import / export` 後新增的最新狀態。

#### 1G.1 已完成實作

```

Basic Notes Foundation Step 10：Markdown import / export v0 ✅

```

修改檔案：

```

src/components/NexusApp.tsx

```

已完成能力：

```

1.Sidebar 新增 Import MD 按鈕。
2.Sidebar 新增 Export MD 按鈕。
3.hidden markdown file input 支援 .md / .markdown / .txt。
4.Import MD 會建立新 page。
5.匯入 page title 取自檔名。
6.匯入 page folder 設為 Imports。
7.匯入 page tags 設為 ["imported"]。
8.Markdown 文字轉成基本 Tiptap JSON。
9.Export MD 會把 active page 轉成 Markdown 並下載為 .md。
10.Export 前會 flushSave(activePage)。

```

Markdown import / export v0 支援：

```

heading # / ## / ###... paragraph bullet list ordered list blockquote code block inline code bold italic horizontal rule

```

使用者測試過程中曾遇到：

```

.map((line) => `> ${line}`) 的 line 標紅

```

處理：

```

改成 .map((line: string) => `> ${line}`)

```

使用者最後回報：

```

這是 Markdown import / export v0，不是完整 Markdown parser。 測試成功

```

#### 1G.2 明確邊界

目前是 Markdown v0，不是完整 parser。暫不支援或不保證完整支援：

```

table image nested list checkbox task list link syntax frontmatter footnote HTML block complex escaping

```

若後續需要，可逐步補：

```

link syntax task list table frontmatter image import

```

---

### 1H. 2026-06-29 Basic Notes Foundation Step 10.1：Markdown v0.1 link syntax / task list 補強完成（最新）

> 本節是在 Markdown import / export v0 完成後，使用者選擇「Markdown v0 補強：link syntax / task list」後新增。

#### 1H.1 已完成實作

```

Basic Notes Foundation Step 10.1：Markdown import / export v0.1 ✅

```

補強內容：

```

1.Import 支援 Markdown link syntax：[label](url)。
2.Link extension 尚未啟用，因此 v0.1 先保留原始 Markdown link syntax，避免資訊遺失。
3.Import 支援 task list syntax：- [ ] / - [x]。
4.TaskItem extension 尚未啟用，因此 v0.1 先轉成普通 bullet list + ☐ / ☑。
5.Export 時若 bullet item 以 ☐ 開頭，輸出 - [ ]。
6.Export 時若 bullet item 以 ☑ 開頭，輸出 - [x]。

```

使用者測試：

```

Import 測試正常：heading、bold、italic、inline code、link syntax、task list、bullet list、ordered list、quote、code block 皆符合 v0.1 預期。 Export 測試正常：task list 轉回 - [ ] / - [x]，bold 等格式也正常輸出。

```

使用者最後回報：

```

Export 也正常

```

#### 1H.2 明確邊界

目前仍不是完整 Markdown parser。

```

link syntax 目前是保留文字，不是可點擊 link mark。 task list 目前是語意保留，不是真正 checkbox node。

```

若要做真正 link / task 功能，後續可評估：

```

@tiptap/extension-link @tiptap/extension-task-list @tiptap/extension-task-item

```

---

### 1I. 2026-07-02 vNext 產品 / 架構討論：最終可建立項目與大型功能邊界（最新）

> 本節是在 Markdown import/export v0.1 完成後，使用者要求「趁現在確定大部分功能與架構，避免未來大型功能導致重做」所新增的最新產品 / 架構共識。若舊文件仍以「all-in-one workspace」描述 Nexus，請以本節修正後定位為準：Nexus 更精準地是 **local-first 個人學習與知識生成 workspace**，可擴充多種高層級生成物，但不追求早期成為完整企業 all-in-one 或完整 Wix / Notion / Canva clone。

#### 1I.1 使用者最新產品定位

使用者確認的新定位：

```

Nexus = local-first 個人學習與知識生成 workspace

```

使用者想要的方向接近：

```

Obsidian + Notion + Canvas + Gamma + Canva + Quizlet

```

但重點不是做一般企業 all-in-one，而是聚焦：

```

學習 研究 筆記 閱讀 整理 生成 複習 分享 / 發布

```

重要使用者偏好：

```

1.Note（筆記）是最重要的核心功能。
2.Note 應追求最舒服、最多元、最完整的 native editor 體驗。
3.Note 可以犧牲完美 Markdown 相容，不必為了 Markdown 限制筆記體驗。
4.Document（文檔）與 Note 分開。
5.Study Set / Quiz（學習集 / 測驗 / 字卡）與 Note 分開。
6.高層級生成物如 Document / Website / Presentation 可以是獨立成果物，不需要過度強聯動。

```

#### 1I.2 目前確認的大分類

目前暫定分類如下。

```

Core Creatables（核心可建立項目）

1.Note（筆記）
2.Document（文檔）
3.Study Set（學習集 / 字卡組）
4.PDF Research Note（PDF 研究筆記）
5.Presentation（簡報）
6.Canvas（畫布）

Extended Creatables（延伸可建立項目）

1.Website / Publish Project（網站 / 發布專案）
2.Project / Study Plan（專案 / 學習計畫）
3.Library Item（資料庫項目 / 閱讀來源項目）
4.Reference Item（文獻 / 來源項目）
5.Link Page / Landing Page（連結頁 / 單頁網站）— 可作 Website 的早期子型態

System Views（系統視圖）

1.Dashboard / Home（儀表板 / 首頁）
2.Search（搜尋）
3.Graph（知識圖譜）
4.Tasks / Todo（任務 / 待辦）
5.Calendar（行事曆）
6.Review Queue（複習佇列）
7.Reading List / Library（閱讀清單 / 資料庫）
8.Asset Library（素材庫）
9.Inbox / Capture（收件匣 / 快速收集）

Tools（工具）

1.Create Center（建立中心）
2.Import Center（匯入中心）
3.Export Center（匯出中心）
4.Template System（模板系統）
5.AI Assistant / AI Tutor（AI 助理 / AI 學習導師）
6.Web Clipper（網頁剪藏）
7.Command Palette / Quick Actions（命令面板 / 快速操作）
8.Sync / Backup / Version History（同步 / 備份 / 版本歷史）

```

#### 1I.3 已確認需要但有優先級差異的功能

使用者確認「完全需要」或同意納入規劃的功能：

```

Reading List / Library（閱讀清單 / 資料庫） Template System（模板系統） Import Center（匯入中心） Export Center（匯出中心） Dashboard / Home（儀表板 / 首頁） Review Queue（複習佇列） Quick Capture / Inbox（快速收集 / 收件匣）

```

優先級分層：

```

後續需要：

- AI Assistant / AI Tutor（AI 助理 / AI 學習導師）
- Web Clipper（網頁剪藏）

近期需要，但不是立刻：

- File / Asset Library（檔案 / 素材庫）
- Citation / Bibliography（引用 / 參考文獻）
- Sync / Backup / Version History（同步 / 備份 / 版本歷史）

與筆記功能一同完善：

- Annotation / Highlight System（標註 / 劃線系統）
- Database / Collection / Properties（資料庫 / 集合 / 屬性）

```

補充：Quick Capture / Inbox（快速收集 / 收件匣）其實早期就已被提過，這次討論確認它不應被降到很後期。正確定位是：

```

Inbox（收件匣）= System View Quick Capture（快速收集）= Capture Flow / Tool 早期可先用 folder = Inbox / tag = inbox 的簡化實作，但概念要保留。

```

#### 1I.4 降級 / 不獨立的大功能

使用者確認以下功能不需要獨立成大型模組：

```

Learning Path / Curriculum（學習路線 / 課程路徑） → 不做獨立 creatable。 → 由 Todo / Task / Project / Review Queue / Collection 組合完成。

Course / Class Workspace（課程 / 班級工作區） → 必要性不高。 → 不做核心 creatable。 → 未來最多作為 Template（模板）或 Collection（集合）的一種用法。

```

其他應降級以避免過度設計：

```

Full Wix-like Website Builder（完整 Wix-like 網站建構器） → 不早期做滿。

Full Canva-like Presentation Editor（完整 Canva-like 簡報 / 設計器） → Presentation 保留為 core creatable，但早期偏 Gamma-like outline-to-slides。

Full Notion Database Clone（完整 Notion database clone） → 先做 Page properties / collection / filter / sort；formula / rollup / automation 延後。

Full AI Generation System（完整 AI 生成系統） → AI 是輔助層，不是早期功能依賴。

Full Web Clipper Extension（完整瀏覽器剪藏 extension） → 後續需要；早期可先支援貼 URL / 手動匯入網頁內容。

Full Cloud Sync（完整雲端同步） → 先做 Workspace Backup / Export package，再做 sync。

Full Citation Manager（完整 Zotero-like 引用管理器） → 先做 Reference metadata，後期再做 BibTeX / CSL / citation style。

Full Plugin System（完整插件系統） → 不做正式 plugin marketplace；先保留 internal extension points。

```

#### 1I.5 Website / Publish Project 最新共識

Website / Publish Project（網站 / 發布專案）曾被使用者特別要求重新討論。使用者一開始想像比較接近 Wix / Linktree / 可分享網站頁。

最新共識：

```

Website / Publish Project 保留。 它不是純 export tool，也不是早期完整 Wix / Webflow clone。 它是獨立或弱聯動的高層級分享 / 發布模組。

```

安全架構邊界：

```

1.Note / Document 可以被分享成網頁。
2.Note 不變成完整網站編輯器。
3.Website 可以引用 Note / Document / Asset / Collection。
4.Website 可以有少量自己的網站專屬內容，例如 homepage intro、footer、button、link cards。
5.Website 不要求和來源強同步。
6.來源修改後，Website 不必自動同步；未來可提供手動 update / regenerate / re-export。
7.Website 的 layout / routes / theme / sections 不塞進 Note content_json。

```

Website 分階段：

```

Phase 0：Export HTML Note / Document → HTML

Phase 1：Share Page（分享頁） Note / Document 可設定 Share Settings（分享設定）並輸出 / 分享成網頁

Phase 2：Link Page / Landing Page（連結頁 / 單頁網站） 可建立 hero、文字、圖片、按鈕、連結卡片、資源列表

Phase 3：Publish Site（多頁發布網站） homepage、nav、routes、theme、static site export

Phase 4：Visual Website Editor（視覺網站編輯器） 後期才考慮接近 Wix / Webflow / Framer 的自由設計能力

```

重要結論：

```

使用者現在沒有完全明確的網站想法沒關係。 只要目前確定 Website 是獨立 / 弱聯動模組，而不是混進 Note / Document 核心資料模型，後續完善 Website 通常不會導致整個 App 重做。 最多是升級 / 重做 Website 模組內部，不會重做 Note / Document / Page shell / StorageAdapter。

```

#### 1I.6 生成物聯動程度

本次討論修正了「所有生成物都要高度聯動」的風險。

最新共識：

```

高層級生成物可以弱聯動或獨立。

```

聯動分層：

```

強聯動：

- backlinks
- tags
- search
- graph
- attachments
- annotations
- tasks
- review queue

弱聯動：

- Document generated from Note
- Presentation generated from Note / Document / Canvas
- Website generated from Note / Document / Collection
- Study Set generated from Note / PDF

無聯動 / 可完全獨立：

- 手動建立的 Document
- 手動建立的 Presentation
- 手動建立的 Website / Link Page
- 手動建立的 Study Set

```

Source Reference / Provenance（來源引用 / 生成來源追蹤）仍需要，但降級為：

```

optional metadata 不做早期強同步 不做自動雙向更新 不做一開始就複雜 diff / merge / regenerate tree

```

#### 1I.7 目前最重要的架構風險 / 必須預留

需要正式納入架構考量，避免未來重做：

```

1.Page Shell + Mode-specific Data（Page 外殼 + 模式專屬資料）
2.Creatable Registry（可建立項目註冊表 / Create Center）
3.Optional Source References（可選來源引用）
4.Block Reference / Transclusion（區塊引用 / 嵌入引用）
5.Annotation / Highlight System（標註 / 劃線系統）
6.Database / Collection / Properties（資料庫 / 集合 / 屬性）
7.File / Asset Library（檔案 / 素材庫）
8.Study Set / Review / Progress Tracking（學習集 / 複習 / 進度追蹤）
9.Task / Todo / Calendar Projection（任務 / 待辦 / 行事曆投影）
10.Import / Export Center（匯入 / 匯出中心）
11.Template System（模板系統）
12.Workspace Backup / Schema Migration（工作區備份 / 資料結構遷移）
13.Theme / Design System（主題 / 設計系統）
14.Media Support（PDF / image / audio / video / web capture）

```

目前最大缺口排名：

```

1.Creatable / Mode 分類正式定案。
2.Page shell + mode-specific data 正式化。
3.Workspace Backup / Export Package 納入近期。
4.Editor block roadmap 定義。
5.Study Set data model 定義。
6.Tasks / Todo 定位提高。
7.Library / Reference / Asset 邊界定義。
8.Search index scope 定義。
9.Trash / Restore 擴展到更多資料類型的策略。

```

#### 1I.8 下一步開發建議

目前完成架構討論後，下一步可回到功能實作。合理候選：

```

1.真正 Link extension
2.真正 TaskItem / TaskList extension
3.Image block
4.Table block
5.Equation / LaTeX
6.Callout / Admonition block
7.Quick Capture / Inbox v0
8.Workspace Backup / Export package v0
9.Study Set / Flashcard v0 手動建立 + CSV / TSV 匯入

```

但注意：

```

不要因這次 vNext 規劃立刻做所有大型功能。 本次主要目的是定好邊界，避免未來重做。

```

---

#### 1I.8 下一步開發建議

建議下一步從以下近期候選選擇：

```

1.真正 Link extension
2.真正 TaskList / TaskItem extension
3.Image block
4.Table block
5.Equation / LaTeX
6.Callout / Admonition block
7.Quick Capture / Inbox v0
8.Workspace Backup / Export package v0
9.Study Set / Flashcard v0 手動建立 + CSV / TSV import

```

不要未經使用者確認就直接切入 Presentation / Canvas / Website 大功能實作。

---

### 1J. 2026-07-02 r15 深度稽核：文件矛盾、架構語意與最佳化建議（最新）

> 本節是在 r14 vNext 架構分類完成後，使用者要求「對現在所有檔案與資訊進行一次深度且完整的整理資訊、分析檔案問題與提出建議，考量是否有決策能被優化或不明智，或是有文件內容、資訊上的矛盾與遺漏」後新增。

#### 1J.1 本次稽核結論

整體判斷：

```

目前沒有需要推翻的大決策。 r14 已解決最大產品分類問題。 但舊 MVP 文件語意與新 vNext 架構語意開始重疊，需要 r15 整理，避免之後 AI 或使用者誤解。

```

最重要的最佳化方向：

```

1.Page kind / default_view_mode 拆分。
2.MVP-2 改成多條近期 tracks，不再無限膨脹。
3.Block stable ID 補齊策略列為近期底層修補。
4.README / 章節順序 / 重複 heading 修正。
5.Workspace Backup v0 提早進入近期。

```

#### 1J.2 發現的文件問題

```

README.md 過期，仍顯示 2026-06-29 與 r7 / r8 舊更新重點。 00-HANDOFF 結尾有重複的「## 11. 最終一句話」。 01-CANON 的 8.6 Soft delete 章節順序跑到 8.14 後面。 01-CANON 的 default_mode 舊語意與 r14 Page Shell + Mode-specific Data 新語意存在混淆。 舊 MVP-2 範圍與 r14 後的新優先級需要重新 baseline。

```

#### 1J.3 關鍵架構修正建議

最重要的 schema 語意修正：

```

不要讓 default_mode 同時代表「頁面種類」與「顯示模式」。

```

建議長期拆成：

```

type PageKind = | "note" | "document" | "pdf_research" | "study_set" | "presentation" | "canvas" | "website" | "project" | "library_item" | "reference_item";

type PageViewMode = | "edit" | "read" | "markdown_source" | "markdown_preview" | "pdf_split" | "study" | "slides" | "canvas";

```

過渡策略：

```

短期：default_mode 保留，主要為相容舊資料。 中期：新增 kind / creatable_type 作為真正 Page 種類。 長期：default_mode 改名為 default_view_mode 或 view_preference。

```

#### 1J.4 r15 後近期實作優先建議

建議短期以 tracks 管理，而不是把所有內容塞進 MVP-2：

```

Track A — Editor Blocks Foundation Link / TaskList / Image / Table / Callout / LaTeX

Track B — Capture & Inbox Quick Capture / Inbox v0

Track C — Learning Core Study Set / Flashcard v0 + CSV / TSV import

Track D — Research PDF viewer polish / citation metadata / annotation later

Track E — Safety Workspace Backup / Export package v0 + schema migration metadata

Track F — Creatable Registry / Create Center 為 Note / Document / Study Set / PDF Research Note / Presentation / Canvas / Website 建立低風險入口

```

建議下一步開發仍需由使用者選擇，不要直接猜測。

---

### 1K. 2026-07-02 Track A：Editor Blocks Foundation（Link / TaskList / TaskItem）完成（最新）

> 本節是 r15 提出 vNext tracks（A~F）後，使用者選擇「能先處理的小事項先做」，確認從 Track A 開始並回報測試通過後新增的最新續接狀態。

#### 1K.1 已完成實作

```

Track A（第一批）：Link extension + TaskList / TaskItem extension ✅

```

修改檔案：

```

src/components/TiptapEditor.tsx   （整檔替換） src/components/NexusApp.tsx       （局部函式 patch：Markdown v0.1 → v0.2） package.json                       （新增 3 個 Tiptap extension 套件）

```

新增套件：

```

@tiptap/extension-link@3.27.1 @tiptap/extension-task-list@3.27.1 @tiptap/extension-task-item@3.27.1

```

已完成能力：

```

1.StarterKit 內建 Link 已關閉（configure({ link: false })），改用獨立引入、明確設定的 Link extension，避免重複註冊衝突。
2.Link extension 採 openOnClick: false + autolink: true + linkOnPaste: true。
3.Toolbar 新增 Link 按鈕，使用 window.prompt() 設定 / 修改網址；未選取文字且無現有連結時提示先選取文字；輸入空白等於移除連結。
4.Toolbar 新增 ☑ Task 按鈕，呼叫 editor.chain().focus().toggleTaskList().run()。
5.TaskItem 設定 nested: true，允許巢狀 task。
6.CSS 新增 ul[data-type="taskList"] 樣式：checkbox 對齊、已完成項目加刪除線與淡化。
7.CSS 新增 a 標籤樣式：底線、手指游標，但不自動跳轉（符合 openOnClick: false 的設計）。

```

Markdown v0.1 → v0.2 同步更新（NexusApp.tsx）：

```

1.parseInlineMarkdown：[label](url) 不再保留為純文字，直接產生真正的 link mark 節點（attrs.href / target / rel）。
2.inlineNodesToMarkdown：新增偵測 link mark，export 時輸出回 [text](url)。
3.新增 taskItemToMarkdownLine()：讀取真正 taskItem 節點的 attrs.checked，export 成 - [ ] / - [x]。
4.nodeToMarkdown：新增 taskList case，呼叫 taskItemToMarkdownLine()。
5.createMarkdownContent()：listBuffer 改為 { kind: "bullet" | "ordered" | "task", items } 結構；task 語法（- [ ] / - [x]）直接建立真正的 taskList / taskItem 節點，不再轉成 ☐ / ☑ 文字符號。

```

向後相容處理：

```

listItemToMarkdown() 舊函式保留不變，繼續支援偵測 v0.1 時期已存在於 IndexedDB 中的舊資料（☐ / ☑ 文字符號 bullet list），export 時仍可正確轉回 - [ ] / - [x]。 新舊兩種資料可同時存在，互不干擾：nodeToMarkdown 對 bulletList（可能含舊 ☐/☑ 文字）與 taskList（新真實節點）分別有對應的 export 邏輯。

```

#### 1K.2 使用者驗證結果

使用者完成以下測試並回報「都通過」：

```

選取文字 → 點 Link → 輸入網址 → 文字變成可點擊樣式的連結 再次點擊已有連結的文字 → 點 Link → 可看到 / 修改網址，清空可移除連結 點擊連結可點擊但不跳轉（openOnClick: false 的預期行為，非 bug） 點 ☑ Task → 出現真正可勾選的 checkbox，勾選後文字有刪除線 Export MD → task 輸出成 - [ ] / - [x]，link 輸出成 [text](url) Import 含 [text](url) 與 - [ ] 的 .md 檔 → 變成真正的連結與 checkbox 舊有 v0.1 時期 ☐ / ☑ 筆記 → Export MD 仍正確轉換（向後相容通過） 一般 regression：新建 / 編輯 / 刪除筆記、tags、folder、backlinks、PDF import、Trash / Restore 皆正常

```

使用者確認「可點擊但不跳轉」為預期行為，不需修正。若未來想改為點擊直接開啟，只需將 `openOnClick` 改為 `true`（或改為 Ctrl/Cmd + 點擊才開啟），屬於一行設定的小改動，非架構變更。

#### 1K.3 下一步

使用者明確指示「下一步維持順序節奏可以快點沒關係」，即維持 r15 建議的 tracks 順序：

```

1.Track A — Editor Blocks Foundation（Link / TaskList 已完成第一批；Image / Table / Callout / LaTeX 仍可後續補）
2.Track E — Safety（Workspace Backup / Export package v0）← 下一步
3.Track B — Capture & Inbox（Quick Capture / Inbox v0）
4.Track C — Learning Core（Study Set / Flashcard v0）

```

下一步立即開始：Track E，Workspace Backup / Export package v0。

---

### 1L. 2026-07-02 Track E：Workspace Backup / Export package v0 完成（最新）

> 本節是 Track A 完成後，依使用者指示「維持順序節奏可以快點沒關係」直接推進 Track E 後新增的最新續接狀態。

#### 1L.1 已完成實作

```

Track E — Workspace Backup / Export package v0 ✅ 已完成並由使用者回報一切正常

```

修改檔案：

```

src/lib/types.ts             （整檔替換：新增 WorkspaceBackup / WorkspaceBackupAttachmentEntry / WorkspaceBackupSettingEntry） src/lib/StorageAdapter.ts    （整檔替換：新增 exportWorkspaceBackup? / importWorkspaceBackup? 兩個可選方法） src/lib/IndexedDBAdapter.ts  （整檔替換：實作 export / import，含 blob ↔ base64 轉換） src/components/NexusApp.tsx  （局部 patch：Sidebar 新增 Export Backup / Import Backup 按鈕，Root App 新增對應 handler 與 hidden file input）

```

不需要新增任何 npm 套件；全部使用瀏覽器原生 API（`btoa` / `atob` / `ArrayBuffer` / `Blob`）。

已完成能力：

```

1.Export Backup：匯出整個 workspace 為單一 JSON 檔案（nexus-backup-YYYY-MM-DD-HHmm.json）。
2.備份內容包含 schema_version、exported_at、device_id、所有 pages（含已軟刪除 / Trash 中的）、所有 attachments metadata、PDF binary（以 base64 編碼一併打包）、settings（含 active_page_id）。
3.Import Backup：讀取備份 JSON，採「完全覆蓋」策略。
4.Import 前跳出二次確認，明確告知會覆蓋目前所有資料且無法復原。
5.IndexedDBAdapter.importWorkspaceBackup() 使用單一 IndexedDB transaction 清空並重寫 pages / attachments / binaries / settings 四個 store，確保不會發生清一半、寫一半的不一致狀態。
6.Import 成功後自動 reload 頁面，確保所有 React state 重新從 IndexedDB 讀取。
7.importWorkspaceBackup() 會檢查 backup.schema_version，若備份版本高於目前支援版本則拒絕匯入並提示更新 Nexus。

```

設計決策（依使用者確認）：

```

PDF / 圖片 binary 這次一併備份（base64 編碼），還原後不需要重新匯入 PDF，代價是備份檔案較大。 Import v0 只做「完全覆蓋」，不做合併；合併邏輯複雜，延後評估。 StorageAdapter 新增的兩個方法設為可選（?），比照 createAttachment 的既有介面風格，保留未來其他 adapter（例如 SQLite）尚未實作此能力時的相容性。

```

#### 1L.2 使用者驗證結果

使用者完成測試並回報「一切正常」，測試涵蓋：

```

建立含 tags / folder / links 的筆記與 PDF research note，並刪除一篇筆記進 Trash Export Backup 下載並確認內容合理 清空環境後 Import Backup，確認二次確認提示正確出現 確認後筆記、Trash 內容、PDF binary、active_page_id 皆正確還原 一般 regression（新建 / 刪除筆記、Import PDF、Import MD、Link / Task 編輯）仍正常

```

#### 1L.3 下一步

依 r15 建議順序與使用者確認的優先序，下一步進入：

```

Track B — Capture & Inbox（Quick Capture / Inbox v0）

```

之後：

```

Track C — Learning Core（Study Set / Flashcard v0）

```

---

### 1M. 2026-07-02 Track B：Quick Capture / Inbox v0 完成（最新）

> 本節是 Track E 完成後，依使用者指示的節奏推進 Track B 後新增的最新續接狀態。

#### 1M.1 已完成實作

```

Track B — Quick Capture / Inbox v0 ✅ 已完成並由使用者回報正常

```

修改檔案：

```

src/components/NexusApp.tsx（唯一修改檔案；不涉及 types.ts / StorageAdapter.ts / IndexedDBAdapter.ts）

```

已完成能力：

```

1.Sidebar 新增常駐 Quick Capture 輸入框：「快速記一下，按 Enter 存入 Inbox...」。
2.輸入文字按 Enter，立即建立新頁面（folder: "Inbox", tags: ["inbox"]），標題取文字前 60 字。
3.Quick Capture 刻意不切換 activePageId，不打斷使用者目前正在編輯的頁面。
4.換行文字會拆成多個段落存入 content_json。
5.Sidebar 切換由 Notes / Trash 兩態擴充為 Notes / Inbox / Trash 三態。
6.Inbox 視圖顯示所有 folder === "Inbox" 或 tags 含 "inbox" 的頁面（isInboxPage() 輔助函式）。
7.Inbox 中頁面可正常點擊開啟編輯 / Copy / Delete，沿用既有 Notes 模式互動邏輯，未另建一套。
8.Inbox 頁面因 folder="Inbox"，切回 Notes 視圖時會自然歸類進 Inbox 資料夾分組（沿用既有 Folders 機制）。

```

設計原則（呼應 01-CANON 14.9 節）：

```

Inbox（收件匣）= System View。 Quick Capture（快速收集）= Capture Flow / Tool。 早期以既有 folder / tags 欄位實作，不新增資料模型。

```

#### 1M.2 使用者驗證結果

使用者回報「正常」。

#### 1M.3 使用者後續提問與下一步

使用者提出兩個後續問題：

```

1.首頁（Dashboard / Home）什麼時候會做？
2.可否新增多選功能，同時選擇多個筆記刪除或復原？

```

回覆與規劃：

```

Dashboard / Home 屬於 r14 分類中的 System Views，目前排在 vNext tracks A~F 之外， 尚未被排入近期 track（A Editor Blocks、B Capture & Inbox、C Learning Core、D Research、 E Safety Backup、F Creatable Registry 皆不包含 Dashboard）。 建議等 tracks A~F 近期候選跑過一輪、且 Note / Document / Study Set 等核心 creatable 更成熟後，再評估 Dashboard / Home，因為 Dashboard 通常需要彙整多種 creatable 的摘要視圖， 過早做容易受限於當時尚未完成的其他模組。

多選刪除 / 復原（Bulk select）判斷為低風險、高實用性的 UI polish， 不需要新增資料模型，只需要在 Sidebar 增加多選 state 與批次呼叫既有的 deletePage() / restorePage() / permanentDeletePage()，因此列為可以直接插入 目前 track 節奏之前先做的小功能，命名為 Track A2 — Bulk Select（Notes / Trash 多選刪除與復原）。

```

#### 1M.4 下一步

```

下一步：Track A2 — Bulk Select for Notes / Trash（多選刪除 / 復原） 之後恢復原節奏：Track C — Study Set / Flashcard v0 Dashboard / Home 暫緩，待近期 tracks 告一段落後再評估

```

---

### 1N. 2026-07-02 Track A2：Bulk Select（Notes / Trash 多選刪除與復原）完成，並改為工作區直接維護代碼（最新）

> 本節是 Track B 完成後，使用者提出「首頁什麼時候做」與「可否新增多選刪除/復原」兩個問題，並進一步要求「直接在工作區建立代碼、每次更改都直接更新」後新增的最新續接狀態。

#### 1N.1 已完成實作

```

Track A2 — Bulk Select for Notes / Trash（多選刪除 / 復原）✅ 已完成並由使用者回報符合預期

```

修改檔案：

```

src/components/NexusApp.tsx（唯一修改檔案）

```

已完成能力：

```

1.Sidebar 標頭新增「Select」按鈕，切換多選模式。
2.多選模式開啟後，每個項目左側出現 checkbox；原本 hover 才出現的 Copy / 🗑 / Restore / Delete 按鈕暫時隱藏，改由頂部批次操作列統一處理。
3.批次操作列提供「全選目前顯示項目」checkbox 與已選取數量顯示。
4.Notes / Inbox 視圖：批次 Delete（移入回收桶，沿用既有 soft delete）。
5.Trash 視圖：批次 Restore、批次 Delete（永久刪除，需二次確認並顯示數量）。
6.切換 Notes / Inbox / Trash 視圖時，自動關閉多選模式並清空已選取項目，避免跨視圖選取混淆。
7.若批次刪除包含目前 active page，正確切換到下一頁或清空狀態，不白屏（沿用既有單筆刪除的安全機制）。

```

設計決策：

```

批次 Restore 完成後刻意停留在 Trash 視圖，不自動切回 Notes：因為一次復原多篇時無法明確判斷該選中哪一篇，交由使用者自行決定接下來要打開哪篇筆記。 批次操作透過迴圈呼叫既有的單筆 StorageAdapter 方法（deletePage / restorePage / permanentDeletePage）實作，不新增資料模型，不新增 StorageAdapter 介面方法。

```

#### 1N.2 使用者提問與回覆記錄

使用者提問一：首頁（Dashboard / Home）何時會做？

```

回覆：Dashboard / Home 屬於 r14 分類中的 System Views，目前不在 vNext tracks A~F 範圍內。 建議待 tracks A~F 近期候選跑過一輪、且 Note / Document / Study Set 等核心 creatable 更成熟後再評估， 避免 Dashboard 因依賴的其他模組尚未完成而做得過於陽春、之後還要重做。

```

使用者提問二：可否新增多選刪除 / 復原？

```

回覆：可行，判斷為低風險、高實用性的 UI polish，不需要新增資料模型， 命名為 Track A2，插隊在 Track B 之後、Track C 之前先做。

```

#### 1N.3 協作模式重大調整：改為工作區直接維護代碼

使用者要求：

```

有辦法你直接在工作區建立代碼 每次更改都直接更新嗎

```

新協作模式（取代先前的「patch 說明文件」模式）：

```

1.助理在 Arena workspace 的 project/ 目錄下維護一份完整的 Nexus 專案鏡像

（src/app、src/components、src/lib、package.json、tsconfig.json 等）。

1.之後每次功能異動，助理直接修改 project/ 目錄下的實際檔案，不再輸出「找這段換那段」的 patch 說明文件。
2.助理在交付前，於 workspace 內實際執行 npm install / npx tsc --noEmit / npx next build 驗證，

確保程式碼可編譯通過，而不僅是肉眼檢查。

1.使用者下載 project/src/ 內容並覆蓋回本機 C:\\Users\\user\\Projects\\nexus\\src\\ 對應位置。
2.若某次改動只涉及少數檔案，助理會明確告知只需覆蓋哪幾個檔案，不要求每次都整包下載。

```

不變的限制：

```

助理無法直接連線或寫入使用者本機 Windows 檔案系統。 仍需要使用者手動下載並覆蓋檔案到本機專案，無法做到全自動雙向同步。

```

建立鏡像時的操作記錄：

```

1.使用者提供最新版 NexusApp.tsx（已在本機依序套用過 Track A、B、A2 討論前、E 四輪 patch 的版本）。
2.助理清理貼上造成的符號污染（&gt; / &lt; HTML escape、[Date.now](http://...) 誤連結化、多餘 ** 等），還原為正確 TypeScript / JSX 語法。
3.助理將 Track A2（多選刪除 / 復原）直接一併整合進這份鏡像版本的 NexusApp.tsx，而不是額外再輸出一份 patch 說明。
4.使用者提供本機實際的 layout.tsx / page.tsx / globals.css，助理據此更新工作區鏡像至完全對齊。
5.助理執行 npm install + npx tsc --noEmit + npx next build（Turbopack production build），

確認零型別錯誤、建置成功、靜態頁面正確產出。

1.使用者下載鏡像版本至本機測試 Track A2，回報「符合預期」。

```

#### 1N.4 下一步

```

下一步：Track C — Study Set / Flashcard v0（規模較大，需要新的資料模型：Deck / Card / StudyAttempt， 動工前會先與使用者確認範圍） Dashboard / Home 暫緩，待近期 tracks 告一段落後再評估 之後所有 track 的程式碼異動，一律採用「工作區直接維護 + 編譯驗證 + 使用者下載覆蓋」模式， 不再輸出 patch 說明文件（除非使用者另有要求）

```

---

### 1O. 2026-07-02 Track C：Study Set / Flashcard v0 完成，並完成 NexusApp.tsx 拆檔（最新）

> 本節是 Track A2 完成、協作模式改為工作區直接維護代碼後，依使用者確認的範圍完成 Track C，並依使用者要求完成 NexusApp.tsx 拆檔後新增的最新續接狀態。

#### 1O.1 Track C：Study Set / Flashcard v0 已完成實作

```

Track C — Study Set / Flashcard v0 ✅ 已完成並由使用者回報正常

```

動工前確認的範圍：

```

v0 只做翻頁字卡模式（不含四選一測驗、拼寫模式，列為後續擴充）。 複習進度採簡單分類：new / learning / mastered，不做完整間隔重複演算法（SRS）。 CSV / TSV 匯入延後，v0 先做手動建立卡片。 卡片欄位為通用 Front / Back，不綁定特定語言。 翻頁練習順序：優先出「還不熟」的卡並隨機排序，已熟悉的卡以較低機率穿插出現（非完全排除）。 點擊 Study Set 類型的 Page 進入專屬畫面（卡片管理 + 練習模式），不是 Tiptap 編輯器； 此設計可後續調整（例如改成保留筆記欄位的混合版面），因為 UI 呈現與底層資料模型（study_items）已分離。

```

資料模型：

```

新增 PageKind 型別（"note" | "study_set"），Page 新增 kind?（optional，缺省視為 "note"，向後相容）。 新增 StudyItem 型別：id / front / back / mastery / last_reviewed_at / review_count。 Page 新增 study_items?（僅 kind === "study_set" 使用）。 CreatePageInput 新增 kind?，IndexedDBAdapter.createPage() 支援建立時指定 kind， study_set 類型自動初始化空的 study_items。

```

新增檔案：

```

src/components/StudySetView.tsx — 卡片管理畫面（新增/編輯/刪除卡片）+ 翻頁練習模式（PracticeSession）

```

修改檔案：

```

src/lib/types.ts（新增 PageKind / StudyItem 型別，Page / CreatePageInput 擴充欄位） src/lib/IndexedDBAdapter.ts（createPage 支援 kind 參數） src/components/NexusApp.tsx（Sidebar 新增「New Study Set」入口， 依 activePage.kind 判斷渲染 StudySetView 或一般 Editor）

```

架構債務順帶處理：

```

r15 曾指出（D-102）default_mode 不應同時代表「頁面種類」與「顯示模式」，當時建議中期新增 kind 欄位。 Track C 是第一個真正需要區分頁面種類的功能，因此此次直接依 r15 建議的過渡策略新增 kind 欄位， 而不是繼續把新語意塞進 default_mode。kind 為 optional，舊資料視為 "note"，完全向後相容。

```

使用者測試「正常」。

#### 1O.2 拆檔：NexusApp.tsx 從 2301 行降至 864 行

> 使用者於 Track C 驗證通過後主動提出：「我覺得nexus可以可慮拆檔」。此為使用者主動請求，非助理片面決定；判斷時機合適（應用基本架構已跑穩：Note / PDF Research / Study Set 三種 Page 類型皆已驗證），且呼應既有決策 D-63（優先拆純 UI component，暫緩拆 hooks）。

拆檔結果：

```

NexusApp.tsx：2301 行 → 864 行（保留 Root App 的 state 管理、所有 handler、資料存取邏輯，不拆 hooks）

```

新增純函式模組（src/lib/，無 React 依賴）：

```

blockId.ts       — createClientBlockId() wikilinks.ts      — extractWikilinks() pdfNote.ts        — titleFromPdfFileName() / createResearchNoteContent() inbox.ts          — titleFromMarkdownFileName() / titleFromCaptureText() / captureTextToContentJson() / isInboxPage() markdown.ts       — Markdown import/export 全部邏輯（pageToMarkdown / createMarkdownContent 等） fileDownload.ts   — downloadTextFile() / safeFileName() / downloadJsonFile() / formatBackupFileName()

```

新增 UI 元件模組（src/components/）：

```

Sidebar.tsx       — 側邊欄（含 Select 多選、Quick Capture、Notes/Inbox/Trash 切換等） EditorPane.tsx    — 筆記編輯畫面（含 PDF viewer），原元件名稱 Editor 改為 EditorPane， 避免與 Tiptap 套件本身的 Editor class 名稱衝突造成日後混淆 RightPanel.tsx    — Backlinks / Outgoing Links 面板

```

驗證方式：

```

從乾淨環境重新執行 npm install → npx tsc --noEmit（零錯誤）→ npx next build（Turbopack production build 成功）， 共執行兩輪確認結果一致。 手動確認拆檔後所有檔案的 import 皆有實際使用，無殘留無用 import。

```

使用者下載整包 src/ 覆蓋本機後完整回歸測試，回報「沒有破壞任何行為」。

#### 1O.3 下一步

```

下一步候選（尚未由使用者選定）：

1.Track C 後續擴充：四選一測驗、拼寫模式、CSV / TSV 匯入
2.Track D — Research（PDF viewer polish / citation metadata / annotation later）
3.Track F — Creatable Registry / Create Center
4.繼續 Editor Blocks Foundation（Image / Table / Callout / LaTeX）

Dashboard / Home 仍暫緩，待近期 tracks 告一段落後再評估。 之後所有 track 的程式碼異動，持續採用「工作區直接維護 + 編譯驗證 + 使用者下載覆蓋」模式。

```

---

### 1P. 2026-07-02 Editor Blocks Foundation — Table 完成，並記錄 package.json 部署排查案例（最新）

> 本節是使用者選擇「繼續 Editor Blocks（Image / Table / Callout / LaTeX）」後，優先完成 Table block 的最新續接狀態。本節也記錄一次 package.json 層級的部署排查案例，作為未來類似問題的參考。

#### 1P.1 已完成實作

```

Editor Blocks Foundation — Table（表格）✅ 已完成並由使用者驗證通過

```

範圍確認（動工前與使用者確認的優先序）：

```

Image block 迫切性較低，使用者要求擱置、之後再討論。 確認分批順序：Table → Callout → LaTeX（LaTeX 最複雜，排最後）。

```

修改檔案：

```

package.json（新增 @tiptap/extension-table） src/components/TiptapEditor.tsx（新增 TableKit extension、Toolbar 按鈕、CSS） src/lib/markdown.ts（新增 tableToMarkdown()，Export MD 支援表格）

```

已完成能力：

```

1.TableKit extension 啟用，resizable: true（可拖曳調整欄寬）。
2.Toolbar 新增「Table」按鈕，插入 3x3 含表頭列的表格。
3.游標位於表格內時，Toolbar 額外顯示 +Col / +Row / -Col / -Row / ✕Table 五個操作按鈕。
4.CSS 補齊表格框線、表頭底色、欄寬拖曳把手樣式（.nexus-tiptap-editor table 系列）。
5.Markdown export 新增 tableToMarkdown()，將表格節點轉成標準 Markdown table 語法

（| A | B | 格式），基本版僅取每個 cell 的純文字，不處理 colspan/rowspan 等進階排版。

```

#### 1P.2 部署排查案例：package.json 層級異動需要明確提醒重新 npm install

背景：

```

本次是協作模式改為「工作區直接維護代碼」後，第一次涉及 package.json（專案根目錄， 不在 src/ 底下）的異動。前次交付訊息只提到「工作區已是最新版本」， 沒有明確強調這次也需要更新 package.json 並重新執行 npm install， 導致使用者本機 TypeScript 找不到 @tiptap/extension-table 型別， Table 相關指令（addColumnAfter / addRowAfter / deleteTable / deleteRow / deleteColumn / insertTable）在 VS Code 中全部標紅（TS 2339 錯誤）。

```

排查與修正過程：

```

1.使用者回報標紅錯誤，助理判斷為本機未安裝新套件，指引執行 npm.cmd install。
2.使用者執行 Remove-Item -Recurse -Force node_modules + Remove-Item -Force package-lock.json

- npm.cmd install 做完全重新安裝，但出現 E404 錯誤：

找不到 @types/extension-table。

1.助理判斷：這不是套件真的不存在，而是使用者本機 package.json 中該行被誤植為

"@types/extension-table"，正確應為 "@tiptap/extension-table"（貼上過程中常見的符號/ 命名空間污染，此對話中已多次出現類似情況）。

1.助理提供完整、確認正確的 package.json 內容供使用者整份覆蓋取代，

而不是只指出錯誤的那一行，降低使用者再次手動修改打錯的風險。

1.使用者覆蓋後重新執行 npm.cmd install + npm.cmd run dev，確認正常。

```

後續規則（新增，供未來 track 交付時遵循）：

```

1.若某次改動涉及 package.json（新增 /修改依賴套件），必須在交付訊息中明確、獨立列出

「這次也需要更新 package.json 並重新執行 npm.cmd install」，不能只說「工作區已是最新版本」， 因為 package.json 位於專案根目錄，不屬於使用者慣常覆蓋的 src/ 資料夾範圍。

1.若使用者回報 npm install 出現 404 / 找不到套件等錯誤，優先檢查是否為套件名稱被貼上污染

（例如 @tiptap 被誤植為 @types、或其他 scope 混淆），而不是預設為套件本身不存在。

1.遇到 package.json 層級的錯誤，直接提供完整、確認正確的檔案內容供整份覆蓋，

比起只指出「哪一行打錯」更能降低使用者再次手動修改出錯的風險。

```

使用者最終確認「正確」（先前一則因輸入法問題誤送亂碼，已釐清為確認訊息）。

#### 1P.3 下一步

```

下一步候選（尚未由使用者選定）：

1.Editor Blocks Foundation — Callout（提示框 / 重點框），依既定分批順序為下一批
2.Editor Blocks Foundation — LaTeX / Equation（最複雜，排最後）
3.Track C 後續擴充：四選一測驗、拼寫模式、CSV / TSV 匯入
4.Track D — Research（PDF viewer polish / citation metadata / annotation later）
5.Track F — Creatable Registry / Create Center

Image block 已由使用者要求擱置，待後續討論。 Dashboard / Home 仍暫緩。

```

---

### 1Q. 2026-07-02 Editor Blocks Foundation — Callout 完成（含一個已知未解問題），並建立 jsdom 真實 Editor 排查方法（最新）

> 本節是 Table 完成後，依既定分批順序推進 Callout（提示框 / 重點框）的最新續接狀態。本節也記錄一次比對話中先前排查更進階的除錯方法：用 jsdom 建立真正的 Tiptap Editor 實例重現問題，而非僅憑閱讀程式碼推測。

#### 1Q.1 已完成實作

```

Editor Blocks Foundation — Callout（提示框 / 重點框）✅ 大部分完成，含 1 個已知未解問題（圖示選單點擊無效）

```

動工前確認的範圍（呼應使用者「notion 可以自行選擇或刪除」的需求）：

```

variant（顏色類型）與 icon（圖示）分開設定，比照 Notion 做法。 5 種顏色類型：Info（藍）/ Warning（黃）/ Success（綠）/ Danger（紅）/ Note（灰）。 圖示可從常用清單挑選，或選擇「移除圖示」變成純文字提示框。

```

新增檔案：

```

src/lib/calloutExtension.ts — 自訂 Callout Tiptap Node（Tiptap 官方無現成 extension，採 vanilla JS addNodeView()，不依賴 @tiptap/react，維持與專案其餘部分一致的技術棧）

```

修改檔案：

```

src/components/TiptapEditor.tsx（引入 Callout extension、Toolbar 按鈕、CSS） src/lib/markdown.ts（Callout import/export，採 "> [!INFO] 💡" 語法，相容 Obsidian / GitHub 慣例）

```

#### 1Q.2 自動化驗證方法升級：jsdom + 真實 Editor 實例

背景：Callout 是本次 Editor Blocks 中複雜度最高的自訂實作（無官方套件可依循），因此在標準的
`tsc --noEmit` / `next build` 之外，額外建立更進階的驗證方式。

```

1.純邏輯層驗證：直接呼叫 markdown.ts 的 pageToMarkdown() / createMarkdownContent()，

驗證 Callout 的 Markdown export → import round-trip 是否正確還原（含多段落情況）。 此階段抓到並修正一個真實 bug：Callout 內多個段落 export 時沒有用空白引用行（">"）分隔， reimport 時被誤合併成一段；已修正 calloutToMarkdown() 用 "\\n\\n" 分隔不同 block。

1.DOM 互動層驗證：安裝 jsdom + tsx（開發時暫裝，驗證完畢即移除，不寫入 package.json），

建立真正的 @tiptap/core Editor 實例掛載到 jsdom 的 DOM 節點， 模擬使用者點擊按鈕、選單選項的完整流程，檢查底層 ProseMirror 文件狀態是否如預期變化。

```

#### 1Q.3 使用者驗證結果與已知問題

使用者測試兩項功能：

```

1.插入 Callout → 再點一次按鈕 → 確認能解開恢復成一般段落 ✅ 成功
2.點圖示 → 選單彈出 → 選圖示 → 確認換成功 ❌ 失敗

```

問題 1（解開失敗）根本原因與修正：

```

根本原因：Callout node 設定了 isolating: true，此屬性會阻止一般編輯操作（包含 lift / 解開包裹） 跨越節點邊界，導致 ProseMirror 的 lift 指令永遠回傳 false。 驗證方式：用 jsdom 建立真實 Editor 實例，直接呼叫 editor.commands.lift("callout")， 確認移除 isolating: true 前回傳 false、移除後回傳 true 且 isActive 正確變回 false。 修正：移除 isolating: true（保留 defining: true）。

```

問題 2（圖示選單點擊無效）已完成的修正與目前狀態：

```

根本原因判斷：比對使用者回報「切換類型下拉選單有效、圖示按鈕無效」的不對稱線索， 發現下拉選單（variantSelect）已有 mousedown 事件保護（event.stopPropagation()）， 但圖示按鈕（iconButton）與選單內選項按鈕皆缺少同樣保護。 理論依據：Tiptap 官方文件與 TaskItem 節點原始碼皆採用此模式 （checkbox.addEventListener('mousedown', event => event.preventDefault())）—— 在編輯器內的互動元件若不在 mousedown 階段攔截，ProseMirror 會搶先將點擊視為 「編輯器內容選取」處理，導致按鈕的 click 事件實際上不會觸發。 已修正：為 iconButton 與所有 renderMenu() 產生的按鈕（含「移除圖示」）補上 mousedown 攔截。 jsdom 直接派發 DOM click 事件的自動化測試中，此修正後的邏輯運作正確 （menu 開啟、選取圖示、更新 attrs 皆符合預期）。 使用者於真實瀏覽器環境測試後回報「失敗」，代表問題尚未完全解決， 但確切原因與 jsdom 測試結果不一致，需要近一步排查（可能與真實瀏覽器的事件時序、 CSS 顯示狀態、或 jsdom 無法完整模擬 ProseMirror 的某些底層行為有關）。

```

使用者決策：

```

問題 2 判斷為「問題不大」，同意先擱置、繼續推進其他 track，之後有空再回頭排查。 此為使用者明確決策，不是助理片面判斷此問題不重要。

```

#### 1Q.4 下一步

```

下一步候選（尚未由使用者選定）：

1.Editor Blocks Foundation — LaTeX / Equation（依既定分批順序，最後一批，複雜度最高）
2.Track C 後續擴充：四選一測驗、拼寫模式、CSV / TSV 匯入
3.Track D — Research（PDF viewer polish / citation metadata / annotation later）
4.Track F — Creatable Registry / Create Center

5.（可延後處理）回頭排查 Callout 圖示選單在真實瀏覽器中點擊無效的問題 Image block 已由使用者要求擱置，待後續討論。 Dashboard / Home 仍暫緩。

```

---

### 1R. 2026-07-02 Editor Blocks Foundation — LaTeX / Block Math 完成（Editor Blocks 三批全數完成），並補齊 Table Import 遺漏（歷史紀錄，範圍已被 1S 節取代，非最新狀態）

> 本節是 Callout 完成後，依既定分批順序推進 LaTeX / Equation（最後一批，複雜度最高）的最新續接狀態。本節也記錄一次過程中意外發現並修正的舊功能缺口（Table 匯入從未實作），以及一次因使用者未留意先前提醒而重複發生的 package.json 部署問題。
>
> 🔴 **重要更新提醒**：本節下方「動工前確認的範圍」寫的「只做 block、不做 inline」只反映**當時（第一版官方 $$/$$$ prompt 版本）**的範圍。使用者後續要求 Obsidian 風格原地編輯改版時，**InlineMath 已與 BlockMath 一併完成**（見下方 1S 節），並非仍停留在「只有 BlockMath」的狀態。若要了解目前最新、實際的 LaTeX / 公式功能狀態，請直接看 1S 節，不要只看本節就以為 InlineMath 尚未實作。

#### 1R.1 已完成實作

```

Editor Blocks Foundation — LaTeX / Block Math ✅ 已完成並由使用者驗證通過 Editor Blocks Foundation 三批（Table、Callout、LaTeX）至此全數完成

```

動工前確認的範圍：

```

只做單獨段落公式（block equation），不做行內公式（inline equation）。 使用者確認：這不是底層架構限制，未來要加行內公式是低風險的追加動作， 因為 content_json 本來就可自由容納新節點類型，且 Tiptap 官方套件把 BlockMath / InlineMath 設計成可獨立引入的兩個部分，共用同一套 KaTeX 渲染邏輯。 使用者熟悉 LaTeX 語法，不需要額外的常用符號快捷按鈕輔助。

```

技術選型：

```

採用 Tiptap 官方 @tiptap/extension-mathematics（含 BlockMath / InlineMath）， 版本 3.27.1，與專案其餘 Tiptap 套件版本完全對齊。 搭配 katex 套件（^0.16.11）作為底層公式渲染引擎。 只 import BlockMath（而非完整 Mathematics extension），對應「先做 block、 之後低風險加 inline」的規劃。

```

新增套件：

```

@tiptap/extension-mathematics@3.27.1 katex@^0.16.11

```

修改檔案：

```

package.json（新增上述兩個套件） src/components/TiptapEditor.tsx（引入 BlockMath、Toolbar 按鈕、CSS、onClick 編輯/刪除邏輯） src/lib/markdown.ts（LaTeX $$...$$ import/export；意外補齊 Table import，見 1R.2）

```

已完成能力：

```

1.Toolbar 新增「∑ Math」按鈕，點擊跳出 prompt() 輸入 LaTeX 字串，插入渲染後的公式。
2.點擊已插入的公式本身（而非透過 Toolbar 按鈕）可編輯或清空刪除，

採用官方建議的 onClick(node, pos) 模式。

1.Export MD 採 $$...$$ 慣例語法（LaTeX block math 常見寫法）。
2.Import MD 辨識 $$ 開頭與結尾的區塊，還原為 blockMath 節點，支援多行 LaTeX

（例如 \\begin{aligned}...\\end{aligned}）。

```

#### 1R.2 排查記錄：updateBlockMath / deleteBlockMath 必須明確傳入 pos

過程：

```

用 jsdom + 真實 Editor 實例測試時發現，若透過 setNodeSelection(pos) 再呼叫 updateBlockMath({ latex })（不傳 pos），指令會回傳 false、實際未更新成功。 改用官方 onClick(node, pos) 回呼直接提供的 pos，並在呼叫 updateBlockMath / deleteBlockMath 時明確傳入 { pos }，測試後確認正確運作 （包含插入 → 點擊更新 → 點擊刪除的完整流程）。

```

根本原因：

```

updateBlockMath / deleteBlockMath 若省略 pos 選項，會改讀 editor.state.selection.$from.pos；但 setNodeSelection 產生的是 NodeSelection， 其$from.pos 語意與一般 TextSelection 不同，導致指令內部查無對應節點而失敗。

```

教訓（呼應 D-118 的 jsdom 驗證方法）：

```

自訂或使用官方複雜 extension 時，不要假設「先選取節點、再呼叫指令」的直覺寫法 一定正確；應優先查看 extension 原始碼的指令實作邏輯，或用真實 Editor 測試 驗證每個指令的實際行為，而不是憑經驗類比其他指令的用法。

```

#### 1R.3 意外發現並修正：Table 匯入功能先前從未實作（非本次新增功能的迴歸，是舊缺口）

發現過程：

```

為 LaTeX 撰寫混合多種 block 的迴歸測試（Callout + blockMath + taskList + table 一起匯出再匯入）時，發現 table 類型在 reimport 後消失，改用純文字呈現。

```

根本原因：

```

Table block 完成時（見 8.20 節），只實作了 tableToMarkdown()（匯出）， createMarkdownContent()（匯入）中從未加入辨識 "| A | B |" 表格語法的邏輯。 這不是 LaTeX 改動造成的迴歸，是先前 Table 交付時遺漏的一半功能， 本次意外發現後一併補齊。

```

修正：

```

在 createMarkdownContent() 新增表格偵測邏輯：辨識第一行為 "| ... |" 格式、 第二行為分隔線（"| --- | --- |"）的區塊，解析表頭與資料列還原為 table / tableRow / tableHeader / tableCell 節點。 基本版僅處理此情況，不支援欄位對齊語法（如 :---:）或 colspan / rowspan， 維持與 export 端一致的範圍控制（呼應 D-68 Markdown v0 範圍控制精神）。

```

驗證：

```

補齊後重新執行混合 block 迴歸測試，Callout / blockMath / taskList / table 四種節點皆正確互相辨識、不互相干擾。

```

#### 1R.4 部署排查：使用者重複發生 package.json 提醒被忽略的情況

背景：

```

本次交付訊息中，助理已依 D-116 規則明確提醒「需要更新 package.json 並重新 npm install」。使用者稍後回報「deleteBlockMath 出現跟剛剛一樣的問題」 （意指程式碼標紅），助理一度誤解為功能邏輯問題並深入用 jsdom 測試排查 （結果邏輯完全正確），後續確認後才發現是使用者這次操作時看漏了提醒文字， 並非助理沒有提醒。

```

教訓（補充 D-116）：

```

即使助理已在交付訊息中明確提醒 package.json 異動，使用者仍可能看漏。 當使用者回報「標紅」或「跟之前一樣的問題」等描述模糊的狀況時， 應先詢問具體現象（例如「是完全沒反應，還是程式碼標紅？」）， 不要直接假設是同一類型問題並跳去做深度邏輯排查， 以免消耗不必要的時間在錯誤的排查方向上。

```

使用者確認重新 npm install 後恢復正常。

#### 1R.5 下一步

```

Editor Blocks Foundation 三批（Table、Callout、LaTeX）至此全數完成。 下一步候選（尚未由使用者選定）：

1.Track C 後續擴充：四選一測驗、拼寫模式、CSV / TSV 匯入
2.Track D — Research（PDF viewer polish / citation metadata / annotation later）
3.Track F — Creatable Registry / Create Center

4.（可延後處理）回頭排查 Callout 圖示選單在真實瀏覽器中點擊無效的問題 5.（可延後處理）評估是否加入 InlineMath（行內公式），為低風險追加動作 Image block 已由使用者要求擱置，待後續討論。 Dashboard / Home 仍暫緩。

```

---

### 1S. 2026-07-02 Editor Blocks Foundation — LaTeX 改版為 Obsidian 風格「原地編輯」公式體驗，取代官方 $$/$$$ prompt 版本（最新）

> 本節接續 1R 節。使用者事後要求把 LaTeX 公式編輯體驗，從「點擊公式跳 `window.prompt()` 輸入字串」的官方預設互動，改造成真正的 **Obsidian 風格原地編輯**（點擊公式直接展開成可編輯的原始碼、離開自動收合渲染、方向鍵可穿越公式邊界、打字 `$...$` / `$$...$$` 直接即時轉換）。使用者先前在**另一個獨立的 AI 對話串**中嘗試做過這件事，過程中連續發生兩次崩潰（詳見下方 1S.1），並帶著該對話串的完整記錄要求本次由我接手重做。**本次並未照抄該對話串的程式碼**，而是理解其崩潰根因後，重新獨立設計與實作，並以 jsdom + 真實 Editor 實例逐項驗證。

#### 1S.1 背景：另一個 AI 對話串的失敗嘗試（僅供借鏡，程式碼未被採用）

使用者貼入的另一段對話紀錄中，該 AI 的實作經過多輪嘗試：

```

1.第一版：自訂 NodeView + <input>/<textarea> 覆蓋層，搭配 selectNode() / deselectNode()、

ignoreMutation() { return true }，方向鍵可穿越邊界。此階段本身尚可運作。

1.官方 InputRule 預設 $$ 行內 / $$$區塊，套用真正 Obsidian 的$/$$ 慣例時互相打架，

打 $$1$$被官方行內規則搶先誤判為只吃中間的$1$，變成殘留$(1)$ 的亂碼。

1.改寫自訂 InputRule，又遇到型別錯誤（handler 回傳型別只能是 void | null，

不能回傳 Transaction），修正後邏輯仍然不穩定（使用者回報「跟剛剛一樣的問題」）。

1.放棄 InputRule，改用 handleTextInput 手動攔截 "$" 字元，並疊加更多 Obsidian 進階需求

（方向鍵進入公式時依方向決定游標落點、編輯模式視覺完全透明、Backspace 清空退化為純 $ 字元）。

1.崩潰 1：Next.js 找不到 default export（懷疑是複製貼上時截斷，非邏輯錯誤本身）。
2.崩潰 2（真正的 ProseMirror 錯誤）：

"Selection passed to setSelection must point at the current document" 根本原因：在同一個 transaction 內，先用 tr.replaceWith(...) 換掉節點， 之後卻用「舊的」state.doc 去 resolve 新的游標位置，而不是用替換後的 tr.doc， 導致 resolve 出來的位置已經不屬於目前文件版本，setSelection 直接丟出例外。

```

這次事故被萃取出兩條可重用教訓，並在本次重新實作中嚴格套用：

```

教訓 A：一個 transaction 內若對 tr 做過 replaceWith / insert 等變更，之後所有位置計算 （包含要塞進 setSelection 的位置）都必須用「變更後」的 tr.doc 去 resolve， 不能沿用呼叫當下傳進來的 state.doc（那是變更前的舊文件）。 教訓 B：resolve 出來的位置直接包成 Selection.near($pos)（而非硬選一個固定位置）， 讓 ProseMirror 在位置剛好落在節點邊界等邊緣情況時能自動修正到合法位置， 而不是直接丟例外讓整個 transaction 失敗、甚至讓 editor 卡死。

```

#### 1S.2 本次重新實作內容（獨立設計，未照抄上述對話串程式碼）

新增兩個檔案：

```

src/lib/obsidianMathInput.ts 匯出 ObsidianMathInput（tiptap Extension）。 用 addProseMirrorPlugins() 掛一個 Plugin，透過 handleTextInput(view, from, to, text) 只攔截使用者輸入的單一 "$" 字元（不使用官方 InputRule，避免 1S.1 遇到的型別問題）。 區塊比對（$$...$$）一律排在行內比對（$...$）之前，避免行內規則搶先誤判 $$中間內容。 比對到公式時，於同一個 transaction 內 tr.replaceWith(...)， 接著用 tr.doc（而非 state.doc）resolve 節點後方位置，並用 TextSelection.near() 包裹， 嚴格套用 1S.1 的教訓 A / B。 防呆：內容前後緊鄰空白（或整段是空白）時不觸發轉換，避免「It costs$5 and $10」這種 純文字金額被誤判成公式（此判斷同步套用到 markdown.ts 的 import 端，見 1S.4）。

src/lib/obsidianMathNodeView.ts 匯出 createObsidianMathNodeView(isInline)，回傳符合 Tiptap NodeView 介面的工廠函式。 平時顯示 KaTeX 渲染結果；點擊或用方向鍵選中時，透過 selectNode() 展開成 帶 $ 或 $$ 分隔符的可編輯 <input>/<textarea>，方向鍵於編輯內容邊界會呼叫 exitEdit(true) 後把游標移動到公式節點前/後方（模擬穿越公式邊界）。 失焦或 Enter（僅行內）觸發 exitEdit(true) 存檔收合；Escape 觸發 exitEdit(false) 放棄變更。 內容清空後失焦，會呼叫 deleteInlineMath / deleteBlockMath 整個刪除節點。 沿用既有教訓：ignoreMutation() 一律回傳 true（避免 KaTeX 內部渲染 DOM 被 ProseMirror 誤判為文件變更，此教訓來自 Callout 開發期間，見 8.21.1）； updateInlineMath / updateBlockMath / deleteInlineMath / deleteBlockMath 一律 明確傳入 { pos }（不依賴目前 selection 去猜位置，此教訓來自 D-119）。

```

修改既有檔案：

```

src/components/TiptapEditor.tsx

1.BlockMath / InlineMath 改用 .extend({ addNodeView, addInputRules: () => [] })

接上 createObsidianMathNodeView；addInputRules() 回傳空陣列停用官方預設的 $$/$$$ 輸入規則，改由 ObsidianMathInput 完全接管打字即時轉換。

1.新增 ObsidianMathInput 進 extensions 陣列。
2.handleInsertBlockMath / handleInsertInlineMath 兩個 Toolbar 按鈕處理函式，

從「window.prompt() 問使用者要輸入什麼公式」改為： insertContentAt(pos, { type, attrs: { latex: "" } }) 插入一個空白公式節點， 接著 setNodeSelection(pos) 選中它 —— 這會觸發 NodeView 的 selectNode()， 讓公式自動展開成編輯狀態並 focus，使用者直接原地打字，無需再跳出視窗輸入。 （已用 jsdom 測試驗證此串接方式確實會觸發 selectNode()，見 1S.3 測試 8。）

1.更新兩個按鈕的 title 提示文字，反映新的 $ / $$ 語法（取代舊版提到 $$/$$$ 的文字）。

src/lib/markdown.ts Import / Export 全面改為真正 Obsidian 語法（取代先前官方 $$/$$$ 語法版本，見 8.22 舊版）： inlineMath  export → `$${latex}$`     （單錢字號） blockMath   export → `$$\\n${latex}\\n$$`（獨立一行的雙錢字號，前後各一行） parseInlineMarkdown() 的 inlineMathMatch 正規表達式與 token 掃描器列表同步更新為 單錢字號版本，並新增「內容前後緊鄰空白視為非公式」防呆（與 obsidianMathInput.ts 的即時輸入判斷邏輯一致，避免「$5 and$10」這類金額文字被誤判）。 createMarkdownContent() 中偵測區塊公式的獨立一行判斷從 "$$$" 改為 "$$"。

```

#### 1S.3 驗證方式與結果（jsdom + 真實 Editor 實例，非只讀程式碼）

```

npx tsc --noEmit：零錯誤。 npx next build（Turbopack production build）：成功。 一次性安裝 jsdom + tsx（npm install --no-save --no-audit --no-fund jsdom tsx）， 補齊 jsdom 缺少的版面配置 API（elementFromPoint / getClientRects / getBoundingClientRect 的假實作，否則 ProseMirror 內部滑鼠座標與捲動邏輯會直接丟例外）， 撰寫 scratch_test_math.ts 與 scratch_test_markdown.ts 兩份一次性測試檔（測試後已刪除， package.json 未變動、jsdom/tsx 已 npm uninstall 移除，符合既定的一次性測試流程）。

scratch_test_math.ts（NodeView + handleTextInput 層級，13 項全數通過）：

1.逐字輸入 "hello $x^2$ world" → 正確產生 inlineMath 節點（latex="x^2"），

且沒有殘留的 $ 字元散落在文字中。

1.逐字輸入 "$$E=mc^2$$" → 正確產生 blockMath 節點（latex="E=mc^2"）。
2.逐字輸入 "It costs $5 today and$10 tomorrow" → 不誤判為公式，文字完整保留

（驗證新增的「內容前後緊鄰空白視為非公式」防呆確實生效）。

1.對已渲染公式的 .math-preview 元素模擬真實 dispatchEvent（mousedown + click）

→ 正確展開為可編輯 <input>，值為 "$x^2$"。

1.修改編輯框內容後 dispatchEvent blur → 正確呼叫 updateInlineMath 更新 latex。
2.清空編輯框內容後 blur → 正確呼叫 deleteInlineMath 刪除整個節點。
3.編輯中按 Escape → 內容還原，不呼叫 update，latex 維持原值。
4.【對應 Toolbar 插入流程】用 insertContentAt 插入空白 latex 的公式節點後，

手動建立 NodeSelection 並 dispatch → 確認會觸發 NodeView 的 selectNode()， .math-edit 編輯框自動顯示（驗證 Toolbar 按鈕的新互動模式確實可行）。

scratch_test_markdown.ts（Markdown import/export 層級，17 項全數通過）：

1.匯入 "hello $x^2$ world" → 正確產生 inlineMath 節點。
2.匯入獨立一行 "$$\\nE=mc^2\\n$$" → 正確產生 blockMath 節點。
3.匯入 "It costs $5 and$10 total" → 不誤判為 inlineMath（防呆同步生效於 import 端）。
4.完整 export → reimport 往返測試（inline + block 同時存在）→ latex 內容不失真。
5.綜合迴歸：Heading + Callout（多段落）+ Table + TaskList + inlineMath + blockMath

全部混在同一份文件 export 再 reimport，全部節點型別與內容皆正確還原、互不干擾 （沿用 8.22.2 的「混合 block 迴歸測試」方法論，確認本次改動未破壞既有功能）。

```

**尚未做的驗證（誠實揭露，不假裝已完成）**：

```

尚未在真實瀏覽器（使用者的 VS Code + Windows 環境）中實際點擊、打字測試過。 jsdom 測試只能驗證邏輯層級行為正確，不能保證真實瀏覽器的 focus / selection / 輸入法（IME）等瀏覽器特有行為完全一致 —— 此教訓對應 D-118「jsdom 驗證是必要但不充分」， Callout 圖示選單就是 jsdom 測試全過但真實瀏覽器失敗的先例，不可假設本次一定沒有類似落差。 使用者尚未實機驗證確認，此功能狀態應標示為「已通過自動化驗證，待使用者真實瀏覽器確認」， 不可標示為「已完成並由使用者驗證」。

```

#### 1S.4 決策：真正採用 Obsidian 的 $ / $$ 分隔符慣例，取代先前官方 $$/$$$ 語法（延伸 8.22 節）

```

先前 8.22 節記錄的 LaTeX 版本，採用的是 Tiptap 官方 @tiptap/extension-mathematics 預設的輸入規則語法：雙錢字號 $$ 行內、三錢字號 $$$區塊。 本次使用者提出的需求是「真正的 Obsidian 風格」，其實際慣例是單錢字號$ 行內、 雙錢字號 $$ 區塊 —— 與官方預設語法不同（甚至互換了行內/區塊的錢字號數量）。 使用者一開始只是直接提出這個延伸需求，助理依既定的「使用者決策可能有誤時應先反問確認」 原則，向使用者確認是否要改採用非官方慣例（而非官方 $$/$$$），使用者確認後才動工， 並非未經確認就直接套用使用者的原始說法（見 00 文件第 2 節、01 文件 D-121 前後脈絡 關於「使用者決策不一定正確，遇到可能不太對的決策應先質疑或再次確認才執行」的既定原則）。 markdown.ts 的 import/export、obsidianMathInput.ts 的即時輸入判斷、 obsidianMathNodeView.ts 展開編輯時填入的原始碼格式，三處分隔符定義已全數同步為 單$ 行內 / 雙 $$ 區塊，不存在新舊語法混用的情況。

```

#### 1S.5 已知限制與待辦（誠實列出，不要假設已解決）

```

1.尚未經過真實瀏覽器測試（見 1S.3 結尾說明），下一個接手者不應假設「jsdom 全過」

等於「使用者實際打字點擊也一定正常」，應請使用者實機驗證後才能標記為完全完工。

1.Callout 圖示選單在真實瀏覽器點擊無效的問題（見 8.21.3 / D-118）依然存在，

本次改動未觸碰 Callout 相關程式碼，此問題狀態不變，使用者仍判斷為不急迫、可擱置。

1.尚未依 D-116 規則檢查是否有 package.json 變動需要提醒使用者 —— 本次確認結果是

package.json 完全沒有變動（沒有新增任何 npm 套件，katex 與 @tiptap/extension-mathematics 皆為 8.22 節就已安裝好的既有套件）， 因此本次交付不需要使用者重新 npm install，但仍在此明確記錄「已檢查、確認未變動」， 而不是略過不提，避免使用者誤以為助理忘記檢查。

1.若使用者實機測試後回報任何「沒有效果」「跟之前一樣」等模糊描述，

下一個接手者應依 D-121 先反問具體現象（完全沒反應？還是有殘留的 $ 字元？ 還是 console 有錯誤？），不要直接假設是同一類邏輯問題。

```

#### 1S.6 下一步

```

1.請使用者在真實瀏覽器（Windows + VS Code + npm.cmd run dev）實際測試：

a. 直接打字 $x^2$ / $$E=mc^2$$ 是否正確即時轉換成公式。 b. 點擊已渲染的公式是否能原地展開編輯、失焦後正確收合存檔。 c. 方向鍵在公式邊界是否能正確穿越（進出公式）。 d. Toolbar 的「x Math」「∑ Math」按鈕插入空白公式後，是否自動進入可編輯狀態 （不需要再跳 prompt 視窗）。 e. 舊有已儲存的 Markdown 檔案（若含先前官方 $$/$$$ 語法的公式）重新匯入是否仍需人工 調整 —— 目前設計為「不做語法自動遷移」，此邊界需向使用者說明清楚。

1.使用者確認真實瀏覽器行為正確後，才能將本節狀態從「已通過自動化驗證」升級為

「已完成並由使用者驗證通過」，並同步更新第 0 節狀態列與 01 文件的完成狀態。

1.若真實瀏覽器測試發現問題，優先比對是否為 D-118 類型的「jsdom 過但瀏覽器沒過」落差，

而非直接假設是同一類邏輯錯誤重新排查。

```

---

### 1T. 2026-07-30 Track G：Navigation & Overview（Command Palette + Dashboard / Home v0）完成（最新）

> 本節接續 1S 節。使用者於新對話串中要求「繼續製作」，並在確認範圍時明確指定要「把基本的筆記功能與主頁面做完」，經進一步釐清後定案為兩項具體功能：Command Palette（快速命令面板）與 Dashboard / Home 首頁 v0。本節新增的 Track 命名為 Track G，因先前 r15 的 vNext tracks 只規劃到 A~F，且 Dashboard / Home 先前在 1M/1N 節被列為「暫緩」項目（理由：需彙整多種 creatable 摘要，過早做容易受限於當時尚未完成的其他模組），本次是使用者主動指名要做，因此在既有 Core / Extended creatable 與 Learning Core 等模組已跑穩的前提下，以「輕量版」方式落地。

#### 1T.1 已完成實作

```

Track G — Navigation & Overview（Command Palette + Dashboard / Home v0）：✅ 已完成並由使用者於真實瀏覽器實機測試回報「一切正常」

```

新增檔案：

```

src/components/CommandPalette.tsx Ctrl（Windows）/ Cmd（Mac）+ K 快捷鍵開啟的命令面板 overlay。 提供兩類可鍵盤導覽（上下鍵 + Enter）與滑鼠點擊的項目：

1.Actions：固定的常用動作清單（Go to Home / Notes / Inbox / Trash、

New Note、New Study Set、Import PDF、Import Markdown、 Export current page as Markdown、Export Workspace Backup）。

1.Pages：依標題模糊比對現有 pages，依 updated_at 由新到舊排序，

無輸入時預設顯示最近 8 筆，有輸入時最多顯示 20 筆比對結果。 不新增任何資料模型，純粹是既有 handler 的一層鍵盤優先入口。

src/components/Dashboard.tsx Dashboard / Home System View 的 v0 落地版本。 統計卡片：全部頁面 / 筆記 / PDF 研究 / Study Set 四種數量統計， 純粹從既有 pages 陣列在前端即時計算（isResearchPage 以 primary_attachment_id 是否存在判斷，isPlainNote 排除 kind 為 study_set 與有 primary_attachment_id 的頁面），不新增後端聚合查詢。 快速建立區：New Note / New Study Set / Import PDF 三個按鈕， 直接呼叫既有的 NexusApp handler，不重複實作邏輯。 最近編輯清單：依 updated_at 排序取前 8 筆，點擊可直接跳轉。

```

修改既有檔案：

```

src/components/NexusApp.tsx

1.新增 isHomeMode state，與既有 isTrashMode / isInboxMode 同層級管理，

互斥切換（進入任一視圖時，其餘視圖 state 一併設為 false）。

1.新增 isCommandPaletteOpen state，並在 useEffect 中監聽全域

keydown 事件，偵測 Ctrl/Cmd+K（依 navigator.platform 判斷 Mac 用 metaKey、其餘用 ctrlKey）觸發開關切換；Escape 關閉邏輯 由 CommandPalette 元件內部處理，不與此處重複。

1.新增 handleShowHome handler，比照既有 handleShowNotes /

handleShowInbox 的寫法。

1.所有既有的「切換視圖」與「建立新頁面」流程（handleCreatePage、

handleCreateStudySet、handleDuplicatePage、Markdown / PDF import、 handleSelectPageByTitle、handleRestorePage 等）皆同步補上 setIsHomeMode(false)，確保從 Home 視圖觸發這些動作時能正確 跳轉回對應的內容檢視，不會停留在 Home 畫面卻已經切換了 activePageId。

1.commandPaletteActions 陣列集中定義 Command Palette 的 Actions 清單，

每個 action 呼叫既有 handler，不新增重複邏輯。

1.render 邏輯新增 isHomeMode 分支：isHomeMode 為 true 時渲染

Dashboard，優先權高於 activePage?.kind === "study_set" 分支； RightPanel（Backlinks / Outgoing Links 面板）在 isHomeMode 時 不渲染，因為 Home 視圖沒有對應單一 active page 的關聯可顯示。

src/components/Sidebar.tsx

1.新增 isHomeMode / onShowHome / onOpenCommandPalette props。
2.Notes / Inbox / Trash 導覽按鈕群組上方新增「🏠 Home」按鈕，

並將 Notes 按鈕的 active 判斷條件加入 !isHomeMode。

1.搜尋輸入框右側新增一顆 "⌘K" 小按鈕（title 顯示

「開啟命令面板 (Ctrl/Cmd+K)」），點擊呼叫 onOpenCommandPalette， 作為滑鼠使用者的視覺提示與備用開啟方式，不強迫使用者記快捷鍵。

```

資料模型影響：

```

本次不新增、不修改任何 Page / Attachment / StudyItem 等既有型別欄位， types.ts / StorageAdapter.ts / IndexedDBAdapter.ts 三個資料層檔案完全未變動。 Dashboard 的統計與排序皆為前端即時計算（衍生自既有 pages 陣列）， 不是持久化欄位，因此沒有 migration 疑慮。

```

#### 1T.2 驗證方式與結果

```

npx tsc --noEmit：零錯誤。 npx next build（Turbopack production build）：成功。 npx next start 啟動 production server，curl 首頁確認 HTTP 200 且正確渲染 「Loading Nexus...」初始畫面（IndexedDB 為瀏覽器 API，SSR/production server 環境本身不會初始化資料，此為預期行為，非錯誤）。 使用者下載整份 src/ 覆蓋回本機 C:\\Users\\user\\Projects\\nexus\\src\\ 後， 於真實瀏覽器（Windows + npm.cmd run dev）測試 Home 按鈕與 Ctrl+K 命令面板，回報「一切正常」。

```

#### 1T.3 已知限制與待辦

```

1.Dashboard 統計卡片目前只有四類（全部 / 筆記 / PDF 研究 / Study Set），

未來若新增更多 Page kind（例如 Document、Presentation）， 需要同步擴充 isPlainNote / isResearchPage 等判斷函式與統計卡片。

1.Command Palette 的 Pages 搜尋目前只比對標題（不含正文全文搜尋），

與 Sidebar 既有的搜尋邏輯（含 content_text 子字串搜尋）不完全一致， 是刻意的範圍控制（保持面板回應輕量），非遺漏。

1.Dashboard 「最近編輯」清單目前不分 Notes / Trash（不含已刪除頁面），

與 Sidebar 的 Notes 視圖範圍一致。

1.本次未替 Dashboard / Command Palette 建立獨立的資料夾整理入口，

純粹是導覽與總覽層級的功能，不影響既有的 Folder / Tag 系統。

```

#### 1T.4 下一步

```

下一步候選（需使用者選擇）：

1.Study Set 後續擴充：CSV / TSV 匯入、四選一測驗模式、拼寫模式

（v0 明確排除範圍，見 8.18 節）。

1.Track D — Research（citation / paper metadata）。
2.Track F — Creatable Registry。
3.依使用者最新提出的其他需求調整。

Dashboard / Home 與 Command Palette 皆已完成並驗證通過， 不需要再重複詢問是否要做這兩項。

```

---

## 1U. 2026-07-30 Track H～M：Preferences/i18n、Sidebar UX、Drag Handle、Resizable Layout、Document kind、Note 富文字排版與匯出分級（補記＋深度審核，最新）

> **文件治理缺口說明（本節存在的原因）**：Track H 到 Track M 這六個 tracks
> 是在 1T 節（Track G）完成之後、同一個工作階段中陸續完成的，但當時只顧著
> 疊加程式碼與跑驗證，沒有回頭在 00/01/02 三份 active docs 中補上對應的
> 交接記錄——程式碼註解裡已經在用 D-126 到 D-146 這些決策編號，但
> `01-CANON-SPEC-AND-DECISIONS.md` 的決策清單卻只記到 D-125 為止，中間
> 21 個決策完全沒有正式落地文字。這是本次「深度且完整整理」審核時發現的
> 第一個、也是最大的一個問題（見第 12 節「本輪深度審核」的完整問題清單）。
> 本節依程式碼實際內容，把 Track H～M 的範圍、決策、canon 補記回來，
> 之後的 01 文件第 15.10～15.15 節與第 8.25～8.30 節會引用本節的內容展開為
> 正式的 canon / decision 條目，本節本身則作為「這六個 track 一次做完、
> 事後才補記」這個事實的忠實記錄，不假裝它們是逐一交接的。

### 1U.1 為什麼一次補六個 track（背景還原）

```

使用者在 Track G 完成後的同一個工作階段中，陸續提出多輪小範圍需求 （語言偏好持久化、Sidebar 我的最愛/重新命名、Notion 風格拖曳排序、 側欄可拉伸與收合位置修正、新增 Document 頁面種類、Note 富文字排版與 帳號設定移位等），每一輪都比照既有的低風險 track 節奏（不新增/不動搖 核心資料模型、每次改動後 tsc + build 驗證）逐步完成，因此沿用既有的 Track 命名習慣依序編號為 H、I、J、K、L、M。 最後一輪使用者提出「九點需求」（見下方 1U.7）並在文件治理上要求 「深度且完整地整理、完善、分析問題並提出建議」，這才觸發了本次 回頭補記與審核（見第 12 節）。

```

### 1U.2 Track H：Preferences（偏好設定）／ i18n 多語系

```

完成狀態：✅ 已完成，通過 tsc / build 驗證。 新增檔案： src/lib/i18n.ts             多語系字典（English / 繁體中文），translate() 支援 {{paramName}} 字串替換，detectDefaultLanguage() 依瀏覽器語言推測預設值。 src/lib/LanguageContext.tsx LanguageProvider + useLanguage() hook，包在 NexusApp 最外層（NexusApp 元件本身只負責 讀寫 IndexedDB 語言偏好，實際 state 管理與 t() 翻譯函式由 Provider 提供）。 修改既有檔案： StorageAdapter.ts / IndexedDBAdapter.ts 新增 getLanguagePreference() / setLanguagePreference()，沿用與 active_page_id 完全相同的 settings store 存取模式（key/value record），不新增額外 object store， 也不引入 localStorage，維持「偏好設定與筆記資料同一個 IndexedDB」 的 local-first 一致性。 NexusApp.tsx 初始化流程：讀取已儲存的語言偏好；若使用者從未手動選過， 回退到 detectDefaultLanguage()（瀏覽器語言偵測）。 幾乎所有元件的使用者可見文字（導覽標籤、按鈕、tooltip、空狀態文字、 alert()/confirm() 訊息）全面改用 t() 翻譯，不允許中英文混雜或 保留寫死的英文字串。 範圍原則： 目前只做 English / 繁體中文兩種語言，但語言清單（SUPPORTED_LANGUAGES） 與翻譯字典（DICTIONARIES）分開設計，未來新增語言只需三步： Language type 新增字面值、SUPPORTED_LANGUAGES 新增一筆、 DICTIONARIES 新增一份翻譯（缺的 key 會 fallback 回英文）。

```

### 1U.3 Track I：Sidebar UX（我的最愛 / 重新命名）

```

完成狀態：✅ 已完成，通過 tsc / build 驗證。 資料模型變更： Page 新增 is_favorite?: boolean（缺省視為 false，向後相容舊資料）。 新增邏輯（NexusApp.tsx）： handleToggleFavorite(id)：純粹切換 is_favorite 布林值，走既有的 auto-save pipeline（scheduleSave），不新增獨立儲存流程。 handleRenamePage(id, title)：與既有的 handleTitleChange 邏輯相同， 差別在於可對任一頁面重新命名（不限於目前開啟中的 activePage）， 因此接受 id 參數而非隱含使用 activePageId，讓 Sidebar 可以直接在 清單項目上重新命名，不需要先切換到該頁面。 Sidebar UI 變更： PageItemMenu「⋮」選單新增「加入 / 移除最愛」（★/☆）與「重新命名」 （✏️）兩個選項；重新命名採「原地將標題文字換成輸入框」的互動 （見 D-128），Enter 確認、Escape 取消、失焦自動確認。 清單項目文字前綴：is_favorite 為 true 時顯示 ★ 圖示。

```

### 1U.4 Track J：Notion 風格 Drag Handle（段落拖曳重排）

```

完成狀態：✅ 已完成，通過 tsc / build 驗證；此輪（Track M）進一步修正 觸發範圍問題，見 1U.6。 新增套件（精確版本 3.27.1，--save-exact）： @tiptap/extension-drag-handle @tiptap/extension-node-range（DragHandle 依賴它才能正確選取「整個 block」而非只選到文字游標，必須在 DragHandle 之前註冊） 實作方式： render() 手動建立 DOM 元素（本專案沒有使用 @tiptap/react，採用官方 文件的 vanilla JS 用法），內容為「⠿」字元，樣式集中寫在 TiptapEditor.tsx 的 <style> 區塊 .nexus-drag-handle 選擇器。 只啟用頂層 block 拖曳（不啟用 nested，例如清單項目內部），避免 新手使用者不小心把巢狀清單拖到奇怪的位置。 已知限制（本輪修正前）： 拖曳把手只在滑鼠移到文字內容正上方時才會浮現，移到該行左側的視覺 留白區域完全沒有反應，使用者回報「卡手」，見 1U.6 的修正記錄。

```

### 1U.5 Track K：Resizable Sidebar / RightPanel、收合位置修正

```

完成狀態：✅ 已完成，通過 tsc / build 驗證。 新增檔案： src/components/ResizablePanel.tsx  包住 Sidebar / RightPanel 的可拉伸 容器（D-135）。side 決定拖曳把手在容器的哪一側，拖曳時在 document 層級監聽 mousemove/mouseup（避免滑鼠移動太快超出把手範圍時遺失 事件），並支援 bottomInset prop（見下方已知問題）。 職責邊界修正（D-136）： 先前版本 ResizablePanel 自己管理「收合/展開」狀態，並在面板邊緣浮出 一顆獨立的箭頭按鈕，使用者回報這顆浮動按鈕位置卡手、體感不一致。 改為「受控」模式：收合狀態改由外層（NexusApp）管理，「切換收合」的 觸發按鈕移進 Sidebar / RightPanel 自己的標頭列（取代原本「多選」 按鈕的位置），觸發點固定在使用者熟悉、視覺穩定的位置。 連動調整：Sidebar 的「多選」按鈕移到 Notes 導覽列右側；Inbox / Trash 導覽按鈕移到 Sidebar 最下方並固定（不隨筆記清單捲動）。 Bug 修復（flex 裁切問題，過程教訓已寫入 AI 協作規則）： Sidebar.tsx 的筆記清單容器（flex-1 overflow-y-auto）與 RightPanel.tsx 的對應容器都補上 min-h-0；ResizablePanel.tsx 內部的 flex-1 容器 也補上 min-h-0。根本原因：flex item 的預設 min-height: auto 會讓 overflow-y-auto 的子區塊無法正確收縮、內容溢出被外層 overflow-hidden 裁切，而不是正確地產生捲動軸；這與「浮動按鈕消失」是同類型但不同 根因的問題（後者是被 Next.js dev 工具指示器視覺遮擋，見既有的 AI 協作規則）。

```

### 1U.6 Track L～M：Document kind、新建入口收斂、Note 富文字排版分級、匯出範圍分級、帳號設定移入 Sidebar、拖曳把手觸發範圍擴大

> 本節是 2026-07-30 使用者提出「九點需求」後完成的最後一批改動，範圍最大，
> 也是本次深度審核的直接觸發點。九點需求原文與確認過程見 1U.7。

```

完成狀態：✅ 全數完成，通過 tsc / build 驗證，並用 Playwright headless Chromium 實測驗證（不只是編譯檢查），詳見 1U.8 驗證記錄。

```

**Track L — Document 頁面種類 + 新建入口收斂到 Home（D-140/D-141/D-142）**

```

資料模型變更： PageKind 從 "note" | "study_set" 擴充為 "note" | "document" | "study_set"。 新增 PageFormat 型別："flow" | "a4" | "16:9" | "4:3" | "custom"， Page 與 CreatePageInput 新增 format?: PageFormat 欄位（缺省視為 "flow"，向後相容）。目前只記錄使用者建立頁面時選擇的格式，尚未 實作對應的排版引擎（A4 分頁計算、簡報模式預覽等留待後續 track， 這是使用者在 ask_user 澄清時明確選擇的範圍收斂）。 IndexedDBAdapter.createPage() 寫入 format 欄位。 新增檔案： src/components/NewPageDialog.tsx  Home 首頁「新建」的兩步驟對話框： 步驟 1 選類型（文檔 📄 / 筆記 📝 / 學習集 🗂，「記事本」不是獨立 類型，只是筆記的別稱，此點已由使用者 ask_user 確認）； 步驟 2（僅文檔/筆記需要）選格式：文檔（流動/A4/自訂）、 筆記（流動/A4/16:9/4:3）；學習集沒有版面格式概念，選擇後直接建立。 新建入口收斂： Sidebar 移除獨立的「新增」ToolbarDropdown（連同 onCreatePage / onCreateStudySet props 一併移除），只保留「匯入」下拉選單。 Dashboard 改為單一「➕ New」按鈕，點擊開啟 NewPageDialog， handleConfirmNewPage 依 kind 分派呼叫 onCreateDocument / onCreatePage / onCreateStudySet。 Dashboard 統計卡片從 4 個擴充為 5 個（全部頁面/文檔/筆記/PDF研究/ 學習集），isDocumentPage() 判斷函式新增。 Logo 跳轉首頁 + Home 預設畫面： Sidebar「Nexus」logo 從純文字 <span> 改為 <button onClick={onShowHome}>。 NexusApp 的 isHomeMode 初始值從 useState(false) 改為 useState(true)， Home 現在是預設進入的畫面。 Sidebar 移除獨立的「🏠 Home」按鈕（因為 Home 已是預設畫面，且 logo 點擊已可回首頁，不需要重複入口）。 NexusApp.tsx 新增 handleCreateDocument（與 handleCreatePage 幾乎相同， 但 kind: "document"），Command Palette actions 陣列新增 new-document 項目。

```

**Track M — Note 富文字排版分級、匯出範圍分級、帳號設定移入 Sidebar、拖曳把手觸發範圍擴大（D-143/D-144/D-145/D-146）**

```

Editor 富文字排版分級（D-145）： TiptapEditor 新增 variant?: "rich" | "plain" prop： "rich"  Note 使用，完整排版工具列（字體/字級/顏色/對齊/螢光筆）， 對應「以 Word / Google 文件 / Gamma 為參考」的需求，範圍 已由使用者 ask_user 確認縮小為「Tiptap 官方擴充套件可以 直接做的部分」，分欄/圖表等更複雜排版功能不列入本次範圍。 "plain" Document 使用，維持單純的文字書寫體驗（概念類似記事本 / VS Code），不啟用這些擴充，確保內容能被既有 markdown.ts 邏輯完整還原。 新增套件（精確版本 3.27.1，--save-exact）： @tiptap/extension-text-style（TextStyleKit 一次提供 TextStyle 底層 mark、Color、FontFamily、FontSize、LineHeight、BackgroundColor 六種能力，本專案用 .configure({ backgroundColor: false, lineHeight: false }) 只啟用需要的部分——@tiptap/extension-color 與 @tiptap/extension-font-family 都只是從這個套件 re-export， 不需要單獨安裝，過程中一度誤裝又移除） @tiptap/extension-text-align（段落對齊：左/中/右/兩端對齊） @tiptap/extension-highlight（螢光筆，multicolor: true） EditorPane.tsx 用 key={page.kind === "document" ? "plain" : "rich"} 強制在頁面種類改變時重新掛載 TiptapEditor（因為 extensions 陣列 只在 useEffect(() => {...}, []) 掛載當下決定一次，key 改變觸發 React unmount 舊實例、mount 新實例，才能正確套用不同的 extensions 組合），同時傳入 variant prop。 ⚠️ 本輪排查記錄：先前一度懷疑這個 key 機制沒有生效，導致 Note 頁面工具列不顯示富文字功能；後續用更精確的 Playwright 選擇器 重新測試後，證實是測試腳本本身用 :has-text("Note") 這種不精確、 不分大小寫的選擇器，誤比對到「文檔」選項描述文字裡的 "like a notebook" 而點錯按鈕，程式碼本身沒有問題，key 機制 運作正常。此教訓已寫入下方 1U.9「排查方法論補充」。

匯出範圍分級（D-146）： Document（kind === "document"）：以純文字為主，Markdown 能完整還原 內容，維持既有的 Markdown 匯出（沿用 pageToMarkdown / markdown.ts 既有邏輯），PageItemMenu 只顯示「匯出為 Markdown」一項。 Note（kind === "note" 或未設定，含 PDF research note）：字體/字級/ 顏色/對齊等排版資訊無法用純 Markdown 語法完整表示，因此改為只 提供兩種匯出：

1.匯出為 PDF：Nexus 本身不內嵌 PDF 產生引擎（避免額外大型

依賴），改用瀏覽器原生列印功能（window.print()），搭配 globals.css 新增的 @media print 規則，只保留目前頁面的正文 內容（.nexus-print-target 區塊），隱藏 Sidebar / 右側面板 / 工具列（.nexus-print-hide）。handleExportPageAsPdf 邏輯： 先確保該頁是 active page，flushSave 後延遲 50ms 呼叫 window.print()。

1.匯出為 Nexus 頁面（.nexus.json）：downloadJsonFile 匯出

{ schema_version: 1, exported_at, page }，保留 content_json 完整還原所需的所有資訊。 NexusApp.tsx 新增 handleExportPageAsPdf、handleExportPageAsNexusJson， 移除原本只匯出 active page 為 md 的 handleExportMarkdown（保留並 強化 handleExportPageMarkdown(id) 給 Document 用）。 Command Palette 的 export-markdown 項目改名為 export-current-page， 依 activePageRef.current.kind 動態判斷呼叫 handleExportPageMarkdown 或 handleExportPageAsPdf。

帳號 / 設定移入 Sidebar（D-143）： 新增 src/components/AccountSettingsRow.tsx，取代前一輪建立、本輪 刪除的 src/components/BottomLeftPanel.tsx（原本是 position: fixed 的畫面角落浮動橫欄）。 掛載在 Sidebar 最底部（Inbox / Trash 固定區塊之後），左側帳號區 （👤 頭像 + "Guest" 文字，點擊展開「帳號登入功能尚未開放」的 佔位提示——Nexus 目前完全 local-first，沒有後端/資料庫/驗證機制， 這是既有原則的延續，不是本輪新決策）；右側 ⚙️ 齒輪設定按鈕， 定位邏輯比照 PageItemMenu（觸發點偏右側），點擊展開語言選單。 🟡 本次深度審核發現的遺留問題：ResizablePanel 呼叫 Sidebar 時仍帶 bottomInset={64}，這個 prop 原本是為了替已刪除的 BottomLeftPanel （fixed 浮動橫欄）預留畫面底部空間、避免視覺重疊；但 AccountSettingsRow 已改為 Sidebar 內部 flex 容器的一部分（不再是 fixed 定位），bottomInset 的存在已失去原本目的，反而在 Sidebar 底部造成約 64px 的多餘空白（已用 Playwright 實測截圖確認，見 99-ZERO-LOSS-AUDIT... 或 02-PROJECT-LOG... 中的截圖記錄）。這是 死代碼／視覺缺陷，尚未修正，留待下一輪處理，見第 12 節建議 R-1。

拖曳把手觸發範圍擴大（D-144）： 使用者反映拖曳把手（⠿）只在滑鼠移到文字正上方才會浮現，移到該行 「左側留白區域」時完全沒有反應。 根本原因：@tiptap/extension-drag-handle 的 mousemove 偵測只綁定在 編輯器內容本身的 DOM 元素（.nexus-tiptap-editor）上，而文字左側 那塊視覺留白其實屬於外層容器 EditorPane.tsx 的 padding（48px 64px），不屬於這個元素，滑鼠移過去自然偵測不到任何 mousemove 事件（已檢視 node_modules 內 drag-handle 套件原始碼確認此機制）。 修正方式：CSS 負外距 + 對稱內距技巧，在 .nexus-tiptap-editor 加上 margin-left: -56px; padding-left: 56px;——文字視覺位置完全不變 （margin 負值與 padding 正值互相抵銷），但編輯器內容元素的可偵測 範圍確實往左擴大 56px。 已用 Playwright 精確計算文字行的 bounding box、將滑鼠移到文字起點 再往左 30px 處，確認 .nexus-drag-handle 的計算樣式為 { display: "flex", visibility: "visible", opacity: "1" } 驗證通過。

```

### 1U.7 使用者提出的「九點需求」與確認過程（Track L/M 的直接起點）

```

1.筆記中「⠿ 拖曳把手」的觸發範圍：滑鼠移到該行左側（不只是文字正

上方）也應該出現 → 見 1U.6 拖曳把手觸發範圍擴大。

1.點擊左上角「Nexus」logo 時直接跳轉至首頁；預設介面設為首頁；

Sidebar 不需要重複的「Home」按鈕 → 見 1U.6 Track L。

1.新建功能整合：只保留首頁（Dashboard）中的新建，Sidebar 不再重複

提供建立入口。新建應包含類型選項：文檔、筆記、學習集 → 見 1U.6 Track L；「記事本」經 ask_user 確認不是獨立類型，只是 筆記的別稱，故不單獨存在。

1.新建文檔與筆記時應該跳出格式選項對話框：文檔（流動/A4/自訂）、

筆記（流動/A4/16:9/4:3）；有分頁的格式未來應能以簡報模式預覽 → 見 1U.6 Track L NewPageDialog；簡報模式預覽功能明確留到後續 track（經 ask_user 確認），本次只記錄格式選擇，不做排版引擎。

1.筆記經過富文字排版升級後，只能以 PDF 或 Nexus 自家格式匯出（不再

支援 Markdown，因為排版資訊無法用純 Markdown 完整表示） → 見 1U.6 Track M 匯出範圍分級；經 ask_user 確認採用此方案。

1.筆記編輯器缺少的功能（以 Word、Google 文件、Gamma 為參考）：字體、

字型大小、字體顏色、對齊方式、基礎版面配置（分欄、圖表…） → 範圍經 ask_user 確認縮小為字體/字級/顏色/對齊/螢光筆這些 Tiptap 官方擴充套件可以直接做的部分，分欄/圖表等複雜排版未列入本次範圍， 見 1U.6 Track M 富文字排版分級。

1.「文檔」的概念應該類似記事本或 VS Code，是以文字為主的純文字

文檔，因此應該能以 MD 檔匯出 → 見 1U.6 Track L/M（Document 與 Note 的匯出範圍刻意相反：Document 只有 MD，Note 沒有 MD）。

1.帳號與設定的位置要放在 Sidebar 內部，跟收件匣、垃圾桶一樣屬於

側邊欄固定區塊的一部分（不是畫面角落的獨立浮動元件）；設定齒輪 圖示的定位邏輯應比照每篇筆記的「更多操作」——觸發點偏右側 → 見 1U.6 Track M 帳號/設定移入 Sidebar。

1.對現有四份交接文件進行一次深度且完整的整理、完善、分析問題與

提出建議 → 即本次審核，見第 12 節；使用者明確表示「等這輪程式碼 改完之後再做」，因此在 1、2、3、4、5、6、7、8 全部完成並驗證通過 後才開始本節與第 12 節的文件工作。

```

ask_user 確認記錄（架構變更前先問，既有協作原則的延續）：

```

「記事本」是否為獨立類型 → 使用者選「不是，只是筆記的別稱」。 筆記排版升級後的匯出範圍 → 使用者選「筆記僅支援 PDF/自家格式匯出」。 頁面格式選擇器（A4/自訂等）的實作範圍 → 使用者選「先做文檔類型本身 （純文字+MD匯出），格式選擇器/簡報預覽留到下一輪」。 深度審核四份文件的時機 → 使用者選「程式碼改完後再做」。

```

### 1U.8 驗證記錄（Playwright 實測，不只是編譯檢查）

```

npx tsc --noEmit：零錯誤。 npx next build（Turbopack production build）：成功。 以下項目皆用 Playwright headless Chromium 實際互動測試通過（不是單靠 自動化編譯檢查，因為過去曾多次遺漏真實瀏覽器才會出現的 bug）：

1.拖曳把手左側觸發範圍擴大：見 1U.6。
2.新建對話框：兩步驟（選類型→選格式）皆正確顯示，Document/Note/

Study Set 三種類型與對應格式選項符合預期。

1.Note 富文字工具列：實際點擊字體/字級/顏色/對齊/螢光筆，檢查

DOM 是否真的套用樣式（而不只是「有沒有出現在畫面上」），確認 <p> 元素正確套用 font-family / font-size / text-align， <mark> 正確套用螢光筆。

1.Note 匯出選單：顯示「Export as PDF」「Export as Nexus page」，

不含 Markdown。

1.Document 匯出選單：顯示「Export as Markdown」，不含 PDF/Nexus。
2.PDF 列印預覽：用 page.emulateMedia({ media: "print" }) 模擬列印

媒介截圖，確認 Sidebar / RightPanel / 工具列皆正確隱藏，只留 正文內容。

1.Logo 跳轉首頁：建立筆記後點擊 logo，確認正確跳轉回 Home 畫面。
2.Sidebar 底部設定選單：點擊齒輪展開語言選單，位置正確（右側

觸發、往上展開，比照 PageItemMenu 的定位邏輯）。

1.Console 全程無 JS 錯誤。

```

### 1U.9 排查方法論補充（延續既有的教訓清單）

```

新增教訓：用 Playwright 撰寫互動測試時，:has-text() 選擇器預設是 「子字串、不分大小寫」比對，若頁面上有多個元素的文字包含相同 子字串（例如「筆記」的英文 Note 恰好是「記事本」描述文字 notebook 的子字串），可能會選到非預期的元素而導致誤判為 「功能沒有生效」，實際上是測試腳本本身的選擇器不夠精確。 建議優先用正則表達式錨定開頭（例如 { hasText: /^📝Note/ }）或直接 用更明確的 CSS 選擇器（例如帶 data-testid 屬性），避免因為選擇器 過於寬鬆而得出錯誤的 bug 判斷，浪費排查時間。本次即因此教訓， 重新驗證後才發現 Note 富文字工具列其實從一開始就運作正常。

```

---

## 6. 下一個 AI 第一輪要做什麼

若只是全新接手且尚未確認本機狀態，可先做健康檢查；但目前主線已經進入 MVP-2 Step 3，請不要把流程退回「等待確認是否進 MVP-2」。若要繼續實作，先取得 `src/components/NexusApp.tsx` 與 `src/lib/types.ts`，再產出 PDF import flow patch。

請引導使用者執行：

```

cd C:\\Users\\user\\Projects\\nexus npm.cmd run dev

```

用途：

```

cd：進入 Nexus 專案資料夾。 npm.cmd run dev：在目前 session 啟動 Next.js dev server。

```

如果成功看到 `localhost:3000`，不要停留在 dev server 問題，進入 MVP-1 regression QA。

如果失敗：只修 dev server 問題，不新增功能，請使用者貼完整錯誤訊息。

MVP-1 regression QA 至少涵蓋：

```

建立 / 編輯 / 刪除筆記 → 重整後狀態正確 標籤新增 / 刪除 / 過濾 → 與搜尋字串可交集 資料夾歸屬 → 重整後分組仍正確 Wikilink [[Title]] → Backlinks 與 Outgoing Links 面板呈現 點擊不存在的 Wikilink → 詢問後自動建立並跳轉 刪除 active page → 不白屏、不復活 beforeunload → 半空中輸入仍存檔

```

---

## 7. 必做 verify checklist

請檢查這些檔案：

```

src/components/TiptapEditor.tsx src/components/NexusApp.tsx src/lib/types.ts src/lib/StorageAdapter.ts src/lib/IndexedDBAdapter.ts src/app/globals.css

```

檢查項目：

```

[ ] TiptapEditor 是否使用 editor.getJSON() [ ] TiptapEditor 是否同時回傳 editor.getText() [ ] TiptapEditor 切換 page 時是否用 content_json 還原 [ ] NexusApp 是否保存 content_json + content_text [ ] content_text 是否只作搜尋 / 預覽衍生資料 [ ] Auto-save 是否仍為 800ms debounce [ ] StorageAdapter.savePage 是否更新 updated_at / revision / device_id [ ] delete UI 是否呼叫 StorageAdapter.deletePage [ ] deletePage 是否為 soft delete，不是 hard delete [ ] 刪除 active page 後是否選下一頁或建立新頁 [ ] refresh / 重開後 active page 是否恢復 [ ] `#` + 空白是否仍可轉 heading [ ] list / blockquote / heading 是否可保存格式 [ ] console / build / runtime 是否無錯誤

```

---

## 8. MVP-1 完工紀錄與後續方向

MVP-1 實作順序已全數完成：

```

Step 0：健康檢查           ✅ Step 1：Verify + 收斂修復  ✅（content_json 真相、閉包雷、白屏、beforeunload） Step 2：Search v0          ✅（記憶體子字串過濾） Step 3：Sidebar polish     ✅（active indicator、clear button、focus ring） Step 4：Tags first         ✅（含復活連動 Bug 修復） Step 5：Lightweight Folders ✅（含字體 14~16px 升級） Step 6：Backlinks          ✅（Wikilink 解析 + Right Panel + 點擊跳轉/自動建立）

```

後續方向（已更新）：

```

MVP-2 — 學習 / 研究工具（已由使用者確認為下一階段） 正式範圍：

1.attachments 基礎能力
2.PDF 匯入
3.PDF 閱讀 viewer
4.research note 與 PDF 關聯
5.citation / paper metadata
6.LaTeX equation（inline + block）

規格原則：

- Page 仍是內容主體
- content_json 仍是正文唯一真相
- PDF / attachment 不建立平行產品模型
- research metadata 優先走 Property 系統，不硬塞大量 Page 固定欄位
- UI 可先提供「一篇 PDF 對應一篇主研究筆記」流程

但資料模型不寫死一對一

- PDF 第一版可先做成與 Page 關聯的 viewer

不強迫第一版就完成完整 Page Mode 架構化重構

- annotation / highlight 不列入 MVP-2 主完成條件，延後到後續子階段評估

MVP-3 — 時間管理整合 tasks projection（從 content_json 抽出 task block） events projection（從 property_values 抽出時間） Calendar view / Board view

跨階段觀察項： SQLite + Drizzle 評估（若 Backlinks 全站比對在大量筆記下變慢，再啟動） Stable Block ID 補強（為未來 block-level backlinks 與多人協作預留） Command Palette（Search 與 Sidebar 穩定後可啟動）

```

不為任何新功能提前遷移 SQLite，除非實測效能或資料模型瓶頸出現。

---

## 12. 2026-07-30 本輪深度審核：四份交接文件的整理、完善、問題分析與建議

> 本節回應使用者第九點需求：「對現有四份交接文件進行一次深度且完整的整理、完善、分析問題與提出建議，考量決策是否可優化、是否有矛盾或遺漏內容，達成方案最佳化」。使用者已明確表示此事排在本輪程式碼改完之後，因此本節是在第 1～8 點需求（Track L/M）全數完成並驗證通過後才進行。

### 12.1 審核範圍與方法

```

審核對象：00-HANDOFF-STATUS-AND-AI-RULES.md、01-CANON-SPEC-AND-DECISIONS.md、 02-PROJECT-LOG-DETAILED.md、99-ZERO-LOSS-AUDIT-AND-SOURCE-ARCHIVE.md。 方法：

1.逐份確認章節結構、最新狀態摘要與決策編號範圍。
2.交叉比對「程式碼註解中實際引用的 Track / D- 決策編號」與「01 文件

正式記錄的決策清單」，找出兩者的落差。

1.實際重新啟動 dev server，用 Playwright 對照文件宣稱的完成項目

（尤其是本次修改最多的 Track L/M）逐一重新驗證，不是只讀文件 內容就假設為真。

1.檢查程式碼中是否有文件沒提到、但實際存在的 bug 或死代碼。

```

### 12.2 發現的問題

**問題 1（嚴重，已修正）：決策編號 D-126～D-146 長期未寫入正式決策清單**

```

現象：src/ 底下多個檔案的註解引用 D-126、D-128、D-130、D-131、D-132、 D-133、D-135、D-136、D-138、D-139、D-140、D-141、D-142、D-143、 D-144、D-145、D-146 共 17 個決策編號（另外 D-127、D-129、D-134、 D-137 這 4 個編號被跳過未使用，可能是命名時預留但最終沒有對應到 獨立決策，也可能是散落規劃中的編號誤跳，無法從現有記錄還原原因）， 但 01-CANON-SPEC-AND-DECISIONS.md 第 15 節的決策清單只記錄到 D-125（15.9 節）為止，完全沒有 15.10 節以後的內容。 影響：下一個接手的 AI 若照本文件既有的「00 = 最新狀態、01 = 既定 事實與決策」的權威原則工作，會誤以為 D-125 是最新決策，看不到 Track H~M 這六個 track 的完整決策脈絡與理由，等於文件治理原則 本身出現了空窗期。 根因：Track H~M 是在同一個工作階段中連續完成的（見 1U.1），當時 重心放在程式碼實作與 tsc/build/Playwright 驗證，沒有依照既有習慣 在每個 track 完成後同步回補 00/01 文件，直到使用者提出第 9 點 要求「深度審核」才被系統性發現。 處理：已於本次審核在 00 文件新增 1U 節完整補記 Track H~M 的範圍、 背景與 canon 內容；01 文件新增 15.10～15.15 節正式記錄 D-126～ D-146（含跳過的編號如何處理，見下方決策記錄）；02 文件新增對應的 詳細日誌條目（回溯性質，會標註「本則為事後回補」）；99 文件新增 r16 audit 條目與更新後的 bytes/lines/sha256。

```

**問題 2（中等，尚未修正，已記錄為待辦 R-1）：ResizablePanel 的 bottomInset 死代碼**

```

現象：src/components/NexusApp.tsx 呼叫 <ResizablePanel side="left" ... bottomInset={64}> 包住 Sidebar，這個 64px 的底部留白原本是 Track K 時期為了替「BottomLeftPanel」（畫面左下角、position: fixed 的獨立 帳號/設定浮動橫欄）預留空間、避免視覺重疊而設計的。 但 Track M 已經把 BottomLeftPanel 整個刪除，改用內嵌在 Sidebar 內部 flex 容器最下方的 AccountSettingsRow 取代（不再是 fixed 定位）。 bottomInset={64} 這個 prop 呼叫沒有被一併移除，導致 Sidebar 容器 在畫面最底部多出約 64px 的空白區域，AccountSettingsRow 之下留下 一段不屬於任何功能的空白。 影響：純視覺缺陷，不影響資料正確性或功能可用性，但會讓 Sidebar 看起來「切短了一截」，尤其在視窗較矮的螢幕上更明顯。 驗證方式：已用 Playwright 截圖確認 <aside> 與其外層 wrapper 的 boundingBox 高度相同（836px，在 900px 高的 viewport 下），代表 Sidebar 沒有把 bottomInset 這段空間讓給任何看得見的東西，純粹是 容器整體被縮短、下方留白。 建議修正：移除 NexusApp.tsx 中該處的 bottomInset={64}（或改為 0 / 拿掉該 prop 使用預設值 0），讓 Sidebar 恢復佔滿可用高度。這是一行 改動，風險極低，建議下一輪優先處理（見第 16 節「可優化但不阻塞」 表格新增條目，以及本節 12.4 R-1）。

```

**問題 3（輕微，資訊性質）：D-127 / D-129 / D-134 / D-137 編號空缺**

```

現象：程式碼註解使用的決策編號序列中，D-127、D-129、D-134、D-137 這四個號碼被跳過，沒有任何檔案引用它們。 可能原因（無法從現有紀錄確定，誠實記錄推測）： a. 命名時原本規劃要做但後來合併進相鄰的決策裡（例如 D-126/D-128 之間的功能被合併只留一個決策編號）。 b. 純粹是編號時的疏漏或跳號，沒有實質內容遺失。 處理方式：不強行回填假決策內容湊數，而是在 01 文件的決策清單中 明確註記「D-127 / D-129 / D-134 / D-137：編號保留但未使用， 無對應決策內容，經核對程式碼與過程記錄後確認不影響任何現有功能」， 誠實保留這個空缺，不製造不存在的歷史。

```

**問題 4（輕微，文件一致性）：檔案結構表長期只更新到 Track G**

```

現象：00 文件第 4 節「應存在的實際檔案結構」表格在 Track G 完成後 就沒有再更新，Track H~M 新增的 8 個檔案（i18n.ts、LanguageContext.tsx、 ToolbarDropdown.tsx、PageItemMenu.tsx、ResizablePanel.tsx、 CommandPalette.tsx、Dashboard.tsx、NewPageDialog.tsx、 AccountSettingsRow.tsx）都沒有出現在表格裡（部分屬於 Track G 但 也一併漏更新）。 處理：已在本次審核中重寫該表格（見第 4 節），涵蓋目前 src/ 底下 全部 28 個檔案，並標註各檔案對應的 Track / 決策編號。

```

**問題 5（觀察，非缺陷）：Page.default_mode 欄位隨 Track L 後語意更模糊**

```

現象：r15 深度稽核（D-102）已經指出 default_mode 不應同時代表「頁面 種類」與「顯示模式」，並用 Page.kind 欄位開始拆分（Track C）。 Track L 新增 kind: "document" 後，這個拆分方向被進一步驗證有效—— Document 與 Note 現在有明顯不同的功能集合（工具列、匯出範圍）， 完全靠 kind 欄位區分，default_mode 欄位本身在 Page interface 中 仍固定寫死為 "note" 字面型別（見 types.ts），沒有實際作用。 判斷：這不是本輪新增的問題，是 r15 已知並刻意保留的過渡策略（避免 一次變動過多資料模型），但隨著 kind 的使用場景越來越多（note / document / study_set，未來可能還有 presentation / pdf_research）， default_mode 這個名存實亡的欄位所帶來的「兩個欄位混淆」風險也 越來越高。建議見 12.4 R-2。

```

### 12.3 決策健康度檢查（是否有矛盾或不明智之處）

```

1.Note vs Document 的匯出範圍刻意分歧（Note 無 MD、Document 有 MD）

——這不是矛盾，是刻意的產品設計決策，且有清楚的技術理由（排版 資訊無法用純 Markdown 完整表示），使用者已在 ask_user 確認， 判斷健康，不需要調整。

1.PageFormat 目前只記錄不生效（沒有排版引擎）——已由使用者在

ask_user 中明確接受此範圍收斂，不是被動遺漏，是主動決策， 判斷健康。下一輪若要做排版引擎，建議獨立成一個新 track，不要 跟其他功能混在一起做，避免範圍蔓延。

1.Track 命名到 M 為止，尚未接續 r15 規劃的 Track A~F 序列——目前

Track 命名事實上有兩套並行的序號系統：r15 規劃的 A~F（Editor Blocks、Capture & Inbox、Learning Core、Bulk Select、Safety Backup、Creatable Registry）與之後陸續冒出的 G~M（多半是使用者 臨時提出的新需求，不在原本 r15 規劃內）。這兩套序號目前沒有 矛盾（沒有重複使用同一個字母代表不同功能），但長期下去容易讓 「Track 清單」失去可讀性，建議見 12.4 R-3。

1.「已知未解問題」（Callout 圖示選單點擊無效）與本輪多個 track 都

沒有交集，維持原狀擱置，正確，不需要在本輪順便處理範圍外的問題。

```

### 12.4 優化建議（供使用者選擇是否採納）

```

R-1（建議優先，風險極低）： 移除 NexusApp.tsx 中 <ResizablePanel side="left" ... bottomInset={64}> 的 bottomInset={64}，修正 Sidebar 底部多餘空白。這是一行程式碼 改動，預期不影響任何其他功能，可以在下一輪一開始就順手處理。

R-2（中期考慮，非急迫）： 評估是否要正式移除 Page.default_mode 欄位，或至少在 types.ts 加註 「此欄位已被 kind 取代，僅為向後相容保留，新程式碼不應讀寫此 欄位」的明確棄用（deprecated）標記，避免未來有人誤用。因為 default_mode 目前寫死為 "note" 字面型別、完全沒有實際分支邏輯依賴 它，移除的風險應該很低，但涉及型別定義變動，仍建議先用 ask_user 確認再動手（依既有協作原則，架構變更前先問）。

R-3（長期文件治理建議）： 未來如果還會有更多臨時性、不在 r15 原始 A~F 規劃內的新 track， 建議在 01 文件新增一個「Track 索引總表」，用一張表格列出所有 Track 代號（不分是否屬於原始 r15 規劃）、對應的一句話說明、 完成狀態、與對應的決策編號範圍，取代目前「要在好幾節分散的文字 中搜尋才能拼湊出全貌」的閱讀方式。這個索引表可以放在 01 文件 第 15 節最前面，之後每完成一個新 track 只需要在表格新增一列， 降低長期維護的心智負擔，也能讓下一個接手的 AI 一眼看出目前總共 有幾個 track、順序為何。 （本次審核暫不強制新增此表格，因為屬於「錦上添花」的文件體驗 優化，不是資料遺漏或矛盾，留給使用者決定是否要在下一輪一併做。）

R-4（低優先，觀察即可）： D-127 / D-129 / D-134 / D-137 的編號空缺已經誠實記錄在 01 文件， 不需要進一步處理，純粹留作歷史紀錄的透明度說明。

```

### 12.5 本次審核結論

```

四份文件的核心決策健康、沒有發現會導致功能誤判或資料遺失的嚴重矛盾。 最大的問題是治理流程上的疏漏（Track H~M 的決策內容長期沒有回補到 01 文件），已在本次審核中全數補齊，不是內容本身有錯誤，而是 「記錄的時機」延遲了。 發現一項真實存在、但影響輕微的視覺缺陷（R-1，ResizablePanel 的 bottomInset 死代碼），建議下一輪優先修正。 其餘建議（R-2、R-3、R-4）皆為中長期優化方向，不阻塞目前任何功能， 是否採納由使用者決定。 本次審核沒有發現任何需要回滾或推翻的既有決策；Nexus 目前的核心 架構原則（Page/Block 統一模型、content_json 真相、StorageAdapter、 soft delete、local-first）維持健康，不需要調整。

```


---

## 1V. 2026-07-31 Supabase 雲端同步 + UI 改善（最新）

> 本節記錄 Supabase 共享工作區同步的實作，以及多項 UI 改善。所有改動已通過 tsc + next build 驗證。

#### Supabase 雲端同步（共享工作區模式）

```

模式：共享工作區（無登入），所有人看到同一份資料，即時同步。 技術：Supabase Realtime + PostgreSQL。 新增檔案： src/lib/supabase.ts       — Supabase 客戶端單例 src/lib/syncEngine.ts     — 同步引擎（fullSync + pullChanges + push* + Realtime） .env.local                — NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY 環境變數（見 .env.local）： NEXT_PUBLIC_SUPABASE_URL=（Supabase 專案 URL） NEXT_PUBLIC_SUPABASE_ANON_KEY=（Supabase anon key，JWT 格式） 同步策略：

- 啟動時 fullSync（雙向合併，last-write-wins）
- 之後 Realtime 訂閱 pages / attachments 表變更
- 每次本機存檔同步 pushPage / pushAttachment / pushBinary 到雲端
- 遠端變更時自動 reload 本機 pages / attachments state
- 備用：每 60 秒 pullChanges 作為 Realtime 的備援

SQL Schema： pages 表（無 user_id，RLS allow all） attachments 表（無 user_id，RLS allow all） binaries 表（base64 儲存，無 user_id，RLS allow all） 已啟用 supabase_realtime publication

```

#### UI 改善項目

```

1.標題間距加大：EditorPane 標題區域 pt-8 → pt-16 pb-5，不再貼頂
2.工具列「字樣」改為 <select> 樣式：與字型下拉同區同樣式，

中文顯示「字樣」，選項為「內文 / 標題1 / 標題2 / 標題3」

1.側邊欄「+」按鈕（多選左邊）：點擊「新建筆記」或「新建文檔」時

跳出格式選擇對話框（流動/A4/16:9/4:3），與首頁「新建」按鈕一致。 「資料夾」和「學習集」仍直接建立（不需選格式）。 NewPageDialog 新增 initialKind prop 支援預選類型。

1.側邊欄排序下拉新增「☐ 依照項目類型」勾選框：

可與「最近編輯」或「自訂排序」同時使用。 勾選後項目按類型分組顯示（📝 筆記 / 📄 文檔 / 🗂 學習集）， 各組內維持所選排序模式。

1.隨時拖拽：所有項目隨時可拖拽（不限於自訂排序模式）。

拖拽時顯示 drop zone 指示：

- 拖到項目上方 → 藍色上線（插入上方）
- 拖到項目下方 → 藍色下線（插入下方）
- 拖到項目中間 → 藍色背景（變成該項目的子頁）

拖拽可改變 parent_id（拉出/拉入子頁）和同級排序。

1.子頁類型選擇：hover 到頁面項目，點右邊「+」按鈕彈出選單

（📝筆記 / 📄文檔 / 🗂學習集），新建的子頁自動設為該類型。

1.雙擊間隔縮小：自訂雙擊偵測（350ms），比瀏覽器預設（~500ms）更短，

減少誤觸。取代原生 onDoubleClick。

1.R-1 修正：移除 ResizablePanel 的 bottomInset={64} 死代碼。

```

#### 學習集（Study Set）改善

```

1.CSV/TSV 匯入：卡片管理畫面新增「📥 匯入 CSV/TSV」按鈕。

支援貼上文字或上傳 .csv/.tsv/.txt 檔案。 自動偵測逗號或 Tab 分隔。支援引號欄位。 預覽前 10 筆後確認匯入。

1.四選一測驗模式：新增「🧠 測驗」按鈕。

隨機出題，顯示正面（或背面），4 個選項（1 正確 + 3 錯誤）。 錯誤選項從同組其他卡片中隨機挑選。 卡片不足 4 張時提示「至少需要 4 張」。 即時顯示對錯反饋 + 最終得分百分比。

```

#### 新增元件

```

src/components/ColorPaletteButton.tsx — 色票選色器（50 色 + 最近使用 + 自訂色）

```


---

## 1W. 2026-07-31 使用者決策確認（下一個 AI 必讀）

> 本節記錄使用者對下一個 AI 提出的問題所做的決策確認。所有決策已反映在 01 文件中。

### B. 同步、安全性與資料衝突

**B1. Supabase 共享工作區模式**
- **決策**：保留現行「無登入、所有開啟頁面者共用同一工作區、RLS allow all」模式。
- **理由**：符合「任何進入同一網址即可共同更新」的需求。
- **未來考量**：若需加入最低限度的存取保護（共享密碼、invite token、登入），需先徵詢使用者。

**B2. 同步衝突策略**
- **決策**：**不接受** last-write-wins 作為正式 v0 行為。
- **要求**：需在近期優先實作衝突處理：
  - 新增 `revision` 衝突檢測（當 remote revision > local revision 時提示使用者）
  - 實作簡單的合併策略（保留兩者版本，讓使用者手動選擇）
  - 引入版本歷史功能（每次存檔保留歷史快照）
- **優先級**：此為近期優先工作，應在 Track D 之前完成。

**B3. Binary 儲存策略**
- **決策**：接受短期沿用 base64 儲存於 PostgreSQL 資料表（約 33% 膨脹）。
- **未來考量**：預留改用 Supabase Storage 或其他 asset storage 的升級路徑。

### C. 架構語意與資料模型

**C1. `kind` 欄位語意**
- **決策**：`kind` 作為 **creatable discriminator**，用於區分不同類型的內容，但不建立完全割裂的資料模型。
- **實作**：所有 creatable 共享 Page shell，但可依 `kind` 分流不同的功能集合與匯出策略。
- **已反映於**：01 文件 §8.3 Page schema。

**C2. `default_mode` 欄位變更**
- **決策**：未來變更需先徵詢使用者，不可逕行移除或改名。
- **理由**：目前寫死為 `"note"` 字面型別，無實際分支邏輯依賴，但與 `kind` / view mode 有舊語意重疊。
- **已反映於**：01 文件 §8.3 Page schema 註解。

**C3. Stable Block ID**
- **決策**：列為**近期優先底層工作**。
- **理由**：未來的 block reference、annotation、transclusion、精細同步都會依賴它。
- **已反映於**：01 文件 §16 表格。

**C4. PDF Research Note 語意**
- **決策**：保留「普通 Note + attachment」語意（`primary_attachment_id` 判斷）。
- **不升級**為獨立 `kind: "pdf_research"`。
- **已反映於**：01 文件 §8.3 Page schema 註解。

### D. 功能邊界與產品決策

**D1. Callout 圖示選單點擊無效**
- **決策**：維持低優先。
- **理由**：使用者判斷不急迫。

**D2. PageFormat 排版引擎**
- **決策**：近期優先實作各種格式排版（16:9 簡報預覽、A4 列印分頁等）。
- **已反映於**：01 文件 §8.3 Page schema 註解。

**D3. Study Set 拼寫模式**
- **決策**：期待是雙向拼寫、容錯比對、提示機制，但**優先度低**，可先不做。

**D4. Track D Research 優先範圍**
- **決策**：保留，未具體收斂。

**D5. Track F Creatable Registry 具體目標**
- **決策**：保留，未具體收斂。

---


---

## 從 99 文件移入的 Active docs changelog（r0~r18）

> 以下內容原為 99-ZERO-LOSS-AUDIT-AND-SOURCE-ARCHIVE.md 的 §2.1，於 2026-07-31 重構時移入本文件。99 文件已刪除。

| revision | 日期 | 觸發事件 | 摘要 |
| --- | --- | --- | --- |
| r0 | 2026-06-28 早 | 最終交接結構定案 | 採用 3 active docs + 99 archive；MVP-0 完工、MVP-1 已啟動 |
| r1 | 2026-06-28 | MVP-1 Step 1+2 完成 | content_json / delete UI verify、Search v0 上線；新增 5 筆日誌 |
| r2 | 2026-06-28 | MVP-1 Step 3 完成 | Sidebar polish |
| r3 | 2026-06-28 | MVP-1 Step 4 完成 | Tags first + 復活連動 Bug 修復 |
| r4 | 2026-06-28 | MVP-1 Step 5 完成 | Lightweight Folders + 字體 14~16px 升級 |
| r5 | 2026-06-28 | MVP-1 Step 6 完成 / MVP-1 收斂 | Backlinks（Wikilink + Right Panel）；MVP-1 全數驗證通過；新增 D-44～D-48 |
| r6 | 2026-06-28 | 對話壓縮續接資訊完整編入 / MVP-2 Step 2 狀態修正 | 補入 Step 2 已完成、聊天污染非本機 source 問題、下一步 Step 3 PDF import flow、需先取得 NexusApp.tsx / types.ts；新增 D-56 / D-57 |
| r7 | 2026-06-29 | MVP-2 Step 3 / Step 4 / Step 4-C 完成 | 補入 PDF import flow、PDF viewer 最小版、Open 按鈕、iframe key、JSX placement 排查紀錄；新增 D-58 / D-59 |
| r8 | 2026-06-29 | MVP-2 Step 5 / Step 6 完成 | 補入 PDF viewer layout polish、Small/Medium/Large、Hide/Show、pdfLoadError 三態、fragment JSX 排查；新增 D-60 / D-61 |
| r9 | 2026-06-29 | Basic Notes Foundation Step 7 Trash / Restore UI 完成 | 補入 Notes / Trash、Restore、過去 soft-deleted pages 驗證、NexusApp 整檔替換與回歸測試；新增 D-62 / D-63 |
| r10 | 2026-06-29 | Basic Notes Foundation Step 8 Permanent Delete / Duplicate Page 完成 | 補入 Trash permanent delete、Duplicate page、StorageAdapter permanentDeletePage；新增 D-64 / D-65 |
| r11 | 2026-06-29 | Basic Notes Foundation Step 9 Editor formatting toolbar 完成 | 補入 Tiptap toolbar、active state、list marker CSS 修正；新增 D-66 / D-67 |
| r12 | 2026-06-29 | Basic Notes Foundation Step 10 Markdown import / export v0 完成 | 補入 Import MD / Export MD、v0 parser、line 型別修正；新增 D-68 |
| r13 | 2026-06-29 | Basic Notes Foundation Step 10.1 Markdown v0.1 link / task list 補強完成 | 補入 link syntax 保留、task list ☐/☑ 轉換、Export 正常；新增 D-69 |
| r14 | 2026-07-02 | vNext 架構分類與大型功能邊界整理 | 補入 Core / Extended Creatables、System Views、Tools、Website 弱聯動、Quick Capture 前期重要性、降級項目；新增 D-70～D-101 |
| r15 | 2026-07-02 | 深度稽核與架構語意修正 | 修正 README 過期、00 重複 heading、01 章節順序；補入 Page kind vs default_view_mode、MVP-2 tracks、Stable Block ID、Attachment storage_key、Backup v0；新增 D-102～D-106 |
| r16 | 2026-07-30 | Track G：Navigation & Overview 完成 | 補入 Command Palette（Ctrl/Cmd+K）與 Dashboard/Home v0，使用者於真實瀏覽器實機測試回報「一切正常」；新增 D-107～D-125（含 15.1～15.9 節逐批累積的 Track A2/C/E 等決策）。⚠️ 本列為 2026-07-30 深度審核時回補，Track G 完成當下未同步新增此 changelog 列，屬於本次審核發現並修正的文件治理缺口之一 |
| r17 | 2026-07-30 | Track H～M：Preferences/i18n、Sidebar UX、Drag Handle、Resizable Layout、Document kind、Note 富文字排版與匯出分級完成 | 補入語言偏好持久化、全站中英雙語、我的最愛/重新命名、Notion 風格拖曳把手、可拖曳側欄、Document 頁面種類、Note 富文字排版工具列（字體/字級/顏色/對齊/螢光筆）、Note/Document 匯出範圍分級、帳號設定移入 Sidebar、拖曳把手觸發範圍擴大；新增 D-126～D-146（D-127/D-129/D-134/D-137 編號保留但無對應決策內容，已誠實記錄不強行回填）。⚠️ 本列同樣為回補：Track H~M 完成當下未同步新增，直到使用者提出「九點需求」第 9 點要求深度審核才發現並回補，見 r18 |
| r18 | 2026-07-30 | 深度審核：00/01/02/99 四份文件整理、完善、問題分析與建議（使用者九點需求第 9 點） | 發現並修正 r16/r17 兩批決策長期未回補的文件治理缺口；用 Playwright 重新實測 Track L/M 關鍵功能點，澄清一則先前的誤判記錄（Note 富文字工具列其實從一開始就正常運作，先前判斷「疑似沒有生效」是測試腳本選擇器不精確所致）；主動發現一項先前未記錄的真實視覺缺陷（ResizablePanel 的 bottomInset={64} 死代碼，見 00 文件第 12 節 R-1）；更新 00 文件第 4 節檔案結構表、01 文件 8.3/8.4 節資料模型描述使其與程式碼實際內容一致 |
| r19 | 2026-07-31 | 文件重構：00 精簡化 + 99 刪除 | 00 文件從 3390 行精簡為 382 行（移除詳細歷史至 02）；99 文件的 changelog 移入 02 後刪除；三份文件結構確立（00 精簡交接 / 01 規格決策 / 02 詳細日誌） |


---

## 2026-08-01 — Phase 1: 任務4+5+1+3 完成（單一+下拉扁平、MD為文檔、A4分頁引擎、雙開）

### 背景
使用者提出5項新任務：A4分頁預設、簡報獨立、雙開、匯入併入新建、MD匯入為文檔。

### 行動
- Sidebar + 改為單一扁平下拉，新建區（文檔/筆記/學習集/簡報/資料夾）+匯入區（PDF/Markdown），移除二層hover子選單
- MD匯入改為 kind=document
- PageFormatView 新增：a4灰底白紙210mm、16:9/4:3黑底預覽、flow居中，kind決定預設（Document預設a4，Note預設flow），任何分頁可還原為流動
- pageBreakExtension 新增，TiptapEditor 引入，插入下拉新增分頁符
- EditorPane 頂部新增格式切換按鈕流動/A4/16:9/4:3
- globals.css 清理重複，新增A4紙張陰影等樣式
- 雙開：secondaryActivePageId, secondaryPdfUrl，Ctrl+點擊開啟右側，右側交換/關閉按鈕，左右皆獨立編輯

### 驗證
tsc --noEmit 0, next build 成功

---

## 2026-08-01 — 任務1邏輯修正：流動原本不改，檔案下拉在工具列最左

使用者回饋：流動原本不改，僅有分頁的東西可還原為流動。希望檔案下拉在上欄最左邊如Google文件。

### 行動
- 新增 FileMenu.tsx：檔案下拉含新建、匯入、簡報轉換、格式（流動不改僅分頁可還原邏輯）、匯出/列印
- EditorPane 新增頂部檔案選單bar，後移至工具列同一行最左邊（依最新要求）
- 標題右側格式切換按鈕移除，統一由檔案選單管理
- 單一上欄+標題，內頁分頁邏輯確認

---

## 2026-08-01 — 任務3釐清：工具列右邊分頁按鈕指左右雙開分頁

使用者釐清：工具欄右邊分頁按鈕指開啟另一項目時出現左右分頁的那個分頁。

### 行動
- 工具列右側改為左右雙開控制：雙開中顯示雙開中/交換/關閉右側，未雙開顯示Ctrl+點擊提示
- 中間分隔條僅視覺線
- A4新增頁按鈕移至A4紙張下方sticky bottom

---

## 2026-08-01 — Phase 2: 簡報 Hybrid 獨立

### 背景
簡報需獨立，支援圖表、版面、示圖、目錄，用筆記製作簡報。使用者確認hybrid：筆記可一鍵轉簡報+獨立編輯。

### 行動
- types.ts：PageKind新增presentation，PresentationData, Slide, ChartData, PresentationBlock
- presentation.ts：noteToPresentation解析H1/H2切頁，表格轉圖表，自動目錄，blocks生成
- PresentationView：左投影片清單，中16:9預覽，下方編輯區（標題/內容Tiptap/圖表JSON/Mermaid/備註），8版型，主題
- NewPageDialog：新增簡報選項，16:9/4:3格式
- Dashboard：統計簡報，支援建立簡報
- Sidebar + 新增簡報，FileMenu新增轉為簡報
- IndexedDBAdapter：createPage初始化presentation_data，format預設16:9
- SyncEngine：同步presentation_data

### 驗證
tsc 0, build 成功

---

## 2026-08-01 — 簡報直觀化重構（Gamma/Canva風格）

使用者回饋：備註概念非常好，但簡報應更直觀類似Gamma或Canva，新增文字區塊、拖曳、圖層。

### 行動
- 重寫 PresentationView為自由畫布：
  - 每張投影片blocks為絕對定位，x/y/w/h/z %，可拖曳，雙擊編輯，右上角刪除
  - 頂部+文字區塊、圖表、形狀，版型，主題
  - 右側圖層面板按z倒序，置頂置底，點選切換
  - 底部備註保留
  - 效能：移除下方巨大Tiptap，僅選中塊渲染textarea，拖曳僅改x/y
- types.ts：Slide新增blocks, PresentationBlock含text/chart/diagram/shape

---

## 2026-08-01 — 5點回饋修正

1. 側邊欄加號缺少簡報：已加回
2. 筆記移除16:9/4:3：note僅flow/a4/custom，presentation僅16:9/4:3
3. 簡報使用說明：新增PRESENTATION-GUIDE.md
4. 文檔開啟子頁：canAddSubPage改為!isTrashMode && kind!=presentation，支援文檔子頁
5. 標題右側新增子頁移除，側邊欄更多操作左側+恢復：EditorPane移除+新增子頁按鈕，Sidebar恢復+按鈕與renderSubPageTypeMenu同類型

---

## 2026-08-01 — 分析 Canva 製作形式

行動：web_search Canva editor architecture，整理CANVA-ANALYSIS-DETAILED.md，引用12+來源，分析拖拉、bounding box、紫色對齊線、圖層面板、群組等，為簡報重構參考

---

## 2026-08-01 — 王題修正：主題切換文字變灰、分頁新增頁、再分析PPT/Canva/Gamma

- 主題文字變灰：globals.css強制A4/16:9/4:3內文字#1a1a1a !important
- 分頁新增頁：PageFormatView A4底部sticky +新增頁面按鈕，dispatch nexus-insert-page-break事件，TiptapEditor監聽插入PageBreak
- 再分析：web_search PowerPoint Slide Master, Gamma liquid canvas, 整理PPT-CANVA-GAMMA-INTEGRATED-ANALYSIS.md，提出三層架構Master>Layouts>Slides.blocks

---

## 2026-08-01 — 8點追加需求

1. 垃圾桶多選時再點垃圾桶可退回項目：Sidebar垃圾桶按鈕改toggle，isTrashMode true時呼叫onShowNotes，useEffect清除多選
2. 文字超出分頁無法點新增頁：PageFormatView按鈕改sticky bottom z-20 shadow-lg backdrop-blur
3. i18n覆蓋檢查：新增50+ keys，sidebar.nav.notes改為項目，補齊zhTW
4. 側邊欄首頁之下新增隨手記、To-Do List
5. 隨手記類似Google記事本：QuickNotesView網格、顏色、快速新增
6. To-Do List先顯示日曆：TodoView日曆優先，42天網格，任務顯示
7. 筆記改項目：i18n改項目，isProjectKind定義4種統稱項目，Dashboard統計
8. 隨手記、To-Do List獨立於項目：filteredPages排除quick_note/todo，獨立store DB_VERSION 3，quick_notes/todos objectStore，遷移

行動：新增QuickNotesView.tsx, TodoView.tsx, HelpGuide.tsx, 更新Sidebar, NexusApp, types, IndexedDBAdapter, StorageAdapter, i18n等，tsc 0 build成功

---

## 2026-08-01 — 5點回饋之圖表分區與子頁恢復（嚴禁刪減）

1. 子頁與重新排列被移除，嚴厲制止自行刪減：從693行完整版恢復，清理亂碼，保留childMap, expandedIds, dragOver, folderedGroups等
2. 長條圖歸類為數據圖表，圖表裡分區並新增文字圖表：ChartTypeMenu重構為數據圖表（長條5變體一鍵直橫+折線圓餅環狀甘特金字塔雷達）與文字圖表（時間軸、文字欄、文字清單、引言卡），ChartRenderer支援11種，ChartData擴充type包含timeline等，BarVariant與orientation

驗證：tsc 0 build成功，子頁同類型限制（文檔→文檔等，簡報無子頁）已實作

---

## 2026-08-01 — 代碼分析與優化（不刪功能）

背景：使用者要求分析代碼，再不刪除任何功能狀況下優化，可合併或重構，大結構變動需提問確認

行動：
- 統計：7534行，NexusApp 1198行最大，Sidebar 688行
- 發現：重複Page更新邏輯、Sidebar過濾邏輯、TiptapEditor工具列、PDF載入重複、卡片UI重複、console.log殘留、i18n硬編碼、globals.css重複
- 提案文件：CODE-ANALYSIS-AND-OPTIMIZATION-PROPOSAL.md，分小/中/大三級，5個大結構問題提問
- 使用者確認5項皆是：
  1. 拆NexusApp為hooks（已創建useUiModes, usePagesStorage）
  2. 引入@dnd-kit/core, sortable, utilities
  3. default_mode標記@deprecated
  4. Creatable Registry導入（creatableRegistry.ts）
  5. QuickNotes/Todo獨立Store並遷移（DB_VERSION 3）
- 實作：npm install dnd-kit，更新IndexedDBAdapter, StorageAdapter, types, 創建hooks，build成功

---

## 2026-08-01 — 最終文檔統整

使用者：內容沒問題，將討論結果與對話紀錄全面統整並更新文檔

行動：更新00-HANDOFF-STATUS-AND-AI-RULES-UPDATED.md, 01-CANON-SPEC-AND-DECISIONS-UPDATED.md（新增D-157~D-172）, 本文件02-PROJECT-LOG-DETAILED-UPDATED.md，包含Phase1-2、簡報直觀化、圖表分區、子頁同類型、使用說明、代碼優化等完整記錄


---

## 2026-08-01 — 工具列置頂覆蓋、排版同格、真正分頁、夜間適配、表格右鍵、側邊欄回退等全面修復

### 背景
使用者回報：工具列選單被上欄限制、對齊需下拉、分欄最多三欄、表格自由度、非流動分頁自動加頁、不要擅自更改未提功能。後續再回報：表格右鍵、平均僅選取範圍、快速輸入跳行、重複 underline、固定 A4 底部留白無法編寫、內頁第幾頁/共幾頁保留、檔案刪除空白頁、平均表格仍有問題、上文下文合併、工具列殘留、分頁底部太高、固定 A4 尺寸底部不可編寫等。

### 行動
- **工具列 Portal**：ColorPaletteButton、ToolbarDropdown、FileMenu、ChartTypeMenu、TableGridPicker 改為 createPortal 到 document.body，fixed 定位 z-[9999]，計算 getBoundingClientRect，監聽 mousedown 外部關閉、resize/scroll 重定位，解決被 overflow-x-auto 裁切（D-173）
- **排版同格**：對齊 select 下拉（向左/置中/向右/兩端），分欄 select 下拉 單欄/2欄/3欄，同一 bordered 群組，新增 multiColumnExtension（multiColumn 2-3欄，column），WritingModeExtension（writingMode vertical-rl，切換直橫，主要用於儲存格）（D-174）
- **表格自由**：TableGridPicker 8x10 網格，右鍵選單 TableMap+CellSelection 實現上下左右合併、插入/刪除列欄、切換標題、平均僅選取範圍（保持總寬不變無需橫向拉動）、刪除表格；工具列表格按鈕依要求僅保留右鍵（D-175, D-179, D-181）
- **真正分頁**：PaginatedEditorView 重寫，固定 A4 210mm×297mm 1122px，內文高度 971px，ProseMirror min-height 971px 使底部可編寫，splitIntoPages 依 estimateBlockHeight 分頁，超出自動加頁，不以分隔符為依據，頁面置中 flex items-center，右上角保留 第X頁/共Y頁，底部提示已刪除，debounce 800ms + 150px buffer 防快速輸入跳行，修復 Cannot update component while rendering（setPagesBlocks 內呼叫 onContentChange 改為 useMemo 衍生 + useEffect 外呼叫）（D-176, D-182, D-184, D-185）
- **夜間適配**：EditorPane isPageNightAdapt，工具列清除格式右側切換 原文字顏色/適配夜晚，PaginatedEditorView 背景 var(--color-editor-bg) 文字 var(--color-text)，globals.css 新增 .nexus-paged-adapt 覆蓋強制黑字（D-177）
- **側邊欄**：改回單擊展開/收合 + 選中，雙擊重新命名，350ms 間隔（D-178）
- **刪除空白頁**：FileMenu 新增 頁面管理 → 刪除空白頁，EditorPane handleDeleteBlankPages 過濾空白 paragraph/heading/list/table，保留一空段落避免空文件（D-180）
- **重複 underline**：StarterKit 內建 underline 與獨立 Underline 重複警告，改 StarterKit.configure({link:false, underline:false})（D-183）

### 驗證
tsc --noEmit 0, next build 成功，無 Maximum update depth exceeded，無 Duplicate extension 警告。


---

## 2026-08-01 — 深度審核與最佳化：文件重排、死檔清理、夜間適配持久化、表格平均提示、分頁精確度等

### 類型
文件治理 / 深度審核 / 架構最佳化 / 代碼清理

### 背景
使用者要求「對現在所有檔案與資訊進行一次深度且完整的整理、完善、分析問題與提出建議」。前期已完成工具列 Portal、真正分頁、表格右鍵、夜間適配等 13 項追加，但文件存在章節錯亂（15.16/15.17/15.18 在 16/17 之後重複）、死檔未刪（BottomLeftPanel、PreferencesFab/Menu）、夜間適配未持久化、平均僅選取範圍無提示、分頁估算高度啟發式、快速輸入跳行等問題。

### 行動
1. 文件重排：將 01 文件 15.16/15.17/15.18 按序排列，16/17 放最後，消除 cat >> 追加導致的章節錯亂，決策編號連續 D-147~D-185
2. 死檔清理：刪除 BottomLeftPanel.tsx、PreferencesFab.tsx、PreferencesMenu.tsx（已由 AccountSettingsRow 取代，未被引用）
3. 夜間適配持久化：StorageAdapter 新增 get/setPageNightAdaptPreference，IndexedDBAdapter 實作 page_night_adapt key，EditorPane 改用 localStorage + IndexedDB 雙重持久化，reload 後保持適配狀態（R-2）
4. 平均欄寬提示：右鍵選單增加 canAverage 判斷，CellSelection 計數 >1 才可平均，否則 disabled + tooltip「請先拖曳選取多個儲存格」，避免無反應困惑（R-4）
5. 分頁精確度：estimateBlockHeight 啟發式保留，但 PaginatedEditorView 改為 useMemo 純衍生 + debounce 800ms + buffer 150px，游標所在塊保護，徹底解決快速輸入跳行（R-6）
6. 快速輸入跳行：handlePageChange 立即合併保存不搬移，800ms 後再檢查溢出，允許當前頁暫時溢出 150px，僅在暫停後才搬移最後 block
7. 固定 A4 底部可編寫：PaginatedEditorView 每頁固定 1122px，ProseMirror min-height 971px，底部可點擊編寫，右上角保留第X頁/共Y頁，底部提示已刪除
8. 重複 underline：StarterKit.configure({underline:false}) 修復 Duplicate extension names 警告
9. 側邊欄：改回單擊展開/收合 + 選中，雙擊重新命名，符合 Notion 習慣，減少誤觸

### 結果
- 01 文件章節順序正確，決策連續 D-01~D-185，無斷層
- 死檔清理，project/src 49 檔案整潔
- 夜間適配持久化，平均提示，分頁精確度與快速輸入體驗改善
- tsc 0, next build 成功，無 Maximum update depth exceeded，無 Duplicate extension 警告

### 產出
- DEEP-AUDIT-2026-08-01.md 深度審核報告，含 8 項優化建議 R-1~R-8，分短期/中期/長期
- 00/01/02 三份交接文件更新至 D-185

---

## 2026-08-02 — 01 歷史決策轉移與三檔交接整合

### 類型

```

文件治理 / Canon 可讀性重整 / 歷史決策保全 / 三檔交接整合

```

### 背景

使用者確認：交接檔只需要 `00`、`01`、`02` 三份。

新的 01 已重整為「現行功能／實作要求／規格」文件；原 01 中未直接列為現行功能卡的歷史決策、舊資料模型快照、技術細節與完整 D-01～D-185 決策原文，不應另留第四份 legacy handoff 檔，也不能因可讀性重整而遺失。

### 比較結果

```

原 01：明確包含 D-01～D-185 共 185 個決策編號。 原 02：文字中明確提及 101 個決策編號。 在原 02 中未明確出現的原 01 決策編號數：84。 未明確出現的 ID：D-2, D-3, D-4, D-5, D-6, D-7, D-8, D-9, D-10, D-11, D-12, D-13, D-14, D-15, D-16, D-17, D-18, D-19, D-20, D-21, D-22, D-23, D-24, D-25, D-26, D-27, D-36, D-37, D-40, D-45, D-46, D-47, D-49, D-50, D-51, D-52, D-53, D-54, D-55, D-71, D-72, D-73, D-74, D-75, D-76, D-77, D-78, D-79, D-80, D-81, D-82, D-83, D-84, D-85, D-86, D-87, D-88, D-89, D-90, D-91, D-92, D-93, D-94, D-95, D-96, D-97, D-98, D-99, D-100, D-157, D-158, D-159, D-160, D-161, D-162, D-163, D-164, D-165, D-166, D-167, D-168, D-169, D-170, D-171。

```

### 整合規則

1. 新 `01-CANON-SPEC-AND-DECISIONS.md`：只保留現行功能規格、資料／UI 契約、限制、驗收與決策索引。
2. 本 `02-PROJECT-LOG-DETAILED.md`：承接原 01 的完整歷史 Canon source，作為歷史決策與未直接列入功能卡內容的保全層。
3. `00-HANDOFF-STATUS-AND-AI-RULES.md`：保留目前任務狀態、MVP 容器、任務 ID、估算與交接規則。
4. 轉移後仍以 **00 → 01 → source code → 02** 判讀衝突；本附錄不覆蓋新 01 的現行功能規格。

### 完整性保證

下方附錄保留的是重整前原 01 的**完整原文**，未經摘要或刪減。

```

來源檔：01-CANON-SPEC-AND-DECISIONS-UPDATED (1).md SHA-256：b3b7ebe3ede42fb6bf9c69e5491a9a7b09e5e694928fe567eec0692569a53512

```

---


## 2026-08-02 — 00 任務目錄去重與 Task ID 正規化

### 類型

```

文件治理 / 任務目錄重整 / 三檔交接一致性

```

### 背景

使用者指出 00 的 §0「任務闡述」、§2「目前進度」、§10「任務詳細」有大量重複。使用者確認新的唯一職責分工：

```

§0：僅正在進行與將要進行的任務環節。 §2：僅各 MVP 容器的摘要進度。 §10：唯一完整任務大綱與所有 Task ID、狀態、依賴、估算、完成判準。

```

### 執行結果

```

1.00 §0 移除 MVP-0／MVP-1 完成內容，只保留「目前無已開啟程式工作」與下一批候選。
2.00 §2 改為 MVP-0～MVP-9／Q 工作線的一行摘要，不再列功能清單。
3.00 §3 改為任務執行規則，不再重複 task list。
4.00 §10 成為唯一完整任務目錄：M0-0～M9-4、Q-0～Q-6。
5.MVP-0、MVP-1 已完成工作正式列成 task cards，不再只寫「已完成」。
6.圖片插入、GoodNotes-like PDF workspace、Mobile UI standard 正式納入 Task Registry。

```

### 正式 Task ID 格式

```

M{MVP}-{序號}，例如 M0-0、M1-0、M3-1。 Q-{序號}，例如 Q-0。

```

舊暫行別名 → 新正式 ID：

| 舊別名 | 新 ID | 任務 |
| --- | --- | --- |
| Q-01 | Q-0 | schema reconciliation |
| M2-01～04 | M2-2～5 | Citation contract／UI／interop／regression |
| M3-01～08 | M3-1～8 | resize 至 Image Insert |
| M4-01～06 | M4-1～6 | coverage audit 至 Backup Import rules |
| M5-01～06 | M5-0～5 | Block ID contract 至 Canvas reference |
| M6-01～07 | M6-0～6 | Reference 至 GoodNotes-like PDF workspace |
| M7-01～06 | M7-1～6 | Review Queue 至 QuickNote/Todo integration |
| M8-01～03 | M8-0～2 | Share Page 至 Publish Site |
| M9-05 | M9-0 | Mobile UI standards discovery |
| M9-01～04 | M9-1～4 | Tauri／Capacitor tasks |

### 保全規則

```

本項正規化只影響 00 的現行任務目錄與新 01 的 Task references。 02 Appendix A 內嵌的原 01 source 維持逐字原文，不修改其歷史用詞或舊編號。 舊編號在歷史文件中可作追溯別名；從本輪起新增工作一律使用新短格式。

```

---

## 2026-08-23 — 代碼審計 + Bug 修復 15 項 + 簡報功能重大改造 + drag 深度調試

### 類型

```
代碼審計 / Bug 修復 / 功能改造（簡報） / 深度調試 / sync 修復 / 決策
```

### 背景

```
使用者提供四份文件（00/01/02 + codebase dump）要求分析代碼、找出 bug 與不明智設計。
隨後指示修復可獨立處理的問題、開發簡報功能、評估三份外部分析報告。
```

### 行動

#### 1. 代碼審計（nexus-code-audit.md）

```
逐檔靜態分析 lib/ + hooks/ + 關鍵 component。
輸出 22 項發現：4 高（H1-H4）/ 8 中（M1-M8）/ 10 低（L1-L10）。
```

#### 2. Bug 修復 15 項（三批，全部 tsc + build 驗證）

```
Batch 1: H1（複製簡報遺失 presentation_data）、H2（Markdown --- 誤轉分頁符）、
         M1（updated_at 不同步 → patchPage helper）、M2（callout memory leak → destroy()）
Batch 2: M3（轉簡報截斷 → 完整內容放 notes）、M4（分頁 pageBreak 雙重插入 → normalize）、
         M6（複製 StudySet id 衝突）、M7（pullChanges 漏附件 → 補 attachments/binaries）、
         L6（i18n zh-TW 補 25 key）、L9（變數遮蔽）、L10（列印時序 → rAF）、
         M1 剩餘 13 個 handler 統一改用 patchPage
Batch 3: H3/H4（quick_note/todo store 歸屬 → 方案 A 廢棄獨立 store，使用者確認）、
         L1（刪除 3 個死代碼：usePagesStorage/useUiModes/WorkspaceContext）、
         L2（移除 migration 全表掃描，隨 H3 自然解決）
```

#### 3. 簡報功能重大改造（PresentationView.tsx 完全重寫）

```
- 全寬上欄（加高、完整工具列）+ 下方三欄（縮圖｜畫布｜圖層）
- 畫布置中（items-center justify-center）
- 縮圖即時鏡像（SlideThumbnail 用 % 定位縮小渲染）
- 多選（Ctrl/Cmd+點擊）+ 對齊按鈕（左/右/上/下/置中/等距）
- 圖表浮動編輯面板（Gamma 風格，類型 + 資料 + 即時預覽）
- 投影片右鍵選單（複製/新增/刪除投影片）
- 文字方塊 placeholder 字影（空時淡色提示）
- 浮動工具列（複製/刪除/編輯圖表/更多）
- z-index 歸一化（每次改層級重新分配連續值）
- resize 邊界 clamp（物件不超出畫布）
- PresentationBlock 新增 rotation 欄位
- 旋轉把手（Shift 吸附 15°）
```

#### 4. drag 根因排查（十幾輪）

```
問題：拖曳物件不動，但 resize/rotate 正常。
排查過程：
- jsdom 自動化測試 3 輪（證明邏輯正確，但 jsdom 不模擬 hit-testing）
- 禁用 sync 測試（排除 sync 覆蓋）
- 移除覆蓋式把手容器（獨立圓點）
- inline pointerEvents（排除 Tailwind class 問題）
- mount-once listener + ref（排除 cleanup/re-add 循環）
- pointer events + setPointerCapture（現代 API）
- 絕對座標模式（繞開 dxPct/startMX）
- updateBlock 替代 updateBlocks
- console.log 診斷（確認 drag 執行、newX 變化、onUpdatePresentation 呼叫）
- 直接 DOM 操作測試（el.style.left + outline:red）

根因：selBoxStyle() 函式漏了 position: "absolute"。
沒有 position:absolute，CSS 靜默忽略 left/top/z-index。
但 outline/transform/width/height 不需要 position → resize/rotate/紅框正常 → 只有 drag 壞。
縮圖正常（縮圖自己有寫 position:absolute）。
```

#### 5. sync 400 修復

```
pushPage upsert 報 400 (PGRST204)：Could not find the 'margins' column。
margins 是後加欄位（2026-08-11），雲端 Supabase pages 表沒有。
修復：ALTER TABLE pages ADD COLUMN IF NOT EXISTS margins jsonb（+ 其他可能缺失欄位）。
使用者執行 SQL 後確認解決。
pushPage 加詳細錯誤 log（upErr.message/hint/code）。
```

#### 6. 三份外部分析報告評估

```
報告 1（10 項）：6 準確、2 部分、2 誤判。新增價值：殭屍頁面（permanent delete 復活）、分頁性能。
報告 2（6 項）：2 準確、2 部分、1 誤判（#3 已有 if(editing) return）、1 假設性。
報告 3（7 項）：3 項重複（#1/#4/#7）、2 新增準確（#3 多選 clamp、#6 表格轉圖表）、2 部分/誤判。
修復了 #2 z-index 歸一化 + #4 resize clamp。
```

### 遇到的問題

```
1. drag 十幾輪排查：jsdom 測不出真實瀏覽器的 CSS/DOM 行為（jsdom 不模擬 hit-testing、
   不做 CSS layout），導致「邏輯正確」的結論誤導。最終靠直接 DOM 操作測試定位根因。
2. Supabase 400：後加欄位（margins）未同步到雲端 schema。pushPage 的 try/catch
   沒解構 Supabase 返回的 error（只 catch 拋出的例外），導致 400 靜默失敗。
3. updateBlocks vs updateBlock：drag 用 updateBlocks（複數），resize 用 updateBlock（單數）。
   排查時一度懷疑 updateBlocks 有問題，但最終根因是 position:absolute（兩個函式都正常）。
```

### 解決方式

```
1. drag：selBoxStyle 加 position: "absolute"。同時保留過程中的架構升級
   （pointer events、絕對座標、物件本體負責事件）。
2. sync 400：ALTER TABLE + pushPage 加 error log。
3. H3/H4：使用者確認方案 A（廢棄獨立 store）。
```

### 結果

```
- 22 項審計中修復 15 項（H1-H4, M1-M7, L1-L2, L6, L9-L10）
- 簡報功能從基礎版升級為可用版（M3-1 大部分完成、M3-2 部分完成）
- drag 經十幾輪排查修復（根因：position:absolute）
- sync 恢復 + 400 修復
- 全部通過 tsc + next build 雙驗證
- 三份分析報告的誤判被識別（避免錯誤修復）
```

### 後續影響

```
- 簡報待完成：拖曳吸附線（M3-2 二階段）、旋轉 resize 方向、undo/redo、Slide Master
- 審計待完成：M5（游標 pane 隔離）、M8（B2 sync 衝突）、L3-L5/L7/L8
- sync 待改善：殭屍頁面 tombstone、時鐘偏移、binary 改 Supabase Storage
- 分頁性能：多 Tiptap 實例（虛擬列表）
```

### 新增/更新決策

```
D-186 — H3/H4 採方案 A：quick_note/todo 廢棄獨立 store，統一為 pages store 的 kind。
        移除 IndexedDBAdapter 的 quick_notes/todos store 建立 + migration + 6 方法。
        移除 StorageAdapter 的 QuickNote/TodoItem 介面 + 6 方法宣告。
        backup/sync 已涵蓋（pages store）。既有 DB 的空 store 物理保留（未來 DB_VERSION 4 清理）。

D-187 — PresentationBlock 新增 rotation?: number 欄位。

D-188 — 簡報 drag 架構：pointer events + setPointerCapture + 絕對座標模式。
        物件本體負責所有事件（中心=drag、邊緣 9px=resize）。
        把手圓點降級為純視覺（pointer-events:none，獨立 10px 定位）。
        selBoxStyle 必須含 position: "absolute"（否則 left/top 無效）。

D-189 — z-index 歸一化：每次改層級後重新分配連續值（間距 10），避免數值無限增長。

D-190 — resize 邊界 clamp：x≥0, y≥0, w≤100-x, h≤100-y，避免物件超出畫布。

D-191 — patchPage helper：統一的 page 更新函式，更新欄位時同步 refresh updated_at。
        所有 handler（content/title/folder/tags/format/margins/presentation/study_items/
        favorite/rename）統一使用。revision 維持「持久化版本」語意，由 flushSave +1。
```

> 完整決策本體見 Appendix A 第 15.19 節。

### 教訓

```
1. position:absolute 缺失讓 left/top 被 CSS 靜默忽略。outline/transform/width/height
   不需要 position 所以正常。這種「部分功能正常」的症狀極具迷惑性。
2. jsdom 不模擬 CSS layout 和 hit-testing。jsdom 測試通過 ≠ 真實瀏覽器通過。
   對於 CSS/DOM 相關 bug，必須用真實瀏覽器（或直接 DOM 操作）驗證。
3. Supabase upsert 返回 { error } 而非拋例外。try/catch 不捕捉返回的 error。
   必須解構返回值檢查 error。
4. console.log 診斷是最終定位手段。當邏輯審查和自動化測試都指向「正確」時，
   加 log 確認真實執行路徑。
```


---


## 2026-08-23（第二輪）— 簡報 UI 改造 + 圖表編輯器 + 創作類別 + 側邊欄分類

### 類型

```
功能改造 / UI 調整 / 新增類別 / 新元件
```

### 背景

```
簡報功能 drag 修復後，使用者要求一系列 UI 版面調整、圖表編輯器參考 Gamma 設計、
新增側邊欄創作類別。
```

### 行動

#### 1. 簡報 UI 佈局調整

```
- 上欄高度 ×2（py-3 → py-6）
- 浮動工具列按鈕放大（text-[11px] px-2 py-1 → text-base px-4 py-3）
- 新增投影片按鈕高度 ×5（py-2 → py-10）
- 縮圖列/圖層列可開合（按鈕在標題列中央 📑/☰，w-[180px] ↔ w-0 transition）
- 上欄的開合按鈕移除（改放到各面板標題旁）
- 圖層右下角屬性面板刪除
- 資料表格「系列」欄位刪除
- 圖表編輯關閉按鈕改為浮動圓形按鈕（absolute -top-3 right-3）
```

#### 2. 圖表編輯器 Gamma 風格

```
- 分析 Gamma 圖表編輯器設計：分頁（Graph/Axes/Visuals）、表格化輸入、左資料右預覽
- 第一版：三分頁（資料/類型/預覽）
- 第二版（使用者指定版面）：上半部三欄（類型選擇｜細項設定｜預覽）+ 下半部資料表格
  - 類型：11 種圖表 icon 網格
  - 細項設定：排序/資料標籤/格線/標題數字 checkbox + 方向 + 變體
  - 預覽：240×140 即時
  - 表格：標籤 + 數值兩欄（系列已刪除）
- ChartData 型別擴充：sortOrder, showDataLabels, showGrid, showTitleNumber
```

#### 3. 圖表下拉選單

```
- 「📊 圖表」按鈕改為下拉選單：長條圖/折線圖/圓餅圖/環圖/甘特圖/金字塔/雷達圖
- 每種帶預設資料
```

#### 4. 文字/版面下拉選單

```
- 「＋ 文字」改為下拉：標題/H1-H4/一般文字/區塊引述/方塊(備註/資訊/警告/錯誤/成功/問題)/清單(項目符號/編號/代辦)
- 「⬜ 形狀」刪除，改為「📐 版面」下拉：目錄/雙欄/三欄/引言卡/時間軸/文字清單
```

#### 5. 圖層拖曳排序

```
- HTML5 draggable onDragStart/onDragOver/onDrop
- 拖曳後重新分配 z-index（歸一化 10, 20, 30...）
- 拖曳中項目 opacity-40
- 左側 ⠿ 拖曳把手圖示
```

#### 6. 新增 Creative 類別

```
- PageKind 新增 "creative"
- i18n 新增 sidebar.nav.creative（Creative / 創作）
- creatableRegistry 新增 creative 定義（isProject: false）
- Sidebar 新增 ✍️ 創作分類按鈕（與 📝 隨手記 / ✅ To-Do / 📚 項目 同層）
- NexusApp 新增 isCreativeMode state + handleShowCreative
- CreativeView.tsx 新元件：入口頁 + 📖 小說閱讀格式 + 🎭 角色詳細簡介表
- 創作頁面使用 kind: "creative"，用標準 EditorPane 編輯
```

### 遇到的問題

```
1. 圖表編輯內聯 JSX 中巢狀物件（content_json）導致 TS 解析錯誤（TS1005）。
   解決：抽出為獨立 CreativeView 元件 + handler 函式，避免在 JSX 屬性內嵌大型物件。
2. sed 刪除舊面板時留下多餘的 )} 導致語法錯誤。手動修正。
```

### 結果

```
- 簡報 UI 全面調整完成
- 圖表編輯器 Gamma 風格（上半部三欄 + 下半部表格）
- 圖層拖曳排序
- 文字/圖表/版面三個下拉選單
- Creative 類別上線（側邊欄 ✍️ 按鈕）
- 全部通過 tsc + next build
```

### 新增/更新決策

```
D-192 — 圖表編輯面板 Gamma 風格：上半部三欄（類型｜細項設定｜預覽）+ 下半部資料表格。
        位於編輯區底部，與畫布共用編輯區。ChartData 擴充 sortOrder/showDataLabels/showGrid/showTitleNumber。

D-193 — 圖表類型下拉選單：取代單一按鈕，7 種圖表類型可選。

D-194 — 文字下拉選單：取代單一按鈕，含標題層級/方塊/清單等預設樣式。

D-195 — 版面下拉選單取代形狀：目錄/雙欄/三欄/引言卡/時間軸/文字清單。

D-196 — 圖層拖曳排序：HTML5 drag-and-drop，拖曳後 z-index 歸一化。

D-197 — 新增 PageKind "creative"：側邊欄獨立類別，CreativeView 入口頁，
        初步含小說閱讀格式、角色詳細簡介表兩種範本。
```

> 完整決策本體見 Appendix A 第 15.19 節。


---


# Appendix A — 轉移自原 01 的完整 Legacy Canon Source

> **用途：** 保存原 01 中未直接保留在新 01 功能規格層的歷史決策、舊 snapshot、完整 D-01～D-185 原文與詳細技術理由。  
> **權威限制：** 這是 history/archive，不覆蓋 00 的當前任務規劃或新 01 的現行功能規格。  
> **完整性：** 下方內容逐字保留重整前原 01，方便全文搜尋與追溯。

<!-- BEGIN TRANSFERRED ORIGINAL 01 CANON SOURCE -->

# Nexus — CANON / SPEC / DECISIONS（專案既定事實、規劃、技術規格與決策）

*日期：2026-07-31*  
*狀態：🟢 最新 canon 版 / Track H～M 已補入 / Supabase 雲端同步 + UI 改善已補入 / 使用者決策已確認（B1~D5）*  
*用途：集中 Nexus 的產品定位、使用者背景、架構、MVP 路線、技術規格、資料模型、Editor 規格、Windows 規則與決策 D-01～D-146（D-127/D-129/D-134/D-137 編號保留但未使用，見 15.10 節說明）。*

---

## 0. 本文件如何使用

本文件是「目前既定事實」權威。  
若歷史日誌或 archive 中有舊說法，以下列規則處理：

```

00-HANDOFF-STATUS-AND-AI-RULES.md = 最新狀態與下一步 01-CANON-SPEC-AND-DECISIONS.md = 目前既定事實與決策 02-PROJECT-LOG-DETAILED.md = 歷史過程、行動紀錄與 changelog

```

`02` 中的舊狀態不覆蓋本文件。

---

## 1. 一句話定位

> **Nexus 是一款 local-first 個人學習與知識生成 workspace，核心是筆記、文檔、PDF 研究、學習集 / Quiz、Canvas、簡報、閱讀 / 資料庫、複習與分享 / 發布。它可擴充高層級生成物，但不追求早期成為完整企業 all-in-one 或完整 Wix / Notion / Canva clone。**

短期不是一次做完整 all-in-one，而是分階段：

```

MVP-0：本地筆記原型（已完工） MVP-1：個人筆記系統（已完工） MVP-2：學習 / 研究工具（進行中；spec 已定稿，Step 2 data layer 已完成，Step 3 PDF import flow 已完成，Step 4 PDF viewer 最小版與 Step 4-C Open polish 已完成，Step 5 layout polish 第一版已完成，Step 6 error state 已完成；Basic Notes Foundation Step 7 Trash / Restore UI 已完成；Step 8 Permanent Delete / Duplicate Page 已完成；Step 9 Editor formatting toolbar 已完成；Step 10 Markdown import / export v0 已完成；Step 10.1 Markdown v0.1 link syntax / task list 補強已完成；r15 已完成深度稽核，並已改以 vNext tracks A~F 管理；Track A~F、Track A2、Track G（Navigation & Overview：Command Palette + Dashboard/Home v0）、Track H～M（Preferences/i18n、Sidebar UX、Drag Handle、Resizable Layout、Document kind、Note 富文字排版與匯出分級，見 15.10～15.15 節）皆已完成並經驗證，下一步建議由使用者在修正 R-1 死代碼問題 / Study Set 後續擴充 / Track D Research / Track F Creatable Registry 中選擇） MVP-3：時間管理整合（待評估啟動） MVP-4：跨裝置同步與打包

```

---

## 2. 使用者背景與產品約束

| 面向 | 資訊 | 對產品 / 開發的影響 |
| --- | --- | --- |
| 程式經驗 | 幾乎沒有 | 必須逐步引導；不能一次大量指令 |
| 裝置 | Windows + iPad + Android，無 iPhone | 先 Windows Web，後續 Tauri / Capacitor |
| 主場景 | 學習、研究、論文閱讀 | PDF / LaTeX / Backlinks 後續重要 |
| 痛點 | Obsidian 同步/UI、Notion 慢/封閉、Goodnotes 生態限制 | local-first、漂亮 UI、開放格式 |
| UI 偏好 | 極簡、漂亮、直覺、多主題 | 預設黑白極簡，之後主題化 |
| AI 態度 | 手動輔助，不深度自動化 | AI 後置，不阻塞 MVP-0/1 |
| 決策方式 | 信任推薦，重大變更需確認 | 可主動建議，但架構變更先問 |

---

## 3. 三大原則

```

Everything is a Page / Block Everything is Linkable Local-first, Cloud-optional

```

含義：

```

所有核心內容統一為 Page / Block。 Page、Block、Property、Attachment、Annotation 未來都應可連結。 本地先可用；雲端同步是可選能力，不是資料所有權前提。

```

---

## 4. 五概念模型

```

Page           — 內容本體 Block          — Page 裡的內容原子 Property       — Page 的結構化資訊 Workspace View — 看一批 Page 的方式 Page Mode      — 看單一 Page 的方式

```

### 4.1 Page

筆記、文檔、Inbox memo、任務、事件、論文筆記、PDF 閱讀頁、日記、簡報草稿都可作為 Page。

原則：**不用硬性 `type` 欄位**。型態由 properties / content / default mode / context 決定。

### 4.2 Block

Page 內內容原子：paragraph、heading、list、task item、quote、code、image、equation、table、callout。

長期關鍵：block-level node 應有穩定 ID，格式建議 `blk_[nanoid]`。

目前狀態：

```

Stable Block ID：核心決策已定；MVP-1 期間以 Page 層 Wikilink Backlinks 上線，未強制 block 層反向連結。 若未來要做 block-level backlinks 或多人協作再補強。

```

### 4.3 Property

Page metadata：date、due_date、status、tags、rating、authors、priority、related_pages。

Property 讓 Page 進入 Calendar、Board、Tasks、Search 等 Workspace View。

### 4.4 Workspace View vs Page Mode

不要把 Note / Document / Calendar / Board 放同一層。正確語意：

```

Workspace View：Inbox / Calendar / Tasks / Board / Search / Graph / Folder Page Mode：Note / Document / PDF / Focus / Markdown Source / Preview

```

`default_mode: "note"` 是顯示模式偏好，不是硬性 Page type。

---

## 5. MVP 路線

### MVP-0 — 本地筆記原型 ✅ 已完工

完成標準：

```

能建立 Page 能編輯 title 能編輯 content 能 auto-save refresh / 重開後還在 Tiptap editor 可用 IndexedDB persistence

```

已完成項目：

```

Next.js dev server 成功 三欄 App Shell StorageAdapter + IndexedDBAdapter idb / nanoid Tiptap + Typography Markdown shortcut # + 空白 800ms debounce auto-save content_json JSON 儲存（已驗證完成） page delete / soft delete UI（已驗證完成）

```

### MVP-1 — 個人筆記系統 ✅ 已完工

實作順序與最終結果：

```

1.Verify content_json + delete implementation   ✅
2.Search v0（記憶體子字串過濾）                  ✅
3.Sidebar polish（active indicator / clear ✕）   ✅
4.Tags first（chips UI + 全域 tag filter 交集）  ✅
5.Lightweight Folders（單層 folder + 自動分組）   ✅
6.Backlinks（Wikilink [[Title]] + Right Panel）   ✅

```

MVP-1 補強事項（已隨步驟完成）：

```

TiptapEditor 引入 useRef(onChange) 解決 React 閉包雷。 NexusApp 註冊 beforeunload 緊急存檔。 刪除流程清除 debounce timer 並切斷 activePageRef 防復活。 Sidebar 字體升級至 14~16px。 Right Panel 啟用為 Backlinks / Outgoing Links 面板。

```

Search v0 規格（保留作 MVP-1 文件紀錄）：

```

使用 pages.content_text 做 substring search。 不做 Fuse / SQLite FTS / 全文索引。 不為 Search 提前遷移 SQLite。

```

### MVP-2 — 學習 / 研究工具

```

attachments 基礎能力 PDF 匯入 PDF 閱讀 viewer research notes citation metadata LaTeX / equation

```

MVP-2 正式範圍與原則：

```

1.先完成「可閱讀、可記錄、可關聯」的研究流程
2.Page 仍是內容主體；content_json 仍是正文唯一真相
3.PDF / attachment 不建立平行產品模型
4.research metadata 優先走 Property 系統，不硬塞大量 Page 固定欄位
5.UI 可先提供「一篇 PDF 對應一篇主研究筆記」流程，但資料模型不寫死一對一
6.PDF 第一版可先做成與 Page 關聯的 viewer，不強迫第一版就完成完整 Page Mode 架構化重構
7.annotation / highlight 不列入 MVP-2 主完成條件，延後到後續子階段評估

```

### MVP-3 — 時間管理整合

```

tasks projection events projection calendar view board view

```

### MVP-4 — 跨裝置同步與打包

```

Supabase sync Tauri desktop Capacitor mobile

```

---

## 6. 技術棧

| 層級 | 選擇 | 狀態 |
| --- | --- | --- |
| Frontend | Next.js + React + TypeScript | 已採用 |
| Styling | Tailwind CSS v4 | 已採用 |
| UI | shadcn/ui | 後續；MVP-0 先手寫 |
| Editor | Tiptap / ProseMirror | 已接入 |
| MVP-0 / MVP-1 early storage | IndexedDB via `idb` | 已接入 |
| ID | `nanoid` | 已接入 |
| 後續 DB | SQLite + Drizzle | 後續評估，不為 Search 提前遷移 |
| Sync | Supabase | MVP-4 後續 |
| Desktop | Tauri | 後續 |
| Mobile | Capacitor | 後續 |

目前本機技術事實：

```

Project: C:\\Users\\user\\Projects\\nexus Next.js: 16.2.9 + Turbopack React: 19.2.4 Node: v24.18.0 npm: 11.16.0，PowerShell 使用 npm.cmd Git: 2.54.0.windows.1

```

---

## 7. 實作檔案結構

應存在：

```

src/ ├── app/ │   ├── layout.tsx │   ├── page.tsx │   └── globals.css ├── components/ │   ├── NexusApp.tsx │   └── TiptapEditor.tsx └── lib/ ├── types.ts ├── StorageAdapter.ts └── IndexedDBAdapter.ts

```

檔案角色：

| 檔案 | 角色 |
| --- | --- |
| `layout.tsx` | RootLayout / metadata；移除 Google Font，使用系統字體 |
| `page.tsx` | route page；應只 import/render `NexusApp` |
| `globals.css` | design tokens + ProseMirror CSS |
| `NexusApp.tsx` | client root / state / storage / sidebar / editor |
| `TiptapEditor.tsx` | Tiptap lifecycle / JSON + text change payload |
| `types.ts` | ID / Page / Block types |
| `StorageAdapter.ts` | storage interface |
| `IndexedDBAdapter.ts` | IndexedDB implementation / revision / soft delete / settings |

---

## 8. 儲存核心

### 8.1 唯一真相

```

pages.content_json 是正文唯一真相

```

`content_json` 應保存 Tiptap `editor.getJSON()` 產出的完整樹。

衍生資料：

```

content_text blocks links outline search index tasks projection events projection

```

衍生資料壞了可以重建。

### 8.2 `content_text` 定位

`content_text` 只用於：

```

搜尋 預覽 排序 / 摘要 全文 index

```

不可作正文唯一真相。若程式仍用 `content_text` 還原 Tiptap editor，應修正為使用 `content_json`。

### 8.3 Page schema

> 🔴 本節於 2026-07-30 深度審核時更新，補上 Track C（kind / study_items）、
> Track I（is_favorite）、Track L（kind: "document" / format）已上線的
> 實際欄位，之前一直只停留在 MVP-1 完工時的版本，與 src/lib/types.ts
> 的實際內容脫節。以下 TypeScript 直接對照 types.ts 現況。

```

type PageKind = "note" | "document" | "study_set"; type PageFormat = "flow" | "a4" | "16:9" | "4:3" | "custom";

interface Page { id: ID title: string content_json: object content_text: string default_mode: "note"   // ⚠️ 見 D-102：此欄位已被 kind 取代大部分職責， //    目前寫死為 "note" 字面型別，僅為向後相容保留。 //    未來變更需先徵詢使用者（C2 決策），不可逕行移除或改名。 created_at: number updated_at: number deleted_at: number | null revision: number device_id: ID

// MVP-1 已上線欄位 tags?: string[]            // 一級組織系統，配合 Tag chips / 全域 tag filter folder?: string | null     // 單層輕量資料夾；null = 未分類（固定排頂部） links?: string[]           // 正向 Wikilink 清單；存檔時由 extractWikilinks 解析

// MVP-2 已上線欄位 attachment_ids?: ID[] primary_attachment_id?: ID | null

// Track C：Learning Core 已上線欄位 kind?: PageKind            // 缺省視為 "note"，向後相容；作為 creatable discriminator（C1 決策） study_items?: StudyItem[]  // 僅 kind === "study_set" 使用

// Track I：Sidebar UX 已上線欄位（D-128） is_favorite?: boolean      // 缺省視為 false，向後相容

// Track L：文檔類型與版面格式已上線欄位（D-140/D-141） format?: PageFormat        // 缺省視為 "flow"，向後相容；近期優先實作各種格式排版（D2 決策） // （16:9 簡報預覽、A4 列印分頁等）

// Supabase 同步：自訂排序欄位（D-152） sort_order?: number        // 自訂排序權重，數值越小越靠前；undefined 時 // fallback 到 updated_at 排序 }

```

預留欄位（尚未上線）：

```

workspace_id folder_id        // 若未來改為多層 folder tree，可從 folder 字串遷移至 folder_id ref source is_inbox_item processed_at icon cover

```

> 注意：`is_favorite` 原本列於此處的「預留欄位」清單，已於 Track I 正式
> 上線並從預留清單移除，直接寫入上方 interface 定義中，避免下一個接手者
> 誤以為它仍未實作。

MVP-2 metadata 原則：

```

authors year source / venue doi url citation_key abstract

```

上述研究 metadata 優先走 Property 系統，不作為大量硬塞進 Page schema 的固定欄位。

### 8.4 StorageAdapter

```

interface StorageAdapter { init(): Promise<void> getPage(id: ID): Promise<Page | null> listPages(query?: PageQuery): Promise<Page[]> savePage(page: Page): Promise<Page> createPage(input?: CreatePageInput): Promise<Page> deletePage(id: ID): Promise<void> restorePage(id: ID): Promise<Page> getActivePageId(): Promise<ID | null> setActivePageId(id: ID | null): Promise<void> getDeviceId(): Promise<ID>

// Track H：Preferences（已上線，見 8.25 節） getLanguagePreference(): Promise<string | null> setLanguagePreference(language: string): Promise<void>

// MVP-2 目標擴充 listAttachments?(): Promise<Attachment[]> getAttachment?(id: ID): Promise<Attachment | null> saveAttachment?(attachment: Attachment): Promise<Attachment> deleteAttachment?(id: ID): Promise<void> attachBinary?(attachmentId: ID, blob: Blob): Promise<void> readBinary?(attachmentId: ID): Promise<Blob | null>

close?(): Promise<void> }

```

規則：

```

UI / Editor 不直接呼叫 IndexedDB。 所有儲存由 StorageAdapter 負責。 savePage 應更新 updated_at / revision / device_id。

```

### 8.5 IndexedDBAdapter

```

DB_NAME = nexus DB_VERSION = 2 stores: pages        keyPath id settings     keyPath key attachments  keyPath id binaries     keyPath id indexes: pages.by_updated -> updated_at pages.by_deleted -> deleted_at attachments.by_updated -> updated_at attachments.by_deleted -> deleted_at attachments.by_kind -> kind

```

目前 MVP-2 data layer 實作進度：

```

newPageId / newBlockId / newAttachmentId 前綴策略已採用 createPage 已納入 attachment_ids / primary_attachment_id StorageAdapter 已納入 attachment metadata + binary APIs IndexedDBAdapter 已實作 list/get/save/delete attachment 與 binary read/write createAttachment helper 已納入目前實作 Step 2（attachment data layer）可視為完成 Step 3：PDF import flow patch 已完成；Step 4：PDF viewer 最小版已完成；下一步建議 Step 5：layout polish

```

補充：使用者採「助理給 patch、使用者手動修改」模式；對話貼文中的 HTML escape / 富文字符號被確認為貼上顯示問題，不代表本地 VS Code source 異常。

`active_page_id` 存於 settings store。

MVP-2 儲存原則：

```

Attachment record 與 binary payload 分離。 UI 不直接處理底層 blob 儲存細節。 上層透過 StorageAdapter / attachment storage abstraction 存取。

```


### 8.6 Soft delete

刪除 Page：

```

deleted_at = now updated_at = now revision += 1 device_id = current device id

```

不做 hard delete。Trash / Restore UI 可後續做，不阻塞 Search。

---

### 8.7 MVP-2 Step 3：PDF import flow patch 規格

> 本節是 2026-06-28 對話壓縮後補入的目前實作目標。它延續 D-49～D-55，不新增平行產品模型。

Step 3 的最小可用功能：

```

本地 PDF 選檔 → 驗證檔案為 PDF → 建立 Attachment metadata → 儲存 PDF binary payload → 自動建立 research note Page → 在 Page 上寫入 attachment_ids / primary_attachment_id → 切換到該 research note Page → 持久化 active_page_id

```

實作前需要檢視：

```

src/components/NexusApp.tsx src/lib/types.ts

```

原因：

```

NexusApp.tsx 決定目前頁面列表、activePage、storageRef、auto-save、createPage、selectPage 等 UI/state flow。 types.ts 決定 Attachment / Page / CreatePageInput 的實際型別是否已與 Step 2 一致。 未檢視這兩檔前，不應給大範圍猜測式 patch。

```

Step 3 允許的 implementation shape：

```

hidden <input type="file" accept="application/pdf" /> Import PDF button / action file.type === "application/pdf" 或副檔名 .pdf fallback storage.createAttachment?.(...) 優先 若 createAttachment 不存在，才用 saveAttachment fallback（需符合 Attachment schema） storage.attachBinary(attachment.id, file) storage.createPage({ title, attachment_ids: [attachment.id], primary_attachment_id: attachment.id }) 更新 pages state 設定 active page / activePageId storage.setActivePageId(newPage.id)

```

不可違反：

```

PDF / Attachment 不變成平行於 Page 的產品本體。 Page 仍是 research note 與內容主體。 Attachment 只作為可關聯資源。 一篇 PDF 對應一篇主研究筆記只是 UX 起步，不是資料模型硬限制。 annotation / highlight 不列入 Step 3。 SQLite / Drizzle 不因 Step 3 提前啟動。

```

---

### 8.8 MVP-2 Step 4 / Step 4-C：PDF viewer 最小版規格與完成狀態

> 本節是 2026-06-29 實作後補入的目前 canon。它延續 D-49～D-55，不把 PDF 變成平行產品模型；PDF 仍是 Page 的 attachment，研究筆記仍是 Page。

已完成能力：

```

Step 3 PDF import flow：✅ 已完成 Step 4 PDF viewer 最小版：✅ 已完成 Step 4-C viewer polish：✅ 已完成

```

Step 3 canon：

```

本地 PDF file select StorageAdapter.createAttachment() 建立 metadata StorageAdapter.attachBinary() 儲存 binary payload auto-create research note page page.attachment_ids = [attachment.id] page.primary_attachment_id = attachment.id research note 初始 content_json 包含 PDF Notes / Source PDF research note content_text 僅作搜尋 / 預覽衍生文字 switch to new research note persist active_page_id

```

Step 4 canon：

```

初始化時 listAttachments() 讀取 attachment metadata activePage.primary_attachment_id 對應 activeAttachment StorageAdapter.readBinary(activeAttachment.id) 讀出 Blob URL.createObjectURL(blob) 建立 pdfUrl Editor 接收 attachment / pdfUrl 以 iframe 顯示 PDF Preview cleanup 時 URL.revokeObjectURL()

```

Step 4-C canon：

```

PDF Preview header 提供 Open 按鈕 Open 使用 window.open(pdfUrl, "_blank", "noopener,noreferrer") iframe 使用 key={attachment.id}，避免切換 PDF 時沿用舊 iframe 狀態

```

實作邊界：

```

不做 annotation / highlight。 不做 citation parser。 不做 LaTeX。 不引入複雜 PDF.js annotation layer。 不為 PDF viewer 提前遷移 SQLite / Drizzle。 不讓 PDF 成為平行產品模型。

```

下一步建議：

```

MVP-2 Step 5：PDF research note layout polish 讓 PDF viewer 與筆記區更適合長時間閱讀 / 記錄，例如上下或左右布局、可收合 viewer、viewer 高度調整。

```

---

### 8.9 MVP-2 Step 5 / Step 6：PDF viewer layout polish 與 error state canon

> 本節是 2026-06-29 Step 5 / Step 6 完成後補入的 canon。它仍維持 PDF 是 Page 的 attachment，research note 是 Page，不新增平行資料模型。

Step 5 完成狀態：

```

PDF research note layout polish 第一版：✅ 已完成

```

Step 5 canon：

```

Editor local state 管理 PDF viewer UI：isPdfCollapsed / pdfViewerHeight。 PDF viewer 高度提供 Small / Medium / Large。 Small = 420px。 Medium = 560px。 Large = 720px。 Hide / Show 控制 PDF Preview 收合展開。 Open 按鈕保留。 目前仍採 PDF 在上、筆記在下。

```

Step 6 完成狀態：

```

PDF viewer 錯誤狀態與缺檔提示：✅ 已完成

```

Step 6 canon：

```

Root App 保存 pdfLoadError。 loadActivePdf() 每次切換 activeAttachment 時重置 activePdfUrl / pdfLoadError。 readBinary() 找不到 blob 時不得永遠 Loading，必須顯示明確錯誤。 Editor 接收 pdfLoadError。 PDF Preview 有三種狀態：

1.pdfUrl 存在：顯示 iframe。
2.pdfLoadError 存在：顯示 PDF preview unavailable 與錯誤原因。
3.兩者皆無：顯示 Loading PDF preview...。

```

已知實作注意事項：

```

PDF Preview 主 JSX 應位於 title input 與 <TiptapEditor /> 中間。 不要把 PDF banner / viewer 貼進 isEditingFolder 的 span 裡。 若使用 {!isPdfCollapsed && ( <> ... )}，必須在下一個 JSX block 前補上 </> )}。

```

下一步建議：

```

MVP-2 Step 7：PDF research workspace layout evaluation。 評估左右分欄、sticky viewer、可調整分割比例、是否保存 viewer preference。 仍不做 annotation / highlight。

```

---

### 8.10 Basic Notes Foundation Step 7：Trash / Restore UI canon

> 本節是 2026-06-29 在使用者提出想先完善基本筆記功能後補入的 canon。它延續既有 soft delete 決策，不新增資料模型。

完成狀態：

```

Trash / Restore UI：✅ 已完成

```

canon：

```

delete 仍是 soft delete。 Trash UI 使用 listPages({ includeDeleted: true }) 後 filter deleted_at !== null。 Restore 使用 StorageAdapter.restorePage(id)。 Trash 模式不開啟 deleted page，只提供 Restore。 Restore 後切回 Notes 並選中還原頁。 不做永久刪除，直到使用者明確需要。 不改 Page schema。

```

驗證：

```

使用者回報 Trash 可看到過去已刪除的檔案，表示既有 soft delete 資料層實際有效。 完成快速回歸測試後回報正常。

```

下一步建議：

```

NexusApp.tsx 已超過 1000 行。 建議先做安全拆檔：Sidebar.tsx / RightPanel.tsx。 暫不先拆 hooks，避免對新手手動修改造成過大抽象負擔。

```

---

### 8.11 Basic Notes Foundation Step 8：Permanent Delete / Duplicate Page canon

完成狀態：

```

Permanent Delete / Duplicate Page：✅ 已完成

```

Permanent delete canon：

```

一般 delete 仍是 soft delete，進 Trash。 Trash 內 Delete 才是 permanent delete。 Permanent delete 必須二次 confirm，並明確提示不可復原。 第一版 permanent delete 只刪 page record。 第一版不自動刪 attachment / binary，避免誤刪被其他 page 共用的附件。 若 permanent delete 的 page 是 active_page_id，需清除 active_page_id。

```

Duplicate page canon：

```

Duplicate 只在 Notes 模式提供，不在 Trash 模式提供。 Duplicate 會建立新 page，而不是複用同一個 id。 Duplicate 複製 content_json / content_text / tags / folder / links。 Duplicate 複製 attachment_ids / primary_attachment_id，代表 PDF research note copy 會共用同一個 attachment。 新 title 使用 `${baseTitle} copy`。 Duplicate 後切換到新 page 並持久化 active_page_id。

```

下一步建議：

```

Editor formatting toolbar。 需要先檢視 TiptapEditor.tsx。

```

---

### 8.12 Basic Notes Foundation Step 9：Editor formatting toolbar canon

完成狀態：

```

Editor formatting toolbar：✅ 已完成

```

Toolbar canon：

```

TiptapEditor 提供 toolbar。 Toolbar 支援 Bold / Italic / inline Code。 Toolbar 支援 H1 / H2 / H3。 Toolbar 支援 Bullet list / Ordered list。 Toolbar 支援 Quote / Code block。 Toolbar 支援 Clear formatting。 Toolbar button 使用 editor.isActive 顯示 active 狀態。 Toolbar button 使用 onMouseDown preventDefault 避免 selection 遺失。 onChangeRef 防閉包雷維持不變。

```

CSS canon：

```

Tiptap list marker 不可依賴瀏覽器預設，需在 .nexus-tiptap-editor 明確設定。 ul 使用 list-style-type: disc。 ol 使用 list-style-type: decimal。 blockquote / code / pre / heading 需有基本可讀樣式。

```

已知修正：

```

初次 toolbar 後 list 格式可切換但沒有顯示點 / 數字。 原因是 CSS reset。 已補 .nexus-tiptap-editor ul / ol 樣式後正常。

```

---

### 8.13 Basic Notes Foundation Step 10：Markdown import / export v0 canon

完成狀態：

```

Markdown import / export v0：✅ 已完成

```

Import canon：

```

支援 .md / .markdown / .txt。 Import 會建立新 Page。 Page title 取自檔名。 folder = Imports。 tags = ["imported"]。 Markdown 轉成基本 Tiptap JSON。 content_text 使用原始 markdown text。 Import 後切換 active page 並持久化 active_page_id。

```

Export canon：

```

Export active page。 Export 前先 flushSave(activePage)。 Tiptap JSON 轉 Markdown text。 下載檔名使用 safeFileName(page.title) + .md。

```

v0 支援範圍：

```

heading paragraph bullet list ordered list blockquote code block inline code bold italic horizontal rule

```

v0 不保證完整支援：

```

table / image / nested list / task list / link syntax / frontmatter / footnote / HTML block

```

---

### 8.14 Basic Notes Foundation Step 10.1：Markdown v0.1 link syntax / task list canon

完成狀態：

```

Markdown import / export v0.1：✅ 已完成

```

link syntax canon：

```

支援 import [label](url)。 目前不啟用真正 Link extension。 v0.1 先把 [label](url) 保留為文字，避免連結資訊遺失。 export 時原樣保留。

```

task list canon：

```

支援 import - [ ] item / - [x] item。 目前不啟用真正 TaskList / TaskItem extension。 v0.1 轉成普通 bullet list + ☐ / ☑ 前綴。 export 時 ☐ 轉回 - [ ]，☑ 轉回 - [x]。

```

後續若需要真正互動能力，再評估：

```

@tiptap/extension-link @tiptap/extension-task-list @tiptap/extension-task-item

```

---

### 8.15 Track A（Editor Blocks Foundation 第一批）：Link / TaskList / TaskItem v0.2 canon

> 本節取代 8.14 中「目前不啟用真正 Link / TaskList / TaskItem extension」的舊限制。8.14 保留作歷史紀錄，不刪除；本節為目前最新 canon。

完成狀態：

```

Link extension：✅ 已完成 TaskList / TaskItem extension：✅ 已完成 Markdown import / export v0.2（同步 link / task list 真實節點）：✅ 已完成

```

套件：

```

@tiptap/extension-link@3.27.1 @tiptap/extension-task-list@3.27.1 @tiptap/extension-task-item@3.27.1

```

Link canon：

```

StarterKit 內建 Link 關閉：StarterKit.configure({ link: false })。 獨立引入 Link extension，設定 openOnClick: false、autolink: true、linkOnPaste: true。 openOnClick: false 是刻意決策：避免編輯時誤點連結被強制跳轉；連結仍顯示可點擊樣式（底線 + 手指游標），但點擊不跳轝為預期行為，不是 bug。 Toolbar 提供 Link 按鈕，透過 window.prompt() 設定 / 編輯 / 移除連結。 未選取文字且游標處無現有連結時，禁止建立連結並提示使用者先選取文字。

```

TaskList / TaskItem canon：

```

TaskItem 設定 nested: true，允許巢狀 task。 Toolbar 提供 ☑ Task 按鈕，呼叫 editor.chain().focus().toggleTaskList().run()。 CSS 需在 .nexus-tiptap-editor scope 明確處理 ul[data-type="taskList"]，包含 checkbox 對齊與已完成項目的視覺樣式（刪除線 / 淡化）。

```

Markdown v0.2 canon（取代 v0.1 的 link / task list 限制）：

```

Import 時 [label](url) 直接產生真正的 link mark 節點（attrs.href / target / rel），不再保留為純文字。 Import 時 - [ ] / - [x] 直接產生真正的 taskList / taskItem 節點（attrs.checked），不再轉成 ☐ / ☑ 文字符號。 Export 時偵測 link mark，輸出回 [text](url)。 Export 時新增 taskItemToMarkdownLine()，讀取 taskItem.attrs.checked，輸出回 - [ ] / - [x]。

```

向後相容 canon：

```

v0.1 時期已存在於 IndexedDB 中的舊資料（☐ / ☑ 文字符號 bullet list）不會被破壞。 listItemToMarkdown() 舊函式保留不變，繼續偵測並正確 export 這類舊資料。 nodeToMarkdown() 對 bulletList（可能含舊文字符號）與 taskList（新真實節點）分別維持對應的 export 邏輯，新舊資料可並存。

```

---

### 8.16 Track E：Workspace Backup / Export package v0 canon

完成狀態：

```

Workspace Backup / Export package v0：✅ 已完成並由使用者驗證通過

```

修改檔案：

```

src/lib/types.ts             （新增 WorkspaceBackup / WorkspaceBackupAttachmentEntry / WorkspaceBackupSettingEntry） src/lib/StorageAdapter.ts    （新增 exportWorkspaceBackup? / importWorkspaceBackup? 可選方法） src/lib/IndexedDBAdapter.ts  （實作 export / import） src/components/NexusApp.tsx  （Sidebar 新增 Export Backup / Import Backup 按鈕與對應 handler）

```

Backup 格式 canon：

```

單一 JSON 檔案，檔名格式 nexus-backup-YYYY-MM-DD-HHmm.json。 包含 schema_version（目前為 1）、exported_at、device_id。 包含所有 pages，含已軟刪除（Trash 中）的 pages，確保還原後 Trash 內容也能一併恢復。 包含所有 attachments metadata，binary 以 base64 字串一併打包在同一份 JSON 中（不使用另外的檔案或雲端儲存）。 包含 settings store 的所有項目（含 active_page_id）。

```

Export canon：

```

export 前呼叫 flushSave(activePage)，確保匯出當下的最新編輯內容。 StorageAdapter.exportWorkspaceBackup() 讀出 pages / attachments / binaries / settings 四個 store 的全部內容並組成 WorkspaceBackup 物件。 binary 轉 base64 使用瀏覽器原生 API（ArrayBuffer → Uint8Array → btoa），不引入新的 npm 套件。

```

Import canon：

```

v0 僅支援「完全覆蓋」，不支援合併；合併邏輯延後評估。 Import 前必須二次確認，明確告知會覆蓋目前所有資料且無法復原。 importWorkspaceBackup() 檢查 backup.schema_version；若備份版本高於目前支援版本，拒絕匯入並提示使用者更新 Nexus。 清空與重寫 pages / attachments / binaries / settings 四個 store 必須包在同一個 IndexedDB transaction 內，確保操作具原子性，不會發生清一半、寫一半的不一致狀態。 Import 成功後自動 reload 頁面，確保所有 React state 重新從 IndexedDB 讀取，避免殘留舊 state。

```

不做範圍（v0 明確排除）：

```

不做雲端同步。 不做版本歷史 / 多次備份管理，只做單次 export / import。 不做自動排程備份。 不做合併式 import（僅完全覆蓋）。

```

---

### 8.17 Track A2：Bulk Select（Notes / Trash 多選刪除與復原）canon

完成狀態：

```

Bulk Select for Notes / Trash：✅ 已完成並由使用者驗證通過

```

修改檔案：

```

src/components/NexusApp.tsx（唯一修改檔案；不涉及 types.ts / StorageAdapter.ts / IndexedDBAdapter.ts）

```

UI canon：

```

Sidebar 標頭提供「Select」按鈕，切換多選模式（isSelectMode）。 多選模式開啟後，每個項目左側顯示 checkbox；原本 hover 才顯示的 Copy / 🗑 / Restore / Delete 按鈕暫時隱藏。 批次操作列提供「全選目前顯示項目」checkbox 與已選取數量。 切換 Notes / Inbox / Trash 視圖時，自動關閉多選模式並清空已選取項目（useEffect 依賴 isTrashMode / isInboxMode）。

```

批次操作 canon：

```

Notes / Inbox 視圖：批次 Delete，對應多次呼叫既有的 StorageAdapter.deletePage()（soft delete，移入回收桶）。 Trash 視圖：批次 Restore，對應多次呼叫既有的 StorageAdapter.restorePage()。 Trash 視圖：批次 Delete（永久刪除），對應多次呼叫既有的 StorageAdapter.permanentDeletePage()，需二次確認並顯示數量。 批次操作透過迴圈呼叫既有單筆方法實作，不新增 StorageAdapter 介面方法，不新增資料模型。 若批次刪除包含目前 active page，沿用既有單筆刪除的安全機制（清 debounce timer、切斷 activePageRef、切換到下一頁或清空狀態）。

```

刻意的設計取捨：

```

批次 Restore 完成後停留在 Trash 視圖，不自動切回 Notes：一次復原多篇時無法明確判斷該選中哪一篇， 交由使用者自行決定接下來要打開哪篇筆記。此與單筆 Restore（會自動切回 Notes 並選中該頁）行為不同， 屬於刻意的 UX 差異，不是 bug。

```

---

## 8A. 協作模式：工作區直接維護代碼（取代 patch 說明文件模式）

> 本節記錄 2026-07-02 使用者要求「直接在工作區建立代碼，每次更改都直接更新」後的協作模式變更。此變更只影響開發交付方式，不影響任何產品 / 架構決策。

自 Track A2 之後，協作模式調整為：

```

1.助理在 Arena workspace 的 project/ 目錄下維護一份完整的 Nexus 專案鏡像，

結構對齊使用者本機 C:\\Users\\user\\Projects\\nexus（src/app、src/components、src/lib、 package.json、tsconfig.json、postcss.config.mjs 等）。

1.之後每次功能異動，助理直接修改 project/ 目錄下的實際檔案，不再輸出「找這段換那段」的 patch 說明文件

（除非使用者另有要求採用 patch 說明文件形式）。

1.助理在交付前，於 workspace 內實際執行 npm install、npx tsc --noEmit、npx next build

（Turbopack production build）進行驗證，確保程式碼可實際編譯通過，而不僅是肉眼檢查。

1.使用者下載 project/src/ 內容並覆蓋回本機對應位置。
2.若某次改動只涉及少數檔案，助理會明確告知只需覆蓋哪幾個檔案，不要求每次都整包下載。

```

不變的限制（重要，避免誤解為全自動同步）：

```

助理無法直接連線或寫入使用者本機 Windows 檔案系統。 仍需要使用者手動下載並覆蓋檔案到本機專案，無法做到全自動雙向同步。

```

理由：

```

降低使用者手動比對 patch 片段、逐段貼上造成的出錯風險。 讓助理能在交付前實際跑編譯驗證，而不是僅憑閱讀程式碼判斷正確性。 為新手使用者（幾乎沒有程式經驗）進一步降低操作複雜度。

```

---

### 8.18 Track C：Study Set / Flashcard v0 canon

完成狀態：

```

Study Set / Flashcard v0：✅ 已完成並由使用者驗證通過

```

資料模型 canon：

```

Deck = Page（kind: "study_set"），沿用既有 Page shell（title / tags / folder / created_at 等）。 Card = StudyItem：{ id, front, back, mastery, last_reviewed_at, review_count }。 mastery 為簡化熟悉度分類："new" | "learning" | "mastered"，不是完整間隔重複（SRS）演算法。 Page.kind?（optional，缺省視為 "note"）與 Page.study_items?（僅 study_set 使用）皆為向後相容欄位， 不影響既有 IndexedDB 中沒有這兩個欄位的舊資料。 CreatePageInput 新增 kind?，IndexedDBAdapter.createPage() 依 kind 決定是否初始化 study_items。

```

UI canon：

```

Sidebar 提供「🗂 New Study Set」建立入口，比照既有 Import PDF 按鈕的位置與風格。 Sidebar 頁面列表中，kind === "study_set" 的項目標題前顯示 🗂 圖示。 點擊 kind === "study_set" 的 Page，渲染 StudySetView（卡片管理 + 練習模式）， 而不是一般的 EditorPane（Tiptap 編輯器）。 StudySetView 分兩種畫面：

1.Cards 模式（預設）：卡片列表，可新增 / 編輯 Front-Back / 刪除單張卡片。
2.Practice 模式：翻頁字卡練習，點擊卡片翻面，再標記「還不熟」或「已經會了」。

```

練習排序 canon：

```

翻頁練習的抽卡順序：優先出「還不熟」的卡（new / learning），並在該分組內隨機排序。 已熟悉（mastered）的卡片以較低機率（約每 3 張還不熟的卡片穿插 1 張）混入練習佇列， 而不是完全排除，避免使用者徹底忘記已熟悉的內容。 標記「已經會了」：new → learning，learning → mastered（需連續兩次「已經會了」才轉為 mastered）。 標記「還不熟」：一律轉為 learning。 每次標記更新 last_reviewed_at 與 review_count。

```

v0 明確排除範圍：

```

不做四選一測驗模式。 不做拼寫模式。 不做 CSV / TSV 匯入。 不做完整間隔重複演算法（SRS），只做簡化的三段熟悉度分類與加權抽卡。

```

可調整、不視為架構限制：

```

目前點擊 Study Set Page 進入「專屬畫面、無 Tiptap 編輯器」的設計可後續調整 （例如改成保留筆記欄位的混合版面，類似 PDF research note 的上下分割）。 之所以可以低風險調整，是因為卡片資料（study_items）與 UI 呈現方式已經分離： 換一種畫面呈現方式不需要動到資料結構或搬移資料。

```

---

### 8.19 NexusApp.tsx 拆檔 canon（延續 D-63）

背景：

```

D-63 曾決策 NexusApp.tsx 超過 1000 行後，優先拆純 UI component，暫緩拆 hooks。 使用者於 Track C 驗證通過後主動提出拆檔建議（應用基本架構已跑穩：Note / PDF Research / Study Set 三種 Page 類型皆已驗證），時機判斷合適，遂執行本次拆檔。

```

拆檔結果：

```

NexusApp.tsx：2301 行 → 864 行。

```

新增純函式模組（src/lib/，無 React 依賴）：

```

blockId.ts       — createClientBlockId() wikilinks.ts      — extractWikilinks() pdfNote.ts        — titleFromPdfFileName() / createResearchNoteContent() inbox.ts          — titleFromMarkdownFileName() / titleFromCaptureText() / captureTextToContentJson() / isInboxPage() markdown.ts       — Markdown import / export 全部邏輯 fileDownload.ts   — downloadTextFile() / safeFileName() / downloadJsonFile() / formatBackupFileName()

```

新增 UI 元件模組（src/components/）：

```

Sidebar.tsx       — 側邊欄 EditorPane.tsx    — 筆記編輯畫面（原名 Editor，改名避免與 Tiptap 套件本身的 Editor class 衝突） RightPanel.tsx    — Backlinks / Outgoing Links 面板

```

拆檔原則（延續 D-63，未擴大範圍）：

```

只拆純函式與純 UI component。 NexusApp.tsx 仍保留 Root App 的 state 管理、所有 handler、資料存取邏輯，不拆 hooks， 避免對新手手動維護造成過大抽象負擔。 拆檔不改變任何既有行為與資料流；所有拆出的函式簽章與呼叫方式維持不變。

```

驗證方式：

```

從乾淨環境重新執行 npm install → npx tsc --noEmit（零錯誤）→ npx next build （Turbopack production build 成功），執行兩輪確認結果一致。 手動確認所有拆檔後的 import 皆有實際使用。 使用者下載整包 src/ 覆蓋本機後完整回歸測試，回報「沒有破壞任何行為」。

```

---

### 8.20 Editor Blocks Foundation — Table canon

完成狀態：

```

Table（表格）：✅ 已完成並由使用者驗證通過

```

範圍確認：

```

Image block 迫切性較低，使用者要求擱置、之後再討論，不列入本批。 分批順序確認為：Table → Callout → LaTeX（LaTeX 複雜度最高，排最後）。

```

套件：

```

@tiptap/extension-table@3.27.1（提供 TableKit，內含 Table / TableRow / TableHeader / TableCell）

```

Editor canon：

```

TableKit.configure({ table: { resizable: true } })，允許拖曳調整欄寬。 Toolbar 提供「Table」按鈕，呼叫 insertTable({ rows: 3, cols: 3, withHeaderRow: true })。 游標位於表格內時（toolbarState.table），Toolbar 額外顯示： +Col（addColumnAfter）/ +Row（addRowAfter）/ -Col（deleteColumn）/ -Row（deleteRow）/ ✕Table（deleteTable）。 CSS 於 .nexus-tiptap-editor scope 明確定義 table / td / th / .selectedCell / .column-resize-handle / .tableWrapper 樣式，確保表格框線、表頭底色、 欄寬拖曳把手正確顯示（呼應 D-67 的既有 CSS 原則）。

```

Markdown export canon：

```

新增 tableToMarkdown()，將 table 節點轉成標準 Markdown table 語法（| A | B | 格式）。 基本版僅取每個 cell 的純文字內容（跨段落以空白接續），不處理 colspan / rowspan 或儲存格內巢狀 block（清單、引用等），維持 Markdown export v0 的範圍控制精神（D-68）。 cell 內容中的 | 字元會被跳脫（\\|），避免破壞表格語法。

```

---

## 8B. 部署排查案例：package.json 層級異動的交付規則

> 本節記錄 2026-07-02 Table block 交付後發生的一次部署問題，並訂立後續規則，避免重複發生。

案例摘要：

```

Table block 交付時，助理只提示「工作區已是最新版本」，未明確強調 package.json （位於專案根目錄，不屬於使用者慣常覆蓋的 src/ 範圍）也需要更新並重新執行 npm.cmd install。 使用者本機因此缺少 @tiptap/extension-table 套件，VS Code 中 Table 相關指令全部標紅（TS 2339）。 使用者嘗試完全重新安裝時，package.json 中該行被誤植為 "@types/extension-table" （貼上過程中常見的命名空間污染），導致 npm install 出現 E404 找不到套件的錯誤。

```

訂立規則（新增）：

```

1.若某次改動涉及 package.json（新增 / 修改依賴套件），交付訊息必須明確、獨立列出

「這次也需要更新 package.json 並重新執行 npm.cmd install」，不能只說「工作區已是最新版本」。

1.使用者回報 npm install 出現 404 / 找不到套件等錯誤時，優先檢查是否為套件名稱被貼上污染

（例如 @tiptap 被誤植為 @types），而不是預設為套件本身不存在或版本錯誤。

1.遇到 package.json 層級的錯誤，直接提供完整、確認正確的檔案內容供整份覆蓋取代，

比起只指出「哪一行打錯」更能降低使用者再次手動修改出錯的風險。

```

---

### 8.21 Editor Blocks Foundation — Callout canon（含已知未解問題）

完成狀態：

```

Callout（提示框 / 重點框）：🟡 大部分完成，含 1 個已知未解問題（見下方 8.21.3）

```

範圍確認（呼應使用者需求）：

```

variant（顏色類型）與 icon（圖示）分開設定，比照 Notion 做法。 5 種顏色類型：info（藍）/ warning（黃）/ success（綠）/ danger（紅）/ note（灰）。 圖示可從常用清單挑選，或選擇「移除圖示」變成純文字提示框（icon 為空字串代表主動移除， null/undefined 代表未指定、落回該 variant 的預設圖示）。 Callout 內容允許多個 block（content: "block+"）。

```

實作 canon：

```

新增 src/lib/calloutExtension.ts，自訂 Tiptap Node，採 vanilla JS addNodeView() （不依賴 @tiptap/react，維持與專案其餘部分一致的技術棧）。 node 屬性：defining: true（保留）；不設 isolating（見下方 8.21.1 說明其危害）。 透過 declare module "@tiptap/core" 做 module augmentation， 讓 setCallout / unsetCallout / updateCalloutAttrs 三個指令具備完整型別安全， 呼叫端不需要使用 as any。 setCallout 實作採用 commands.toggleWrap(this.name, { variant })， 比照官方 Blockquote extension 的既有慣例（toggleBlockquote() 內部呼叫 toggleWrap()）， 而非直接用 wrapIn()：toggleWrap 會自動判斷目前是否已在 callout 內，是則解開、否則包起來， 邊界情況（例如空段落）處理較成熟。

```

Markdown import/export canon：

```

採用 Obsidian / GitHub 慣用的 "> [!TAG] icon" 語法，例如 "> [!WARNING] ⚠️"。 CALLOUT_VARIANT_TO_TAG / CALLOUT_TAG_TO_VARIANT 對照表維護 variant 與語法標籤的雙向轉換； import 端額外支援 TIP → info、CAUTION → warning、IMPORTANT → danger 的常見別名。 Callout 內部多個 block 之間必須用「空白引用行」（單獨的 ">"）分隔， 對應 export 時用 "\\n\\n" 分隔不同 block 再逐行加上 "> " 前綴； import 時將提取出的內層文字整段遞迴丟回 createMarkdownContent() 解析。

```

#### 8.21.1 已修正問題：isolating: true 阻擋 lift 指令，導致無法解開 Callout

決策記錄：Callout node 原本設定 `isolating: true`，導致 ProseMirror 的 `lift`（解開包裹）指令永遠回傳 `false`，使用者再次點擊 Toolbar 按鈕無法把 Callout 解開恢復成一般段落。已透過 jsdom + 真實 Editor 實例測試證實：移除 `isolating: true` 後 `lift` 指令正確回傳 `true`。修正為移除 `isolating: true`，保留 `defining: true`。使用者已驗證此問題修正成功。

```

教訓：isolating 屬性的效果比表面描述（阻止一般編輯操作跨越節點邊界）更廣泛， 會連帶影響 lift 等『解開包裹』類型的指令，未來若有其他 custom node 需要考慮 是否使用 defining / isolating，應先用真實 Editor 測試驗證 toggle 開關流程， 不能只驗證『插入』方向的行為。

```

#### 8.21.2 驗證方法升級：jsdom + 真實 Editor 實例

決策記錄：Callout 是本次 Editor Blocks 中複雜度最高的自訂實作，因此在標準的
`tsc --noEmit` / `next build` 之外，額外建立更進階的驗證方式：

```

1.純邏輯層：直接呼叫 markdown.ts 的 pageToMarkdown() / createMarkdownContent()，

驗證 export → import round-trip（此階段抓到並修正一個真實 bug：多段落內容 未用空白引用行分隔，reimport 時被誤合併成一段）。

1.DOM 互動層：安裝 jsdom + tsx（開發時暫裝，驗證完畢即移除，不寫入 package.json），

建立真正的 @tiptap/core Editor 實例掛載到 jsdom 的 DOM 節點， 模擬使用者點擊按鈕/選單選項的完整流程，檢查底層 ProseMirror 文件狀態是否如預期變化。

```

理由：

```

自訂 Tiptap Node（尤其含 addNodeView 的互動元件）涉及 ProseMirror 底層行為， 單純閱讀程式碼或憑經驗判斷容易遺漏邊界情況（例如本次 isolating 的真實影響）； 用真實 Editor 實例重現問題比純推測更可靠，值得作為未來類似複雜度實作的標準做法。

```

#### 8.21.3 已知未解問題：圖示選單在真實瀏覽器中點擊無效

現況：

```

使用者測試「點圖示 → 選單彈出 → 選圖示 → 確認換成功」失敗（真實瀏覽器環境）。

```

已完成的修正嘗試（jsdom 測試中邏輯正確，但未解決使用者回報的真實瀏覽器問題）：

```

根本原因判斷：比對使用者回報「切換類型下拉選單有效、圖示按鈕無效」的不對稱線索， 發現下拉選單（variantSelect）已有 mousedown 事件保護（event.stopPropagation()）， 但圖示按鈕（iconButton）與選單內選項按鈕皆缺少同樣保護。 理論依據：Tiptap 官方 TaskItem 節點原始碼採用相同模式 （checkbox.addEventListener('mousedown', event => event.preventDefault())）—— 若不在 mousedown 階段攔截，ProseMirror 會搶先將點擊視為『編輯器內容選取』處理， 導致按鈕的 click 事件實際上不會觸發。 已修正：為 iconButton 與 renderMenu() 產生的所有按鈕（含「移除圖示」）補上 mousedown 攔截。 jsdom 直接派發 DOM click 事件的自動化測試中，此修正後邏輯運作正確； 但使用者於真實瀏覽器環境測試後仍回報失敗，代表問題尚未完全解決， 確切原因與 jsdom 測試結果不一致，可能與真實瀏覽器的事件時序、CSS 顯示狀態、 或 jsdom 無法完整模擬 ProseMirror 某些底層行為有關，需要近一步排查 （例如取得使用者瀏覽器 DevTools 的實際錯誤訊息或行為觀察）。

```

使用者決策：

```

問題判斷為「問題不大」，同意先擱置、繼續推進其他 track，之後有空再回頭排查。 此為使用者明確決策，非助理片面判斷此問題不重要；下一個接手者不應假設此問題已解決。

```

---

### 8.22 Editor Blocks Foundation — LaTeX / Block Math canon（Editor Blocks 三批全數完成）

> 🔴 **範圍已被後續 8.23 節取代，請勿只看本節就下結論**：本節記錄的「只做 block、不做 inline」是**當時（第一版官方 $$/$$$ prompt 版本）的範圍宣告**。後續 8.23 節「Obsidian 風格原地編輯改版」時，InlineMath 已與 BlockMath **一併**實作完成（NodeView、Toolbar 按鈕、Markdown import/export 三處皆已接上，並非只完成 BlockMath 的改版）。本節的技術選型、互動設計、Markdown 語法等內容，凡是與 8.23 節衝突之處，一律以 8.23 節為準；本節保留僅作歷史紀錄，不代表目前實際行為。

完成狀態：

```

LaTeX / Block Math（第一版，官方 $$/$$$ prompt 語法）：✅ 已完成並由使用者驗證通過 Editor Blocks Foundation 三批（Table、Callout、LaTeX）至此全數完成 🔴 此狀態已過時：InlineMath 已於 8.23 節與 BlockMath 一併完成 Obsidian 風格改版， 不再是「只做 block」的範圍，見 8.23 節與下方範圍確認的更新說明。

```

範圍確認（🔴 此範圍宣告已過時，僅保留作歷史紀錄）：

```

【本節原始範圍，已被 8.23 節取代】只做單獨段落公式（block equation），不做行內 公式（inline equation）。此邊界非底層架構限制：content_json 可自由容納新節點 類型；官方套件把 BlockMath / InlineMath 設計成可獨立引入、共用同一套 KaTeX 渲染邏輯，未來加入 InlineMath 屬於低風險追加動作，不需要重做既有的 BlockMath 實作。 使用者熟悉 LaTeX 語法，不需要額外的常用符號快捷按鈕輔助。

【實際最終結果，見 8.23 節】使用者後續要求 Obsidian 風格原地編輯體驗時， InlineMath 與 BlockMath 是同一批一併重寫完成，並非先前預告的「之後再低風險追加」—— 兩者共用同一套 createObsidianMathNodeView(isInline) 工廠函式與同一個 ObsidianMathInput 打字轉換邏輯，程式碼層面本來就沒有分開兩次交付的必要。 InlineMath 目前狀態：✅ 已完成（NodeView 原地編輯、Toolbar「x Math」按鈕插入、 Markdown $latex$ import/export 三處皆已實作並經 jsdom 驗證，見 8.23 節）。

```

技術選型 canon：

```

採用 Tiptap 官方 @tiptap/extension-mathematics（3.27.1，與專案其餘 Tiptap 套件版本對齊）， 只引入其中的 BlockMath（而非完整 Mathematics extension）。 搭配 katex（^0.16.11）作為底層公式渲染引擎；引入 katex/dist/katex.min.css 樣式。 BlockMath.configure({ katexOptions: { throwOnError: false } })， 避免使用者輸入不合法 LaTeX 語法時直接拋出例外中斷編輯器。

```

互動設計 canon：

```

Toolbar「∑ Math」按鈕僅負責「插入新公式」（window.prompt() 輸入 LaTeX 字串）。 編輯 / 刪除既有公式一律透過點擊公式本身觸發，使用官方 BlockMath.configure({ onClick }) 提供的 (node, pos) 回呼，不透過 Toolbar 按鈕判斷目前是否「選中」公式 （插入後游標會移到公式後方，isActive('blockMath') 會是 false，無法用來判斷編輯意圖）。

```

**重要實作限制（必須遵守，見 8.22.1）**：

```

呼叫 updateBlockMath / deleteBlockMath 時必須明確傳入 { pos }， 不可依賴 setNodeSelection(pos) 之後省略 pos 選項的寫法（會失敗）。

```

Markdown import/export canon：

```

Export 採 $$...$$ 慣例語法（LaTeX block math 常見寫法），對應 `$$\\n${latex}\\n$$` 格式。 Import 辨識 "$$" 開頭與結尾的區塊，中間所有行合併為單一 latex 字串（保留換行）， 支援多行 LaTeX（例如 \\begin{aligned}...\\end{aligned} 這類多行語法）。

```

#### 8.22.1 已修正問題：updateBlockMath / deleteBlockMath 依賴選取狀態不可靠

決策記錄：官方 `updateBlockMath` / `deleteBlockMath` 指令若省略 `pos` 選項，會改讀 `editor.state.selection.$from.pos`；但透過 `setNodeSelection(pos)` 產生的是 `NodeSelection`，其 `$from.pos` 語意與一般 `TextSelection` 不同，導致指令內部查無對應節點而回傳 `false`、實際未執行成功。已透過 jsdom + 真實 Editor 實例測試證實：改為明確傳入 `{ pos }`（直接使用官方 `onClick(node, pos)` 回呼提供的 `pos`）後，插入 → 更新 → 刪除的完整流程皆正確運作。

```

教訓：自訂或使用官方複雜 extension 時，不要假設「先選取節點、再呼叫指令」的直覺寫法 一定正確；應優先查看 extension 原始碼的指令實作邏輯，或用真實 Editor 測試驗證每個 指令的實際行為，不要憑經驗類比其他指令（例如本次曾誤以為 setNodeSelection 搭配 updateBlockMath 的用法與其他 Tiptap 指令一致）。

```

#### 8.22.2 意外發現並修正：Table 匯入功能先前從未實作

決策記錄：撰寫 LaTeX 的混合 block 迴歸測試（Callout + blockMath + taskList + table 一起匯出再匯入）時，發現 `table` 類型在 reimport 後消失、被當成純文字。追查後確認：Table block 完成時（8.20 節）只實作了 `tableToMarkdown()`（匯出），`createMarkdownContent()`（匯入）中從未加入辨識 `| A | B |` 表格語法的邏輯。此為先前 Table 交付時遺漏的一半功能，非 LaTeX 改動造成的迴歸，本次意外發現後一併補齊。

修正內容：

```

createMarkdownContent() 新增表格偵測邏輯：辨識第一行為 "| ... |" 格式、 第二行為分隔線（"| --- | --- |"）的區塊，解析表頭與資料列還原為 table / tableRow / tableHeader / tableCell 節點。 基本版僅處理此情況，不支援欄位對齊語法（如 :---:）或 colspan / rowspan， 維持與 export 端一致的範圍控制（呼應 D-68 Markdown v0 範圍控制精神）。

```

理由：

```

1.混合多種 block 型別的迴歸測試，比單一功能測試更容易發現「兩個功能各自測試都通過，

但放在一起或反向操作時才會暴露」的缺口，值得作為未來的標準測試習慣。

1.修正時機在使用者測試前的自動化驗證階段被發現，避免使用者在實際使用時才碰到此問題。

```

#### 8.22.3 部署排查補充：使用者可能看漏已提供的 package.json 提醒

決策記錄：本次 LaTeX 交付時已依 D-116 規則明確提醒需要更新 `package.json` 並重新 `npm install`。使用者稍後回報「deleteBlockMath 出現跟剛剛一樣的問題」，助理一度誤判為功能邏輯問題並投入 jsdom 深度測試排查（結果邏輯完全正確），後續確認才發現使用者這次操作時看漏了提醒文字。

補充規則（延伸 D-116）：

```

即使已明確提醒 package.json 異動，使用者仍可能看漏；當使用者用模糊描述回報問題 （例如「跟之前一樣的問題」「標紅」）時，應先詢問具體現象與環境 （例如「是完全沒反應，還是程式碼標紅？」「是否已重新 npm install？」）， 不要直接假設是同一類型問題並跳去做深度邏輯排查，避免在錯誤方向上消耗時間。

```

---

### 8.23 Editor Blocks Foundation — LaTeX 改版：Obsidian 風格原地編輯公式（取代 8.22 節官方 $$/$$$ prompt 版本）

完成狀態：

```

Obsidian 風格公式編輯：✅ 已完成並經 tsc / build / jsdom 驗證，🟡 尚待使用者於真實瀏覽器最終確認 本節取代 8.22 節「互動設計 canon」與「Markdown import/export canon」兩段落的內容 （8.22 節文字仍保留不刪除，作為歷史紀錄；目前實際行為以本節為準）。

```

背景（延伸 1S 節）：

```

8.22 節記錄的第一版 LaTeX 功能，互動採用 Tiptap 官方預設的「點擊公式跳 window.prompt() 輸入 LaTeX 字串」模式，語法採官方預設的 $$ 行內 / $$$區塊。 使用者事後要求改造成真正的 Obsidian 風格「原地編輯」體驗：點擊公式直接展開成 可編輯的原始碼、離開自動收合渲染、方向鍵可穿越公式邊界、打字$.../$$...$$ 直接 即時轉換，不再跳出 prompt 視窗。使用者並帶入另一個獨立 AI 對話串先前失敗兩次的 完整記錄（詳見 00 文件 1S.1 節），要求本次由此串重新接手做對。 本次並未照抄該對話串的程式碼，而是理解其崩潰根因後獨立重新設計實作。

```

分隔符 canon（真正 Obsidian 慣例，非官方套件預設）：

```

單一錢字號 $latex$      → 行內公式（inlineMath） 雙錢字號   $$latex$$    → 區塊公式（blockMath，獨立成行） 此語法與 8.22 節記錄的官方預設語法（$$ 行內 / $$$ 區塊）不同， 三處實作（obsidianMathInput.ts 即時輸入判斷、markdown.ts import/export、 obsidianMathNodeView.ts 展開編輯時填入的原始碼格式）皆已同步為此新語法， 不存在新舊語法混用的情況。

```

互動設計 canon（取代 8.22 節的 prompt 版本）：

```

Toolbar「x Math」「∑ Math」按鈕：不再跳 window.prompt()，改為 insertContentAt(pos, { type, attrs: { latex: "" } }) 插入一個空白公式節點， 緊接著 setNodeSelection(pos) 選中該節點，觸發 NodeView 的 selectNode()， 該節點自動展開成可編輯狀態並 focus，使用者直接原地打字。 點擊已存在的公式（.math-preview 元素）：觸發 NodeView 的 enterEdit()， 展開成帶 $ 或 $$分隔符的 <input>（行內）或 <textarea>（區塊）， 自動 focus 並依進入方向（點擊＝全選；方向鍵進入＝依方向決定游標在開頭或結尾） 設定游標位置。 離開編輯（失焦 / Enter[僅行內] / 方向鍵越過內容邊界）：呼叫 exitEdit(true)， 存檔並收合回 KaTeX 渲染；若內容清空則改為刪除整個節點。 Escape：呼叫 exitEdit(false)，捨棄變更並還原為進入編輯前的內容。 打字即時轉換：由 ObsidianMathInput（ProseMirror Plugin 的 handleTextInput， 非官方 InputRule，見下方 8.23.1 說明原因）攔截使用者輸入的 "$" 字元， 比對游標前文字＋新輸入的 "$" 組成的字串，命中 $$...$$（優先）或$...$即轉換為對應節點。內容前後緊鄰空白（或整段是空白）時不觸發轉換， 避免「It costs$5 and $10」這類金額文字被誤判成公式。

```

**重要實作限制（延續 8.22.1 的教訓，適用於本次所有新程式碼）**：

```

1.updateInlineMath / updateBlockMath / deleteInlineMath / deleteBlockMath

一律明確傳入 { pos }，不依賴目前 selection 去猜測位置（見 D-119）。

1.自訂 NodeView 一律回傳 ignoreMutation() { return true }，避免 KaTeX 內部

渲染造成的 DOM 變動被 ProseMirror 誤判為文件內容變更（教訓源自 Callout 開發期間的 8.21.1 節，本次沿用同一原則套用到公式 NodeView）。

1.任何在同一個 transaction 內、對 tr 做過 replaceWith / insert 等變更後，

若需要再計算/設定 selection 位置，一律用「變更後」的 tr.doc 去 resolve， 不可沿用呼叫當下傳入的 state.doc（見 D-122，源自另一 AI 對話串的崩潰教訓）。

```

Markdown import/export canon（取代 8.22 節的 $$/$$$ 版本）：

```

inlineMath export → `$${latex}$`（單錢字號包住 latex，無多餘換行） blockMath  export → `$$\\n${latex}\\n$$`（獨立一行的 $$開頭與結尾，latex 置中） Import 端 parseInlineMarkdown() 辨識單錢字號$latex$（負向後顧排除緊接著第二個$ 的 情況，避免誤吃區塊公式開頭），token 掃描器列表同步從 "$$" 改為 "$"。 Import 端 createMarkdownContent() 偵測獨立一行的 "$$" 作為區塊公式起訖記號 （取代原本的 "$$$"），中間所有行合併為單一 latex 字串（保留換行，支援多行 LaTeX）。 Import 端兩處皆套用與 obsidianMathInput.ts 一致的「內容前後緊鄰空白視為非公式」防呆。 不做舊版 $$/$$$ 語法的自動遷移：若使用者手上有先前版本匯出的 .md 檔案， 重新匯入時舊語法的公式將被當成純文字，需要使用者手動調整（此邊界需要在 使用者實際測試時明確告知，見 00 文件 1S.6）。

```

#### 8.23.1 決策：不使用官方 InputRule，改用 ProseMirror 原生 handleTextInput

決策記錄：另一個 AI 對話串在嘗試用官方 `InputRule` 機制自訂 `$` / `$$` 規則時，先遇到 TypeScript 型別錯誤（`InputRule.handler` 的回傳型別只接受 `void | null`，不接受 `Transaction`），修正後又出現邏輯不穩定的情況（使用者回報「跟剛剛一樣的問題」）。本次重新設計時，直接改用 ProseMirror 原生的 `handleTextInput(view, from, to, text)` props，只攔截使用者輸入的單一 `"$"` 字元，自行比對比對游標前文字組成的完整字串，比對到才手動建構並 dispatch 一個 transaction。

理由：

```

1.handleTextInput 是比 InputRule 更底層、更直接的攔截點，不受 InputRule 內部

handler 回傳型別限制的影響，也不需要跟官方 BlockMath / InlineMath 內建的 InputRule（判斷 $$/$$$ 語法）搶輸入時機——直接透過 addInputRules() { return []; } 停用官方輸入規則，改由此處完全接管。

1.手動建構 transaction 讓「先判斷區塊、再判斷行內」「排除誤判」等邏輯有完整控制權，

不受 InputRule 內部比對機制的限制。

```

#### 8.23.2 決策 D-122：transaction 內的位置計算必須用變更後的 tr.doc，不可用變更前的 state.doc

決策記錄：另一個 AI 對話串在崩潰事故中，於同一個 transaction 內先用 `tr.replaceWith(...)` 換掉一段文字為公式節點，之後卻用「舊的」`state.doc`（變更前的文件）去 `resolve()` 新的游標位置，而不是用替換後的 `tr.doc`。這導致 resolve 出來的位置已經不屬於目前文件版本，`tr.setSelection(...)` 直接拋出 `"Selection passed to setSelection must point at the current document"` 例外，使編輯器崩潰。

理由：

```

1.ProseMirror 的 Transaction 物件在呼叫 replaceWith / insert / delete 等方法後，

tr.doc 會立刻反映變更後的最新文件狀態，但傳入 handleTextInput / command 的 state（及其 state.doc）永遠是變更「之前」的舊快照，兩者不能混用。

1.本次重新實作（obsidianMathInput.ts）中，所有 replaceWith 後的位置計算，

一律改用 tr.doc.resolve(...) 而非 state.doc.resolve(...)，並用 TextSelection.near($pos) 包裹结果（而非硬選一個固定位置），讓 ProseMirror 在位置剛好落在節點邊界等邊緣情況時能自動修正到合法位置，不會直接拋例外。

1.此教訓具有高度可重用性：未來任何一次 transaction 內對 tr 做過內容變更、

接著又要設定 selection 的場景，都應優先檢查是否誤用了變更前的 state.doc。

```

#### 8.23.3 決策 D-123：插入空白節點 + setNodeSelection 觸發 NodeView selectNode() 的 UX 模式，取代 window.prompt()

決策記錄：Toolbar 的「插入新公式」按鈕，從「跳 `window.prompt()` 問使用者要輸入什麼 LaTeX 字串」的舊模式，改為「先插入一個 `latex: ""` 的空白節點，再用 `setNodeSelection(pos)` 選中它」。因為公式 NodeView 已經實作了 `selectNode()`（節點被 ProseMirror 選中時會自動呼叫），會自動展開成可編輯狀態並 focus，等同「使用者插入公式後可以直接原地打字」，不需要再跳出瀏覽器原生的 `prompt()` 對話框（`window.prompt()` 在使用體驗與可自訂性上都遠遜於原地編輯，且與 Obsidian 風格的整體互動不一致）。

理由：

```

1.已用 jsdom + 真實 Editor 實例驗證（見 00 文件 1S.3 測試 8）：

insertContentAt(pos, {...}) 插入節點後，對同一個 pos 呼叫 editor.chain().setNodeSelection(pos).run()，確實會觸發 NodeView 的 selectNode()，且該函式內部呼叫的 enterEdit() 會正確顯示編輯框。

1.此模式可重用於未來任何「插入後立即進入編輯狀態」的自訂 NodeView 需求，

不需要每次都設計跳出視窗的互動方式。

```

---

### 8.24 Track G — Navigation & Overview（Command Palette + Dashboard / Home v0）canon

完成狀態：

```

Command Palette（Ctrl/Cmd+K）：✅ 已完成並由使用者於真實瀏覽器實機測試回報「一切正常」 Dashboard / Home v0：✅ 已完成並由使用者於真實瀏覽器實機測試回報「一切正常」

```

背景（呼應 D-125）：

```

Dashboard / Home 先前在 1M/1N 節被列為 r14 分類中的 System Views，判斷「暫緩， 待近期 tracks 告一段落後再評估」，理由是 Dashboard 通常需要彙整多種 creatable 的摘要視圖，過早做容易受限於當時尚未完成的其他模組。 本次使用者於 Track A~F、Track A2 皆已完成後主動指名要做，此時 Note / PDF Research / Study Set 三種 Page 類型皆已跑穩，判斷時機已成熟，因此提前落地為 v0 輕量版。 Command Palette 先前在第 16 節「可優化但不阻塞」表格中被列為「長期核心， 但 Search / Sidebar 穩定後再做」，本次一併完成。

```

Command Palette canon：

```

新增 src/components/CommandPalette.tsx，Ctrl（Windows）/ Cmd（Mac）+ K 快捷鍵開啟， Escape 關閉，上下鍵導覽，Enter 執行，滑鼠點擊亦可執行。 內部清單分兩類：

1.Actions：固定的常用動作，直接呼叫既有 NexusApp handler，包含

Go to Home / Notes / Inbox / Trash、New Note、New Study Set、 Import PDF、Import Markdown、Export current page as Markdown、 Export Workspace Backup。

1.Pages：依標題（不含正文）模糊比對現有 pages，依 updated_at 排序，

無輸入時預設顯示最近 8 筆，有輸入時最多 20 筆。 不新增任何資料模型，不重複實作任何既有 handler 的邏輯（見 D-124）。

```

Dashboard / Home v0 canon：

```

新增 src/components/Dashboard.tsx，點擊 Sidebar 的「🏠 Home」按鈕進入。 統計卡片：全部頁面 / 筆記 / PDF 研究 / Study Set 四類數量，純前端即時計算 （isResearchPage 以 primary_attachment_id 是否存在判斷，isPlainNote 排除 kind 為 study_set 與有 primary_attachment_id 的頁面），不新增後端聚合查詢。 快速建立區：New Note / New Study Set / Import PDF 三個按鈕，呼叫既有 handler。 最近編輯清單：依 updated_at 排序取前 8 筆，點擊可直接跳轉並離開 Home 視圖。 進入 Home 視圖時不顯示 RightPanel（Backlinks / Outgoing Links 面板）， 因為 Home 沒有對應單一 active page 的關聯可顯示。 v0 明確排除範圍：不做 Calendar / Board 摘要、不做跨 creatable 的聚合查詢、 不做可自訂排列的 widget 系統，未來若有需要再擴充。

```

視圖狀態管理 canon：

```

NexusApp.tsx 新增 isHomeMode state，與既有 isTrashMode / isInboxMode 同層級 管理，互斥切換（進入任一視圖時，其餘視圖 state 一併設為 false）。 所有既有「切換視圖」與「建立新頁面」流程（handleCreatePage、 handleCreateStudySet、handleDuplicatePage、Markdown / PDF import、 handleSelectPageByTitle、handleRestorePage 等）皆同步補上 setIsHomeMode(false)，確保從 Home 視圖觸發這些動作時能正確跳轉。 render 邏輯中，isHomeMode 分支優先權高於 activePage?.kind === "study_set" 分支。

```

### 8.25 Track H — Preferences（偏好設定）／ i18n 多語系 canon

完成狀態：✅ 已完成並經 tsc / build 驗證（見 00 文件 1U.2 節、D-126 之前的既有原則延伸，本身無獨立 D 編號，因為屬於基礎設施性質而非產品決策）。

```

語言偏好持久化與 active_page_id 完全相同的 settings store 存取模式 （key/value record），不新增額外 object store，不引入 localStorage， 維持「偏好設定與筆記資料同一個 IndexedDB」的 local-first 一致性。 StorageAdapter / IndexedDBAdapter 新增 getLanguagePreference() / setLanguagePreference(language)。 LanguageProvider 包在 NexusApp 最外層，useLanguage() hook 提供 { language, setLanguage, t }；t() 支援 {{paramName}} 字串替換。 初始化流程：優先讀取已儲存的語言偏好；若使用者從未手動選過語言， 回退到 detectDefaultLanguage()（依 navigator.language 推測）。 翻譯範圍涵蓋所有使用者看得到的文字：導覽標籤、按鈕、輸入框 placeholder、tooltip、空狀態文字、alert()/confirm() 訊息等， 不允許因為是「功能性」標籤就保留寫死的英文。 目前只支援 English / 繁體中文，但 SUPPORTED_LANGUAGES 與 DICTIONARIES 分開設計，未來新增語言只需三步（型別新增字面值、 清單新增一筆、字典新增一份翻譯），缺的 key 會 fallback 回英文。

```

### 8.26 Track I — Sidebar UX（我的最愛 / 重新命名）canon

完成狀態：✅ 已完成並經 tsc / build 驗證（見 00 文件 1U.3 節、D-128）。

```

Page 新增 is_favorite?: boolean（缺省視為 false，向後相容）。 handleToggleFavorite(id)：純粹切換布林值，走既有 auto-save pipeline。 handleRenamePage(id, title)：與 handleTitleChange 邏輯相同，差別在於 接受 id 參數，可對任一頁面重新命名（不限於 activePage）。 PageItemMenu「⋮」選單新增「加入/移除最愛」（★/☆）與「重新命名」 （✏️）；重新命名採原地將標題文字換成 <input> 的互動（D-128）， Enter 確認、Escape 取消、失焦自動確認，與既有的資料夾編輯互動 模式一致。

```

### 8.27 Track J — Notion 風格 Drag Handle canon

完成狀態：✅ 已完成並經 tsc / build 驗證（見 00 文件 1U.4 節、D-132）；觸發範圍問題已於 Track M 修正（D-144，見 8.30 節）。

```

新增套件（精確版本 3.27.1，--save-exact）： @tiptap/extension-drag-handle @tiptap/extension-node-range（必須註冊在 DragHandle 之前，見 D-132） render() 手動建立 DOM 元素（本專案未使用 @tiptap/react），內容為 「⠿」字元，樣式集中在 TiptapEditor.tsx 的 <style> 區塊 .nexus-drag-handle 選擇器。 只啟用頂層 block 拖曳，不啟用 nested（清單項目內部），避免新手 使用者不小心把巢狀清單拖到結構混亂的位置。

```

### 8.28 Track K — Resizable Sidebar / RightPanel canon

完成狀態：✅ 已完成並經 tsc / build 驗證（見 00 文件 1U.5 節、D-135/D-136）。

```

新增 src/components/ResizablePanel.tsx：包住 Sidebar / RightPanel 的 可拉伸容器，side 決定拖曳把手在容器的哪一側，拖曳時在 document 層級監聽 mousemove/mouseup。支援 bottomInset prop（見 D-139 與 8.29 節現況更新）。 職責邊界（D-136）：收合狀態改由外層（NexusApp）管理，觸發按鈕 固定在 Sidebar / RightPanel 標頭列（取代原本「多選」按鈕位置）， 取代先前浮在面板邊緣、使用者回報「卡手」的收合箭頭按鈕。 連動調整：「多選」按鈕移到 Notes 導覽列右側；Inbox / Trash 移到 Sidebar 最下方固定（不隨筆記清單捲動）。 Bug 修復：Sidebar.tsx 筆記清單容器、RightPanel.tsx 對應容器、 ResizablePanel.tsx 內部 flex-1 容器皆補上 min-h-0，修正 flex item 預設 min-height: auto 導致 overflow-y-auto 子區塊無法正確收縮、 內容被外層 overflow-hidden 裁切的問題。

```

### 8.29 Track L — Document 頁面種類 + 新建入口收斂 canon

完成狀態：✅ 已完成並經 tsc / build / Playwright 實測驗證（見 00 文件 1U.6～1U.8 節、D-140/D-141/D-142）。

```

資料模型： PageKind 擴充為 "note" | "document" | "study_set"（D-140）。 新增 PageFormat = "flow" | "a4" | "16:9" | "4:3" | "custom"，Page / CreatePageInput 新增 format?: PageFormat（缺省 "flow"，D-141）。 IndexedDBAdapter.createPage() 寫入 format 欄位。 本次範圍明確收斂為「只記錄格式選擇，不實作排版引擎」，經 ask_user 確認；A4 分頁計算、簡報模式預覽留待後續 track。 新增檔案： src/components/NewPageDialog.tsx：兩步驟建立對話框（選類型→選 格式）。「記事本」經 ask_user 確認不是獨立類型，只是 Note 的別稱。 新建入口收斂（D-142）： Sidebar 移除獨立「新增」ToolbarDropdown（保留「匯入」，見 D-126）。 Dashboard 改為單一「➕ New」按鈕開啟 NewPageDialog， handleConfirmNewPage 依 kind 分派 onCreateDocument / onCreatePage / onCreateStudySet。 Dashboard 統計卡片從 4 個擴充為 5 個（全部/文檔/筆記/PDF研究/ 學習集），isDocumentPage() 判斷函式新增。 Sidebar「Nexus」logo 改為可點擊按鈕，點擊呼叫 onShowHome； NexusApp 的 isHomeMode 初始值改為 true（Home 成為預設畫面）； Sidebar 移除獨立的「🏠 Home」按鈕（logo 點擊已可達成同樣效果）。

```

### 8.30 Track M — Note 富文字排版分級、匯出範圍分級、帳號設定移入 Sidebar、拖曳把手觸發範圍擴大 canon

完成狀態：✅ 已完成並經 tsc / build / Playwright 實測驗證（見 00 文件 1U.6～1U.9 節、D-143/D-144/D-145/D-146）。

```

Editor 富文字排版分級（D-145）： TiptapEditor 新增 variant?: "rich" | "plain" prop；"rich"（Note） 啟用完整排版工具列，"plain"（Document）維持純文字書寫體驗。 範圍經 ask_user 確認收斂為「Tiptap 官方擴充套件可以直接做的 部分」：字體、字級、顏色、對齊、螢光筆；分欄、圖表等複雜排版 不列入本次範圍。 新增套件（精確版本 3.27.1，--save-exact）： @tiptap/extension-text-style（TextStyleKit 一次提供 TextStyle/ Color/FontFamily/FontSize/LineHeight/BackgroundColor，用 .configure({ backgroundColor: false, lineHeight: false }) 只 啟用需要的部分；@tiptap/extension-color 與 @tiptap/extension-font-family 只是從此套件 re-export， 不需要單獨安裝） @tiptap/extension-text-align（配置 types: ["heading", "paragraph"]） @tiptap/extension-highlight（multicolor: true） EditorPane.tsx 用 key={page.kind === "document" ? "plain" : "rich"} 強制在頁面種類改變時重新掛載 TiptapEditor（extensions 陣列只在 掛載當下的 useEffect 決定一次，key 改變觸發 React unmount/ remount），同時傳入對應的 variant prop。

匯出範圍分級（D-146）： Document（kind === "document"）：維持 Markdown 匯出（沿用 pageToMarkdown / markdown.ts 既有邏輯），PageItemMenu 只顯示 「匯出為 Markdown」一項。 Note（kind === "note" 或未設定，含 PDF research note）：改為只 提供「匯出為 PDF」（window.print() + @media print CSS 規則， 不引入額外 PDF 產生函式庫）與「匯出為 Nexus 頁面」 （.nexus.json，downloadJsonFile 匯出 { schema_version: 1, exported_at, page }）兩項，不再提供 Markdown 匯出。 globals.css 新增 @media print 規則：只保留 .nexus-print-target 區塊（頁面正文），隱藏其餘所有元素；.nexus-print-hide 額外標記 要在列印時強制隱藏的元素（例如 Editor 工具列）。 Command Palette 的 export-markdown 項目改名為 export-current-page， 依 activePageRef.current.kind 動態判斷呼叫對應的匯出 handler。

帳號 / 設定移入 Sidebar（D-143）： 新增 src/components/AccountSettingsRow.tsx，取代已刪除的 src/components/BottomLeftPanel.tsx（原 position: fixed 浮動橫欄）。 掛載在 Sidebar 最底部（Inbox / Trash 固定區塊之後）；左側帳號區 （佔位 UI，Nexus 目前完全 local-first，無真正登入驗證，見 D-133）；右側 ⚙️ 齒輪設定按鈕，定位邏輯比照 PageItemMenu （觸發點偏右側），點擊展開語言選單（讀取 SUPPORTED_LANGUAGES）。 🔴 已知未修正問題：NexusApp.tsx 呼叫 ResizablePanel 包住 Sidebar 時仍帶 bottomInset={64}（D-139 時期為了替 BottomLeftPanel 預留 空間），BottomLeftPanel 刪除後此 prop 已無意義，造成 Sidebar 底部約 64px 的多餘空白，已用 Playwright 截圖確認（<aside> 與 外層 wrapper 的 boundingBox 高度相同，代表這段空間沒有讓給任何 看得見的內容）。詳見 00 文件第 12 節 R-1，建議下一輪優先修正 （移除該處的 bottomInset={64} 即可，屬於風險極低的一行改動）。

拖曳把手觸發範圍擴大（D-144）： 根本原因：@tiptap/extension-drag-handle 的 mousemove 偵測只綁定 在 .nexus-tiptap-editor 元素上，文字左側視覺留白屬於外層容器 EditorPane.tsx 的 padding（48px 64px），不屬於這個元素。 修正：.nexus-tiptap-editor 加上 margin-left: -56px; padding-left: 56px;（負外距 + 對稱內距互相抵銷，文字視覺位置不變，可偵測 範圍向左擴大 56px）。 已用 Playwright 精確計算文字行 bounding box、模擬滑鼠移到文字 起點再往左 30px 處，驗證 .nexus-drag-handle 的計算樣式正確為 { display: "flex", visibility: "visible", opacity: "1" }。

```

---

## 9. Editor / Tiptap Canon

MVP-2 extension 方向（已定原則）：

```

equation 應採結構化 node（inline + block） 可支援 `$...$` / `$$...$$` 作為輸入捷徑 最終保存仍回到 content_json

```

已接入：

```

Tiptap editor StarterKit Placeholder Typography Markdown shortcuts ProseMirror CSS auto-save 800ms（含 beforeunload 緊急存檔） content_json 保存（已驗證完成） useRef(onChange) 動態閉包指標（防 React 閉包雷） extractWikilinks 解析正向連結（/\\[\\[([^\\]]+)\\]\\]/g）

```

TiptapEditor expected behavior：

```

new Editor({ extensions: [StarterKit, Placeholder, Typography], content: page.content_json, onUpdate({ editor }) { onChange({ json: editor.getJSON(), text: editor.getText() }) } })

```

切換 Page：

```

editor.commands.setContent(page.content_json)

```

不要再用：

```

`<p>${content_text}</p>`

```

除非只作 backward compatibility fallback。

Auto-save pipeline：

```

onUpdate → editor.getJSON() → editor.getText() → update activePage.content_json / content_text → debounce 800ms → StorageAdapter.savePage(page) → updated_at / revision / device_id 更新

```

Stable Block ID：

```

每個 block node 應有 attrs: { id: "blk_[nanoid]" } MVP-1 採 Page-level Wikilink Backlinks，因此未強制 block-level ID。 若未來推 block-level backlinks、block reference 或多人協作，再補強此項。

```

---

## 10. UI / Design System Canon

風格：

```

極簡 漂亮 直覺 Content-first Calm productivity Local-first feeling Notion-like power, Obsidian-like ownership

```

MVP-0 layout：

```

Sidebar：約 280px Editor：max-width 約 820px，置中 Right Panel：約 320px，MVP-0 placeholder

```

字體策略：

```

MVP-0 移除 Google Font，使用系統字體。 理由：local-first 氣質、外部依賴少、新手排錯簡單。

```

MVP-1 UI（已完工）：

```

Sidebar polish                ✅ page list interaction         ✅ delete button polish          ✅ Search entry（含 clear ✕）    ✅ Tags chips + 全域 tag filter  ✅ Folders 自動分組（未分類置頂）✅ Right Panel：Backlinks / Outgoing Links ✅ selected / hover / focus states ✅ 字體規格升級至 14~16px        ✅

```

---

## 11. Windows / PowerShell / Debug Canon

啟動 dev server：

```

cd C:\\Users\\user\\Projects\\nexus npm.cmd run dev

```

停止 dev server：

```

在 terminal 按 Ctrl+C，若問是否終止批次工作：輸入 Y Enter。

```

清 Next cache：

```

Remove-Item -Recurse -Force .next npm.cmd run dev

```

殺 port process：

```

taskkill /PID 16528 /F

```

檢查 package：

```

cd C:\\Users\\user\\Projects\\nexus type package.json

```

常見問題：

| 問題 | 原因 | 解法 |
| --- | --- | --- |
| terminal 不能輸入 | dev server 正在跑 | 開 New Terminal；不要關 server |
| `dir src` 找不到 | terminal 不在專案路徑 | `cd C:\Users\user\Projects\nexus` |
| `Module not found` | package 裝錯到父層 | 回到 nexus 再安裝 |
| Turbopack root warning | 父層多 lockfile | 刪父層多餘 package-lock.json |
| port 3000 被佔用 | 舊 dev server 未關 | `taskkill /PID [ID] /F` |
| 清 `.next` 失敗 | 用 cmd 語法 | PowerShell 用 `Remove-Item -Recurse -Force .next` |
| `json.stringify` 錯 | JS 大小寫敏感 | 改 `JSON.stringify` |
| components 找不到 | 建到 `src/app/components` | 移到 `src/components` |

---

## 12. Tasks / Events / Tags / Folders 邊界

Tasks / Events 真相邊界：

```

task block 的 title/done → content_json 是真相 due_date/priority/status/date/start/end → property_values 是真相 tasks/events 表 → projection，不同步

```

Tags vs multi_select：

```

Tags = 一級組織系統，走 tags/page_tags multi_select = 一般 property type

```

MVP-1 建議順序：

```

Search Sidebar polish Tags first Lightweight Folders Backlinks

```

Folders 建議先做輕量版：

```

先單層或簡單 folder_id。 不先做複雜 nested tree / drag-drop。

```

---

## 13. 決策 D-01～D-43

### 13.1 決策總覽

| ID | 決策 | 狀態 / 說明 |
| --- | --- | --- |
| D-01 | Nexus 是個人 local-first all-in-one workspace | 維持 |
| D-02 | 使用者是新手 | 維持 |
| D-03 | 平台先 Windows Web，再跨平台 | 維持 |
| D-04 | Next.js + React + TypeScript + Tailwind + Tiptap | 維持 / 已採用 |
| D-05 | 分階段 MVP | 維持 |
| D-06 | 統一 Page/Block 架構 | 維持 |
| D-07 | 圖層系統支援手寫/PDF | 後續 |
| D-08 | MVP 範圍分期 | 維持 |
| D-09 | Inbox 是重要入口 | MVP-1+ |
| D-10 | 同步是單人跨裝置，不做多人共編 | 後續 |
| D-11 | AI 是手動輔助，不深度自動化 | 後續 |
| D-12 | UI 極簡漂亮 | 維持 |
| D-13 | 預設新增行為 | 維持 |
| D-14 | 檔案 / 資料儲存策略：hybrid / JSON 真相 | 維持 |
| D-15 | Memo / 簡記 | 後續 |
| D-16 | Inbox 觸發方式 | 後續 |
| D-17 | Sidebar 組織方式 | MVP-1 |
| D-18 | Command Palette | 長期核心；不做太早 |
| D-19 | UI 參考圖只作風格 | 維持 |
| D-20 | Right Panel 行為 | 後續 |
| D-21 | Inbox 整理方式 | 後續 |
| D-22 | Properties 系統深度 | MVP-1+ |
| D-23 | 五概念模型 | 核心 |
| D-24 | Markdown / Source / Preview | 後續 |
| D-25 | `content_json` 是正文唯一真相 | 核心 |
| D-26 | StorageAdapter 抽象 | 已實作 |
| D-27 | 只同步真相，衍生資料本機重建 | 後續 |
| D-28 | MVP-0 用 IndexedDBAdapter | 已實作 |
| D-29 | 字體策略：系統 sans-serif | 已採用 |
| D-30 | Block node 從 MVP-0 起 stable ID | 暫緩；MVP-1 採 Page 層 backlinks，未強制 block ID |
| D-31 | Page title 獨立於 `content_json` | 已採用 |
| D-32 | Soft delete，不硬刪 | 已採用 |
| D-33 | UI / Editor 只依賴 StorageAdapter | 已採用 |
| D-34 | MVP-0 嚴格限能寫能存 | 已完成 |
| D-35 | 堅持 TS/JS 生態 | 維持 |
| D-36 | 完整 JSON 儲存 | ✅ 已驗證完成 |
| D-37 | Soft delete 優先於硬刪除 | 已採用 |
| D-38 | Windows debug 指令採 PowerShell 語法 | 維持 |
| D-39 | MVP-1 early 延續 IndexedDB，不提前遷移 SQLite | 新增 |
| D-40 | 文件狀態區分「回報完成」與「已驗證完成」 | 新增 |
| D-41 | modules / active docs 不取代 source archive | 新增（⚠️ 99 已於 2026-07-31 刪除，重要內容併入 02） |
| D-42 | Project Log 應保留最大詳細度版本 | 新增 |
| D-43 | 最終交接採 3 active docs（原計劃含 99，已刪除） | 新增（⚠️ 已簡化為 3 文件） |
| D-44 | MVP-1 採 Page 層 Wikilink Backlinks，不阻塞於 block-level stable ID | 新增 |
| D-45 | Auto-save 必須含 beforeunload 緊急存檔與 useRef(onChange) 防閉包雷 | 新增 |
| D-46 | Soft delete 流程須在刪除前清 debounce timer 並切斷 activePageRef，避免「F5 復活」 | 新增 |
| D-47 | Tags 為一級組織系統，搜尋與標籤過濾以交集 (AND) 套用 | 新增 |
| D-48 | Folders 採單層字串欄位，未分類固定置頂；多層樹狀延後評估 | 新增 |
| D-49 | MVP-2 以「attachments + PDF viewer + research note + citation metadata + LaTeX」為正式範圍 | 新增 |
| D-50 | Research metadata 優先走 Property 系統，不硬塞大量 Page 固定欄位 | 新增 |
| D-51 | MVP-2 UX 可先提供「一篇 PDF 對應一篇主研究筆記」，但資料模型不寫死一對一 | 新增 |
| D-52 | PDF 第一版可先做成與 Page 關聯的 viewer，不強迫第一版就完成完整 Page Mode 架構化重構 | 新增 |
| D-53 | Annotation / highlight 不列入 MVP-2 主完成條件，延後至後續子階段評估 | 新增 |
| D-54 | Attachment record 與 binary payload 分離，透過抽象 storage API 存取 | 新增 |
| D-55 | LaTeX 以結構化 equation node 為底層，`$...$` / `$$...$$` 僅作輸入捷徑 | 新增 |

---

### 13.2 不可推翻決策

#### content_json 唯一真相（D-25 / D-36）

不可退回只存純文字。

理由：

```

heading、list、blockquote、code、link、block id 都需要 JSON 結構。 content_text 只能是衍生資料。

```

#### StorageAdapter 抽象（D-26 / D-33）

UI / Editor 不可直接綁 IndexedDB。

理由：

```

後續 SQLite / Drizzle / Tauri / Supabase 才能換底層。

```

#### Soft delete（D-32 / D-37）

不直接 hard delete。

理由：

```

使用者安全 Trash / restore 未來 sync tombstone

```

#### 分階段 MVP（D-05 / D-08 / D-34）

不要因 all-in-one 願景提前做 PDF / Calendar / AI / Sync。

理由：

```

先穩住本地筆記核心，避免過度複雜。

```

---

### 13.3 D-39～D-43 補強決策

#### D-39 — MVP-1 early 延續 IndexedDB，不提前遷移 SQLite

決策：MVP-1 早期繼續使用 IndexedDBAdapter，先完成 Search、Sidebar polish、Tags/Folders、Backlinks 的最小可用版。SQLite + Drizzle 保留為後續升級，不為 substring Search 提前遷移。

理由：降低新手實作難度，避免在功能尚未穩定前切換底層 DB；StorageAdapter 已保留遷移能力。

#### D-40 — 文件狀態區分「回報完成」與「已驗證完成」

決策：凡是使用者或前輪文件回報完成但尚未由當前接手者檢查 code，標為「✅ 回報完成；🟡 需 verify」。只有實際檢查程式或跑 QA 後，才標為「✅ 已驗證完成」。

理由：避免新 AI 重做已完成項目，也避免未驗證功能被當作完全可靠。

#### D-41 — Active docs / modules 不取代 source archive

> ⚠️ **2026-07-31 更新**：99 文件已刪除，其重要歷史內容（changelog r0-r18）已併入 02 文件。原本的「零遺漏追溯層」功能現由 02 文件的詳細日誌承擔。此決策的核心原則（active docs 不取代歷史記錄）仍然有效。

決策：Active docs 與 modules 是閱讀導向；02 project log 是歷史追溯層。若有任何爭議，以 02 中的詳細日誌回查原文。

理由：防止之後誤把整理文件視為唯一原文，造成「零遺漏」概念混淆。

#### D-42 — Project Log 應保留最大詳細度版本

決策：工作日誌應優先保留 active log，並同步保留 archive 中更長版本的 Project Log source。

理由：使用者明確希望歷史紀錄非常詳細，包含動作、問題、解決方式、結果與文件治理過程。

#### D-43 — 最終交接採 3 active docs（原計劃含 99，已刪除）

> ⚠️ **2026-07-31 更新**：99 文件已刪除，其重要歷史內容（changelog r0-r18）已併入 02 文件。交接包已簡化為 3 文件結構，不再包含 99。此決策的核心原則（文件分工明確）仍然有效。

決策：最終交接包採用以下結構：

```

00-HANDOFF-STATUS-AND-AI-RULES.md 01-CANON-SPEC-AND-DECISIONS.md 02-PROJECT-LOG-DETAILED.md

```

理由：

```

00 負責最新狀態、任務、AI 限制與交接。 01 負責目前專案設定、規劃、技術規格與決策。 02 負責完整歷史、行動、問題、解法、結果、決策演變與 changelog。

```

此結構兼顧：

```

好讀 好交接 狀態清楚 決策清楚 歷史完整 可追溯

```

---

### 13.4 D-44～D-48 MVP-1 完工補強決策

#### D-44 — MVP-1 採 Page 層 Wikilink Backlinks，不阻塞於 block-level stable ID

決策：MVP-1 的 Backlinks 以 Page 為單位，使用 `extractWikilinks` 正規表達式 `/\[\[([^\]]+)\]\]/g` 從 `content_text` 抽出標題，存入 `pages.links: string[]`，並透過全站比對產生反向連結清單。Block-level stable ID 補強延後到需要 block reference 或多人協作時再啟動。

理由：避免為了未來能力阻塞當期可用價值；既有方案已足以支撐個人筆記網狀化。

#### D-45 — Auto-save 必須含 beforeunload 緊急存檔與 useRef(onChange) 防閉包雷

決策：

```

TiptapEditor 內部以 useRef 保存最新的 onChange 函式，避免 mount 時被舊閉包鎖死。 NexusApp 於 mount 註冊 window beforeunload，將 debounce 中尚未寫入的內容同步刷盤。

```

理由：800ms debounce 與 React 閉包是 MVP-1 verify 階段最大兩個坑，必須以 canon 形式記錄，避免未來重構時退化。

#### D-46 — Soft delete 流程須在刪除前清 debounce timer 並切斷 activePageRef

決策：執行 `deletePage` 前必須：

```

1.clearTimeout(saveTimerRef.current)
2.activePageRef.current = null
3.再呼叫 StorageAdapter.deletePage

```

理由：避免「刪除後 800ms 內快取仍寫回」導致筆記在 F5 後復活。

#### D-47 — Tags 為一級組織系統，搜尋與標籤過濾以交集 (AND) 套用

決策：

```

搜尋字串條件與已選 tag 條件以 AND 套用，避免結果稀釋。 tag 為單純 string[]，避免提前引入 multi_select property 複雜度。

```

#### D-48 — Folders 採單層字串欄位，未分類固定置頂

決策：

```

Page.folder 為 string | null。 Sidebar 以 groupedPages + sortedFolderNames 呈現分組；null/未分類固定置頂。 多層 nested tree、drag-drop 延後到使用者實際提出需求時再做。

```

理由：對齊 D-39 不過早增複雜度；單層 folder 已能涵蓋個人筆記絕大多數場景。

---

### 13.5 D-49～D-55 MVP-2 規格定稿決策

#### D-49 — MVP-2 以「attachments + PDF viewer + research note + citation metadata + LaTeX」為正式範圍

決策：MVP-2 正式範圍限定為：

```

attachments 基礎能力 PDF 匯入 PDF 閱讀 viewer research note 與 PDF 關聯 citation / paper metadata LaTeX equation（inline + block）

```

理由：先完成研究工作流的「可閱讀、可記錄、可關聯」，避免過早擴張為完整論文管理器或 PDF annotation 系統。

#### D-50 — Research metadata 優先走 Property 系統，不硬塞大量 Page 固定欄位

決策：

```

authors year source / venue doi url citation_key abstract

```

上述欄位在 MVP-2 優先走 Property 系統，而不是新增為大量 Page schema 固定欄位。

理由：維持 Page 模型通用性，避免把 Page 硬特化成 paper page，符合 Everything is a Page / Property 的既有架構。

#### D-51 — MVP-2 UX 可先提供「一篇 PDF 對應一篇主研究筆記」，但資料模型不寫死一對一

決策：

```

一個 Page 可關聯 0~N 個 attachments 一個 attachment 可被 0~N 個 pages 關聯

```

但 MVP-2 UX 可先提供：

```

匯入 PDF 時自動建立一篇主研究筆記 並將該 PDF 設為 primary_attachment_id

```

理由：兼顧起步流程簡單與長期資料模型彈性，避免之後被一對一綁死。

#### D-52 — PDF 第一版可先做成與 Page 關聯的 viewer，不強迫第一版就完成完整 Page Mode 架構化重構

決策：MVP-2 規格層承認 PDF 屬於 Page Mode 長期方向，但第一版實作可先落地為與 Page 關聯的 PDF viewer。

理由：降低首版整合風險；先完成研究工作流，再決定是否在後續把 PDF mode 進一步架構化。

#### D-53 — Annotation / highlight 不列入 MVP-2 主完成條件，延後至後續子階段評估

決策：

```

不將 highlight / annotation 納入 MVP-2 主完成條件 後續若要做，作為獨立子階段評估

```

理由：annotation 會帶來頁面座標、viewport、anchor、excerpt、re-render 對位等複雜度，不應阻塞研究工作流最小可用版。

#### D-54 — Attachment record 與 binary payload 分離，透過抽象 storage API 存取

決策：Attachment metadata 與實際 binary payload 分離；UI 不直接依賴底層 blob 儲存細節。

理由：方便在 IndexedDB early stage 與未來底層遷移之間維持抽象一致性，避免 UI 與儲存實作綁死。

#### D-55 — LaTeX 以結構化 equation node 為底層，`$...$` / `$$...$$` 僅作輸入捷徑

決策：MVP-2 的 equation 支援：

```

inline equation block equation

```

底層以結構化 node 保存進 `content_json`；`$...$` / `$$...$$` 只作使用者輸入捷徑。

理由：符合 `content_json` 唯一真相與結構化編輯器路線，避免把研究公式退回純文字 hacks。

---

### 13.6 D-56～D-57 文件治理與 Step 3 續接決策

#### D-56 — 文件更新採保守保留全部歷史痕跡

決策：文件同步時採使用者指定的「D：保守保留全部歷史痕跡」。

> ⚠️ **2026-07-31 更新**：99 文件已刪除，其重要歷史內容已併入 02。原本寫入 99 的「來源與稽核」現統一寫入 02。

執行規則：

```

不刪除歷史紀錄。 不以新狀態覆寫歷史紀錄原文。 新狀態寫入 00 / 01 作 current authority。 歷史變更與錯誤判斷寫入 02 作 project log。 若舊段落與最新狀態衝突，保留舊段落並加註「歷史紀錄，以 00 / 01 為準」。

```

理由：使用者重視交接文件與 workspace 一致性，也明確要求「確保不要有任何資料遺失」。

#### D-57 — MVP-2 Step 3 patch 前必須對齊 NexusApp.tsx 與 types.ts

決策：PDF import flow patch 會碰到 UI/state flow 與型別，因此在提供精準手動 patch 前，必須先檢視或取得：

```

src/components/NexusApp.tsx src/lib/types.ts

```

理由：

```

NexusApp.tsx 是 active page、pages state、storageRef、create/select/save flow 的實際集中點。 types.ts 是 Attachment、Page、CreatePageInput 的型別權威。 未檢視前直接輸出 patch 容易與目前程式結構不符，增加新手手動修改風險。

```

#### D-58 — MVP-2 PDF viewer 最小版採 attachment blob URL + iframe

決策：MVP-2 Step 4 的 PDF viewer 最小版採用既有 StorageAdapter attachment data layer：

```

activePage.primary_attachment_id → activeAttachment → StorageAdapter.readBinary(activeAttachment.id) → URL.createObjectURL(blob) → iframe src={pdfUrl}

```

理由：

```

1.延續 D-54 Attachment record 與 binary payload 分離。
2.UI 不直接依賴 IndexedDB。
3.不引入過早的 PDF.js annotation / highlight 複雜度。
4.可立即提供「可閱讀 PDF + 可寫 research note」的核心研究流程。

```

限制：

```

annotation / highlight 不屬於此決策範圍。 若瀏覽器內建 PDF viewer 表現不足，再評估 PDF.js viewer layer。

```

#### D-59 — PDF viewer polish 先做低風險閱讀輔助，annotation 延後

決策：MVP-2 Step 4-C 先加入低風險 viewer polish：

```

PDF Preview header 的 Open 按鈕 window.open(pdfUrl, "_blank", "noopener,noreferrer") iframe key={attachment.id}

```

理由：

```

Open 按鈕可讓使用者用瀏覽器內建 PDF 工具列閱讀大 PDF。 iframe key 可避免切換不同 PDF research note 時 iframe 狀態不穩。 這些 polish 不改變資料模型、不增加儲存風險，也不提前啟動 annotation 系統。

```

下一步：

```

Step 5 可做 PDF research note layout polish。 仍不把 annotation / highlight 當 MVP-2 主完成條件。

```

#### D-60 — PDF viewer layout polish 先採 Editor local UI state，不進資料模型

決策：Step 5 的 PDF viewer 高度與收合狀態先採 Editor local state：

```

isPdfCollapsed pdfViewerHeight

```

理由：

```

1.這是 UI preference，不是研究資料真相。
2.目前不需要為 viewer 高度 / 收合狀態擴充 Page schema。
3.降低資料模型複雜度，避免 prematurely persistence。
4.若未來使用者明確需要每篇 PDF 記住 layout，再評估放入 property 或 local UI settings。

```

#### D-61 — PDF viewer 必須有 loading / unavailable / normal preview 三態

決策：PDF viewer 不應在 binary 缺失或讀取失敗時永久顯示 Loading。

最低狀態：

```

normal preview：pdfUrl 存在，顯示 iframe。 loading：pdfUrl 與 pdfLoadError 都不存在，顯示 Loading PDF preview...。 unavailable：pdfLoadError 存在，顯示 PDF preview unavailable 與錯誤原因。

```

理由：

```

1.local-first app 可能遇到 attachment metadata 存在但 binary 不存在的資料不一致狀態。
2.明確錯誤訊息有利於新手回報問題。
3.不需改 StorageAdapter 或資料模型即可改善 debug 與 UX。

```

#### D-62 — Trash / Restore UI 採既有 soft delete，不做永久刪除、不改 schema

決策：Basic Notes Foundation Step 7 的 Trash / Restore UI 使用既有 soft delete 資料層。

```

listPages({ includeDeleted: true }) filter page.deleted_at !== null restorePage(id)

```

不新增資料模型，不做 permanent delete。

理由：

```

1.既有 soft delete 已保留歷史刪除 pages。
2.使用者已驗證過去刪除的檔案可在 Trash 中看到。
3.對新手與真實使用而言，Restore 比永久刪除更重要。
4.permanent delete 風險較高，應等明確需求後再做。

```

#### D-63 — NexusApp.tsx 超過 1000 行後，優先拆純 UI component，再拆 hooks

決策：`NexusApp.tsx` 超過 1000 行在原型階段可接受，但後續應開始安全拆檔。

建議順序：

```

1.Sidebar.tsx
2.RightPanel.tsx
3.EditorPane.tsx / NexusEditor.tsx
4.usePages / usePdfAttachment / useAutoSave hooks

```

理由：

```

純 UI component 拆分風險低，最能先降低單檔長度。 hooks 重構抽象度較高，對新手手動修改與 debug 風險較大，應延後。

```

#### D-64 — Permanent delete 只允許從 Trash 觸發，第一版只刪 page record

決策：永久刪除只在 Trash UI 中提供，一般 Notes 模式 delete 仍是 soft delete。

```

Notes Delete = soft delete Trash Delete = permanent delete

```

第一版 permanent delete 只刪除 page record，不自動刪 attachment / binary。

理由：

```

1.避免一般誤觸造成不可復原資料遺失。
2.Attachment / binary 可能被其他 page 共用。
3.自動清理 orphan attachments 需要額外 reference check，延後實作較安全。

```

#### D-65 — Duplicate page 複製內容與關聯，但建立新 page id

決策：Duplicate page 會建立新的 Page id，並複製目前頁面的內容與組織資訊。

複製內容：

```

title + " copy" content_json content_text tags folder links attachment_ids primary_attachment_id

```

理由：

```

Duplicate 是基本筆記工作流常用操作。 對 PDF research note 而言，copy 共用 attachment 較安全，不重複寫入 binary。

```

#### D-66 — Tiptap toolbar 採 editor command chain，並維持 onChangeRef 防閉包雷

決策：Editor toolbar 使用 Tiptap command chain：

```

editor.chain().focus().toggleBold().run() editor.chain().focus().toggleHeading({ level }).run() editor.chain().focus().toggleBulletList().run() ...

```

並維持既有 `onChangeRef`，避免 React closure 導致 onChange 指向舊 callback。

理由：

```

Tiptap command chain 是官方互動方式。 onMouseDown preventDefault 可避免 toolbar click 造成 selection 遺失。 onChangeRef 已被前序驗證可避免 auto-save / editor onChange 閉包雷。

```

#### D-67 — Editor list marker / heading / quote / code 樣式需在 editor scope 明確定義

決策：Tiptap editor 內的基礎排版樣式需在 `.nexus-tiptap-editor` scope 明確定義。

最低要求：

```

ul list-style-type: disc ol list-style-type: decimal li / li p margin reset blockquote left border pre / code readable background h1 / h2 / h3 font size / margin

```

理由：

```

Tailwind reset 可能移除 list marker。 若不明確定義，資料格式已是 list，但畫面看不到 bullet / number。

```

#### D-68 — Markdown import / export 先做 v0 基本語法，不引入完整 parser

決策：Markdown import / export 先做 v0 基本語法支援，不引入完整 Markdown parser。

v0 支援：

```

heading paragraph bullet list ordered list blockquote code block inline code bold italic horizontal rule

```

暫不保證：

```

table image nested list task list link syntax frontmatter footnote HTML block

```

理由：

```

1.先滿足個人筆記基本匯入 / 匯出。
2.避免過早引入 parser 套件與複雜 mapping。
3.保持 content_json 為正文唯一真相，Markdown 是 import / export 格式。

```

#### D-69 — Markdown v0.1 link / task list 先保留語意，不啟用完整 Tiptap extensions

決策：Markdown v0.1 對 link syntax 與 task list 先採語意保留策略。

```

[label](url) 保留為文字。

- [ ] 轉為 ☐。
- [x] 轉為 ☑。

Export 時再轉回 Markdown task list。

```

理由：

```

1.不額外引入 Tiptap Link / TaskList / TaskItem extension，降低當前風險。
2.使用者目前需要 import/export 不遺失資訊，而非完整互動 task system。
3.真正可點擊 link 與 checkbox task 可作為後續 editor enhancement。

```

---

## 14. vNext Architecture & Feature Decisions（2026-07-02 最新產品 / 架構共識）

> 本節是 2026-07-02 使用者要求「現在確定大部分功能與架構，避免未來大功能導致重做」後新增。若本文件前文仍以較寬泛的 all-in-one workspace 描述 Nexus，以本節修正後定位為準：Nexus 是 **local-first 個人學習與知識生成 workspace**，支援多種高層級生成物，但早期不追求完整企業 workspace / Wix / Notion / Canva clone。

### 14.1 產品定位修正

最新定位：

```

Nexus = local-first 個人學習與知識生成 workspace

```

Nexus 可以吸收 Obsidian、Notion、Canvas、Gamma、Canva、Quizlet 的部分優點，但產品核心仍是：

```

學習 研究 筆記 閱讀 整理 生成 複習 分享 / 發布

```

重要原則：

```

1.Note（筆記）是最重要核心。
2.Note 優先追求舒服、多元、完整的 native editor 體驗。
3.Note 不被完整 Markdown 相容綁死；Markdown export 是 best-effort。
4.Document（文檔）獨立於 Note。
5.Study Set / Quiz（學習集 / 測驗 / 字卡）獨立於 Note。
6.高層級生成物可弱聯動，不要求所有內容 live sync。

```

### 14.2 Creatables / Views / Tools 最終分類

#### Core Creatables（核心可建立項目）

```

1.Note（筆記）
2.Document（文檔）
3.Study Set（學習集 / 字卡組）
4.PDF Research Note（PDF 研究筆記）
5.Presentation（簡報）
6.Canvas（畫布）

```

優先級補充：

```

Note / Document / Study Set / PDF Research Note = 優先。 Presentation / Canvas = 保留架構，分階段做。

```

#### Extended Creatables（延伸可建立項目）

```

1.Website / Publish Project（網站 / 發布專案）
2.Project / Study Plan（專案 / 學習計畫）
3.Library Item（資料庫項目 / 閱讀來源項目）
4.Reference Item（文獻 / 來源項目）
5.Link Page / Landing Page（連結頁 / 單頁網站）— Website 的早期子型態

```

降級項目：

```

Learning Path / Curriculum（學習路線 / 課程路徑） → 不獨立。 → 由 Todo / Project / Review Queue / Collection 組合。

Course / Class Workspace（課程 / 班級工作區） → 不列為核心功能。 → 未來可作 Template（模板）或 Collection（集合）的使用情境。

```

#### System Views（系統視圖）

```

1.Dashboard / Home（儀表板 / 首頁）
2.Search（搜尋）
3.Graph（知識圖譜）
4.Tasks / Todo（任務 / 待辦）
5.Calendar（行事曆）
6.Review Queue（複習佇列）
7.Reading List / Library（閱讀清單 / 資料庫）
8.Asset Library（素材庫）
9.Inbox / Capture（收件匣 / 快速收集）

```

#### Tools（工具）

```

1.Create Center（建立中心）
2.Import Center（匯入中心）
3.Export Center（匯出中心）
4.Template System（模板系統）
5.AI Assistant / AI Tutor（AI 助理 / AI 學習導師）
6.Web Clipper（網頁剪藏）
7.Command Palette / Quick Actions（命令面板 / 快速操作）
8.Sync / Backup / Version History（同步 / 備份 / 版本歷史）

```

#### Core Infrastructure（核心底層能力）

```

1.Page Shell + Mode-specific Data（Page 外殼 + 模式專屬資料）
2.Attachment / Asset System（附件 / 素材系統）
3.Optional Source References（可選來源引用）
4.Block Reference / Transclusion（區塊引用 / 嵌入引用）
5.Annotation / Highlight（標註 / 劃線）
6.Collection / Properties（集合 / 屬性）
7.Searchable Text Index（可搜尋文字索引）
8.Schema Version / Migration（資料結構版本 / 遷移）
9.Soft Delete / Restore（軟刪除 / 還原）
10.Workspace Backup（工作區備份）

```

### 14.3 Page Shell + Mode-specific Data

正式採用：

```

Page Shell + Mode-specific Data

```

意思是：

```

所有主要內容共享 Page shell：id、title、tags、folder、created_at、updated_at、deleted_at、links、attachments 等。 但不同 creatable 可以有自己的 mode-specific data，不把所有東西硬塞進 content_json。

```

範例：

```

Note Page default_mode: note content_json: Tiptap JSON

Document Page default_mode: document content_json: Tiptap JSON document_settings: source / preview / reading mode / markdown options

PDF Research Note default_mode: pdf_research content_json: research note primary_attachment_id: PDF attachment

Study Set Page default_mode: study_set study_items: cards / questions review_state / attempts 後續擴充

Presentation Page default_mode: presentation presentation_data: slides / layout / theme source_refs?: optional

Canvas Page default_mode: canvas canvas_data: nodes / edges / viewport

Website / Publish Project default_mode: website / publish_project publish_project_data: routes / nav / theme / source_page_ids / custom_sections

```

### 14.4 Note（筆記）與 Document（文檔）邊界

Note（筆記）：

```

最重要核心。 Native editor 體驗優先。 支援多元 block：image、table、task、callout、LaTeX、link、asset embed 等。 不被 Markdown 完整相容限制。 Markdown export 是 best-effort。 完整保真未來靠 .nexus.json / workspace backup。

```

Document（文檔）：

```

獨立 creatable。 偏正式寫作、Markdown source / preview、普通閱讀模式、匯入 / 匯出。 不一定需要圖片。 適合文章、報告、正式文稿、可發布內容。

```

### 14.5 Study Set / Quiz（學習集 / 測驗 / 字卡）

Study Set 是獨立 creatable。

基本需求：

```

手動輸入中文 / 英文。 翻頁字卡模式。 四選一測驗，可選英文或中文翻譯。 拼寫模式。 CSV / TSV / 試算表 / Quizlet-like table 匯入。 後續可從 Note / PDF / Document 生成。 AI 可後續加入，但不作早期依賴。

```

資料模型方向：

```

Deck = Page Card = StudyItem Quiz mode = StudyItem 的不同練習模式 StudyAttempt = 練習紀錄 ReviewState = 複習排程 / 熟練度

```

### 14.6 Presentation（簡報）

Presentation 保留為 Core Creatable，但早期 scope 降級：

```

早期：Gamma-like outline / document-to-slides。 中期：slide layout / theme / table / simple visual blocks。 後期：才考慮 Canva-like free design。

```

避免早期做：

```

完整自由拖拉 圖層 動畫 多人協作 完整 Canva-like 設計器

```

### 14.7 Canvas（畫布）

Canvas 保留為 Core Creatable，但早期 scope 降級：

```

nodes edges 文字卡片 引用 Page / Block / Attachment / Study Set 簡單 layout

```

避免早期做：

```

完整白板 自由繪圖 多人協作 Canva-like design tools

```

### 14.8 Website / Publish Project（網站 / 發布專案）

Website / Publish Project 是需要保留的重要方向。使用者最初想像接近 Wix / Linktree / 可分享網站頁，但目前沒有完全明確細節。

正式決策：

```

Website / Publish Project 是 Extended Creatable。 它是獨立或弱聯動的高層級分享 / 發布模組。 它不是純 export tool，也不是早期完整 Wix / Webflow / Framer clone。

```

安全邊界：

```

Note / Document 可以分享成網頁。 Note 不變成完整網站編輯器。 Website 可以引用 Note / Document / Asset / Collection。 Website 可有少量網站專屬內容：homepage intro、footer、buttons、link cards、custom sections。 Website 不要求和來源強同步。 Website layout / routes / theme / sections 不塞進 Note content_json。

```

分階段：

```

Phase 0：Export HTML Phase 1：Share Page（分享頁） Phase 2：Link Page / Landing Page（連結頁 / 單頁網站） Phase 3：Publish Site（多頁發布網站） Phase 4：Visual Website Editor（視覺網站編輯器）

```

結論：

```

使用者現在沒有完全明確的 Website 想法沒關係。 只要目前確定 Website 是獨立 / 弱聯動模組，不混進 Note / Document 核心資料模型，後續完善 Website 不會導致整個 App 重做。 最多是升級 / 重做 Website 模組內部。

```

### 14.9 Quick Capture / Inbox（快速收集 / 收件匣）

Quick Capture / Inbox 需要提高優先級。

正確定位：

```

Inbox（收件匣）= System View Quick Capture（快速收集）= Capture Flow / Tool

```

早期可簡化：

```

folder = "Inbox" tag = "inbox" default_mode = "note"

```

未來可支援：

```

text → Note URL → Library Item / Web Capture PDF → PDF Research Note image → Asset + Note task → Task vocabulary → Study Set item quote / excerpt → Note block / Annotation

```

### 14.10 Reading / Library / Reference / Asset 邊界

需要避免混淆：

```

Library Item（資料庫項目 / 閱讀來源項目） = 學習來源或閱讀材料，例如書、文章、影片、課程、PDF、網頁。

Reference Item（文獻 / 來源項目） = 可引用的文獻 metadata，例如 authors、year、DOI、URL、publisher、citation key。

Asset（素材 / 附件） = 實際檔案，例如 PDF、image、audio、video、binary file。

```

關係：

```

Library Item 可連到 Reference Item。 Library Item / Reference Item 可連到 Asset。 Page / Document / Presentation / Website / Canvas 只引用 Asset，不直接塞 blob。

```

### 14.11 Task / Todo / Calendar / Learning Path

使用者確認：

```

Learning Path / Curriculum（學習路線 / 課程路徑）可以由 Todo List 搞定。 Course / Class Workspace（課程 / 班級工作區）必要性不高。

```

因此：

```

Learning Path 不獨立。 Course Workspace 不獨立。 兩者由 Project / Task / Todo / Review Queue / Template / Collection 組合。

```

Task / Todo 重要性提高：

```

Todo 不是獨立 todo app。 但 Todo / Task 是 Nexus 的重要 system view / projection。

```

未來任務來源：

```

Note checkbox Project task Study plan task Review task Reading task PDF reading task Manual task

```

### 14.12 Source Reference / Provenance（來源引用 / 生成來源追蹤）

本功能保留，但降級為 optional metadata。

```

Source Reference 不是早期 live sync 系統。 Generated outputs 可記錄來源，但不要求自動同步。

```

最小方向：

```

source_refs: [ { source_type: "page" | "block" | "attachment" | "annotation", source_id: "...", created_at: "..." } ]

```

不早期做：

```

自動同步 來源更新提醒 複雜差異比對 雙向 merge regeneration tree

```

### 14.13 Editor Block Roadmap（筆記編輯器區塊路線）

Note 是核心，因此 editor block roadmap 需要正式保留。

核心 block 方向：

```

Paragraph（段落） Heading（標題） Bullet List（項目清單） Ordered List（編號清單） Task List（待辦清單） Quote（引用） Code Block（程式碼區塊） Callout / Admonition（提示框 / 重點框） Image Block（圖片區塊） Table（表格） Equation / LaTeX（公式） Link（連結） PDF / Asset Embed（附件嵌入） Annotation Reference（標註引用）

```

### 14.14 Backup / Migration / Search Scope

近期需要正式規劃：

```

Workspace Backup（工作區備份） Export entire workspace Import workspace backup Schema Version / Migration（資料結構版本 / 遷移） Search Index Scope（搜尋範圍）

```

原因：

```

Nexus local-first 最大風險是 IndexedDB / 瀏覽器資料遺失。 Backup / Export Package 應比完整 cloud sync 更早。 未來資料模型會新增 StudyItem、Annotation、Asset、Collection、PresentationData、CanvasData、WebsiteData，必須有 schema version / migration 意識。 Search 未來不只搜尋 Page.content_text，也要搜尋 Study cards、annotations、library items、reference items、asset names、presentation slides、canvas nodes 等。

```

---

### 14.15 r15 Deep Review：Page kind vs default view mode

r15 深度稽核發現，舊文件中 `default_mode` 的語意與 r14 Page Shell + Mode-specific Data 的用法開始混淆。

舊語意：

```

default_mode = 打開 Page 時的顯示偏好，不是硬性 Page type。

```

r14 新語意中又出現：

```

default_mode: note / document / pdf_research / study_set / presentation / canvas / website

```

這會讓 `default_mode` 同時承擔「頁面種類」與「顯示模式」，長期不健康。

最佳化方向：

```

type PageKind = | "note" | "document" | "pdf_research" | "study_set" | "presentation" | "canvas" | "website" | "project" | "library_item" | "reference_item";

type PageViewMode = | "edit" | "read" | "markdown_source" | "markdown_preview" | "pdf_split" | "study" | "slides" | "canvas";

interface Page { kind: PageKind; default_view_mode?: PageViewMode; }

```

過渡策略：

```

短期：保留 default_mode，主要為相容舊資料與現有程式。 中期：新增 kind / creatable_type 作為真正 Page 種類。 長期：default_mode 改名為 default_view_mode 或 view_preference。

```

### 14.16 r15 Deep Review：MVP-2 re-baseline / vNext tracks

舊 MVP-2 寫法以：

```

attachments + PDF viewer + research note + citation metadata + LaTeX

```

為主，當時合理；但 r14 之後，使用者重新確認 Quick Capture / Inbox、Study Set、Workspace Backup、Editor Block Roadmap 等也很重要。

因此不建議繼續把所有新功能都塞進單一 MVP-2。近期應改以 tracks 管理：

```

Track A — Editor Blocks Foundation Link / TaskList / Image / Table / Callout / LaTeX

Track B — Capture & Inbox Quick Capture / Inbox v0

Track C — Learning Core Study Set / Flashcard v0 + CSV / TSV import

Track D — Research PDF viewer polish / citation metadata / annotation later

Track E — Safety Workspace Backup / Export package v0 + schema migration metadata

Track F — Creatable Registry / Create Center 為 Note / Document / Study Set / PDF Research Note / Presentation / Canvas / Website 建立低風險入口

```

### 14.17 r15 Deep Review：Stable Block ID 補齊策略

D-30 曾要求 Block node 從 MVP-0 起 stable ID，但後續 D-44 為了不阻塞 MVP-1 Backlinks，允許先採 Page-level Wikilink Backlinks。

目前判斷：

```

Page-level backlinks 可繼續使用。 但 Block Reference / Transclusion / Annotation / Highlight 未來會依賴 stable block id。

```

因此 stable block id 應列為近期底層修補，但不阻塞目前 Page-level backlinks。

建議策略：

```

短期：維持 Page-level backlinks。 近期：加入 Tiptap extension 或 normalizeContentJson()，確保主要 block node 都有 attrs.id。 未來：Block Reference / Transclusion / Annotation / Highlight 才依賴 block id。

```

### 14.18 r15 Deep Review：Attachment storage_key v0 語意

目前 `IndexedDBAdapter.createAttachment()` 會產生：

```

storage_key: `bin_${nanoid()}`

```

但 `attachBinary()` 與 `readBinary()` 實際使用的是：

```

binaries.id = attachmentId

```

因此目前 v0 的真實 binary key 是 `attachment.id`，不是 `attachment.storage_key`。

短期判斷：

```

功能可正常運作，不需立刻重寫。 storage_key 暫時視為未來 OPFS / filesystem adapter / migration 預留欄位。

```

若未來要嚴格化，可以二選一：

```

方案 A：文件明確記錄 IndexedDB v0 使用 attachment.id 作 binary key。 方案 B：調整 API，讓 binary store 改用 attachment.storage_key。

```

### 14.19 r15 Deep Review：Backup before Sync

D-93 已把 Sync 降級為 Backup first。r15 再次確認：隨著 pages / attachments / binaries 增加，Workspace Backup / Export package v0 應提早到近期。

建議 v0：

```

先支援 export workspace backup JSON。 包含 pages、attachments metadata、settings、schema_version。 PDF / image binary 可先不含，或第二階段以 base64 / separate files 支援。 先 export，不急著做完整 restore / import。

```


## 15. 決策 D-70～D-106（vNext Architecture + r15 Deep Review）

#### D-70 — Nexus 定位修正為 local-first 個人學習與知識生成 workspace

決策：Nexus 最新定位為 local-first 個人學習與知識生成 workspace。它可以吸收 Obsidian / Notion / Canvas / Gamma / Canva / Quizlet 的優點，但不追求早期成為完整企業 all-in-one。

#### D-71 — Core Creatables 可單獨建立，但共享 Page shell

決策：Note、Document、Study Set、PDF Research Note、Presentation、Canvas 都可以單獨建立。它們共享 Page shell，但可有 mode-specific data。

#### D-72 — Note Priority

決策：Note 是最重要核心。Note 優先最佳 native editor 體驗，不被 Markdown 完整相容限制。Markdown export 是 best-effort；完整保真未來靠 `.nexus.json` / workspace backup。

#### D-73 — Document 獨立於 Note

決策：Document 是獨立 creatable，偏正式寫作、Markdown source / preview、普通閱讀模式、匯入 / 匯出。Document 不一定需要圖片。

#### D-74 — Study Set / Quiz 獨立

決策：Study Set 是獨立 creatable。Deck = Page，Card = StudyItem。支援手動中文 / 英文、翻頁、四選一、拼寫、CSV / TSV 匯入。AI 生成為後續加值，不是早期依賴。

#### D-75 — Presentation 分階段

決策：Presentation 是 core creatable，可單獨建立，也可從 Note / Document / Canvas 生成。早期偏 Gamma-like outline-to-slides，後期再評估 Canva-like free design。

#### D-76 — Canvas 分階段

決策：Canvas 是 core creatable。早期做 nodes / edges / references，不做完整白板或設計工具。

#### D-77 — PDF Research Note 維持 Page + Attachment

決策：PDF Research Note 是 Page + PDF Attachment + research note。PDF binary 一律走 Attachment / Asset，不放進 content_json。

#### D-78 — Website / Publish Project 是獨立或弱聯動模組

決策：Website / Publish Project 是 Extended Creatable，是高層級分享 / 發布模組。它不是純 export tool，也不是早期完整 Wix-like builder。

#### D-79 — Note 可分享，但 Note 不變成網站編輯器

決策：Note / Document 可透過 Share Settings（分享設定）變成分享頁，但 Note editor 不承擔完整網站 layout / routing / RWD / animation。

#### D-80 — Website 分階段：Share Page → Link Page → Publish Site → Visual Editor

決策：Website 功能從 Export HTML / Share Page 開始，再到 Link Page / Landing Page、多頁 Publish Site，最後才評估 Visual Website Editor。

#### D-81 — 高層級生成物採弱聯動

決策：Document、Presentation、Website、Study Set 等高層級生成物可以記錄來源，但不要求和來源強同步。來源變更後不自動覆蓋生成物，後續可提供手動 update / regenerate。

#### D-82 — Optional Source Reference

決策：Source Reference / Provenance 是 optional metadata，不是早期 live sync / diff / merge 系統。

#### D-83 — Learning Path 不獨立

決策：Learning Path / Curriculum 不做獨立 creatable，由 Todo / Project / Review Queue / Collection / Template 組合完成。

#### D-84 — Course Workspace 不獨立

決策：Course / Class Workspace 不列為核心功能，未來可作 Template 或 Collection 使用情境。

#### D-85 — Quick Capture / Inbox 提高為前期重要能力

決策：Quick Capture / Inbox 不是很後期小功能。Inbox 是 System View，Quick Capture 是 Capture Flow / Tool。早期可簡化為 folder/tag 實作。

#### D-86 — Reading List / Library 是核心系統能力

決策：Reading List / Library 需要保留，管理書籍、PDF、網頁、文章、影片、課程等學習來源。

#### D-87 — Import / Export Center 必須集中管理

決策：Import Center 負責 PDF、Markdown、CSV、TSV、圖片、未來網頁剪藏、BibTeX / CSL 等。Export Center 負責 Markdown、HTML、PDF、Presentation、Study Set CSV、workspace backup、`.nexus.json`。

#### D-88 — Template System 是正式工具

決策：Template System 支援 Note、Document、Study Set、Presentation、Project、PDF Research Note、Website / Link Page 等模板。模板可包含 target_mode、default content_json、properties、tags、folder、mode-specific defaults。

#### D-89 — AI Assistant / AI Tutor 是後續需要的輔助層

決策：AI Assistant / AI Tutor 後續需要，但 AI 是 generation / intelligence layer，不是內容資料模型本身，也不是早期必要依賴。

#### D-90 — Web Clipper 後續需要

決策：Web Clipper 後續需要，但早期可先支援貼 URL / 手動匯入 web content；真正 browser extension 延後。

#### D-91 — File / Asset Library 近期需要

決策：File / Asset Library 近期需要但不立刻。Asset 是獨立資源，Page / Presentation / Canvas / Website 只引用 Asset。

#### D-92 — Citation / Bibliography 近期需要但先做 metadata

決策：Citation / Bibliography 近期需要但不做完整 Zotero clone。先支援 Reference metadata：title、authors、year、url、doi、source type、attachment、notes。

#### D-93 — Sync 降級為 Backup first

決策：Sync / Backup / Version History 近期需要但不立刻做完整 sync。順序：workspace export/import → local backup snapshots → version history → cloud sync → conflict resolution。

#### D-94 — Annotation / Highlight 與筆記功能一同完善

決策：Annotation / Highlight 是獨立 object，不塞進 content_json。它可連到 PDF、Page、Block、Attachment、Web Capture，並與筆記 / PDF / 閱讀功能一起完善。

#### D-95 — Database / Collection / Properties 與筆記功能一同完善

決策：Database / Collection / Properties 是重要底層能力，但不做完整 Notion clone。早期做 Page properties、basic collection、filter / sort / table view。

#### D-96 — Task / Todo 是重要 system view / projection，不做獨立 todo app

決策：Todo / Task 不先做獨立 app，但因 Learning Path 降級到 Todo 組合，Task / Todo 的重要性提高。Task 來源可為 Note checkbox、Project task、Review task、Reading task、manual task。

#### D-97 — Review Queue / Progress Tracking 是學習核心

決策：Review Queue 是系統視圖；Study Set 需要 StudyAttempt / ReviewState / mastery 等資料方向，避免 Quiz 功能只像玩具。

#### D-98 — Create Center / Creatable Registry 需要預留

決策：未來 New 不只 New Note，應有 Create Center。每種 creatable 需有 mode、default data、default editor、default template、icon、actions。

#### D-99 — Workspace Backup / Schema Migration 需要正式預留

決策：local-first app 必須重視 Workspace Backup、Export package、Schema Version / Migration，避免 IndexedDB 資料遺失與未來 schema 擴充痛苦。

#### D-100 — Editor Block Roadmap 是近期核心

決策：Note 是核心，因此 image、table、task、callout、LaTeX、link、asset embed 等 editor blocks 應作為近期路線，而不是一直延後。

#### D-101 — 不做正式 plugin marketplace，先做 internal extension points

決策：Plugin / Extension Architecture 不早期做正式第三方插件。先在內部模組化 importers、exporters、editor extensions、AI providers、study modes、templates、views。


#### D-102 — Page kind 與 default view mode 必須拆分

決策：`default_mode` 不應長期同時代表「頁面種類」與「顯示模式」。短期可保留相容；中期應新增 `kind` / `creatable_type` 表示 Page 種類，並以 `default_view_mode` / `view_preference` 表示 UI 顯示偏好。

#### D-103 — MVP-2 改以 vNext tracks 管理，避免無限膨脹

決策：舊 MVP-2 的 PDF / research 範圍仍保留，但近期開發不再把所有新功能塞進單一 MVP-2。改以 Editor Blocks、Capture & Inbox、Learning Core、Research、Safety Backup、Creatable Registry 等 tracks 管理。

#### D-104 — Stable Block ID 是近期底層修補，不阻塞 Page-level backlinks

決策：MVP-1 Page-level Wikilink Backlinks 繼續有效；但 Block Reference / Transclusion / Annotation / Highlight 需要 stable block id，因此近期需補 Tiptap extension 或 content normalization，確保主要 block node 有 `attrs.id`。

#### D-105 — IndexedDB v0 binary key 暫用 attachment.id，storage_key 保留給未來 adapter / migration

決策：目前 IndexedDB v0 的 `attachBinary()` / `readBinary()` 使用 `attachment.id` 作 `binaries` store key。`storage_key` 暫時保留，未來若引入 OPFS / filesystem adapter 或正式 asset storage migration，再決定是否改用 `storage_key`。

#### D-106 — Workspace Backup v0 應早於 Sync / Version History 完整化

決策：local-first app 在資料量增加後，必須優先提供 Workspace Backup / Export package v0。Sync / Version History 可後續做；Backup v0 先保障使用者資料可攜與可救援。

---

## 15.1 決策 D-107～D-108（Track A：Link / TaskList / TaskItem）

#### D-107 — Link extension 採 openOnClick: false，並停用 StarterKit 內建 Link 避免衝突

決策：啟用獨立的 `@tiptap/extension-link`，設定 `openOnClick: false`、`autolink: true`、`linkOnPaste: true`；同時透過 `StarterKit.configure({ link: false })` 關閉 StarterKit v3 內建的 Link mark，避免同名 extension 重複註冊衝突。連結在編輯模式下顯示為可點擊樣式（底線、手指游標）但點擊不跳轉，為刻意設計，非 bug。

理由：

```

1.編輯內容時若連結點擊即跳轉，容易誤觸導致使用者意外離開編輯畫面。
2.StarterKit v3 已內建 Link，若同時引入獨立 Link extension 且未關閉內建版本，會因同名 extension 報錯。
3.未來如需點擊直接開啟，只需將 openOnClick 改為 true 或改用 Ctrl/Cmd + 點擊開啟，屬於一行設定調整，不是架構變更。

```

#### D-108 — TaskList / TaskItem 採真實互動節點，取代 v0.1 的文字符號保留策略

決策：啟用 `@tiptap/extension-task-list` 與 `@tiptap/extension-task-item`（`nested: true`），Markdown import/export 同步升級為 v0.2：import 直接產生真正的 `taskList` / `taskItem` 節點與 `link` mark，export 對應輸出回 Markdown 語法。v0.1 時期已存在的舊資料（`☐` / `☑` 文字符號）維持原有 `listItemToMarkdown()` 偵測與 export 邏輯，不受影響，新舊資料可並存。

理由：

```

1.v0.1 的文字符號保留策略只是過渡，使用者已明確表示需要真正互動的 checkbox 與可點擊連結樣式。
2.向後相容是文件治理的核心原則（D-56 保守保留全部歷史痕跡），因此舊資料的 export 路徑不可破壞。
3.此為 r15 提出的 vNext tracks 中 Track A（Editor Blocks Foundation）的第一批項目，風險低、範圍集中在 TiptapEditor.tsx 與 NexusApp.tsx 的 Markdown 轉換函式。

```

---

## 15.2 決策 D-109～D-110（Track E：Workspace Backup / Export package v0）

#### D-109 — Workspace Backup v0 一併包含 attachment binary（base64），僅支援完全覆蓋式 import

決策：Track E 的 Workspace Backup / Export package v0 匯出單一 JSON 檔案，內含所有 pages（含已軟刪除）、所有 attachments metadata、attachment binary（以 base64 編碼一併打包）、settings。Import v0 僅支援「完全覆蓋」策略：清空並重寫 pages / attachments / binaries / settings 四個 store，不支援與現有資料合併。

理由：

```

1.使用者確認希望還原後資料完整可用，不需要額外重新匯入 PDF，因此接受備份檔案較大的代價。
2.合併式 import 需要處理 id 衝突、重複判斷等複雜邏輯，v0 先用完全覆蓋降低風險與實作複雜度，符合分階段 MVP 精神（D-05 / D-08）。
3.完全覆蓋策略明確對應「換電腦 / 災難恢復」的使用情境，符合 D-106 Backup before Sync 的定位。

```

#### D-110 — Workspace Backup import 必須具原子性並經二次確認

決策：`IndexedDBAdapter.importWorkspaceBackup()` 的清空與重寫動作必須包在同一個 IndexedDB transaction 內；UI 層在呼叫 import 前必須顯示二次確認，明確告知會覆蓋目前所有資料且無法復原；import 成功後自動 reload 頁面。

理由：

```

1.local-first app 的最大風險是資料遺失（呼應 r15 / D-106），因此覆蓋性操作必須具原子性，避免清一半寫一半的損毀狀態。
2.二次確認是防止誤觸的最低限度保護措施，對新手使用者尤其重要（呼應 00 文件中「使用者幾乎沒有程式經驗」的產品約束）。
3.reload 頁面可確保所有 React state（pages / attachments / activePdfUrl 等）重新從 IndexedDB 讀取，避免匯入後畫面與實際資料不同步。

```

---

## 15.3 決策 D-111（Track A2：Bulk Select）與 D-112（協作模式：工作區直接維護代碼）

#### D-111 — Bulk Select 批次操作透過迴圈呼叫既有單筆方法，不新增資料模型；批次 Restore 不自動切回 Notes

決策：Notes / Trash 的多選刪除、批次 Restore、批次永久刪除，一律透過迴圈呼叫既有的 `deletePage()` / `restorePage()` / `permanentDeletePage()` 單筆方法實作，不新增 StorageAdapter 介面方法，不新增資料模型。批次 Restore 完成後刻意停留在 Trash 視圖，不像單筆 Restore 一樣自動切回 Notes 並選中該頁。

理由：

```

1.批次操作本質上是既有單筆能力的 UI 層編排，不需要底層資料模型或介面變更，符合分階段 MVP 精神。
2.一次復原多篇時無法明確判斷該選中哪一篇，因此不強行自動跳轉，交由使用者自行決定。
3.此為使用者主動提出的需求（測試 Track B 後詢問「可否新增多選功能」），判斷為低風險、高實用性，

可插隊在既定 tracks 節奏中先做，不影響 Track C 的排程。

```

#### D-112 — 協作模式改為工作區直接維護代碼並實際編譯驗證，取代 patch 說明文件模式

決策：自 Track A2 起，助理在 Arena workspace 的 `project/` 目錄下維護一份完整的 Nexus 專案鏡像，之後功能異動直接修改鏡像中的實際檔案，並於交付前實際執行 `npm install` / `npx tsc --noEmit` / `npx next build` 驗證可編譯通過，取代先前逐次輸出「找這段換那段」patch 說明文件的模式。使用者仍需手動下載 `project/src/` 內容並覆蓋回本機專案，助理無法直接讀寫使用者本機檔案系統。

理由：

```

1.降低使用者手動比對 patch 片段、逐段貼上造成的出錯風險，對應「使用者幾乎沒有程式經驗」的產品約束（00 文件第 2 節）。
2.讓助理能在交付前實際跑 TypeScript 型別檢查與 Next.js production build 驗證，而不僅是閱讀程式碼判斷正確性，

提高每次交付的可靠度。

1.此變更只影響開發交付方式，不影響任何產品 / 架構決策；StorageAdapter 抽象、content_json 唯一真相、

soft delete 等核心決策維持不變。

```

---

## 15.4 決策 D-113（Track C：Study Set kind 欄位）與 D-114（NexusApp.tsx 拆檔）

#### D-113 — Study Set 採 Page.kind 欄位落地 r15 的 Page kind / default_view_mode 拆分方向，且採簡化熟悉度分類而非完整 SRS

決策：Track C 新增 `Page.kind?: "note" | "study_set"`（optional，缺省視為 `"note"`），作為 r15（D-102）提出「Page kind 與 default view mode 必須拆分」的第一次實際落地，而不是繼續把新語意塞進 `default_mode`。Study Set 的複習進度採簡化三段熟悉度分類（`new` / `learning` / `mastered`），不實作完整間隔重複（SRS）演算法。

理由：

```

1.Track C 是第一個真正需要區分「頁面種類」的 creatable（PDF research note 仍是 Page + attachment，

沒有真正需要 kind 欄位），是實踐 D-102 過渡策略的合適時機。

1.kind 為 optional，舊資料視為 "note"，完全向後相容，不需要 migration script。
2.完整 SRS 演算法（如 SM-2）複雜度高，v0 階段簡化分類已能達成「優先練習不熟的卡」的核心價值，

符合分階段 MVP 精神（D-05 / D-08），避免過度設計。

1.Study Set 專屬畫面（StudySetView）與底層資料（study_items）分離，UI 呈現方式可低風險調整，

不視為架構限制。

```

#### D-114 — NexusApp.tsx 拆檔延續 D-63，只拆純函式與純 UI component，不拆 hooks

決策：NexusApp.tsx 由 2301 行拆分為多個純函式模組（`src/lib/blockId.ts`、`wikilinks.ts`、`pdfNote.ts`、`inbox.ts`、`markdown.ts`、`fileDownload.ts`）與純 UI 元件模組（`src/components/Sidebar.tsx`、`EditorPane.tsx`、`RightPanel.tsx`），NexusApp.tsx 保留為 864 行的 Root App，仍集中管理 state 與所有 handler，不拆 hooks。原 `Editor` 元件更名為 `EditorPane`，避免與 Tiptap 套件的 `Editor` class 同名造成混淆。

理由：

```

1.延續既有決策 D-63：優先拆純 UI component，暫緩拆 hooks，避免對新手手動維護造成過大抽象負擔。
2.使用者在 Track C 驗證通過、應用基本架構（Note / PDF Research / Study Set 三種 Page 類型）已跑穩後

主動提出拆檔建議，屬於合適時機，非助理片面決定提前拆檔。

1.拆檔不改變任何既有行為與資料流，透過乾淨環境重新編譯驗證（npm install → tsc --noEmit → next build）

兩輪確認，並由使用者完整回歸測試「沒有破壞任何行為」後才視為完成。

```

---

## 15.5 決策 D-115（Table block）與 D-116（package.json 交付規則）

#### D-115 — Editor Blocks Foundation 分批推進，第一批為 Table，Image 依使用者要求擱置

決策：Editor Blocks Foundation（Image / Table / Callout / LaTeX）不一次全做，依複雜度分批：Table → Callout → LaTeX。Table 採 `@tiptap/extension-table`（TableKit）並開啟 `resizable: true`；Markdown export 新增基本版 `tableToMarkdown()`（純文字 cell，不處理 colspan/rowspan）。Image block 依使用者明確要求擱置，待後續討論範圍（本機上傳 vs URL vs 兩者皆支援）後再排入。

理由：

```

1.Table 有 Tiptap 官方成熟的 extension 可用，風險低、範圍集中，適合先做。
2.Image 涉及儲存方式的產品決策（是否沿用 Attachment/binary 機制），需要額外討論，

使用者也明確表示迫切性較低，因此擱置不阻塞其他 block 的進度。

1.Callout 官方無現成 extension，需自行實作 custom node；LaTeX 依 D-55 需結構化 equation node

並引入額外渲染套件（如 KaTeX），複雜度最高，因此排在最後。

```

#### D-116 — package.json 層級異動的交付規則：必須明確提醒重新 npm install，且優先排查命名空間污染

決策：日後若功能異動涉及 `package.json`（新增或修改依賴套件），交付訊息必須明確、獨立列出「需要更新 package.json 並重新執行 npm.cmd install」，不能只用「工作區已是最新版本」概括帶過。若使用者回報 npm install 出現 404 / 找不到套件等錯誤，優先排查是否為套件名稱被貼上污染（例如 `@tiptap` 被誤植為 `@types`），而不是預設套件本身有問題；排查到問題後，直接提供完整、確認正確的檔案內容供整份覆蓋。

理由：

```

1.package.json 位於專案根目錄，不屬於使用者慣常覆蓋的 src/ 資料夾範圍，容易被交付訊息忽略，

實際案例已證實此落差會直接導致使用者本機出現型別錯誤（TS 2339）。

1.本次對話已多次發生貼上造成的符號 / 命名空間污染（HTML escape、多餘 ** 等），

套件名稱被誤植的可能性同樣存在，應列為 404 錯誤的優先排查方向。

1.提供完整檔案內容整份覆蓋，比僅指出「哪一行打錯」更能降低新手使用者

（00 文件第 2 節：幾乎沒有程式經驗）再次手動修改時出錯的風險。

```

---

## 15.6 決策 D-117（Callout isolating 修正）與 D-118（jsdom 真實 Editor 驗證方法）

#### D-117 — Custom Tiptap Node 不應預設加上 isolating: true，需以真實 Editor 驗證 toggle 開關流程

決策：Callout node 移除 `isolating: true`（保留 `defining: true`）。原因是 `isolating: true` 會阻擋 ProseMirror 的 `lift` 指令，導致 Callout 一旦插入就無法透過 Toolbar 再次點擊解開。未來若有其他 custom node 考慮使用 `isolating` 屬性，必須先用真實 Editor 實例測試完整的「插入 → 解開」toggle 流程，不能只驗證插入方向的行為。

理由：

```

1.isolating 屬性的實際效果比表面描述（阻止一般編輯操作跨越節點邊界）更廣泛，

會連帶影響 lift 等『解開包裹』類型的指令，容易在只測試『插入』情境時被忽略。

1.Callout 是本次 Editor Blocks 中複雜度最高的自訂實作，此教訓應沉澱為可重用的實作檢查點，

避免未來的 custom node（例如更複雜的 block）重蹈覆轍。

```

#### D-118 — 複雜自訂 Tiptap Node 的驗證應包含 jsdom + 真實 Editor 實例層級的測試

決策：對於複雜度較高、涉及 ProseMirror 底層行為的自訂實作（例如帶 `addNodeView` 互動元件的 custom node），除了標準的 `tsc --noEmit` / `next build` 編譯驗證，額外採用 jsdom + 真實 `@tiptap/core` Editor 實例的自動化測試，模擬使用者操作並檢查底層文件狀態變化。測試用套件（jsdom、tsx）僅在驗證階段暫裝，驗證完畢即移除，不寫入 `package.json`。

理由：

```

1.純閱讀程式碼或憑經驗判斷容易遺漏 ProseMirror 層級的邊界情況

（本次案例：isolating 阻擋 lift 指令，純靠閱讀程式碼不易察覺）。

1.用真實 Editor 實例重現問題，比起純推測更可靠，能在使用者測試前先抓到部分問題

（Markdown round-trip 的多段落合併 bug即在此階段被抓到並修正）。

1.不寫入 package.json 是為了避免將僅供開發期驗證用的測試工具，

誤植入使用者實際運行所需的依賴清單，維持交付內容的乾淨。

```

補充說明（誠實記錄限制）：

```

jsdom 測試並非萬能——本次案例中，圖示選單的 mousedown 修正在 jsdom 測試裡邏輯正確， 但使用者於真實瀏覽器環境測試後仍回報失敗，代表 jsdom 無法完全模擬真實瀏覽器的 所有行為（可能與事件時序、CSS 實際渲染、或 ProseMirror 部分瀏覽器專屬邏輯有關）。 因此 jsdom 測試通過應視為「必要但不充分」的驗證層級，仍須以使用者的真實環境測試為最終判準。

```

---

## 15.7 決策 D-119（updateBlockMath/deleteBlockMath 必須傳 pos）、D-120（Table import 補齊）、D-121（模糊回報需先確認現象）

#### D-119 — 呼叫 updateBlockMath / deleteBlockMath 必須明確傳入 pos，不依賴 setNodeSelection 後省略 pos 的寫法

決策：`BlockMath.configure({ onClick })` 的編輯 / 刪除邏輯，一律透過官方回呼提供的 `pos` 明確傳入 `updateBlockMath({ latex, pos })` / `deleteBlockMath({ pos })`，不透過 `editor.chain().setNodeSelection(pos).updateBlockMath({ latex })`（省略 pos）的寫法。

理由：

```

1.實測證實（jsdom + 真實 Editor 實例）：省略 pos 時指令改讀

editor.state.selection.$from.pos，但 setNodeSelection 產生的 NodeSelection 語意與此不一致，導致指令回傳 false、實際未執行。

1.此教訓具有可重用性：未來若使用其他官方或第三方 extension 的類似指令，

應優先查看原始碼實作或用真實 Editor 測試驗證，不要憑經驗類比其他 Tiptap 指令的用法。

```

#### D-120 — 補齊 Table Markdown 匯入功能（先前僅有匯出）

決策：`createMarkdownContent()` 新增表格偵測邏輯，辨識標準 Markdown table 語法（表頭列 + 分隔線 + 資料列），還原為 `table` / `tableRow` / `tableHeader` / `tableCell` 節點。基本版不支援欄位對齊語法或 colspan / rowspan。

理由：

```

1.此為 Table block 交付時（8.20 節）遺漏的一半功能，在 LaTeX 混合 block 迴歸測試中

意外發現；修正使 Table 具備完整的匯出/匯入雙向能力，維持一致性。

1.混合多種 block 型別的迴歸測試（而非只測試單一新功能）更容易發現此類跨功能缺口，

應作為未來新增 Editor Block 後的標準驗證習慣之一。

```

#### D-121 — 使用者以模糊描述回報問題時，應先確認具體現象再排查

決策：當使用者用「跟之前一樣的問題」「標紅」等模糊描述回報狀況時，助理應先詢問具體現象（例如「是完全沒反應，還是程式碼標紅？」「是否已重新 npm install？」），不應直接假設是同一類型問題並跳去做深度邏輯排查。

理由：

```

1.本次實際案例：使用者回報「deleteBlockMath 出現跟剛剛一樣的問題」，助理誤判為

功能邏輯問題並投入 jsdom 深度測試（結果邏輯完全正確），後續才確認是使用者 看漏了 package.json 更新提醒（助理已依 D-116 提醒過），屬於部署問題而非邏輯問題。

1.先確認現象可避免在錯誤方向上消耗不必要的排查時間，尤其當助理已遵循 D-116

規則提醒過 package.json 異動時，更應優先懷疑是否為部署問題。

```

---

## 15.8 決策 D-122（transaction 位置計算須用 tr.doc）、D-123（插入空節點 + selectNode 取代 window.prompt）

> 本節對應 8.23 節「Editor Blocks Foundation — LaTeX 改版：Obsidian 風格原地編輯公式」。完整背景、實作細節與 jsdom 驗證結果見 8.23 節與 00 文件 1S 節，本節只記錄可重用的決策本體與理由。

#### D-122 — 同一 transaction 內若對 tr 做過變更，後續位置計算必須用 tr.doc，不可用變更前的 state.doc

決策：在任何自訂 ProseMirror 邏輯（`handleTextInput`、自訂 command 等）中，若已經對同一個 `transaction`（`tr`）呼叫過 `replaceWith` / `insert` / `delete` 等會改變文件內容的方法，之後所有需要 `resolve()` 的位置計算（尤其是要塞進 `setSelection()` 的位置），一律改用該 `tr.doc`（變更後的最新文件），不可沿用呼叫當下傳入的 `state.doc`（變更前的舊文件快照）。並用 `Selection.near($pos)` 包裹結果，而非硬選一個固定位置。

理由：

```

1.此教訓源自使用者帶入的另一個獨立 AI 對話串的真實崩潰事故：該串在 replaceWith

之後用 state.doc 去 resolve 新游標位置，導致 resolve 出的位置已不屬於目前文件 版本，setSelection() 直接拋出 "Selection passed to setSelection must point at the current document" 例外，使編輯器崩潰。

1.本次重新實作 obsidianMathInput.ts 時嚴格套用此原則（tr.doc.resolve(...) +

TextSelection.near($pos)），jsdom 測試中打字觸發公式轉換全數正常，未再重現此類崩潰。

1.此教訓具有高度可重用性：未來任何一次 transaction 內對 tr 做過內容變更、

接著又要設定 selection 的場景，都應優先檢查是否誤用了變更前的 state.doc， 不限於本次的公式輸入功能。

```

#### D-123 — Toolbar「插入」類按鈕改用「插入空節點 + setNodeSelection 觸發 NodeView selectNode()」，取代 window.prompt()

決策：需要「插入後立即讓使用者輸入內容」的自訂 NodeView（例如本次的 inlineMath / blockMath），Toolbar 按鈕不應使用 `window.prompt()` 詢問內容，應改為：先用 `insertContentAt(pos, { type, attrs: { ...空值 } })` 插入一個內容為空的節點，再對同一個 `pos` 呼叫 `setNodeSelection(pos)` 建立 `NodeSelection`，這會觸發該 NodeView 的 `selectNode()` 回呼，由 NodeView 自行決定如何進入可編輯狀態（例如本次的 `enterEdit()` 展開輸入框並 focus）。

理由：

```

1.window.prompt() 是瀏覽器原生對話框，樣式無法客製、體驗生硬，且與 Obsidian 風格

「原地編輯」的整體互動不一致，使用者本次明確要求移除所有跳窗互動。

1.已用 jsdom + 真實 Editor 實例驗證此串接方式：insertContentAt 插入節點後，對同一個

pos 呼叫 setNodeSelection(pos)，確實會觸發 NodeView 的 selectNode()， 且該函式內部呼叫的 enterEdit() 會正確顯示編輯框（見 00 文件 1S.3 測試 8）。

1.此模式可重用於未來任何「插入後立即進入編輯狀態」的自訂 NodeView 需求

（例如未來若要做其他需要原地編輯的 block 類型），不需要每次都重新設計互動方式。

```

---

## 15.9 決策 D-124（Track G：Command Palette）與 D-125（Track G：Dashboard / Home v0 提前落地）

> 本節對應 00 文件 1T 節。完整背景、實作細節與驗證結果見 00 文件 1T 節，本節只記錄可重用的決策本體與理由。

#### D-124 — Command Palette 採「Actions + Pages 合併鍵盤導覽清單」設計，不依賴額外資料模型

決策：Command Palette（`Ctrl/Cmd+K`）內部把可執行項目分成 Actions（固定的常用動作，例如新增筆記、切換視圖、匯入匯出）與 Pages（依標題模糊比對現有頁面）兩類，合併成一份可用上下鍵導覽、Enter 執行的清單。Actions 清單直接呼叫既有的 NexusApp handler，不重複實作任何邏輯；Pages 清單只比對標題（不含正文全文搜尋），刻意與 Sidebar 既有的全文搜尋範圍不同，以維持面板回應輕量。

理由：

```

1.使用者是新手，鍵盤操作應同時提供滑鼠可點擊的視覺清單，而非只支援打字指令，

降低學習成本；因此採用「輸入框 + 篩選清單」的形式，而非純指令列。

1.Actions 直接呼叫既有 handler，不新增任何重複邏輯或平行的資料流，

維持「Command Palette 是既有功能的快速入口」而非「新的功能實作層」的定位。

1.Pages 只比對標題是刻意的範圍控制：命令面板應快速、低延遲，

全文搜尋已有 Sidebar 既有入口可用，不需要在此重複。

```

#### D-125 — Dashboard / Home 提前於 vNext tracks A~F 之外落地為 v0，採「輕量統計 + 快速入口」而非完整聚合視圖

決策：Dashboard / Home 原先在 1M/1N 節因「需要彙整多種 creatable 的摘要視圖，過早做容易受限於當時尚未完成的其他模組」而判斷暫緩。本次使用者主動指名要做，且此時 Note / PDF Research / Study Set 三種 Page 類型皆已跑穩（呼應 8.19 節的拆檔時機判斷邏輯），因此以「v0 輕量版」方式提前落地：只做前端即時計算的統計卡片（全部頁面 / 筆記 / PDF 研究 / Study Set 四類）、最近編輯清單（依 updated_at 排序）、與三個快速建立按鈕，不新增任何後端聚合查詢或新的資料模型欄位。

理由：

```

1.使用者的優先順序判斷應優先於既定的 track 規劃順序；當使用者明確指名要做

一項先前判斷「暫緩」的功能時，應重新評估是否仍然合理暫緩，而非機械式地 照搬舊決策不做調整。

1.「v0 輕量版」策略與 Study Set v0（8.18 節）、Workspace Backup v0（15.2 節）

等先前 track 的一貫作法一致：先用最小可行範圍落地，避免因為想一次做完整 聚合視圖而卡住，之後有需要再擴充統計卡片種類或加入更多 System View 能力 （例如未來可能需要的 Calendar / Board 摘要）。

1.純前端即時計算（不新增資料模型）降低了「提前做」的風險：若未來 Page kind

或 creatable 種類擴充，只需要調整 Dashboard 內的分類判斷函式， 不需要 migration，符合 D-102 / D-113 一貫的向後相容原則。

```

---

## 15.10 決策 D-126（Import 選單維持獨立於「新增」入口）與 D-128（重新命名採原地輸入框互動）

> 本節與以下 15.11～15.15 節，是 2026-07-30 深度審核（見 00 文件第 12 節）時
> 回補的決策記錄，對應 Track H～M（詳細背景、實作內容與驗證結果見 00 文件
> 1U 節）。這些決策編號（D-126～D-146）先前只存在於程式碼註解中，本次
> 才正式寫入決策清單，是本次審核發現並修正的最主要文件治理缺口。
> D-127 / D-129 / D-134 / D-137 這四個編號在程式碼中未被使用，經核對程式碼
> 與過程記錄後確認：沒有找到對應的決策內容，也沒有發現任何因此遺漏的
> 功能或資料——判斷是命名時的跳號或規劃調整後的殘留空缺，不強行回填
> 虛構內容湊數，誠實記錄為「保留但未使用」。

#### D-126 — Sidebar「新增」入口移除後，「匯入」維持原有的獨立點擊展開選單

決策：Track L 把「新增」（New）從 Sidebar 移除、統一收斂到 Home 的
NewPageDialog 後，「匯入」（Import：PDF / Markdown）不受影響，繼續維持
原本 ToolbarDropdown 點擊展開選單的形式，不一併收斂到 Home。

理由：

```

1.「新增」與「匯入」是語意不同的操作：「新增」是從零建立一個新頁面，

使用者已經在 Home 有明確的建立流程入口；「匯入」是把既有的外部檔案 帶進 workspace，屬於「資料搬遷」而非「內容創作」，使用者更可能在 瀏覽 Sidebar 既有筆記時臨時想到要匯入一份檔案，把它留在 Sidebar 比強迫使用者先跳去 Home 才能匯入更符合直覺。

1.避免過度收斂：使用者的原始需求（九點需求第 3 點）明確只針對「新增」

要求整合，沒有要求連「匯入」也一併搬移，不應該自行擴大解讀範圍。

```

#### D-128 — 頁面重新命名採「原地將標題文字換成輸入框」的互動模式

決策：Sidebar 中每篇頁面的重新命名（Track I 新增）不彈出對話框，而是
把清單項目原本顯示標題的 `<span>` 原地替換成一個 autofocus 的
`<input>`，Enter 確認、Escape 取消、失焦（onBlur）自動確認。

理由：

```

1.與既有的資料夾編輯（handleSaveFolder）互動模式一致，維持 Nexus

目前「行內編輯優先於彈出對話框」的一貫 UI 語言，降低使用者的 學習成本。

1.重新命名是高頻率的小動作，彈出對話框（需要額外一次點擊「確認」）

對這類小動作而言互動成本偏高；原地編輯讓使用者能用最少的點擊 次數完成操作。

```

---

## 15.11 決策 D-130（PageItemMenu 選單邊界防呆）與 D-131（工具列「插入內容」統整為單一下拉選單）

#### D-130 — PageItemMenu 選單定位需同時鉗制視窗左右邊界，不能只防右側溢出

決策：`PageItemMenu` 的選單定位邏輯（`openMenu`）計算左側座標時，
不能只用 `Math.max(8, rect.right - width)` 防止選單左側溢出視窗，
還必須額外用 `window.innerWidth` 計算 `maxLeft` 並取兩者夾在中間，
確保選單的左右兩側都與視窗邊緣、以及觸發按鈕所在容器的邊緣之間，
永遠保留至少 `EDGE_MARGIN`（10px）的視覺呼吸空間。

理由：

```

1.已知問題修正：先前版本只做了「選單右緣對齊按鈕右緣」與左側下限

防呆，沒有對右側做上限防呆，導致觸發按鈕本身就貼近 Sidebar 右側 邊界時，選單的右邊緣會跟著貼齊、甚至略微超出可視範圍，視覺上 看起來像「貼邊」，體感不精緻。

1.這類「只防一側、沒防另一側」的邊界計算疏漏，是 UI 定位邏輯中

容易重複發生的一類錯誤，記錄下來供未來寫類似的浮動選單元件 （例如本次 Track M 新增的 AccountSettingsRow 齒輪選單）時參考、 複用同樣「雙側鉗制」的計算邏輯，而不是每次重新發明。

```

#### D-131 — Tiptap 工具列「插入內容」統整為單一 ToolbarDropdown，取代並排的多個獨立按鈕

決策：把原本並排在工具列上的 Table / Callout / Inline Math / Block Math
四顆獨立按鈕，改用與 Sidebar「新增」「匯入」相同的 `ToolbarDropdown`
共用元件收斂成一個「➕ 插入內容」下拉選單。

理由：

```

1.隨著 Editor Blocks Foundation 三批陸續完成（Table、Callout、

LaTeX），工具列並排的按鈕數量持續增加，視覺上開始擁擠，尤其是 本輪 Track M 又要新增字體/字級/顏色/對齊/螢光筆等一整組富文字 按鈕，若不先收斂既有的「插入類」按鈕，工具列會變得難以閱讀。

1.複用既有的 ToolbarDropdown 元件（而非重新設計一個新的下拉選單）

維持元件庫的一致性，且 ToolbarDropdown 已支援 "inline" variant （比照 ToolbarButton 的緊湊尺寸），本身就是為了這類場景設計。

1.之後若有更多「可插入的內容類型」，只需要在呼叫端的 items 陣列

擴充，不需要修改 ToolbarDropdown 元件本身或工具列版面配置。

```

---

## 15.12 決策 D-132（Notion 風格 Drag Handle：NodeRange 依賴順序）與 D-133（帳號系統範圍維持既有原則）

#### D-132 — DragHandle 依賴 NodeRange 提供的 Selection 型別，註冊順序必須是 NodeRange 在前

決策：Track J 新增段落拖曳重排功能時，`extensions` 陣列中 `NodeRange`
必須註冊在 `DragHandle` 之前；`DragHandle` 只啟用頂層 block 拖曳
（不啟用 nested，例如清單項目內部）。

理由：

```

1.NodeRange 負責「拖曳範圍選取」的底層 Selection 型別，DragHandle

依賴它才能正確選取「整個 block」而非只選到文字游標，這是官方套件 的既定依賴順序，記錄下來避免未來重構 extensions 陣列順序時 不小心破壞這個依賴關係（Tiptap 的 extensions 陣列順序在某些情況 下會影響行為，不是單純的無序列表）。

1.只啟用頂層拖曳是刻意的範圍收斂：允許拖曳巢狀清單項目容易讓

新手使用者不小心把內容拖到結構混亂的位置（例如把清單項目拖到 清單外面變成獨立段落，或反過來），在使用者還不熟悉這個新功能時， 先限制在最安全、最容易理解的頂層 block 拖曳。

```

#### D-133 — 帳號系統維持「完全 local-first、無真正登入驗證」的既有原則，本輪只調整 UI 位置不調整範圍

決策：Track M 把帳號/設定從獨立的浮動橫欄（BottomLeftPanel）移入
Sidebar 內部（AccountSettingsRow）時，帳號區塊本身的功能範圍不變：
點擊帳號只顯示「帳號登入功能尚未開放」的提示文字，不做任何真正的
使用者驗證、雲端同步或後端 API 串接。

理由：

```

1.這是既有原則的延續，不是本輪新決策：Nexus 的核心定位是

local-first（見第 3 節三大原則），目前沒有後端伺服器、沒有使用者 資料庫，帳號系統若要做，需要先確立雲端同步的整體架構（屬於 MVP-4 範疇，見第 1 節 MVP 路線），不應該在還沒有後端的情況下 先做一個「看起來能登入但實際上什麼都不做」的介面，那樣反而會 誤導使用者以為資料已經雲端備份。

1.本輪需求的重點（見九點需求第 8 點）是「位置」不對，不是「功能」

不足，因此範圍嚴格限制在 UI 位置調整，避免不小心把範圍蔓延到 使用者這次沒有要求的帳號系統實作。

```

---

## 15.13 決策 D-135（ResizablePanel 抽出為獨立容器）與 D-136（收合觸發點回歸標頭列，取代浮動邊緣按鈕）

#### D-135 — Sidebar / RightPanel 的可拉伸寬度邏輯抽出為獨立的 ResizablePanel 容器元件

決策：新增 `src/components/ResizablePanel.tsx`，把「依 `isCollapsed`
決定寬度」「拖曳調整寬度」這兩項職責從 Sidebar / RightPanel 元件本身
抽離，改為外層包裝容器，Sidebar / RightPanel 內部不再管理自己的寬度
或拖曳邏輯。

理由：

```

1.Sidebar 與 RightPanel 都需要「可拖曳調整寬度 + 可收合」的能力，

若各自實作一份，未來任何拖曳手感或收合邏輯的調整都要改兩個地方， 容易出現不一致；抽成共用容器後兩者共用同一套邏輯與手感。

1.符合既有的元件拆分原則（延續 D-63 NexusApp.tsx 拆檔時「只拆純

函式與純 UI component」的判斷邏輯）：ResizablePanel 是純粹的版面 容器邏輯，不涉及 Sidebar / RightPanel 各自的業務邏輯（頁面清單、 Backlinks 等），適合獨立成元件。

```

#### D-136 — 收合切換按鈕從浮動邊緣按鈕改回固定在標頭列，Inbox/Trash 移到側邊欄底部固定

決策：先前版本的收合/展開由 ResizablePanel 自己管理狀態，並在面板
邊緣浮出一顆獨立的箭頭按鈕；改為「受控」模式後，收合狀態改由外層
（NexusApp）管理，觸發按鈕移進 Sidebar / RightPanel 自己的標頭列
（取代原本「多選」按鈕的位置），「多選」按鈕改移到 Notes 導覽列右側。
同時 Inbox / Trash 導覽按鈕移到 Sidebar 最下方並固定，不隨筆記清單
捲動。

理由：

```

1.使用者回報浮動邊緣按鈕的位置「卡手」、體感不一致——面板邊緣的

拖曳把手與收合按鈕擠在同一塊窄小區域，容易誤觸或難以精準點擊。 固定在標頭列的位置更符合使用者對「工具列按鈕應該在固定、可預期 的位置」的直覺。

1.Inbox / Trash 是使用者需要隨時能點到的固定功能入口（類似

應用程式選單中的系統層級選項），不應該隨著筆記數量增加、清單 變長而被捲動出視野範圍之外，因此固定在側邊欄底部。

1.修正過程中發現並修復了一個真實 flex 版面 bug：flex-1

overflow-y-auto 的可捲動子區塊（筆記清單）若沒有 min-h-0， 預設的 min-height: auto 會讓內容溢出容器、被外層 overflow-hidden 裁切，而不是正確地讓 overflow-y-auto 產生捲動軸，導致 Inbox/Trash 被完全遮住。這個教訓已寫入 00 文件的 AI 協作規則，供未來寫類似的 flex 版面時參考。

```

---

## 15.14 決策 D-138（Sidebar 底部留白說明性註解）與 D-139（ResizablePanel 新增 bottomInset prop）

> ⚠️ 本節記錄的 D-138 / D-139 決策在提出當下（Track K/L 時期）是合理的，
> 但其設計前提（存在一個 position: fixed 的 BottomLeftPanel 浮動橫欄）
> 已於 Track M 被推翻——BottomLeftPanel 已刪除，改用內嵌在 Sidebar 內部
> 的 AccountSettingsRow。這代表 D-139 引入的 `bottomInset` prop 呼叫
> （`bottomInset={64}`）在 Track M 之後已經失去存在理由，變成死代碼，
> 已記錄為本次深度審核的問題 2 與待辦 R-1（見 00 文件第 12 節），
> 本節保留原始決策內容供歷史對照，不覆寫或刪除，但明確標註「前提已
> 不成立，需要後續修正」，避免下一個接手的 AI 誤以為這仍是有效設計。

#### D-138 — Sidebar 底部固定區塊需註解說明與（當時的）BottomLeftPanel 的視覺關係

決策（歷史）：Sidebar 最下方的 Inbox / Trash 固定區塊程式碼中加入
註解，說明底部保留額外留白是為了避開 BottomLeftPanel（當時畫面左下角
的帳號/設定橫欄，position: fixed、z-index 高於一般內容）造成的視覺
重疊。

現況：BottomLeftPanel 已於 Track M 刪除，此註解描述的前提已不成立，
但註解文字尚未同步移除（見 R-1）。

#### D-139 — ResizablePanel 新增 bottomInset prop，用「縮短面板高度」而非「內部 padding」避開浮動元件遮擋

決策（歷史）：`ResizablePanel` 新增 `bottomInset`（單位 px）prop，
外層呼叫端可以傳入一個數值，讓面板整體高度縮短這麼多，藉此避開
畫面底部固定的浮動元件（當時是 BottomLeftPanel）的視覺遮擋。刻意
選擇「縮短外層高度」（`marginBottom`）而不是「面板內部加 padding」，
因為內部加 padding 只會把內容往上推、超出容器後被 overflow-hidden
裁掉，並不會真正避開下方浮動元件的視覺遮擋；縮短外層高度才能讓
flex-1 的內容區塊（如 min-h-0 的筆記清單）正確按比例收縮。

現況：這個 prop 的設計本身（縮短外層高度而非加 padding）在技術上
仍然是正確、可重用的解法，如果未來又出現需要避開畫面固定元件的
場景，這個 prop 仍然可以繼續使用；問題只在於「Sidebar 呼叫端目前
傳入的 `bottomInset={64}` 這個具體數值」已經沒有對應的浮動元件需要
避開，應該歸零或移除該次呼叫，而不是移除整個 `bottomInset` 這個
prop 設計本身（見 R-1 的具體修正建議）。

---

## 15.15 決策 D-140～D-146（Track L/M：Document kind、新建入口收斂、Note 富文字排版分級、匯出範圍分級、帳號設定移入 Sidebar、拖曳把手觸發範圍）

> 本節對應使用者提出的「九點需求」（完整原文見 00 文件 1U.7 節）。
> D-140 到 D-146 是這批需求落地時建立的決策，完整實作細節、驗證方式
> 與 Playwright 測試結果見 00 文件 1U.6～1U.8 節，本節聚焦決策本體與
> 理由，避免與 00 文件重複過多實作細節。

#### D-140 — PageKind 新增 "document"，作為 D-102 拆分方向（kind vs default_mode）的延伸落地

決策：`PageKind` 從 `"note" | "study_set"` 擴充為
`"note" | "document" | "study_set"`，新增的 "document" 代表一種
以純文字為主、概念類似記事本或 VS Code 的內容類型，與 Note 的差異
在於不啟用富文字排版工具列，因此支援 Markdown 匯出（Note 則不）。
「記事本」經 `ask_user` 向使用者確認後，判斷不是獨立的第四種類型，
只是 Note 的別稱，因此沒有新增對應的 kind 字面值。

理由：

```

1.呼應 r15 深度稽核（D-102）的既定拆分方向：default_mode 不應同時

代表「頁面種類」與「顯示模式」，kind 欄位是實踐這個方向的機制， Track C 已用 kind: "study_set" 開了第一槍，Track L 的 "document" 是同一個機制的第二次驗證與延伸，證明這個拆分方向可以持續擴充 而不需要大改資料模型。

1.kind 為 optional、缺省視為 "note"，維持向後相容——舊 IndexedDB

中沒有 kind 欄位的資料不會因為這次擴充而被誤判類型。

```

#### D-141 — 新增 PageFormat 型別，本次只記錄使用者選擇不實作排版引擎

決策：新增 `PageFormat = "flow" | "a4" | "16:9" | "4:3" | "custom"`
型別，`Page` 與 `CreatePageInput` 新增 `format?: PageFormat` 欄位。
本次範圍明確收斂為「只記錄使用者建立頁面時選擇的格式」，不實作
對應的排版引擎（A4 分頁計算、簡報模式預覽等），這個範圍收斂已透過
`ask_user` 向使用者確認並取得同意。

理由：

```

1.排版引擎（分頁計算、簡報模式預覽）是一個獨立、複雜度高的功能，

若在本輪與其他八點需求混在一起做，容易造成範圍蔓延、拖慢其他 相對單純的需求的驗證與交付節奏；先落地資料欄位、UI 選擇流程， 排版引擎留給下一輪獨立處理，是更穩健的分階段做法。

1.format 為 optional、缺省視為 "flow"，向後相容既有資料，且不會

因為欄位存在但暫時不生效而造成任何顯示錯誤（因為目前所有頁面 不分 format 值一律採用同一種流動版面渲染）。

```

#### D-142 — 新建入口統一收斂到 Home 的 NewPageDialog，Sidebar 不再提供獨立建立入口

決策：Sidebar 移除獨立的「新增」`ToolbarDropdown`；Dashboard（Home）
新增單一「➕ New」按鈕，點擊開啟兩步驟的 `NewPageDialog`（選類型 →
選格式）。Nexus logo 從純文字改為可點擊的按鈕，點擊直接跳轉首頁；
`isHomeMode` 初始值改為 `true`，Home 成為預設進入畫面；Sidebar 移除
原本獨立的「🏠 Home」按鈕。

理由：

```

1.使用者明確指出「新增」功能重複（Sidebar 與 Home 各有一套建立

入口），統一收斂到單一入口可以降低使用者对「該用哪一個新增按鈕」 的選擇困擾，也降低未來新增頁面類型時需要同步維護兩套 UI 的成本。

1.Home 作為預設畫面 + logo 可點擊回首頁，是常見的應用程式導覽

慣例（類似瀏覽器點擊網站 Logo 回首頁），降低新手使用者的學習 成本，不需要另外提供一個獨立的「Home」按鈕造成介面選項冗餘。

```

#### D-143 — 帳號 / 設定移入 Sidebar 底部固定區塊，取代獨立的畫面浮動橫欄

決策：新增 `AccountSettingsRow`，取代刪除的 `BottomLeftPanel`
（position: fixed 的畫面角落浮動橫欄）。新元件內嵌在 Sidebar 最底部
（Inbox / Trash 固定區塊之後），屬於 Sidebar 內部 flex 容器的一部分，
不再是獨立於整個 App 畫面角落的浮動元件；設定齒輪按鈕的定位邏輯
比照 `PageItemMenu`（觸發點偏右側）。

理由：

```

1.使用者明確指出正確的位置認知：帳號與設定應該與 Inbox、Trash

一樣，屬於側邊欄固定區塊的一部分，而不是畫面角落的獨立浮動 元件——這是使用者對資訊架構歸屬的直接回饋，不是單純的視覺調整。

1.移除獨立的 position: fixed 浮動元件，也一併移除了過去為了避開

它而在 ResizablePanel / Sidebar 引入的間接複雜度（bottomInset、 z-index 協調等），理論上讓版面邏輯更單純；但實際上因為 bottomInset 呼叫沒有同步移除，反而留下了死代碼（見 D-139 現況 說明與 R-1），這是本次審核提醒未來做「移除舊機制」類型的重構時， 務必連同所有間接依賴（不只是直接引用）一起檢查清除的一個實例。

```

#### D-144 — 拖曳把手觸發範圍用「負外距 + 對稱內距」技巧向左擴大

決策：`.nexus-tiptap-editor` 加上 `margin-left: -56px; padding-left:
56px;`，讓編輯器內容元素的可偵測滑鼠事件範圍向左擴大 56px，文字視覺
位置因為 margin 負值與 padding 正值互相抵銷而完全不變。

理由：

```

1.根因是 @tiptap/extension-drag-handle 的 mousemove 偵測只綁定在

編輯器內容本身的 DOM 元素上，文字左側的視覺留白其實屬於外層 容器 EditorPane.tsx 的 padding，不屬於這個元素，因此需要在不 改變外層版面配置的前提下，讓編輯器內容元素本身的「可偵測範圍」 涵蓋到這塊區域。

1.「負外距 + 對稱內距」是解決「視覺位置不變但可互動範圍擴大」這類

需求的通用 CSS 技巧，不需要修改第三方套件原始碼、也不需要改變 任何其他元素的版面配置，是風險最低的修正方式。

1.已用 Playwright 精確計算文字行的 bounding box 並驗證修正生效，

不是只憑理論推導就假設修正成功。

```

#### D-145 — Note 富文字排版分級，透過 TiptapEditor 的 variant prop 控制

決策：`TiptapEditor` 新增 `variant?: "rich" | "plain"` prop，`"rich"`
（Note 使用）啟用字體/字級/顏色/對齊/螢光筆完整工具列，`"plain"`
（Document 使用）維持純文字書寫體驗。範圍已透過 `ask_user` 向使用者
確認縮小為「Tiptap 官方擴充套件可以直接做的部分」，分欄、圖表等
更複雜的排版功能明確不列入本次範圍。新增套件均為精確版本 `3.27.1`：
`@tiptap/extension-text-style`（提供 `TextStyleKit`，一次涵蓋
TextStyle/Color/FontFamily/FontSize/LineHeight/BackgroundColor 六種
能力）、`@tiptap/extension-text-align`、`@tiptap/extension-highlight`。

理由：

```

1.使用者以 Word、Google 文件、Gamma 為參考提出的需求原本範圍很廣

（含分欄、圖表等版面配置），透過 ask_user 提前收斂範圍到「Tiptap 官方擴充套件可以直接做的部分」，避免在本輪就一次做進複雜度高、 風險高的自訂排版引擎，是延續 R-1（見 15.9 節同類型判斷）一貫的 分階段落地原則。

1.variant prop 搭配 EditorPane.tsx 用 key 強制重新掛載 TiptapEditor

（因為 Tiptap 的 extensions 陣列只在元件掛載當下的 useEffect 決定 一次），是目前專案沒有使用 @tiptap/react 官方 React 綁定套件的 情況下，簡潔可靠地做到「依頁面種類切換完全不同的擴充套件組合」 的方式，不需要重新設計整個 Editor 生命週期管理邏輯。

1.TextStyleKit 一次啟用多種能力、只用 configure 關掉不需要的部分

（backgroundColor、lineHeight），比起逐一安裝 @tiptap/extension-color、@tiptap/extension-font-family 等個別 套件更精簡——後兩者其實只是從 TextStyleKit 所在套件 re-export， 安裝了也是多餘的重複依賴，這個發現已記錄供未來評估其他 Tiptap 擴充套件時參考（先確認官方是否已經有整合套件，再考慮逐一安裝）。

```

#### D-146 — Note 匯出範圍改為僅 PDF / Nexus JSON，Document 維持 Markdown

決策：Note（`kind === "note"`，含 PDF research note）的匯出選項從
「匯出為 Markdown」改為「匯出為 PDF」與「匯出為 Nexus 頁面
（`.nexus.json`）」兩項，不再提供 Markdown 匯出；Document
（`kind === "document"`）維持既有的 Markdown 匯出，不受影響。
PDF 匯出透過瀏覽器原生 `window.print()` 搭配 `@media print` CSS
規則實現，不引入額外的 PDF 產生函式庫依賴。

理由：

```

1.Note 在 D-145 新增字體/字級/顏色/對齊/螢光筆等排版資訊後，這些

資訊無法用純 Markdown 語法完整表示（Markdown 沒有內建的字體、 顏色、對齊語法），若仍提供「匯出為 Markdown」，會讓使用者匯出後 發現排版資訊全部遺失，屬於會誤導使用者的功能，因此主動下修範圍， 這個判斷已透過 ask_user 向使用者確認並取得同意（使用者選擇 「筆記僅支援 PDF/自家格式匯出」而非「保留部分相容的 Markdown」）。

1.Document 維持 Markdown 匯出的理由則相反：Document 的定位是

「以純文字為主的內容類型」（呼應九點需求第 7 點：概念類似記事本 或 VS Code），本來就不啟用富文字排版工具列，因此 Markdown 可以 完整還原其內容，沒有理由限制其匯出格式。

1.選擇瀏覽器原生列印功能而非引入 PDF 產生函式庫（例如

jsPDF、pdf-lib 等），是因為： a. 避免額外的大型依賴增加打包體積與潛在的版本相容性風險 （呼應既有的 Tiptap 版本鎖定教訓，任何新依賴都有機會引發 類似的深層依賴衝突）。 b. 瀏覽器原生列印本身就能正確渲染 CSS 樣式（字體、顏色、對齊 等），不需要額外實作一套「把 HTML/CSS 轉換成 PDF 座標系統」 的邏輯，維護成本更低。 c. 使用者可以在瀏覽器列印對話框自行選擇紙張大小、邊界等列印 選項，比起完全由程式碼決定 PDF 版面更有彈性。

```

---



## 15.16 決策 D-147～D-156（Supabase 雲端同步 + UI 改善）

#### D-147 — Supabase 共享工作區同步（無登入，即時同步）

決策：使用 Supabase 實現共享工作區同步。無登入機制，所有使用者看到同一份資料。啟動時 fullSync（雙向合併，last-write-wins），之後 Realtime 訂閱即時更新。每次本機存檔同步 push 到雲端，遠端變更時自動 reload 本機 state。備用每 60 秒 pullChanges。

理由：使用者要求「任何進入該頁面的人都可以即時更新」，不需要登入機制。Supabase 免費額度（500MB DB + 1GB Storage）對個人使用足夠。

#### D-148 — 環境變數管理 Supabase 連線

決策：使用 `.env.local` 管理 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。`supabase.ts` 提供 `getSupabase()` 單例和 `isSupabaseConfigured()` 檢查。

#### D-149 — SyncEngine 架構

決策：SyncEngine 類別封裝所有同步邏輯。提供 `fullSync()`、`pullChanges()`、`pushPage()`、`pushAttachment()`、`pushBinary()`、`pushPermanentDeletePage()`、`startRealtime()` 方法。透過 `subscribe()` 提供狀態訂閱，`setOnRemoteChange()` 提供遠端變更回調。

#### D-150 — 側邊欄「+」按鈕顯示格式選擇對話框

決策：側邊欄「+」按鈕點擊「新建筆記」或「新建文檔」時，跳出 NewPageDialog 格式選擇對話框（流動/A4/16:9/4:3）。NewPageDialog 新增 `initialKind` prop 支援預選類型。資料夾和學習集仍直接建立。

#### D-151 — 排序下拉新增「依照項目類型」勾選框

決策：排序下拉選單新增「☐ 依照項目類型」勾選框，可與「最近編輯」或「自訂排序」同時使用。勾選後項目按 kind 分組顯示（📝 筆記 / 📄 文檔 / 🗂 學習集），各組內維持所選排序模式。

#### D-152 — 隨時拖拽 + 位置感知 drop zones

決策：所有側邊欄項目隨時可拖拽（不限於自訂排序模式）。拖拽時根據游標在目標項目中的 Y 位置判斷 drop zone：上方 30% = above（藍色上線），下方 30% = below（藍色下線），中間 40% = child（藍色背景，變成子頁）。拖拽可改變 parent_id 和同級排序。

理由：使用者要求「要把子頁拉出或放入」，且「受排序影響只有最後同級項目的排序」。

#### D-153 — 子頁類型選擇

決策：hover 到頁面項目時，右邊「+」按鈕彈出類型選單（📝筆記 / 📄文檔 / 🗂學習集）。新建的子頁繼承父頁的 folder 和 tags，parent_id 設為父頁 ID。

#### D-154 — 自訂雙擊間隔（350ms）

決策：使用自訂雙擊偵測（350ms 間隔）取代瀏覽器原生 onDoubleClick（~500ms）。透過 lastClickTimeRef 和 lastClickIdRef 追蹤點擊時間和項目 ID。

理由：使用者反映「常常誤觸」，縮短間隔可減少誤觸。

#### D-155 — 工具列「字樣」改為 select 樣式

決策：工具列的標題樣式（¶/H1/H2/H3）從 ToolbarDropdown 改為 `<select>` 元素，與字型下拉同區同樣式。中文顯示「字樣」，選項為「內文 / 標題1 / 標題2 / 標題3」。

#### D-156 — ColorPaletteButton 色票選色器

決策：新增 `ColorPaletteButton` 元件，提供 50 色常用色票 + 最近使用顏色（localStorage 儲存，最多 10 色）+ 自訂色（原生 color picker）。用於工具列的字色和螢光筆。


#### 同步行為補充說明

**同步衝突策略（待實作）**：
目前的 last-write-wins 行為**不作為正式 v0**，需在近期優先實作衝突處理：
- 新增 `revision` 衝突檢測（當 remote revision > local revision 時提示使用者）
- 實作簡單的合併策略（保留兩者版本，讓使用者手動選擇）
- 引入版本歷史功能（每次存檔保留歷史快照）
此為近期優先工作，應在 Track D 之前完成。

**離線模式 UX**：
當網路斷線時，使用者仍可正常編輯筆記（所有資料存在本地 IndexedDB）。
重新連線後，SyncEngine 會自動觸發 `pullChanges()` 拉取遠端變更，
同時本機的編輯會在下次存檔時 push 到雲端。
目前無離線指示器 UI，未來可考慮在 AccountSettingsRow 顯示連線狀態。

**Binary 儲存策略**：
目前接受短期沿用 base64 儲存於 PostgreSQL 資料表（約 33% 膨脹），
預留未來改用 Supabase Storage 或其他 asset storage 的升級路徑。



---

## 15.17 決策 D-157~D-172（本次 5任務+8點+簡報直觀+圖表分區+優化）

#### D-157 — PageFormat 引擎：kind 決定預設，任何分頁可還原為流動

決策：Document 預設 a4（有分頁，可還原），Note 預設 flow（保持不改）。流動原本不改，僅有分頁的格式（a4/16:9/4:3/custom）可一鍵還原為流動。實作：PageFormatView 容器，a4 為 210mm 白紙灰底，16:9/4:3 為黑底簡報預覽，flow 為 820px 居中。format 為 ViewMode，非本質。

#### D-158 — FileMenu 在工具列同一行最左邊（Google Docs 風格）

決策：檔案下拉選單移至格式化工具列同一行最左邊，左側第一個按鈕。內含新建（筆記流動預設、文檔A4預設、簡報16:9）、匯入（PDF/Markdown）、簡報轉換、格式（流動/A4/16:9/4:3，可還原邏輯）、匯出/列印。取代標題右側舊格式切換UI。

#### D-159 — 單一上欄與標題，內頁分頁（A4 分頁時）

決策：A4 分頁時，只出現一個上欄（File+標題+工具列），不同的是內頁（紙張區域）。標題與工具列固定，僅紙張區域捲動，避免每張紙重複標題。

#### D-160 — 工具列右邊分頁按鈕指左右雙開分頁，非 A4 分頁符

決策：釐清使用者回饋「工具欄右邊應該要有的分頁按鈕是指的是開啟另一分項目時會出現左右分頁的那個分頁」。因此工具列最右側改為左右雙開控制：雙開中顯示雙開中/交換/關閉右側，未雙開顯示 Ctrl+點擊提示。中間分隔條僅視覺線。A4 的新增頁面按鈕移至 A4 紙張下方 sticky bottom。

#### D-161 — 標題右側 +設定資料夾、+新增子頁移除，側邊欄更多操作左側 + 恢復

決策：依使用者要求，標題右側的 +設定資料夾與 +新增子頁按鈕刪除，僅保留標籤。側邊欄每項 hover 時左側 + 按鈕恢復，位於 ⋮ 更多操作左邊，點擊彈出同類型子頁選單。

#### D-162 — 只有同類型能成為子頁，簡報無子頁概念

決策：`renderSubPageTypeMenu` 僅顯示與 parent 同類型選項：文檔→文檔，筆記→筆記，學習集→學習集；presentation 回傳 null 無子頁。`handleMovePage` 在 position===child 時檢查：若 target kind === presentation 則拒絕，若 dragged kind !== target kind 則拒絕，同類型才允許。深度限制 <2 保留。

#### D-163 — 偏好設定加入使用說明

決策：AccountSettingsRow 齒輪下拉新增 📖 使用說明按鈕，點擊開啟 HelpGuide 模態框（6節：檔案選單、分頁排版、側邊欄、雙開、簡報、其他）。HelpGuide Esc 關閉，點擊外部關閉。

#### D-164 — 子頁與重新排列功能嚴禁自行刪減，已恢復

決策：使用者嚴厲制止自行刪減功能。從原始 693 行完整版 Sidebar 恢復，清理亂碼：childMap、expandedIds、dragOverId/dragOverPosition、handleDragStart/Over/Drop、folderedGroups、groupByType、toggleExpand、renderPageItem depth 遞迴等全部恢復。

#### D-165 — 圖表分區：數據圖表與文字圖表，11種圖表類型

決策：ChartTypeMenu 重構為點擊開合，分兩大區：

數據圖表（灰底標題）：
- 長條圖 5 變體：長條圖、類別長條圖、群組長條圖、堆疊長條圖、堆疊比例長條圖，皆可一鍵轉直/橫（orientation toggle）
- 折線圖、圓餅圖、環狀圖、甘特圖、金字塔、雷達圖

文字圖表（米黃底標題，新增類別）：
- 時間軸、文字欄、文字清單、引言卡，屬於簡易文字方塊，類似時間軸/文字欄

資料模型：ChartData 擴充 `type: bar|line|pie|donut|gantt|pyramid|radar|timeline|text-columns|text-list|text-quote`, `variant?: single|category|grouped|stacked|stacked-percent`, `orientation?: vertical|horizontal`, `data: {label, value, series?, start?, end?}[]`

渲染器 ChartRenderer 支援全部11種：群組並排、堆疊、堆疊比例、折線 SVG、圓餅/環狀扇形、金字塔梯形、甘特橫條、雷達極座標、時間軸垂直線+圓點卡片、文字欄兩欄、文字清單/引言卡。

#### D-166 — 主題切換內頁文字變灰修復

決策：原因為 `.ProseMirror p { color: var(--color-text) }` 在 dark 模式下淺灰，於 A4 白紙上呈灰色。修復：globals.css 強制 `.nexus-format-a4-page .ProseMirror p, h1, h2, h3, li, ul, ol { color: #1a1a1a !important }`，16:9/4:3 同理。

#### D-167 — 分頁新增頁按鈕被重疊文字框監聽，無法點擊修復

決策：PageFormatView A4 底部按鈕改為 `sticky bottom-4 z-20 shadow-lg backdrop-blur`，確保高於紙張內容。點擊 dispatch `nexus-insert-page-break` 事件，TiptapEditor 監聽後執行 `setPageBreak()`。避免被 .nexus-tiptap-editor 的 mousemove 監聽遮擋。

#### D-168 — PPT/Canva/Gamma 整合分析

決策：已完成分析文件 `PPT-CANVA-GAMMA-INTEGRATED-ANALYSIS.md` 與 `CANVA-ANALYSIS-DETAILED.md`，引用 12+ 來源：

- PPT：Slide Master 階層 View→Slide Master，Master 改動級聯所有 Layout [1][3][4]，多母片 [3]
- Canva：拖拉編輯器簡單控制 [1]，瀏覽器運行側邊欄分類 [3]，bounding box 把手 [2]，紫色對齊線 [2]，圖層面板拖曳 [3]，定位工具 [4]，群組 Cmd+G 群組的群組 [5]，文字框獨立物件 Forward/Backward [6]
- Gamma：Liquid Canvas 卡片自適應 [7]，Blocks 可拖曳重排，左總覽中工作區右工具面板，slash 指令插入 [8]，AI 選版型 [9]，固定尺寸選項 [9]

整合建議：三層架構 Presentation > Master > Layouts > Slides.blocks[]，頂部檔案最左、中格式化、右雙開控制，自由/流體雙模式，對齊線、縮放把手、群組鎖定、Slide Master、Mermaid 即時渲染、recharts。

#### D-169 — 隨手記與 To-Do List 獨立於項目，獨立 Store

決策：依使用者要求 8 點，側邊欄首頁之下新增 隨手記、To-Do List 兩區塊，獨立於項目。

- PageKind 新增 quick_note, todo
- DB_VERSION 2→3，新增 quick_notes 與 todos objectStore，by_updated / by_due index
- StorageAdapter 新增 listQuickNotes/saveQuickNote/deleteQuickNote/listTodos/saveTodo/deleteTodo
- IndexedDBAdapter 實作 + 遷移：將舊 pages 中 kind===quick_note 或 folder===QuickNotes 的搬至 quick_notes，kind===todo 搬至 todos
- Sidebar filteredPages：若 isQuickNoteMode 僅 quick_note，若 isTodoMode 僅 todo，否則排除兩者
- QuickNotesView：Google Keep 風格，頂部快速輸入，網格卡片，顏色圓點，hover 刪除
- TodoView：日曆優先（42天網格），快速新增任務到選中日，右側總覽 今天/即將到來/已完成，checkbox 完成

#### D-170 — 側邊欄筆記改成項目，文檔、簡報、筆記、學習集統稱項目

決策：i18n `sidebar.nav.notes` zh-TW 改為「項目」，en 改為「Projects」。`isProjectKind()` 定義 note/document/study_set/presentation 為 project，quick_note/todo 非 project。`getProjectKinds()` 回傳 4 種。Dashboard 統計、Sidebar 項目按鈕 active 條件更新為 `!isTrashMode && !isHomeMode && !isQuickNoteMode && !isTodoMode`。

#### D-171 — 垃圾桶多選時再次點擊垃圾桶可退回項目

決策：垃圾桶按鈕改 toggle：若已在垃圾桶（isTrashMode true），點擊呼叫 onShowNotes() 回到項目，useEffect 監聽 isTrashMode 變化自動 setIsSelectMode(false) 清除多選。

#### D-172 — 代碼分析與優化，5項大結構已確認

決策：使用者確認分析報告中的 5 項大結構優化：

1. NexusApp 1198 行拆分為 useUiModes, usePagesStorage 等 hooks（已創建 src/hooks/useUiModes.ts, usePagesStorage.ts）
2. 引入 @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities（已 npm install，15KB）
3. default_mode 標記 @deprecated，僅向後相容，文件註明未來移除（C2 決策）
4. Creatable Registry 導入（新增 src/lib/creatableRegistry.ts，統一 icon/label/defaultFormat/isProject）
5. QuickNotes/Todo 獨立 Store 並遷移（已實作，DB_VERSION 3）

小範圍安全重構（Phase A）已識別：重複 Page 更新邏輯合併為工廠、Sidebar 過濾抽 hook、TiptapEditor 工具列拆分子元件、PDF 載入重複抽 usePdfBinary、卡片 UI 共用、console.log 移除、i18n 硬編碼替換、globals.css 重複合併。


---

## 15.18 決策 D-173~D-185（工具列置頂、排版同格、真正分頁、夜間適配、表格右鍵、空白頁刪除等）

#### D-173 — 工具列選單改為 Portal 固定定位最上層覆蓋

決策：ColorPaletteButton、ToolbarDropdown、FileMenu、ChartTypeMenu 原本 absolute 在 relative 容器內，父層 toolbarPortalRef 有 overflow-x-auto 導致被裁切。改為 createPortal 到 document.body，fixed 定位，z-[9999]，依按鈕 getBoundingClientRect() 計算 top/left，避開視窗邊界，監聽 mousedown 外部關閉與 resize/scroll 重定位。

#### D-174 — 對齊、分欄、文字排列同一格

決策：排版群組同一 bordered 容器內：
- 對齊：select 下拉 向左/置中/向右/兩端對齊，setTextAlign
- 分欄：select 下拉 單欄/2欄/3欄，multiColumnExtension，支援 2-3欄，grid 佈局，虛線邊框
- 文字排列：WritingModeExtension，按鈕 ↕️ toggleWritingMode vertical-rl，主要用於儲存格，保存於 content_json

#### D-175 — 表格自由度與右鍵選單

決策：TableGridPicker 8x10 網格自由選大小，Portal 覆蓋。表格工具列僅保留右鍵選單，不在工具列（使用者要求）。右鍵選單包含：
- 上方/下方插入列，左側/右側插入欄，刪除列/欄，合併儲存格（需選多格）、與上下左右合併（TableMap+CellSelection 實現垂直合併）、拆分、切換標題列/欄、平均僅選取範圍、刪除表格

#### D-176 — 真正分頁固定 A4 尺寸且底部可編寫

決策：PaginatedEditorView 重寫為真正分頁：
- A4 固定 210mm×297mm 1122px，內文高度 971px，ProseMirror min-height 971px 使底部可編輯
- splitIntoPages(blocks, innerHeight) 依 estimateBlockHeight 分頁，超出自動加頁
- 頁面置中 flex items-center，右上角保留 第X頁/共Y頁，底部提示已刪除
- 快速輸入防抖：handlePageChange 立即合併保存，800ms 後檢查溢出 +150px buffer 才搬移最後 block，避免跳行

#### D-177 — 夜間適配切換

決策：工具列清除格式右側新增切換鍵 原文字顏色/適配夜晚模式。EditorPane 管理 isPageNightAdapt，PaginatedEditorView 背景 var(--color-editor-bg) 文字 var(--color-text)，globals.css 新增 .nexus-paged-adapt 覆蓋強制黑字。

#### D-178 — 側邊欄單擊展開/收合，雙擊重新命名改回

決策：Sidebar 原雙擊展開父子頁，改回單擊展開/收合 + 選中頁面，雙擊重新命名，350ms 間隔保留。

#### D-179 — 表格編輯僅右鍵，不在工具列

決策：移除 TiptapEditor 中 toolbarState.table && (<> +C/-C 等) 整段工具列，僅保留右鍵選單，符合使用者「表格編輯選項僅出現在右鍵選單」要求。

#### D-180 — 檔案選單刪除空白頁

決策：FileMenu 新增 頁面管理 → 刪除空白頁。EditorPane 實作 handleDeleteBlankPages，過濾空白 paragraph/heading/list/table（getTextFromNode trim 空），保留一空段落避免空文件。

#### D-181 — 平均分配欄寬僅框選範圍

決策：平均分配改為僅框選範圍，不整體平均。右鍵選單 CellSelection.forEachCell 收集選取格，TableMap 找到選取欄位集合，計算選取欄位總寬度平均，僅對欄位在選取集合內的所有儲存格 setNodeMarkup colwidth=[avgWidth]，保持總寬不變，無需橫向拉動。

#### D-182 — 快速輸入跳行 BUG 修復

決策：PaginatedEditorView 原 setPagesBlocks updater 內呼叫 onContentChange 導致 Cannot update component while rendering。改為 useMemo 衍生 pagesBlocks，handlePageChange 立即合併保存，debounce 800ms + 150px buffer 後才搬移最後 block，避免游標跳動。移除 pagesBlocks state，避免 loop。

#### D-183 — 重複 underline 擴充

決策：StarterKit v3 已內建 underline，與獨立 Underline 重複，警告 Duplicate extension names。改 StarterKit.configure({link:false, underline:false})。

#### D-184 — 固定 A4 底部可編寫

決策：PaginatedEditorView 每頁固定高度 1122px，ProseMirror min-height 971px，底部可編寫，解決底部大塊留白無法編寫（底部位置太高）問題，保留固定 A4 尺寸。

#### D-185 — 側邊欄與分頁居中與頁碼保留

決策：頁碼右上角保留，第X頁/共Y頁，opacity 20。分頁容器 flex flex-col items-center，頁面置中，解決內頁跑掉問題。底部提示 已刪除。


---

## 15.19 決策 D-186～D-197（2026-08-23 代碼審計 + Bug 修復 + 簡報功能改造 + 創作類別）

> 本節是 2026-08-23 兩輪工作的決策記錄。完整背景、排查過程與驗證結果見上方
> `## 2026-08-23` 兩則日期日誌；本節聚焦可重用的決策本體與理由。對應代碼審計
> 見 `nexus-code-audit.md`（22 項發現，修復 15 項：H1-H4、M1-M7、L1-L2、L6、L9-L10）。

#### D-186 — H3/H4 採方案 A：quick_note / todo 廢棄獨立 store，統一為 pages store 的 kind

決策：2026-08-01（D-169）建立的 quick_note / todo 獨立 store 被廢棄。quick_note 與
todo 改為單純的 `PageKind`，與其他頁面種類一樣存在 pages store。移除
`IndexedDBAdapter` 的 `quick_notes` / `todos` store 建立、migration 與 6 個方法；
移除 `StorageAdapter` 的 `QuickNote` / `TodoItem` 介面與 6 個方法宣告。

理由：

```
1.獨立 store 造成 backup / sync 必須各自處理，實際上這兩種內容本質就是 Page，
  獨立 store 是過度設計（H3/H4 審計發現 backup 覆蓋缺口、sync pullChanges 漏拉）。
2.廢棄後 backup / sync 自然涵蓋（pages store 已涵蓋），移除約 200 行重複資料層代碼。
3.既有 IndexedDB 中已建立的空 quick_notes / todos store 物理保留（不主動刪除），
  未來 DB_VERSION 升至 4 時再清理，避免現在為了清空舊 store 引入額外 migration 風險。
4.此決策推翻 D-169 的「獨立 store」方向，已透過 ask_user 取得使用者確認（方案 A）。
```

#### D-187 — PresentationBlock 新增 rotation?: number 欄位

決策：簡報區塊型別 `PresentationBlock` 新增 `rotation?: number`（單位：度），
支援任意角度旋轉；未設定或缺省視為 0。

#### D-188 — 簡報 drag 架構：pointer events + setPointerCapture + 絕對座標模式

決策：簡報畫布的拖曳 / 縮放互動改採現代 Pointer Events API（`onPointerDown` /
`onPointerMove` / `onPointerUp` + `setPointerCapture`），確保所有 pointer 事件
都送往被擷取的元素。物件本體負責所有事件判斷：中心區域 = drag，邊緣 9px = resize；
把手圓點降級為純視覺（`pointer-events: none`，獨立 10px 定位）。`selBoxStyle()`
函式**必須**包含 `position: "absolute"`。

理由：

```
1.這是 drag bug 經十幾輪排查後定案的最終架構（根因見 D-188 補充說明）。
2.沒有 position:absolute，CSS 會靜默忽略 left / top / z-index，但 outline /
  transform / width / height 不受影響——這正是「resize/rotate 正常、只有 drag 壞」
  的症狀來源，極具迷惑性，記錄此 canon 避免未來重蹈。
3.setPointerCapture 確保即使游標移出元素也能持續收到事件，比傳統 document-level
  mousemove 監聽更可靠，且 cleanup 更乾淨。
```

#### D-189 — z-index 歸一化：每次改層級後重新分配連續值（間距 10）

決策：簡報圖層順序變更後，一律執行 `blocks.map((b, i) => ({ ...b, z: (i + 1) * 10 }))`
重新分配 z-index，避免長期編輯後 z-index 數值無限增長或出現間隙。

#### D-190 — resize 邊界 clamp：物件不超出畫布

決策：拖曳縮放時對座標做邊界鉗制：`x ≥ 0, y ≥ 0, w ≤ 100 - x, h ≤ 100 - y`
（座標皆為相對畫布的百分比），確保物件不會被拖出畫布範圍或變成負寬高。

#### D-191 — patchPage helper：統一的 page 更新函式，更新欄位時同步 refresh updated_at

決策：新增 `patchPage` helper，所有 page 更新 handler（content / title / folder /
tags / format / margins / presentation / study_items / favorite / rename）統一改用，
確保任何欄位變更都同步更新 `updated_at: Date.now()`。`revision` 維持「持久化版本」
語意（不是每次編輯都 +1），由 `flushSave` 實際寫入 IndexedDB 時 +1。

理由：

```
1.審計 M1 發現：多數 handler 更新欄位時未同步刷新 updated_at，導致排序與 sync
  的「最近編輯」判斷失準。統一用 patchPage 從根本消除此類漏刷。
2.revision 與 updated_at 語意分離：updated_at 是「內容何時被改」，revision 是
  「何時被持久化」，兩者不應混淆。
```

#### D-192 — 圖表編輯面板 Gamma 風格：上半部三欄 + 下半部資料表格

決策：簡報圖表編輯改為 Gamma 風格的浮動面板，位於編輯區底部，與畫布共用編輯區：
上半部三欄（類型選擇 icon 網格｜細項設定 checkbox + 方向 + 變體｜240×140 即時預覽），
下半部為資料表格（標籤 + 數值兩欄，移除「系列」欄位）。`ChartData` 型別擴充
`sortOrder?` / `showDataLabels?` / `showGrid?` / `showTitleNumber?`。

> 補充：上述四個 ChartData 選項已加入型別與編輯面板，但 `ChartRenderer` 尚未
> 完整尊重這些選項的渲染行為，屬已知待完成項（見第 16 節）。

#### D-193 — 圖表類型下拉選單：取代單一按鈕，7 種圖表類型可選

決策：簡報工具列「📊 圖表」從單一按鈕改為下拉選單，提供長條圖 / 折線圖 /
圓餅圖 / 環圖 / 甘特圖 / 金字塔 / 雷達圖共 7 種，每種帶預設資料。

#### D-194 — 文字下拉選單：取代單一按鈕，含標題層級 / 方塊 / 清單等預設樣式

決策：簡報工具列「＋ 文字」改為下拉選單，提供標題 / H1-H4 / 一般文字 /
區塊引述 / 方塊（備註 / 資訊 / 警告 / 錯誤 / 成功 / 問題）/ 清單（項目符號 /
編號 / 代辦）等預設樣式方塊。

#### D-195 — 版面下拉選單取代形狀：目錄 / 雙欄 / 三欄 / 引言卡 / 時間軸 / 文字清單

決策：簡報工具列原「⬜ 形狀」刪除，改為「📐 版面」下拉選單，提供目錄 /
雙欄 / 三欄 / 引言卡 / 時間軸 / 文字清單六種版面範本。

#### D-196 — 圖層拖曳排序：HTML5 drag-and-drop，拖曳後 z-index 歸一化

決策：簡報圖層面板支援 HTML5 拖曳排序（`onDragStart` / `onDragOver` / `onDrop`），
拖曳中的項目顯示 `opacity-40`，左側有「⠿」拖曳把手圖示；拖放完成後套用 D-189
的 z-index 歸一化。

#### D-197 — 新增 PageKind "creative"：側邊欄獨立類別，CreativeView 入口頁

決策：`PageKind` 新增 `"creative"`（與 note / document / study_set / presentation /
quick_note / todo 並列）。Sidebar 新增「✍️ 創作」獨立分類按鈕；`NexusApp` 新增
`isCreativeMode` state + `handleShowCreative`（與其他模式互斥）。新增 `CreativeView.tsx`
入口頁，初步提供兩種範本：📖 小說閱讀格式、🎭 角色詳細簡介表。創作頁面使用
`kind: "creative"`，以標準 EditorPane 編輯。`creatableRegistry` 新增 creative
定義（`isProject: false`）；Sidebar 的 `filteredPages` 排除 creative（不在「項目」清單顯示）。

理由：

```
1.使用者要求新增「創作」類別，與筆記 / 文檔 / 學習集 / 簡報並列為一級內容種類。
2.沿用 D-102 / D-113 / D-140 一貫的 kind 機制擴充，optional、向後相容，
  不需 migration。creative 不屬於 project（isProject: false），獨立顯示。
```


---

## 16. 可優化但不阻塞

| 主題 | 判斷 |
| --- | --- |
| Node v24 | 可用；若套件相容問題再改 LTS |
| shadcn/ui | 可後續加入；MVP-0 手寫 layout 合理 |
| SQLite + Drizzle | 長期正確；MVP-1 early 不提前遷移 |
| Tags vs multi_select | Tags 為一級組織，multi_select 為普通 property |
| tasks/events 真相邊界 | content_json / property_values 為真相，tasks/events 為 projection |
| Command Palette | ✅ 已實作（Track G，見 00 文件 1T 節與 D-124），Actions + Pages 合併清單，不依賴額外資料模型 |
| Stable Block ID | 🟡 近期優先底層工作（C3 決策）；r15 改為近期底層修補，支援未來 block reference / annotation（D-104） |
| Backlinks 全站比對效能 | 目前在 IndexedDB 全量過濾即可；筆記量大或感受到延遲時再評估 SQLite + Drizzle |
| Page kind vs default view mode | r15 確認應拆分；短期保留 default_mode 相容，中期新增 kind / default_view_mode |
| Workspace Backup | 應早於 Sync 完整化，近期先做 export package v0 |
| Dashboard / Home | ✅ v0 已實作（Track G，見 00 文件 1T 節與 D-125），統計卡片 + 最近編輯 + 快速建立入口，純前端即時計算；未來可視需要擴充更多統計種類或聚合視圖 |
| Callout 圖示選單點擊無效（真實瀏覽器） | 🟡 已知未解問題，使用者判斷不急迫，見 8.21.3；下次接手者不應假設已解決 |
| InlineMath（行內公式） | ✅ 已實作（見 8.23 節 Obsidian 風格改版，InlineMath 與 BlockMath 已一併完成，非個別追加動作） |
| Obsidian 風格公式編輯（原地編輯 + $/$$ 語法） | ✅ 已由使用者隱式驗證（使用數週未回報問題），可視為已完工 |
| 舊版官方 $$/$$$ 語法的 Markdown 檔案回溯相容 | 🔴 不做自動遷移；若使用者有舊版匯出的 .md 檔案，重新匯入時舊語法會被當純文字，需手動調整，見 8.23 節 |
| Preferences / i18n（語言偏好 + 全站中英雙語） | ✅ 已實作（Track H，見 00 文件 1U.2 節），語言偏好與 active_page_id 相同存在 IndexedDB settings store，不引入 localStorage |
| Sidebar UX（我的最愛 / 重新命名） | ✅ 已實作（Track I，見 00 文件 1U.3 節與 D-128） |
| Notion 風格 Drag Handle（段落拖曳重排） | ✅ 已實作（Track J，見 00 文件 1U.4 節與 D-132）；觸發範圍問題已於 Track M 修正（D-144） |
| Resizable Sidebar / RightPanel | ✅ 已實作（Track K，見 00 文件 1U.5 節與 D-135/D-136） |
| Document 頁面種類（PageKind 新增 "document"） | ✅ 已實作（Track L，見 00 文件 1U.6 節與 D-140），是 D-102 拆分方向（kind vs default_mode）的第二次延伸落地，支援 Markdown 匯出 |
| Page 版面格式選擇器（flow/a4/16:9/4:3/custom） | 🟡 已實作「記錄選擇」（Track L，見 D-141），排版引擎（分頁計算、簡報模式預覽）明確留待後續 track，經 ask_user 確認範圍收斂 |
| Note 富文字排版工具列（字體/字級/顏色/對齊/螢光筆） | ✅ 已實作（Track M，見 00 文件 1U.6 節與 D-145），範圍經 ask_user 確認收斂為 Tiptap 官方擴充套件可直接做的部分，分欄/圖表等複雜排版未列入 |
| Note / Document 匯出範圍分級 | ✅ 已實作（Track M，見 D-146）：Note 僅 PDF/Nexus JSON，Document 維持 Markdown，因排版資訊無法用純 Markdown 完整表示 |
| 帳號 / 設定移入 Sidebar 底部固定區塊 | ✅ 已實作（Track M，見 D-143），取代已刪除的 BottomLeftPanel 浮動橫欄 |
| ResizablePanel 的 bottomInset={64} 死代碼 | ✅ 已修正（見 00 文件 1V 節第 8 項），已移除 bottomInset prop |
| Page.default_mode 欄位棄用評估 | 🟡 中期考慮，見 00 文件第 12 節 R-2：目前寫死為 "note" 字面型別、無實際分支邏輯依賴，可評估加註 deprecated 標記或移除，需先 ask_user 確認 |
| Track 索引總表（新增於 01 文件第 15 節） | 🟡 中長期文件治理建議，見 00 文件第 12 節 R-3：目前 Track 代號分散在多個小節文字中，建議未來新增一張總表統一列出所有 Track 代號、狀態與對應決策編號範圍 |
| Supabase 雲端同步（共享工作區） | ✅ 已實作（見 00 文件 1V 節，D-147~D-149），無登入、即時同步、last-write-wins 衝突策略 |
| 隨時拖拽 + 位置感知 drop zones | ✅ 已實作（D-152），所有項目隨時可拖拽，above/below/child 三種 drop zone |
| 子頁類型選擇 | ✅ 已實作（D-153），hover 時「+」按鈕彈出類型選單 |
| 側邊欄「+」按鈕格式選擇 | ✅ 已實作（D-150），NewPageDialog 支援 initialKind |
| 排序按類型分組 | ✅ 已實作（D-151），可與最近編輯/自訂排序同時使用 |
| 色票選色器（ColorPaletteButton） | ✅ 已實作（D-156），50 色 + 最近使用 + 自訂色 |
| 學習集 CSV 匯入 + 四選一測驗 | ✅ 已實作，支援 CSV/TSV 匯入、四選一測驗模式 |
| 自訂雙擊間隔（350ms） | ✅ 已實作（D-154），減少誤觸 |
| 同步衝突策略文件化 | 🟡 目前使用 last-write-wins，建議未來補充文件說明同時編輯行為 |
| 離線模式 UX 文件化 | 🟡 離線時正常編輯，重新連線後自動同步，建議補充文件說明 |
| 簡報功能（drag / resize / rotate / 縮圖 / 多選對齊） | ✅ 已實作（2026-08-23，PresentationView 完全重寫，見 D-187~D-190）；drag 根因為 selBoxStyle 漏 position:absolute（D-188） |
| 簡報圖表編輯器（Gamma 風格） | ✅ 已實作（2026-08-23，見 D-192~D-195） |
| 簡報圖層拖曳排序 | ✅ 已實作（2026-08-23，見 D-196） |
| Creative 創作類別（PageKind 新增 "creative"） | ✅ 已實作（2026-08-23，見 D-197），CreativeView 入口頁 + 小說閱讀格式 / 角色簡介表兩範本 |
| 代碼審計（nexus-code-audit.md） | ✅ 22 項發現，修復 15 項（H1-H4、M1-M7、L1-L2、L6、L9-L10）；待完成 M5 / M8 / L3-L5 / L7 / L8 |
| quick_note / todo 獨立 store | 🔴 已廢棄（D-186 廢棄 D-169 的獨立 store 方向，改回 pages store 的 kind，使用者確認方案 A） |
| 簡報拖曳吸附線（智慧對齊線） | 🟡 待完成（M3-2 第二階段） |
| ChartRenderer 尊重 sortOrder / showDataLabels / showGrid / showTitleNumber | 🟡 型別與編輯面板已加（D-192），渲染器尚未完整支援 |
| 簡報 undo / redo | 🟡 待完成（目前無畫布歷史堆疊） |
| 殭屍頁面（離線永久刪除後 fullSync 復活） | 🟡 待完成（需 tombstone 機制） |
| 分頁編輯性能（N 頁 = N 個 TiptapEditor 實例） | 🟡 待完成（需虛擬列表） |

---

## 17. 最終一句話

> Nexus 的核心決策健康。截至 D-197，僅 D-186 明確推翻了既有決策（廢棄 D-169 的 quick_note/todo 獨立 store，改回 pages store 的 kind，已經使用者確認）。其餘核心架構原則（Page/Block 統一模型、content_json 真相、StorageAdapter、soft delete、local-first+Supabase 同步）維持健康。MVP-0/MVP-1 已完工；vNext A~M 主體完成。2026-08-01 完成工具列 Portal 置頂、分欄與直排同格、表格右鍵合併（上下左右）、平均僅選取範圍、真正分頁固定 A4 底部可編輯置中保留頁碼、夜間適配切換、側邊欄單擊展開雙擊重命名、刪除空白頁、快速輸入防抖、重複 underline 修復。2026-08-23 完成代碼審計（22 項 / 修復 15 項）、簡報功能重大改造（drag/resize/rotate/縮圖/多選對齊/圖表編輯器/圖層拖曳/下拉選單，drag 根因 position:absolute）、sync 400 修復、新增 Creative 創作類別。下一步候選：簡報拖曳吸附線 / Slide Master / undo-redo、ChartRenderer 選項支援、同步衝突 B2（M8）、殭屍頁面 tombstone、Stable Block ID C3、分頁虛擬化。



---

<!-- END TRANSFERRED ORIGINAL 01 CANON SOURCE -->

---

## 2026-09-14 帳號、同步與小說收尾日誌

### 資料庫與帳號

- 使用者已在 Supabase SQL Editor 執行 `20260914_creative_sync_fields.sql`；同步所需的創作欄位已存在於 `public.pages`。
- IndexedDBAdapter 新增可切換的本機 workspace owner。Page/Attachment 的 `workspace_owner_id` 僅供本機隔離；登入帳號、匿名工作區、雲端 `owner_id` 三者不可混用。
- App 啟動先讀取 Supabase session 再列出 IndexedDB，避免已登入使用者在畫面初期短暫看到匿名頁面。
- Google Auth callback 曾導向 localhost；根因是 Supabase URL Configuration 的 Site URL/Redirect URL，不是 Vercel 或 DevicePreview。使用者已把正式網址 `https://nexus-five-alpha-75.vercel.app/` 設為 Site URL 並加入 Redirect URL。

### 同步競態修復

- 症狀：登入後可能出現 `Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing`，stack 指向 `SyncEngine.fullSync()`。
- 根因：初始 session 與 `onAuthStateChange` 可連續啟動兩個同步；React Strict Mode cleanup 亦可能在舊同步等待 IndexedDB 時關閉連線。
- 修正：每次 `startAccountSync` 建立遞增 run token；只有最新 engine 可更新 UI/啟動 realtime。登出與 cleanup 使舊 token 失效並取消 Auth subscription。superseded engine 標記 destroyed，忽略其收尾錯誤；cleanup 不再主動關閉仍在 settling 的 IndexedDB connection。
- 驗證：`npm run build` 通過。仍需使用真實帳號流程確認 console 不再重現。

### 小說功能

- 小說維持獨立功能入口，不再顯示於創作分類。
- 新增章節重新命名、向上/向下排序、刪除。章節以 H1 為邊界，H2 與正文隨所屬 H1 移動。
- 小說行動版的目錄改為覆蓋式面板，閱讀/編輯主區設定獨立 `overflow-y-auto` 與 touch scrolling，避免側欄阻斷滑動。
- 總覽封面支援 PNG/JPEG/WebP（≤ 3 MB）實際附件保存與同步；替換/移除封面會在確定沒有其他頁面引用時軟刪除舊附件。
- 使用者明確排除：小說不提供表格、圖片、清單、提示框、LaTeX/程式碼等筆記功能；不實作世界觀、人物、地點與小說的關聯。

## 2026-09-13 產品與工程更新日誌

### UI 與編輯器

- 建立兩層頁面模型：功能介面使用固定 Google 式頂欄；各種編輯器保有自身工具列與可收合左側切換面板。
- 完成首頁顯示清理、功能群組收合、資料夾/排列與最近編輯工具方向；修正多處頂欄遮擋、左右側欄與雙開焦點/分隔線行為。
- 簡報的講者備註移除，新增投影片控制縮小，圖層欄可調整寬度，擠壓時工具列以三點收合。
- 完成 A4 分頁主區與縮圖列分離捲動，縮圖底部固定新增頁面；修正主紙張不可捲動問題。
- 修正 Tiptap drag handle 顯示偏移，LaTeX 改為 Obsidian 式預覽/點擊編輯；表格增加完整顯示與右側細部操作面板。

### 小說

- 小說從創作入口開啟時新增作品總覽。封面使用可替換的中性佔位，顯示作品名稱、概述、字數、章節數與完整目錄。
- 作品名稱與概述可在總覽直接修改；概述存於 `novel_settings.synopsis`，不再擷取正文第一段。

### 帳號與 Supabase

- 新增 `AccountButton.tsx`，將帳號入口移至右上角；支援 Email/密碼登入、註冊、登出與 Google OAuth。
- `SyncEngine` 改為取得登入 user_id 後才啟動，並在 pages/attachments/binaries 查詢、Realtime、upsert、delete 使用 owner_id。
- 新增 `supabase/migrations/20260913_account_isolation.sql`：加入 owner_id、移除 `allow all` policy、啟用 RLS、建立每帳號 policy。
- Supabase Google Provider 與 Google Cloud OAuth Web client 已設定；Google Cloud project 為 `handy-resolver-508512-q8`，OAuth consent app 名稱為 `Personal Notes Workspace`。
- 舊雲端未歸屬資料已透過 SQL 更新歸戶至 `changling971216@gmail.com`。

### 已知風險與後續

- 本機 IndexedDB 尚未依登入 user_id 分區。若同一瀏覽器登入另一帳號，舊帳號本機資料可能仍被載入或同步；此為帳號功能的最高優先修正，不可視為已完成的多帳號隔離。
- 未完成 M4-7 前，帳號切換測試只應在獨立瀏覽器 profile 或清空本機測試資料的環境進行。


```

---

## 2026-09-28 — 交接檔整合：09-16～09-25 工作紀錄與舊文件搬移

### 類型

文件整合（00／01／02 三檔更新）。

### 背景

舊 00／01／02 最後更新於 2026-09-14。之後使用者在新對話中進行了 2026-09-16～09-21 的多輪工作，程式碼快照則產生於 2026-09-25，含有對話中沒有的 FSRS 與測驗持久化。本輪把三者整合。

### 行動

- 依「實際 source ＞ 00 ＞ 01 ＞ 02」重新盤點；以程式碼快照核對每個對話中的回報。
- 00、01 全面更新並以【新增】【修改】【搬移】【取代】標示；本檔追加下方日誌，並在附錄保留**舊 00 全文**與**舊 01 被替換段落原文**。
- 未刪減任何功能需求；教師／學生版 PDF 與世界觀關聯為使用者明確取消（D-204、D-201）。

### 發現的問題

1. 09-22～09-25 無對話紀錄，FSRS、測驗持久化、`DB_VERSION` 3→6 只能由程式碼推導。
2. 三個遠端 migration（`20260916`、`20260922`、`20260925`）的套用狀態沒有紀錄。
3. `pages.kind` 是否有 CHECK 約束、是否允許 `creative`／`web`／`counter`／`draw` 未驗證。
4. 使用者 09-16 長需求清單中的數個提問（效能風險、是否需要 App、分享替代方案、字典方向）未被回答（00 §11）。
5. `web`／`counter`／`draw` 的 `content_text` 被寫成整份 JSON 字串。
6. `IndexedDBAdapter` 內殘留過期註解「DB_VERSION 4 清理」。
7. 本檔尾段（2026-09-13／09-14 兩段日誌）在原檔中位於一個未閉合的程式碼圍欄內，會被渲染成程式碼區塊；內容未改動，僅在此註記。

### 結果

00／01 為新的權威版本；02 僅追加與附錄，未改動既有歷史。

---

## 2026-09-16 — 小說獨立章節、角色卡與世界觀、多項介面修正

### 類型

功能實作＋需求盤點。

### 背景

使用者先要求小說章節改為獨立資料，AI 完成後使用者貼出一份長需求清單（下拉刷新、首頁捲動、Untitled、側欄功能格、網頁／計數／抽選、手機與平板側欄、小說翻頁、字卡字典、角色卡區塊／模板／分頁、世界觀、多分類日曆、分享、效能疑慮、App 疑問），詢問「還有哪些沒做」。

### 行動

1. **14:23 小說章節**：新增獨立 `novel_chapter`（父作品 ID、排序、標題、正文、時間）；章節工作區與編輯器；目錄／上下章／刪除／排序／重新命名改操作獨立章節；啟用時才轉存並清空舊正文。遷移檔已新增，未套用遠端。
2. **14:34 盤點**：AI 對照程式碼列出「尚未完成或只完成一部分」「已寫入程式但需實機驗收」「已具備」三類（內容併入 00 §10.11 與 01 §12）。
3. **14:36 使用者**：「先補完小說與角卡的功能」。
4. **14:47～22:21 實作**：小說頂部翻頁；登入後不再誤選章節；角色卡混合內容區塊、統計欄位（小標、多行介紹）、真正的雷達圖；底部分頁與管理；自訂模板、模板管理、背景範文；空白／D&D 5e／CoC 7e 專用模板；手機排版修正；命名與刪除確認改為頁面內對話框。
5. 期間先後兩次因使用量上限中斷（14:47 之後、22:21 之前），使用者要求「繼續實作」後續接。
6. **22:30 使用者**：詢問 Steam「角色屋」桌寵如何在兩個螢幕存在——與專案無關，對話中未見回覆。

### 遇到的問題與解決

- 內建瀏覽器無法使用原生 `prompt`／`confirm`，導致命名、儲存模板、刪除確認不能測 → 改為頁面內對話框。
- 空白模板原本仍帶預設組件與標籤 → 改為完全空白；D&D／CoC 原本沿用奇幻／現代模板 → 改為各自專用欄位。
- 角色卡原為「一個區塊一種類型」 → 新增 `group` 區塊與 `contents[]`，舊葉節點保持相容。

### 結果

八項測試、介面測試、TypeScript、ESLint 與正式建置通過（AI 回報）。**尚未部署，遠端 migration 尚未套用。**

### 後續影響

見 01 F-NOVEL、F-CHARACTER、F-WORLD、D-209～D-211；未回答的提問見 00 §11。

---

## 2026-09-19～09-20 — 新增選單、下拉刷新、右鍵操作與講義排版

### 類型

功能實作＋建議。

### 背景

使用者：切換功能後，「新增」內容也應對應該功能；頁面刷新仍然太容易觸發，要求先分析其他頁面刷新的做法再製作；右鍵應含全選／複製／貼上／剪下；理想是在筆記中做出課本與講義的排版，詢問如何改良。

### 行動

- 新增選單隨功能切換（筆記→流動／分頁；創作→世界觀／角色卡；小說→小說作品…）。
- 參考 Ionic Refresher 與 Chrome `overscroll-behavior` 重做下拉刷新（D-212）。
- 編輯器、表格、編輯選單加入全選／複製／貼上／剪下。
- **建議（09-20 01:07）**：課本／講義排版依序改良：①統一樣式 ②教學區塊 ③穩定分頁 ④輸出與導航。
- **09-20 01:21 使用者**：「教師／學生版 PDF 不用做。其他繼續實作」→ D-204。
- **09-20 13:36 起實作**：整份樣式、教學區塊、作答留白、頁首頁尾、自動目錄與題號、「依 A4 整理分頁」（使用者觸發、可復原）。

### 遇到的問題與解決

- 分頁筆記是手動分頁，每張紙內容不會自動搬移 → 保留該行為，新增使用者觸發的整理按鈕。
- 超過一整頁的長表格或段落 → 保留完整內容並提示，不截掉。
- 手機測試發現流動筆記重複套用兩層左右邊距，正文過窄（原有問題）→ 一併修正，並整理手機「更多」選單入口。
- 因使用量上限再度中斷，使用者續接。

### 結果

10 項測試通過（09-20 01:07 回報），講義完成後累計 14 項；隔離介面驗證通過。**尚未部署；實際列印、實體手勢手感待驗證。**

### 後續影響

見 01 F-LESSON、§6.4、D-204、D-212～D-214。

---

## 2026-09-21 — 偏好與帳號入口重整

### 行動

使用者要求：移除右上角帳號登入；偏好第一層只留「主題、語言、設定、備份（匯出／匯入）」，主題與語言為右側浮動子面板；「設定」進入詳細設定介面（如 GPT 設定），功能排序建議與使用說明也放在此。

已完成：移除右上角帳號入口（保留側欄入口）；偏好第一層四項；主題／語言右側浮動子面板；詳細設定分類（一般、功能排序、使用建議、使用說明、備份）。

### 結果

14 項測試、介面驗證、TypeScript、ESLint、正式建置通過（AI 回報）；尚未部署。決策見 01 D-205、D-206。

---

## 2026-09-22 ～ 2026-09-25 — FSRS 每日練習與測驗持久化（程式碼推導；無對話紀錄）

### 來源

程式碼快照（2026-09-25）、`tests/study-workspace.md`、`supabase/migrations/20260922_study_fsrs.sql`、`20260925_study_quiz_persistence.sql`、各 `tests/*.test.cjs`。

### 內容

- **FSRS**：`ts-fsrs 5.4.2`（FSRS-6），英→中每日練習；獨立 `study_*` stores（IndexedDB 由 v3 升為 v4，之後版本至 v6）；append-only 事件；每學習集每日新字額度（預設 20）；舊 `study_items` 保留；備份 schema v2；Supabase 四張獨立表＋RPC `apply_study_operation`；跨裝置分支標記衝突。
- **測驗持久化**：`quiz_*` stores 與 `apply_study_quiz_operation`；答錯分數 0–4；離線作答需使用者決定上傳。
- **測試**：新增 `studyFSRS`、`studyRepository`、`studySync`（PGlite 實跑 migration）、`studyPractice`、`studySessions`、`quizPersistence`、`quizQuestions`。

### 尚未驗證（來自 `study-workspace.md`）

正式 Supabase、兩台實體裝置、iOS 實機端到端。

### 待使用者確認

這段期間的決策是否全由使用者確認、是否還有口頭要求（00 §A.2）。



---

## 附錄 A：舊 00（2026-09-14 版）全文【搬移，未改動】

> 以下以四個波浪線圍欄原樣保留，避免與本檔標題混淆。其中舊 §9（2026-08-01 深度審核）、舊 §11（09-13）、舊 §12（09-14）已由新 00 的 §9、§12 與 §A 取代；其餘章節被新 00 改寫，此處為歷史對照。

~~~~markdown
# 00-HANDOFF-STATUS-AND-AI-RULES

# 00-HANDOFF-STATUS-AIRULES

# Nexus — HANDOFF / STATUS / AI RULES（下一個 AI 第一入口）

*日期：2026-08-23* *狀態：🟢* *用途：讓下一個 AI 在新對話中直接接手 Nexus：理解目前狀態、使用者要求、AI 限制、任務進度、下一步與驗證清單。*


---


## 0. 目前任務環節：正在進行與將要進行

> **本節列出目前正在進行與下一批待開工的任務。**
> 

### 任務 ID 規則

```
M{MVP編號}-{任務序號}
例：M0-0、M1-4、M3-1、M9-0。
Q-{序號} 為跨階段工程／品質任務。
```

### 正在進行

```
目前沒有已開啟的程式功能工作包。

本輪（2026-08-23）已完成：
- 代碼審計：22 項發現（4 高/8 中/10 低），輸出 nexus-code-audit.md
- Bug 修復 15 項：H1-H4、M1-M4、M6-M7、L1-L2、L6、L9-L10
- 簡報功能重大改造：PresentationView 完全重寫（pointer events、絕對座標拖曳、
  縮放/旋轉、多選對齊、縮圖鏡像、圖表編輯 Gamma 風格、投影片右鍵選單、placeholder、
  浮動工具列、z-index 歸一化、resize clamp、圖層拖曳排序、文字/圖表/版面下拉選單、面板開合）
- drag 根因修復：selBoxStyle 漏 position:absolute（十幾輪排查）
- sync 400 修復：Supabase pages 表補齊 margins 等欄位
- H3/H4 決策：quick_note/todo 廢棄獨立 store（方案 A）
- 新增 PageKind "creative"：側邊欄新增 ✍️ 創作類別（小說閱讀格式、角色簡介表）
- CreativeView.tsx 新元件
- 三份外部分析報告評估（識別誤判、確認真實問題）

下一個程式工作須由使用者指定，不能因已列入任務表就自動開始。
```

### 將要進行：已排定的第一批候選工作包

| 優先 | Task ID | 工作包 | 狀態 | 量 | 

| --- | --- | --- | --- | --- | 

| 0 | `Q-0` | 現行 schema reconciliation：核對 PageKind、DB_VERSION 3、presentation、quick_notes／todos、Backup／Sync coverage | ▶️ 未開始 | M | 

| 1 | `M3-1` | 簡報物件選取、縮放把手與邊界限制 | 🟡 大部分完成 | L |

| 2 | `M3-2` | 簡報對齊／吸附線與多物件定位 | 🟡 部分完成（對齊按鈕✓ 吸附線▶️） | L | 

| 3 | `M3-3` | 簡報群組、鎖定、圖層操作持久化 | ▶️ 未開始；依賴 M3-1～2 | L | 

| 4 | `M4-1` | Sync coverage audit，為 B2 衝突處理前置 | ▶️ 未開始；依賴 Q-0 | M | 

| 5 | `M5-0` | Stable Block ID contract | ▶️ 未開始；依賴 Q-0 | M | 

| 6 | `M2-2` | 最小 Citation Metadata contract，補 MVP-2 結案缺口 | ▶️ 未開始；依賴 Q-0 | L |

### 本節的執行規則

```
一次只開一個 Task ID 或一組有直接依賴的 Task ID。
Task 被列入「將要進行」不代表已開始。
每次正式開工／完成／暫停，都只更新本節與 §10 對應 Task Card 的狀態，不重複改寫其他區段。
```


---


## 1. 交接包怎麼讀

```
00-HANDOFF-STATUS-AIRULES.md          # 本檔：最新狀態與下一步權威
01-CANON-SPEC-AND-DECISIONS.md             # 專案設定、規格、決策權威
02-PROJECT-LOG-DETAILED.md                 # 詳細日誌、問題、解法、歷史
```

權威規則：00 = 最新任務狀態與交接規則，01 = 現行功能／實作規格，02 = 歷史、原始決策與轉移 archive；02 不覆蓋 00／01。


---


## 2. 目前進度：MVP 容器摘要

> 此處只顯示每個 MVP 的整體狀態；所有任務、估算、依賴與完成條件請看 §10。

| MVP／工作線 | 任務大綱 | 整體狀態 | 已完成／已開始摘要 | 
| --- | --- | --- | --- | 
| MVP-0 | 本地筆記原型 | ✅ 完成 | `M0-0~4` 全數完成 | 
| MVP-1 | 個人筆記系統與個人知識工作流 | ✅ 完成 | `M1-0~7` 全數完成 | 
| MVP-2 | 學習／研究核心 | 🟡 已開始、未結案 | `M2-0~1` 完成；`M2-2~5` 未開始 | 
| MVP-3 | 簡報與結構化內容創作 | 🟡 已開始、未結案 | `M3-0` 完成；`M3-1` 大部分完成（拖曳/縮放/旋轉/對齊/縮圖鏡像）；`M3-2~8` 未開始 | 
| MVP-4 | 共享同步安全與版本 | 🟡 已開始、未結案 | `M4-0` 完成；`M4-1~6` 未開始 | 
| MVP-5 | Stable Block ID、Reference、Canvas 基礎 | ⏳ 未開始 | `M5-0~5` 未開始 | 
| MVP-6 | 深度研究、Library、GoodNotes-like PDF Workspace | ⏳ 未開始 | `M6-0~6` 未開始 | 
| MVP-7 | 學習、複習與時間規劃 | 🟡 已開始、未結案 | `M7-0` 完成；`M7-1~6` 未開始 | 
| MVP-8 | 分享與發布 | ⏳ 未開始 | `M8-0~2` 未開始 | 
| MVP-9 | 跨平台與 Mobile UI | ⏳ 未開始 | `M9-0~4` 未開始 | 
| Q 工作線 | 跨階段工程、品質與技術債 | 🟡 部分已開始 | `Q-1` 部分基線存在；其餘依 §10 判讀 |

**目前不屬於任務狀態表的內容：** 已完成細功能、PageFormat、表格、工具列、PDF viewer、i18n 等，請讀 01 的功能規格；其對應歷史與決策請讀 02。


---


## 3. 任務執行規則

```
00 §0：正在進行與下一批候選。
00 §2：MVP 容器整體進度。
00 §10：唯一完整任務目錄、任務狀態、依賴、估算與完成判準。
01：功能與實作規格。
02：歷史、決策與問題過程。
```

1.一次只啟動一個明確 Task ID，或直接依賴的最小組合。
2.`Q-0` 是所有資料模型、Sync、Block ID 任務的共同前置；未完成前不可猜測現行 schema。
3.低信心、XL、XXL 任務先做 discovery／資料契約，經確認後才進入程式碼。
4.Task 狀態只使用：`✅ 完成`、`🟡 已開始`、`▶️ 未開始／已排定`、`⏳ 未開始／未排定`、`⚠️ 等待決策`。
5.不得因延後或拆分任務而刪除需求；只更新 Task ID、依賴、狀態與預估。
6.每個完成 Task Card 都要回寫：驗證方式、實際問題、是否需更新 01 功能規格與 02 歷史日誌。


---


## 4. 檔案結構（更新至 2026-08-01 最新）

```
src/
├── app/
│   ├── globals.css (A4分頁樣式+夜間適配.nexus-paged-adapt+表格max-width+多欄)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AccountSettingsRow.tsx
│   ├── HelpGuide.tsx
│   ├── ChartTypeMenu.tsx (Portal z-9999)
│   ├── ChartRenderer.tsx
│   ├── CreativeView.tsx (新增，創作類別首頁：小說閱讀格式、角色簡介表)
│   ├── PageFormatView.tsx (真正分頁前身，現 flow 用，置中，移除底部提示)
│   ├── PaginatedEditorView.tsx (新增，真正分頁：splitIntoPages+估算高度+debounce 800ms+buffer 150px+固定 A4 1122px+可編輯 min-height 971px+頁碼右上保留)
│   ├── FileMenu.tsx (Portal，新增刪除空白頁)
│   ├── PresentationView.tsx (自由畫布，2026-08-23 大幅改造：pointer events、絕對座標拖曳、圖表 Gamma 風格編輯、圖層拖曳排序、文字/圖表/版面下拉選單)
│   ├── QuickNotesView.tsx
│   ├── TodoView.tsx
│   ├── EditorPane.tsx (夜間適應狀態 isPageNightAdapt，PageFormat vs Paginated 分流，刪除空白頁處理)
│   ├── Sidebar.tsx (單擊展開/收合，雙擊重新命名，350ms，新增 creative 類別按鈕)
│   ├── TiptapEditor.tsx (StarterKit underline:false，Portal 工具列，排版群組對齊+分欄下拉+直排切換同一格，表格右鍵 TableMap+CellSelection 上下左右合併，平均僅選取範圍，夜間適配切換鍵，showToolbar 避免分頁殘留)
│   ├── TableGridPicker.tsx (8x10 Portal)
│   ├── ColorPaletteButton.tsx (Portal)
│   ├── ToolbarDropdown.tsx (Portal)
│   └── ...
└── lib/
    ├── types.ts (PageKind 含 creative，ChartData 加 sortOrder/showDataLabels/showGrid/showTitleNumber，PresentationBlock 加 rotation，PageMargins)
    ├── presentation.ts
    ├── pageBreakExtension.ts
    ├── multiColumnExtension.ts (multiColumn 2-3欄，column)
    ├── writingModeExtension.ts (writingMode vertical-rl)
    ├── creatableRegistry.ts (含 creative 定義)
    ├── stableBlockIdExtension.ts (所有 block 節點穩定 id)
    ├── StorageAdapter.ts (quick_note/todo 廢棄獨立 store，H3 方案A)
    ├── IndexedDBAdapter.ts (DB_VERSION 3，移除 migration + quick_notes/todos 方法)
    ├── syncEngine.ts (pushPage 含 margins 等欄位 + 錯誤 log)
    └── supabase.ts
```

共 ~50 檔案（含新增 CreativeView.tsx）


---


## 5. 使用者偏好與規則

- 無程式經驗
- Windows PowerShell 用 npm.cmd / npx.cmd
- 檔案修改方式：AI 直接在 workspace 維護 project/ 並 build 驗證，每次更新提供zip檔，使用者下載覆蓋
- 文件治理保守保留歷史，新狀態明示
- 需要確認或不明白的任務請向使用者提問，嚴禁自行刪減功能
- i18n 每次更新需檢查覆蓋


---


## 6. 絕對不要做

```
不要重建專案
不要把 content_text 當真相
不要用 rmdir /s /q
不要擅自刪減未提及功能
不要在 PowerShell 用 npm/npx
架構變更前先用 ask_user 確認（大結構5項已確認）
```


---


## 7. 最短交接文字（更新）

```
Nexus 是 local-first 個人學習與知識生成 workspace，Supabase 共享工作區同步已實作。

已完成的近期內容包括：工具列 Portal 覆蓋、排版同格、表格右鍵、真正 A4 分頁、夜間適配、側邊欄單擊展開／雙擊重新命名、刪除空白頁、快速輸入防抖與 underline 修復。

2026-08-23：代碼審計（22 項發現）+ bug 修復 15 項 + 簡報功能重大改造（PresentationView 完全重寫：pointer events 拖曳、縮放/旋轉、多選對齊、縮圖鏡像、圖表編輯 Gamma 風格、右鍵選單、placeholder、浮動工具列、z-index 歸一化、圖層拖曳排序、文字/圖表/版面下拉選單、面板開合）。drag 根因為 selBoxStyle 漏 position:absolute（十幾輪排查）。sync 400 修復（Supabase margins 欄位補齊）。H3/H4 決策：quick_note/todo 廢棄獨立 store（方案 A）。新增 PageKind "creative"（創作類別：小說閱讀格式、角色簡介表）。

目前 00 暫行採用「任務優先」框架：MVP 只負責容器分類；任務狀態、依賴、估算與待開工順序另行記錄。下一個程式工作不自動開始；建議先執行 `Q-0` schema reconciliation，之後依使用者優先序處理 `M3-1~3` 簡報互動、`M4-1~6` B2 同步安全、`M5-0~3` Stable Block ID，並保留 `M2-2~5` citation metadata 結案包。詳見本檔 §0、§3、§10，尤其 §10.6 的完整任務 ID 詳細卡。
```


---


## 8. 最終一句話

> Nexus 核心架構健康，Page/Block 統一模型、content_json 真相、StorageAdapter、soft delete、local-first+Supabase 同步維持健康。2026-08-01 完成工具列 Portal 置頂覆蓋、排版同格、表格右鍵、真正分頁、夜間適配、側邊欄互動、空白頁處理、快速輸入防抖與 underline 修復。

> 

> 2026-08-02 起，00 暫行採用任務優先的 MVP 容器與估算框架：**MVP-0／1 完成；MVP-2／3／4／7 已開始但未結案；MVP-5／6／8／9 尚未開始。** 每一個後續工作都必須以任務 ID、依賴與驗收條件處理，而不是只以 MVP 名稱判斷進度。

> 2026-08-23：代碼審計 22 項 + bug 修復 15 項（H1-H4, M1-M7, L1-L2, L6, L9-L10）+ 簡報功能重大改造。簡報 drag 根因（`selBoxStyle` 漏 `position: absolute`）經十幾輪排查定位修復。M3-1 大部分完成、M3-2 部分完成。sync 400 修復（margins 欄位）。H3/H4 採方案 A 廢棄獨立 store。新增 creative PageKind（創作類別）。新增決策 D-186~D-197。


---


## 9. 最終深度審核（2026-08-01 更換對話串前零遺漏定版）

> 本輪深度審核方法：文件交叉比對（00/01/02）、決策編號連續性（D-01~D-185）、程式碼 grep（死檔、重複擴充、setState 迴圈）、build 驗證（tsc 0, next build 成功）、UX 邏輯推演（快速輸入跳行、貼邊、橫向捲動、工具列殘留等）

**發現問題**：

1.01 章節錯亂：15.16/15.17 在 16/17 之後重複，cat >> 追加導致 2.死檔：BottomLeftPanel.tsx、PreferencesFab.tsx、PreferencesMenu.tsx 未被引用 3.夜間適配未持久化：isPageNightAdapt 僅記憶體 4.平均欄寬無提示：無 CellSelection 時無反應 5.分頁估算啟發式：表格、圖片可能偏差 6.快速輸入跳行：setPagesBlocks updater 內呼叫 onContentChange 導致 Cannot update component while rendering

**已執行最佳化**：

- R-1 刪死檔 ✅
- R-2 夜間適配持久化 IndexedDB+localStorage ✅
- R-4 平均提示 ✅
- R-8 文件重排 15.16→15.17→15.18→16→17 連續 ✅
- 固定 A4 底部可編寫：ProseMirror min-height 971px ✅
- 重複 underline：StarterKit underline:false ✅

**未執行留待下輪**：

- R-5 實際 DOM 測量分頁精確度
- R-6 游標保護搬移
- R-7 分欄比例拖曳
- B2 同步衝突、C3 Stable Block ID、Phase B/C 代碼拆分

**結論**：文件零遺漏，決策零推翻，代碼零阻塞，架構健康，可安全更換對話串。


---


## 10. 任務定義、MVP 大綱與完整任務目錄

> **§10 是 00 中唯一完整的任務資料來源。**

> 所有已完成、已開始、未開始的工作均在此以 Task ID 表示；§0 與 §2 只作摘要，避免重複。

### 10.1 Task ID、狀態與估算規則

```
ID 格式：M{MVP}-{序號}，例如 M0-0、M1-4、M3-8。
Q-{序號}：跨階段工程／品質任務，例如 Q-0。

✅ 完成：實作與既有驗證紀錄已存在。
🟡 已開始：已有基線，尚未達該 Task 完成條件。
▶️ 未開始／已排定：已知依賴與位置，尚未開工。
⏳ 未開始／未排定：已分類，但不是近期候選。
⚠️ 等待決策：需先確認資料模型、UX 或產品邊界。
```

| 量級 | 淨工程量 | 使用原則 | 

| --- | --- | --- | 

| XS | < 1 日 | 明確單點修正 | 

| S | 1–2 日 | 小型 UI／局部邏輯 | 

| M | 3–5 日 | 單一元件／資料流／明確整合 | 

| L | 6–10 日 | 跨檔案、migration 或互動測試工作包 | 

| XL | 11–20 日 | 新資料模型、跨層工作流、複雜 UX／同步 | 

| XXL | > 20 日 | 必須先 discovery／拆分，不能單一交付 |

> 量級是單一有經驗 TypeScript／React 開發者的粗略淨工程量，不是日曆承諾；不包含使用者驗收等待、需求變更、外部服務限制與未知瀏覽器 bug。

### 10.2 MVP 任務大綱

| MVP | 任務大綱 | 結案意義 | | --- | --- | --- | | MVP-0 | 本地筆記原型 | 可建立、編輯、保存、重開、基本刪除 | | MVP-1 | 個人筆記系統 | 可搜尋、組織、連結、復原、基本內容交換 | | MVP-2 | 學習／研究核心 | PDF research flow、公式、最小 citation metadata | | MVP-3 | 簡報與結構化內容創作 | 可用的物件操作、內容 blocks、可重用 layout | | MVP-4 | 共享同步安全與版本 | 不以 last-write-wins 作正式資料保護策略 | | MVP-5 | 知識身分、Block Reference、Canvas 基礎 | 穩定 block identity 與引用底座 | | MVP-6 | 深度研究、Library、GoodNotes-like PDF Workspace | Reference、annotation、asset／reading、PDF 專屬工作空間 | | MVP-7 | 學習、複習與時間規劃 | Review Queue、Task projection、Calendar、Board | | MVP-8 | 分享與發布 | Share Page、Link Page、Publish Site | | MVP-9 | 跨平台與 Mobile UI | Desktop／mobile storage、offline、touch、responsive 規格 | | Q 工作線 | 工程與品質 | schema、重構、分頁精確度、i18n、regression |

### 10.3 MVP-0 — 本地筆記原型

| ID | 任務 | 狀態 | 量 | 完成判準 | | --- | --- | --- | --- | --- | | M0-0 | Next.js 專案、三欄 App Shell、系統字體基線 | ✅ | M | 可啟動並顯示 Sidebar／Editor／Right Panel | | M0-1 | StorageAdapter、IndexedDB、ID 生成 | ✅ | L | UI 不直接依賴 IndexedDB，資料可持久化 | | M0-2 | Tiptap 基礎 editor、Typography、Markdown heading shortcut | ✅ | M | 可輸入並保存基本結構化內容 | | M0-3 | `content_json` 真相、`content_text` 衍生、auto-save、beforeunload | ✅ | L | refresh／重開後內容與格式可還原 | | M0-4 | soft delete 基礎與 active page lifecycle 保護 | ✅ | M | 刪除不復活、不白屏，資料可後續 restore |

### 10.4 MVP-1 — 個人筆記系統與個人知識工作流

| ID | 任務 | 狀態 | 量 | 完成判準 | | --- | --- | --- | --- | --- | | M1-0 | Search v0 | ✅ | M | title／`content_text` 子字串搜尋可用 | | M1-1 | Sidebar、頁面清單、選取與組織 UX | ✅ | L | 可瀏覽、選取、排序、重新命名、分組 | | M1-2 | Tags 與交集篩選 | ✅ | M | tags CRUD 與 search 交集正確 | | M1-3 | Lightweight Folders | ✅ | M | 單層 folder、未分類置頂、reload 後正確 | | M1-4 | Page-level Wikilink Backlinks／Right Panel | ✅ | L | outgoing/backlinks 與跳轉／建立正確 | | M1-5 | 個人資料安全：Trash／Restore、permanent delete、Duplicate、Bulk Select | ✅ | L | restore、二次確認、copy、批次操作正確 | | M1-6 | 基本文字工作流：Document、Markdown、Link／Task／Table／Callout、基礎 rich editor | ✅ | XL | 內容可編輯、匯入／匯出與既有資料相容 | | M1-7 | Workspace UX：Quick Capture、Dashboard、Command Palette、Preferences/i18n、Sidebar layout | ✅ | XL | 個人日常整理與導覽工作流可用 |

### 10.5 MVP-2 — 學習／研究核心

| ID | 任務 | 狀態 | 量 | 前置／完成判準 | | --- | --- | --- | --- | --- | | M2-0 | Attachment、PDF Import、PDF Viewer、Research Note flow | ✅ | XL | PDF → Attachment → Research Note → Viewer 可用 | | M2-1 | Inline／Block LaTeX 與 Markdown round-trip | ✅ | L | `$...$`／`$$...$$` 編輯、保存與匯入匯出可用 | | M2-2 | 最小 Citation Metadata contract | ▶️ | L | Q-0；authors/year/venue/DOI/URL/key/abstract 可保存 | | M2-3 | Research Note metadata UI | ▶️ | M | 依賴 M2-2；可編輯並閱讀 metadata | | M2-4 | Citation metadata Import／Export／Backup／Sync 行為 | ▶️ | M | 依賴 M2-2、M4-1；不遺失／錯置 | | M2-5 | 研究流程回歸驗證 | ▶️ | S | PDF import → note → metadata → reopen／backup 通過 |

### 10.6 MVP-3 — 簡報與結構化內容創作

| ID | 任務 | 狀態 | 量 | 前置／完成判準 | | --- | --- | --- | --- | --- | | M3-0 | Presentation Hybrid 基線：kind、轉換、自由畫布、圖層、備註、版型、主題、圖表 | ✅ | XL | 簡報可建立、編輯、保存、reload | | M3-1 | 物件選取、縮放把手、邊界限制 | 🟡 | L | 大部分完成：pointer events + setPointerCapture、絕對座標拖曳、邊緣 resize、旋轉 Shift 15°、邊界 clamp；旋轉後 resize 方向待改善 | | M3-2 | 對齊／吸附線與多物件定位 | ▶️ | L | 依賴 M3-1；可對齊 slide／物件 | | M3-3 | 群組、鎖定、圖層持久化 | ▶️ | L | 依賴 M3-1～2；group/lock/z-order 可保存 | | M3-4 | 數據／文字圖表編輯體驗細化 | ▶️ | M～L | type/variant UI 規格明確且不破壞 renderer | | M3-5 | Mermaid 與 recharts 整合 | ▶️ | M～L | 先定 rendering/export policy；可插入、保存、錯誤提示 | | M3-6 | Slide Master／Layout／Theme 最小模型 | ⚠️ | XL | 先確認 Master > Layout > Slide data contract | | M3-7 | 簡報 reload／sync／真實瀏覽器 QA | ▶️ | M | 已選 M3 工作包完成後驗證 | | M3-8 | Image Insert／Asset insertion 基線 | ▶️ | L | 圖片為 insert block，binary 不進 content_json；先確認 Note／Presentation scope |

### 10.7 MVP-4 — 共享同步安全與版本

| ID | 任務 | 狀態 | 量 | 前置／完成判準 | | --- | --- | --- | --- | --- | | M4-0 | Supabase shared workspace 基線：full sync、Realtime、push/pull | ✅ | XL | 多裝置可看到 shared workspace 基礎資料 | | M4-1 | Sync coverage audit | ▶️ | M | Q-0；有 local/cloud/backup coverage matrix | | M4-2 | revision conflict detection／事件模型 | ▶️ | M | 依賴 M4-1；remote 較新時不靜默覆寫 | | M4-3 | 版本快照與 retention 策略 | ▶️ | L | 依賴 M4-2；保存可追溯、保留規則明確 | | M4-4 | 保留雙版本與手動解決 UI | ▶️ | L | 依賴 M4-2～3；可比較／選擇／保留兩者 | | M4-5 | offline/reconnect/delete/attachment 衝突語意 | ▶️ | L | 邊界測試矩陣通過 | | M4-6 | Backup Import 與雲端再同步規則 | ▶️ | M～L | 還原後不被舊雲端資料覆蓋 |

### 10.8 MVP-5 — Stable Block ID、Reference 與 Canvas 基礎

| ID | 任務 | 狀態 | 量 | 前置／完成判準 | | --- | --- | --- | --- | --- | | M5-0 | Stable Block ID contract | ▶️ | M | Q-0；node 範圍、格式、duplicate invariant 可測 | | M5-1 | 舊 content_json normalize／backfill | ▶️ | L | 依賴 M5-0；舊文件不損毀 | | M5-2 | 新增／匯入／複製／拆分／合併 ID 去重 | ▶️ | L | 依賴 M5-0～1；各入口無 duplicate/missing ID | | M5-3 | Block ID regression tests | ▶️ | M | 依賴 M5-0～2；自動檢出缺漏／重複 | | M5-4 | Block reference／transclusion 最小體驗 | ⏳ | L | 依賴 M5-0～3；可引用與定位 | | M5-5 | Canvas Page／Block reference 基線 | ⏳ | XL | 依賴 M5-4；引用真相而非複製資料 |

### 10.9 MVP-6 — 深度研究、Library 與 GoodNotes-like PDF Workspace

| ID | 任務 | 狀態 | 量 | 前置／完成判準 | | --- | --- | --- | --- | --- | | M6-0 | Reference／Bibliography 深度模型 | ⏳ | L | 依賴 MVP-2 metadata；可重用並關聯多內容 | | M6-1 | Annotation anchor：PDF／Page／Block／Attachment | ⏳ | XL | 依賴 M5；reopen/render 後可定位或明確失效 | | M6-2 | PDF highlight／annotation UI | ⏳ | XL | 依賴 M6-1；可建立、編輯、跳轉 | | M6-3 | Asset Library／Reading List 最小視圖 | ⏳ | L | 可查看、篩選、關聯 assets／sources | | M6-4 | Collection／Properties filter/sort/table | ⏳ | XL | 能支援研究整理但非 Notion clone | | M6-5 | GoodNotes-like PDF Import Workspace discovery | ⏳ | L～XL | 定義 page-centric import、page navigation、Research Note 關係；不假設手寫／annotation細節 | | M6-6 | GoodNotes-like PDF workspace implementation | ⏳ | XL～XXL | 依賴 M6-5；不破壞現有 attachment workflow |

### 10.10 MVP-7 — 學習、複習與時間規劃

| ID | 任務 | 狀態 | 量 | 前置／完成判準 | | --- | --- | --- | --- | --- | | M7-0 | Study Set、CSV/TSV、四選一、Quick Notes、Todo 日曆基線 | ✅ | XL | 基本卡片、測驗、快速筆記、Todo UI 可用 | | M7-1 | Review Queue 與 review state | ▶️ | L | 可產生待複習佇列 | | M7-2 | 雙向拼寫／容錯／提示 | ⏳ | M～L | 明確答案比對規則 | | M7-3 | Task projection：Note task/manual task 聚合 | ▶️ | L | Task view 不另存重複真相 | | M7-4 | Calendar／Event projection | ⏳ | L | date fields 可映射並回到來源 | | M7-5 | Board／status workflow | ⏳ | L | 基本 filter/move/status 可用 | | M7-6 | Quick Notes／Todo 的 Search/Backup/Sync 整合 | ▶️ | M～L | 獨立 stores 不成資料孤島 |

### 10.11 MVP-8 — 分享與發布

| ID | 任務 | 狀態 | 量 | 前置／完成判準 | | --- | --- | --- | --- | --- | | M8-0 | Share Page 最小資料／公開邊界 | ⏳ | M～L | 先確認與 B1 的關係；公私有內容有界線 | | M8-1 | Link Page／Landing Page | ⏳ | L | 依賴 M8-0；不污染 Note schema | | M8-2 | Publish Site：routes/theme/static export | ⏳ | XL | 依賴 M8-0～1；最小多頁網站可用 |

### 10.12 MVP-9 — 跨平台與 Mobile UI

| ID | 任務 | 狀態 | 量 | 前置／完成判準 | | --- | --- | --- | --- | --- | | M9-0 | Mobile UI standards discovery | ⏳ | L | 定義 touch、small viewport、sidebar、table、dual pane、presentation、PDF 最低標準 | | M9-1 | Tauri feasibility／StorageAdapter audit | ⏳ | XL | 依賴 M4；desktop storage/backup/sync 可行方案 | | M9-2 | Tauri desktop MVP | ⏳ | XXL | 依賴 M9-1；可安裝且資料不遺失 | | M9-3 | Capacitor feasibility／offline UX | ⏳ | XL | 依賴 M9-0～1；mobile storage/sync/editor 可行 | | M9-4 | Capacitor mobile MVP | ⏳ | XXL | 依賴 M9-3；基本閱讀、編輯、同步、backup 可用 |

### 10.13 Q 工作線 — 跨階段工程、品質與技術債

| ID | 任務 | 狀態 | 量 | 時機／完成判準 | | --- | --- | --- | --- | --- | | Q-0 | current schema reconciliation | ▶️ | M | 所有資料模型／Sync／Block 任務前；輸出 source-backed schema/coverage matrix | | Q-1 | Phase B/C：hooks、重複邏輯、Registry、dnd-kit 整理 | 🟡 | M～L／切片 | 分切片 M3～M5；不破壞既有功能 | | Q-2 | PaginatedEditorView DOM measurement | ▶️ | L | PageFormat polish；改善表格／圖片估算偏差 | | Q-3 | 分頁游標保護搬移 | ▶️ | M | Q-2 或實際 bug 時；避免游標跳動 | | Q-4 | 分欄比例拖曳 | ⏳ | M～L | PageFormat polish | | Q-5 | Callout icon 真實瀏覽器 bug | ⏳ | S～M | 取得可重現資料後處理 | | Q-6 | i18n/accessibility/real-browser regression matrix | ▶️ | M | 每個 MVP 結案前；build 與真實 UX 分離 |

### 10.14 歷史 Track 與新 Task ID 的關係

```
舊 Track A～M 是歷史實作批次名稱，不再作目前任務 ID。
新 M0-*～M9-*／Q-* 是目前唯一任務目錄。

主要對照：
- Track A / Table / Callout / LaTeX / Document editor 基線 → M1-6、M2-1。
- Track B Quick Capture、Track G Dashboard、Track H～M UX → M1-7。
- Track C Study Set → M7-0。
- Track E Workspace Backup、Supabase Sync → M4-0。
- 2026-08-01 Presentation Hybrid → M3-0。
- 2026-08-01 Quick Notes／Todo → M7-0。
- PageFormat／表格／Portal 等已完成內容 → M1-6 或跨階段既有基線；後續品質工作在 Q-2～Q-4。
```

### 10.15 Task ID 正規化歷史

```
早期暫行提案曾使用 `M2-01`、`M3-01`、`Q-01` 等零填充編號。
自 2026-08-02 起統一採 `M0-0`、`M1-0`、`M2-0`、`Q-0` 的短格式。
舊編號僅作歷史別名；目前與未來一律使用本節的新 ID。
完整轉換記錄已寫入 02 的最新日誌，不修改嵌入於 02 archive 的原始舊文件。
```

---

## 11. 2026-09-13 交接更新

### 本輪完成

- 介面與導覽：Google 風格頂欄、左側功能群組預設收合、首頁/垃圾桶/功能順序、功能篩選（單擊篩選、雙擊開啟）、五項可視捲動、雙開編輯器與可拖曳分隔線。
- 編輯器與分頁：手機版側欄收合後不保留垂直軌道，開關在頂欄左側；A4 主紙張與縮圖欄分離捲動，縮圖底部固定新增頁面；LaTeX 以 Obsidian 式預覽/點擊編輯呈現；表格有完整顯示與右側細部操作面板。
- 小說：小說入口先顯示作品總覽，含可編輯作品名稱、獨立概述、封面佔位及完整章節目錄；概述不再從正文自動擷取。
- 簡報與側欄：簡報講者備註移除、圖層面板可調寬、工具列擠壓時可收合；筆記/簡報/字卡篩選與雙開焦點行為修正。
- 帳號：Email/密碼登入、註冊、登出及 Google OAuth 按鈕已加入右上角帳號入口。Supabase 已完成 owner_id/RLS 遷移，舊雲端資料已歸戶至 `changling971216@gmail.com`。

### 重要資料安全狀態

- 未登入者只能使用該瀏覽器 IndexedDB 的本機資料；RLS 禁止未登入者讀取雲端資料。
- 雲端 `pages`、`attachments`、`binaries` 已以 `owner_id = auth.uid()` RLS 隔離。舊的 `allow all` policy 已由遷移移除。
- **未完成且高優先：本機 IndexedDB 尚未按帳號隔離。** 同一瀏覽器切換帳號時，本機既有頁面仍可能顯示或被新帳號同步。不得宣稱多帳號本機隔離已完成；應先完成 `M4-7`。

### 下一個必要工作包

| 優先 | Task ID | 工作包 | 狀態 | 完成判準 |
| --- | --- | --- | --- | --- |
| 0 | `M4-7` | Account scoped local workspace | 🟡 已開始 | IndexedDB pages/attachments/binaries 可按 user_id 分區；登入合併有明確確認；切換帳號不顯示、不推送前帳號資料；登出後僅本機匿名 workspace 可見。 |
| 1 | `M4-8` | Auth and OAuth regression | ▶️ 未開始 | Email/Google login、email confirmation、redirect URL、登出、RLS、雙帳號/雙裝置測試矩陣通過。 |
| 2 | `M9-0` | Mobile UI standards discovery | 🟡 部分實作 | 將已完成手機側欄規則納入完整 touch/small viewport 規格。 |

### 目前環境與驗證

- 專案：`C:\Users\user\Desktop\Projects\nexus`
- 本輪所有程式變更以 `npm run build` 驗證通過。
- Supabase migration：`supabase/migrations/20260913_account_isolation.sql`；執行前需先有 pages/attachments/binaries 三表。
- Google OAuth：Google Cloud 專案 `handy-resolver-508512-q8`；OAuth 同意畫面名稱為 `Personal Notes Workspace`；Supabase Google Provider 已設定成功。

---

## 12. 2026-09-14 交接更新（優先閱讀）

### 本輪完成

- **Supabase schema：** 使用者已執行 `supabase/migrations/20260914_creative_sync_fields.sql`，`pages` 已具備 `creative_type`、`character_data`、`novel_settings`、`assistant_blocks` 欄位；小說與角色資料可隨同步保存。
- **本機帳號工作區：** `IndexedDBAdapter` 以本機欄位 `workspace_owner_id` 區分 pages 與 attachments。登入後僅讀取/建立該帳號的快取；登出後只顯示匿名本機工作區。`SyncEngine` 對本機資料亦做 user_id 防禦性篩選，避免把其他帳號或匿名資料推送到雲端。
- **登入初始化競態：** 修正登入時可能同時啟動多個 `fullSync()` 的問題。只允許最新同步工作更新 UI，登出/React Strict Mode 清理時會取消舊工作與 Auth listener；不再觸發 IndexedDB `database connection is closing` 錯誤。
- **小說：** 小說已是 Todo（日曆）、字卡、創作之外的獨立入口；作品總覽含可編輯名稱、獨立概述、完整目錄。章節可重新命名、上下排序與刪除；手機閱讀/編輯區可獨立垂直捲動。
- **小說內容邊界：** 小說編輯器只提供正文、H1 章節、H2 子章節與基本文字樣式；表格、圖片、清單、提示框、數學/程式碼等功能不在小說範圍。貼上富文字時轉成純文字段落。使用者已決定「世界觀、人物、地點與小說的關聯」未來也不實作。
- **作品封面：** 可上傳 PNG/JPEG/WebP（最大 3 MB）並同步附件/二進位資料；更換或移除封面時，未被其他頁面引用的舊附件會標記刪除並於下次同步送往雲端。
- **正式站 OAuth：** Vercel 正式網址為 `https://nexus-five-alpha-75.vercel.app/`。使用者已在 Supabase Authentication → URL Configuration 將 Site URL 設為該網址，並加入 `https://nexus-five-alpha-75.vercel.app/**` Redirect URL；Google OAuth 完成後應回到 Vercel，不應回到 localhost。Google Cloud 的 callback 仍是 Supabase callback，不改為 Vercel。

### 尚需驗證／限制

| 優先 | Task ID | 狀態 | 說明 |
| --- | --- | --- | --- |
| 0 | `M4-7` | 🟡 部分完成 | pages/attachments 已做本機帳號分區；binaries 尚未實體分區（以附件 ID 存取且不在其他帳號 UI 顯示）。匿名資料不會自動匯入登入帳號，尚未提供「明確確認後匯入」介面。需以兩帳號實機驗證登入、登出、切換、附件及離線後同步。 |
| 1 | `M4-8` | 🟡 部分完成 | Email/Google OAuth、RLS、redirect 已配置；仍需真實裝置驗證登入後回到 Vercel、登出、雙帳號與雙裝置同步。 |
| 2 | `M9-0` | 🟡 部分完成 | 小說手機捲動與頂欄已修正，但仍需使用真實手機測試觸控、Safari、分頁與雙開降級行為。 |

### 2026-09-14 最終帳號入口決策

- **Nexus 採登入必須制。** 未登入只顯示全頁登入／註冊入口，不讀取、建立、顯示或匯入任何工作區頁面與附件；全域 Markdown 拖曳匯入在未登入時也不啟用。
- 成功登入後才選取 account-scoped IndexedDB 快取並同步 Supabase。已有登入 session 時可使用本機快取離線編輯，恢復網路後同步；「必須登入」不等於「必須全程連網」。
- 登出時立即清空 React 中的頁面、附件、垃圾桶與作用中頁面，然後回到登入畫面。匿名工作區不再是產品功能。
- 使用者已授權：目前既有的匿名本機資料在下一次以 `changling971216@gmail.com` 登入時，一次歸戶並同步。此一次性遷移會寫入完成標記，後續不可自動歸戶其他資料或帳號。

### 驗證證據

- 最近程式變更均已執行 `npm run build`，Next.js production build 與 TypeScript 均通過。
- 本文件描述程式碼與設定狀態；不等同於使用者已完成所有跨帳號/跨裝置實機驗收。
~~~~


---

## 附錄 B：舊 01（2026-09-14 版）被替換段落原文【搬移，未改動】

> 以下各段被新 01 改寫或取代，行號依舊檔。

### §1.3 明確產品邊界（舊 01 第 55–62 行）

~~~~markdown
### 1.3 明確產品邊界

| 類別 | 現行邊界 | | --- | --- | | Note | 最重要核心；native rich editor 優先，不保證完整 Markdown 保真 | | Document | 獨立於 Note；偏文字／Markdown 工作流 | | PDF | 現行為匯入後關聯 Research Note；未來要增加 GoodNotes-like PDF import workspace | | Image | **作為內容插入（insert block）**，不是獨立匯入頁面類型 | | Audio / Video | 🚫 暫時不考慮添加 | | AI | 後期輔助層，不作早期內容資料模型或必要依賴 | | Web Clipper | 後期能力；先不做完整 browser extension | | 帳號／權限 | 現行共享 workspace 無登入；未經確認不得自行加入帳號系統 | | Mobile UI | ▶️ 未來任務；現階段不以 mobile-first 改寫既有 Web UI |


---


~~~~

### §3 功能總覽與狀態矩陣（舊）（舊 01 第 100–117 行）

~~~~markdown
## 3. 功能總覽與狀態矩陣

### 3.1 Core Creatables

| ID | 功能 | 狀態 | 一句話規格 | 對應任務容器 | | --- | --- | --- | --- | --- | | F-NOTE | Note | ✅ | rich native editor 的核心內容 Page | MVP-0／1 基線 | | F-DOCUMENT | Document | ✅ | plain text／Markdown 導向的獨立 Page kind | MVP-1 基線 | | F-PDF | PDF Research Note | 🟡 | PDF import + attachment + research note；GoodNotes-like workspace 為未來 | MVP-2／6 | | F-STUDY | Study Set | 🟡 | cards、CSV/TSV、quiz 基線；Review Queue 未完成 | MVP-7 | | F-PRESENTATION | Presentation | 🟡 | 自由畫布簡報；拖曳/縮放/旋轉/對齊/縮圖鏡像已實作；吸附線/Master/undo 未完成 | MVP-3 | | F-QUICKNOTE | Quick Notes | 🟡 | Google Keep 風格快速筆記；獨立 store 已廢棄（H3 方案A），統一 pages kind | MVP-7 | | F-TODO | Todo | 🟡 | 日曆優先 UI；獨立 store 已廢棄（H3 方案A），統一 pages kind | MVP-7 | | F-CREATIVE | Creative | 🟡 | 小說閱讀格式、角色簡介表；CreativeView 入口頁 + 兩種範本 | 待分類 | | F-CANVAS | Canvas | ⏳ | Page／Block reference 的視覺組織能力 | MVP-5 | | F-WEBSITE | Website / Publish Project | ⏳ | Share Page → Link Page → Publish Site | MVP-8 |

### 3.2 System Views

| 功能 | 狀態 | 規格摘要 | | --- | --- | --- | | Home / Dashboard | ✅ | 統計、最近編輯、快速入口；不承擔資料真相 | | Sidebar / Projects | ✅ | 分組、排序、拖拉、同類子頁、Favorites、Rename、Select mode | | Search | ✅ v0 | 目前以 title／`content_text` 為主；未來範圍需擴及其他 records | | Inbox / Quick Capture | ✅ | Quick Capture 建立 Inbox item，且不打斷目前編輯 | | Trash | ✅ | soft delete、restore、permanent delete、bulk actions | | Right Panel | ✅ | Backlinks / Outgoing Links；Home 時不顯示 | | Command Palette | ✅ | Actions + title-based Pages 導覽 | | Quick Notes View | ✅ 基線 | Google Keep-like 卡片；完整 Search／Backup／Sync coverage 待核對 | | Todo View | ✅ 基線 | 日曆優先；完整 task system 尚未完成 | | Review Queue | ⏳ | 學習核心未來系統視圖 | | Calendar / Board | ⏳ | 將從 properties／tasks／events projection 建立 | | Graph | ⏳ | 已規劃，尚無正式最小規格 | | Reading / Asset Library | ⏳ | 深度研究與資產管理未來視圖 |

### 3.3 Tools 與基礎服務

| 功能 | 狀態 | 規格摘要 | | --- | --- | --- | | New / File Menu | ✅ | 建立、匯入、格式、轉簡報、頁面管理、匯出／列印 | | Import / Export | ✅／🟡 | 現行格式見 §7；更多互通格式未來補齊 | | Workspace Backup | ✅ v0 | 單一 JSON、完全覆蓋 import；新 stores coverage 需 source audit | | Supabase Sync | 🟡 | shared workspace 基礎完成；B2 conflict/version history 未完成 | | Preferences / i18n | ✅ | English／繁中、語言偏好持久化、Help Guide | | Theme / Night Adapt | ✅ 基線 | Page night adaptation 已持久化；主題系統可後續擴充 | | Template System | ⏳ | 已確認為正式工具，尚無最小規格 |


---


~~~~

### F-STUDY／F-QUICKNOTE／F-TODO／F-CREATIVE（舊）（舊 01 第 163–169 行）

~~~~markdown
### F-STUDY — Study Set / Flashcard

- **狀態**：🟡 已有卡片管理、Practice、CSV/TSV、四選一基線。
- **資料方向**：Deck = Page；Card = StudyItem；目前 mastery 為 `new / learning / mastered` 簡化模型。
- **未完成**：Review Queue、review state、progress tracking、雙向拼寫／容錯／提示。
- **限制**：不在早期直接導入完整 SRS；須先定義資料與複習規則。

~~~~

### （續）（舊 01 第 179–199 行）

~~~~markdown
### F-QUICKNOTE — Quick Notes

- **狀態**：🟡 Google Keep-like 快速輸入、色彩卡片、刪除基線已存在。
- **資料方向**：**已廢棄獨立 store（H3 方案A 2026-08-23）**。quick_note 統一為 pages store 的 kind。IndexedDBAdapter 移除 quick_notes store 建立、migration、6 方法。StorageAdapter 移除 QuickNote 介面與方法。
- **未完成規格**：Search、Backup、Sync 的完整 coverage 需核對（但因統一 pages store，已天然涵蓋）。

### F-TODO — Todo

- **狀態**：🟡 日曆優先 UI、快速新增、完成狀態與總覽基線已存在。
- **資料方向**：**已廢棄獨立 store（H3 方案A 2026-08-23）**。todo 統一為 pages store 的 kind。IndexedDBAdapter 移除 todos store、migration、6 方法。StorageAdapter 移除 TodoItem 介面與方法。
- **未完成**：由 Note tasks、Projects、Review 等來源產生的 Task projection、Calendar、Board。

### F-CREATIVE — Creative（新增 2026-08-23）

- **狀態**：🟡 入口頁與兩種範本已建立。
- **目的**：創作工具的入口，初步包含小說閱讀格式、角色詳細簡介表，未來可擴展。
- **資料方向**：Page shell + `kind: "creative"`。CreativeView 為入口頁，提供範本建立。
- **目前範本**：📖 小說閱讀格式（flow，標題+起始段落）、🎭 角色詳細簡介表（姓名/年齡/性格/背景/外觀/能力欄位）。
- **限制**：範本為初始版本，後續可根據使用者需求擴展格式。
- **PageKind**：`types.ts` 新增 `"creative"`；`creatableRegistry.ts` 新增 creative 定義（isProject: false）。

~~~~

### F-NAVIGATION／F-PREFERENCES（舊）（舊 01 第 213–232 行）

~~~~markdown
### F-NAVIGATION — Home、Sidebar、File Menu、Dual Pane

- Home 是預設入口；Nexus logo 可回 Home。
- Sidebar 支援 folders、favorites、sort、type grouping、drag/drop、同類子頁、rename、bulk select。
- 子頁規則：同類型可成子頁；Presentation 不可成子頁；深度限制依現行 Sidebar 規則。
- File Menu 在工具列最左，承擔新建、匯入、格式、轉簡報、頁面管理、匯出／列印。
- Ctrl+點擊可開啟右側 Dual Pane；可 swap／close secondary pane。
- 新建入口與子頁入口的目前 UX 以 00／實際 source 為準；01 記錄語意，不重複任務排程。

### F-PREFERENCES — i18n、Settings、Theme

- English／繁體中文；偏好保存在 settings store。
- 所有可見 UI 字串、alert／confirm、tooltip 應納入 i18n。
- Night adaptation 可持久化；一般主題系統可後續擴充。
- 帳號目前是 local-first placeholder，不代表登入或雲端備份保證。


---


~~~~

### §5.2 Kind 與 mode-specific data（舊）（舊 01 第 251–254 行）

~~~~markdown
### 5.2 Kind 與 mode-specific data

| 類型 | 真相位置 | 說明 | | --- | --- | --- | | Note | Page + `content_json` | rich editor 主體 | | Document | Page + `content_json` | plain editor／Markdown workflow | | PDF Research Note | Note Page + Attachment | 不是獨立 pdf_research kind 的既定語意 | | Study Set | Page + `study_items` | Deck = Page，Card = StudyItem | | Presentation | Page + `presentation_data` | Slide／Block 資料不應塞進一般正文邏輯 | | Quick Note | `quick_notes` store | 現行獨立 store；需核對與 PageKind 的歷史相容策略 | | Todo | `todos` store | 現行獨立 store；未來 Task projection 不應複製真相 |

~~~~

### §5.4 Coverage（舊）（舊 01 第 263–270 行）

~~~~markdown
### 5.4 IndexedDB、Backup 與 Sync coverage

| Record 類別 | Local store | Backup v0 | Sync base | 現行規格狀態 | | --- | --- | --- | --- | --- | | Pages / attachments / binaries / settings | 已有基線 | 已有基線 | 已有基線 | 🟡 需核對現行 source／schema | | Presentation data | Page mode-specific data | 應隨 Page 保留 | 文件稱已同步 | ⚠️ Q-0 需驗證 | | Study items | Page mode-specific data | 應隨 Page 保留 | 應隨 Page 保留 | ⚠️ Q-0 需驗證 | | Quick Notes / Todos | 獨立 stores | 未在早期 backup spec 完整列出 | 未在早期 Supabase schema 完整列出 | ⚠️ MVP-4 必須補 coverage contract | | Language / night preference | settings | 依 backup settings 策略 | 原則上可區分 local preference 與 shared data | ⚠️ 需明確化 |


---


~~~~

### §6.3 行動裝置 UI 標準（舊）（舊 01 第 286–295 行）

~~~~markdown
### 6.3 行動裝置 UI 標準 ▶️

- **使用者要求**：mobile UI standard 是未來任務，不應在現階段要求以行動裝置優先重構 Web UI。
- **對應任務**：`M9-0` Mobile UI standards discovery；先做 responsive／touch／small viewport discovery，再決定 Capacitor implementation。
- **尚未定義**：行動裝置 sidebar、dual pane、table editing、presentation canvas、offline editing、手勢、鍵盤與 PDF workspace 規則。


---


~~~~

### §8.2 Shared Workspace Sync（舊）（舊 01 第 312–317 行）

~~~~markdown
### 8.2 Shared Workspace Sync

- B1 已確認：無登入、共享 workspace、RLS allow all。
- 基礎行為：full sync、Realtime、push/pull、offline 後再同步。
- B2 未完成：last-write-wins **不可作正式行為**。

~~~~

### §11 決策索引、§12 需求缺口（舊）（舊 01 第 362–379 行）

~~~~markdown
## 11. 決策索引與舊 Canon 對照

| 決策群組 | 主要內容 | 本版對應章節 | 詳細原文 | | --- | --- | --- | --- | | D-01～D-38 | 核心定位、Page/Block、Storage、JSON、soft delete | §1、§2、§5、§8 | 02「01 Legacy Canon Transfer」中的原 01 §13 | | D-39～D-69 | MVP-1、PDF、Trash、Markdown、Toolbar | §4、§7、§8 | 02「01 Legacy Canon Transfer」中的原 01 §13 | | D-70～D-106 | vNext taxonomy、kind/view、backup、block ID | §3、§5、§10 | 02「01 Legacy Canon Transfer」中的原 01 §14～15 | | D-107～D-146 | Editor blocks、Backup、Study、Dashboard、i18n、Document | §3～§9 | 02「01 Legacy Canon Transfer」中的原 01 §8、§15 | | D-147～D-156 | Sync、Sidebar、format、color、study quiz | §4、§6、§8 | 02「01 Legacy Canon Transfer」中的原 01 §15.16 | | D-157～D-185 | PageFormat、Presentation、Quick Notes/Todo、table、Portal、pagination | §3～§8 | 02「01 Legacy Canon Transfer」中的原 01 §15.17～15.18 |


---


## 12. 已知需求缺口與未來功能清單

> 以下不是自行新增需求；它們是目前已有方向、使用者新確認的要求，或文件中尚未形成完整 contract 的能力。

| 功能 | 狀態 | 現行要求／缺口 | 建議容器 | | --- | --- | --- | --- | | Image Insert | ▶️ | 圖片作為 editor insert；需定 editor scope、Asset storage、尺寸、alt text、backup/sync | `M3-8` | | GoodNotes-like PDF Workspace | ▶️ | PDF 以匯入文件形式使用；不自行假設手寫／annotation 細節 | `M6-5` / `M6-6` | | Citation Metadata | 🟡 | MVP-2 必要結案項；需正式 schema/UI | MVP-2 | | Stable Block ID | ▶️ | C3；未來 block reference／annotation／Canvas 前置 | MVP-5 | | Annotation / Highlight | ⏳ | 需 anchor model；不屬 MVP-2 主完成條件 | MVP-6 | | Asset / Image Library | ⏳ | 需 asset metadata、reference、view 規格 | MVP-6 | | Template System | ⏳ | 已確認正式工具，但無最小 template schema／UI | 待分類 | | Graph | ⏳ | 已列 System View，但無最小資料與互動規格 | 待分類 | | Universal Search | 🟡 | 現有 Search v0；多 record 搜尋範圍未定 | MVP-6／7 | | Review Queue / Calendar / Board | ⏳ | 已有 Todo／Study 基線，但沒有完整 projection contract | MVP-7 | | Share / Publish | ⏳ | Website 邊界已定；分享隱私與 publish data model 未定 | MVP-8 | | Mobile UI Standard | ▶️ | 使用者確認為未來任務；先做 responsive/touch discovery | `M9-0` | | Audio / Video | 🚫 | 暫時不考慮添加 | 不排程 |


---


~~~~

### §14.4 帳號、雲端同步與安全邊界（舊）（舊 01 第 412–419 行）

~~~~markdown
### 14.4 帳號、雲端同步與安全邊界

- 支援 Email/密碼與 Google OAuth。帳號入口固定在畫面右上角：未登入顯示帳號圖示，登入後顯示 Email 首字母。
- 未登入：可使用本機 IndexedDB，但不得讀寫雲端資料。
- 雲端：`pages`、`attachments`、`binaries` 均需有 `owner_id`，以 Supabase RLS 的 `owner_id = auth.uid()` 管理讀寫。
- Google OAuth 的 Supabase callback 為 `https://ekwljqtenrmrijlmscnv.supabase.co/auth/v1/callback`；實際應用網址必須列入 Supabase Redirect URLs。
- **限制：** IndexedDB 尚非 account-scoped；同一瀏覽器的帳號切換隔離尚未完成，必須完成後才可主張完整帳號資料隔離。

~~~~


---

## 2026-09-28 — 後續對話增量補記：字卡收尾、目錄重構與製譜規劃

> 本條為**後續對話／Codex 回報的增量紀錄**，非重新讀取 2026-09-28 即時 Git 或正式資料庫的驗證。若與較早日誌矛盾，現行決策以 01 §16、最新任務以 00 §13 為準；保留舊紀錄供追溯。

### 已確認開發與驗證回報
- 純目錄重構分四階段，搬移 16 個檔案；Codex 回報 59/59 測試及 TypeScript 通過，lint 0 error、54 個既有 warning。Git commit `69e167d90aa96c69e4fb43d0f2a6e7f8df0003ea`。重構後模組路徑見 00 §13。
- 正式複習從「僅 Easy 出箱」改為「Good／Easy 均出箱」；Again／Hard 留在 session；首次評分才寫正式 FSRS。Codex 回報 63/63 測試、TypeScript 通過、lint 0 error（仍有既有 warning）。未修改 schema、Quiz、部署。使用者表示會自行 `git add -A` commit，但結果與 hash 未確認。
- 每日學習與正式複習區分：每日學習新字只以 Easy 完成，產生 introduce 管理事件，**不產生偽造正式評分或 due**。正式複習固定 session，New→Due→Not-due 選卡；第一評分正式、後續僅 session。
- Quiz 已規劃／據 Codex 回報實作雙向、預設中→英、加權抽題、持久化錯題分數、離線上傳決策；正式 `20260925_study_quiz_persistence.sql` 是否已套用仍待確認。
- 使用者確認 `20260922_study_fsrs.sql` 已套用正式 Supabase；尚未在本次文件編輯中獨立查證。

### 待回報與新規劃
- 使用者已交辦字卡列表只留英文／中文、固定 A–Z、單行省略號、點列開既有完整編輯器；**尚未收到 Codex 最終實作與驗證回報**。未來字根式詳細筆記獨立規劃，不在這次 UI 任務新增欄位。
- 使用者決定新增與字卡、小說同級的「製譜」功能，五線譜、簡譜、吉他譜各自獨立，不要求互轉。快速簡譜採預設渲染預覽，右上角進入原始碼編輯；討論 `_6`、`#5`、`6•` 等快速語法，延伸的完整語法仍為草案。開發順序：字卡收尾 → 製譜作品管理 → 快速簡譜。音階交換格式待後續需求再設計。

### 未解決
- 最新 Git 工作區、第二筆 commit、字卡 UI 任務結果、實機／雙裝置測試及其他遠端 migration 狀態仍須核對；不可將討論規格寫成已部署功能。

---

## 2026-09-28 — 字源百科本機匯入回報、CEEC 資料整理暫停與公共字典管理需求確認

> **紀錄性補記**：依本次與使用者的對話及使用者貼出的 Codex 驗收報告摘要更新；本輪**沒有**讀取即時 Git worktree、查詢正式 Supabase、執行 migration、測試 UI 或部署。當前有效契約見 `01` §17、任務狀態見 `00` §14。避免把計畫寫成完工成果。

### 背景及迄今成果（證據來源區分）

1. 使用者持續開發 Nexus 字源百科，先前已有字首／字根／衍生單字 Markdown 資料包及獨立 owner-scoped etymology migration。Codex 最新回報完成 parser 與 PGlite 本機交易式、冪等匯入：150 份來源、721 筆本機寫入、重複匯入 150 份跳過／0 新增、83／83 測試通過。這是**開發者自述與報告**，正式 Supabase 未操作，既有八表仍是 owner-scoped；字源核對提醒不等於匯入錯誤。
2. 使用者提出約 7,000 字詞庫方向，以 CEEC 111 學年度起適用六級高中詞表為核心；自備文字詞表曾經初步解析回報 6,012 原始項，挑出 170 特殊項，產出第一輪審核候選 362 形式，其中 43 項尚需語義／詞性／來源審核。**未完成最終 7,000 字詞庫，未逐頁獨立校對官方 PDF，也未取得所有中文釋義。**
3. 使用者明確要求停止字彙整理；目前優先確立公共字典資料庫與可用的管理者介面，不能再沿舊工作流自動處理剩餘 43 筆。

### 新增需求與方案決策

- 在既有字源架構上新增**公共字典層**，既有八張 `owner_id` 資料表及個人學習資料原封保留；分期實作公共庫、管理者 CRUD／匯入、使用者總覽及字卡底部面板。
- 管理者已使用 **Google OAuth** 登入 Nexus，帳號 `changling971216@gmail.com`；使用者詢問是否需要另建管理帳號。方案確認**不需要**，但管理權限必須綁定原 Supabase `auth.users.id`，而非僅 email。該 UUID 尚未提供或授權；未動既有 OAuth。
- 管理員能新增、修改、匯入、審核發布單字、字首及字根；CSV 與 Markdown 分別適用批次詞彙及完整字源稿，提交前預覽驗證，交易／冪等／衝突保護。普通使用者只讀已發布公共內容。
- 全體登入用戶（包含管理員）在**字卡首頁頂部**取得字典總覽與三類搜尋入口；Daily／Review **翻面後**在畫面底部出現可展開單字詳情，不遮擋評分，不產生任何 FSRS／Quiz 寫入。
- 暫緩 Quizlet 式新增字卡英中自動選字、CEEC 逐項校對及延伸詞編纂；相關資料保留，非取消永久需求。
- 使用者特別說明需節省 **Work 與 Codex** 兩種額度；一般 ChatGPT 負責規劃／整理／分析，使用者本機操作，Codex 只在真正需要改碼時使用；未經指示不啟用 Work。

### 待辦與風險

- 本輪只更新交接文件，**沒有**建立公共表、後台、角色授權或任何 UI；不得視為功能已上線。
- 真正開發前須核對最新 repo、舊 `etymology_*` 實際遷移與資料、`Q-0` schema、`Q-9` 遠端 migration ledger、FSRS／Quiz 現有測試。採新表分層及安全資料轉移，不能開放舊 owner 表成全站共享或直接拿 email 判斷管理員。
- 在非正式環境做雙帳號 RLS、CSV／Markdown 衝突／重匯／回滾、7,000 規模搜尋、字卡翻面及不改評分的回歸測試；正式遷移、初始化管理員、部署分階段請使用者確認。
- 製譜及舊字卡 UI 收尾仍保留原需求；**新的當前優先順序以 `00` §14 為準**。

---

## 2026-09-28 — Git Windows 保留檔名修復、VS Code 儲存衝突、FSRS 測試與 UI 補充（增量記錄）

> 證據來自使用者提供的 PowerShell stdout、VS Code 截圖與匯入報告；本次沒有直接執行使用者本機 repo 命令、取得新的遠端 Supabase 資訊、部署或實機操作。依 00 §15 與 01 §18 判斷最新狀態與契約。

### 事件一：Git `con.md` 無法加入索引

1. `git add -A` 和單獨 `git add -- data/etymology/batch-08/prefixes/con.md` 都回報 `No such file or directory`；PowerShell `Test-Path` 回 false，但目錄列表可見檔案；Node.js 使用一般 Windows 路徑及擴充路徑**都可讀取 1,661 bytes**。不能簡化成「Windows 完全無法讀該檔」。
2. 因 `con` 為 Windows 保留裝置名稱，採取保守兼容解決：Node.js 將 `con.md` 改名 `con-prefix.md`，重新命名後 SHA-256 相同；僅更新 INDEX.md 的舊 Markdown 連結。
3. 搜尋顯示另外三份既有 JSON 報告各兩處舊路徑，作為歷史快照保留；以新路徑重新輸出 `batch-08-dry-run-renamed.json`。使用者上傳的結果顯示 150 來源、721 would_insert、0 inserted、無 errors；審核提醒 `SOURCE_AUDIT` 與 `NO_STABLE_SENSES` 不是本次致命錯誤。
4. 再執行 `git add -A` 時只見大量 LF→CRLF 換行提示，無 fatal；已列出 182 個暫存檔案，包含字源、帳號刪除及字卡功能。不將單純 CRLF 警告當成失敗；提交前仍須確認被納入的檔案與敏感內容。主批次 commit hash 未獲使用者回報，亦無 push 證據。

### 事件二：VS Code 儲存衝突與殘留檔案

1. 使用者開啟的 `studyFSRS.ts`、`studySessions.ts`、`studySessions.test.cjs` 初時都有未儲存圓點。`studySessions.test.cjs` 出現「硬碟檔案較新」儲存衝突；Compare 截圖顯示磁碟版新增多項測試，編輯器版內容較舊且依賴 `../src/lib/` 路徑。
2. 為避免不可逆覆蓋，使用者將編輯器版存為專案外 `studySessions-backup.txt.txt`，對測試檔執行 Revert；另外兩個檔案之未儲存圓點也消失。使用者重新開 PowerShell，驗證 `git status` 顯示原先已暫存大批檔案，後來 `git status --short` 則只剩 `?? src/lib/studyFSRS.ts`、`?? src/lib/studySessions.ts`。
3. 使用者隨後 commit 這兩檔成功：`fe54098`，2 files changed／206 insertions，主旨「新增學習排程相關檔案」；尚未取得後續新 `git status`、兩側檔案內容或是否 push 的證據。
4. **新風險**：00 §13.2 所列重構後正規路徑為 `src/features/study/`，新提交又新增 `src/lib/` 同名兩檔。可能是兼容模組或重複來源，不能猜測，待實際比較 imports 與內容並經使用者決策後處理。備份雖曾有回覆建議刪除，尚未提供可重現的完整新版/舊版檔案逐行差異報告，保守保留備份。

### 事件三：使用者執行學習測試

- `node --test tests/studySessions.test.cjs`：**21 tests, 21 pass, 0 fail, 0 skipped, 約 454 ms**。已列印涵蓋 daily 固定批次／Daily Easy introduce 不寫正式 FSRS、正式 Review 第一次評分、Good/Easy 完成、因故 rollback、備份與 cloud session 等情境。這是單檔本機測試通過，不能外推整套工程、部署或跨裝置驗收。
- 舊備份中含更早版測試及過時路徑，不直接將其覆寫現行測試；若需要刪除備份的明確保證，應依真實兩檔逐條比較後再決定。

### 事件四：UI 新需求

- 使用者提供截圖：`正在儲存作答…` 當時在單字卡上方。使用者明確要求移至**四個評分按鈕下方、作答介面底部**，儲存中才顯示、成功隱藏、失敗同區提示；只限 UI，不能更改 FSRS/Session 事件語義。未修改程式。
- 與已規劃「翻面後底部展開字典詳情」的最終順序未確認（提示置評分下直接接字典，或字典底部之後），列為使用者決策題。

### 此次文件編輯／後續

- 本輪僅更新三份交接 Markdown，保留舊歷史、不替換使用者本機 repo、不處理正式 Supabase、不動 JS/TS、無部署。
- 優先向使用者報告兩項設計／風險決策：**雙路徑學習模組是否列為下次檢查工作**；**儲存提示與字典底部面板順序**。另請使用者在方便時提供最新 Git 狀態、主批次 commit hash、migration 確認（這些是事實核對，不是未經允許的更動）。

---

## 2026-09-28 — 雙路徑學習模組盤點、清理及指定測試／build 驗證（最新增量）

> 本條為使用者本機 PowerShell 輸出與本輪對話補記，舊日誌的疑問及過程仍保留。正式規格見 `01` §19、當前任務狀態見 `00` §16。本次文件更新沒有直接操作使用者 repo、遠端 Supabase 或部署。

### 決策與實查經過

1. 使用者選擇「現在優先檢查學習模組」；並明確選定底部 UI **B 方案**：評分按鈕 → 字典詳情 → 整個作答畫面最下方儲存提示。
2. 檔案盤點證實兩套：正式 `src/features/study/` 有 `studyFSRS.ts`、`studySessions.ts`、`StudyRepository.ts`；`src/lib/` 另有前兩個同名檔案。SHA-256：`features/study/studyFSRS.ts` = `53CF06745A3866880A748E3A2828A725D2C9E7A98CB93A3C274219B16E402546`；`lib/studyFSRS.ts` = `28E654225A4C3355054B56E2DEA2FB384B8EA0E9537E652A09C48FB134F83FF8`；`features/study/studySessions.ts` = `4EF6B1F08CA4015CDE9BCA4F33F071DE0E54E1CC52F6EDE14CF4E2D0230084C5`；`lib/studySessions.ts` = `A6C876222583774FFCFCC3544EAA0BC632B90CEC4BB44AA42344700D04BDD2F1`；可確認兩組內容不同。
3. 首次 `git grep -n -E 'studyFSRS|studySessions'` 僅命中歷史快照 `nexus-codebase-current.md`，不足以確認目前真實 imports。改用 `Get-ChildItem src,tests -Recurse -File | Select-String` 後確認：`StudyRepository`、Daily UI、StudySetView、`IndexedDBAdapter`、Quiz 與學習測試引用 `features/study`；`lib` 的同名兩檔只見互相引用。
4. 使用者上傳四檔壓縮包進行差異比較；前次比對回報正式版包含較新的 session 首次評分與歷史復原等邏輯，重複版不應反向覆蓋。建議僅刪除兩個確定未被正式 app／tests 使用的 `src/lib` 舊檔，保留 `features/study`。這項建議後來由使用者實際執行驗證。

### 使用者清理及驗證結果

- `git rm src/lib/studyFSRS.ts src/lib/studySessions.ts`：PowerShell 顯示兩檔 `rm` 完成，已作為刪除暫存。
- `node --test tests/studySessions.test.cjs`：**21 tests / 21 pass / 0 fail / 0 skipped**。回報包含 Daily Good、持久 session、Daily Easy introduce 不產生 FSRS、正式首次評分、到期複習、資料回滾、雲端資料一致性等情境。
- `node --test tests/studyFSRS.test.cjs`：**4 tests / 4 pass / 0 fail / 0 skipped**。回報包含 legacy exposure、FSRS 10m 設定、遷移不捏造 review，以及學習額度／排序。
- `npm.cmd run build`：Next.js **16.2.9**（Turbopack）完成 production 編譯、TypeScript、page data、靜態頁生成與最佳化；顯示 `/`、`/_not-found` 與 `/etymology/[[...path]]` 路由。這只證明本機 build，未推論正式部署。
- **未收到**清理後執行 `git commit -m "清理重複學習模組"` 的成功終端機回報／hash，也尚未收到新的最終 `git status --short` 或 push 證據。刪除已執行，不能寫成「刪除提交已完成」。

### 介面需求與後續

- 底部儲存提示**B 方案**已獲使用者明確確認；目前列為未來 UI 實作要求，並非本輪已修改程式。
- 單一路徑 cleanup 的指定測試與 build 已通過；接續應先確認該次刪除 Git commit／狀態，再依 00 §14 繼續公共字典分期設計。不能將 25/25 指定測試視為整個產品或真實雙裝置驗收。


---

## 2026-09-28 — 三份交接文件主章節一致性整合（本次增量）

**背景**：使用者詢問 `01` 是否涵蓋所有產品／任務規格、`00` 是否列出下一步，並要求正式整合。舊版 `00` §0 仍保留早期「字卡 UI → 製譜」順序，最新公共字典規劃只出現在後段；`00` §10 的 `M7-8` 仍寫「字典未決」；`01` §3、§4、§12 也有類似過時描述，容易讓下一個 AI 只讀主章節就誤判。歷史資訊不刪除，以主章節的最新狀態和交叉引用解決。

**本次文件操作（只有文件，未修改 Nexus repo）**：
1. 將 `00` §0 改為一眼可見的最新狀態與下一步依賴順序：先查清理後 Git 狀態，再唯讀執行 `Q-0`／`Q-9` schema／migration 盤點，接續四期公共字典；字卡 UI 收尾、製譜、同步與實機 QA 原需求不取消。
2. `00` §10 正式保留 `M7-8` 作字典／近義詞總容器，拆公共字典為 `M7-9`（獨立 schema／RLS／管理員權限）、`M7-10`（管理端 CRUD／匯入／審核）、`M7-11`（字典搜尋／總覽）、`M7-12`（Daily／Review 翻面底部面板＋B 排列）。新增前置與驗收；保留近義詞練習尚待細化的邊界。
3. `01` 主功能矩陣、F-STUDY 未決狀態、§12 缺口與 §18 待決記載同步指向已確認 §17／§19 的公共字典與 B 排列，另設 §20 功能／任務對照；並非宣稱所有遠期功能已有直接編碼契約。
4. 保留現有 `etymology_*` owner-scoped 資料及 PGlite Batch-08 與**擬新增的全站公共字典**之區別：不直接開放舊 RLS、不預設正式環境已套 migration、不偽造管理員 Auth UUID。CEEC 7,000 字資料整理、特殊詞審核仍暫停。
5. 清理證據僅限使用者回報：`git rm` 已刪兩個 `src/lib` 同名舊檔；正式路徑 `src/features/study`；`studySessions` 21/21、`studyFSRS` 4/4、本機 Next.js build（含 TypeScript）成功。清理後 Git commit／push、完整測試、跨裝置驗收**尚未回報**。這些不是文件編輯者另行重跑的命令。

**仍需使用者或現行 repo 決定／查證**：實際遠端 Supabase migration 與 `pages.kind` 約束；現行 schema／現存資料轉移方案和管理員 Auth UUID；未定的字典索引／sense 實體最終欄位、近義詞群組練習契約；其他僅有 discovery 層級的遠期功能；本次清理 commit 狀態。新增 Task ID 是本輪交接規劃編號，不等於獲准程式開工。


### 附存：整合前 00 §0 原始近期排程（歷史，非現行）

> 以下為前版原文，保留原有工作包與當時不完整狀態供追溯；目前任務順序與正式 ID 以新版 `00` §0／§10 為準。

### 正在進行

```
最新已交辦字卡兩欄 A–Z UI 改版；**Codex 最終結果未收到，不能標示完成**。先核對 Git 工作區與實際測試結果。

最後一段工作（對話 09-21 上午 12:13 的回報）：
- 講義排版（統一樣式、教學區塊、自動目錄／題號、頁首頁尾、A4 整理與復原）完成
- 偏好第一層改為「主題、語言、設定、備份」，主題／語言為右側浮動子面板
- 詳細設定對話框（一般、功能排序、使用建議、使用說明、備份）完成
- 右上角帳號入口移除，保留側欄帳號入口
- 該次回報：14 項測試、介面驗證、TypeScript、ESLint、正式建置通過；尚未部署

09-22～09-25：舊版程式碼快照含 FSRS 與測驗持久化；**後續已補充實際使用者決策與 Codex 回報，請優先閱讀 §13 增量交接**。

下一步按使用者已指定方向：先確認字卡 UI 任務結果、完成字卡收尾；再規劃與字卡／小說同級的製譜功能。未獲使用者指示不得自動改程式。
```

### 將要進行：建議的第一批候選工作包【修改】

| 優先 | Task ID | 工作包 | 狀態 | 量 | 說明 |
| --- | --- | --- | --- | --- | --- |
| 0 | `Q-9` | 遠端 migration ledger 與 `kind` 約束核對 | ▶️ | S | 【新增】確認 §12 五個 migration 的遠端狀態，並查 `pages.kind` 約束；任何部署前必做 |
| 1 | `Q-0` | 現行 schema reconciliation | ▶️ | M | 範圍擴大：現有 PageKind 共 11 種、IndexedDB v6、`study_*`／`quiz_*` stores、`content_json` 內嵌資料（lessonLayout、web／counter／draw） |
| 2 | `Q-7` | 大量資料效能／壓力測試 | ▶️ | M | 【新增】回應使用者「會不會炸掉」的憂慮；已知風險：整批載入全部 pages、分頁筆記 N 頁 = N 個 Tiptap 實例 |
| 3 | `Q-8` | 真實裝置驗收矩陣（iOS Safari／Android／iPad） | ▶️ | M | 【新增】收攏所有「待實機驗收」項目（見 §9.2） |
| 4 | `M4-7`／`M4-8` | 帳號本機隔離／Auth 回歸的雙帳號雙裝置實測 | 🟡 | M | 程式已做，缺實機驗收 |
| 5 | `M10-4` | 多分類日曆 discovery | ⚠️ | L | 【新增】使用者需求明確但資料模型未定 |
| 6 | `M8-0` | 唯讀分享連結 discovery | ⚠️ | M～L | 使用者新需求（見 §11） |
| 7 | `M3-2`／`M3-3` | 簡報吸附線／群組鎖定 | ▶️ | L | 沿用舊候選，優先度由使用者決定 |




---

## 2026-09-28 文件治理｜主文件去重與集中決策進度（僅記錄歷史）

- **要求與目的**：使用者批准六項文件架構改善：合併重複現行規格、統一決策登記、功能↔任務對照、分清驗證層級、舊最新補記歸歷史及 00 單一入口。**本輪只修改文件，沒有修改專案源碼、正式資料庫或部署。**
- **實施**：00 建立 `START HERE` 及唯一 §0 近期任務入口；保留 §10 Task ID、§12 遠端待核對 ledger，將原 §13～§16 全文移到本檔。01 §1～§12 是唯一現行功能契約，在 §4 集中補 F-DICTIONARY／F-SCORE 及 F-STUDY 最新 UI，在 §11 建立 A1～C9 完整決策狀態；原 §14～§20 全文移到本檔，過期細節未刪。
- **本輪使用者明確回覆**：A1 唯讀分享另設、A2 區分草稿與發布、B2 詳情內容末端捲動、C2 原階段順序正確、C4 大組由小組派生、C8 暫不處理；A3 不理解待白話解釋、A4 稍後、C3／C6 再議。其餘未回覆議題維持待討論。C4 不憑一句回覆自行設計聚合資料庫；A2 不自行增加多審核者角色。
- **保留的證據界線**：學習重複檔清理後 `studySessions` 21/21、`studyFSRS` 4/4、Next.js build 成功是使用者本機回報；最新清理 commit 尚未回報。遠端 Supabase migration ledger 有歷史矛盾，尚未用 SQL 實測解決。
- **未變更範圍**：全部原始功能需求、所有未決方案和歷史保留，無自行削減。文件中的舊狀態皆不得覆蓋新版 00／01。


---

## 2026-09-28 來源增量存檔｜原 00 §13～§16（保持原文；非現行指令）

> 這些舊段落於結構整理時自 00 搬出，以消除多個競爭的「最新」入口。當前狀態只看 00 START HERE／§0。

## 13. 2026-09-28 後續對話增量交接【新增；若與前述舊快照衝突，以本節的已確認新決策為準】

### 13.1 證據與狀態
- 本節來自使用者後續對話、Codex 回報及已確認決策；**未重新讀取 2026-09-28 當前 Git 工作區或查詢遠端資料庫**。
- 2026-09-25 `nexus-codebase-current.md` 為**歷史快照**，不是重構後即時 source；實際最新程式仍須在開工前檢查。
- 已完成四階段純目錄重構，Codex 回報搬移 16 檔、59/59 測試通過，commit `69e167d90aa96c69e4fb43d0f2a6e7f8df0003ea`（`refactor: organize study and infrastructure modules`）。
- 後續 Good／Easy 規則改動，Codex 回報 63/63 測試通過、TypeScript 通過、lint 無 error；使用者表示將自行 `git add -A` 並 commit，**第二筆 commit 是否完成與 hash 尚未確認**。

### 13.2 新目錄權威（取代 §4 中已搬移模組的舊路徑）
- `src/features/study/`：`studyFSRS.ts`、`studyPractice.ts`、`studySessions.ts`、`StudyRepository.ts`、`studySync.ts`。
- `src/features/study/components/`：`StudySetView.tsx`、`DailyStudySession.tsx`。
- `src/features/study/quiz/`：`quizQuestions.ts`、`quizPersistence.ts`、`quizSync.ts`、`QuizSession.tsx`、`QuizOfflinePrompt.tsx`。
- `src/infrastructure/storage/`：`StorageAdapter.ts`、`IndexedDBAdapter.ts`；`src/infrastructure/sync/syncEngine.ts`；`src/infrastructure/supabase/client.ts`。
- 其他舊路徑未在本次重構中證實變更者仍以最新 source 為準；不應自行猜測。

### 13.3 近期執行順序（使用者指定）
1. 核對已交辦的字卡列表改版 Codex 結果：僅英文／中文兩欄、固定 A–Z、單行省略號、點整列開既有完整編輯器；不新增資料欄位，不改 FSRS／Quiz／schema。**目前結果待回報**。
2. 字卡收尾與驗收；詳細字根筆記編輯器為後續獨立規劃，不能混入當前兩欄 UI 工作。
3. 新增「製譜」獨立功能，與字卡、小說同級；作品管理 → 快速簡譜 → 其他獨立譜種。規格見 01 F-SCORE。
4. Undo、跨裝置驗收、Q 工作線等既有任務保留，不因新優先順序而取消。

### 13.4 資料庫狀態更正
- `20260922_study_fsrs.sql`：使用者確認已在正式 Supabase 套用；仍須在需要時實際核對 schema。
- `20260925_study_quiz_persistence.sql`：尚未確認套用，不得聲稱已部署。
- `20260916_novel_chapters.sql` 與 `pages.kind` 約束：狀態仍待核對。

### 13.5 新增任務佔位（待確認正式 Task ID）
- 字卡列表改版／字根筆記：沿用 MVP-7，避免未核對現有任務目錄就重用舊 ID。
- F-SCORE 製譜：新增獨立產品功能，Task ID／MVP 容器需由使用者確認後正式編號；**已決策但尚未實作**。

---

## 14. 2026-09-28 最新增量：字典管理系統成為目前優先規劃（新對話先讀）

> **本節取代 §13.3 當中「字卡收尾後立即進入製譜」的近期工作順序，但不取消字卡收尾、製譜或其他原有任務。** 本節為使用者新確認的規劃，不表示已修改即時 repo、執行 migration 或部署。

### 14.1 目前任務與決策

- **立即停止** CEEC 約 7,000 字資料整理、170／43 筆特殊詞條逐項審核及延伸詞彙編纂。既有成果保留，未完成的審核不能當作正式已核准資料。
- **目前工作**：規劃全站共用的 Nexus 字典資料庫、管理員編輯／批次匯入介面、字典總覽及學習字卡翻面後的底部詳情面板。完整契約見 `01` §17。
- **管理員**：現有 Google 登入帳號 `changling971216@gmail.com`；不建立第二帳號、不更改 OAuth 流程。必須以該帳號在 **Supabase Auth 的現有 user UUID** 授權，不能僅以 email 或前端判定。該 UUID **目前尚未取得，也未執行任何授權設定**。
- **額度限制**：一般 ChatGPT 完成規劃、資料分析、測試判讀、交接整理；使用者自己執行必要本機命令；只有實際需要修改專案程式碼時才考慮 Codex；**未經使用者明確要求，不使用 Work**。
- **目前僅規劃與交接**：不修改程式、不套用新 migration、不操作正式 Supabase、不部署。不因文件完成而宣稱系統已可在後台操作。

### 14.2 本工作流的四階段（規劃，均未開工）

| 次序 | 階段 | 範圍 | 開工前必做 |
| --- | --- | --- | --- |
| 1 | 共用字典庫、Auth／RLS | 將既有 owner-scoped 字源百科與新的全站共用已發布字典分層；建立角色權限及唯讀讀取 | `Q-0` 最新 schema reconciliation、`Q-9` migration ledger、現有 repo 實查 |
| 2 | 管理員編輯與匯入 | 管理單字／字首／字根；CSV 與 Markdown；預覽、驗證、草稿、發布、冪等／交易、修改紀錄 | 重用現有 Batch-08 parser 之前，先審核其真實輸入／資料模型 |
| 3 | 字典總覽／搜尋 | 所有已登入使用者於**字卡首頁頂部**進入字典；查詢三類已發布條目；僅管理員可見管理入口 | 驗證公共資料權限、查詢效能 |
| 4 | 字卡詳情面板 | 每日學習與正式複習**翻到背面後**，在畫面**正下方**顯示可展開面板；不影響評分／FSRS | 實查 `src/features/study/` 最新 UI 與 Session／FSRS 規則 |

現行正式任務：保留 `M7-8` 作字典／近義詞總容器；公共字典四階段依序列為 `M7-9`～`M7-12`（見已整合 §0 與 §10）。近義詞群組練習仍待詳細決策，不視為公共字典首輪範圍。

### 14.3 實作基線、已回報但尚待查證

- Codex 曾回報完成第八批百科 Markdown parser、PGlite 交易式／冪等本機匯入：150 份來源、721 筆資料列，重匯跳過 150，83／83 測試通過；這是**Codex 報告，不是本節對目前 Git 或正式資料庫的新驗證**。已有 `scripts/import-etymology.mjs`、`supabase/migrations/20260928_etymology_catalog.sql`、`NEXUS_ETYMOLOGY_IMPLEMENTATION_REPORT.md` 作過往參考。
- 該 migration 的 8 張百科表以 `(owner_id,id)` 隔離，對 authenticated 僅授權本人 SELECT；目前還**不是**全站公共字典，網頁編輯／發布／匯入介面亦未證實完成。
- CEEC 官方六級詞表目標作核心，延伸至約 7,000 字。先前使用者提供詞表文字，自動解析回報 6,012 原始詞條、170 特殊項、362 候選形式；特殊項首輪回報 127 筆結構已分類、剩餘 43 筆語義／詞性／來源仍待核實。這些**不是** 7,000 筆已完成可發布字典，也不代表已逐頁與官方 PDF 核對。
- 舊 `00` §11 及舊 `01` F-STUDY 所述「字典未定」是歷史狀態，**本次已完成需求決策但尚未程式實作**；目前以本節與 `01` §17 為準。

### 14.4 新對話立即操作

1. 閱讀 `00` §14、`01` §17、`02` 最後一則 2026-09-28 字典規劃日誌。
2. 不繼續 43 筆審核或擴充詞表，除非使用者明確恢復。
3. 如使用者只要求規劃，保持文件／說明層級。若日後要求實作，先索取**最新 repo** 和必要 migration ledger，不能依 2026-09-25 快照當作當前實碼。
4. Google 登入的管理員 UID 由使用者自行在 Supabase Dashboard → Authentication → Users 核對；**不要**在文件、migration 或回覆捏造 UID；由受信任的管理操作初次授權，禁止前端自行授權／自動授權同信箱。
5. 先本機／隔離環境測試 RLS、匯入與 FSRS 回歸；正式 migration、管理員授權、部署皆需使用者確認並分開回報。

---

## 15. 2026-09-28 本輪交接補記：Git 修復、學習測試與儲存提示（最新狀態）

> 本節依使用者貼出的 Windows PowerShell／VS Code 操作結果與本機測試輸出更新；沒有取得即時完整 Git repo、執行本機命令、登入 Supabase、執行 migration 或部署。遇到 §13～§14 的歷史「尚未 commit／未驗證」敘述，僅在本節明確有證據的範圍內更新；其他舊事實及任務完整保留。

### 15.1 已確認的工作進展與證據邊界

- Windows 上 `data/etymology/batch-08/prefixes/con.md` 導致 `git add` 無法索引；使用者以 Node.js 重新命名為 `con-prefix.md`，重新命名前後 SHA-256 相同、1,661 bytes，並修正 `batch-08/INDEX.md` 連結。不要在新工具或文件中還原 Windows 保留名稱 `con.md`。
- 改名後的字源 dry-run 報告顯示 `errors: []`、`sources: 150`、`would_import: 150`、`would_insert: 721`、`inserted: 0`；此結果**不是正式 Supabase 匯入**。舊三份 JSON 報告依然記錄 `prefixes/con.md`，為歷史快照，不應靜默改寫；新增 `batch-08-dry-run-renamed.json` 記錄新路徑。路徑可能參與匯入來源 ID，將來正式匯入前仍要核對重匯及已入庫來源資料的一致性。
- 使用者展示 `git add -A` 已不再 fatal，暫存統計為 **182 files changed, 14,434 insertions, 134 deletions**；內容包含字源、帳號刪除、字卡等跨主題檔案。使用者曾被引導 commit 主批次，但**尚未提供該筆主批次 commit 的成功輸出／hash**，不得假設已完成。未有遠端 push 證據。
- VS Code 出現 `studySessions.test.cjs` 「硬碟內容較新」儲存衝突。使用者先在專案外備份編輯器版本為 `studySessions-backup.txt.txt`，再還原測試檔以保留硬碟上的新版；其餘兩個檔案編輯器的未儲存圓點也消失。不要把「未儲存圓點消失」當成程式版本正確證據。
- 使用者執行 `node --test tests/studySessions.test.cjs`，**21 tests / 21 pass / 0 fail / 0 skipped**，是使用者提供的實機命令輸出；不代表 repo 全套測試、tsc、build 或 UI 全部通過。先前對舊測試備份與新檔「可刪備份」的答覆缺乏當前源檔逐行核對的可重現證據；保守起見備份可先保留於專案外。新測試名稱確認 Daily Easy introduce 不寫正式 FSRS、Review 首次評分、Good／Easy 出箱、持久 session、資料失敗回滾及備份/雲端同步情境均有測試覆蓋，**並非真人雙裝置驗收**。
- 使用者再次執行 `git status --short` 時只顯示 `?? src/lib/studyFSRS.ts`、`?? src/lib/studySessions.ts`；之後使用者回報 commit **`fe54098`**（`新增學習排程相關檔案`，2 files/206 insertions）成功。尚無之後新的 `git status --short`、其他 commit hash 或推送結果。

### 15.2 高優先度待核對：重構後的雙路徑

- §13.2 指定正式學習模組為 `src/features/study/studyFSRS.ts`、`src/features/study/studySessions.ts`；但新 commit `fe54098` 又建立 **`src/lib/` 同名兩檔**。兩者可能是未引用備份、兼容 shim 或意外重複實作，目前**不能依檔名推斷**。
- 在進一步開發、部署或合併相關程式之前，先檢查最新 repo 的 import 指向、兩份內容差異、測試 loader/legacy 依賴與 Git 追蹤狀態；提出保留、改為 re-export 或移除的最小方案，經使用者確認後由 Codex 修正。切勿直接刪除、改移程式，亦不可用一次單檔測試通過作為雙路徑安全證據。

### 15.3 新確認 UI 需求（待改碼、待驗收）

- 每日學習／正式複習中「正在儲存作答…」**不得出現在單字卡上方**，須移至評分按鈕下方、作答介面最下方；僅於真正等待儲存時顯示，成功後消失，失敗時同區顯示錯誤與適當重試方式。這是 UI 需求，尚無 Codex 實作／截圖驗證。
- 與 §14／01 §17 的「翻面後底部可展開字典詳情」同時存在時，**提示與底部詳情面板之精確順序及手機抽屜安全區**需確認；無論排列如何，不得覆蓋評分按鈕或變更 FSRS／Session 寫入語義。

### 15.4 本輪需使用者決定／核對

1. **雙路徑**：是否同意下一次程式審核優先查明 `src/lib/` 與 `src/features/study/` 同名模組的關係，再決定處理方式？在核對前不刪任何檔案。
2. **底部 UI**：字典詳情展開時，「正在儲存作答…」要固定在四個評分按鈕**緊下方**，而字典面板再接續其下；還是提示要處於字典面板之後、永遠作為整頁最末元素？需求文字目前同時有「按鈕下方」與「介面最下方」，兩種排列不可自行擇一。
3. **Git 與部署**：主批次 commit hash、最新 `git status --short` 與是否 push／部署仍未取得；遠端 Supabase migration 狀態仍依 §12 舊 ledger 列為待核對。

**執行順序**：目前仍以 §14 公共字典的規劃為優先；程式碼層的雙路徑、舊測試備份、底部 UI 是其相依驗收或獨立小工作，不因此自行轉為新開發主線。

---

## 16. 2026-09-28 最新補記：學習雙路徑已釐清並完成本機驗證（優先於 §15.2、§15.4 舊待辦）

> 資料來源為使用者提供的即時 Windows PowerShell 輸出，以及此前四檔比較紀錄。下述 `git rm`、測試與 build 是**使用者本機回報**，並非本次交接編輯者在使用者工作樹重新執行。歷史段落仍保留供追溯，但舊「雙路徑待確認」已被本節新證據取代。

### 16.1 已釐清及處理

- 使用者在 `src` 中核對發現：`src/features/study/` 含 `studyFSRS.ts`、`studySessions.ts`、`StudyRepository.ts`；`src/lib/` 另有 `studyFSRS.ts`、`studySessions.ts`。四檔雜湊比對顯示兩組同名檔案**內容不同**。
- 對現行 `src` 和 `tests` 的實際 import／require 搜尋顯示：正式 UI、`StudyRepository`、`IndexedDBAdapter`、Quiz 與學習相關測試均引用 **`src/features/study/`**。`src/lib/` 兩檔僅見彼此互相引用；原先 `git grep` 命中的其他路徑來自歷史快照 `nexus-codebase-current.md`，不是當前 source 引用證據。
- 前次四檔差異檢查回報 `features/study` 包含較新的 session／首次正式評分、歷史事件復原、選卡邏輯等；不能把舊 `src/lib/` 檔案覆蓋正式版。依已確認方向，使用者執行 `git rm src/lib/studyFSRS.ts src/lib/studySessions.ts`，終端機顯示兩檔已刪且已加入 Git 暫存。**保留 `src/features/study/` 正式實作。**
- 清理後使用者實際執行：`node --test tests/studySessions.test.cjs` **21/21 pass、0 fail**；`node --test tests/studyFSRS.test.cjs` **4/4 pass、0 fail**；`npm.cmd run build` 的 Next.js 16.2.9 編譯、TypeScript、靜態頁產生及建置均成功。

### 16.2 Git／驗收狀態邊界

- **仍待確認**：已建議執行 `git commit -m "清理重複學習模組"` 及 `git status --short`，截至本次使用者回報只看到 `git rm`、兩組測試、build 成功，**未看到這次刪除的 commit hash、最終乾淨工作樹或 push**；不可擅自標示已提交。
- 前述 25/25 為**兩個指定測試檔**通過，另有 production build 成功；未聲稱整套 test suite、真實登入／雙裝置、正式 Supabase 或部署均驗證。
- 若清理後要繼續修改 FSRS 或 Session，正式實作以 `src/features/study/` 為準；不要再次建立 `src/lib/` 平行版本。新開發仍遵守 §14 公共字典分期與 Q-0／Q-9 依賴。

### 16.3 UI 排列已正式決策，但尚未實作

- 使用者選擇 **B 方案**：字卡背面後的作答畫面順序固定為 **Again／Hard／Good／Easy 評分按鈕 → 可展開字典詳細資訊 → 「正在儲存作答…」底部狀態列**。狀態列為整個作答介面最下方；只於實際等待儲存時顯示，成功消失，失敗在同區提示並提供合宜重試。
- 字典尚未上線，故上述為**未來 UI 契約**；要支援手機安全區、長面板捲動，不能遮蔽評分或改動既有 FSRS／Session 事件語義。這項決策取代 §15.3～§15.4 舊「順序待確認」，也應作為 `01` §18、§19 的最新規格。

### 16.4 當前下一步

1. 使用者確認清理 commit 及最終 `git status --short`（若尚未執行則先完成）；下一工作請從 §0 的 `Q-0`／`Q-9` 開始。
2. 不再重複調查這兩個已刪除的 `src/lib/` 模組；公共字典仍維持先規劃／先 schema 與權限核對，未經同意不自動開工、部署或處理暫停的 CEEC 字詞整理。
3. 將 B 方案的底部提示位置列入未來 UI 修改與回歸驗收。


---

## 2026-09-28 來源增量存檔｜原 01 §14～§20（保持原文；非現行契約）

> 這些原始決策／規格草案自 01 搬出；最新有效規格請看 01 §4，最新決策狀態請看 01 §11。原文內的 §17、§19 等編號是**來源章號**，不是目前 01 章號。

## 14. 2026-09-13 現行功能與帳號規格【部分被 §15 修訂，已標註】

### 14.1 頁面與編輯器導覽

- 介面頁使用固定頂欄；功能導覽採首頁、垃圾桶、可展開功能群組順序。
- 編輯器頁以各類編輯器自己的頂欄取代介面頂欄，但保留左側可收合切換面板。
- 側欄頁面項目：單擊僅變更下方篩選，雙擊才跳轉至該功能；功能清單一次顯示最多五項並可捲動。
- 雙開編輯器以最新點擊者為主；關閉僅關閉目前主編輯器；中間分隔線可拖曳調整比例。
- 手機寬度下，左側面板預設收合為零寬；開關固定在編輯器頂欄左側，不保留獨立垂直軌道。

### 14.2 小說工作流

- `creative_type: novel` 開啟時先進入作品總覽，不直接進閱讀器。
- 總覽包含封面佔位、可編輯作品名稱、可編輯作品概述、字數/章節統計及完整目錄。
- `NovelSettings.synopsis` 是獨立欄位；不得由第一段正文自動推導。
- 點擊目錄章節進入閱讀器並定位到標題；可從總覽開始閱讀、編輯作品或新增章節。

### 14.3 編輯器與分頁規格補充

- A4 主紙張區與縮圖列是獨立捲動區；縮圖列底部固定顯示「新增頁面」。縮放僅影響主紙張，不影響縮圖。
- LaTeX 完成輸入或失焦後顯示數學預覽，點擊預覽回到完整原始輸入。
- 表格右鍵選單提供「完整顯示」，令表格以可視範圍縮放；儲存格/刪除細部操作以右側獨立面板呈現，不可被選單裁切。

### 14.4 帳號、雲端同步與安全邊界

- 支援 Email/密碼與 Google OAuth。【取代，D-205】原「帳號入口固定在畫面右上角」已移除，帳號入口在側欄；未登入時顯示全頁登入／註冊畫面。
- 未登入：【取代，D-203】不得讀取、建立、顯示或匯入任何頁面與附件（不再提供匿名本機使用）。
- 雲端：`pages`、`attachments`、`binaries` 均需有 `owner_id`，以 Supabase RLS 的 `owner_id = auth.uid()` 管理讀寫。
- Google OAuth 的 Supabase callback 為 `https://ekwljqtenrmrijlmscnv.supabase.co/auth/v1/callback`；實際應用網址必須列入 Supabase Redirect URLs。
- **限制：**【修改】IndexedDB 的 pages／attachments／study 已按帳號快取分區（D-200），但 binaries 尚未實體分區，且**兩帳號實機切換驗證尚未完成**（`M4-7`／`M4-8`），不可主張完整帳號資料隔離已驗收。

### 14.5 新增決策

#### D-198 帳號雲端資料以 owner_id 隔離

Supabase shared workspace 模式已被帳號工作區模式取代。所有雲端同步查詢、Realtime 訂閱、upsert 與永久刪除皆以登入 user_id 篩選；資料庫必須移除 legacy allow-all policies 並啟用 owner_id RLS。

#### D-199 Google OAuth 為帳號登入選項

Google OAuth 與 Email/密碼並列。Google Client ID/Secret 只存 Supabase Provider 設定，不可提交至程式碼、Git 或交接文件。OAuth redirect 只允許已列入 Supabase URL Configuration 的網址。

#### D-200 本機工作區依帳號快取隔離；匿名資料不自動歸戶

> 【修改註記】本決策中「登出後只列出匿名工作區」已被 D-203 取代；`workspace_owner_id` 作為本機快取邊界仍有效。

`workspace_owner_id` 是 IndexedDB 內 pages/attachments 的本機快取邊界，不上傳為 Supabase 欄位；雲端權威仍是 `owner_id = auth.uid()`。登入後只列出與建立目前帳號的本機頁面/附件，登出後只列出 `workspace_owner_id = null` 的匿名工作區。同步引擎必須再次篩選目前 user_id，避免 UI 或 adapter 的未來回歸將錯誤資料送出。

安全優先：既有匿名本機資料**不得**在首次登入時自動歸戶或上傳。未來若要提供匯入，必須先顯示明確確認、列出範圍並可取消。binaries 目前仍以 attachment ID 共用存放，但只有已屬於目前帳號的附件能從 UI 取得其 ID；若後續要達成嚴格的本機儲存隔離，需為 binaries 另設 owner/index 或 per-account database。

#### D-201 小說是受限的純文字寫作模式

小說 `creative_type: "novel"` 不是通用筆記或簡報畫布。文件模型與工具列只保留段落、H1、H2 與基本 inline 文字樣式；貼上內容以純文字段落插入。表格、圖片、清單、提示框、程式碼、LaTeX 與世界觀/人物/地點關聯均不屬此功能，後者明確不排程。

#### D-202 正式 OAuth 回跳網址

正式環境 Site URL 與 Redirect URL 使用 `https://nexus-five-alpha-75.vercel.app/`（Redirect 可使用 `/**`）。Google Cloud OAuth Client 的 authorized redirect URI 維持 Supabase 的 `/auth/v1/callback`，不可誤改為 Vercel。若登入後出現 localhost，先檢查 Supabase URL Configuration，而不是 Nexus 的裝置預覽 iframe。

#### D-203 Nexus 採登入必須制；登入後仍支援離線快取

Nexus 不再提供匿名工作區。沒有有效 Supabase session 時，畫面只可操作登入或註冊，不得讀取/列出/建立/匯入 pages、attachments 或 binaries。登入後才開啟目前帳號的 IndexedDB 快取與雲端同步；已有 session 的離線狀態仍可編輯快取資料，待連線恢復同步。登出必須立刻清除記憶體中的帳號資料，再顯示登入畫面。

此決策取代「未登入可建立匿名本機資料」的產品方向。既有匿名資料僅可透過一次性、明確授權的歸戶遷移處理；不可在未來登入時靜默合併。

---

## 15. 2026-09-16 ～ 2026-09-25 現行功能與決策【新增】

> 功能規格見 §3～§6。本節記錄新決策。來源標籤：`使用者確認`／`使用者要求＋實作`／`程式碼推導`。編號承接 D-203。

#### D-204 教師／學生版 PDF 不做【使用者確認，2026-09-20】

使用者明確回覆「教師／學生版 PDF 不用做，其他繼續實作」。講義排版的列印輸出包含完整解答，沒有教師／學生分版。

#### D-205 右上角帳號入口移除；側欄保留【使用者要求＋實作，2026-09-21】

**取代** §14.4 與舊 00 §11 中「帳號入口固定在畫面右上角」。登入畫面（未登入全頁）仍使用 `AccountButton`（`required`）；登入後帳號入口只在側欄（`AccountSettingsRow`）。

#### D-206 偏好與詳細設定架構【使用者要求＋實作，2026-09-21】

偏好第一層只有主題、語言、設定、備份；主題與語言為右側浮動子面板。「設定」進入類似 GPT 設定的分類對話框，收納功能排序、使用建議、使用說明、備份。

#### D-207 側欄功能兩欄格與最近使用排序【使用者要求＋實作，2026-09-16】

兩個一橫排、四列可見；第一列固定「全部項目」「日曆」；其餘依最新使用重排；設定可切換「以最新使用排列」「以預設排列」，預設為最新使用。實作額外提供 `custom` 模式（**待使用者確認是否保留**）。偏好存 localStorage，為裝置本機設定，不隨帳號同步。

#### D-208 新增選單隨功能切換【使用者要求＋實作，2026-09-19】

「新增」內容依目前功能篩選變化（映射見 F-NAVIGATION）。

#### D-209 小說章節為獨立 pages 記錄【使用者要求＋實作，2026-09-16】

`kind: "novel_chapter"`、`parent_id`、`sort_order`；啟用章節工作區時才轉存舊正文並清空作品正文；章節翻頁用頂部與底部的「上一章／選章／下一章」；章節不出現在一般清單；遠端需 `20260916` migration，含 `novel_chapter` 必填欄位 CHECK 與索引。

#### D-210 角色卡資料模型與模板規則【使用者要求＋實作，2026-09-16】

區塊（`group`）內含多筆混合內容；統計含可自訂小標與加總；分頁位於底部；組件標題無 emoji。範本改稱模板，**只在建立時選擇，建立後不可更換**；使用者可自訂模板並以「將目前組件與內容設為模板與範文」建立，可管理；範文只作 placeholder，不填為資料；空白模板完全無預設區塊；D&D 5e／CoC 7e 為專用欄位（記錄用途，非規則計算器）；模板更新不修改既有角色。模板存為 `character_data.isTemplate = true` 的 creative 頁面。

#### D-211 世界觀與角色歸屬【使用者要求＋實作，2026-09-16】

世界觀為 `creative_type: "world"`，沿用角卡結構；角色以 `world_id` 歸屬世界觀或獨立。

#### D-212 下拉刷新採保守策略【使用者要求＋實作，2026-09-16／09-19】

見 §6.4。範圍僅首頁與功能總覽清單；放手才刷新；儲存失敗中止刷新。

#### D-213 文字右鍵操作【使用者要求＋實作，2026-09-19】

編輯器、表格與編輯選單提供全選、複製、貼上、剪下。

#### D-214 講義排版資料契約【使用者要求＋實作，2026-09-19～21】

設定存 `content_json.lessonLayout`；新節點 `lessonBlock`／`answerSpace`／`lessonToc`；「依 A4 整理分頁」為使用者觸發、可復原，不自動搬移；列印含完整解答。

#### D-215 字卡採 FSRS-6 每日練習【程式碼推導；依 `tests/study-workspace.md` 記載為產品決策，對話中無紀錄】

參數與規則見 F-STUDY。**此決策取代**舊 `StudyItem.mastery`／`daily_phase` 簡化模型作為正式排程依據（舊欄位保留為遷移來源）。

#### D-216 字卡資料獨立於 Page，事件 append-only，舊資料保留【程式碼推導】

獨立表與 RPC；事件以 UUID 去重、記錄父事件、狀態前後、排程器版本與完整參數；`introduce`／`reset` 為管理事件；備份 schema v2；跨裝置分支標記衝突並停止排程。

#### D-217 測驗結果持久化，離線上傳需使用者決定【程式碼推導】

答錯分數 0–4（答錯 +1、答對 −1）；事件有收據與序號；離線作答狀態為 `awaiting_decision`，須使用者選「上傳／捨棄／稍後」；線上時直接進 outbox。測驗結果不影響 FSRS 排程。

#### D-218 網頁／計數／抽選資料存於 `content_json`【程式碼推導】

不新增資料表或欄位；隨 pages 同步。若日後加入公開分享或階層化計數，需重新評估（見 §12）。

#### 修訂註記（對舊決策的影響）

- **D-200**：其中「登出後列出匿名工作區」的描述被 D-203 取代（登出即清空並顯示登入畫面）。`workspace_owner_id` 作為本機快取邊界仍有效。
- **D-201**：不變；且使用者已明確排除世界觀／人物／地點與小說的關聯。
- **D-203**：不變；一次性歸戶遷移（授權 `changling971216@gmail.com`）已涵蓋字卡、事件與待同步項目。


---

## 16. 2026-09-28 後續決策補充（現行；取代 §4 F-STUDY 中相衝突的舊描述）

### F-STUDY-UI — 字卡列表與未來詳細筆記
- **已交辦但結果待確認**：字卡管理列表固定英文 A–Z（僅呈現層排序，不更動持久化 `sort_order` 或抽卡邏輯）；只顯示 English／Chinese 兩欄，唯讀單行 ellipsis；點整列開既有編輯器顯示完整原文；編輯儲存後重新排序；不提供 Custom 排序／拖曳。保留新增、編輯、刪除、匯入等原有流程。
- **後續獨立規劃**：字根／詞源／相關單字／例句／自由筆記等詳細編輯器。測驗與複習使用的精簡答案必須與長篇說明分離；是否建立共用字根筆記實體及相關 schema，須另行 discovery，**目前不可自行加欄位或 migration**。

### F-SCORE — 製譜（使用者確認的新增同級功能；未實作）
- **定位**：與字卡、小說同級的獨立生產力功能，能分別製作五線譜、簡譜、吉他譜。**不要求三者互相轉換，也不強制共用一套譜面資料結構**。
- **開發順序**：先做作品管理及快速簡譜編輯器；五線譜／吉他譜編輯器後續獨立開發。音階資料匯入／匯出與交換格式，待其他功能有實際需求再共同設計；不預先承諾 MusicXML／MIDI 等完整轉換。
- **快速簡譜 UI**：開啟作品預設為正式渲染預覽；右上角「編輯」才顯示文字原始碼；桌面可規劃分割模式，手機以預覽／編輯切換為主。原始碼是主要可編輯、可保存的真相；解析後音樂資料為可重建結果，渲染不取代原始碼。語法錯誤時保留原文並提示位置。
- **語法草案，非最終實作契約**：`_6` 低八度 La、`^6` 高八度、`#5` 升 Sol、`b7` 降 Si、`6•` 附點、`5/` 八分、`5//` 十六分、`5 -` 延長、`0` 休止、`|` 小節；英文 `.` 可作 `•` 別名。建議固定升降→八度→數字→時值順序。作品標頭 `@title`／`@key`／`@time`／`@tempo`、`//` 註解屬**建議草案**，須在開工前最終確認，尤其附點與拍號計算、連音線、歌詞等進階記號。
- **第一版候選驗收**：純文字輸入、解析、簡譜渲染、拍數警告、作品保存／重新開啟；播放及進階符號後續分期。舊產品「暫不做 Audio/Video」指嵌入音訊／影片內容，並不禁止未來為製譜新增播放能力；播放尚未列為第一版必做。
- **資料／Sync 邊界**：新增 Page kind、資料表、IndexedDB schema、RPC 前先檢查現行 source、Q-0 及遠端 migration ledger；不得因本規劃擅自修改現有架構。

---

## 17. 2026-09-28 新確認決策：全站共用字典／管理者／字卡底部資訊（最新有效）

> 本節是**經使用者確認的產品規格及待實作計畫**，不代表功能已開發；本節取代本文件內「字典／字根筆記尚未定義」的相衝突舊描述，其他不相關功能與既有資料一律保留。實際 schema 與程式路徑仍須開工前以最新 repo 核對。

### 17.1 產品範圍及延後項

- 建立**全站共用**的字典，單字、字首、字根三類可查詢；已發布資料所有已登入 Nexus 使用者（包含管理員）可讀，管理員可編輯／匯入／發布。
- 字典初期長期目標約 7,000 字，以大考中心《高中英文參考詞彙表》（111 學年度起適用）為核心，其他延伸詞彙清楚註記來源；**目前停止資料整理**，不以完成 7,000 筆作為管理系統第一階段的交付阻塞條件。
- 暫緩 Quizlet 式英／中輸入自動選字、CEEC 原始詞表擷取及特殊詞條人工審核；保留既有資料，不自行填造釋義或將候選誤作已確認詞條。
- 個人字卡／FSRS／Quiz／筆記與共用字典分離；管理員仍有與普通使用者相同的個人學習資料。

### 17.2 Google OAuth 管理員身份與權限

- 預定管理員是**現有 Google OAuth 登入**的 `changling971216@gmail.com`，沿用目前 Supabase Auth 帳號，無需新增 Email／密碼帳號或更改 Google 登入流程。
- 權限記錄需綁定該現有帳號的 **`auth.users.id` UUID**，建議獨立 `dictionary_admins`／role 表；email 只作人工確認標籤，絕不能作為唯一授權判斷，更不可讓使用者自填 email／metadata 取得管理權。
- 待實作後，由系統擁有者在 Supabase Dashboard → Authentication → Users 確認帳號並取得 UUID，再經信任的後台初始化／受限 migration 綁定。**UUID 現在未知；尚未完成授權，也不在文件記錄任何 secret**。
- 所有管理操作須有資料庫 RLS 與可信任伺服器端授權；管理 API 不信任前端隱藏按鈕。管理員權限表的寫入不允許一般 authenticated 用戶執行；後續可擴充多管理員及撤權機制。
- 與既有強制登入的帳號架構一致：未登入仍只有登入介面；不因此讓任何匿名帳號讀取私有資料。

### 17.3 資料契約與演進策略

- 既有 `20260928_etymology_catalog.sql` 建立八張 owner-scoped 百科表，且 Batch-08 importer 用本機 PGlite／owner 參數；這是可重用資料來源和解析邏輯，但**不是**公共字典寫入後台。
- 採**新的公共字典資料層**，保留既有 `etymology_*` 表、原文、SHA-256 和舊個人內容；以經審核可追溯的轉換／遷移，才將需要公開的條目轉入公共字典。禁止直接移除舊 owner_id、開放舊 RLS 或執行破壞性搬遷。
- 建議的邏輯實體（正式表命名待 Q-0 核定）：words、word_senses、morphemes、morpheme_senses、word_morpheme_relations、content/claims、sources、revisions、import_jobs、admin_roles。詞典 ID 穩定；同形異源詞可有多個語源記錄；單字可多詞性／多中文義；字首與字根底層共用構詞模型，但前端分開分類。
- 每條詞素關聯指定**具體 sense ID**，明確分開 verified historical etymology 與 learning decomposition；歷史詞源／記憶故事各自保存，未經查證的情境只能稱為記憶情境。保留來源、查證狀態和人工審核註記。
- 公開內容需具 `draft`／`pending_review`／`published`／`withdrawn` 等狀態；普通使用者只看 published，管理員能維護草稿。資料庫約束、唯一性及寫入 API 應防止多義詞或相同拼寫被錯誤自動合併。
- 公共詞庫和使用者私人 FSRS／Quiz 表不得互相持有寫入依賴；只允許卡片透過可選 `dictionary_word_id` 等穩定識別連結查詢。實際欄位／回填方式待現行 schema 對照後確定。

### 17.4 管理介面：`/dictionary/admin`（規劃路由）

- 管理員在字典總覽多見「管理字典」，可建立、搜尋、修改、撤回及發布 **單字、字首、字根**；一般使用者看不到該入口，且後端拒絕其直連寫入。
- 單字編輯：英文 lemma、多 POS 與繁中義、來源／級別、構詞義項關聯、歷史詞源、學習拆解、記憶故事、查證狀態、草稿／發布；字首／字根編輯：字形、多義項、變體限制、分類與相關衍生詞，避免重複建立單字。
- 第一版批次匯入：**CSV** 處理詞彙／詞性／繁中義／級別，**Markdown** 沿用既有字源類文件；未來可加標準 ZIP。所有來源先轉換為共同驗證模型；不能假設 Batch-08 parser 直接能理解 CEEC CSV。
- 匯入操作必須提供：預覽、有效／錯誤／衝突／重複分類、交易式提交、冪等檢查、錯誤回滾、來源 SHA-256、操作者與時間紀錄。不同內容不可無聲覆蓋已發布或已核准條目，而是產生待審核草稿／差異。**匯入不自動公開**；管理員確認後才發布。
- 修改紀錄至少包括版次、時間、操作者、差異與可追溯來源；撤回不破壞歷史與既有個人卡片。

### 17.5 普通用戶字典與字卡整合

- 在**字卡首頁頂部**設置「字典」入口（所有登入使用者／管理員皆有）；字典總覽按單字、字首、字根分類，可搜尋已發布資料及開啟詳細頁。**初版搜尋不等於字卡輸入時的智慧自動選字**。
- 每日學習和正式複習：字卡正面不顯示字典詳情面板；**翻到背面**後於**畫面正下方**顯示「展開單字詳細資訊」，點擊可展開／收合。桌面採學習區底部面板，手機採底部抽屜；不得遮蔽或取代 FSRS 原有評分按鈕。
- 卡片切換自動收合上張內容；無字典條目顯示「尚未收錄」，查詢失敗顯示重試，均不阻擋學習／複習。已有穩定字典 ID 者優先依 ID 查詢；舊卡若僅有英文拼寫則保守比對，遇同形異源或多個候選供使用者挑選，不擅自認定詞源。
- 開啟、閱讀、關閉字典面板**不得產生 FSRS review event、變更 mastery／due、改動 Session 完成狀態或 Quiz 統計**。既有 Daily Easy 完成、新版正式複習首次正式評分及 Good／Easy 出箱等規則保持不變。

### 17.6 分期及驗收（均為待實作）

1. **公共 DB／管理員權限**：Q-0 最新 schema 實查、Q-9 遠端 migration ledger → 獨立公共表、唯讀發布查詢、Google Auth user UUID 管理角色、RLS 安全測試。不得由 email 或前端按鈕提供真正授權。
2. **管理端 CRUD／批次匯入**：單字／字首／字根編輯；CSV、Markdown 預覽及有效性檢查；冪等、衝突阻擋、回滾、草稿及審核發布；權限測試。
3. **字典總覽／查詢**：字卡首頁頂部入口、三類查詢及已發布詳頁；普通用戶與管理員雙帳號測試；7,000 字量級查詢分頁／索引效能測試。
4. **字卡底部資訊**：Daily／Review 正反面行為、手機及桌面底部面板、缺資料／離線錯誤、詞形多候選；FSRS、Session、Quiz、同步回歸。

本節不授權自動部署，也不代表任何遠端 migration 已執行。程式修改、正式資料庫操作、部署各自需使用者明確同意；自動測試／本機測試／正式環境驗收分開記錄。

### 17.7 新決策索引（延續原有 D-218，不改舊編號）

- **D-219【使用者確認】**：優先建立公共字典及管理端，立即停止目前 CEEC 資料整理。
- **D-220【使用者確認】**：管理員為既有 Google OAuth 帳號 `changling971216@gmail.com`，以 Supabase Auth UUID 而非 email 綁定寫入權限。
- **D-221【使用者確認】**：管理員能網頁匯入／編輯單字、字首、字根；普通用戶與管理員在字卡首頁頂部使用共用字典總覽及搜尋。
- **D-222【使用者確認】**：每日學習／正式複習翻面後，畫面正下方顯示可展開詳情面板，字典閱讀不能影響 FSRS／Quiz。
- **D-223【使用者確認】**：規格先行，現階段只產生計畫及更新交接文件；不用 Work，程式異動必要時才交 Codex。

---

## 18. 2026-09-28 本輪規格補充：儲存提示、字源檔名及學習模組一致性

> 本節依使用者最新明確 UI 要求與驗證回報補充 §16～§17；本節只有產品規格或核對要求，**不代表程式已實作、部署或通過整套回歸**。與舊狀態衝突時依最新使用者確認的需求，歷史細節留存 02。

### 18.1 作答儲存提示（新確認 UI 契約）

- 每日學習、正式複習在評分觸發實際等待保存時，`正在儲存作答…` **不能出現在單字卡上方**；在 Again／Hard／Good／Easy 四個按鈕**下方**的底部狀態區顯示；成功後自動消失，失敗顯示清楚提示與合宜的重試方式。
- 移動狀態提示**只改 UI，不改寫**既有首次正式評分、Session mastery、Daily Easy introduce、outbox 或同步語義；避免重複點擊、未確認保存卻先切卡。須做成功、失敗、手機小螢幕與返回/切卡測試。
- **此處待決狀態已由使用者選擇 B 方案解決**：四個評分按鈕 → 翻面後可展開字典詳情 → 儲存提示固定整個作答介面最末（有效規格見 §19.2）。尚未修改 UI。

### 18.2 字源匯入資料檔命名兼容契約

- Windows 上已由使用者將 `batch-08/prefixes/con.md` 改為 **`con-prefix.md`**（兩版 SHA-256 相同）；INDEX 連結已同步改動，新的 dry-run 無驗證錯誤。新路徑不必更動詞素字形 `con` 或詞源語義。
- 舊 JSON 匯入報告留作歷史快照；不能把舊 source ID 與新 path ID 靜默視為同一資料。未來若將 Batch-08 轉入全站字典，須建立 provenance／source-id alias 或安全映射方案，經本機驗證與審核後才匯入；不直接覆寫已發布內容。

### 18.3 學習模組雙路徑為核對事項，非新架構決策

- **歷史狀態已解除**：正式邏輯位於 `src/features/study/`；`src/lib/` 重複兩檔已由使用者執行 `git rm` 清理；指定測試 25/25 及 Next.js build 已通過。證據與未確認之 Git 提交狀態見 §19.1。
- 未來修改 FSRS／Session 時只修改正式 `src/features/study/` 路徑，並做相應回歸；不重新建立平行 `src/lib/` 版本。

### 18.4 測試證據限制

- 使用者本機執行 `node --test tests/studySessions.test.cjs`：**21/21 通過**。此結果支持該單一測試檔覆蓋的既定情境；尚需確認最新 repo 的完整測試、編譯/build、真實使用者／雙裝置驗收。舊版測試備份與現行測試逐行差異是否全數納入，若影響刪除備份，應另行以實際兩檔 diff 驗證，不靠檔名/測試數量推斷。

---

## 19. 2026-09-28 最新有效契約：正式學習模組單一路徑與底部布局 B（取代 §18 待確認項）

### 19.1 學習模組正式路徑及證據

- **最新驗證（優先於 §18.3 的歷史待核對說法）**：使用者實際清除 `src/lib/studyFSRS.ts`、`src/lib/studySessions.ts`（`git rm`）；正式 `src/features/study/` 保留。其後指定測試 `tests/studySessions.test.cjs` **21/21**、`tests/studyFSRS.test.cjs` **4/4**，`npm.cmd run build`（含 TypeScript）成功。清理的 Git commit hash／`git status --short`／push 未取得，不能記為已提交／已部署。此結果亦非整個 test suite 或真實雙裝置驗收。

### 19.2 底部 UI B 方案（使用者已確認／待實作）

- 每日學習與正式複習**翻面後**排列：四個評分按鈕 → 可展開「單字詳細資訊」 → 整個作答介面最底部的「正在儲存作答…」狀態列。正面不顯示字典詳情；換卡後面板收合；提示僅實際儲存期間可見，成功消失，失敗時同位置提示與重試。手機須處理安全區與可捲動詳情，不遮蔽按鈕，不修改 FSRS／Session／Quiz 正式紀錄。


- 學習相關正式邏輯統一以 **`src/features/study/studyFSRS.ts`、`src/features/study/studySessions.ts`、`src/features/study/StudyRepository.ts`** 為準。使用者以實際 `src`／`tests` 引用搜尋確認 UI、儲存層、Quiz、學習測試均使用 `features/study`；原 `src/lib/` 同名兩檔只彼此引用且與正式版有內容差異。
- 使用者已執行 `git rm src/lib/studyFSRS.ts src/lib/studySessions.ts` 清理兩個重複舊檔；**禁止為相容舊版無端重新建立雙套平行學習邏輯**。如果日後發現新的引用，先按最新 source 實查再修正。
- 清理後驗收紀錄：`studySessions.test.cjs` **21/21**、`studyFSRS.test.cjs` **4/4**，皆 0 fail；`npm.cmd run build` 成功完成編譯及 TypeScript。這僅證明指定自動化測試及本機建置，非全套、實機、雙裝置或正式環境驗收；刪除 commit 是否完成仍待確認。

### 19.2 作答底部布局：使用者確認 B 方案

- **適用畫面**：每日學習與正式複習；字典詳情只於翻面後顯示（§17.5）。
- **排列順序**：**評分按鈕（Again／Hard／Good／Easy）→「展開單字詳細資訊」可展開區 → 最下方的「正在儲存作答…」狀態列**。狀態列固定在整個作答區的最末，不放單字卡頂部，也不置於字典面板上方。
- 僅在實際保存請求待完成時顯示進行中提示；成功後自動隱藏；失敗在同一底部區域顯示錯誤及適當重試入口。詳情面板展開、收合、無詞條、等待或失敗都不能遮擋評分按鈕、造成人為重複評分或改動 FSRS／Session／Quiz 寫入語義。
- 此處是**產品決策，不是已完成 UI 實作**。桌面與手機抽屜布局實作時都須檢查最下方狀態區、safe area、鍵盤與長內容捲動。

### 19.3 本輪決策／狀態索引

- **D-224【使用者確認】**：優先實查並清理重構後重複的 `src/lib/` 學習模組；現行正式版本統一 `src/features/study/`。依使用者本機輸出，兩個舊檔已 `git rm` 並通過指定測試與 build，刪除 commit 待確認。
- **D-225【使用者確認】**：字卡作答底部採 B 方案，評分按鈕 → 翻面後可展開字典詳情 → 最末端儲存狀態提示。
- §18.1 的「在評分按鈕下方」仍成立，但**不是緊接按鈕**；若與 §18.1～§18.3 的舊待確認文字抵觸，以本節已確認排序和路徑為準。

---

## 20. 2026-09-28 產品規格／任務對照與未決邊界（本次整合）

> 本節讓接手者從功能直接找到任務。它不是宣稱所有尚未 discovery 的功能都有可直接編碼的設計，也不取代 §4 的完整功能卡或歷史 §14～§19。任務順序與狀態以 `00` §0、§10 為準。

| 規格 | 對應任務 | 驗收與邊界 |
| --- | --- | --- |
| 公共字典資料層、角色與發布權限（§17.2～17.3） | `Q-0`＋`Q-9` → `M7-9` | 獨立公共表；只讀 published；現有 Google OAuth UUID 受信任授權；雙帳號未授權讀寫/RLS；正式資料庫另批。 |
| 單字／字首／字根管理與匯入（§17.4） | `M7-10` | CSV／Markdown dry-run 預覽、穩定 sense ID、來源／記憶術分離、衝突與冪等、修訂及發布；CEEC 清單整理仍暫停。 |
| 字卡首頁共用字典入口與搜尋（§17.5） | `M7-11` | 單字／字首／字根、published 查詢及權限、約 7,000 條效能；不等同智慧選字輸入。 |
| Daily／Review 翻面後底部詳情（§17.5、§19.2） | `M7-12` | B 排列、手機安全區、多候選／缺資料、與 FSRS／Quiz 事件嚴格解耦。 |
| 近義詞群組練習（原 `M7-8`） | 後續細化（未定） | 需求保留，但尚無分組與練習／評分契約；不可當作公共字典四階段必備功能。 |
| 製譜（§16）、進階 PDF、Canvas、分享／多分類日曆等 | 保留原 MVP 任務或待建立 Task ID | 有些只有產品方向／discovery，**不得**標成已完成技術規格；詳見 §4、§12 及 `00` §10。 |

**真實驗收邊界**：已驗證的學習 25/25 是兩個指定測試檔，另有一次 production build 成功；未取得全量回歸、正式帳號、雙裝置或遠端 schema 實測。已確認的舊個人字源 PGlite 匯入不表示公共字典、管理員授權或 7,000 筆詞表已上線。


---

## 2026-09-28 來源快照存檔｜原 00 §4（2026-09-25 檔案樹；非現行目錄）

## 4. 檔案結構（依 2026-09-25 程式碼快照重建）【修改】

```
src/
├── app/            globals.css、layout.tsx、page.tsx
├── components/
│   ├── NexusApp.tsx            主應用殼：登入閘門、帳號同步、頁面清單、章節與模板過濾、新增流程
│   ├── Sidebar.tsx             功能兩欄格、篩選、最近使用排序、頁面清單
│   ├── FeatureOverview.tsx     功能總覽清單（下拉刷新只作用於此與首頁）
│   ├── Dashboard.tsx           首頁
│   ├── CreationChoiceDialog.tsx / NewPageDialog.tsx   依功能切換的新增選單
│   ├── AccountButton.tsx       僅用於「未登入全頁登入／註冊畫面」（required）；已不作右上角入口
│   ├── AccountSettingsRow.tsx  側欄帳號入口
│   ├── SettingsDialog.tsx      詳細設定（一般／功能排序／使用建議／使用說明／備份）
│   ├── PreferencesMenu.tsx     偏好第一層（主題、語言、設定、備份）
│   ├── WorkspaceDialog.tsx / HelpGuide.tsx / CommandPalette.tsx / DevicePreview.tsx
│   ├── EditorPane.tsx          編輯器分流（flow／paged／講義）
│   ├── TiptapEditor.tsx / PageFormatView.tsx / PaginatedEditorView.tsx / PageThumbnail.tsx
│   ├── LessonLayoutPanel.tsx   【新增】講義排版與目錄面板
│   ├── DocumentRuler.tsx / TableGridPicker.tsx / ToolbarDropdown.tsx / ColorPaletteButton.tsx
│   ├── CreativeView.tsx        創作入口（角色卡、世界觀）
│   ├── NovelReaderView.tsx     小說作品總覽、閱讀器、章節工作區
│   ├── CharacterProfileView.tsx【新增】角色卡／世界觀編輯（區塊、混合內容、分頁）
│   ├── CharacterRadar.tsx / CharacterStatistics.tsx / CharacterTemplateManager.tsx  【新增】
│   ├── UtilityView.tsx         【新增】網頁／計數／抽選（基礎版，三者共用一個元件）
│   ├── TodoView.tsx            日曆待辦（月曆）
│   ├── QuickNotesView.tsx      隨手記
│   ├── StudySetView.tsx / DailyStudySession.tsx / QuizSession.tsx / QuizOfflinePrompt.tsx  【新增／改寫】FSRS 與測驗
│   ├── PresentationView.tsx / ChartRenderer.tsx / ChartTypeMenu.tsx
│   └── FileMenu.tsx / PageItemMenu.tsx / RightPanel.tsx / ResizablePanel.tsx
└── lib/
    ├── types.ts                 PageKind 共 11 種：note、document、study_set、presentation、quick_note、todo、creative、novel_chapter、web、counter、draw
    ├── creatableRegistry.ts / creationOptions.ts【新增】/ featurePreferences.ts【新增】
    ├── StorageAdapter.ts / IndexedDBAdapter.ts (DB_VERSION 6) / syncEngine.ts / supabase.ts
    ├── novelChapters.ts【新增】/ characterTemplates.ts【新增】/ characterWorkspace.ts【新增】
    ├── lessonDocument.ts / lessonExtensions.ts【新增】
    ├── pullToRefresh.ts【新增】
    ├── studyFSRS.ts / StudyRepository.ts / studySessions.ts / studyPractice.ts / studySync.ts【舊快照路徑，現已搬至 features/study，不可照抄】
    ├── quizPersistence.ts / quizQuestions.ts / quizSync.ts【新增】
    ├── stableBlockIdExtension.ts / blockId.ts / calloutExtension.ts / multiColumnExtension.ts / writingModeExtension.ts / pageBreakExtension.ts
    ├── obsidianMathInput.ts / obsidianMathNodeView.ts / markdown.ts / wikilinks.ts / pdfNote.ts / presentation.ts / inbox.ts / i18n.ts / LanguageContext.tsx / fileDownload.ts
supabase/migrations/   20260913、20260914、20260916、20260922、20260925（見 §12）
tests/                 *.test.cjs 與 *-workspace.md 驗證說明（見 §9.3）
```

新增依賴：`ts-fsrs 5.4.2`；開發依賴 `@electric-sql/pglite`、`fake-indexeddb`。

---


> 補充：本次結構整理中的 `B2` 有兩種來源：舊工程階段 B2（同步衝突）與 2026-09-28 集中決策 B2（儲存提示末端捲動）；不得互相誤讀。


---

## 2026-09-28 後續增量｜公共字典與個人字卡產品模型澄清

- **類型**：使用者明確產品澄清／交接文件修訂；非程式實作，未查證遠端 Supabase。
- **使用者決策**：Nexus 只有一份公共字典（百科），由管理員維護；用戶建立各自字卡，字卡可連結公共字典補充詳細資訊。
- **發現的文件歧義**：歷史 owner-scoped `etymology_*` 舊實作被稱作「私人字源百科」，可能被誤讀為要新增每位用戶的私人百科；A5「私有原稿轉公共」也可能被誤認為字卡投稿機制。使用者表示未與先前 AI 討論過私人字源百科作為產品功能。
- **修正**：00 最新方向及 M7-8／M7-9／M7-12 說明、01 F-STUDY／F-DICTIONARY／決策 A5 改為唯一公共百科＋個人字卡可選連結，歷史說法保留於本檔但不具現行規格效力。
- **未決維持未決**：A3 公共內容發布版本／撤回後關聯行為、A4 首批來源重製授權、A5 是否／如何處置舊字源資料；個人字卡連結建立 UI 與舊卡回填方式亦未擅自決定。
- **保護措施**：不刪除舊 `etymology_*` 或批次匯入器，不開放舊 owner-scoped RLS，不讓公共百科更新自動覆寫個人字卡，也不把字卡 FSRS／Quiz 資料移入公共庫。
- **工作狀態**：本次僅修正 00／01／02 交接文件；未修改任何 Nexus 程式碼、資料庫、Git 歷史或正式部署。

---

## 2026-10-08 — 公共字典 source/license 退休、Draft 清空與正式 Word／Prefix／Root 母檔封裝

### 類型

產品決策更新／公共字典實作回報／資料清理／詞源查證／正式交接資料整理

### 背景

公共字典已經過 M7-9～M7-12 與多輪後續修正，舊版仍殘留一般詞條級 `source_id`／`citation`／`license` 依賴。使用者決定不只隱藏 UI，而是正式淘汰這套一般來源／授權底層需求：版權與第三方來源改由「設定 → 關於 Nexus → 資料來源與版權」統一說明；historical etymology 自己的「資料來源」仍保留，audit 也必須保留。

同時，使用者決定清除目前所有 Draft，之後以重新查證過的 Word／Prefix／Root 母檔乾淨重建，不再背負 smoke test、舊 Batch Draft 與暫時 placeholder source。

### Codex 最新 source retirement 回報

Codex 修改：

- `adminImport.ts`
- `aiDictionary.ts`
- `dictionary.ts`
- `reader.ts`
- `DictionaryAdmin.tsx`
- `DictionaryAI.tsx`
- `DictionaryBrowser.tsx`
- 相關 tests
- 新增 `dictionarySourceRetirement.test.cjs`

新 Word CSV runtime 契約固定為：

```csv
entry_id,sense_id,headword,part_of_speech,gloss_zh_tw
```

全部必填。CSV／Markdown／JSON／AI 的舊一般來源欄位會明確拒絕，不再建立 placeholder source。

DB 方向：
- 解除五個內容表 `source_id` 的 NOT NULL 與 FK。
- 保留既有欄位值、`dictionary_sources`、AI metadata `source_ids` 作歷史相容用途。
- historical etymology 自己的「資料來源」文字保留。
- `dictionary_audit` 完整保留。
- 正常新增、Preview、Import、Reader、AI／Export 不再依賴來源系統。
- 只有歷史資料、舊 migration、舊欄位拒絕／清除相容處理仍殘留 source 概念。

新增 migration：`20261012_dictionary_retire_sources.sql`。**不永久刪除資料；截至本日尚未套用正式環境。** Codex 回報相關測試 **54/54**、TypeScript、Build 通過，未部署。

### Draft 清理

使用者確認已刪除目前 Draft，目標是全部清空後重新匯入乾淨資料。先前曾提醒「全選 Draft」會包含 GSAT 與既有 Prefix／Root／Batch-08 Draft；使用者後續明確選擇全部 Draft 都不要、準備重建，因此完成刪除。此處是使用者操作回報，未由本文件另外查 production DB。

### 詞彙資料整理過程

原始 GSAT 1～6 級資料先前清理後得到 **6147** 個 Word candidate。之後使用者提供自己整理的 Root／Prefix／Word／核心概念／故事資料及多張分類截圖，要求改成：

1. 不先併入再標待查。
2. **先查證詞源與構詞是否正確。**
3. 檢查是否符合目前 Nexus Prefix 四類／Root 九類。
4. 若只是缺資料但條目本身正確，就查詢補完整；**缺資料不等於刪除**。
5. 確認無誤後才併入正式資料。

本輪對多個容易混淆的項目做了拆分／修正，例如：
- `render/rendre` 與 Germanic `rend`「撕裂」分開。
- `ton-/thunder` 正式化為 `ton-/tonare` family。
- `participate` 保留 `part- + cap-/cept-/cip-`，不只歸為 cap family。
- `agree` 不當成單純同步構詞 `ad- + gree`；保留正確歷史關係。
- `op-` 歸入 `ob-` 同化 family；`im-/il-/ir-` 歸入 `in-` family。
- `ad-/ac-/as-...` 視為同 family；`con-/com-` 同 family。
- `di-（二）` 與 `di-（分離）` 分開。
- `min-/minim-` 與現代 `mini-` 分開。
- `deca-/deka-` 與 `deci-`、`cent-` 與 `centi-` 分開。
- `infer` 不作「下」Prefix，改用正確 `infra-`。
- `dom-` 不作舊筆記中的「上／自我」Prefix，改整理為 `dom-/domin-` Root。
- `ten-/tain-/tent-`、`i-/it-/ire`、`pel-/puls-`、`batt-/bat-`、`cuss-` 等在進一步查證後納入正式 Root。
- 記憶故事若只是學習 mnemonic，就保留為 mnemonic/story，不當成歷史事實。

### final_05 正式交接母檔

最終只保留三份正式 CSV：

| 類型 | 筆數 | 驗證 |
| --- | ---: | --- |
| Word | **6163** | case-insensitive headword 0 重複；必要欄 0 空白；待補／待查標記 0 |
| Prefix | **82** | 必要欄 0 空白；非法分類 0；待補／待查標記 0 |
| Root | **58** | 必要欄 0 空白；非法分類 0；待補／待查標記 0 |

Word 數量的演變：
- GSAT clean base：6147
- 從使用者既有詞源筆記補入 17 個非母檔 Word → 6164
- 最後發現 `Internet`／`internet` 為 case-insensitive duplicate，合併後 → **6163**

17 個原先不完整的補充 Word 已全部補完 part of speech、繁中義、source_forms／構詞欄位，不再含 `待補`。舊構詞名稱也統一到目前正式 Prefix／Root family。

### 分類現況

Prefix 四類：
1. 性質、評價與否定
2. 位置、方向與關係
3. 數值、量與程度
4. 作用與變化

Root 九類：
1. 空間、位置與環境
2. 動作、接觸與物理作用
3. 移動、轉變與方向
4. 物質、自然與元素
5. 生命、身體與感官
6. 情感、心理與意志
7. 心智、溝通與學習
8. 社會、法律與制度
9. 時間、狀態、數量與邏輯

Prefix 的主要分類可以落在 Sense level；Word 不使用這套 Root／Prefix 學習分類作主要分類。

### 交接資料與 runtime import 的差異

`nexus_words_final.csv` 是正式**內容交接母檔**，可以保留 `levels`、`source_forms`、`related_morpheme`、`mnemonic_story` 等整理資訊；但新的 Word CSV runtime importer 只接受五欄，所以實際匯入前要再投影成：

`entry_id,sense_id,headword,part_of_speech,gloss_zh_tw`

Prefix／Root CSV 也是正式母檔，不代表可以直接用 Word CSV importer 匯入。必須依當時現行 Admin／JSON／AI 匯入能力選正確路徑。

GSAT `levels` 保留用於 Official Study Pack manifest，不加入公共字典搜尋／篩選。既定 Official Study Packs：學測 1–2 級、3–4 級、5–6 級。

### 後續

1. 使用者手動執行 `20261012_dictionary_retire_sources.sql`。
2. migration 成功後，再產生 Word 五欄 clean import。
3. Prefix／Root 依現行正式匯入能力建立，不誤套 Word CSV。
4. 重新匯入一律先 Draft，再經人工／規則確認後 Published。
5. source retirement 不得削弱 revision、admin-only、transaction rollback、Published 保護或 audit。

---

## 2026-10-11 — Dictionary identity／pronunciation／Study reliability 收斂與 final canonical master

### 類型

產品決策收斂／DB migration 驗證／Importer identity／資料清理／正式大量匯入準備／Study sync reliability

### 背景

公共字典核心已經歷 source retirement、Draft pipeline、Published revision lifecycle、Dictionary↔Flashcard、Official Study Packs 與 Study sync reliability 等多輪實作。正式大量匯入前，本輪只保留會影響 identity、Sense 污染、資料安全與第一次匯入的阻塞項，不再因未來可能使用的欄位持續擴 schema。

### production migration 最新結果

使用者已逐一回報下列 migration 在 production Supabase 執行成功：

- `20261012_dictionary_retire_sources.sql`
- `20261013_dictionary_draft_pipeline.sql`
- `20261014_dictionary_revision_lifecycle.sql`
- `20261015_official_private_card_edit.sql`
- `20261016_study_reliability.sql`
- `20261017_dictionary_entry_identity.sql`

其中 `20261017` 的行為經人工審查：
- migration 先鎖定 `dictionary_entries`；
- 掃描 `(kind, lower(btrim(headword)))` 既有重複；
- 有重複就 exception，要求人工處理；
- 不自動 merge／delete／改 stable ID；
- 無重複才建立 unique index。
使用者執行結果：`Success. No rows returned.`

因此正式 identity 已鎖為：

> 同 kind + trim/lower normalized headword = 同一 Entry；不同詞性／中文義項／歷史來源／語義 → 多 Sense。

Word／Prefix／Root 仍是不同 kind，可同拼寫。

### source/license 與資料來源頁

Codex 回報已完成：
- `DataSourcesAndCopyright.tsx`
- `entryIdentity.ts`
- `dictionaryCSV.ts`
- `draftPipeline.ts`
- `importReview.ts`
- `aiDictionary.ts`
- Dictionary Admin／AI／Browser 等

資料來源與版權頁集中說明：
- 高中英文參考詞彙表
- Prefix／Root 整理來源
- historical etymology source type
- 自行整理內容
- AI-assisted content
- licensing／attribution／copyright

沒有恢復詞條級 general source/license/citation。

Matching 同步改為同 kind + trim/lower headword 共用 Entry；新增語義使用 Sense；既有詞條匯入先 Review；stable IDs 保留。AI 分類覆蓋多義項詞性的 Sense 污染問題也做了修正。Codex 回報 58 項測試通過；最後修正後受影響 35 項重跑全通過；TypeScript／Build 通過。未部署。

### Pronunciation 決策與實作

使用者決定 pronunciation 可以先正式預留；inflection 不需要在本輪建立固定欄位。

Pronunciation contract：
- `id`
- `entry_id`
- `sense_id nullable`
- `locale nullable`
- `ipa`
- `note nullable`
- `sort_order`
- DB 技術欄位另含 `revision / updated_at`

語義：
- `sense_id = null` → Entry 共用發音
- 指定 `sense_id` → 特定 Sense 發音
- 支援同 Entry 多讀音／locale
- `(entry_id,sense_id)` 不可跨 Entry
- 第一版不做 TTS／音檔

Codex 已接入：
- DraftInput
- JSON Bundle
- AI round-trip
- Safe／Review
- Admin／Reader
- Published revision snapshot／Diff
- Draft content delete／audit

Codex 回報 56/56 tests、TypeScript、Build 通過。新增 `20261018_dictionary_pronunciations.sql`。人工審查 migration 後判定可執行，但**本日文件更新時尚未收到使用者 production 成功回報**，不得記為已套用。

Inflection 決策：
- 不另做 `past_form/plural_form/...` 固定欄位。
- 未來放進詞形／詞條關聯。
- derivation 繼續使用既有 relation／構詞系統。
- pronunciation、usage/register、完整例句、synonym/antonym、inflection 不再阻塞第一次正式大量匯入。

### Study reliability

核心語義：
- `study_events` = historical truth
- `study_state` = current derived/rebuildable state

正常 merge：
- event ID dedupe
- parent chain
- incremental sync cursor
- replay only affected card
- safely reconstructable 不顯示衝突

只有真正 ambiguity 才用 fallback strategy／manual resolution；relearn 只改 derived state，不刪 events。

Codex 回報：
- IndexedDB v8
- incremental sync
- affected-card replay
- resolution receipt
- first sync paginated bootstrap
- normal Study flow 不再 full-load 全 history
- tests 93/93、TypeScript／Build 通過

`20261016_study_reliability.sql` 已由使用者 production 套用成功。真實雙裝置、mobile、正式前端 deployment 仍未確認。

### Dictionary 原始資料清理

使用者提供三份來源：
- `nexus_words_final.csv`
- `nexus_prefixes_final.csv`
- `nexus_roots_final.csv`

本輪指定只做五項：
1. `in- / di- / sub-` 合併為相同 canonical form、多 Sense。
2. 把 canonical form 的括號說明拆出去。
3. 補 `part-` Root。
4. 清理 12 筆 `source_forms` 中的 `||` 合併痕跡。
5. `ad-` example 移除 `acknowledge`，加入 `admit`。

結果：
- Word：6163
- Prefix：82 source rows
- Root：59
- canonical Prefix／Root form 括號殘留 0
- `source_forms` 的 `||` 殘留 0

### final canonical master

以清理後資料及舊 canonical stable IDs 生成：

`dictionary_master_final.csv`

固定 12 欄：

```csv
kind,entry_id,sense_id,headword,part_of_speech,gloss_zh_tw,category,etymology,example_words,source_forms,relation_hint,mnemonic_story
```

結果：
- **6301 Entries / 6304 Sense rows**
- Word：6163 Entries / 6163 Senses
- Prefix：79 Entries / 82 Senses
- Root：59 Entries / 59 Senses
- multi-Sense Entries：`di-`, `in-`, `sub-`
- 新 `part-` 只在此次 canonical master 生成一次 stable Entry／Sense ID
- 舊 pseudo-Entry 的 Sense IDs 保留並搬到 retained canonical Entry
- GSAT `levels` 不進 Dictionary master
- pronunciation 不進 CSV v1
- validation errors：0

Official Study Pack manifest 仍獨立，**6151 memberships**。

### 拆分匯入

因 Supabase／importer 無法一次穩定吃完整 master，將 final canonical master 依 Entry 邊界拆成 13 份：

- part 01～12：各 500 Entries
- part 13：301 Entries / 304 Sense rows
- 總計仍 6301 Entries / 6304 Sense rows
- 同一 Entry 的多 Sense 永遠不跨檔

此拆分只解決 payload／單次匯入負載，不改 Safe／Review contract。

正式匯入步驟：
1. 先確認 `20261018_dictionary_pronunciations.sql` production migration。
2. 依 part 順序 Preview。
3. 觀察 Safe／Review／Invalid；比例異常就停止。
4. Preview 合理 → Apply Safe。
5. Review 保留人工處理，不靜默 overwrite。
6. Official Study Pack manifest 另行處理。
7. 完成後開始實際學習，不再因非阻塞 schema 擴充延後使用。

### 仍未確認／未完成

- 前端 deployment 未確認：Dictionary↔Flashcard、Study reliability、pronunciation UI 等不能標成已部署。
- Score／製譜基礎框架：Codex 指令已發出，但尚未有完成回報。
- 「工具」導航群組（計數／抽選）：Codex 指令已發出，但尚未有完成回報。
- Published revision rollback UI 尚未做。
- formal synonym／near-synonym relation 尚未做。
- Import Review 跨裝置 continuity 尚未做。
- real dual-device Study E2E／mobile／formal stress test 尚未完成。
- Import Batch ID 明確不做。

### 文件治理

- `00`：本輪 current status／下一步／migration ledger。
- `01`：Entry identity、Sense-aware pronunciation、final canonical master、bulk Preview contract。
- `02`：保留本則詳細過程；不得反向覆蓋 00／01。
