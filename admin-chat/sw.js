const VERSION = 'crickso-admin-v1';
const SHELL_CACHE = VERSION + '-shell';

const SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon-32.png',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-192-maskable.png',
    './icons/icon-512-maskable.png',
    './icons/apple-touch-icon.png',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(SHELL_CACHE).then(function(cache) {
            return Promise.all(SHELL.map(function(url) {
                return cache.add(new Request(url, { cache: 'reload' })).catch(function() { });
            }));
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(key) {
                return key === SHELL_CACHE ? null : caches.delete(key);
            }));
        }).then(function() {
            return self.clients.claim();
        })
    );
});

self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function isShellAsset(url) {
    if (url.origin === self.location.origin) return url.pathname.indexOf('/admin-chat/') !== -1;
    return url.hostname === 'www.gstatic.com';
}

self.addEventListener('fetch', function(event) {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Realtime Database traffic must never be served from cache.
    if (!isShellAsset(url)) return;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).then(function(response) {
                const copy = response.clone();
                caches.open(SHELL_CACHE).then(function(cache) { cache.put(request, copy); });
                return response;
            }).catch(function() {
                return caches.match('./index.html').then(function(cached) {
                    return cached || caches.match('./');
                });
            })
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(function(cached) {
            if (cached) return cached;
            return fetch(request).then(function(response) {
                if (response && (response.status === 200 || response.type === 'opaque')) {
                    const copy = response.clone();
                    caches.open(SHELL_CACHE).then(function(cache) { cache.put(request, copy); });
                }
                return response;
            });
        })
    );
});