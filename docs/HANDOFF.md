# Nexus — 當前狀態與下一步

產品見 [SPEC](SPEC.md)，技術契約見 [ARCHITECTURE](ARCHITECTURE.md)。本輪不修改 HISTORY、不合併、不部署，也不寫入正式資料庫。

## 字典三項功能（Issue #154／Draft PR #155）

從最新 main `9f5cbaee` 建立 `feat/dictionary-composition-autosave-navigation`，同一個新 PR 交付：

- Word 有序構詞格／自動串字／逐段中文提示／可選正式關聯；保留 Word/Sense ID、詞形、多義項、既有關聯、私人與官方卡連結、審核及完整 JSON／AI JSON。舊 Word 讀取時安全顯示原拼寫單格，不自動回填或建立字根；有效保存才寫入。
- 單行 Enter／Done、失焦、選單與結構變更保存整份有效草稿；IME／無效內容保留，textarea Enter 換行。佇列序列化、快照基線及原 CAS 保護延遲回覆，保留手動重試。自動保存不發布、不關閉嵌入編輯器；發布仍人工核准。
- 編輯頁上一筆／下一筆沿用管理清單搜尋、篩選與頁碼，跨頁；缺少上下文使用同類型 headword/id 穩定排序。切換前等待有效保存，無效／失敗／衝突停留原表單。嵌入學習面板不導向獨立相鄰頁。
- 字卡背面從已發布資料讀取字形／提示，英文自然連續，獨立底線及依英文寬度換行的提示，不均分欄寬；正式連結在查看字典探索。學習事件、排程、due、Session、清除屏障、IndexedDB v9、備份 v4 與同步協定沒有修改。

### Migration 與資料相容性

`20261105065440_dictionary_word_segments.sql` **只在隔離 PGlite PostgreSQL 驗證，未套用正式**。新增 nullable JSONB 及 CHECK／延遲正式關聯約束，擴充既有 bundle／草稿 RPC／published reader，沒有回填或資料清理。沿用既有 `replace_editor_children` 的交易／版本保護處理明確提供的子資料刪除；舊客戶端省略的陣列保留，外部引用依既有 FK 阻擋。

舊 JSON 省略分段仍可匯入並保留已存分段；舊客戶端只更名已有分段的 Word 會被拼寫一致性約束拒絕，不會悄悄破壞資料。Migration 偵測既有 RPC 原始碼漂移就整筆回滾。正式啟用需另獲授權、核對正式 schema／備份，先套用這一份 Migration 並驗證權限，再合併／發布相容前端；不要順帶套用 IPA 清理，也不要 drop 新欄位或清庫回退。main 可能自動觸發 Production，現階段不直接合併。

### 驗證

- TypeScript `npx tsc --noEmit`、Webpack production Build 通過；修改範圍 ESLint 為 0 errors／2 warnings（既有 effect 同步 setState，未停用規則）。全字典目錄擴大檢查為 0 errors／19 warnings。
- 33 個字典非瀏覽器測試檔全部通過：整批 32 個通過，舊 IPA 顯示測試依已合併 #153 更新後單獨重跑 5 項通過；更新後的編輯器 UI 20 項、新構詞／佇列／導覽／隔離 SQL 5 項也單獨重跑通過。大型交換、持久匯入、RLS／ID／衝突／舊資料回歸包含於這些測試。
- 19 個學習／同步／資料回歸檔整批通過（不包含瀏覽器）：含 studyClear 的 6,301 卡、雙裝置、離線事件、有效投影、舊備份、失敗恢復；另含 scheduledStudy、unifiedStudySync、officialStudyPacks、workspaceSync、lifeLists、pwaDictionaryCache。
- Chromium 瀏覽器測試通過：`dictionaryAutosave`（新增）、`dictionaryEditor`、`dictionaryDraftPublish`、`dictionaryEntryDeletion`、`dictionaryExchange`、`dictionaryPersistent`、`dictionaryRefresh`、`studyDictionaryEditor`、`studyDictionaryPanel`、`studyReading`、`studyClear` 及 `pwa.browser`。涵蓋 1280／820／390／320px（各測試尺寸不同）、中英文、IME、不完整輸入保留、延遲回覆／重試、草稿不發布、詞形／既有關聯／嵌入編輯、英文段寬不被中文提示撐開、真實隔離 SQL／IndexedDB 與離線殼層。
- 新 Migration 另驗：預覽不落地、正式關聯缺失／跨組限制、CHECK、ACL／RLS、舊客戶端省略保留、AI／完整 JSON 往返及 RPC 原始碼漂移整筆回滾。沒有套用正式 Migration，也沒有刪除正式審核資料。
- 未執行：真實 Safari／Android 安裝 PWA、正式登入後審核操作、真實帳號跨裝置新功能驗收及世界觀／地圖全套 UI；不宣稱這些通過。

## 已合併工作與正式狀態

- PR #151、#152、#153 已合併，以使用者最新交接及 main 為準，不重新實作。#151 squash `9f5cbaee` 的 GitHub Production deployment `7566581489` 狀態為 success（2026-11-05 06:06:57 UTC）。這是部署狀態，不能代替真實帳號／裝置功能驗收。
- 整組清除沿用最後伺服器時間與原事件有效投影，不使用整組重置世代。使用者已接受裝置時間誤差。使用者確認 study clear Migration 已正式套用；本輪唯讀 migration 紀錄也可見名稱 `study_deck_clear_20261105032115`，實際登錄版本 `20261105060444`。本輪沒有重新套用。
- `20261105033000_dictionary_ipa_only.sql` 本輪唯讀核對仍不在正式 migration 紀錄。涉及既有資料清理，**未代為套用**；新構詞 Migration 不依賴這項清理，也不清除既有 locale/note。
- `/dictionary/admin/reviews` 的正式版本網址轉向 Vercel 保護登入。Vercel 連線的 team scope 回傳 403；受保護頁面讀取工具又因可能建立臨時分享連結遭自動審查拒絕，沒有繞過或改動存取設定。因此正式登入後審核操作及資料顯示未驗證，未修改審核資料。
- 詞形選單僅檢查／回報：`inflections.ts` 可辨識獨立 n./v./adj./adv.，但 `adj./n.` 等複合標記無法依各詞性提供完整合法類型；正式資料確有這類標記。本輪沒有修改選單或詞性驗證，需另行授權修正。

## 待驗收／合併前條件

- 審查新 SQL／資料相容與發布順序，另行授權正式 Migration 與合併；新功能尚未正式啟用。
- Safari／iPad、Android 安裝 PWA、虛擬鍵盤完成／中英文輸入法及真實跨裝置同步／清除仍待實機驗收。Chromium 觸控 viewport 不等於實機 Safari／Android。
- 受保護 Production 審核頁需有已授權的存取方式後再驗證；若工具會建立臨時分享連結，須另獲明確授權，不調低部署保護。
- 世界觀／地圖／內建範本全站語系與既有地圖原生工具的實機待辦沿用 #60，未因本輪字典測試而宣稱完成。已儲存的使用者內容不自動翻譯。
