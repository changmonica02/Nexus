"use client";
import { useRef, useState } from "react";
import type { StudyRepository } from "../StudyRepository";
import type { StudySnapshot } from "../studyFSRS";
import { canStartQuiz, createQuizSubmission, DEFAULT_QUIZ_DIRECTION, nextQuizQuestion, quizEligible,
  QUIZ_REQUIRED_ANSWERS, saveQuizAnswer, type QuizDirection, type QuizQuestion } from "./quizQuestions";

export default function QuizSession({repository,snapshot,onExit}:{repository:StudyRepository;snapshot:StudySnapshot;onExit:()=>void}) {
  const direction=snapshot.settings.quiz_direction??DEFAULT_QUIZ_DIRECTION;
  const quiz=repository.getQuizRepository();
  const [question,setQuestion]=useState<QuizQuestion|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const [saved,setSaved]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [score,setScore]=useState({correct:0,total:0}),[limit,setLimit]=useState(0);
  const lock=useRef(false),batch=useRef(""),submission=useRef<ReturnType<typeof createQuizSubmission>|null>(null);
  const [finished,setFinished]=useState(false);
  const draw=async(start=false)=>{
    if(lock.current||!quiz)return;lock.current=true;setBusy(true);setError("");
    try{
      const fresh=await repository.readDeck(snapshot.settings.id);
      const nextDirection=fresh.settings.quiz_direction??DEFAULT_QUIZ_DIRECTION;
      const next=nextQuizQuestion(fresh,await quiz.states(),nextDirection,start?null:question?.cardId??null,Date.now());
      if(start){batch.current=crypto.randomUUID();setLimit(quizEligible(fresh).length);setScore({correct:0,total:0});}
      setQuestion(next);setSelected(null);setSaved(false);setFinished(false);submission.current=null;
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{lock.current=false;setBusy(false);}
  };
  const choose=async(choice:string)=>{
    if(!question||!quiz||lock.current||saved)return;
    lock.current=true;setBusy(true);setError("");
    submission.current??=createQuizSubmission(question,choice,batch.current,Date.now());
    setSelected(choice);
    try{
      await saveQuizAnswer(quiz,submission.current);
      setSaved(true);setScore(s=>({correct:s.correct+(submission.current!.correct?1:0),total:s.total+1}));
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{lock.current=false;setBusy(false);}
  };
  const changeDirection=async(value:QuizDirection)=>{
    if(lock.current)return;lock.current=true;setBusy(true);setError("");
    try{await repository.configure(snapshot.settings.id,{quiz_direction:value});}
    catch(e){setError(String(e));}finally{lock.current=false;setBusy(false);}
  };
  return <div className="mx-auto flex max-w-lg flex-col items-center gap-5 py-8">
    <h2 className="text-lg font-semibold">單字測驗</h2>
    <label className="text-sm">測驗方向 <select aria-label="測驗方向" disabled={busy||!!question&&!finished}
      value={question&&!finished?question.direction:direction} onChange={e=>void changeDirection(e.target.value as QuizDirection)}
      className="rounded border bg-transparent px-3 py-2"><option value="zh-en">中文 → 英文</option><option value="en-zh">英文 → 中文</option></select></label>
    <p className="text-xs opacity-60">四選一辨認測驗；作答只更新測驗錯題權重，不影響 FSRS 或單字複習進度。</p>
    {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
    {busy&&<p role="status" className="text-sm">正在儲存／載入…</p>}
    {!question||finished?<>
      {finished&&<p className="text-lg">本次測驗完成：答對 {score.correct} / {score.total} 題</p>}
      {!canStartQuiz(snapshot,direction)&&<p role="status">{QUIZ_REQUIRED_ANSWERS}</p>}
      {!quiz&&<p role="alert">測驗資料庫尚未準備完成。</p>}
      <button className="rounded border px-5 py-3 disabled:opacity-40" disabled={busy||!quiz||!canStartQuiz(snapshot,direction)} onClick={()=>void draw(true)}>{finished?"再測一次":"開始測驗"}</button>
    </>:<>
      <p className="text-xs opacity-60">第 {Math.min(score.total+(saved?0:1),limit)} / {limit} 題・答對 {score.correct} 題</p>
      <div className="w-full whitespace-pre-wrap rounded-2xl border p-8 text-center text-xl" lang={question.direction==="zh-en"?"zh":"en"} style={{background:"var(--color-sidebar-bg)"}}>{question.prompt}</div>
      <div className="w-full space-y-2">{question.choices.map((choice,i)=><button key={choice} onClick={()=>void choose(choice)}
        disabled={busy||selected!=null} className="w-full whitespace-pre-wrap rounded-xl border-2 px-5 py-4 text-left disabled:cursor-default"
        lang={question.direction==="zh-en"?"en":"zh"}
        style={{borderColor:selected!=null&&choice===question.answer?"#15803d":selected===choice?"#dc2626":"var(--color-border)"}}>
        <span className="mr-2 opacity-50">{String.fromCharCode(65+i)}.</span>{choice}
      </button>)}</div>
      {selected!=null&&<>
        <p role="status" className={selected===question.answer?"text-green-600":"text-red-600"}>{selected===question.answer?"答對了！":<>答錯了，正確答案：<strong>{question.answer}</strong></>}</p>
        {!saved?<button disabled={busy} className="rounded border px-4 py-2" onClick={()=>void choose(selected)}>重試儲存本題作答</button>:
          <button disabled={busy} className="rounded border px-4 py-2" onClick={()=>{if(score.total>=limit)setFinished(true);else void draw();}}>{score.total>=limit?"完成測驗":"下一題"}</button>}
      </>}
    </>}
    <button disabled={busy} className="text-sm underline opacity-60" onClick={onExit}>返回全部預覽</button>
  </div>;
}
