# Nexus — 重要變更、決策原因與歷史演進

> 遷移基準：2026-10-11 Canon + 2026-09-28 最新交接增量。章節保留原始精細條款，僅依文件職責分流；2026-10-12 後的使用者決策優先。任何標記 IMPLEMENTED_LOCAL 都不代表正式部署。舊來源在 [歷史封存](archive/)；專屬追溯見 [對照表](CANON-CROSSWALK.md)。


## 一、現行產品決策索引、已否決／被取代方案

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

## 二、來源的決策與歷史優先級
- 最新使用者明確決策 ＞ 現行 SPEC 目標契約；較舊 `02` 歷史不可反向覆蓋現行產品。
- 程式碼是「目前實作」的證據，不會自動取代核准後的產品需求。
- 歷史 00／01/02 的長篇除錯、重複更新、已取消實作方案歸檔保存，不再複製成多份相互衝突的正式條款。
- 明確取消：教師／學生版 PDF；小說與世界觀／人物／地點自動關聯；舊匿名私人工作區、右上角帳號入口、獨立 quick_notes / todos store 等為過時。

## 三、歷史發展與決策追溯目錄（依 02 原稿的具名章節）
下列為**索引**，不是表示各歷史項目在目前程式仍有效；細節可回查 [02 全文](archive/02-PROJECT-LOG-DETAILED.md)，重要現行要求已分流至 SPEC 和 ARCHITECTURE。

