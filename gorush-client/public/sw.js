// Minimal service worker (2026-09-29) - exists mainly to satisfy Chrome's
// installability requirement (a manifest alone isn't enough for the
// "Add to Home Screen"/standalone-app experience to actually work) and to
// show a friendly offline page instead of a broken one. Not attempting a
// full offline-first app - this app talks to a live API, so aggressively
// caching API responses would just show stale data.
const CACHE_NAME = 'gorush-shell-v1';
const OFFLINE_URL = '/offline.html';
const SHELL_ASSETS = [OFFLINE_URL];

// Separate cache (2026-10-01) for `expo export`'s content-hashed build output
// only - e.g. entry-<hash>.js, logo.<hash>.png. A cache-first strategy is
// safe ONLY because of that hashing: a new deploy's assets live at entirely
// different URLs, so a cached entry can never be stale - it's either the
// exact bytes the current page wants, or a URL nobody references anymore.
// Lets repeat visits skip the network for the ~1.9MB bundle entirely instead
// of re-downloading it on every visit. Everything else (API calls, the
// non-hashed index.html/favicon/etc. under public/) stays untouched exactly
// as before, passed straight to the network.
const STATIC_CACHE_NAME = 'gorush-static-v1';
const STATIC_CACHE_PATH_PREFIXES = ['/_expo/static/', '/assets/'];

function isHashedStaticAsset(url) {
    return STATIC_CACHE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(SHELL_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    const keepCaches = [CACHE_NAME, STATIC_CACHE_NAME];
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => !keepCaches.includes(k)).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Network-first for navigations (always want the latest page/data), only
    // falling back to the cached offline page when there's truly no connection.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }

    // Content-hashed build assets: cache-first (see STATIC_CACHE_NAME comment above).
    if (event.request.method === 'GET' && isHashedStaticAsset(new URL(event.request.url))) {
        event.respondWith(
            caches.open(STATIC_CACHE_NAME).then(async (cache) => {
                const cached = await cache.match(event.request);
                if (cached) return cached;
                const response = await fetch(event.request);
                if (response.ok) cache.put(event.request, response.clone());
                return response;
            })
        );
        return;
    }

    // Everything else (API calls, non-hashed public/ files) is left completely
    // untouched - passed straight through to the network as if this service
    // worker didn't exist, so nothing here can ever serve stale data for
    // something that matters.
});
