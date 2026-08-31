const APP_NAME = "BARK & GUARD";
const APP_PATH = "/bark-and-guard/";

let deferredPrompt = null;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches ||
  window.navigator.standalone === true;

const ua = navigator.userAgent || "";
const isIOS = /iphone|ipad|ipod/i.test(ua);
const isAndroid = /android/i.test(ua);

function injectStyles() {
  if (document.getElementById("bark-pwa-style")) return;

  const style = document.createElement("style");
  style.id = "bark-pwa-style";
  style.textContent = `
    #bark-install-card {
      position: fixed;
      z-index: 99999;
      left: 50%;
      bottom: max(16px, env(safe-area-inset-bottom));
      transform: translate(-50%, 22px);
      width: min(520px, calc(100vw - 28px));
      box-sizing: border-box;
      display: grid;
      grid-template-columns: 54px 1fr auto;
      gap: 12px;
      align-items: center;
      padding: 11px 12px;
      border-radius: 20px;
      border: 1px solid rgba(255, 210, 109, .46);
      background: linear-gradient(145deg, rgba(5, 23, 51, .98), rgba(15, 49, 87, .98));
      box-shadow: 0 18px 55px rgba(0,0,0,.52);
      color: #fff;
      opacity: 0;
      pointer-events: none;
      transition: opacity .2s ease, transform .2s ease;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    #bark-install-card.show {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, 0);
    }

    #bark-install-card img {
      width: 54px;
      height: 54px;
      border-radius: 14px;
    }

    #bark-install-copy strong {
      display: block;
      color: #fff2c9;
      font-size: 15px;
      line-height: 1.2;
      margin-bottom: 3px;
    }

    #bark-install-copy span {
      display: block;
      color: #cbd9ec;
      font-size: 12px;
      line-height: 1.3;
    }

    #bark-install-actions {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    #bark-install-button,
    #bark-install-close {
      border: 0;
      border-radius: 13px;
      min-height: 40px;
      font-family: system-ui, sans-serif;
      font-weight: 800;
      cursor: pointer;
    }

    #bark-install-button {
      padding: 0 14px;
      color: #092345;
      background: linear-gradient(#ffe29a, #e9b84c);
    }

    #bark-install-close {
      width: 40px;
      padding: 0;
      color: #dce8f7;
      background: rgba(255,255,255,.10);
    }

    #bark-install-help {
      position: fixed;
      z-index: 100000;
      inset: 0;
      display: none;
      place-items: center;
      padding: 20px;
      background: rgba(0,0,0,.68);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    #bark-install-help.show {
      display: grid;
    }

    #bark-install-help-panel {
      width: min(470px, calc(100vw - 34px));
      box-sizing: border-box;
      padding: 21px;
      border-radius: 23px;
      color: #fff;
      background: #09264c;
      border: 1px solid rgba(255, 211, 116, .42);
      box-shadow: 0 22px 70px rgba(0,0,0,.58);
    }

    #bark-install-help h2 {
      margin: 0 0 10px;
      font-size: 20px;
      color: #fff0c7;
    }

    #bark-install-help p {
      margin: 8px 0;
      color: #d9e5f5;
      font-size: 14px;
      line-height: 1.45;
    }

    #bark-install-help .note {
      color: #a9beda;
      font-size: 12px;
    }

    #bark-install-help-close {
      width: 100%;
      height: 43px;
      margin-top: 14px;
      border: 0;
      border-radius: 14px;
      color: #092345;
      background: #efc65d;
      font: 800 14px system-ui, sans-serif;
      cursor: pointer;
    }

    @media (max-height: 500px) {
      #bark-install-card {
        bottom: max(8px, env(safe-area-inset-bottom));
        grid-template-columns: 46px 1fr auto;
        padding: 8px 10px;
      }

      #bark-install-card img {
        width: 46px;
        height: 46px;
        border-radius: 12px;
      }

      #bark-install-copy strong {
        font-size: 13px;
      }

      #bark-install-copy span {
        font-size: 11px;
      }
    }
  `;
  document.head.appendChild(style);
}

