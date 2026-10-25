# 筆記編輯器審計與漸進路線圖

2026-10-24；Refs #105。產品／程式基準 main `23450f92ec7a12e46c48d18582b630a4bc4a158d`。這是程式盤點與驗證計畫，不表示正式帳號／裝置或全部功能已驗收。第一批驗證結果見 HANDOFF 與 PR。

## 2026-10-25 第二批：真實 A/B/C 比較與表格延續（Refs #107；PR #108）

第一批 #106 已合併 `2bb1a01`；本批從該 main 另開分支。標準 corpus 與實際研究入口為 `tests/fixtures/notePaginationCases.cjs`／`tests/notePagination.study.test.cjs`。Paged.js 固定官方 v0.4.3 package（MIT），只在 CI cache prefix 安裝，不加入正式依賴；license 與比較 JSON、12 組 PDF／print 截圖留存。不是未經實測的推薦。

### 檢查範圍與判讀

- 四類共用輸入：125 列長表、跨列／跨欄及高儲存格的複雜表、跨三頁以上的 38:62 局部雙欄（70 左段／15 右段）、中英長文／KaTeX／圖片／超寬 code／fold／nested／legacy break。另有真實 EditorPane 的 110 列 Tiptap JSON／StableBlockId／未知 metadata 保存與重開，以及圖片無尺寸、caption、Tiptap tbody 頭列與巢狀 break 專項。
- 字型共用 sans-serif/CJK，研究 CSS 12px/1.4；C 保留 Nexus 紙張／header/footer 與內容盒（預留 10mm），A/B 使用原生 @page margin boxes。因此頁數與耗時是此 fixture 設定下的實測，不可當一般引擎排名。
- PDF 以 pdftotext 驗證唯一 ASCII body markers 的缺少／重複，DOM 驗證 row IDs、rowspan／colspan、KaTeX／圖片及 source immutability；頁數與 preview count／頁首尾分開記錄。markers 不驗證所有中文字、公式 glyph、圖片畫素或完整閱讀語意；截圖／PDF 必須搭配檢視。
- baseline CI 40162658785：原生 CSS table 5 頁／5 headers；Paged.js 預覽和 PDF 都 5 頁但只 1 header；舊 Nexus C 是 1 preview／5 PDF 頁。12 case 的標記未遺失／重複，不代表複雜視覺排版已正確。紅測試確認舊 C 缺少真實表格預覽延續。

### 九項方案比較（有實測的部分與限制分列）

| 面向 | A 原生 CSS | B 隔離 Paged.js 0.4.3 | C 唯讀 DOM＋原生 print |
| --- | --- | --- | --- |
| 表格跨頁 | 實測 thead 可重複，screen 無實體頁；需瀏覽器 fragmentation | 有實體頁；本 prototype headers 不逐頁重複，需額外 handler／測試 | 本批新增安全列群組／重複頭列，超高 rowspan／未知結構保留警告 |
| 雙欄跨頁 | Grid 有實際多頁輸出；順序仍需產品定案 | 可生成多頁，但不能據此宣稱混合欄完整語意 | 保留 ratio／DOM；長欄 1 preview 對多 PDF 頁時明示，不攤平 |
| 內容完整性 | corpus markers 可抽取；並非 glyph／像素保證 | corpus markers 可抽取；需再查 span／視覺續接 | 對 C assertions：markers、row ID 唯一、span signatures、來源不變；無法安全切分不丟棄 |
| preview/PDF | 無獨立分頁 preview，直接 print 真實排版 | 實體 preview count 可比 PDF，但 headers／內容仍需驗證 | 安全長表格要求 preview=PDF；特殊高列／長欄仍可能不同，警告 |
| LaTeX | 共用 KaTeX/fonts，過寬仍需處理 | 同 source KaTeX，SVG/MathML 需配合個別檢查 | 正式 NodeView 已確認 preview，無編輯卡；字型就緒與過寬警告沿用 |
| 效能／記憶體 | 記錄 render latency／heap sample，無自製頁面 DOM | 額外解析／頁面 DOM 與 library bytes，測量非 peak | O(rows) 群組＋有限頁面測量；空 skeleton 避免 N×頁數完整表 clone，仍不是大文件 peak 壓測 |
| 複雜度 | 最低，但無預覽頁與 browser 差異 | 高，CSS parser/chunker hooks 加維護成本 | 限定 table subset；不自製完整行分割或瀏覽器 engine |
| 依賴／授權 | 瀏覽器已有，零 package | MIT；0.4.3 官方 tag，測試 prefix only；未選 beta 或商業服務 | 正式 runtime 新依賴 0，沿用 DOM APIs |
| 資料相容 | 純輸出，不寫 JSON | 僅研究 DOM，不接儲存 | JSON／ID／欄比／fold／附件／metadata／CAS 全不改；舊 root break 只映射輸出邊界 |

