# Nexus — 01｜唯一現行產品規格與決策登記

*日期：2026-10-11*
*狀態：2026-10-11 增量 Canon；production migration、local implementation、frontend deployment 分開記錄*
*用途：記錄 Nexus 的實作設定、使用者要求、功能行為、資料與 UI 契約、限制與驗收條件。*

---

## 讀者導覽：規格成熟度、權威與範圍

**唯一現行規格**在 §1～§12，主要功能細則集中在 §4；歷史補記（原 §14～§20）完整歸檔至 `02`，不能與現行規格競爭。任務狀態／優先級只看 `00` §0 和 §10。

| 標籤 | 定義 |
| --- | --- |
| `IDEA` | 使用者提出方向，尚無實作契約 |
| `DISCOVERY` | 已分類，仍有資料模型／UX／授權等未決事項 |
| `CONTRACT_READY` | 本輪文件內已定行為邊界，但實作前仍需 repo/schema 實查 |
| `IMPLEMENTED_LOCAL` | 使用者或原始碼提供了指定本機功能、測試或 build 證據；不代表整套驗收 |
| `DEPLOYED_VERIFIED` | 獨立取得正式環境、資料庫與權限驗證；目前**不能**對最新新功能貼此標籤 |

**權威排序**：最新明確使用者決策 ＞ 本文件單一現行產品契約；實際原始碼與測試作為「實作證據」，不自動推翻產品需求。有落差請列入 00 待辦，不可悄悄用舊源碼覆蓋新契約。完整決策原文、歷史沿革見 `02`。

---

## 整合說明（歷史來源）

- **基準**：程式碼快照（2026-09-25）僅是當日 source 快照；對話紀錄只到 2026-09-21。09-22～09-25 的 FSRS 與測驗持久化沒有對話紀錄，本檔內相關規格標為「程式碼推導」，待使用者確認。
- **標記**：【新增】舊文件沒有；【修改】舊內容被新事實取代；【搬移】未刪除，移至 02；【取代】被新決策明確取代。
- **決策來源標籤**（原 §15 已歸檔至 02）：`使用者確認`＝使用者在對話中明確說出；`使用者要求＋實作`＝使用者提出需求、AI 已實作；`程式碼推導`＝只有程式碼／測試說明，無對話紀錄。
- **未刪減任何功能**。使用者明確取消的項目：教師／學生版 PDF（D-204）、世界觀／人物／地點與小說的關聯（D-201）。
- 舊表格因格式被壓成單行，本版已還原為標準 Markdown 表格，內容未改。

---

## 0. 本文件的角色與閱讀規則

### 0.1 三份 active 文件的分工

| 文件 | 唯一主要用途 | 不應主要承擔的內容 |
| --- | --- | --- |
| `00-HANDOFF-STATUS-AND-AI-RULES.md` | 目前任務狀態、任務 ID、依賴、估算、待開工順序、AI 協作規則 | 完整功能設計細節、完整歷史 |
| `01-CANON-SPEC-AND-DECISIONS.md` | **功能規格、實作要求、資料契約、UI 規則、限制、驗收條件、有效決策索引** | 每次操作過程、逐日任務日誌、工時追蹤 |
| `02-PROJECT-LOG-DETAILED.md` | 歷史實作、問題、解法、舊判斷、changelog | 取代最新規格或目前任務順序 |

### 0.2 本版的結構原則

1.先用功能分類閱讀，不要求讀者先理解所有歷史 decision 編號。
2.每項功能要能回答：**目的、入口、資料真相、行為、限制、驗收、對應任務**。
3.功能規格與任務狀態分開：01 定義「應怎麼做」，00 定義「何時做、做多少、是否開始」。
4.不刪除既有資訊：原 01 的完整歷史 decision／spec source 已轉移至 `02-PROJECT-LOG-DETAILED.md` 的「01 Legacy Canon Transfer」附錄。
5.遇到舊快照與現行 source 不一致時，**實際 source 優先**；資料模型任務開始前必須先執行 00 的 `Q-0 schema reconciliation`。

### 0.3 狀態標記

```
✅ 已完成且已有既有驗證紀錄。
🟡 已有可用基線，但規格或結案工作未完成。
▶️ 已分類為未來任務，尚未開始該工作包。
⏳ 尚未實作。
🚫 明確不納入目前產品範圍。
⚠️ 文件與 source 需先核對，不能靠舊 snapshot 假設。
```

---

## 1. 產品定位、使用者約束與明確邊界

### 1.1 產品定位

> **Nexus 是 local-first 的個人學習與知識生成 workspace。**

> 核心為筆記、文檔、PDF 研究、學習集、簡報、快速收集、待辦、閱讀／資料整理與未來發布；不是早期完整 Notion、Canva、Wix 或企業協作平台 clone。

### 1.2 使用者與交付約束

- 使用者程式經驗有限；Windows PowerShell 需使用 `npm.cmd`／`npx.cmd`。
- 所有程式異動都應在 workspace 專案鏡像內實作並驗證，再提供可覆蓋交付內容。
- 不得重建專案、不得自行刪減功能、不得將 `content_text` 當正文真相。
- 架構、資料模型、權限、儲存與 migration 類變更須先確認。

### 1.3 明確產品邊界【修改】

| 類別 | 現行邊界 |
| --- | --- |
| Note | 最重要核心；native rich editor 優先，不保證完整 Markdown 保真；含講義排版能力（F-LESSON） |
| Document | 獨立於 Note；偏文字／Markdown 工作流 |
| PDF | 現行為匯入後關聯 Research Note；未來要增加 GoodNotes-like PDF import workspace |
| Image | **作為內容插入（insert block）**，不是獨立匯入頁面類型；小說封面與角色卡相冊為受限的專用用途 |
| Audio / Video | 🚫 暫時不考慮添加（角色卡「音樂」組件只保存外部連結，不是音訊功能） |
| AI | 後期輔助層，不作早期內容資料模型或必要依賴 |
| Web Clipper | 後期能力；先不做完整 browser extension |
| 帳號／權限【修改】 | **登入必須制**（D-203）：未登入只顯示登入／註冊；登入後才使用該帳號的本機快取與雲端同步（D-198、D-200）。無匿名工作區。共編不在範圍 |
| Mobile UI【修改】 | 部分規則已落地（見 §6.3）；完整標準仍是 `M9-0`，實機驗收未完成 |
| 創作【新增】 | 小說（受限純文字，D-201）、角色卡／世界觀（結構化區塊）為獨立功能；不做世界觀／人物／地點與小說的關聯 |
| 個人工具【新增】 | 隨手記、日曆待辦、網頁、計數、抽選；目前為基礎版，範圍見 §4 各卡 |

---

## 2. 不可推翻的架構原則

### 2.1 五概念模型

```
Page           — 可連結的內容外殼
Block          — Page 正文內的內容原子
Property       — 結構化 metadata
Workspace View — 看一批資料的系統視圖
Page Mode      — 看單一 Page 的方式
```

### 2.2 資料真相與衍生資料

```
pages.content_json = 正文唯一真相（Tiptap JSON）
content_text       = 搜尋、預覽、排序、摘要等衍生資料
attachments/binary = 正文外的資源，透過 StorageAdapter 關聯
```

`content_text`、search index、links、outline、tasks/events projection 都可重建，不能取代 `content_json`。

### 2.3 Storage 與刪除

- UI／Editor 只經由 `StorageAdapter` 存取資料。
- 一般 Page 刪除採 soft delete；Trash 提供 restore。
- 永久刪除只在 Trash 內觸發；第一版不自動清除可能共用的 attachment／binary。
- Backup、Sync、version history 必須尊重資料真相與 soft-delete 語意。

### 2.4 Creatable 與弱聯動

所有主要內容可共用 Page shell，但可保有 mode-specific data。高層生成物（Document、Presentation、Website、Study Set）可以記錄來源，**不要求來源變更後自動覆蓋生成物**。

---

## 3. 功能總覽與狀態矩陣【修改】

### 3.1 Core Creatables

