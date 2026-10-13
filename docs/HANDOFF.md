# Nexus — 最新交接、待驗證與下一步

## 本次 #41／#42 交付（2026-10-13；程式已實作，正式環境未部署）

- 功能分支：`feat/dictionary-edit-inflections`，從 main `d179567763277781f0181693152c7def7fcefe25` 建立。Published 直接編輯、同頁審核儲存／人工發布、實質 dirty／還原判定與三選項離開保護已接入原 revision 流程。
- 構詞選取公開 Entry／Sense ID，支援 Word 成分、去重、更換／移除、鍵盤上下排序及失效目標提示。詞形為附屬記錄，支援動詞、名詞、形容詞／副詞合理類型與 Sense；不新增 went／gone／walked／books 等公開 Entry。舊原始字形保留，JSON／AI roundtrip 納入詞形，CSV v1 遇詞形拒絕有損匯出。
- 自動化工具驗證：TypeScript／Build 通過；字典及 confirm 回歸通過。全專案回歸另有既有 `workspaceSync.test.cjs:287` 版本斷言失敗（預期 7、main 實際 8），在未修改 main 工作樹已重現。隔離介面測試：Chromium 桌面 1280×900／行動 390×844 通過。使用者驗證：真實裝置、正式帳號／雙裝置與 production schema 驗收未執行。
- **需要手動在 Supabase 執行的新增檔案**：`supabase/migrations/20261020_dictionary_edit_inflections.sql`，須先核對既有字典 migrations 至 20261019、備份及 staging 驗證，再另行授權執行。本次沒有在正式 DB 執行 SQL、修改 Vercel／Production Supabase 設定或部署。
- 未完成的遠端工作：staging／production Migration、正式部署及真實帳號驗收。自動詞形推導未採用，現版採人工明確維護； #44 大量交換／完整 CSV schema 與已發布刪除策略屬既有獨立工作，不在本次變更範圍。
- Vercel GitHub HTTP 403 連接問題仍待既有部署工作處理；不因本 PR 修改設定。Issues #6／#14 保持獨立追蹤。



> 2026-10-12 文件遷移基線。以下舊交接卡片的進度與優先級為**2026-09-28 歷史快照**；2026-10-11 以後已有 GitHub Issues 和新提交，必須先核實，不可直接當成現況開工。

## 2026-10-13 Issue 整理及文件同步（目前有效交接）
- GitHub Issues 共 44 筆，其中 38 筆開啟、6 筆已關閉（#2、#3、#4、#5、#25、#33）。#1 吸收 #2；#26 吸收 #25；#32 吸收 #33；#3～#5 因已退場的第八批資料停止規劃。
- #8 不再包含舊四選一 Quiz 恢復；#45 負責安全退場，保護 FSRS。#10 清除舊路徑；#12 改為核對既有 13 份字典資料，**使用者曾完成匯入，尚待原始檔與正式 Supabase 核對，不能盲目重新匯入**。#43 官方學測 pack manifest 需待來源檔及 Entry ID 配對。
- #41 已發布詞條直接編輯與 #42 構詞 ID／詞形模型已規劃，Codex 開發與實際測試／部署狀態仍須核對。
- #44 的產品目標已納入 SPEC：保留 Supabase 為正式字典來源，支援無損匯出、方便大量修改、一次上傳與預覽、自動安全續批及一次確認發布。**不預設新增 GitHub CSV 雙向同步或改造為直接讀 CSV**；完整交換格式待實作調查後決定，不代表已完成。
- **固定協作規則**已更新 AGENTS.md：確定的產品需求先 Issue + SPEC；Codex 實作、測試後更新 ARCHITECTURE 的實際設計與部署邊界；完成驗收才結案。Discovery 和純工程待辦不硬寫成已確認產品規格。
- 本次只更新 GitHub Issues／文件；未修改應用程式、未執行測試或 production 資料庫／部署。

## 一、舊交接工作線與狀態原始基線（待主分支及 Issue 核驗）

## 0. 目前任務環節：正在進行與將要進行【修改】

> 本節列出目前正在進行與下一批待開工的任務。

### 任務 ID 規則

```
M{MVP編號}-{任務序號}    例：M0-0、M3-1、M10-2。
Q-{序號} 為跨階段工程／品質任務。
```

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

### 本節的執行規則

```
一次只開一個 Task ID 或一組有直接依賴的 Task ID。
Task 被列入「將要進行」不代表已開始。
每次正式開工／完成／暫停，都只更新本節與 §10 對應 Task Card 的狀態，不重複改寫其他區段。
```

---

---

## 2. 目前進度：MVP 容器摘要【修改】

> 每個 MVP 的整體狀態；所有任務、估算、依賴與完成條件請看 §10。

| MVP／工作線 | 任務大綱 | 整體狀態 | 摘要 |
| --- | --- | --- | --- |
| MVP-0 | 本地筆記原型 | ✅ 完成 | `M0-0~4` |
| MVP-1 | 個人筆記系統 | ✅ 完成 | `M1-0~7` |
| MVP-2 | 學習／研究核心 | 🟡 未結案 | `M2-0~1` 完成；`M2-2~5` 未開始 |
| MVP-3 | 簡報與結構化內容創作 | 🟡 未結案 | `M3-0` 完成；`M3-1` 大部分完成；`M3-2` 部分完成；其餘未開始 |
| MVP-4 | 共享同步安全與版本 | 🟡 未結案 | `M4-0` 完成；`M4-7／M4-8` 程式已做待實機；`M4-1~6` 未開始 |
| MVP-5 | Stable Block ID、Reference、Canvas | ⏳ 未開始 | 但 `stableBlockIdExtension` 已存在並延伸到講義新節點 |
| MVP-6 | 深度研究、Library、PDF Workspace | ⏳ 未開始 | — |
| MVP-7 | 學習、複習與時間規劃 | 🟡 未結案 | 【修改】`M7-0` 完成；`M7-1` FSRS 已實作待驗收；`M7-7` 測驗持久化已實作；`M7-8` 字典待決策 |
| MVP-8 | 分享與發布 | ⏳ 未開始 | 使用者新增「唯讀分享連結」需求，`M8-0` ⚠️ 等待決策 |
| MVP-9 | 跨平台與 Mobile UI | 🟡 部分 | `M9-0` 手機側欄／小說／講義手機排版已處理，缺實機 |
| **MVP-10** | **創作與個人工具（小說、角色卡、世界觀、講義、網頁、計數、抽選、日曆）** | 🟡 已開始未結案 | 【新增】原本「待分類」的項目收攏於此，容器名稱待使用者確認 |
| Q 工作線 | 跨階段工程與品質 | 🟡 部分 | 新增 `Q-7～Q-9` |

**不屬於任務狀態表的已完成細功能**：PageFormat、表格、工具列、PDF viewer、i18n、講義樣式等，請讀 01 功能規格。

---

---

## 9. 已知風險、待驗收與測試現況【新增，取代舊 §9】

> 舊 §9（2026-08-01 深度審核）已【搬移】至 02 歷史。其中未執行項目 R-5（DOM 測量分頁）、R-6（游標保護搬移）、R-7（分欄比例拖曳）已併入 §10 的 Q-2～Q-4，未遺失。

### 9.1 已知風險

| 風險 | 說明 | 對應任務 |
| --- | --- | --- |
| 遠端 schema 落差 | 見 §A.4 與 §12 | Q-9 |
| `pages.kind` 約束 | web／counter／draw／creative 是否被遠端 CHECK 擋下未知 | Q-9 |
| 大量資料 | 登入後仍整批載入全部頁面；首頁曾回報無法上下滑動（已調整，待大量實測） | Q-7 |
| 分頁編輯性能 | N 頁 = N 個 TiptapEditor 實例（舊 §16 已知風險） | Q-7 |
| 殭屍頁面 | 離線永久刪除後 fullSync 復活，需 tombstone（程式碼中僅出現 1 次相關字樣） | M4-5 |
| 同步衝突 | B2 未做；last-write-wins 不可作正式策略 | M4-2～M4-4 |
| binaries 未分區 | 仍以附件 ID 存取（D-200） | M4-7 |
| 字卡雙裝置分支 | 兩裝置離線答同一張卡會標記 conflict 並停止排程，需使用者手動「保留歷史並重新學習」 | M7-1 |
| 遠端新字卡功能未部署 | 舊客戶端只認 `pages.study_items` | Q-9 |

### 9.2 待真實裝置／正式帳號驗收（前一個 AI 明確標示未驗證）

- 下拉刷新手感（門檻 80px 保守策略）——iOS／Android
- 手機側欄／輔助欄開啟時「禁止編輯與鍵盤焦點」、點擊編輯器後兩欄自動收回
- 平板輔助頁開合鍵位置（不同寬度）
- 首頁大量檔案時的上下滑動
- 手機／平板小說翻頁、角色卡編輯、講義編輯
- 實體列印與各瀏覽器 PDF 分頁差異
- 雙帳號、雙裝置、離線後同步、Google OAuth 回跳
- 剪貼簿權限提示（iOS）
- FSRS：正式 Supabase、兩台實體裝置、iOS 實機
- 小說章節與角色卡在正式帳號的同步

