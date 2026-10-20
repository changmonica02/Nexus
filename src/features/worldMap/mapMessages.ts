import {translate,type Language} from '../../lib/i18n';
import {worldMapEn,worldMapZhTW} from '../../lib/worldMapTranslations';
const keys=new Map([...Object.entries(worldMapEn),...Object.entries(worldMapZhTW)].map(([key,value])=>[value,key]));
export function mapMessage(language:Language,message:string):string {
 const plain=message.replace(/^(Error|WorldMapError): /,'');
 const key=keys.get(plain)??'azgaar.'+plain,value=translate(language,key);
 return value===key?message:value;
}
