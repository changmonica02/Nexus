import { useEffect, useState } from "react";
import type { TimerResult } from "./syncRecords";
import { control, surface } from "./dashboard/styles";

export const timerModes = { countdown: "倒數計時", stopwatch: "碼錶", pomodoro: "番茄鐘" } as const;
type Mode = keyof typeof timerModes;
export type TimerState = { mode: Mode; duration: number; elapsed: number; startedAt: number | null; runId?: string };
export const initialTimer: TimerState = { mode: "countdown", duration: 300, elapsed: 0, startedAt: null };

export function readTimer(owner: string | null): TimerState {
  try {
    const value = JSON.parse(localStorage.getItem(timerKey(owner)) ?? sessionStorage.getItem(timerKey(owner)) ?? "null");
    if (value && Object.hasOwn(timerModes, value.mode) && Number.isFinite(value.duration)
      && value.duration > 0 && Number.isFinite(value.elapsed) && value.elapsed >= 0
      && (value.startedAt === null || Number.isFinite(value.startedAt))) return value;
  } catch {}
  return initialTimer;
}

export const timerKey = (owner: string | null) => "nexus-life-timer:" + JSON.stringify(owner);

export function timerStatus(state: TimerState, now: number) {
  if (state.startedAt === null) return state.elapsed > 0 ? "已暫停" : "待開始";
  return state.mode !== "stopwatch" && now - state.startedAt + state.elapsed >= state.duration * 1000 ? "計時完成" : "計時中";
}

export default function LifeTimer({ state, change, history = [], tasks = [], sessions = [], save }: {
  state: TimerState; change: (state: TimerState) => void; history?: TimerResult[];
  tasks?: {id:string;title:string}[]; sessions?: {id:string;title:string}[];
  save?: (result: {id:string;mode:Mode;ended_at:number;elapsed_ms:number;task_id:string|null;study_session_id:string|null})=>Promise<void>;
}) {
  const [task,setTask]=useState("");
  const [session,setSession]=useState("");
  const [saving,setSaving]=useState(false);
  const [problem,setProblem]=useState("");
  const [lastSaved,setLastSaved]=useState("");

  const [now, setNow] = useState(Date.now);
  const { mode, duration, elapsed, startedAt } = state;
  useEffect(() => {
    if (startedAt === null) return;
    const pulse = () => setNow(Date.now());
    const ticker = window.setInterval(pulse, 200);
    document.addEventListener("visibilitychange", pulse);
    return () => { window.clearInterval(ticker); document.removeEventListener("visibilitychange", pulse); };
  }, [startedAt]);
  const elapsedMs = elapsed + (startedAt === null ? 0 : Math.max(0, now - startedAt));
  const complete = mode !== "stopwatch" && elapsedMs >= duration * 1000;
  const seconds = mode === "stopwatch" ? Math.floor(elapsedMs / 1000) : Math.max(0, Math.ceil(duration - elapsedMs / 1000));
  const display = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, "0")).join(":");
  const running = startedAt !== null && !complete;
  const saved = !!state.runId && (history.some(result => result.id === state.runId)||lastSaved===state.runId);
  const canSave=!!save&&!!state.runId&&!saved&&(complete||mode==="stopwatch"&&startedAt===null&&elapsedMs>0);
  return <section className={surface + " space-y-4"}>
    <h2 className="text-xl font-semibold">計時工具</h2>
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">計時模式</legend>
      {(Object.keys(timerModes) as Mode[]).map(item => <button key={item} type="button" className={control} aria-pressed={mode === item}
        onClick={() => change({ mode: item, duration: item === "pomodoro" ? 1500 : 300, elapsed: 0, startedAt: null })}>{timerModes[item]}</button>)}
    </fieldset>
    {mode !== "stopwatch" && <label className="grid max-w-xs gap-1">分鐘<input className={control} type="number" min="1" max="720"
      disabled={running} value={duration / 60} onChange={event => {
        const minutes = event.target.valueAsNumber;
        if (Number.isInteger(minutes) && minutes >= 1 && minutes <= 720) {
          change({ ...state, duration: minutes * 60, startedAt: null, elapsed: 0, runId: undefined });
        }
      }}/></label>}
    {mode === "pomodoro" && <div className="flex gap-2">{[25, 5].map((minutes, index) =>
      <button key={minutes} className={control} disabled={running} onClick={() =>
        change({ ...state, duration: minutes * 60, startedAt: null, elapsed: 0, runId: undefined })}>{index === 0 ? "專注 25 分鐘" : "休息 5 分鐘"}</button>)}</div>}
    <p className="text-4xl font-semibold tabular-nums" aria-label="計時讀數">{display}</p>
    {complete && <p role="status">計時完成</p>}
    <div className="flex flex-wrap gap-2">
      <button className={control} disabled={saving} onClick={() => {
        const stamp = Date.now();
        setNow(stamp);
        change(running && startedAt !== null ? { ...state, elapsed: elapsed + Math.max(0, stamp - startedAt), startedAt: null }
          : { ...state, startedAt: stamp, elapsed: complete||saved ? 0 : elapsed, runId: !state.runId||complete||saved?crypto.randomUUID():state.runId });
      }}>{running ? "暫停" : elapsed && !complete ? "繼續" : "開始"}</button>
      <button className={control} onClick={() => change({ ...state, elapsed: 0, startedAt: null, runId: undefined })}>重設</button>
    </div>
    {canSave&&<div className="grid gap-2 sm:grid-cols-2">
      <label className="grid gap-1">關聯任務<select className={control} value={task} onChange={event=>setTask(event.target.value)}>
        <option value="">未關聯</option>{tasks.map(row=><option key={row.id} value={row.id}>{row.title}</option>)}
      </select></label>
      <label className="grid gap-1">關聯學習紀錄<select className={control} value={session} onChange={event=>setSession(event.target.value)}>
        <option value="">未關聯</option>{sessions.map(row=><option key={row.id} value={row.id}>{row.title}</option>)}
      </select></label>
      <button className={control} disabled={saving} type="button" onClick={async()=>{
        if (!save||!state.runId||saving) return;
        setSaving(true);setProblem("");
        try{
          const ended_at=complete&&startedAt!==null?startedAt+duration*1000-elapsed:Date.now();
          await save({id:state.runId,mode,ended_at,elapsed_ms:complete?duration*1000:elapsedMs,task_id:task||null,study_session_id:session||null});
          setLastSaved(state.runId);
        }catch(error){setProblem(error instanceof Error?error.message:"記錄儲存失敗");}
        finally{setSaving(false);}
      }}>儲存計時結果</button>
    </div>}
    {problem&&<p role="alert">{problem}</p>}
    {!!history.length&&<section className="space-y-2"><h3 className="font-semibold">計時歷史</h3>
      <ul className="divide-y divide-[var(--color-border)]">{history.map(row=><li key={row.id} className="py-2">
        {timerModes[row.mode]} ・{Math.round(row.elapsed_ms/1000)} 秒 ・{new Date(row.ended_at).toLocaleString()}
        {row.task_id&&<span className="block text-sm">{tasks.find(task=>task.id===row.task_id)?.title??"已連結任務"}</span>}
        {row.study_session_id&&<span className="block text-sm">{sessions.find(session=>session.id===row.study_session_id)?.title??"已連結學習紀錄"}</span>}
      </li>)}</ul>
    </section>}
  </section>;
}
