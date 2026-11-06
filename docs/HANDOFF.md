# Nexus — 當前狀態與下一步

本輪追蹤 #161；分支 `feat/compact-morphology-study-startup`，基於最新 main `b78bb11`（#158、#160 已合併）。新 Draft PR 尚待提交後填入；不重做審核／Android 語音，也不實作 main 最新另列的匯入匯出規劃。

## 本輪實作

- 構詞編輯橫向字形／提示／刪除，移除排序、末尾新增；正式連結收合且保留原 relation ID／Sense。編輯區塊依基本資料、概念、義項、詞形、歷史詞源、其餘排列，原 autosave／IME／CAS／發布不變。
- 字卡背面英文略放大、仍小於中文，底線各內縮 1px；中文提示不撐開字形。已發布概念原文放提示右側，可換行，沒有概念不顯示等號。使用者名稱統一「概念」，底層 `core_concept` 不改。
- 共用 DictionaryArticle 分段小方格（一般手機兩欄、320px 單欄）。詞源僅從正式連結目標的 published 共用／適用義項取得；原公開 reader/cache 去重、最多四個並行，保留探索返回與完整 Word 自身詞源。未對應分段的舊正式關聯保留。
- Session 開啟由同一交易讀一次 snapshot，再建立／恢復及 present；後續 readPresentedSession 不再先 readSession 又 present。保留帳號驗證與完整原 syncStudy 屏障，不以未核對進度作答。管理父層停止開啟時與 Session 事件的整組重讀，官方解析只需當前卡；回管理才重新載入。

## 量測與測試

- 隔離 fake-indexeddb 單次基準：20 卡新建 22.32→5.03ms、恢復 4.99→2.02ms；6,300 卡新建 478.38→129.68ms、恢復 414.83→93.06ms。本機四讀流程 8→2 次 cards／states 全讀，50,400→12,600 筆；不含正式網路與實機。
- 真實 Chromium 按鈕／IDB v9／受控 5ms RPC 的完整矩陣正在重跑，會補前後時間、auth、sync、IDB、reconcile 與官方解析數字。涵蓋 20／6300、新建／恢復、離線／重連、待傳作答、遠端變更、無盡與官方卡。並行執行其他測試時的首卡數據波動明顯，不把單次較快本機 repository 數字宣稱為端到端改善。
- 20 個相關回歸檔已全通過：清除／離線事件／同步／排程／Session／字典／舊交換／原審核與官方卡。新增 bounded published target 與單交易回滾／權限／clear／重複開始保護通過。
- Chromium 原編輯器、autosave（含320px／IME／延遲／失敗／新增刪除）、正式學習閱讀回歸通過；新構詞方格／字卡標註 Chromium 與 WebKit 通過。最後修改後的瀏覽器與 WebKit Session 矩陣仍待收尾。
- TypeScript 通過；修改範圍 ESLint 0 errors／3 既有 warnings。Build 與遠端 Actions／Vercel 待最後提交核對，未完成不宣稱通過。CI 增加本輪測試，保留全部既有驗證，因新增雙引擎大型矩陣將 job 上限由20調為30分鐘。

## 資料、發布與限制

沒有 Schema／Migration、正式 DB 查詢或寫入、合併、正式部署、分享連結、權限調整、IndexedDB 清除或 HISTORY 修改。SPEC 只對齊構詞排序的過期敘述並引用 #161；ARCHITECTURE 記錄共用閱讀來源及單交易載入邊界。

既有正式 ledger 狀態沿用上一輪唯讀交接，沒有在本輪重驗：#158 三份登錄 `20261105163818`（official）、`20261105163846`（IPA DROP）、`20261105163922`（Page 舊欄退役）；Word segments 為 `20261105083358`。不可直接 db push 補套所有 pending 檔案；舊 IPA 清空檔已 superseded no-op。整組清除仍用 cleared_at＋原事件有效投影，裝置時鐘風險已接受。

## 尚待驗收

- Android Chrome／安裝 PWA、iPad Safari／PWA 的真實開啟耗時、離線冷啟動／重新連線與雙裝置清除／衝突；受控 RPC 與桌面 WebKit 不能代替原生裝置。
- 在授權 Preview／正式版本測長中文提示、長單字、概念換行、正式連結更換解除、IME與虛擬鍵盤完成。不得建立分享連結或更改部署保護以取得測試存取。
- #156 正式匯入套用與 #159 Android 原生語音依已合併 #160 的原實機步驟驗收，本輪不宣稱再次修復；詞形複合 POS 選單仍僅記錄。

維持 Draft。待完整量測、最後本機檢查與新提交的遠端 CI／Vercel 成功後再評估人工審查；不自行合併或正式部署。
