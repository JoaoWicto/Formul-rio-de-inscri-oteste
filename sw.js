/* Service Worker — Senzala (PWA instalável e funcionamento offline da ficha)
   Sempre que publicar uma versão nova, altere o número da VERSÃO abaixo
   para o navegador baixar os arquivos atualizados. */
const VERSION = "senzala-v3";
const SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/config.js",
  "./js/app.js",
  "./js/admin.js",
  "./assets/logo.jpeg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-512.png"
];
const EXT = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(SHELL);
    for (const url of EXT) {
      try { await cache.add(new Request(url, { mode: "no-cors" })); } catch (_) {}
    }
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Script externo (Supabase): cache-first, pois é imutável por versão.
  if (EXT.includes(url.href)) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put(req, res.clone());
        return res;
      } catch (_) { return hit || new Response("", { status: 504 }); }
    })());
    return;
  }

  // Origem do site: network-first (sempre que online pega a versão nova),
  // com fallback para o cache quando estiver offline.
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put(req, res.clone());
        return res;
      } catch (_) {
        const hit = await caches.match(req);
        if (hit) return hit;
        if (req.mode === "navigate") return caches.match("./index.html");
        return new Response("Offline", { status: 504 });
      }
    })());
  }
});