### 9.3 自動化測試現況（程式碼快照內的檔案）

`tests/`：`characterWorkspace`、`novelChapters`、`pullToRefresh`、`lessonDocument`、`studyFSRS`、`studyPractice`、`studyRepository`、`studySessions`、`studySync`、`quizPersistence`、`quizQuestions`（皆 `.test.cjs`）。驗證說明：`creative-workspace.md`、`lesson-workspace.md`、`study-workspace.md`、`workspace-interactions.md`。

最近一次明確回報：講義完成時 14 項測試通過（含 lint／tsc／build）。FSRS／測驗測試完成時的通過數沒有對話紀錄，**開工前請重跑** `node --test tests/*.test.cjs`，再跑 `npx.cmd tsc --noEmit`、`npm.cmd run lint`、`npm.cmd run build`。

---

---

## 10. 任務定義、MVP 大綱與完整任務目錄【修改】

> §10 是 00 中唯一完整的任務資料來源。以下重新整理表格格式（舊檔表格有斷行）；原有任務全數保留，僅更新狀態並【新增】部分任務。

### 10.1 Task ID、狀態與估算規則

```
ID：M{MVP}-{序號}；Q-{序號}。
✅ 完成：實作與既有驗證紀錄已存在。
🟡 已開始：已有基線，尚未達完成條件。
▶️ 未開始／已排定。
⏳ 未開始／未排定。
⚠️ 等待決策：需先確認資料模型、UX 或產品邊界。
```

| 量級 | 淨工程量 | 使用原則 |
| --- | --- | --- |
| XS | < 1 日 | 明確單點修正 |
| S | 1–2 日 | 小型 UI／局部邏輯 |
| M | 3–5 日 | 單一元件／資料流／明確整合 |
| L | 6–10 日 | 跨檔案、migration 或互動測試工作包 |
| XL | 11–20 日 | 新資料模型、跨層工作流、複雜 UX／同步 |
| XXL | > 20 日 | 必須先 discovery／拆分 |

> 量級是單一有經驗 TypeScript／React 開發者的粗略淨工程量，不是日曆承諾。

### 10.2 MVP 任務大綱

| MVP | 任務大綱 | 結案意義 |
| --- | --- | --- |
| MVP-0 | 本地筆記原型 | 可建立、編輯、保存、重開、基本刪除 |
| MVP-1 | 個人筆記系統 | 可搜尋、組織、連結、復原、基本內容交換 |
| MVP-2 | 學習／研究核心 | PDF research flow、公式、最小 citation metadata |
| MVP-3 | 簡報與結構化內容創作 | 可用的物件操作、內容 blocks、可重用 layout |
| MVP-4 | 共享同步安全與版本 | 不以 last-write-wins 作正式資料保護策略 |
| MVP-5 | 知識身分、Block Reference、Canvas 基礎 | 穩定 block identity 與引用底座 |
| MVP-6 | 深度研究、Library、GoodNotes-like PDF Workspace | Reference、annotation、asset／reading |
| MVP-7 | 學習、複習與時間規劃 | Review Queue、Task projection、Calendar、Board |
| MVP-8 | 分享與發布 | Share Page、Link Page、Publish Site |
| MVP-9 | 跨平台與 Mobile UI | Desktop／mobile storage、offline、touch、responsive 規格 |
| MVP-10【新增】 | 創作與個人工具 | 小說、角色卡、世界觀、講義、網頁、計數、抽選、多分類日曆達到可日常使用 |
| Q 工作線 | 工程與品質 | schema、重構、分頁精確度、i18n、效能、regression |

### 10.3 MVP-0／MVP-1（全部 ✅，內容不變）

| ID | 任務 | 狀態 | 量 |
| --- | --- | --- | --- |
| M0-0 | Next.js 專案、三欄 App Shell、系統字體基線 | ✅ | M |
| M0-1 | StorageAdapter、IndexedDB、ID 生成 | ✅ | L |
| M0-2 | Tiptap 基礎 editor、Typography、Markdown heading shortcut | ✅ | M |
| M0-3 | `content_json` 真相、`content_text` 衍生、auto-save、beforeunload | ✅ | L |
| M0-4 | soft delete 基礎與 active page lifecycle 保護 | ✅ | M |
| M1-0 | Search v0 | ✅ | M |
| M1-1 | Sidebar、頁面清單、選取與組織 UX | ✅ | L |
| M1-2 | Tags 與交集篩選 | ✅ | M |
| M1-3 | Lightweight Folders | ✅ | M |
| M1-4 | Page-level Wikilink Backlinks／Right Panel | ✅ | L |
| M1-5 | Trash／Restore、permanent delete、Duplicate、Bulk Select | ✅ | L |
| M1-6 | 基本文字工作流：Document、Markdown、Link／Task／Table／Callout、rich editor | ✅ | XL |
| M1-7 | Workspace UX：Quick Capture、Dashboard、Command Palette、Preferences/i18n、Sidebar layout | ✅ | XL |

### 10.4 MVP-2 — 學習／研究核心

| ID | 任務 | 狀態 | 量 | 前置／完成判準 |
| --- | --- | --- | --- | --- |
| M2-0 | Attachment、PDF Import、PDF Viewer、Research Note flow | ✅ | XL | — |
| M2-1 | Inline／Block LaTeX 與 Markdown round-trip | ✅ | L | — |
| M2-2 | 最小 Citation Metadata contract | ▶️ | L | Q-0；authors/year/venue/DOI/URL/key/abstract 可保存 |
| M2-3 | Research Note metadata UI | ▶️ | M | 依賴 M2-2 |
| M2-4 | Citation metadata Import／Export／Backup／Sync 行為 | ▶️ | M | 依賴 M2-2、M4-1 |
| M2-5 | 研究流程回歸驗證 | ▶️ | S | PDF import → note → metadata → reopen／backup |

### 10.5 MVP-3 — 簡報與結構化內容創作（狀態未變）

| ID | 任務 | 狀態 | 量 | 前置／完成判準 |
| --- | --- | --- | --- | --- |
| M3-0 | Presentation Hybrid 基線 | ✅ | XL | 可建立、編輯、保存、reload |
| M3-1 | 物件選取、縮放把手、邊界限制 | 🟡 | L | 大部分完成；旋轉後 resize 方向待改善 |
| M3-2 | 對齊／吸附線與多物件定位 | 🟡 | L | 對齊按鈕完成、吸附線未做 |
| M3-3 | 群組、鎖定、圖層持久化 | ▶️ | L | 依賴 M3-1～2 |
| M3-4 | 數據／文字圖表編輯體驗細化 | ▶️ | M～L | ChartData 選項欄位已存在但 ChartRenderer 尚未依它們渲染 |
| M3-5 | Mermaid 與 recharts 整合 | ▶️ | M～L | 先定 rendering/export policy |
| M3-6 | Slide Master／Layout／Theme 最小模型 | ⚠️ | XL | 先確認資料契約 |
| M3-7 | 簡報 reload／sync／真實瀏覽器 QA | ▶️ | M | 已選 M3 工作包完成後 |
| M3-8 | Image Insert／Asset insertion 基線 | ▶️ | L | 註：講義排版已支援圖說與圖片節點的穩定 ID；圖片插入本身的 Asset 規則仍待定 |

### 10.6 MVP-4 — 共享同步安全與版本【修改】

| ID | 任務 | 狀態 | 量 | 前置／完成判準 |
| --- | --- | --- | --- | --- |
| M4-0 | Supabase 同步基線：full sync、Realtime、push/pull | ✅ | XL | 已由「共享 workspace」演進為「帳號 workspace」（D-198） |
| M4-1 | Sync coverage audit | ▶️ | M | Q-0；需涵蓋 `pages`、`attachments`、`binaries`、`study_*` 四表與 RPC、`quiz_*` |
| M4-2 | revision conflict detection／事件模型 | ▶️ | M | 依賴 M4-1（註：字卡已自帶事件鏈式衝突偵測，頁面尚無） |
| M4-3 | 版本快照與 retention 策略 | ▶️ | L | 依賴 M4-2 |
| M4-4 | 保留雙版本與手動解決 UI | ▶️ | L | 依賴 M4-2～3 |
| M4-5 | offline/reconnect/delete/attachment 衝突語意（含殭屍頁面 tombstone） | ▶️ | L | 邊界測試矩陣 |
| M4-6 | Backup Import 與雲端再同步規則 | ▶️ | M～L | 備份 schema 已到 v2（含字卡）；還原後不被舊雲端覆蓋仍待驗 |
| M4-7 | Account scoped local workspace | 🟡 | M | 【修改】pages／attachments／study 已按帳號分區；登入必須制取代匿名工作區；**缺兩帳號實機驗證**；binaries 未分區；一次性歸戶遷移（授權 `changling971216@gmail.com`）已寫入邏輯，完成標記行為需實測 |
| M4-8 | Auth and OAuth regression | 🟡 | M | Email／Google 登入、redirect、RLS 已配置；缺真實裝置與雙帳號雙裝置矩陣 |

