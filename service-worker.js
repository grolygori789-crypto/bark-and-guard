const C="bark-and-guard-v7",B="/bark-and-guard/";
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.add(B+"index.html")).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith("bark-and-guard-")&&x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request).then(r=>{if(r&&(r.status===200||r.type==="opaque")){const q=r.clone();caches.open(C).then(c=>c.put(e.request,q));}return r;}).catch(async()=>{const q=await caches.match(e.request);if(q)return q;if(e.request.mode==="navigate")return caches.match(B+"index.html");throw new Error("offline");}));});
