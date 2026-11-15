"use client";
import type {GlobalMapSettings} from '../features/worldMap/globalMapProject';
import {useLanguage} from '../lib/LanguageContext';
import {globalMapText} from '../features/worldMap/globalMapMessages';
export const newGlobalMapSettings=():GlobalMapSettings=>({seed:crypto.getRandomValues(new Uint32Array(1))[0],landPercent:32,continentCores:8,gridCells:36002});
export default function GlobalMapParameters({settings,onChange,disabled}:{settings:GlobalMapSettings;onChange:(value:GlobalMapSettings)=>void;disabled?:boolean}){
 const {language}=useLanguage(),text=globalMapText(language);
 return <fieldset disabled={disabled} className="flex min-w-0 flex-wrap gap-3 [&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:bg-[var(--color-bg)] [&_input]:px-2 [&_select]:min-h-11 [&_select]:rounded-lg [&_select]:border [&_select]:bg-[var(--color-bg)] [&_select]:px-2">
  <label className="grid gap-1">{text('land')}<select value={settings.landPercent} onChange={e=>onChange({...settings,landPercent:Number(e.target.value) as GlobalMapSettings['landPercent']})}>{[25,32,45].map(n=><option key={n} value={n}>{n}%</option>)}</select></label>
  <label className="grid w-28 gap-1">{text('cores')}<input type="number" min={6} max={10} value={Number.isNaN(settings.continentCores)?'':settings.continentCores} onChange={e=>onChange({...settings,continentCores:e.target.valueAsNumber})}/></label>
  <label className="grid min-w-0 max-w-52 flex-1 gap-1">{text('seed')}<input type="number" min={0} max={4294967295} value={Number.isNaN(settings.seed)?'':settings.seed} onChange={e=>onChange({...settings,seed:e.target.valueAsNumber})}/></label>
  <button type="button" className="self-end rounded-lg border px-3" onClick={()=>onChange({...settings,seed:newGlobalMapSettings().seed})}>{text('random')}</button>
 </fieldset>;
}
