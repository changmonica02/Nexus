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

### 2026-06-21 — 開工前規格補完

**形成決策：** 新增並確認 D-28~D-34：

`​text D-28 MVP-0 使用 IndexedDBAdapter D-29 預設 sans-serif，serif 作未來主題 D-30 block node 從 MVP-0 起穩定 ID D-31 title 獨立存在 pages.title D-32 soft delete D-33 UI / Editor 只能依賴 StorageAdapter D-34 MVP-0 嚴格限於能寫能存 `​``

# 後續更新模板

之後每完成一件事，請追加：

`​``md

### 2026-06-27 — Next.js dev server 確認與 MVP-0 第一輪實作

**背景：** 使用者在交接後表示：

`​text 我準備好了。 下一步是引導你執行 cd / dir / npm.cmd run dev。 如果需求定義不完整，或有更好的執行方式，可以向我提問。 檔案多經其他 AI 修飾，許多定稿內容可再次更動，請依整體方案最佳化。 `​``

此段重要，代表後續 AI 可以在不背離核心願景的前提下主動提出更佳做法，而不是僵硬照舊文件執行。

**結果判斷：** `​text Next.js 專案可正常啟動 ✅ 實際有 src/ 目錄 ✅ localhost:3000 可開 ✅ 進入 MVP-0 實作條件成立 ✅ `​``

原先文件中「可能沒有 src/」的疑慮已解除。實際結構後續確認為：

`​text src/app ├── favicon.ico ├── globals.css ├── layout.tsx └── page.tsx `​``

**實作決策：移除 Google Font 與 Vercel 預設頁：** 說明給使用者：

`​text Deploy Now / Documentation 是 create-next-app 預設推廣連結 不屬於 Nexus 功能 MVP-0 local-first 不需要 Vercel deployment 入口 保留會干擾極簡三欄 App Shell `​``

使用者選擇：

`​text 手動貼程式碼 問題三：是否備份原 page.tsx 沒有意見 `​``

**最終測試結果：** 使用者刷新瀏覽器並測試：

`​``text

# + 空白