| ID | 功能 | 狀態 | 一句話規格 | 對應任務容器 |
| --- | --- | --- | --- | --- |
| F-NOTE | Note | ✅ | rich native editor 的核心內容 Page；流動／分頁兩種版面 | MVP-0／1 基線 |
| F-LESSON | 筆記講義排版【新增】 | ✅（本機） | 樣式、教學區塊、自動目錄／題號、頁首頁尾、依 A4 整理分頁 | M10-10 |
| F-DOCUMENT | Document | ✅ | plain text／Markdown 導向的獨立 Page kind | MVP-1 基線 |
| F-PDF | PDF Research Note | 🟡 | PDF import + attachment + research note；GoodNotes-like workspace 為未來 | MVP-2／6 |
| F-STUDY | Study Set【現行】 | 🟡 | FSRS-6 固定每日新字批次＋首次評分的正式複習＋四選一；共用字典方向已確認但尚未實作，近義詞群組練習待定 | MVP-7 |
| F-DICTIONARY | 唯一全站共用字典與管理端 | 🟡 | 管理員維護唯一共用百科、一般登入者查閱；每位使用者的個人字卡可連結百科補充資訊，不另開發私人字源百科；舊 owner-scoped 表僅作保護／未來資料處置。含三類詞條、草稿／發布、管理端匯入、搜尋、翻面詳情 | `M7-9～M7-12` |
| F-PRESENTATION | Presentation | 🟡 | 自由畫布簡報；拖曳/縮放/旋轉/對齊/縮圖鏡像已實作；吸附線/Master/undo 未完成 | MVP-3 |
| F-QUICKNOTE | Quick Notes | 🟡 | Google Keep 風格；統一 pages kind（D-186） | MVP-7 |
| F-TODO | Todo／日曆 | 🟡 | 月曆待辦；多分類日曆未做 | MVP-7／M10-6 |
| F-NOVEL | 小說【新增】 | ✅（本機） | 作品總覽、獨立章節記錄、上下翻頁、閱讀設定 | M10-1 |
| F-CHARACTER | 角色卡【新增】 | ✅（本機） | 區塊→混合內容、分頁、自訂模板與範文 | M10-2～4 |
| F-WORLD | 世界觀【新增】 | 🟡 | 沿用角卡結構；角色可歸屬世界觀或獨立 | M10-5 |
| F-WEB | 網頁【新增】 | 🟡 | 介紹＋連結清單編輯；公開展示頁未做 | M10-7 |
| F-COUNTER | 計數【新增】 | 🟡 | 項目依「群組名稱」加總；正式大組／小組模型待定 | M10-8 |
| F-DRAW | 抽選【新增】 | 🟡 | 每項目一個資料庫，多標籤，篩選後抽 N 個 | M10-9 |
| F-CREATIVE | Creative 入口【修改】 | 🟡 | 創作功能入口（角色卡、世界觀）；小說已獨立成單獨功能入口 | MVP-10 |
| F-SCORE | 製譜【C2 順序確認】 | ⏳ | 同級功能，先作品管理＋快速簡譜，之後五線譜／吉他譜；語法草案未核准 | 待編 Task ID |
| F-CANVAS | Canvas | ⏳ | Page／Block reference 的視覺組織能力 | MVP-5 |
| F-WEBSITE | Website / Publish Project | ⏳ | Share Page → Link Page → Publish Site | MVP-8 |
| F-SHARE | 唯讀分享連結【獨立機制】 | ⚠️ | A1 已確認分享另設，不混入登入共用字典；匿名、撤權、附件細則尚未決定 | M8-0 |

### 3.2 System Views

| 功能 | 狀態 | 規格摘要 |
| --- | --- | --- |
| Home / Dashboard | ✅ | 統計、最近編輯、快速入口；不承擔資料真相 |
| Sidebar / Projects | ✅ | 分組、排序、拖拉、同類子頁、Favorites、Rename、Select mode |
| 功能兩欄格與新增選單【新增】 | ✅（本機） | 見 F-NAVIGATION |
| 下拉刷新【新增】 | ✅（待實機） | 見 §6.4 |
| Search | ✅ v0 | 目前以 title／`content_text` 為主；章節與模板頁被過濾不列入一般清單 |
| Inbox / Quick Capture | ✅ | Quick Capture 建立 Inbox item，且不打斷目前編輯 |
| Trash | ✅ | soft delete、restore、permanent delete、bulk actions |
| Right Panel | ✅ | Backlinks / Outgoing Links；Home 時不顯示 |
| Command Palette | ✅ | Actions + title-based Pages 導覽 |
| Quick Notes View | ✅ 基線 | Google Keep-like 卡片 |
| Todo View | ✅ 基線 | 月曆優先；完整 task system 與多分類日曆未完成 |
| Review Queue | 🟡【最新】 | Daily 固定當日新字批次、Easy 引入不寫正式 review；獨立正式 Review 首次評分寫 FSRS，後續重練僅更新 session mastery |
| Calendar / Board | ⏳ | 多分類日曆見 M10-6；Board 未開始 |
| Graph | ⏳ | 已規劃，尚無正式最小規格 |
| Reading / Asset Library | ⏳ | 深度研究與資產管理未來視圖 |

### 3.3 Tools 與基礎服務

| 功能 | 狀態 | 規格摘要 |
| --- | --- | --- |
| New / File Menu | ✅ | 建立、匯入、格式、轉簡報、頁面管理、匯出／列印 |
| Import / Export | ✅／🟡 | 現行格式見 §7 |
| Workspace Backup【版本待最新源碼確認】 | 🟡 | 單一 JSON；測試檔涉及 v3，舊表涉及 v2，**實際最新 schema version 必須 B3 源碼實查**；完全覆蓋 import 需二次確認；舊版匯入不得刪除既存 FSRS 歷史 |
| Supabase Sync【修改】 | 🟡 | 帳號 workspace（owner_id RLS）；字卡走獨立資料表＋RPC；B2 衝突／版本歷史未完成 |
| Preferences / i18n【修改】 | ✅ | English／繁中；偏好第一層＋詳細設定對話框；新功能字串部分為寫死中文 |
| Theme / Night Adapt | ✅ 基線 | Page night adaptation 已持久化 |
| Template System【修改】 | 🟡 | **角色卡模板已完成**（D-210）；通用模板系統（筆記／簡報等）仍未定義 |

---

## 4. 功能規格卡

### F-NOTE — Rich Note

- **狀態**：✅ 核心完成。
- **目的**：提供不受完整 Markdown 限制的原生筆記體驗。
- **正文真相**：`content_json`；`content_text` 僅作衍生用途。
- **編輯能力**：完整 rich toolbar、Editor Blocks、drag handle、tags、folder、backlinks、attachments。
- **匯出**：Note 不再提供 Markdown 作為保真匯出；使用 Print/PDF 與 `.nexus.json`。
- **限制**：格式保真以 Nexus JSON／Backup 為準，Markdown 不作 Note 的完整 round-trip 承諾。
- **驗收**：重新開啟、refresh、backup restore 後格式與內容仍存在。

### F-DOCUMENT — Plain Document

- **狀態**：✅ 基線完成。
- **目的**：適合文章、報告、正式文字與 Markdown 工作流。
- **編輯模式**：`plain` editor variant；不承擔 Note 的 rich typography 工具列。
- **格式**：以 flow／A4／custom 為主；Document 預設 A4 的目前規則見 F-PAGEFORMAT。
- **匯出**：Markdown；需在 export 前 flush save。
- **限制**：Document 不等於 Note 的降級版；兩者有不同用途與保真策略。

### F-PDF — PDF Research Note 與未來 GoodNotes-like PDF Import

#### 現行 PDF Import 基線 ✅

```
選擇本地 PDF
→ 建立 Attachment metadata
→ 寫入 binary
→ 自動建立 Research Note Page
→ attachment_ids / primary_attachment_id 關聯
→ 顯示 PDF viewer 與研究筆記
```

- PDF binary 不放入 `content_json`；以 attachment／asset 管理。
- 一篇 PDF 對一篇主 research note 是起步 UX，不是資料模型硬限制。
- Viewer 現有 Open、Small/Medium/Large、Hide/Show、loading/unavailable/normal 三態。

#### 未來要求：GoodNotes-like PDF Import Workspace ▶️

- **使用者要求**：PDF 應以「匯入」形式進入 Nexus，形成類似 GoodNotes 的 PDF 文件工作空間，而不是把 PDF 視為一般 rich-text insert。
- **目前不假設的內容**：手寫、annotation、highlight、頁面縮圖、頁面重排、跨 PDF 引用的具體 UX 尚未確認，不可自行補做。
- **對應任務**：`M6-5` GoodNotes-like PDF workspace discovery，確認後才可啟動 `M6-6` implementation；需先定義 page-centric PDF workspace、annotation anchor 與 asset/reference 關係。
- **驗收前提**：未來功能必須不破壞目前 attachment + Research Note 工作流。

### F-STUDY — Study Set / Flashcard【修改，程式碼推導；對話中無紀錄】