### 已選範圍及未完成

採 C 安全表格＋A print 的最小組合。表頭重複是可識別的 readonly continuation，不重複正文列；caption 只一次。rowspan 的連通群組不拆，tfoot／多 tbody／nested table／nested pageBreak／特殊 wrapper 都保留警告。原文、欄比與來源順序不改。長欄最終閱讀順序、超高 cell 中途拆分、任意段落行切分／寡行、所有 PDF glyph、跨 browser、真實大文件 peak／GC 尚未解決。本批不採用 Paged.js runtime；研究原型的 headers／複雜內容需額外 work，不是授權或付費阻擋。

實際修正後數值與最終 CI 待補。不得把「PDF 文字 markers 正常」升級成完整視覺驗收。


## 架構與產品核對

- Note 在 EditorPane 使用單一 TiptapEditor 連續編輯（目前 `isPaged=false`，不把保留的 PaginatedEditorView 分支誤認仍在日常使用），保留舊 `format=paged`／pageBreak 與未知根 metadata；Document、其他模組不屬本批。main 已有 #87 的自由筆記實作，HANDOFF 原「本機未推送」是歷史進度，不可再當目前缺失。
- Tiptap 3.27.1／ProseMirror JSON 是正式內容。StableBlockId 透過 appendTransaction 修補缺失及重複 ID；局部 multiColumn、column、foldBlock、inlineMath／blockMath 均沿用既有 schema。多欄比例、把手／Shift 多選／斜線、側欄與單篇全寬已有程式與 browser fixture，這次不重做。
- onUpdate 傳 JSON／文字／block 游標錨點；prop 同步以 schema 正規化 JSON 比較後才 setContent，並避開 composing。既有 pending edit 保護已修過同步快照覆蓋游標；目前未重現新 P0，不停用空白／正常快捷格式。setContent 的舊字串錨點與全文序列化仍值得後續量測。
- TableKit 已提供 resizable tables；現有選單呼叫 addRow/Column、mergeCells、splitCell、header 及 CellSelection/TableMap。不能因為選單存在就宣稱 Excel／HTML／複雜 rowspan paste、Tab 導覽及跨頁已全部驗收。
- 數學 input plugin 避開 composition／code／跳脫美元；node view 保留原始 LaTeX、可編輯／刪除／history。原生 IME、錯誤原文與超長公式仍需針對性矩陣；不把合成 composition 當實際中文輸入法。
- Markdown 是自製 parser／serializer，與 Tiptap schema 並非完全等價；沒有 remark AST 作中介，也沒有完整 GFM／專屬節點無損協議。
- NoteExportPreview 是 React portal，從已渲染 source 複製唯讀 DOM，按頂層區塊測量 A4。摺疊在副本展開，不寫正式 JSON。現有超高塊改 auto height，沒有真正分割長段落／跨頁表格或長雙欄。
- EditorPane 的 onContentChange 保留根 metadata；既有 WorkspacePersistence 在 owner 範圍同交易寫 Page/outbox，revision guard、pending merge、tombstone 防覆寫；附件 metadata/binary 分離與租約快取。此批不改以上路徑、不遷移或刪除資料。真實遠端 JWT／RLS／多裝置仍未由靜態盤點證明。

## 開源研究與採用界線

以下官方 repository／README 於 2026-10-24 讀取；GitHub pushed_at 只表示近期活動，不等同品質保證。沒有複製第三方原始碼或新增套件。

