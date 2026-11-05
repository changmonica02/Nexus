/** Ignore exactly two retired pronunciation keys; never strip unknown content. */
export function cleanPronunciation<T extends object>(row:T):T {
 const result={...row} as T & {locale?:unknown;note?:unknown};delete result.locale;delete result.note;return result;
}
export function cleanIpaSnapshot<T>(snapshot:T):T {
 const s=snapshot as T & {detail?:{pronunciations?:object[]}};if(!Array.isArray(s?.detail?.pronunciations))return snapshot;
 return {...s,detail:{...s.detail,pronunciations:s.detail.pronunciations.map(cleanPronunciation)}};
}
export function cleanIpaRecord<T>(record:T):T {
 const r=record as T & {snapshot?:unknown;reviews?:Array<{base_snapshot?:unknown;candidate?:{pronunciations?:object[]}}>};
 if(!r||typeof r!=='object')return record;
 return {...r,...('snapshot' in r?{snapshot:cleanIpaSnapshot(r.snapshot)}:{}),...(Array.isArray(r.reviews)?{reviews:r.reviews.map(review=>({...review,base_snapshot:cleanIpaSnapshot(review.base_snapshot),candidate:Array.isArray(review.candidate?.pronunciations)?{...review.candidate,pronunciations:review.candidate.pronunciations.map(cleanPronunciation)}:review.candidate}))}:{})};
}
