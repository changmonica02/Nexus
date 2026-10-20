import {translate,type Language} from '../../lib/i18n';
export function mapMessage(language:Language, message:string):string {
 const plain=message.replace(/^(Error|WorldMapError): /,'');
 const key='azgaar.'+plain,value=translate(language,key);
 return value===key?message:value;
}