### 10.7 MVP-5／MVP-6（狀態未變）

| ID | 任務 | 狀態 | 量 | 說明 |
| --- | --- | --- | --- | --- |
| M5-0 | Stable Block ID contract | ▶️ | M | 註：`stableBlockIdExtension` 已存在並涵蓋新講義節點，但 contract／backfill／測試未完成 |
| M5-1 | 舊 content_json normalize／backfill | ▶️ | L | 依賴 M5-0 |
| M5-2 | 新增／匯入／複製／拆分／合併 ID 去重 | ▶️ | L | 依賴 M5-0～1 |
| M5-3 | Block ID regression tests | ▶️ | M | 依賴 M5-0～2 |
| M5-4 | Block reference／transclusion 最小體驗 | ⏳ | L | — |
| M5-5 | Canvas Page／Block reference 基線 | ⏳ | XL | — |
| M6-0 | Reference／Bibliography 深度模型 | ⏳ | L | — |
| M6-1 | Annotation anchor | ⏳ | XL | — |
| M6-2 | PDF highlight／annotation UI | ⏳ | XL | — |
| M6-3 | Asset Library／Reading List | ⏳ | L | — |
| M6-4 | Collection／Properties filter/sort/table | ⏳ | XL | — |
| M6-5 | GoodNotes-like PDF Import Workspace discovery | ⏳ | L～XL | — |
| M6-6 | GoodNotes-like PDF workspace implementation | ⏳ | XL～XXL | 依賴 M6-5 |

### 10.8 MVP-7 — 學習、複習與時間規劃【修改】

| ID | 任務 | 狀態 | 量 | 說明 |
| --- | --- | --- | --- | --- |
| M7-0 | Study Set、CSV/TSV、四選一、Quick Notes、Todo 日曆基線 | ✅ | XL | — |
| M7-1 | Review Queue 與 review state | 🟡 | L | 【修改】程式碼推導：FSRS-6 每日練習已實作（到期優先、新字額度、事件鏈、衝突處理）。FSRS migration 使用者確認已部署；仍缺雙裝置、iOS 端到端驗證 |
| M7-2 | 雙向拼寫／容錯／提示 | ⏳ | M～L | 現況：每日練習只做英→中主動回想；測驗支援雙向，`quiz_direction` 預設中→英 |
| M7-3 | Task projection：Note task/manual task 聚合 | ▶️ | L | Task view 不另存重複真相 |
| M7-4 | Calendar／Event projection | ⏳ | L | 與 M10-4 需一起規劃 |
| M7-5 | Board／status workflow | ⏳ | L | — |
| M7-6 | Quick Notes／Todo 的 Search/Backup/Sync 整合 | 🟡 | M～L | 【修改】獨立 store 已廢棄（D-186），因統一 pages store 天然涵蓋；仍需 Q-0 核對 |
| M7-7 | 四選一測驗持久化（答錯分數、離線批次上傳確認、事件收據） | 🟡 | M | 【新增，程式碼推導】`quiz_*` stores＋`apply_study_quiz_operation` RPC；離線作答須經使用者決定上傳／捨棄／稍後 |
| M7-8 | 字卡字典／匯入字典／近義詞群組練習 | ⚠️ | L | 【新增】使用者 09-16 提出「直接有字典或匯入字典，讓意義相似的詞多練習，或有其他做法」，AI 未回答方向；程式碼無任何字典實作。需先討論（見 §11） |

### 10.9 MVP-8 — 分享與發布【修改】

| ID | 任務 | 狀態 | 量 | 說明 |
| --- | --- | --- | --- | --- |
| M8-0 | Share Page 最小資料／公開邊界 | ⚠️ | M～L | 【修改】使用者 09-16 提出：小說、角色卡、筆記可分享，「知道連結的人可檢視」，可先不做共編，「或有其他方法也告訴我」。與 owner_id RLS 的關係、匿名唯讀讀取路徑、撤銷連結皆未定，**必須先做 discovery** |
| M8-1 | Link Page／Landing Page | ⏳ | L | 依賴 M8-0；與 M10-5 合併規劃 |
| M8-2 | Publish Site | ⏳ | XL | 依賴 M8-0～1 |

### 10.10 MVP-9 — 跨平台與 Mobile UI【修改】

| ID | 任務 | 狀態 | 量 | 說明 |
| --- | --- | --- | --- | --- |
| M9-0 | Mobile UI standards discovery | 🟡 | L | 已做：側欄浮層不擠壓編輯器、小說手機捲動、講義手機排版、模板選單邊界。未完成：開啟側欄時禁止編輯／鍵盤焦點、點編輯器自動收回兩欄的驗收、實機 |
| M9-1 | Tauri feasibility／StorageAdapter audit | ⏳ | XL | 依賴 M4 |
| M9-2 | Tauri desktop MVP | ⏳ | XXL | 依賴 M9-1 |
| M9-3 | Capacitor feasibility／offline UX | ⏳ | XL | 依賴 M9-0～1 |
| M9-4 | Capacitor mobile MVP | ⏳ | XXL | 依賴 M9-3 |
| M9-5 | 【新增】手機／平板插入組件方案（是否需要包成 App） | ⚠️ | M | 使用者 09-16 提問，AI 未回答。程式碼快照內**沒有** PWA manifest 或 service worker。需先確認「想插入的組件」具體指哪些 |

### 10.11 MVP-10 — 創作與個人工具【新增】

> 使用者 09-16 提出一份長需求清單，前一個 AI 逐項盤點後實作。下表整合「原始需求 → 目前狀態」。

| ID | 任務 | 狀態 | 量 | 現況與缺口 |
| --- | --- | --- | --- | --- |
| M10-1 | 小說獨立章節（`novel_chapter`）與翻頁 | ✅（本機）| L | 獨立章節記錄、目錄、頂部與底部「上一章／選章／下一章」、排序／重新命名／刪除、啟用時才搬移舊正文；登入後不會自動選中章節。**遠端需套用 `20260916`（ledger）** |
| M10-2 | 角色卡區塊與混合內容 | ✅（本機）| L | 區塊內可含多種內容；類型含長文（預設收合）、短文、雷達圖、評分、偏向、統計、色票、相冊、連結、音樂；統計有可改小標與加總；組件標題已無 emoji |
| M10-3 | 角色卡分頁 | ✅（本機）| M | 底部分頁切換、新增／重新命名／排序／刪除（含確認）；原 sections 成為「基本資料」分頁 |
| M10-4 | 模板系統（自訂模板、範文、管理、專用模板） | ✅（本機）| L | 只在建立時選擇、建立後不可更換；「將目前組件與內容設為模板」；管理（重新命名等）；範文以 placeholder 呈現不寫入資料；空白／D&D 5e／CoC 7e 為專用欄位（僅記錄，不是規則計算器）。模板存為 `character_data.isTemplate = true` 的 creative 頁面 |
| M10-5 | 世界觀 | 🟡 | M | 可建立；角色可歸屬（`world_id`）或獨立。世界觀本身沿用角卡式結構（`creative_type: world`）。「與小說關聯」已取消 |
| M10-6 | 多分類日曆 | ⚠️ | L | **未做。** 現況只有待辦月曆（`TodoView`）。使用者要求：特殊日、排班表、記帳、日記1、日記2、要事、todolist，可同時或單獨顯示，並可自訂分類。「可能要再規劃」→ 先 discovery。程式碼中無排班／記帳／日記相關實作 |
| M10-7 | 網頁（lit.link 類） | 🟡 | L | 現況只有介紹＋連結清單編輯（`UtilityView`）。缺對外展示頁、版面、公開網址 → 依賴 M8-0／M8-1 |
| M10-8 | 計數（大組／小組） | 🟡 | M | 現況：每個小組有 `group` 文字欄，依名稱加總，未分組者獨立。缺：真正的大組物件、階層編輯 UI。**資料模型待討論**（小組可獨立存在、大組是加總） |
| M10-9 | 抽選（標籤資料庫） | 🟡 | M | 現況：單筆多標籤、勾選標籤後為「全部符合」再抽 N 個。缺：各標籤各抽幾個、標籤配對／組合規則 |
| M10-10 | 講義排版與目錄 | ✅（本機）| L | 樣式（原有／課本／講義）、教學區塊（定義／例題／練習／解答）、作答留白、頁首頁尾、自動目錄與題號、依 A4 整理分頁（可復原、不切掉超高區塊）。設定存於 `content_json.lessonLayout`。**教師／學生版 PDF 已取消（D-204）**；建議清單中的「交互參照」尚未做 |
| M10-11 | 導航、新增與偏好重整 | ✅（本機）| M | 側欄兩欄格（第一列全部項目／日曆；其餘最近使用排序，可在設定改預設／自訂）；新增選單隨功能切換（筆記→流動／分頁；創作→世界觀／角色卡；小說→小說）；下拉刷新保守化；右鍵／表格／編輯選單含全選、複製、貼上、剪下；偏好第一層四項＋詳細設定；新註冊帳號不再建立 Untitled；右上角帳號入口移除 |

