const BASE = "/bark-and-guard/";
let deferredPrompt = null;

const standalone = () =>
  matchMedia("(display-mode: standalone)").matches ||
  matchMedia("(display-mode: fullscreen)").matches ||
  navigator.standalone === true;

function addInstallUI() {
  if (standalone() || document.getElementById("bag-install")) return;

  const style = document.createElement("style");
  style.textContent = `
    #bag-install{position:fixed;z-index:99999;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid rgba(255,211,116,.55);border-radius:18px;background:rgba(6,29,58,.97);box-shadow:0 12px 40px rgba(0,0,0,.45);font-family:system-ui,sans-serif;color:#fff}
    #bag-install img{width:46px;height:46px;border-radius:12px}
    #bag-install-copy{min-width:150px}
    #bag-install-copy strong{display:block;color:#fff0c5;font-size:14px}
    #bag-install-copy span{display:block;color:#cbd8eb;font-size:11px;margin-top:2px}
    #bag-install button{height:38px;border:0;border-radius:12px;padding:0 14px;font-weight:800;background:#efc45d;color:#082443}
    #bag-install .close{width:38px;padding:0;background:rgba(255,255,255,.12);color:#fff}
    #bag-help{position:fixed;z-index:100000;inset:0;display:none;place-items:center;background:rgba(0,0,0,.7);font-family:system-ui,sans-serif}
    #bag-help.show{display:grid}
    #bag-help>div{width:min(430px,calc(100vw - 36px));box-sizing:border-box;padding:20px;border-radius:20px;background:#0a274b;color:#fff;border:1px solid rgba(255,211,116,.5)}
    #bag-help p{line-height:1.45;font-size:14px;color:#d7e2f2}
    #bag-help button{width:100%;height:42px;border:0;border-radius:12px;font-weight:800;background:#efc45d;color:#082443}`;
  document.head.appendChild(style);

  const bar = document.createElement("div");
  bar.id = "bag-install";
  bar.innerHTML = `<img src="${BASE}assets/app/icons/icon-192.png" alt=""><div id="bag-install-copy"><strong>Install BARK & GUARD</strong><span>เปิดเกมจากไอคอนบนหน้าจอ</span></div><button id="bag-install-btn">INSTALL</button><button class="close" id="bag-install-close">×</button>`;
  document.body.appendChild(bar);

  const help = document.createElement("div");
  help.id = "bag-help";
  help.innerHTML = `<div><h3>ติดตั้ง BARK & GUARD</h3><p id="bag-help-text"></p><button id="bag-help-close">ปิด</button></div>`;
  document.body.appendChild(help);

  document.getElementById("bag-install-btn").onclick = async () => {
    if (deferredPrompt) {
      const p = deferredPrompt;
      deferredPrompt = null;
      try { await p.prompt(); await p.userChoice; bar.remove(); return; }
      catch (_) {}
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    document.getElementById("bag-help-text").innerHTML = ios
      ? `Safari: แตะ <b>Share</b> → <b>Add to Home Screen</b> → <b>Add</b>`
      : `Chrome: แตะเมนู <b>⋮</b> → <b>Install app</b> หรือ <b>Add to Home screen</b>`;
    help.classList.add("show");
  };
  document.getElementById("bag-install-close").onclick = () => bar.remove();
  document.getElementById("bag-help-close").onclick = () => help.classList.remove("show");
}

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  addInstallUI();
});

window.addEventListener("appinstalled", () => {
  document.getElementById("bag-install")?.remove();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(BASE + "service-worker.js", {scope:BASE})
    .then(r => r.update())
    .catch(console.error);
}

setTimeout(addInstallUI, 700);
