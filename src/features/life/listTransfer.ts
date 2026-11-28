import { lifeBase, validateLife, validateRequiredFields, type LifeItem, type LifeList } from "./lists";

export function listCsv(list:LifeList, items:LifeItem[]){
 const fields=list.fields.filter(field=>!field.archived&&!field.formula&&!field.relation&&!["image","attachment"].includes(field.type));
 const cell=(value:unknown)=>{
  let text=value==null?"":typeof value==="object"?JSON.stringify(value):String(value);
  if(typeof value==="string"&&/^(?:\s*[=+\-@]|[\t\r\n])/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
 };
 return [["名稱",...fields.map(field=>field.name)],...items.map(item=>[item.title,...fields.map(field=>item.values[field.id])])]
   .map(row=>row.map(cell).join(",")).join("\r\n");
}

export function parseListCsv(source:string){
 const rows:string[][]=[];
 let row:string[]=[],cell="",quoted=false,closed=false;
 const endCell=()=>{row.push(cell);cell="";closed=false;};
 const endRow=()=>{endCell();if(row.some(value=>value!==""))rows.push(row);row=[];};
 const text=source.replace(/^\uFEFF/,"");
 for(let index=0;index<text.length;index++){
  const char=text[index];
  if(quoted){
   if(char!=='"')cell+=char;
   else if(text[index+1]==='"'){cell+='"';index++;}
   else{quoted=false;closed=true;}
  }else if(char===",")endCell();
  else if(char==="\r"||char==="\n"){if(char==="\r"&&text[index+1]==="\n")index++;endRow();}
  else if(closed)throw Error("CSV 的欄位引號後有多餘文字");
  else if(char==='"'){if(cell)throw Error("CSV 欄位引號格式錯誤");quoted=true;}
  else cell+=char;
 }
 if(quoted)throw Error("CSV 含未閉合的引號");
 if(cell||row.length||closed)endRow();
 if(rows.length>501)throw Error("每次最多匯入 500 個項目");
 return rows;
}

export function previewListCsv(source:string,list:LifeList,existing:LifeItem[]){
 const [header,...rows]=parseListCsv(source);
 if(!header||header[0].trim()!=="名稱")throw Error("CSV 第一欄必須為「名稱」");
 const columns=header.slice(1).map(name=>{
  const candidates=list.fields.filter(field=>!field.archived&&!field.formula&&!field.relation&&!["image","attachment"].includes(field.type)&&field.name===name.trim());
  if(candidates.length!==1)throw Error(`欄位「${name}」找不到唯一對應。請先調整 CSV 欄名。`);
  return candidates[0];
 });
 if(new Set(columns.map(field=>field.id)).size!==columns.length)throw Error("CSV 有重複欄位");
 const seen=new Set(existing.map(item=>item.title.trim().toLocaleLowerCase()));
 const items:LifeItem[]=[];
 let skipped=0;
 for(const [index,row] of rows.entries()){
  const title=row[0].trim();
  if(!title||title.length>500||row.length!==header.length)throw Error(`第 ${index+2} 筆資料的名稱或欄數無效`);
  const key=title.toLocaleLowerCase();
  if(seen.has(key)){skipped++;continue;}
  const values=Object.fromEntries(list.fields.filter(field=>!field.archived&&field.defaultValue!==undefined).map(field=>[field.id,structuredClone(field.defaultValue)]));
  for(const [column,field] of columns.entries()){
   const value=row[column+1];
   if(!value)continue;
   if(["number","rating","duration"].includes(field.type)){
    if(!/^-?\d+(?:\.\d+)?$/.test(value)||!Number.isFinite(Number(value)))throw Error(`第 ${index+2} 筆「${field.name}」需要數字`);
    values[field.id]=Number(value);
   }else if(field.type==="checkbox"){
    if(value!=="true"&&value!=="false")throw Error(`第 ${index+2} 筆「${field.name}」需要 true 或 false`);
    values[field.id]=value==="true";
   }else if(field.type==="multiselect"||field.type==="money"){
    try{values[field.id]=JSON.parse(value);}catch{throw Error(`第 ${index+2} 筆「${field.name}」需要有效 JSON`);}
   }else values[field.id]=value;
  }
  const item={...lifeBase(list.workspace_owner_id,title),list_id:list.id,category_id:null,schema_version:list.schema_version,attachment_ids:[],values};
  try{
   validateRequiredFields(list,item);
   validateLife({life_lists:[list],life_categories:[],life_items:[item]},list.workspace_owner_id,[]);
  }catch(error){throw Error(`第 ${index+2} 筆：${error instanceof Error?error.message:String(error)}`);}
  items.push(item);seen.add(key);
 }
 return {items,skipped};
}

export function listJson(list:LifeList, items:LifeItem[], categories:import("./lists").LifeCategory[], stock:import("./inventory").StockData){
 const ownerless=<T extends {workspace_owner_id:string|null}>(row:T)=>Object.fromEntries(Object.entries(row).filter(([key])=>key!=="workspace_owner_id"));
 const omitted=new Set(list.fields.filter(field=>field.relation||["image","attachment"].includes(field.type)).map(field=>field.id));
 const ids=new Set(items.map(item=>item.id));
 const journal=stock.life_stock_events.filter(row=>ids.has(row.item_id));
 const positions=new Map(stock.life_stock_positions.map(row=>[row.id,row]));
 const referenced=new Set<string>();
 for(const event of journal){
  let id=event.position_id;
  while(id&&!referenced.has(id)){referenced.add(id);id=positions.get(id)?.parent_id??null;}
 }
 return JSON.stringify({
  format:"nexus-list",version:1,omitted:["附件內容","附件參照","其他 Life 模組連結"],
  list:ownerless({...list,fields:list.fields.map(field=>omitted.has(field.id)?{...field,defaultValue:undefined}:field)}),
  categories:categories.map(ownerless),
  items:items.map(item=>ownerless({...item,attachment_ids:[],values:Object.fromEntries(Object.entries(item.values).filter(([id])=>!omitted.has(id)))})),
  inventory:{events:journal.map(ownerless),positions:[...referenced].flatMap(id=>{const position=positions.get(id);return position?[ownerless(position)]:[];})},
 },null,2);
}
