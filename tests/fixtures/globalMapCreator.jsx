import React from 'react';
import {createRoot} from 'react-dom/client';
import {LanguageProvider} from '../../src/lib/LanguageContext';
import WorldMapCreator from '../../src/components/WorldMapCreator';
window.created=[];window.cancelled=0;
createRoot(document.getElementById('root')).render(<LanguageProvider initialLanguage="zh-TW"><WorldMapCreator initialName="新星球" onCancel={()=>window.cancelled++} onCreate={async(name,blob)=>{window.created.push({name,project:JSON.parse(await blob.text())});}}/></LanguageProvider>);
