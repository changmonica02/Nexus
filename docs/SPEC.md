# Nexus — 正式產品規格（完整 Canon 遷移版）

> 遷移基準：2026-10-11 Canon + 2026-09-28 最新交接增量。章節保留原始精細條款，僅依文件職責分流；2026-10-12 後的使用者決策優先。任何標記 IMPLEMENTED_LOCAL 都不代表正式部署。舊來源在 [歷史封存](archive/)；專屬追溯見 [對照表](CANON-CROSSWALK.md)。

## 零、產品互動規格的強制編寫標準（2026-10-12）

> **適用對象：所有 Nexus 模組、頁面、彈窗、側欄、選單、元件與設定。** 既有 Canon 內容是規格來源，但若缺少下列細節，**不得將其標記為「UI/UX 完整定案」**。本節規範撰寫與驗收方式，不代表以下範例值已獲使用者批准。

### 0.1 規格狀態與證據

每個模組與畫面必須標記：
- `DRAFT`：初稿或歷史資訊尚待整理；
- `REVIEW`：正與產品負責人討論矛盾、風險及取捨；
- `APPROVED`：使用者已確認，可據以設計技術架構；
- `IMPLEMENTED_UNVERIFIED`：已有實作證據，但尚未完成驗收；
- `VERIFIED`：在指明環境、版本與測試證據下通過指定驗收。

**產品定案狀態與程式實作驗證狀態分開記錄**；可同時是 `APPROVED`、`IMPLEMENTED_UNVERIFIED`。未知尺寸、斷點、手勢或設定預設值一律寫 `待定（須使用者確認）`，不能由 AI 補成已定案的數字。

### 0.2 頁面與互動契約必填欄位

每個具名畫面使用固定 `[模組]-[畫面]` ID，例如 `DICT-ENTRY-DETAIL`；每個可操作元件建立穩定的 ID。**每個畫面最少紀錄：**

1. **目標及角色**：目標、誰能進入、登入／離線／讀者／管理員差異。
2. **進入方式及導覽圖**：上一層、入口控件、網址／內部路由、可跳轉目的地、返回語義、瀏覽器上一頁及深連結。
3. **畫面結構與層級**：Header／Body／Sidebar／Footer／Overlay 的位置、排列優先級、遮罩及捲動容器；常駐／條件顯示區域。
4. **元件清單**：ID、文案／圖示、相對位置、對齊方式、尺寸／最小最大限制、顯示條件、可用／停用條件、focus／hover／active／disabled 狀態。
5. **逐步互動流程**：啟動條件 → 按／點／長按／滑動／拖曳／鍵盤輸入 → 狀態變更 → 儲存／取消 → 成功後畫面／導覽／焦點；每個中斷點與返回行為。
6. **設定契約**：設定項 ID、入口、類型、可用值及範圍、預設值、有效範圍（此頁／模組／帳號／裝置）、儲存位置、同步與離線規則、何時生效、重設方式、權限與衝突優先順序。
7. **資料呈現與編修**：清單排序／過濾／搜尋、空狀態、loading、錯誤提示、欄位驗證、重複／競態、編輯中的 dirty state、失敗重試及回滾。
8. **跨裝置及可及性**：桌面／平板／手機的斷點策略，觸控目標、鍵盤 Tab 順序、焦點返回、螢幕閱讀器文字、縮放、長文字與不同語言。
9. **驗收案例**：Given／When／Then，含成功、取消、權限不足、無網路、資料衝突、重新整理及手機觸控；列明待定問題與證據來源。

### 0.3 位置與尺寸的定義規則

**必須可實作、可量測，而不是只寫「好看」「適當」「適合手機」。** 依以下順序決定尺寸：

