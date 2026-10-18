# 整筆詞條刪除（2026-10-18）

Migration：`20261018010000_dictionary_entry_deletion.sql`。依賴現行 dictionary revision lifecycle／bulk exchange receipt／official packs。CLI在此環境嘗試建立migration時因唯讀使用者設定目錄失敗；SQL已版本化並以隔離資料庫驗證。

## 資料契約

- 僅新RPC `delete_dictionary_entry(uuid,bigint,jsonb,uuid)` 能處理單一已存在Draft／Published；前後端仍驗證管理員。既有Draft-only RPC不變，沒有開放一般角色直接DELETE。
- RPC在transaction內取得既有全域寫入鎖和Entry row lock，比較revision與完整snapshot。先檢查其他Entry的構詞、其他active Review candidate、舊複製Review、official manifest；有引用即拒絕，不重寫其他詞條、官方manifest或任意刪除引用。
- 私人卡僅刪除`study_card_dictionary_links`參照列；不更新／刪除`study_cards.payload`、state、event、official_source身份或同步進度。舊／離線卡payload可能仍保存原ID，公開讀取回null，詳情明示無可用公開內容且無管理員編輯操作，使用者可重新連結其他合法詞條。不將字典刪除冒充私人卡修改或學習事件。
- 專屬live children按相依順序刪除。保留Published歷史／Review所有列／Audit／既有備份；移除兩個history→live Entry的限制FK，保留非空stable Entry ID、PK、內容、管理員RLS與原grants。該ID在live Entry刪除後仍是歷史身份。active Review標為discarded並保留原candidate及base，避免誤恢復待發布內容。
- `DELETE_ENTRY`稽核是原ID退場標記；trigger防止舊匯入重新插入同ID。既有owner-scoped operation receipt提供相同request／operation重試；掉回覆後仍回原結果，其他request不得重用UUID。未知FK或receipt寫入失敗，連link unlink與Audit也完整回滾。

## 介面

既有主操作區紅色「刪除詞條」，明確名稱／種類／永久性確認；取消無寫入、busy防雙送。只在已儲存詞條顯示，包含Published的Review編輯；刪除用canonical Published身份而非Review revision。成功使字典快取失效，離開dirty保護只在確定成功後略過一次，返回管理頁`?deleted=1`顯示成功並重新查詢。失敗保留輸入，資料狀態不冒稱成功。

移除五項備份／草稿管理UI、差異formatter、專用構詞目標預載及reload handler；保留Review儲存／核准／CAS與必要多份Review選擇，避免默默覆蓋。dirty hook獨立於備份功能，仍可儲存／放棄／繼續。

## 上線／回復

1. 核對正式ledger、FK與RLS，保存原FK定義及相關表指紋；確認history仍只對管理員可讀。
2. 隔離SQL／UI測試通過後，先套用此增量SQL，再發布前端。不需重播舊migration，不執行正式測試詞條刪除。
3. Migration本身不刪／更新資料。核對前後內容指紋、RPC ACL／search_path／advisors及版本，再合併部署。
4. 回復可先撤銷新RPC authenticated執行權並回復前端，不刪歷史、receipt、Audit或退場ID保護。若已有歷史對應的live Entry被刪，不能為恢復FK而刪掉歷史／重新建立Entry；保留FK拆離即可。只有確認沒有孤立歷史ID時才可用新的版本化migration加回原FK。

管理員遇到其他構詞／Review／官方manifest阻擋時，須先透過相應管理流程處理引用；不得以停用FK、直接SQL級聯或批次刪私人卡替代。正式環境不由自動化測試替使用者刪除任何詞條。
