const BASE = "/bark-and-guard/";
let deferredPrompt = null;
let registration = null;

const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches ||
  window.navigator.standalone === true;

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
const isAndroid = /android/i.test(navigator.userAgent || "");

const installedHint = localStorage.getItem("bark-pwa-installed-hint") === "1";

const state = {
  installed: standalone(),
  installedHint,
  canPrompt: false,
  ready: false
};

const $ = (id) => document.getElementById(id);

function emit() {
  window.dispatchEvent(new CustomEvent("bark:pwa-state", { detail: { ...state } }));
  updateInstallGate();
}

function gateOpen(open) {
  const gate = $("install-gate");
  if (!gate) return;
  gate.classList.toggle("open", open);
  gate.setAttribute("aria-hidden", String(!open));
}

function updateInstallGate() {
  const gate = $("install-gate");
  const installButton = $("install-now");
  const hint = $("install-gate-hint");
  if (!gate || !installButton || !hint) return;

  if (state.installed || standalone()) {
    gateOpen(false);
    return;
  }

  if (isIOS) {
    installButton.disabled = false;
    installButton.textContent = "HOW TO INSTALL";
    hint.textContent = "Safari → Share → Add to Home Screen";
    return;
  }

  if (state.canPrompt) {
    installButton.disabled = false;
    installButton.textContent = "INSTALL APP";
    hint.textContent = "Ready to install from this browser.";
    return;
  }

  if (state.ready) {
    installButton.disabled = false;
    installButton.textContent = "INSTALL APP";
    hint.textContent = isAndroid
      ? "If Chrome does not offer the native prompt, use ⋮ → Install app."
      : "Use your browser's Install app / Add to Home Screen option.";
    return;
  }

  installButton.disabled = true;
  installButton.textContent = "PREPARING…";
  hint.textContent = "Preparing install…";
}

async function enterImmersive() {
  try {
    if (!standalone() && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    }
  } catch (_) {}

  try {
    if (screen.orientation?.lock) {
      await screen.orientation.lock("landscape");
    }
  } catch (_) {}
}

async function install() {
  if (standalone()) {
    state.installed = true;
    emit();
    return { status: "installed" };
  }

  if (deferredPrompt) {
    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    state.canPrompt = false;
    emit();

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice?.outcome === "accepted") {
        localStorage.setItem("bark-pwa-installed-hint", "1");
        state.installedHint = true;
        return { status: "accepted" };
      }
      return { status: "dismissed" };
    } catch (error) {
      console.warn("Install prompt failed", error);
    }
  }

  if (isIOS) {
    const hint = $("install-gate-hint");
    if (hint) hint.textContent = "Safari: tap Share, then Add to Home Screen.";
    return { status: "ios" };
  }

  const hint = $("install-gate-hint");
  if (hint) hint.textContent = "Chrome: tap ⋮, then Install app / Add to Home screen.";
  return { status: "manual" };
}

async function registerWorker() {
  if (!("serviceWorker" in navigator)) {
    state.ready = true;
    emit();
    return;
  }

  const hadController = Boolean(navigator.serviceWorker.controller);

  try {
    registration = await navigator.serviceWorker.register(
      BASE + "service-worker.js",
      { scope: BASE }
    );

    await navigator.serviceWorker.ready;
    state.ready = true;
    emit();

    registration.update().catch(() => {});

    if (registration.waiting) {
      registration.waiting.postMessage("SKIP_WAITING");
    }

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller && registration.waiting) {
          registration.waiting.postMessage("SKIP_WAITING");
        }
      });
    });

    if (hadController) {
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        reloading = true;
        location.reload();
      }, { once: true });
    }
  } catch (error) {
    console.error("BARK & GUARD service worker registration failed", error);
    state.ready = true;
    emit();
  }
}

function bindInstallUI() {
  const installNow = $("install-now");
  const playBrowser = $("play-browser");

  installNow?.addEventListener("click", async () => {
    const result = await install();

    if (result.status === "accepted") {
      const hint = $("install-gate-hint");
      if (hint) hint.textContent = "Installed. Open BARK & GUARD from its Home Screen icon.";
    }
  });

  playBrowser?.addEventListener("click", async () => {
    await enterImmersive();
    gateOpen(false);
  });

  // Automatic first-browser-launch popup.
  if (!standalone() && !state.installedHint) {
    window.setTimeout(() => gateOpen(true), 350);
  } else if (!standalone()) {
    gateOpen(false);
  } else {
    gateOpen(false);
    // Installed PWA: request landscape immediately; manifest handles the full-screen shell.
    enterImmersive().catch(() => {});
  }

  updateInstallGate();
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  state.canPrompt = true;
  emit();
  if (!standalone()) gateOpen(true);
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  state.installed = true;
  state.canPrompt = false;
  localStorage.setItem("bark-pwa-installed-hint", "1");
  state.installedHint = true;
  emit();
  gateOpen(false);
});

window.BarkPWA = {
  state,
  install,
  enterImmersive,
  showInstallGate: () => gateOpen(true),
  hideInstallGate: () => gateOpen(false)
};

document.addEventListener("DOMContentLoaded", () => {
  bindInstallUI();
  registerWorker();
});

queueMicrotask(emit);
