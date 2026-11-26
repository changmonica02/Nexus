import type { LifeSyncBase } from "../syncRecords";
export const groups = { body:"身體數據", goal:"健康目標", diet:"飲食飲水", exercise:"運動", sleep:"睡眠" } as const;
export type Group = keyof typeof groups;
export const labels = { body:"身體數據", goal:"健康目標", meal:"飲食", food:"常用食品", recipe:"常用餐點", water:"飲水", plan:"運動計畫", exercise:"運動紀錄", sleep:"睡眠" } as const;
export const kindGroup = { body:"body",goal:"goal",meal:"diet",food:"diet",recipe:"diet",water:"diet",plan:"exercise",exercise:"exercise",sleep:"sleep" } as const;
export type Entry = keyof typeof labels;
export type Kind = Entry | "privacy";
export const body = { height:"身高（cm）",weight:"體重（kg）",fat:"體脂率（%）",muscle:"肌肉量（kg）",waist:"腰圍（cm）",systolic:"收縮壓（mmHg）",diastolic:"舒張壓（mmHg）",heart:"靜息心率（次／分）",temperature:"體溫（°C）",bmr:"基礎代謝率（kcal／日）" };
export const nutrition = { kcal:"熱量（kcal）",protein:"蛋白質（g）",carbs:"碳水化合物（g）",lipid:"脂肪（g）",sugar:"糖（g）",sodium:"鈉（mg）",fiber:"膳食纖維（g）" };
export const metrics = {...body,...nutrition, water:"飲水（ml）",minutes:"運動時間（分鐘）",sessions:"運動次數", sleep:"睡眠（小時）",custom:"自訂數值"};
export type Item = { title:string; amount:number; unit:string; values:Record<string,number> };
export type Data = Record<string,string|number|boolean|Item[]|string[]|undefined>;
export interface HealthRecord extends LifeSyncBase {
 kind:Kind;
 data: Omit<Data,"items"> & { items?: Item[]; history?: string[] };
}
export type Fields = HealthRecord["data"];
export function makeHealth(owner:string|null,kind:Kind,data:Fields):HealthRecord {
 const now=Date.now();
 return {id:kind==="privacy"?"health:"+JSON.stringify(owner):crypto.randomUUID(),workspace_owner_id:owner,kind,data,revision:0,created_at:now,updated_at:now,deleted_at:null};
}
export const str=(row:HealthRecord,key:string)=>String(row.data[key]??"");
export const num=(data:Fields,key:string)=>typeof data[key]==="number"?data[key] as number:null;
export function validDay(day:string){
 if (!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
 const time=new Date(day+"T00:00:00Z");
 return Number.isFinite(time.getTime())&&time.toISOString().slice(0,10)===day;
}
const clock=(value:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const positive=(data:Fields,key:string)=>Number(data[key])>0;
export function validateHealth(row:HealthRecord){
 const {kind,data}=row, s=(key:string)=>str(row,key);
 if(!data||typeof data!=="object"||kind!=="privacy"&&!Object.hasOwn(labels,kind))throw Error("健康資料格式無效");
 if(Object.values(data).some(value=>typeof value==="number"&&(!Number.isFinite(value)||value<0||value>1e14)))throw Error("數值超出範圍");
 if(kind==="privacy"){
  if(row.id!=="health:"+JSON.stringify(row.workspace_owner_id))throw Error("隱私設定帳號不符");
  return;
 }
 if(["goal","meal","food","recipe","plan","exercise"].includes(kind)&&(!s("title").trim()||s("title").length>160))throw Error("請輸入名稱");
 if(s("notes").length>4000)throw Error("備註最多 4000 字");
 if(["body","meal","water","plan","exercise"].includes(kind)&&!validDay(s("date")))throw Error("日期無效");
 if(["meal","water","plan","exercise"].includes(kind)&&!clock(s("time")))throw Error("時間無效");
 if(kind==="body"&&(!Object.keys(body).some(key=>positive(data,key))||Object.keys(body).some(key=>data[key]!==undefined&&!positive(data,key))||Number(data.fat)>100))throw Error("請填入有效身體數據");
 if(kind==="food"&&!["g","ml","份"].includes(s("unit")))throw Error("食品單位無效");
 if(kind==="meal"||kind==="recipe"){
  if(!Array.isArray(data.items)||!data.items.length||data.items.length>60||data.items.some(item=>!item.title||!(item.amount>0)||!["g","ml","份"].includes(item.unit)
   ||Object.entries(item.values).some(([key,value])=>!Object.hasOwn(nutrition,key)||!Number.isFinite(value)||value<0)))throw Error("請確認食品、份量及營養數值");
  if(s("image")&&(s("image").length>180000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(s("image")))) throw Error("圖片格式無效");
 }
 if(kind==="water"&&!positive(data,"amount")||["plan","exercise"].includes(kind)&&(!positive(data,"minutes")||Number(data.minutes)>10080))throw Error("容量或時長無效");
 if(kind==="plan"&&(s("until")&&(!validDay(s("until"))||s("until")<s("date"))||!/^[0-6]*$/.test(s("weekdays"))))throw Error("計畫週期無效");
 if(kind==="sleep"&&(!validDay(s("start").slice(0,10))||!validDay(s("end").slice(0,10))||!clock(s("start").slice(11))||!clock(s("end").slice(11))
  ||!positive(data,"startAt")||Number(data.endAt)<=Number(data.startAt)||!Number.isInteger(data.quality)||Number(data.quality)<1||Number(data.quality)>5))throw Error("請確認睡眠時間及品質");
 if(kind==="goal"){
  const base=num(data,"baseline"),target=num(data,"target"),upper=num(data,"upper");
  if(!Object.hasOwn(metrics,s("metric"))||!validDay(s("date"))||!validDay(s("until"))||s("date")>s("until")||base===null||target===null
   ||!(s("mode")==="increase"?base<target:s("mode")==="decrease"?base>target:s("mode")==="maintain"&&upper!==null&&upper>=target))throw Error("請確認健康目標及期間");
 }
}
export function toItem(row:HealthRecord,amount:number,unit:string):Item{
 if(!(amount>0)||!Number.isFinite(amount))throw Error("份量須大於零");
 const basis=str(row,"unit"),factors:Record<string,number>={"份":1,g:Number(row.data.grams),ml:Number(row.data.ml)};
 const ratio=unit===basis?amount:amount/factors[unit]*factors[basis];
 if(!Number.isFinite(ratio)||ratio<=0)throw Error("缺少份量換算依據");
 return {title:str(row,"title"),unit,amount,values:Object.fromEntries(Object.keys(nutrition).flatMap(key=>{
  const val=num(row.data,key);return val===null?[]:[[key,val*ratio/(basis==="份"?1:100)]];
 }))};
}
export function shared(rows:HealthRecord[],privacy:Fields){
 return rows.filter(row=>row.kind!=="privacy"&&allowed(privacy,kindGroup[row.kind])&&privacy["share_"+kindGroup[row.kind]]===true
  &&(row.kind!=="goal"||allowed(privacy,metricGroup(str(row,"metric")))&&privacy["share_"+metricGroup(str(row,"metric"))]===true));
}
export const allowed=(privacy:Fields,group:Group)=>privacy["off_"+group]!==true;
export const metricGroup=(key:string):Group=>Object.hasOwn(body,key)?"body":key==="sleep"?"sleep":key==="minutes"||key==="sessions"?"exercise":key==="custom"?"goal":"diet";
