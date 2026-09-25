import type { SupabaseClient } from "@supabase/supabase-js";
import { syncQuiz } from "./quizSync";
import type { StudyRepository } from "./StudyRepository";
import type { StudyBackup, StudyOperation } from "./studyFSRS";

/** Keep each event's predecessor before it, including equal-timestamp answers. */
export function orderStudyOperations(operations: StudyOperation[]): StudyOperation[] {
  // Only sync operations supported by production 20260922_study_fsrs.sql
  const validOps = operations.filter(op => op.kind === "card" || op.kind === "settings" || op.kind === "seed" || op.kind === "event");
  const base = validOps.filter(op => op.kind !== "event");
  base.sort((a,b) => ({card:0, settings:1, seed:2}[a.kind] - {card:0, settings:1, seed:2}[b.kind]) ||
    (("updated_at" in a.value ? a.value.updated_at : 0) - ("updated_at" in b.value ? b.value.updated_at : 0)));
  const pending = validOps.filter(op => op.kind === "event");
  const result: StudyOperation[] = [...base];
  while(pending.length) {
    const ids = new Set(pending.map(op => op.value.id));
    const index = pending.findIndex(op => {
      return !(op.value.parent && ids.has(op.value.parent));
    });
    if(index < 0) throw new Error("複習事件存在循環，已保留本地資料並停止同步。");
    result.push(pending.splice(index, 1)[0]);
  }
  return result;
}

export async function syncStudy(repository:StudyRepository,client:SupabaseClient,owner:string,stillActive:()=>boolean=()=>true) {
  const operations=orderStudyOperations(await repository.pending());
  for(const operation of operations) {
    if(!stillActive())return;
    if(operation.owner_id!==owner) throw new Error("同步帳號已變更。");
    // Older outboxes may carry a session envelope. Sessions remain local.
    const cloudOperation={...operation};
    delete cloudOperation.session;
    const {error}=await client.rpc("apply_study_operation",{operation:cloudOperation});
    if(error) throw new Error(`字卡同步未完成，本地紀錄已保留：${error.message}`);
    // A dropped response leaves the operation queued. Server event IDs make retries safe.
    await repository.acknowledge(operation.id);
  }
  const data:StudyBackup={cards:[],states:[],events:[],settings:[],sessions:[]};
  for(const [table,key] of [["study_cards","cards"],["study_card_states","states"],["study_review_events","events"],["study_deck_settings","settings"]] as const) {
    let offset=0;
    for(;;) {
      if(!stillActive())return;
      const {data:rows,error}=await client.from(table).select("payload").eq("owner_id",owner).order("id").range(offset,offset+499);
      if(error) throw new Error(`字卡同步未完成，本地紀錄已保留：${error.message}`);
      // Each entity is validated/scoped before its transaction in mergeRemote.
      data[key]!.push(...(rows??[]).map(row=>row.payload));
      if(!rows || rows.length<500) break;
      offset+=rows.length;
    }
  }
  if(stillActive())await repository.mergeRemote(data);
  const quiz=repository.getQuizRepository();
  if(quiz && stillActive())await syncQuiz(quiz,client,owner,stillActive);
}
