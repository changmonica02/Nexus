"use client";

import { useEffect } from "react";

/** Application shell only; the world-map core owns its narrower offline scope. */
export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => { void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(async registration => {
      const ready = await navigator.serviceWorker.ready;
      const assets = performance.getEntriesByType("resource")
        .map(entry => entry.name)
        .filter(url => { try { const parsed = new URL(url); return parsed.origin === location.origin && parsed.pathname.startsWith("/_next/static/"); } catch { return false; } });
      (ready.active ?? registration.active)?.postMessage({ type: "NEXUS_PRECACHE_ASSETS", assets: [...new Set(assets)] });
    }).catch(error => {
      if (process.env.NODE_ENV !== "production") console.warn("PWA worker registration failed", error);
    }); };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
