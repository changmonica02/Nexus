# Nexus — 當前狀態與下一步

本輪追蹤 #163；分支 `feat/dictionary-exchange-safe-replacement`，基於最新 main `6dd9e1b`（#158、#160、#162 已合併）。Draft PR [#164](https://github.com/changmonica02/Nexus/pull/164)，程式提交 `05ce24c`、`987e510`；最後交接提交見 PR head；不改上述歷史提交、HISTORY、正式 DB、部署或存取保護。

## 本輪實作

- 完整交換匯出採獨立類型核取方塊與全部／真正待審核範圍；preview 筆數與固定版本、100筆分頁、暫停恢復及同一完成工作的重新下載。完整保留 canonical snapshot、editor Review 與常駐候選／來源／ID／版本；未建立正式詞條的候選也可匯出，以 null snapshot 明確區別。
- 第一層格式說明預設收合，檔案／貼上內容保留且高度受限；分析不寫伺服器。第二層獨立 dialog、分類說明、詞條計數、三類預設收合、25筆分頁、完整差異、單筆／批次操作、排除、重查、原審核入口與工作恢復。原 AI JSON 人工 Diff 相容保留，不自動清理缺少完整來源證明的資料。
- 沿用 classifyPersistent／partialImportPlan、stage／apply、原 Review 與 receipt。移除完整 JSON 曾把修改自動視為可接受的選項；獨立新增可草稿寫入，修改／混合爭議仍進原審核，正式 Published 不變。安全寫入與確切舊 issue 結案在同一交易，來源列保留供追溯。未變更不清理、不按拼寫配對，不建立另一套匯入資料庫或 AI 審核。
- Google OAuth 加入 `prompt=select_account`，不改登出、redirect 或 owner／離線資料邊界。

## Migration 與正式條件

新增 `20261106032651_dictionary_exchange_safe_replacement.sql`：新增 capability、七參數匯出 overload、安全 apply wrapper 與內部 helpers；inspect 僅附加來源 fingerprint 摘要。沒有新表、刪欄、內容回填或自動發布；人工核准 #156 架構與既有事件／排程／同步不改。依賴 Word segments、#158 退役與常駐審核 RPC；正式 ledger 名稱可能不同，不能直接 db push 全部 pending 檔。

正式 DB 本輪完全未查詢或修改，Migration **未套用正式**。上一輪 ledger 交接僅供參考：Word segments `20261105083358`，#158 `20261105163818`／`20261105163846`／`20261105163922`；需獨立授權後再核對實際 schema、備份及 ledger，只套指定 Migration，先 DB 後前端。capability 未就緒時新流程禁止執行匯出／安全寫入，保留分析、輸入與原工作。不因回退 UI 恢復已結案來源或撤除收據。

## 測試與目前狀態

- 新隔離 PostgreSQL／PGlite 測試涵蓋候選完整交換、真正 pending／空狀態、分類、獨立新增與混合差異、ID／版本衝突、Published 隔離、精確 issue 清理、無寫入不清理、強制清理失敗全回滾、相同 operation 重試、RLS／非管理員及其他詞條保護；1,001筆、11頁、暫停恢復與完成工作重新下載。原生 PostgreSQL 17（無網路、無主機資料掛載）及 PGlite 六項已通過，包含 Migration DDL 失敗回滾與最小權限；提交版亦已在原生 PostgreSQL 重跑六項通過。另補同一待審核提案的來源／義項重排去重，保留原 proposal key，避免反覆交換產生重複審核；安全取代操作仍保留獨立 proof。
- Chromium 新匯出／分析／原常駐審核 UI 與 OAuth 實際 SDK URL 測試已通過，包含桌面、平板、320px／390px、分析不寫入、來源文字保留與安全結案；原完整交換的 checkpoint／quota／receipt／版本回歸通過。WebKit 新流程亦通過；1,001筆分析 Chromium 約2916–7057ms、WebKit 約7085–8731ms（最後一輪與 Build／原生 PostgreSQL 並行，故保留範圍），收合詳細列0筆、展開每頁25筆；受控本機 API，非正式服務保證。
- 原6,300筆完整交換測試通過（本機 PGlite 約223秒，包含匯出、預覽、收據恢復、發布與報告）；不宣稱正式服務耗時。新增11頁測試不取代原大型回歸。
- TypeScript、修改範圍 ESLint（0 errors／2既有 warnings）與 Webpack Build 通過；原審核、匯入決策、常駐、完整交換 quota／receipt、官方連動、舊資料、Session、清除及同步回歸通過。程式提交 `987e510` 的 Vercel 成功；完整 GitHub Actions 正在驗證，後續交接提交亦須通過。最終結果以 [#164 最新 checks](https://github.com/changmonica02/Nexus/pull/164/checks) 及同 PR 的「最終驗證」交付註記為準，註記須列實際 head／run；被新提交取消的 run 不列通過。沒有略過或弱化既有資料驗證。

## 尚待驗收與阻擋

- 必須確認最後完整回歸與遠端 CI／Vercel；維持 Draft，不合併、不正式部署。若任一資料交易／相容性檢查失敗，仍為合併阻擋。
- 正式 Migration 需另行人工授權及 schema／ledger 預檢，本輪隔離 fixture 不是正式 schema 漂移的證明；未執行正式資料安全取代驗收。
- Android Chrome／安裝 PWA、iPad Safari／PWA 與桌面真實 Google 多帳號選擇、登出再登入、未同步資料與 owner 隔離；測試只驗 SDK authorize URL，不能替 Google 頁面保證。
- 使用真實待審核完整 JSON 做外部整理，保留來源 proof／固定 ID／版本，再於授權環境驗收。遺失或過期 proof 不猜補、不清理，需重新匯出分析。多來源未自動選候選；只有合法且對應明確的 issue 可以結案，其餘保留。
- #162 原有 Android／iPad 開啟耗時、離線冷啟動、跨裝置清除／衝突及構詞虛擬鍵盤驗收仍保留；#160 原生語音與 #156 正式匯入套用不在本輪重新設計。詞形選單問題仍僅記錄。
