import { useEffect, useMemo, useState } from "react";
import type { StorageAdapter } from "../../../infrastructure/storage/StorageAdapter";
import { initialConfig, type LifeDashboardConfig } from "./model";

export function useLifeDashboard(storage?: StorageAdapter) {
  const repository = useMemo(() => storage?.getLifeRepository(), [storage]);
  const [config, setConfig] = useState(initialConfig);
  const [ready, setReady] = useState(!repository);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!repository) return;
    let active = true;
    repository.readDashboard().then(value => {
      if (!active) return;
      if (value) setConfig(value);
      setReady(true);
    }).catch(() => {
      if (active) setError("無法讀取儀表板配置。");
    });
    return () => { active = false; };
  }, [repository, attempt]);

  return {
    config, ready, error, repository,
    retry() { setError(""); setAttempt(value => value + 1); },
    async save(next: LifeDashboardConfig) {
      await repository?.saveDashboard(next);
      setConfig(next);
    },
  };
}
