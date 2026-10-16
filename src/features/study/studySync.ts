import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudyRepository, StudyChange } from "./StudyRepository";
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
  return [...result,...operations.filter(op=>op.kind==='resolution')];
}

async function runStudySync(repository:StudyRepository,client:SupabaseClient,owner:string,stillActive:()=>boolean=()=>true) {
  let staleDecision=false;
  // A bounded second pass submits derived decisions from the first pull.
  for(let round=0;round<2;round++) {
  const operations=orderStudyOperations(await repository.pending());
  for(const operation of operations) {
    if(!stillActive())return;
    if(operation.owner_id!==owner) throw new Error("同步帳號已變更。");
    // Older outboxes may carry a session envelope. Sessions remain local.
    const cloudOperation={...operation};
    delete cloudOperation.session;
    const {data:result,error}=await client.rpc(operation.kind==='resolution'?"apply_study_resolution":"apply_study_operation",{operation:cloudOperation});
    if(error) throw new Error(`字卡同步未完成，本地紀錄已保留：${error.message}`);
    if(operation.kind==='resolution'&&result===false)staleDecision=true;
    // A dropped response leaves the operation queued. Server event IDs make retries safe.
    await repository.acknowledge(operation.id);
  }
  const data:StudyBackup={cards:[],states:[],events:[],settings:[],sessions:[]};
  const changes:StudyChange[]=[];
  let cursor=await repository.syncCursor();
  const keys:Record<string,'cards'|'states'|'events'|'settings'>={study_cards:'cards',study_card_states:'states',study_review_events:'events',study_deck_settings:'settings'};
    for(;;) {
      if(!stillActive())return;
      const {data:rows,error}=await client.rpc('pull_study_changes',{after_sequence:cursor});
      if(error) throw new Error(`字卡同步未完成，本地紀錄已保留：${error.message}`);
      for(const row of (rows??[]) as StudyChange[]){
        if(row.owner_id!==owner || row.sequence<=cursor)throw new Error('無效 Study 同步游標。');
        changes.push(row);cursor=row.sequence;
        if(!row.deleted&&row.payload&&keys[row.entity]) (data[keys[row.entity]] as unknown[]).push(row.payload);
      }
      if(!rows || rows.length<500) break;
    }
  // A record can change again while paging; use its final server-sequence snapshot.
  const unique=<T extends {id:string}>(values:T[])=>[...new Map(values.map(v=>[v.id,v])).values()];
  data.cards=unique(data.cards);data.states=unique(data.states);data.events=unique(data.events);data.settings=unique(data.settings);
  if(stillActive()&&changes.length)await repository.mergeRemote(data,changes);
  }
  if(staleDecision)throw new Error('排程自選擇後已變更，已保留全部事件並同步最新資料，請重新確認。');
}

// Avoid two UI/background callers racing the same durable cursor/outbox.
const activeSyncs=new WeakMap<StudyRepository,Promise<void>>();
export function syncStudy(repository:StudyRepository,client:SupabaseClient,owner:string,stillActive:()=>boolean=()=>true):Promise<void>{
  const active=activeSyncs.get(repository);if(active)return active;
  const task=runStudySync(repository,client,owner,stillActive).finally(()=>{if(activeSyncs.get(repository)===task)activeSyncs.delete(repository);});
  activeSyncs.set(repository,task);return task;
}
