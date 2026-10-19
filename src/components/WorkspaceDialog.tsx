"use client";
import ModalDialog from "./ModalDialog";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type Request = { title: string; kind: "text" | "confirm"; initial?: string };
export function useWorkspaceDialog() {
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState("");
  const resolveRef = useRef<((result: string | boolean | null) => void) | null>(null);
  const dialogRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const finish = useCallback((result: string | boolean | null) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setRequest(null);
  }, []);
  useEffect(() => () => { resolveRef.current?.(null); }, []);
  useEffect(() => {
    if (request) dialogRef.current?.querySelector<HTMLElement>("input, button")?.focus();
  }, [request]);
  const ask = useCallback((next: Request) => new Promise<string | boolean | null>((resolve) => {
    resolveRef.current?.(null);
    resolveRef.current = resolve;
    setValue(next.initial || "");
    setRequest(next);
  }), []);
  const askText = useCallback(async (title: string, initial = "") => {
    const result = await ask({ title, initial, kind: "text" });
    return typeof result === "string" ? result : null;
  }, [ask]);
  const askConfirm = useCallback(async (title: string) => (await ask({ title, kind: "confirm" })) === true, [ask]);
  const dialog = request && <ModalDialog onDismiss={()=>finish(null)} dismissOnBackdrop aria-labelledby={titleId}
    className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border p-5 shadow-xl backdrop:bg-black/50" style={{backgroundColor:"var(--color-bg)",borderColor:"var(--color-border)",color:"var(--color-text)"}}>
    <form ref={dialogRef} onSubmit={event=>{event.preventDefault();finish(request.kind === "text" ? value : true);}}>
      <h2 id={titleId} className="mb-4 text-base font-semibold">{request.title}</h2>
      {request.kind === "text" && <input aria-label={request.title} value={value} onChange={(event) => setValue(event.target.value)} className="mb-4 w-full rounded-lg border bg-transparent px-3 py-2" />}
      <div className="flex justify-end gap-3"><button type="button" onClick={() => finish(null)} className="rounded-lg border px-4 py-2 text-sm">取消</button><button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">確認</button></div>
    </form>
  </ModalDialog>;
  return { askText, askConfirm, dialog };
}