### 10.12 Q 工作線【修改】

| ID | 任務 | 狀態 | 量 | 說明 |
| --- | --- | --- | --- | --- |
| Q-0 | current schema reconciliation | ▶️ | M | 範圍見 §0 |
| Q-1 | Phase B/C：hooks、重複邏輯、Registry、dnd-kit 整理 | 🟡 | M～L | `NexusApp.tsx` 仍是超大檔（快照中約 2300 行），仍建議切片 |
| Q-2 | PaginatedEditorView DOM measurement | ▶️ | L | 講義的「依 A4 整理」已用實際量測，可借鑑 |
| Q-3 | 分頁游標保護搬移 | ▶️ | M | — |
| Q-4 | 分欄比例拖曳 | ⏳ | M～L | — |
| Q-5 | Callout icon 真實瀏覽器 bug | ⏳ | S～M | — |
| Q-6 | i18n／accessibility／real-browser regression matrix | ▶️ | M | 新功能字串多為寫死中文 |
| Q-7 | 大量資料效能／壓力測試 | ▶️ | M | 【新增】 |
| Q-8 | 真實裝置驗收矩陣 | ▶️ | M | 【新增】收攏 §9.2 |
| Q-9 | migration ledger 與遠端約束核對 | ▶️ | S | 【新增】§12 |

### 10.13 歷史 Track 與新 Task ID 的關係（沿用）

```
舊 Track A～M 是歷史實作批次名稱，不再作目前任務 ID。
新 M0-*～M10-*／Q-* 是目前唯一任務目錄。
自 2026-08-02 起統一採 M0-0、Q-0 短格式；舊零填充編號僅作歷史別名。
```

---

---

## 11. 使用者已提出但尚未被回答／決策的事項【新增】

> 以下都出現在 09-16 的長需求清單。前一個 AI 只在「尚未完成」表中把它們列為待釐清，沒有給出方案。**不得視為已解決。**

| # | 使用者原意 | 目前狀態 | 建議的下一步 |
| --- | --- | --- | --- |
| 1 | 「我在憂慮我現在功能與資料那麼多有沒有炸掉的風險」 | 未回答；未做壓測 | Q-7：先量測（頁面數量 × 載入時間、分頁筆記 N 頁、首頁捲動），再回答 |
| 2 | 「想在 iPad 或手機上插入一些組件，需要先成為 app 嗎，還是有其他方法」 | 未回答；程式碼無 PWA | M9-5：先問「想插入的組件」具體是什麼（圖片？檔案？網頁嵌入？），再比較 PWA／Capacitor／純網頁 |
| 3 | 每個項目（小說、角卡、筆記）可分享，知道連結者可檢視，先不共編，「或有其他方法也告訴我」 | 未做，也未給替代方案 | M8-0 discovery：公開連結資料模型、撤銷、唯讀渲染路徑、與 RLS 的關係 |
| 4 | 字卡：「要不要直接有字典，或匯入字典，讓意義相似的詞多練習，或其他做法」 | 未回答；已改做 FSRS | M7-8 discovery：字典來源與授權、近義詞分組方式；可與 FSRS 事件資料如何互動一起討論 |
| 5 | 日曆：「可能要再規劃一下，讓用戶也能自訂分類」 | 未做 | M10-6 discovery |
| 6 | 計數：大組／小組資料模型 | 目前以文字欄近似 | M10-8 模型確認 |
| 7 | 09-19「你覺得能夠怎麼改良」（課本／講義排版） | 已回答並實作四項建議中的三項；「交互參照」與教師／學生版未做（後者取消） | 是否補「交互參照」由使用者決定 |
| 8 | 09-16 Steam「角色屋」多螢幕 | 專案外問題，對話中無回覆紀錄 | 不列入專案任務 |

另有一項**新增的 UI 差異需使用者確認**：使用者要求功能排序有「最新使用／預設」兩種，程式碼另有第三種 `custom`（自訂排序），詳細設定裡已可自訂並保存（講義驗證中曾測試自訂排序後復原）。這是前一個 AI 自行加入或後續補充，需確認是否保留（預設仍為最新使用）。

---

---

## 12. 環境、部署與 Supabase migration ledger【新增；併入舊 §11／§12 的環境資訊】

### 12.1 環境

- 專案：`C:\Users\user\Desktop\Projects\nexus`
- 正式網址：`https://nexus-five-alpha-75.vercel.app/`
- Supabase Auth：Site URL 為上述網址，Redirect URL 含 `https://nexus-five-alpha-75.vercel.app/**`；Google Cloud callback 維持 Supabase `.../auth/v1/callback`（D-202）
- Google Cloud 專案 `handy-resolver-508512-q8`；OAuth 同意畫面名稱 `Personal Notes Workspace`
- 帳號歸戶：舊雲端資料已歸戶至 `changling971216@gmail.com`
- 密鑰（Google Client ID／Secret）只在 Supabase Provider 設定，不進程式碼或文件（D-199）

### 12.2 Migration ledger

| 檔案 | 用途 | 依據 | 遠端狀態 |
| --- | --- | --- | --- |
| `20260913_account_isolation.sql` | owner_id、RLS、移除 allow-all | 舊 00 §11：已執行、舊資料歸戶 | ✅ 依文件已套用 |
| `20260914_creative_sync_fields.sql` | `creative_type`、`character_data`、`novel_settings`、`assistant_blocks` | 舊 00 §12：使用者已執行 | ✅ 依文件已套用 |
| `20260916_novel_chapters.sql` | 允許 `novel_chapter` kind、必填欄位約束、章節索引 | 09-16 回報「尚未套用遠端」，之後無紀錄 | ⚠️ 未知 |
| `20260922_study_fsrs.sql` | `study_cards`、`study_card_states`、`study_review_events`、`study_deck_settings`＋RPC `apply_study_operation` | `study-workspace.md`：只在本機 PGlite 測試 | ✅ 使用者於後續對話確認已套用；尚未獨立查詢遠端 |
| `20260925_study_quiz_persistence.sql` | `study_card_quiz_states`、`study_quiz_attempt_receipts`＋RPC `apply_study_quiz_operation` | 只有 SQL 與測試檔 | ⚠️ 尚未確認套用；**依賴已套用的 20260922** |
| `20261020_dictionary_edit_inflections.sql` | #41 原子首次編輯儲存、#42 詞形附屬表／索引／RLS／revision／搜尋與 Word 構詞 | 此 PR 隔離 PGlite 測試；需既有字典 migrations 至 20261019 | 🟡 僅建立 SQL 檔，正式 DB 未執行，須另行授權 |

**套用順序**：09-13 → 09-14 → 09-16 → 09-22 → 09-25。

**另需核對（無 migration 檔）**：`pages.kind` 欄位是否有 CHECK 約束，若有，是否已允許 `creative`、`web`、`counter`、`draw`。`20260916` 的 DO 區塊只會替既有約束加上 `novel_chapter`；若約束不含其他新 kind，同步會被拒。

### 12.3 部署狀態

前一個 AI 對每一輪都註明「尚未部署」。09-21 之後的部署歷史沒有紀錄。**請使用者告知目前 Vercel 上跑的是哪一個版本。**


---

---

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

## 二、文件遷移狀態（2026-10-12）
- 三份舊交接全文已封存 `docs/archive/`，位元組大小 00 = 44,939、01 = 77,340、02 = 694,409；本次將 Canon 功能卡、UI、資料模型、安全、匯入匯出、驗收標準**逐節轉移**至 SPEC / ARCHITECTURE，重要歷史以 HISTORY 索引。
- 舊 `00` 的所有主要 Task Card 與未知決策保留於本文件，以便按最新 GitHub Issues 更新，不把歷史狀態臆定為現在。
- `02` 舊日誌保留在 archive 並於 HISTORY 建立具名章節索引；微小 debug/重複操作不另佔新核心文件正文。
- 當前程式碼第一輪已核對 IndexedDB v8、Backup v3、FSRS、Dictionary Import Review、Score UI 和 SyncEngine；完整回歸仍缺。

