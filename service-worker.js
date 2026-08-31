const C="bark-and-guard-v6",B="/bark-and-guard/";
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.add(B+"index.html")).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith("bark-and-guard-")&&x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request).then(r=>{const q=r.clone();caches.open(C).then(c=>c.put(e.request,q));return r;}).catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==="navigate"?caches.match(B+"index.html"):Promise.reject()))));});