function createUI() {
  if (document.getElementById("bark-install-card")) return;

  const card = document.createElement("div");
  card.id = "bark-install-card";
  card.innerHTML = `
    <img src="${APP_PATH}assets/app/icons/icon-192.png" alt="">
    <div id="bark-install-copy">
      <strong>Install ${APP_NAME}</strong>
      <span>เปิดจากไอคอนบนหน้าจอได้ทันที</span>
    </div>
    <div id="bark-install-actions">
      <button id="bark-install-button" type="button">INSTALL</button>
      <button id="bark-install-close" type="button" aria-label="Not now">×</button>
    </div>
  `;
  document.body.appendChild(card);

  const help = document.createElement("div");
  help.id = "bark-install-help";
  help.innerHTML = `
    <div id="bark-install-help-panel">
      <h2>ติดตั้ง ${APP_NAME}</h2>
      <div id="bark-install-help-copy"></div>
      <button id="bark-install-help-close" type="button">ปิด</button>
    </div>
  `;
  document.body.appendChild(help);

  document
    .getElementById("bark-install-button")
    .addEventListener("click", handleInstallClick);

  document
    .getElementById("bark-install-close")
    .addEventListener("click", hideInstallCard);

  document
    .getElementById("bark-install-help-close")
    .addEventListener("click", () => help.classList.remove("show"));
}

function showInstallCard() {
  if (isStandalone()) return;
  const card = document.getElementById("bark-install-card");
  if (card) requestAnimationFrame(() => card.classList.add("show"));
}

function hideInstallCard() {
  const card = document.getElementById("bark-install-card");
  if (card) card.classList.remove("show");
}

function showInstallHelp() {
  const help = document.getElementById("bark-install-help");
  const copy = document.getElementById("bark-install-help-copy");
  if (!help || !copy) return;

  if (isIOS) {
    copy.innerHTML = `
      <p>1. เปิดหน้านี้ด้วย <strong>Safari</strong></p>
      <p>2. แตะปุ่ม <strong>Share</strong></p>
      <p>3. เลือก <strong>Add to Home Screen</strong></p>
      <p>4. แตะ <strong>Add</strong></p>
      <p class="note">iPhone/iPad ไม่มี native install prompt แบบ Android ค่ะ</p>
    `;
  } else {
    copy.innerHTML = `
      <p>Chrome ยังไม่ส่งหน้าต่างติดตั้งอัตโนมัติให้หน้านี้ในตอนนี้</p>
      <p>แตะเมนู <strong>⋮</strong> ของ Chrome แล้วเลือก
      <strong>Install app</strong> หรือ <strong>Add to Home screen</strong></p>
      <p class="note">ปุ่มนี้จะไม่เงียบอีกต่อไป แม้ browser ยังไม่อนุญาต native prompt</p>
    `;
  }

  help.classList.add("show");
}

async function handleInstallClick() {
  if (isStandalone()) {
    hideInstallCard();
    return;
  }

  // Native Android/Chromium PWA prompt.
  if (deferredPrompt) {
    const promptEvent = deferredPrompt;
    deferredPrompt = null;

    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch (error) {
      console.warn("Native install prompt failed:", error);
      showInstallHelp();
      return;
    }

    hideInstallCard();
    return;
  }

  // Never no-op. Always explain the available path.
  showInstallHelp();
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register(
      `${APP_PATH}service-worker.js`,
      { scope: APP_PATH }
    );

    await navigator.serviceWorker.ready;

    // Ask an existing worker to update immediately during active development.
    registration.update().catch(() => {});
  } catch (error) {
    console.error("BARK & GUARD service worker failed:", error);
  }
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  showInstallCard();
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  hideInstallCard();
});

injectStyles();
createUI();
registerServiceWorker();

// iOS never fires beforeinstallprompt.
// Android fallback card appears too, so INSTALL can never be a dead button.
if (!isStandalone()) {
  window.setTimeout(() => {
    if (isIOS || isAndroid || deferredPrompt) {
      showInstallCard();
    }
  }, 1200);
}