## 三、接下來的程序（由使用者決定）
1. 使用者編修 SPEC；AI 審查矛盾、權限、資料風險及過度設計，討論後確認各模組 Approved。
2. 對已定案模組審查 ARCHITECTURE 與 migration 設計；不讓過時 code 偷換產品需求。
3. 用現行產品／技術文件、GitHub Issues 和 main 實際程式做 Gap Analysis，核對測試與 production 環境後才排實作。
4. GitHub PR #40 尚未合併 main。未完成 CI / E2E / Vercel / production Supabase 核查前，不宣稱正式部署。


## Canon §10 原始規格與任務交叉索引（移入本檔；以最新 GitHub Issues 核實）

## 10. 與 00 任務規劃的關係

### 10.0 現行功能規格與任務對照（唯一交叉索引）

| 功能卡／領域 | 00 對應任務 | 規格成熟度與注意事項 |
| --- | --- | --- |
| F-NOTE／F-DOCUMENT、核心編輯器與導覽 | MVP-0／1、`Q-1`、`Q-6` | 核心基線；跨裝置及大型資料回歸另計 |
| F-PDF（Research／未來匯入工作空間） | MVP-2、`M6-5`／`M6-6` | 現有附件基線；完整 PDF workspace 仍屬 discovery |
| F-STUDY（Daily、Review、Quiz） | `M7-0`／`M7-1`／`M7-2`／`M7-7` | 本機指定測試 25 項通過；正式雙裝置及雲端 quiz migration 仍待驗證 |
| F-DICTIONARY（唯一公共百科、管理、搜尋、個人字卡連結與翻面） | `Q-0`／`Q-9` → `M7-9`～`M7-12` | 核心資料層、Admin／Reader、revision、identity、Official Packs、字卡連結已實作並多輪套 migration；前端部署與正式大量匯入仍待驗收 |
| F-SCORE（製譜） | 待編正式 Task ID | C2 階段順序確認；音樂語法／最小輸出仍在草案 |
| F-PRESENTATION | `M3-*` | 有本機基線；吸附／群組／Undo 等仍待完成 |
| F-QUICKNOTE／F-TODO／多分類日曆 | `M7-0`／`M7-6`／`M10-6` | 月曆基線；C3 多分類資料模型再議 |
| F-NOVEL／F-CHARACTER／F-WORLD／Creative | `M10-1`～`M10-5` | 部分本機完成；遠端新增 kind 約束仍待查 |
| F-UTILITY（網頁／計數／抽選） | `M10-7`～`M10-9` | 計數 C4 大組由小組派生；抽選 C5 細節未回覆 |
| F-LESSON（講義） | `M10-10` | 本機基線；C8 交互參照明確暫緩 |
| F-NAVIGATION／F-PREFERENCES／Mobile | `M10-11`／`M9-0`／`Q-6` | 既有 UI，Mobile C6 仍再議，真實裝置驗收不足 |
| F-SHARE／網站發布 | `M8-0`～`M8-2` | A1 確定另設唯讀分享；C1 匿名、撤權、附件尚未決定 |
| 同步／備份／資料安全 | `M4-*`／`Q-0`／`Q-9` | 遠端 ledger 有衝突；B3 備份版本依最新 source 待核 |
| Stable Block ID／Canvas／Graph／Asset | `M5-*`／`M6-*` | 保留未完成能力，不虛構完整技術契約 |


01 定義功能與契約；00 定義任務、依賴與估算。

- 目前正式任務 ID：`M0-*`～`M10-*`、`Q-*`；格式見 00 §10.1。
- 不在本節重複工作量；以 `00` §10 與任務附件為準。
- 新功能加入 01 時，必須同時記錄：功能規格卡、資料契約、限制、驗收條件、對應 Task ID。

---

## 2026-10-12 遷移驗收狀態
- 已完成三份舊資料共 **239 個 Markdown 二級章節**的去向／處置台帳：`docs/CANON-CROSSWALK.md`。舊對照表已移出工作樹，必要時可由 Git 歷史查閱。
- 已將 02 中的有日期重要事件（81 筆）、早期 D 編號決策章節、01 的正式產品／技術契約，以及 00 的交接工作矩陣分流進新核心文件。
- **仍需注意**：239 節是結構層級追蹤，不是逐字逐句的語義完整性證明；02 中重複的操作、過時規格副本、原始除錯逐行記錄仍以只讀 archive 保存，不能宣稱這些內容全部出現在四份核心文件。
- **不以此驗收替代** 現行程式碼、CI、Vercel 或 production Supabase 的驗證。

## 2026-10-12 互動規格制度新增
- `SPEC.md` 已定義必填的頁面、元件、尺寸、位置、完整操作步驟、導覽、設定、響應式與驗收模板。
- **模板已建立，不代表所有模組已逐頁填完或每個 UI 數值已核准。** 現有 Canon 為基線，後續由使用者逐模組修訂及審查，再規劃架構與現有程式碼差異。

## 2026-10-12 公共字典 UI 改版執行清單（交給 Codex）

> 以下是**相對舊介面的變更工作**，不是產品長期規格。請先盤點現行實作與路由，再依 `SPEC.md` §六更新；**本次僅建立任務，沒有修改程式碼**。

- [ ] 權限入口：公共字典「管理」入口僅管理員可見，登入後直接使用既有身分進入管理／編輯，不加第二次人工確認提示。**伺服器端每次受保護寫入仍須核驗授權角色**；不得因隱藏管理按鈕而移除 RLS、RPC/API 權限檢查。
- [ ] 移除詞條詳情下方「回到全部單字」按鍵及其冗餘導覽邏輯；保留「返回實際來源」及來源清單狀態（搜尋、篩選、捲動）。
- [ ] 詞條詳情新增／調整「上一筆」「下一筆」控制項；以來源清單排序決定導航；手機和平板支援左右滑動並處理與內層捲動／系統手勢的衝突。
- [ ] 管理員於詞條詳情右上角直接進入當前詞條編輯狀態，完成後回詳情，不強制先開啟公共字典管理頁。一般使用者不可看見／使用編輯功能。
- [ ] 同一來源注釋從多個零碎卡片合併為一個來源容器，保留小標與內部排版；多來源仍能清楚區分。
- [ ] 盤點舊 SPEC 內的歷史／否定式操作敘述。其變更原因與刪除任務以 HANDOFF／HISTORY 記錄；正式定案的產品規格改成正向「應提供什麼」的語句，保留安全、資料一致性等必要約束。
- [ ] 決定待定尺寸、動線及手勢參數前，先提交產品負責人確認，避免 Codex 自行把暫定數值寫成核准規格。
- [ ] 驗收：普通使用者與管理員雙帳號、直接 API 未授權寫入、來源返回、上一筆／下一筆首末邊界、手機／平板手勢、編輯後返回、同來源顯示合併。

## 2026-10-12 SPEC 舊 Canon 衝突內容移交：公共字典最初規劃

> 下列是原 SPEC 的早期 `F-DICTIONARY` 功能卡全文；已被後續 2026-10-08、2026-10-11 及 2026-10-12 決策更新，保留供 Codex 對照舊程式與執行清理，**不再是最終產品契約**。

<details>
<summary>舊公共字典功能卡（歷史與移除事項）</summary>

### F-DICTIONARY — 全站共用字典與管理後台（`M7-8` 容器；`M7-9～M7-12` 四期）

**成熟度：公共字典核心與 revision／identity／Study reliability 相關 migration 已多輪進入 production；`20261012`～`20261017` 已由使用者回報套用。前端 deployment 仍需獨立確認；`20261018` pronunciation migration 尚待 production 成功回報。** **使用者新增明確產品決策：全站只有一份公共字典／百科，由管理員維護；用戶建立並擁有的是自己的字卡，可連結此公共百科取得額外詳情；不規劃「每位用戶另有私人字源百科」。** 舊 owner-scoped `etymology_*` 與 Batch-08 PGlite importer 只是既有資料結構／處理工具，保留防資料遺失，不得當成新產品功能。CEEC 詞表處理／43 筆特殊條目審核仍暫停，不阻塞後台第一期。

