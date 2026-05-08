const CACHE_NAME = 'kerop-v3';
const STATIC_ASSETS = [
  '/',
  '/eventos',
  '/img/logo.png',
  '/img/mariana-speed.png',
  '/img/hero_bg.png',
];

// ── Install: pre-cache static assets ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // If some assets fail, don't block install
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: delete old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API, cache-first for static ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API calls: always network, never cache
  if (url.pathname.startsWith('/api/')) return;

  // Images and fonts: cache-first (no cambian seguido)
  const isStaticAsset = url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/);
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML y todo lo demás: network-first (siempre muestra la versión nueva)
  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});

// ── Push: show notification ──
self.addEventListener('push', function(event) {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || '/img/logo.png',
    badge: '/img/logo.png',
    vibrate: [100, 50, 100],
    tag: 'kerop-admin',
    renotify: true,
    data: {
      dateOfArrival: Date.now(),
      url: data.url || '/admin',
    },
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Notification click: open admin ──
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
