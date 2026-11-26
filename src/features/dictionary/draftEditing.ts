import type {Bundle} from './adminImport';
import {removeDerivationSafely,type DerivationRow,type BilingualExampleRow} from './senseDerivations';
export function withoutSense(bundle:Bundle,id:string):Bundle {
  if(bundle.dictionary_sense_derivations?.some(row=>row.sense_id===id))throw new Error('此義項仍有衍生意思，請先移除衍生意思與相關例句。');
  if(['dictionary_pronunciations','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples'].some(table=>bundle[table]?.some(row=>row.sense_id===id||row.target_sense_id===id)))throw new Error('此義項已被目前表單的構詞關聯、詞源或記憶內容引用，不能直接刪除。');
  return {...bundle,dictionary_senses:bundle.dictionary_senses.filter(row=>row.id!==id)};
}
/** Keep any referenced Example intact; require a deliberate reassignment. */
export function withoutDerivation(bundle:Bundle,id:string):Bundle {
  return {...bundle,dictionary_sense_derivations:removeDerivationSafely(
    (bundle.dictionary_sense_derivations??[]) as DerivationRow[],
    (bundle.dictionary_examples??[]) as BilingualExampleRow[],id,
  )};
}

