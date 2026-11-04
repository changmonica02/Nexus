"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import { readViewPreferences, type ViewPreferences } from "./listViewModel";
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener("nexus-view-changed", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("nexus-view-changed", cb);
  };
};
/** Same device-local preference contract as collection views; never enqueued. */
export function useListViewPreferences(key: string) {
  const [fallback, setFallback] = useState<{ raw: string; value: ViewPreferences } | null>(null);
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) ?? "";
      } catch {
        return "";
      }
    },
    () => "",
  );
  const value = useMemo(() => (fallback?.raw === raw ? fallback.value : readViewPreferences(raw)), [raw, fallback]);
  const update = (patch: Partial<ViewPreferences>) => {
    const next = { ...value, ...patch };
    try {
      const serialized = JSON.stringify(next);
      localStorage.setItem(key, serialized);
      setFallback(null);
      window.dispatchEvent(new Event("nexus-view-changed"));
    } catch {
      setFallback({ raw, value: next });
    }
  };
  return [value, update] as const;
}
