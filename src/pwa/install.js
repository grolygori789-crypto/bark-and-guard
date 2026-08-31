const BASE = "/bark-and-guard/";

async function registerAppWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register(
      BASE + "service-worker.js",
      { scope: BASE }
    );

    await navigator.serviceWorker.ready;
    registration.update().catch(() => {});
  } catch (error) {
    console.error("BARK & GUARD service worker failed:", error);
  }
}

registerAppWorker();
