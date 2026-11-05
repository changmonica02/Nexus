/** Display spelling and semantic links are distinct. Links reuse canonical relation IDs. */
export interface WordSegment {id:string;text:string;hint:string;relation_id:string|null}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function wordSpelling(segments:WordSegment[]):string{return segments.map(s=>s.text).join('');}
export function legacyWordSegments(id:string,headword:string,segments?:WordSegment[]|null):WordSegment[]{
  return segments??[{id,text:headword,hint:'',relation_id:null}];
}
export function validateWordSegments(value:unknown,headword:string,kind:string,relations?:{id:unknown}[]):string|null {
  if(value===undefined||value===null)return null;
  if(kind!=='word'||!Array.isArray(value)||value.length<1||value.length>128)return 'segments.invalid';
  const ids=new Set<string>();
  for(const row of value){
    if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!['id','text','hint','relation_id'].includes(k)))return 'segments.invalid';
    const s=row as WordSegment;
    if(!uuid.test(s.id)||ids.has(s.id.toLowerCase())||typeof s.text!=='string'||!s.text.trim()||typeof s.hint!=='string'||!(s.relation_id===null||typeof s.relation_id==='string'&&uuid.test(s.relation_id)))return 'segments.invalid';
    if(relations&&s.relation_id&&!relations.some(r=>r.id===s.relation_id))return 'segments.missingLink';
    ids.add(s.id.toLowerCase());
  }
  return wordSpelling(value)!==headword?'segments.spellingMismatch':null;
}
