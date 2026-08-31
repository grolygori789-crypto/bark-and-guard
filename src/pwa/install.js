const APP_NAME = "BARK & GUARD";
const APP_PATH = "/bark-and-guard/";
let deferredPrompt = null;

const ua = navigator.userAgent || "";
const isIOS = /iphone|ipad|ipod/i.test(ua);
const isAndroid = /android/i.test(ua);

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches ||
  window.navigator.standalone === true;

function injectStyles() {
  if (document.getElementById("bark-install-style")) return;
  const style = document.createElement("style");
  style.id = "bark-install-style";
  style.textContent = `
    #bark-install-card {
      position: fixed;
      z-index: 99999;
      left: 50%;
      bottom: max(16px, env(safe-area-inset-bottom));
      transform: translate(-50%, 24px);
      width: min(520px, calc(100vw - 28px));
      display: grid;
      grid-template-columns: 54px 1fr auto;
      gap: 12px;
      align-items: center;
      padding: 11px 12px;
      box-sizing: border-box;
      border-radius: 20px;
      border: 1px solid rgba(255,210,109,.46);
      background: linear-gradient(145deg, rgba(5,23,51,.98), rgba(15,49,87,.98));
      box-shadow: 0 18px 55px rgba(0,0,0,.52);
      color: #fff;
      opacity: 0;
      pointer-events: none;
      transition: opacity .22s ease, transform .22s ease;
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
      font-size: 15px;
      line-height: 1.2;
      color: #fff2c9;
      margin-bottom: 3px;
    }
    #bark-install-copy span {
      display: block;
      font-size: 12px;
      line-height: 1.3;
      color: #cbd9ec;
    }
    #bark-install-actions {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    #bark-install-button, #bark-install-close, #bark-install-help-close {
      border: 0;
      cursor: pointer;
      font-family: system-ui, sans-serif;
      font-weight: 800;
    }
    #bark-install-button {
      min-height: 40px;
      padding: 0 14px;
      border-radius: 13px;
      color: #092345;
      background: linear-gradient(#ffe29a, #e9b84c);
    }
    #bark-install-close {
      width: 40px;
      min-height: 40px;
      border-radius: 13px;
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
    #bark-install-help.show { display: grid; }
    #bark-install-help-panel {
      width: min(470px, calc(100vw - 34px));
      padding: 21px;
      box-sizing: border-box;
      border-radius: 23px;
      color: #fff;
      background: #09264c;
      border: 1px solid rgba(255,211,116,.42);
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
      border-radius: 14px;
      color: #092345;
      background: #efc65d;
    }`;
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
    </div>`;
  document.body.appendChild(card);

  const help = document.createElement("div");
  help.id = "bark-install-help";
  help.innerHTML = `
    <div id="bark-install-help-panel">
      <h2>ติดตั้ง ${APP_NAME}</h2>
      <div id="bark-install-help-copy"></div>
      <button id="bark-install-help-close" type="button">ปิด</button>
    </div>`;
  document.body.appendChild(help);

  document.getElementById("bark-install-button").addEventListener("click", handleInstallClick);
  document.getElementById("bark-install-close").addEventListener("click", hideInstallCard);
  document.getElementById("bark-install-help-close").addEventListener("click", () => help.classList.remove("show"));
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
      <p class="note">iPhone/iPad ไม่มี native install popup แบบ Android</p>`;
  } else {
    copy.innerHTML = `
      <p>ถ้า Chrome ยังไม่เด้งหน้าติดตั้งอัตโนมัติ ให้แตะเมนู <strong>⋮</strong></p>
      <p>แล้วเลือก <strong>Install app</strong> หรือ <strong>Add to Home screen</strong></p>
      <p class="note">ปุ่ม INSTALL จะไม่เงียบอีกต่อไป แม้ browser ยังไม่ให้ native prompt</p>`;
  }

  help.classList.add("show");
}

async function handleInstallClick() {
  if (isStandalone()) {
    hideInstallCard();
    return;
  }

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

  showInstallHelp();
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register(`${APP_PATH}service-worker.js`, { scope: APP_PATH });
    await navigator.serviceWorker.ready;
    registration.update().catch(() => {});
  } catch (error) {
    console.error("Service worker failed:", error);
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

if (!isStandalone()) {
  window.setTimeout(() => {
    if (isIOS || isAndroid || deferredPrompt) showInstallCard();
  }, 1200);
}
