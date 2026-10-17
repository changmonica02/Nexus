# 字典閱讀／構詞搜尋與最小詞條（2026-10-17）

## 依賴與相容性

Migration：`20261017020000_dictionary_ranked_components.sql`，依賴已套用 core_concept、composition_shared、bulk_exchange／既有 receipts；不要依檔名重播歷史 SQL。Supabase CLI 在此環境寫入唯讀 `/home/agent/.supabase` 失敗，因此建立版本化 SQL 並以隔離 PostgreSQL 驗證。

- 不刪列、不更換 Entry/Sense ID、不修改既有內容、Published/Review/CAS、個人卡或 FSRS。新增 RPC、純正規化 helper、等價名稱唯一索引；沿用現有表格／RLS。
- 名稱 key：大小寫、前後空白／連字號（含常見 Unicode 連字號）正規化；內部連字號仍保留。索引按 Prefix／Root 類型分開；既有等價衝突使整個 transaction 失敗，不猜測合併。
- 最小 Sense 定義：中文義空白、詞性 null，僅 Prefix／Root；原 parent-kind trigger 禁止 Word null POS，CHECK 仍禁止 Word 空義。未增加隱藏的查證／待補完狀態。編輯補充內容仍走 Review→人工核准。
- JSON Bundle／完整 Exchange／AI 保留真實空白 Sense 及穩定 ID。舊 CSV 仍遵守其必填中文義／分類契約；最小詞條使用完整 JSON 交換，不能用不完整 CSV 冒充無損格式。

## RPC 與權限

`search_dictionary_relation_targets(text,integer)`：管理員限定，完整 Published 候選排序後才 LIMIT 20；名稱完全／前綴、變體完全／前綴、名稱包含、中文義／詞源／核心／例句／讀音／詞形／分類內容。相同級以長度、類型、字母、UUID 固定排序。不從過期 Review／退場提示取候選。6k 規模不採多語 tokenizer，保留現有 child entry_id 索引；不以客戶端 LIMIT 後重排。

`dictionary_admin_first_senses(uuid[])`：security invoker、管理員檢查、最多100個 Entry，以 lateral LIMIT 1 取得 UUID 升序首義項，避免 Data API row cap。新前端對尚未有 RPC 的舊資料庫可退回有界逐 Entry 讀取；一般瀏覽／單筆編輯不依賴新 RPC。

`quick_create_dictionary_component(uuid,text,text,boolean)`：管理員、明確人工確認、僅 Prefix／Root；鎖定 operation 及名稱，資料庫唯一索引同時保護一般編輯器。相同 Published 重用（多 Sense 仍由使用者選擇）；既有 Draft 明確阻擋，不擅自發布。新建→穩定空白 Sense→既有 publish RPC→歷史→既有 operation receipt，全部同 transaction；任何失敗完整回滾。相同 owner/operation 重試必須相同 request，回傳目前 Published 內容，不能以舊 receipt 誤報成功。

前端新建確認只發布新成分，不儲存或發布主詞條。取消不寫入，網路錯誤可同 operation 重試；已存在／自身／重複 Sense 不能被誤加。新增成功但無法選入時明示已建立／未加入，不宣稱整體成功。新 RPC 未部署則 RPC 明確報錯、保留輸入，不建立無效關聯。

## 發布順序與檢查

1. 讀取正式 ledger、constraint／RPC、正規化名稱衝突及資料指紋；儲存舊搜尋函式定義與 CHECK。
2. 隔離 PostgreSQL 測試排名／6,301筆／RLS／雙交易並行／冪等／最小詞條往返、Review補充及失敗回滾；非正式 Supabase staging／真實 iPad 驗收。
3. 透過 Supabase migration 工具套用 SQL（lock timeout 5s；statement timeout 90s），核對 ledger、權限／advisors、既有13表指紋未變，再合併前端。不得以 execute_sql 直接 DDL 繞過 migration。
4. 確認 Vercel Preview 與 main Production 的對應 commit。正式不替使用者新建或發布測試詞條；實機建立／發布由 #60 驗收。

## 回復

純前端可回復上一版。DB 變更無原資料改寫；可先停用新快速建立 UI、撤銷新 quick RPC 的 authenticated 執行權限，保留所有新建詞條、Sense、receipt、歷史。搜尋函式可還原部署前定義，新增 summary RPC 可保留給舊前端使用。

只有確認沒有空白義項時，才能還原原 `CHECK(length(btrim(gloss_zh_tw))>0)`；否則保留相容 CHECK，或由管理員逐筆補內容後再恢復。不得為回復而刪除合法最小詞條或填入捏造中文義。新唯一索引／helper 如需移除，先確認函式依賴；保留既有 kind+headword 唯一索引。回復也須版本化 migration，不修改已套用檔。

## 正式套用紀錄

2026-10-17 透過 migration 工具成功套用，ledger `20261017073742 dictionary_ranked_components`。部署前後13張表內容及筆數指紋完全相同；未建立／發布正式測試詞條。Entry6,305／Sense11,525／active Review925／常駐項目28保留。RPC ACL、CHECK、唯一索引已核對；advisors 7 INFO及既有密碼保護提示不變，authenticated definer43→44，新增quick RPC為必要且有管理員／確認防護的預期公開接口。前端 PR #80；真實帳號／iPad Safari 仍待 #60。