- 優先採 **design token**：按鈕高度、控制項間距、字級、圓角、色彩、z-index、陰影、最小觸控區及響應式斷點；需給明確 token 名稱或待定標記。
- 對固定尺寸元件，記錄 `寬 × 高`、最小／最大、內距、外距、對齊與定位參照物；無數值則 `待定`。
- 對彈性容器，記錄 `min/max/clamp/flex/grid`、相對位置及在有限空間中的優先縮排、換行、橫捲與隱藏規則。
- 桌面、平板、手機**分別**指定可見元件、工具列重排、觸控交互、浮動視窗改底部面板的條件；斷點數值待核准前不自訂。
- 文案多語系、字級放大、系統鍵盤、瀏海／安全區、橫豎屏及無障礙縮放不得造成重要按鍵不可觸達。

### 0.4 每個互動元件使用下列欄位表

| 欄位 | 寫法 |
| --- | --- |
| 元件 ID／名稱 | `DICT-ADD`／新增 |
| 顯示／權限 | 角色、資料／畫面狀態、手機／桌面差異 |
| 位置／階層 | 父容器、相對位置、排序、z-index |
| 尺寸／間距 | 使用已批准 token 或精確值；沒有則待定 |
| 觸發方式 | click／tap／鍵盤／長按／手勢 |
| 開啟／導覽目標 | 明確畫面 ID、彈窗 ID 或狀態 |
| 可更改內容 | 欄位、選項、上下限、預設值 |
| 確認／取消／返回 | 是否有保存提示及焦點去向 |
| 成功／失敗 | 回饋、錯誤訊息、重試、權限與並發 |
| 持久化／同步 | 本機、帳號、伺服器或純暫存 |
| 驗收方式 | 可重現的互動情境及測試環境 |

### 0.5 操作流程模板

```text
畫面 ID：
定案狀態：DRAFT / REVIEW / APPROVED
實作驗證：未確認 / 有程式碼未驗收 / 已驗收（附版本）
使用者目標：
角色及前置條件：
入口 → 畫面：
版面分區：桌面 / 平板 / 手機
元件清單：ID、位置、尺寸、顯示條件、行為
操作 A：
  1. 使用者在 [入口] 做 [動作]
  2. 系統執行 [驗證]、進入 [狀態]、開啟 [目標]
  3. 使用者選擇／設定 [欄位及預設值]
  4. 確認／取消／返回 → [畫面及保存行為]
  5. 成功／失敗／離線／衝突 → [結果與提示]
設定清單：入口、值域、預設、作用範圍、同步、重設
未決問題：（逐條、需產品負責人批准）
驗收案例：（成功／失敗／權限／無網路／手機）
```

### 0.6 現行字典的互動約束示例（確立行為，不擅自定尺寸）

- 字典的單一「新增」入口在編輯欄，透過下拉選擇 Word／Prefix／Root；「匯入」為與新增同層獨立按鈕，點擊顯示浮動匯入視窗。
- 詞條詳情支援上一筆／下一筆，手機及平板支援左右滑動切換；返回只回到實際來源畫面，不另設「回到全部單字」。
- 管理員可在詞條詳情頁右上角直接編輯詞條；一般使用者無公共詞條編輯能力；伺服器權限不依賴 UI 隱藏。
- 同一資訊來源的註釋合併在同一視覺容器。
- **待核准**：各按鍵精確寬高、右上工具列的元件間距、滑動觸發閾值、彈窗／底部面板切換斷點、觸控區 token，以及返回時未儲存修改的處理細則。未核准前不稱 UI 完整定案。

### 0.7 後續編寫與審查流程

先補全各頁面與互動規格 → 由使用者審查並討論風險 → 標記 `APPROVED` → 參考當前程式碼規劃 `ARCHITECTURE.md` → 比對差異與測試 → 拆成 Issue／PR。**禁止以現有 UI 或 Codex 推斷補完的尺寸，反過來宣稱是使用者核准的產品規格。**