- **狀態**：🟡 FSRS 每日練習、自由複習、四選一測驗已寫入程式碼並有自動化測試；FSRS migration 已由使用者確認部署；雙裝置、iOS 實機端到端**未驗證**。
- **資料方向**：Deck = Page（設定另存）；Card = 使用者擁有的獨立 `study_cards` 記錄＋`study_states`（個人排程狀態）＋`study_events`（個人 append-only 事件）＋`study_settings`（每學習集設定）。字卡的英文／中文及個人編輯內容與公共百科相互獨立；未來可選擇連結公共字典的穩定詞條 ID 取得補充資訊，**公共字典不能覆寫個人字卡，也不持有個人 FSRS 排程**。實際關聯欄位及既有字卡回填方案待 repo/schema 查證，不預設自動連結。舊 `Page.study_items` **原樣保留**作遷移來源，不刪改。
- **演算法**：固定 `ts-fsrs 5.4.2`（FSRS-6）；`request_retention = 0.90`；`learning_steps = ['10m']`；`relearning_steps = ['10m']`；`enable_fuzz = false`；`maximum_interval = 36500`；完整參數存入每筆事件。按鈕間隔取 `scheduler.repeat`，提交用 `scheduler.next`，不覆寫 `due`。
- **每日練習**：僅英→中主動回想；先只顯示英文，「顯示答案」後才顯示中文與 Again／Hard／Good／Easy。每個學習集預設每天 20 張新字（可設 0–10000），裝置當地 00:00 換日。題面掛載後以交易確認首次顯示才扣額度，交易完成前不能揭露答案或評分。**當日新字批次首次實際學習才建立，固定且跨重新整理持久化；每張新字必須 Easy 才完成，僅建立 `kind: introduce, source: daily_learning` 管理事件及 `learned_at`，不可捏造 Again review event 或正式 due。** 舊「到期優先 → 新卡」敘述只適用更早的排程版本，勿套用於此新字批次。
- **正式單字複習（新決策取代舊「自由複習」）**：固定持久化 session，預設目標 20 張；New 優先（隨機）→ Due 隨機 → Not-due 按最近到期補位。每張卡**本輪首次評分**才寫正式 FSRS review event／due，後續重練只更新 session mastery。Again／Hard 重排；Good／Easy 均完成出箱。`easy_at` 暫保留作相容性完成標記。
- **四選一測驗（新決策）**：預設中→英，可切換英→中，方向持久化；只用已學習卡，必須至少 4 個相異且修剪後不重複的選項。加權公式 `min(3, 1 + memory_bonus + 0.25 * mistake_score)`；New 加成 0.5，FSRS 加成 `1 - retrievability`（只讀），錯題分數 0–4（錯 +1、對 −1）；測驗不寫 FSRS。離線作答待連線後由使用者決定上傳／捨棄／稍後，固定快照及事件 ID，重試冪等。
- **舊卡遷移**：需在預覽確認左欄英文、右欄中文後啟用每日練習；未填完整的卡保留但不出題；舊 `daily_due_at` 只作首次新版複習的資格門檻；**不得**把舊 `review_count`、三段評分、`daily_phase` 冒充 FSRS 歷史或記憶參數。
- **編輯與複製**：中文修改保留排程；英文修改提供保留／重設／取消（重設以新 generation＋`reset` 事件，歷史仍保留）；單卡與整個學習集複製只複製內容並建立 New 卡；刪除為 soft delete。
- **雙裝置衝突**：兩台裝置離線回答同一張卡時，保留所有事件，標記 `conflict` 並停止該卡正式排程；使用者須明確選擇「保留歷史並重新學習」。不自動推測語義合併。
- **仍保留**：CSV/TSV 匯入基線（沿用舊規格）。
- **未完成／已決方向**：全站公共字典、管理端、搜尋與底部詳情已有確認契約（§4 F-DICTIONARY／F-STUDY；Task `M7-9～M7-12`），但尚未實作。近義詞群組練習（`M7-8` 的殘餘需求）、雙向拼寫與容錯（`M7-2`）、SRS 個人化和真實雙裝置驗收另待規劃。
- **字卡編輯列表（已要求，最新實作狀態待按原碼核實）**：以英文 A–Z 呈現兩欄 English／Chinese；長文字單行省略，點選整列開編輯，顯示完整內容；列表呈現排序不可覆寫資料中的自訂 order。
- **翻面後資訊及儲存提示（已確認、尚未實作）**：僅每日學習／正式複習背面顯示展開字典詳情；順序為四個評分按鈕 → 詳情面板 → **詳情內容末端隨捲動顯示**的儲存狀態提示（B2）。不在單字卡上方，也不承諾 sticky 常駐固定條。只有真正在儲存時顯示；成功消失，失敗同位置提示／重試；展開詳情不更動 FSRS。
- **現行實作檔路徑**：`src/features/study/studyFSRS.ts`、`studySessions.ts`、`StudyRepository.ts`。使用者本機已 `git rm` 舊 `src/lib/` 重複模組，兩組指定測試 21/21 與 4/4、build 成功；清理的 commit/push 尚未獨立確認。
- **限制**：使用者清除瀏覽器資料不屬於離線／重整的保存保證。

### F-DICTIONARY — 全站共用字典與管理後台（`M7-8` 容器；`M7-9～M7-12` 四期）

**成熟度：公共字典核心與 revision／identity／Study reliability 相關 migration 已多輪進入 production；`20261012`～`20261017` 已由使用者回報套用。前端 deployment 仍需獨立確認；`20261018` pronunciation migration 尚待 production 成功回報。** **使用者新增明確產品決策：全站只有一份公共字典／百科，由管理員維護；用戶建立並擁有的是自己的字卡，可連結此公共百科取得額外詳情；不規劃「每位用戶另有私人字源百科」。** 舊 owner-scoped `etymology_*` 與 Batch-08 PGlite importer 只是既有資料結構／處理工具，保留防資料遺失，不得當成新產品功能。CEEC 詞表處理／43 筆特殊條目審核仍暫停，不阻塞後台第一期。

- **M7-9 資料、權限及已發布可讀層**：唯一公共百科使用獨立資料層，與個人字卡／排程及舊 `etymology_*` 物理與 RLS 分隔；舊表暫不刪、不改 RLS，也不新增私人百科前台。首版僅已登入使用者可讀發布內容；匿名「唯讀分享連結」屬另一產品功能（A1，`M8-0`），不能靠開放私人資料的 RLS 實作。管理員沿用現有 Google OAuth 帳號，以後台核對後的 Supabase Auth UUID 安全綁定權限，不能單憑可修改的 email／前端 UI 授權。實際表名、migration、角色及權限需 `Q-0`／`Q-9` 實查後核定。
- **內容模型**：單字、字首與字根三類；單字可含多詞性／繁中義，構詞關係指向特定 sense ID，同形異源不得誤併。historical etymology 與 mnemonic decomposition／記憶情境明確分離，保留來源、授權、原文、來源 SHA、查證狀態、修訂／操作紀錄及穩定識別；舊檔 `con.md` 已改為 `con-prefix.md`，遷入前不得將兩版 path-derived ID 當作同一 ID。
- **A2 已確認：草稿／發布區分**。管理員能編寫、保留草稿並主動發布；普通使用者僅看已發布資料。其他審核中／撤回等狀態只作現有候選設計，最終發布／撤回版本及舊卡連結語義屬 **A3 待議**，不可視為已決。**A4** 首批公開資料授權／翻譯重製策略待議；未核可前限測試資料。**A5 範圍澄清**：先前「私有原稿轉公共」只可能指既有 owner-scoped 字源檔／資料如何經授權與審核轉入唯一公共百科；**使用者並未要求私人百科或個人字卡投稿機制**。是否需要舊資料轉入及其審核流程仍未決，非本輪公共字典實作前置。
- **M7-10 管理後台**：依權限編輯單字／字首／字根；CSV 處理單字與義項，Markdown 處理詞源；匯入需預覽、驗證、來源／衝突差異、冪等、交易／回滾、稽核；匯入不得自動公開，須按 A2 經管理員發布。
- **M7-11 使用者介面**：所有已登入用戶及管理員於字卡首頁頂部開啟字典總覽，按三類搜尋已發布詞條；管理入口僅管理員可用；約 7,000 字量級的查詢性能需測。字卡輸入時的自動選字不在首輪。
- **M7-12 個人字卡連結及翻面後詳情**：使用者保有自行撰寫的字卡英文／中文內容，可選擇以穩定詞條 ID 連結唯一公共百科作補充，不複製完整百科或被百科變更直接覆寫；具體建立連結的操作 UI 尚待確認，不預設自動連結。每日學習和正式複習只於背面展開詳情；已連結者優先依穩定 ID 查詢，未連結而依字串查詢時遇同形多候選須讓使用者選擇，不得錯誤自動連結，缺資料／失敗不阻擋評分。評分鈕 → 詳情 → **詳情內容末端捲動提示**（B2），不新增任何 FSRS 事件，不阻擋既有 session。
- **驗收邊界**：雙帳號與直接 API/RLS 測試、未發布資料隔離、匯入失敗回滾、詞條發布前後狀態、跨裝置／小螢幕行為及約 7,000 筆查詢。公開 migration 或部署需獨立批准及遠端確認。


### F-DICTIONARY｜2026-10-08 最新資料契約與內容整理規則（覆蓋較早來源／匯入敘述）

> 本節為 F-DICTIONARY 的最新有效增量。與上方舊文字衝突時，以本節及使用者最新明確決策為準。舊段落保留用於追溯，不得用來恢復已退休的 per-entry source/license 產品模型。

#### 1. 一般來源／授權模型已退休

- 公共字典**不再把一般 `source_id`／`citation`／`license` 當作 Word／Prefix／Root／Sense／learning note 的必填產品資料**。
- 歷史詞源仍保留自己的「資料來源」文字，因其屬於該詞源內容本身，不等於被退休的一般 per-entry source/license。
- `dictionary_audit`／操作歷史必須保留。
- 舊 `dictionary_sources`、既有 `source_id` 值與 AI metadata `source_ids` 可作歷史相容資料保留，但正常新增、Preview、Import、Reader、AI／Export 不再依賴它們。
- 全站第三方資料／版權聲明統一放在：**設定 → 關於 Nexus → 資料來源與版權**。
- Codex 已完成 source retirement 的實作；`20261012_dictionary_retire_sources.sql` **已由使用者回報 production 套用成功**。前端是否部署仍未確認，不能由 migration 狀態推論。

#### 2. Word CSV runtime 契約

