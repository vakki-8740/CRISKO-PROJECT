var CACHE_NAME = 'crickso-admin-v2';
var urlsToCache = ['./', './index.html', './complaints.html', './users.html', './settings.html', './style.css', './app.js'];

self.addEventListener('install', function(e) {
    e.waitUntil(caches.open(CACHE_NAME).then(function(c) { return c.addAll(urlsToCache); }));
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(caches.keys().then(function(names) {
        return Promise.all(names.map(function(n) { if (n !== CACHE_NAME) return caches.delete(n); }));
    }));
    self.clients.claim();
});

self.addEventListener('fetch', function(e) {
    e.respondWith(caches.match(e.request).then(function(r) {
        return r || fetch(e.request);
    }));
});
