const CACHE = "bark-and-guard-stage1-prod-v13";
const BASE = "/bark-and-guard/";
const CORE = [
  BASE,
  BASE + "index.html",
  BASE + "manifest.webmanifest",
  BASE + "src/main.js",
  BASE + "src/data/stage1.js",
  BASE + "src/scenes/Stage1Scene.js",
  BASE + "src/styles/game.css",
  BASE + "src/pwa/install.js",
  BASE + "assets/stages/stage-01/day/background.png",
  BASE + "assets/stages/stage-01/night/background.png",
  BASE + "assets/app/icons/icon-192.png",
  BASE + "assets/app/icons/icon-512.png",
  BASE + "assets/app/icons/icon-maskable-192.png",
  BASE + "assets/app/icons/icon-maskable-512.png",
  BASE + "assets/app/icons/apple-touch-icon.png",
  BASE + "assets/app/icons/favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("bark-and-guard-") && key !== CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(BASE, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("App shell unavailable");
          caches.open(CACHE).then((cache) => cache.put(BASE, response.clone()));
          return response;
        })
        .catch(async () =>
          (await caches.match(BASE)) ||
          (await caches.match(BASE + "index.html"))
        )
    );
    return;
  }

  const networkFirst =
    sameOrigin &&
    (
      url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".webmanifest") ||
      url.pathname.endsWith(".html")
    );

  if (networkFirst) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response.ok) {
          caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      });
    })
  );
});
