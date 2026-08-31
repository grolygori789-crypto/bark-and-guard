const CACHE_NAME = "bark-and-guard-v3";
const BASE = "/bark-and-guard/";

const CORE_ASSETS = [
  BASE,
  BASE + "index.html",
  BASE + "manifest.webmanifest",
  BASE + "src/main.js",
  BASE + "src/pwa/install.js",
  BASE + "src/scenes/Stage1Scene.js",
  BASE + "src/data/stage1.js",
  BASE + "assets/app/icons/icon-192.png",
  BASE + "assets/app/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("bark-and-guard-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navigation must always have a usable app-shell fallback.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(BASE + "index.html", copy));
          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(BASE + "index.html")) ||
            (await caches.match(BASE))
          );
        })
    );
    return;
  }

  // Development code should prefer the latest GitHub Pages version.
  if (
    sameOrigin &&
    (
      url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".json") ||
      url.pathname.endsWith(".webmanifest")
    )
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Images and other static files: cache-first.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response && (response.status === 200 || response.type === "opaque")) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
