const CACHE='veska-v1-20261002a';
const ASSETS=['./','./index.html','./icon.svg','./manifest.webmanifest','./src/app.js','./src/state.js','./src/audio.js','./src/art.js','./src/content.js','./src/style.css'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('veska-')&&k!==CACHE).map(k=>caches.delete(k)))));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(fetch(event.request).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,clone));}return response;}).catch(()=>caches.match(event.request).then(cached=>cached || (event.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));});
