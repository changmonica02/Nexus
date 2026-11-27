import { useState } from "react";
import type { Page } from "../../lib/types";
import { localDateTimeInput } from "../../lib/todoCalendar";
import { confirmDialog } from "../../lib/confirmDialog";
import ModalDialog from "../../components/ModalDialog";
import { useUnsavedDraft } from "../dictionary/useUnsavedDraft";
import TaskDetails from "./TaskDetails";
import { control } from "./dashboard/styles";

export default function CalendarTaskEditor({ page, update, remove, open, close }: {
  page: Page; update: (id:string, patch:Partial<Page>)=>void | Promise<unknown>;
  remove:(id:string)=>void | Promise<unknown>; open:()=>void; close:()=>void;
}) {
  const [draft,setDraft]=useState(page), [busy,setBusy]=useState(false), [error,setError]=useState("");
  const dirty=draft!==page;
  useUnsavedDraft(dirty,busy);
  const dismiss=async()=>{if(!busy&&(!dirty||await confirmDialog({title:"捨棄修改",message:"要捨棄任務的修改嗎？"})))close();};
  const save=async()=>{
    if(busy||!draft.title.trim())return;
    setBusy(true);setError("");
    const fields=['title','due_date','task_start_at','priority','task_steps','task_repeat','task_repeat_day'] as const;
    const patch=Object.fromEntries(fields.filter(key=>draft[key]!==page[key]).map(key=>[key,key==='title'?draft.title.trim():draft[key]]));
    try {await update(page.id,patch);close();}
    catch(error){setError(error instanceof Error?error.message:"儲存失敗，請重試");}
    finally{setBusy(false);}
  };
  return <ModalDialog aria-label="編輯任務" busy={busy} onDismiss={()=>void dismiss()} className="m-auto max-h-[90dvh] w-[min(94vw,42rem)] overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-[var(--color-text)] backdrop:bg-black/40">
    <h2 className="mb-4 text-xl font-semibold">編輯任務</h2>
    <fieldset disabled={busy} className="grid min-w-0 gap-3">
      <label className="grid gap-1">名稱<input required maxLength={500} className={control} value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})}/></label>
      <label className="grid gap-1">截止日期<input type="datetime-local" className={control} value={localDateTimeInput(draft.due_date)} onChange={event=>setDraft({...draft,due_date:event.target.value?new Date(event.target.value).getTime():null})}/></label>
      <TaskDetails page={draft} apply={patch=>setDraft({...draft,...patch})}/>
      {error&&<p role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={control} disabled={!draft.title.trim()} onClick={()=>void save()}>儲存</button>
        <button type="button" className={control} onClick={()=>void dismiss()}>取消</button>
        <button type="button" className={control} onClick={async()=>{if(!dirty||await confirmDialog({title:"捨棄修改",message:"要捨棄目前修改並開啟完整任務嗎？"})){close();open();}}}>開啟完整任務</button>
        <button type="button" className={control} onClick={async()=>{
          if(!await confirmDialog({title:"刪除任務",message:`確定將「${page.title}」移至垃圾桶？`,danger:true}))return;
          setBusy(true);setError("");try{await remove(page.id);close();}catch(error){setError(String(error));}finally{setBusy(false);}
        }}>刪除任務</button>
      </div>
    </fieldset>
  </ModalDialog>;
}
