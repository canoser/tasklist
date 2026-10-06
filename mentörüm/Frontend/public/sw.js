// Mentörüm PWA Service Worker
// Güvenlik kuralı: /api/ altındaki kimlikli yanıtlar ASLA cache'lenmez (çıkışta veri sızmasın).

const CACHE_NAME = 'mentorum-v1';
const APP_SHELL = ['/', '/index.html', '/favicon.svg', '/icons.svg'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API istekleri ve GET dışı istekler: network-only (hiç cache'e yazılmaz).
  if (url.pathname.startsWith('/api/')) return;
  if (request.method !== 'GET') return;

  // SPA navigasyonu: offline app shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Statik varlıklar: cache-first + arka planda tazele.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});