只接受以下五欄，**欄名與值都必須完整**：

```csv
entry_id,sense_id,headword,part_of_speech,gloss_zh_tw
```

- 舊 `citation`、`license`、`source_id` 等一般來源欄位不再接受；CSV／Markdown／JSON／AI 若帶入已退休的一般來源欄位，應明確拒絕或依既定相容規則清除，不能默默建立 placeholder source。
- 此五欄契約是**目前 Word CSV importer 的 runtime 契約**；不等於整份內容母檔只能有五欄。
- Prefix／Root 正式 CSV 是交接資料集；未經現行 importer 契約確認，不得假設可直接餵給 Word CSV importer。

#### 3. 正式內容母檔（2026-10-08）

目前只保留三份正式 CSV，不保留第四份 pending 檔：

| 母檔 | 筆數 | 最後檢查 |
| --- | ---: | --- |
| Word | **6163** | case-insensitive headword 0 重複；必要欄 0 空白；待補／待查標記 0 |
| Prefix | **82** | 必要欄 0 空白；非法分類 0；待補／待查標記 0 |
| Root | **58** | 必要欄 0 空白；非法分類 0；待補／待查標記 0 |

Word 母檔可保留交接／生成用途欄位，例如 `levels`、`source_forms`、`related_morpheme`、`mnemonic_story`；真正匯入 Word CSV 時再投影成五欄。`levels` 只服務 GSAT／Official Study Pack manifest，**不得加入公共字典搜尋／篩選條件**。

#### 4. 資料整理與查證流程

任何新 Word／Prefix／Root 資料進正式母檔前，固定執行：

**先查證 → 驗證目前分類 → 缺資料就查詢補全 → 才併入。**

- 「只有框架／缺少意思、詞源、例字」不等於刪除。只要條目本身正確，就研究補完整後納入。
- 有疑義的語源、同形異源、歷史同源 vs 現代同步構詞必須拆開；不能只因拼字相似就合併。
- 記憶故事／口訣可保留，但若只是 mnemonic 必須以 mnemonic/story 身分存放，不得寫成歷史事件事實。
- 正式母檔不得含 `待補`、`待查證`、`暫不`、smoke-test、舊 Draft、production 歷史註記。
- `Internet`／`internet` 已依 case-insensitive headword 規則合併為單一資料。
- 本輪補完 17 個原本不完整的 Word，並統一舊構詞名稱到正式 Root／Prefix family。
- Root／Prefix 同化型與多義使用 Sense-level／family 方式表達：例如 `ad-` 包含 `ac-/as-...` 同化型、`ob-` 包含 `op-...`、`in-` 的否定義與方向義分 Sense、`di-（二）` 與 `di-（分離）` 分開。
- `min-/minim-` 與現代 `mini-` 已拆開；`deca-/deka-` 與 `deci-`、`cent-` 與 `centi-` 分開。

#### 5. 分類契約

**Prefix 四類**：
1. 性質、評價與否定
2. 位置、方向與關係
3. 數值、量與程度
4. 作用與變化

Prefix 的主要分類落在 **Sense level**；同一 family 可有不同 Sense 分到不同類。

**Root 九類**：
1. 空間、位置與環境
2. 動作、接觸與物理作用
3. 移動、轉變與方向
4. 物質、自然與元素
5. 生命、身體與感官
6. 情感、心理與意志
7. 心智、溝通與學習
8. 社會、法律與制度
9. 時間、狀態、數量與邏輯

Word 不使用上述學習分類作主要分類。

#### 6. UI／內容結構的既定方向

- 正常 UI 不要求使用者選擇 Sense，也不暴露 Sense UUID。
- Word 編輯內容維持：基本詞條／分類、中文義項、構詞關聯、歷史詞源、口訣、記憶故事；一般「來源與授權」區塊已移除。
- 歷史詞源內容只保留「完整內容／資料來源」等內容本身欄位，不再使用舊的一般查證狀態＋per-entry license UI。
- Published 保護不變：不得為了清理來源欄位而直接覆寫既有 Published；AI／管理修改 Published 時仍走 review Draft 方向，除非之後另改 publication model。
- Draft／Published、revision、transaction rollback、admin-only 權限與 audit 保護都不能因 source retirement 被削弱。

#### 7. Official Study Packs

- 正式官方包仍為：**學測單字 1–2 級、3–4 級、5–6 級**。
- manifest 只引用已發布公共 Word，不複製一份平行字典；下載後建立使用者擁有的 Study Set。
- 刪除使用者下載實例只刪個人 Study Set／進度，不刪公共字典或 official manifest；可重新下載。
- pack 更新以新增內容為主，不重建／刪除使用者既有字卡。


### F-DICTIONARY｜2026-10-11 最終 identity／pronunciation／bulk import 契約

> 本節覆蓋較早「同形異義拆成多 Entry」「公共字典尚未實作」「source retirement 尚未 production」等舊敘述。舊內容只作歷史追溯。

#### 1. Entry / Sense identity

- **同 `kind` + `lower(btrim(headword))` = 同一 Entry。**
- 不同詞性、中文義項、歷史來源／詞源、語義差異 → **不同 Sense**，不另建同 kind 的第二個 Entry。
- Word／Prefix／Root 是不同 kind，因此可使用相同拼寫而各自存在 Entry。
- stable Entry／Sense IDs 必須保留；importer 遇到既有同 identity 不建立第二 Entry。
- 新 semantic sense → 新 Sense；若無法可靠判斷是否對應既有 Sense → Review。
- `20261017_dictionary_entry_identity.sql` 已由使用者回報 production 套用成功，DB unique index 正式保護此 identity。

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
- `20261018_dictionary_pronunciations.sql` 已審查可執行，但本版文件更新時**尚未收到 production 成功回報**；前端也未確認部署。

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
- **Import Batch ID 不做**；既有 operation receipts／audit 足夠。
- 拆成 13 份是傳輸／負載措施，不取代 Safe/Review 架構。

#### 7. Data Sources / Copyright

- 全站一般資料來源與版權統一放在「設定 → 關於 Nexus → 資料來源與版權」。
- 不恢復 per-entry general `source_id/citation/license`。
- historical etymology 自己的資料來源文字仍屬內容，可保留。
- DataSourcesAndCopyright UI 已由 Codex 回報實作；具體第三方版本／授權清單仍需依實際採用來源維護。

#### 8. 部署邊界

- Codex tests／TypeScript／Build 通過只代表本機實作證據。
- Dictionary↔Flashcard、Study reliability、pronunciation UI 等前端功能**尚未有本文件可確認的正式部署回報**。
- migration production 狀態與前端 deployment 必須分開記錄。

### F-SCORE — 製譜（基礎框架 Codex 指令已發出；尚無完成回報）

- **C2 已確認先前順序**：先作品管理＋快速簡譜，再各自開發五線譜與吉他譜；三者不強制互轉，也不預設共用同一完整音樂資料模型。正式譜面 preview 優先，進入「編輯」才顯示文字源碼；桌面可探索分割畫面，手機以預覽／編輯切換為主。
- **候選簡譜草案（未最終確認）**：`_6`／`^6` 表八度、`#5`／`b7` 升降、`6•` 附點、`5/`／`5//` 時值、`0` 休止、`|` 小節；標頭 `@title`／`@key`／`@time`／`@tempo`，註解 `//` 屬草案，不直接當 parser 合約。播放與完整 MusicXML／MIDI 互轉非首版承諾。
- **目前狀態**：已向 Codex 發出基礎框架實作指令（統一 Score core model、簡譜／五線譜／吉他 adapter、基本 measure/note/rest 編輯），但尚未收到完成回報；不得視為已實作或已部署。

### F-PRESENTATION — Presentation

- **狀態**：🟡 2026-08-23 大幅升級完成。pointer events + setPointerCapture 拖曳、絕對座標模式、邊緣 resize、旋轉（Shift 15°）、多選對齊、縮圖即時鏡像、圖表編輯（Gamma 風格分頁：上半部三欄 類型｜細項設定｜預覽 + 下半部資料表格）、投影片右鍵選單、placeholder 字影、浮動工具列、z-index 歸一化、resize 邊界 clamp、圖層拖曳排序、文字/圖表/版面三個下拉選單、面板開合按鈕。
- **資料方向**：Presentation → Slides → PresentationBlocks；block 使用 x/y/w/h%、z-index、rotation。PresentationBlock 新增 `rotation?: number`。ChartData 新增 `sortOrder?`、`showDataLabels?`、`showGrid?`、`showTitleNumber?`。
- **待完成**：拖曳吸附線、旋轉後 resize 方向修正、群組/鎖定、Slide Master、Mermaid/recharts、簡報 undo/redo。
- **邊界**：不在近期做完整 Canva、動畫或多人協作。
- **驗收**：畫布物件 reload/sync 後位置與內容正確，且真實瀏覽器互動通過。
- **關鍵技術要點**：（1）`selBoxStyle` 必須含 `position: "absolute"`，否則 `left/top` 被 CSS 靜默忽略——此為 drag bug 根因。（2）pointer events + `setPointerCapture`。（3）物件本體負責所有事件（點中心=drag、點邊緣 9px=resize），把手圓點降級為純視覺。（4）圖層拖曳排序用 HTML5 drag-and-drop + z-index 歸一化。（5）ChartData 選項欄位已加入但 ChartRenderer 尚未根據它們改變渲染（待 M3-4）。