- Nexus — PROJECT LOG DETAILED（專案詳細日誌）
- READ FIRST｜02 歷史閱讀索引（2026-09-28）
- 2026-07-31 — Supabase 雲端同步 + UI 改善（側邊欄拖拽、格式選擇、字樣、色票、學習集測驗）
- 2026-07-30 — 深度審核：00/01/02/99 四份交接文件的整理、完善、問題分析與建議
- 2026-07-30 — Track H～M：Preferences/i18n、Sidebar UX、Drag Handle、Resizable Layout、Document kind、Note 富文字排版與匯出分級完成（回溯性補記）
- 2026-07-30 — Track G：Navigation & Overview（Command Palette + Dashboard / Home v0）完成
- 2026-07-02 — Editor Blocks Foundation：LaTeX 改版為 Obsidian 風格原地編輯公式，取代官方 $$/$$$ prompt 版本
- 2026-07-02 — Editor Blocks Foundation：LaTeX / Block Math 完成（三批全數完成），補齊 Table Import 遺漏
- 2026-07-02 — Editor Blocks Foundation：Callout 完成（含已知未解問題），建立 jsdom 真實 Editor 排查方法
- 2026-07-02 — Editor Blocks Foundation：Table 完成，package.json 部署排查案例
- 2026-07-02 — Track C：Study Set / Flashcard v0 完成，並完成 NexusApp.tsx 拆檔
- 2026-07-02 — NexusApp.tsx 拆檔：2301 行 → 864 行
- 2026-07-02 — Track A2：Bulk Select 完成，協作模式改為工作區直接維護代碼
- 2026-07-02 — Track E：Workspace Backup / Export package v0 完成
- 2026-07-02 — Track A（Editor Blocks Foundation 第一批）：Link / TaskList / TaskItem 完成
- 2026-07-02 — r15 Deep Review：文件矛盾、架構語意與近期 tracks 修正
- 2026-07-02 — vNext Architecture Discussion：Creatables / Views / Tools / Website 弱聯動定案
- 2026-06-29 — Basic Notes Foundation Step 10.1：Markdown v0.1 link syntax / task list 補強完成
- 2026-06-29 — Basic Notes Foundation Step 10：Markdown import / export v0 完成
- 2026-06-29 — Basic Notes Foundation Step 9：Editor formatting toolbar 完成
- 2026-06-29 — Basic Notes Foundation Step 8：Permanent Delete / Duplicate Page 完成
- 2026-06-29 — Basic Notes Foundation Step 7：Trash / Restore UI 完成與 NexusApp 整檔替換
- 2026-06-29 — MVP-2 Step 5 / Step 6：PDF viewer layout polish 與錯誤狀態完成
- 2026-06-29 — MVP-2 Step 3 / Step 4 / Step 4-C：PDF import flow 與 PDF viewer 最小版完成
- 2026-06-28 — 對話壓縮續接資訊完整編入與 Step 2 狀態修正
- 2026-06-28 — MVP-2 Step 2：Attachment data layer patch 進行中（StorageAdapter / IndexedDBAdapter）
- 2026-06-28 — MVP-2 規格審查、調整定稿與決策補強
- 2026-06-28 — MVP-1 Step 6：Backlinks（雙向連結實作與 MVP-1 完工）
- 2026-06-28 — MVP-1 Step 5：Lightweight Folders（輕量資料夾分組實作與字體放大）
- 2026-06-28 — MVP-1 Step 4：Tags First（標籤組織系統實作與並發修復）
- 2026-06-28 — MVP-1 Step 3：Sidebar Polish（側邊欄精修）
- 2026-06-28 — MVP-0 健康檢查、Code Verify 收斂修復 與 MVP-1 Search v0 實作
- 2026-06-28 — 最終交接文件結構定案
- Module 06 — Project Log Detailed Chronological（詳細時間線工作日誌）
- 2026-06-27 晚間 — MVP-0 完工後更新：JSON 儲存、頁面刪除、文件重整
- 2026-06-27 — Next.js dev server 確認與 MVP-0 第一輪實作
- 2026-06-27 — 本機環境與專案建立（早期摘要）
- 2026-06-20 ~ 2026-06-21 — 規劃階段摘要
- SOURCE 5: `nexus-handoff-updated-2026-06-27/03-PROJECT-LOG.md`
- 2026-06-27
- 2026-06-27 晚間 — MVP-0 完工後更新：content_json 持久化、頁面刪除與交接文件再整理
- 2026-06-27 — Next.js dev server 確認與 MVP-0 第一輪實作
- 2026-06-27 — 文件交接包檢查與重整
- 2026-06-27 — 生成最終交接包 `nexus-handoff-final/`
- 2026-06-27 — 新增本工作進度日誌
- 2026-06-27 — 本機環境與專案建立
- 2026-06-27 — 確認編輯器
- 2026-06-27 — Node.js 初次檢查失敗
- 2026-06-27 — npm PowerShell 執行政策問題
- 2026-06-27 — 確認 Node / npm / Git 版本
- 2026-06-27 — 建立 Projects 資料夾
- 2026-06-27 — 建立 Next.js 專案
- 2026-06-21 以前 / 規劃階段摘要
- 2026-06-20 ~ 2026-06-21 — 產品與架構規劃
- 2026-06-21 — 開工前規格補完
- 2026-06-27 — 修正 final package active docs 內部權威順序衝突
- 從 00 文件移入的詳細行動與結果記錄
- 1A. 2026-06-28 對話壓縮後續接狀態（必讀更新）
- 1U. 2026-07-30 Track H～M：Preferences/i18n、Sidebar UX、Drag Handle、Resizable Layout、Document kind、Note 富文字排版與匯出分級（補記＋深度審核，最新）
- 12. 2026-07-30 本輪深度審核：四份交接文件的整理、完善、問題分析與建議
- 1V. 2026-07-31 Supabase 雲端同步 + UI 改善（最新）
- 1W. 2026-07-31 使用者決策確認（下一個 AI 必讀）
- 2026-08-01 — Phase 1: 任務4+5+1+3 完成（單一+下拉扁平、MD為文檔、A4分頁引擎、雙開）
- 2026-08-01 — 任務1邏輯修正：流動原本不改，檔案下拉在工具列最左
- 2026-08-01 — 任務3釐清：工具列右邊分頁按鈕指左右雙開分頁
- 2026-08-01 — Phase 2: 簡報 Hybrid 獨立
- 2026-08-01 — 簡報直觀化重構（Gamma/Canva風格）
- 2026-08-01 — 5點回饋修正
- 2026-08-01 — 分析 Canva 製作形式
- 2026-08-01 — 王題修正：主題切換文字變灰、分頁新增頁、再分析PPT/Canva/Gamma
- 2026-08-01 — 8點追加需求
- 2026-08-01 — 5點回饋之圖表分區與子頁恢復（嚴禁刪減）
- 2026-08-01 — 代碼分析與優化（不刪功能）
- 2026-08-01 — 最終文檔統整
- 2026-08-01 — 工具列置頂覆蓋、排版同格、真正分頁、夜間適配、表格右鍵、側邊欄回退等全面修復
- 2026-08-01 — 深度審核與最佳化：文件重排、死檔清理、夜間適配持久化、表格平均提示、分頁精確度等
- 2026-08-02 — 01 歷史決策轉移與三檔交接整合
- 2026-08-02 — 00 任務目錄去重與 Task ID 正規化
- 2026-08-23 — 代碼審計 + Bug 修復 15 項 + 簡報功能重大改造 + drag 深度調試
- 2026-08-23（第二輪）— 簡報 UI 改造 + 圖表編輯器 + 創作類別 + 側邊欄分類
- 13. 決策 D-01～D-43
- 14. vNext Architecture & Feature Decisions（2026-07-02 最新產品 / 架構共識）
- 15. 決策 D-70～D-106（vNext Architecture + r15 Deep Review）
- 15.1 決策 D-107～D-108（Track A：Link / TaskList / TaskItem）
- 15.2 決策 D-109～D-110（Track E：Workspace Backup / Export package v0）
- 15.3 決策 D-111（Track A2：Bulk Select）與 D-112（協作模式：工作區直接維護代碼）
- 15.4 決策 D-113（Track C：Study Set kind 欄位）與 D-114（NexusApp.tsx 拆檔）
- 15.5 決策 D-115（Table block）與 D-116（package.json 交付規則）
- 15.6 決策 D-117（Callout isolating 修正）與 D-118（jsdom 真實 Editor 驗證方法）
- 15.7 決策 D-119（updateBlockMath/deleteBlockMath 必須傳 pos）、D-120（Table import 補齊）、D-121（模糊回報需先確認現象）
- 15.8 決策 D-122（transaction 位置計算須用 tr.doc）、D-123（插入空節點 + selectNode 取代 window.prompt）
- 15.9 決策 D-124（Track G：Command Palette）與 D-125（Track G：Dashboard / Home v0 提前落地）
- 15.10 決策 D-126（Import 選單維持獨立於「新增」入口）與 D-128（重新命名採原地輸入框互動）
- 15.11 決策 D-130（PageItemMenu 選單邊界防呆）與 D-131（工具列「插入內容」統整為單一下拉選單）
- 15.12 決策 D-132（Notion 風格 Drag Handle：NodeRange 依賴順序）與 D-133（帳號系統範圍維持既有原則）
- 15.13 決策 D-135（ResizablePanel 抽出為獨立容器）與 D-136（收合觸發點回歸標頭列，取代浮動邊緣按鈕）
- 15.14 決策 D-138（Sidebar 底部留白說明性註解）與 D-139（ResizablePanel 新增 bottomInset prop）
- 15.15 決策 D-140～D-146（Track L/M：Document kind、新建入口收斂、Note 富文字排版分級、匯出範圍分級、帳號設定移入 Sidebar、拖曳把手觸發範圍）
- 15.16 決策 D-147～D-156（Supabase 雲端同步 + UI 改善）
- 15.17 決策 D-157~D-172（本次 5任務+8點+簡報直觀+圖表分區+優化）
- 15.18 決策 D-173~D-185（工具列置頂、排版同格、真正分頁、夜間適配、表格右鍵、空白頁刪除等）
- 15.19 決策 D-186～D-197（2026-08-23 代碼審計 + Bug 修復 + 簡報功能改造 + 創作類別）
- 2026-09-14 帳號、同步與小說收尾日誌
- 2026-09-13 產品與工程更新日誌
- 2026-09-28 — 交接檔整合：09-16～09-25 工作紀錄與舊文件搬移
- 2026-09-16 — 小說獨立章節、角色卡與世界觀、多項介面修正
- 2026-09-19～09-20 — 新增選單、下拉刷新、右鍵操作與講義排版
- 2026-09-21 — 偏好與帳號入口重整
- 2026-09-22 ～ 2026-09-25 — FSRS 每日練習與測驗持久化（程式碼推導；無對話紀錄）
- 附錄 A：舊 00（2026-09-14 版）全文【搬移，未改動】
- 4. 檔案結構（更新至 2026-08-01 最新）
- 9. 最終深度審核（2026-08-01 更換對話串前零遺漏定版）
- 11. 2026-09-13 交接更新
- 12. 2026-09-14 交接更新（優先閱讀）
- 附錄 B：舊 01（2026-09-14 版）被替換段落原文【搬移，未改動】
- 2026-09-28 — 後續對話增量補記：字卡收尾、目錄重構與製譜規劃
- 2026-09-28 — 字源百科本機匯入回報、CEEC 資料整理暫停與公共字典管理需求確認
- 2026-09-28 — Git Windows 保留檔名修復、VS Code 儲存衝突、FSRS 測試與 UI 補充（增量記錄）
- 2026-09-28 — 雙路徑學習模組盤點、清理及指定測試／build 驗證（最新增量）
- 2026-09-28 — 三份交接文件主章節一致性整合（本次增量）
- 2026-09-28 文件治理｜主文件去重與集中決策進度（僅記錄歷史）
- 2026-09-28 來源增量存檔｜原 00 §13～§16（保持原文；非現行指令）
- 13. 2026-09-28 後續對話增量交接【新增；若與前述舊快照衝突，以本節的已確認新決策為準】
- 14. 2026-09-28 最新增量：字典管理系統成為目前優先規劃（新對話先讀）
- 15. 2026-09-28 本輪交接補記：Git 修復、學習測試與儲存提示（最新狀態）
- 16. 2026-09-28 最新補記：學習雙路徑已釐清並完成本機驗證（優先於 §15.2、§15.4 舊待辦）
- 2026-09-28 來源增量存檔｜原 01 §14～§20（保持原文；非現行契約）
- 14. 2026-09-13 現行功能與帳號規格【部分被 §15 修訂，已標註】
- 15. 2026-09-16 ～ 2026-09-25 現行功能與決策【新增】
- 16. 2026-09-28 後續決策補充（現行；取代 §4 F-STUDY 中相衝突的舊描述）
- 17. 2026-09-28 新確認決策：全站共用字典／管理者／字卡底部資訊（最新有效）
- 18. 2026-09-28 本輪規格補充：儲存提示、字源檔名及學習模組一致性
- 19. 2026-09-28 最新有效契約：正式學習模組單一路徑與底部布局 B（取代 §18 待確認項）
- 20. 2026-09-28 產品規格／任務對照與未決邊界（本次整合）
- 2026-09-28 來源快照存檔｜原 00 §4（2026-09-25 檔案樹；非現行目錄）
- 4. 檔案結構（依 2026-09-25 程式碼快照重建）【修改】
- 2026-09-28 後續增量｜公共字典與個人字卡產品模型澄清
- 2026-10-08 — 公共字典 source/license 退休、Draft 清空與正式 Word／Prefix／Root 母檔封裝
- 2026-10-11 — Dictionary identity／pronunciation／Study reliability 收斂與 final canonical master

