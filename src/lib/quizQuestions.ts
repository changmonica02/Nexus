import { schedulerCard, studyScheduler, type StudyCard, type StudySnapshot, type StudyState } from "./studyFSRS";
import { isLearned } from "./studySessions";
import { QUIZ_SCORE, type QuizRepository, type QuizState } from "./quizPersistence";

export type QuizDirection = "zh-en" | "en-zh";
export const DEFAULT_QUIZ_DIRECTION: QuizDirection = "zh-en";
export const QUIZ_REQUIRED_ANSWERS = "至少需要 4 個不同答案的已學習單字才能進行測驗";
export const QUIZ_WEIGHT = { BASE_WEIGHT: 1, NEW_CARD_BONUS: 0.5, MAX_FSRS_BONUS: 1,
  MISTAKE_BONUS_PER_POINT: 0.25, MAX_TOTAL_WEIGHT: 3 } as const;
export function quizEligible(snapshot:StudySnapshot) {
  const states=new Map(snapshot.states.map(s=>[s.id,s]));
  return snapshot.cards.filter(c=>c.deleted_at==null&&typeof c.front==="string"&&!!c.front.trim()&&typeof c.back==="string"&&!!c.back.trim()&&
    states.has(c.id)&&isLearned(states.get(c.id)!));
}
const answer=(card:StudyCard,direction:QuizDirection)=>(direction==="zh-en"?card.front:card.back).trim();
export function canStartQuiz(snapshot:StudySnapshot,direction:QuizDirection) {
  return new Set(quizEligible(snapshot).map(c=>answer(c,direction))).size>=4;
}
export function quizWeight(state:StudyState,mistakeScore:number,now:number) {
  const retrievability=state.fsrs==null?null:studyScheduler.get_retrievability(schedulerCard(state,now),new Date(now),false);
  const memoryBonus=retrievability==null?QUIZ_WEIGHT.NEW_CARD_BONUS:
    QUIZ_WEIGHT.MAX_FSRS_BONUS*(1-Math.max(0,Math.min(1,Number.isFinite(retrievability)?retrievability:1)));
  const score=Number.isFinite(mistakeScore)?Math.max(QUIZ_SCORE.min,Math.min(QUIZ_SCORE.max,mistakeScore)):0;
  const mistakeBonus=score*QUIZ_WEIGHT.MISTAKE_BONUS_PER_POINT;
  return {retrievability,memoryBonus,mistakeBonus,
    weight:Math.min(QUIZ_WEIGHT.MAX_TOTAL_WEIGHT,QUIZ_WEIGHT.BASE_WEIGHT+memoryBonus+mistakeBonus)};
}
function shuffle<T>(items:T[],rng:()=>number) {
  const copy=[...items];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
export interface QuizQuestion { cardId:string; prompt:string; answer:string; choices:string[]; direction:QuizDirection }
export function nextQuizQuestion(snapshot:StudySnapshot,states:QuizState[],direction:QuizDirection,previousId:string|null,now:number,rng:()=>number=Math.random):QuizQuestion {
  if(!canStartQuiz(snapshot,direction))throw new Error(QUIZ_REQUIRED_ANSWERS);
  const eligible=quizEligible(snapshot),candidates=eligible.length>1?eligible.filter(c=>c.id!==previousId):eligible;
  const weights=candidates.map(c=>quizWeight(snapshot.states.find(s=>s.id===c.id)!,states.find(s=>s.card_id===c.id&&s.owner_id===c.owner_id)?.mistake_score??0,now).weight);
  let threshold=rng()*weights.reduce((a,b)=>a+b,0),card=candidates[candidates.length-1];
  for(let i=0;i<candidates.length;i++){threshold-=weights[i];if(threshold<0){card=candidates[i];break;}}
  const correct=answer(card,direction);
  const distractors=[...new Set(eligible.filter(c=>c.id!==card.id).map(c=>answer(c,direction)).filter(value=>value!==correct))];
  return {cardId:card.id,prompt:(direction==="zh-en"?card.back:card.front).trim(),answer:correct,direction,
    choices:shuffle([correct,...shuffle(distractors,rng).slice(0,3)],rng)};
}
// A question owns one immutable submission so a storage retry retains the event identity and answer.
export function createQuizSubmission(question:QuizQuestion,choice:string,batchId:string,now:number,eventId=crypto.randomUUID()) {
  if(!question.choices.includes(choice))throw new Error("無效測驗選項");
  return {cardId:question.cardId,correct:choice===question.answer,batchId,eventId,now};
}
export async function saveQuizAnswer(repo:QuizRepository,submission:ReturnType<typeof createQuizSubmission>) {
  return repo.record(submission);
}
