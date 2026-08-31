const CACHE_NAME = "bark-and-guard-v1";

const BASE = new URL("./", self.location.href).pathname;

const APP_SHELL = [
  BASE,
  BASE + "index.html",
  BASE + "manifest.webmanifest",
  BASE + "src/main.js",
  BASE + "src/pwa/install.js",
  BASE + "src/scenes/Stage1Scene.js",
  BASE + "src/data/stage1.js",
  BASE + "assets/app/icons/icon-192.png",
  BASE + "assets/app/icons/icon-512.png",
  BASE + "assets/app/icons/icon-maskable-192.png",
  BASE + "assets/app/icons/icon-maskable-512.png",
  BASE + "assets/app/icons/apple-touch-icon.png",
  BASE + "assets/app/icons/favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(BASE + "index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (!response || (response.status !== 200 && response.type !== "opaque")) {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
