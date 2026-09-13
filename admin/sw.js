const CACHE_NAME = 'crickso-admin-v1';
const ASSETS = [
  './',
  './complaints.html',
  './users.html',
  './settings.html',
  './app.js',
  './style.css',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.status !== 200 || res.type !== 'basic') return res;
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return res;
    })).catch(() => {
      if (e.request.destination === 'document') {
        return caches.match('./complaints.html');
      }
    })
  );
});
