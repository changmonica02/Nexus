// Shared Nexus dictionaries; UI presentation only, never native project strings.
import {translate,type Language} from '../../src/lib/i18n';
let language:Language='en',timer:ReturnType<typeof setTimeout>|undefined;
const originals=new WeakMap<Node,{source:string;applied:string}>();
const attributes=new WeakMap<Element,Map<string,{source:string;applied:string}>>();
const excluded='svg,input,textarea,[contenteditable],script,style,#map,#burgsList,#statesList,#culturesList,#religionsList';
const staticSelects=new Set(['layersPreset','heightmapTemplate','viewMode','distanceUnit','heightUnit','temperatureScale','templateInput','culturesSet','onloadBehavior','performancePreset','azgaarAssistant','emblemShape']);
function uiText(source:string):string {
 const key='azgaar.'+source.trim(),value=translate(language,key);
 if(value!==key)return source.replace(source.trim(),value);
 const separator=source.indexOf(': click to toggle');
 if(separator>0)return uiText(source.slice(0,separator))+': '+uiText('Click to toggle, drag to raise or lower the layer');
 return source;
}
function apply():void {
 // Core is initialized after this script; data fields are excluded even before pack exists.
 const protectedNames=new Set<string>();
 const world=(window as unknown as {pack?:Record<string,Array<{name?:string;fullName?:string}>>}).pack;
 for(const key of ['burgs','states','cultures','religions','provinces'])for(const entry of world?.[key]??[]){if(entry.name)protectedNames.add(entry.name);if(entry.fullName)protectedNames.add(entry.fullName);}
 const legacy=document.getElementById('loadGoogleTranslateButton')?.closest('tr');if(legacy)legacy.hidden=true;
 document.documentElement.lang=language;
 const candidates=document.querySelectorAll('button,label,legend,summary,th,p,#options td,#options .separator,.tip,.ui-dialog-title,#tooltip,#mapLayers li,option');
 for(const element of candidates){
  if(element.closest(excluded))continue;
  if(element.tagName==='OPTION'&&!staticSelects.has(element.parentElement?.id??''))continue;
  // Shortcut underlines may split a static label. Never replace controls or data descendants.
  if(element.childNodes.length&&[...element.childNodes].every(n=>n.nodeType===Node.TEXT_NODE||n instanceof HTMLElement&&n.tagName==='U')){
   const current=element.textContent??'',old=originals.get(element),source=old&&current===old.applied?old.source:current;
   const applied=protectedNames.has(source.trim())?source:uiText(source);
   originals.set(element,{source,applied});if(current!==applied)element.textContent=applied;
  }else for(const node of [...element.childNodes]){
   if(node.nodeType!==Node.TEXT_NODE)continue;
   const current=node.textContent??'',old=originals.get(node),source=old&&current===old.applied?old.source:current;
   const applied=protectedNames.has(source.trim())?source:uiText(source);originals.set(node,{source,applied});if(current!==applied)node.textContent=applied;
  }
 }
 for(const element of document.querySelectorAll('[data-tip],[title],[aria-label],[placeholder]')){
  if(element.closest('svg,#map,[contenteditable]'))continue;
  let records=attributes.get(element);if(!records){records=new Map();attributes.set(element,records);}
  for(const name of ['data-tip','title','aria-label','placeholder']){
   const current=element.getAttribute(name);if(current===null)continue;
   const old=records.get(name),source=old&&current===old.applied?old.source:current;
   const applied=protectedNames.has(source.trim())?source:uiText(source);records.set(name,{source,applied});if(current!==applied)element.setAttribute(name,applied);
  }
 }
}
window.nexusSetLanguage=(value:string)=>{language=value==='zh-TW'?'zh-TW':'en';apply();};
window.nexusTranslateError=(message:string)=>uiText(message);
new MutationObserver(records=>{if(!records.some(record=>{const target=record.target instanceof Element?record.target:record.target.parentElement;return !target?.closest('svg,#map,input,textarea,[contenteditable]');})||timer)return;timer=setTimeout(()=>{timer=undefined;apply();},30);}).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-tip','title','aria-label','placeholder']});
declare global {interface Window {nexusSetLanguage?:(value:string)=>void;nexusTranslateError?:(message:string)=>string;}}
