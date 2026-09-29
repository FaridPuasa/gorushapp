// Minimal service worker (2026-09-29) - exists mainly to satisfy Chrome's
// installability requirement (a manifest alone isn't enough for the
// "Add to Home Screen"/standalone-app experience to actually work) and to
// show a friendly offline page instead of a broken one. Not attempting a
// full offline-first app - this app talks to a live API, so aggressively
// caching API responses would just show stale data.
const CACHE_NAME = 'gorush-shell-v1';
const OFFLINE_URL = '/offline.html';
const SHELL_ASSETS = [OFFLINE_URL];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(SHELL_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Network-first for navigations (always want the latest page/data), only
// falling back to the cached offline page when there's truly no
// connection. Non-navigation requests (JS/CSS/images/API calls) are left
// completely untouched - passed straight through to the network as if
// this service worker didn't exist, so nothing here can ever serve stale
// data for something that matters.
self.addEventListener('fetch', (event) => {
    if (event.request.mode !== 'navigate') return;
    event.respondWith(
        fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
});