- **M7-9 資料、權限及已發布可讀層**：唯一公共百科使用獨立資料層，與個人字卡／排程及舊 `etymology_*` 物理與 RLS 分隔；舊表暫不刪、不改 RLS，也不新增私人百科前台。首版僅已登入使用者可讀發布內容；匿名「唯讀分享連結」屬另一產品功能（A1，`M8-0`），不能靠開放私人資料的 RLS 實作。管理員沿用現有 Google OAuth 帳號，以後台核對後的 Supabase Auth UUID 安全綁定權限，不能單憑可修改的 email／前端 UI 授權。實際表名、migration、角色及權限需 `Q-0`／`Q-9` 實查後核定。
- **內容模型**：單字、字首與字根三類；單字可含多詞性／繁中義，構詞關係指向特定 sense ID，同形異源不得誤併。historical etymology 與 mnemonic decomposition／記憶情境明確分離，保留來源、授權、原文、來源 SHA、查證狀態、修訂／操作紀錄及穩定識別；舊檔 `con.md` 已改為 `con-prefix.md`，遷入前不得將兩版 path-derived ID 當作同一 ID。
- **A2 已確認：草稿／發布區分**。管理員能編寫、保留草稿並主動發布；普通使用者僅看已發布資料。其他審核中／撤回等狀態只作現有候選設計，最終發布／撤回版本及舊卡連結語義屬 **A3 待議**，不可視為已決。**A4** 首批公開資料授權／翻譯重製策略待議；未核可前限測試資料。**A5 範圍澄清**：先前「私有原稿轉公共」只可能指既有 owner-scoped 字源檔／資料如何經授權與審核轉入唯一公共百科；**使用者並未要求私人百科或個人字卡投稿機制**。是否需要舊資料轉入及其審核流程仍未決，非本輪公共字典實作前置。
- **M7-10 管理後台**：依權限編輯單字／字首／字根；CSV 處理單字與義項，Markdown 處理詞源；匯入需預覽、驗證、來源／衝突差異、冪等、交易／回滾、稽核；匯入不得自動公開，須按 A2 經管理員發布。
- **M7-11 使用者介面**：所有已登入用戶及管理員於字卡首頁頂部開啟字典總覽，按三類搜尋已發布詞條；管理入口僅管理員可用；約 7,000 字量級的查詢性能需測。字卡輸入時的自動選字不在首輪。
- **M7-12 個人字卡連結及翻面後詳情**：使用者保有自行撰寫的字卡英文／中文內容，可選擇以穩定詞條 ID 連結唯一公共百科作補充，不複製完整百科或被百科變更直接覆寫；具體建立連結的操作 UI 尚待確認，不預設自動連結。每日學習和正式複習只於背面展開詳情；已連結者優先依穩定 ID 查詢，未連結而依字串查詢時遇同形多候選須讓使用者選擇，不得錯誤自動連結，缺資料／失敗不阻擋評分。評分鈕 → 詳情 → **詳情內容末端捲動提示**（B2），不新增任何 FSRS 事件，不阻擋既有 session。
- **驗收邊界**：雙帳號與直接 API/RLS 測試、未發布資料隔離、匯入失敗回滾、詞條發布前後狀態、跨裝置／小螢幕行為及約 7,000 筆查詢。公開 migration 或部署需獨立批准及遠端確認。




</details>

## 2026-10-12 SPEC 清理第二批：歷史狀態、舊需求與移除指令

- **公共字典歷史版本與狀態**：舊 F-DICTIONARY 曾混雜「尚未實作」、不同權限策略、一般來源欄位及舊匯入介面等敘述；最終產品依 SPEC §六及新 F-DICTIONARY，Codex 實作前確認與現行前後端的差異。

### 從 SPEC 轉出的歷史／實作描述
- **未完成／已決方向**：全站公共字典、管理端、搜尋與底部詳情已有確認契約（§4 F-DICTIONARY／F-STUDY；Task `M7-9～M7-12`），但尚未實作。近義詞群組練習（`M7-8` 的殘餘需求）、雙向拼寫與容錯（`M7-2`）、SRS 個人化和真實雙裝置驗收另待規劃。
- **現行實作檔路徑**：`src/features/study/studyFSRS.ts`、`studySessions.ts`、`StudyRepository.ts`。使用者本機已 `git rm` 舊 `src/lib/` 重複模組，兩組指定測試 21/21 與 4/4、build 成功；清理的 commit/push 尚未獨立確認。
- > 本節覆蓋較早「同形異義拆成多 Entry」「公共字典尚未實作」「source retirement 尚未 production」等舊敘述。舊內容只作歷史追溯。
- `20261017_dictionary_entry_identity.sql` 已由使用者回報 production 套用成功，DB unique index 正式保護此 identity。
- `20261018_dictionary_pronunciations.sql` 已審查可執行，但本版文件更新時**尚未收到 production 成功回報**；前端也未確認部署。
- DataSourcesAndCopyright UI 已由 Codex 回報實作；具體第三方版本／授權清單仍需依實際採用來源維護。
- migration production 狀態與前端 deployment 必須分開記錄。
- **目前狀態**：已向 Codex 發出基礎框架實作指令（統一 Score core model、簡譜／五線譜／吉他 adapter、基本 measure/note/rest 編輯），但尚未收到完成回報；不得視為已實作或已部署。

### 已取消／不列入產品目標的舊需求
- Audio / Video | 🚫 暫時不考慮添加（角色卡「音樂」組件只保存外部連結，不是音訊功能）
- Audio / Video | 🚫 | 暫時不考慮添加
- 世界觀／人物／地點與小說關聯 | 🚫 | 使用者明確排除 | 不排程
- 教師／學生版 PDF | 🚫 | 使用者明確排除（D-204） | 不排程
- Audio / Video | 🚫 | 暫時不考慮添加 | 不排程

### Codex 文件與程式盤點要求
- 對照最新 SPEC 需求，搜尋所有舊公共字典頁、重複管理員確認、詞條底部返回全部單字及碎片化來源卡片；規劃對應移除／整併，並核對資料與權限。
- 現存較早 Canon 的進度圖示與 Task ID 屬歷史追溯，不能把其中的「未完成」當作最新程式碼事實；按 main、Issues、測試與實際部署核實並更新 HANDOFF。

## 2026-10-12 SPEC 文書層級整改補充
- 將 Windows/PowerShell、workspace 覆寫交付、資料真相、migration 先核可等工程執行要求留給 AGENTS／ARCHITECTURE；SPEC §1.2 只留產品使用性要求。
- 將 Workspace Backup、Supabase Sync、i18n、Template System 的「本機版本」「測試狀態」「未完成」與特定歷史評價從產品摘要抽離；實際工程狀態以 HANDOFF、GitHub Issues 與程式碼查證為準。
- SPEC 中具真正安全與資料一致性的負面限制（例如阻止未授權資料修改、避免匯入污染與 FSRS 假事件）保留為必要的產品／安全契約，不視為過時操作敘述。

## 2026-10-12 SPEC 產品敘述清理與後續整改
- 已將 SPEC 核心功能、系統視圖、工具列表中的舊進度符號／Task ID／實作狀態移出，改用目標行為及「待審／待規劃」標籤。
- 已修改 SPEC 的文件定位，拆分正式產品需求與開發驗證；字典仍沿用本日確認的管理員直接編輯、詞條前後導覽、按來源合併注釋。
- 已整理 Study 的舊程式碼清理紀錄、部分歷史遷移說明及製譜 Codex 回報。具日期的變更原因由 HISTORY 追溯，技術與驗證依據由 ARCHITECTURE / Git 追溯。
- **仍需逐模組精修**：在個別 F-* 長篇契約與匯入欄位描述中，仍可能包含 legacy label、實作完成回報或「不要做」式的說明。以 SPEC 正向目標為準，逐步遷出這些記錄，但不得犧牲必要的資料安全、驗收與規則約束。
- Codex 實作項目：待產品細節核准後，以新版 SPEC 對照目前 main UI、路由、設定及 schema，建立逐項差異與驗收案例；不得將產品規格句子當成已完成程式碼的證據。


## 2026-10-12 筆記功能定位更正與後續 Codex 工作

- 使用者已明確澄清：目標是**擴充一般筆記編輯工具**，使筆記自由製作題庫、考卷與類似講義的內容；「講義」不是獨立文件類型，也不是必須切換的排版模式。
- 已將原 SPEC 的 `F-LESSON` 有效需求整合至 `F-NOTE`（使用者操作）及 `F-EDITOR`（通用工具），並移除 `F-LESSON` 獨立產品章節。
- [ ] Codex 先清點現有 `lessonBlock`、`answerSpace`、`lessonToc`、排版設定、插入工具的能力和依賴，對照新版 `F-NOTE`，提出最小相容調整；保留既有筆記及已儲存的節點內容。
- [ ] 新增或完善通用「題目／題號」「選項」「答案／解析」「作答空間」編輯能力；不得僅為建立講義才可使用。
- [ ] 核對題目與選項的自動編號、拖曳、複製、復原、A4 分頁、列印及保存／還原；檢查手機版插入選單。
- [ ] 編碼前先請使用者核准題號格式、選項佈局與預設值等未決 UI 細節，不擅自把設計草案升級為正式規格。
- **本輪僅修改文件**；原有資料結構、程式及資料庫未更動。


## 2026-10-12 使用者取消 F-STUDY 四選一測驗

**產品決策**：字卡的四選一測驗及其題目生成、選項、雙向測驗方向、錯題加權、測驗分數、測驗 session／歷史與相關設定均取消，**不再列為 Nexus 的正式產品需求**。正式學習功能維持每日學習、FSRS 正式複習與個人字卡／公共字典連結。

