# Nexus — 最新交接、待驗證與下一步

> 2026-10-12 文件遷移基線。以下舊交接卡片的進度與優先級為**2026-09-28 歷史快照**；2026-10-11 以後已有 GitHub Issues 和新提交，必須先核實，不可直接當成現況開工。

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
3. 用 CANON-CROSSWALK、GitHub Issues 和 main 實際程式做 Gap Analysis，核對測試與 production 環境後才排實作。
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
- 已完成三份舊資料共 **239 個 Markdown 二級章節**的去向／處置台帳：`docs/CANON-CROSSWALK.md`。來源與新文件直接可查。
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
