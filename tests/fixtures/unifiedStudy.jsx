// Actual repositories/components with isolated browser IndexedDB; no Supabase credentials or writes.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {openDB} from 'idb';
import {StudyRepository,STUDY_STORES} from '../../src/features/study/StudyRepository';
import StudySetView from '../../src/features/study/components/StudySetView';
import {StudyPreferencesContext} from '../../src/features/study/components/StudyPreferences';
import SettingsDialog from '../../src/components/SettingsDialog';
import {LanguageProvider} from '../../src/lib/LanguageContext';
const deck={id:'browser-deck',kind:'study_set',title:'Browser words',study_items:[],updated_at:1};
const db=await openDB('nexus47-browser',1,{upgrade(db){for(const name of STUDY_STORES){const s=db.createObjectStore(name,{keyPath:'id'});if(['study_cards','study_states','study_events'].includes(name)){s.createIndex('deck','deck_id');if(name==='study_events')s.createIndex('deck_day',['deck_id','local_day']);}}}});
const repository=new StudyRepository(db,()=>null,'browser');window.studyRepo=repository;window.studyDb=db;
await repository.ensureDeck(deck);
if(!(await repository.readDeck(deck.id)).cards.length){await repository.addCards(deck.id,[{front:'apple',back:'蘋果'},{front:'pear',back:'梨'}]);await repository.configure(deck.id,{review_limit:2,new_limit:1,study_mode:'endless'});}
function App(){const [settings,showSettings]=useState(false),[theme,setTheme]=useState('light');const language=localStorage.getItem('fixture-language')||'zh-TW';return <LanguageProvider initialLanguage={language} onLanguageChange={v=>localStorage.setItem('fixture-language',v)}><StudyPreferencesContext.Provider value={{repository,decks:[deck],activeDeckId:deck.id}}><button onClick={()=>showSettings(true)}>Preferences fixture</button><StudySetView page={deck} repository={repository} onTitleChange={()=>{}}/>{settings&&<SettingsDialog theme={theme} onThemeChange={setTheme} onExportBackup={()=>{window.backupClicked=true;}} onImportBackup={()=>{}} onClose={()=>showSettings(false)}/>}</StudyPreferencesContext.Provider></LanguageProvider>;}
createRoot(document.getElementById('root')).render(<App/>);
