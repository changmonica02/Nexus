import type { ViewPreferences } from "./listViewModel";
export type Formula = { left:string; right:string; operation:"+"|"-"|"*"|"/" };
export type StatisticPreset = { id:string; title:string; field:string; start:string; end:string; group:string; chart:string };
export type SavedListView={id:string;name:string;view:ViewPreferences};
export type ListConfiguration = { icon?:string; cover?:string; statistics?:StatisticPreset[]; view?:ViewPreferences; inventory?:boolean; pinned?:boolean; archived?:boolean; template?:boolean; folder?:string; description?:string; savedViews?:SavedListView[]; expiryDays?:number; lowStock?:number };

export function evaluateFormula(formula:Formula, values:Record<string,unknown>) {
  const a=Object.hasOwn(values,formula.left)?values[formula.left]:null;
  const b=Object.hasOwn(values,formula.right)?values[formula.right]:null;
  if(typeof a!=="number"||typeof b!=="number")return null;
  const result=formula.operation==="+"?a+b:formula.operation==="-"?a-b:formula.operation==="*"?a*b:formula.operation==="/"&&b!==0?a/b:NaN;
  return Number.isFinite(result)?result:null;
}

export function isListConfiguration(value:unknown):value is ListConfiguration {
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const {icon,cover,statistics,view,inventory,pinned,archived,template,folder,description,savedViews,expiryDays,lowStock}=value as ListConfiguration;
  return (expiryDays===undefined||Number.isInteger(expiryDays)&&expiryDays>=0&&expiryDays<=365)
    && (lowStock===undefined||Number.isInteger(lowStock)&&lowStock>=0&&lowStock<=1000000)
    && (savedViews===undefined||Array.isArray(savedViews)&&savedViews.length<=12&&JSON.stringify(savedViews).length<=16000
      &&savedViews.every(row=>row&&typeof row.id==="string"&&typeof row.name==="string"&&row.name.trim()&&row.name.length<=80&&row.view?.version===1)
      &&new Set(savedViews.map(row=>row.id)).size===savedViews.length)
    && [inventory,pinned,archived,template].every(flag=>flag===undefined||typeof flag==="boolean")
    && [folder,description].every(value=>value===undefined||typeof value==="string"&&value.length<=500)
    && (view===undefined||view&&view.version===1&&JSON.stringify(view).length<=8000)
    && (icon===undefined||typeof icon==="string"&&icon.length<=12)
    &&(cover===undefined||["sage","sand","sky","plum"].includes(cover))
    &&(statistics===undefined||Array.isArray(statistics)&&statistics.length<=12&&new Set(statistics.map(row=>row?.id)).size===statistics.length
      &&statistics.every(row=>row&&typeof row.id==="string"&&row.id.length<=80&&typeof row.title==="string"&&row.title.trim()&&row.title.length<=100
      &&typeof row.field==="string"&&row.field.length<=200&&[row.start,row.end].every(date=>typeof date==="string"&&(!date||/^\d{4}-\d{2}-\d{2}$/.test(date)))
      &&["day","week","month","year","category"].includes(row.group)&&["bar","numbers","donut"].includes(row.chart)));
}

export const coverClasses:Record<string,string>={
  sage:"bg-emerald-500/15",sand:"bg-amber-500/15",sky:"bg-sky-500/15",plum:"bg-fuchsia-500/15",
};

export function previewFieldConversion(rows:readonly {id:string;values:Record<string,unknown>}[], field:string, target:"text"|"number") {
  const converted:Record<string,string|number>=Object.create(null);
  const rejected:string[]=[];
  for(const row of rows){
    const value=row.values[field];
    if(value==null||value==="")continue;
    if(target==="text"&&typeof value==="number"&&Number.isFinite(value)){converted[row.id]=String(value);continue;}
    if(target==="number"&&typeof value==="string"&&/^-?\d+(\.\d+)?$/.test(value.trim())){
      const number=Number(value);
      if(Number.isFinite(number)&&Math.abs(number)<=Number.MAX_SAFE_INTEGER){converted[row.id]=number;continue;}
    }
    rejected.push(row.id);
  }
  return {converted,rejected};
}
