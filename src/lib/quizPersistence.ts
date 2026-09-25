import type { IDBPDatabase, IDBPTransaction } from "idb";
import { isLearned } from "./studySessions";

// Mirrored by apply_study_quiz_operation; the integration test checks both boundaries.
export const QUIZ_SCORE = { min: 0, max: 4, wrong: 1, correct: 1 } as const;
export const QUIZ_STORES = ["quiz_attempts", "quiz_states", "quiz_outbox"];
export interface QuizPayload {
  event_id: string; owner_id: string; card_id: string; correct: boolean;
  answered_at: number; batch_id: string; local_sequence: number;
}
export interface QuizAttempt {
  id: string; owner_id: string; payload: QuizPayload;
  status: "awaiting_decision" | "authorized" | "synced" | "discarded" | "failed";
  error?: string;
}
export interface QuizState {
  owner_id: string; card_id: string; mistake_score: number; revision: number; updated_at: string;
}
type Tx = IDBPTransaction<unknown, string[], "readwrite">;
export class QuizRepository {
  private reachable = true;
  private confirmedConnection = false;
  constructor(private db: IDBPDatabase, private owner: () => string | null) {}
  setReachable(value: boolean) {
    const changed=this.confirmedConnection!==value;
    this.reachable = value; this.confirmedConnection=value;
    if(changed&&typeof window!=="undefined")window.dispatchEvent(new Event("nexus-quiz-connectivity"));
  }
  canOfferUpload() { return this.confirmedConnection&&(typeof navigator==="undefined"||navigator.onLine!==false); }
  private user() { const owner=this.owner(); if(!owner) throw new Error("Quiz 同步需要登入帳號。"); return owner; }
  private changed() { if(typeof window!=="undefined") window.dispatchEvent(new Event("nexus-study-changed")); }
  private async write<T>(run:(tx:Tx)=>Promise<T>):Promise<T> {
    const tx=this.db.transaction([...QUIZ_STORES,"study_cards","study_states"],"readwrite",{durability:"strict"});
    try { const result=await run(tx); await tx.done; this.changed(); return result; }
    catch(e) { try{tx.abort();}catch{} await tx.done.catch(()=>undefined); throw e; }
  }
  async record(input:{cardId:string;correct:boolean;batchId:string;eventId:string;now:number}):Promise<QuizAttempt> {
    const owner=this.user();
    return this.write(async tx=>{
      const existing:QuizAttempt|undefined=await tx.objectStore("quiz_attempts").get(input.eventId);
      if(existing) {
        const p=existing.payload;
        if(existing.owner_id!==owner||p.card_id!==input.cardId||p.correct!==input.correct||p.batch_id!==input.batchId||p.answered_at!==input.now) throw new Error("Quiz event ID collision");
        return existing;
      }
      const card=await tx.objectStore("study_cards").get(input.cardId);
      const state=await tx.objectStore("study_states").get(input.cardId);
      if(!card||card.owner_id!==owner||card.deleted_at!=null||!state||state.owner_id!==owner||!isLearned(state)) throw new Error("Quiz 字卡不存在、已刪除或尚未學習。");
      if(typeof input.correct!=="boolean"||!Number.isSafeInteger(input.now)||!input.batchId||!input.eventId) throw new Error("Invalid quiz attempt");
      const all:QuizAttempt[]=await tx.objectStore("quiz_attempts").getAll();
      const sequence=1+Math.max(0,...all.filter(a=>a.owner_id===owner&&a.payload.batch_id===input.batchId).map(a=>a.payload.local_sequence));
      const online=this.reachable&&(typeof navigator==="undefined"||navigator.onLine!==false);
      const attempt:QuizAttempt={id:input.eventId,owner_id:owner,status:online?"authorized":"awaiting_decision",
        payload:{event_id:input.eventId,owner_id:owner,card_id:input.cardId,correct:input.correct,answered_at:input.now,batch_id:input.batchId,local_sequence:sequence}};
      await tx.objectStore("quiz_attempts").add(attempt);
      if(online) await tx.objectStore("quiz_outbox").put(attempt);
      return attempt;
    });
  }
  async awaiting() { return (await this.attempts()).filter(a=>a.status==="awaiting_decision"); }
  async attempts():Promise<QuizAttempt[]> { const owner=this.user(); return (await this.db.getAll("quiz_attempts")).filter(a=>a.owner_id===owner); }
  // The UI supplies the exact IDs displayed in its confirmation, not an open-ended batch query.
  async decide(ids:string[],decision:"upload"|"discard"|"later") {
    const owner=this.user();
    return this.write(async tx=>{
      for(const id of new Set(ids)) {
        const a:QuizAttempt|undefined=await tx.objectStore("quiz_attempts").get(id);
        if(!a||a.owner_id!==owner) throw new Error("Quiz owner mismatch");
        if(a.status!=="awaiting_decision") continue;
        if(decision==="later") continue;
        a.status=decision==="upload"?"authorized":"discarded";
        await tx.objectStore("quiz_attempts").put(a);
        if(decision==="upload") await tx.objectStore("quiz_outbox").put(a);
      }
    });
  }
  async pending():Promise<QuizAttempt[]> {
    const owner=this.user();
    return (await this.db.getAll("quiz_outbox")).filter(a=>a.owner_id===owner&&a.status==="authorized")
      .sort((a,b)=>a.payload.batch_id.localeCompare(b.payload.batch_id)||a.payload.local_sequence-b.payload.local_sequence);
  }
  private async cache(tx:Tx,state:QuizState) {
    const owner=this.user();
    if(state.owner_id!==owner||!Number.isSafeInteger(state.revision)||state.revision<0||!Number.isInteger(state.mistake_score)||state.mistake_score<QUIZ_SCORE.min||state.mistake_score>QUIZ_SCORE.max) throw new Error("Invalid quiz server state");
    const card=await tx.objectStore("study_cards").get(state.card_id);
    if(!card||card.owner_id!==owner) throw new Error("Quiz cache card owner mismatch");
    const id=JSON.stringify([owner,state.card_id]);
    const old=await tx.objectStore("quiz_states").get(id);
    if(!old||state.revision>old.revision) await tx.objectStore("quiz_states").put({...state,id});
  }
  async accept(id:string,state:QuizState) {
    return this.write(async tx=>{
      const a:QuizAttempt=await tx.objectStore("quiz_attempts").get(id);
      if(!a||a.owner_id!==this.user()||a.payload.card_id!==state.card_id||!["authorized","synced"].includes(a.status)) throw new Error("Quiz acknowledgement mismatch");
      await this.cache(tx,state);
      await tx.objectStore("quiz_attempts").put({...a,status:"synced"});
      await tx.objectStore("quiz_outbox").delete(id);
    });
  }
  async fail(id:string,error:string) {
    return this.write(async tx=>{
      const a:QuizAttempt=await tx.objectStore("quiz_attempts").get(id);
      if(!a||a.owner_id!==this.user()) throw new Error("Quiz owner mismatch");
      await tx.objectStore("quiz_attempts").put({...a,status:"failed",error});
      await tx.objectStore("quiz_outbox").delete(id);
    });
  }
  async merge(states:QuizState[]) { return this.write(async tx=>{for(const state of states) await this.cache(tx,state);}); }
  async states():Promise<QuizState[]> { const owner=this.user();return (await this.db.getAll("quiz_states")).filter(s=>s.owner_id===owner); }
}
