const BASE="/bark-and-guard/";
if("serviceWorker" in navigator){navigator.serviceWorker.register(BASE+"service-worker.js",{scope:BASE}).then(r=>r.update()).catch(console.error);}