### F-QUICKNOTE — Quick Notes

- **狀態**：🟡 Google Keep-like 快速輸入、色彩卡片、刪除基線已存在。
- **資料方向**：**已廢棄獨立 store（D-186）**。quick_note 為 `pages` 的 kind（`color` 欄位保存卡片顏色）。IndexedDBAdapter 已不建立也不讀寫 `quick_notes` store；舊 DB 若殘留該 store，程式碼忽略它。
- **覆蓋**：因統一 pages store，Search／Backup／Sync 天然涵蓋，仍需 `Q-0` 核對。

### F-TODO — Todo／日曆【修改】

- **狀態**：🟡 月曆優先 UI（`TodoView`）、快速新增、完成狀態與總覽基線已存在。側欄「日曆」固定在功能格第一列。
- **資料方向**：**已廢棄獨立 store（D-186）**。todo 為 `pages` 的 kind（`due_date`、`priority`、`completed`）。
- **新增選單**：切換到日曆功能時，新增選單顯示「日曆事項」。
- **未完成**：多分類日曆（見下方 F-CALENDAR-PLANNED）；Note tasks／Projects／Review 的 Task projection；Board。

### F-CALENDAR-PLANNED — 多分類日曆【新增，⚠️ 尚未決策，未實作】

- **使用者原話（09-16）**：「可以同時顯示，或單獨顯示：特殊日、排班表、記帳、日記1、日記2、要事、todolist。可能要再規劃一下，讓用戶也能自訂分類。」
- **現況**：程式碼中沒有排班、記帳、日記相關實作，只有待辦月曆。
- **必須先決定**：分類的資料模型（每分類一種資料形狀？共用事件？）、與 `todo` kind 的關係、自訂分類的儲存位置與同步、多分類同時顯示的 UI、記帳與排班是否需要專用欄位（金額、班別）。對應 `M10-6`，並與 `M7-4` 一併規劃。**先 discovery，不可直接實作。**

### F-CREATIVE — Creative 入口【修改】

- **狀態**：🟡。創作功能入口頁 `CreativeView`，提供角色卡與世界觀的建立與清單。
- **資料方向**：Page shell + `kind: "creative"`；以 `creative_type` 區分 `novel`／`character`／`world`。
- **注意**：舊版曾把「小說閱讀格式」與「角色簡介表」視為創作入口的兩種範本；現在**小說是獨立功能入口**（F-NOVEL），創作入口只含角色卡與世界觀，「範本」一詞已改稱「模板」。
- **判斷函式**（`types.ts`）：`isCreativeCharacterPage`＝creative 且（`character`／`world`／有 `character_data`）；`isNovelPage`＝creative 且非角色類。早期沒有 `creative_type` 的舊小說以此相容。

### F-NOVEL — 小說【新增】

- **狀態**：✅ 本機；遠端章節同步需套用 `20260916_novel_chapters.sql`（見 00 §12）。
- **入口與總覽**：`creative_type: novel` 開啟時先進入作品總覽：封面（PNG／JPEG／WebP，≤ 3 MB，實際附件保存與同步）、可編輯作品名稱、獨立概述（`NovelSettings.synopsis`，不得由正文自動推導）、字數／章節統計、完整目錄。
- **內容邊界（D-201）**：只有段落、H1、H2 與基本 inline 文字樣式；貼上一律轉純文字；不含表格、圖片、清單、提示框、程式碼、LaTeX。
- **章節（D-209）**：
  - 章節是獨立的 `pages` 記錄：`kind: "novel_chapter"`、`parent_id`＝作品 ID、`sort_order`、標題、正文、建立／更新時間；繼承 `owner_id` RLS、同步、tombstone 與備份。
  - **啟用章節工作區時**才把舊單篇正文轉存為章節並清空作品正文；不啟用則不動舊資料（`NovelSettings.chaptersEnabled` 只由明確、交易式啟用寫入）。
  - 目錄、上一章／下一章、刪除、排序、重新命名皆操作獨立章節；重新命名與排序保留章節 ID。
  - **翻頁**：章與章之間透過**頂部與底部**的「上一章／選章／下一章」切換，不再把各章放在同一流動頁的前後區塊。
  - 章節頁不出現在一般頁面清單、Dashboard、右側面板、Command Palette（`NexusApp` 以 `kind !== "novel_chapter"` 過濾）。
  - 登入後預設選取項目時會排除章節（`novelChapters.ts` 的 preferred 邏輯）。
- **閱讀設定**：`NovelSettings.theme`（parchment／cream／eye_care／dark／pure_white）、`fontSize`（14–26）、`fontFamily`（serif／sans／kai）、`lineHeight`（1.6–2.4）、`paragraphIndent`、`showWordCount`。
- **手機**：目錄為覆蓋式面板；閱讀／編輯主區獨立垂直捲動。
- **驗收**：`tests/novelChapters.test.cjs`；隔離瀏覽器測試（桌面與 390×844）通過；正式帳號同步未測。

### F-CHARACTER — 角色卡【新增】

- **狀態**：✅ 本機；正式帳號同步未測。
- **資料真相**：`Page.character_data`（`CharacterProfileData`）；`basic`（姓名、別名、頭像、性別、年齡、角色、所屬、名言、自訂欄位）＋`sections[]`＋`tabs[]`。
- **區塊與內容（D-210）**：使用者可加「區塊」（`type: "group"`），區塊內可放多筆「內容」（`contents[]`），每筆內容有標題與一種資料類型。舊的單一類型區塊（葉節點）維持可讀可編輯。
- **資料類型（程式碼型別 `CharacterComponentType`）**：`group`、`key_value`、`rich_text`、`tags`、`stats`、`rating`、`relations`、`radar`、`palette`、`tendency`、`statistics`、`gallery`、`links`、`music`。對應使用者所稱的長文（`rich_text`，檢視時預設收合，可點三角形展開）、雷達圖（可新增細項，實際繪圖）、評分、偏向、統計、色票（可新增細項）、相冊、連結、音樂（只存外部連結）；「短文」與 `key_value` 的對應**未核實**。
- **統計**：每列有三格內容——短文字、長文字（多行介紹）、數值（可含單位）；欄位頂部有可自訂小標（`statisticHeaders`）；會把所有細項數值加總（測試例：37 + 5 = 42）。
- **分頁**：一張角卡可加多頁（類似試算表底部切換），用於補充資訊（例如 D&D 法術、攜帶物品）。原 `sections` 為「基本資料」分頁；分頁列位於底部；可新增、重新命名、排序、刪除（刪除有確認，取消不變動）。
- **外觀**：組件標題不使用 emoji（型別仍保留 `icon` 欄位但 UI 不顯示）。
- **模板（D-210）**：
  - 只在**建立時**詢問模板；建立後不再提供更換模板。
  - 內建：空白（完全無區塊、無填寫內容）、D&D 5e、CoC 7e（各自專用欄位與補充頁；只是記錄格式，**不是規則計算器**）；另保留 `fantasy`／`modern` 型別值供舊資料。
  - 使用者可自訂：按「將目前組件與內容設為模板與範文」存成模板；可在模板管理重新命名／管理。
  - **範文**（`example`、`basicExamples`）只以 placeholder 呈現，例如「破曉之刃」、「男」，**不會**填成角色資料；數值與視覺預設仍可編輯。
  - 自訂模板是帳號擁有的 creative 頁面，`character_data.isTemplate = true`，隨既有備份與同步；**更新模板不改動已建立的角色**。模板頁不出現在一般頁面清單。
  - 從模板建立時複製區塊與分頁結構並產生新 ID（`instantiateCharacterTemplate`）。
- **驗收**：`tests/characterWorkspace.test.cjs`；隔離瀏覽器：混合區塊、統計加總、長文收合、分頁管理、存模板／建角色、重新載入保留。

### F-WORLD — 世界觀【新增】

- **狀態**：🟡 可建立與編輯；歸屬機制完成。
- **規格**：`creative_type: "world"`，沿用角卡的區塊／內容／分頁／模板機制，可進行設定與描寫。
- **歸屬**：角色以 `character_data.world_id` 歸屬某世界觀，或為空表示獨立角色。
- **邊界**：世界觀／人物／地點與**小說**的關聯明確不做（D-201）。
- **待確認**：使用者原話為「類似角卡，也可以進行設定與描寫」；現況是否已足夠、是否需要世界觀專用內建模板，尚無明確要求。

### F-UTILITY — 網頁／計數／抽選【新增】

三者共用 `UtilityView`，資料存在 `Page.content_json`（D-218），皆為**基礎版**。

