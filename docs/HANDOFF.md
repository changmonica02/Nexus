# Nexus — 當前狀態與下一步

## #167：學習與字典四階段改版

依 main `350882c` 的2026-11-11 SPEC新決策，優先於舊矛盾敘述。階段A分支 `feat/study-dictionary-ui-stage-a`，獨立Draft PR待建立；不合併、不操作正式Supabase、不執行正式Migration或部署、不修改HISTORY。

### A：已實作、驗證／交付中

- 管理學習組移除清除入口，只保留複習紀錄頂欄原清除流程；批次標籤與四段冗餘提示精簡；模式問號沿原ModalDialog提供完整說明、焦點／Esc及關閉。
- 講稿／輔助RightPanel與寬度容器、手機開關只在筆記及簡報編輯器掛載。既有各kind的assistant_blocks完整保留，其他功能不啟動該側欄保存操作。
- 學習字典首行返回／連貫把手／叉叉，第二行搜尋／放大鏡；管理員鉛筆移到詳細內容右上，沿用驗權／Review草稿及未儲存保護。把手向下拖曳關閉，內文捲動／短距離／水平手勢不關閉；原學習翻面、作答、事件及Session不變。
- 基本資料／概念／義項固定展開，保留其他功能分組與收合，移除冗餘區塊橫線。無資料契約、Schema或Migration變更。SPEC僅補#167追蹤及訂正重複標籤文字，ARCHITECTURE記錄實際掛載與面板契約。
- 本機已通過TypeScript、ESLint（修改範圍0 errors／既有warnings另見log）、Production Build；既有字典編輯器、管理員面板權限／發布／離開保護、字典閱讀、學習設定／排程、四尺寸工作區與離線管理設定。Chromium與WebKit均驗證側欄白名單、舊講稿保留，以及字典面板瀏覽／搜尋／關閉／拖曳／學習資料不變。
- 清除入口回歸使用隔離PGlite實際RPC，涵蓋雙語四尺寸、離線拒絕、回覆遺失重試與冪等，未修改正式DB。字典／學習相關單元測試與遠端CI結果以交付PR最新head／checks／驗證留言核對；未完成項不得列通過。測試畫面在interface-a-evidence artifact。

### B：尚未實作

最新main獨立分支／Draft PR：來源返回與離開結算、新Session設定；先重現到期搶卡再修；owner＋deck＋card隱藏須進全部候選、當前Session、離線outbox／feed、舊裝置與備份，不產生假作答、保留due與事件。沿原StudyRepository，先核對伺服器契約；需要Migration僅隔離驗證，正式套用另授權。

### C：尚未完成根因報告，未實作

先重現並回報：Word無法刪除、Prefix重複及刪除連動、管理與完整匯出待審數量。需區分entry／sense／variant穩定ID、正式依賴、RPC/CAS、未決候選與唯一詞條統計，不能以刪資料或繞過依賴湊結果。先提供三項根因／重現／修正方案，再實作。

### D：尚未完成資料契約／盤點，未實作

構詞統一與九類語意以最新SPEC為準，不用舊Prefix/Root分類覆寫新決策。先唯讀盤點正式資料／可恢復完整備份及ID、筆數基準，再做隔離可重入非破壞性轉換；保持已發布供閱讀／官方連動、只建立待整理草稿，未知歸屬保留原ID原文。C未查明前不做正式合併轉換。正式Migration須另行授權。

## 既有交接與實機待驗收

- PR #166已由使用者合併至main（`339a5f7`）。原bd94928的地圖雙指放大等待曾失敗，2026-11-11原樣重跑Actions42355202515成功，根因未證實，不宣稱純環境問題或已修復競態。Android／iPad手勢、鍵盤、安全區、離線冷開啟、真實跨裝置Page衝突與特殊宗教配置仍待人工驗收。
- 本輪A亦待Android／iPad真實拖曳與內文捲動、鍵盤／輔助技術、真實管理員離開保護驗收；桌面WebKit不等同iPad實機。
- #164的20261106032651_dictionary_exchange_safe_replacement.sql正式套用狀態本輪未查證；不可db push全部pending。歷史正式ledger命名可能不同，任何正式Migration仍須獨立授權。
