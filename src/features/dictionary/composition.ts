/** Retired composition metadata stays in SQL/history, outside the current content model. */
export function compositionRow<T extends Record<string,unknown>>(row:T):T {
  return {...Object.fromEntries(Object.entries(row).filter(([key])=>!['relation_kind','verification','verification_note'].includes(key))),sense_id:row.sense_id??null} as unknown as T;
}
