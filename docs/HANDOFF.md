# Nexus — 當前交接（2026-10-17）

產品契約看 SPEC，技術看 ARCHITECTURE，歷史最新置頂；真實裝置驗收集中 #60。

## 本輪：字典閱讀／摘要／構詞搜尋與快速建立

- 已實作閱讀中文去重、完整多義項、精簡相關單字入口、變體重按收合；公開／管理列表穩定首義項摘要與空義狀態，管理工作狀態 icon-only／tooltip／ARIA。
- 構詞搜尋完整 Published 候選排名後分頁。快速建立僅 Prefix／Root，管理員明確確認，穩定空白 Sense、既有發布／Review／歷史／Audit、等價唯一性、同操作重試、並行及失敗回滾；不發布主編輯器、不覆寫未儲存內容。Word 規則不放寬。舊 CSV 必填契約保留，最小詞條用完整 JSON／AI。
- SQL `20261017020000_dictionary_ranked_components.sql` **正式已套用**（ledger `20261017073742`），13 表資料指紋無差異；Entry6,305／Sense11,525／active Review925／常駐項目28維持。新RPC anon不可呼叫，無正式新建／匯入／發布測試資料。Advisors新增1項預期 quick definer提示，權限已測試；既有7 INFO／leaked-password警告不變。
- 已通過字典131、聚焦7（PGlite及獨立PostgreSQL，各自7；重疊不累加）、學習／官方集／同步59；6,301候選排名約131–482ms。瀏覽器／TypeScript／Lint／Build／PR與Vercel以最終交付記錄核對。回復／部署順序見 operations/DICTIONARY-RANKED-COMPONENTS.md。
- 下一步：確認本輪PR最終 Checks／Preview 後合併，核對 Production commit；使用者於 #60 驗收真實 iPad Safari 的閱讀、變體、列表及明確快速建立／人工發布。無需重匯原字典或批次發布。舊工作保留原裝置／原檔，不重播已完成內容。

## 既有能力／保留事項

- PR #79 核心概念 SQL 已套用（20261017054409）；舊來源字形／逐筆查證狀態已退場。不要重播已套用 SQL，不恢復舊欄位。
- official_private_card_identity、creation_template_library 已核實正式套用，角色模板／官方集／私人學習維持原契約；本輪不做資料搬移。
- 真實 iPad Safari、正式帳號、跨裝置人工驗收仍由 #60 追蹤。隔離 PostgreSQL不等於Supabase staging；Chromium尺寸不等於真實Safari。