- **網頁（F-WEB）**：`intro`（介紹）＋`links[]`（`{id, label, url}`）。使用者要求「類似 lit.link」：**對外展示頁、版面設計、公開網址均未做**（依賴 M8-0／M8-1）。
- **計數（F-COUNTER）**：`counters[]`（`{id, name, value, group?}`）。「大組」以文字欄 `group` 表示，介面依名稱加總並顯示各組合計與全部合計；空的 group 顯示「未分組」。使用者原意是「一個計數項目可分大組與小組，大組是小組總和，小組可單獨存在」——**正式的大組物件與階層 UI 尚待資料模型確認**（M10-8）。
- **抽選（F-DRAW）**：`draws[]`（`{id, label, tags[]}`）；一個抽選項目 = 一個資料庫；單筆可多標籤（逗號分隔輸入）；抽取時勾選標籤，候選為**同時具備所有勾選標籤**者，再隨機抽指定數量。使用者要求的「某標籤抽幾個」「標籤配標籤」等規則**尚未做**（M10-9）。
- **新增選單**：三個功能各有對應新增項（網頁／計數項目／抽選資料庫）。

### F-EDITOR — Editor Blocks 與內容插入

| Block / 能力 | 狀態 | 規格／限制 |
| --- | --- | --- |
| Paragraph、Heading、Bullet／Ordered List、Quote、Code | ✅ | 基礎 Tiptap content；保存於 `content_json` |
| Link、TaskList | ✅ | 真實 node／mark；編輯模式下 link 不自動跳轉 |
| Table | ✅ | 8×10 picker、resize、右鍵選單、合併／拆分／平均選取範圍 |
| Callout | 🟡 | variant、icon、Markdown；真實瀏覽器 icon menu 問題未解、低優先 |
| Inline / Block Math | ✅ | Obsidian `$...$`／`$$...$$` 風格；舊 `$$/$$$` Markdown 不自動遷移 |
| MultiColumn / WritingMode / PageBreak | ✅ | 2／3 欄、直排、手動分頁能力；與自動 A4 分頁關係見 F-PAGEFORMAT |
| **Image Insert** | ▶️ | **對應 `M3-8`。圖片為插入內容，不是獨立匯入 Page。** 應走 Asset／Attachment，不能把 binary 塞進 `content_json`；允許哪些 page kinds、alt text、尺寸／裁切、backup／sync 規則需先定義 |
| Audio / Video | 🚫 | 暫時不考慮添加 |

### F-PAGEFORMAT — Flow、A4 與簡報格式

- **Flow**：Note 預設流動內容；流動格式不被自動改成分頁。
- **A4**：固定 A4 210mm × 297mm；自動分頁、內文可寫到底部、頁碼置中顯示。
- **Presentation**：16:9／4:3 由 Presentation 使用；Note 不應因此被當作簡報。
- **Document**：偏 A4；可依既有格式規則選擇 flow／A4／custom。
- **Custom**：⚠️ 有型別預留，但尺寸、行為與列印規格尚未形成完整 contract。
- **已知限制**：目前自動分頁仍有估算高度啟發式；表格、圖片、複雜內容需未來 DOM measurement 改善。

### F-LESSON — 筆記講義排版與目錄【新增】

- **狀態**：✅ 本機（`tests/lesson-workspace.md`：14 項測試通過、隔離介面測試；**實體列印、各瀏覽器 PDF 分頁差異、遠端同步未測**）。
- **使用者目標（09-19）**：在筆記中製作類似課本與講義的排版與內容。AI 提出四項建議，使用者要求繼續實作，但**教師／學生版 PDF 不做**（D-204）。
- **資料（D-214）**：設定存於 `content_json.lessonLayout`，沿用既有 JSON 儲存、同步與備份，無需資料庫遷移；編輯器更新正文時保留這份設定。
- **樣式**：原有／課本／講義三種；正文字級、行距、標題比例、頁首頁尾；分頁筆記可顯示頁碼。段落支援圖說與重點樣式。
- **教學區塊**：新節點 `lessonBlock`（定義、例題、練習、解答）、`answerSpace`（作答留白）、`lessonToc`（目錄）；解答可收合。例題與練習依全文順序自動編號，跨頁與巢狀區塊皆正確，移除後重編。
- **目錄與導航**：從整份筆記產生，含跨頁與多欄內容；改標題後同步更新；導航頁碼同步。
- **依 A4 整理分頁**：由使用者按鈕觸發（**不自動搬移**，維持分頁筆記手動分頁的既有語意）。以實際畫面量測區塊高度；維持標題與後段、圖片與圖說相鄰；保留原本手動分頁；整理後、繼續編輯前可**復原**；解答收合時須先展開；單一區塊大於 A4 可用高度時保持完整並提示，不切掉表格或文字。
- **流動筆記**：保留流動版面，頁首尾位於全文首尾。
- **列印**：保留頁碼、頁首頁尾、標題相鄰、表格列不斷頁；列印包含完整解答。
- **匯出限制**：Markdown 不保留完整紙張排版，教學區塊匯出為文字標籤與內容；完整資料使用 Nexus JSON 或工作區備份。
- **未做**：交互參照、圖表編號（建議清單第 4 項的一部分）。
- **穩定 ID**：`stableBlockIdExtension` 已延伸到新節點與圖片。
- **手機**：修正了流動筆記重複套用左右邊距造成正文過窄；手機「更多」選單提供教學區塊／圖說入口（各一份）。

### F-NAVIGATION — Home、Sidebar、File Menu、Dual Pane【修改】

- Home 是預設入口；Nexus logo 可回 Home。
- Sidebar 支援 folders、favorites、sort、type grouping、drag/drop、同類子頁、rename、bulk select。
- 子頁規則：同類型可成子頁；Presentation 不可成子頁；深度限制依現行 Sidebar 規則。
- File Menu 在工具列最左，承擔新建、匯入、格式、轉簡報、頁面管理、匯出／列印。
- Ctrl+點擊可開啟右側 Dual Pane；可 swap／close secondary pane。
- **功能兩欄格【新增，D-207】**：左側功能以**兩個一橫排、豎排最多四列可見**顯示。第一列固定「全部項目」與「日曆」；其餘功能（筆記、文檔、簡報、字卡、隨手記、創作、小說、網頁、計數、抽選）預設依**最新使用**重新排列。單擊功能變更篩選、雙擊才開啟（原 01 §14.1 已歸檔至 02）。
- **排序模式**：`recent`（預設，最新使用）／`default`（固定順序）／`custom`（自訂）。`recordFeatureUsage` 不記錄 `all` 與 `calendar`。偏好存在瀏覽器 localStorage（`nexus-feature-order-mode`、`nexus-recent-features`、`nexus-custom-feature-order`），**屬裝置本機偏好，不隨帳號同步**。設定入口在「詳細設定 → 功能排序」。
- **新增選單隨功能切換【新增，D-208】**（`creationOptions.ts`）：全部項目→筆記／文檔／字卡集／簡報／角色卡／世界觀／小說／網頁／計數／抽選／資料夾；筆記→流動筆記／分頁筆記；創作→世界觀／角色卡；小說→小說作品；文檔→文檔；簡報→簡報；字卡→字卡集；日曆→日曆事項；隨手記→隨手記；網頁→網頁；計數→計數項目；抽選→抽選資料庫。
- **首頁與清單捲動**：首頁在檔案數量多時曾無法上下滑動，已調整捲動容器與高度限制，**待大量檔案與實機驗證**。
- **新註冊帳號**不再自動建立 `Untitled` 空白文件。
- **手機**：側欄／輔助欄以浮層開啟、不擠壓編輯器，有遮罩；手機寬度下左側面板預設收合為零寬（原 01 §14.1，見 02 存檔）。使用者要求「開啟時不能編輯、點擊編輯器後兩欄自動收回」——浮層與遮罩已有，**鍵盤焦點完整禁用與點背景收合仍待驗收**。平板輔助頁的開合鍵位置已調整（原被右上角帳號擋住；右上角帳號入口之後已移除），待不同寬度實機檢查。

### F-PREFERENCES — i18n、Settings、Theme【修改】

- English／繁體中文；偏好保存在 settings store。
- 所有可見 UI 字串、alert／confirm、tooltip 應納入 i18n。**現況：`creationOptions.ts`、`featurePreferences.ts`、`UtilityView.tsx` 等新程式的標籤直接寫死中文，待 Q-6 補齊。**
- Night adaptation 可持久化；一般主題系統可後續擴充。
- **偏好層級【新增，D-206】**：偏好第一層只有「主題、語言、設定、備份（匯出／匯入）」；主題與語言以**右側浮動子面板**呈現，並限制在視窗內（390px 下實測未超出）。
- **詳細設定**：類似 GPT 設定的分類對話框（原生模態），分類為一般、功能排序、使用建議、使用說明、備份。功能排序沿用原有儲存與通知事件；備份沿用原有回呼。
- **帳號入口【取代舊描述，D-205】**：右上角常駐帳號入口已移除；側欄保留帳號入口（`AccountSettingsRow`）。`AccountButton` 只作為「未登入全頁登入／註冊畫面」（`required`）使用。

---

## 5. 現行資料模型與儲存契約

> **重要：** 以下是功能層需要維持的資料契約。精確 TypeScript union、欄位與 store migration 必須以 workspace source 的 `Q-0` 核對為準；舊 Canon 曾存在 DB_VERSION 2 與 3、PageKind 範圍不同的快照。

### 5.1 共用 Page Shell

所有主要 Page 至少須具備：

