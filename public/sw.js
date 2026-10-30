/* Nexus app-shell cache. User records and private APIs stay in IndexedDB/Supabase. */
const CACHE = "nexus-shell-v2";
const ICONS = ["/icon.svg", "/favicon.ico", "/icons/nexus-192.png", "/icons/nexus-512.png", "/icons/apple-touch-icon.png"];
const isMap = path => path === "/world-map" || path.startsWith("/world-map/");
const isStatic = path => path.startsWith("/_next/static/") || ICONS.includes(path);
const isAppPage = path => path === "/" || /^\/(study|dictionary|etymology|trash)(\/|$)/.test(path);
let preparing;
const storePublicAsset = async (cache, asset) => {
  const url = new URL(asset, self.location.origin);
  if (url.origin !== self.location.origin || !isStatic(url.pathname)) return;
  if (await cache.match(url.href)) return;
  const response = await fetch(url.href, { credentials: "omit" });
  if (!response.ok || response.type !== "basic") throw Error("Public shell asset unavailable");
  await cache.put(url.href, response);
};
// Commit anonymous HTML only after its immutable JS/CSS dependencies are available.
// Keep old hashed assets for still-open tabs; never reload an editor to update it.
const prepareShell = () => {
  if (preparing) return preparing;
  preparing = (async () => {
    const response = await fetch("/", { credentials: "omit", cache: "no-store" });
    if (!response.ok || response.type !== "basic" || !response.headers.get("content-type")?.includes("text/html")) throw Error("Public shell unavailable");
    const html = await response.clone().text();
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match => new URL(match[1].replace(/&amp;/g, "&"), self.location.origin)).filter(url => url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")).map(url => url.href);
    const cache = await caches.open(CACHE);
    await Promise.all([...new Set(assets)].map(url => storePublicAsset(cache, url)));
    await cache.put("/", response);
    await Promise.allSettled(ICONS.map(url => storePublicAsset(cache, url)));
  })().finally(() => { preparing = undefined; });
  return preparing;
};
self.addEventListener("install", event => {
  event.waitUntil(prepareShell());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith("nexus-shell-") && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  // Classic same-origin scripts/styles may use no-cors; they still need offline cache.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isMap(url.pathname)) return;
  if (request.headers.has("authorization") || request.headers.has("range")) return;
  if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate" && isAppPage(url.pathname)) {
    // Never cache navigation responses: Cookie/Set-Cookie are not reliable JS guards.
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (url.pathname === "/" && response.ok) event.waitUntil(prepareShell().catch(() => undefined));
        return response;
      } catch (error) {
        if (url.pathname === "/") {
          const cached = await caches.match("/", { cacheName: CACHE });
          if (cached) return cached;
        }
        return new Response("此頁面尚未準備完成離線使用。請先連線，或返回已快取的 Nexus 首頁。", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    })());
  } else if (isStatic(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === "basic") await cache.put(request, response.clone());
      return response;
    })());
  }
});

self.addEventListener("message", event => {
  if (event.data?.type === "NEXUS_REFRESH_SHELL") {
    event.waitUntil(prepareShell().catch(() => undefined));
    return;
  }
  if (event.data?.type !== "NEXUS_PRECACHE_ASSETS" || !Array.isArray(event.data.assets)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(event.data.assets.slice(0, 200).map(async asset => {
      const url = new URL(asset, self.location.href);
      if (url.origin !== self.location.origin || !url.pathname.startsWith("/_next/static/")) return;
      await storePublicAsset(cache, url.href);
    }));
  })());
});
