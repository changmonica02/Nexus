"use client";
import { useState, useSyncExternalStore } from "react";
import {
  dashboardGrouping,
  type DashboardGrouping,
} from "../lib/dashboardGroups";
const key = "nexus-dashboard-grouping";
const subscribe = (notify: () => void) => {
  window.addEventListener("storage", notify);
  window.addEventListener("nexus-view-changed", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("nexus-view-changed", notify);
  };
};
export function useDashboardGrouping() {
  const [fallback, setFallback] = useState<DashboardGrouping>("none");
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const value = raw === null ? fallback : dashboardGrouping(raw);
  const update = (next: DashboardGrouping) => {
    setFallback(next);
    try {
      localStorage.setItem(key, next);
      window.dispatchEvent(new Event("nexus-view-changed"));
    } catch {
      /* Keep this visit usable when storage is unavailable. */
    }
  };
  return [value, update] as const;
}