```
id, title, content_json, content_text,
created_at, updated_at, deleted_at,
revision, device_id,
tags, folder, links,
attachment_ids, primary_attachment_id,
kind, format, is_favorite,
sort_order, parent/subpage relationship（若目前 source 有使用）
```

### 5.2 Kind 與 mode-specific data【修改】

| 類型 | 真相位置 | 說明 |
| --- | --- | --- |
| Note | Page + `content_json` | rich editor 主體；講義設定在 `content_json.lessonLayout` |
| Document | Page + `content_json` | plain editor／Markdown workflow |
| PDF Research Note | Note Page + Attachment | 不是獨立 pdf_research kind |
| Study Set | Page（學習集殼）+ 獨立 `study_cards`／`study_states`／`study_events`／`study_settings` | 舊 `Page.study_items` 保留為遷移來源（D-215、D-216） |
| Presentation | Page + `presentation_data` | Slide／Block 資料不塞進一般正文邏輯 |
| Quick Note | `pages`，`kind: "quick_note"`（`color`） | 獨立 store 已廢棄（D-186） |
| Todo | `pages`，`kind: "todo"`（`due_date`、`priority`、`completed`） | 獨立 store 已廢棄（D-186） |
| 角色卡／世界觀 | `pages`，`kind: "creative"`，`creative_type: character／world`，`character_data` | 含 `tabs`、`world_id`、`templateId` |
| 角色卡模板 | `pages`，`kind: "creative"`，`character_data.isTemplate = true` | 帳號擁有，隨備份與同步；不出現在一般清單 |
| 小說作品 | `pages`，`kind: "creative"`（非角色類），`novel_settings` | 封面為附件 |
| 小說章節 | `pages`，`kind: "novel_chapter"`，`parent_id`、`sort_order` | 一般清單過濾 |
| 網頁／計數／抽選 | `pages`，`kind: web／counter／draw`，資料在 `content_json`（`links`、`intro`／`counters`／`draws`） | D-218 |
| 頁面附屬說明 | `Page.assistant_blocks` | 屬於該頁，不獨立開啟 |

### 5.3 Attachment / Asset

```
Attachment metadata 與 binary payload 分離。
PDF、未來 image insert 等資源走 Attachment / Asset abstraction。
Page / Presentation / Canvas / Website 應引用資源，不直接把 blob 塞入 content_json。
```

### 5.4 IndexedDB、Backup 與 Sync coverage【修改】

| Record 類別 | Local store | Backup | Sync | 現行狀態 |
| --- | --- | --- | --- | --- |
| Pages（含各 kind、章節、模板） | `pages` | 有 | `pages` 表（owner_id RLS） | 🟡 需 Q-0／Q-9 核對遠端欄位與 `kind` 約束 |
| Attachments／binaries | `attachments`／`binaries` | 有 | 有 | 🟡 binaries 本機未按帳號分區（D-200） |
| Settings（語言、夜間適配） | `settings` | 依 backup settings 策略 | 本機偏好，不同步 | 🟡 |
| 功能排序、最近使用 | **localStorage** | 否 | 否 | 裝置本機偏好 |
| 字卡／狀態／事件／設定／session | `study_cards`、`study_states`、`study_events`、`study_settings`、`study_sessions` | 備份 schema v2 的 `study` 欄位 | `study_*` 四表＋RPC `apply_study_operation`；本機 `study_outbox` | ⚠️ 遠端 migration 狀態未知 |
| 測驗答題與分數 | `quiz_attempts`、`quiz_states`、`quiz_outbox` | ⚠️ 是否進備份需 Q-0 核對 | `study_card_quiz_states`、`study_quiz_attempt_receipts`＋RPC `apply_study_quiz_operation` | ⚠️ 遠端 migration 狀態未知 |
| Quick Notes／Todos | 統一在 `pages` | 有（同 pages） | 有（同 pages） | 🟡 |

### 5.5 IndexedDB 結構【新增】

- 資料庫 `nexus`，`DB_VERSION = 6`（**舊文件寫 3／4 已過期**）。
- Stores：`pages`、`attachments`、`binaries`、`settings`、`study_cards`、`study_states`、`study_events`、`study_settings`、`study_sessions`、`study_outbox`、`quiz_attempts`、`quiz_states`、`quiz_outbox`。
- `pages` 與 `attachments` 使用本機欄位 `workspace_owner_id` 做帳號快取邊界（不上傳雲端）。
- 舊 DB 可能殘留 `quick_notes`／`todos` store：程式碼不再讀寫，未清理。
- v3→v4 新增字卡 stores、v5／v6 各版新增內容的對應，文件未記載；**以 source 的 `upgrade` 為準**。

### 5.6 內嵌於 content_json／JSON 欄位的資料契約【新增】

| 資料 | 位置 | 說明 |
| --- | --- | --- |
| 講義設定 | `Note.content_json.lessonLayout` | 樣式、字級、行距、標題比例、頁首頁尾、頁碼 |
| 教學節點 | `content_json` 內 `lessonBlock`／`answerSpace`／`lessonToc` | Tiptap schema 已通過 JSON 往返測試 |
| 網頁 | `content_json.{intro, links[]}` | — |
| 計數 | `content_json.counters[]` | `{id,name,value,group?}` |
| 抽選 | `content_json.draws[]` | `{id,label,tags[]}` |
| 角色卡 | `character_data` | 見 F-CHARACTER |
| 小說設定 | `novel_settings` | 見 F-NOVEL |

> 注意：`web`／`counter`／`draw` 的 `content_text` 目前被寫成整份 JSON 字串（`UtilityView` 內 `content_text: JSON.stringify(...)`）。這與「`content_text` 是可讀衍生資料、用於搜尋預覽」的原則不完全一致，可能污染搜尋與預覽；列為 `Q-0` 核對項。

---

## 6. UI、互動與設計契約

### 6.1 基本 UX 原則

```
極簡、內容優先、可預期位置、行內編輯優先、避免未確認功能被刪減。
Notion-like power + Obsidian-like ownership。
```

### 6.2 表格與選單

- 浮動選單採 Portal／fixed positioning，避免 toolbar overflow 裁切。
- Table 編輯選項只在右鍵選單，不回到工具列。
- 平均欄寬僅針對 CellSelection；沒有選取多格時要有明確提示。

### 6.3 行動裝置 UI 標準 ▶️【修改】

- **使用者要求**：mobile UI standard 是未來任務，不應在現階段要求以行動裝置優先重構 Web UI。
- **已落地的規則**：
  - 手機寬度下左側面板預設收合為零寬，開關固定在編輯器頂欄左側（原 01 §14.1，見 02 存檔）。
  - 側欄／輔助欄以浮層加遮罩開啟，不擠壓編輯器。
  - 小說目錄為覆蓋式面板；閱讀／編輯主區獨立捲動。
  - 講義：手機「更多」選單集中教學區塊與圖說入口；390px 下正文可用寬度約 345px。
  - 偏好右側子面板、模板選單皆限制在視窗內（390px 實測）。
- **使用者已提出但未完成驗收**：開啟側欄時禁止編輯（含鍵盤焦點）、點擊編輯器後兩欄自動收回。
- **對應任務**：`M9-0`；**所有手機／iPad 規則都尚未在實機驗證**（`Q-8`）。
- **尚未定義**：table editing、presentation canvas、offline editing、手勢、PDF workspace 規則。
- **待答**：手機／iPad 插入組件是否需要包成 App（`M9-5`；程式碼中沒有 PWA manifest 與 service worker）。

### 6.4 下拉刷新、右鍵與文字操作【新增】

- **下拉刷新（D-212）**：只在首頁與功能總覽清單啟用。參考 Ionic Refresher（依捲動容器判斷手勢、拉動倍率與門檻）與 Chrome `overscroll-behavior`（避免與瀏覽器原生下拉刷新同時觸發）。規則：清單須已捲到頂，且手勢起點在清單頂部 80px 內；24px 緩衝、0.35 倍阻力、80px 指示距離、至少拉動 500ms、**放手才刷新**；略過按鈕、編輯區、文字選取、側欄與內層捲動；換方向、多指、取消事件會取消手勢；刷新前等待待儲存及進行中的儲存，儲存失敗則保留內容並中止刷新。
  - 歷程：使用者於 09-16 與 09-19 兩度回報「太容易觸發」，第一次把門檻提高到 120px；第二次改為參考主流做法的完整策略。**仍待實機手感驗證。**
- **右鍵與編輯選單（D-213）**：編輯器右鍵、表格選單、編輯選單皆含全選／複製／貼上／剪下。原生文字輸入框保留系統選單。自訂貼上支援純文字與 HTML，小說只接收純文字；剪貼簿圖片仍用系統貼上。iOS／Android 剪貼簿權限提示待實機。
- **命名／刪除確認**：小說與角色卡的命名、儲存模板、刪除確認改為頁面內對話框（內建瀏覽器無法使用原生 prompt／confirm）。

---

## 7. Import / Export / Interoperability Matrix