**Codex 實作清理任務（待執行，本輪未改程式）**：
- [ ] 移除 Study UI 的四選一測驗入口、測驗頁面、按鈕及其專屬設定／文字；確認每日學習、正式複習和字卡編輯照常運作。
- [ ] 盤點 `src/features/study/quiz/`、`quizQuestions`、`quizPersistence`、`quizSync`、`QuizSession`、`QuizOfflinePrompt` 及所有引用，移除不再需要的應用程式路徑與測驗演算法。
- [ ] 盤點既有 `quiz_attempts`／`quiz_states`／`quiz_outbox`、雲端 `study_card_quiz_states`／`study_quiz_attempt_receipts` 與 `apply_study_quiz_operation`。確認正式環境及備份相容性、現有資料存量、migration 使用情況後，提出**非破壞性退場方案**；不得未經批准直接刪表、刪歷史 migration 或清除使用者舊資料。
- [ ] 清查 Study 與 Quiz 相關的 Docs、測試、路由、資料同步、備份和帳號刪除依賴；更新 ARCHITECTURE 的現行目標契約，但保留有價值的歷史技術紀錄。
- [ ] 驗收：無測驗入口及測驗計算；每日學習／正式複習／FSRS 事件正常，舊備份可安全處理，兩帳號權限和同步保持正常。

**範圍界線**：筆記編輯器 `F-NOTE` 的題目、題號、選項、答案與解析是**一般筆記編輯能力**，並非 Study 四選一測驗，不在本次取消範圍內。

## 2026-10-12 公共字典 Entry Identity／大量匯入舊契約審查結論

**結論**：移除 SPEC 中整個獨立 `F-DICTIONARY｜Entry Identity、讀音與大量匯入契約` 章節。保留仍有產品價值的 Entry／Sense 唯一性、內容歸屬、讀音、預覽驗證、稽核等規則，併回 `F-DICTIONARY — 字典`。資料表欄位、匯入 runtime 格式及冪等保護移至 ARCHITECTURE；舊批次、已完成報告屬歷史參考。

**保留在交接中以供後續核實的舊批次快照（並非目前發布資料的保證）**：原 Canon 提及 6,301 Entries／6,304 Senses（Word 6,163、Prefix 79 Entries／82 Senses、Root 59），Official Study Pack 6,151 memberships；當時資料拆成 13 份、每份約 500 Entries，驗證報告記錄 0 errors。實際倉庫與正式資料庫狀態需重新核實。

**待 Codex 核對**：
- [ ] 查證 Entry identity 約束、Sense 關聯與讀音 schema 是否和產品規格一致。
- [ ] 釐清管理 UI 僅 CSV 匯入，與歷史 JSON／Markdown／AI 資料管道、五欄 runtime、十二欄母檔之關係；核實 UI 能否正確處理 Prefix／Root。
- [ ] 確認匯入 Safe／Review／Invalid、操作收據、衝突回滾以及備份／同步保護的現行實作。
- [ ] 維護過去批次資料的存檔與來源，不把當時完成回報當作現行產品需求。

<details><summary>移出的原始契約（歷史快照）</summary>

### F-DICTIONARY｜Entry Identity、讀音與大量匯入契約

#### 1. Entry / Sense identity

- **同 `kind` + `lower(btrim(headword))` = 同一 Entry。**
- 不同詞性、中文義項、歷史來源／詞源、語義差異 → **不同 Sense**，不另建同 kind 的第二個 Entry。
- Word／Prefix／Root 是不同 kind，因此可使用相同拼寫而各自存在 Entry。
- stable Entry／Sense IDs 必須保留；importer 遇到既有同 identity 不建立第二 Entry。
- 新 semantic sense → 新 Sense；若無法可靠判斷是否對應既有 Sense → Review。

#### 2. Sense-specific content 與污染防護

- POS／gloss 屬 Sense。
- historical etymology、example、learning content、pronunciation 等若只適用特定義項，應可綁 Sense；未指定 Sense 的舊內容保留為 Entry 共用並在管理端明示。
- AI／Importer 不得因更新一個 Sense 而覆蓋其他 Sense 的 POS／gloss／Sense-specific content。
- 同形 Entry 合併後，不可用 Entry-level 單值欄位把不同 Sense 的內容互相污染。

#### 3. Pronunciation

- 正式 model 為 Sense-aware：
  `id, entry_id, sense_id nullable, locale nullable, ipa, note nullable, sort_order`
  （DB 另保留技術用 `revision / updated_at`）。
- `sense_id = null`：Entry 共用讀音；指定 Sense：義項專用讀音。
- `(entry_id, sense_id)` 必須屬同一 Entry，禁止跨 Entry 綁定 Sense。
- 支援多讀音與 locale。
- 第一版**不做 TTS／音檔**；IPA 語言學正確性驗證不由 schema 自動保證。
- pronunciation 已接入 DraftInput、JSON Bundle、AI round-trip、Safe/Review、Admin、Reader、Published revision snapshot／Diff、Draft delete／audit。

#### 4. Inflection / derivation

- Inflection（如 write → wrote → written）**本輪不新增固定欄位／專表**；未來視為詞形／詞條關聯設計。
- Derivation（act → action → active 等）繼續沿用既有 relation／構詞架構；不得和 inflection 混為同一概念。
- pronunciation、usage/register、完整例句、synonym/antonym、inflection 都**不再阻塞第一次正式大量匯入**。

#### 5. Final canonical master

Canonical CSV v1 維持 12 欄：

```csv
kind,entry_id,sense_id,headword,part_of_speech,gloss_zh_tw,category,etymology,example_words,source_forms,relation_hint,mnemonic_story
```

最新正式資料：
- **6301 Entries / 6304 Sense rows**
- Word：6163 / 6163
- Prefix：79 Entries / 82 Senses
- Root：59 / 59
- `in-`／`di-`／`sub-`：各 1 Entry + 2 Senses
- 新增 `part-` Root
- `levels` 不進公共 Dictionary；Official Study Pack manifest 獨立為 **6151 memberships**
- pronunciation 不加入 CSV v1，改由 JSON／AI／Admin 等通道後補
- `relation_hint` 只是 raw candidate，不自動升格正式 relation
- `source_forms` 是 lexical annotation，不是 attribution/source

final master 已通過 UUID、Sense uniqueness、Entry identity、Word POS、Prefix 4 類、Root 9 類、非空 headword/gloss 驗證，0 errors。

#### 6. Bulk import / Preview

- final master 因單次 Supabase／importer payload 限制拆成 **13 份**，約 500 Entries／檔；同一 Entry 的所有 Sense 必須留在同一檔。
- 依 part 編號順序 Preview；Preview 仍以既有 Safe／Review／Invalid 語義為準。
- Safe 可以寫入；Review 不得靜默寫入。若 Review／Invalid 比例異常高，先停止並查 matching／schema。
- Apply 時需重新驗證 snapshot／revision／state／ID ownership；Preview 不是永久授權。
- **匯入記錄**：每次匯入寫入操作收據與稽核事件供追蹤與冪等重試。
- 拆成 13 份是傳輸／負載措施，不取代 Safe/Review 架構。

#### 7. Data Sources / Copyright

- 全站一般資料來源與版權統一放在「設定 → 關於 Nexus → 資料來源與版權」。
- 不恢復 per-entry general `source_id/citation/license`。
- historical etymology 自己的資料來源文字仍屬內容，可保留。

#### 8. 管理與資料驗收


</details>


## 2026-10-12 F-DICTIONARY 最新目標架構對照與 Codex 執行工作包

> **權威來源**：產品畫面與操作看 `docs/SPEC.md → F-DICTIONARY`；資料／服務／安全架構看 `docs/ARCHITECTURE.md → F-DICTIONARY｜正式目標架構與資料契約`。本節是實作任務和驗收追蹤，舊 M7-9～M7-12 任務及歷史快照需依本節重新盤點，不得直接按舊步驟重做。

### 已查得的程式基礎（僅倉庫程式碼／migration 存在，不表示正式部署）

- `src/features/dictionary/DictionaryBrowser.tsx` 包含 Reader 清單、詳情與 `is_dictionary_admin` 權限檢查；`DictionaryAdmin.tsx` 包含管理清單、編輯與匯入面板。
- `src/features/dictionary/dictionary.ts` 有 Word／Prefix／Root、Entry／Sense、pronunciation 與 Draft 資料型別；`reader.ts`、`draftPipeline.ts`、`revisionLifecycle.ts`、`adminImport.ts`、`dictionaryCSV.ts`、`entryIdentity.ts` 分別處理讀取、草稿、修訂、匯入、CSV 與識別。
- `supabase/migrations/20260930_public_dictionary.sql` 以 Auth UUID 建立管理員驗證／RLS；`20261017_dictionary_entry_identity.sql` 建立 identity 唯一性約束；`20261018_dictionary_pronunciations.sql` 定義 Sense-aware 讀音和匯入 RPC 修改。其他 dictionary、Study link、Official Pack migration 都要一併檢查依賴和遠端版本。
- **已知差異**：現行 `DictionaryAdmin.tsx` 仍提供 Markdown／JSON／AI 相容匯入 UI 和 AI JSON 匯出；`dictionaryCSV.ts` 對含讀音或複雜多義項資料的 CSV 匯出會報錯以避免資料遺失。最新管理產品規格則為 CSV-only 匯入且有「匯出」功能。

