"use client";
import { useEffect } from "react";

export default function HelpGuide({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Nexus 使用說明</h2>
          <button onClick={onClose} className="rounded-md px-3 py-1 text-sm border hover:bg-zinc-100" style={{ borderColor: "var(--color-border)" }}>Esc 關閉</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
          <section>
            <h3 className="font-semibold text-base mb-2">1. 檔案選單（工具列最左邊）</h3>
            <ul className="list-disc pl-5 space-y-1 opacity-80">
              <li>位置：格式化工具列同一行最左邊，類似 Google 文件</li>
              <li>新建：筆記（流動預設）、文檔（A4預設）、簡報（16比9）</li>
              <li>匯入：PDF 會生成研究筆記，Markdown 匯入為文檔（可再匯出MD）</li>
              <li>格式：流動原本不改，僅 A4 / 16比9 / 4比3 可還原為流動</li>
              <li>簡報：轉為簡報（用筆記製作簡報），H1 自動切頁，表格自動轉圖表，超過4張自動目錄</li>
              <li>匯出：文檔匯出 Markdown，筆記匯出 PDF 或 Nexus JSON，列印為瀏覽器列印</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold text-base mb-2">2. 分頁與排版（A4 引擎）</h3>
            <ul className="list-disc pl-5 space-y-1 opacity-80">
              <li>單一上欄與標題，內頁分頁：標題與工具列固定，只有紙張區域捲動</li>
              <li>Document 預設 A4（可還原為流動），Note 預設流動（保持不改）</li>
              <li>工具列插入分頁符：在 A4 中插入虛線分頁符</li>
              <li>16比9 / 4比3 為簡報預覽容器，黑色舞台</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold text-base mb-2">3. 側邊欄</h3>
            <ul className="list-disc pl-5 space-y-1 opacity-80">
              <li>搜尋：支援標題與內容子字串，右側 CmdK 開命令面板</li>
              <li>新建：側邊欄加號按鈕在多選左邊，單一扁平下拉（新建與匯入同層）</li>
              <li>排序：最近編輯 / 自訂拖曳，可勾選依類型分組</li>
              <li>子頁規則：只有同類型能成為子頁（文檔的只能是文檔，筆記的只能是筆記，學習集的只能是學習集），簡報無子頁概念</li>
              <li>子頁建立：每項 hover 左側加號按鈕，僅顯示同類型選項，點擊直接建立並進入重新命名</li>
              <li>拖曳：可拖曳改變順序，上方30%插入上方，下方30%下方，中間40%變成子頁（同類型才允許）</li>
              <li>雙開：Ctrl 或 Cmd 點擊側邊欄項目，在右側開啟左右分頁</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold text-base mb-2">4. 左右雙開（Obsidian 風格）</h3>
            <ul className="list-disc pl-5 space-y-1 opacity-80">
              <li>開啟：Ctrl 或 Cmd 點擊 或 右鍵選單在右側開啟</li>
              <li>工具列右側顯示：雙開中、交換、關閉右側</li>
              <li>左右皆可獨立編輯、獨立 PDF 預覽、獨立格式切換</li>
              <li>標題右側新增子頁已移除，僅保留側邊欄的加號</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold text-base mb-2">5. 簡報（獨立，可大改）</h3>
            <ul className="list-disc pl-5 space-y-1 opacity-80">
              <li>建立：側邊欄加號到簡報，或 Dashboard 新建，或筆記檔案轉為簡報</li>
              <li>版面：左側投影片清單（可上下移動），中間自由畫布（16比9），右側圖層與屬性</li>
              <li>直觀操作：加號文字區塊到畫布隨機新增可拖曳，雙擊編輯，右上角刪除</li>
              <li>圖層：右側圖層面板按 z 倒序，點選切換，置頂置底改變層級，像 Canva</li>
              <li>圖表：圖表按鈕新增，右側屬性面板表格直接填 label 與 value，切換 bar line pie</li>
              <li>示圖：Mermaid 程式碼 textarea，未來渲染為 SVG</li>
              <li>備註：底部固定備註，講者備註觀眾看不到</li>
              <li>版型：標題、標題加內容、兩欄、圖表、自由畫布、目錄等 8 種</li>
              <li>主題：Minimal Academic Business Dark</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold text-base mb-2">6. 其他</h3>
            <ul className="list-disc pl-5 space-y-1 opacity-80">
              <li>標籤：標題下方輸入加 Enter 新增，點擊刪除，側邊欄可過濾</li>
              <li>資料夾：已從標題右側移除，改由側邊欄自動分組（未分類置頂）</li>
              <li>命令面板：Ctrl 或 Cmd 加 K 開啟，搜尋頁面或執行動作</li>
              <li>偏好設定：右下齒輪，可切主題、語言、匯入匯出備份、使用說明（本頁）</li>
              <li>同步：右下顯示同步狀態（共享工作區，無登入）</li>
            </ul>
          </section>
          <section className="pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
            <p className="text-xs opacity-50">Nexus 是 local-first 個人學習與知識生成 workspace，支援筆記、文檔、PDF研究、學習集、簡報、雙開、A4分頁。簡報已獨立，框架可依順手原則大改。</p>
          </section>
        </div>
      </div>
    </div>
  );
}