| 流程 | 現行規格 | 狀態 | 限制／未來 |
| --- | --- | --- | --- |
| PDF Import | 匯入 PDF → Attachment binary → 自動 Research Note → viewer | ✅ | 未來 GoodNotes-like PDF workspace 見 F-PDF |
| Markdown Import | `.md/.markdown/.txt` → Document，folder = Imports | ✅ | 保留支援範圍，非完整 parser |
| Document Markdown Export | Document → Markdown | ✅ | 需 flush save；複雜 block 為 best-effort |
| Note Export | Print/PDF + `.nexus.json` | ✅ | Note 不提供完整保真 Markdown export |
| Workspace Backup【修改】 | 單一 JSON、pages/attachments/binaries/settings＋`study`（備份 schema v2）、完全覆蓋 import | ✅ | 匯入 v1 不刪除既存 FSRS 歷史；缺歷史、重複 ID 或事件 ID 內容衝突會停止還原；測驗資料是否入備份待 Q-0 核對 |
| Study CSV/TSV | CSV/TSV → Study Items | ✅ | 拼寫／Review Queue 未完成 |
| Image Insert | 編輯器內插入 Asset／Attachment | ▶️ | 非獨立 import Page；格式與 editor scope 待定 |
| Audio/Video | 不支援 | 🚫 | 暫時不列入任務 |
| Presentation Export | 未形成完整規格 | ⏳ | 未來需決定 PDF／PPTX／Web 等範圍 |
| Website Publish | 未形成完整規格 | ⏳ | MVP-8 分階段處理 |

---

## 8. 資料安全、Backup、Sync 與恢復

### 8.1 Local-first 與 Backup

- 本機 IndexedDB 是第一層可用資料來源。
- Backup v0 使用 JSON + binary base64，import 為完全覆蓋且需二次確認。
- `schema_version`、atomic IndexedDB transaction、reload 是既定安全要求。

### 8.2 帳號 Workspace Sync【取代舊「Shared Workspace Sync」】

- 舊 B1（無登入、共享 workspace、RLS allow all）已被 D-198／D-203 取代：**登入必須制，資料按 owner_id 隔離**。
- **頁面同步**：`SyncEngine` 取得登入 user_id 後才啟動；pages／attachments／binaries 的查詢、Realtime、upsert、delete 皆帶 owner 篩選；本機資料亦再次篩選 user_id（防禦性）。`pages` 推送欄位含 `kind`、`study_items`、`presentation_data`、`sort_order`、`parent_id`、`due_date`、`creative_type`、`character_data`、`novel_settings`、`assistant_blocks`、`margins` 等。
- **字卡同步**：`syncStudy` 走 Supabase RPC，事件先按前序送出，以事件 ID 去重；雲端確認後才移除本機 outbox；遺失回應可安全重送；舊裝置首次遷移寫入為 insert-only，不能覆蓋新版內容。伺服端權限：用戶端只可讀自己的資料列，寫入只能透過 `security definer` RPC，且禁止直接刪除事件。
- **測驗同步**：`apply_study_quiz_operation` 以 advisory lock 與事件收據保證冪等；離線作答須經使用者決定（上傳／捨棄／稍後）才會進 outbox（D-217）。
- **同步競態**：只允許最新一次 `startAccountSync` 更新 UI；登出與 React Strict Mode cleanup 使舊 token 失效。
- **B2 未完成**：頁面層級 last-write-wins **不可作正式行為**（字卡層已有事件鏈式衝突偵測，頁面沒有）。

### 8.3 B2 必要規格方向

```
revision conflict detection
保留兩個版本而非靜默覆寫
手動解決 UI
版本歷史快照
offline / reconnect / delete / attachment / backup import 行為
```

個別資料結構、retention、版本比較 UX 在 MVP-4 開工前需另行確認。

---

## 9. 品質、驗證與相容性規格

### 9.1 最低驗證層級

| 層級 | 用途 |
| --- | --- |
| TypeScript | `tsc --noEmit`，型別與介面基本安全 |
| Build | Next production build，避免 compile-only 誤判 |
| jsdom / 真實 Editor | 複雜 ProseMirror／NodeView／transaction 行為 |
| Playwright | 互動、版面、列印、選單、拖曳等瀏覽器驗證 |
| 真實瀏覽器／使用者驗收 | 最終 UX、focus、IME、selection、部署差異 |

### 9.2 驗收規則

- 不可將「文件寫完成」或「build 通過」直接標示為使用者驗證完成。
- 重要資料任務應含 reload、backup restore、sync／offline、migration 回歸。
- 每個未來工作包需在 00 寫入任務 ID、開始狀態、驗證證據與剩餘依賴。

### 9.3 自動化測試檔【新增】

`tests/`：`characterWorkspace`、`novelChapters`、`pullToRefresh`、`lessonDocument`、`studyFSRS`、`studyPractice`、`studyRepository`、`studySessions`、`studySync`（在隔離 PGlite 實際執行 PostgreSQL migration）、`quizPersistence`、`quizQuestions`（皆 `.test.cjs`）；驗證說明：`creative-workspace.md`、`lesson-workspace.md`、`study-workspace.md`、`workspace-interactions.md`。指令：`node --test tests/*.test.cjs`。

---

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

## 11. 決策索引與舊 Canon 對照【修改】

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

## 12. 已知需求缺口與未來功能清單【修改】

> 以下不是自行新增需求；它們是目前已有方向、使用者新確認的要求，或尚未形成完整 contract 的能力。

| 功能 | 狀態 | 現行要求／缺口 | 建議容器 |
| --- | --- | --- | --- |
| Image Insert | ▶️ | 圖片作為 editor insert；需定 editor scope、Asset storage、尺寸、alt text、backup/sync | `M3-8` |
| GoodNotes-like PDF Workspace | ▶️ | PDF 以匯入文件形式使用；不自行假設手寫／annotation 細節 | `M6-5`／`M6-6` |
| Citation Metadata | 🟡 | MVP-2 必要結案項；需正式 schema/UI | MVP-2 |
| Stable Block ID | ▶️ | C3；`stableBlockIdExtension` 已存在，contract／backfill／測試未做 | MVP-5 |
| Annotation / Highlight | ⏳ | 需 anchor model | MVP-6 |
| Asset / Image Library | ⏳ | 需 asset metadata、reference、view 規格 | MVP-6 |
| 通用 Template System | ⏳ | 角色卡模板已完成；筆記／簡報等模板未定義 | 待分類 |
| Graph | ⏳ | 無最小資料與互動規格 | 待分類 |
| Universal Search | 🟡 | 現有 Search v0；多 record 搜尋範圍未定 | MVP-6／7 |
| Board／Task projection | ⏳ | 需 projection contract | MVP-7 |
| 多分類日曆【新增】 | ⚠️ | 特殊日、排班、記帳、日記1／2、要事、todolist；自訂分類；同時／單獨顯示 | `M10-6` |
| 網頁公開展示（lit.link 類）【新增】 | ⚠️ | 對外頁面、版面、公開網址 | `M10-7`／`M8-0`／`M8-1` |
| 計數大組／小組模型【新增】 | ⚠️ | C4：大組由小組派生，小組可獨立；編輯與聚合細節待設計 | `M10-8` |
| 抽選進階規則【新增】 | ▶️ | 各標籤各抽 N 個、標籤配對／組合 | `M10-9` |
| 唯讀分享連結【新增】 | ⚠️ | 小說／角卡／筆記可分享，知道連結者可檢視；暫不做共編 | `M8-0` |
| 全站共用字典【已決策／待實作】 | ▶️ | 權威規格見 §4 F-DICTIONARY／F-STUDY，四階段 `M7-9～M7-12`；不把 owner-scoped `etymology_*` 當公共資料；CEEC 匯入暫緩 | `M7-9～M7-12` |
| 近義詞群組練習【仍待細化】 | ⚠️ | 與已確認的公共字典分離，不擅自假設近義詞分組、題型或 FSRS 寫入語義 | `M7-8` 後續 |
| 雙向拼寫／容錯【新增】 | ⏳ | 目前只做英→中 | `M7-2` |
| 講義交互參照【新增】 | ⏳ | 圖表編號與跨區塊引用 | `M10-10` 後續 |
| 手機／iPad 插入組件方案【新增】 | ⚠️ | 是否需要 App、PWA 是否足夠 | `M9-5` |
| 大量資料效能【新增】 | ▶️ | 壓力測試、整批載入、分頁實例 | `Q-7` |
| Mobile UI Standard | 🟡 | 部分落地，缺實機 | `M9-0` |
| 世界觀／人物／地點與小說關聯 | 🚫 | 使用者明確排除 | 不排程 |
| 教師／學生版 PDF | 🚫 | 使用者明確排除（D-204） | 不排程 |
| Audio / Video | 🚫 | 暫時不考慮添加 | 不排程 |

---

## 13. Legacy Canon 保留規則

- 原 01 的完整歷史 decision／spec source 已併入 `02-PROJECT-LOG-DETAILED.md` 的「01 Legacy Canon Transfer」附錄，未刪減。
- 02 中轉移的歷史狀態、過期 schema、舊 MVP 命名不得覆蓋本版的 current functional spec 或 00 的 current task plan。
- 若新舊文字衝突：**00 的任務狀態 → 本版 01 的功能契約 → source code → 02 歷史過程** 依序判讀。
- 任何資料模型新發現，都應先更新 §5／§8 的 current contract，再把舊內容保留於 02 歷史，而非直接覆寫不留痕跡。

---
