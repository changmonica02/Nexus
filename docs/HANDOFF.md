# Nexus — 當前狀態與下一步

產品見 SPEC，資料契約見 ARCHITECTURE。最新基線 `4fbf0fa`（PR #158 已合併），本輪分支 `fix/review-approval-android-speech`，[Draft PR #160](https://github.com/changmonica02/Nexus/pull/160) 追蹤 #156／#159；不合併、不正式部署、不寫正式 DB、不修改 HISTORY，不建立分享連結或調整部署權限。

## #156 匯入審核「套用」

使用者本輪確認失敗入口為獨立審核頁，操作「以匯入版本 → 套用」。正式唯讀捕捉 2026-11-05 17:04:24 UTC 的新結果：`apply_dictionary_import_reviews` 回傳 `stale / Preview changed; recompare before applying`。HTTP 200 包含逐項失敗，不能以 HTTP 狀態認定成功。

該項目已存預覽與正式 Entry revision 相同，原始快照不等；差異欄位為舊快照缺少 word_segments、新欄位為 null，經既有 dictionary_normalize_snapshot 後完全相同，舊 exchange hash 也能由已存 snapshot／Reviews 重建。匯入仍嚴格比較原始完整 context／exchange version，前端直接沿用舊預覽套用，故編輯器的正規化相容修正沒有解除此流程的阻擋。這是已定位／隔離重現的故障路徑，不代表所有可能的審核故障均已排除。

- 修正：手動套用前沿用既有 inspect／classify／save_dictionary_import_review 重新比對，再以新完整 context／指紋送原 apply RPC。只有純結構相容且原決策仍有效時續行；實際內容、revision／Review／target 或決策改變則停下要求確認，不自動套用、不直接發布。
- 新的前端相容比較只決定是否要再次確認，不是版本或內容驗證權威。原 RPC 的管理員、身份、CAS、真正衝突、人工發布及交易驗證完全不改；舊字卡／字典 ID、構詞與 IPA 原資料保留。
- 兩條流程分開：編輯器用 approve_dictionary_review；獨立頁用 apply_dictionary_import_reviews。錯誤物件／元件 ref 保留 message/code/details/hint，普通畫面只顯示本地化分類，不輸出完整 SQL／私密資料。同步防重送與 30 秒請求期限（逾時不表示伺服器回滾，晚到成功仍可查核）；成功但刷新失敗只重讀，未知結果先查伺服器，不將 Review 消失直接當成功。匯入沿用既有 RLS 讀取與 receipt，不新增伺服器狀態。
- 不需新增 Migration。本輪只唯讀核對正式資料，沒有重新套用 #158 Migration 或修改正式審核資料。

## #159 Android 英文語音

使用者實機證據：同一 Android 的 Chrome／安裝 PWA 不播、系統 Google TTS 英文正常，iPad PWA 正常。已確認舊程式在未取得可選英文 voice 時直接退出，且把清單未就緒當成缺少語音；裝置實際 getVoices 清單尚未取得，不能宣稱這是所有 Android 故障的唯一原因。

- 沿用原 Web Speech，不新增服務／音訊檔，不依賴 IPA。啟動 priming、voiceschanged＋有限輪詢、手動重讀清單，英文本機 voice 優先；不因 localService／onLine 旗標單獨否定英文能力。
- 自動空清單最多等待 1800ms 再只指定 en-US、不指定 voice；手動空清單保留 gesture 立即嘗試同一備援。已知只有非英文清單時不強選中文，提示重查。事件／有限逾時區分未就緒、限制與失敗；只有 language-unavailable 才提示安裝／啟用英文。
- 全域單一音訊 ownership、取消與舊回呼隔離；切卡／背景／卸載停止，翻面不重複，自動與手動／語速及正常／無盡共用元件。不讀寫卡片、Session、事件、due、FSRS 或 outbox。

## 本輪驗證

- 新單元：結構化錯誤、安全顯示、防重送、未知結果只讀確認、聲音立即／延遲清單／無事件輪詢／空清單備援、中文拒選、事件／逾時／取消。
- 新隔離 SQL：重現舊 word_segments／IPA 預覽 stale，修正後只保存 Review、保留既有 IPA／ID；真正並行 Review 改動要求確認。原伺服器 CAS、RLS、內容與發布驗證未停用。
- 本機 Chromium 編輯器（含核准成功但刷新失敗／未知結果）、實際 SQL 匯入頁、正式學習閱讀生命週期通過。Chromium Android viewport 與 WebKit iPad viewport 的模擬 Web Speech 測試通過；不等於原生裝置已驗收。
- TypeScript、Build 通過，修改範圍 ESLint 0 errors／2 既有 warnings。本機最後 9 個相關回歸檔全通過（包含 Study clear／sync／reading、舊資料／三份 Migration 與 persistent import）；新核准 6、匯入 SQL 3、語音 7 案例分別驗證。本輪 GitHub Actions／Vercel 以 PR #160 checks／交付註記為準，不沿用 #158 綠燈。

## 正式狀態與限制

唯讀核對：#158 三份 Migration 已由正式 ledger 登錄為 `20261105163818`（official linkage）、`20261105163846`（IPA drop）、`20261105163922`（Page 舊欄退役）；GitHub 檔名版本仍為 091439／091518／091519。IPA 實體舊欄已不存在。本輪沒有執行這些 Migration。禁止直接 db push 補套所有 pending 檔案；舊清空 IPA 檔仍 superseded no-op。

#151／#152／#153／#155／#158 已合併，不重做。整組清除仍依伺服器 cleared_at 與原事件有效投影；裝置時間誤差風險已接受，IndexedDB v9／備份 v4／來源與同步隔離保留。詞形複合 POS 選單問題仍僅記錄，不在本輪修改。

## 待實機／正式驗收步驟

1. 在另行授權的測試版本登入管理員，獨立審核頁選一筆舊預覽，選「以匯入版本」再套用；確認純結構差異可保存 Review、公開答案不會提前變更。若內容真的改變，應停下要求比對；切換帳號／非管理員不得核准。
2. 測試核准斷線／逾時、成功但重讀失敗：輸入與選取保留；再次操作先查結果，不增加第二次套用／核准。未知／真實版本衝突不得強制覆蓋。
3. Android Chrome 與既有安裝 PWA 各測試英文卡自動／手動、0.9／1.2 語速、快速切卡、翻面、背景與離開；確認實際發音是英文、沒有重疊。重新開啟取得新版本，不清 IndexedDB。
4. 同一 Android 測試連線及已安裝離線英文語音的離線播放；若失敗，記錄畫面分類、是否手動啟動、語音清單是否延遲、實際 error code。不要傳私人字卡文字或憑證。
5. iPad Safari／PWA 在正常與無盡模式重測相同行為。僅播放／重播不得增加事件、額度或改排程。WebKit／Chromium 模擬不代表已完成這些實機驗收。

本輪修正需前端正式發布後才能驗收正式 #156 與 Android 原生語音；尚未自行部署。維持 Draft，等人工審查與實機結果再決定合併。
