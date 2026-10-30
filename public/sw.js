/* Nexus app-shell cache. User records and private APIs stay in IndexedDB/Supabase. */
const CACHE = "nexus-shell-v1";
const SHELL = ["/", "/icon.svg", "/favicon.ico"];
const isMap = path => path.startsWith("/world-map/");
const isStatic = path => path.startsWith("/_next/static/") || path === "/icon.svg" || path === "/favicon.ico";
const isShell = path => path === "/";
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    // Install remains usable on flaky networks; missing assets retry on next online visit.
    await Promise.allSettled(SHELL.map(async path => {
      const response = await fetch(path, { credentials: "omit", cache: "reload" });
      if (response.ok && response.type === "basic") await cache.put(path, response);
    }));
  }));
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
  if (request.method !== "GET" || request.mode === "no-cors") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isMap(url.pathname)) return;
  if (request.headers.has("authorization") || request.headers.has("range")) return;
  if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    // Never cache personalized navigation responses or Next.js RSC/data payloads.
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (isShell(url.pathname) && response.ok && !request.headers.has("cookie") && !response.headers.has("set-cookie")) {
          const cache = await caches.open(CACHE);
          await cache.put("/", response.clone());
        }
        return response;
      } catch (error) {
        const cached = await caches.match("/", { cacheName: CACHE });
        if (cached) return cached;
        return new Response("Nexus 尚未準備完成離線啟動。請先連線開啟首頁。", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
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
