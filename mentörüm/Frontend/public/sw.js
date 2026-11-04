// Mentörüm PWA Service Worker
// Güvenlik kuralı: /api/ altındaki kimlikli yanıtlar ASLA cache'lenmez (çıkışta veri sızmasın).

const CACHE_NAME = 'mentorum-v2';
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

  // Sadece HTTP/HTTPS protokollerine izin ver (chrome-extension gibi eklentileri cache'lemeye çalışma)
  if (!url.protocol.startsWith('http')) return;

  // Cross-origin istekler (CDN, dış fontlar vs.) doğrudan ağa bırakılır, SW araya girmez.
  if (url.origin !== self.location.origin) return;

  // API istekleri ve GET dışı istekler: network-only (hiç cache'e yazılmaz).
  if (url.pathname.startsWith('/api/')) return;
  if (request.method !== 'GET') return;

  // SPA navigasyonu: offline app shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const shell = await caches.match('/index.html');
        return shell || new Response('Çevrimdışı', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      })
    );
    return;
  }

  // Statik varlıklar: cache-first + arka planda tazele.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response && response.status === 200) {
          try {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache)).catch(() => {});
          } catch {
            // Yarış durumu veya reklam engelleyici kaynaklı clone hatalarını yoksay
          }
        }
        return response;
      }).catch(() => {
        return cached || new Response('', { status: 504 });
      });
      return cached || fetchPromise;
    })
  );
});

// Web Push / FCM olay güdümlü bildirim ve açık ekranları anında yenileme (Sürekli polling yerine)
self.addEventListener('push', (event) => {
  let payload = { title: 'Mentörüm', body: 'Yeni bir güncelleme var.' };
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title || 'Mentörüm', {
        body: payload.body || '',
        icon: '/favicon.svg',
        data: payload,
      }),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: 'MENTORUM_PUSH_INVALIDATE', payload });
        });
      }),
    ])
  );
});
