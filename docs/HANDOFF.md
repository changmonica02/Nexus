# Nexus — 當前交接（2026-10-17）

產品契約以 SPEC 為準，技術見 ARCHITECTURE；歷史紀錄最新置頂，實機驗收集中 Issue #60。

## 本輪：字典緊湊化與核心概念

- 已實作三種類型共用緊湊編輯器、區塊 action slot、AutoTextarea、變體／義項同行操作、讀音自動排序／移動、核心概念先於歷史詞源。
- SQL：20261017010000_dictionary_core_concept.sql；原文／來源受限備份、Entry＋Sense 穩定合併、舊內容及 Review revision 前進、10 組指紋、重跑安全、管理員限定 alias 防止退場 ID 重建。**正式已套用**（ledger 20261017054409）。52 筆核心概念、舊類型 0、遷移後逐列內容差異 0；當下無雙類型同義項，未刪正式列，alias=0。Entry 6,305／Sense 11,525／Review 925／工作 28 保留，12 份 Review 版本前進；10 組指紋及 RLS／安全 advisors 與預期一致。
- 閱讀／AI／CSV／JSON 使用核心概念；舊格式有明確相容邊界，過期版本與退場 ID 不強行套用。舊提示退出一般 UI，沒有作為核心概念來源或清空其資料。
- 字典回歸 124/124、最後聚焦 21/21（重疊且含新增預覽測試）、學習同步 49/49、5/5 隔離瀏覽器組通過；TypeScript／Build 通過，ESLint 0 errors／456 既有 warnings。PR #79，Preview／Checks 通過；前端合併與 Production 以 PR 最終狀態為準。操作／回復見 operations/DICTIONARY-CORE-CONCEPT.md。

## 已核實的既有正式狀態

- PR #78 main 8029e33 已部署，verification 欄位已移除，ledger 20261016150215。
- PR #76 source_forms 退場已套用，ledger 20261016072304；PR #77 補回三種類型 Draft 單筆發布已部署。不要重播 SQL 或重匯既有字典。
- official_private_card_identity（20261016062703）與 creation_template_library（20261016062716）已套用，不可只依 Git 檔名重播。
- 第五輪 PR #69～#75 已合併；正式帳號／真實 iPad Safari 操作驗收仍留 #60，不把 Chromium 尺寸模擬當成人工驗收。

## 下一步／人工驗收

- 正式 SQL 已完成；完成 PR #79 合併及 Vercel Production 確認，實機結果仍由使用者驗收。
- iPad Safari／手機確認基本資訊、單／多義項、變體、長文字、讀音排序及儲存／重開；確認核心概念在詞源前。
- 正式 Review 修改後仍須人工發布，舊分頁重載；常駐工作重比但不重匯已完成內容。
- 學習翻面→字典詳情→管理員完整編輯→返回原卡，私人 Front／Back、Session／評分不變。
