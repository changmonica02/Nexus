"use client";
import { useState, useSyncExternalStore } from "react";
type Preferences = { view: "cards" | "list"; sort: string; ascending: boolean };
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener("nexus-view-changed", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("nexus-view-changed", cb);
  };
};
/** Existing icons/list/details view keys remain readable; settings are device-local only. */
export function useCollectionPreferences(key: string, initial: Preferences) {
  const [fallback, setFallback] = useState(initial);
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
    ),
    sortRaw = useSyncExternalStore(
      subscribe,
      () => {
        try {
          return localStorage.getItem(key + ":sort") ?? "";
        } catch {
          return "";
        }
      },
      () => "",
    );
  let sort = fallback.sort,
    ascending = fallback.ascending;
  try {
    const parsed = JSON.parse(sortRaw);
    if (
      [
        "updated_at",
        "title",
        "kind",
        "created_at",
        "size",
        "custom",
        "due_date",
      ].includes(parsed.sort) &&
      typeof parsed.ascending === "boolean"
    ) {
      sort = parsed.sort;
      ascending = parsed.ascending;
    }
  } catch {}
  const view = raw
    ? ["icons", "cards", "grid"].includes(raw)
      ? "cards"
      : "list"
    : fallback.view;
  const value: Preferences = { view, sort, ascending };
  const update = (patch: Partial<Preferences>) => {
    const next = { ...value, ...patch };
    setFallback(next);
    try {
      localStorage.setItem(key, next.view === "cards" ? "icons" : "list");
      localStorage.setItem(
        key + ":sort",
        JSON.stringify({ sort: next.sort, ascending: next.ascending }),
      );
      window.dispatchEvent(new Event("nexus-view-changed"));
    } catch {
      /* The in-memory controls remain usable. */
    }
  };
  return [value, update] as const;
}
