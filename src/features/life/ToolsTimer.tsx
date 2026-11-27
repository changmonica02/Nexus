"use client";
import { useEffect, useMemo, useState } from "react";
import type { StorageAdapter } from "../../infrastructure/storage/StorageAdapter";
import type { Page } from "../../lib/types";
import LifeTimer, { readTimer, timerKey } from "./LifeTimer";
import type { TimerResult } from "./syncRecords";
export default function ToolsTimer({ storage, pages }: { storage: StorageAdapter; pages: Page[] }) {
  const owner = storage.getWorkspaceOwner?.() ?? null;
  const repository = useMemo(()=>storage.getLifeRepository?.(),[storage]);
  const [timer, setTimer] = useState(() => readTimer(owner));
  const [history, setHistory] = useState<TimerResult[]>([]);
  const [sessions, setSessions] = useState<{ id: string; title: string }[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true, sequence = 0;
    const load = () => {
      if (!repository) return;
      const request = ++sequence;
      void Promise.all([repository.readTimerHistory(), repository.readTimerStudySessions()]).then(([rows, study]) => {
        if (!active || request !== sequence) return;
        setHistory(rows); setError("");
        setSessions(study.map(session => ({ id: session.id, title: (pages.find(page => page.id === session.deck_id)?.title ?? "學習紀錄") + " " + new Date(session.ended_at ?? session.completed_at ?? 0).toLocaleDateString() })));
      }).catch(error => { if (active && request === sequence) setError(String(error.message)); });
    };
    const sync = (event: StorageEvent) => { if (event.key === timerKey(owner)) setTimer(readTimer(owner)); };
    load(); window.addEventListener("storage", sync); window.addEventListener("nexus-workspace-changed", load); window.addEventListener("nexus-workspace-refreshed", load);
    return () => { active = false; window.removeEventListener("storage", sync); window.removeEventListener("nexus-workspace-changed", load); window.removeEventListener("nexus-workspace-refreshed", load); };
  }, [repository, owner, pages]);
  return <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
    {error && <p role="alert">{error}</p>}
    <LifeTimer state={timer} change={next => { setTimer(next); try { localStorage.setItem(timerKey(owner), JSON.stringify(next)); } catch { setError("無法儲存計時狀態，請確認瀏覽器儲存空間"); } }} history={history}
      tasks={pages.filter(page => page.kind === "todo" && !page.deleted_at)} sessions={sessions}
      save={repository ? result => repository.saveTimerResult({ ...result, workspace_owner_id: owner, revision: 0, created_at: Date.now(), updated_at: Date.now(), deleted_at: null }) : undefined}/>
  </div>;
}
