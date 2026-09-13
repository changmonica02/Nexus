"use client";

import { useState } from "react";

const DEVICES = [
  { id: "desktop", label: "Desktop", detail: "1440 × 900", width: 1440, height: 900 },
  { id: "laptop", label: "Laptop", detail: "1024 × 768", width: 1024, height: 768 },
  { id: "tablet-landscape", label: "Tablet 橫向", detail: "1024 × 768", width: 1024, height: 768 },
  { id: "tablet", label: "Tablet 直向", detail: "768 × 1024", width: 768, height: 1024 },
  { id: "mobile", label: "Mobile", detail: "390 × 844", width: 390, height: 844 },
  { id: "mobile-landscape", label: "Mobile 橫向", detail: "844 × 390", width: 844, height: 390 },
] as const;

export default function DevicePreview({ onClose }: { onClose: () => void }) {
  const [deviceId, setDeviceId] = useState<(typeof DEVICES)[number]["id"]>("mobile");
  const device = DEVICES.find((item) => item.id === deviceId) || DEVICES[0];

  return (
    <div className="fixed inset-0 z-[10001] flex flex-col bg-zinc-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="裝置預覽">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden rounded-2xl border shadow-2xl" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
        <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
          <div className="mr-2 text-sm font-semibold" style={{ color: "var(--color-text)" }}>裝置預覽</div>
          <div className="flex flex-1 flex-wrap gap-1">
            {DEVICES.map((item) => (
              <button key={item.id} type="button" onClick={() => setDeviceId(item.id)} className="rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800" style={{ backgroundColor: item.id === device.id ? "rgba(26,115,232,0.14)" : "transparent", color: "var(--color-text)" }}>
                {item.label}
              </button>
            ))}
          </div>
          <span className="text-xs opacity-55" style={{ color: "var(--color-text)" }}>{device.detail}</span>
          <button type="button" onClick={onClose} className="ml-2 rounded-md px-2 py-1 text-lg leading-none hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="關閉裝置預覽">×</button>
        </header>
        <div className="flex flex-1 items-start justify-center overflow-auto bg-zinc-200 p-6 dark:bg-zinc-900">
          <div className="shrink-0 overflow-hidden rounded-[1.5rem] border-8 border-zinc-800 bg-white shadow-2xl" style={{ width: device.width, height: device.height, maxWidth: "none" }}>
            <iframe title={`${device.label} Nexus 預覽`} src="/" className="h-full w-full border-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
