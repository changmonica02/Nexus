"use client";

import { useEffect } from "react";

/** Application shell only; the world-map core owns its narrower offline scope. */
export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    const prewarm = (worker: ServiceWorker | null) => {
      if (disposed) return;
      const assets = performance.getEntriesByType("resource").map(entry => entry.name)
        .filter(url => { try { const parsed = new URL(url); return parsed.origin === location.origin && parsed.pathname.startsWith("/_next/static/"); } catch { return false; } });
      worker?.postMessage({ type: "NEXUS_PRECACHE_ASSETS", assets: [...new Set(assets)] });
    };
    const register = () => { void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then(async current => {
      registration = current;
      const ready = await navigator.serviceWorker.ready;
      prewarm(current.active ?? ready.active);
    }).catch(error => {
      if (process.env.NODE_ENV !== "production") console.warn("PWA worker registration failed", error);
    }); };
    const refresh = () => {
      void registration?.update().catch(() => undefined);
      registration?.active?.postMessage({ type: "NEXUS_REFRESH_SHELL" });
      prewarm(registration?.active ?? null);
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    window.addEventListener("online", refresh);
    return () => { disposed = true; window.removeEventListener("load", register); window.removeEventListener("online", refresh); };
  }, []);
  return null;
}
