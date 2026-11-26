"use client";

import { useEffect } from "react";

/** Application shell only; the world-map core owns its narrower offline scope. */
export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let disposed = false;
    let registering = false;
    let registration: ServiceWorkerRegistration | undefined;
    const prewarm = (worker: ServiceWorker | null) => {
      if (!worker) return;
      const assets = performance.getEntriesByType("resource").map(entry => entry.name)
        .filter(url => { try { const parsed = new URL(url); return parsed.origin === location.origin && parsed.pathname.startsWith("/_next/static/"); } catch { return false; } });
      worker.postMessage({ type: "NEXUS_PRECACHE_ASSETS", assets: [...new Set(assets)] });
    };
    const register = async () => {
      if (disposed || registering || registration) return;
      registering = true;
      try {
        const current = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        if (disposed) return;
        registration = current;
        const ready = await navigator.serviceWorker.ready;
        if (disposed) return;
        const worker = current.active ?? ready.active;
        prewarm(worker);
        if (navigator.onLine) worker?.postMessage({ type: "NEXUS_REFRESH_SHELL" });
      } catch (error) {
        if (!disposed && process.env.NODE_ENV !== "production") console.warn("PWA worker registration failed", error);
      } finally {
        registering = false;
      }
    };
    const refresh = () => {
      if (!registration) { void register(); return; }
      void registration.update().catch(() => undefined);
      const worker = registration.active;
      worker?.postMessage({ type: "NEXUS_REFRESH_SHELL" });
      prewarm(worker);
    };
    if (document.readyState === "complete") void register();
    else window.addEventListener("load", register, { once: true });
    window.addEventListener("online", refresh);
    return () => { disposed = true; window.removeEventListener("load", register); window.removeEventListener("online", refresh); };
  }, []);
  return null;
}
