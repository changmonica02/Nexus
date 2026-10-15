"use client";
import { useSyncExternalStore } from "react";
import { useLanguage } from "../lib/LanguageContext";
import { formatEditedTime, localDate } from "../lib/editedTime";
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) timer = setInterval(() => listeners.forEach((fn) => fn()), 60000);
  return () => {
    listeners.delete(cb);
    if (!listeners.size) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}
export default function EditedTime({
  timestamp,
  className = "",
}: {
  timestamp: number;
  className?: string;
}) {
  const { language } = useLanguage();
  const now = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 60000) * 60000,
    () => 0,
  );
  return (
    <time
      className={className}
      dateTime={
        Number.isFinite(new Date(timestamp).getTime())
          ? new Date(timestamp).toISOString()
          : undefined
      }
      title={now ? localDate(timestamp) : undefined}
    >
      {now ? formatEditedTime(timestamp, now, language) : "—"}
    </time>
  );
}
