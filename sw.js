const CACHE_NAME = 'otk-v1';
const ASSETS = ['./index.html','./styles.css','./app.js','./manifest.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => { e.respondWith(caches.match(e.request).then(c => c || fetch(e.request).then(r => { if(r&&r.status===200){const cl=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,cl));} return r; })).catch(()=>caches.match('./index.html'))); });
