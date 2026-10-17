// Isolated browser fixture: all RPCs are in-memory; no Supabase URL or credentials.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PublishedWorkspace,DictionaryEditor} from '../../src/features/dictionary/DictionaryAdmin';
import {DictionaryArticle} from '../../src/features/dictionary/DictionaryBrowser';
import {PersistentReviewPanel} from '../../src/features/dictionary/PersistentImportReview';
import ConfirmDialogHost from '../../src/components/ConfirmDialog';
import {id,targets} from './dictionaryEditorService';
function App(){const [version,setVersion]=useState(0);if(new URLSearchParams(location.search).has('reading'))return <DictionaryArticle data={{...window.fixture.snapshot.detail,related:[]}}/>;return <main className="mx-auto max-w-5xl space-y-4 p-4"><PersistentReviewPanel compact entryId={id(10)}/><a href="/closed">返回來源清單</a><button onClick={()=>window.history.back()}>瀏覽器返回</button><PublishedWorkspace key={version} detail={window.fixture.snapshot.detail} entries={[]} senses={[]} refresh={async()=>setVersion(v=>v+1)}/><details><summary>公開閱讀結果</summary><DictionaryArticle data={{...window.fixture.snapshot.detail,related:targets.flatMap(t=>t.senses.map(s=>({id:t.entry.id,kind:t.entry.kind,headword:t.entry.headword,sense_id:s.id,gloss_zh_tw:s.gloss_zh_tw})))}} accordion/></details><ConfirmDialogHost/></main>;}
createRoot(document.getElementById('root')).render(<App/>);