| 來源／授權／觀察 | 可借鑑、可用程式與 Nexus 邊界 | 體積與風險 |
| --- | --- | --- |
| [Paged.js](https://github.com/pagedjs/pagedjs)，MIT，最近 push 2026-10-23 | Previewer 的非自動 preview、beforePreview／afterPageLayout hooks、資源完成後量測可借鑑；MIT 程式可採用但須保留聲明。不可直接全站載入 auto polyfill，不能讓它重排可編輯 DOM。 | 新增 CSS parser／chunker／fragmentation 執行成本；尚未對 Nexus fixture 量測 gzip bundle，不能拿 repository 大小當 bundle。屬中高風險原型，這批不安裝。 |
| [ProseMirror Tables](https://github.com/ProseMirror/prosemirror-tables)，MIT，最近 push 2026-06-18 | 現有 TableKit 已重用其 TableMap／CellSelection／tableEditing invariants。依官方建議注意 plugin 排序，維持每列寬度一致與儲存格不重疊。後續補 merged-cell paste／Tab／undo 測試，避免自造另一套格網。 | 已在依賴圖中，維持單一 PM 版本；不用再安裝第二份。桌面選取與手機工具可用性需實測。 |
| [Milkdown](https://github.com/Milkdown/milkdown)，MIT，最近 push 2026-10-23 | PM＋remark 的 plugin-driven AST 分層、Markdown fixture round-trip 可借鑑。程式可依法採用，但更換 editor/schema 會破壞 Nexus 自訂節點，故不替換。數學仍需 Nexus 的原地編輯與歷史契約。 | 另一套編輯框架／插件與 parser 成本高，bundle 未量測；無需為借鑑模式引入整套。 |
| [remark](https://github.com/remarkjs/remark)，MIT，最近 push 2026-09-27；[remark-gfm](https://github.com/remarkjs/remark-gfm)，MIT，最近 push 2025-02-10 | AST parse/stringify、escaped pipe、autolink／footnote／tasklist／table 標準 fixture 可借鑑。GFM 不等於 HTML renderer，不支援 Nexus 合併格／欄寬／雙欄／fold 原樣表示。數學另需 math extension，不是 GFM 自帶。 | ESM-only GFM 插件，需 unified/micromark/mdast 等依賴；離線 import/export 可 lazy load 的候選，但需先比較測量，不直接加入。 |
| [Tiptap](https://github.com/ueberdosis/tiptap)／[ProseMirror](https://github.com/ProseMirror)，核心 MIT，Tiptap 最近 push 2026-10-23 | 既有 transaction mapping、Selection／history、composition guards、NodeView.ignoreMutation 是直接沿用的 API。以 transaction 的新 doc 定位，不靠 React 重建或關閉快捷鍵掩蓋。 | 現有依賴優先；不升級版本或增加另一份 PM。Tiptap README 明示 Pro Extensions 需訂閱，Cloud／Pro 轉換、AI 等不是此批免費方案。 |

本批自行實作的是 Nexus 唯讀副本的資源就緒、取消／清理、溢位警告與 CSS 輸出隔離，不是另一個編輯或分頁引擎。授權評估不代表所有同品牌套件都同授權；未來採用需固定版本／檢查該套件 license、transitive deps 與 bundle。

## 問題清單（依影響 × 機率，兼顧修改風險）

分類：**B** 程式已能確認的缺陷；**R** 需瀏覽器重現／根因仍是假設；**F** 功能缺口；**D** 技術債；**Q** 未核准決策。以下列出十項必要欄位，未執行的回歸不得視為通過。

| 順序／ID | 類別 | 影響／發生機率 | 修改風險與處理 |
| --- | --- | --- | --- |
| C02 | R | 極高／新根因尚未重現 | 中；沿用既有 P0 保護，真實 IME 優先驗證 |
| S01 | R | 極高／故障情境常見 | 高；保存契約不改，每批回歸 |
| E01 | R→已有紅測試 | 高／慢速媒體常見 | 低；本批等待副本資源 |
| E02 | B | 高／長文與大表格常見 | 低至中；本批警告，完整拆分另議 |
| E03 | R | 高／依列印容器 | 低；局部 print CSS＋PDF 頁數驗證 |
| E04 | R | 中高／公式展開時 | 低；副本防護與來源不變測試 |
| M01 | B | 高／有專屬節點時必然 | 中；先能力警告，無損格式需比較 |
| T01 | F | 中高／複雜貼上未量測 | 中；先補 TableMap 互動矩陣 |
| C01 | D | 中高／大文件未量測 | 中；基準後才優化 |
| P01 | F/Q | 高／超過一頁區塊時必然 | 高；A/B/C 原型，未決規則不定案 |

### E01｜預覽先於資源就緒量測 — B（紅測試確認）／P1，第一批
1. 名稱：圖片／字型載入競態。2. 影響：頁數、換頁與實際列印不一致。3. 重現：慢速載入高圖片／延遲字型後立即開預覽，等待資源後檢查 paper 高度。4. 根因：useLayoutEffect 同步一次量測，沒有 fonts.ready、image load/decode 或取消。5. 參考：Paged.js beforePreview／PM 不動原 doc 原則。6. 最小修正：只在副本等待有限資源就緒，超時／失敗顯示真實警告，關閉與換設定清理。7. 回歸：延遲 PNG、失敗圖片、關閉／重新開啟、快速換方向；檢查原 DOM／JSON 不變。8. 新依賴：否。9. 格式：不變。10. 優先：P1，低風險。

### E02｜超高／超寬內容無警告 — B／P1，第一批
1. 名稱：A4 紙張 silently auto-height。2. 影響：預覽紙張數可能不等於 PDF 頁數，內容可能裁切而無提示。3. 重現：單一 2000px pre／長表格／超寬公式，開匯出。4. 根因：oversized 分支把 body.height 改 auto，沒有 warning；table wrapper、pre、math 的局部 overflow 仍存在。5. 參考：CSS fragmentation 的 break、orphans/widows；Paged.js overflow hooks。6. 最小修正：在副本偵測超出可用寬高／未能分割內容，明示預覽區塊數與實際頁數可能不同；可安全的圖片等比約束與 print overflow 修正，不自行定案雙欄閱讀順序。7. 回歸：大圖片／長段落／rowspan 表格／pre／math／columns，預覽與 print-media 截圖及 PDF，文字與來源完整。8. 新依賴：否。9. 格式：不變。10. 優先：P1，低至中風險；完整拆分另批。

### E03｜列印 portal 受不可見應用布局干擾 — R／P1，第一批
1. 名稱：visibility:hidden 不移除佔位。2. 影響：多印空白或意外縮放。3. 重現：前置 1600px 工作區，開獨立 portal，產生 PDF 比對 preview 紙張數與 page boxes。4. 根因假設：全域 print visibility 隱藏但保留 app 的尺寸，portal 又 position:static。5. 參考：原生 @page／named page。6. 最小修正：僅在 body:has(export-preview) 下移除其他 body 直接子元素列印布局，重設 portal 邊界，不動編輯器。7. 回歸：一頁／兩頁、直橫式 PDF 媒體框、前置工作區不留白。8. 新依賴：否。9. 格式：不變。10. 優先：P1，窄範圍 CSS。

### E04｜正在編輯的公式副本可能輸出輸入卡 — R／P1，第一批驗證
1. 名稱：NodeView 即時編輯 UI 被複製。2. 影響：公式遺漏或印出按鈕。3. 重現：公式原文展開時從匯出流程取副本；檢查隱藏 math-preview 與 textarea。4. 根因：cloneNode 複製 display:none 與可編輯卡，並不根據 LaTeX 正式狀態重建。5. 參考：PM NodeView 與 KaTeX。6. 最小修正候選：副本只保留已確認 preview、移除編輯控制；未確認原文不偷偷提交。7. 回歸：inline/block、錯誤原文、fold 內公式、刪除復原及 source 不變。8. 新依賴：否。9. 格式：不變。10. 優先：P1，若實際入口先 blur 已消除此狀態，仍維持副本防護測試，不捏造已發生資料遺失。

### M01｜Markdown 無損能力未告知 — B／P1，下一批獨立
1. 名稱：專屬節點／merged table 變成扁平文字。2. 影響：以 Markdown 當備份會失去欄比、收合、span 或公式。3. 重現：pageToMarkdown 輸入 fold/multiColumn、含 blockMath 與 colspan 表格再 createMarkdownContent；一般 Note 純文字貼上不會自動走此 Markdown parser，GFM table paste 亦需專用測試，不將 Document 匯入支援視為 Note 已有完整貼上。4. 根因：default getTextFromNode／tableToMarkdown 未表達 schema 專屬 attrs；GFM 本來不能表示 rowspan。5. 參考：remark-gfm AST 與 HTML fallback，須先選明確交換策略。6. 最小修正候選：輸出能力檢查／警告、保留 JSON 備份；HTML/sidecar 封裝先原型比較，不直接定案。7. 回歸：表格 pipe／code ticks／多欄／fold／數學 round-trip fixture。8. 新依賴：警告不需；parser 另評估。9. 格式：警告不改，無損交換方案待核准。10. 優先：P1，獨立分支，避免改共用 Document parser。

### T01｜複雜表格互動矩陣不足 — F／P2
1. 名稱：表格 paste／selection／鍵盤驗證缺口。2. 影響：Excel 合併格、Tab、欄寬可能有未發現問題。3. 重現：貼 HTML rowspan/colspan、跨格選取後 merge/split／undo；最後一格 Tab。4. 根因假設：未見專用不變條件 fixture，不代表 TableKit 已壞。5. 參考：PM Tables tableEditing／CellSelection／TableMap。6. 最小方案：先測，不重寫指令；另檢查「完整顯示」目前只改 DOM 而未持久化。7. 回歸：TableMap width／不重疊、撤銷、冷重開及手機選單。8. 新依賴：否。9. 格式：維持現有 attrs。10. 優先：P2，測出根因再修。

### C01｜全文序列化／Stable ID 全掃描 — D／P2
1. 名稱：長文交易成本。2. 影響：大文件輸入延遲。3. 重現：500／5000／10000 blocks，同步快照、空白、拖曳與 undo；記錄 transaction→paint percentile／JSON 成本。4. 假設：onUpdate 全文 getJSON/getText，prop effect stringify，StableBlockId 每次 docChanged descendants。5. 參考：PM StepMap changed ranges 與 plugin state。6. 最小方案：量測後再局部掃描／revision 比較；必須保護 duplicate IDs、selection/history，不先重構。7. 回歸：Enter／paste／duplicate／undo ID 不變及多窗格。8. 新依賴：否。9. 格式：不變。10. 優先：P2，中風險，這批不宣稱效能瓶頸已確認。

### C02｜IME／外來同步 selection — R／P0 若重現
1. 名稱：組字與非同步更新。2. 影響：游標跳回或待保存輸入被覆蓋。3. 重現：快打中英、空白、composition、同步 snapshot、失敗重試與冷重開。4. 現況：main 已有 pending 保護、composition guard、schema 正規化比較；未重現新的同根 Bug。5. 參考：PM composition 與 transaction.selection/map。6. 最小方案：先補真實裝置矩陣，不停用空白／input rules；只有具體根因才改。7. 回歸：既有 note＋unifiedWorkspace failure/race tests 與真實 IME。8. 新依賴：否。9. 格式：不變。10. 優先：安全保留 P0 驗證，真實輸入法未驗收。

### P01｜完整分頁與跨頁內容 — F／Q／P2
1. 名稱：長段落／表格／雙欄缺少可靠分割。2. 影響：preview/PDF 不完全一致。3. 重現：一個超過三頁的段落／rowspan table／雙欄。4. 根因：目前頂層 greedy block pagination。5. 參考：CSS fragmentation／Paged.js chunker。6. 方案：先用共用測試文件比較三種輸出；保留未知雙欄順序、手動分頁調整保存決策。7. 回歸：逐頁文本、MediaBox／頁數、邊界截圖、字型與跨頁表頭。8. 新依賴：C 方案不需；Paged.js 原型另經評估。9. 格式：任何方案均不得永久 pageBreak。10. 優先：P2，中高風險設計原型，未安裝 Paged.js。

### S01｜舊分頁／附件／離線資料安全矩陣 — R／P1 持續
1. 名稱：相容與故障恢復驗收。2. 影響：一旦退化會遺失正式筆記或附件。3. 重現：paged Note、pageBreak、未知 metadata、離線輸入、quota／同步失敗、換帳號與備份復原。4. 現況：owner／CAS/outbox／binary lease 已存在；不能把靜態閱讀當正式帳號驗收。5. 參考：現有 repository tests，無需改用其他編輯器儲存。6. 方案：本批輸出只讀 DOM、儲存／附件模組零修改，跑既有整合回歸。7. 回歸：noteEditor、attachmentSync、unifiedWorkspace、workspaceSync；真實帳號另人工。8. 新依賴：否。9. 格式：不變。10. 優先：每批必跑保護線。

## 分頁方案比較與路線圖

| 方案 | 優點 | 限制／決策 | 本次採用 |
| --- | --- | --- | --- |
| A 原生 @media print／@page／break | 零依賴，瀏覽器處理一般文字和表格 fragmentation | 瀏覽器差異、固定 header/footer、rowspan／雙欄閱讀順序不能保證；不能宣稱 screen 頁數完全相同 | 保留；修正輸出範圍隔離與基本 break／圖片約束，異常明示 |
| B Paged.js | hooks、CSS paged media、可建立可見實體頁 | chunker 與 CSS 重寫／雙欄、表格、字型交互成本高；需鎖版和對照 prototype，不能直接套編輯器 | 不新增依賴，不宣稱已完成 Paged.js 原型比較 |
| C 獨立唯讀 DOM 測量 | 已有基礎，零 schema 改動，易保護 source | 頂層 greedy 不足以完整分割；需等待資源、警告不支持情形 | 第一批最低成本：資源就緒＋誠實警告＋print 隔離，不冒充完整分頁引擎 |

第一批：E01–E03 的重現／最小修正與 E04 防護，獨立 PR；先提交紅測試，修正後跑完整要求。第二批：M01 損失警告與 T01 表格不變條件測試，另開分支，不改共享格式。第三批：C01 長文基準，再選可證實改善的局部方案。第四批：P01 同一多頁 fixture 的 A/B/C 原型與截圖、PDF 對照，未決產品規則保留選項。每批保留實際結果、手動驗收與未完成清單。

## 鍵盤與預覽體驗另案（E05，UX／R，P2）

1. 問題：預覽目前只有 role=dialog，缺少 native modal 的 Escape／焦點圈與回復。2. 影響：鍵盤使用者可能 Tab 到背景內容。3. 重現計畫：開預覽持續 Tab／Shift+Tab／Escape，記錄 activeElement。4. 根因假設：portal div 沒有 focus management。5. 參考：Nexus 既有 ModalDialog 與 ARIA modal pattern。6. 最小方案：先做焦點回歸，再評估沿用 ModalDialog，避免影響 print portal 選擇器。7. 測試：開啟／關閉／列印失敗的焦點還原及手機鍵盤。8. 新依賴：否。9. 資料格式：不變。10. P2，與本批資源準備無關，不冒充已修。

## 驗證界線

目前盤點不等於每個 Bug 已完成瀏覽器重現。新的實際失敗／修正／CI 結果補於本文件和 HANDOFF。正式帳號、真實中文 IME、Safari、Android／iOS 及大型文件效能須人工／後續量測；不以 Chromium 或單一 PDF 檔頭通過取代上述驗收。


2026-10-24 初始證據：baseline reproduction commit `75534a6` 的 [CI 40071347820](https://github.com/changmonica02/Nexus/actions/runs/40071347820) 在延遲圖片前列印按鈕仍 enabled 的斷言失敗，確認 E01。資源完成／等待／失敗／超時／取消五項 helper 單元測試已在本機 Node 通過；最終整合結果待 CI 紀錄。

## 第一批實際交付與證據

程式／測試 `f697bd596fa1cb8614348b8a69f71e59104d3548` 的 [CI 40071963719](https://github.com/changmonica02/Nexus/actions/runs/40071963719) 通過：6 項匯出 helper＋27 項 workspaceSync 單元／契約；4 組實際 Chromium（noteExport、noteEditor、attachmentSync、unifiedWorkspace）；TypeScript、限定 ESLint（0 errors／0 warnings）、production build（含既有 map prebuild）。無刪除／略過回歸案例。

- 已修 E01；E02 提供誠實溢位／資源警告並維持來源，沒有實作完整長區塊拆分。E03 窄範圍 print 隔離以一張紙正好一 PDF 頁及直／橫 MediaBox 驗證；E04 以副本公式編輯卡移除／已確認 preview 可見驗證，不宣稱真實入口已發生公式資料遺失。
- 實際 fixture 包含延遲／失敗圖片、長篇中英混排、60-row table、rowspan／colspan、超高 pre、寬 columns、fold、math card 及 legacy break marker。檢查 source DOM 不變、尾端文字保留、warnings、不同方向 PDF 頁數／紙張框與儲存失敗重試；既有真實 EditorPane fixture 再驗證舊 JSON／pageBreak／metadata、公式／多欄／拖曳／history／合成 composition／重掛載。附件真實 IndexedDB 雙分頁、離線與帳號隔離回歸通過。
- CI 的 `note-export-evidence` artifact 留存 multi-page.png/pdf、preview.png、print.png、portrait.pdf、landscape.pdf，全部是合成資料。人工檢視日誌的 paper 預覽與 print 截圖：正文與頁首定位一致，screen 存在工具列遮蓋區，print 移除工具列並顯示頁尾；這不是自動逐像素相等或跨瀏覽器品質保證。
- 只在一般單紙 fixture 斷言 preview=PDF 一頁；多頁特殊區塊只確認產生多頁、來源／尾文仍在 DOM 且有警告，**沒有驗證每頁 PDF 的全部 glyph／文字或複雜表頭重複**。不能把本批說成所有表格／雙欄／長公式已達完整印刷排版。
- 仍未做：M01 損失警告／無損格式原型、T01 完整表格互動矩陣、C01 5000/10000-block 效能、E05 鍵盤 modal、P01 Paged.js 可執行原型及未決跨頁規則。沒有新增 runtime dependency、schema／同步／儲存／附件修改或 Migration。

