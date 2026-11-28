import { useState } from "react";
import ModalDialog from "../../../components/ModalDialog";
import { confirmDialog } from "../../../lib/confirmDialog";
import type { LifeRepository } from "../LifeRepository";
import { useUnsavedDraft } from "../../dictionary/useUnsavedDraft";
import { control } from "../dashboard/styles";
import { encodeDraft, fieldsFor, initialDraft, kindLabels, populateDraft, type EditableKind } from "./financeFields";
import { recurringTerms } from "./ledger";
import { financeRow, type FinanceRecord } from "./model";

export type FinanceEdit = { kind: EditableKind; row?: FinanceRecord; preset?: Record<string, string>; occurrence?: string };

export default function FinanceEditor({ editor, records, base, categories, date, repository, owner, close, upload, download, hideAmounts, saveLinked }: {
  editor: FinanceEdit; records: FinanceRecord[]; base: string; categories: string[]; date: Date;
  repository: LifeRepository; owner: string | null; saveLinked?:(row:FinanceRecord)=>Promise<void>; close: () => void; hideAmounts?: boolean;
  upload?: (file: File) => Promise<string>; download?: (id: string) => Promise<void>;
}) {
  const { kind, row, preset, occurrence } = editor;
  const [scope, setScope] = useState<"single" | "future" | "all">(occurrence ? "single" : "all");
  const [draft, setDraft] = useState(() => row ? populateDraft(row.kind === "subscription" && occurrence ? { ...row, payload: { ...row.payload, ...recurringTerms(row.payload, occurrence), next: occurrence } } : row, base, date, records, categories)
    : { ...initialDraft(kind, base, date), ...preset });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [dirty, setDirty] = useState(false);
  useUnsavedDraft(dirty, busy);
  const fields = fieldsFor(kind, draft, records, categories, !!row);

  async function submit(remove = false) {
    if (busy) return;
    setBusy(true);
    setProblem("");
    try {
      if (remove && row) await repository.saveFinance(row, true);
      else {
        const previousNext = row?.kind === "subscription" ? (scope === "all" ? row.payload.next : occurrence ?? row.payload.next) : undefined;
        const payload = encodeDraft(kind, draft, fields, { previousNext });
        if (kind === "instrument") {
          const date = String(payload.priceDate);
          delete payload.priceDate;
          const history={...(row?.kind==="instrument"?row.payload.prices:{})};
          if(payload.price)history[date]=String(payload.price);
          else delete history[date];
          Object.assign(payload,{prices:history,price:history[Object.keys(history).sort().at(-1)??""]??""});
        }
        if(row?.kind==="transaction"&&row.payload.taskOccurrence)Object.assign(payload,{
          task:row.payload.task,taskOccurrence:row.payload.taskOccurrence,taskRunOnce:row.payload.taskRunOnce,
        });
        const next = row ? { ...row, payload } as FinanceRecord
          : financeRow(owner, kind, payload as never,
            undefined);
        if (row?.kind === "subscription" && next.kind === "subscription") {
          await repository.editRecurringFinance(row, next.payload, scope === "all" ? row.payload.next : occurrence ?? row.payload.next, scope);
        } else if(saveLinked)await saveLinked(next);
        else await repository.saveFinance(next);
      }
      close();
    } catch (error) { setProblem(error instanceof Error ? error.message : "儲存失敗"); }
    finally { setBusy(false); }
  }

  const title = (row ? "編輯" : "新增") + kindLabels[kind];
  const dismiss = async () => {
    if (!busy && (!dirty || await confirmDialog({ title: "捨棄修改", message: "要捨棄表單中的變更嗎？" }))) close();
  };
  return <ModalDialog aria-label={title} busy={busy} onDismiss={() => void dismiss()}
    className="m-auto max-h-[90dvh] w-[min(94vw,42rem)] overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-[var(--color-text)] backdrop:bg-black/40">
    <h2 className="mb-4 text-xl font-semibold">{title}</h2>
    <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-4">
      <fieldset disabled={busy} className="grid min-w-0 gap-3 sm:grid-cols-2">
        {row?.kind === "subscription" && occurrence && <label className="grid gap-1">套用範圍
          <select className={control} value={scope} onChange={event => {
            const value = event.target.value as typeof scope;
            setScope(value);
            setDraft(current => ({ ...current, next: value === "all" ? row.payload.next : occurrence }));
            setDirty(true);
          }}><option value="single">僅本次</option><option value="future">本次及後續</option><option value="all">整個系列</option></select>
        </label>}
        {fields.filter(item => !occurrence || scope !== "single" || !["cycle", "interval", "next", "until", "trial", "url", "state", "icon"].includes(item.key)).map(item => {
          const update = (value: string) => { setDirty(true); setDraft(current => ({ ...current, [item.key]: value })); };
          const label=item.label+(item.currency?`（${item.currency}）`:"");
          return <label key={item.key} className={item.type === "check" ? "flex min-h-11 items-center gap-2" : "grid min-w-0 gap-1"}>
            {item.type === "check" ? <><input type="checkbox" checked={!!draft[item.key]} onChange={event => update(event.target.checked ? "1" : "")}/>{item.label}</> : <>
              {item.label}{item.currency && <span className="sr-only">（{item.currency}）</span>}
              {item.options ? <select aria-label={label} className={control} value={draft[item.key]} required={item.required} disabled={item.lock}
                onChange={event => update(event.target.value)}>{item.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                : item.type === "textarea" ? <textarea aria-label={label} className={control} rows={2} maxLength={4000} value={draft[item.key]} onChange={event => update(event.target.value)}/>
                  : <input aria-label={label} className={control} type={item.type === "money" || item.type === "quantity" ? hideAmounts ? "password" : "text" : item.type ?? "text"}
                    inputMode={item.type === "money" || item.type === "quantity" ? "decimal" : undefined}
                    required={item.required} value={draft[item.key]} onChange={event => update(event.target.value)}/>}
            </>}
          </label>;
        })}
        {kind === "transaction" && upload && <label className="grid min-w-0 gap-1">交易附件<input className={control} type="file" onChange={async event => {
          const file = event.target.files?.[0];
          if (!file) return;
          setProblem("");
          setBusy(true);
          try {
            const id = await upload(file);
            setDraft(current => ({ ...current, attachment: id }));
            setDirty(true);
          } catch (error) { setProblem(error instanceof Error ? error.message : "附件上傳失敗"); }
          finally { setBusy(false); }
        }}/></label>}
      </fieldset>
      {kind === "transaction" && draft.attachment && <div className="flex gap-2">
        {download && <button type="button" className={control} onClick={() => void download(draft.attachment).catch(error => setProblem(String(error.message)))}>下載附件</button>}
        <button type="button" className={control} onClick={() => { setDirty(true); setDraft(current => ({ ...current, attachment: "" })); }}>解除附件連結</button>
      </div>}
      {problem && <p role="alert">{problem}</p>}
      <div className="flex flex-wrap gap-2">
        <button className={control} disabled={busy}>儲存</button><button type="button" className={control} disabled={busy} onClick={() => void dismiss()}>取消</button>
        {row && row.kind !== "account" && row.kind !== "subscription" && <button type="button" className={control} disabled={busy} onClick={async () => {
          if (await confirmDialog({ title: "刪除財務紀錄", message: `確定刪除「${"title" in row.payload ? row.payload.title : ""}」？`, danger: true })) await submit(true);
        }}>刪除</button>}
      </div>
    </form>
  </ModalDialog>;
}