`​``

結果：

`​text 成功 ✅ `​``

### 2026-06-27 — Node.js 初次檢查失敗

**結果：** 出現錯誤：

`​text 無法辨識 'node' 詞彙是否為 Cmdlet、函數、指令檔或可執行程式的名稱。 `​``

### 2026-06-27 — npm PowerShell 執行政策問題

**結果：** 使用者執行：

`​powershell npm.cmd `​``

成功顯示 npm usage，確認 npm 可執行。

### 2026-06-27 — 修正 final package active docs 內部權威順序衝突

**背景：** 使用者要求在刪除原對話前，助理最後徹底確認所有檔案與資訊的完整性、準確性與合理性。助理先前回覆稱 final package 已可安全轉移，但使用者進一步指出：

`​text 00-NEXUS-HANDOFF-START-HERE.md 中的「2.1 修正後的實際權威順序」 與目前 nexus-handoff-final/ 的既有文件結構產生衝突。 `​``

使用者因此明確表達對助理工作準確性的疑慮。

**重新檢查結果：** 重新檢查 active docs 後：

`​text README.md 00-NEXUS-HANDOFF-START-HERE.md 01-NEXUS-CANON.md 03-PROJECT-LOG.md 04-FINAL-REVIEW-2026-06-27.md 99-ZERO-LOSS-AUDIT.md `​``

確認：

`​text active docs 之間的權威順序已一致 最新進度已一致 錯誤舊引用已修正 歷史引用已標示為歷史 archive 與 audit 已重新生成 `​``

最新 audit 結果：

`​text Markdown files audited: 23 Image asset audited: yes Overall result: ✅ PASS `​``

**結果：** 此問題已修正，並已將本次資訊紕漏與修正過程記錄於本日誌。

目前 final package 仍以：

`​text nexus-handoff-final/ `​``

為準。

目前下一步已更新為：

`​text MVP-0 收斂與驗證：修正 content_json 保存、檢查檔案/依賴狀態、建立 manual QA checklist。 `​``

<!-- END SOURCE: ALL-SOURCES-FULL-ARCHIVE.md | SOURCE 5 nexus-handoff-updated-2026-06-27/03-PROJECT-LOG.md -->

### 2026-06-27 — 建立 Next.js 專案

**結果：** 使用者貼出成功訊息：

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

### 2026-06-27 — 建立 Projects 資料夾

**結果：** 成功建立並進入：

`​text C:\\Users\\user\\Projects `​``

### 2026-06-27 — 文件交接包檢查與重整

**背景：** 使用者整理出一批最終 canon 文件，並詢問：

`​text 裡面資訊是否有被遺漏？ 最新進度是否有被記錄？ `​``

當時檢查的主要文件包括以下使用者整理檔名。注意：這是歷史工作記錄，不是目前 final package 的 active 文件結構：

`​text 00-NEXUS-HANDOFF-START-HERE.md 01-PRODUCT-ARCHITECTURE-ROADMAP-CANON.md 02-IMPLEMENTATION-CANON.md 03-DECISION-LOG.md 04-GLOSSARY.md 05-DESIGN-SYSTEM.md 06-BEGINNER-OPERATION-GUIDE.md 90-PROJECT-REVIEW-2026-06-21.md 99-ZERO-LOSS-AUDIT.md 00-AI-HANDOFF.md `​``

**結果：** 完成初版修正，但後續使用者要求：

`​text 將所有文件都確認一次，將紕漏處理掉，重新生成最高效率文檔。 `​``

### 2026-06-27 — 新增本工作進度日誌

**背景：** 使用者詢問是否已有：

`​text 日誌這個內容 做了什麼事之類的詳細日誌 `​``

確認目前已有：

`​text 決策日誌 審視報告 零遺漏稽核 `​``

但缺少：

`​text 實際操作 / 工作進度日誌 `​``

**命名原因：** `​text 03：放在 00 入口、01 canon、02 source archive 之後，作為交接包中的第三類主動維護文件。 PROJECT-LOG：表示這是專案工作日誌，記錄實際做了什麼。 不是 CHANGELOG：因為目前還沒有正式產品版本 release。 不是 DECISION-LOG：因為決策原因已由 03-DECISION-LOG / archive 保留。 `​``

**結果：** 本文件建立，用於後續持續記錄實際進度。

# 2026-06-27 — 本機環境與專案建立

### 2026-06-27 — 生成最終交接包 `nexus-handoff-final/`

**稽核結果：** `99-ZERO-LOSS-AUDIT.md` 顯示：

`​text Markdown files audited: 18 Overall result: ✅ PASS Image copied: ✅ PASS `​``

**結果：** 目前最終交接包應以：

`​text nexus-handoff-final/ `​``

為準。

### 2026-06-27 — 確認 Node / npm / Git 版本

**結果：** `​text node -v       → v24.18.0 npm.cmd -v    → 11.16.0 git --version → git version 2.54.0.windows.1 `​``

### 2026-06-27 — 確認編輯器

**結果：** `​text Visual Studio Code ✅ `​``

### 2026-06-27 晚間 — MVP-0 完工後更新：content_json 持久化、頁面刪除與交接文件再整理

**背景：** 使用者回報：在前一輪完成三欄 App Shell、IndexedDB、Tiptap 與 Markdown shortcut 後，又做了一批補充整理與實作，並要求：

`​text 日誌須包含詳細過程：執行的動作、遇到的問題、解決方式等等。 剛剛做了一些事，請也歸入檔案。 `​``

本段將使用者提供的新狀態整理為新的最新日誌。若此段與較早日誌衝突，以本段時間序較新者為準。

**2. MVP-0 構建與環境驗證回顧：** #### 執行的動作

`​text 驗證 Next.js 16.2.9 成功啟動於 port 3000。 確認 localhost:3000 可開。 清理 create-next-app 預設畫面。 移除 Deploy Now / Documentation 等預設 Vercel 連結。 建立 Nexus 三欄式佈局。 `​``

#### 遇到的問題

`​text layout.tsx 原本使用 next/font/google 的 Geist 字體。 這與 local-first / 不依賴外部字體資源的方向不完全一致。 `​``

#### 解決方式

`​text 移除 Google Fonts 外部依賴。 改用系統字體 stack。 globals.css 改為 Nexus 極簡 design tokens。 `​``

#### 結果

`​text 三欄 layout 成功顯示。 Sidebar / Editor / Right Panel 結構成為 MVP-0 UI 基礎。 `​``

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


## 2026-08

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
3. 使用者隨後 commit 這兩檔成功：`fe54098`，2 files changed／206 insertions，主旨「新增學習排程相關檔案」；尚未取得後續新

### 2026-09-28 — 三份交接文件主章節一致性整合（本次增量）

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

## 帳號刪除與文件整合決策（日期依歷史來源）
- 登入者僅能透過已驗證 `auth.uid()` 刪除自己的帳號；要求電子郵件、確認字串與交易式回滾，避免前端偽造 owner 或誤刪其他帳號。owner 外鍵、RLS、離線快取及已刪帳號未過期 JWT 防護均須驗證。
- 為保留既有孤兒資料使用 `NOT VALID`，不刪除 `owner=null` 共用舊資料；現有本機 PGlite 測試不等於正式 Supabase RPC 已部署。
- 原 `docs/account-deletion.md` 已在本 PR 分流產品流程至 SPEC、技術規則至 ARCHITECTURE；原文保留 Git 歷史，避免永久多份文件重複維護。