### Codex 任務順序與完成條件

- [ ] **DIC-A｜現況矩陣（前置）**：逐一核對 SPEC 每項 UI、資料欄位、RPC、RLS、migration、Study link 與 Official Pack；產出「已具備／需修改／需新 migration／待使用者決策／待遠端驗證」對照表。先查 main 與 PR 差異，再選實作分支，不以 docs PR 當已上線。
- [ ] **DIC-B｜資料模型及權限**：核對 identity 唯一索引、Sense FK、pronunciation Sense 親屬關係、來源註釋、版本、稽核與刪除外鍵；補缺時採**新增 migration**，避免改寫可能已套用的舊 migration。普通用戶只能讀已發布，直接寫 RPC 必須拒絕。
- [ ] **DIC-C｜CSV 決策及可逆性**：提出可完整保存三類詞條及多義項、讀音、變體、詞源關係的 CSV 設計／多檔方案，與目前 12 欄／5 欄相容策略；標明確實無法表達的欄位，等待使用者核准才變更格式。匯出 CSV 的驗收必須確認不會靜默遺失內容。
- [ ] **DIC-D｜匯入 UI 與 service 收斂**：管理字典「匯入」浮窗僅允許 CSV；保留必要的非 UI 內部兼容前先盤點調用端；檔案驗證→預覽 Safe/Review/Invalid→選擇套用→Draft→發布。確保批次重試／版本衝突可回復。
- [ ] **DIC-E｜Reader UI**：字卡→字典，標頭三項（管理入口僅管理員）、英文／中文搜尋、三類全選浮動篩選、清單卡片、詞條詳情與來源註釋分組。符合桌面、平板、手機並處理空結果／載入／錯誤。
- [ ] **DIC-F｜詳情導覽及直接編輯**：上一筆／下一筆依來源清單上下文，手機／平板左右滑動，返回來源及保留搜尋／捲動；管理員詳情右上角直接編輯，沿用同一 Draft／Review／Publish service，檢查未儲存編輯的離開情境。
- [ ] **DIC-G｜管理工具列及內容編輯**：新增、匯入、匯出、刪除、發布、全選，單一新增面板下拉 Word／Prefix／Root；編輯包含詞條、讀音、變體、種類、義項、口訣、記憶、詞源、構詞關聯；Prefix 四類與 Root 九類保留 Sense 分類語義。
- [ ] **DIC-H｜刪除與引用保護**：清點 Draft／Published、私人字卡 Entry link、Official Pack manifest 的 FK 與刪除路徑；提出刪除／退役策略，取得使用者確認再涉及已發布資料的破壞性改動。
- [ ] **DIC-I｜驗收及交付**：新增／更新資料層及 UI 自動化測試；雙帳號與直呼 RPC、草稿隔離、版本衝突、CSV 輸入輸出資料保真、前後切換首末筆、來源返回、手機手勢、多資料來源群組、官方學習包／個人卡片回歸測試；執行 tsc／lint／build 並提供未驗收項目。需要在 Supabase 執行的新 migration，必須逐檔列明供使用者批准，不自動部署。

### 開工前應先定案（避免 Codex 自行猜測）

1. CSV-only 管理 UI 的「匯出」是否必須涵蓋完整詞條所有細節；如果是，應採單一 CSV 複合編碼還是多檔壓縮包（但後者與 CSV-only 操作契約須明確區分）。
2. 已發布詞條「刪除」如何處理已連結個人字卡／官方包；是否允許撤銷發布與保留引用的停用狀態。
3. 詞條詳情由無來源的直接連結開啟時的返回目的地、左右滑動方向與未儲存修改警告；控件精確尺寸及響應式斷點。

**本次交付範圍**：只更新 ARCHITECTURE／HANDOFF 文件；未執行 SQL、未修改應用程式，也沒有核實遠端 production migration。


## 2026-10-12 舊文件完整性與儲存庫清理審核（刪除前置門檻）

### 第一階段：整併核對結論

- 已讀取 `docs/CANON-CROSSWALK.md`、舊 00／01／02 三份封存及現行 SPEC／ARCHITECTURE／HISTORY／HANDOFF／AGENTS 的文件資訊。Crosswalk 明確指出：目前完成的是**章節層級的來源追蹤與主要需求分流**，並非逐條、逐決策完全驗收；舊 02 的技術操作、歷史相容性、錯誤修復細節與重複歷史副本仍可能只有 archive 保存。
- **尚未通過「舊文件所有仍有效內容均已承接」門檻**。舊檔已依使用者新指示移出工作樹；後續仍可由 Git 歷史做缺漏查證。必須先就各章建立「已承接且一致／歷史僅留 archive／仍有效但缺漏／有衝突待決」四類逐項矩陣，修復缺漏後才能決定是否移除封存；即使通過也應留 Git 歷史與可追溯的 tag。

### 第二階段：檔案樹預盤點（尚未授權實際刪除）

- 已掃描分支 `docs/six-core-docs-20261012` 的完整 Git tree：**440 個 tree entries**（含目錄）；主要位於 `data/`、`src/`、`tests/`。未將名稱含 old／draft／test 的檔案當作垃圾直接刪除。
- **高信心候選**：`nexus-codebase-current.md` 為零內容檔案。須再確認沒有外部交接流程要求存在，可在確認後刪除。
- **歸檔候選**：`NEXUS_ETYMOLOGY_IMPLEMENTATION_REPORT.md` 為 2026-09-28 舊字源百科本機匯入報告；可考慮將其歸入歷史封存而非直接刪除，先對照 HISTORY／ARCHITECTURE 保留獨有執行證據。
- **待依賴驗證的清理候選**：`data/etymology/batch-08-*.json`（本機 dry-run／import／repeat 報告）、`data/etymology/batch-08/review/`（原始查證與評審）、`scripts/etymology/` 和 `scripts/import-etymology.mjs`、`tests/etymology*.test.cjs`。此群含原始資料及對應測試，必須先定來源真相、引用、法規／版權與備份策略，禁止整批直接刪除。
- **低風險視覺資產候選**：`public/next.svg`、`public/vercel.svg` 等 Next.js 範例 SVG。清理前以實際程式全文搜尋引用及部署設定核對。
- **產品退場候選**：`src/features/study/quiz/` 及對應測試與 SQL，因四選一功能已取消；惟現存資料、備份格式、RLS／RPC 與歷史 migration 都需要相容性分析，不得直接刪除 migration 或資料庫物件。

### Codex 刪除前作業與驗收

- [ ] 完成三份封存原始檔逐項需求／決策覆蓋矩陣，針對仍有效但遺漏的項目補回新文件，明確保留原文引用與差異判定。
- [ ] 在 **main 與實際欲清理的功能分支** 上重新掃描完整檔案樹，使用檔名／程式匯入／動態引用／配置檔／CI／測試／SQL 依賴圖區分無引用、測試專用、資料來源及正式執行檔。
- [ ] 對每個候選附上「理由、引用證據、搬遷去向、影響範圍、回復方式」；先執行 build／lint／tsc／測試，若移除後必須全部通過，再供使用者核准刪除清單。
- [ ] 刪除舊 Quiz 與舊 owner-scoped etymology 功能前，確認現有客戶端快取、遠端 schema、舊備份還原及遷移策略，避免破壞使用者資料。
- **截至此紀錄：未刪除任何檔案，未變更程式碼與 SQL。**


## 2026-10-12 舊交接來源退休決策

- 使用者要求將仍有效的產品規則、資料契約、技術風險、歷史決策與工作任務分別歸入 SPEC、ARCHITECTURE、HISTORY、HANDOFF，不新增任何彙整檔，並刪除舊 00／01／02 原文檔。
- 原始舊檔 Git blob SHA：00 `5f6bf2bae2bc0d84540aba016d276c943e63fd45`、01 `9fc287faccbf87de799e57fd6899bfe392019315`、02 `58df7a850369cf2b00cf12525438fc5bbbf17b6e`。刪除工作樹檔案不會刪除已提交的 Git 歷史。
- 有效規格依最新版 SPEC；技術架構依 ARCHITECTURE；歷史決策依 HISTORY；Codex 後續工作依 HANDOFF；開發規則依 AGENTS。舊版四選一 Quiz、獨立講義模式、私人字源百科等舊規劃不因歷史資料而恢復。
- 曾存在的歷史交接內容並非逐字轉錄；一次性操作、過時程式碼快照、重複文字與舊進度不另保存成現行規格。若後續發現具體有效內容漏列，請從 Git 歷史復查，再補回相應的新文件。
