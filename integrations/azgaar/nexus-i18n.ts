// Shared Nexus dictionaries; UI presentation only, never native project strings.
import {translate,type Language} from '../../src/lib/i18n';
import {worldMapEn} from '../../src/lib/worldMapTranslations';
const normalized=(value:string)=>value.trim().replace(/\s+/g,' ');
const caseInsensitive=new Map(Object.keys(worldMapEn).filter(k=>k.startsWith('azgaar.')).map(k=>[normalized(k.slice(7)).toLowerCase(),k]));
const interfaceStrings=new Set(Object.values(worldMapEn).map(normalized));
let language:Language=new URLSearchParams(location.search).get('language')==='zh-TW'?'zh-TW':'en',timer:ReturnType<typeof setTimeout>|undefined;
const originals=new WeakMap<Node,{source:string;applied:string}>();
const attributes=new WeakMap<Element,Map<string,{source:string;applied:string}>>();
const generatedLabels=new WeakSet<Element>();
const excluded='svg,input,textarea,[contenteditable],script,style,#map';

function uiText(source:string):string {
 const key='azgaar.'+normalized(source),value=translate(language,key);
 if(value!==key)return source.replace(source.trim(),value);
 const insensitive=caseInsensitive.get(normalized(source).toLowerCase());if(language==='zh-TW'&&insensitive)return source.replace(source.trim(),translate(language,insensitive));
 const separator=source.indexOf(': click to toggle');
 if(separator>0)return uiText(source.slice(0,separator))+': '+uiText('Click to toggle, drag to raise or lower the layer');
 if(language==='zh-TW'){const count=source.trim().match(/^(\d+) of (\d+)$/);if(count)return `${count[1]} / ${count[2]}`;}
 return source;
}
function apply():void {
 // Core is initialized after this script; data fields are excluded even before pack exists.
 const protectedNames=new Set<string>();
 const seen=new WeakSet<object>();
 const protect=(value:unknown,field=""):void=>{
  if(typeof value==='string'){
   if(!['name','fullName','title','body','legend','description','content','text'].includes(field))return;
   if(value.length<1000&&interfaceStrings.has(normalized(value)))protectedNames.add(normalized(value));
   if(value.includes('<')&&value.includes('>')){
    const parsed=document.createElement('template');parsed.innerHTML=value;
    const walker=document.createTreeWalker(parsed.content,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){const text=walker.currentNode.textContent?.trim();if(text&&interfaceStrings.has(normalized(text)))protectedNames.add(normalized(text));}
   }
  }else if(value&&typeof value==='object'&&!seen.has(value)){
   seen.add(value);
   for(const [key,child] of Object.entries(value))if(!['cells','vertices','points','d','svg','path','icon'].includes(key)&&(typeof child==='string'||child&&typeof child==='object'))protect(child,key);
  }
 };
 if(language!=='en')for(const value of window.nexusMapData?.()??[])protect(value);
 document.documentElement.lang=language;
 document.title=translate(language,'worldMap.editor10');
 const candidates=document.querySelectorAll('button,label,legend,summary,th,td,p,a,span,div,li,b,strong,em,i,small,dt,dd,h1,h2,h3,h4,.tip,.ui-dialog-title,#tooltip,option');
 for(const element of candidates){
  if(element.closest(excluded))continue;
  if(element.tagName==='OPTION'&&element.parentElement?.id==='layersPreset'&&!['political','cultural','religions','provinces','biomes','heightmap','physical','poi','goods','trade','military','emblems','landmass','custom'].includes((element as HTMLOptionElement).value))continue;
  // Shortcut underlines may split a static label. Never replace controls or data descendants.
  if(element.childNodes.length&&[...element.childNodes].every(n=>n.nodeType===Node.TEXT_NODE||n instanceof HTMLElement&&n.tagName==='U')){
   const current=element.textContent??'',old=originals.get(element),source=old&&current===old.applied?old.source:current;
   const applied=protectedNames.has(normalized(source))?source:uiText(source);
   originals.set(element,{source,applied});if(current!==applied)element.textContent=applied;
  }else for(const node of [...element.childNodes]){
   if(node.nodeType!==Node.TEXT_NODE)continue;
   const current=node.textContent??'',old=originals.get(node),source=old&&current===old.applied?old.source:current;
   const applied=protectedNames.has(normalized(source))?source:uiText(source);originals.set(node,{source,applied});if(current!==applied)node.textContent=applied;
  }
 }
 for(const element of document.querySelectorAll('[data-tip],[title],[aria-label],[placeholder],input[type=button],input[type=submit],optgroup[label]')){
  if(element.closest('svg,#map,[contenteditable]'))continue;
  let records=attributes.get(element);if(!records){records=new Map();attributes.set(element,records);}
  for(const name of ['data-tip','title','aria-label','placeholder',...(element instanceof HTMLInputElement&&['button','submit'].includes(element.type)?['value']:[]),...(element.tagName==='OPTGROUP'?['label']:[])]){
   const current=element.getAttribute(name);if(current===null)continue;
   const old=records.get(name),source=old&&current===old.applied?old.source:current;
   const applied=protectedNames.has(normalized(source))?source:uiText(source);records.set(name,{source,applied});if(current!==applied)element.setAttribute(name,applied);
  }
  if(element.tagName==='BUTTON'&&element.hasAttribute('data-tip')&&(!element.hasAttribute('aria-label')||generatedLabels.has(element))){
   const source=records.get('data-tip')?.source;if(source){const applied=uiText(source);if(element.getAttribute('aria-label')!==applied)element.setAttribute('aria-label',applied);generatedLabels.add(element);}
  }
 }
}
window.nexusCurrentLanguage=()=>language;
window.nexusSetLanguage=(value:string)=>{language=value==='zh-TW'?'zh-TW':'en';apply();};
window.nexusTranslateError=(message:string)=>uiText(message);
new MutationObserver(records=>{if(!records.some(record=>{const target=record.target instanceof Element?record.target:record.target.parentElement;return !target?.closest('svg,#map,input,textarea,[contenteditable]');})||timer)return;timer=setTimeout(()=>{timer=undefined;apply();},30);}).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-tip','title','aria-label','placeholder','value','label']});
declare global {interface Window {nexusCurrentLanguage?:()=>Language;nexusMapData?:()=>unknown[];nexusSetLanguage?:(value:string)=>void;nexusTranslateError?:(message:string)=>string;}}