## 一、產品定位與功能總覽

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
| AI | 後期輔助層，不作早期內容資料模型或必要依賴 |
| Web Clipper | 後期能力；先不做完整 browser extension |
| 帳號／權限【修改】 | **登入必須制**（D-203）：未登入只顯示登入／註冊；登入後才使用該帳號的本機快取與雲端同步（D-198、D-200）。無匿名工作區。共編不在範圍 |
| Mobile UI【修改】 | 部分規則已落地（見 §6.3）；完整標準仍是 `M9-0`，實機驗收未完成 |
| 創作【新增】 | 小說（受限純文字，D-201）、角色卡／世界觀（結構化區塊）為獨立功能；不做世界觀／人物／地點與小說的關聯 |
| 個人工具【新增】 | 隨手記、日曆待辦、網頁、計數、抽選；目前為基礎版，範圍見 §4 各卡 |

---

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

## 二、各模組逐項功能契約

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
- **正式單字複習**：固定持久化 session，預設目標 20 張；New 優先（隨機）→ Due 隨機 → Not-due 按最近到期補位。每張卡**本輪首次評分**才寫正式 FSRS review event／due，後續重練只更新 session mastery。Again／Hard 重排；Good／Easy 均完成出箱。`easy_at` 暫保留作相容性完成標記。
- **四選一測驗（新決策）**：預設中→英，可切換英→中，方向持久化；只用已學習卡，必須至少 4 個相異且修剪後不重複的選項。加權公式 `min(3, 1 + memory_bonus + 0.25 * mistake_score)`；New 加成 0.5，FSRS 加成 `1 - retrievability`（只讀），錯題分數 0–4（錯 +1、對 −1）；測驗不寫 FSRS。離線作答待連線後由使用者決定上傳／捨棄／稍後，固定快照及事件 ID，重試冪等。
- **舊卡遷移**：需在預覽確認左欄英文、右欄中文後啟用每日練習；未填完整的卡保留但不出題；舊 `daily_due_at` 只作首次新版複習的資格門檻；**不得**把舊 `review_count`、三段評分、`daily_phase` 冒充 FSRS 歷史或記憶參數。
- **編輯與複製**：中文修改保留排程；英文修改提供保留／重設／取消（重設以新 generation＋`reset` 事件，歷史仍保留）；單卡與整個學習集複製只複製內容並建立 New 卡；刪除為 soft delete。
- **雙裝置衝突**：兩台裝置離線回答同一張卡時，保留所有事件，標記 `conflict` 並停止該卡正式排程；使用者須明確選擇「保留歷史並重新學習」。不自動推測語義合併。
- **仍保留**：CSV/TSV 匯入基線（沿用舊規格）。
- **字卡編輯列表**：以英文 A–Z 呈現兩欄 English／Chinese；長文字單行省略，點選整列開編輯，顯示完整內容；列表呈現排序不可覆寫資料中的自訂 order。
- **翻面後資訊及儲存提示**：僅每日學習／正式複習背面顯示展開字典詳情；順序為四個評分按鈕 → 詳情面板 → **詳情內容末端隨捲動顯示**的儲存狀態提示（B2）。不在單字卡上方，也不承諾 sticky 常駐固定條。只有真正在儲存時顯示；成功消失，失敗同位置提示／重試；展開詳情不更動 FSRS。
- **離線資料邊界**：系統在一般重新整理與離線期間持續保留已寫入的本地學習資料；備份和跨裝置同步依帳號設定與備份流程執行。

### F-DICTIONARY — 全站共用公共字典

