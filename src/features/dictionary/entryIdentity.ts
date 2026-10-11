/** Same normalization as the database lower(btrim(headword)) key. */
export const normalizeHeadword=(value:string)=>value.replace(/^ +| +$/g,'').toLowerCase();
export const entryKey=(kind:string,headword:string)=>`${kind}:${normalizeHeadword(headword)}`;
