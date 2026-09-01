const CACHE = "bark-and-guard-stage1-prod-v12";
const BASE = "/bark-and-guard/";
const CORE = [
  "/bark-and-guard/",
  "/bark-and-guard/index.html",
  "/bark-and-guard/manifest.webmanifest",
  "/bark-and-guard/src/main.js",
  "/bark-and-guard/src/data/stage1.js",
  "/bark-and-guard/src/scenes/Stage1Scene.js",
  "/bark-and-guard/src/styles/game.css",
  "/bark-and-guard/src/pwa/install.js",
  "/bark-and-guard/assets/stages/stage-01/day/background.png",
  "/bark-and-guard/assets/stages/stage-01/night/background.png",
  "/bark-and-guard/assets/app/icons/icon-192.png",
  "/bark-and-guard/assets/app/icons/icon-512.png",
  "/bark-and-guard/assets/app/icons/icon-maskable-192.png",
  "/bark-and-guard/assets/app/icons/icon-maskable-512.png",
  "/bark-and-guard/assets/app/icons/apple-touch-icon.png",
  "/bark-and-guard/assets/app/icons/favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("bark-and-guard-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(BASE, copy));
      return response;
    }).catch(async () => (await caches.match(BASE)) || (await caches.match(BASE + "index.html"))));
    return;
  }

  if (sameOrigin && (url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.endsWith(".webmanifest"))) {
    event.respondWith(fetch(event.request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
    return response;
  })));
});