- **資料及角色**：全站有一套共用公共字典，含 Word、Prefix、Root 三種詞條。管理員管理、編輯、審核、發布及匯入；一般登入使用者可以閱讀已發布的內容。使用者個人字卡獨立擁有，可透過穩定 Entry ID 連結公共詞條。
- **義項**：一個詞條可以包含多個 Sense，記錄詞性、繁體中文義項以及義項專屬的例句、讀音、詞源等。構詞關聯能連到指定的義項。
- **草稿與發布**：管理員有草稿編輯、審核、預覽及發布流程。已發布內容提供一般使用者閱讀，編輯時以 revision／Draft 保護正式版本。
- **管理界面**：管理入口只對管理員顯示；管理員於詞條詳情右上角直接編輯。新增與匯入位於同層，新增面板以類型下拉選 Word／Prefix／Root；匯入開啟浮動視窗。
- **閱讀界面**：公共字典總覽可搜尋三類詞條；詳情頁顯示各個義項、歷史詞源、構詞關聯、口訣與記憶故事。同一來源注釋以單一內容容器呈現。支援前後詞條切換，手機／平板左右滑動，返回來源清單並保留上下文。
- **字卡關聯**：使用者可將私人字卡連至公共詞條；每日學習與正式複習的答案面可展開公共字典詳情。私人字卡的中文、英文、排程與評分由私人學習系統管理。
- **匯入管理**：支援 CSV／JSON／相容內容渠道的預覽、資料驗證、Safe／Review／Invalid 分流、衝突覆核、審計及可重試提交。管理員決定草稿何時發布。
- **讀音**：可記錄 Entry 共用或 Sense 專用的 IPA 與 locale，支援同一詞條多筆讀音。
- **來源與版權**：歷史詞源可顯示內容本身的資料來源；一般第三方資料來源及版權說明集中於「設定 → 關於 Nexus → 資料來源與版權」。
- **權限與資料一致性**：所有公開詞條的新增、編修及發布均由系統驗證管理權限，讀取公開內容以發布狀態為準。跨裝置、離線／衝突及匯入交易維持資料完整性。

### F-DICTIONARY｜資料來源、匯入與內容模型

#### 1. 資料來源與版權呈現

- 一般詞條、義項和學習註釋以內容欄位呈現；歷史詞源的內容來源可在該段註釋內顯示。
- 歷史詞源仍保留自己的「資料來源」文字，因其屬於該詞源內容本身，不等於被退休的一般 per-entry source/license。
- `dictionary_audit`／操作歷史必須保留。

- 全站第三方資料／版權聲明統一放在：**設定 → 關於 Nexus → 資料來源與版權**。

#### 2. Word CSV runtime 契約

只接受以下五欄，**欄名與值都必須完整**：

```csv
entry_id,sense_id,headword,part_of_speech,gloss_zh_tw
```

- CSV／Markdown／JSON／AI 匯入使用目前正式欄位契約，對未知欄位回報清楚的驗證結果。
- Word CSV 匯入使用五欄格式，並由內容母檔轉換到匯入欄位。
- Prefix／Root 資料依其對應的匯入格式與檢核流程處理。

#### 3. 正式內容母檔（2026-10-08）

正式內容母檔分為三類 CSV：

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
- Word 編輯內容包含基本詞條／分類、中文義項、構詞關聯、歷史詞源、口訣及記憶故事。
- 歷史詞源內容含完整敘述及該段內容自己的資料來源。
- 編輯已發布詞條時建立供審閱的 Draft／revision；發布由管理員明確確認。
- 草稿／發布狀態、revision、交易回滾、管理權限與審計適用於所有修改管道。

#### 7. Official Study Packs

- 正式官方包仍為：**學測單字 1–2 級、3–4 級、5–6 級**。
- manifest 只引用已發布公共 Word，不複製一份平行字典；下載後建立使用者擁有的 Study Set。
- 刪除使用者下載實例只刪個人 Study Set／進度，不刪公共字典或 official manifest；可重新下載。
- pack 更新以新增內容為主，不重建／刪除使用者既有字卡。

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


### F-SCORE — 製譜

- **C2 已確認先前順序**：先作品管理＋快速簡譜，再各自開發五線譜與吉他譜；三者不強制互轉，也不預設共用同一完整音樂資料模型。正式譜面 preview 優先，進入「編輯」才顯示文字源碼；桌面可探索分割畫面，手機以預覽／編輯切換為主。
- **候選簡譜草案（未最終確認）**：`_6`／`^6` 表八度、`#5`／`b7` 升降、`6•` 附點、`5/`／`5//` 時值、`0` 休止、`|` 小節；標頭 `@title`／`@key`／`@time`／`@tempo`，註解 `//` 屬草案，不直接當 parser 合約。播放與完整 MusicXML／MIDI 互轉非首版承諾。

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

