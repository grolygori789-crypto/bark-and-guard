const BASE = "/bark-and-guard/";
let deferredPrompt = null;

const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches ||
  window.navigator.standalone === true;

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || "");

const state = { installed: standalone(), canPrompt: false };
function emit() { window.dispatchEvent(new CustomEvent("bark:pwa-state", { detail: { ...state } })); }

window.BarkPWA = {
  state,
  async install() {
    if (standalone()) return { status: "installed" };
    if (deferredPrompt) {
      const prompt = deferredPrompt;
      deferredPrompt = null;
      state.canPrompt = false;
      emit();
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        return { status: choice?.outcome === "accepted" ? "accepted" : "dismissed" };
      } catch (error) {
        console.warn("Install prompt failed", error);
        return { status: "manual" };
      }
    }
    return { status: isIOS ? "ios" : "manual" };
  }
};

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  state.canPrompt = true;
  emit();
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  state.installed = true;
  state.canPrompt = false;
  emit();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(BASE + "service-worker.js", { scope: BASE });
      await navigator.serviceWorker.ready;
      registration.update().catch(() => {});
    } catch (error) {
      console.error("BARK & GUARD service worker registration failed", error);
    }
  });
}

queueMicrotask(emit);
