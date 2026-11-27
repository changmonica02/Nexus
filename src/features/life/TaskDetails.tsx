import { useState } from "react";
import { localDateTimeInput } from "../../lib/todoCalendar";
import type { Page } from "../../lib/types";
import { control } from "./dashboard/styles";

export default function TaskDetails({ page, apply }: {
  page: Page;
  apply: (patch: Partial<Pick<Page, "task_start_at" | "priority" | "task_steps" | "task_repeat" | "task_repeat_day">>) => void;
}) {
  const [title, setTitle] = useState("");
  const steps = page.task_steps ?? [];
  const addStep = () => {
    if (!title.trim() || steps.length >= 50) return;
    apply({ task_steps: [...steps, { id: crypto.randomUUID(), title: title.trim(), done: false }] });
    setTitle("");
  };
  return <>
    <label className="grid min-w-0 gap-1">開始日期<input type="datetime-local" className={control} value={localDateTimeInput(page.task_start_at)}
      onChange={event => {
        const value = event.target.value ? new Date(event.target.value).getTime() : null;
        if (value === null || Number.isFinite(value)) apply({ task_start_at: value });
      }}/></label>
    <label className="grid gap-1">優先順序<select className={control} value={page.priority ?? ""}
      onChange={event => apply({ priority: (event.target.value || null) as Page["priority"] })}>
      <option value="">未設定</option><option value="low">低</option><option value="medium">中</option><option value="high">高</option>
    </select></label>
    <label className="grid gap-1">重複週期<select className={control} value={page.task_repeat ?? ""}
      onChange={event => apply({ task_repeat: (event.target.value || null) as Page["task_repeat"], task_repeat_day: null })}>
      <option value="">不重複</option><option value="daily">每天</option><option value="weekly">每週</option><option value="monthly">每月</option><option value="after_completion">完成後再安排</option>
    </select></label>
    {page.task_repeat === "after_completion" && <label className="grid gap-1">完成後間隔天數
      <input type="number" className={control} min="1" max="31" step="1" value={page.task_repeat_day ?? 1}
        onChange={event => {
          const days = event.target.valueAsNumber;
          if (Number.isInteger(days) && days >= 1 && days <= 31) apply({ task_repeat_day: days });
        }}/></label>}
    {page.task_repeat && page.task_repeat !== "after_completion" && page.due_date == null && <p className="text-sm">設定截止日期後，完成任務才會產生下一次。</p>}
    <details className="min-w-0 basis-full">
      <summary className="cursor-pointer py-1">子任務 · {steps.filter(step => step.done).length}/{steps.length}</summary>
      <ul className="max-h-32 overflow-auto">{steps.map(step => <li key={step.id} className="flex items-center gap-2">
        <input type="checkbox" aria-label={`完成子任務 ${step.title}`} checked={step.done} onChange={event =>
          apply({ task_steps: steps.map(item => item.id === step.id ? { ...item, done: event.target.checked } : item) })}/>
        <input aria-label="子任務名稱" className={control + " flex-1"} maxLength={120} value={step.title}
          onChange={event => apply({ task_steps: steps.map(item => item.id === step.id ? { ...item, title: event.target.value } : item) })}/>
        <button type="button" className={control} aria-label={`移除子任務 ${step.title}`}
          onClick={() => apply({ task_steps: steps.filter(item => item.id !== step.id) })}>移除</button>
      </li>)}</ul>
      <div className="mt-2 flex gap-2">
        <input aria-label="新增子任務名稱" className={control + " flex-1"} maxLength={120} value={title}
          onKeyDown={event => {
            if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
            event.preventDefault();
            addStep();
          }} onChange={event => setTitle(event.target.value)}/>
        <button type="button" className={control} disabled={!title.trim() || steps.length >= 50} onClick={addStep}>新增子任務</button>
      </div>
    </details>
  </>;
}
