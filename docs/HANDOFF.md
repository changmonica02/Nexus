# Nexus — 當前交接（2026-10-15）

產品契約看最新 SPEC；實際模組、RPC與Migration ledger看 ARCHITECTURE。

## 本輪 #16 安全自動匯入與常駐審核

- 基於 SPEC `823445a`、已同步 main `b90b53c`，分支 `feat/dictionary-persistent-review`。已實作部分安全匯入、常駐來源／差異／版本／決策／結果、跨裝置審核、管理三色／總數／差異數與搜尋篩選分頁、既有Review安全增量更新；不直接修改Published。
- 新增 `supabase/migrations/20261015020759_dictionary_persistent_import_review.sql`：一張管理工作項表、索引／RLS／audit及管理RPC，復用原receipt／草稿／Review／人工發布。**正式未套用，待使用者明確授權。** 正式僅唯讀核對依賴RPC／權限；無正式資料匯入／修改。
- 前端缺capability時維持既有匯入與管理功能。可先合併相容前端；SQL獲授權套用後自動啟用新版，不能把Vercel Ready當作Migration已套用。
- 相關回歸133/133、最後修正核心12/12（重疊）、瀏覽器3/3；TypeScript／Build通過，ESLint 0 errors／467既有warnings，範圍見PR。6,301筆實際隔離測試包含掉回覆／重新載入／續作：最終獨立67.7秒，另一輪與Build／回歸並行約140.5秒，沒有重複新增。

## 舊待審核工作

1. 在原裝置先下載舊Import Session JSON及原檔備份；不要清除瀏覽器資料。
2. SQL正式啟用後，匯入面板提供「先前本機匯入工作」轉移。沿用原 operation／Entry／Review ID與選擇；applied／unchanged／skipped不重做，待回覆操作以原UUID查驗／重試，可能完成先前已確認的寫入。
3. 轉移後由常駐待審核清單逐項重新比對及套用決策；原本機項目封存、可下載，確認完整前不清除。原始結構不足或硬性衝突只留待修檔，不猜測轉換。可匯入下載的原Session JSON恢復核對。
4. 使用者提到的6,301／6,273／28是歷史資訊；本輪未讀取原裝置Session或推定正式剩餘數量。

## 下一步

- 審查PR測試與Migration；正式SQL待授權，不重播歷史檔案。
- 正式驗收項目集中常駐#60：安全部分匯入、跨裝置決策保存／套用、三色統計／搜尋／分頁、舊作業轉移、網路中斷與Published保護。功能開發Issue可依完成證據結案。
- 已合併F-STUDY PR #59不在本輪改動範圍；其網站人工驗收亦依#60管理。