### F-CREATIVE — Creative 入口

- **狀態**：🟡。創作功能入口頁 `CreativeView`，提供角色卡與世界觀的建立與清單。
- **資料方向**：Page shell + `kind: "creative"`；以 `creative_type` 區分 `novel`／`character`／`world`。
- **注意**：舊版曾把「小說閱讀格式」與「角色簡介表」視為創作入口的兩種範本；現在**小說是獨立功能入口**（F-NOVEL），創作入口只含角色卡與世界觀，「範本」一詞已改稱「模板」。
- **判斷函式**（`types.ts`）：`isCreativeCharacterPage`＝creative 且（`character`／`world`／有 `character_data`）；`isNovelPage`＝creative 且非角色類。早期沒有 `creative_type` 的舊小說以此相容。

### F-NOVEL — 小說

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

### F-CHARACTER — 角色卡

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

### F-WORLD — 世界觀

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

### F-NAVIGATION — Home、Sidebar、File Menu、Dual Pane

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

### F-PREFERENCES — i18n、Settings、Theme

- English／繁體中文；偏好保存在 settings store。
- 所有可見 UI 字串、alert／confirm、tooltip 應納入 i18n。**現況：`creationOptions.ts`、`featurePreferences.ts`、`UtilityView.tsx` 等新程式的標籤直接寫死中文，待 Q-6 補齊。**
- Night adaptation 可持久化；一般主題系統可後續擴充。
- **偏好層級【新增，D-206】**：偏好第一層只有「主題、語言、設定、備份（匯出／匯入）」；主題與語言以**右側浮動子面板**呈現，並限制在視窗內（390px 下實測未超出）。
- **詳細設定**：類似 GPT 設定的分類對話框（原生模態），分類為一般、功能排序、使用建議、使用說明、備份。功能排序沿用原有儲存與通知事件；備份沿用原有回呼。
- **帳號入口【取代舊描述，D-205】**：右上角常駐帳號入口已移除；側欄保留帳號入口（`AccountSettingsRow`）。`AccountButton` 只作為「未登入全頁登入／註冊畫面」（`required`）使用。

---

## 三、UI 與使用者操作約定

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

### 6.3 行動裝置 UI 標準

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

### 6.4 下拉刷新、右鍵與文字操作

- **下拉刷新（D-212）**：只在首頁與功能總覽清單啟用。參考 Ionic Refresher（依捲動容器判斷手勢、拉動倍率與門檻）與 Chrome `overscroll-behavior`（避免與瀏覽器原生下拉刷新同時觸發）。規則：清單須已捲到頂，且手勢起點在清單頂部 80px 內；24px 緩衝、0.35 倍阻力、80px 指示距離、至少拉動 500ms、**放手才刷新**；略過按鈕、編輯區、文字選取、側欄與內層捲動；換方向、多指、取消事件會取消手勢；刷新前等待待儲存及進行中的儲存，儲存失敗則保留內容並中止刷新。
  - 歷程：使用者於 09-16 與 09-19 兩度回報「太容易觸發」，第一次把門檻提高到 120px；第二次改為參考主流做法的完整策略。**仍待實機手感驗證。**
- **右鍵與編輯選單（D-213）**：編輯器右鍵、表格選單、編輯選單皆含全選／複製／貼上／剪下。原生文字輸入框保留系統選單。自訂貼上支援純文字與 HTML，小說只接收純文字；剪貼簿圖片仍用系統貼上。iOS／Android 剪貼簿權限提示待實機。
- **命名／刪除確認**：小說與角色卡的命名、儲存模板、刪除確認改為頁面內對話框（內建瀏覽器無法使用原生 prompt／confirm）。

---

## 四、資料交換及匯入匯出契約

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

## 五、未定事項／未來模組與使用者決策補充

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

---

## 六、公共字典最新介面與操作規格（2026-10-12 使用者決策）

