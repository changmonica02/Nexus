"use client";

import { useEffect } from "react";

/** Application shell only; the world-map core owns its narrower offline scope. */
export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => { void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(error => {
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