## 四、文件遷移決策（2026-10-12）
- 合併舊交接資料的現行有效產品規則至 SPEC，技術／安全限制至 ARCHITECTURE；過去取捨、已否決項與重大工作線於本檔追溯；當前狀態至 HANDOFF。
- 三份舊文件的完整原文保留在 `docs/archive/`，不作日常權威、不另維護；細碎修復記錄只保存於原始歷史與 Git commit，避免 HISTORY 重複膨脹。
- 因未直接取得 production Vercel SHA / Supabase ledger，不能從歷史回報宣稱線上已通過。


## 帳號刪除與文件整合決策（日期依歷史來源）
- 登入者僅能透過已驗證 `auth.uid()` 刪除自己的帳號；要求電子郵件、確認字串與交易式回滾，避免前端偽造 owner 或誤刪其他帳號。owner 外鍵、RLS、離線快取及已刪帳號未過期 JWT 防護均須驗證。
- 為保留既有孤兒資料使用 `NOT VALID`，不刪除 `owner=null` 共用舊資料；現有本機 PGlite 測試不等於正式 Supabase RPC 已部署。
- 原 `docs/account-deletion.md` 已在本 PR 分流產品流程至 SPEC、技術規則至 ARCHITECTURE；原文保留 Git 歷史，避免永久多份文件重複維護。
