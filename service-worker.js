
const CACHE_NAME = 'zenqueue-v2.2-offline';
const URLS_TO_CACHE = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Strategy 1: Cache First for Build Assets
  // This includes JS, CSS, Fonts (woff2), Images, and Manifest files.
  // We exclude API calls and /voice/ endpoints from this aggressive cache (handled by network first).
  if (url.pathname.match(/\.(js|css|png|jpg|svg|gif|webp|woff2?|ico|json)$/) && !url.pathname.startsWith('/api') && !url.pathname.startsWith('/voice')) {
     event.respondWith(
       caches.match(event.request).then((cachedResponse) => {
         if (cachedResponse) return cachedResponse;
         return fetch(event.request).then((response) => {
           if (!response || response.status !== 200 || response.type !== 'basic') return response;
           const responseToCache = response.clone();
           caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
           return response;
         });
       })
     );
     return;
  }

  // Strategy 2: SPA Navigation Fallback
  // If navigating to a page, serve index.html from cache if network fails
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Strategy 3: Network First, Cache Fallback (Default)
  // For everything else (API calls, dynamic content), try network, then cache.
  event.respondWith(
    fetch(event.request).then((response) => {
      // Optional: dynamic caching of successful GET requests
      // const responseToCache = response.clone();
      // caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
      return response;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});
