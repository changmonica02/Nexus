"use client";
import type {GlobalMapResult} from '../features/worldMap/globalMapClient';
import WorldMapCreator from "./WorldMapCreator";
import ModalDialog from "./ModalDialog";
import CreationTemplateLibraryView from "./CreationTemplateLibrary";
import type { CreationDownload } from "../features/creation/templateLibrary";
import FeatureIcon from "./FeatureIcon";
import { useState } from "react";
import {isCreativeCharacterPage,type Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";
import CharacterTemplateManager from "./CharacterTemplateManager";
import CreationChoiceDialog from "./CreationChoiceDialog";
import PageCollection, { type PageActions } from "./PageCollection";
export default function CreativeView({
  pages,
  templates = [],
  onCreateCharacter,
  onCreateWorld,
  onCreateWorldMap,
  onSelectPage,
  onCreateTemplate,
  onRenameTemplate,
  onDownloadTemplate,
  initialLibraryPost,
  ...actions
}: PageActions & {
  pages: Page[];
  templates?: Page[];
  onCreateCharacter: (id?: string) => void;
  onCreateWorld: (templateId?:string) => void;
  onCreateWorldMap?:(name:string,blob:Blob,generated?:GlobalMapResult)=>Promise<void>;
  onSelectPage: (id: string) => void;
  onCreateTemplate: () => void;
  onRenameTemplate: (id: string, title: string) => void;
  initialLibraryPost?: string|null;
  onDownloadTemplate: (data: CreationDownload) => Promise<void>;
}) {
  const { t,language } = useLanguage();
  const [choice, setChoice] = useState(false),
    [character, setCharacter] = useState(false),
    [world,setWorld]=useState(false),
    [manager, setManager] = useState(false), [library,setLibrary]=useState(Boolean(initialLibraryPost)),[resourcePost,setResourcePost]=useState(initialLibraryPost);
  const [worldStep,setWorldStep]=useState<'actions'|'types'|'generator'|null>(null),[importing,setImporting]=useState(false),[worldError,setWorldError]=useState('');
 const [libraryFromManager,setLibraryFromManager]=useState(false);
  const secondary=library?<CreationTemplateLibraryView templates={templates} onClose={()=>{setLibrary(false);if(libraryFromManager)setManager(true);}} onDownload={onDownloadTemplate} initialPostId={resourcePost}/>:manager?(
          <CharacterTemplateManager
            templates={templates}
            onClose={() => setManager(false)}
            onCreate={onCreateTemplate}
            onEdit={onSelectPage}
            onRename={onRenameTemplate}
            onDelete={(id) => actions.onDeletePage?.(id)}
            onUse={id=>templates.find(t=>t.id===id)?.creative_type==="world"?onCreateWorld(id):onCreateCharacter(id)}
            onOpenResource={id=>{setResourcePost(id);setLibraryFromManager(true);setManager(false);setLibrary(true)}}
            onCopy={(id)=>actions.onDuplicatePage?.(id)}
          />
  ):null;
  return (
    <>{secondary}<main
      data-pull-refresh
      style={{display:secondary?"none":undefined}}
      className="min-w-0 flex-1 overflow-y-auto bg-[var(--color-editor-bg)] text-[var(--color-text)]"
    >
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">
            <FeatureIcon feature="creative"/> {t("ui.feature.creative")}
          </h1>
          <div className="flex flex-wrap gap-2">
            <button className="rounded border px-4 py-2 text-sm" onClick={()=>{setLibraryFromManager(false);setLibrary(true)}}>{t("navigation.creationLibrary")}</button>
            <button
              type="button"
              onClick={() => setManager(true)}
              className="rounded border px-4 py-2 text-sm"
            >
              {t("ui.templates")}
            </button>
            <button
              type="button"
              onClick={() => setChoice(true)}
              className="min-h-11 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white"
            >
              ＋ {t("ui.create")}
            </button>
          </div>
        </header>
        <PageCollection
          viewStorageKey="nexus_creative_view_mode"
          pages={pages.filter(
            (p) =>
              isCreativeCharacterPage(p) &&
              !p.deleted_at &&
              !p.character_data?.isTemplate,
          )}
          onSelectPage={onSelectPage}
          {...actions}
        />
        {choice && (
          <CreationChoiceDialog
            title={t("ui.create")}
            options={[
              { id: "world", label: t("ui.world") },
              { id: "character", label: t("ui.character") },
            ]}
            onChoose={(id) => {
              setChoice(false);
              if (id === "world") {if(onCreateWorldMap)setWorldStep('actions');else if(templates.some(t=>t.creative_type==="world"))setWorld(true);else onCreateWorld();}
              else setCharacter(true);
            }}
            onClose={() => setChoice(false)}
          />
        )}
        {worldStep&&worldStep!=='generator'&&<ModalDialog aria-label={language==='zh-TW'?'建立世界觀':'Create world'} onDismiss={()=>{setWorldStep(null);setWorldError('');}} busy={importing} className="w-[min(94vw,28rem)] rounded-2xl border bg-[var(--color-bg)] p-5 text-[var(--color-text)] backdrop:bg-black/40">
         <header className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{language==='zh-TW'?(worldStep==='actions'?'建立世界觀':'新建地圖'):(worldStep==='actions'?'Create world':'Create map')}</h2><button className="min-h-11 min-w-11" aria-label={language==='zh-TW'?'關閉':'Close'} disabled={importing} onClick={()=>{setWorldStep(null);setWorldError('');}}>×</button></header>
         <div className="grid gap-3 [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:border [&_button]:px-3">{worldStep==='actions'?<>
          <button disabled={importing} onClick={()=>{setWorldError('');setWorldStep('types');}}>{language==='zh-TW'?'新建地圖':'New map'}</button>
          <label className="relative flex min-h-11 items-center justify-center rounded-lg border px-3">{language==='zh-TW'?'匯入':'Import'}<input aria-label={language==='zh-TW'?'匯入世界觀地圖':'Import world map'} className="absolute inset-0 w-full cursor-pointer opacity-0" type="file" accept=".json,.map,.gz" disabled={importing} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(!file||!onCreateWorldMap)return;setImporting(true);setWorldError('');void onCreateWorldMap(file.name.replace(/\.(nexus-map\.json|json|map|gz)$/i,''),file).then(()=>setWorldStep(null)).catch(()=>setWorldError(language==='zh-TW'?'匯入未完成，請確認檔案格式與儲存狀態。':'Import failed. Check file format and storage.')).finally(()=>setImporting(false));}}/></label>
         </>:<><button onClick={()=>setWorldStep('generator')}>{language==='zh-TW'?'新建星球地圖':'New planet map'}</button><button disabled aria-disabled="true" className="cursor-not-allowed bg-zinc-500/10 text-zinc-400">{language==='zh-TW'?'新建六角地圖':'New hex map'}</button><button onClick={()=>setWorldStep('actions')}>{language==='zh-TW'?'返回':'Back'}</button></>}</div>
         {worldError&&<p role="alert" className="mt-3 text-red-600">{worldError}</p>}
        </ModalDialog>}
        {worldStep==='generator'&&onCreateWorldMap&&<WorldMapCreator initialName="" onCancel={()=>setWorldStep('types')} onCreate={async(name,blob,generated)=>{await onCreateWorldMap(name,blob,generated);setWorldStep(null);}}/>}
        {world&&<CreationChoiceDialog title="世界觀模板 / World templates" options={[{id:"blank",label:"空白世界觀 / Blank world"},...templates.filter(t=>t.creative_type==="world").map(t=>({id:t.id,label:t.title}))]} onClose={()=>setWorld(false)} onChoose={id=>{setWorld(false);onCreateWorld(id)}}/>}
        {character && (
          <CreationChoiceDialog
            title={t("ui.templates")}
            options={[
              { id: "blank", label: t("ui.blankCharacter") },
              { id: "dnd5e", label: "D&D 5e" },
              { id: "coc7e", label: "CoC 7e" },
              ...templates.filter(p=>p.creative_type!=="world").map((p) => ({ id: p.id, label: p.title })),
            ]}
            onChoose={(id) => {
              setCharacter(false);
              onCreateCharacter(id);
            }}
            onClose={() => setCharacter(false)}
          />
        )}

      </div>
    </main></>
  );
}
