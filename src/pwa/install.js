const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches ||
  window.navigator.standalone === true;

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
let deferredPrompt = null;

function addStyles() {
  const style = document.createElement("style");
  style.textContent = `
    #pwa-install-card {
      position: fixed;
      z-index: 99999;
      left: 50%;
      bottom: max(18px, env(safe-area-inset-bottom));
      transform: translateX(-50%) translateY(24px);
      width: min(540px, calc(100vw - 32px));
      box-sizing: border-box;
      display: grid;
      grid-template-columns: 64px 1fr auto;
      gap: 14px;
      align-items: center;
      padding: 14px;
      border-radius: 22px;
      border: 1px solid rgba(255, 211, 116, .42);
      background: linear-gradient(145deg, rgba(8,24,52,.97), rgba(18,44,78,.97));
      box-shadow: 0 18px 55px rgba(0,0,0,.48);
      color: #fff;
      opacity: 0;
      pointer-events: none;
      transition: opacity .24s ease, transform .24s ease;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #pwa-install-card.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
      pointer-events: auto;
    }
    #pwa-install-card img {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      box-shadow: 0 6px 18px rgba(0,0,0,.35);
    }
    #pwa-install-copy strong {
      display:block;
      font-size:16px;
      letter-spacing:.01em;
      color:#fff7dd;
      margin-bottom:3px;
    }
    #pwa-install-copy span {
      display:block;
      font-size:13px;
      line-height:1.35;
      color:#cbd8ee;
    }
    #pwa-install-actions {
      display:flex;
      gap:8px;
      align-items:center;
    }
    #pwa-install-button,
    #pwa-dismiss-button {
      border:0;
      border-radius:14px;
      min-height:42px;
      font:700 14px system-ui, sans-serif;
      cursor:pointer;
    }
    #pwa-install-button {
      padding:0 17px;
      color:#0b2344;
      background:linear-gradient(#ffe19a,#e9b94f);
      box-shadow:inset 0 1px rgba(255,255,255,.65);
    }
    #pwa-dismiss-button {
      width:42px;
      padding:0;
      color:#dbe5f4;
      background:rgba(255,255,255,.10);
    }
    #pwa-ios-guide {
      position:fixed;
      z-index:100000;
      inset:0;
      display:none;
      place-items:center;
      padding:24px;
      background:rgba(0,0,0,.64);
      font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    }
    #pwa-ios-guide.show { display:grid; }
    #pwa-ios-guide > div {
      width:min(460px,calc(100vw - 36px));
      box-sizing:border-box;
      padding:22px;
      border-radius:24px;
      background:#0b2344;
      color:white;
      border:1px solid rgba(255,211,116,.4);
      box-shadow:0 22px 70px rgba(0,0,0,.55);
    }
    #pwa-ios-guide h2 { margin:0 0 10px; font-size:20px; color:#fff0c7; }
    #pwa-ios-guide p { margin:8px 0; line-height:1.45; color:#dbe5f4; font-size:14px; }
    #pwa-ios-guide button {
      margin-top:14px;
      width:100%;
      height:44px;
      border:0;
      border-radius:14px;
      color:#0b2344;
      background:#f0c65f;
      font:800 14px system-ui,sans-serif;
    }
    @media (max-height: 500px) {
      #pwa-install-card {
        bottom:max(10px, env(safe-area-inset-bottom));
        grid-template-columns:52px 1fr auto;
        padding:10px 12px;
      }
      #pwa-install-card img { width:52px;height:52px;border-radius:13px; }
    }
  `;
  document.head.appendChild(style);
}

function createInstallUI() {
  if (document.getElementById("pwa-install-card")) return;

  const card = document.createElement("div");
  card.id = "pwa-install-card";
  card.innerHTML = `
    <img src="./assets/app/icons/icon-192.png" alt="">
    <div id="pwa-install-copy">
      <strong>Install BARK & GUARD</strong>
      <span>เล่นแบบเต็มจอ เปิดจากไอคอนได้ทันที</span>
    </div>
    <div id="pwa-install-actions">
      <button id="pwa-install-button" type="button">INSTALL</button>
      <button id="pwa-dismiss-button" type="button" aria-label="Not now">×</button>
    </div>
  `;
  document.body.appendChild(card);

  const guide = document.createElement("div");
  guide.id = "pwa-ios-guide";
  guide.innerHTML = `
    <div>
      <h2>ติดตั้ง BARK & GUARD บน iPhone/iPad</h2>
      <p>1. เปิดหน้านี้ด้วย Safari</p>
      <p>2. แตะปุ่ม Share</p>
      <p>3. เลือก <strong>Add to Home Screen</strong></p>
      <p>4. แตะ <strong>Add</strong> แล้วเปิดเกมจากไอคอน BARK & GUARD ได้เลย</p>
      <button id="pwa-ios-close" type="button">เข้าใจแล้ว</button>
    </div>
  `;
  document.body.appendChild(guide);

  document.getElementById("pwa-install-button").addEventListener("click", async () => {
    if (deferredPrompt) {
      const prompt = deferredPrompt;
      deferredPrompt = null;
      await prompt.prompt();
      await prompt.userChoice;
      hideInstallCard();
      return;
    }

    if (isIOS) {
      guide.classList.add("show");
    }
  });

  document.getElementById("pwa-dismiss-button").addEventListener("click", hideInstallCard);
  document.getElementById("pwa-ios-close").addEventListener("click", () => guide.classList.remove("show"));
}

function showInstallCard() {
  if (isStandalone()) return;
  const card = document.getElementById("pwa-install-card");
  if (card) requestAnimationFrame(() => card.classList.add("show"));
}

function hideInstallCard() {
  const card = document.getElementById("pwa-install-card");
  if (card) card.classList.remove("show");
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
  } catch (error) {
    console.warn("Service worker registration failed:", error);
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

addStyles();
createInstallUI();
registerServiceWorker();

// iOS has no beforeinstallprompt API, so provide an install card ourselves.
if (isIOS && !isStandalone()) {
  window.setTimeout(showInstallCard, 1100);
}
