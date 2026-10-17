# Nexus — 當前交接（2026-10-17）

產品契約以 SPEC 為準，技術見 ARCHITECTURE；歷史紀錄最新置頂，實機驗收集中 Issue #60。

## 本輪：字典緊湊化與核心概念

- 已實作三種類型共用緊湊編輯器、區塊 action slot、AutoTextarea、變體／義項同行操作、讀音自動排序／移動、核心概念先於歷史詞源。
- SQL：20261017010000_dictionary_core_concept.sql；原文／來源受限備份、Entry＋Sense 穩定合併、舊內容及 Review revision 前進、10 組指紋、重跑安全、管理員限定 alias 防止退場 ID 重建。**尚未正式套用**。
- 閱讀／AI／CSV／JSON 使用核心概念；舊格式有明確相容邊界，過期版本與退場 ID 不強行套用。舊提示退出一般 UI，沒有作為核心概念來源或清空其資料。
- 字典回歸 124/124、最後聚焦 21/21（重疊且含新增預覽測試）、學習同步 49/49、5/5 隔離瀏覽器組通過；TypeScript／Build 通過，ESLint 0 errors／456 既有 warnings。PR／正式部署結果交付時補齊。操作／回復見 operations/DICTIONARY-CORE-CONCEPT.md。

## 已核實的既有正式狀態

- PR #78 main 8029e33 已部署，verification 欄位已移除，ledger 20261016150215。
- PR #76 source_forms 退場已套用，ledger 20261016072304；PR #77 補回三種類型 Draft 單筆發布已部署。不要重播 SQL 或重匯既有字典。
- official_private_card_identity（20261016062703）與 creation_template_library（20261016062716）已套用，不可只依 Git 檔名重播。
- 第五輪 PR #69～#75 已合併；正式帳號／真實 iPad Safari 操作驗收仍留 #60，不把 Chromium 尺寸模擬當成人工驗收。

## 下一步／人工驗收

- 完成本輪 Checks／Preview、安全 SQL 套用與資料驗證、合併／確認 Vercel，再更新正式狀態。
- iPad Safari／手機確認基本資訊、單／多義項、變體、長文字、讀音排序及儲存／重開；確認核心概念在詞源前。
- 正式 Review 修改後仍須人工發布，舊分頁重載；常駐工作重比但不重匯已完成內容。
- 學習翻面→字典詳情→管理員完整編輯→返回原卡，私人 Front／Back、Session／評分不變。
