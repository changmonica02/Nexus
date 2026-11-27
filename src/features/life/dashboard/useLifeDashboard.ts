import { useEffect, useMemo, useRef, useState } from "react";
import type { StorageAdapter } from "../../../infrastructure/storage/StorageAdapter";
import { initialConfig, type LifeDashboardConfig } from "./model";

export function useLifeDashboard(storage?: StorageAdapter) {
  const repository = useMemo(() => storage?.getLifeRepository(), [storage]);
  const [config, setConfig] = useState(initialConfig);
  const [ready, setReady] = useState(!repository);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const mutation = useRef(0);

  useEffect(() => {
    if (!repository) return;
    let active = true, sequence = 0;
    const load = () => {
      const current = ++sequence, before = mutation.current;
      void Promise.all([repository.readDashboard(), repository.dashboardConflict()]).then(([value, conflict]) => {
        if (!active || current !== sequence || mutation.current !== before) return;
        if (value) setConfig(value);
        setConflict(conflict);
        setReady(true);
        setError("");
      }).catch(() => {
        if (active && current === sequence) setError("無法讀取儀表板配置。");
      });
    };
    load();
    window.addEventListener("nexus-workspace-refreshed", load);
    return () => {
      active = false;
      window.removeEventListener("nexus-workspace-refreshed", load);
    };
  }, [repository, attempt]);

  return {
    config, ready, error, repository, conflict,
    retry() { setError(""); setAttempt(value => value + 1); },
    async resolve(preferLocal: boolean) {
      await repository?.resolveDashboard(preferLocal);
      setAttempt(value => value + 1);
    },
    async save(next: LifeDashboardConfig, baseline: LifeDashboardConfig) {
      mutation.current++;
      await repository?.saveDashboard(next, baseline);
      mutation.current++;
      setConfig(next);
    },
  };
}
