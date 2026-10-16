"use client";
import { useEffect, useState } from "react";
import { creationTemplateLibrary } from "../features/creation/templateLibrary";
export default function TemplateResourceStatus({
  source,
  onOpen,
}: {
  source: { postId: string; version: number };
  onOpen: (id: string) => void;
}) {
  const [available, setAvailable] = useState<number | null>(null),
    [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    void creationTemplateLibrary
      .capabilities()
      .then(async (c) => {
        if (!c) return;
        try {
          const p = await creationTemplateLibrary.post(source.postId);
          if (active) setAvailable(p.latest_version);
        } catch {
          if (active) setUnavailable(true);
        }
      })
      .catch(() => {
        if (active) setUnavailable(true);
      });
    return () => {
      active = false;
    };
  }, [source.postId, source.version]);
  return (
    <div className="mt-2 text-xs opacity-75">
      來源 v{source.version}
      {available !== null && available > source.version && (
        <button
          className="ml-2 min-h-11 text-blue-600 underline"
          onClick={() => onOpen(source.postId)}
        >
          有可用更新 / Update available
        </button>
      )}
      {unavailable && (
        <span> · 來源無法存取；私人副本保留 / Source unavailable</span>
      )}
    </div>
  );
}
