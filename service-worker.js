const CACHE_NAME = "bark-and-guard-v8";
const BASE = "/bark-and-guard/";
const INDEX = BASE + "index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([BASE, INDEX]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
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

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(BASE, { cache: "no-store" })
        .then((response) => {
          if (!response || !response.ok) {
            throw new Error("App shell unavailable");
          }

          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(BASE, copy.clone());
            cache.put(INDEX, copy);
          });

          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(BASE)) ||
            (await caches.match(INDEX))
          );
        })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
