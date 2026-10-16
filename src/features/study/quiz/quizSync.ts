/** Legacy compatibility only; not imported by product entry points. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuizRepository, QuizState } from "./quizPersistence";

export async function syncQuiz(repo:QuizRepository,client:SupabaseClient,owner:string,active:()=>boolean=()=>true) {
  try {
    for(const attempt of await repo.pending()) {
      if(!active())return;
      if(attempt.owner_id!==owner)throw new Error("Quiz sync owner mismatch");
      const {data,error}=await client.rpc("apply_study_quiz_operation",{attempt:attempt.payload});
      if(!active())return;
      if(error) {
        // Only a definitive server rejection is terminal. Transport/unknown outcomes stay retryable.
        if(error.code==="P0001"&&["QUIZ_CARD_UNAVAILABLE","QUIZ_EVENT_COLLISION","QUIZ_INVALID_ATTEMPT","QUIZ_OWNER_MISMATCH"].includes(error.message)) {
          await repo.fail(attempt.id,error.message); continue;
        }
        throw new Error(error.message);
      }
      await repo.accept(attempt.id,data as QuizState);
    }
    let offset=0;
    while(active()) {
      const {data,error}=await client.from("study_card_quiz_states").select("*").eq("owner_id",owner).order("card_id").range(offset,offset+499);
      if(error)throw new Error(error.message);
      if(!active())return;
      await repo.merge((data??[]) as QuizState[]);
      if(!data||data.length<500)break;
      offset+=data.length;
    }
    if(active())repo.setReachable(true);
  } catch(e) { repo.setReachable(false);throw e; }
}
