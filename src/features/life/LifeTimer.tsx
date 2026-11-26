import { useEffect, useState } from "react";
import { control, surface } from "./dashboard/styles";

export const timerModes = { countdown: "倒數計時", stopwatch: "碼錶", pomodoro: "番茄鐘" } as const;
type Mode = keyof typeof timerModes;
export type TimerState = { mode: Mode; duration: number; elapsed: number; startedAt: number | null };
export const initialTimer: TimerState = { mode: "countdown", duration: 300, elapsed: 0, startedAt: null };

export function readTimer(owner: string | null): TimerState {
  try {
    const value = JSON.parse(sessionStorage.getItem(timerKey(owner)) ?? "null");
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

export default function LifeTimer({ state, change }: { state: TimerState; change: (state: TimerState) => void }) {
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
          change({ ...state, duration: minutes * 60, startedAt: null, elapsed: 0 });
        }
      }}/></label>}
    {mode === "pomodoro" && <div className="flex gap-2">{[25, 5].map((minutes, index) =>
      <button key={minutes} className={control} disabled={running} onClick={() =>
        change({ ...state, duration: minutes * 60, startedAt: null, elapsed: 0 })}>{index === 0 ? "專注 25 分鐘" : "休息 5 分鐘"}</button>)}</div>}
    <p className="text-4xl font-semibold tabular-nums" aria-label="計時讀數">{display}</p>
    {complete && <p role="status">計時完成</p>}
    <div className="flex flex-wrap gap-2">
      <button className={control} onClick={() => {
        const stamp = Date.now();
        setNow(stamp);
        change(running && startedAt !== null ? { ...state, elapsed: elapsed + Math.max(0, stamp - startedAt), startedAt: null }
          : { ...state, startedAt: stamp, elapsed: complete ? 0 : elapsed });
      }}>{running ? "暫停" : elapsed && !complete ? "繼續" : "開始"}</button>
      <button className={control} onClick={() => change({ ...state, elapsed: 0, startedAt: null })}>重設</button>
    </div>
  </section>;
}
