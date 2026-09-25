# FSRS 每日練習：實作與驗證

## 產品決策與演算法

- 固定 ts-fsrs 5.4.2，FSRS-6；request_retention=0.90；learning_steps=['10m']；relearning_steps=['10m']。其餘採該固定版本預設值，包括 enable_fuzz=false、maximum_interval=36500，完整參數存入每筆事件。
- 每日練習僅英→中主動回想。只顯示英文，按「顯示答案」後顯示中文與 Again／Hard／Good／Easy。按鈕間隔直接取 scheduler.repeat，提交使用 scheduler.next；不覆寫 due。
- 新字與 Review 卡 Again 分別進入 Learning／Relearning，約 10 分鐘後到期。Good／Easy 可直接 Review。固定套件對本次測試新卡輸出 Again 10 分、Hard 15 分、Good 2 天、Easy 8 天；UI 不寫死這些值。
- 每個學習集預設每天 20 張新字，可設定 0–10000。裝置當地 00:00 換日。選卡與預載不扣額度；題面掛載後以交易確認首次顯示，交易完成前不能揭露答案或評分。重新進入不重扣同一張卡。
- 到期 Learning／Relearning 優先，再處理到期 Review／舊卡，最後新卡。每次取下一題重新讀取資料；等待時每秒查到期，不提前出題，不中途替換正在回想的題目。
- 自由複習只維持當次本地 UI 隊列，未通過放回隊尾，不寫正式狀態或事件。四選一固定英→中，只用實際中文答案，至少需要 4 個不同答案；分數不永久保存。

## 資料與遷移

IndexedDB nexus 由 v3 升為 v4，新增 study_cards、study_states、study_events、study_settings、study_outbox。正式評分以 strict durability 交易寫入事件、狀態、outbox；交易失敗明確 abort，畫面不前進。事件以 UUID 去重，記錄原題面與答案、內容版本、父事件、狀態前後、排程器版本、完整參數與真實 review log。introduce/reset 是管理事件，不是假造的 review。

- 舊 Page.study_items 原樣保留。獨立卡片另存完整 legacy snapshot，使用學習集＋舊卡 ID 的穩定鍵，遷移可重試。
- 舊 daily_due_at 保留為首次新版正式複習的資格門檻；尚未到期不出題。首次真實四級評分由空白 FSRS 記憶狀態初始化。不把舊 review_count、三段評分或 daily_phase 冒充 FSRS 歷史／記憶參數。
- 舊卡需要在預覽確認左欄英文、右欄中文後啟用每日練習。未填完整的卡保留，但不出題。
- 中文修改保留排程。英文修改提供保留／重設／取消；重設用新 generation 與 reset 事件，歷史仍保留。
- 單卡與整個學習集的複製只複製內容，建立 New 卡。刪除獨立卡採 soft delete，保留歷史。
- 備份 schema v2 包含獨立記錄；metadata 與學習資料取同一快照。匯入 v1 不刪除既存 FSRS history。缺少歷史、重複 ID 或 event ID 內容衝突會停止還原；既存與備份 head 不同時標記衝突。
- 匿名資料首次明確歸戶涵蓋字卡、事件及待同步項目；不同帳號不共用 repository 的擁有者。

## 雲端部署

部署新版客戶端前，於 Supabase 套用 `supabase/migrations/20260922_study_fsrs.sql`。此檔新增四張独立資料表、RLS 與 apply_study_operation RPC，不刪改 pages.study_items。

此工作階段只在隔離的本機 PostgreSQL（PGlite）執行 SQL 測試，沒有修改正式 Supabase 或部署網站。若遠端尚未套用 migration，客戶端會保留本地 outbox 並顯示字卡同步失敗；連線恢復與定時同步會重試。

事件先按前序順序送出，伺服器使用事件 ID 去重與狀態列鎖。一旦雲端確認才移除 outbox；遺失回應時可安全重送。舊裝置的首次遷移寫入是 insert-only，不能蓋掉新版已修改內容／設定。正式學習請使用新版客戶端；舊程式只認識 pages.study_items。

兩台裝置同時離線回答同一卡：保留所有事件與兩邊結果，標記衝突並停止該卡正式排程。介面提供由使用者明確選擇「保留歷史並重新學習」。第一版不自動推測分支的語義合併。自由複習／測驗不受排程衝突影響。

## 測試

- studyFSRS.test.cjs：真正的固定版本 steps、狀態轉換、preview/commit 一致、legacy 保留、到期優先、新字額度與換日。
- studyRepository.test.cjs：v3 升級、歸戶與帳號隔離、預載不扣額度、顯示扣額度、重開、event ID 重試、寫入失敗全交易回滾、舊卡遷移、中文修改與複製、跨裝置分支、備份往返與拒絕不完整備份。
- studySync.test.cjs：實際執行 PostgreSQL migration 兩次，測試已收件但回應遺失、事件去重、跨裝置衝突與明確重設、舊遷移不覆寫內容、RLS 帳號隔離與禁止直接刪除事件。
- studyPractice.test.cjs：自由複習队列及不改原始資料。
- 瀏覽器隔離頁：首次題面只有英文、顯示答案才出現評分與預覽；重整後額度／歷史保留；每日限額用完不提前出題；自由複習與測驗正式事件數保持不變；英文修改確認／取消、複製 New、歷史瀏覽；390px 無水平溢出。

尚未在正式 Supabase、兩台實體裝置或 iOS 實機執行端到端驗證。持久化測試涵蓋已提交的本地交易；使用者清除瀏覽器資料不屬於離線／重整的保存保證。
