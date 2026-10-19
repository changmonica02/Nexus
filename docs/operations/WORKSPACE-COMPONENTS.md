# 工作區元件整理（Refs #85）

## 變更

統一主／次窗格分派、PDF 預覽、原生對話框、選單位置及鍵盤操作、總覽框架與學習存檔提示。筆記成功提示改為實際本機寫入成功，失敗可重試；不同窗格及較新修改各自維持待寫狀態。

移除確認未接入的 creatableRegistry、useSidebarPreference、DailyStudySession 與 studyPractice。保留尚在 SPEC 的 inbox、quiz 歷史相容、deleteDrafts、world 分支及匯入 fallback，避免以「未被目前入口引用」推論資料或需求可刪除。

## 驗證

- Node 全套最終重跑 352／352 通過（0 失敗）；初次兩項舊原始碼定位斷言已修正，避免誤判 native confirm 的參數也已改名。
- TypeScript 與正式 build 通過；修改 production 檔案 ESLint 0 errors／37 warnings（包括選單 layout effect 設定 portal 的提示）。
- Edge 本機隔離測試通過：完整工作區四種寬度；儲存慢寫／失敗重試／較新修改／雙窗格；共用 dialog／menu／PDF 晚到回應；附件同源雙分頁；字典管理編輯發布；角色模板與模板更新；完整學習、偏好、FSRS／固定排程、英文流程。
- 測試使用合成 fixture 與本機 IndexedDB，未下載正式附件。附件前後流量對照見 `ATTACHMENT-SYNC-CACHE.md`。

## 發布與回復

無 SQL migration、RLS、資料清除或權限變更。部署後重載舊分頁；觀察本機儲存錯誤、同步錯誤、outbox 累積及未變更附件完整內容下載次數（應為 0）。真實帳號／跨裝置及 iPad Safari 驗收保留 #60。

如需回復，回退前端版本即可，不刪本機或雲端資料。若一併退回附件修復前版本，重複流量問題會恢復。