> **規格寫法**：本節只描述最終應呈現的畫面及行為。具體舊介面移除、取代、修改工作列於 `HANDOFF.md`。尺寸、手勢門檻、精確間距仍須產品負責人確認。

### 6.A 角色、頁面入口與管理操作

- Nexus 有一套全站共用公共字典；一般登入使用者瀏覽已發布詞條，管理員可管理公共詞條。私人字卡由建立者自行擁有，並可連結公共詞條補充資料。
- **管理入口只對管理員顯示**。管理員在既有登入工作階段直接進入管理介面，不需另外執行一次管理員身分確認；登入帳號的權限由系統判定。
- 管理介面有同一層級的「新增」與「匯入」操作入口：「新增」開啟共用詞條編輯面板，透過類型下拉選擇 Word／Prefix／Root；「匯入」開啟浮動匯入視窗。
- 普通使用者瀏覽詞條詳情，管理員在同一詳情頁的**右上角**直接使用「編輯」按鈕，進入該詞條的編輯狀態。編輯仍在詞條上下文中完成。

### 6.B 詞條詳情頁與導覽

- 使用者從詞條清單、搜尋結果、個人字卡的公共詞條連結或其他可連結入口進入詞條詳情頁。
- 詞條詳情頁提供「上一筆／下一筆」切換操作；依**進入時的來源清單與排序、篩選上下文**決定前後項，並明確回饋到達首筆／末筆。
- **手機與平板**可在詳情內容區域左右滑動切換上一筆／下一筆。滑動需與文字選取、內層橫向捲動、系統返回手勢協調；實際方向映射、觸發距離及手勢優先級待核准。
- 頁面「返回」只返回開啟該詳情頁的**實際來源畫面**，並盡可能維持原搜尋條件、捲動位置與清單狀態；對直接開啟的深層連結需定義可用的安全預設返回目的地（待核准）。
- 管理員右上角「編輯」進入編輯狀態後，完成儲存可回到同一詞條詳情，並保留合理的來源導覽上下文；未儲存變更時的離開提示待核准。

### 6.C 注釋內容呈現

- 同一個內容來源的注釋、補充說明及關聯敘述整合在**同一個視覺區塊／容器**，區塊內以小標、段落、清單等層次分隔內容。
- 不同來源可以形成不同區塊；來源名稱、內容與必要參考資訊在同一區塊中可辨識。
- 在桌面、平板與手機上維持一致的來源分組語義，僅調整容器寬度、留白、欄數與文字換行規則。具體設計 token 與尺寸待核准。

### 6.D 介面規格待確認清單

- 管理員工具列、右上角編輯按鈕、上一筆／下一筆控制項的精確位置與尺寸。
- 上一筆／下一筆遇到搜尋結果更動、權限變更、草稿、末筆時的行為。
- 手機／平板滑動方向、閾值與衝突手勢處理細節。
- 深層連結返回預設頁；編輯中返回、儲存／取消與導覽上下文保留。
- 注釋來源區塊的視覺間距、寬度、標題格式及超長內容折疊規則。

## 七、帳號刪除產品操作（專項整合）
## 帳號刪除：使用者行為
- 使用者入口：側欄「帳號」→「刪除帳號」→ 輸入「刪除帳號」→「永久刪除」。
- 必須確認目前使用者的電子郵件與指定確認文字，才可刪除自己的帳號；不得指定或刪除其他使用者。
- 帳號及其私人筆記、附件、Study、Quiz、已安裝之舊字源資料，依現有資料模型安全刪除；不應連帶清除他人資料或共用舊資料。
- 成功後登出、清理目前帳號的本地離線快取與附件二進位快取，返回首頁；其他帳號資料與一般偏好保留。
- 伺服器端功能尚未啟用時顯示明確提示；如果連線中斷致結果不明，要求重新登入確認，不能先宣稱刪除成功或清除本地資料。
- 其他裝置已保留的離線副本無法由此流程遠端抹除；不得宣稱所有裝置上的副本皆已清理。
