# Nexus — 專案歷史與決策紀錄

> **編排原則：按日期由舊到新（升冪）**。本文件保存重大產品決策、技術演進、功能開發、重要問題及其原因，日期與事件標題取自歷史交接來源。相同事件合併呈現，但保留舊階段的決策，即使後來被取代。**以下歷史紀錄是當時的狀態與回報，不代表目前 main 或 production 已驗收。**

**來源**：`docs/archive/02-PROJECT-LOG-DETAILED.md`（完整原始日誌）、`docs/archive/01-CANON-SPEC-AND-DECISIONS.md`（集中決策登記）、`docs/archive/00-HANDOFF-STATUS-AND-AI-RULES.md`（交接及後續增量）。現行產品目標只看 `SPEC.md`，技術目標只看 `ARCHITECTURE.md`，目前工作只看 `HANDOFF.md`。

**判讀標準**：
- **當時採用／實作** 不等於現在仍採用；如後續修訂，依時間往後查閱，最新已核准規格優先。
- 重要決策保留背景、處理方式、根因或結果；日常指令、重複操作和逐行程式替換只留 Git 歷史與完整封存原文。
- 日期未知不得臆造；舊日誌的「已完成」僅為歷史回報。

## 歷史導覽
- [2026-06（29 筆）](#2026-06)
- [2026-07（15 筆）](#2026-07)
- [2026-08（18 筆）](#2026-08)
- [2026-09（17 筆）](#2026-09)
- [2026-10（2 筆）](#2026-10)


## 2026-06

### 2026-06-20 ~ 2026-06-21 — 產品與架構規劃

### 類型

`text 產品規劃 / 架構決策 ```

### 完成內容摘要

建立 Nexus 的核心方向：

`text 個人化 local-first 跨平台 all-in-one digital workspace 核心場景：學習 / 研究 ```

確認三大設計原則：

`text Everything is a Page / Block Everything is Linkable Local-first, Cloud-optional ```

確立五概念模型：

`text Page Block Property Workspace View Page Mode ```

確認 MVP 分期：

`text MVP-0：本地筆記原型 MVP-1：個人筆記系統 MVP-2：學習 / 研究工具 MVP-3：時間管理整合 MVP-4：同步與打包 ```

### 2026-06-21 — 開工前規格補完

**形成決策：** 新增並確認 D-28~D-34：

`text D-28 MVP-0 使用 IndexedDBAdapter D-29 預設 sans-serif，serif 作未來主題 D-30 block node 從 MVP-0 起穩定 ID D-31 title 獨立存在 pages.title D-32 soft delete D-33 UI / Editor 只能依賴 StorageAdapter D-34 MVP-0 嚴格限於能寫能存 ```

# 後續更新模板

之後每完成一件事，請追加：

```md

### 2026-06-27 — Next.js dev server 確認與 MVP-0 第一輪實作

**背景：** 使用者在交接後表示：

`text 我準備好了。 下一步是引導你執行 cd / dir / npm.cmd run dev。 如果需求定義不完整，或有更好的執行方式，可以向我提問。 檔案多經其他 AI 修飾，許多定稿內容可再次更動，請依整體方案最佳化。 ```

此段重要，代表後續 AI 可以在不背離核心願景的前提下主動提出更佳做法，而不是僵硬照舊文件執行。

**結果判斷：** `text Next.js 專案可正常啟動 ✅ 實際有 src/ 目錄 ✅ localhost:3000 可開 ✅ 進入 MVP-0 實作條件成立 ✅ ```

原先文件中「可能沒有 src/」的疑慮已解除。實際結構後續確認為：

`text src/app ├── favicon.ico ├── globals.css ├── layout.tsx └── page.tsx ```

**實作決策：移除 Google Font 與 Vercel 預設頁：** 說明給使用者：

`text Deploy Now / Documentation 是 create-next-app 預設推廣連結 不屬於 Nexus 功能 MVP-0 local-first 不需要 Vercel deployment 入口 保留會干擾極簡三欄 App Shell ```

使用者選擇：

`text 手動貼程式碼 問題三：是否備份原 page.tsx 沒有意見 ```

**最終測試結果：** 使用者刷新瀏覽器並測試：

```text

# + 空白

```

結果：

`text 成功 ✅ ```

### 2026-06-27 — Node.js 初次檢查失敗

**結果：** 出現錯誤：

`text 無法辨識 'node' 詞彙是否為 Cmdlet、函數、指令檔或可執行程式的名稱。 ```

### 2026-06-27 — npm PowerShell 執行政策問題

**結果：** 使用者執行：

`powershell npm.cmd ```

成功顯示 npm usage，確認 npm 可執行。

### 2026-06-27 — 修正 final package active docs 內部權威順序衝突

**背景：** 使用者要求在刪除原對話前，助理最後徹底確認所有檔案與資訊的完整性、準確性與合理性。助理先前回覆稱 final package 已可安全轉移，但使用者進一步指出：

`text 00-NEXUS-HANDOFF-START-HERE.md 中的「2.1 修正後的實際權威順序」 與目前 nexus-handoff-final/ 的既有文件結構產生衝突。 ```

使用者因此明確表達對助理工作準確性的疑慮。

**重新檢查結果：** 重新檢查 active docs 後：

`text README.md 00-NEXUS-HANDOFF-START-HERE.md 01-NEXUS-CANON.md 03-PROJECT-LOG.md 04-FINAL-REVIEW-2026-06-27.md 99-ZERO-LOSS-AUDIT.md ```

確認：

`text active docs 之間的權威順序已一致 最新進度已一致 錯誤舊引用已修正 歷史引用已標示為歷史 archive 與 audit 已重新生成 ```

最新 audit 結果：

`text Markdown files audited: 23 Image asset audited: yes Overall result: ✅ PASS ```

**結果：** 此問題已修正，並已將本次資訊紕漏與修正過程記錄於本日誌。

目前 final package 仍以：

`text nexus-handoff-final/ ```

為準。

目前下一步已更新為：

`text MVP-0 收斂與驗證：修正 content_json 保存、檢查檔案/依賴狀態、建立 manual QA checklist。 ```

<!-- END SOURCE: ALL-SOURCES-FULL-ARCHIVE.md | SOURCE 5 nexus-handoff-updated-2026-06-27/03-PROJECT-LOG.md -->

### 2026-06-27 — 建立 Next.js 專案

**結果：** 使用者貼出成功訊息：

`text Success! Created nexus at C:\\Users\\user\\Projects\\nexus ```

安裝過程顯示：

```text Installing dependencies:

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

```

### 2026-06-27 — 建立 Projects 資料夾

**結果：** 成功建立並進入：

`text C:\\Users\\user\\Projects ```

### 2026-06-27 — 文件交接包檢查與重整

**背景：** 使用者整理出一批最終 canon 文件，並詢問：

`text 裡面資訊是否有被遺漏？ 最新進度是否有被記錄？ ```

當時檢查的主要文件包括以下使用者整理檔名。注意：這是歷史工作記錄，不是目前 final package 的 active 文件結構：

`text 00-NEXUS-HANDOFF-START-HERE.md 01-PRODUCT-ARCHITECTURE-ROADMAP-CANON.md 02-IMPLEMENTATION-CANON.md 03-DECISION-LOG.md 04-GLOSSARY.md 05-DESIGN-SYSTEM.md 06-BEGINNER-OPERATION-GUIDE.md 90-PROJECT-REVIEW-2026-06-21.md 99-ZERO-LOSS-AUDIT.md 00-AI-HANDOFF.md ```

**結果：** 完成初版修正，但後續使用者要求：

`text 將所有文件都確認一次，將紕漏處理掉，重新生成最高效率文檔。 ```

### 2026-06-27 — 新增本工作進度日誌

**背景：** 使用者詢問是否已有：

`text 日誌這個內容 做了什麼事之類的詳細日誌 ```

確認目前已有：

`text 決策日誌 審視報告 零遺漏稽核 ```

但缺少：

`text 實際操作 / 工作進度日誌 ```

**命名原因：** `text 03：放在 00 入口、01 canon、02 source archive 之後，作為交接包中的第三類主動維護文件。 PROJECT-LOG：表示這是專案工作日誌，記錄實際做了什麼。 不是 CHANGELOG：因為目前還沒有正式產品版本 release。 不是 DECISION-LOG：因為決策原因已由 03-DECISION-LOG / archive 保留。 ```

**結果：** 本文件建立，用於後續持續記錄實際進度。

# 2026-06-27 — 本機環境與專案建立

### 2026-06-27 — 生成最終交接包 `nexus-handoff-final/`

**稽核結果：** `99-ZERO-LOSS-AUDIT.md` 顯示：

`text Markdown files audited: 18 Overall result: ✅ PASS Image copied: ✅ PASS ```

**結果：** 目前最終交接包應以：

`text nexus-handoff-final/ ```

為準。

### 2026-06-27 — 確認 Node / npm / Git 版本

**結果：** `text node -v       → v24.18.0 npm.cmd -v    → 11.16.0 git --version → git version 2.54.0.windows.1 ```

### 2026-06-27 — 確認編輯器

**結果：** `text Visual Studio Code ✅ ```

### 2026-06-27 晚間 — MVP-0 完工後更新：content_json 持久化、頁面刪除與交接文件再整理

**背景：** 使用者回報：在前一輪完成三欄 App Shell、IndexedDB、Tiptap 與 Markdown shortcut 後，又做了一批補充整理與實作，並要求：

`text 日誌須包含詳細過程：執行的動作、遇到的問題、解決方式等等。 剛剛做了一些事，請也歸入檔案。 ```

本段將使用者提供的新狀態整理為新的最新日誌。若此段與較早日誌衝突，以本段時間序較新者為準。

**2. MVP-0 構建與環境驗證回顧：** #### 執行的動作

`text 驗證 Next.js 16.2.9 成功啟動於 port 3000。 確認 localhost:3000 可開。 清理 create-next-app 預設畫面。 移除 Deploy Now / Documentation 等預設 Vercel 連結。 建立 Nexus 三欄式佈局。 ```

#### 遇到的問題

`text layout.tsx 原本使用 next/font/google 的 Geist 字體。 這與 local-first / 不依賴外部字體資源的方向不完全一致。 ```

#### 解決方式

`text 移除 Google Fonts 外部依賴。 改用系統字體 stack。 globals.css 改為 Nexus 極簡 design tokens。 ```

#### 結果

`text 三欄 layout 成功顯示。 Sidebar / Editor / Right Panel 結構成為 MVP-0 UI 基礎。 ```

### 2026-06-28 — MVP-0 健康檢查、Code Verify 收斂修復 與 MVP-1 Search v0 實作

**背景：** 新 AI 接手 Nexus 專案後，依循 `00-HANDOFF-STATUS-AND-AI-RULES.md` 的首要指令，不重談願景、不重建專案，直接啟動 PowerShell 導航模式進行 Step 0 健康檢查與 Step 1 Code Verify。

**結果：** - MVP-0 垂直切片驗證 100% 通過（能寫、能存、重開還在、軟刪除正常）。
- MVP-1 Search v0 運作正常（支援標題與正文即時記憶體過濾）。

### 2026-06-28 — MVP-1 Step 3：Sidebar Polish（側邊欄精修）

**背景：** 完成 Search v0 後，依循 MVP-1 實作順序推進側邊欄介面優化。

**結果：** 側邊欄視覺與互動規格對齊 Calm Productivity 原則。

### 2026-06-28 — MVP-1 Step 4：Tags First（標籤組織系統實作與並發修復）

**背景：** 完成側邊欄精修後，依循 MVP-1 實作順序推進輕量標籤系統。

**結果：** 標籤系統 CRUD 與多條件篩選運作正常；軟刪除徹底阻斷快取回寫。

### 2026-06-28 — MVP-1 Step 5：Lightweight Folders（輕量資料夾分組實作與字體放大）

**背景：** 完成標籤系統後，推進單層輕量資料夾歸屬與側邊欄自動歸類。

**結果：** 資料夾分組導航與字體縮放符合規格，重整後歸屬持久化正常。

### 2026-06-28 — MVP-1 Step 6：Backlinks（雙向連結實作與 MVP-1 完工）

**背景：** 完成輕量資料夾系統後，實作 MVP-1 最後一塊拼圖：Wikilink 雙向連結與知識關聯面板。

**結果：** 雙向連結關聯網解析與面板互動運作正常，MVP-1 規劃範疇全數實作完畢。

### 2026-06-28 — MVP-2 Step 2：Attachment data layer patch 進行中（StorageAdapter / IndexedDBAdapter）

**背景：** 在 MVP-2 規格定稿後，使用者選擇先從 data layer 下手，順序為 `types + StorageAdapter` 起步，並延伸到 `IndexedDBAdapter` 的 attachment / binary 基礎能力。由於 Arena 工作區內沒有實際專案 source code，採用「助理提供 patch、使用者手動修改、再貼回檢查」模式進行。

**目前檢查結果：** 1. 結構方向正確，以下項目已反映到使用者貼回版本：
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
   -…

**結果：** MVP-2 attachment data layer 已實際推進到幾乎完成的狀態，但仍需把貼上污染清回正常 TypeScript 原始碼，之後才能安全進入下一步 PDF import flow patch。

### 2026-06-28 — MVP-2 規格審查、調整定稿與決策補強

**背景：** 在確認 MVP-1 已完成後，使用者選擇先為第二階段（MVP-2）建立正式規格，而不是直接跳入實作。初版草案經審查後，進一步收斂成較穩定的研究工作流規格。

**結果：** MVP-2 規格完成審查與定稿，可正式納入 handoff / canon 文件，並作為接下來實作拆解的依據。

### 2026-06-28 — 對話壓縮續接資訊完整編入與 Step 2 狀態修正

**背景：** 在對話壓縮後，系統提供了一份「另一個語言模型已完成的思考摘要」，內容涵蓋 Nexus 目前所有關鍵狀態、使用者偏好、已完成事項、未完成事項與下一步。使用者隨後明確要求：

我對你的任務是將以下內容 完整且詳細的編入文檔裡 確保不要有任何資料的遺失

因此本次工作不是繼續寫程式，而是將壓縮後的續接資訊完整納入文件系統，並修正 `02-PROJECT-LOG-DETAILED.md` 中仍殘留的舊狀態。

**結果：** 對話壓縮摘要中的關鍵資訊已編入 active docs。 Step 2 狀態由「進行中 / 需清理污染」修正為「完成 / 污染僅為聊天貼上顯示問題」。 下一步明確收斂為 MVP-2 Step 3 PDF import flow patch。 執行 Step 3 前應先取得 NexusApp.tsx 與 types.ts。

### 2026-06-29 — Basic Notes Foundation Step 10：Markdown import / export v0 完成

**背景：** Editor formatting toolbar 完成後，助理提供下一步選項，使用者選擇：

C. Markdown import / export

**驗證結果：** 使用者最後回報：

這是 Markdown import / export v0，不是完整 Markdown parser。 測試成功

**結果：** Basic Notes Foundation Step 10：Markdown import / export v0 ✅ 完成

### 2026-06-29 — Basic Notes Foundation Step 10.1：Markdown v0.1 link syntax / task list 補強完成

**背景：** Markdown import / export v0 完成後，使用者選擇：

1. Markdown v0 補強：link syntax / task list

**結果：** Basic Notes Foundation Step 10.1：Markdown import / export v0.1 ✅ 完成

### 2026-06-29 — Basic Notes Foundation Step 7：Trash / Restore UI 完成與 NexusApp 整檔替換

**背景：** 在 PDF import / viewer 相關 Step 3～6 完成後，使用者表示：

繼續 我有點想先完善基本的筆記功能還是你不建議

助理建議先暫停 PDF layout，回頭完善基本筆記功能，理由是 PDF 匯入 / 檢視已可用，但基本筆記功能若不夠穩，後續 annotation / citation / research workflow 都會建立在不夠安全的基礎上。

助理建議第一優先做 Trash / Restore UI，因為既有資料層已有 soft delete，但 UI 尚無回收站可還原。使用者確認：

可以

**使用者驗證結果：** 使用者替換後回報：

正常 而且連垃圾功能之前被我刪除的檔案也在欸

助理判斷：這是正確且重要的結果，代表既有 delete 設計不是硬刪，而是 soft delete，過去被刪除的 pages 仍在 IndexedDB，只是 `deleted_at` 不為 null。

接著要求使用者做快速回歸測試：

1.新建一般筆記是否正常。
2.改 title 是否正常。
3.寫正文，刷新後是否還在。
4.tags 是否還能新增 / 刪除。
5.folder 是否還能設定。
6.backlinks 是否還能點。
7.Import PDF 是否還正常。
8.PDF viewer 的 Small / Medium / Large / Hide / Open 是否還正常。
9.Trash Restore 後刷新是否還存在。

使用者回報：

正常

**結果：** Basic Notes Foundation Step 7：Trash / Restore UI ✅ 完成

完成能力：

Notes / Trash 切換 Trash 顯示過去 soft-deleted pages 刪除後可進 Trash Restore 可還原 page Restore 後切回 Notes 並選中該 page 沒有永久刪除，維持資料安全 快速回歸測試通過

**後續建議：** 下一步建議先做安全拆檔：

1.Sidebar.tsx
2.RightPanel.tsx

暫不建議立刻做：

大型 hooks 重構 PDF annotation / highlight SQLite / Drizzle Permanent delete

### 2026-06-29 — Basic Notes Foundation Step 8：Permanent Delete / Duplicate Page 完成

**背景：** 在 Trash / Restore UI 完成後，使用者澄清拆檔不是必要，只是不了解一般檔案行數，並提出：

還有如果進垃圾桶後想完整刪除可以嗎 然後你乾脆把基本功能先做我直接測試

助理判斷：

拆檔不是現在必要功能。 1000 多行在原型階段正常。 使用者目前更需要基本功能補齊。

因此本次直接生成可替換檔案，補上 Trash permanent delete 與 Duplicate page。

**重要設計邊界：** 一般 Delete 仍是 soft delete。 永久 Delete 只在 Trash 裡提供。 Permanent delete 第一版只刪 page record。 不自動清 attachment / binary，避免誤刪可能共用的 PDF 附件。 Duplicate PDF research note 時共用同一個 attachment，不重複 binary。

**使用者驗證：** 使用者替換並測試後回報：

正常

**結果：** Basic Notes Foundation Step 8：Permanent Delete / Duplicate Page ✅ 完成

**後續建議：** 若繼續基本筆記功能，下一步建議：

Editor formatting toolbar

需要先取得 / 檢視：

src/components/TiptapEditor.tsx

### 2026-06-29 — Basic Notes Foundation Step 9：Editor formatting toolbar 完成

**背景：** Basic Notes Foundation Step 8 完成後，下一步建議為 Editor formatting toolbar。使用者貼出 `src/components/TiptapEditor.tsx`。檢視後確認該檔案乾淨，使用：

@tiptap/core Editor StarterKit Placeholder Typography onChangeRef 防閉包雷 切換頁面時 setContent(content)

**結果：** Basic Notes Foundation Step 9：Editor formatting toolbar ✅ 完成

**後續建議：** 下一步可繼續基本筆記 polish：

Toolbar UX polish Page actions polish Editor empty state / placeholder polish Markdown import / export（若使用者需要）

### 2026-06-29 — MVP-2 Step 3 / Step 4 / Step 4-C：PDF import flow 與 PDF viewer 最小版完成

**背景：** 使用者確認要繼續實作 Nexus，依交接文件目前主線直接進入 MVP-2 Step 3。依 D-57，實作前先要求使用者提供目前關鍵檔案內容：

src/components/NexusApp.tsx src/lib/types.ts src/lib/StorageAdapter.ts src/lib/IndexedDBAdapter.ts

使用者透過 PowerShell 印出並貼上。貼文中仍出現 `&lt;`、`=&gt;`、`[Date.now](http://Date.now)()` 等聊天渲染污染，但依先前澄清，VS Code 本機 source 為正常內容，因此不要求清理不存在於本機的污染。

**Step 3 驗證結果：** 使用者回報：

能顯示檔名跟PDF Notes Source PDF: 02_Enemy_Design_給人看的版本.pdf 這樣是對的嗎 沒有內容

判斷：這是 Step 3 正常結果，因為 Step 3 只做 PDF import flow，尚未做 PDF viewer。

**最終結果：** MVP-2 Step 3 PDF import flow：✅ 完成並由使用者回報正常 MVP-2 Step 4 PDF viewer 最小版：✅ 完成並由使用者回報 PDF 正常檢視 MVP-2 Step 4-C viewer polish：✅ 完成並由使用者回報正常

目前已具備：

本地 PDF 選檔 attachment metadata 建立 PDF binary 存入 IndexedDB binaries store 自動建立 research note page Page 與 attachment 關聯 active_page_id 持久化 PDF banner PDF Preview iframe Open in new tab

**後續建議：** 下一步建議：

MVP-2 Step 5：PDF research note layout polish

建議方向：

改善 PDF viewer 與筆記區的閱讀 / 書寫布局。 可評估上下分割、左右分割、可收合 viewer、viewer 高度調整。 暫不做 annotation / highlight。 暫不做 citation parser。 暫不引入 SQLite / Drizzle。

### 2026-06-29 — MVP-2 Step 5 / Step 6：PDF viewer layout polish 與錯誤狀態完成

**背景：** 在 Step 3 PDF import flow、Step 4 PDF viewer 最小版、Step 4-C Open 按鈕完成後，使用者要求繼續下一步。助理決定先做低風險但實用的 PDF research note layout polish，而不是 annotation / highlight。

**後續建議：** 下一步建議：

MVP-2 Step 7：PDF research workspace layout evaluation

可評估：

左右分欄：左 PDF、右筆記。 sticky PDF viewer。 可調整分割比例。 是否保存 viewer layout preference。

仍不做：

annotation / highlight 複雜 PDF.js annotation layer citation parser SQLite / Drizzle 遷移


## 2026-07


### 2026-07-02 — 歷史決策 D 編號完整補錄

> 以下為當日或前後工作階段原決策登記；若日期是依該 Track 所屬工作階段歸檔，精確建立日請回查原始紀錄。

#### 15.1 決策 D-107～D-108（Track A：Link / TaskList / TaskItem）

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



#### 15.2 決策 D-109～D-110（Track E：Workspace Backup / Export package v0）

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



#### 15.3 決策 D-111（Track A2：Bulk Select）與 D-112（協作模式：工作區直接維護代碼）

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



#### 15.4 決策 D-113（Track C：Study Set kind 欄位）與 D-114（NexusApp.tsx 拆檔）

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



#### 15.5 決策 D-115（Table block）與 D-116（package.json 交付規則）

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



#### 15.6 決策 D-117（Callout isolating 修正）與 D-118（jsdom 真實 Editor 驗證方法）

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



#### 15.7 決策 D-119（updateBlockMath/deleteBlockMath 必須傳 pos）、D-120（Table import 補齊）、D-121（模糊回報需先確認現象）

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



#### 15.8 決策 D-122（transaction 位置計算須用 tr.doc）、D-123（插入空節點 + selectNode 取代 window.prompt）

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



#### 15.9 決策 D-124（Track G：Command Palette）與 D-125（Track G：Dashboard / Home v0 提前落地）

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



#### 15.10 決策 D-126（Import 選單維持獨立於「新增」入口）與 D-128（重新命名採原地輸入框互動）

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



#### 15.11 決策 D-130（PageItemMenu 選單邊界防呆）與 D-131（工具列「插入內容」統整為單一下拉選單）

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



#### 15.12 決策 D-132（Notion 風格 Drag Handle：NodeRange 依賴順序）與 D-133（帳號系統範圍維持既有原則）

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



#### 15.13 決策 D-135（ResizablePanel 抽出為獨立容器）與 D-136（收合觸發點回歸標頭列，取代浮動邊緣按鈕）

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



#### 15.14 決策 D-138（Sidebar 底部留白說明性註解）與 D-139（ResizablePanel 新增 bottomInset prop）

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



#### 15.15 決策 D-140～D-146（Track L/M：Document kind、新建入口收斂、Note 富文字排版分級、匯出範圍分級、帳號設定移入 Sidebar、拖曳把手觸發範圍）

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





### 2026-07-02 — 舊決策登記原文補充（D-01 及其後續 Track）

> 下方內容來自 02 所封存的早期決策登記，保留當時的背景與取捨；被後續日期替代者不可視為現行規格。為避免重要理由只留在封存檔，將原始決策段落納入 HISTORY；排版層級由原標題轉成歷史附錄子節。

#### 13. 決策 D-01～D-43

##### 13.1 決策總覽

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

##### 13.2 不可推翻決策

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

##### 13.3 D-39～D-43 補強決策

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

##### 13.4 D-44～D-48 MVP-1 完工補強決策

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

##### 13.5 D-49～D-55 MVP-2 規格定稿決策

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

##### 13.6 D-56～D-57 文件治理與 Step 3 續接決策

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



#### 14. vNext Architecture & Feature Decisions（2026-07-02 最新產品 / 架構共識）

> 本節是 2026-07-02 使用者要求「現在確定大部分功能與架構，避免未來大功能導致重做」後新增。若本文件前文仍以較寬泛的 all-in-one workspace 描述 Nexus，以本節修正後定位為準：Nexus 是 **local-first 個人學習與知識生成 workspace**，支援多種高層級生成物，但早期不追求完整企業 workspace / Wix / Notion / Canva clone。

##### 14.1 產品定位修正

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

##### 14.2 Creatables / Views / Tools 最終分類

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

##### 14.3 Page Shell + Mode-specific Data

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

##### 14.4 Note（筆記）與 Document（文檔）邊界

Note（筆記）：

```

最重要核心。 Native editor 體驗優先。 支援多元 block：image、table、task、callout、LaTeX、link、asset embed 等。 不被 Markdown 完整相容限制。 Markdown export 是 best-effort。 完整保真未來靠 .nexus.json / workspace backup。

```

Document（文檔）：

```

獨立 creatable。 偏正式寫作、Markdown source / preview、普通閱讀模式、匯入 / 匯出。 不一定需要圖片。 適合文章、報告、正式文稿、可發布內容。

```

##### 14.5 Study Set / Quiz（學習集 / 測驗 / 字卡）

Study Set 是獨立 creatable。

基本需求：

```

手動輸入中文 / 英文。 翻頁字卡模式。 四選一測驗，可選英文或中文翻譯。 拼寫模式。 CSV / TSV / 試算表 / Quizlet-like table 匯入。 後續可從 Note / PDF / Document 生成。 AI 可後續加入，但不作早期依賴。

```

資料模型方向：

```

Deck = Page Card = StudyItem Quiz mode = StudyItem 的不同練習模式 StudyAttempt = 練習紀錄 ReviewState = 複習排程 / 熟練度

```

##### 14.6 Presentation（簡報）

Presentation 保留為 Core Creatable，但早期 scope 降級：

```

早期：Gamma-like outline / document-to-slides。 中期：slide layout / theme / table / simple visual blocks。 後期：才考慮 Canva-like free design。

```

避免早期做：

```

完整自由拖拉 圖層 動畫 多人協作 完整 Canva-like 設計器

```

##### 14.7 Canvas（畫布）

Canvas 保留為 Core Creatable，但早期 scope 降級：

```

nodes edges 文字卡片 引用 Page / Block / Attachment / Study Set 簡單 layout

```

避免早期做：

```

完整白板 自由繪圖 多人協作 Canva-like design tools

```

##### 14.8 Website / Publish Project（網站 / 發布專案）

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

##### 14.9 Quick Capture / Inbox（快速收集 / 收件匣）

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

##### 14.10 Reading / Library / Reference / Asset 邊界

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

##### 14.11 Task / Todo / Calendar / Learning Path

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

##### 14.12 Source Reference / Provenance（來源引用 / 生成來源追蹤）

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

##### 14.13 Editor Block Roadmap（筆記編輯器區塊路線）

Note 是核心，因此 editor block roadmap 需要正式保留。

核心 block 方向：

```

Paragraph（段落） Heading（標題） Bullet List（項目清單） Ordered List（編號清單） Task List（待辦清單） Quote（引用） Code Block（程式碼區塊） Callout / Admonition（提示框 / 重點框） Image Block（圖片區塊） Table（表格） Equation / LaTeX（公式） Link（連結） PDF / Asset Embed（附件嵌入） Annotation Reference（標註引用）

```

##### 14.14 Backup / Migration / Search Scope

近期需要正式規劃：

```

Workspace Backup（工作區備份） Export entire workspace Import workspace backup Schema Version / Migration（資料結構版本 / 遷移） Search Index Scope（搜尋範圍）

```

原因：

```

Nexus local-first 最大風險是 IndexedDB / 瀏覽器資料遺失。 Backup / Export Package 應比完整 cloud sync 更早。 未來資料模型會新增 StudyItem、Annotation、Asset、Collection、PresentationData、CanvasData、WebsiteData，必須有 schema version / migration 意識。 Search 未來不只搜尋 Page.content_text，也要搜尋 Study cards、annotations、library items、reference items、asset names、presentation slides、canvas nodes 等。

```

---

##### 14.15 r15 Deep Review：Page kind vs default view mode

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

##### 14.16 r15 Deep Review：MVP-2 re-baseline / vNext tracks

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

##### 14.17 r15 Deep Review：Stable Block ID 補齊策略

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

##### 14.18 r15 Deep Review：Attachment storage_key v0 語意

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

##### 14.19 r15 Deep Review：Backup before Sync

D-93 已把 Sync 降級為 Backup first。r15 再次確認：隨著 pages / attachments / binaries 增加，Workspace Backup / Export package v0 應提早到近期。

建議 v0：

```

先支援 export workspace backup JSON。 包含 pages、attachments metadata、settings、schema_version。 PDF / image binary 可先不含，或第二階段以 base64 / separate files 支援。 先 export，不急著做完整 restore / import。

```




#### 15. 決策 D-70～D-106（vNext Architecture + r15 Deep Review）

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



### 2026-07-02 — Editor Blocks Foundation：Callout 完成（含已知未解問題），建立 jsdom 真實 Editor 排查方法

**背景：** Table 完成後，依既定分批順序推進 Callout。動工前確認範圍：variant（顏色類型）與 icon（圖示） 分開設定，比照 Notion 做法；5 種顏色類型（info/warning/success/danger/note）；圖示可挑選或移除。

**驗證方法升級：純邏輯測試 + jsdom 真實 Editor 測試：** 1. 純邏輯層：直接呼叫 pageToMarkdown() / createMarkdownContent()，測試 export/import round-trip。
   此階段抓到一個真實 bug：Callout 內多段落 export 時未用空白引用行分隔，reimport 時被誤合併成一段。
   已修正 calloutToMarkdown() 用 "\n\n" 分隔不同 block，重新測試四項全過。
2. DOM 互動層：暫裝 jsdom + tsx（驗證完即移除，不寫入 package.json），
   建立真正的 @tiptap/core Editor 實例，模擬使用者點擊完整流程，檢查 ProseMirror 文件狀態。
npx tsc --noEmit 與 npx next build 皆通過後交付使用者測試。

**使用者測試結果與問題排查：** 使用者回報：

1. 插入 Callout → 再點一次按鈕解開 → 失敗
2. 點圖示選單 → 失敗
3. 切換 5 種類型下拉選單 → 成功
4. Export MD 語法 → 成功
#### 問題 1（解開失敗）排查與修正 — 已解決

用 jsdom 建立真實 Editor 實例，直接呼叫 editor.commands.lift("callout")，
發現回傳 false。判斷是 Callout node 設定的 isolating: true 阻擋了 lift 指令
（isolating 會阻止一般編輯操作跨越節點邊界，連 lift 都被一併擋住）。
移除 isolating: true 後重新測試，lift 回傳 true 且正確恢復成一般段落。
使用者重新測試後回報「成功」。
#### 問題 2（圖示選單點擊無效）排查與修正嘗試 — 未解決

比對使用者回報「下拉選單有效、圖示按鈕無效」的不對稱線索，發現下拉選單
（variantSelect）已有 mousedown 事件保護，但圖示按鈕與選單內按鈕皆缺少同樣保護。
依 Tiptap 官方 TaskItem 節點原始碼的既有模式（mousedown 階段 preventDefault，
避免 ProseMirror 搶先把點擊當成內容選取處理），為 iconButton 與所有選單按鈕補上
mousedown 攔截。jsdom 測試中此修正後邏輯運作正確（選單開啟、選取圖示、更新 attrs
皆符合預期）。但使…

**結果：** Callout 大部分功能完成並驗證通過（插入、切換類型、解開、Export MD 語法）。
圖示選單點擊在真實瀏覽器中仍無效，為已知未解問題，記錄在案，
下一個接手者不應假設此問題已解決。
建立 jsdom + 真實 Editor 實例的驗證方法，作為未來複雜自訂 Tiptap Node 的標準做法之一，
但同時記錄其限制：jsdom 測試通過不保證真實瀏覽器行為一致。

**後續建議：** 下一步候選：
1. Editor Blocks Foundation — LaTeX / Equation（依既定分批順序，最後一批）
2. Track C 後續擴充：四選一測驗、拼寫模式、CSV / TSV 匯入
3. Track D — Research
4. Track F — Creatable Registry / Create Center
5.（可延後）回頭排查 Callout 圖示選單在真實瀏覽器中點擊無效的問題
Image block 已依使用者要求擱置。

### 2026-07-02 — Editor Blocks Foundation：LaTeX / Block Math 完成（三批全數完成），補齊 Table Import 遺漏

**背景：** Callout 完成後，依既定分批順序推進最後一批 LaTeX / Equation。動工前確認範圍：只做單獨段落公式（block equation），不做行內公式；使用者確認這不是架構限制，未來加行內公式屬低風險追加動作。使用者熟悉 LaTeX 語法，不需要額外符號快捷按鈕。

**驗證：** npx tsc --noEmit：零錯誤（多輪，含乾淨環境重新安裝後再測試）。
npx next build（Turbopack production build）：成功。
jsdom + 真實 Editor 測試：插入/編輯/刪除公式流程、Markdown round-trip（含多行 LaTeX）、
  混合 block 迴歸測試，全數通過。

**結果：** LaTeX / Block Math 完成並驗證通過。
Editor Blocks Foundation 三批（Table、Callout、LaTeX）至此全數完成。
過程中補齊 Table Markdown 匯入的舊缺口（原本只有單向匯出）。
累積可重用排查教訓：官方 extension 指令的 pos 參數依賴、混合 block 迴歸測試的重要性、
  使用者模糊回報問題時應先確認具體現象再排查方向。

**後續建議：** Editor Blocks Foundation 三批全數完成，下一步候選：
1. Track C 後續擴充：四選一測驗、拼寫模式、CSV / TSV 匯入
2. Track D — Research（PDF viewer polish / citation metadata / annotation later）
3. Track F — Creatable Registry / Create Center
4.（可延後）回頭排查 Callout 圖示選單在真實瀏覽器中點擊無效的問題
5.（可延後）評估加入 InlineMath（行內公式），為低風險追加動作
Image block 已依使用者要求擱置。

### 2026-07-02 — Editor Blocks Foundation：LaTeX 改版為 Obsidian 風格原地編輯公式，取代官方 $$/$$$ prompt 版本

**背景：** 上一則日誌記錄的 LaTeX / Block Math 版本完成後，使用者事後提出更高的體驗要求：希望公式編輯體驗改為真正的 **Obsidian 風格「原地編輯」**——點擊公式直接展開成可編輯原始碼、離開自動收合渲染、方向鍵可穿越公式邊界、打字 `$...$` / `$$...$$` 直接即時轉換，不再跳出 `window.prompt()` 對話框。

使用者帶入了**另一個獨立的 AI 對話串**先前嘗試做這件事、卻連續崩潰兩次的完整對話紀錄，要求本次由此串接手重做，並要求「不要只是眼睛看過去，要真的用官方 API 與真實測試驗證」。

**驗證：** npx tsc --noEmit：零錯誤（修正過程中發現並修正一次型別錯誤：keydown 事件
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
    Escape …

**誠實揭露：尚未做的驗證：** 尚未在真實瀏覽器（使用者的 VS Code + Windows 環境）中實際點擊、打字測試過。
jsdom 測試只能驗證邏輯層級行為正確，不能保證真實瀏覽器的 focus / selection /
輸入法（IME）等瀏覽器特有行為完全一致——Callout 圖示選單就是 jsdom 全過但真實
瀏覽器失敗的先例（D-118），不可假設本次一定沒有類似落差。此功能狀態應標示為
「已通過自動化驗證，待使用者真實瀏覽器確認」，不可標示為「已完成並驗證」。

**結果：** Obsidian 風格公式編輯（原地編輯 + $/$$ 語法）已完成實作，並通過 tsc / build /
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

**後續建議：** 1. 請使用者在真實瀏覽器實際測試：打字即時轉換、點擊原地編輯、方向鍵穿越邊界、
   Toolbar 按鈕插入後自動進入編輯狀態、舊版 $$/$$$ 語法檔案重新匯入的行為
   （設計為不自動遷移，需人工調整，此邊界需明確告知使用者）。
2. 使用者確認真實瀏覽器行為正確後，才能將狀態升級為「已完成並由使用者驗證」。
3. 若真實瀏覽器測試發現問題，優先比對是否為 D-118 類型的「jsdom 過但瀏覽器
   沒過」落差，而非直接假設是同一類邏輯錯誤重新排查（呼應 D-121 精神）。
4. Callout 圖示選單在真實瀏覽器點擊無效的問題仍未解決，本次改動未觸碰該部分，
   狀態不變，使用者仍判斷為不急迫、可擱置。

### 2026-07-02 — Editor Blocks Foundation：Table 完成，package.json 部署排查案例

**背景：** 拆檔完成並驗證後，使用者選擇下一步方向為「繼續 Editor Blocks（Image / Table / Callout / LaTeX）」。動工前先評估四種 block 的複雜度差異，並與使用者確認分批順序。使用者指示：Image 迫切性較低、先擱置；確認分批順序為 Table → Callout → LaTeX（LaTeX 最後）。

**驗證：** npx tsc --noEmit：零錯誤。
npx next build（Turbopack production build）：成功。

**結果：** Table block 完成並驗證通過（含本機部署問題排查）。
訂立 package.json 交付規則，避免未來重複發生類似部署落差。

**後續建議：** 下一步候選：
1. Editor Blocks Foundation — Callout（依既定分批順序，下一批）
2. Editor Blocks Foundation — LaTeX / Equation（最後一批）
3. Study Set 後續擴充：四選一測驗、拼寫模式、CSV / TSV 匯入
4. Track D — Research
5. Track F — Creatable Registry / Create Center
Image block 已依使用者要求擱置，待後續討論。

### 2026-07-02 — NexusApp.tsx 拆檔：2301 行 → 864 行

**背景：** 使用者於 Track C 驗證通過後主動提出：

沒有破壞任何行為

然後我們現在app的基本架構出來了 我覺得nexus可以可慮拆檔

然後你可以繼續下一步了
判斷此為合適時機：應用基本架構（Note / PDF Research / Study Set 三種 Page 類型）已跑穩， 且呼應既有決策 D-63（NexusApp.tsx 超過 1000 行後，優先拆純 UI component，暫緩拆 hooks）。

**驗證方式：** 從乾淨環境重新執行 npm install → npx tsc --noEmit（零錯誤）→ npx next build
（Turbopack production build 成功），執行兩輪確認結果一致。
手動逐一檢查每個拆出檔案的 import 是否皆有實際使用，確認無殘留無用 import。

**使用者驗證結果：** 使用者下載整包 `src/` 覆蓋本機後完整回歸測試，回報：

沒有破壞任何行為

**結果：** 拆檔完成並驗證通過，未破壞任何既有行為。
NexusApp.tsx 從 2301 行降至 864 行，可維護性提升。

**後續建議：** 下一步候選（尚未由使用者選定）：
1. Study Set 後續擴充：四選一測驗、拼寫模式、CSV / TSV 匯入
2. Track D — Research（PDF viewer polish / citation metadata / annotation later）
3. Track F — Creatable Registry / Create Center
4. 繼續 Editor Blocks Foundation（Image / Table / Callout / LaTeX）
Dashboard / Home 仍暫緩，待近期 tracks 告一段落後再評估。

### 2026-07-02 — r15 Deep Review：文件矛盾、架構語意與近期 tracks 修正

**背景：** 使用者在 r14 vNext 架構分類與大型功能邊界整理完成後，要求：

對現在所有檔案與資訊進行一次深度且完整的整理資訊、分析檔案問題與提出建議，考量是否有決策能被優化或不明智，或是有文件內容、資訊上的矛盾與遺漏，達成方案最佳化的結果

**決策補強：** 本次補入 D-102～D-106：

D-102 — Page kind 與 default view mode 必須拆分
D-103 — MVP-2 改以 vNext tracks 管理，避免無限膨脹
D-104 — Stable Block ID 是近期底層修補，不阻塞 Page-level backlinks
D-105 — IndexedDB v0 binary key 暫用 attachment.id，storage_key 保留給未來 adapter / migration
D-106 — Workspace Backup v0 應早於 Sync / Version History 完整化

**結果：** 沒有推翻 r14 大方向。
確認 Nexus 目前方向正確。
將最重要的語意矛盾 default_mode 拆分為 Page kind / default_view_mode 的中期方向。
將近期開發改以 Editor Blocks、Capture & Inbox、Learning Core、Research、Safety Backup、Creatable Registry 等 tracks 管理。

**後續建議：** 下一步開發仍需由使用者選擇。
最適合小步實作的候選：Link extension、TaskList / TaskItem、Workspace Backup v0、Quick Capture / Inbox v0、Study Set / Flashcard v0。

### 2026-07-02 — Track A（Editor Blocks Foundation 第一批）：Link / TaskList / TaskItem 完成

**背景：** r15 提出 vNext tracks（A~F）管理近期開發後，使用者要求「能先處理的小事項都可以直接先做」，並上傳 `types.ts`、`TiptapEditor.tsx`、`package.json`、`NexusApp.tsx` 供分析。經風險評估後，確認 Track A 中的 Link extension 與 TaskList / TaskItem extension 風險最低、範圍集中在 `TiptapEditor.tsx` 與 `NexusApp.tsx` 的 Markdown 轉換函式，適合作為下一步。

**關鍵設計決策：** StarterKit.configure({ link: false }) 關閉內建 Link，改用獨立設定的 Link extension，避免同名 extension 衝突。
Link 採 openOnClick: false + toolbar prompt() 設定連結，避免編輯時誤觸跳轉。
TaskItem 設定 nested: true。
Markdown v0.2 的 taskList / link 節點與 v0.1 的文字符號資料可並存，export 邏輯分別處理。

**使用者驗證結果：** 使用者完成完整測試後回報「都通過」，並特別確認「可點擊但不跳轉」為預期行為（非 bug），因為 openOnClick 設為 false。

測試涵蓋：

Link 設定 / 修改 / 移除
Task list checkbox 勾選與刪除線樣式
Export MD（task 與 link 語法還原）
Import 含連結與 task 的 .md 檔
v0.1 舊資料（☐/☑ 文字符號）export 向後相容
一般 regression：新建/刪除筆記、tags、folder、backlinks、PDF import、Trash/Restore

**結果：** Track A 第一批（Link + TaskList/TaskItem）完成並驗證通過。
未推翻任何既有決策；content_json 仍是唯一真相，StorageAdapter 抽象未受影響。

**後續建議：** 使用者指示「下一步維持順序節奏可以快點沒關係」，依 r15 建議順序（使用者確認的優先序：Backup → Capture → Study Set）推進：

下一步：Track E — Workspace Backup / Export package v0
之後：Track B — Quick Capture / Inbox v0
之後：Track C — Study Set / Flashcard v0

### 2026-07-02 — Track A2：Bulk Select 完成，協作模式改為工作區直接維護代碼

**背景：** Track B（Quick Capture / Inbox v0）完成並驗證通過後，使用者提出兩個問題：

1. 首頁（Dashboard / Home）什麼時候會做？
2. 可否新增多選功能，同時選擇多個檔案刪除或復原？
針對問題 1，判斷 Dashboard / Home 屬於 r14 System Views 分類，尚未排入近期 vNext tracks A~F，建議待其他核心 creatable 更成熟後再評估，暫緩處理。

針對問題 2，判斷為低風險、高實用性、不需要新資料模型的 UI polish，命名為 Track A2，插隊在既定節奏中先做。實作前與使用者確認範圍：Notes 與 Trash 都要支援多選、採用「頂部 Select 模式按鈕」互動方式（而非常駐 checkbox）。

**關鍵設計決策：** 批次 Restore 完成後停留在 Trash 視圖，不自動切回 Notes（一次復原多篇無法判斷該選中哪一篇）。
批次永久刪除需二次確認並顯示數量。
不新增資料模型，不新增 StorageAdapter 介面方法。
使用者測試後回報「符合預期」。

**結果：** Track A2 完成並驗證通過。
協作模式正式調整為工作區直接維護代碼，降低使用者手動比對貼上的出錯風險，並提高每次交付前的驗證可靠度。
未推翻任何既有產品 / 架構決策。

**後續建議：** 下一步：Track C — Study Set / Flashcard v0（規模較大，需要新的資料模型：Deck / Card / StudyAttempt，
        動工前先與使用者確認範圍）
Dashboard / Home 暫緩，待近期 tracks 告一段落後再評估
之後所有 track 的程式碼異動，一律採用「工作區直接維護 + 編譯驗證 + 使用者下載覆蓋」模式

### 2026-07-02 — Track C：Study Set / Flashcard v0 完成，並完成 NexusApp.tsx 拆檔

**背景：** Track A2 完成、協作模式改為工作區直接維護代碼後，使用者確認開始規劃 Track C。由於 Study Set 規模較大（需要新的資料模型），動工前先與使用者確認三個關鍵範圍問題：

1. v0 要先完成哪些練習模式？→ 使用者選擇：先只做翻頁字卡模式。
2. 複習進度追蹤要做到什麼程度？→ 使用者選擇：簡單的熟悉/不熟悉分類，不做完整 SRS。
3. CSV/TSV 匯入要和 v0 一起做嗎？→ 使用者選擇：v0 先手動建立，匯入後續再做。
進一步確認 Deck 開啟後的畫面型態，使用者選擇「專屬編輯/練習畫面」（不保留 Tiptap 編輯器），並詢問「這個後續可以改嗎」，助理確認可以，因為 UI 呈現方式與底層資料（study_items）分離，日後調整風險低。

最後確認翻頁練習的抽卡順序：優先練習「還不熟」的卡，並隨機排序；卡片欄位採用通用 Front / Back，不綁定特定語言。

**驗證：** npx tsc --noEmit：零錯誤。
npx next build（Turbopack production build）：成功，靜態頁面正確產出。
使用者下載測試：新建 Study Set、加卡片、練習流程、熟悉度分類邏輯，回報「正常」。

**結果：** Track C 完成並驗證通過。
新增 kind 欄位落地 r15 的 Page kind / default_view_mode 拆分方向，未推翻既有決策。

### 2026-07-02 — Track E：Workspace Backup / Export package v0 完成

**背景：** Track A（Link / TaskList / TaskItem）完成並驗證通過後，使用者指示「下一步維持順序節奏可以快點沒關係」，依 r15 建議與使用者確認的優先序（Backup → Capture → Study Set），推進 Track E — Workspace Backup / Export package v0。開始實作前，先向使用者確認兩個關鍵範圍問題：PDF binary 是否一併備份、Import 行為是否需要合併。使用者選擇「PDF binary 一併備份（base64）」與「Import 僅做完全覆蓋（v0 先做這個）」。

實作前依序取得並檢視：`src/lib/IndexedDBAdapter.ts`、`src/lib/StorageAdapter.ts`。

**關鍵設計決策：** Backup 檔案為單一 JSON，檔名 nexus-backup-YYYY-MM-DD-HHmm.json。
PDF / 圖片 binary 以 base64 一併打包進同一份 JSON，不使用另外的檔案或雲端儲存。
Import v0 僅支援完全覆蓋，不支援合併；合併邏輯延後評估。
Import 前二次確認，明確告知會覆蓋所有資料且無法復原。
清空與重寫四個 store 包在同一個 transaction 內，確保原子性。
Import 成功後自動 reload 頁面，避免 React state 與 IndexedDB 不同步。

**使用者驗證結果：** 使用者完成測試後回報「一切正常」，測試涵蓋：

建立含 tags / folder / links 的筆記與 PDF research note，並刪除一篇筆記進 Trash
Export Backup 下載並確認內容合理
清空環境後 Import Backup，二次確認提示正確出現
確認後筆記、Trash 內容、PDF binary、active_page_id 皆正確還原
一般 regression（新建 / 刪除筆記、Import PDF、Import MD、Link / Task 編輯）仍正常

**結果：** Track E 完成並驗證通過。
未推翻任何既有決策；content_json 仍是唯一真相，StorageAdapter 抽象維持一致風格（新方法設為可選）。
local-first 最大風險（資料遺失）現在有 v0 等級的保障能力。

**後續建議：** 下一步：Track B — Quick Capture / Inbox v0
之後：Track C — Study Set / Flashcard v0

### 2026-07-02 — vNext Architecture Discussion：Creatables / Views / Tools / Website 弱聯動定案

**背景：** Markdown import / export v0.1 完成後，使用者要求暫停繼續 coding，先思考 Nexus 最終應該能建立 / 生成哪些大方向的東西。使用者明確表示：

繼續討論 但不只是簡報 我想在現在確定大部分的功能跟架構
因為我怕後續想要的大功能會影響架構需要重新變成或很麻煩 所以趁現在先處理完
使用者也說明：

筆記/文檔/QUIZ這些是確定的且分開的
網站/簡報/待辦清單 這些要考慮是否是以上的附屬或額外獨立

**Website / Publish Project 討論結果：** 使用者表示原先想像接近 Wix / Linktree / 可分享網站頁，並詢問如果現在想法不明確，後續完善是否會導致 APP 重做。

最終結論：

只要現在確定 Website / Publish Project 是獨立或弱聯動模組，不混進 Note / Document 核心資料模型，後續完善 Website 通常不會導致整個 App 重做。
Website 安全邊界：

Website / Publish Project 是 Extended Creatable。
它是高層級分享 / 發布模組。
Note / Document 可以分享成網頁。
Note 不變成完整網站編輯器。
Website 可以引用 Note / Document / Asset / Collection。
Website 可以有少量網站專屬內容，例如 homepage、footer、button、link cards。
Website 不要求和來源強同步。
Website layout / routes / theme / sections 不塞進 Note content_json。
Website 分階段：

Phase 0：Export HTML
Phase 1：Share Page（分享頁）
Phase 2：Link Page / Landing Page（連結頁 / 單頁網站）
Phase 3：Publish Site（多頁發布網站）
Phase 4：Visual Website Edito…

**結果：** 本次討論形成一組 vNext architecture decisions，已寫入：

00-HANDOFF-STATUS-AND-AI-RULES.md 的 1I 最新續接狀態
01-CANON-SPEC-AND-DECISIONS.md 的 vNext Architecture & Feature Decisions 與 D-70～D-101
02-PROJECT-LOG-DETAILED.md 本日誌
99-ZERO-LOSS-AUDIT-AND-SOURCE-ARCHIVE.md r14 audit

**後續建議：** 完成架構邊界整理後，可回到功能實作。合理下一步候選：

1. 真正 Link extension
2. 真正 TaskItem / TaskList extension
3. Image block
4. Table block
5. Equation / LaTeX
6. Callout / Admonition block
7. Quick Capture / Inbox v0
8. Workspace Backup / Export package v0
9. Study Set / Flashcard v0 手動建立 + CSV / TSV 匯入
但本次討論的重點是避免未來重做，不代表下一步要立刻做所有大型功能。

### 2026-07-30 — Track G：Navigation & Overview（Command Palette + Dashboard / Home v0）完成

**背景：** 使用者在新的對話串中提供最終交接包（00 / 01 / 02 / 99 四份文件）與最新版 NexusApp.tsx
等原始碼全文（透過聊天貼上，出現 D-56 早已記錄過的同類污染：HTML escape、
自動連結化 [Date.now](...) / [e.target](...) 等 artifacts），要求「繼續製作」。
經 ask_user 澄清任務範圍後，使用者確認要「把基本的筆記功能與主頁面做完」，
進一步收斂為兩項具體功能：Command Palette（快速命令面板）與 Dashboard / Home 首頁。
Dashboard / Home 先前在 1M/1N 節被列為「暫緩，待近期 tracks 告一段落後再評估」，
本次由使用者主動指名，且 Track A~F、Track A2 皆已完成，判斷時機已成熟。

**行動：** 1. 依 D-56 既定原則，識別並清理聊天貼上造成的富文字污染（不是使用者本機 source
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
   state、全域 keydo…

**原因：** 使用者操作疏失（不小心重複貼上），非邏輯或程式碼問題。

**解決方式：** 依 D-121「使用者以模糊描述回報問題時，應先確認具體現象再排查」的既定原則類推，
面對「內容重複」的異常情況，先用 ask_user 確認使用者意圖（是否為誤貼、
是否有另一份要重新確認的版本），而非直接假設並自行決定如何處理，
確認為單純重複貼上後才繼續原定流程。

**結果：** Track G（Command Palette + Dashboard / Home v0）已完成，通過 tsc / build /
production server 三層驗證，並由使用者下載覆蓋回本機後於真實瀏覽器
（Windows + npm.cmd run dev）實機測試，回報「一切正常」。
package.json 全程未變動（本次未新增任何 npm 套件），因此不需要提醒使用者
重新 npm install，但仍在回覆中與文件中明確記錄「已檢查、確認未變動」。

### 2026-07-30 — Track H～M：Preferences/i18n、Sidebar UX、Drag Handle、Resizable Layout、Document kind、Note 富文字排版與匯出分級完成（回溯性補記）

**背景：** 使用者在 Track G 完成後的同一個工作階段中，陸續提出多輪需求：
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

**行動：** 詳細的檔案異動、資料模型變更、canon 內容已完整記錄於：
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
  Track M：TiptapEditor vari…

**原因：** 問題 1：屬於對 Tiptap 官方套件生態不夠熟悉導致的多餘操作，非設計
  錯誤；已透過查閱套件實際匯出內容（TextStyleKit 定義）確認正確
  用法。
問題 2：@tiptap/extension-drag-handle 的行為沒有在官方文件中明確
  說明「偵測範圍限定在內容元素本身」這個細節，需要直接讀套件原始碼
  才能確認。
問題 3：見上方深度審核日誌條目的原因分析（Playwright 選擇器精確度）。

**解決方式：** 問題 1：npm uninstall 移除多餘套件，改用 TextStyleKit.configure()
  精確控制要啟用的子功能。
問題 2：改用 CSS 負外距 + 對稱內距技巧擴大可偵測範圍，不修改
  第三方套件原始碼。
問題 3：用更精確的 Playwright 選擇器（正則錨定開頭）重新驗證，
  確認功能本身正常，修正先前的誤判記錄。

**結果：** Track H~M 六項功能全數完成，通過 npx tsc --noEmit（零錯誤）與
  npx next build（Turbopack production build 成功），並用 Playwright
  headless Chromium 對 Track L/M 的關鍵互動邏輯（不只是元素是否存在，
  也包含點擊後 DOM 是否真的套用對應樣式）進行實測驗證，詳細驗證
  項目清單見 00 文件 1U.8 節。
package.json 新增三個 Tiptap 相關套件（@tiptap/extension-text-style、
  @tiptap/extension-text-align、@tiptap/extension-highlight），
  均為精確版本 3.27.1（--save-exact），package.json 的
  overrides 欄位維持鎖定 @tiptap/core 與 @tiptap/pm 版本一致，
  npm ls @tiptap/core 確認整棵依賴樹只有單一版本。

### 2026-07-30 — 深度審核：00/01/02/99 四份交接文件的整理、完善、問題分析與建議

**背景：** 使用者在同一輪對話中提出九點需求，前八點是功能性需求（Track L/M 的
內容，見下方對應日誌條目），第九點要求「對現有四份交接文件進行一次
深度且完整的整理、完善、分析問題與提出建議，考量決策是否可優化、
是否有矛盾或遺漏內容，達成方案最佳化」。使用者已透過 ask_user 明確
選擇「等這輪程式碼改完之後再做」，因此在第 1~8 點全部完成並通過
tsc / build / Playwright 驗證後，才開始本次審核工作。

**行動：** 1. 逐份重新閱讀 00 / 01 / 02 / 99 四份文件的章節結構與最新狀態摘要，
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
   選擇器驗證後，證實是先前的…

**原因：** 問題 1 的根因：Track H~M 是在同一個工作階段中連續完成的，重心放在
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

**解決方式：** 問題 1：已於 00 文件新增 1U 節、01 文件新增 15.10~15.15 節與 8.25~
  8.30 節完整補記，不修改程式碼本身（因為程式碼本身沒有問題，
  只是記錄缺失）。
問題 2：已在 00 文件第 12 節記錄為 R-1（建議優先修正的待辦事項），
  本輪明確不順手修正（避免在「文件審核」這個任務範圍內意外夾帶
  程式碼變更，保持任務邊界清晰，且修正前也應該依既有協作原則先
  用 ask_user 確認），留給使用者下一輪決定是否要修正。
問題 3：已在 00 文件 1U.9 節新增「排查方法論補充」，記錄這個
  Playwright 選擇器精確度的教訓，供未來寫類似測試時參考，避免
  重蹈覆轍浪費排查時間。

**結果：** 00/01/02/99 四份文件的最新狀態、決策清單、檔案結構表已完全同步至
  程式碼實際內容，決策編號從 D-01 連續記錄到 D-146（含空缺編號的
  透明說明），沒有斷層。
發現並記錄了一項真實存在、但影響輕微的視覺缺陷（R-1），尚待下一輪
  修正；發現並澄清了一則先前的誤判記錄（Note 富文字工具列其實一直
  正常運作）。
本次審核沒有發現任何需要回滾或推翻的既有核心決策，Nexus 的核心
  架構原則（Page/Block 統一模型、content_json 真相、StorageAdapter、
  soft delete、local-first）維持健康。

### 2026-07-31 — 歷史決策 D 編號完整補錄

> 以下為當日或前後工作階段原決策登記；若日期是依該 Track 所屬工作階段歸檔，精確建立日請回查原始紀錄。

#### 15.16 決策 D-147～D-156（Supabase 雲端同步 + UI 改善）

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



### 2026-07-31 — Supabase 雲端同步 + UI 改善（側邊欄拖拽、格式選擇、字樣、色票、學習集測驗）

**背景：** 使用者要求：
1. 實現多裝置即時同步（任何人打開同一網址即可共享資料）
2. 側邊欄項目隨時可拖拽（拉出/拉入子頁）
3. 子頁新建時可選擇類型
4. 側邊欄「+」按鈕新建筆記/文檔時應跳出格式選擇
5. 排序下拉新增「依照項目類型」勾選框
6. 工具列「字樣」改為與字型同樣式
7. 標題間距加大
8. 學習集新增 CSV 匯入和四選一測驗
9. 雙擊間隔縮小（減少誤觸）

**行動：** 1. 建立 Supabase 專案（ekwljqtenrmrijlmscnv.supabase.co）
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
1…

**解決方式：** 1. SyncEngine 中使用 `as unknown as Record<string, unknown>` 進行型別轉換。
2. NewPageDialog 新增 useEffect 監聽 initialKind，自動跳到 format 步驟。
3. 自訂雙擊偵測：lastClickTimeRef + lastClickIdRef，350ms 間隔。
4. NexusApp 新增 sidebarNewDialogKind state，handleCreateItem 改為設定 state。

**結果：** 所有改動通過 tsc --noEmit + next build 驗證。
新增決策 D-147 到 D-156。
使用者可透過 Supabase URL 在任何裝置打開 Nexus，資料即時同步。

**新增決策：** D-147: Supabase 共享工作區同步（無登入，即時同步）
D-148: 環境變數管理 Supabase 連線
D-149: SyncEngine 架構
D-150: 側邊欄「+」按鈕顯示格式選擇對話框
D-151: 排序下拉新增「依照項目類型」勾選框
D-152: 隨時拖拽 + 位置感知 drop zones
D-153: 子頁類型選擇
D-154: 自訂雙擊間隔（350ms）
D-155: 工具列「字樣」改為 select 樣式
D-156: ColorPaletteButton 色票選色器


### 2026-07-31 — 使用者決策原文補充

#### 1W. 2026-07-31 使用者決策確認（下一個 AI 必讀）

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



## 2026-08

### 2026-08-01 — 歷史決策 D 編號完整補錄

> 以下為當日或前後工作階段原決策登記；若日期是依該 Track 所屬工作階段歸檔，精確建立日請回查原始紀錄。

#### 15.17 決策 D-157~D-172（本次 5任務+8點+簡報直觀+圖表分區+優化）

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



#### 15.18 決策 D-173~D-185（工具列置頂、排版同格、真正分頁、夜間適配、表格右鍵、空白頁刪除等）

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



### 2026-08-01 — 5點回饋之圖表分區與子頁恢復（嚴禁刪減）

1. 子頁與重新排列被移除，嚴厲制止自行刪減：從693行完整版恢復，清理亂碼，保留childMap, expandedIds, dragOver, folderedGroups等
2. 長條圖歸類為數據圖表，圖表裡分區並新增文字圖表：ChartTypeMenu重構為數據圖表（長條5變體一鍵直橫+折線圓餅環狀甘特金字塔雷達）與文字圖表（時間軸、文字欄、文字清單、引言卡），ChartRenderer支援11種，ChartData擴充type包含timeline等，BarVariant與orientation

驗證：tsc 0 build成功，子頁同類型限制（文檔→文檔等，簡報無子頁）已實作

### 2026-08-01 — 5點回饋修正

1. 側邊欄加號缺少簡報：已加回
2. 筆記移除16:9/4:3：note僅flow/a4/custom，presentation僅16:9/4:3
3. 簡報使用說明：新增PRESENTATION-GUIDE.md
4. 文檔開啟子頁：canAddSubPage改為!isTrashMode && kind!=presentation，支援文檔子頁
5. 標題右側新增子頁移除，側邊欄更多操作左側+恢復：EditorPane移除+新增子頁按鈕，Sidebar恢復+按鈕與renderSubPageTypeMenu同類型

### 2026-08-01 — 8點追加需求

1. 垃圾桶多選時再點垃圾桶可退回項目：Sidebar垃圾桶按鈕改toggle，isTrashMode true時呼叫onShowNotes，useEffect清除多選
2. 文字超出分頁無法點新增頁：PageFormatView按鈕改sticky bottom z-20 shadow-lg backdrop-blur
3. i18n覆蓋檢查：新增50+ keys，sidebar.nav.notes改為項目，補齊zhTW
4. 側邊欄首頁之下新增隨手記、To-Do List
5. 隨手記類似Google記事本：QuickNotesView網格、顏色、快速新增
6. To-Do List先顯示日曆：TodoView日曆優先，42天網格，任務顯示
7. 筆記改項目：i18n改項目，isProjectKind定義4種統稱項目，Dashboard統計
8. 隨手記、To-Do List獨立於項目：filteredPages排除quick_note/todo，獨立store DB_VERSION 3，quick_notes/todos objectStore，遷移

行動：新增QuickNotesView.tsx, TodoView.tsx, HelpGuide.tsx, 更新Sidebar, NexusApp, types, IndexedDBAdapter, StorageAdapter, i18n等，tsc 0 build成功

### 2026-08-01 — Phase 1: 任務4+5+1+3 完成（單一+下拉扁平、MD為文檔、A4分頁引擎、雙開）

**背景：** 使用者提出5項新任務：A4分頁預設、簡報獨立、雙開、匯入併入新建、MD匯入為文檔。

**行動：** - Sidebar + 改為單一扁平下拉，新建區（文檔/筆記/學習集/簡報/資料夾）+匯入區（PDF/Markdown），移除二層hover子選單
- MD匯入改為 kind=document
- PageFormatView 新增：a4灰底白紙210mm、16:9/4:3黑底預覽、flow居中，kind決定預設（Document預設a4，Note預設flow），任何分頁可還原為流動
- pageBreakExtension 新增，TiptapEditor 引入，插入下拉新增分頁符
- EditorPane 頂部新增格式切換按鈕流動/A4/16:9/4:3
- globals.css 清理重複，新增A4紙張陰影等樣式
- 雙開：secondaryActivePageId, secondaryPdfUrl，Ctrl+點擊開啟右側，右側交換/關閉按鈕，左右皆獨立編輯

**驗證：** tsc --noEmit 0, next build 成功

### 2026-08-01 — Phase 2: 簡報 Hybrid 獨立

**背景：** 簡報需獨立，支援圖表、版面、示圖、目錄，用筆記製作簡報。使用者確認hybrid：筆記可一鍵轉簡報+獨立編輯。

**行動：** - types.ts：PageKind新增presentation，PresentationData, Slide, ChartData, PresentationBlock
- presentation.ts：noteToPresentation解析H1/H2切頁，表格轉圖表，自動目錄，blocks生成
- PresentationView：左投影片清單，中16:9預覽，下方編輯區（標題/內容Tiptap/圖表JSON/Mermaid/備註），8版型，主題
- NewPageDialog：新增簡報選項，16:9/4:3格式
- Dashboard：統計簡報，支援建立簡報
- Sidebar + 新增簡報，FileMenu新增轉為簡報
- IndexedDBAdapter：createPage初始化presentation_data，format預設16:9
- SyncEngine：同步presentation_data

**驗證：** tsc 0, build 成功

### 2026-08-01 — 代碼分析與優化（不刪功能）

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

### 2026-08-01 — 任務1邏輯修正：流動原本不改，檔案下拉在工具列最左

**行動：** - 新增 FileMenu.tsx：檔案下拉含新建、匯入、簡報轉換、格式（流動不改僅分頁可還原邏輯）、匯出/列印
- EditorPane 新增頂部檔案選單bar，後移至工具列同一行最左邊（依最新要求）
- 標題右側格式切換按鈕移除，統一由檔案選單管理
- 單一上欄+標題，內頁分頁邏輯確認

### 2026-08-01 — 任務3釐清：工具列右邊分頁按鈕指左右雙開分頁

**行動：** - 工具列右側改為左右雙開控制：雙開中顯示雙開中/交換/關閉右側，未雙開顯示Ctrl+點擊提示
- 中間分隔條僅視覺線
- A4新增頁按鈕移至A4紙張下方sticky bottom

### 2026-08-01 — 分析 Canva 製作形式

行動：web_search Canva editor architecture，整理CANVA-ANALYSIS-DETAILED.md，引用12+來源，分析拖拉、bounding box、紫色對齊線、圖層面板、群組等，為簡報重構參考

### 2026-08-01 — 工具列置頂覆蓋、排版同格、真正分頁、夜間適配、表格右鍵、側邊欄回退等全面修復

**背景：** 使用者回報：工具列選單被上欄限制、對齊需下拉、分欄最多三欄、表格自由度、非流動分頁自動加頁、不要擅自更改未提功能。後續再回報：表格右鍵、平均僅選取範圍、快速輸入跳行、重複 underline、固定 A4 底部留白無法編寫、內頁第幾頁/共幾頁保留、檔案刪除空白頁、平均表格仍有問題、上文下文合併、工具列殘留、分頁底部太高、固定 A4 尺寸底部不可編寫等。

**行動：** - **工具列 Portal**：ColorPaletteButton、ToolbarDropdown、FileMenu、ChartTypeMenu、TableGridPicker 改為 createPortal 到 document.body，fixed 定位 z-[9999]，計算 getBoundingClientRect，監聽 mousedown 外部關閉、resize/scroll 重定位，解決被 overflow-x-auto 裁切（D-173）
- **排版同格**：對齊 select 下拉（向左/置中/向右/兩端），分欄 select 下拉 單欄/2欄/3欄，同一 bordered 群組，新增 multiColumnExtension（multiColumn 2-3欄，column），WritingModeExtension（writingMode vertical-rl，切換直橫，主要用於儲存格）（D-174）
- **表格自由**：TableGridPicker 8x10 網格，右鍵選單 TableMap+CellSelection 實現上下左右合併、插入/刪除列欄、切換標題、平均僅選取範圍（保持總寬不變無需橫向拉動）、刪除表格；工具列表格按鈕依要求僅保留右鍵（D-175, D-179, D-181）
- **真正分頁**：PaginatedEditorView 重寫，固定 A4 210mm×297mm 1122px，內文高度 971px，ProseMirro…

**驗證：** tsc --noEmit 0, next build 成功，無 Maximum update depth exceeded，無 Duplicate extension 警告。

### 2026-08-01 — 最終文檔統整

使用者：內容沒問題，將討論結果與對話紀錄全面統整並更新文檔

行動：更新00-HANDOFF-STATUS-AND-AI-RULES-UPDATED.md, 01-CANON-SPEC-AND-DECISIONS-UPDATED.md（新增D-157~D-172）, 本文件02-PROJECT-LOG-DETAILED-UPDATED.md，包含Phase1-2、簡報直觀化、圖表分區、子頁同類型、使用說明、代碼優化等完整記錄

### 2026-08-01 — 深度審核與最佳化：文件重排、死檔清理、夜間適配持久化、表格平均提示、分頁精確度等

**背景：** 使用者要求「對現在所有檔案與資訊進行一次深度且完整的整理、完善、分析問題與提出建議」。前期已完成工具列 Portal、真正分頁、表格右鍵、夜間適配等 13 項追加，但文件存在章節錯亂（15.16/15.17/15.18 在 16/17 之後重複）、死檔未刪（BottomLeftPanel、PreferencesFab/Menu）、夜間適配未持久化、平均僅選取範圍無提示、分頁估算高度啟發式、快速輸入跳行等問題。

**行動：** 1. 文件重排：將 01 文件 15.16/15.17/15.18 按序排列，16/17 放最後，消除 cat >> 追加導致的章節錯亂，決策編號連續 D-147~D-185
2. 死檔清理：刪除 BottomLeftPanel.tsx、PreferencesFab.tsx、PreferencesMenu.tsx（已由 AccountSettingsRow 取代，未被引用）
3. 夜間適配持久化：StorageAdapter 新增 get/setPageNightAdaptPreference，IndexedDBAdapter 實作 page_night_adapt key，EditorPane 改用 localStorage + IndexedDB 雙重持久化，reload 後保持適配狀態（R-2）
4. 平均欄寬提示：右鍵選單增加 canAverage 判斷，CellSelection 計數 >1 才可平均，否則 disabled + tooltip「請先拖曳選取多個儲存格」，避免無反應困惑（R-4）
5. 分頁精確度：estimateBlockHeight 啟發式保留，但 PaginatedEditorView 改為 useMemo 純衍生 + debounce 800ms + buffer 150px，游標所在塊保護，徹底解決快速輸入跳行（R-6）
6. 快速輸入跳行：handlePageChange 立即合併保存不搬移，800ms 後再檢查溢出，允許當前頁暫時溢出 15…

**結果：** - 01 文件章節順序正確，決策連續 D-01~D-185，無斷層
- 死檔清理，project/src 49 檔案整潔
- 夜間適配持久化，平均提示，分頁精確度與快速輸入體驗改善
- tsc 0, next build 成功，無 Maximum update depth exceeded，無 Duplicate extension 警告

### 2026-08-01 — 王題修正：主題切換文字變灰、分頁新增頁、再分析PPT/Canva/Gamma

- 主題文字變灰：globals.css強制A4/16:9/4:3內文字#1a1a1a !important
- 分頁新增頁：PageFormatView A4底部sticky +新增頁面按鈕，dispatch nexus-insert-page-break事件，TiptapEditor監聽插入PageBreak
- 再分析：web_search PowerPoint Slide Master, Gamma liquid canvas, 整理PPT-CANVA-GAMMA-INTEGRATED-ANALYSIS.md，提出三層架構Master>Layouts>Slides.blocks

### 2026-08-01 — 簡報直觀化重構（Gamma/Canva風格）

**行動：** - 重寫 PresentationView為自由畫布：
  - 每張投影片blocks為絕對定位，x/y/w/h/z %，可拖曳，雙擊編輯，右上角刪除
  - 頂部+文字區塊、圖表、形狀，版型，主題
  - 右側圖層面板按z倒序，置頂置底，點選切換
  - 底部備註保留
  - 效能：移除下方巨大Tiptap，僅選中塊渲染textarea，拖曳僅改x/y
- types.ts：Slide新增blocks, PresentationBlock含text/chart/diagram/shape

### 2026-08-02 — 00 任務目錄去重與 Task ID 正規化

**背景：** 使用者指出 00 的 §0「任務闡述」、§2「目前進度」、§10「任務詳細」有大量重複。使用者確認新的唯一職責分工：

§0：僅正在進行與將要進行的任務環節。 §2：僅各 MVP 容器的摘要進度。 §10：唯一完整任務大綱與所有 Task ID、狀態、依賴、估算、完成判準。

**執行結果：** 1.00 §0 移除 MVP-0／MVP-1 完成內容，只保留「目前無已開啟程式工作」與下一批候選。
2.00 §2 改為 MVP-0～MVP-9／Q 工作線的一行摘要，不再列功能清單。
3.00 §3 改為任務執行規則，不再重複 task list。
4.00 §10 成為唯一完整任務目錄：M0-0～M9-4、Q-0～Q-6。
5.MVP-0、MVP-1 已完成工作正式列成 task cards，不再只寫「已完成」。
6.圖片插入、GoodNotes-like PDF workspace、Mobile UI standard 正式納入 Task Registry。

### 2026-08-02 — 01 歷史決策轉移與三檔交接整合

**背景：** 使用者確認：交接檔只需要 `00`、`01`、`02` 三份。

新的 01 已重整為「現行功能／實作要求／規格」文件；原 01 中未直接列為現行功能卡的歷史決策、舊資料模型快照、技術細節與完整 D-01～D-185 決策原文，不應另留第四份 legacy handoff 檔，也不能因可讀性重整而遺失。

**比較結果：** 原 01：明確包含 D-01～D-185 共 185 個決策編號。 原 02：文字中明確提及 101 個決策編號。 在原 02 中未明確出現的原 01 決策編號數：84。 未明確出現的 ID：D-2, D-3, D-4, D-5, D-6, D-7, D-8, D-9, D-10, D-11, D-12, D-13, D-14, D-15, D-16, D-17, D-18, D-19, D-20, D-21, D-22, D-23, D-24, D-25, D-26, D-27, D-36, D-37, D-40, D-45, D-46, D-47, D-49, D-50, D-51, D-52, D-53, D-54, D-55, D-71, D-72, D-73, D-74, D-75, D-76, D-77, D-78, D-79, D-80, D-81, D-82, D-83, D-84, D-85, D-86, D-87, D-88, D-89, D-90, D-91, D-92, D-93, D-94, D-95, D-96, D-97, D-98, D-99, D-100, D-157, D-158, D-159, D-160, D-161, D-162, D-163, D-164, D-165, D-166, D-167, D-168, D-169, D-170, D-171。

### 2026-08-23 — 歷史決策 D 編號完整補錄

> 以下為當日或前後工作階段原決策登記；若日期是依該 Track 所屬工作階段歸檔，精確建立日請回查原始紀錄。

#### 15.19 決策 D-186～D-197（2026-08-23 代碼審計 + Bug 修復 + 簡報功能改造 + 創作類別）

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



### 2026-08-23 — 代碼審計 + Bug 修復 15 項 + 簡報功能重大改造 + drag 深度調試

**背景：** 使用者提供四份文件（00/01/02 + codebase dump）要求分析代碼、找出 bug 與不明智設計。
隨後指示修復可獨立處理的問題、開發簡報功能、評估三份外部分析報告。

**行動：** #### 1. 代碼審計（nexus-code-audit.md）

逐檔靜態分析 lib/ + hooks/ + 關鍵 component。
輸出 22 項發現：4 高（H1-H4）/ 8 中（M1-M8）/ 10 低（L1-L10）。
#### 2. Bug 修復 15 項（三批，全部 tsc + build 驗證）

Batch 1: H1（複製簡報遺失 presentation_data）、H2（Markdown --- 誤轉分頁符）、
         M1（updated_at 不同步 → patchPage helper）、M2（callout memory leak → destroy()）
Batch 2: M3（轉簡報截斷 → 完整內容放 notes）、M4（分頁 pageBreak 雙重插入 → normalize）、
         M6（複製 StudySet id 衝突）、M7（pullChanges 漏附件 → 補 attachments/binaries）、
         L6（i18n zh-TW 補 25 key）、L9（變數遮蔽）、L10（列印時序 → rAF）、
         M1 剩餘 13 個 handler 統一改用 patchPage
Batch 3: H3/H4（quick_note/todo store 歸屬 → 方案 A 廢棄獨立 store，使用者確認）、
         L1（刪除 3 個死代碼：usePage…

**解決方式：** 1. drag：selBoxStyle 加 position: "absolute"。同時保留過程中的架構升級
   （pointer events、絕對座標、物件本體負責事件）。
2. sync 400：ALTER TABLE + pushPage 加 error log。
3. H3/H4：使用者確認方案 A（廢棄獨立 store）。

**結果：** - 22 項審計中修復 15 項（H1-H4, M1-M7, L1-L2, L6, L9-L10）
- 簡報功能從基礎版升級為可用版（M3-1 大部分完成、M3-2 部分完成）
- drag 經十幾輪排查修復（根因：position:absolute）
- sync 恢復 + 400 修復
- 全部通過 tsc + next build 雙驗證
- 三份分析報告的誤判被識別（避免錯誤修復）

**後續影響：** - 簡報待完成：拖曳吸附線（M3-2 二階段）、旋轉 resize 方向、undo/redo、Slide Master
- 審計待完成：M5（游標 pane 隔離）、M8（B2 sync 衝突）、L3-L5/L7/L8
- sync 待改善：殭屍頁面 tombstone、時鐘偏移、binary 改 Supabase Storage
- 分頁性能：多 Tiptap 實例（虛擬列表）

### 2026-08-23（第二輪）— 簡報 UI 改造 + 圖表編輯器 + 創作類別 + 側邊欄分類

**背景：** 簡報功能 drag 修復後，使用者要求一系列 UI 版面調整、圖表編輯器參考 Gamma 設計、
新增側邊欄創作類別。

**行動：** #### 1. 簡報 UI 佈局調整

- 上欄高度 ×2（py-3 → py-6）
- 浮動工具列按鈕放大（text-[11px] px-2 py-1 → text-base px-4 py-3）
- 新增投影片按鈕高度 ×5（py-2 → py-10）
- 縮圖列/圖層列可開合（按鈕在標題列中央 📑/☰，w-[180px] ↔ w-0 transition）
- 上欄的開合按鈕移除（改放到各面板標題旁）
- 圖層右下角屬性面板刪除
- 資料表格「系列」欄位刪除
- 圖表編輯關閉按鈕改為浮動圓形按鈕（absolute -top-3 right-3）
#### 2. 圖表編輯器 Gamma 風格

- 分析 Gamma 圖表編輯器設計：分頁（Graph/Axes/Visuals）、表格化輸入、左資料右預覽
- 第一版：三分頁（資料/類型/預覽）
- 第二版（使用者指定版面）：上半部三欄（類型選擇｜細項設定｜預覽）+ 下半部資料表格
  - 類型：11 種圖表 icon 網格
  - 細項設定：排序/資料標籤/格線/標題數字 checkbox + 方向 + 變體
  - 預覽：240×140 即時
  - 表格：標籤 + 數值兩欄（系列已刪除）
- ChartData 型別擴充：sortOrder, showDataLabels, showGrid, showTitleNumber
#### 3. 圖表下拉選單

- 「📊 圖表」按鈕改為下拉選單：長條圖/折線圖/圓餅圖/環圖/…

**結果：** - 簡報 UI 全面調整完成
- 圖表編輯器 Gamma 風格（上半部三欄 + 下半部表格）
- 圖層拖曳排序
- 文字/圖表/版面三個下拉選單
- Creative 類別上線（側邊欄 ✍️ 按鈕）
- 全部通過 tsc + next build

**新增/更新決策：** D-192 — 圖表編輯面板 Gamma 風格：上半部三欄（類型｜細項設定｜預覽）+ 下半部資料表格。
        位於編輯區底部，與畫布共用編輯區。ChartData 擴充 sortOrder/showDataLabels/showGrid/showTitleNumber。

D-193 — 圖表類型下拉選單：取代單一按鈕，7 種圖表類型可選。

D-194 — 文字下拉選單：取代單一按鈕，含標題層級/方塊/清單等預設樣式。

D-195 — 版面下拉選單取代形狀：目錄/雙欄/三欄/引言卡/時間軸/文字清單。

D-196 — 圖層拖曳排序：HTML5 drag-and-drop，拖曳後 z-index 歸一化。

D-197 — 新增 PageKind "creative"：側邊欄獨立類別，CreativeView 入口頁，
        初步含小說閱讀格式、角色詳細簡介表兩種範本。
> 完整決策本體見 Appendix A 第 15.19 節。

# Appendix A — 轉移自原 01 的完整 Legacy Canon Source

> **用途：** 保存原 01 中未直接保留在新 01 功能規格層的歷史決策、舊 snapshot、完整 D-01～D-185 原文與詳細技術理由。  
> **權威限制：** 這是 history/archive，不覆蓋 00 的當前任務規劃或新 01 的現行功能規格。  
> **完整性：** 下方內容逐字保留重整前原 01，方便全文搜尋與追溯。

<!-- BEGIN TRANSFERRED ORIGINAL 01 CANON SOURCE -->

# Nexus — CANON / SPEC / DECISIONS（專案既定事實、規劃、技術規格與決策）

*日期：2026-07-31*  
*狀態：🟢 最新 canon 版 / Track H～M 已補入 / Supabase 雲端同步 + UI 改善已補入 / 使用者決策已確認（B1~D5）*  
*用途：集中 Nexus 的產品定位、使用者背景、架構、M…


## 2026-09

### 2026-09-13 產品與工程更新日誌

**已知風險與後續：** - 本機 IndexedDB 尚未依登入 user_id 分區。若同一瀏覽器登入另一帳號，舊帳號本機資料可能仍被載入或同步；此為帳號功能的最高優先修正，不可視為已完成的多帳號隔離。
- 未完成 M4-7 前，帳號切換測試只應在獨立瀏覽器 profile 或清空本機測試資料的環境進行。

### 2026-09-14 帳號、同步與小說收尾日誌

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

### 2026-09-16 — 小說獨立章節、角色卡與世界觀、多項介面修正

**背景：** 使用者先要求小說章節改為獨立資料，AI 完成後使用者貼出一份長需求清單（下拉刷新、首頁捲動、Untitled、側欄功能格、網頁／計數／抽選、手機與平板側欄、小說翻頁、字卡字典、角色卡區塊／模板／分頁、世界觀、多分類日曆、分享、效能疑慮、App 疑問），詢問「還有哪些沒做」。

**行動：** 1. **14:23 小說章節**：新增獨立 `novel_chapter`（父作品 ID、排序、標題、正文、時間）；章節工作區與編輯器；目錄／上下章／刪除／排序／重新命名改操作獨立章節；啟用時才轉存並清空舊正文。遷移檔已新增，未套用遠端。
2. **14:34 盤點**：AI 對照程式碼列出「尚未完成或只完成一部分」「已寫入程式但需實機驗收」「已具備」三類（內容併入 00 §10.11 與 01 §12）。
3. **14:36 使用者**：「先補完小說與角卡的功能」。
4. **14:47～22:21 實作**：小說頂部翻頁；登入後不再誤選章節；角色卡混合內容區塊、統計欄位（小標、多行介紹）、真正的雷達圖；底部分頁與管理；自訂模板、模板管理、背景範文；空白／D&D 5e／CoC 7e 專用模板；手機排版修正；命名與刪除確認改為頁面內對話框。
5. 期間先後兩次因使用量上限中斷（14:47 之後、22:21 之前），使用者要求「繼續實作」後續接。
6. **22:30 使用者**：詢問 Steam「角色屋」桌寵如何在兩個螢幕存在——與專案無關，對話中未見回覆。

**結果：** 八項測試、介面測試、TypeScript、ESLint 與正式建置通過（AI 回報）。**尚未部署，遠端 migration 尚未套用。**

**後續影響：** 見 01 F-NOVEL、F-CHARACTER、F-WORLD、D-209～D-211；未回答的提問見 00 §11。

### 2026-09-19～09-20 — 新增選單、下拉刷新、右鍵操作與講義排版

**背景：** 使用者：切換功能後，「新增」內容也應對應該功能；頁面刷新仍然太容易觸發，要求先分析其他頁面刷新的做法再製作；右鍵應含全選／複製／貼上／剪下；理想是在筆記中做出課本與講義的排版，詢問如何改良。

**行動：** - 新增選單隨功能切換（筆記→流動／分頁；創作→世界觀／角色卡；小說→小說作品…）。
- 參考 Ionic Refresher 與 Chrome `overscroll-behavior` 重做下拉刷新（D-212）。
- 編輯器、表格、編輯選單加入全選／複製／貼上／剪下。
- **建議（09-20 01:07）**：課本／講義排版依序改良：①統一樣式 ②教學區塊 ③穩定分頁 ④輸出與導航。
- **09-20 01:21 使用者**：「教師／學生版 PDF 不用做。其他繼續實作」→ D-204。
- **09-20 13:36 起實作**：整份樣式、教學區塊、作答留白、頁首頁尾、自動目錄與題號、「依 A4 整理分頁」（使用者觸發、可復原）。

**結果：** 10 項測試通過（09-20 01:07 回報），講義完成後累計 14 項；隔離介面驗證通過。**尚未部署；實際列印、實體手勢手感待驗證。**

**後續影響：** 見 01 F-LESSON、§6.4、D-204、D-212～D-214。

### 2026-09-21 — 偏好與帳號入口重整

**行動：** 使用者要求：移除右上角帳號登入；偏好第一層只留「主題、語言、設定、備份（匯出／匯入）」，主題與語言為右側浮動子面板；「設定」進入詳細設定介面（如 GPT 設定），功能排序建議與使用說明也放在此。

已完成：移除右上角帳號入口（保留側欄入口）；偏好第一層四項；主題／語言右側浮動子面板；詳細設定分類（一般、功能排序、使用建議、使用說明、備份）。

**結果：** 14 項測試、介面驗證、TypeScript、ESLint、正式建置通過（AI 回報）；尚未部署。決策見 01 D-205、D-206。

### 2026-09-22 ～ 2026-09-25 — FSRS 每日練習與測驗持久化（程式碼推導；無對話紀錄）

**尚未驗證（來自 `study-workspace.md`）：** 正式 Supabase、兩台實體裝置、iOS 實機端到端。

### 2026-09-28 — Git Windows 保留檔名修復、VS Code 儲存衝突、FSRS 測試與 UI 補充（增量記錄）

> 證據來自使用者提供的 PowerShell stdout、VS Code 截圖與匯入報告；本次沒有直接執行使用者本機 repo 命令、取得新的遠端 Supabase 資訊、部署或實機操作。依 00 §15 與 01 §18 判斷最新狀態與契約。

### 事件一：Git `con.md` 無法加入索引

1. `git add -A` 和單獨 `git add -- data/etymology/batch-08/prefixes/con.md` 都回報 `No such file or directory`；PowerShell `Test-Path` 回 false，但目錄列表可見檔案；Node.js 使用一般 Windows 路徑及擴充路徑**都可讀取 1,661 bytes**。不能簡化成「Windows 完全無法讀該檔」。
2. 因 `con` 為 Windows 保留裝置名稱，採取保守兼容解決：Node.js 將 `con.md` 改名 `con-prefix.md`，重新命名後 SHA-256 相同；僅更新 INDEX.md 的舊 Markdown 連結。
3. 搜尋顯示另外三份既有 JSON 報告各兩處舊路徑，作為歷史快照保留；以新路徑重新輸出 `batch-08-dry-run-renamed.json`。使用者上傳的結果顯示 150 來源、721 would_insert、0 inserted、無 errors；審核提醒 `SOURCE_AUDIT` 與 `NO_STABLE_SENSES` 不是本次致命錯誤。
4. 再執行 `git add -A` 時只見大量 LF→CRLF 換行提示，無 fatal；已列出 182 個暫存檔案，包含字源、帳號刪除及字卡功能。不將單純 CRLF 警告當成失敗；提交前仍須確認被納入的檔案與敏感內容。主批次 commit hash 未獲使用者回報，亦無 push 證據。

### 事件二：VS Code 儲存衝突與殘留檔案

1. 使用者開啟的 `studyFSRS.ts`、`studySessions.ts`、`studySessions.test.cjs` 初時都有未儲存圓點。`studySessions.test.cjs` 出現「硬碟檔案較新」儲存衝突；Compare 截圖顯示磁碟版新增多項測試，編輯器版內容較舊且依賴 `../src/lib/` 路徑。
2. 為避免不可逆覆蓋，使用者將編輯器版存為專案外 `studySessions-backup.txt.txt`，對測試檔執行 Revert；另外兩個檔案之未儲存圓點也消失。使用者重新開 PowerShell，驗證 `git status` 顯示原先已暫存大批檔案，後來 `git status --short` 則只剩 `?? src/lib/studyFSRS.ts`、`?? src/lib/studySessions.ts`。
3. 使用者隨後 commit 這兩檔成功：`fe54098`，2 files changed／206 insertions，主旨「新增學習排程相關檔案」；尚未取得後續新

### 2026-09-28 — 三份交接文件主章節一致性整合（本次增量）

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

最新已交辦字卡兩欄 A–Z UI 改版；**Codex 最終結果未收到，不能標示完成**。先核對 Git 工作區與實際測試結果。

最後一段工作（對話

### 2026-09-28 — 交接檔整合：09-16～09-25 工作紀錄與舊文件搬移

**背景：** 舊 00／01／02 最後更新於 2026-09-14。之後使用者在新對話中進行了 2026-09-16～09-21 的多輪工作，程式碼快照則產生於 2026-09-25，含有對話中沒有的 FSRS 與測驗持久化。本輪把三者整合。

**行動：** - 依「實際 source ＞ 00 ＞ 01 ＞ 02」重新盤點；以程式碼快照核對每個對話中的回報。
- 00、01 全面更新並以【新增】【修改】【搬移】【取代】標示；本檔追加下方日誌，並在附錄保留**舊 00 全文**與**舊 01 被替換段落原文**。
- 未刪減任何功能需求；教師／學生版 PDF 與世界觀關聯為使用者明確取消（D-204、D-201）。

**結果：** 00／01 為新的權威版本；02 僅追加與附錄，未改動既有歷史。

### 2026-09-28 — 字源百科本機匯入回報、CEEC 資料整理暫停與公共字典管理需求確認

**背景及迄今成果（證據來源區分）：** 1. 使用者持續開發 Nexus 字源百科，先前已有字首／字根／衍生單字 Markdown 資料包及獨立 owner-scoped etymology migration。Codex 最新回報完成 parser 與 PGlite 本機交易式、冪等匯入：150 份來源、721 筆本機寫入、重複匯入 150 份跳過／0 新增、83／83 測試通過。這是**開發者自述與報告**，正式 Supabase 未操作，既有八表仍是 owner-scoped；字源核對提醒不等於匯入錯誤。
2. 使用者提出約 7,000 字詞庫方向，以 CEEC 111 學年度起適用六級高中詞表為核心；自備文字詞表曾經初步解析回報 6,012 原始項，挑出 170 特殊項，產出第一輪審核候選 362 形式，其中 43 項尚需語義／詞性／來源審核。**未完成最終 7,000 字詞庫，未逐頁獨立校對官方 PDF，也未取得所有中文釋義。**
3. 使用者明確要求停止字彙整理；目前優先確立公共字典資料庫與可用的管理者介面，不能再沿舊工作流自動處理剩餘 43 筆。

**新增需求與方案決策：** - 在既有字源架構上新增**公共字典層**，既有八張 `owner_id` 資料表及個人學習資料原封保留；分期實作公共庫、管理者 CRUD／匯入、使用者總覽及字卡底部面板。
- 管理者已使用 **Google OAuth** 登入 Nexus，帳號 `changling971216@gmail.com`；使用者詢問是否需要另建管理帳號。方案確認**不需要**，但管理權限必須綁定原 Supabase `auth.users.id`，而非僅 email。該 UUID 尚未提供或授權；未動既有 OAuth。
- 管理員能新增、修改、匯入、審核發布單字、字首及字根；CSV 與 Markdown 分別適用批次詞彙及完整字源稿，提交前預覽驗證，交易／冪等／衝突保護。普通使用者只讀已發布公共內容。
- 全體登入用戶（包含管理員）在**字卡首頁頂部**取得字典總覽與三類搜尋入口；Daily／Review **翻面後**在畫面底部出現可展開單字詳情，不遮擋評分，不產生任何 FSRS／Quiz 寫入。
- 暫緩 Quizlet 式新增字卡英中自動選字、CEEC 逐項校對及延伸詞編纂；相關資料保留，非取消永久需求。
- 使用者特別說明需節省 **Work 與 Codex** 兩種額度；一般 ChatGPT 負責規劃／整理／分析，使用者本機操作，Codex 只在真正需要改碼時使用；未經指示不啟用 Work。

**待辦與風險：** - 本輪只更新交接文件，**沒有**建立公共表、後台、角色授權或任何 UI；不得視為功能已上線。
- 真正開發前須核對最新 repo、舊 `etymology_*` 實際遷移與資料、`Q-0` schema、`Q-9` 遠端 migration ledger、FSRS／Quiz 現有測試。採新表分層及安全資料轉移，不能開放舊 owner 表成全站共享或直接拿 email 判斷管理員。
- 在非正式環境做雙帳號 RLS、CSV／Markdown 衝突／重匯／回滾、7,000 規模搜尋、字卡翻面及不改評分的回歸測試；正式遷移、初始化管理員、部署分階段請使用者確認。
- 製譜及舊字卡 UI 收尾仍保留原需求；**新的當前優先順序以 `00` §14 為準**。

### 2026-09-28 — 後續對話增量補記：字卡收尾、目錄重構與製譜規劃

**已確認開發與驗證回報：** - 純目錄重構分四階段，搬移 16 個檔案；Codex 回報 59/59 測試及 TypeScript 通過，lint 0 error、54 個既有 warning。Git commit `69e167d90aa96c69e4fb43d0f2a6e7f8df0003ea`。重構後模組路徑見 00 §13。
- 正式複習從「僅 Easy 出箱」改為「Good／Easy 均出箱」；Again／Hard 留在 session；首次評分才寫正式 FSRS。Codex 回報 63/63 測試、TypeScript 通過、lint 0 error（仍有既有 warning）。未修改 schema、Quiz、部署。使用者表示會自行 `git add -A` commit，但結果與 hash 未確認。
- 每日學習與正式複習區分：每日學習新字只以 Easy 完成，產生 introduce 管理事件，**不產生偽造正式評分或 due**。正式複習固定 session，New→Due→Not-due 選卡；第一評分正式、後續僅 session。
- Quiz 已規劃／據 Codex 回報實作雙向、預設中→英、加權抽題、持久化錯題分數、離線上傳決策；正式 `20260925_study_quiz_persistence.sql` 是否已套用仍待確認。
- 使用者確認 `20260922_study_fsrs.sql` 已套用正式 Supabase；尚未在本次文件編輯中獨立查證。

### 2026-09-28 — 雙路徑學習模組盤點、清理及指定測試／build 驗證（最新增量）

**決策與實查經過：** 1. 使用者選擇「現在優先檢查學習模組」；並明確選定底部 UI **B 方案**：評分按鈕 → 字典詳情 → 整個作答畫面最下方儲存提示。
2. 檔案盤點證實兩套：正式 `src/features/study/` 有 `studyFSRS.ts`、`studySessions.ts`、`StudyRepository.ts`；`src/lib/` 另有前兩個同名檔案。SHA-256：`features/study/studyFSRS.ts` = `53CF06745A3866880A748E3A2828A725D2C9E7A98CB93A3C274219B16E402546`；`lib/studyFSRS.ts` = `28E654225A4C3355054B56E2DEA2FB384B8EA0E9537E652A09C48FB134F83FF8`；`features/study/studySessions.ts` = `4EF6B1F08CA4015CDE9BCA4F33F071DE0E54E1CC52F6EDE14CF4E2D0230084C5`；`lib/studySessions.ts` = `A6C876222583774FFCFCC3544EAA0BC632B90CEC4BB44AA42344700D04BDD2F1`；可確認兩組內容不同。
3. 首次 `git grep -n -E 'studyFSRS|studySessions'` 僅命中歷史快照 `nexus-codebase-current.md`，不足以確認目前真實 imports。改用 `Get-ChildItem src,tests -Recurse -File | Select-String` 後確認：`StudyRepository`、Daily UI、StudySetView、`IndexedDBAdapter`、Quiz 與學習測試引用 `features/study`；`lib` 的同名兩檔只見互相引用。
4. 使用者上傳四檔壓縮包進行差異比較；前次比對回報正式版包含較新的 sess…

**使用者清理及驗證結果：** - `git rm src/lib/studyFSRS.ts src/lib/studySessions.ts`：PowerShell 顯示兩檔 `rm` 完成，已作為刪除暫存。
- `node --test tests/studySessions.test.cjs`：**21 tests / 21 pass / 0 fail / 0 skipped**。回報包含 Daily Good、持久 session、Daily Easy introduce 不產生 FSRS、正式首次評分、到期複習、資料回滾、雲端資料一致性等情境。
- `node --test tests/studyFSRS.test.cjs`：**4 tests / 4 pass / 0 fail / 0 skipped**。回報包含 legacy exposure、FSRS 10m 設定、遷移不捏造 review，以及學習額度／排序。
- `npm.cmd run build`：Next.js **16.2.9**（Turbopack）完成 production 編譯、TypeScript、page data、靜態頁生成與最佳化；顯示 `/`、`/_not-found` 與 `/etymology/[[...path]]` 路由。這只證明本機 build，未推論正式部署。
- **未收到**清理後執行 `git commit -m "清理重複學習模組"` 的成功終端機回報／hash，也尚未收到新的最終 `git st…

### 2026-09-28 來源增量存檔｜原 00 §13～§16（保持原文；非現行指令）

> 這些舊段落於結構整理時自 00 搬出，以消除多個競爭的「最新」入口。當前狀態只看 00 START HERE／§0。

### 2026-09-28 來源增量存檔｜原 01 §14～§20（保持原文；非現行契約）

> 這些原始決策／規格草案自 01 搬出；最新有效規格請看 01 §4，最新決策狀態請看 01 §11。原文內的 §17、§19 等編號是**來源章號**，不是目前 01 章號。

### 2026-09-28 來源快照存檔｜原 00 §4（2026-09-25 檔案樹；非現行目錄）



### 2026-09-28 後續增量｜公共字典與個人字卡產品模型澄清

- **類型**：使用者明確產品澄清／交接文件修訂；非程式實作，未查證遠端 Supabase。
- **使用者決策**：Nexus 只有一份公共字典（百科），由管理員維護；用戶建立各自字卡，字卡可連結公共字典補充詳細資訊。
- **發現的文件歧義**：歷史 owner-scoped `etymology_*` 舊實作被稱作「私人字源百科」，可能被誤讀為要新增每位用戶的私人百科；A5「私有原稿轉公共」也可能被誤認為字卡投稿機制。使用者表示未與先前 AI 討論過私人字源百科作為產品功能。
- **修正**：00 最新方向及 M7-8／M7-9／M7-12 說明、01 F-STUDY／F-DICTIONARY／決策 A5 改為唯一公共百科＋個人字卡可選連結，歷史說法保留於本檔但不具現行規格效力。
- **未決維持未決**：A3 公共內容發布版本／撤回後關聯行為、A4 首批來源重製授權、A5 是否／如何處置舊字源資料；個人字卡連結建立 UI 與舊卡回填方式亦未擅自決定。
- **保護措施**：不刪除舊 `etymology_*` 或批次匯入器，不開放舊 owner-scoped RLS，不讓公共百科更新自動覆寫個人字卡，也不把字卡 FSRS／Quiz 資料移入公共庫。
- **工作狀態**：本次僅修正 00／01／02 交接文件；未修改任何 Nexus 程式碼、資料庫、Git 歷史或正式部署。

### 2026-09-28 文件治理｜主文件去重與集中決策進度（僅記錄歷史）

- **要求與目的**：使用者批准六項文件架構改善：合併重複現行規格、統一決策登記、功能↔任務對照、分清驗證層級、舊最新補記歸歷史及 00 單一入口。**本輪只修改文件，沒有修改專案源碼、正式資料庫或部署。**
- **實施**：00 建立 `START HERE` 及唯一 §0 近期任務入口；保留 §10 Task ID、§12 遠端待核對 ledger，將原 §13～§16 全文移到本檔。01 §1～§12 是唯一現行功能契約，在 §4 集中補 F-DICTIONARY／F-SCORE 及 F-STUDY 最新 UI，在 §11 建立 A1～C9 完整決策狀態；原 §14～§20 全文移到本檔，過期細節未刪。
- **本輪使用者明確回覆**：A1 唯讀分享另設、A2 區分草稿與發布、B2 詳情內容末端捲動、C2 原階段順序正確、C4 大組由小組派生、C8 暫不處理；A3 不理解待白話解釋、A4 稍後、C3／C6 再議。其餘未回覆議題維持待討論。C4 不憑一句回覆自行設計聚合資料庫；A2 不自行增加多審核者角色。
- **保留的證據界線**：學習重複檔清理後 `studySessions` 21/21、`studyFSRS` 4/4、Next.js build 成功是使用者本機回報；最新清理 commit 尚未回報。遠端 Supabase migration ledger 有歷史矛盾，尚未用 SQL 實測解決。
- **未變更範圍**：全部原始功能需求、所有未決方案和歷史保留，無自行削減。文件中的舊狀態皆不得覆蓋新版 00／01。


### 2026-09-28 — 舊決策集中整理（決策登記重點）

> 以下為原 Canon 集中決策登記。編號為歷史編號；已被取代者保留作追溯，不能單憑本節直接實作。

| 決策群組 | 主要內容 | 本版對應章節 | 詳細原文 |
| --- | --- | --- | --- |
| D-01～D-38 | 核心定位、Page/Block、Storage、JSON、soft delete | §1、§2、§5、§8 | 02「01 Legacy Canon Transfer」中的原 01 §13 |
| D-39～D-69 | MVP-1、PDF、Trash、Markdown、Toolbar | §4、§7、§8 | 同上 |
| D-70～D-106 | vNext taxonomy、kind/view、backup、block ID | §3、§5、§10 | 同上 |
| D-107～D-146 | Editor blocks、Backup、Study、Dashboard、i18n、Document | §3～§9 | 同上 |
| D-147～D-156 | Sync、Sidebar、format、color、study quiz | §4、§6、§8 | 同上 |
| D-157～D-185 | PageFormat、Presentation、Quick Notes/Todo、table、Portal、pagination | §3～§8 | 同上 |
| D-186～D-197【補列】 | 2026-08-23 審計、bug 修復、簡報改造、創作類別；D-186 廢棄獨立 quick_note／todo store | §4、§5 | 02 §15.19 |
| D-198～D-203 | 帳號、OAuth、本機隔離、小說限制、登入必須制 | §1、§4、§8 | 02「原 01 §14.5」存檔 |
| D-204～D-218 | PDF 範圍、UI、創作、講義、FSRS、測驗及工具 | §3～§9 | 02「原 01 §15」存檔 |

---

### 11.1 2026-09-28 集中決策登記表（唯一有效摘要）

> 此處每個 ID 的文字依審核資料包的原始議題命名；已回覆事項以使用者最近訊息為準。**未回覆 ≠ 接受預設提案**。完成全部決策前，不自行補入 A3 等缺失的詳細政策；本輪只做文件整理。

| ID | 議題 | 狀態 | 已確認方向／後續待議 |
| --- | --- | --- | --- |
| A1 | 公共字典與唯讀分享範圍 | **已確認** | 字典登入可讀；唯讀分享另設獨立機制，納入 `M8-0` |
| A2 | 審稿／發布 | **已確認一部分** | 明確分成草稿與發布；是否另設審稿角色／更多狀態尚未授權擴充 |
| A3 | 發布版本與撤回 | **待重新解釋後決策** | 發布單位／依賴／撤回後卡片與快照行為未定 |
| A4 | 首批來源與重製授權 | **稍後決策** | 不將未核准的外部詞庫／翻譯當作可公開內容 |
| A5 | 舊 owner-scoped 字源資料是否轉入唯一公共百科 | **範圍已澄清；轉入與審核仍未決** | 舊資料須保留；是否使用它作公共百科資料來源，以及屆時單條／批次審核方式待定。**不是**私人字源百科，也不包含個人字卡自動投稿 |
| B1 | Review New 定義 | **未回覆** | New 與已學習、未有正式 FSRS event 的關係仍須明訂 |
| B2 | 詳情展開後儲存狀態位置 | **已確認** | 不固定常駐：排在內容末端，隨詳情內容捲動（保留 B 視覺順序） |
| B3 | 備份版本與內容 | **未回覆／先實查** | 最新實作、v3 備份測試與舊表 v2 須先對照 |
| C1 | 唯讀分享的撤權與附件 | **未回覆** | 另設機制已確定，匿名權限細節尚未確定 |
| C2 | 製譜 MVP 開發順序 | **已確認** | 維持作品管理＋快速簡譜先行，之後五線譜／吉他譜；更細語法仍屬草案 |
| C3 | 多分類日曆資料模型 | **再議** | 不將記帳／日記自動假設為日曆事件 |
| C4 | 計數大組／小組 | **已確認方向** | 大組由小組派生；具體聚合與編輯行為待 discovery |
| C5 | 抽選進階規則 | **未回覆** | ALL／ANY、各抽 N、重複／配對規則待定 |
| C6 | Mobile 技術／系統整合 | **再議** | 不預先承諾 PWA／Tauri／Capacitor 或原生發行 |
| C7 | 功能排序選單 | **未回覆** | 未核實現行功能前不刪 recent／default／custom |
| C8 | 講義交互參照 | **暫不處理** | 保留未來需求，不排本輪優先任務 |
| C9 | 公共字典管理／查詢開發順序優化 | **未回覆** | 保留既定四階段，不擅自改排優先級 |

#### D-219～D-225（現行交接索引；原始來源全文已存 02）

- D-219～D-223：公共字典優先、現有 OAuth 管理員 UUID、三類編輯／搜尋、翻面詳情、不擅自進入 Work 或未批准部署。
- D-224：正式學習模組統一 `src/features/study/`；舊 `src/lib/` 兩個檔案已依本機回報移除，指定測試／build 通過，commit 未確認。
- D-225：字卡評分鈕 → 展開字典詳情 → 儲存提示的 B 順序；**B2 追加**：提示位於內容末端並隨詳情內容捲動，不是底部固定常駐條。

---



## 2026-10

### 2026-10-08 — 公共字典 source/license 退休、Draft 清空與正式 Word／Prefix／Root 母檔封裝

**背景：** 公共字典已經過 M7-9～M7-12 與多輪後續修正，舊版仍殘留一般詞條級 `source_id`／`citation`／`license` 依賴。使用者決定不只隱藏 UI，而是正式淘汰這套一般來源／授權底層需求：版權與第三方來源改由「設定 → 關於 Nexus → 資料來源與版權」統一說明；historical etymology 自己的「資料來源」仍保留，audit 也必須保留。

同時，使用者決定清除目前所有 Draft，之後以重新查證過的 Word／Prefix／Root 母檔乾淨重建，不再背負 smoke test、舊 Batch Draft 與暫時 placeholder source。

### 2026-10-11 — Dictionary identity／pronunciation／Study reliability 收斂與 final canonical master

**背景：** 公共字典核心已經歷 source retirement、Draft pipeline、Published revision lifecycle、Dictionary↔Flashcard、Official Study Packs 與 Study sync reliability 等多輪實作。正式大量匯入前，本輪只保留會影響 identity、Sense 污染、資料安全與第一次匯入的阻塞項，不再因未來可能使用的欄位持續擴 schema。

**production migration 最新結果：** 使用者已逐一回報下列 migration 在 production Supabase 執行成功：

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

Word／Prefix／Root …

**Pronunciation 決策與實作：** 使用者決定 pronunciation 可以先正式預留；inflection 不需要在本輪建立固定欄位。

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


### 2026-10-12 — 文件與規格治理重整

**變更：** 將原 00／01／02 交接紀錄按用途重組成 `SPEC.md`（產品）、`ARCHITECTURE.md`（技術）、`HISTORY.md`（依時間的歷程與原因）、`HANDOFF.md`（現況），另使用 `AGENTS.md` 作 AI 協作準則。

**原因：** 避免過時決策與現行規格互相競爭、重複維護多份日誌；保持新產品規格修改先經過審查，再進技術設計與 Code Gap Analysis。

**範圍：** Markdown 文件，未執行部署、線上 migration 或正式字典資料匯入。

**帳號刪除與文件整合決策（歷史來源）**
- 登入者僅能透過已驗證 `auth.uid()` 刪除自己的帳號；要求電子郵件、確認字串與交易式回滾，避免前端偽造 owner 或誤刪其他帳號。owner 外鍵、RLS、離線快取及已刪帳號未過期 JWT 防護均須驗證。
- 為保留既有孤兒資料使用 `NOT VALID`，不刪除 `owner=null` 共用舊資料；現有本機 PGlite 測試不等於正式 Supabase RPC 已部署。
- 原 `docs/account-deletion.md` 已在本 PR 分流產品流程至 SPEC、技術規則至 ARCHITECTURE；原文保留 Git 歷史，避免永久多份文件重複維護。

