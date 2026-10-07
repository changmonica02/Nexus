/** Shared information for the dictionary, official study packs and built-in content. */
export default function DataSourcesAndCopyright(){
  return <article className="space-y-4 text-sm leading-7">
    <h4 className="text-lg font-semibold">資料來源與版權</h4>
    <p>本頁統一整理 Nexus 公共字典、官方單字集及其他內建內容的資料來源與版權資訊。</p>
    <section><h5 className="font-semibold">公共字典與內建內容</h5><p>各資料集的來源、授權範圍與必要聲明將在確認後補充於此。目前未列出的內容，不代表已取得公開授權。</p></section>
    <section><h5 className="font-semibold">歷史詞源與學習內容</h5><p>歷史詞源的資料來源保留於該段內容。口訣與記憶故事屬於學習輔助，不代表經查證的歷史事實。</p></section>
    <section><h5 className="font-semibold">使用者內容</h5><p>個人建立或匯入的內容不因存入 Nexus 而成為公共字典或取得新的授權。</p></section>
  </article>;
}
